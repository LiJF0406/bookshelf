import { buildApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? "127.0.0.1";

const { app } = await buildApp({ logger: true });

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`REST API: http://${HOST}:${PORT}/api`);
  app.log.info(`MCP:      http://${HOST}:${PORT}/mcp`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
