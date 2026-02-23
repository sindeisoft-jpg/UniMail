import { NextRequest, NextResponse } from "next/server";
import { getAttachmentByContentId } from "@/lib/db/attachments";
import { readFileSync } from "fs";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  let mailId = (await params).id;
  if (!mailId) {
    const segments = request.nextUrl.pathname.split("/");
    const idx = segments.indexOf("mails");
    mailId = idx >= 0 && segments[idx + 1] ? segments[idx + 1] : "";
  }
  const cid = request.nextUrl.searchParams.get("cid");
  if (!mailId || !cid) {
    return NextResponse.json({ error: "Missing mail id or cid" }, { status: 400 });
  }
  const att = getAttachmentByContentId(mailId, cid);
  if (!att) {
    return NextResponse.json({ error: "Inline image not found" }, { status: 404 });
  }
  try {
    const buffer = readFileSync(att.path);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": att.contentType || "image/png",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to read inline image" }, { status: 500 });
  }
}
