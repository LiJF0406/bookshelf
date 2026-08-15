# AGENTS.md

个人书架应用：书籍管理 + 豆瓣元数据抓取 + MCP。pnpm monorepo，无 README、无 lint/测试框架。

## 包结构与职责

| 包 | 职责 |
|---|---|
| `apps/web` | React 18 + Vite 前端（纯静态，构建产物 `dist/`） |
| `apps/server` | Fastify：REST API + MCP + 静态服务，单进程 |
| `packages/shared` | 纯类型/常量（无运行时依赖） |
| `packages/db` | better-sqlite3 + Drizzle，迁移内联在代码里 |
| `packages/douban` | cheerio 抓取豆瓣元数据 |

## 常用命令

- `pnpm dev` — 并行启动 server(`tsx watch`，:3000) 和 web(`vite`，:5173，proxy `/api`、`/covers` → 3000)
- `pnpm build` / `pnpm typecheck` — 递归全包（自动拓扑排序）
- 单包：`pnpm --filter @bookshelf/server build`（其余包同理）
- MCP e2e：`pnpm --filter @bookshelf/server mcp:test`（自起临时服务，不依赖外部 server）

## 关键陷阱（务必遵守）

1. **ESM + `module: NodeNext`**：所有相对 import 必须带 `.js` 扩展名（`import { x } from "./app.js"`），不能省略。
2. **`strict` + `noUnusedLocals` + `noUnusedParameters`**：未使用的 import/变量会让 `typecheck` 失败。
3. **workspace 包类型来自各自的 `dist/*.d.ts`**（通过 node_modules 符号链接解析）。**修改 `packages/shared` 源码后，必须先 `pnpm --filter @bookshelf/shared build`，否则依赖它的 server/web 的 typecheck/build 看不到新导出。**
4. **数据库迁移不是 drizzle-kit**：schema 与迁移都在 `packages/db/src/index.ts` 的 `migrate()` 里，用 `sqlite.exec` 手写（含 `ALTER TABLE ... ADD COLUMN pinned_at` 兼容旧库）。新增字段需同时改这里并补 ALTER 逻辑。
5. **数据目录**由 `BOOKSHELF_DATA_DIR` 控制（默认 workspace 根 `data/`），内含 `bookshelf.db`、`covers/`、`logs/`。
6. **server 通过硬编码路径 `../../web/dist` 服务前端**（`apps/server/src/app.ts`）。因此运行/部署必须同时构建 server 和 web，且保持 monorepo 目录结构。

## 架构要点

- 单进程 Fastify：`/api/*`（REST）、`/mcp`（StreamableHTTPServerTransport，GET/POST/DELETE）、`/covers/*`（封面静态）、`/`（前端静态）。
- MCP 工具定义在 `apps/server/src/mcp.ts`（共 10 个：豆瓣搜索、增删改查、标签）。`updatePin` 与批量操作只走 REST，未暴露为 MCP 工具。
- 日志：`pino-roll` 按天轮转写 `<data>/logs/app.YYYY-MM-DD.N.log`，保留 `BOOKSHELF_LOG_DAYS`（默认 14）天，同时输出 stdout。
- 安全约束（勿破坏）：封面下载仅允许 `doubanio.com` 域名；CORS 仅放行 `localhost`/`127.0.0.1`。

## 部署（Docker）

- 构建并推送镜像（交叉编译到 amd64）：
  `docker buildx build --platform linux/amd64 -t lijf0406/bookshelf:latest . --push`
- 服务器端：`docker compose pull && docker compose up -d`。compose 用远程镜像 + bind mount `./bookshelf-data:/data` + external 网络 `web-network`。
- `pnpm-workspace.yaml` 的 `allowBuilds`（better-sqlite3 / esbuild）必须为 `true`，否则 Docker 内 `pnpm install` 会以 `ERR_PNPM_IGNORED_BUILDS` 拒绝构建原生依赖。
