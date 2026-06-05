import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { translations, type Language } from './translations'

// ============================================================
// Types
// ============================================================

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

// ============================================================
// Context
// ============================================================

const LanguageContext = createContext<LanguageContextValue | null>(null)

/**
 * LanguageProvider - Makes translations available throughout the app.
 * Stores the current language preference in localStorage.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('litShowShare_language')
    if (saved === 'en' || saved === 'zh') return saved
    // Default to Chinese if browser prefers Chinese, else English
    return navigator.language.startsWith('zh') ? 'zh' : 'en'
  })

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('litShowShare_language', lang)
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const text = translations[language]?.[key] ?? translations.en[key] ?? key
      if (!params) return text
      return text.replace(/\{(\w+)\}/g, (_, name: string) =>
        String(params[name] ?? `{${name}}`)
      )
    },
    [language],
  )

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

/**
 * Hook to access translations and language controls.
 */
export function useTranslation(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useTranslation must be used within LanguageProvider')
  }
  return ctx
}
