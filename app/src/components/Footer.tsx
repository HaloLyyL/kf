import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Zap, Copy, Check } from 'lucide-react'
import { useState } from 'react'

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function Footer() {
  const [copied, setCopied] = useState(false)

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('support@connecthub.com').catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-[1200px] px-6 py-12 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="grid grid-cols-1 gap-10 md:grid-cols-3"
        >
          {/* Column 1 - Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F7BF7]">
                <MessageCircle className="h-5 w-5 text-white" />
                <Zap className="absolute h-3 w-3 text-white" style={{ top: '5px', left: '9px' }} />
              </div>
              <span className="text-lg font-bold text-gray-900">ConnectHub</span>
            </Link>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-400">
              专业的在线客服沟通平台
            </p>
          </div>

          {/* Column 2 - Quick Links */}
          <div>
            <h4 className="text-[13px] font-semibold text-gray-700">快速链接</h4>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                to="/"
                className="text-xs font-medium text-gray-400 transition-colors duration-200 hover:text-[#4F7BF7]"
              >
                首页
              </Link>
              <Link
                to="/#features"
                className="text-xs font-medium text-gray-400 transition-colors duration-200 hover:text-[#4F7BF7]"
              >
                功能介绍
              </Link>
              <Link
                to="/login"
                className="text-xs font-medium text-gray-400 transition-colors duration-200 hover:text-[#4F7BF7]"
              >
                客服登录
              </Link>
            </div>
          </div>

          {/* Column 3 - Contact */}
          <div>
            <h4 className="text-[13px] font-semibold text-gray-700">联系我们</h4>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400">support@connecthub.com</span>
              <button
                onClick={handleCopyEmail}
                className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors duration-200 hover:text-[#4F7BF7]"
                aria-label="复制邮箱地址"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t border-gray-200 pt-4">
          <p className="text-center text-xs font-medium text-gray-400">
            &copy; 2024 ConnectHub. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
