import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { socket } from '../../lib/socket';
import { api } from '../../lib/api';
import { playNotificationSound, notifyNewMessage, showDesktopNotification, requestNotificationPermission } from '../../lib/notification';
import type { Session, Message, Agent, Toast, AgentStatus, SessionTab, SidebarFilter } from './types';

interface AgentState {
  sessions: Session[];
  agents: Agent[];
  currentSessionId: string | null;
  currentAgentId: string | null;
  agentStatus: AgentStatus;
  toasts: Toast[];
  isUserInfoOpen: boolean;
  isTransferOpen: boolean;
  sessionTab: SessionTab;
  sidebarFilter: SidebarFilter;
  searchQuery: string;
  isMobileChatOpen: boolean;
  typingSessionId: string | null;
}

type Action =
  | { type: 'SET_STATUS'; payload: AgentStatus }
  | { type: 'SELECT_SESSION'; payload: string | null }
  | { type: 'SEND_MESSAGE'; payload: { sessionId: string; message: Message } }
  | { type: 'RECEIVE_MESSAGE'; payload: { sessionId: string; message: Message } }
  | { type: 'MARK_READ'; payload: string }
  | { type: 'END_SESSION'; payload: string }
  | { type: 'NEW_SESSION'; payload: Session }
  | { type: 'SET_USER_INFO_OPEN'; payload: boolean }
  | { type: 'SET_TRANSFER_OPEN'; payload: boolean }
  | { type: 'SET_SESSION_TAB'; payload: SessionTab }
  | { type: 'SET_SIDEBAR_FILTER'; payload: SidebarFilter }
  | { type: 'SET_SEARCH'; payload: string }
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'TRANSFER_SESSION'; payload: { sessionId: string; agentId: string } }
  | { type: 'SET_MOBILE_CHAT'; payload: boolean }
  | { type: 'UPDATE_USER_NOTES'; payload: { sessionId: string; notes: string } }
  | { type: 'SET_TYPING'; payload: { sessionId: string; isTyping: boolean } }
  | { type: 'SET_MESSAGE_STATUS'; payload: { sessionId: string; messageId: string; status: Message['status'] } }
  | { type: 'SYNC_SESSIONS'; payload: Session[] }
  | { type: 'UPDATE_AGENT_SESSIONS'; payload: Agent[] }
  | { type: 'SET_CURRENT_AGENT_ID'; payload: string | null }
  | { type: 'UPSERT_SESSION'; payload: Session };

function getCurrentAgentId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('currentUser');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.role === 'agent') return u.username || null;
    }
  } catch { /* ignore */ }
  return null;
}

const currentAgentId = getCurrentAgentId();

const initialState: AgentState = {
  sessions: [],
  agents: [],
  currentSessionId: null,
  currentAgentId,
  agentStatus: (typeof window !== 'undefined' && localStorage.getItem(`agent-status:${currentAgentId}`) as AgentStatus) || 'online',
  toasts: [],
  isUserInfoOpen: false,
  isTransferOpen: false,
  sessionTab: 'active',
  sidebarFilter: 'all',
  searchQuery: '',
  isMobileChatOpen: false,
  typingSessionId: null,
};

function agentReducer(state: AgentState, action: Action): AgentState {
  switch (action.type) {
    case 'SET_STATUS': {
      if (typeof window !== 'undefined' && state.currentAgentId) {
        localStorage.setItem(`agent-status:${state.currentAgentId}`, action.payload);
      }
      return { ...state, agentStatus: action.payload };
    }
    case 'SELECT_SESSION': {
      const sessions = state.sessions.map((s) =>
        s.id === action.payload ? { ...s, unreadCount: 0 } : s
      );
      return { ...state, currentSessionId: action.payload, sessions };
    }
    case 'SEND_MESSAGE': {
      const { sessionId, message } = action.payload;
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: [...s.messages, message],
                lastMessage: message.content,
                lastMessageTime: message.timestamp,
              }
            : s
        ),
      };
    }
    case 'RECEIVE_MESSAGE': {
      const { sessionId, message } = action.payload;
      const isCurrentSession = state.currentSessionId === sessionId;
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: [...s.messages, message],
                lastMessage: message.content,
                lastMessageTime: message.timestamp,
                unreadCount: isCurrentSession ? 0 : s.unreadCount + 1,
              }
            : s
        ),
      };
    }
    case 'MARK_READ': {
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload ? { ...s, unreadCount: 0 } : s
        ),
      };
    }
    case 'END_SESSION': {
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload ? { ...s, status: 'ended' as const } : s
        ),
        currentSessionId: state.currentSessionId === action.payload ? null : state.currentSessionId,
      };
    }
    case 'NEW_SESSION': {
      return {
        ...state,
        sessions: [action.payload, ...state.sessions],
      };
    }
    case 'SET_USER_INFO_OPEN':
      return { ...state, isUserInfoOpen: action.payload };
    case 'SET_TRANSFER_OPEN':
      return { ...state, isTransferOpen: action.payload };
    case 'SET_SESSION_TAB':
      return { ...state, sessionTab: action.payload };
    case 'SET_SIDEBAR_FILTER':
      return { ...state, sidebarFilter: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };
    case 'REMOVE_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.payload) };
    case 'TRANSFER_SESSION': {
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.sessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: uuidv4(),
                    sender: 'system' as const,
                    content: '会话已转接给其他客服',
                    timestamp: new Date(),
                    type: 'text' as const,
                    status: 'read' as const,
                  },
                ],
              }
            : s
        ),
        isTransferOpen: false,
      };
    }
    case 'SET_MOBILE_CHAT':
      return { ...state, isMobileChatOpen: action.payload };
    case 'UPDATE_USER_NOTES': {
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.sessionId
            ? { ...s, userInfo: { ...s.userInfo, notes: action.payload.notes } }
            : s
        ),
      };
    }
    case 'SET_TYPING': {
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === action.payload.sessionId ? { ...s, isTyping: action.payload.isTyping } : s
        ),
        typingSessionId: action.payload.isTyping ? action.payload.sessionId : null,
      };
    }
    case 'SET_MESSAGE_STATUS': {
      const { sessionId, messageId, status } = action.payload;
      return {
        ...state,
        sessions: state.sessions.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: s.messages.map((m) => (m.id === messageId ? { ...m, status } : m)),
              }
            : s
        ),
      };
    }
    case 'SYNC_SESSIONS': {
      return { ...state, sessions: action.payload };
    }
    case 'UPSERT_SESSION': {
      const session = action.payload;
      const idx = state.sessions.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        const next = [...state.sessions];
        // Preserve local unreadCount (frontend tracks it independently)
        next[idx] = { ...session, unreadCount: next[idx].unreadCount };
        return { ...state, sessions: next };
      }
      return { ...state, sessions: [session, ...state.sessions] };
    }
    case 'UPDATE_AGENT_SESSIONS': {
      return { ...state, agents: action.payload };
    }
    case 'SET_CURRENT_AGENT_ID': {
      return { ...state, currentAgentId: action.payload };
    }
    default:
      return state;
  }
}

