"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Mail, Server, Loader2, CheckCircle, Palette } from "lucide-react";
import { getPresetForEmail } from "@/lib/email-presets";
import { useTheme } from "@/components/theme/ThemeProvider";
import { ThemePicker } from "@/components/theme/ThemePicker";

interface SettingsForm {
  displayName: string;
  email: string;
  password: string;
  imapHost: string;
  imapPort: string;
  imapSecure: boolean;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
}

const defaultForm: SettingsForm = {
  displayName: "",
  email: "",
  password: "",
  imapHost: "",
  imapPort: "993",
  imapSecure: true,
  smtpHost: "",
  smtpPort: "465",
  smtpSecure: true,
};

export default function SettingsPage() {
  const [form, setForm] = useState<SettingsForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  /** 当前邮箱对应的预设提示（如「需使用授权码」） */
  const [providerHint, setProviderHint] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  /** 根据邮箱地址自动填充 IMAP/SMTP 配置（常用邮箱） */
  const applyPresetFromEmail = useCallback((email: string) => {
    const preset = getPresetForEmail(email);
    if (!preset) {
      setProviderHint(null);
      return;
    }
    setProviderHint(preset.hint ?? null);
    setForm((f) => ({
      ...f,
      imapHost: preset.imap.host,
      imapPort: String(preset.imap.port),
      imapSecure: preset.imap.secure,
      smtpHost: preset.smtp.host,
      smtpPort: String(preset.smtp.port),
      smtpSecure: preset.smtp.secure,
    }));
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings?includePassword=true");
      const data = await res.json();
      if (data.configured && data.email) {
        const nextForm = {
          displayName: data.displayName ?? "",
          email: data.email ?? "",
          password: data.password ?? "",
          imapHost: data.imap?.host ?? "",
          imapPort: String(data.imap?.port ?? 993),
          imapSecure: data.imap?.secure ?? true,
          smtpHost: data.smtp?.host ?? "",
          smtpPort: String(data.smtp?.port ?? 465),
          smtpSecure: data.smtp?.secure ?? true,
        };
        setForm(nextForm);
        const preset = getPresetForEmail(nextForm.email);
        setProviderHint(preset?.hint ?? null);
      }
    } catch {
      setMessage({ type: "error", text: "加载配置失败" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          password: form.password || undefined,
          imap: {
            host: form.imapHost.trim(),
            port: parseInt(form.imapPort, 10) || 993,
            secure: form.imapSecure,
          },
          smtp: {
            host: form.smtpHost.trim(),
            port: parseInt(form.smtpPort, 10) || 465,
            secure: form.smtpSecure,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "保存失败" });
        return;
      }
      setMessage({ type: "success", text: "邮箱配置已保存" });
      if (form.password) setForm((f) => ({ ...f, password: "" }));
    } catch {
      setMessage({ type: "error", text: "保存失败" });
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setMessage(null);
    setSyncLoading(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "同步失败，请检查 IMAP 配置与密码" });
        return;
      }
      setMessage({ type: "success", text: `已同步 ${data.synced ?? 0} 封邮件` });
    } catch {
      setMessage({ type: "error", text: "同步失败" });
    } finally {
      setSyncLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold text-foreground">邮箱设置</h1>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">
        <section className="mb-10 space-y-4">
          <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
            <Palette className="size-4" />
            外观与主题
          </h2>
          <p className="text-sm text-muted-foreground">
            选择你喜欢的界面主题，切换后立即生效。
          </p>
          <ThemePicker value={theme} onChange={setTheme} />
        </section>

        <form onSubmit={handleSave} className="space-y-8">
          {message && (
            <div
              className={
                message.type === "success"
                  ? "rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
                  : "rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
              }
            >
              {message.text}
            </div>
          )}

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
              <Mail className="size-4" />
              账户信息
            </h2>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">显示名称</label>
              <Input
                placeholder="如：我的 Gmail"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">邮箱地址</label>
              <Input
                type="email"
                placeholder="your@gmail.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                onBlur={(e) => applyPresetFromEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                填写常用邮箱后，收信/发信服务器会自动填充，您只需填写密码。
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">密码 / 应用专用密码</label>
              <Input
                type="password"
                placeholder="请填写密码或授权码"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
              {providerHint ? (
                <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-500">
                  <CheckCircle className="size-3.5 shrink-0 mt-0.5" />
                  {providerHint}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Gmail、QQ、163 等请使用「授权码/应用专用密码」，不要使用登录密码。
                </p>
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
              <Server className="size-4" />
              收信服务器 (IMAP)
            </h2>
            <div className="grid grid-cols-[1fr,80px] gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">主机</label>
                <Input
                  placeholder="imap.gmail.com"
                  value={form.imapHost}
                  onChange={(e) => setForm((f) => ({ ...f, imapHost: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">端口</label>
                <Input
                  type="number"
                  value={form.imapPort}
                  onChange={(e) => setForm((f) => ({ ...f, imapPort: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.imapSecure}
                onChange={(e) => setForm((f) => ({ ...f, imapSecure: e.target.checked }))}
                className="rounded border-input"
              />
              使用 SSL / TLS
            </label>
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
              <Server className="size-4" />
              发信服务器 (SMTP)
            </h2>
            <div className="grid grid-cols-[1fr,80px] gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">主机</label>
                <Input
                  placeholder="smtp.gmail.com"
                  value={form.smtpHost}
                  onChange={(e) => setForm((f) => ({ ...f, smtpHost: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">端口</label>
                <Input
                  type="number"
                  value={form.smtpPort}
                  onChange={(e) => setForm((f) => ({ ...f, smtpPort: e.target.value }))}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.smtpSecure}
                onChange={(e) => setForm((f) => ({ ...f, smtpSecure: e.target.checked }))}
                className="rounded border-input"
              />
              使用 SSL / TLS
            </label>
          </section>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  保存中…
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  保存配置
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSync}
              disabled={syncLoading || !form.imapHost || !form.email}
            >
              {syncLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  同步中…
                </>
              ) : (
                "从服务器同步邮件"
              )}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-sm text-muted-foreground">
          保存后，发信将使用您配置的 SMTP；点击「从服务器同步邮件」可拉取收件箱到本地查看。
        </p>
      </main>
    </div>
  );
}
