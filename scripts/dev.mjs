#!/usr/bin/env node
/**
 * 开发服务器入口：强制使用 Webpack，避免 Turbopack 在中文路径下报错。
 * 请使用 npm run dev 启动（会调用本脚本）。
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const child = spawn(
  "npx",
  ["next", "dev", "--webpack"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    shell: true,
    env: { ...process.env },
  }
);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
