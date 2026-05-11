import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, MessageCircle, Zap } from 'lucide-react'

const navLinks = [
  { label: '首页', href: '/' },
  { label: '功能', href: '/#features' },
  { label: '价格', href: '/#pricing' },
]

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]
const easeInOut = [0.65, 0, 0.35, 1] as [number, number, number, number]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <motion.nav
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: easeOut, delay: 0.1 }}
        className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-gray-200 bg-white/80 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F7BF7]">
              <MessageCircle className="h-5 w-5 text-white" />
              <Zap className="absolute h-3 w-3 text-white" style={{ top: '5px', left: '9px' }} />
            </div>
            <span className="text-lg font-bold text-gray-900">ConnectHub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link, i) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 + i * 0.05 }}
              >
                <Link
                  to={link.href}
                  className="text-[15px] font-medium text-gray-500 transition-colors duration-200 hover:text-[#4F7BF7]"
                >
                  {link.label}
                </Link>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.35 }}
            >
              <Link
                to="/login"
                className="rounded-lg bg-[#4F7BF7] px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#3B6AE8]"
              >
                客服登录
              </Link>
            </motion.div>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="flex h-10 w-10 items-center justify-center text-gray-700 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="打开菜单"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </motion.nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.3, ease: easeInOut }}
              className="fixed right-0 top-0 z-[70] h-full w-[280px] bg-white shadow-xl"
            >
              <div className="flex h-16 items-center justify-between px-5 border-b border-gray-200">
                <span className="text-lg font-bold text-gray-900">ConnectHub</span>
                <button
                  className="flex h-10 w-10 items-center justify-center text-gray-700"
                  onClick={() => setMobileOpen(false)}
                  aria-label="关闭菜单"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex flex-col gap-4 p-5">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-semibold text-gray-700 transition-colors duration-200 hover:text-[#4F7BF7]"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 rounded-lg bg-[#4F7BF7] px-5 py-3 text-center text-base font-semibold text-white transition-colors duration-200 hover:bg-[#3B6AE8]"
                >
                  客服登录
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
