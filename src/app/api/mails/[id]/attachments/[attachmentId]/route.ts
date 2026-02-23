import { NextRequest, NextResponse } from "next/server";
import { getAttachmentById } from "@/lib/db/attachments";
import { readFileSync } from "fs";

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
  try {
    const buffer = readFileSync(att.path);
    const filename = att.filename.replace(/[^\w.\-\u4e00-\u9fa5]/g, "_");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": att.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(att.filename)}`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to read attachment" }, { status: 500 });
  }
}
