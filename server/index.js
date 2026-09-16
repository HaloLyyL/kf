const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3002;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');

// Security config (env)
// TURNSTILE_SECRET_KEY: Cloudflare Turnstile secret; empty = dev mode (skip captcha)
// ALLOWED_ORIGINS: comma-separated allowed origins for CORS; empty = allow all (dev)
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const VISITOR_TOKEN_TTL = 7 * 24 * 3600 * 1000; // 7 days

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory data
let users = [];
let sessions = [];

// Socket mappings
const agentSockets = new Map(); // username -> Set<socket>
const userSockets = new Map();  // userId -> socket
const agentStatusMap = new Map(); // username -> status

function getAgentSockets(username) {
  return agentSockets.get(username) || new Set();
}

function addAgentSocket(username, socket) {
  if (!agentSockets.has(username)) agentSockets.set(username, new Set());
  agentSockets.get(username).add(socket);
}

function removeAgentSocket(username, socket) {
  const set = agentSockets.get(username);
  if (!set) return;
  set.delete(socket);
  if (set.size === 0) {
    agentSockets.delete(username);
    agentStatusMap.delete(username);
  }
}

// Load data from JSON files
function loadData() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load users:', e.message);
    users = [];
  }
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      sessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load sessions:', e.message);
    sessions = [];
  }
}

// Save data to JSON files (debounced)
let saveTimer = null;
function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
      fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
    } catch (e) {
      console.error('Failed to save data:', e.message);
    }
  }, 300);
}

function generateId() {
  return crypto.randomUUID();
}

// ===== Visitor security: signed tokens, Turnstile, rate limiting =====

// Persisted server secret so visitor tokens survive restarts
function loadSecret() {
  try {
    if (fs.existsSync(SECRET_FILE)) {
      const s = fs.readFileSync(SECRET_FILE, 'utf-8').trim();
      if (s) return s;
    }
  } catch (e) {
    console.error('Failed to read secret:', e.message);
  }
  const s = crypto.randomBytes(32).toString('hex');
  try {
    fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
  } catch (e) {
    console.error('Failed to persist secret:', e.message);
  }
  return s;
}
const SERVER_SECRET = loadSecret();

function signVisitorToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SERVER_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyVisitorToken(token) {
  if (typeof token !== 'string') return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', SERVER_SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (!payload.vid || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

async function verifyTurnstile(turnstileToken, ip) {
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: TURNSTILE_SECRET, response: turnstileToken, remoteip: ip }),
    });
    const data = await res.json();
    if (data.success !== true) {
      console.error('[turnstile] verify failed:', JSON.stringify(data));
    }
    return data.success === true;
  } catch (e) {
    console.error('Turnstile verify failed:', e.message);
    return false;
  }
}

// Simple in-memory sliding-window rate limiter
function createRateLimiter({ windowMs, max }) {
  const hits = new Map(); // key -> timestamps
  return {
    allow(key) {
      const now = Date.now();
      const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
      if (arr.length >= max) {
        hits.set(key, arr);
        return false;
      }
      arr.push(now);
      hits.set(key, arr);
      return true;
    },
    sweep() {
      const now = Date.now();
      for (const [key, arr] of hits) {
        const kept = arr.filter((t) => now - t < windowMs);
        if (kept.length === 0) hits.delete(key);
        else hits.set(key, kept);
      }
    },
  };
}

const tokenLimiter = createRateLimiter({ windowMs: 3600e3, max: 30 }); // 30 tokens / hour / IP
const sessionLimiter = createRateLimiter({ windowMs: 3600e3, max: 20 }); // 20 new sessions / hour / IP
const messageLimiter = createRateLimiter({ windowMs: 60e3, max: 30 }); // 30 messages / minute / socket

setInterval(() => {
  tokenLimiter.sweep();
  sessionLimiter.sweep();
  messageLimiter.sweep();
}, 3600e3).unref();

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function getSocketIp(socket) {
  const fwd = socket.handshake.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return socket.handshake.address || 'unknown';
}

