import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/** Row shape returned by SELECT * FROM categories */
interface CategoryRow {
  id: string;
  name: string;
  color: string;
  description: string;
}

/**
 * GET / - Retrieve all categories
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const categories = db.prepare('SELECT * FROM categories').all() as CategoryRow[];
    res.json(categories);
  } catch (err) {
    console.error('[Categories] Failed to fetch all:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * POST / - Create a new category
 * Generates a UUID for the new category.
 */
router.post('/', authenticate, (req: Request, res: Response) => {
  try {
    const id = uuidv4();
    const { name = '', color = '', description = '' } = req.body;

    db.prepare('INSERT INTO categories (id, name, color, description) VALUES (?, ?, ?, ?)').run(
      id, name, color, description
    );

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as CategoryRow | undefined;
    res.status(201).json(category);
  } catch (err) {
    console.error('[Categories] Failed to create:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * PUT /:id - Update an existing category
 */
router.put('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as CategoryRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    const { name, color, description } = req.body;
    const updated = {
      name: name ?? existing.name,
      color: color ?? existing.color,
      description: description ?? existing.description,
    };

    db.prepare('UPDATE categories SET name = ?, color = ?, description = ? WHERE id = ?').run(
      updated.name, updated.color, updated.description, req.params.id
    );

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as CategoryRow | undefined;
    res.json(category);
  } catch (err) {
    console.error('[Categories] Failed to update:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * DELETE /:id - Delete a category
 */
router.delete('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id) as CategoryRow | undefined;
    if (!existing) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    console.error('[Categories] Failed to delete:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;
