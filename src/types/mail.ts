export type FolderId =
  | "inbox"
  | "important"
  | "starred"
  | "sent"
  | "drafts"
  | "trash"
  | "spam";

/** 自定义文件夹 id 格式为 custom-xxx */
export type FolderIdOrCustom = FolderId | string;

export interface Folder {
  id: string;
  /** 显示名称（系统文件夹或 API 返回的 name 映射） */
  label?: string;
  /** API 返回的自定义文件夹名称 */
  name?: string;
  icon?: string;
  type?: "system" | "custom";
  count?: number;
  sort_order?: number;
}

/** 邮件附件（用于列表展示与下载） */
export interface MailAttachment {
  id: string;
  mailId: string;
  filename: string;
  contentType: string;
  size: number;
  /** 内嵌图片的 Content-ID（如 <xxx>），用于 HTML 中 cid 引用 */
  contentId?: string | null;
}

export interface Mail {
  id: string;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  /** HTML 正文（若有），用于富文本与内嵌图片展示 */
  htmlBody?: string | null;
  date: string;
  read: boolean;
  starred: boolean;
  /** 系统文件夹 id 或自定义文件夹 id (custom-xxx) */
  folder: string;
  /** 附件列表（由 API 按需填充） */
  attachments?: MailAttachment[];
}
