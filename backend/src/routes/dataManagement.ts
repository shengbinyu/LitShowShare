import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ZipArchive } from 'archiver';
import AdmZip from 'adm-zip';
import multer from 'multer';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Multer config for import ZIP upload
const upload = multer({ dest: path.join(__dirname, '..', '..', 'temp') });

// ============================================================
// Helpers
// ============================================================

interface ExportLiterature {
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

interface ExportExternalLink {
  id: string;
  literatureId: string;
  url: string;
  label: string;
  isValid: number;
  lastChecked: string;
}

/**
 * Parse JSON text fields from a literature row into JavaScript objects.
 */
function parseLiteratureFields(row: Record<string, unknown>) {
  return {
    ...row,
    authors: JSON.parse((row.authors as string) || '[]'),
    keywords: JSON.parse((row.keywords as string) || '[]'),
    tagIds: JSON.parse((row.tagIds as string) || '[]'),
  };
}

// ============================================================
// GET /export - Export literature data as a ZIP archive
// ============================================================

router.get('/export', authenticate, (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;

    // Build query for literatures (optionally filtered by category)
    let rows: ExportLiterature[];
    if (category) {
      rows = db.prepare('SELECT * FROM literatures WHERE category = ? ORDER BY createdAt DESC')
        .all(category) as ExportLiterature[];
    } else {
      rows = db.prepare('SELECT * FROM literatures ORDER BY createdAt DESC')
        .all() as ExportLiterature[];
    }

    if (rows.length === 0) {
      res.status(404).json({ error: 'No literature found for the selected criteria' });
      return;
    }

    // Fetch all categories and tags
    const categories = db.prepare('SELECT * FROM categories').all();
    const tags = db.prepare('SELECT * FROM tags').all();

    // Build literature entries with external links and PDF info
    const literatures = rows.map((row) => {
      const externalLinks = db.prepare('SELECT * FROM external_links WHERE literatureId = ?')
        .all(row.id) as ExportExternalLink[];
      const hasPdf = !!(row.pdfPath && fs.existsSync(path.join(uploadsDir, path.basename(row.pdfPath))));
      return {
        ...parseLiteratureFields(row as unknown as Record<string, unknown>),
        hasPdf,
        externalLinks,
      };
    });

    // Collect only the category names used by the exported literatures
    const usedCategoryNames = new Set(rows.map((r) => r.category).filter(Boolean));
    const usedCategories = (categories as Array<{ id: string; name: string; color: string; description: string }>)
      .filter((c) => usedCategoryNames.has(c.name));

    // Collect only the tag IDs used by the exported literatures
    const usedTagIds = new Set<string>();
    rows.forEach((r) => {
      try {
        const ids: string[] = JSON.parse(r.tagIds || '[]');
        ids.forEach((id) => usedTagIds.add(id));
      } catch { /* ignore parse errors */ }
    });
    const usedTags = (tags as Array<{ id: string; name: string }>)
      .filter((t) => usedTagIds.has(t.id));

    // Build manifest
    const manifest = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      categories: usedCategories,
      tags: usedTags,
      literatures,
    };

    // Create ZIP archive and stream it to the response
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const zipFileName = `litshowshare-export-${dateStr}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    const archive = new ZipArchive({ zlib: { level: 6 } });

    // Pipe archive to response
    archive.pipe(res);

    // Add manifest.json
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Add PDF files
    for (const row of rows) {
      if (row.pdfPath) {
        const pdfFullPath = path.join(uploadsDir, path.basename(row.pdfPath));
        if (fs.existsSync(pdfFullPath)) {
          archive.file(pdfFullPath, { name: `pdfs/${row.id}.pdf` });
        }
      }
    }

    archive.finalize();
  } catch (err) {
    console.error('[DataManagement] Export failed:', err);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ============================================================
// POST /import - Preview import from a ZIP archive
// ============================================================

router.post('/import', authenticate, upload.single('file'), (req: Request, res: Response) => {
  const tempFilePath = req.file?.path;
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const zip = new AdmZip(req.file.path);
    const manifestEntry = zip.getEntry('manifest.json');

    if (!manifestEntry) {
      res.status(400).json({ error: 'Invalid export file: manifest.json not found' });
      return;
    }

    const manifestText = manifestEntry.getData().toString('utf-8');
    const manifest = JSON.parse(manifestText);

    if (!manifest.literatures || !Array.isArray(manifest.literatures)) {
      res.status(400).json({ error: 'Invalid manifest: literatures array not found' });
      return;
    }

    // Check for duplicates by title + doi
    const newItems: typeof manifest.literatures = [];
    const duplicates: Array<{
      imported: typeof manifest.literatures[0];
      existing: Record<string, unknown>;
    }> = [];

    for (const lit of manifest.literatures) {
      // Query for existing literature with same title and doi
      let existing: Record<string, unknown> | undefined;
      if (lit.doi) {
        existing = db.prepare('SELECT * FROM literatures WHERE title = ? AND doi = ?')
          .get(lit.title, lit.doi) as Record<string, unknown> | undefined;
      } else {
        // If no DOI, match by title only
        existing = db.prepare('SELECT * FROM literatures WHERE title = ? AND (doi = "" OR doi IS NULL)')
          .get(lit.title) as Record<string, unknown> | undefined;
      }

      if (existing) {
        duplicates.push({
          imported: lit,
          existing: parseLiteratureFields(existing),
        });
      } else {
        newItems.push(lit);
      }
    }

    res.json({
      totalImported: manifest.literatures.length,
      newCount: newItems.length,
      duplicateCount: duplicates.length,
      categories: manifest.categories || [],
      tags: manifest.tags || [],
      newItems,
      duplicates,
    });
  } catch (err) {
    console.error('[DataManagement] Import preview failed:', err);
    res.status(500).json({ error: 'Failed to preview import data' });
  } finally {
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
    }
  }
});

// ============================================================
// POST /import/confirm - Execute the actual import
// ============================================================

interface ConfirmImportBody {
  newItems: Array<Record<string, unknown>>;
  duplicates: Array<{
    imported: Record<string, unknown>;
    existingId: string;
    action: 'skip' | 'overwrite';
  }>;
  zipFileBase64: string;
}

router.post('/import/confirm', authenticate, upload.single('file'), (req: Request, res: Response) => {
  const tempFilePath = req.file?.path;
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const body: ConfirmImportBody = JSON.parse(req.body.data);
    const zip = new AdmZip(req.file.path);
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      res.status(400).json({ error: 'Invalid export file' });
      return;
    }
    const manifest = JSON.parse(manifestEntry.getData().toString('utf-8'));
    const pdfEntries = new Map<string, Buffer>();
    zip.getEntries().forEach((entry) => {
      if (entry.entryName.startsWith('pdfs/') && !entry.isDirectory) {
        const litId = path.basename(entry.entryName, '.pdf');
        pdfEntries.set(litId, entry.getData());
      }
    });

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const categoryMap = new Map<string, string>(); // old name -> new name (or same)
    const tagMap = new Map<string, string>(); // old tag id -> new tag id

    // Ensure categories exist
    const existingCategories = db.prepare('SELECT * FROM categories').all() as Array<{ id: string; name: string; color: string; description: string }>;
    const existingCategoryNames = new Set(existingCategories.map((c) => c.name));

    for (const cat of (manifest.categories || [])) {
      if (!existingCategoryNames.has(cat.name)) {
        const id = uuidv4();
        db.prepare('INSERT INTO categories (id, name, color, description) VALUES (?, ?, ?, ?)')
          .run(id, cat.name, cat.color || '', cat.description || '');
        existingCategoryNames.add(cat.name);
      }
      categoryMap.set(cat.name, cat.name);
    }

    // Ensure tags exist, build old->new ID mapping
    const existingTags = db.prepare('SELECT * FROM tags').all() as Array<{ id: string; name: string }>;
    const existingTagNames = new Map(existingTags.map((t) => [t.name, t.id]));

    for (const tag of (manifest.tags || [])) {
      if (existingTagNames.has(tag.name)) {
        tagMap.set(tag.id, existingTagNames.get(tag.name)!);
      } else {
        const newId = uuidv4();
        db.prepare('INSERT INTO tags (id, name) VALUES (?, ?)').run(newId, tag.name);
        existingTagNames.set(tag.name, newId);
        tagMap.set(tag.id, newId);
      }
    }

    // Import new items
    for (const lit of body.newItems) {
      const newId = uuidv4();
      const now = new Date().toISOString();

      // Remap tagIds
      const oldTagIds: string[] = (lit.tagIds as string[]) || [];
      const newTagIds = oldTagIds.map((id) => tagMap.get(id) || id).filter(Boolean);

      // Handle PDF
      let newPdfPath = '';
      const pdfData = pdfEntries.get(lit.id as string);
      if (pdfData) {
        const pdfUuid = uuidv4();
        const pdfFullPath = path.join(uploadsDir, `${pdfUuid}.pdf`);
        fs.writeFileSync(pdfFullPath, pdfData);
        newPdfPath = `/uploads/${pdfUuid}.pdf`;
      }

      db.prepare(`
        INSERT INTO literatures (
          id, title, authors, abstract, keywords, publishDate, category,
          doi, journal, volume, number, pages, publisher, sourceFormat,
          pdfPath, pdfFileName, cloudLink, tagIds, uploadedBy, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newId,
        lit.title || '',
        JSON.stringify(lit.authors || []),
        lit.abstract || '',
        JSON.stringify(lit.keywords || []),
        lit.publishDate || '',
        lit.category || null,
        lit.doi || '',
        lit.journal || '',
        lit.volume || '',
        lit.number || '',
        lit.pages || '',
        lit.publisher || '',
        lit.sourceFormat || '',
        newPdfPath,
        lit.pdfFileName || '',
        lit.cloudLink || '',
        JSON.stringify(newTagIds),
        (req as any).user!.id,
        now, now,
      );

      // Import external links
      const externalLinks = (lit.externalLinks as Array<Record<string, unknown>>) || [];
      for (const link of externalLinks) {
        const linkId = uuidv4();
        db.prepare('INSERT INTO external_links (id, literatureId, url, label, isValid, lastChecked) VALUES (?, ?, ?, ?, ?, ?)')
          .run(linkId, newId, link.url || '', link.label || '', 1, now);
      }

      createdCount++;
    }

