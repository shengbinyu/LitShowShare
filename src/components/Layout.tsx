import { Outlet } from 'react-router-dom'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useLiteratureStore } from '@/store/literatureStore'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from '@/i18n/LanguageContext'
import { Menu, X, BookOpen, Plus, Search, Languages, Sun, Moon, User, LogOut, Users, LogIn, Database, HelpCircle } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import CategoryNav from '@/components/CategoryNav'
import type { Language } from '@/i18n/translations'

/**
 * Layout - Main application shell with top navbar, collapsible sidebar,
 * and content area rendered via <Outlet />.
 *
 * Navbar: fixed top bar with logo, search, language switch, and import button.
 * Sidebar: category navigation, collapsible on desktop,
 *          overlay on mobile with backdrop dismiss.
 * Content: scrollable main area for route children.
 */
export default function Layout() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen, searchQuery, setSearchQuery } =
    useLiteratureStore()
  const { language, setLanguage, t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const { isAuthenticated, isAdmin, user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement | null>(null)
  // Mobile (< sm) collapsible search overlay
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const mobileSearchRef = useRef<HTMLDivElement | null>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null)

  // Auto-focus the mobile search input when the overlay opens
  useEffect(() => {
    if (mobileSearchOpen) {
      // Defer focus until after the element is mounted
      requestAnimationFrame(() => mobileSearchInputRef.current?.focus())
    }
  }, [mobileSearchOpen])

  // Close mobile search overlay on outside click or ESC
  useEffect(() => {
    if (!mobileSearchOpen) return
    function handleClick(e: MouseEvent) {
      if (
        mobileSearchRef.current &&
        !mobileSearchRef.current.contains(e.target as Node)
      ) {
        setMobileSearchOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileSearchOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [mobileSearchOpen])

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [userMenuOpen])

  function toggleLanguage() {
    const next: Language = language === 'en' ? 'zh' : 'en'
    setLanguage(next)
  }

  function handleLogout() {
    logout()
    setUserMenuOpen(false)
    navigate('/')
  }

  // ============================================================
  // Layout is public: anonymous visitors may browse Home/Detail.
  // Route-level guards (RequireAuth in App.tsx) protect Import/Admin.
  // ============================================================

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* ===== Top Navbar ===== */}
      <header className="fixed top-0 inset-x-0 h-16 backdrop-blur-md border-b z-30" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center h-full px-4 gap-4">
          {/* Left: Hamburger (mobile) + Logo */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-1.5 rounded-lg theme-text-muted hover:theme-bg-hover hover:theme-text-primary transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link to="/" className="flex items-center gap-2">
              <BookOpen size={22} className="text-gold-500" />
              <span className="hidden sm:inline font-display text-lg font-semibold text-gold-500 tracking-wide">
                {t('app.name')}
              </span>
            </Link>
          </div>

          {/* Center: Search bar — inline on >= sm; collapsed to an icon button on mobile */}
          <div className="hidden sm:block flex-1 min-w-0 max-w-md mx-auto">
            <div className="group relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted
                           group-focus-within:text-gold-500 transition-colors"
              />
              <input
                type="text"
                placeholder={t('nav.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full theme-bg-input border theme-border-primary rounded-lg
                           pl-9 pr-4 py-2 text-sm theme-text-primary theme-placeholder
                           focus:outline-none theme-ring-focus theme-border-focus
                           transition-colors"
              />
            </div>
          </div>

          {/* Mobile (< sm) collapsible search overlay */}
          <AnimatePresence>
            {mobileSearchOpen && (
              <motion.div
                key="mobile-search"
                ref={mobileSearchRef}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="sm:hidden absolute left-0 right-0 top-0 h-16 px-3
                           flex items-center gap-2 z-40 backdrop-blur-md border-b"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <div className="group relative flex-1 min-w-0">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted
                               group-focus-within:text-gold-500 transition-colors"
                  />
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder={t('nav.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full theme-bg-input border theme-border-primary rounded-lg
                               pl-9 pr-4 py-2 text-sm theme-text-primary theme-placeholder
                               focus:outline-none theme-ring-focus theme-border-focus
                               transition-colors"
                  />
                </div>
                <button
                  onClick={() => setMobileSearchOpen(false)}
                  className="shrink-0 p-2 rounded-lg theme-text-muted
                             hover:theme-bg-hover hover:theme-text-primary transition-colors"
                  aria-label="Close search"
                >
                  <X size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right: Theme toggle + Language switch + Import button */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Mobile-only: open search overlay */}
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="sm:hidden flex items-center gap-1.5 rounded-lg border theme-border-primary
                         p-2 text-xs font-medium theme-text-secondary
                         hover:theme-border-focus hover:theme-text-primary transition-colors"
              title={t('nav.search')}
              aria-label={t('nav.search')}
            >
              <Search size={14} />
            </button>

            {/* Help button */}
            <Link
              to="/help"
              className="flex items-center gap-1.5 rounded-lg border theme-border-primary
                         p-2 lg:px-3 lg:py-2 text-xs font-medium theme-text-secondary
                         hover:theme-border-focus hover:theme-text-primary transition-colors"
              title={t('nav.help')}
            >
              <HelpCircle size={14} />
              <span className="hidden lg:inline">{t('nav.help')}</span>
            </Link>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 rounded-lg border theme-border-primary
                         p-2 text-xs font-medium theme-text-secondary
                         hover:theme-border-focus hover:theme-text-primary transition-colors"
              title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            {/* Language switch */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 rounded-lg border theme-border-primary
                         p-2 sm:px-3 sm:py-2 text-xs font-medium theme-text-secondary
                         hover:theme-border-focus hover:theme-text-primary transition-colors"
              title={t('nav.language')}
            >
              <Languages size={14} />
              <span className="hidden sm:inline">{language === 'en' ? '中文' : 'EN'}</span>
            </button>

            {/* Import button */}
            <Link
              to="/import"
              className="flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-navy-950 font-medium text-sm p-2 sm:px-4 sm:py-2 rounded-lg transition-colors"
              title={t('nav.import')}
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t('nav.import')}</span>
            </Link>

            {/* Data Management button (admin only) */}
            {isAdmin && (
              <Link
                to="/data-management"
                className="flex items-center gap-1.5 rounded-lg border theme-border-primary p-2 lg:px-3 lg:py-2 text-xs font-medium theme-text-secondary hover:theme-border-focus hover:theme-text-primary transition-colors"
                title={t('data.title')}
              >
                <Database size={14} />
                <span className="hidden lg:inline">{t('data.title')}</span>
              </Link>
            )}

            {/* User menu / Login */}
            {isAuthenticated && user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-1.5 rounded-lg border theme-border-primary p-2 sm:px-3 sm:py-2 text-xs font-medium theme-text-secondary hover:theme-border-focus hover:theme-text-primary transition-colors"
                  title={user.displayName || user.username}
                >
                  <User size={14} />
                  <span className="hidden sm:inline max-w-[80px] truncate">
                    {user.displayName || user.username}
                  </span>
                </button>
                {userMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-48 rounded-lg border theme-border-primary shadow-lg overflow-hidden z-40"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                  >
                    <div className="px-3 py-2 border-b theme-border-primary">
                      <p className="text-sm font-medium theme-text-primary truncate">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-xs theme-text-muted">
                        {isAdmin ? t('admin.admin') : t('admin.user')}
                      </p>
                    </div>
                    {isAdmin && (
                      <Link
                        to="/admin/users"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm theme-text-secondary hover:theme-bg-hover hover:theme-text-primary transition-colors"
                      >
                        <Users size={14} />
                        {t('admin.userManagement')}
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm theme-text-secondary hover:theme-bg-hover hover:text-red-500 transition-colors"
                    >
                      <LogOut size={14} />
                      {t('auth.logout')}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 rounded-lg border theme-border-primary p-2 sm:px-3 sm:py-2 text-xs font-medium theme-text-secondary hover:theme-border-focus hover:theme-text-primary transition-colors"
                title={t('auth.login')}
              >
                <LogIn size={14} />
                <span className="hidden sm:inline">{t('auth.login')}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ===== Body: Sidebar + Content ===== */}
      <div className="flex flex-1 pt-16">
        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 top-16 bg-black/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed top-16 bottom-0 left-0 z-20 w-64 border-r overflow-y-auto
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0
          `}
          style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
        >
          <CategoryNav />
        </aside>

        {/* Main content area */}
        <main
          className={`
            flex-1 p-6 overflow-y-auto min-h-0
            md:ml-64 transition-all duration-300
          `}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}
