import { NextRequest, NextResponse } from "next/server";
import {
  getMailById,
  updateMail,
} from "@/lib/store/mails";
import { getFolderById } from "@/lib/db/folders";
import { getAttachmentsByMailId } from "@/lib/db/attachments";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  try {
    const mail = await getMailById(id);
    if (!mail) {
      return NextResponse.json({ error: "Mail not found" }, { status: 404 });
    }
    const attachments = getAttachmentsByMailId(id);
    return NextResponse.json({ ...mail, attachments });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load mail" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  let body: { read?: boolean; starred?: boolean; folder?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const patch: Parameters<typeof updateMail>[1] = {};
  if (typeof body.read === "boolean") patch.read = body.read;
  if (typeof body.starred === "boolean") patch.starred = body.starred;
  if (typeof body.folder === "string" && body.folder) {
    const validSystem = ["inbox", "sent", "drafts", "trash", "spam"].includes(body.folder);
    const validCustom = body.folder.startsWith("custom-") && getFolderById(body.folder);
    if (validSystem || validCustom) patch.folder = body.folder;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }
  try {
    const mail = await updateMail(id, patch);
    if (!mail) {
      return NextResponse.json({ error: "Mail not found" }, { status: 404 });
    }
    return NextResponse.json(mail);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to update mail" },
      { status: 500 }
    );
  }
}
