/**
 * 从发件人邮箱解析域名，并为知名/大厂域名返回 Logo 路径。
 * 优先使用本地 public/logos 下的 logo，无则使用 Clearbit 接口。
 */

/** 知名域名 -> 本地 logo 文件名（放在 public/logos/ 下，如 github.svg） */
const KNOWN_DOMAINS_TO_LOCAL_LOGO: Record<string, string> = {
  "github.com": "github.svg",
  "facebook.com": "facebook.svg",
  "mail.facebook.com": "facebook.svg",
  "google.com": "google.svg",
  "gmail.com": "google.svg",
  "googlemail.com": "google.svg",
  "outlook.com": "microsoft.svg",
  "hotmail.com": "microsoft.svg",
  "live.com": "microsoft.svg",
  "microsoft.com": "microsoft.svg",
  "office365.com": "microsoft.svg",
  "apple.com": "apple.svg",
  "icloud.com": "apple.svg",
  "me.com": "apple.svg",
  "amazon.com": "amazon.svg",
  "twitter.com": "x.svg",
  "x.com": "x.svg",
  "linkedin.com": "linkedin.svg",
  "instagram.com": "instagram.svg",
  "youtube.com": "youtube.svg",
  "slack.com": "slack.svg",
  "hubspot.com": "hubspot.svg",
  "hubspotemail.com": "hubspot.svg",
  "notion.so": "notion.svg",
  "notion.team": "notion.svg",
  "figma.com": "figma.svg",
  "dropbox.com": "dropbox.svg",
  "zoom.us": "zoom.svg",
  "atlassian.com": "atlassian.svg",
  "jira.com": "atlassian.svg",
  "bitbucket.org": "bitbucket.svg",
  "gitlab.com": "gitlab.svg",
  "stackoverflow.com": "stackoverflow.svg",
  "reddit.com": "reddit.svg",
  "discord.com": "discord.svg",
  "twitch.tv": "twitch.svg",
  "spotify.com": "spotify.svg",
  "netflix.com": "netflix.svg",
  "paypal.com": "paypal.svg",
  "stripe.com": "stripe.svg",
  "shopify.com": "shopify.svg",
  "medium.com": "medium.svg",
  "substack.com": "substack.svg",
  "telegram.org": "telegram.svg",
  "whatsapp.com": "whatsapp.svg",
  "wechat.com": "wechat.svg",
  "qq.com": "qq.svg",
  "163.com": "netease.svg",
  "126.com": "netease.svg",
  "sina.com": "sina.svg",
  "sina.com.cn": "sina.svg",
  "aliyun.com": "aliyun.svg",
  "alibaba.com": "alibaba.svg",
  "taobao.com": "taobao.svg",
  "tencent.com": "tencent.svg",
  "bytedance.com": "bytedance.svg",
  "douyin.com": "douyin.svg",
  "wappler.io": "wappler.svg",
  "cesium.com": "cesium.svg",
};

/** 从邮箱地址解析出主域名（小写），如 "user@mail.github.com" -> "mail.github.com"，再取根域 "github.com" */
function getDomainFromEmail(email: string): string | null {
  if (!email || typeof email !== "string") return null;
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  if (at === -1) return null;
  const domain = trimmed.slice(at + 1).toLowerCase();
  return domain || null;
}

/** 根域名：从 mail.xxx.com 取 xxx.com */
function getRootDomain(host: string): string {
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  // 如 mail.github.com -> 取最后两段 github.com
  const knownTwoPart = ["com", "cn", "io", "co", "org", "net", "edu", "gov"];
  const tld = parts[parts.length - 1];
  if (knownTwoPart.includes(tld) && parts.length >= 3) {
    return parts.slice(-2).join(".");
  }
  return host;
}

/**
 * 根据发件人邮箱返回 Logo 地址。
 * 优先返回本地 /logos/xxx.svg；若本地未配置则返回 Clearbit 的 URL（用于知名域名）。
 */
export function getSenderLogoUrl(fromEmail: string | undefined | null): string | null {
  const domain = getDomainFromEmail(fromEmail ?? "");
  if (!domain) return null;

  const rootDomain = getRootDomain(domain);
  const localFile = KNOWN_DOMAINS_TO_LOCAL_LOGO[domain] ?? KNOWN_DOMAINS_TO_LOCAL_LOGO[rootDomain];
  if (localFile) {
    return `/logos/${localFile}`;
  }

  return null;
}
