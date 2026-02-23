/**
 * 轻量 HTML 清理：移除脚本/样式与危险属性，保留邮件常用标签，防止 XSS。
 * 内嵌图片 cid: 应在传入前已替换为安全 URL。
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  let out = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/\bon\w+\s*=\s*[^\s>]*/gi, "")
    .replace(/\s*href\s*=\s*["']\s*javascript:[^"']*["']/gi, " ")
    .replace(/\s*href\s*=\s*["']\s*data:[^"']*["']/gi, " ");
  return out;
}

/** 将 HTML 中的 cid:xxx 替换为内嵌图片 API 地址（需在 sanitize 前调用） */
export function rewriteCidToInlineUrl(html: string, mailId: string, baseUrl = ""): string {
  if (!html || !mailId) return html;
  const prefix = baseUrl ? `${baseUrl}/api/mails/${encodeURIComponent(mailId)}/attachments/inline` : `/api/mails/${encodeURIComponent(mailId)}/attachments/inline`;
  return html.replace(
    /cid:([^"'\s>]+)/gi,
    (_, cid) => `${prefix}?cid=${encodeURIComponent(cid.trim())}`
  );
}
