import { NextResponse } from "next/server";
// @ts-expect-error mailparser has no types
import { simpleParser } from "mailparser";
import { getSettings } from "@/lib/store/settings";
import { getExistingMailIds, mergeMails } from "@/lib/store/mails";
import { saveAttachment } from "@/lib/db/attachments";
import { ImapFlow } from "imapflow";
import type { Mail } from "@/types/mail";

type ParsedAttachment = { content?: Buffer | unknown; contentType?: string; filename?: string; cid?: string };

/** 从 HTML 中粗略去掉标签，得到纯文本（用于无 text 只有 html 的邮件） */
function htmlToPlainText(html: string, maxLen: number): string {
  const stripped = html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, maxLen);
}

function parseAddress(addr: { address?: string; name?: string }[] | undefined): { email: string; name: string } {
  const first = Array.isArray(addr) && addr.length > 0 ? addr[0] : undefined;
  return {
    email: first?.address ?? "",
    name: first?.name ?? first?.address ?? "",
  };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ");
}

export async function POST() {
  const settings = await getSettings();
  if (!settings?.password || !settings.imap.host) {
    return NextResponse.json(
      { error: "请先在设置中配置邮箱与 IMAP 密码" },
      { status: 400 }
    );
  }

  const client = new ImapFlow({
    host: settings.imap.host,
    port: settings.imap.port,
    secure: settings.imap.secure,
    auth: {
      user: settings.email,
      pass: settings.password,
    },
  });

  const newMails: Mail[] = [];
  /** mailId -> attachments 用于同步后写入附件 */
  const pendingAttachments = new Map<string, ParsedAttachment[]>();

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const existingIds = await getExistingMailIds();

      const uids = await client.search({ all: true }, { uid: true });
      const toFetch = Array.isArray(uids) ? uids.slice(-100) : [];
      if (toFetch.length === 0) {
        return NextResponse.json({ synced: 0, message: "收件箱为空" });
      }

      const messages = await client.fetchAll(
        toFetch,
        { envelope: true, source: true },
        { uid: true }
      );

      for (const msg of messages) {
        const uid = msg.uid;
        const id = `imap-${settings.email}-${uid}`;
        if (existingIds.has(id)) continue;

        const env = msg.envelope;
        const from = parseAddress(env?.from);
        const to = parseAddress(env?.to);
        const subject =
          (typeof env?.subject === "string"
            ? env.subject
            : Array.isArray(env?.subject)
              ? (env.subject as string[]).join(" ")
              : undefined) ?? "(无主题)";
        let body = "";
        let htmlBody: string | undefined;
        let attachments: ParsedAttachment[] = [];
        try {
          const raw = typeof msg.source === "string" ? Buffer.from(msg.source, "utf-8") : msg.source;
          if (raw && raw.length > 0) {
            const parsed = await simpleParser(raw);
            const text = parsed.text?.trim();
            const html = parsed.html;
            if (text) {
              body = text.slice(0, 5000);
            } else if (html) {
              body = htmlToPlainText(html, 5000);
            }
            if (!body) body = "(无正文)";
            if (html && typeof html === "string") {
              htmlBody = html.length > 200_000 ? html.slice(0, 200_000) + "..." : html;
            }
            if (Array.isArray(parsed.attachments) && parsed.attachments.length > 0) {
              attachments = parsed.attachments;
            }
          } else {
            body = "(无法解析正文)";
          }
        } catch {
          body = "(无法解析正文)";
        }
        const snippet = body.slice(0, 80).replace(/\s+/g, " ");
        const date = env?.date ? formatDate(new Date(env.date)) : formatDate(new Date());

        newMails.push({
          id,
          from: from.name || from.email || "未知",
          fromEmail: from.email,
          to: to.email ? to.email : settings.email,
          subject,
          snippet,
          body,
          htmlBody: htmlBody ?? undefined,
          date,
          read: false,
          starred: false,
          folder: "inbox",
        });
        if (attachments.length > 0) {
          pendingAttachments.set(id, attachments);
        }
        existingIds.add(id);
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (err) {
    const message = err instanceof Error ? err.message : "IMAP 连接失败";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }

  if (newMails.length > 0) {
    await mergeMails(newMails);
    for (const [mailId, atts] of pendingAttachments) {
      for (let i = 0; i < atts.length; i++) {
        const att = atts[i];
        const content = att.content;
        if (content == null) continue;
        const buf = Buffer.isBuffer(content) ? content : Buffer.from(content as unknown as Buffer);
        const filename = att.filename || att.contentType?.split("/")?.[1] || "attachment";
        const contentId = att.cid ?? undefined;
        try {
          saveAttachment({
            mailId,
            index: i,
            filename,
            contentType: att.contentType || "application/octet-stream",
            contentId: contentId ?? null,
            content: buf,
          });
        } catch (e) {
          console.error("Save attachment failed:", mailId, filename, e);
        }
      }
    }
  }

  return NextResponse.json({ synced: newMails.length });
}
