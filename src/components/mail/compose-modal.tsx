"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Paperclip,
  Image as ImageIcon,
  Scissors,
  ClipboardPaste,
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
  Undo2,
  Strikethrough,
  RemoveFormatting,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendMail } from "@/lib/api/mail";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const FONT_OPTIONS = [
  { value: "", label: "字体" },
  { value: "Arial", label: "Arial" },
  { value: "Microsoft YaHei", label: "微软雅黑" },
  { value: "SimSun", label: "宋体" },
  { value: "SimHei", label: "黑体" },
  { value: "KaiTi", label: "楷体" },
  { value: "Times New Roman", label: "Times New Roman" },
];

const FONT_SIZES = [
  { value: "1", label: "10" },
  { value: "2", label: "12" },
  { value: "3", label: "14" },
  { value: "4", label: "16" },
  { value: "5", label: "18" },
  { value: "6", label: "24" },
  { value: "7", label: "36" },
];

const EMOJI_LIST = [
  "😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂",
  "😉", "😍", "🥰", "😘", "👍", "👎", "👏", "🙌", "🤝", "💪",
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💯", "✅", "❌",
  "⭐", "🌟", "🔥", "💡", "📧", "📎", "📌", "🔔", "⏰", "📅",
];

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

export interface ComposeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTo?: string;
  initialCc?: string;
  initialSubject?: string;
  initialBody?: string;
  onSent?: () => void;
}

