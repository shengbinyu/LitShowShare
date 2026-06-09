import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

interface LiteratureRow {
  id: string;
  title: string;
  authors: string;
  abstract: string;
  keywords: string;
  publishDate: string;
  category: string | null;
  doi: string;
  journal: string;
  volume: string;
  number: string;
  pages: string;
  publisher: string;
  sourceFormat: string;
  pdfPath: string;
  pdfFileName: string;
  cloudLink: string;
  tagIds: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

const router = Router();

/**
 * Permission check: the requester must be the uploader OR an admin.
 * Returns true if permitted, false otherwise.
 */
function canModifyLiterature(req: Request, literature: { uploadedBy?: string }): boolean {
  if (!req.user) return false;
  if (req.user.role === 'admin') return true;
  return literature.uploadedBy === req.user.id;
}

// Resolve uploads directory for PDF file deletion
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

/**
 * Parse JSON text fields from a literature row into JavaScript objects.
 * Fields: authors, keywords, tagIds are stored as JSON strings in SQLite.
 */
function parseLiteratureFields(row: Record<string, unknown>) {
  return {
    ...row,
    authors: JSON.parse((row.authors as string) || '[]'),
    keywords: JSON.parse((row.keywords as string) || '[]'),
    tagIds: JSON.parse((row.tagIds as string) || '[]'),
  };
}

/**
 * GET / - Retrieve all literatures
 * Parses JSON fields (authors, keywords, tagIds) before returning.
 */
router.get('/', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM literatures ORDER BY createdAt DESC').all() as Record<string, unknown>[];
    const literatures = rows.map(parseLiteratureFields);
    res.json(literatures);
  } catch (err) {
    console.error('[Literatures] Failed to fetch all:', err);
    res.status(500).json({ error: 'Failed to fetch literatures' });
  }
});

/**
 * GET /:id - Retrieve a single literature by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const row = db.prepare('SELECT * FROM literatures WHERE id = ?').get(req.params.id);
    if (!row) {
      res.status(404).json({ error: 'Literature not found' });
      return;
    }
    res.json(parseLiteratureFields(row as Record<string, unknown>));
  } catch (err) {
    console.error('[Literatures] Failed to fetch by ID:', err);
    res.status(500).json({ error: 'Failed to fetch literature' });
  }
});

/**
 * POST / - Create a new literature
 * Generates UUID, sets timestamps, stringifies JSON fields.
 */
