import React from 'react'
import { motion } from 'framer-motion'

const TypingIndicator = React.memo(function TypingIndicator() {
  return (
    <div className="mb-3 flex items-end">
      <img
        src="/avatar-placeholder.png"
        alt=""
        className="mr-2 h-7 w-7 flex-shrink-0 self-start rounded-full"
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.25 }}
        className="rounded-[16px_16px_16px_4px] border border-[#E5E7EB] bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        style={{ maxWidth: '70%' }}
      >
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-1.5 w-1.5 rounded-full bg-[#9CA3AF]"
              animate={{
                scale: [0.6, 1, 0.6],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
})

export default TypingIndicator
