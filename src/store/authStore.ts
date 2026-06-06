import { create } from 'zustand'
import { authApi, AUTH_TOKEN_KEY, type PublicUser } from '@/utils/api'

const AUTH_USER_KEY = 'litShowShare_user'

/** Load persisted user from localStorage on app start. */
function loadPersistedUser(): PublicUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PublicUser
  } catch {
    return null
  }
}

/** Load persisted token from localStorage on app start. */
function loadPersistedToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY)
  } catch {
    return null
  }
}

interface AuthState {
  token: string | null
  user: PublicUser | null
  /** True when a token + user are both present */
  isAuthenticated: boolean
  /** True when the current user has the admin role */
  isAdmin: boolean
  /** Authenticate against the backend and persist the result. */
  login: (username: string, password: string) => Promise<void>
  /** Clear all auth state and persisted data. */
  logout: () => void
  /** Validate the persisted token against the server; clears state on failure. */
  refreshUser: () => Promise<void>
}

/**
 * Zustand auth store.
 * Token and user are persisted to localStorage so the session survives
 * page reloads. All API requests automatically include the token via
 * the shared fetch wrapper in `src/utils/api.ts`.
 */
export const useAuthStore = create<AuthState>((set, get) => {
  const initialToken = loadPersistedToken()
  const initialUser = loadPersistedUser()

  return {
    token: initialToken,
    user: initialUser,
    isAuthenticated: Boolean(initialToken && initialUser),
    isAdmin: initialUser?.role === 'admin',

    async login(username, password) {
      const { token, user } = await authApi.login(username, password)
      localStorage.setItem(AUTH_TOKEN_KEY, token)
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
      set({
        token,
        user,
        isAuthenticated: true,
        isAdmin: user.role === 'admin',
      })
    },

    logout() {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(AUTH_USER_KEY)
      set({ token: null, user: null, isAuthenticated: false, isAdmin: false })
    },

    async refreshUser() {
      if (!get().token) return
      try {
        const user = await authApi.getMe()
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
        set({ user, isAuthenticated: true, isAdmin: user.role === 'admin' })
      } catch {
        // Token invalid/expired - clear local state
        get().logout()
      }
    },
  }
})