interface AgentContextValue {
  state: AgentState;
  dispatch: React.Dispatch<Action>;
  sendMessage: (sessionId: string, content: string, type?: 'text' | 'image') => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) throw new Error('useAgent must be used within AgentProvider');
  return ctx;
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(agentReducer, initialState);


  const sendMessage = useCallback((sessionId: string, content: string, type: 'text' | 'image' = 'text') => {
    socket.emit('agent:message', { sessionId, content, type });
  }, []);

  // Detect login and update currentAgentId
  useEffect(() => {
    if (state.currentAgentId) return;
    const raw = localStorage.getItem('currentUser');
    if (!raw) return;
    try {
      const u = JSON.parse(raw);
      if (u.role === 'agent' && u.username) {
        dispatch({ type: 'SET_CURRENT_AGENT_ID', payload: u.username });
      }
    } catch { /* ignore */ }
  }, [state.currentAgentId]);

  // Request desktop notification permission
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    if (state.currentAgentId) {
      socket.emit('auth:agent', { token: state.currentAgentId });
      socket.emit('agent:status', { status: state.agentStatus });
    }

    const onConnect = () => {
      if (state.currentAgentId) {
        socket.emit('auth:agent', { token: state.currentAgentId });
        socket.emit('agent:status', { status: state.agentStatus });
      }
    };
    socket.on('connect', onConnect);

    const onSession = (session: Session) => {
      const normalized = {
        ...session,
        messages: session.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
        lastMessageTime: new Date(session.lastMessageTime),
      };
      dispatch({ type: 'UPSERT_SESSION', payload: normalized });
    };

    const onMessage = ({ sessionId, message }: { sessionId: string; message: Message }) => {
      dispatch({
        type: 'RECEIVE_MESSAGE',
        payload: {
          sessionId,
          message: { ...message, timestamp: new Date(message.timestamp) },
        },
      });
      if (message.sender === 'user') {
        playNotificationSound();
        notifyNewMessage();
        const session = state.sessions.find((s) => s.id === sessionId);
        const userName = session?.userName || '用户';
        showDesktopNotification('新消息', `${userName}: ${message.content}`);
      }
    };

    const onTyping = ({ sessionId, isTyping }: { sessionId: string; isTyping: boolean }) => {
      dispatch({ type: 'SET_TYPING', payload: { sessionId, isTyping } });
    };

    const onMessageStatus = ({ sessionId, messageId, status }: { sessionId: string; messageId: string; status: Message['status'] }) => {
      dispatch({ type: 'SET_MESSAGE_STATUS', payload: { sessionId, messageId, status } });
    };

    const onAgentList = (agents: Agent[]) => {
      dispatch({ type: 'UPDATE_AGENT_SESSIONS', payload: agents });
    };

    socket.on('session', onSession);
    socket.on('message', onMessage);
    socket.on('typing', onTyping);
    socket.on('message:status', onMessageStatus);
    socket.on('agent:list', onAgentList);

    // Fetch agents via REST as fallback
    api.getAgents().then((list) => {
      dispatch({ type: 'UPDATE_AGENT_SESSIONS', payload: list });
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('session', onSession);
      socket.off('message', onMessage);
      socket.off('typing', onTyping);
      socket.off('message:status', onMessageStatus);
      socket.off('agent:list', onAgentList);
    };
  }, [state.currentAgentId, state.agentStatus]);

  // Auto-dismiss toasts
  useEffect(() => {
    state.toasts.forEach((toast) => {
      if (toast.autoDismiss) {
        const timer = setTimeout(() => {
          dispatch({ type: 'REMOVE_TOAST', payload: toast.id });
        }, 4000);
        return () => clearTimeout(timer);
      }
    });
  }, [state.toasts]);

  return (
    <AgentContext.Provider value={{ state, dispatch, sendMessage }}>
      {children}
    </AgentContext.Provider>
  );
}