    // Process duplicates
    for (const dup of body.duplicates) {
      if (dup.action === 'skip') {
        skippedCount++;
        continue;
      }

      if (dup.action === 'overwrite') {
        const existingLit = db.prepare('SELECT * FROM literatures WHERE id = ?').get(dup.existingId) as any;
        if (!existingLit) {
          skippedCount++;
          continue;
        }

        const imp = dup.imported;
        const now = new Date().toISOString();

        // Remap tagIds
        const oldTagIds: string[] = (imp.tagIds as string[]) || [];
        const newTagIds = oldTagIds.map((id) => tagMap.get(id) || id).filter(Boolean);

        // Handle PDF
        let newPdfPath = existingLit.pdfPath || '';
        const pdfData = pdfEntries.get(imp.id as string);
        if (pdfData) {
          // Remove old PDF if it exists
          if (existingLit.pdfPath) {
            const oldPdfPath = path.join(uploadsDir, path.basename(existingLit.pdfPath));
            if (fs.existsSync(oldPdfPath)) {
              try { fs.unlinkSync(oldPdfPath); } catch { /* ignore */ }
            }
          }
          const pdfUuid = uuidv4();
          const pdfFullPath = path.join(uploadsDir, `${pdfUuid}.pdf`);
          fs.writeFileSync(pdfFullPath, pdfData);
          newPdfPath = `/uploads/${pdfUuid}.pdf`;
        }

        db.prepare(`
          UPDATE literatures SET
            title = ?, authors = ?, abstract = ?, keywords = ?,
            publishDate = ?, category = ?, doi = ?, journal = ?,
            volume = ?, number = ?, pages = ?, publisher = ?,
            sourceFormat = ?, pdfPath = ?, pdfFileName = ?, cloudLink = ?,
            tagIds = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          imp.title ?? existingLit.title,
          JSON.stringify(imp.authors ?? JSON.parse(existingLit.authors)),
          imp.abstract ?? existingLit.abstract,
          JSON.stringify(imp.keywords ?? JSON.parse(existingLit.keywords)),
          imp.publishDate ?? existingLit.publishDate,
          imp.category !== undefined ? imp.category : existingLit.category,
          imp.doi ?? existingLit.doi,
          imp.journal ?? existingLit.journal,
          imp.volume ?? existingLit.volume,
          imp.number ?? existingLit.number,
          imp.pages ?? existingLit.pages,
          imp.publisher ?? existingLit.publisher,
          imp.sourceFormat ?? existingLit.sourceFormat,
          newPdfPath,
          imp.pdfFileName ?? existingLit.pdfFileName,
          imp.cloudLink ?? existingLit.cloudLink,
          JSON.stringify(newTagIds),
          now,
          dup.existingId,
        );

        // Update external links: delete old and re-create from import
        db.prepare('DELETE FROM external_links WHERE literatureId = ?').run(dup.existingId);
        const externalLinks = (imp.externalLinks as Array<Record<string, unknown>>) || [];
        for (const link of externalLinks) {
          const linkId = uuidv4();
          db.prepare('INSERT INTO external_links (id, literatureId, url, label, isValid, lastChecked) VALUES (?, ?, ?, ?, ?, ?)')
            .run(linkId, dup.existingId, link.url || '', link.label || '', 1, now);
        }

        updatedCount++;
      }
    }

    res.json({
      created: createdCount,
      updated: updatedCount,
      skipped: skippedCount,
    });
  } catch (err) {
    console.error('[DataManagement] Import confirm failed:', err);
    res.status(500).json({ error: 'Failed to import data' });
  } finally {
    // Clean up temp file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try { fs.unlinkSync(tempFilePath); } catch { /* ignore */ }
    }
  }
});

export default router;
