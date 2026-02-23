import type { Mail } from "@/types/mail";

export type FolderId =
  | "inbox"
  | "important"
  | "starred"
  | "sent"
  | "drafts"
  | "trash"
  | "spam";

const BASE = "/api/mails";

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<{ data?: T; error?: string }> {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const text = await res.text();
  if (!res.ok) {
    return { error: text || res.statusText };
  }
  if (!text) return {};
  try {
    return { data: JSON.parse(text) as T };
  } catch {
    return {};
  }
}

export async function getMails(folder: string): Promise<Mail[]> {
  const { data, error } = await request<Mail[]>(
    `${BASE}?folder=${encodeURIComponent(folder)}`
  );
  if (error) return [];
  return data ?? [];
}

export async function getMail(id: string): Promise<Mail | null> {
  const { data, error } = await request<Mail>(`${BASE}/${encodeURIComponent(id)}`);
  if (error) return null;
  return data ?? null;
}

export async function markAsRead(id: string): Promise<Mail | null> {
  const { data } = await request<Mail>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ read: true }),
  });
  return data ?? null;
}

export async function setStarred(id: string, starred: boolean): Promise<Mail | null> {
  const { data } = await request<Mail>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ starred }),
  });
  return data ?? null;
}

export async function moveToTrash(id: string): Promise<Mail | null> {
  const { data } = await request<Mail>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ folder: "trash" }),
  });
  return data ?? null;
}

export async function moveToSpam(id: string): Promise<Mail | null> {
  const { data } = await request<Mail>(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ folder: "spam" }),
  });
  return data ?? null;
}

export async function moveToFolder(mailId: string, folderId: string): Promise<Mail | null> {
  const { data } = await request<Mail>(`${BASE}/${mailId}`, {
    method: "PATCH",
    body: JSON.stringify({ folder: folderId }),
  });
  return data ?? null;
}

export type SendMailAttachment = { filename: string; contentType?: string; content: string };

export async function sendMail(params: {
  to: string;
  subject: string;
  body: string;
  attachments?: SendMailAttachment[];
}): Promise<Mail | null> {
  const { data, error } = await request<Mail>(BASE, {
    method: "POST",
    body: JSON.stringify({
      to: params.to,
      subject: params.subject,
      body: params.body,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        contentType: a.contentType || "application/octet-stream",
        content: a.content,
      })),
    }),
  });
  if (error) {
    let msg = "发送失败，请重试";
    try {
      const j = JSON.parse(error) as { error?: string };
      if (j?.error && typeof j.error === "string") msg = j.error;
    } catch {
      if (error) msg = error;
    }
    throw new Error(msg);
  }
  return data ?? null;
}
