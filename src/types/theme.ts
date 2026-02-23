/** 主题 ID，与 globals.css 中 [data-theme="..."] 保持一致 */
export type ThemeId =
  | "light"
  | "dark"
  | "ocean"
  | "forest"
  | "sunset"
  | "nord"
  | "rose"
  | "slate";

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description?: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: "light", name: "浅色", description: "默认浅色" },
  { id: "dark", name: "深色", description: "护眼深色" },
  { id: "ocean", name: "海洋", description: "青蓝海洋" },
  { id: "forest", name: "森林", description: "自然绿意" },
  { id: "sunset", name: "日落", description: "暖橙日落" },
  { id: "nord", name: "北极", description: "Nord 冷色" },
  { id: "rose", name: "玫瑰", description: "柔和玫瑰" },
  { id: "slate", name: "石板", description: "冷灰石板" },
];

export const THEME_STORAGE_KEY = "unimail-theme";
