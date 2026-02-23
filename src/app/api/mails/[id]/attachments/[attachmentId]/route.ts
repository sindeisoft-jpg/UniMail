import { NextRequest, NextResponse } from "next/server";
import { getAttachmentById } from "@/lib/db/attachments";
import { readFileSync, existsSync } from "fs";

type RouteParams = { params: Promise<{ id: string; attachmentId: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { attachmentId } = await params;
  if (!attachmentId) {
    return NextResponse.json({ error: "Missing attachment id" }, { status: 400 });
  }
  const att = getAttachmentById(attachmentId);
  if (!att) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
  }
  if (!existsSync(att.path)) {
    console.error("Attachment file missing on disk:", att.path);
    return NextResponse.json(
      { error: "Attachment file missing (may have been deleted or not saved)" },
      { status: 404 }
    );
  }
  try {
    const buffer = readFileSync(att.path);
    const safeName = att.filename.replace(/[^\w.\-\u4e00-\u9fa5]/g, "_").replace(/"/g, "_");
    const disposition = `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(att.filename)}`;
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": att.contentType || "application/octet-stream",
        "Content-Disposition": disposition,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("Failed to read attachment file:", att.path, err.message);
    return NextResponse.json(
      { error: `Failed to read attachment: ${err.message}` },
      { status: 500 }
    );
  }
}
