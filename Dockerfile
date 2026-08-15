# ---------- 构建阶段 ----------
FROM node:22-bookworm-slim AS build

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0

RUN corepack enable

# better-sqlite3 / esbuild 预构建二进制缺失时用于源码编译的后备工具
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

# 按 package.json 的 packageManager 字段安装指定版本 pnpm 并安装依赖
RUN corepack prepare pnpm@11.3.0 --activate \
    && pnpm install --frozen-lockfile

# 构建全部 workspace（shared -> db/douban -> server/web）
RUN pnpm build

# ---------- 运行阶段 ----------
FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    BOOKSHELF_DATA_DIR=/data

WORKDIR /app

COPY --from=build /app /app

VOLUME /data
EXPOSE 3000

WORKDIR /app/apps/server

CMD ["node", "dist/index.js"]
