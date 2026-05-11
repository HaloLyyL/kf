import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../lib/api'

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number]

interface RegisterFormProps {
  onLoginClick: () => void
}

interface FormErrors {
  username?: string
  displayName?: string
  password?: string
  confirmPassword?: string
  agreeTerms?: string
  role?: string
}

interface TouchedFields {
  username: boolean
  displayName: boolean
  password: boolean
  confirmPassword: boolean
}

function getPasswordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { level: 1, label: '弱', color: '#EF4444' }
  if (score <= 3) return { level: 2, label: '中', color: '#F59E0B' }
  return { level: 3, label: '强', color: '#10B981' }
}

export default function RegisterForm({ onLoginClick }: RegisterFormProps) {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [role, setRole] = useState<'user' | 'agent'>('user')
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<TouchedFields>({
    username: false,
    displayName: false,
    password: false,
    confirmPassword: false,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [success, setSuccess] = useState(false)

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password])

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    if (!username.trim()) {
      newErrors.username = '请输入用户名'
    } else if (!/^[a-zA-Z0-9_]{3,20}$/.test(username.trim())) {
      newErrors.username = '用户名需为3-20位字母、数字或下划线'
    }

    if (!displayName.trim()) {
      newErrors.displayName = '请输入显示名称'
    } else if (displayName.trim().length < 2 || displayName.trim().length > 20) {
      newErrors.displayName = '显示名称需为2-20个字符'
    }

    if (!password) {
      newErrors.password = '请输入密码'
    } else if (password.length < 6) {
      newErrors.password = '密码至少6位'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = '请确认密码'
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = '两次输入的密码不一致'
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = '请同意服务条款和隐私政策'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [username, displayName, password, confirmPassword, agreeTerms])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    // Mark all fields as touched
    setTouched({
      username: true,
      displayName: true,
      password: true,
      confirmPassword: true,
    })
    if (!validate()) {
      setShake(true)
      setTimeout(() => setShake(false), 400)
      return
    }
    setIsLoading(true)
    try {
      await api.register({
        username: username.trim(),
        displayName: displayName.trim(),
        password,
        role,
      })
      setIsLoading(false)
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        localStorage.setItem('currentUser', JSON.stringify({ username: username.trim(), displayName: displayName.trim(), role }))
        if (role === 'agent') {
          navigate('/agent')
        } else {
          navigate('/chat')
        }
      }, 1200)
    } catch (err: any) {
      setIsLoading(false)
      setErrors({ username: err.message || '注册失败' })
      setShake(true)
      setTimeout(() => setShake(false), 400)
    }
  }, [validate, username, displayName, password, role, navigate])

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
      {/* Success overlay */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: easeOut }}
            className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-[#D1FAE5] py-3 text-sm font-medium text-[#10B981]"
          >
            <CheckCircle className="h-5 w-5" />
            注册成功！正在跳转...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title */}
      <motion.h1
        custom={0}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="text-[28px] font-semibold leading-tight text-[#111827]"
        style={{ letterSpacing: '-0.01em' }}
      >
        创建账号
      </motion.h1>
      <motion.p
        custom={1}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="mt-1 text-[15px] text-[#9CA3AF]"
      >
        注册后即可开始提供客服服务
      </motion.p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Role Selection */}
        <motion.div custom={1} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">
            注册身份 <span className="text-[#EF4444]">*</span>
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setRole('user')}
              className={`flex-1 rounded-[10px] border py-2.5 text-sm font-medium transition-all ${
                role === 'user'
                  ? 'border-[#4F7BF7] bg-[#EEF4FF] text-[#4F7BF7]'
                  : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB]'
              }`}
            >
              普通用户
            </button>
            <button
              type="button"
              onClick={() => setRole('agent')}
              className={`flex-1 rounded-[10px] border py-2.5 text-sm font-medium transition-all ${
                role === 'agent'
                  ? 'border-[#4F7BF7] bg-[#EEF4FF] text-[#4F7BF7]'
                  : 'border-[#E5E7EB] bg-white text-[#6B7280] hover:bg-[#F9FAFB]'
              }`}
            >
              客服
            </button>
          </div>
        </motion.div>

        {/* Username Field */}
        <motion.div custom={2} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">
            用户名 <span className="text-[#EF4444]">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#D1D5DB]" />
            <input
              type="text"
              placeholder="设置用户名（3-20位字母数字）"
              value={username}
              onChange={(e) => { setUsername(e.target.value); clearError('username') }}
              onBlur={() => setTouched((p) => ({ ...p, username: true }))}
              className={`h-11 w-full rounded-[10px] border bg-white py-0 pl-10 pr-4 text-[15px] text-[#374151] outline-none transition-all duration-200 placeholder:text-[#D1D5DB] ${
                errors.username && touched.username
                  ? 'border-[#EF4444] shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                  : touched.username && username.length >= 3
                    ? 'border-[#10B981]'
                    : 'border-[#E5E7EB] focus:border-[#4F7BF7] focus:shadow-[0_0_0_3px_rgba(79,123,247,0.1)]'
              }`}
            />
          </div>
          {errors.username && touched.username && (
            <p className="mt-1 text-xs text-[#EF4444]">{errors.username}</p>
          )}
        </motion.div>

        {/* Display Name Field */}
        <motion.div custom={3} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">
            显示名称 <span className="text-[#EF4444]">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#D1D5DB]" />
            <input
              type="text"
              placeholder="客户看到的名称"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); clearError('displayName') }}
              onBlur={() => setTouched((p) => ({ ...p, displayName: true }))}
              className={`h-11 w-full rounded-[10px] border bg-white py-0 pl-10 pr-4 text-[15px] text-[#374151] outline-none transition-all duration-200 placeholder:text-[#D1D5DB] ${
                errors.displayName && touched.displayName
                  ? 'border-[#EF4444] shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                  : touched.displayName && displayName.length >= 2
                    ? 'border-[#10B981]'
                    : 'border-[#E5E7EB] focus:border-[#4F7BF7] focus:shadow-[0_0_0_3px_rgba(79,123,247,0.1)]'
              }`}
            />
          </div>
          {errors.displayName && touched.displayName && (
            <p className="mt-1 text-xs text-[#EF4444]">{errors.displayName}</p>
          )}
        </motion.div>

        {/* Password Field */}
        <motion.div custom={4} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">
            密码 <span className="text-[#EF4444]">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#D1D5DB]" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="设置密码（至少6位）"
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearError('password') }}
              onBlur={() => setTouched((p) => ({ ...p, password: true }))}
              className={`h-11 w-full rounded-[10px] border bg-white py-0 pl-10 pr-10 text-[15px] text-[#374151] outline-none transition-all duration-200 placeholder:text-[#D1D5DB] ${
                errors.password && touched.password
                  ? 'border-[#EF4444] shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                  : touched.password && password.length >= 6
                    ? 'border-[#10B981]'
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
          {errors.password && touched.password && (
            <p className="mt-1 text-xs text-[#EF4444]">{errors.password}</p>
          )}

          {/* Password Strength Indicator */}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3].map((level) => (
                  <div
                    key={level}
                    className="h-1 flex-1 rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: level <= passwordStrength.level ? passwordStrength.color : '#E5E7EB',
                    }}
                  />
                ))}
              </div>
              <p className="mt-1 text-xs" style={{ color: passwordStrength.color }}>
                密码强度：{passwordStrength.label}
              </p>
            </div>
          )}
        </motion.div>

        {/* Confirm Password Field */}
        <motion.div custom={5} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="mb-1.5 block text-xs font-medium text-[#6B7280]">
            确认密码 <span className="text-[#EF4444]">*</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#D1D5DB]" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="再次输入密码"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); clearError('confirmPassword') }}
              onBlur={() => setTouched((p) => ({ ...p, confirmPassword: true }))}
              className={`h-11 w-full rounded-[10px] border bg-white py-0 pl-10 pr-10 text-[15px] text-[#374151] outline-none transition-all duration-200 placeholder:text-[#D1D5DB] ${
                errors.confirmPassword && touched.confirmPassword
                  ? 'border-[#EF4444] shadow-[0_0_0_3px_rgba(239,68,68,0.1)]'
                  : touched.confirmPassword && confirmPassword === password && confirmPassword.length > 0
                    ? 'border-[#10B981]'
                    : 'border-[#E5E7EB] focus:border-[#4F7BF7] focus:shadow-[0_0_0_3px_rgba(79,123,247,0.1)]'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#D1D5DB] transition-colors hover:text-[#9CA3AF]"
              aria-label={showConfirmPassword ? '隐藏密码' : '显示密码'}
            >
              {showConfirmPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          {errors.confirmPassword && touched.confirmPassword && (
            <p className="mt-1 text-xs text-[#EF4444]">{errors.confirmPassword}</p>
          )}
        </motion.div>

        {/* Submit Button */}
        <motion.div custom={6} variants={fieldVariants} initial="hidden" animate="visible">
          <button
            type="submit"
            disabled={isLoading}
            className="flex h-12 w-full items-center justify-center rounded-lg bg-[#4F7BF7] text-base font-semibold text-white transition-all duration-200 hover:bg-[#3B6AE8] active:bg-[#2C56C8] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              '注册'
            )}
          </button>
        </motion.div>

        {/* Agree Terms + Footer Text */}
        <motion.div custom={7} variants={fieldVariants} initial="hidden" animate="visible">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => { setAgreeTerms(e.target.checked); clearError('agreeTerms') }}
              className="mt-0.5 h-4 w-4 rounded border-[#E5E7EB] text-[#4F7BF7] accent-[#4F7BF7]"
            />
            <span className="text-[12px] leading-relaxed text-[#9CA3AF]">
              注册即表示同意
              <button type="button" className="mx-0.5 font-medium text-[#4F7BF7] hover:text-[#3B6AE8]">服务条款</button>
              和
              <button type="button" className="mx-0.5 font-medium text-[#4F7BF7] hover:text-[#3B6AE8]">隐私政策</button>
            </span>
          </label>
          {errors.agreeTerms && (
            <p className="mt-1 text-xs text-[#EF4444]">{errors.agreeTerms}</p>
          )}
        </motion.div>
      </form>

      {/* Login Link */}
      <motion.p
        custom={8}
        variants={fieldVariants}
        initial="hidden"
        animate="visible"
        className="mt-6 text-center text-[13px] text-[#9CA3AF]"
      >
        已有账号？
        <button
          type="button"
          onClick={onLoginClick}
          className="ml-1 font-medium text-[#4F7BF7] transition-colors hover:text-[#3B6AE8]"
        >
          立即登录
        </button>
      </motion.p>
    </motion.div>
  )
}


