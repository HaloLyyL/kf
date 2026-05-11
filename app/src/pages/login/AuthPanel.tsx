import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import LoginForm from './LoginForm'
import RegisterForm from './RegisterForm'

const easeInOut = [0.65, 0, 0.35, 1] as [number, number, number, number]

interface AuthPanelProps {
  activeTab: 'login' | 'register'
  onTabChange: (tab: 'login' | 'register') => void
}

export default function AuthPanel({ activeTab, onTabChange }: AuthPanelProps) {
  const [direction, setDirection] = useState(1)

  const handleTabChange = useCallback((tab: 'login' | 'register') => {
    setDirection(tab === 'login' ? -1 : 1)
    onTabChange(tab)
  }, [onTabChange])

  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (d: number) => ({
      x: d > 0 ? -40 : 40,
      opacity: 0,
    }),
  }

  return (
    <div className="w-full max-w-[420px] px-6 py-8 lg:px-8">
      {/* Tab Switcher */}
      <div className="flex">
        <button
          type="button"
          onClick={() => handleTabChange('login')}
          className={`flex-1 pb-3 text-center text-lg font-semibold transition-colors duration-200 border-b-2 ${
            activeTab === 'login'
              ? 'border-[#4F7BF7] text-[#4F7BF7]'
              : 'border-transparent text-[#9CA3AF] hover:text-[#6B7280]'
          }`}
        >
          登录
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('register')}
          className={`flex-1 pb-3 text-center text-lg font-semibold transition-colors duration-200 border-b-2 ${
            activeTab === 'register'
              ? 'border-[#4F7BF7] text-[#4F7BF7]'
              : 'border-transparent text-[#9CA3AF] hover:text-[#6B7280]'
          }`}
        >
          注册
        </button>
      </div>

      {/* Form Content with AnimatePresence */}
      <div className="relative mt-8">
        <AnimatePresence mode="wait" custom={direction}>
          {activeTab === 'login' ? (
            <motion.div
              key="login"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: easeInOut }}
            >
              <LoginForm onRegisterClick={() => handleTabChange('register')} />
            </motion.div>
          ) : (
            <motion.div
              key="register"
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: easeInOut }}
            >
              <RegisterForm onLoginClick={() => handleTabChange('login')} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
