import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import literaturesRouter from './routes/literatures.js';
import categoriesRouter from './routes/categories.js';
import tagsRouter from './routes/tags.js';
import externalLinksRouter from './routes/externalLinks.js';
import uploadRouter from './routes/upload.js';
import authRouter from './routes/auth.js';
import dataManagementRouter from './routes/dataManagement.js';
import { authenticate } from './middleware/auth.js';

// Resolve directory name for ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// CORS: in production, restrict to the same origin; in dev, allow all
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  app.use(cors());
}

// Parse JSON request bodies with a 50mb limit for PDF uploads
app.use(express.json({ limit: '50mb' }));

// Serve uploaded files as static assets (auth-guarded:
// only logged-in users may access PDF files via /uploads/*).
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', authenticate, express.static(uploadsDir));

// Mount API route handlers
app.use('/api/auth', authRouter);
app.use('/api/literatures', literaturesRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/external-links', externalLinksRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/data', dataManagementRouter);

// In production, serve the frontend static files built by Vite
if (isProduction) {
  const frontendDist = path.join(__dirname, '..', '..', 'dist');
  app.use(express.static(frontendDist));
  // SPA fallback: all non-API routes return index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Start the server
app.listen(Number(PORT), HOST, () => {
  console.log(`[LitShowShare] Server running at http://${HOST}:${PORT}`);
  console.log(`[LitShowShare] Mode: ${isProduction ? 'production' : 'development'}`);
  console.log(`[LitShowShare] API base path: http://${HOST}:${PORT}/api`);
  console.log(`[LitShowShare] Uploads served at: http://${HOST}:${PORT}/uploads/`);
});
