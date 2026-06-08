import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, type ReactElement } from 'react'
import { LanguageProvider } from '@/i18n/LanguageContext'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import LiteratureDetail from '@/pages/LiteratureDetail'
import Import from '@/pages/Import'
import Login from '@/pages/Login'
import AdminUsers from '@/pages/AdminUsers'
import DataManagement from '@/pages/DataManagement'

/**
 * Route guard: redirect unauthenticated users to /login.
 * Used to protect Import and Admin pages while Home/Detail stay public.
 */
function RequireAuth({ children }: { children: ReactElement }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

/**
 * Root application component.
 * Uses nested route layout pattern where Layout renders <Outlet />
 * and child routes are rendered inside the Layout wrapper.
 * The /login route is rendered standalone (no Layout) for a focused
 * sign-in experience.
 *
 * Anonymous access policy:
 * - Public: Home (/), Literature Detail (/literature/:id)
 * - Auth required: Import (/import), Admin Users (/admin/users)
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
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/literature/:id" element={<LiteratureDetail />} />

            {/* Protected routes */}
            <Route
              path="/import"
              element={
                <RequireAuth>
                  <Import />
                </RequireAuth>
              }
            />
            <Route
              path="/admin/users"
              element={
                <RequireAuth>
                  <AdminUsers />
                </RequireAuth>
              }
            />
            <Route
              path="/data-management"
              element={
                <RequireAuth>
                  <DataManagement />
                </RequireAuth>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}
