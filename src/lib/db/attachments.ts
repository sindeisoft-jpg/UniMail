import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import path from "path";
import { getDbInstance } from "./sqlite";
import type { MailAttachment } from "@/types/mail";

const DATA_DIR = path.join(process.cwd(), ".data");
const ATTACHMENTS_DIR = path.join(DATA_DIR, "attachments");

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** 生成附件唯一 id */
function attachmentId(mailId: string, index: number): string {
  const safe = mailId.replace(/[^a-zA-Z0-9-_]/g, "_");
  return `${safe}-att-${index}`;
}

/** 安全文件名，避免路径穿越 */
function safeFilename(name: string): string {
  const base = path.basename(name || "attachment").replace(/[^\w.\-]/g, "_");
  return base || "attachment";
}

export function saveAttachment(params: {
  mailId: string;
  index: number;
  filename: string;
  contentType: string;
  contentId?: string | null;
  content: Buffer;
}): MailAttachment {
  const db = getDbInstance();
  const id = attachmentId(params.mailId, params.index);
  const dir = path.join(ATTACHMENTS_DIR, params.mailId.replace(/[^a-zA-Z0-9-_]/g, "_"));
  ensureDir(dir);
  const filename = safeFilename(params.filename);
  const contentPath = path.join(dir, `${id}-${filename}`);
  writeFileSync(contentPath, params.content, { flag: "w" });
  const size = params.content.length;

  db.prepare(`
    INSERT OR REPLACE INTO mail_attachments (id, mail_id, filename, content_type, size, content_id, content_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    params.mailId,
    params.filename,
    params.contentType,
    size,
    params.contentId ?? null,
    contentPath
  );

  return {
    id,
    mailId: params.mailId,
    filename: params.filename,
    contentType: params.contentType,
    size,
    contentId: params.contentId ?? null,
  };
}

export function getAttachmentsByMailId(mailId: string): MailAttachment[] {
  const db = getDbInstance();
  const rows = db.prepare(
    "SELECT id, mail_id, filename, content_type, size, content_id FROM mail_attachments WHERE mail_id = ?"
  ).all(mailId) as { id: string; mail_id: string; filename: string; content_type: string; size: number; content_id: string | null }[];
  return rows.map((r) => ({
    id: r.id,
    mailId: r.mail_id,
    filename: r.filename,
    contentType: r.content_type,
    size: r.size,
    contentId: r.content_id,
  }));
}

interface AttachmentRow {
  id: string;
  mail_id: string;
  filename: string;
  content_type: string;
  size: number;
  content_id: string | null;
  content_path: string;
}

export function getAttachmentById(attachmentId: string): { path: string; filename: string; contentType: string } | null {
  const db = getDbInstance();
  const row = db.prepare(
    "SELECT id, mail_id, filename, content_type, content_path FROM mail_attachments WHERE id = ?"
  ).get(attachmentId) as AttachmentRow | undefined;
  if (!row || !existsSync(row.content_path)) return null;
  return { path: row.content_path, filename: row.filename, contentType: row.content_type };
}

/** 按 Content-ID 查找附件（用于内嵌图片 cid: 引用） */
export function getAttachmentByContentId(mailId: string, contentId: string): { path: string; contentType: string } | null {
  const db = getDbInstance();
  const normalized = contentId.startsWith("<") && contentId.endsWith(">") ? contentId : `<${contentId}>`;
  const row = db.prepare(
    "SELECT content_path, content_type FROM mail_attachments WHERE mail_id = ? AND (content_id = ? OR content_id = ?)"
  ).get(mailId, contentId, normalized) as { content_path: string; content_type: string } | undefined;
  if (!row || !existsSync(row.content_path)) return null;
  return { path: row.content_path, contentType: row.content_type };
}

export function getAttachmentContentPath(attachmentId: string): string | null {
  const row = getDbInstance().prepare("SELECT content_path FROM mail_attachments WHERE id = ?").get(attachmentId) as { content_path: string } | undefined;
  return row && existsSync(row.content_path) ? row.content_path : null;
}

export function readAttachmentFile(filePath: string): Buffer {
  return readFileSync(filePath);
}
