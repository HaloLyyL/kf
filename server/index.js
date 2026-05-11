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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory data
let users = [];
let sessions = [];

// Socket mappings
const agentSockets = new Map(); // username -> socket
const userSockets = new Map();  // userId -> socket
const agentStatusMap = new Map(); // username -> status

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

function getAgentAvatar(username) {
  const hash = username.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return hash % 2 === 0 ? '/head_1.jpg' : '/head_2.jpg';
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
        avatar: getAgentAvatar(u.username),
        status: isOnline ? 'online' : 'offline',
        currentSessions: activeSessions,
      };
    });

  io.emit('agent:list', onlineAgents);
}

// Express setup
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// REST API
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
    user: { username: user.username, displayName: user.displayName, role: user.role },
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
        avatar: getAgentAvatar(u.username),
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
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // User joins chat (demo mode or logged-in user)
  socket.on('user:join', ({ userId, userName, agentId }) => {
    const uid = userId || `guest-${socket.id.slice(0, 6)}`;
    userSockets.set(uid, socket);
    socket.userId = uid;
    socket.userRole = 'user';

    const session = createSession(uid, userName, agentId || 'agent-001');
    socket.join(`session:${session.id}`);

    // If agent is online, join them to the session room too
    const agentSocket = agentSockets.get(session.agentId);
    if (agentSocket) {
      agentSocket.join(`session:${session.id}`);
      agentSocket.emit('session', session);
    }

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
    agentSockets.set(user.username, socket);
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
    const agentSocket = agentSockets.get(session.agentId);
    if (agentSocket) {
      agentSocket.emit('session', session);
    }
  });

  // Agent sends message
  socket.on('agent:message', ({ sessionId, content, type }) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== 'active') return;

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
    const agentSocket = agentSockets.get(session.agentId);
    if (agentSocket) {
      agentSocket.emit('session', session);
    }
  });

  // Typing indicator
  socket.on('typing', ({ sessionId, isTyping }) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
    session.isTyping = isTyping;
    socket.to(`session:${sessionId}`).emit('typing', { sessionId, isTyping });
  });

  // Mark message as read
  socket.on('message:read', ({ sessionId, messageId }) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return;
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
    if (!session) return;
    session.status = 'ended';
    const sysMsg = createSystemMessage('会话已结束');
    session.messages.push(sysMsg);
    session.lastMessage = sysMsg.content;
    session.lastMessageTime = sysMsg.timestamp;
    scheduleSave();
    io.to(`session:${sessionId}`).emit('message', { sessionId, message: sysMsg });
    io.to(`session:${sessionId}`).emit('session', session);
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
      agentSockets.delete(socket.agentId);
      agentStatusMap.delete(socket.agentId);
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
