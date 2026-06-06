import { useState, useEffect, FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Plus, Pencil, Trash2, X, ShieldAlert, Users } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from '@/i18n/LanguageContext'
import { authApi, type PublicUser, type CreateUserPayload, type UpdateUserPayload } from '@/utils/api'

/**
 * Admin user management page.
 * Allows administrators to list, create, edit, and delete user accounts.
 * Non-admin users see an access-denied state. Unauthenticated users are
 * redirected to /login.
 */
export default function AdminUsers() {
  const { t } = useTranslation()
  const { isAuthenticated, isAdmin, user: currentUser } = useAuthStore()

  const [users, setUsers] = useState<PublicUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<PublicUser | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Auth gate
  if (!isAuthenticated) return <Navigate to="/login" replace />

  async function loadUsers() {
    setLoading(true)
    try {
      const list = await authApi.getUsers()
      setUsers(list)
    } catch (err) {
      console.error('[AdminUsers] load failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) loadUsers()
  }, [isAdmin])

  async function handleDelete(u: PublicUser) {
    if (currentUser?.id === u.id) {
      alert(t('admin.cannotDeleteSelf'))
      return
    }
    const ok = window.confirm(t('admin.confirmDelete', { username: u.username }))
    if (!ok) return
    try {
      await authApi.deleteUser(u.id)
      await loadUsers()
    } catch (err) {
      console.error('[AdminUsers] delete failed:', err)
    }
  }

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <ShieldAlert className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-display theme-text-heading">{t('admin.accessDenied')}</h2>
        <p className="mt-2 theme-text-muted max-w-sm">{t('admin.accessDeniedDesc')}</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-5xl mx-auto space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold theme-text-heading flex items-center gap-2">
            <Users className="w-6 h-6 text-gold-500" />
            {t('admin.userManagement')}
          </h2>
          <p className="mt-1 text-sm theme-text-muted">{t('admin.userManagementDesc')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm px-4 py-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t('admin.addUser')}
        </button>
      </div>

      {/* Users table */}
      <div className="rounded-xl border theme-border-primary theme-bg-card-elevated overflow-hidden">
        {loading ? (
          <div className="p-8 text-center theme-text-muted text-sm">Loading...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b theme-border-primary text-xs theme-text-label uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">{t('admin.username')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('admin.displayName')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('admin.role')}</th>
                <th className="text-left px-4 py-3 font-medium">{t('admin.createdAt')}</th>
                <th className="text-right px-4 py-3 font-medium">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <tr
                    key={u.id}
                    className="border-b theme-border-primary last:border-0 hover:theme-bg-hover transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium theme-text-primary">
                      {u.username}
                      {isSelf && (
                        <span className="ml-2 text-xs theme-accent-subtle-bg theme-accent-subtle-text rounded-full px-2 py-0.5">
                          {t('admin.you')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm theme-text-secondary">
                      {u.displayName || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.role === 'admin'
                            ? 'bg-gold-500/15 text-gold-500'
                            : 'theme-bg-tertiary theme-text-secondary'
                        }`}
                      >
                        {u.role === 'admin' ? t('admin.admin') : t('admin.user')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs theme-text-muted">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="rounded-lg p-1.5 theme-text-muted hover:theme-bg-hover hover:text-gold-500 transition-colors"
                          title={t('admin.editUser')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u)}
                          disabled={isSelf}
                          className="rounded-lg p-1.5 theme-text-muted hover:theme-bg-hover hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t('admin.deleteUser')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <UserFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSubmit={async (payload) => {
            await authApi.createUser(payload as CreateUserPayload)
            setShowCreateModal(false)
            await loadUsers()
          }}
        />
      )}

      {/* Edit modal */}
      {editingUser && (
        <UserFormModal
          mode="edit"
          existing={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={async (payload) => {
            await authApi.updateUser(editingUser.id, payload as UpdateUserPayload)
            setEditingUser(null)
            await loadUsers()
          }}
        />
      )}
    </motion.div>
  )
}

// ============================================================
// User Create/Edit Modal
// ============================================================

interface UserFormModalProps {
  mode: 'create' | 'edit'
  existing?: PublicUser
  onClose: () => void
  onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => Promise<void>
}

function UserFormModal({ mode, existing, onClose, onSubmit }: UserFormModalProps) {
  const { t } = useTranslation()
  const [username, setUsername] = useState(existing?.username ?? '')
  const [displayName, setDisplayName] = useState(existing?.displayName ?? '')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'user'>(
    (existing?.role as 'admin' | 'user') ?? 'user',
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'create') {
        if (!username.trim() || !password) {
          setError('Username and password required')
          setSubmitting(false)
          return
        }
        await onSubmit({
          username: username.trim(),
          password,
          displayName: displayName.trim(),
          role,
        })
      } else {
        const payload: UpdateUserPayload = {
          displayName: displayName.trim(),
          role,
        }
        if (password) payload.password = password
        await onSubmit(payload)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-xl border theme-border-primary theme-bg-card-elevated shadow-xl"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b theme-border-primary px-5 py-4">
          <h3 className="font-display text-lg font-semibold theme-text-heading">
            {mode === 'create' ? t('admin.addUser') : t('admin.editUser')}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 theme-text-muted hover:theme-bg-hover hover:theme-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Username (read-only in edit mode) */}
          <div className="space-y-1.5">
            <label className="block font-body text-sm font-medium theme-text-label">
              {t('admin.username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={mode === 'edit'}
              className="w-full rounded-lg border theme-border-secondary theme-bg-input px-3 py-2 text-sm theme-text-primary theme-placeholder theme-border-focus theme-ring-focus transition-colors disabled:opacity-60"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-1.5">
            <label className="block font-body text-sm font-medium theme-text-label">
              {t('admin.displayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-lg border theme-border-secondary theme-bg-input px-3 py-2 text-sm theme-text-primary theme-placeholder theme-border-focus theme-ring-focus transition-colors"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block font-body text-sm font-medium theme-text-label">
              {mode === 'edit' ? t('admin.passwordOptional') : t('admin.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border theme-border-secondary theme-bg-input px-3 py-2 text-sm theme-text-primary theme-placeholder theme-border-focus theme-ring-focus transition-colors"
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="block font-body text-sm font-medium theme-text-label">
              {t('admin.role')}
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
              className="w-full rounded-lg border theme-border-secondary theme-bg-input px-3 py-2 text-sm theme-text-primary theme-border-focus theme-ring-focus transition-colors"
            >
              <option value="user">{t('admin.user')}</option>
              <option value="admin">{t('admin.admin')}</option>
            </select>
          </div>

          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border theme-border-secondary px-4 py-2 text-sm theme-text-secondary hover:theme-bg-hover hover:theme-text-primary transition-colors"
            >
              {t('admin.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-gold-500 hover:bg-gold-400 text-navy-950 font-semibold text-sm px-4 py-2 transition-colors disabled:opacity-60"
            >
              {mode === 'create' ? t('admin.create') : t('admin.save')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}
