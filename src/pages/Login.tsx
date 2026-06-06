import { useState, FormEvent } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { BookOpen, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from '@/i18n/LanguageContext'

/**
 * Login page.
 * Clean centered card layout matching the navy-gold editorial theme.
 * Redirects to home (`/`) on successful authentication, or immediately
 * if the user is already logged in.
 */
export default function Login() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login, isAuthenticated } = useAuthStore()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bumped on every failed login attempt so the error banner remounts
  // and re-runs its enter animation even when the message string is unchanged.
  const [errorKey, setErrorKey] = useState(0)

  // If already logged in, bounce to home
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  function showError(message: string) {
    setError(message)
    setErrorKey((k) => k + 1)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!username.trim() || !password) {
      showError(t('auth.loginError'))
      return
    }
    setLoading(true)
    try {
      await login(username.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      console.error('[Login] failed:', err)
      showError(t('auth.loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={28} className="text-gold-500" />
            <span className="font-display text-2xl font-semibold text-gold-500 tracking-wide">
              {t('app.name')}
            </span>
          </div>
          <h1 className="font-display text-xl font-medium theme-text-heading">
            {t('auth.welcomeBack')}
          </h1>
          <p className="mt-1 text-sm theme-text-muted">{t('auth.signInSubtitle')}</p>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border theme-border-primary theme-bg-card-elevated p-6 space-y-5 theme-shadow-card"
        >
          {/* Username */}
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="block font-body text-sm font-medium theme-text-label"
            >
              {t('auth.username')}
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted pointer-events-none"
              />
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.usernamePlaceholder')}
                className="w-full rounded-lg border theme-border-secondary theme-bg-input pl-9 pr-4 py-2.5
                           font-body text-sm theme-text-primary theme-placeholder
                           theme-border-focus theme-ring-focus transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block font-body text-sm font-medium theme-text-label"
            >
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted pointer-events-none"
              />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.passwordPlaceholder')}
                className="w-full rounded-lg border theme-border-secondary theme-bg-input pl-9 pr-10 py-2.5
                           font-body text-sm theme-text-primary theme-placeholder
                           theme-border-focus theme-ring-focus transition-colors"
                disabled={loading}
              />
              {/* Show/hide password toggle */}
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                tabIndex={-1}
                disabled={loading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md
                           theme-text-muted hover:theme-text-primary
                           focus:outline-none theme-ring-focus
                           disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              key={errorKey}
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 animate-fade-in-up"
            >
              <AlertCircle size={14} className="mt-0.5 text-red-500 shrink-0" />
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold
                       text-sm px-4 py-2.5 transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? t('auth.loggingIn') : t('auth.loginButton')}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
