import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Smartphone, LayoutDashboard } from 'lucide-react'
import { memo } from 'react'

/* ─── Easing ─── */
const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]
const spring = { type: 'spring' as const, stiffness: 300, damping: 24 }

/* ─── Floating Illustration (isolated perpetual animation) ─── */
const FloatingIllustration = memo(function FloatingIllustration() {
  return (
    <motion.div
      animate={{ y: [-8, 8, -8] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      className="w-full max-w-[500px]"
    >
      <img
        src="/hero-illustration.png"
        alt="ConnectHub 平台 illustration"
        className="h-auto w-full"
        loading="eager"
      />
    </motion.div>
  )
})

/* ─── Gradient Blobs (CSS animation, pure background) ─── */
const GradientBlobs = memo(function GradientBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute h-[500px] w-[500px] rounded-full opacity-50"
        style={{
          background: '#EEF4FF',
          filter: 'blur(100px)',
          top: '10%',
          left: '-10%',
          animation: 'blobMove1 12s ease-in-out infinite',
        }}
      />
      <div
        className="absolute h-[400px] w-[400px] rounded-full opacity-50"
        style={{
          background: '#E0E7FF',
          filter: 'blur(100px)',
          top: '30%',
          right: '-10%',
          animation: 'blobMove2 10s ease-in-out infinite',
        }}
      />
      <style>{`
        @keyframes blobMove1 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(60px, 40px); }
        }
        @keyframes blobMove2 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-50px, 30px); }
        }
      `}</style>
    </div>
  )
})

/* ─── CTA Floating Particles ─── */
const FloatingParticles = memo(function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 4,
  }))

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute h-1 w-1 rounded-full bg-white"
          style={{
            left: p.left,
            top: p.top,
            opacity: 0.1,
            animation: `particleDrift ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes particleDrift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -30px); }
        }
      `}</style>
    </div>
  )
})

/* ─── Feature Card ─── */
interface FeatureCardProps {
  icon: React.ReactNode
  title: string
  description: string
  image: string
  index: number
}

function FeatureCard({ icon, title, description, image, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-25%' }}
      transition={{ duration: 0.5, ease: easeOut, delay: index * 0.12 }}
      whileHover={{ y: -4, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
      className="rounded-xl bg-white p-6 shadow-card transition-shadow duration-250"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        transition={spring}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF4FF]"
      >
        {icon}
      </motion.div>
      <h3 className="mt-4 text-lg font-semibold text-gray-700">{title}</h3>
      <p className="mt-2 text-[13px] leading-relaxed text-gray-500">{description}</p>
      <img
        src={image}
        alt={title}
        className="mt-4 h-auto max-h-[120px] w-full object-contain"
        loading="lazy"
      />
    </motion.div>
  )
}

/* ─── How It Works Step ─── */
interface StepProps {
  number: string
  title: string
  description: string
  index: number
  align: 'left' | 'right'
}

function Step({ number, title, description, index, align }: StepProps) {
  const isLeft = align === 'left'
  return (
    <div className={`flex w-full items-center gap-6 md:w-[calc(50%-24px)] ${isLeft ? 'md:mr-auto md:flex-row' : 'md:ml-auto md:flex-row-reverse'}`}>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: index * 0.2 }}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#4F7BF7] text-lg font-semibold text-white md:h-14 md:w-14 md:text-xl"
      >
        {number}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 0.5, ease: easeOut, delay: index * 0.2 + 0.1 }}
        className={`rounded-xl bg-gray-50 p-5 ${isLeft ? 'md:text-left' : 'md:text-right'}`}
      >
        <h4 className="text-base font-semibold text-gray-700">{title}</h4>
        <p className="mt-1 text-[13px] leading-relaxed text-gray-500">{description}</p>
      </motion.div>
    </div>
  )
}

