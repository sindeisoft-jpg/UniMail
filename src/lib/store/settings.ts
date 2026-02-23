import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { EmailAccountSettings } from "@/types/settings";

const DATA_DIR = path.join(process.cwd(), ".data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

export async function getSettings(): Promise<EmailAccountSettings | null> {
  await ensureDataDir();
  try {
    const raw = await readFile(SETTINGS_FILE, "utf-8");
    const data = JSON.parse(raw) as EmailAccountSettings;
    if (!data?.email) return null;
    return data;
  } catch {
    return null;
  }
}

/** 返回给前端的配置（不含密码） */
export async function getSettingsSafe(): Promise<{
  displayName: string;
  email: string;
  imap: EmailAccountSettings["imap"];
  smtp: EmailAccountSettings["smtp"];
  hasPassword: boolean;
} | null> {
  const s = await getSettings();
  if (!s) return null;
  return {
    displayName: s.displayName,
    email: s.email,
    imap: s.imap,
    smtp: s.smtp,
    hasPassword: !!s.password,
  };
}

export async function saveSettings(
  input: Partial<EmailAccountSettings> & { email: string }
): Promise<EmailAccountSettings> {
  await ensureDataDir();
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
  await writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
  return merged;
}
