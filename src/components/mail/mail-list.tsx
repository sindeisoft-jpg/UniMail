"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Reply,
  ReplyAll,
  Forward,
  Paperclip,
  Mail,
  Star,
  Tag,
  FolderInput,
  Download,
  Trash2,
  CheckCheck,
  FileText,
} from "lucide-react";
import { getSenderLogoUrl } from "@/lib/sender-logos";
import type { Mail as MailType } from "@/types/mail";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export interface MailListContextMenuHandlers {
  onReply: (mail: MailType) => void;
  onReplyAll: (mail: MailType) => void;
  onForward: (mail: MailType) => void;
  onForwardAsAttachment: (mail: MailType) => void;
  onMarkUnread: (mail: MailType) => void;
  onStar: (mail: MailType) => void;
  onMoveToFolder: (mail: MailType, folderId: string) => void;
  onCreateRule?: (mail: MailType) => void;
  onExport: (mail: MailType) => void;
  onDelete: (mail: MailType) => void;
  onMarkAllRead: () => void;
  /** 将当前选中的邮件标记为已读 */
  onMarkSelectedRead?: () => void;
  /** 批量：选中邮件标记为未读 */
  onBatchMarkUnread?: () => void;
  /** 批量：选中邮件标星/取消星标 */
  onBatchStar?: () => void;
  /** 批量：移动到文件夹 */
  onBatchMoveToFolder?: (folderId: string) => void;
  /** 批量：删除（移到已删除） */
  onBatchDelete?: () => void;
  /** 批量：导出 */
  onBatchExport?: () => void;
}

interface MailListProps {
  mails: MailType[];
  selectedIds: Set<string>;
  focusedId: string | null;
  onSelect: (mail: MailType, addToSelection?: boolean) => void;
  /** 全选当前列表（快捷键 Cmd/Ctrl+A） */
  onSelectAll?: () => void;
  /** 右键菜单所需回调；不传则不显示右键菜单 */
  contextMenu?: MailListContextMenuHandlers;
  /** 用于「移动到」/「标签」子菜单的文件夹列表 */
  foldersForMove?: { id: string; name: string }[];
}

