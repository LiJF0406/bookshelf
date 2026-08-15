import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BOOK_STATUSES, type BookStatus } from "@bookshelf/shared";
import type { createService } from "./service.js";

export type Service = ReturnType<typeof createService>;

const statusSchema = z.string().refine((v): v is BookStatus => (BOOK_STATUSES as readonly string[]).includes(v), {
  message: "无效的阅读状态",
});

const bookInputSchema = z.object({
  title: z.string().min(1),
  author: z.string().nullable().optional(),
  authorNationality: z.string().nullable().optional(),
  isbn: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  intro: z.string().nullable().optional(),
  publisher: z.string().nullable().optional(),
  pubdate: z.string().nullable().optional(),
  pages: z.number().int().nullable().optional(),
  price: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  doubanId: z.string().nullable().optional(),
  doubanUrl: z.string().nullable().optional(),
  status: statusSchema.optional(),
  tags: z.array(z.string()).optional(),
});

const idSchema = z.object({ id: z.coerce.number().int() });

export function registerRoutes(app: FastifyInstance, service: Service): void {
  app.get("/api/books", async (req) => {
    const { status, tag, q } = req.query as Record<string, string | undefined>;
    return service.listBooks({
      status: status as BookStatus | undefined,
      tag,
      q,
    });
  });

  app.get("/api/books/:id", async (req, reply) => {
    const { id } = idSchema.parse(req.params);
    const book = await service.getBook(id);
    if (!book) return reply.code(404).send({ error: "书籍不存在" });
    return book;
  });

  app.post("/api/books", async (req, reply) => {
    const input = bookInputSchema.parse(req.body);
    try {
      return await service.createBook(input);
    } catch (err) {
      return reply.code(409).send({ error: (err as Error).message });
    }
  });

  app.patch("/api/books/:id", async (req, reply) => {
    const { id } = idSchema.parse(req.params);
    const input = bookInputSchema.partial().parse(req.body);
    const book = await service.updateBook(id, input);
    if (!book) return reply.code(404).send({ error: "书籍不存在" });
    return book;
  });

  app.patch("/api/books/:id/status", async (req, reply) => {
    const { id } = idSchema.parse(req.params);
    const { status } = z.object({ status: statusSchema }).parse(req.body);
    const book = await service.updateStatus(id, status);
    if (!book) return reply.code(404).send({ error: "书籍不存在" });
    return book;
  });

  app.patch("/api/books/:id/pin", async (req, reply) => {
    const { id } = idSchema.parse(req.params);
    const { pinned } = z.object({ pinned: z.boolean() }).parse(req.body);
    const book = await service.updatePin(id, pinned);
    if (!book) return reply.code(404).send({ error: "书籍不存在" });
    return book;
  });

  app.post("/api/books/batch-delete", async (req) => {
    const { ids } = z.object({ ids: z.array(z.number().int()) }).parse(req.body);
    return { count: await service.batchDelete(ids) };
  });

  app.post("/api/books/batch-status", async (req) => {
    const { ids, status } = z
      .object({ ids: z.array(z.number().int()), status: statusSchema })
      .parse(req.body);
    return { count: await service.batchStatus(ids, status) };
  });

  app.post("/api/books/batch-tags", async (req) => {
    const { ids, tags } = z
      .object({ ids: z.array(z.number().int()), tags: z.array(z.string()) })
      .parse(req.body);
    return { count: await service.batchTags(ids, tags) };
  });

  app.delete("/api/books/:id", async (req, reply) => {
    const { id } = idSchema.parse(req.params);
    const ok = await service.deleteBook(id);
    if (!ok) return reply.code(404).send({ error: "书籍不存在" });
    return { ok: true };
  });

  app.put("/api/books/:id/tags", async (req, reply) => {
    const { id } = idSchema.parse(req.params);
    const { tags } = z.object({ tags: z.array(z.string()) }).parse(req.body);
    const book = await service.setBookTags(id, tags);
    if (!book) return reply.code(404).send({ error: "书籍不存在" });
    return book;
  });

  app.get("/api/tags", async () => service.listTags());

  app.post("/api/tags", async (req, reply) => {
    const { name, color } = z.object({ name: z.string().min(1), color: z.string().nullable().optional() }).parse(req.body);
    return reply.code(201).send(await service.createTag(name, color));
  });

  app.delete("/api/tags/:id", async (req, reply) => {
    const { id } = idSchema.parse(req.params);
    const ok = await service.deleteTag(id);
    if (!ok) return reply.code(404).send({ error: "标签不存在" });
    return { ok: true };
  });

  app.get("/api/douban/search", async (req) => {
    const { isbn, q, url } = req.query as Record<string, string | undefined>;
    return service.searchDouban({ isbn, q, url });
  });

  // 代理豆瓣封面，规避防盗链（浏览器直接引用豆瓣图床会被拒）
  app.get("/api/douban/cover", async (req, reply) => {
    const { url } = req.query as Record<string, string | undefined>;
    if (!url) return reply.code(400).send({ error: "缺少 url 参数" });
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return reply.code(400).send({ error: "无效的 url" });
    }
    if (parsed.hostname !== "doubanio.com" && !parsed.hostname.endsWith(".doubanio.com")) {
      return reply.code(400).send({ error: "仅支持豆瓣图片地址" });
    }
    try {
      const res = await fetch(parsed.toString(), {
        headers: {
          Referer: "https://book.douban.com/",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      if (!res.ok) return reply.code(res.status).send();
      const buf = Buffer.from(await res.arrayBuffer());
      reply.header("Content-Type", res.headers.get("content-type") ?? "image/jpeg");
      reply.header("Cache-Control", "public, max-age=86400");
      return reply.send(buf);
    } catch {
      return reply.code(502).send();
    }
  });

  app.post("/api/douban/import", async (req, reply) => {
    const body = z.object({
      candidate: z.object({}).passthrough(),
      status: statusSchema.optional(),
      tags: z.array(z.string()).optional(),
    }).parse(req.body);
    try {
      return await service.importFromDouban(body.candidate as any, {
        status: body.status,
        tags: body.tags,
      });
    } catch (err) {
      return reply.code(409).send({ error: (err as Error).message });
    }
  });
}
