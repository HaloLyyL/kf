export interface Session {
  id: string;
  userId: string;
  agentId: string;
  userName: string;
  userAvatar: string;
  status: 'active' | 'ended';
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: Date;
  messages: Message[];
  userInfo: UserInfo;
  userStatus: 'online' | 'offline';
  isTyping: boolean;
}

export interface Message {
  id: string;
  sender: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  type: 'text' | 'image';
  status: 'sending' | 'sent' | 'delivered' | 'read';
}

export interface UserInfo {
  userId: string;
  joinTime: Date;
  location: string;
  device: string;
  duration: number;
  notes: string;
}

export interface Agent {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'offline';
  currentSessions: number;
}

export interface Toast {
  id: string;
  type: 'new_message' | 'new_session' | 'system' | 'transfer';
  title: string;
  message?: string;
  avatar?: string;
  autoDismiss: boolean;
}

export type AgentStatus = 'online' | 'away' | 'offline';
export type SessionTab = 'active' | 'ended';
export type SidebarFilter = 'all' | 'unread' | 'online';
