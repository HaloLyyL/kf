import { motion } from 'framer-motion'
import { CheckCircle } from 'lucide-react'

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

const features = ['实时消息', '多端同步', '会话管理']

interface BrandPanelProps {
  isMobile?: boolean
}

export default function BrandPanel({ isMobile = false }: BrandPanelProps) {
  if (isMobile) {
    return (
      <div className="w-full bg-gradient-to-br from-[#4F7BF7] to-[#2C56C8] px-6 py-8">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="ConnectHub" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-bold text-white">ConnectHub</span>
        </div>

        {/* Tagline */}
        <h2 className="mt-5 text-xl font-semibold text-white">高效连接每一个客户</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-white/75">
          登录后即可管理您的客服会话，与客户实时沟通。
        </p>

        {/* Feature Pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {features.map((feature) => (
            <span
              key={feature}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium text-white"
            >
              <CheckCircle className="h-3 w-3" />
              {feature}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-[100dvh] w-full flex-col overflow-hidden bg-gradient-to-br from-[#4F7BF7] to-[#2C56C8]">
      {/* Decorative Floating Circles */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute rounded-full bg-white/[0.06]"
          style={{
            width: '400px',
            height: '400px',
            top: '-100px',
            left: '-100px',
            animation: 'drift 12s ease-in-out infinite',
          }}
        />
        <div
          className="absolute rounded-full bg-white/[0.06]"
          style={{
            width: '300px',
            height: '300px',
            top: '40%',
            right: '-80px',
            animation: 'drift 12s ease-in-out infinite 4s',
          }}
        />
        <div
          className="absolute rounded-full bg-white/[0.06]"
          style={{
            width: '250px',
            height: '250px',
            bottom: '10%',
            left: '10%',
            animation: 'drift 12s ease-in-out infinite 8s',
          }}
        />
      </div>

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut, delay: 0.1 }}
        className="relative z-10 flex items-center gap-2.5 p-10"
      >
        <img src="/logo.png" alt="ConnectHub" className="h-8 w-8 rounded-lg" />
        <span className="text-lg font-semibold text-white">ConnectHub</span>
      </motion.div>

      {/* Center Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-10 pb-10">
        {/* Illustration */}
        <motion.img
          src="/hero-illustration.png"
          alt=""
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: easeOut, delay: 0.2 }}
          className="max-w-[320px] w-full"
          style={{
            filter: 'brightness(0) invert(1)',
            animation: 'float 5s ease-in-out infinite',
          }}
        />

        {/* Tagline */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut, delay: 0.4 }}
          className="mt-8 text-center text-[28px] font-semibold leading-tight text-white"
          style={{ letterSpacing: '-0.01em' }}
        >
          高效连接每一个客户
        </motion.h2>

        {/* Sub-tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease: easeOut, delay: 0.55 }}
          className="mt-3 max-w-[360px] text-center text-[15px] leading-relaxed text-white/75"
        >
          登录后即可管理您的客服会话，与客户实时沟通。
        </motion.p>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut, delay: 0.7 }}
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          {features.map((feature, index) => (
            <motion.span
              key={feature}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: easeOut, delay: 0.7 + index * 0.1 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-medium text-white"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {feature}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* Keyframe for drift */}
      <style>{`
        @keyframes drift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(20px, -20px); }
          50% { transform: translate(-10px, 15px); }
          75% { transform: translate(15px, 10px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
