/**
 * 邮件存储：使用 SQLite（lib/db/mails）统一读写
 * 若存在旧版 .data/mails.json 则首次启动时迁移到 SQLite
 */
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { Mail } from "@/types/mail";
import {
  getMailsByFolder as dbGetMailsByFolder,
  getFolderCounts as dbGetFolderCounts,
  getMailById as dbGetMailById,
  updateMail as dbUpdateMail,
  mergeMails as dbMergeMails,
  insertMail,
  ensureSeedMail,
  getAllMailIds,
  sendMail as dbSendMail,
  saveDraft as dbSaveDraft,
} from "@/lib/db/mails";

const DATA_DIR = path.join(process.cwd(), ".data");
const MAILS_FILE = path.join(DATA_DIR, "mails.json");

async function migrateJsonToSqliteOnce(): Promise<void> {
  try {
    const raw = await readFile(MAILS_FILE, "utf-8");
    const data = JSON.parse(raw) as Mail[];
    if (Array.isArray(data) && data.length > 0) {
      dbMergeMails(data);
      await writeFile(MAILS_FILE + ".bak", raw, "utf-8");
    }
  } catch {
    // 无 JSON 或解析失败则跳过
  }
}

let migrated = false;
async function ensureMigrated(): Promise<void> {
  if (migrated) return;
  await migrateJsonToSqliteOnce();
  ensureSeedMail();
  migrated = true;
}

export async function loadMails(): Promise<Mail[]> {
  await ensureMigrated();
  const ids = getAllMailIds();
  const mails: Mail[] = [];
  for (const id of ids) {
    const m = dbGetMailById(id);
    if (m) mails.push(m);
  }
  return mails.sort((a, b) => (b.date > a.date ? 1 : -1));
}

export async function getExistingMailIds(): Promise<Set<string>> {
  await ensureMigrated();
  return new Set(getAllMailIds());
}

export async function getMailsByFolder(
  folder: string
): Promise<Mail[]> {
  await ensureMigrated();
  return dbGetMailsByFolder(folder);
}

export async function getFolderCounts(): Promise<Record<string, number>> {
  await ensureMigrated();
  return dbGetFolderCounts();
}

export async function getMailById(id: string): Promise<Mail | null> {
  await ensureMigrated();
  return dbGetMailById(id);
}

export async function updateMail(
  id: string,
  patch: Partial<Pick<Mail, "read" | "starred" | "folder">>
): Promise<Mail | null> {
  await ensureMigrated();
  return dbUpdateMail(id, {
    read: patch.read,
    starred: patch.starred,
    folder: patch.folder,
  });
}

export async function markAsRead(id: string): Promise<Mail | null> {
  return updateMail(id, { read: true });
}

export async function setStarred(id: string, starred: boolean): Promise<Mail | null> {
  return updateMail(id, { starred });
}

export async function moveToTrash(id: string): Promise<Mail | null> {
  return updateMail(id, { folder: "trash" });
}

export async function mergeMails(incoming: Mail[]): Promise<void> {
  await ensureMigrated();
  dbMergeMails(incoming);
}

export type SendMailAttachmentPayload = {
  filename: string;
  contentType: string;
  content: string; // base64
};

export async function sendMail(params: {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string | null;
  from?: string;
  fromEmail?: string;
  attachments?: SendMailAttachmentPayload[];
}): Promise<Mail> {
  await ensureMigrated();
  return dbSendMail(params);
}

export async function saveDraft(params: {
  to: string;
  subject: string;
  body: string;
  id?: string;
}): Promise<Mail> {
  await ensureMigrated();
  return dbSaveDraft(params);
}
