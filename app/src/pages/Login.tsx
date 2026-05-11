import { useState } from 'react'
import { motion } from 'framer-motion'
import BrandPanel from './login/BrandPanel'
import AuthPanel from './login/AuthPanel'

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function Login() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col lg:flex-row">
      {/* Left Brand Panel - Desktop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="hidden lg:flex lg:w-[45%]"
      >
        <BrandPanel />
      </motion.div>

      {/* Mobile Brand Header */}
      <div className="flex lg:hidden">
        <BrandPanel isMobile />
      </div>

      {/* Right Auth Panel */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: easeOut, delay: 0.1 }}
        className="flex flex-1 items-center justify-center bg-white"
      >
        <AuthPanel activeTab={activeTab} onTabChange={setActiveTab} />
      </motion.div>
    </div>
  )
}
