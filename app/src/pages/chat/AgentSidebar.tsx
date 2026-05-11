import { motion } from 'framer-motion'
import { MessageSquare } from 'lucide-react'
import type { Agent } from './types'

interface AgentSidebarProps {
  agents: Agent[]
  currentAgentId: string
  onSelectAgent: (agentId: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

function StatusDot({ status }: { status: Agent['status'] }) {
  const colorMap = {
    online: '#10B981',
    away: '#F59E0B',
    offline: '#D1D5DB',
  }
  return (
    <span
      className="h-2.5 w-2.5 rounded-full border-2 border-white"
      style={{ backgroundColor: colorMap[status] }}
    />
  )
}

export default function AgentSidebar({
  agents,
  currentAgentId,
  onSelectAgent,
  isCollapsed,
  onToggleCollapse,
}: AgentSidebarProps) {
  return (
    <motion.aside
      initial={{ width: 280 }}
      animate={{ width: isCollapsed ? 0 : 280 }}
      transition={{ duration: 0.3, ease: [0.65, 0, 0.35, 1] as [number, number, number, number] }}
      className="hidden flex-shrink-0 overflow-hidden border-r border-[#E5E7EB] bg-[#F8FAFC] sm:flex"
      style={{ width: isCollapsed ? 0 : 280 }}
    >
      <div className="flex h-full w-[280px] flex-col">
        {/* Sidebar Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#E5E7EB] px-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-[#4F7BF7]" />
            <span className="text-sm font-semibold text-[#374151]">客服列表</span>
          </div>
          <button
            onClick={onToggleCollapse}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#E5E7EB]"
            aria-label="收起侧边栏"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Agent list */}
        <div className="flex-1 overflow-y-auto p-2">
          {agents.map((agent, i) => {
            const isActive = agent.id === currentAgentId
            return (
              <motion.button
                key={agent.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: i * 0.05 }}
                onClick={() => onSelectAgent(agent.id)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors"
                style={{
                  backgroundColor: isActive ? '#EEF4FF' : 'transparent',
                  borderLeft: isActive ? '3px solid #4F7BF7' : '3px solid transparent',
                }}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusDot status={agent.status} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`truncate text-sm ${isActive ? 'font-semibold text-[#4F7BF7]' : 'font-medium text-[#374151]'}`}
                    >
                      {agent.name}
                    </span>
                    {agent.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#EF4444] px-1.5 text-[10px] font-bold text-white">
                        {agent.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#9CA3AF]">{agent.lastMessage}</p>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </motion.aside>
  )
}
