import Database from "better-sqlite3";
import path from "path";
import { mkdirSync, existsSync } from "fs";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "unimail.db");

function getDb(): Database.Database {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  runMigrations(db);
  return db;
}

function runMigrations(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('system','custom')),
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS mails (
      id TEXT PRIMARY KEY,
      from_name TEXT NOT NULL,
      from_email TEXT NOT NULL,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      snippet TEXT NOT NULL,
      body TEXT NOT NULL,
      html_body TEXT,
      date TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      starred INTEGER NOT NULL DEFAULT 0,
      folder_id TEXT NOT NULL,
      FOREIGN KEY (folder_id) REFERENCES folders(id)
    );

    CREATE TABLE IF NOT EXISTS mail_attachments (
      id TEXT PRIMARY KEY,
      mail_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      content_type TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 0,
      content_id TEXT,
      content_path TEXT NOT NULL,
      FOREIGN KEY (mail_id) REFERENCES mails(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_attachments_mail ON mail_attachments(mail_id);

    CREATE INDEX IF NOT EXISTS idx_mails_folder ON mails(folder_id);
    CREATE INDEX IF NOT EXISTS idx_mails_starred ON mails(starred);
  `);

  // 为已有 mails 表添加 html_body 列（若不存在）
  try {
    const info = db.prepare("PRAGMA table_info(mails)").all() as { name: string }[];
    if (!info.some((c) => c.name === "html_body")) {
      db.prepare("ALTER TABLE mails ADD COLUMN html_body TEXT").run();
    }
  } catch {
    // 忽略
  }

  const systemCount = db.prepare("SELECT COUNT(*) as c FROM folders WHERE type='system'").get() as { c: number };
  if (systemCount.c === 0) {
    db.prepare(`
      INSERT INTO folders (id, name, type, sort_order) VALUES
      ('inbox', '收件箱', 'system', 0),
      ('sent', '已发送', 'system', 1),
      ('drafts', '草稿箱', 'system', 2),
      ('trash', '已删除', 'system', 3),
      ('spam', '垃圾箱', 'system', 4)
    `).run();
  }
}

let db: Database.Database | null = null;

export function getDbInstance(): Database.Database {
  if (!db) db = getDb();
  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
