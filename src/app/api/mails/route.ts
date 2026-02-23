import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getSettings } from "@/lib/store/settings";
import {
  getMailsByFolder,
  getFolderCounts,
  sendMail as sendMailStore,
} from "@/lib/store/mails";
import { getFolderById } from "@/lib/db/folders";

const SYSTEM_FOLDER_IDS = new Set(["inbox", "important", "starred", "sent", "drafts", "trash", "spam"]);

export async function GET(request: NextRequest) {
  const folder = request.nextUrl.searchParams.get("folder");
  if (!folder) {
    return NextResponse.json(
      { error: "Missing folder" },
      { status: 400 }
    );
  }
  const isValid = SYSTEM_FOLDER_IDS.has(folder) || (folder.startsWith("custom-") && getFolderById(folder));
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid folder" },
      { status: 400 }
    );
  }
  try {
    const mails = await getMailsByFolder(folder);
    return NextResponse.json(mails);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load mails" },
      { status: 500 }
    );
  }
}

type AttachmentPayload = { filename: string; contentType: string; content: string };

export async function POST(request: NextRequest) {
  let body: { to?: string; subject?: string; body?: string; attachments?: AttachmentPayload[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
  const { to, subject, body: mailBody, attachments: attachmentsPayload } = body;
  if (!to || typeof subject !== "string" || typeof mailBody !== "string") {
    return NextResponse.json(
      { error: "Missing to, subject or body" },
      { status: 400 }
    );
  }
  const toTrim = String(to).trim();
  const subjectTrim = String(subject).trim();
  const bodyTrim = String(mailBody).trim();
  const attachments: AttachmentPayload[] = Array.isArray(attachmentsPayload)
    ? attachmentsPayload.filter(
        (a): a is AttachmentPayload =>
          a && typeof a.filename === "string" && typeof a.content === "string"
      ).slice(0, 20)
    : [];

  const settings = await getSettings();
  const canSend =
    settings?.email &&
    settings?.password &&
    settings?.smtp?.host;

  if (!canSend) {
    return NextResponse.json(
      {
        error:
          "尚未配置发信：请先在「设置」中填写邮箱、发信服务器 (SMTP) 和密码/授权码，保存后再发送。",
      },
      { status: 503 }
    );
  }

  const nodemailerAttachments = attachments.map((a) => ({
    filename: a.filename,
    content: Buffer.from(a.content, "base64"),
    contentType: a.contentType || "application/octet-stream",
  }));

  try {
    const transporter = nodemailer.createTransport({
      host: settings!.smtp!.host,
      port: settings!.smtp!.port,
      secure: settings!.smtp!.secure,
      auth: {
        user: settings!.email,
        pass: settings!.password,
      },
    });
    await transporter.sendMail({
      from: `"${settings!.displayName || settings!.email}" <${settings!.email}>`,
      to: toTrim,
      subject: subjectTrim,
      text: bodyTrim,
      attachments: nodemailerAttachments.length > 0 ? nodemailerAttachments : undefined,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "SMTP 发信失败，请检查设置中的发信服务器与密码（或授权码）是否正确。" },
      { status: 502 }
    );
  }

  try {
    const mail = await sendMailStore({
      to: toTrim,
      subject: subjectTrim,
      body: bodyTrim,
      from: settings?.displayName || "我",
      fromEmail: settings?.email ?? "me@unimail.app",
    });
    return NextResponse.json(mail);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save mail" },
      { status: 500 }
    );
  }
}
