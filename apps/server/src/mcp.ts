import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BOOK_STATUSES } from "@bookshelf/shared";
import type { Service } from "./routes.js";

const statusEnum = z.enum([...BOOK_STATUSES]);

function text(data: unknown): { content: Array<{ type: "text"; text: string }> } {
  const body = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: "text", text: body }] };
}

export function createMcpServer(service: Service): McpServer {
  const server = new McpServer({ name: "bookshelf", version: "1.0.0" });

  server.registerTool(
    "search_douban",
    {
      description: "从豆瓣读书搜索书籍元数据。按 ISBN、书名关键词或豆瓣链接搜索，返回候选书籍（含封面、作者、简介等元数据）。",
      inputSchema: {
        isbn: z.string().optional().describe("ISBN 号，精确匹配"),
        q: z.string().optional().describe("书名或关键词"),
        url: z.string().optional().describe("豆瓣读书链接，形如 https://book.douban.com/subject/123/"),
      },
    },
    async ({ isbn, q, url }) => {
      const { candidates } = await service.searchDouban({ isbn, q, url });
      return text(candidates);
    },
  );

  server.registerTool(
    "add_book",
    {
      description: "手动新增一本书到书架。可指定阅读状态（want_read/unread/reading/read）和标签。",
      inputSchema: {
        title: z.string(),
        author: z.string().optional(),
        authorNationality: z.string().optional(),
        isbn: z.string().optional(),
        coverUrl: z.string().optional(),
        intro: z.string().optional(),
        publisher: z.string().optional(),
        pubdate: z.string().optional(),
        pages: z.number().int().optional(),
        price: z.string().optional(),
        rating: z.number().optional(),
        doubanId: z.string().optional(),
        doubanUrl: z.string().optional(),
        status: statusEnum.optional(),
        tags: z.array(z.string()).optional(),
      },
    },
    async (args) => {
      const book = await service.createBook(args);
      return text(book);
    },
  );

  server.registerTool(
    "import_book",
    {
      description: "从豆瓣抓取并新增一本书。传入 ISBN、书名关键词或豆瓣链接，自动抓取元数据并加入书架。",
      inputSchema: {
        isbn: z.string().optional(),
        q: z.string().optional(),
        url: z.string().optional(),
        status: statusEnum.optional(),
        tags: z.array(z.string()).optional(),
      },
    },
    async ({ isbn, q, url, status, tags }) => {
      const { candidates } = await service.searchDouban({ isbn, q, url });
      if (candidates.length === 0) throw new Error("未在豆瓣找到匹配的书籍");
      const book = await service.importFromDouban(candidates[0], { status, tags });
      return text(book);
    },
  );

  server.registerTool(
    "update_status",
    {
      description: "修改一本书的阅读状态。",
      inputSchema: { id: z.number().int(), status: statusEnum },
    },
    async ({ id, status }) => {
      const book = await service.updateStatus(id, status);
      if (!book) throw new Error(`书籍 ${id} 不存在`);
      return text(book);
    },
  );

  server.registerTool(
    "update_book",
    {
      description: "更新书籍元数据（如补全作者国籍、简介等）。",
      inputSchema: {
        id: z.number().int(),
        title: z.string().optional(),
        author: z.string().nullable().optional(),
        authorNationality: z.string().nullable().optional(),
        intro: z.string().nullable().optional(),
        publisher: z.string().nullable().optional(),
        pubdate: z.string().nullable().optional(),
        pages: z.number().int().nullable().optional(),
        price: z.string().nullable().optional(),
        rating: z.number().nullable().optional(),
      },
    },
    async ({ id, ...patch }) => {
      const book = await service.updateBook(id, patch);
      if (!book) throw new Error(`书籍 ${id} 不存在`);
      return text(book);
    },
  );

  server.registerTool(
    "get_book",
    {
      description: "按 id 查阅一本书的完整信息（含标签）。",
      inputSchema: { id: z.number().int() },
    },
    async ({ id }) => {
      const book = await service.getBook(id);
      if (!book) throw new Error(`书籍 ${id} 不存在`);
      return text(book);
    },
  );

  server.registerTool(
    "list_books",
    {
      description: "查询书架上的书，可按阅读状态、标签、关键词筛选。",
      inputSchema: {
        status: statusEnum.optional(),
        tag: z.string().optional(),
        q: z.string().optional(),
      },
    },
    async (args) => {
      const books = await service.listBooks(args);
      return text(books);
    },
  );

  server.registerTool(
    "set_tags",
    {
      description: "给一本书设置标签（分类），传入标签名列表，不存在的标签会自动创建。",
      inputSchema: { id: z.number().int(), tags: z.array(z.string()) },
    },
    async ({ id, tags }) => {
      const book = await service.setBookTags(id, tags);
      if (!book) throw new Error(`书籍 ${id} 不存在`);
      return text(book);
    },
  );

  server.registerTool(
    "list_tags",
    { description: "列出所有标签（分类）。" },
    async () => text(await service.listTags()),
  );

  server.registerTool(
    "delete_book",
    {
      description: "从书架删除一本书。",
      inputSchema: { id: z.number().int() },
    },
    async ({ id }) => {
      const ok = await service.deleteBook(id);
      if (!ok) throw new Error(`书籍 ${id} 不存在`);
      return text({ ok: true });
    },
  );

  return server;
}
