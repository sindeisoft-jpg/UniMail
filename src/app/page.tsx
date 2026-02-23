"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as mailApi from "@/lib/api/mail";
import * as folderApi from "@/lib/api/folders";
import { Sidebar } from "@/components/mail/sidebar";
import { MailList } from "@/components/mail/mail-list";
import { MailDetail } from "@/components/mail/mail-detail";
import { ComposeModal } from "@/components/mail/compose-modal";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { PenSquare } from "lucide-react";
import type { Mail } from "@/types/mail";

const LIST_PANEL_MIN = 240;
const LIST_PANEL_MAX = 560;
const LIST_PANEL_DEFAULT = 320;

function HomeContent() {
  const searchParams = useSearchParams();
  const [activeFolder, setActiveFolder] = useState<string>("inbox");
  const [mails, setMails] = useState<Mail[]>([]);
  /** 当前选中的邮件 id 列表，支持多选 */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  /** 用于详情面板展示的邮件 id（多选时以最后点击/焦点为准） */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [folders, setFolders] = useState<{ id: string; name: string; type?: string }[]>([]);
  const [listPanelWidth, setListPanelWidth] = useState(LIST_PANEL_DEFAULT);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userDisplayName, setUserDisplayName] = useState<string>("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitialTo, setComposeInitialTo] = useState("");
  const [composeInitialCc, setComposeInitialCc] = useState("");
  const [composeInitialSubject, setComposeInitialSubject] = useState("");
  const [composeInitialBody, setComposeInitialBody] = useState("");
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(LIST_PANEL_DEFAULT);

  /** 详情面板展示的完整邮件（含附件），由 GET /api/mails/[id] 拉取 */
  const [detailMail, setDetailMail] = useState<Mail | null>(null);
  const selectedMails = mails.filter((m) => selectedIds.has(m.id));

  const loadMails = useCallback(async (folder: string) => {
    setLoading(true);
    const list = await mailApi.getMails(folder);
    setMails(list);
    setLoading(false);
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/mails/counts");
      if (res.ok) {
        const data = await res.json();
        setFolderCounts(data);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadFolders = useCallback(async () => {
    const list = await folderApi.getFolders();
    setFolders(
      list.map((f) => ({ id: f.id, name: f.name ?? f.label ?? "", type: f.type }))
    );
  }, []);

  useEffect(() => {
    const folderParam = searchParams.get("folder");
    const valid = ["inbox", "important", "starred", "sent", "drafts", "trash", "spam"];
    if (folderParam && (valid.includes(folderParam) || folderParam.startsWith("custom-"))) {
      setActiveFolder(folderParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadMails(activeFolder);
  }, [activeFolder, loadMails]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts, activeFolder]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.email) setUserEmail(String(data.email).trim());
        if (data?.displayName != null) setUserDisplayName(String(data.displayName).trim());
      })
      .catch(() => {});
  }, []);

  /** 打开详情时拉取完整邮件（含附件），列表接口不返回附件 */
  useEffect(() => {
    if (!focusedId) {
      setDetailMail(null);
      return;
    }
    let cancelled = false;
    mailApi.getMail(focusedId).then((full) => {
      if (!cancelled && full) setDetailMail(full);
    });
    return () => {
      cancelled = true;
    };
  }, [focusedId]);

  const handleSelectMail = useCallback(
    async (mail: Mail, addToSelection?: boolean) => {
      if (addToSelection) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(mail.id)) next.delete(mail.id);
          else next.add(mail.id);
          return next;
        });
      } else {
        setSelectedIds(new Set([mail.id]));
      }
      setFocusedId(mail.id);
      if (!mail.read) {
        await mailApi.markAsRead(mail.id);
        setMails((prev) =>
          prev.map((m) => (m.id === mail.id ? { ...m, read: true } : m))
        );
      }
    },
    []
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(mails.map((m) => m.id)));
    if (mails.length > 0 && !focusedId) setFocusedId(mails[0].id);
  }, [mails, focusedId]);

  const handleStar = useCallback(async (mail: Mail) => {
    const updated = await mailApi.setStarred(mail.id, !mail.starred);
    if (updated) {
      setMails((prev) =>
        prev.map((m) =>
          m.id === mail.id ? { ...m, starred: updated.starred } : m
        )
      );
      setDetailMail((prev) =>
        prev?.id === mail.id ? { ...prev, starred: updated.starred } : prev
      );
    }
  }, []);

  const handleDelete = useCallback(async (mail: Mail) => {
    const updated = await mailApi.moveToTrash(mail.id);
    if (updated) {
      setMails((prev) => prev.filter((m) => m.id !== mail.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(mail.id);
        return next;
      });
      if (focusedId === mail.id) setFocusedId(null);
      loadCounts();
    }
  }, [focusedId, loadCounts]);

  const handleMoveToSpam = useCallback(async (mail: Mail) => {
    const updated = await mailApi.moveToSpam(mail.id);
    if (updated) {
      setMails((prev) => prev.filter((m) => m.id !== mail.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(mail.id);
        return next;
      });
      if (focusedId === mail.id) setFocusedId(null);
      loadCounts();
    }
  }, [focusedId, loadCounts]);

  const handleMoveToFolder = useCallback(async (mail: Mail, folderId: string) => {
    const updated = await mailApi.moveToFolder(mail.id, folderId);
    if (updated) {
      setMails((prev) => prev.filter((m) => m.id !== mail.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(mail.id);
        return next;
      });
      if (focusedId === mail.id) setFocusedId(null);
      loadCounts();
    }
  }, [focusedId, loadCounts]);

  const handleReply = useCallback((mail: Mail) => {
    const to = mail.fromEmail || mail.from;
    const subj = mail.subject.startsWith("Re:") ? mail.subject : `Re: ${mail.subject}`;
    setComposeInitialTo(to);
    setComposeInitialCc("");
    setComposeInitialSubject(subj);
    setComposeInitialBody("");
    setComposeOpen(true);
  }, []);

  const handleReplyAll = useCallback((mail: Mail) => {
    const to = mail.fromEmail || mail.from;
    const cc = mail.to || "";
    const subj = mail.subject.startsWith("Re:") ? mail.subject : `Re: ${mail.subject}`;
    setComposeInitialTo(to);
    setComposeInitialCc(cc);
    setComposeInitialSubject(subj);
    setComposeInitialBody("");
    setComposeOpen(true);
  }, []);

  const handleForward = useCallback(async (mail: Mail) => {
    const subj = mail.subject.startsWith("Fwd:") ? mail.subject : `Fwd: ${mail.subject}`;
    setComposeInitialTo("");
    setComposeInitialCc("");
    setComposeInitialSubject(subj);
    let body = "";
    try {
      const full = await mailApi.getMail(mail.id);
      if (full?.body) {
        body = `\n\n---------- 转发邮件 ----------\n发件人: ${full.from} <${full.fromEmail}>\n日期: ${full.date}\n主题: ${full.subject}\n收件人: ${full.to}\n\n${full.body}`;
      } else {
        body = `\n\n---------- 转发邮件 ----------\n发件人: ${mail.from}\n日期: ${mail.date}\n主题: ${mail.subject}\n\n${mail.snippet}`;
      }
    } catch {
      body = `\n\n---------- 转发邮件 ----------\n发件人: ${mail.from}\n日期: ${mail.date}\n主题: ${mail.subject}\n\n${mail.snippet}`;
    }
    setComposeInitialBody(body);
    setComposeOpen(true);
  }, []);

  const handleForwardAsAttachment = useCallback((mail: Mail) => {
    mailApi.exportMailAsEml(mail.id);
    setComposeInitialTo("");
    setComposeInitialCc("");
    setComposeInitialSubject(mail.subject.startsWith("Fwd:") ? mail.subject : `Fwd: ${mail.subject}`);
    setComposeInitialBody("");
    setComposeOpen(true);
  }, []);

  const handleMarkUnread = useCallback(async (mail: Mail) => {
    const updated = await mailApi.markAsUnread(mail.id);
    if (updated) {
      setMails((prev) =>
        prev.map((m) => (m.id === mail.id ? { ...m, read: false } : m))
      );
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    for (const mail of mails) {
      if (!mail.read) await mailApi.markAsRead(mail.id);
    }
    setMails((prev) => prev.map((m) => ({ ...m, read: true })));
    loadCounts();
  }, [mails, loadCounts]);

  /** 将当前选中的邮件批量标记为已读 */
  const handleMarkSelectedRead = useCallback(async () => {
    for (const id of selectedIds) {
      await mailApi.markAsRead(id);
    }
    setMails((prev) =>
      prev.map((m) => (selectedIds.has(m.id) ? { ...m, read: true } : m))
    );
    loadCounts();
  }, [selectedIds, loadCounts]);

  /** 批量操作：对选中的多封邮件执行同一操作 */
  const handleBatchMarkUnread = useCallback(async () => {
    for (const id of selectedIds) {
      await mailApi.markAsUnread(id);
    }
    setMails((prev) =>
      prev.map((m) => (selectedIds.has(m.id) ? { ...m, read: false } : m))
    );
  }, [selectedIds]);

  const handleBatchStar = useCallback(async () => {
    const selected = mails.filter((m) => selectedIds.has(m.id));
    const toStar = selected.some((m) => !m.starred);
    for (const mail of selected) {
      if (mail.starred !== toStar) {
        const updated = await mailApi.setStarred(mail.id, toStar);
        if (updated) setMails((prev) => prev.map((m) => (m.id === mail.id ? { ...m, starred: updated.starred } : m)));
      }
    }
  }, [mails, selectedIds]);

  const handleBatchMoveToFolder = useCallback(
    async (folderId: string) => {
      for (const id of selectedIds) {
        const updated = await mailApi.moveToFolder(id, folderId);
        if (updated) setMails((prev) => prev.filter((m) => m.id !== id));
      }
      setSelectedIds(new Set());
      setFocusedId(null);
      loadCounts();
    },
    [selectedIds, loadCounts]
  );

  const handleBatchDelete = useCallback(async () => {
    for (const id of selectedIds) {
      await mailApi.moveToTrash(id);
    }
    setMails((prev) => prev.filter((m) => !selectedIds.has(m.id)));
    setSelectedIds(new Set());
    setFocusedId(null);
    loadCounts();
  }, [selectedIds, loadCounts]);

  const handleBatchExport = useCallback(async () => {
    for (const id of selectedIds) {
      await mailApi.exportMailAsEml(id);
    }
  }, [selectedIds]);

  const handleCreateRule = useCallback((_mail: Mail) => {
    alert("创建规则功能即将上线");
  }, []);

  const handleExport = useCallback((mail: Mail) => {
    mailApi.exportMailAsEml(mail.id);
  }, []);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = listPanelWidth;
  }, [listPanelWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = e.clientX - startXRef.current;
      setListPanelWidth((w) => {
        const next = startWidthRef.current + delta;
        return Math.min(LIST_PANEL_MAX, Math.max(LIST_PANEL_MIN, next));
      });
    };
    const onUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const folderLabel =
    activeFolder === "inbox"
      ? "收件箱"
      : activeFolder === "important"
        ? "重要联系人"
        : activeFolder === "starred"
          ? "星标邮件"
          : activeFolder === "sent"
            ? "已发送"
            : activeFolder === "drafts"
              ? "草稿箱"
              : activeFolder === "trash"
                ? "已删除"
                : activeFolder === "spam"
                  ? "垃圾箱"
                  : folders.find((f) => f.id === activeFolder)?.name ?? "邮件";

  const customFoldersForMove = folders.filter((f) => f.type === "custom" || f.id.startsWith("custom-"));

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 gap-2">
        <h1 className="min-w-0 truncate text-lg font-semibold text-foreground" title={userEmail || "Unimail"}>
          {userEmail || "Unimail"}
        </h1>
        <div className="flex items-center gap-1 shrink-0">
          <ThemeSwitcher />
          <Button
            className="gap-2"
            onClick={() => {
              setComposeInitialTo("");
              setComposeInitialCc("");
              setComposeInitialSubject("");
              setComposeInitialBody("");
              setComposeOpen(true);
            }}
          >
            <PenSquare className="size-4" />
            写邮件
          </Button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <Sidebar
          activeFolder={activeFolder}
          folderCounts={folderCounts}
          displayName={userDisplayName}
          onFolderChange={(folder) => {
            setActiveFolder(folder);
            setSelectedIds(new Set());
            setFocusedId(null);
          }}
          onAgentOpen={() => setAgentPanelOpen(true)}
          onFoldersChange={loadFolders}
        />
        <section
          className="flex shrink-0 flex-col border-r border-border bg-muted/20"
          style={{ width: listPanelWidth }}
        >
          <div className="shrink-0 border-b border-border px-3 py-2">
            <p className="text-sm font-medium text-foreground">{folderLabel}</p>
          </div>
          {loading ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              加载中…
            </div>
          ) : (
            <MailList
              mails={mails}
              selectedIds={selectedIds}
              focusedId={focusedId}
              onSelect={handleSelectMail}
              onSelectAll={handleSelectAll}
              contextMenu={{
                onReply: handleReply,
                onReplyAll: handleReplyAll,
                onForward: handleForward,
                onForwardAsAttachment: handleForwardAsAttachment,
                onMarkUnread: handleMarkUnread,
                onStar: handleStar,
                onMoveToFolder: handleMoveToFolder,
                onCreateRule: handleCreateRule,
                onExport: handleExport,
                onDelete: handleDelete,
                onMarkAllRead: handleMarkAllRead,
                onMarkSelectedRead: handleMarkSelectedRead,
                onBatchMarkUnread: handleBatchMarkUnread,
                onBatchStar: handleBatchStar,
                onBatchMoveToFolder: handleBatchMoveToFolder,
                onBatchDelete: handleBatchDelete,
                onBatchExport: handleBatchExport,
              }}
              foldersForMove={customFoldersForMove}
            />
          )}
        </section>
        <div
          role="separator"
          aria-orientation="vertical"
          className="group flex w-1 shrink-0 cursor-col-resize select-none flex-shrink-0 items-stretch justify-center py-0"
          onMouseDown={handleDividerMouseDown}
          title="拖拽调整宽度"
        >
          <div className="w-px bg-border transition-colors group-hover:bg-primary/30 group-active:bg-primary/40" />
        </div>
        <section className="flex min-w-0 flex-1 flex-col">
          <MailDetail
            mail={detailMail}
            allFolders={customFoldersForMove}
            systemFolderLabels={{ inbox: "收件箱", sent: "已发送", drafts: "草稿箱", trash: "已删除", spam: "垃圾箱" }}
            onReply={handleReply}
            onStar={handleStar}
            onDelete={handleDelete}
            onMoveToSpam={handleMoveToSpam}
            onMoveToFolder={handleMoveToFolder}
          />
        </section>
        <ComposeModal
          open={composeOpen}
          onOpenChange={setComposeOpen}
          initialTo={composeInitialTo}
          initialCc={composeInitialCc}
          initialSubject={composeInitialSubject}
          initialBody={composeInitialBody}
          onSent={loadCounts}
        />
        {agentPanelOpen && (
          <aside className="w-80 shrink-0 border-l border-border bg-sidebar p-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-sidebar-foreground">智能体助手</h2>
              <button
                type="button"
                onClick={() => setAgentPanelOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              智能体功能即将上线：写邮件、总结收件箱、智能回复等。
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">加载中…</p>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
