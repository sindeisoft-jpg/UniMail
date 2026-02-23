import { NextRequest, NextResponse } from "next/server";
import { getSettingsSafe, saveSettings } from "@/lib/store/settings";
import type { EmailAccountSettings } from "@/types/settings";

export async function GET() {
  try {
    const settings = await getSettingsSafe();
    return NextResponse.json(settings ?? { configured: false });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim() : undefined;
  if (!email) {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 }
    );
  }
  try {
    const settings = await saveSettings({
      displayName: typeof body.displayName === "string" ? body.displayName : undefined,
      email,
      password: typeof body.password === "string" ? body.password : undefined,
      imap:
        body.imap && typeof body.imap === "object" && !Array.isArray(body.imap)
          ? ({
              host: typeof (body.imap as Record<string, unknown>).host === "string"
                ? (body.imap as Record<string, unknown>).host
                : undefined,
              port: typeof (body.imap as Record<string, unknown>).port === "number"
                ? (body.imap as Record<string, unknown>).port
                : undefined,
              secure: typeof (body.imap as Record<string, unknown>).secure === "boolean"
                ? (body.imap as Record<string, unknown>).secure
                : undefined,
            } as Partial<EmailAccountSettings>["imap"])
          : undefined,
      smtp:
        body.smtp && typeof body.smtp === "object" && !Array.isArray(body.smtp)
          ? ({
              host: typeof (body.smtp as Record<string, unknown>).host === "string"
                ? (body.smtp as Record<string, unknown>).host
                : undefined,
              port: typeof (body.smtp as Record<string, unknown>).port === "number"
                ? (body.smtp as Record<string, unknown>).port
                : undefined,
              secure: typeof (body.smtp as Record<string, unknown>).secure === "boolean"
                ? (body.smtp as Record<string, unknown>).secure
                : undefined,
            } as Partial<EmailAccountSettings>["smtp"])
          : undefined,
    });
    return NextResponse.json({
      displayName: settings.displayName,
      email: settings.email,
      imap: settings.imap,
      smtp: settings.smtp,
      hasPassword: !!settings.password,
      configured: true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
