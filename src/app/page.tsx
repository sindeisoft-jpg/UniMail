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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [agentPanelOpen, setAgentPanelOpen] = useState(false);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [folders, setFolders] = useState<{ id: string; name: string; type?: string }[]>([]);
  const [listPanelWidth, setListPanelWidth] = useState(LIST_PANEL_DEFAULT);
  const [userEmail, setUserEmail] = useState<string>("");
  const [userDisplayName, setUserDisplayName] = useState<string>("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeInitialTo, setComposeInitialTo] = useState("");
  const [composeInitialSubject, setComposeInitialSubject] = useState("");
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(LIST_PANEL_DEFAULT);

  const selectedMail = mails.find((m) => m.id === selectedId) ?? null;

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

  const handleSelectMail = useCallback(
    async (mail: Mail) => {
      setSelectedId(mail.id);
      if (!mail.read) {
        await mailApi.markAsRead(mail.id);
        setMails((prev) =>
          prev.map((m) => (m.id === mail.id ? { ...m, read: true } : m))
        );
      }
    },
    []
  );

  const handleStar = useCallback(async (mail: Mail) => {
    const updated = await mailApi.setStarred(mail.id, !mail.starred);
    if (updated) {
      setMails((prev) =>
        prev.map((m) =>
          m.id === mail.id ? { ...m, starred: updated.starred } : m
        )
      );
    }
  }, []);

  const handleDelete = useCallback(async (mail: Mail) => {
    const updated = await mailApi.moveToTrash(mail.id);
    if (updated) {
      setMails((prev) => prev.filter((m) => m.id !== mail.id));
      if (selectedId === mail.id) setSelectedId(null);
      loadCounts();
    }
  }, [selectedId, loadCounts]);

  const handleMoveToSpam = useCallback(async (mail: Mail) => {
    const updated = await mailApi.moveToSpam(mail.id);
    if (updated) {
      setMails((prev) => prev.filter((m) => m.id !== mail.id));
      if (selectedId === mail.id) setSelectedId(null);
      loadCounts();
    }
  }, [selectedId, loadCounts]);

  const handleMoveToFolder = useCallback(async (mail: Mail, folderId: string) => {
    const updated = await mailApi.moveToFolder(mail.id, folderId);
    if (updated) {
      setMails((prev) => prev.filter((m) => m.id !== mail.id));
      if (selectedId === mail.id) setSelectedId(null);
      loadCounts();
    }
  }, [selectedId, loadCounts]);

  const handleReply = useCallback((mail: Mail) => {
    const to = mail.fromEmail || mail.from;
    const subj = mail.subject.startsWith("Re:") ? mail.subject : `Re: ${mail.subject}`;
    setComposeInitialTo(to);
    setComposeInitialSubject(subj);
    setComposeOpen(true);
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
              setComposeInitialSubject("");
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
            setSelectedId(null);
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
              selectedId={selectedId}
              onSelect={handleSelectMail}
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
            mail={selectedMail}
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
          initialSubject={composeInitialSubject}
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
