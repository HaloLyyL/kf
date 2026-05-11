import { useState, useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { socket } from '../../lib/socket'
import { api } from '../../lib/api'
import { playNotificationSound } from '../../lib/notification'
import type { Message, Agent as ChatAgent } from './types'
import type { Session } from '../agent/types'

function getQueryParams(search: string) {
  const params = new URLSearchParams(search)
  return {
    userId: params.get('userId') || 'demo-user',
    agentId: params.get('agentId') || 'agent-001',
  }
}

export function useChat() {
  const location = useLocation()
  const { userId: queryUserId, agentId: initialAgentId } = getQueryParams(location.search)
  const hasQueryParams = location.search.includes('userId=') && location.search.includes('agentId=')
  const isDemo = !hasQueryParams

  const userId = queryUserId

  const [currentAgentId, setCurrentAgentId] = useState(initialAgentId)
  const [isTyping, setIsTyping] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [sessions, setSessions] = useState<Session[]>([])
  const [agents, setAgents] = useState<ChatAgent[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const pendingMessageRef = useRef<{ content: string; type: 'text' | 'image' } | null>(null)

  // Sync connection status with socket
  useEffect(() => {
    const onConnect = () => {
      setConnectionStatus('connected')
      // Re-join session after reconnect (e.g., mobile app resume)
      socket.emit('user:join', {
        userId,
        userName: `用户_${userId.slice(-4)}`,
        agentId: currentAgentId,
      })
    }
    const onDisconnect = () => setConnectionStatus('disconnected')
    const onConnectError = () => setConnectionStatus('disconnected')

    if (socket.connected) {
      setConnectionStatus('connected')
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
    }
  }, [userId, currentAgentId])

  // Join chat and listen for server events
  useEffect(() => {
    if (!socket.connected) {
      socket.connect()
    }

    socket.emit('user:join', {
      userId,
      userName: `用户_${userId.slice(-4)}`,
      agentId: currentAgentId,
    })

    const onSession = (session: Session) => {
      setSessions((prev) => {
        const idx = prev.findIndex((s) => s.id === session.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = session
          return next
        }
        return [session, ...prev]
      })
      if (session.userId === userId && session.agentId === currentAgentId && session.status === 'active') {
        setCurrentSessionId(session.id)
        // Flush pending message if any
        if (pendingMessageRef.current) {
          const { content, type } = pendingMessageRef.current
          pendingMessageRef.current = null
          socket.emit('user:message', { sessionId: session.id, content, type })
        }
      }
    }

    const onMessage = ({ sessionId, message }: { sessionId: string; message: Message }) => {
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== sessionId) return s
          return {
            ...s,
            messages: [...s.messages, { ...message, timestamp: new Date(message.timestamp) }],
            lastMessage: message.content,
            lastMessageTime: new Date(message.timestamp),
          }
        })
      )
      if (message.sender === 'agent') {
        playNotificationSound()
      }
    }

    const onTyping = ({ sessionId, isTyping: typing }: { sessionId: string; isTyping: boolean }) => {
      if (sessionId === currentSessionId) {
        setIsTyping(typing)
      }
    }

    const onAgentList = (agentList: ChatAgent[]) => {
      setAgents(agentList)
    }

    socket.on('session', onSession)
    socket.on('message', onMessage)
    socket.on('typing', onTyping)
    socket.on('agent:list', onAgentList)

    // Fetch agents via REST as fallback
    api.getAgents().then((list) => {
      setAgents((prev) => (prev.length > 0 ? prev : list.map((a) => ({ ...a, lastMessage: '', unreadCount: 0 }))))
    })

    return () => {
      socket.off('session', onSession)
      socket.off('message', onMessage)
      socket.off('typing', onTyping)
      socket.off('agent:list', onAgentList)
    }
  }, [userId, currentAgentId])

  // Active session and messages
  const activeSession = sessions.find(
    (s) => s.userId === userId && s.agentId === currentAgentId && s.status === 'active'
  )
  const messages: Message[] =
    activeSession?.messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      content: m.content,
      timestamp: m.timestamp,
      type: m.type,
      status: m.status,
    })) || []

  const currentAgent =
    agents.find((a) => a.id === currentAgentId) ||
    agents[0] || {
      id: currentAgentId,
      name: currentAgentId,
      avatar: '/avatar-placeholder.png',
      status: 'online',
      lastMessage: '',
      unreadCount: 0,
    }

  const sendMessage = useCallback(
    (content: string, type: 'text' | 'image' = 'text') => {
      if (!content.trim() && type === 'text') return
      if (!currentSessionId) {
        pendingMessageRef.current = { content, type }
        socket.emit('user:join', { userId, userName: `用户_${userId.slice(-4)}`, agentId: currentAgentId })
        return
      }
      socket.emit('user:message', { sessionId: currentSessionId, content, type })
    },
    [currentSessionId, userId, currentAgentId]
  )

  const switchAgent = useCallback((agentId: string) => {
    setCurrentAgentId(agentId)
    setCurrentSessionId(null)
  }, [])

  return {
    userId,
    isDemo,
    agents,
    currentAgent,
    messages,
    isTyping,
    connectionStatus,
    sendMessage,
    switchAgent,
    setAgents,
  }
}
