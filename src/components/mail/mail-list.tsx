"use client";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface MailListProps {
  mails: MailType[];
  selectedId: string | null;
  onSelect: (mail: MailType) => void;
}

export function MailList({ mails, selectedId, onSelect }: MailListProps) {
  if (mails.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <p className="text-sm">该文件夹暂无邮件</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y divide-border">
        {mails.map((mail) => {
          const isSelected = selectedId === mail.id;
          const logoUrl = getSenderLogoUrl(mail.fromEmail);
          return (
            <button
              key={mail.id}
              type="button"
              onClick={() => onSelect(mail)}
              className={cn(
                "flex w-full gap-3 px-4 py-3 text-left transition-colors",
                isSelected
                  ? "bg-accent"
                  : "hover:bg-muted/60"
              )}
            >
              <Avatar className="size-9 shrink-0">
                {logoUrl ? (
                  <AvatarImage
                    src={logoUrl}
                    alt={mail.from}
                    className="object-cover"
                  />
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
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {mail.date}
                  </span>
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
        })}
      </div>
    </ScrollArea>
  );
}
