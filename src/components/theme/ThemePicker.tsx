"use client";

import { cn } from "@/lib/utils";
import type { ThemeId } from "@/types/theme";
import { THEME_OPTIONS } from "@/types/theme";

const themePreviewColors: Record<ThemeId, [string, string, string]> = {
  light: ["#ffffff", "#f4f4f5", "#18181b"],
  dark: ["#18181b", "#27272a", "#fafafa"],
  ocean: ["#f0f9ff", "#e0f2fe", "#0c4a6e"],
  forest: ["#f0fdf4", "#dcfce7", "#14532d"],
  sunset: ["#fff7ed", "#ffedd5", "#9a3412"],
  nord: ["#f8fafc", "#e2e8f0", "#1e293b"],
  rose: ["#fff1f2", "#ffe4e6", "#9f1239"],
  slate: ["#f8fafc", "#f1f5f9", "#334155"],
};

interface ThemePickerProps {
  value: ThemeId;
  onChange: (id: ThemeId) => void;
  className?: string;
}

export function ThemePicker({ value, onChange, className }: ThemePickerProps) {
  return (
    <div
      className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}
      role="radiogroup"
      aria-label="选择主题"
    >
      {THEME_OPTIONS.map((opt) => {
        const [bg, card, dot] = themePreviewColors[opt.id];
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex flex-col rounded-xl border-2 p-3 text-left transition-all hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected ? "border-primary bg-primary/5" : "border-border"
            )}
          >
            <div
              className="h-12 w-full rounded-lg flex items-center gap-1 p-1.5 mb-2"
              style={{ backgroundColor: bg }}
            >
              <div
                className="size-4 rounded-full shrink-0"
                style={{ backgroundColor: card }}
              />
              <div
                className="size-2 rounded-full shrink-0 opacity-80"
                style={{ backgroundColor: dot }}
              />
            </div>
            <span className="text-sm font-medium text-foreground">{opt.name}</span>
            {opt.description && (
              <span className="text-xs text-muted-foreground mt-0.5">
                {opt.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
