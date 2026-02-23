import { NextRequest, NextResponse } from "next/server";
import { listFolders, createFolder } from "@/lib/db/folders";

async function getFolders() {
  try {
    const folders = listFolders();
    return NextResponse.json(folders);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load folders" },
      { status: 500 }
    );
  }
}

async function postFolder(request: NextRequest) {
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "文件夹名称不能为空" },
      { status: 400 }
    );
  }
  try {
    const folder = createFolder(name);
    return NextResponse.json(folder);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "创建失败" },
      { status: 500 }
    );
  }
}

export const GET = getFolders;
export const POST = postFolder;
