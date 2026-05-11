import { useState, useCallback, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeftOpen } from 'lucide-react'
import { useChat } from './chat/useChat'
import ChatHeader from './chat/ChatHeader'
import MessageList from './chat/MessageList'
import MessageInput from './chat/MessageInput'
import AgentDrawer from './chat/AgentDrawer'
import AgentSidebar from './chat/AgentSidebar'

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return isMobile
}

function DemoBanner({ userId, agentId }: { userId: string; agentId: string }) {
  return (
    <div className="flex-shrink-0 bg-[#EEF4FF] px-4 py-2 text-center text-xs text-[#4F7BF7]">
      <span className="font-medium">演示模式</span>
      <span className="mx-2 text-[#9CA3AF]">|</span>
      <span>userId: {userId}</span>
      <span className="mx-2 text-[#9CA3AF]">|</span>
      <span>agentId: {agentId}</span>
    </div>
  )
}

export default function Chat() {
  const location = useLocation()
  const isMobile = useIsMobile()
  const {
    userId,
    isDemo,
    agents,
    currentAgent,
    messages,
    isTyping,
    connectionStatus,
    sendMessage,
    switchAgent,
  } = useChat()

  const [showAgentList, setShowAgentList] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleToggleAgentList = useCallback(() => {
    setShowAgentList((prev) => !prev)
  }, [])

  const handleCloseAgentList = useCallback(() => {
    setShowAgentList(false)
  }, [])

  const handleSelectAgent = useCallback(
    (agentId: string) => {
      switchAgent(agentId)
    },
    [switchAgent]
  )

  const handleBack = useCallback(() => {
    setShowAgentList(false)
  }, [])

  // Close agent drawer on route change
  useEffect(() => {
    setShowAgentList(false)
  }, [location.search])

  const isInputDisabled = connectionStatus === 'disconnected'

  return (
    <div className="flex h-[100dvh] w-full bg-[#F3F4F6]">
      {/* Desktop Agent Sidebar */}
      {!isMobile && (
        <AgentSidebar
          agents={agents}
          currentAgentId={currentAgent.id}
          onSelectAgent={handleSelectAgent}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />
      )}

      {/* Collapsed sidebar toggle button */}
      {!isMobile && sidebarCollapsed && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E7EB] bg-white text-[#6B7280] shadow-sm transition-colors hover:bg-[#F3F4F6]"
          onClick={() => setSidebarCollapsed(false)}
          aria-label="展开侧边栏"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </motion.button>
      )}

      {/* Main chat area */}
      <div className="relative flex flex-1 justify-center overflow-hidden">
        {/* Mobile: full screen. Desktop: centered card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="flex w-full flex-col overflow-hidden sm:m-6 sm:h-[calc(100dvh-48px)] sm:max-w-[720px] sm:rounded-2xl sm:border sm:border-[#E5E7EB] sm:bg-white sm:shadow-[0_8px_40px_rgba(0,0,0,0.08)]"
        >
          {/* Demo banner */}
          {isDemo && <DemoBanner userId={userId} agentId={currentAgent.id} />}

          {/* Chat Header */}
          <ChatHeader
            agent={currentAgent}
            connectionStatus={connectionStatus}
            isMobile={isMobile}
            showAgentList={showAgentList}
            onToggleAgentList={handleToggleAgentList}
            onBack={handleBack}
          />

          {/* Messages */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentAgent.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <MessageList messages={messages} isTyping={isTyping} agentAvatar={currentAgent.avatar} />
              <MessageInput onSend={sendMessage} disabled={isInputDisabled} />
            </motion.div>
          </AnimatePresence>

          {/* Agent Drawer / Dropdown overlay */}
          <AgentDrawer
            isOpen={showAgentList}
            onClose={handleCloseAgentList}
            agents={agents}
            currentAgentId={currentAgent.id}
            onSelectAgent={handleSelectAgent}
          />
        </motion.div>
      </div>
    </div>
  )
}
