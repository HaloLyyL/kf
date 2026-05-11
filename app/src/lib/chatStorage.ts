import { v4 as uuidv4 } from 'uuid';
import type { Session, Message, Agent, UserInfo } from '../pages/agent/types';
import type { Agent as ChatAgent } from '../pages/chat/types';

const SESSIONS_KEY = 'chat-sessions';
const USERS_KEY = 'users';

export interface StoredUser {
  username: string;
  displayName: string;
  password: string;
  role: 'user' | 'agent';
}

export interface StoredSession {
  id: string;
  userId: string;
  agentId: string;
  userName: string;
  userAvatar: string;
  status: 'active' | 'ended';
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  messages: StoredMessage[];
  userInfo: StoredUserInfo;
  userStatus: 'online' | 'offline';
  isTyping: boolean;
}

export interface StoredMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: string;
  type: 'text' | 'image';
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface StoredUserInfo {
  userId: string;
  joinTime: string;
  location: string;
  device: string;
  duration: number;
  notes: string;
}

function toMessage(m: StoredMessage): Message {
  return { ...m, timestamp: new Date(m.timestamp) };
}

function fromMessage(m: Message): StoredMessage {
  return { ...m, timestamp: m.timestamp.toISOString() };
}

function toUserInfo(u: StoredUserInfo): UserInfo {
  return { ...u, joinTime: new Date(u.joinTime) };
}

function fromUserInfo(u: UserInfo): StoredUserInfo {
  return { ...u, joinTime: u.joinTime.toISOString() };
}

export function toSession(s: StoredSession): Session {
  return {
    ...s,
    lastMessageTime: new Date(s.lastMessageTime),
    messages: s.messages.map(toMessage),
    userInfo: toUserInfo(s.userInfo),
  };
}

export function fromSession(s: Session): StoredSession {
  return {
    ...s,
    lastMessageTime: s.lastMessageTime.toISOString(),
    messages: s.messages.map(fromMessage),
    userInfo: fromUserInfo(s.userInfo),
  };
}

export function loadSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    const parsed: StoredSession[] = JSON.parse(raw);
    const migrated = parsed.map((s) => ({
      ...s,
      agentId: s.agentId || 'agent-001',
    }));
    return migrated.map(toSession);
  } catch {
    return [];
  }
}

export function saveSessions(sessions: Session[]) {
  if (typeof window === 'undefined') return;
  const stored = sessions.map(fromSession);
  const newValue = JSON.stringify(stored);
  const oldValue = localStorage.getItem(SESSIONS_KEY);
  if (newValue !== oldValue) {
    localStorage.setItem(SESSIONS_KEY, newValue);
  }
}

export function notifySessionsChanged() {
  // No-op: replaced by server push via Socket.IO
}

export function getRegisteredUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed: StoredUser[] = JSON.parse(raw);
    const hasMissingRole = parsed.some((u) => !u.role);
    if (hasMissingRole) {
      const migrated = parsed.map((u) => ({
        ...u,
        role: u.role || undefined,
      }));
      localStorage.setItem(USERS_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return parsed;
  } catch {
    return [];
  }
}

export function getAgentUsers(): StoredUser[] {
  return getRegisteredUsers().filter((u) => u.role === 'agent' || !u.role);
}

export function getAgentAvatar(username: string): string {
  const hash = username.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return hash % 2 === 0 ? '/head_1.jpg' : '/head_2.jpg';
}

function getAgentStatus(username: string): 'online' | 'away' | 'offline' {
  if (typeof window === 'undefined') return 'online';
  const raw = localStorage.getItem(`agent-status:${username}`);
  if (raw === 'online' || raw === 'away' || raw === 'offline') return raw;
  return 'online';
}

export function loadChatAgents(): ChatAgent[] {
  const agents = getAgentUsers();
  return agents
    .map((u) => ({
      id: u.username,
      name: u.displayName || u.username,
      avatar: getAgentAvatar(u.username),
      status: getAgentStatus(u.username),
      lastMessage: '',
      unreadCount: 0,
    }))
    .filter((a) => a.status === 'online');
}

export function loadAgentList(): Agent[] {
  const agents = getAgentUsers();
  const allSessions = loadSessions();
  return agents.map((u) => {
    const count = allSessions.filter((s) => s.agentId === u.username && s.status === 'active').length;
    return {
      id: u.username,
      name: u.displayName || u.username,
      avatar: getAgentAvatar(u.username),
      status: getAgentStatus(u.username),
      currentSessions: count,
    };
  });
}

export function findOrCreateSession(
  sessions: Session[],
  userId: string,
  userName: string,
  agentId: string
): { session: Session; isNew: boolean; sessions: Session[] } {
  const existing = sessions.find((s) => s.userId === userId && s.agentId === agentId && s.status === 'active');
  if (existing) return { session: existing, isNew: false, sessions };

  const newSession: Session = {
    id: uuidv4(),
    userId,
    agentId,
    userName,
    userAvatar: '/avatar-placeholder.png',
    status: 'active',
    unreadCount: 0,
    lastMessage: '会话已接入',
    lastMessageTime: new Date(),
    messages: [
      {
        id: uuidv4(),
        sender: 'system',
        content: '会话已接入',
        timestamp: new Date(),
        type: 'text',
        status: 'read',
      },
    ],
    userInfo: {
      userId,
      joinTime: new Date(),
      location: '未知',
      device: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 60) : 'Web',
      duration: 0,
      notes: '',
    },
    userStatus: 'online',
    isTyping: false,
  };
  const next = [newSession, ...sessions];
  return { session: newSession, isNew: true, sessions: next };
}
