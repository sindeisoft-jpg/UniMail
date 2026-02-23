import { getDbInstance } from "./sqlite";
import type { Mail } from "@/types/mail";

function rowToMail(row: Record<string, unknown>): Mail {
  return {
    id: String(row.id),
    from: String(row.from_name),
    fromEmail: String(row.from_email),
    to: String(row.to_email),
    subject: String(row.subject),
    snippet: String(row.snippet),
    body: String(row.body),
    htmlBody: row.html_body != null ? String(row.html_body) : undefined,
    date: String(row.date),
    read: Number(row.read) === 1,
    starred: Number(row.starred) === 1,
    folder: String(row.folder_id),
  };
}

export type FolderIdOrCustom = string;

export function getMailsByFolder(folderId: FolderIdOrCustom): Mail[] {
  const db = getDbInstance();
  if (folderId === "starred" || folderId === "important") {
    const stmt = db.prepare(
      "SELECT * FROM mails WHERE starred=1 ORDER BY date DESC"
    );
    return (stmt.all() as Record<string, unknown>[]).map(rowToMail);
  }
  const stmt = db.prepare(
    "SELECT * FROM mails WHERE folder_id=? ORDER BY date DESC"
  );
  return (stmt.all(folderId) as Record<string, unknown>[]).map(rowToMail);
}

export function getFolderCounts(): Record<string, number> {
  const db = getDbInstance();
  const rows = db.prepare(
    "SELECT folder_id, COUNT(*) as c FROM mails GROUP BY folder_id"
  ).all() as { folder_id: string; c: number }[];
  const starred = db.prepare("SELECT COUNT(*) as c FROM mails WHERE starred=1").get() as { c: number };
  const counts: Record<string, number> = {
    inbox: 0,
    important: starred.c,
    starred: starred.c,
    sent: 0,
    drafts: 0,
    trash: 0,
    spam: 0,
  };
  for (const r of rows) {
    if (r.folder_id in counts) counts[r.folder_id] = r.c;
    else counts[r.folder_id] = r.c;
  }
  return counts;
}

export function getMailById(id: string): Mail | null {
  const db = getDbInstance();
  const row = db.prepare("SELECT * FROM mails WHERE id=?").get(id) as Record<string, unknown> | undefined;
  return row ? rowToMail(row) : null;
}

export function updateMail(
  id: string,
  patch: { read?: boolean; starred?: boolean; folder?: string }
): Mail | null {
  const db = getDbInstance();
  const row = db.prepare("SELECT * FROM mails WHERE id=?").get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  if (patch.read !== undefined) db.prepare("UPDATE mails SET read=? WHERE id=?").run(patch.read ? 1 : 0, id);
  if (patch.starred !== undefined) db.prepare("UPDATE mails SET starred=? WHERE id=?").run(patch.starred ? 1 : 0, id);
  if (patch.folder !== undefined) db.prepare("UPDATE mails SET folder_id=? WHERE id=?").run(patch.folder, id);
  const updated = db.prepare("SELECT * FROM mails WHERE id=?").get(id) as Record<string, unknown>;
  return rowToMail(updated);
}

export function insertMail(mail: Mail): void {
  const db = getDbInstance();
  db.prepare(`
    INSERT OR REPLACE INTO mails (id, from_name, from_email, to_email, subject, snippet, body, html_body, date, read, starred, folder_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    mail.id,
    mail.from,
    mail.fromEmail,
    mail.to,
    mail.subject,
    mail.snippet,
    mail.body,
    mail.htmlBody ?? null,
    mail.date,
    mail.read ? 1 : 0,
    mail.starred ? 1 : 0,
    mail.folder
  );
}

export function mergeMails(incoming: Mail[]): void {
  const db = getDbInstance();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO mails (id, from_name, from_email, to_email, subject, snippet, body, html_body, date, read, starred, folder_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const run = db.transaction((mails: Mail[]) => {
    for (const m of mails) {
      insert.run(m.id, m.from, m.fromEmail, m.to, m.subject, m.snippet, m.body, m.htmlBody ?? null, m.date, m.read ? 1 : 0, m.starred ? 1 : 0, m.folder);
    }
  });
  run(incoming);
}

export function ensureSeedMail(): void {
  const db = getDbInstance();
  const exists = db.prepare("SELECT 1 FROM mails LIMIT 1").get();
  if (exists) return;
  const mail: Mail = {
    id: "welcome-1",
    from: "系统通知",
    fromEmail: "noreply@unimail.app",
    to: "me@unimail.app",
    subject: "欢迎使用 Unimail 智能邮箱",
    snippet: "您已成功开通 Unimail。试试「智能体」助手，帮您写邮件、总结收件箱。",
    body: "您已成功开通 Unimail。\n\n试试「智能体」助手，帮您写邮件、总结收件箱。\n\n— Unimail 团队",
    date: new Date().toISOString().slice(0, 16).replace("T", " "),
    read: false,
    starred: false,
    folder: "inbox",
  };
  insertMail(mail);
}

export function getAllMailIds(): string[] {
  const db = getDbInstance();
  const rows = db.prepare("SELECT id FROM mails").all() as { id: string }[];
  return rows.map((r) => r.id);
}

export function sendMail(params: {
  to: string;
  subject: string;
  body: string;
  from?: string;
  fromEmail?: string;
}): Mail {
  const id = String(Date.now());
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const mail: Mail = {
    id,
    from: params.from ?? "我",
    fromEmail: params.fromEmail ?? "me@unimail.app",
    to: params.to,
    subject: params.subject,
    snippet: params.body.slice(0, 80),
    body: params.body,
    date: now,
    read: true,
    starred: false,
    folder: "sent",
  };
  insertMail(mail);
  return mail;
}

export function saveDraft(params: { to: string; subject: string; body: string; id?: string }): Mail {
  const db = getDbInstance();
  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  if (params.id) {
    const row = db.prepare("SELECT * FROM mails WHERE id=?").get(params.id) as Record<string, unknown> | undefined;
    if (row) {
      db.prepare(
        "UPDATE mails SET to_email=?, subject=?, snippet=?, body=?, date=? WHERE id=?"
      ).run(params.to, params.subject, params.body.slice(0, 80), params.body, now, params.id);
      return getMailById(params.id)!;
    }
  }
  const id = String(Date.now());
  const mail: Mail = {
    id,
    from: "我",
    fromEmail: "me@unimail.app",
    to: params.to,
    subject: params.subject,
    snippet: params.body.slice(0, 80),
    body: params.body,
    date: now,
    read: true,
    starred: false,
    folder: "drafts",
  };
  insertMail(mail);
  return mail;
}
