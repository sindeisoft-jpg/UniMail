import { NextRequest, NextResponse } from "next/server";
import { deleteFolder, getFolderById } from "@/lib/db/folders";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  if (!id || !id.startsWith("custom-")) {
    return NextResponse.json(
      { error: "只能删除自定义文件夹" },
      { status: 400 }
    );
  }
  try {
    const ok = deleteFolder(id);
    if (!ok) {
      return NextResponse.json(
        { error: "文件夹不存在或无法删除" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "删除失败" },
      { status: 500 }
    );
  }
}

export async function GET(
  _request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const folder = getFolderById(id);
  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }
  return NextResponse.json(folder);
}
