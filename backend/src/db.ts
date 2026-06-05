import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve the directory name for ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database file stored at backend/data/litshowshare.db
const DB_PATH = path.join(__dirname, '..', 'data', 'litshowshare.db');

// Ensure the data directory exists before opening the database
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create or open the SQLite database
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

// Enable foreign key enforcement
db.pragma('foreign_keys = ON');

// Create all tables if they do not exist
db.exec(`
  CREATE TABLE IF NOT EXISTS literatures (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    authors TEXT NOT NULL DEFAULT '[]',
    abstract TEXT NOT NULL DEFAULT '',
    keywords TEXT NOT NULL DEFAULT '[]',
    publishDate TEXT NOT NULL DEFAULT '',
    category TEXT,
    doi TEXT NOT NULL DEFAULT '',
    journal TEXT NOT NULL DEFAULT '',
    volume TEXT NOT NULL DEFAULT '',
    number TEXT NOT NULL DEFAULT '',
    pages TEXT NOT NULL DEFAULT '',
    publisher TEXT NOT NULL DEFAULT '',
    sourceFormat TEXT NOT NULL DEFAULT '',
    pdfPath TEXT NOT NULL DEFAULT '',
    pdfFileName TEXT NOT NULL DEFAULT '',
    cloudLink TEXT NOT NULL DEFAULT '',
    tagIds TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS external_links (
    id TEXT PRIMARY KEY,
    literatureId TEXT NOT NULL,
    url TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    isValid INTEGER NOT NULL DEFAULT 1,
    lastChecked TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (literatureId) REFERENCES literatures(id) ON DELETE CASCADE
  );
`);

export default db;