/* ─── Trust Badge Avatars ─── */
const avatarColors = ['#4F7BF7', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

function TrustBadge() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.7 }}
      className="mt-8 flex items-center gap-3"
    >
      <div className="flex -space-x-2">
        {avatarColors.map((color, i) => (
          <div
            key={i}
            className="h-7 w-7 rounded-full border-2 border-white"
            style={{ backgroundColor: color, zIndex: avatarColors.length - i }}
          />
        ))}
      </div>
      <span className="text-xs font-medium text-gray-400">
        已有 2,000+ 企业信赖使用
      </span>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Home() {
  return (
    <div>
      {/* ═══════ Section 2: Hero ═══════ */}
      <section className="relative overflow-hidden pt-16">
        <GradientBlobs />
        <div className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-[1200px] flex-col items-center justify-center px-5 py-16 md:flex-row md:px-6 md:py-20">
          {/* Left Column — Text */}
          <div className="flex flex-1 flex-col items-start justify-center md:max-w-[55%]">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: easeOut }}
              className="max-w-[520px] text-4xl font-bold leading-[1.1] tracking-[-0.02em] text-gray-900 md:text-[48px]"
            >
              {'实时连接，'.split('').map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: easeOut, delay: i * 0.04 }}
                >
                  {char}
                </motion.span>
              ))}
              <br />
              {'高效沟通'.split('').map((char, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: easeOut, delay: 0.32 + i * 0.04 }}
                >
                  {char}
                </motion.span>
              ))}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeOut, delay: 0.3 }}
              className="mt-6 max-w-[480px] text-[17px] leading-relaxed text-gray-500"
            >
              ConnectHub 为企业提供专业的在线客服解决方案。用户一键直达，客服多端协同，让每一次对话都高效且温暖。
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: easeOut, delay: 0.5 }}
              className="mt-10 flex w-full flex-col gap-4 sm:flex-row"
            >
              <Link
                to="/chat"
                className="rounded-xl bg-[#4F7BF7] px-8 py-3.5 text-center text-base font-semibold text-white transition-colors duration-200 hover:bg-[#3B6AE8]"
              >
                开始对话
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-gray-200 bg-gray-100 px-8 py-3.5 text-center text-base font-semibold text-gray-700 transition-colors duration-200 hover:bg-gray-200"
              >
                客服登录
              </Link>
            </motion.div>

            <TrustBadge />
          </div>

          {/* Right Column — Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: easeOut, delay: 0.2 }}
            className="mt-12 flex flex-1 items-center justify-center md:mt-0 md:max-w-[45%]"
          >
            <FloatingIllustration />
          </motion.div>
        </div>
      </section>

      {/* ═══════ Section 3: Features ═══════ */}
      <section id="features" className="bg-gray-50 py-24">
        <div className="mx-auto max-w-[1200px] px-5 md:px-6">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="text-center"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-[#4F7BF7]">
              核心功能
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.01em] text-gray-900 md:text-[28px]">
              为什么选择 ConnectHub
            </h2>
            <p className="mt-2 text-[15px] text-gray-500">
              一站式客服沟通平台，让服务更高效
            </p>
          </motion.div>

          {/* Feature Cards Grid */}
          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            <FeatureCard
              icon={<MessageCircle className="h-6 w-6 text-[#4F7BF7]" />}
              title="实时对话"
              description="用户点击链接即可与客服建立即时连接，消息秒级送达，沟通零延迟。"
              image="/feature-chat.png"
              index={0}
            />
            <FeatureCard
              icon={<Smartphone className="h-6 w-6 text-[#4F7BF7]" />}
              title="多端适配"
              description="无论是在手机还是电脑上，都能获得一致且流畅的聊天体验，自适应布局完美适配各种屏幕。"
              image="/feature-mobile.png"
              index={1}
            />
            <FeatureCard
              icon={<LayoutDashboard className="h-6 w-6 text-[#4F7BF7]" />}
              title="智能管理"
              description="客服可同时管理多个会话，快速切换用户对话，消息提醒不错过任何一条客户咨询。"
              image="/feature-dashboard.png"
              index={2}
            />
          </div>
        </div>
      </section>

      {/* ═══════ Section 4: How It Works ═══════ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-[1000px] px-5 md:px-6">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="text-center"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-[#4F7BF7]">
              使用流程
            </span>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.01em] text-gray-900 md:text-[28px]">
              三步开启高效沟通
            </h2>
          </motion.div>

          {/* Timeline */}
          <div className="relative mt-16">
            {/* Vertical Line (desktop only) */}
            <div className="absolute left-1/2 top-0 hidden h-full w-0.5 -translate-x-1/2 bg-gray-200 md:block" />

            {/* Mobile vertical line */}
            <div className="absolute left-6 top-0 h-full w-0.5 bg-gray-200 md:hidden" />

            <div className="relative flex flex-col gap-12">
              {/* Step 1 */}
              <Step
                number="01"
                title="用户点击链接"
                description="用户通过专属链接进入，系统自动识别用户ID和客服ID。"
                index={0}
                align="left"
              />

              {/* Step 2 */}
              <Step
                number="02"
                title="建立实时连接"
                description="客服保持在线状态，用户发送消息后客服即时收到通知并回复。"
                index={1}
                align="right"
              />

              {/* Step 3 */}
              <Step
                number="03"
                title="灵活切换会话"
                description="客服可同时处理多个用户咨询，用户也可以在不同客服间自由切换。"
                index={2}
                align="left"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ Section 5: CTA ═══════ */}
      <section className="relative overflow-hidden bg-[#4F7BF7] py-20">
        <FloatingParticles />
        <div className="relative z-10 mx-auto max-w-[800px] px-5 text-center md:px-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="text-2xl font-bold text-white md:text-[28px]"
          >
            准备好提升您的客户服务了吗？
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-3 text-base text-white/80"
          >
            立即注册，免费体验 ConnectHub 的强大功能
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-20%' }}
            transition={{ duration: 0.4, ...spring, delay: 0.3 }}
            className="mt-8"
          >
            <Link
              to="/login"
              className="inline-block rounded-xl bg-white px-10 py-3.5 text-base font-semibold text-[#4F7BF7] shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              免费注册
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
