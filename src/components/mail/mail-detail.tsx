"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSenderLogoUrl } from "@/lib/sender-logos";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Reply, Star, Trash2, MoreHorizontal, ShieldAlert, FolderInput, Paperclip, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHtml, rewriteCidToInlineUrl } from "@/lib/sanitize-html";
import { stripLeadingHeaders } from "@/lib/strip-email-headers";
import type { Mail, MailAttachment } from "@/types/mail";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface MailDetailProps {
  mail: Mail | null;
  allFolders?: { id: string; name: string }[];
  systemFolderLabels?: Record<string, string>;
  onReply?: (mail: Mail) => void;
  onStar?: (mail: Mail) => void;
  onDelete?: (mail: Mail) => void;
  onMoveToSpam?: (mail: Mail) => void;
  onMoveToFolder?: (mail: Mail, folderId: string) => void;
}

export function MailDetail({
  mail,
  allFolders = [],
  systemFolderLabels = {},
  onReply,
  onStar,
  onDelete,
  onMoveToSpam,
  onMoveToFolder,
}: MailDetailProps) {
  if (!mail) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-muted/20 text-muted-foreground">
        <p className="text-sm">在左侧选择一封邮件查看</p>
      </div>
    );
  }

  const moveOptions = [
    { id: "inbox", label: systemFolderLabels.inbox ?? "收件箱" },
    { id: "sent", label: systemFolderLabels.sent ?? "已发送" },
    { id: "drafts", label: systemFolderLabels.drafts ?? "草稿箱" },
    { id: "trash", label: systemFolderLabels.trash ?? "已删除" },
    { id: "spam", label: systemFolderLabels.spam ?? "垃圾箱" },
    ...allFolders.map((f) => ({ id: f.id, label: f.name })),
  ].filter((opt) => opt.id !== mail.folder);

  const senderLogoUrl = getSenderLogoUrl(mail.fromEmail);

  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 gap-3 flex">
            <Avatar className="size-10 shrink-0">
              {senderLogoUrl ? (
                <AvatarImage
                  src={senderLogoUrl}
                  alt={mail.from}
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-sm text-primary">
                {getInitials(mail.from)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground">{mail.from}</span>
                <span className="text-sm text-muted-foreground">
                  &lt;{mail.fromEmail}&gt;
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">发给：{mail.to}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onStar?.(mail)}
              className={cn(mail.starred && "text-amber-500")}
            >
              <Star
                className={cn("size-4", mail.starred && "fill-current")}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onReply?.(mail)}
            >
              <Reply className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete?.(mail)}
            >
              <Trash2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onMoveToSpam?.(mail)}
              title="移至垃圾箱"
            >
              <ShieldAlert className="size-4" />
            </Button>
            {onMoveToFolder && moveOptions.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <FolderInput className="size-4" />
                      <span>移动到</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      {moveOptions.map((opt) => (
                        <DropdownMenuItem
                          key={opt.id}
                          onClick={() => onMoveToFolder(mail, opt.id)}
                        >
                          {opt.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon-sm">
                <MoreHorizontal className="size-4" />
              </Button>
            )}
          </div>
        </div>
        <h1 className="mt-3 text-lg font-semibold text-foreground">
          {mail.subject}
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">{mail.date}</p>
      </header>
      <ScrollArea className="flex-1">
        <div className="px-6 py-5">
          {mail.htmlBody ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert break-words text-foreground [&_img]:max-w-full [&_a]:text-primary [&_a]:underline"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(rewriteCidToInlineUrl(stripLeadingHeaders(mail.htmlBody), mail.id)),
              }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {stripLeadingHeaders(mail.body)}
            </div>
          )}
        </div>
        {mail.attachments && mail.attachments.length > 0 ? (
          <div className="border-t border-border px-6 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
              <Paperclip className="size-4" />
              <span>附件（{mail.attachments.length}）</span>
            </div>
            <ul className="space-y-2">
              {mail.attachments.map((att) => (
                <AttachmentRow key={att.id} mailId={mail.id} att={att} />
              ))}
            </ul>
          </div>
        ) : null}
      </ScrollArea>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentRow({ mailId, att }: { mailId: string; att: MailAttachment }) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const href = `/api/mails/${encodeURIComponent(mailId)}/attachments/${encodeURIComponent(att.id)}`;

  const handleDownload = async () => {
    setError(null);
    setDownloading(true);
    try {
      const res = await fetch(href, { method: "GET" });
      if (!res.ok) {
        const text = await res.text();
        let msg = "下载失败";
        try {
          const j = JSON.parse(text) as { error?: string };
          if (j?.error) msg = j.error;
        } catch {
          if (text) msg = text.slice(0, 80);
        }
        setError(msg);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.filename || "attachment";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误，无法下载附件");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
      <span className="min-w-0 truncate text-foreground" title={att.filename}>
        {att.filename}
      </span>
      <span className="shrink-0 text-muted-foreground">{formatSize(att.size)}</span>
      <div className="shrink-0 flex flex-col items-end gap-0.5">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleDownload}
          disabled={downloading}
        >
          <Download className="size-4" />
          {downloading ? "下载中…" : "下载"}
        </Button>
        {error && (
          <span className="text-xs text-destructive" title={error}>
            {error.length > 20 ? `${error.slice(0, 20)}…` : error}
          </span>
        )}
      </div>
    </li>
  );
}
