export type MessageSender = 'user' | 'agent' | 'system'
export type MessageType = 'text' | 'image'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'
export type AgentStatus = 'online' | 'away' | 'offline'

export interface Message {
  id: string
  sender: MessageSender
  content: string
  timestamp: Date
  type: MessageType
  status: MessageStatus
}

export interface Agent {
  id: string
  name: string
  avatar: string
  status: AgentStatus
  lastMessage: string
  unreadCount: number
}

export interface Conversation {
  agentId: string
  messages: Message[]
}
