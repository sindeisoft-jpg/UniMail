"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Loader2, Mail, Paperclip, X } from "lucide-react";
import { sendMail } from "@/lib/api/mail";

type AttachmentItem = { file: File; id: string };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function ComposeForm() {
  const searchParams = useSearchParams();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const toParam = searchParams.get("to");
    const subjectParam = searchParams.get("subject");
    if (toParam) setTo(decodeURIComponent(toParam));
    if (subjectParam) setSubject(decodeURIComponent(subjectParam));
  }, [searchParams]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const newItems: AttachmentItem[] = Array.from(files).map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }));
    setAttachments((prev) => [...prev, ...newItems].slice(0, 20));
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const toTrim = to.trim();
    if (!toTrim) {
      setError("请填写收件人");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const attachmentPayloads = await Promise.all(
        attachments.map(async (a) => ({
          filename: a.file.name,
          contentType: a.file.type || "application/octet-stream",
          content: await fileToBase64(a.file),
        }))
      );
      const mail = await sendMail({
        to: toTrim,
        subject: subject.trim(),
        body: body.trim(),
        attachments: attachmentPayloads.length > 0 ? attachmentPayloads : undefined,
      });
      if (mail) {
        window.location.href = "/?folder=sent";
      } else {
        setError("发送失败，请重试");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败，请重试");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      {/* 顶部栏 */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Mail className="size-5 text-muted-foreground" />
            <span className="font-semibold text-foreground">新邮件</span>
          </div>
        </div>
        <Button
          onClick={handleSend}
          disabled={sending}
          className="min-w-[100px] gap-2"
        >
          {sending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              发送中…
            </>
          ) : (
            <>
              <Send className="size-4" />
              发送
            </>
          )}
        </Button>
      </header>

      {/* 全屏编辑区 */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <form
          onSubmit={handleSend}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden rounded-t-xl bg-background shadow-sm">
            {/* 收件人、主题：紧凑单行 */}
            <div className="shrink-0 border-b border-border px-6 py-4">
              <div className="flex items-center gap-4">
                <label className="w-14 shrink-0 text-sm font-medium text-muted-foreground">
                  收件人
                </label>
                <Input
                  type="email"
                  placeholder="请输入收件人邮箱"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                />
              </div>
              <div className="mt-1 flex items-center gap-4">
                <label className="w-14 shrink-0 text-sm font-medium text-muted-foreground">
                  主题
                </label>
                <Input
                  placeholder="邮件主题"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* 正文：占满剩余空间 */}
            <div className="flex-1 overflow-hidden px-6 pb-6 pt-2 flex flex-col gap-2">
              <Textarea
                placeholder="输入邮件正文…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="h-full min-h-[320px] w-full resize-none rounded-lg border border-border/80 bg-muted/30 px-4 py-4 text-[15px] leading-[1.7] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/20"
              />
              {/* 附件 */}
              <div className="shrink-0 flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onFileChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-4" />
                  添加附件
                </Button>
                {attachments.length > 0 && (
                  <ul className="flex flex-wrap gap-2 items-center">
                    {attachments.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center gap-1 rounded-md border border-border bg-muted/50 px-2 py-1 text-xs text-foreground"
                      >
                        <span className="max-w-[120px] truncate" title={a.file.name}>
                          {a.file.name}
                        </span>
                        <button
                          type="button"
                          aria-label="移除附件"
                          className="p-0.5 rounded hover:bg-muted"
                          onClick={() => removeAttachment(a.id)}
                        >
                          <X className="size-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-auto w-full max-w-4xl px-6 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-muted/30">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ComposeForm />
    </Suspense>
  );
}
