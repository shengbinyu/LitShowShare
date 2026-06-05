import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const router = Router();

/**
 * GET /:literatureId - Retrieve all external links for a specific literature
 */
router.get('/:literatureId', (req: Request, res: Response) => {
  try {
    const links = db.prepare('SELECT * FROM external_links WHERE literatureId = ?').all(
      req.params.literatureId
    );
    res.json(links);
  } catch (err) {
    console.error('[ExternalLinks] Failed to fetch:', err);
    res.status(500).json({ error: 'Failed to fetch external links' });
  }
});

/**
 * POST / - Create a new external link
 * Body must include: literatureId, url, label (optional)
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { literatureId, url, label = '' } = req.body;

    if (!literatureId || !url) {
      res.status(400).json({ error: 'literatureId and url are required' });
      return;
    }

    // Verify the referenced literature exists
    const literature = db.prepare('SELECT id FROM literatures WHERE id = ?').get(literatureId);
    if (!literature) {
      res.status(404).json({ error: 'Literature not found' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO external_links (id, literatureId, url, label, isValid, lastChecked)
      VALUES (?, ?, ?, ?, 1, ?)
    `).run(id, literatureId, url, label, now);

    const link = db.prepare('SELECT * FROM external_links WHERE id = ?').get(id);
    res.status(201).json(link);
  } catch (err) {
    console.error('[ExternalLinks] Failed to create:', err);
    res.status(500).json({ error: 'Failed to create external link' });
  }
});

/**
 * DELETE /:id - Delete an external link
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM external_links WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'External link not found' });
      return;
    }

    db.prepare('DELETE FROM external_links WHERE id = ?').run(req.params.id);
    res.json({ message: 'External link deleted successfully' });
  } catch (err) {
    console.error('[ExternalLinks] Failed to delete:', err);
    res.status(500).json({ error: 'Failed to delete external link' });
  }
});

export default router;
