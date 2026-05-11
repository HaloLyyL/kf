import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import type { Agent } from './types'

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface AgentDrawerProps {
  isOpen: boolean
  onClose: () => void
  agents: Agent[]
  currentAgentId: string
  onSelectAgent: (agentId: string) => void
}

function StatusBadge({ status }: { status: Agent['status'] }) {
  const config = {
    online: { dot: '#10B981', bg: '#D1FAE5', text: '在线', color: '#059669' },
    away: { dot: '#F59E0B', bg: '#FEF3C7', text: '离开', color: '#D97706' },
    offline: { dot: '#D1D5DB', bg: '#F3F4F6', text: '离线', color: '#6B7280' },
  }
  const c = config[status]

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.text}
    </span>
  )
}

function AgentItem({
  agent,
  isActive,
  onClick,
  index,
}: {
  agent: Agent
  isActive: boolean
  onClick: () => void
  index: number
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
      style={{
        backgroundColor: isActive ? '#EEF4FF' : 'transparent',
        borderLeft: isActive ? '3px solid #4F7BF7' : '3px solid transparent',
      }}
    >
      {/* Avatar with status */}
      <div className="relative flex-shrink-0">
        <img
          src={agent.avatar}
          alt={agent.name}
          className="h-10 w-10 rounded-full object-cover"
        />
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white"
          style={{
            backgroundColor:
              agent.status === 'online' ? '#10B981' : agent.status === 'away' ? '#F59E0B' : '#D1D5DB',
          }}
        />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm ${isActive ? 'font-semibold text-[#4F7BF7]' : 'font-medium text-[#374151]'}`}>
            {agent.name}
          </span>
          {agent.unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1.5 text-[10px] font-bold text-white"
            >
              {agent.unreadCount}
            </motion.span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <StatusBadge status={agent.status} />
        </div>
        <p className="mt-0.5 truncate text-xs text-[#9CA3AF]">{agent.lastMessage}</p>
      </div>
    </motion.button>
  )
}

// Mobile bottom sheet
function MobileDrawer({
  isOpen,
  onClose,
  agents,
  currentAgentId,
  onSelectAgent,
}: AgentDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 sm:hidden"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.35, ease: easeOut }}
            className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-[20px] bg-white p-5 shadow-2xl sm:hidden"
            style={{ maxHeight: '70vh' }}
          >
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#D1D5DB]" />

            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#374151]">选择客服</h3>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6]"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Agent list */}
            <div className="max-h-[50vh] overflow-y-auto">
              <div className="flex flex-col gap-1">
                {agents.map((agent, i) => (
                  <AgentItem
                    key={agent.id}
                    agent={agent}
                    isActive={agent.id === currentAgentId}
                    onClick={() => {
                      onSelectAgent(agent.id)
                      onClose()
                    }}
                    index={i}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Desktop dropdown panel
function DesktopPanel({
  isOpen,
  onClose,
  agents,
  currentAgentId,
  onSelectAgent,
}: AgentDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[60] hidden sm:block"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2, ease: easeOut }}
            className="absolute right-4 top-16 z-[70] hidden w-[280px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.1)] sm:block"
            style={{ transformOrigin: 'top right' }}
          >
            <div className="border-b border-[#E5E7EB] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#374151]">选择客服</h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto p-2">
              {agents.map((agent, i) => (
                <div key={agent.id} className="rounded-lg hover:bg-[#F9FAFB]">
                  <AgentItem
                    agent={agent}
                    isActive={agent.id === currentAgentId}
                    onClick={() => {
                      onSelectAgent(agent.id)
                      onClose()
                    }}
                    index={i}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default function AgentDrawer(props: AgentDrawerProps) {
  return (
    <>
      <MobileDrawer {...props} />
      <DesktopPanel {...props} />
    </>
  )
}