export function ComposeModal({
  open,
  onOpenChange,
  initialTo = "",
  initialCc = "",
  initialSubject = "",
  initialBody = "",
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
  const [showCc, setShowCc] = useState(!!initialCc);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [fontFamily, setFontFamily] = useState("");
  const [fontSize, setFontSize] = useState("3");

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isHtml = (s: string) => /^[\s\S]*<[a-z][\s\S]*>/i.test(s);

  useEffect(() => {
    if (open) {
      setTo(initialTo);
      setCc(initialCc);
      setSubject(initialSubject);
      setBody(initialBody);
      setShowCc(!!initialCc);
      setError(null);
      setAttachments([]);
    }
  }, [open, initialTo, initialCc, initialSubject, initialBody]);

  useEffect(() => {
    if (!open || !editorRef.current) return;
    const el = editorRef.current;
    if (initialBody) {
      if (isHtml(initialBody)) {
        el.innerHTML = initialBody;
      } else {
        el.textContent = initialBody;
      }
    } else {
      el.innerHTML = "";
    }
  }, [open]);

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

  const focusEditor = useCallback(() => {
    editorRef.current?.focus();
  }, []);

  const execCmd = useCallback((command: string, value?: string) => {
    focusEditor();
    document.execCommand(command, false, value ?? undefined);
  }, [focusEditor]);

  const handleEditorInput = useCallback(() => {
    const el = editorRef.current;
    if (el) setBody(el.innerText ?? "");
  }, []);

  const handleAddAttachment = () => {
    fileInputRef.current?.click();
  };

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

  const handleInsertImage = () => {
    imageInputRef.current?.click();
  };

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      focusEditor();
      document.execCommand("insertImage", false, dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleInsertLink = () => {
    const url = window.prompt("请输入链接地址：", "https://");
    if (url != null && url.trim()) execCmd("createLink", url.trim());
  };

  const handleInsertTable = () => {
    const rows = window.prompt("行数（默认 3）：", "3");
    const cols = window.prompt("列数（默认 3）：", "3");
    const r = Math.min(10, Math.max(1, parseInt(rows || "3", 10) || 3));
    const c = Math.min(10, Math.max(1, parseInt(cols || "3", 10) || 3));
    let html = "<table border=\"1\" cellpadding=\"4\" cellspacing=\"0\" style=\"border-collapse: collapse;\"><tbody>";
    for (let i = 0; i < r; i++) {
      html += "<tr>";
      for (let j = 0; j < c; j++) html += "<td>&nbsp;</td>";
      html += "</tr>";
    }
    html += "</tbody></table>";
    focusEditor();
    document.execCommand("insertHTML", false, html);
  };

  const insertEmoji = (emoji: string) => {
    focusEditor();
    document.execCommand("insertText", false, emoji);
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
      const el = editorRef.current;
      const plainBody = el?.innerText?.trim() ?? body.trim();
      const htmlBody = el?.innerHTML?.trim() ?? "";
      const attachmentPayloads = await Promise.all(
        attachments.map(async (a) => ({
          filename: a.file.name,
          contentType: a.file.type || "application/octet-stream",
          content: await fileToBase64(a.file),
        }))
      );
      const mail = await sendMail({
        to: toTrim,
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        body: plainBody,
        htmlBody: htmlBody || undefined,
        attachments: attachmentPayloads.length > 0 ? attachmentPayloads : undefined,
        requestReadReceipt: readReceipt,
      });
      if (mail) {
        onOpenChange(false);
        setTo("");
        setCc("");
        setBcc("");
        setSubject("");
        setBody("");
        if (editorRef.current) editorRef.current.innerHTML = "";
        setAttachments([]);
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
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onFileChange}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageChange}
        />
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
            <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleAddAttachment}>
              <Paperclip className="size-3.5" />
              添加附件
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={handleInsertImage}>
              <ImageIcon className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => execCmd("cut")}>
              <Scissors className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => execCmd("paste")}>
              <ClipboardPaste className="size-3.5" />
            </Button>
            <span className="w-px h-5 bg-border mx-1" />
            <select
              className="h-8 rounded border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              value={fontFamily}
              aria-label="字体"
              onChange={(e) => {
                const v = e.target.value;
                setFontFamily(v);
                if (v) execCmd("fontName", v);
              }}
            >
              {FONT_OPTIONS.map((o) => (
                <option key={o.value || "default"} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              className="h-8 rounded border border-border bg-background px-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="字号"
              value={fontSize}
              onChange={(e) => {
                const v = e.target.value;
                setFontSize(v);
                execCmd("fontSize", v);
              }}
            >
              {FONT_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("undo")} title="撤销">
              <Undo2 className="size-3.5" />
            </Button>
            <span className="w-px h-5 bg-border mx-1" />
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("bold")} title="加粗">
              <Bold className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("italic")} title="斜体">
              <Italic className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("underline")} title="下划线">
              <Underline className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("justifyLeft")} title="左对齐">
              <AlignLeft className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("justifyCenter")} title="居中">
              <AlignCenter className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("justifyRight")} title="右对齐">
              <AlignRight className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("justifyFull")} title="两端对齐">
              <AlignJustify className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("insertUnorderedList")} title="无序列表">
              <List className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("insertOrderedList")} title="有序列表">
              <ListOrdered className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("outdent")} title="减少缩进">
              <IndentDecrease className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => execCmd("indent")} title="增加缩进">
              <IndentIncrease className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleInsertLink} title="插入链接">
              <Link className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleInsertTable} title="插入表格">
              <Table className="size-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="表情">
                  <Smile className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-2">
                <div className="grid grid-cols-10 gap-1">
                  {EMOJI_LIST.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      className="text-lg hover:bg-muted rounded p-1"
                      onClick={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 ml-auto" title="更多">
                  <MoreHorizontal className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => execCmd("strikeThrough")}>
                  <Strikethrough className="size-4 mr-2" />
                  删除线
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => execCmd("removeFormat")}>
                  <RemoveFormatting className="size-4 mr-2" />
                  清除格式
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* 附件列表 */}
          {attachments.length > 0 && (
            <div className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border bg-muted/20">
              {attachments.map((a) => (
                <span
                  key={a.id}
                  className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  <span className="max-w-[140px] truncate" title={a.file.name}>{a.file.name}</span>
                  <button
                    type="button"
                    aria-label="移除附件"
                    className="p-0.5 rounded hover:bg-muted"
                    onClick={() => removeAttachment(a.id)}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 正文区域 - 富文本 */}
          <div className="flex-1 min-h-[200px] overflow-auto px-4 py-3">
            <div
              ref={editorRef}
              contentEditable
              data-placeholder="输入邮件正文…"
              onInput={handleEditorInput}
              className="min-h-[180px] w-full rounded border-0 bg-transparent px-0 py-2 text-[15px] leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground focus:ring-0 prose prose-sm max-w-none dark:prose-invert [&_table]:border [&_td]:border [&_th]:border [&_img]:max-w-full"
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
