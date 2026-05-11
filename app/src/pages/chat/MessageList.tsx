import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { ChevronDown, X } from 'lucide-react'
import type { Message } from './types'
import TypingIndicator from './TypingIndicator'

const springTransition = {
  type: 'spring',
  stiffness: 350,
  damping: 25,
} as const

interface MessageListProps {
  messages: Message[]
  isTyping: boolean
  agentAvatar?: string
}

function UserBubble({ message, onImageClick }: { message: Message; onImageClick?: (url: string) => void }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, x: 20 }}
      animate={{ scale: 1, opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ...springTransition }}
      className="mb-3 flex justify-end"
    >
      <div className="flex max-w-[75%] flex-col items-end sm:max-w-[65%]">
        <div
          className="break-words rounded-[16px_16px_4px_16px] bg-[#4F7BF7] px-4 py-2.5 text-sm leading-relaxed text-white"
          style={{ wordBreak: 'break-word' }}
        >
          {message.type === 'image' ? (
            <img
              src={message.content}
              alt="图片消息"
              className="max-w-full cursor-pointer rounded-lg"
              onClick={() => onImageClick?.(message.content)}
            />
          ) : (
            message.content
          )}
        </div>
        <span className="mt-1 px-1 text-[11px] font-medium text-[#9CA3AF]">
          {format(message.timestamp, 'HH:mm', { locale: zhCN })}
        </span>
      </div>
    </motion.div>
  )
}

function AgentBubble({ message, avatar, onAvatarClick, onImageClick }: { message: Message; avatar?: string; onAvatarClick?: (url: string) => void; onImageClick?: (url: string) => void }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, x: -20 }}
      animate={{ scale: 1, opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ...springTransition }}
      className="mb-3 flex items-end"
    >
      <img
        src={avatar || '/avatar-placeholder.png'}
        alt=""
        className="mr-2 h-7 w-7 flex-shrink-0 cursor-pointer self-start rounded-full"
        onClick={() => onAvatarClick?.(avatar || '/avatar-placeholder.png')}
      />
      <div className="flex max-w-[75%] flex-col sm:max-w-[65%]">
        <div className="break-words rounded-[16px_16px_16px_4px] border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm leading-relaxed text-[#374151] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {message.type === 'image' ? (
            <img
              src={message.content}
              alt="图片消息"
              className="max-w-full cursor-pointer rounded-lg"
              onClick={() => onImageClick?.(message.content)}
            />
          ) : (
            message.content
          )}
        </div>
        <span className="mt-1 px-1 text-[11px] font-medium text-[#9CA3AF]">
          {format(message.timestamp, 'HH:mm', { locale: zhCN })}
        </span>
      </div>
    </motion.div>
  )
}

function SystemMessage({ message }: { message: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="my-4 flex justify-center"
    >
      <span className="text-xs italic text-[#9CA3AF]">{message.content}</span>
    </motion.div>
  )
}

function MessageBubble({ message, agentAvatar, onAvatarClick, onImageClick }: { message: Message; agentAvatar?: string; onAvatarClick?: (url: string) => void; onImageClick?: (url: string) => void }) {
  switch (message.sender) {
    case 'user':
      return <UserBubble message={message} onImageClick={onImageClick} />
    case 'agent':
      return <AgentBubble message={message} avatar={agentAvatar} onAvatarClick={onAvatarClick} onImageClick={onImageClick} />
    case 'system':
      return <SystemMessage message={message} />
    default:
      return null
  }
}

export default function MessageList({ messages, isTyping, agentAvatar }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [unreadWhileScrolled, setUnreadWhileScrolled] = useState(0)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const prevMessageCount = useRef(messages.length)
  const isNearBottom = useRef(true)

  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  }, [])

  // Auto-scroll on new message if near bottom
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const newMessages = messages.length - prevMessageCount.current
      if (isNearBottom.current) {
        scrollToBottom()
      } else {
        setUnreadWhileScrolled((prev) => prev + newMessages)
      }
    }
    prevMessageCount.current = messages.length
  }, [messages.length, scrollToBottom])

  // Scroll on typing indicator
  useEffect(() => {
    if (isTyping && isNearBottom.current) {
      scrollToBottom()
    }
  }, [isTyping, scrollToBottom])

  // Initial scroll
  useEffect(() => {
    scrollToBottom(false)
  }, [scrollToBottom])

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    const nearBottom = scrollHeight - scrollTop - clientHeight < 200
    isNearBottom.current = nearBottom
    setShowScrollButton(!nearBottom)
    if (nearBottom) {
      setUnreadWhileScrolled(0)
    }
  }, [])

  const hasMessages = messages.length > 0

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto bg-[#F3F4F6] p-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {!hasMessages ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex h-full flex-col items-center justify-center"
          >
            <img
              src="/empty-state-chat.png"
              alt=""
              className="h-[120px] w-[120px] object-contain opacity-60"
            />
            <p className="mt-4 text-sm text-[#9CA3AF]">
              发送第一条消息，开始对话吧
            </p>
          </motion.div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} agentAvatar={agentAvatar} onAvatarClick={setPreviewImage} onImageClick={setPreviewImage} />
            ))}
          </AnimatePresence>
        )}

        <AnimatePresence>
          {isTyping && <TypingIndicator />}
        </AnimatePresence>

        {/* Avatar Preview Modal */}
        <AnimatePresence>
          {previewImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
              onClick={() => setPreviewImage(null)}
            >
              <motion.img
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.8 }}
                src={previewImage}
                alt="头像预览"
                className="max-h-[80vh] max-w-[80vw] rounded-lg object-contain"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className="absolute right-4 top-4 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
                onClick={() => setPreviewImage(null)}
              >
                <X className="h-6 w-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom spacer */}
        <div className="h-2" />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2, ...springTransition }}
            onClick={() => scrollToBottom()}
            className="absolute bottom-4 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E7EB] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
            aria-label="滚动到底部"
          >
            <ChevronDown className="h-5 w-5 text-[#6B7280]" />
            {unreadWhileScrolled > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white">
                {unreadWhileScrolled}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
