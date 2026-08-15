import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../src/app.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const tmp = mkdtempSync(join(tmpdir(), "bookshelf-mcp-e2e-"));
const { app } = await buildApp({ dbPath: join(tmp, "test.db"), coverDir: join(tmp, "covers") });

const PORT = 3999;
await app.listen({ port: PORT, host: "127.0.0.1" });

const client = new Client({ name: "mcp-e2e", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${PORT}/mcp`));
await client.connect(transport);

const toolsResult = await client.listTools();
console.log("listTools 返回:", JSON.stringify(toolsResult, null, 2).slice(0, 500));
const toolList = (toolsResult as any).tools ?? [];
console.log("工具数量:", toolList.length);
console.log("工具列表:", toolList.map((t: any) => t.name).join(", "));

const added = await client.callTool({
  name: "add_book",
  arguments: { title: "活着", author: "余华", status: "read", tags: ["文学"] },
});
console.log("\nadd_book 结果:", JSON.stringify((added.content as any[])[0]?.text));

const listed = await client.callTool({ name: "list_books", arguments: {} });
const listText = (listed.content as any[]).map((c) => c.text).join("\n");
console.log("\nlist_books 结果:", listText);

const searched = await client.callTool({
  name: "search_douban",
  arguments: { q: "活着" },
});
const searchText = (searched.content as any[]).map((c) => c.text).join("\n");
console.log("\nsearch_douban 返回长度:", searchText.length);

await client.close();
await app.close();
console.log("\nMCP HTTP 链路验证完成");
process.exit(0);
