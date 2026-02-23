import { getDbInstance } from "./sqlite";

export interface FolderRow {
  id: string;
  name: string;
  type: "system" | "custom";
  sort_order: number;
}

const SYSTEM_IDS = new Set(["inbox", "sent", "drafts", "trash", "spam"]);

export function listFolders(): FolderRow[] {
  const db = getDbInstance();
  const stmt = db.prepare(
    "SELECT id, name, type, sort_order FROM folders ORDER BY type ASC, sort_order ASC, name ASC"
  );
  return stmt.all() as FolderRow[];
}

export function getCustomFolders(): FolderRow[] {
  const db = getDbInstance();
  const stmt = db.prepare(
    "SELECT id, name, type, sort_order FROM folders WHERE type='custom' ORDER BY sort_order ASC, name ASC"
  );
  return stmt.all() as FolderRow[];
}

export function createFolder(name: string): FolderRow {
  const db = getDbInstance();
  const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const maxOrder = db.prepare("SELECT COALESCE(MAX(sort_order),0) as m FROM folders WHERE type='custom'").get() as { m: number };
  db.prepare(
    "INSERT INTO folders (id, name, type, sort_order) VALUES (?, ?, 'custom', ?)"
  ).run(id, name.trim(), (maxOrder.m + 1));
  return db.prepare("SELECT id, name, type, sort_order FROM folders WHERE id=?").get(id) as FolderRow;
}

export function deleteFolder(id: string): boolean {
  if (SYSTEM_IDS.has(id)) return false;
  const db = getDbInstance();
  const r = db.prepare("DELETE FROM folders WHERE id=? AND type='custom'").run(id);
  if (r.changes > 0) {
    db.prepare("UPDATE mails SET folder_id='inbox' WHERE folder_id=?").run(id);
    return true;
  }
  return false;
}

export function getFolderById(id: string): FolderRow | null {
  const db = getDbInstance();
  const row = db.prepare("SELECT id, name, type, sort_order FROM folders WHERE id=?").get(id);
  return (row as FolderRow) ?? null;
}
