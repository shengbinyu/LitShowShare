import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import LiteratureDetail from '@/pages/LiteratureDetail'
import Import from '@/pages/Import'
import Login from '@/pages/Login'
import AdminUsers from '@/pages/AdminUsers'

/**
 * Root application component.
 * Uses nested route layout pattern where Layout renders <Outlet />
 * and child routes are rendered inside the Layout wrapper.
 * The /login route is rendered standalone (no Layout) for a focused
 * sign-in experience.
 */
export default function App() {
  const refreshUser = useAuthStore((s) => s.refreshUser)

  // Validate persisted token on app mount; clears state if expired
  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          {/* Standalone routes (no app shell) */}
          <Route path="/login" element={<Login />} />

          {/* Main app routes (with shared Layout) */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/literature/:id" element={<LiteratureDetail />} />
            <Route path="/import" element={<Import />} />
            <Route path="/admin/users" element={<AdminUsers />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}
