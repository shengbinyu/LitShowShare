import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticate, requireAdmin, signToken } from '../middleware/auth.js';

const router = Router();

interface UserRow {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: string;
  createdAt: string;
}

/** Strip password before returning user info to clients */
function publicUser(row: UserRow) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    role: row.role,
    createdAt: row.createdAt,
  };
}

/**
 * POST /login - Authenticate user with username and password.
 * Returns { token, user } on success.
 */
router.post('/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    const row = db
      .prepare('SELECT * FROM users WHERE username = ?')
      .get(username) as UserRow | undefined;
    if (!row) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
    const ok = bcrypt.compareSync(password, row.password);
    if (!ok) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }
    const token = signToken({ id: row.id, username: row.username, role: row.role });
    res.json({ token, user: publicUser(row) });
  } catch (err) {
    console.error('[Auth] Login failed:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /me - Return the currently authenticated user's full info.
 */
router.get('/me', authenticate, (req: Request, res: Response) => {
  try {
    const row = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(req.user!.id) as UserRow | undefined;
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(publicUser(row));
  } catch (err) {
    console.error('[Auth] /me failed:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * GET /users - Admin only: list all users.
 */
router.get('/users', authenticate, requireAdmin, (_req: Request, res: Response) => {
  try {
    const rows = db
      .prepare('SELECT * FROM users ORDER BY createdAt ASC')
      .all() as UserRow[];
    res.json(rows.map(publicUser));
  } catch (err) {
    console.error('[Auth] List users failed:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * POST /users - Admin only: create a new user.
 */
router.post('/users', authenticate, requireAdmin, (req: Request, res: Response) => {
  try {
    const { username, password, displayName = '', role = 'user' } = req.body || {};
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }
    if (role !== 'admin' && role !== 'user') {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }
    const id = uuidv4();
    const now = new Date().toISOString();
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare(
      `INSERT INTO users (id, username, password, displayName, role, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, username, hashed, displayName, role, now);
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
    res.status(201).json(publicUser(row));
  } catch (err) {
    console.error('[Auth] Create user failed:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT /users/:id - Admin only: update displayName, role, and/or password.
 */
router.put('/users/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  try {
    const existing = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(req.params.id) as UserRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const { displayName, role, password } = req.body || {};
    if (role !== undefined && role !== 'admin' && role !== 'user') {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }
    const newDisplayName = displayName !== undefined ? displayName : existing.displayName;
    const newRole = role !== undefined ? role : existing.role;
    const newPassword = password ? bcrypt.hashSync(password, 10) : existing.password;
    db.prepare(
      `UPDATE users SET displayName = ?, role = ?, password = ? WHERE id = ?`,
    ).run(newDisplayName, newRole, newPassword, req.params.id);
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id) as UserRow;
    res.json(publicUser(row));
  } catch (err) {
    console.error('[Auth] Update user failed:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /users/:id - Admin only: delete a user.
 * Prevents deletion of self.
 */
router.delete('/users/:id', authenticate, requireAdmin, (req: Request, res: Response) => {
  try {
    if (req.user!.id === req.params.id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('[Auth] Delete user failed:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