export function MailList({ mails, selectedIds, focusedId, onSelect, onSelectAll, contextMenu, foldersForMove = [] }: MailListProps) {
  if (mails.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">该文件夹暂无邮件</p>
      </div>
    );
  }

  const moveOptions = [
    { id: "inbox", name: "收件箱" },
    { id: "sent", name: "已发送" },
    { id: "drafts", name: "草稿箱" },
    { id: "trash", name: "已删除" },
    { id: "spam", name: "垃圾箱" },
    ...foldersForMove,
  ].filter((f) => f.id !== "starred" && f.id !== "important");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "a") {
      e.preventDefault();
      onSelectAll?.();
    }
  };

  const listContent = (
    <div className="divide-y divide-border">
      {mails.map((mail) => {
        const isSelected = selectedIds.has(mail.id);
          const logoUrl = getSenderLogoUrl(mail.fromEmail);
          const row = (
            <button
              key={mail.id}
              type="button"
              onClick={(e) => onSelect(mail, e.metaKey || e.ctrlKey)}
              className={cn(
                "flex w-full gap-3 px-4 py-3 text-left transition-colors",
                isSelected ? "bg-accent" : "hover:bg-muted/60"
              )}
            >
              <Avatar className="size-9 shrink-0">
                {logoUrl ? (
                  <AvatarImage src={logoUrl} alt={mail.from} className="object-cover" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-xs text-primary">
                  {getInitials(mail.from)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span
                    className={cn(
                      "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-sm flex items-center gap-2",
                      !mail.read && "font-semibold text-foreground"
                    )}
                    title={mail.from}
                  >
                    {!mail.read && (
                      <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    )}
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={mail.from}>
                      {mail.from}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{mail.date}</span>
                </div>
                <p
                  title={mail.subject}
                  className={cn(
                    "min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm",
                    !mail.read ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {mail.subject}
                </p>
                <p
                  title={mail.snippet}
                  className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground"
                >
                  {mail.snippet}
                </p>
              </div>
            </button>
          );

          if (!contextMenu) return <div key={mail.id}>{row}</div>;

          const isBatch = selectedIds.size > 1 && selectedIds.has(mail.id);

          return (
            <ContextMenu key={mail.id}>
              <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
              <ContextMenuContent className="min-w-[11rem]">
                {isBatch && contextMenu.onBatchMarkUnread ? (
                  <>
                    <ContextMenuItem onSelect={() => contextMenu.onMarkSelectedRead?.()}>
                      <CheckCheck className="size-4" />
                      选中标记为已读
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => contextMenu.onBatchMarkUnread?.()}>
                      <Mail className="size-4" />
                      选中标记为未读
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => contextMenu.onBatchStar?.()}>
                      <Star className="size-4" />
                      选中标星/取消星标
                    </ContextMenuItem>
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <FolderInput className="size-4" />
                        移动到
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        {moveOptions.map((f) => (
                          <ContextMenuItem
                            key={f.id}
                            onSelect={() => contextMenu.onBatchMoveToFolder?.(f.id)}
                          >
                            {f.name}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuItem onSelect={() => contextMenu.onBatchExport?.()}>
                      <Download className="size-4" />
                      导出选中邮件…
                    </ContextMenuItem>
                    <ContextMenuItem
                      variant="destructive"
                      onSelect={() => contextMenu.onBatchDelete?.()}
                    >
                      <Trash2 className="size-4" />
                      删除选中
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => contextMenu.onMarkAllRead()}>
                      <CheckCheck className="size-4" />
                      全部标记为已读
                    </ContextMenuItem>
                  </>
                ) : (
                  <>
                    <ContextMenuItem onSelect={() => contextMenu.onReply(mail)}>
                      <Reply className="size-4" />
                      回复
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => contextMenu.onReplyAll(mail)}>
                      <ReplyAll className="size-4" />
                      回复全部
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => contextMenu.onForward(mail)}>
                      <Forward className="size-4" />
                      转发
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => contextMenu.onForwardAsAttachment(mail)}>
                      <Paperclip className="size-4" />
                      作为附件转发
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => contextMenu.onMarkUnread(mail)}>
                      <Mail className="size-4" />
                      标记为未读
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={() => contextMenu.onStar(mail)}>
                      <Star className="size-4" />
                      {mail.starred ? "取消星标" : "标记星标"}
                    </ContextMenuItem>
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <Tag className="size-4" />
                        标签
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        {moveOptions.map((f) => (
                          <ContextMenuItem
                            key={f.id}
                            onSelect={() => contextMenu.onMoveToFolder(mail, f.id)}
                          >
                            {f.name}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuSeparator />
                    {contextMenu.onCreateRule && (
                      <ContextMenuItem onSelect={() => contextMenu.onCreateRule?.(mail)}>
                        <FileText className="size-4" />
                        创建规则…
                      </ContextMenuItem>
                    )}
                    <ContextMenuSub>
                      <ContextMenuSubTrigger>
                        <FolderInput className="size-4" />
                        移动到
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent>
                        {moveOptions.map((f) => (
                          <ContextMenuItem
                            key={f.id}
                            onSelect={() => contextMenu.onMoveToFolder(mail, f.id)}
                          >
                            {f.name}
                          </ContextMenuItem>
                        ))}
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuItem onSelect={() => contextMenu.onExport(mail)}>
                      <Download className="size-4" />
                      导出邮件…
                    </ContextMenuItem>
                    <ContextMenuItem
                      variant="destructive"
                      onSelect={() => contextMenu.onDelete(mail)}
                    >
                      <Trash2 className="size-4" />
                      删除
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={() => contextMenu.onMarkAllRead()}>
                      <CheckCheck className="size-4" />
                      全部标记为已读
                    </ContextMenuItem>
                  </>
                )}
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>
  );

  const listWrapper = (
    <div
      className="h-full outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="listbox"
      aria-label="邮件列表"
      aria-multiselectable="true"
    >
      <ScrollArea className="h-full">{listContent}</ScrollArea>
    </div>
  );

  if (contextMenu && onSelectAll) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{listWrapper}</ContextMenuTrigger>
        <ContextMenuContent className="min-w-[11rem]">
          <ContextMenuItem onSelect={onSelectAll}>
            <CheckCheck className="size-4" />
            全选 (⌘A / Ctrl+A)
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => contextMenu.onMarkAllRead()}>
            <CheckCheck className="size-4" />
            全部标记为已读
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return listWrapper;
}
