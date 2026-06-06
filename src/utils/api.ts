// ============================================================
// API Client - Unified fetch wrapper for backend communication
// ============================================================

// In production, frontend and backend are served from the same origin (empty string = relative)
// In development, point to the local backend server
const API_BASE = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

// localStorage key used to persist the JWT auth token
export const AUTH_TOKEN_KEY = 'litShowShare_token';

/** Read the current JWT token from localStorage, if any. */
function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Generic fetch wrapper with error handling.
 * Automatically attaches Authorization: Bearer <token> header when a token exists.
 * All API calls go through this function.
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`API ${response.status}: ${body || response.statusText}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================
// Literature API
// ============================================================

import type { Literature } from './db';

export const literatureApi = {
  /** Get all literature records */
  getAll: (): Promise<Literature[]> => request('/api/literatures'),

  /** Get a single literature by ID */
  getById: (id: string): Promise<Literature> =>
    request(`/api/literatures/${id}`),

  /** Create a new literature record */
  create: (
    data: Omit<Literature, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Literature> =>
    request('/api/literatures', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update an existing literature record */
  update: (id: string, data: Partial<Literature>): Promise<Literature> =>
    request(`/api/literatures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Delete a literature record */
  delete: (id: string): Promise<void> =>
    request(`/api/literatures/${id}`, { method: 'DELETE' }),

  /** Add a tag to a literature */
  addTag: (literatureId: string, tagId: string): Promise<Literature> =>
    request(`/api/literatures/${literatureId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagId }),
    }),

  /** Remove a tag from a literature */
  removeTag: (literatureId: string, tagId: string): Promise<Literature> =>
    request(`/api/literatures/${literatureId}/tags/${tagId}`, {
      method: 'DELETE',
    }),
};

// ============================================================
// Category API
// ============================================================

import type { Category } from './db';

export const categoryApi = {
  getAll: (): Promise<Category[]> => request('/api/categories'),

  create: (
    data: Omit<Category, 'id'>,
  ): Promise<Category> =>
    request('/api/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Category>): Promise<Category> =>
    request(`/api/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<void> =>
    request(`/api/categories/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Tag API
// ============================================================

import type { Tag } from './db';

export const tagApi = {
  getAll: (): Promise<Tag[]> => request('/api/tags'),

  create: (name: string): Promise<Tag> =>
    request('/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  delete: (id: string): Promise<void> =>
    request(`/api/tags/${id}`, { method: 'DELETE' }),
};

// ============================================================
// External Link API
// ============================================================

import type { ExternalLink } from './db';

export const externalLinkApi = {
  getByLiterature: (literatureId: string): Promise<ExternalLink[]> =>
    request(`/api/external-links/${literatureId}`),

  create: (
    data: Omit<ExternalLink, 'id'>,
  ): Promise<ExternalLink> =>
    request('/api/external-links', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<void> =>
    request(`/api/external-links/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Upload API
// ============================================================

export const uploadApi = {
  /** Upload a PDF file, returns { path, fileName } */
  uploadPdf: async (file: File): Promise<{ path: string; fileName: string }> => {
    const formData = new FormData();
    formData.append('pdf', file);

    const url = `${API_BASE}/api/upload/pdf`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Upload failed: ${body || response.statusText}`);
    }

    return response.json();
  },

  /**
   * Get the full URL for a PDF file.
   * Appends `?token=<jwt>` so that <a href> / <iframe> requests
   * (which cannot set the Authorization header) still authenticate
   * against the backend's static /uploads guard.
   */
  getPdfUrl: (pdfPath: string): string => {
    if (!pdfPath) return '';
    if (pdfPath.startsWith('http')) return pdfPath;
    const base = `${API_BASE}${pdfPath}`;
    const token = getAuthToken();
    if (!token) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}token=${encodeURIComponent(token)}`;
  },
};

// ============================================================
// Auth API
// ============================================================

export interface PublicUser {
  id: string;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: PublicUser;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  displayName?: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserPayload {
  displayName?: string;
  role?: 'admin' | 'user';
  password?: string;
}

export const authApi = {
  /** Authenticate user and return JWT token + user info */
  login: (username: string, password: string): Promise<LoginResponse> =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  /** Fetch the currently logged-in user */
  getMe: (): Promise<PublicUser> => request('/api/auth/me'),

  /** Admin: list all users */
  getUsers: (): Promise<PublicUser[]> => request('/api/auth/users'),

  /** Admin: create a new user */
  createUser: (data: CreateUserPayload): Promise<PublicUser> =>
    request('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Admin: update an existing user */
  updateUser: (id: string, data: UpdateUserPayload): Promise<PublicUser> =>
    request(`/api/auth/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Admin: delete a user */
  deleteUser: (id: string): Promise<void> =>
    request(`/api/auth/users/${id}`, { method: 'DELETE' }),
};
