import { motion } from 'framer-motion'
import { Users, MoreVertical, ChevronLeft } from 'lucide-react'
import type { Agent } from './types'

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface ChatHeaderProps {
  agent: Agent
  connectionStatus: 'connecting' | 'connected' | 'disconnected'
  isMobile: boolean
  showAgentList: boolean
  onToggleAgentList: () => void
  onBack?: () => void
}

function StatusDot({ status }: { status: Agent['status'] }) {
  const colorMap = {
    online: '#10B981',
    away: '#F59E0B',
    offline: '#D1D5DB',
  }
  const color = colorMap[status]
  const isOnline = status === 'online'

  return (
    <span className="relative flex h-2.5 w-2.5">
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{
          backgroundColor: color,
          animation: isOnline ? 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none',
        }}
      />
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </span>
  )
}

function StatusText({
  agentStatus,
  connectionStatus,
}: {
  agentStatus: Agent['status']
  connectionStatus: ChatHeaderProps['connectionStatus']
}) {
  if (connectionStatus === 'connecting') return <span className="text-xs text-[#9CA3AF]">连接中...</span>
  if (connectionStatus === 'disconnected') return <span className="text-xs text-[#EF4444]">已断开</span>

  const statusMap = {
    online: { text: '在线', color: '#10B981' },
    away: { text: '离开', color: '#F59E0B' },
    offline: { text: '离线', color: '#9CA3AF]' },
  }
  const s = statusMap[agentStatus]
  return (
    <span className="text-xs" style={{ color: s.color === '#9CA3AF]' ? '#9CA3AF' : s.color }}>
      {s.text}
    </span>
  )
}

export default function ChatHeader({
  agent,
  connectionStatus,
  isMobile,
  showAgentList,
  onToggleAgentList,
  onBack,
}: ChatHeaderProps) {
  return (
    <motion.header
      initial={{ y: -56, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: easeOut }}
      className="flex h-14 flex-shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-4"
    >
      {/* Left side */}
      <div className="flex items-center gap-3">
        {isMobile && showAgentList && onBack && (
          <button
            onClick={onBack}
            className="mr-1 flex h-9 w-9 items-center justify-center text-[#6B7280] transition-colors hover:text-[#374151]"
            aria-label="返回"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Avatar with status */}
        <div className="relative">
          <img
            src={agent.avatar}
            alt={agent.name}
            className="h-9 w-9 rounded-full object-cover"
          />
          <div className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-white">
            <StatusDot status={agent.status} />
          </div>
        </div>

        {/* Agent info */}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[#374151]">{agent.name}</span>
          <StatusText agentStatus={agent.status} connectionStatus={connectionStatus} />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleAgentList}
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#6B7280]"
          aria-label="切换客服"
        >
          <Users className="h-5 w-5" />
          {/* Badge for other available agents */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#EF4444]" />
        </button>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6] hover:text-[#6B7280]"
          aria-label="更多"
        >
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </motion.header>
  )
}
