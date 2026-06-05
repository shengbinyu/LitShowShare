import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

// Resolve uploads directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/**
 * Multer storage configuration:
 * - Destination: uploads/ directory
 * - Filename: UUID + .pdf extension
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, _file, cb) => {
    const uniqueName = `${uuidv4()}.pdf`;
    cb(null, uniqueName);
  },
});

/**
 * File filter: only accept PDF files
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

// Create the multer upload instance with size limit and filter
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
});

/**
 * POST /pdf - Upload a PDF file
 * Returns the relative path and original filename of the uploaded file.
 */
router.post('/pdf', upload.single('pdf'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    // Build the relative path that will be stored in the database
    const relativePath = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;

    res.status(201).json({
      path: relativePath,
      fileName: fileName,
    });
  } catch (err) {
    console.error('[Upload] Failed to process PDF upload:', err);
    res.status(500).json({ error: 'Failed to upload PDF' });
  }
});

export default router;
