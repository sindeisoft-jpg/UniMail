import { getDbInstance } from "./sqlite";
import type { EmailAccountSettings } from "@/types/settings";

const ROW_ID = 1;

function rowToSettings(row: Record<string, unknown> | undefined): EmailAccountSettings | null {
  if (!row || !row.email) return null;
  return {
    displayName: String(row.display_name ?? ""),
    email: String(row.email).trim(),
    password: String(row.password ?? ""),
    imap: {
      host: String(row.imap_host ?? ""),
      port: Number(row.imap_port) || 993,
      secure: Number(row.imap_secure) === 1,
    },
    smtp: {
      host: String(row.smtp_host ?? ""),
      port: Number(row.smtp_port) || 465,
      secure: Number(row.smtp_secure) === 1,
    },
  };
}

export async function getSettings(): Promise<EmailAccountSettings | null> {
  const db = getDbInstance();
  const row = db.prepare("SELECT * FROM email_settings WHERE id = ?").get(ROW_ID) as
    | Record<string, unknown>
    | undefined;
  return rowToSettings(row);
}

/** 返回给前端的配置（不含密码） */
export async function getSettingsSafe(): Promise<{
  displayName: string;
  email: string;
  imap: EmailAccountSettings["imap"];
  smtp: EmailAccountSettings["smtp"];
  hasPassword: boolean;
  configured: boolean;
} | null> {
  const s = await getSettings();
  if (!s?.email) return null;
  return {
    displayName: s.displayName,
    email: s.email,
    imap: s.imap,
    smtp: s.smtp,
    hasPassword: !!s.password,
    configured: true,
  };
}

export async function saveSettings(
  input: Partial<EmailAccountSettings> & { email: string }
): Promise<EmailAccountSettings> {
  const db = getDbInstance();
  const existing = await getSettings();
  const merged: EmailAccountSettings = {
    displayName: input.displayName !== undefined ? input.displayName : (existing?.displayName ?? ""),
    email: input.email.trim(),
    password: input.password !== undefined ? input.password : (existing?.password ?? ""),
    imap: {
      host: input.imap?.host ?? existing?.imap?.host ?? "",
      port: input.imap?.port ?? existing?.imap?.port ?? 993,
      secure: input.imap?.secure ?? existing?.imap?.secure ?? true,
    },
    smtp: {
      host: input.smtp?.host ?? existing?.smtp?.host ?? "",
      port: input.smtp?.port ?? existing?.smtp?.port ?? 465,
      secure: input.smtp?.secure ?? existing?.smtp?.secure ?? true,
    },
  };

  const stmt = db.prepare(`
    INSERT INTO email_settings (
      id, display_name, email, password,
      imap_host, imap_port, imap_secure,
      smtp_host, smtp_port, smtp_secure,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      display_name = excluded.display_name,
      email = excluded.email,
      password = excluded.password,
      imap_host = excluded.imap_host,
      imap_port = excluded.imap_port,
      imap_secure = excluded.imap_secure,
      smtp_host = excluded.smtp_host,
      smtp_port = excluded.smtp_port,
      smtp_secure = excluded.smtp_secure,
      updated_at = excluded.updated_at
  `);
  const now = new Date().toISOString();
  stmt.run(
    ROW_ID,
    merged.displayName,
    merged.email,
    merged.password,
    merged.imap.host,
    merged.imap.port,
    merged.imap.secure ? 1 : 0,
    merged.smtp.host,
    merged.smtp.port,
    merged.smtp.secure ? 1 : 0,
    now
  );
  return merged;
}
