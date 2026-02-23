"use client";

import { useState, useEffect } from "react";
import {
  Paperclip,
  Image,
  Scissors,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  Link,
  Table,
  Smile,
  MoreHorizontal,
  Send,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendMail } from "@/lib/api/mail";
import { cn } from "@/lib/utils";

export interface ComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 初始收件人（如从回复进入） */
  initialTo?: string;
  /** 初始主题（如从回复进入） */
  initialSubject?: string;
  /** 发送成功后回调（如刷新列表） */
  onSent?: () => void;
}

export function ComposeModal({
  open,
  onOpenChange,
  initialTo = "",
  initialSubject = "",
  onSent,
}: ComposeModalProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [readReceipt, setReadReceipt] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [senderEmail, setSenderEmail] = useState<string>("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(initialTo);
      setSubject(initialSubject);
      setError(null);
    }
  }, [open, initialTo, initialSubject]);

  useEffect(() => {
    if (open) {
      fetch("/api/settings")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.email) setSenderEmail(String(data.email).trim());
        })
        .catch(() => {});
    }
  }, [open]);

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
      const mail = await sendMail({
        to: toTrim,
        subject: subject.trim(),
        body: body.trim(),
      });
      if (mail) {
        onOpenChange(false);
        setTo("");
        setCc("");
        setBcc("");
        setSubject("");
        setBody("");
        onSent?.();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="flex h-[85vh] max-h-[720px] w-[95vw] max-w-[720px] flex-col gap-0 p-0 overflow-hidden"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">写邮件</DialogTitle>
        <form
          onSubmit={handleSend}
          className="flex flex-1 flex-col min-h-0 overflow-hidden"
        >
          {/* 收件人、抄送、密送、主题 */}
          <div className="shrink-0 border-b border-border px-5 pt-5 pb-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="shrink-0 text-sm text-muted-foreground w-14">
                收件人:
              </Label>
              <Input
                type="text"
                placeholder="输入收件人邮箱"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="min-w-[200px] flex-1 max-w-full border-0 border-b border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary rounded-none"
              />
              <button
                type="button"
                onClick={() => setShowCc(!showCc)}
                className={cn(
                  "text-xs shrink-0",
                  showCc ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                抄送
              </button>
              <button
                type="button"
                onClick={() => setShowBcc(!showBcc)}
                className={cn(
                  "text-xs shrink-0",
                  showBcc ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"
                )}
              >
                密送
              </button>
            </div>
            {showCc && (
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-sm text-muted-foreground w-14">
                  抄送:
                </Label>
                <Input
                  type="text"
                  placeholder="抄送邮箱"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="min-w-[200px] flex-1 max-w-full border-0 border-b border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary rounded-none"
                />
              </div>
            )}
            {showBcc && (
              <div className="flex items-center gap-2">
                <Label className="shrink-0 text-sm text-muted-foreground w-14">
                  密送:
                </Label>
                <Input
                  type="text"
                  placeholder="密送邮箱"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  className="min-w-[200px] flex-1 max-w-full border-0 border-b border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary rounded-none"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Label className="shrink-0 text-sm text-muted-foreground w-14">
                主题:
              </Label>
              <Input
                type="text"
                placeholder="邮件主题"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:border-primary rounded-none"
              />
            </div>
          </div>

          {/* 格式化工具栏 */}
          <div className="shrink-0 flex flex-wrap items-center gap-1 border-b border-border px-3 py-2 bg-muted/30">
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
              <Paperclip className="size-3.5" />
              添加附件
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
              <Image className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2">
              <Scissors className="size-3.5" />
            </Button>
            <span className="w-px h-5 bg-border mx-1" />
            <select
              className="h-8 rounded border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              defaultValue=""
              aria-label="字体"
            >
              <option value="">字体</option>
            </select>
            <select
              className="h-8 rounded border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="字号"
            >
              <option value="14">14</option>
            </select>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <span className="size-3.5 rounded border-2 border-current" style={{ borderBottomColor: "transparent" }} />
            </Button>
            <span className="w-px h-5 bg-border mx-1" />
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Bold className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Italic className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Underline className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AlignLeft className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AlignCenter className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AlignRight className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <AlignJustify className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <List className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ListOrdered className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <IndentIncrease className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <IndentDecrease className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Link className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Table className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Smile className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 ml-auto">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </div>

          {/* 正文区域 */}
          <div className="flex-1 min-h-[200px] overflow-hidden px-4 py-3">
            <Textarea
              placeholder="输入邮件正文…"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="h-full min-h-[180px] w-full resize-none rounded border-0 bg-transparent px-0 py-2 text-[15px] leading-relaxed placeholder:text-muted-foreground focus-visible:ring-0"
            />
          </div>

          {/* 底部：发件人、已读回执、发送按钮 */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 bg-muted/20">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">发送</span>
              <span className="text-sm text-foreground" title={senderEmail}>
                {senderEmail ? (
                  <>
                    {senderEmail.includes("@") ? senderEmail.split("@")[0] : senderEmail}
                    <span className="text-muted-foreground">&lt;{senderEmail}&gt;</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">未设置发件人</span>
                )}
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={readReceipt}
                  onChange={(e) => setReadReceipt(e.target.checked)}
                  className="rounded border-border"
                />
                已读回执
              </label>
            </div>
            <Button type="submit" disabled={sending} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
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
          </div>

          {error && (
            <div className="shrink-0 px-5 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
