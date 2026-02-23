/**
 * 常用邮箱的 IMAP/SMTP 预设，按邮箱域名自动填充
 * 用户只需填写邮箱地址和密码
 */
export interface EmailProviderPreset {
  name: string;
  imap: { host: string; port: number; secure: boolean };
  smtp: { host: string; port: number; secure: boolean };
  /** 提示文案，如需要开启 IMAP / 使用应用专用密码 */
  hint?: string;
}

const presets: Record<string, EmailProviderPreset> = {
  "gmail.com": {
    name: "Gmail",
    imap: { host: "imap.gmail.com", port: 993, secure: true },
    smtp: { host: "smtp.gmail.com", port: 465, secure: true },
    hint: "需在 Google 账户中开启「允许不够安全的应用」或使用应用专用密码",
  },
  "googlemail.com": {
    name: "Gmail",
    imap: { host: "imap.gmail.com", port: 993, secure: true },
    smtp: { host: "smtp.gmail.com", port: 465, secure: true },
    hint: "需在 Google 账户中开启「允许不够安全的应用」或使用应用专用密码",
  },
  "qq.com": {
    name: "QQ 邮箱",
    imap: { host: "imap.qq.com", port: 993, secure: true },
    smtp: { host: "smtp.qq.com", port: 465, secure: true },
    hint: "需在 QQ 邮箱设置中开启 IMAP/SMTP 并获取授权码（非 QQ 登录密码）",
  },
  "foxmail.com": {
    name: "Foxmail",
    imap: { host: "imap.qq.com", port: 993, secure: true },
    smtp: { host: "smtp.qq.com", port: 465, secure: true },
    hint: "使用 QQ 邮箱授权码",
  },
  "163.com": {
    name: "网易 163",
    imap: { host: "imap.163.com", port: 993, secure: true },
    smtp: { host: "smtp.163.com", port: 465, secure: true },
    hint: "需在网易邮箱开启 IMAP/SMTP 服务并设置授权密码",
  },
  "126.com": {
    name: "网易 126",
    imap: { host: "imap.126.com", port: 993, secure: true },
    smtp: { host: "smtp.126.com", port: 465, secure: true },
    hint: "需在网易邮箱开启 IMAP/SMTP 服务并设置授权密码",
  },
  "yeah.net": {
    name: "网易 yeah",
    imap: { host: "imap.yeah.net", port: 993, secure: true },
    smtp: { host: "smtp.yeah.net", port: 465, secure: true },
    hint: "需在网易邮箱开启 IMAP/SMTP 服务并设置授权密码",
  },
  "outlook.com": {
    name: "Outlook",
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
    hint: "Outlook 使用 STARTTLS 端口 587；建议使用应用密码",
  },
  "hotmail.com": {
    name: "Outlook",
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
    hint: "建议使用应用密码",
  },
  "live.com": {
    name: "Outlook",
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
    hint: "建议使用应用密码",
  },
  "office365.com": {
    name: "Microsoft 365",
    imap: { host: "outlook.office365.com", port: 993, secure: true },
    smtp: { host: "smtp.office365.com", port: 587, secure: false },
    hint: "使用账户密码或应用密码",
  },
  "yahoo.com": {
    name: "Yahoo",
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.yahoo.com", port: 465, secure: true },
    hint: "需生成并使用应用专用密码",
  },
  "yahoo.com.cn": {
    name: "Yahoo 中国",
    imap: { host: "imap.mail.yahoo.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.yahoo.com", port: 465, secure: true },
    hint: "需生成并使用应用专用密码",
  },
  "sina.com": {
    name: "新浪邮箱",
    imap: { host: "imap.sina.com", port: 993, secure: true },
    smtp: { host: "smtp.sina.com", port: 465, secure: true },
    hint: "需在邮箱设置中开启 IMAP/SMTP",
  },
  "sina.cn": {
    name: "新浪邮箱",
    imap: { host: "imap.sina.com", port: 993, secure: true },
    smtp: { host: "smtp.sina.com", port: 465, secure: true },
    hint: "需在邮箱设置中开启 IMAP/SMTP",
  },
  "139.com": {
    name: "中国移动 139",
    imap: { host: "imap.139.com", port: 993, secure: true },
    smtp: { host: "smtp.139.com", port: 465, secure: true },
    hint: "需开启 IMAP/SMTP 服务",
  },
  "189.cn": {
    name: "天翼邮箱",
    imap: { host: "imap.189.cn", port: 993, secure: true },
    smtp: { host: "smtp.189.cn", port: 465, secure: true },
    hint: "需在邮箱设置中开启 POP3/IMAP/SMTP",
  },
  "aliyun.com": {
    name: "阿里云邮箱",
    imap: { host: "imap.aliyun.com", port: 993, secure: true },
    smtp: { host: "smtp.aliyun.com", port: 465, secure: true },
    hint: "需在邮箱设置中开启 IMAP/SMTP",
  },
  "foxmail.com.cn": {
    name: "Foxmail",
    imap: { host: "imap.qq.com", port: 993, secure: true },
    smtp: { host: "smtp.qq.com", port: 465, secure: true },
    hint: "使用 QQ 邮箱授权码",
  },
  "icloud.com": {
    name: "iCloud",
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
    hint: "需在 appleid.apple.com 生成应用专用密码",
  },
  "me.com": {
    name: "iCloud",
    imap: { host: "imap.mail.me.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.me.com", port: 587, secure: false },
    hint: "需在 appleid.apple.com 生成应用专用密码",
  },
  "mail.com": {
    name: "Mail.com",
    imap: { host: "imap.mail.com", port: 993, secure: true },
    smtp: { host: "smtp.mail.com", port: 465, secure: true },
  },
};

/**
 * 从邮箱地址解析域名（小写），如 user+tag@gmail.com -> gmail.com
 */
export function getEmailDomain(email: string): string | null {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  return trimmed.slice(at + 1).toLowerCase();
}

/**
 * 根据邮箱地址获取预设配置，若无则返回 null
 */
export function getPresetForEmail(email: string): EmailProviderPreset | null {
  const domain = getEmailDomain(email);
  if (!domain) return null;
  return presets[domain] ?? null;
}

/**
 * 所有支持的预设域名列表（用于展示或提示）
 */
export function getSupportedDomains(): string[] {
  return Object.keys(presets);
}
