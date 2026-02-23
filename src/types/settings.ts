export interface EmailAccountSettings {
  /** 显示名称，如「我的 Gmail」 */
  displayName: string;
  /** 邮箱地址 */
  email: string;
  /** 登录密码或应用专用密码（仅存储，API 不返回） */
  password: string;
  /** IMAP 收信 */
  imap: {
    host: string;
    port: number;
    secure: boolean;
  };
  /** SMTP 发信 */
  smtp: {
    host: string;
    port: number;
    secure: boolean;
  };
}

/** API 返回的配置（不含密码） */
export type EmailAccountSettingsSafe = Omit<EmailAccountSettings, "password"> & {
  password?: never;
  hasPassword: boolean;
};
