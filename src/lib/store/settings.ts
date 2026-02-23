/**
 * 邮箱账户配置：统一通过 SQLite（lib/db/settings）持久化，
 * 本模块对外保持原有接口，内部委托给 db/settings。
 */
import {
  getSettings as getSettingsFromDb,
  getSettingsSafe as getSettingsSafeFromDb,
  saveSettings as saveSettingsToDb,
} from "@/lib/db/settings";
import type { EmailAccountSettings } from "@/types/settings";

export async function getSettings(): Promise<EmailAccountSettings | null> {
  return getSettingsFromDb();
}

/** 返回给前端的配置（不含密码） */
export async function getSettingsSafe(): Promise<{
  displayName: string;
  email: string;
  imap: EmailAccountSettings["imap"];
  smtp: EmailAccountSettings["smtp"];
  hasPassword: boolean;
  configured?: boolean;
} | null> {
  return getSettingsSafeFromDb();
}

export async function saveSettings(
  input: Partial<EmailAccountSettings> & { email: string }
): Promise<EmailAccountSettings> {
  return saveSettingsToDb(input);
}
