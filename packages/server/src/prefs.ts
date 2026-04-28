import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface UserPrefs {
  lastProfile?: string;
}

const PREFS_DIR = join(homedir(), '.bridge');
const PREFS_FILE = join(PREFS_DIR, 'prefs.json');

export function loadPrefs(): UserPrefs {
  try {
    if (!existsSync(PREFS_FILE)) return {};
    const raw = readFileSync(PREFS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Prefs] Failed to load prefs: ${err instanceof Error ? err.message : String(err)}`);
    return {};
  }
}

export function savePrefs(prefs: Partial<UserPrefs>): void {
  try {
    if (!existsSync(PREFS_DIR)) {
      mkdirSync(PREFS_DIR, { recursive: true });
    }
    const current = loadPrefs();
    const updated = { ...current, ...prefs };
    writeFileSync(PREFS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[Prefs] Failed to save prefs: ${err instanceof Error ? err.message : String(err)}`);
  }
}
