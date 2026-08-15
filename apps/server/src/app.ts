import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createDb, migrate, defaultCoverDir, defaultDbPath } from "@bookshelf/db";
import { createService } from "./service.js";
import { registerRoutes } from "./routes.js";
import { createMcpServer } from "./mcp.js";

export interface BuildAppOptions {
  dbPath?: string;
  coverDir?: string;
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const dbPath = options.dbPath ?? defaultDbPath();
  const coverDir = options.coverDir ?? defaultCoverDir();

  const { db, sqlite } = createDb(dbPath);
  migrate(sqlite);

  const service = createService({ db, coverDir });

  const app = Fastify({ logger: options.logger ?? false });
  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin || origin.startsWith("http://localhost") || origin.startsWith("http://127.0.0.1")) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
  });
  await app.register(fastifyStatic, { root: coverDir, prefix: "/covers/" });

  const webDist = resolve(fileURLToPath(new URL("../../web/dist", import.meta.url)));
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, { root: webDist, prefix: "/", decorateReply: false });
  }

  registerRoutes(app, service);

  const mcpServer = createMcpServer(service);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  await mcpServer.connect(transport);

  app.route({
    method: ["GET", "POST", "DELETE"],
    url: "/mcp",
    handler: async (request, reply) => {
      reply.hijack();
      try {
        await transport.handleRequest(request.raw, reply.raw, request.body);
      } catch (err) {
        app.log.error(err, "MCP 请求处理失败");
        if (!reply.raw.headersSent) {
          reply.raw.writeHead(500, { "Content-Type": "application/json" });
          reply.raw.end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: { code: -32603, message: "Internal error" },
              id: null,
            }),
          );
        }
      }
    },
  });

  return { app, mcpServer, transport, service };
}
