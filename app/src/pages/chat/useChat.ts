import { useState, useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { socket } from '../../lib/socket'
import { api } from '../../lib/api'
import { playNotificationSound } from '../../lib/notification'
import { ensureVisitorToken, clearVisitorToken, vidFromToken } from '../../lib/visitor'
import type { Message, Agent as ChatAgent } from './types'
import type { Session } from '../agent/types'

function getQueryParams(search: string) {
  const params = new URLSearchParams(search)
  return {
    userId: params.get('userId') || 'demo-user',
    agentId: params.get('agentId'),
  }
}

export function useChat() {
  const location = useLocation()
  const { userId: queryUserId, agentId: queryAgentId } = getQueryParams(location.search)
  // Demo mode only when no userId given; agentId is optional (server auto-assigns one)
  const isDemo = !location.search.includes('userId=')

  // Anonymous-but-verified visitor identity issued by the server
  const [visitorToken, setVisitorToken] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  // Server derives the userId from the signed token; use it for local filtering
  const userId = (visitorToken && vidFromToken(visitorToken)) || queryUserId

  const [currentAgentId, setCurrentAgentId] = useState<string | null>(queryAgentId)
  const [isTyping, setIsTyping] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [sessions, setSessions] = useState<Session[]>([])
  const [agents, setAgents] = useState<ChatAgent[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const pendingMessageRef = useRef<{ content: string; type: 'text' | 'image' } | null>(null)

  // Acquire a visitor token before chatting (runs Turnstile when configured)
  useEffect(() => {
    let cancelled = false
    ensureVisitorToken()
      .then((token) => {
        if (!cancelled) setVisitorToken(token)
      })
      .catch((err) => {
        if (!cancelled) setAuthError(err?.message || '访客验证失败，请刷新重试')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshVisitorToken = useCallback(() => {
    clearVisitorToken()
    ensureVisitorToken(true)
      .then((token) => setVisitorToken(token))
      .catch((err) => setAuthError(err?.message || '访客验证失败，请刷新重试'))
  }, [])

  // Sync connection status with socket
  useEffect(() => {
    const onConnect = () => {
      setConnectionStatus('connected')
      // Re-join session after reconnect (e.g., mobile app resume)
      if (visitorToken) {
        socket.emit('user:join', {
          token: visitorToken,
          userName: `用户_${userId.slice(-4)}`,
          agentId: currentAgentId,
        })
      }
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
  }, [userId, currentAgentId, visitorToken])

  // Join chat and listen for server events (only after the visitor token is ready)
  useEffect(() => {
    if (!visitorToken) return

    if (!socket.connected) {
      socket.connect()
    }

    socket.emit('user:join', {
      token: visitorToken,
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
      if (session.userId !== userId || session.status !== 'active') return
      // Server may auto-assign an agent when none was specified in the URL
      if (!queryAgentId && session.agentId !== currentAgentId) {
        setCurrentAgentId(session.agentId)
        return
      }
      if (session.agentId === currentAgentId) {
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

    const onSessionDeleted = ({ sessionId }: { sessionId: string }) => {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      setCurrentSessionId((prev) => (prev === sessionId ? null : prev))
    }

    // Server rejected the visitor token: refresh it once and rejoin
    const onServerError = ({ code }: { code?: string; message?: string }) => {
      if (code === 'visitor_auth') {
        refreshVisitorToken()
      } else if (code === 'rate_limit') {
        setAuthError('操作过于频繁，请稍后再试')
      }
    }

    socket.on('session', onSession)
    socket.on('message', onMessage)
    socket.on('typing', onTyping)
    socket.on('agent:list', onAgentList)
    socket.on('session:deleted', onSessionDeleted)
    socket.on('error', onServerError)

    // Fetch agents via REST as fallback
    api.getAgents().then((list) => {
      setAgents((prev) => (prev.length > 0 ? prev : list.map((a) => ({ ...a, lastMessage: '', unreadCount: 0 }))))
    })

    return () => {
      socket.off('session', onSession)
      socket.off('message', onMessage)
      socket.off('typing', onTyping)
      socket.off('agent:list', onAgentList)
      socket.off('session:deleted', onSessionDeleted)
      socket.off('error', onServerError)
    }
  }, [userId, currentAgentId, visitorToken, refreshVisitorToken])

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
      id: currentAgentId || '',
      name: currentAgentId || '客服',
      avatar: '/avatar-placeholder.png',
      status: 'online',
      lastMessage: '',
      unreadCount: 0,
    }

  const sendMessage = useCallback(
    (content: string, type: 'text' | 'image' = 'text') => {
      if (!content.trim() && type === 'text') return
      if (!visitorToken) return
      if (!currentSessionId) {
        pendingMessageRef.current = { content, type }
        socket.emit('user:join', { token: visitorToken, userName: `用户_${userId.slice(-4)}`, agentId: currentAgentId })
        return
      }
      socket.emit('user:message', { sessionId: currentSessionId, content, type })
    },
    [currentSessionId, userId, currentAgentId, visitorToken]
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
    authError,
    sendMessage,
    switchAgent,
    setAgents,
  }
}