function getAgentAvatar(username) {
  const hash = username.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return hash % 2 === 0 ? '/head_1.jpg' : '/head_2.jpg';
}

// Pick a default agent when the user didn't specify one:
// prefer online agents, then the one with fewest active sessions
function pickDefaultAgent() {
  const agentUsers = users.filter((u) => u.role === 'agent' || !u.role);
  if (agentUsers.length === 0) return 'agent-001';
  const sessionCount = (username) =>
    sessions.filter((s) => s.agentId === username && s.status === 'active').length;
  const online = agentUsers.filter((u) => agentSockets.has(u.username));
  const pool = online.length > 0 ? online : agentUsers;
  return pool.reduce((a, b) =>
    sessionCount(a.username) <= sessionCount(b.username) ? a : b
  ).username;
}

function createSystemMessage(content) {
  return {
    id: generateId(),
    sender: 'system',
    content,
    timestamp: new Date().toISOString(),
    type: 'text',
    status: 'read',
  };
}

function createSession(userId, userName, agentId) {
  const existing = sessions.find(
    (s) => s.userId === userId && s.agentId === agentId && s.status === 'active'
  );
  if (existing) return existing;

  const session = {
    id: generateId(),
    userId,
    agentId,
    userName: userName || `用户_${userId.slice(-4)}`,
    userAvatar: '/avatar-placeholder.png',
    status: 'active',
    unreadCount: 1,
    lastMessage: '会话已接入',
    lastMessageTime: new Date().toISOString(),
    messages: [createSystemMessage('会话已接入')],
    userInfo: {
      userId,
      joinTime: new Date().toISOString(),
      location: '未知',
      device: 'Web',
      duration: 0,
      notes: '',
    },
    userStatus: 'online',
    isTyping: false,
  };
  sessions.unshift(session);
  scheduleSave();
  return session;
}

function broadcastAgentList() {
  const onlineAgents = users
    .filter((u) => u.role === 'agent' || !u.role)
    .map((u) => {
      const isOnline = agentSockets.has(u.username);
      const activeSessions = sessions.filter(
        (s) => s.agentId === u.username && s.status === 'active'
      ).length;
      return {
        id: u.username,
        name: u.displayName || u.username,
        avatar: u.avatar || getAgentAvatar(u.username),
        status: isOnline ? 'online' : 'offline',
        currentSessions: activeSessions,
      };
    });

  io.emit('agent:list', onlineAgents);
}

