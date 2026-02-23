import type { Folder } from "@/types/mail";

const BASE = "/api/folders";

export async function getFolders(): Promise<Folder[]> {
  const res = await fetch(BASE);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function createFolder(name: string): Promise<Folder | null> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

export async function deleteFolder(id: string): Promise<boolean> {
  const res = await fetch(`/api/folders/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return res.ok;
}
