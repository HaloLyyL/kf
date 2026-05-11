import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface LoginFormProps {
  onRegisterClick: () => void
}

interface FormErrors {
  username?: string
  password?: string
  general?: string
}

const CURRENT_USER_KEY = 'currentUser'
const REMEMBER_KEY = 'rememberUsername'

export default function LoginForm({ onRegisterClick }: LoginFormProps) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_KEY)
    if (remembered) {
      setUsername(remembered)
      setRememberMe(true)
    }
  }, [])

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}
    if (!username.trim()) {
      newErrors.username = '请输入用户名'
    } else if (username.trim().length < 3) {
      newErrors.username = '用户名至少3个字符'
    }
    if (!password) {
      newErrors.password = '请输入密码'
    } else if (password.length < 6) {
      newErrors.password = '密码至少6位'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [username, password])

  const doLogin = useCallback(async (inputUsername: string, inputPassword: string) => {
    setIsLoading(true)
    try {
      const res = await api.login({ username: inputUsername.trim(), password: inputPassword })
      const user = res.user!
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ username: user.username, displayName: user.displayName, role: user.role }))
      if (rememberMe) {
        localStorage.setItem(REMEMBER_KEY, user.username)
      } else {
        localStorage.removeItem(REMEMBER_KEY)
      }
      if (user.role === 'agent') {
        navigate('/agent')
      } else {
        navigate('/chat')
      }
      return true
    } catch (err: any) {
      setErrors({ general: err.message || '登录失败' })
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [rememberMe, navigate])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }
    await doLogin(username, password)
  }, [validate, doLogin, username, password])

  const clearError = useCallback((field: keyof FormErrors) => {
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const fieldVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: easeOut, delay: i * 0.06 },
    }),
  }

  return (
    <motion.div
      animate={shake ? { x: [0, -4, 4, -4, 4, -4, 4, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {/* Title */}
      <motion.h1
        custom={0}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="text-[28px] font-semibold leading-tight text-[#111827]"
        style={{ letterSpacing: '-0.01em' }}
      >
        欢迎回来
      </motion.h1>
      <motion.p
        custom={1}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="mt-1 text-[15px] text-[#9CA3AF]"
      >
        请输入您的账号信息登录
      </motion.p>

      {errors.general && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 mt-2 rounded-lg bg-red-50 py-2.5 text-center text-sm font-medium text-red-500"
        >
          {errors.general}
        </motion.div>
      )}
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Username Field */}
        <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">用户名</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#D1D5DB]" />
            <input
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => { setUsername(e.target.value); clearError('username') }}
              onBlur={() => { if (username) validate() }}
              className={`h-11 w-full rounded-[10px] border bg-white py-0 pl-10 pr-4 text-[15px] text-[#374151] outline-none transition-all duration-200 placeholder:text-[#D1D5DB] ${
                errors.username
                  ? 'border-[#EF4444] shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                  : 'border-[#E5E7EB] focus:border-[#4F7BF7] focus:shadow-[0_0_0_3px_rgba(79,123,247,0.1)]'
              }`}
            />
          </div>
          {errors.username && (
            <p className="mt-1 text-xs text-[#EF4444]">{errors.username}</p>
          )}
        </motion.div>

        {/* Password Field */}
        <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">密码</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#D1D5DB]" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入密码"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError('password') }}
              onBlur={() => { if (password) validate() }}
              className={`h-11 w-full rounded-[10px] border bg-white py-0 pl-10 pr-10 text-[15px] text-[#374151] outline-none transition-all duration-200 placeholder:text-[#D1D5DB] ${
                errors.password
                  ? 'border-[#EF4444] shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                  : 'border-[#E5E7EB] focus:border-[#4F7BF7] focus:shadow-[0_0_0_3px_rgba(79,123,247,0.1)]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D1D5DB] transition-colors hover:text-[#9CA3AF]"
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-[#EF4444]">{errors.password}</p>
          )}
        </motion.div>

        {/* Remember Me + Forgot Password */}
        <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="visible" className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-[#E5E7EB] text-[#4F7BF7] accent-[#4F7BF7] focus:ring-[#4F7BF7]"
            />
            <span className="text-[13px] text-[#6B7280]">记住我</span>
          </label>
          <button type="button" className="text-[13px] font-medium text-[#4F7BF7] transition-colors hover:text-[#3B6AE8]">
            忘记密码？
          </button>
        </motion.div>

        {/* Submit Button */}
        <motion.div custom={5} variants={fieldVariants} initial="hidden" animate="visible">
          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-[#4F7BF7] text-base font-semibold text-white transition-all duration-200 hover:bg-[#3B6AE8] active:bg-[#2C56C8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              '登录'
            )}
          </button>
        </motion.div>
      </form>

      {/* Register Link */}
      <motion.p
        custom={8}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="mt-6 text-center text-[13px] text-[#9CA3AF]"
      >
        还没有账号？
        <button
          type="button"
          onClick={onRegisterClick}
          className="ml-1 font-medium text-[#4F7BF7] transition-colors hover:text-[#3B6AE8]"
        >
          立即注册
        </button>
      </motion.p>
    </motion.div>
  )
}
