import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// JWT secret: read from env in production, fallback for dev only
const JWT_SECRET = process.env.JWT_SECRET || 'litshowshare_jwt_secret_dev';
export const JWT_EXPIRES_IN = '7d';

export interface AuthUser {
  id: string;
  username: string;
  role: string;
}

// Extend Express Request type so handlers can access req.user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Generate a signed JWT for a user.
 */
export function signToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Extract a Bearer token from the Authorization header, returns null if absent.
 */
function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

/**
 * Required authentication middleware.
 * Rejects with 401 if no/invalid token; attaches req.user otherwise.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = { id: payload.id, username: payload.username, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional authentication middleware.
 * Attaches req.user if token is valid; never rejects.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = { id: payload.id, username: payload.username, role: payload.role };
    } catch {
      // Ignore invalid token, treat as anonymous
    }
  }
  next();
}

/**
 * Admin-only middleware. Must be used AFTER authenticate.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin privileges required' });
    return;
  }
  next();
}
