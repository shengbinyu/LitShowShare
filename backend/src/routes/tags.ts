import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

/** Partial row shape for SELECT id, tagIds FROM literatures */
interface LiteraturesTagIdRow {
  id: string;
  tagIds: string;
}

const router = Router();

/** Partial row shape for SELECT id, tagIds FROM literatures */
interface LiteraturesTagIdRow {
  id: string;
  tagIds: string;
}

/**
 * GET / - Retrieve all tags
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const tags = db.prepare('SELECT * FROM tags').all();
    res.json(tags);
  } catch (err) {
    console.error('[Tags] Failed to fetch all:', err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

/**
 * POST / - Create a new tag
 * Tag name must be unique. Returns 409 if the name already exists.
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Tag name is required' });
      return;
    }

    // Check for duplicate name
    const existing = db.prepare('SELECT * FROM tags WHERE name = ?').get(name);
    if (existing) {
      res.status(409).json({ error: 'Tag name already exists' });
      return;
    }

    const id = uuidv4();
    db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(id, name);

    const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
    res.status(201).json(tag);
  } catch (err) {
    console.error('[Tags] Failed to create:', err);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

/**
 * DELETE /:id - Delete a tag and remove its ID from all literatures' tagIds arrays
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const tagId = req.params.id as string;
    const existing = db.prepare('SELECT * FROM tags WHERE id = ?').get(tagId);
    if (!existing) {
      res.status(404).json({ error: 'Tag not found' });
      return;
    }

    // Remove this tagId from all literatures that reference it
    const literatures = db.prepare('SELECT id, tagIds FROM literatures').all() as LiteraturesTagIdRow[];
    const updateStmt = db.prepare('UPDATE literatures SET tagIds = ?, updatedAt = ? WHERE id = ?');
    const now = new Date().toISOString();

    // Use a transaction for atomicity
    const removeTagFromLiteratures = db.transaction(() => {
      for (const lit of literatures) {
        const tagIds: string[] = JSON.parse(lit.tagIds || '[]');
        if (tagIds.includes(tagId)) {
          const updatedTagIds = tagIds.filter((tid) => tid !== tagId);
          updateStmt.run(JSON.stringify(updatedTagIds), now, lit.id);
        }
      }

      // Delete the tag itself
      db.prepare('DELETE FROM tags WHERE id = ?').run(tagId);
    });

    removeTagFromLiteratures();

    res.json({ message: 'Tag deleted and removed from all literatures' });
  } catch (err) {
    console.error('[Tags] Failed to delete:', err);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
});

export default router;
