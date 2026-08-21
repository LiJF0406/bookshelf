import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createDb, migrate, defaultCoverDir, defaultDbPath } from "@bookshelf/db";
import { createService } from "./service.js";
import { registerRoutes } from "./routes.js";
import { createMcpServer } from "./mcp.js";

export interface BuildAppOptions {
  dbPath?: string;
  coverDir?: string;
  logger?: FastifyServerOptions["logger"];
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

  // 多会话模式：每个 MCP 会话独立 transport（复用 createMcpServer 工厂），
  // 按 mcp-session-id 维护，DELETE 关闭会话时从 Map 移除
  const transports = new Map<string, StreamableHTTPServerTransport>();

  // 独立 scope 注册 /mcp：允许空 JSON body——
  // SDK 关闭会话的 DELETE 请求不带 body，Fastify 默认 parser 会对
  // 带 JSON content-type 的空 body 报 FST_ERR_CTP_EMPTY_JSON_BODY
  await app.register(async (scope) => {
    scope.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => {
      const raw = Buffer.isBuffer(body) ? body.toString("utf8") : body;
      if (raw.trim() === "") {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(raw));
      } catch (err) {
        done(err as Error, undefined);
      }
    });

    scope.route({
      method: ["GET", "POST", "DELETE"],
      url: "/mcp",
      handler: async (request, reply) => {
        reply.hijack();
        try {
          const sessionId = request.headers["mcp-session-id"] as string | undefined;

          if (request.method === "DELETE") {
            // SDK 的 handleDeleteRequest 内部会 close()，这里只需找到对应
            // transport 并转交，完成后移除引用
            const transport = sessionId ? transports.get(sessionId) : undefined;
            if (!sessionId || !transport) {
              reply.raw.writeHead(404, { "Content-Type": "application/json" });
              reply.raw.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  error: { code: -32001, message: "Session not found" },
                  id: null,
                }),
              );
              return;
            }
            await transport.handleRequest(request.raw, reply.raw, undefined);
            transports.delete(sessionId);
            return;
          }

          let transport: StreamableHTTPServerTransport | undefined;
          if (sessionId) {
            // 已建立会话：按 session-id 复用对应 transport
            transport = transports.get(sessionId);
            if (!transport) {
              reply.raw.writeHead(404, { "Content-Type": "application/json" });
              reply.raw.end(
                JSON.stringify({
                  jsonrpc: "2.0",
                  error: { code: -32001, message: "Session not found" },
                  id: null,
                }),
              );
              return;
            }
          } else if (request.method === "POST" && isInitializeRequest(request.body)) {
            // 新会话初始化：创建独立 transport，SDK 生成 sessionId 后登记进 Map
            const mcpServer = createMcpServer(service);
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (id) => {
                transports.set(id, transport!);
              },
            });
            await mcpServer.connect(transport);
          } else {
            // 无 session-id 的非 initialize 请求（含未续接 session 的 GET stream）
            reply.raw.writeHead(400, { "Content-Type": "application/json" });
            reply.raw.end(
              JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32600, message: "Bad Request: Mcp-Session-Id header is required" },
                id: null,
              }),
            );
            return;
          }

          await transport!.handleRequest(request.raw, reply.raw, request.body);
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
  });

  return { app, service };
}
