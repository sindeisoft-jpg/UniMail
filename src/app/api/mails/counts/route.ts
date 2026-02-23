import { NextResponse } from "next/server";
import { getFolderCounts } from "@/lib/store/mails";

export async function GET() {
  try {
    const counts = await getFolderCounts();
    return NextResponse.json(counts);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load counts" },
      { status: 500 }
    );
  }
}
