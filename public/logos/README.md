# 发件人 Logo 库

本目录存放知名企业/服务的 Logo（SVG），用于邮件列表和详情中显示发件人图标。

已内置：GitHub、Facebook、Google、Microsoft、Apple、Amazon、X (Twitter)、LinkedIn、HubSpot、Instagram、YouTube、Slack、Notion 等。

如需增加更多品牌：

1. 从 [Simple Icons](https://simpleicons.org/) 下载对应 SVG，重命名为 `品牌名.svg`（如 `figma.svg`）。
2. 在 `src/lib/sender-logos.ts` 的 `KNOWN_DOMAINS_TO_LOCAL_LOGO` 中增加域名到文件名的映射，例如：`"figma.com": "figma.svg"`。

Logo 加载失败时会自动回退为发件人首字母头像。
