/**
 * 仅当正文开头是「原始邮件头」时，去掉这些头行，保留真正正文。
 * 只识别已知的邮件头名称（Received、Message-ID、X-QQ- 等），避免误删正文里
 * 类似「主题：xxx」「日期：xxx」的普通内容。
 */
const KNOWN_HEADER_PREFIX = /^(Received|Message-ID|X-QQ-[A-Za-z0-9-]*|X-Mailer|X-Priority|Date|From|To|Subject|Content-Type|Content-Transfer-Encoding|MIME-Version|Return-Path|Delivered-To|Reply-To|Cc|Bcc|In-Reply-To|References|List-Id|List-Unsubscribe|DKIM|Authentication-Results|ARC-)[:\s]/i;

export function stripLeadingHeaders(content: string): string {
  if (!content || typeof content !== "string") return content;
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const continuation = /^\s+/;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line === "") break;
    const isKnownHeader = KNOWN_HEADER_PREFIX.test(line);
    const isContinuation = i > 0 && continuation.test(line);
    if (!isKnownHeader && !isContinuation) break;
    i++;
  }
  const rest = lines.slice(i).join("\n").trim();
  return i > 0 ? rest : content;
}
