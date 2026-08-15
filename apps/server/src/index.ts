import { resolve } from "node:path";
import { buildApp } from "./app.js";
import { defaultDataDir } from "@bookshelf/db";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";

// 日志保留天数，超出后自动清理更早的日志文件
const LOG_RETENTION_DAYS = Number(process.env.BOOKSHELF_LOG_DAYS ?? 14);
const logDir = process.env.BOOKSHELF_LOG_DIR ?? resolve(defaultDataDir(), "logs");

const { app } = await buildApp({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: {
      targets: [
        // 落盘：按天轮转，保留最近 N 天，自动删除旧日志
        {
          target: "pino-roll",
          options: {
            file: resolve(logDir, "app"),
            frequency: "daily",
            mkdir: true,
            dateFormat: "yyyy-MM-dd",
            extension: ".log",
            limit: { count: LOG_RETENTION_DAYS },
          },
        },
        // 同时输出到控制台，便于 docker logs 查看
        { target: "pino/file", options: { destination: 1 } },
      ],
    },
  },
});

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`REST API: http://${HOST}:${PORT}/api`);
  app.log.info(`MCP:      http://${HOST}:${PORT}/mcp`);
  app.log.info(`日志目录: ${logDir}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
