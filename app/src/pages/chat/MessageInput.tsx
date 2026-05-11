import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, Send } from 'lucide-react'

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface MessageInputProps {
  onSend: (content: string, type?: 'text' | 'image') => void
  disabled?: boolean
}

export default function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isComposing = useRef(false)

  const canSend = text.trim().length > 0 && !disabled

  const adjustHeight = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const newHeight = Math.min(el.scrollHeight, 120) // max 120px (4 lines)
    el.style.height = `${Math.max(newHeight, 40)}px`
  }, [])

  const handleSend = useCallback(() => {
    if (!canSend) return
    onSend(text.trim())
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [canSend, onSend, text])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !isComposing.current) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setText(e.target.value)
      adjustHeight()
    },
    [adjustHeight]
  )

  const handleImageSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const compressImage = useCallback((file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxWidth = 1024
          const scale = Math.min(1, maxWidth / img.width)
          canvas.width = img.width * scale
          canvas.height = img.height * scale
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Canvas not supported'))
            return
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', 0.8))
        }
        img.onerror = reject
        img.src = event.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }, [])

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const base64 = await compressImage(file)
        onSend(base64, 'image')
      } catch (err) {
        console.error('Image compression failed', err)
      } finally {
        e.target.value = ''
      }
    },
    [onSend, compressImage]
  )

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: easeOut, delay: 0.2 }}
      className="flex-shrink-0 border-t border-[#E5E7EB] bg-white px-4 py-2.5"
    >
      <div className="flex items-center gap-2.5">
        {/* Image button */}
        <button
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[#9CA3AF] transition-colors hover:bg-[#F3F4F6]"
          aria-label="发送图片"
          onClick={handleImageSelect}
        >
          <ImageIcon className="h-[22px] w-[22px]" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />

        {/* Textarea */}
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => { isComposing.current = true }}
            onCompositionEnd={() => { isComposing.current = false }}
            placeholder={disabled ? '连接已断开' : '输入消息...'}
            disabled={disabled}
            rows={1}
            className="w-full resize-none rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5 text-sm leading-5 text-[#374151] outline-none transition-all placeholder:text-[#D1D5DB] focus:border-[#4F7BF7] focus:shadow-[0_0_0_2px_rgba(79,123,247,0.1)] disabled:opacity-50"
            style={{
              minHeight: 40,
              maxHeight: 120,
              overflowY: 'auto',
            }}
          />
        </div>

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={!canSend}
          whileTap={canSend ? { scale: 0.92 } : undefined}
          animate={
            canSend
              ? { rotate: 0, scale: 1, backgroundColor: '#4F7BF7' }
              : { rotate: 0, scale: 1, backgroundColor: '#E5E7EB' }
          }
          transition={{ duration: 0.2, ...springTransition }}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:enabled:bg-[#3B6AE8] disabled:cursor-not-allowed"
          aria-label="发送"
        >
          <Send className="h-[18px] w-[18px]" style={{ color: canSend ? '#FFFFFF' : '#9CA3AF' }} />
        </motion.button>
      </div>
    </motion.div>
  )
}

const springTransition = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
} as const
