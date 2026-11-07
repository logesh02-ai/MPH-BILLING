import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const BACKUPS_FILE = path.join(DATA_DIR, 'backups.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDatabase(): Record<string, any> | null {
  try {
    ensureDataDir();
    if (!fs.existsSync(DB_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading backend database.json:', err);
    return null;
  }
}

export function writeDatabase(data: Record<string, any>): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing backend database.json:', err);
    return false;
  }
}

export function readBackups(): any[] {
  try {
    ensureDataDir();
    if (!fs.existsSync(BACKUPS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(BACKUPS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading backend backups.json:', err);
    return [];
  }
}

export function writeBackups(snapshots: any[]): boolean {
  try {
    ensureDataDir();
    fs.writeFileSync(BACKUPS_FILE, JSON.stringify(snapshots.slice(-10), null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing backend backups.json:', err);
    return false;
  }
}
