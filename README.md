# Bookshelf

个人书架应用：书籍管理 + 豆瓣元数据抓取 + MCP 服务。

- 前端：React 18 + Vite（纯静态）
- 后端：Fastify 单进程（REST API + MCP + 静态托管）
- 数据库：better-sqlite3 + Drizzle（迁移内联在代码中）
- 元数据：cheerio 抓取豆瓣读书

## 功能

- 书籍增删改查、阅读状态（想读/未读/在读/已读）、标签分类、置顶
- 豆瓣元数据搜索与一键导入（封面、作者、简介、ISBN、评分等）
- 书架筛选（按状态 / 标签 / 关键词）
- MCP 服务：10 个工具（豆瓣搜索、增删改查、标签），可供 Claude / Cursor 等客户端调用

## 快速开始

```bash
pnpm install
pnpm dev        # 并行启动 server(:3000) 和 web(:5173)
```

- 前端：http://localhost:5173（`/api`、`/covers` 代理到 3000）
- 后端：http://localhost:3000（REST `/api/*`、MCP `/mcp`、封面 `/covers/*`）

## 常用命令

```bash
pnpm build      # 构建全部 workspace
pnpm typecheck  # 全包类型检查
pnpm --filter @bookshelf/server mcp:test   # MCP 端到端测试
```

## MCP 接入

将以下配置加入 MCP 客户端（如 Claude Desktop / Cursor）：

```json
{
  "mcpServers": {
    "bookshelf": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

## 部署（Docker）

```bash
# 构建并推送镜像（交叉编译到 amd64）
docker buildx build --platform linux/amd64 -t lijf0406/bookshelf:latest . --push

# 服务器端（需预建 external 网络 web-network）
docker compose pull && docker compose up -d
```

数据目录由 `BOOKSHELF_DATA_DIR` 控制（默认 `data/`），内含 `bookshelf.db`、`covers/`、`logs/`。日志按天轮转，保留天数由 `BOOKSHELF_LOG_DAYS` 控制（默认 14）。

## 项目结构

| 包 | 职责 |
|---|---|
| `apps/web` | React 18 + Vite 前端 |
| `apps/server` | Fastify：REST API + MCP + 静态服务 |
| `packages/shared` | 纯类型 / 常量 |
| `packages/db` | better-sqlite3 + Drizzle，迁移内联 |
| `packages/douban` | cheerio 抓取豆瓣元数据 |

## 协议

[MIT](./LICENSE)
