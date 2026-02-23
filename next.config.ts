import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 使用 Webpack 替代 Turbopack，避免项目路径含中文时的 Turbopack 报错
  webpack: (config) => config,
  // 将 better-sqlite3 排除出服务端打包，避免 ESM/CommonJS 混用导致 "import/export outside module" 报错
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
