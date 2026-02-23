"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Inbox,
  Send,
  FileText,
  Star,
  Trash2,
  Bot,
  Mail,
  Settings,
  BookmarkCheck,
  ShieldAlert,
  Folder,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import * as folderApi from "@/lib/api/folders";
import type { FolderId } from "@/types/mail";

const iconMap = {
  Inbox,
  BookmarkCheck,
  Star,
  Send,
  FileText,
  Trash2,
  ShieldAlert,
  Folder,
} as const;

interface FolderItem {
  id: string;
  label: string;
  icon: keyof typeof iconMap;
}

const systemFolders: FolderItem[] = [
  { id: "inbox", label: "收件箱", icon: "Inbox" },
  { id: "important", label: "重要联系人", icon: "BookmarkCheck" },
  { id: "starred", label: "星标邮件", icon: "Star" },
  { id: "sent", label: "已发送", icon: "Send" },
  { id: "drafts", label: "草稿箱", icon: "FileText" },
  { id: "trash", label: "已删除", icon: "Trash2" },
  { id: "spam", label: "垃圾箱", icon: "ShieldAlert" },
];

interface CustomFolder {
  id: string;
  name: string;
  type: string;
}

interface SidebarProps {
  activeFolder: string;
  onFolderChange: (folder: string) => void;
  onAgentOpen?: () => void;
  folderCounts?: Partial<Record<string, number>>;
  onFoldersChange?: () => void;
  /** 用户设置的显示名称，显示在侧栏顶部（无则显示 Unimail） */
  displayName?: string;
}

export function Sidebar({
  activeFolder,
  onFolderChange,
  onAgentOpen,
  folderCounts = {},
  onFoldersChange,
  displayName,
}: SidebarProps) {
  const [myFoldersOpen, setMyFoldersOpen] = useState(true);
  const [customFolders, setCustomFolders] = useState<CustomFolder[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadFolders = useCallback(async () => {
    const list = await folderApi.getFolders();
    const custom: CustomFolder[] = list
      .filter((f) => f.type === "custom")
      .map((f) => ({
        id: f.id,
        name: f.name ?? f.label ?? "",
        type: "custom" as const,
      }));
    setCustomFolders(custom);
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleCreateFolder = async () => {
    const name = newFolderName.trim();
    if (!name || creating) return;
    setCreating(true);
    const created = await folderApi.createFolder(name);
    setCreating(false);
    setNewFolderName("");
    setShowNewFolderInput(false);
    if (created) {
      loadFolders();
      onFoldersChange?.();
    }
  };

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-sidebar-border px-4">
        <Mail className="size-6 shrink-0 text-primary" />
        <span className="min-w-0 truncate font-semibold text-sidebar-foreground" title={displayName || "Unimail"}>
          {displayName?.trim() || "Unimail"}
        </span>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {systemFolders.map((folder) => {
          const Icon = iconMap[folder.icon];
          const isActive = activeFolder === folder.id;
          const count = folderCounts[folder.id] ?? 0;
          return (
            <button
              key={folder.id}
              type="button"
              onClick={() => onFolderChange(folder.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0 opacity-80" />
              <span className="min-w-0 flex-1 truncate">{folder.label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    "shrink-0 text-xs tabular-nums",
                    isActive ? "text-sidebar-accent-foreground/80" : "text-muted-foreground"
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}

        <div className="pt-2">
          <div className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground">
            <button
              type="button"
              onClick={() => setMyFoldersOpen(!myFoldersOpen)}
              className="flex flex-1 min-w-0 items-center gap-2 rounded-lg text-left hover:bg-sidebar-accent/70"
            >
              {myFoldersOpen ? (
                <ChevronDown className="size-4 shrink-0 opacity-80" />
              ) : (
                <ChevronRight className="size-4 shrink-0 opacity-80" />
              )}
              <Folder className="size-4 shrink-0 opacity-80" />
              <span className="min-w-0 flex-1 truncate">我的文件夹</span>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setShowNewFolderInput(true); setMyFoldersOpen(true); }}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"
              title="新建文件夹"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          {myFoldersOpen && (
            <div className="mt-0.5 space-y-0.5 pl-6">
              {showNewFolderInput ? (
                <div className="flex gap-1 px-2 py-1.5">
                  <Input
                    placeholder="文件夹名称"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                    className="h-8 text-xs"
                    autoFocus
                  />
                  <Button size="sm" className="shrink-0 h-8" onClick={handleCreateFolder} disabled={creating}>
                    {creating ? "…" : "添加"}
                  </Button>
                  <Button size="sm" variant="ghost" className="shrink-0 h-8" onClick={() => { setShowNewFolderInput(false); setNewFolderName(""); }}>
                    取消
                  </Button>
                </div>
              ) : null}
              {customFolders.length === 0 && !showNewFolderInput ? (
                <p className="px-2 py-2 text-xs text-muted-foreground">暂无自定义文件夹</p>
              ) : (
                customFolders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onFolderChange(f.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      activeFolder === f.id
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/70"
                    )}
                  >
                    <Folder className="size-3.5 shrink-0 opacity-70" />
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    {folderCounts[f.id] != null && folderCounts[f.id]! > 0 && (
                      <span className="shrink-0 text-xs text-muted-foreground">{folderCounts[f.id]}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </nav>
      <div className="space-y-1 border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
          asChild
        >
          <Link href="/settings">
            <Settings className="size-4 shrink-0" />
            <span className="truncate">设置</span>
          </Link>
        </Button>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-sidebar-border bg-sidebar-accent/50 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={onAgentOpen}
              >
                <Bot className="size-4 shrink-0" />
                <span className="truncate">智能体助手</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[200px]">
              <p>AI 帮您写邮件、总结收件箱、智能回复（功能即将上线）</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}