// Express setup
const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// REST API
// Issue a signed visitor token (anonymous but verifiable identity).
// Requires a Turnstile token when TURNSTILE_SECRET_KEY is configured.
app.post('/api/visitor/token', async (req, res) => {
  const ip = getClientIp(req);
  console.log('[visitor/token] request from', ip, 'turnstileToken?', !!(req.body && req.body.turnstileToken));
  if (!tokenLimiter.allow(ip)) {
    return res.status(429).json({ error: '请求过于频繁，请稍后再试' });
  }
  if (TURNSTILE_SECRET) {
    const { turnstileToken } = req.body || {};
    if (!turnstileToken) {
      return res.status(400).json({ error: '缺少人机验证凭证' });
    }
    const ok = await verifyTurnstile(turnstileToken, ip);
    if (!ok) {
      return res.status(403).json({ error: '人机验证失败，请刷新后重试' });
    }
  }
  const now = Date.now();
  const token = signVisitorToken({ vid: `v-${generateId()}`, iat: now, exp: now + VISITOR_TOKEN_TTL });
  res.json({ success: true, token, expiresAt: now + VISITOR_TOKEN_TTL });
});
app.post('/api/auth/register', (req, res) => {
  const { username, displayName, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const existing = users.find((u) => u.username === username);
  if (existing) {
    return res.status(409).json({ error: '用户名已存在' });
  }
  const user = { username, displayName: displayName || username, password, role: role || 'user' };
  users.push(user);
  scheduleSave();
  res.json({ success: true, user: { username, displayName: user.displayName, role: user.role } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  res.json({
    success: true,
    token: user.username,
    user: { username: user.username, displayName: user.displayName, role: user.role, avatar: user.avatar || null },
  });
});

// Agent updates own profile (display name / avatar)
app.post('/api/agents/profile', (req, res) => {
  const { username, displayName, avatar } = req.body;
  const user = users.find((u) => u.username === username && (u.role === 'agent' || !u.role));
  if (!user) {
    return res.status(404).json({ error: '客服不存在' });
  }
  if (displayName !== undefined) {
    const name = String(displayName).trim();
    if (!name) return res.status(400).json({ error: '名称不能为空' });
    user.displayName = name;
  }
  if (avatar !== undefined) {
    if (avatar !== null && typeof avatar === 'string' && avatar.length > 3 * 1024 * 1024) {
      return res.status(400).json({ error: '头像图片不能超过 2MB' });
    }
    user.avatar = avatar || undefined;
  }
  scheduleSave();
  broadcastAgentList();
  res.json({
    success: true,
    user: { username: user.username, displayName: user.displayName, role: user.role, avatar: user.avatar || null },
  });
});

app.get('/api/agents', (req, res) => {
  const agentList = users
    .filter((u) => u.role === 'agent' || !u.role)
    .map((u) => {
      const isOnline = agentSockets.has(u.username);
      const activeSessions = sessions.filter(
        (s) => s.agentId === u.username && s.status === 'active'
      ).length;
      return {
        id: u.username,
        name: u.displayName || u.username,
        avatar: u.avatar || getAgentAvatar(u.username),
        status: isOnline ? 'online' : 'offline',
        currentSessions: activeSessions,
      };
    });
  res.json(agentList);
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../app/dist')));

// Fallback to index.html for SPA routes (React Router HashRouter)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../app/dist/index.html'));
});

// Socket.IO setup
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // User joins chat — requires a valid signed visitor token
  socket.on('user:join', ({ token, userName, agentId }) => {
    const payload = verifyVisitorToken(token);
    console.log('[user:join] token valid?', !!payload, 'agentId?', agentId || '(auto)');
    if (!payload) {
      socket.emit('error', { code: 'visitor_auth', message: '访客验证已失效，请刷新页面重试' });
      return;
    }
    const uid = payload.vid;
    const targetAgent = agentId || pickDefaultAgent();

    // Rate-limit creation of NEW sessions per IP
    const hasActive = sessions.some(
      (s) => s.userId === uid && s.agentId === targetAgent && s.status === 'active'
    );
    if (!hasActive && !sessionLimiter.allow(getSocketIp(socket))) {
      socket.emit('error', { code: 'rate_limit', message: '会话创建过于频繁，请稍后再试' });
      return;
    }

    userSockets.set(uid, socket);
    socket.userId = uid;
    socket.userRole = 'user';

    const session = createSession(uid, userName, targetAgent);
    socket.join(`session:${session.id}`);

    // If agent is online, join them to the session room too
    getAgentSockets(session.agentId).forEach((agentSocket) => {
      agentSocket.join(`session:${session.id}`);
      agentSocket.emit('session', session);
    });

    socket.emit('session', session);
    broadcastAgentList();
  });

  // Agent authenticates
  socket.on('auth:agent', ({ token }) => {
    const user = users.find((u) => u.username === token && (u.role === 'agent' || !u.role));
    if (!user) {
      socket.emit('error', { message: '客服认证失败' });
      return;
    }
    if (socket.agentId && socket.agentId !== user.username) {
      // Account switched on the same socket: drop the old agent mapping
      removeAgentSocket(socket.agentId, socket);
    }
    addAgentSocket(user.username, socket);
    socket.agentId = user.username;
    socket.userRole = 'agent';

    // Join all active sessions assigned to this agent
    sessions
      .filter((s) => s.agentId === user.username && s.status === 'active')
      .forEach((s) => {
        socket.join(`session:${s.id}`);
        socket.emit('session', s);
      });

    broadcastAgentList();
    console.log('Agent online:', user.username);
  });

  // User sends message
  socket.on('user:message', ({ sessionId, content, type }) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== 'active') return;
    // Only the visitor who owns this session may send messages to it
    if (socket.userRole !== 'user' || socket.userId !== session.userId) return;
    if (!messageLimiter.allow(socket.id)) return;
    if (typeof content !== 'string') return;
    const maxLen = type === 'image' ? 3 * 1024 * 1024 : 2000;
    if (content.length > maxLen) return;

    const message = {
      id: generateId(),
      sender: 'user',
      content,
      timestamp: new Date().toISOString(),
      type: type || 'text',
      status: 'sent',
    };

    session.messages.push(message);
    session.lastMessage = content;
    session.lastMessageTime = message.timestamp;
    scheduleSave();

    io.to(`session:${sessionId}`).emit('message', { sessionId, message });

    // Also notify agent if they're not in the room for some reason
    getAgentSockets(session.agentId).forEach((agentSocket) => {
      agentSocket.emit('session', session);
    });
  });

  // Agent sends message
  socket.on('agent:message', ({ sessionId, content, type }) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== 'active') return;
    // Only the agent assigned to this session may reply
    if (socket.userRole !== 'agent' || socket.agentId !== session.agentId) return;

    const message = {
      id: generateId(),
      sender: 'agent',
      content,
      timestamp: new Date().toISOString(),
      type: type || 'text',
      status: 'sent',
    };

    session.messages.push(message);
    session.lastMessage = content;
    session.lastMessageTime = message.timestamp;
    scheduleSave();

    io.to(`session:${sessionId}`).emit('message', { sessionId, message });

    // Update session for agent sidebar
    getAgentSockets(session.agentId).forEach((agentSocket) => {
      agentSocket.emit('session', session);
    });
  });

  // Check the socket actually participates in the session
  function isSessionParticipant(socket, session) {
    return (
      (socket.userRole === 'user' && socket.userId === session.userId) ||
      (socket.userRole === 'agent' && socket.agentId === session.agentId)
    );
  }

  // Typing indicator
  socket.on('typing', ({ sessionId, isTyping }) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || !isSessionParticipant(socket, session)) return;
    session.isTyping = isTyping;
    socket.to(`session:${sessionId}`).emit('typing', { sessionId, isTyping });
  });

  // Mark message as read
  socket.on('message:read', ({ sessionId, messageId }) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || !isSessionParticipant(socket, session)) return;
    const msg = session.messages.find((m) => m.id === messageId);
    if (msg) {
      msg.status = 'read';
      scheduleSave();
      io.to(`session:${sessionId}`).emit('message:status', { sessionId, messageId, status: 'read' });
    }
    if (socket.userRole === 'agent') {
      session.unreadCount = 0;
      scheduleSave();
    }
  });

  // End session
  socket.on('session:end', ({ sessionId }) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || !isSessionParticipant(socket, session)) return;
    session.status = 'ended';
    const sysMsg = createSystemMessage('会话已结束');
    session.messages.push(sysMsg);
    session.lastMessage = sysMsg.content;
    session.lastMessageTime = sysMsg.timestamp;
    scheduleSave();
    io.to(`session:${sessionId}`).emit('message', { sessionId, message: sysMsg });
    io.to(`session:${sessionId}`).emit('session', session);
  });

  // Agent deletes a session
  socket.on('session:delete', ({ sessionId }) => {
    if (socket.userRole !== 'agent') return;
    const idx = sessions.findIndex((s) => s.id === sessionId);
    if (idx < 0) return;
    // Only the owning agent can delete it
    if (sessions[idx].agentId !== socket.agentId) return;
    sessions.splice(idx, 1);
    scheduleSave();
    io.to(`session:${sessionId}`).emit('session:deleted', { sessionId });
    socket.emit('session:deleted', { sessionId });
    broadcastAgentList();
  });

  // Agent status change
  socket.on('agent:status', ({ status }) => {
    if (socket.agentId) {
      // Optionally persist status
      broadcastAgentList();
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.agentId) {
      removeAgentSocket(socket.agentId, socket);
      broadcastAgentList();
    }
    if (socket.userId) {
      userSockets.delete(socket.userId);
    }
  });
});

// Load data and start server
loadData();
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Chat server running on http://0.0.0.0:${PORT}`);
});
