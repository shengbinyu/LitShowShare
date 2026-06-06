// Diagnostic script: check admin user in DB and verify password
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '..', 'data', 'litshowshare.db');

const db = new Database(DB_PATH, { readonly: true });

interface UserRow {
  id: string;
  username: string;
  password: string;
  displayName: string;
  role: string;
  createdAt: string;
}

console.log('DB path:', DB_PATH);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);

try {
  const users = db.prepare('SELECT id, username, role, length(password) as pwLen FROM users').all();
  console.log('Users:', users);

  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as UserRow | undefined;
  if (!admin) {
    console.log('!!! No admin user found');
  } else {
    console.log('Admin row found, password hash starts with:', admin.password.slice(0, 7));
    console.log('bcrypt compare "admin123":', bcrypt.compareSync('admin123', admin.password));
    console.log('bcrypt compare "wrong":', bcrypt.compareSync('wrong', admin.password));
  }
} catch (e) {
  console.error('Query failed:', e);
}

db.close();