router.post('/', authenticate, (req: Request, res: Response) => {
  try {
    const id = uuidv4();
    const now = new Date().toISOString();
    const {
      title = '',
      authors = [],
      abstract = '',
      keywords = [],
      publishDate = '',
      category = null,
      doi = '',
      journal = '',
      volume = '',
      number = '',
      pages = '',
      publisher = '',
      sourceFormat = '',
      pdfPath = '',
      pdfFileName = '',
      cloudLink = '',
      tagIds = [],
    } = req.body;

    // uploadedBy is always taken from the authenticated user, never trusted from the client
    const uploadedBy = req.user!.id;

    db.prepare(`
      INSERT INTO literatures (
        id, title, authors, abstract, keywords, publishDate, category,
        doi, journal, volume, number, pages, publisher, sourceFormat,
        pdfPath, pdfFileName, cloudLink, tagIds, uploadedBy, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, title,
      JSON.stringify(authors),
      abstract,
      JSON.stringify(keywords),
      publishDate,
      category,
      doi, journal, volume, number, pages, publisher, sourceFormat,
      pdfPath, pdfFileName, cloudLink,
      JSON.stringify(tagIds),
      uploadedBy,
      now, now
    );

    // Return the newly created literature with parsed fields
    const row = db.prepare('SELECT * FROM literatures WHERE id = ?').get(id);
    res.status(201).json(parseLiteratureFields(row as Record<string, unknown>));
  } catch (err) {
    console.error('[Literatures] Failed to create:', err);
    res.status(500).json({ error: 'Failed to create literature' });
  }
});

/**
 * PUT /:id - Update an existing literature
 * Updates updatedAt timestamp and stringifies JSON fields.
 */
router.put('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const existing = db.prepare('SELECT * FROM literatures WHERE id = ?').get(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Literature not found' });
      return;
    }

    // Permission check: only uploader or admin can update
    if (!canModifyLiterature(req, existing as LiteratureRow)) {
      res.status(403).json({ error: 'You do not have permission to modify this literature' });
      return;
    }

    const now = new Date().toISOString();
    const body = req.body;

    // Merge existing values with the update payload
    const updated = {
      title: body.title ?? (existing as LiteratureRow).title,
      authors: JSON.stringify(body.authors ?? JSON.parse((existing as LiteratureRow).authors)),
      abstract: body.abstract ?? (existing as LiteratureRow).abstract,
      keywords: JSON.stringify(body.keywords ?? JSON.parse((existing as LiteratureRow).keywords)),
      publishDate: body.publishDate ?? (existing as LiteratureRow).publishDate,
      category: body.category !== undefined ? body.category : (existing as LiteratureRow).category,
      doi: body.doi ?? (existing as LiteratureRow).doi,
      journal: body.journal ?? (existing as LiteratureRow).journal,
      volume: body.volume ?? (existing as LiteratureRow).volume,
      number: body.number ?? (existing as LiteratureRow).number,
      pages: body.pages ?? (existing as LiteratureRow).pages,
      publisher: body.publisher ?? (existing as LiteratureRow).publisher,
      sourceFormat: body.sourceFormat ?? (existing as LiteratureRow).sourceFormat,
      pdfPath: body.pdfPath ?? (existing as LiteratureRow).pdfPath,
      pdfFileName: body.pdfFileName ?? (existing as LiteratureRow).pdfFileName,
      cloudLink: body.cloudLink ?? (existing as LiteratureRow).cloudLink,
      tagIds: JSON.stringify(body.tagIds ?? JSON.parse((existing as LiteratureRow).tagIds)),
    };

    db.prepare(`
      UPDATE literatures SET
        title = ?, authors = ?, abstract = ?, keywords = ?,
        publishDate = ?, category = ?, doi = ?, journal = ?,
        volume = ?, number = ?, pages = ?, publisher = ?,
        sourceFormat = ?, pdfPath = ?, pdfFileName = ?, cloudLink = ?,
        tagIds = ?, updatedAt = ?
      WHERE id = ?
    `).run(
      updated.title, updated.authors, updated.abstract, updated.keywords,
      updated.publishDate, updated.category, updated.doi, updated.journal,
      updated.volume, updated.number, updated.pages, updated.publisher,
      updated.sourceFormat, updated.pdfPath, updated.pdfFileName, updated.cloudLink,
      updated.tagIds, now, req.params.id
    );

    const row = db.prepare('SELECT * FROM literatures WHERE id = ?').get(req.params.id);
    res.json(parseLiteratureFields(row as Record<string, unknown>));
  } catch (err) {
    console.error('[Literatures] Failed to update:', err);
    res.status(500).json({ error: 'Failed to update literature' });
  }
});

/**
 * DELETE /:id - Delete a literature, its external links, and PDF file
 */
router.delete('/:id', authenticate, (req: Request, res: Response) => {
  try {
    const literature = db.prepare('SELECT * FROM literatures WHERE id = ?').get(req.params.id) as LiteratureRow | undefined;
    if (!literature) {
      res.status(404).json({ error: 'Literature not found' });
      return;
    }

    // Permission check: only uploader or admin can delete
    if (!canModifyLiterature(req, literature)) {
      res.status(403).json({ error: 'You do not have permission to delete this literature' });
      return;
    }

    // Delete associated external links
    db.prepare('DELETE FROM external_links WHERE literatureId = ?').run(req.params.id);

    // Delete the PDF file from disk if it exists
    if (literature.pdfPath) {
      const pdfFullPath = path.join(uploadsDir, path.basename(literature.pdfPath));
      if (fs.existsSync(pdfFullPath)) {
        fs.unlinkSync(pdfFullPath);
      }
    }

    // Delete the literature record
    db.prepare('DELETE FROM literatures WHERE id = ?').run(req.params.id);

    res.json({ message: 'Literature deleted successfully' });
  } catch (err) {
    console.error('[Literatures] Failed to delete:', err);
    res.status(500).json({ error: 'Failed to delete literature' });
  }
});

/**
 * POST /:id/tags - Add a tag to a literature
 * Appends the tagId to the literature's tagIds JSON array.
 */
router.post('/:id/tags', (req: Request, res: Response) => {
  try {
    const literature = db.prepare('SELECT * FROM literatures WHERE id = ?').get(req.params.id) as LiteratureRow | undefined;
    if (!literature) {
      res.status(404).json({ error: 'Literature not found' });
      return;
    }

    const { tagId } = req.body;
    if (!tagId) {
      res.status(400).json({ error: 'tagId is required' });
      return;
    }

    const currentTagIds: string[] = JSON.parse(literature.tagIds || '[]');
    if (!currentTagIds.includes(tagId)) {
      currentTagIds.push(tagId);
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE literatures SET tagIds = ?, updatedAt = ? WHERE id = ?').run(
      JSON.stringify(currentTagIds), now, req.params.id
    );

    const row = db.prepare('SELECT * FROM literatures WHERE id = ?').get(req.params.id);
    res.json(parseLiteratureFields(row as Record<string, unknown>));
  } catch (err) {
    console.error('[Literatures] Failed to add tag:', err);
    res.status(500).json({ error: 'Failed to add tag to literature' });
  }
});

/**
 * DELETE /:id/tags/:tagId - Remove a tag from a literature
 * Removes the tagId from the literature's tagIds JSON array.
 */
router.delete('/:id/tags/:tagId', (req: Request, res: Response) => {
  try {
    const literature = db.prepare('SELECT * FROM literatures WHERE id = ?').get(req.params.id) as LiteratureRow | undefined;
    if (!literature) {
      res.status(404).json({ error: 'Literature not found' });
      return;
    }

    const currentTagIds: string[] = JSON.parse(literature.tagIds || '[]');
    const updatedTagIds = currentTagIds.filter((id) => id !== req.params.tagId);

    const now = new Date().toISOString();
    db.prepare('UPDATE literatures SET tagIds = ?, updatedAt = ? WHERE id = ?').run(
      JSON.stringify(updatedTagIds), now, req.params.id
    );

    const row = db.prepare('SELECT * FROM literatures WHERE id = ?').get(req.params.id);
    res.json(parseLiteratureFields(row as Record<string, unknown>));
  } catch (err) {
    console.error('[Literatures] Failed to remove tag:', err);
    res.status(500).json({ error: 'Failed to remove tag from literature' });
  }
});

export default router;
