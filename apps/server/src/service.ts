import { createWriteStream, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { and, eq, inArray, like, notInArray, sql } from "drizzle-orm";
import { schema, type DB } from "@bookshelf/db";
import * as douban from "@bookshelf/douban";
import type {
  BookInput,
  BookStatus,
  BookWithTags,
  DoubanCandidate,
  ListBooksQuery,
  Tag,
} from "@bookshelf/shared";

const { books, tags, bookTags } = schema;

export interface ServiceDeps {
  db: DB;
  coverDir: string;
}

interface BookQueryRow {
  id: number;
  title: string;
  author: string | null;
  authorNationality: string | null;
  isbn: string | null;
  coverPath: string | null;
  intro: string | null;
  publisher: string | null;
  pubdate: string | null;
  pages: number | null;
  price: string | null;
  rating: number | null;
  doubanId: string | null;
  doubanUrl: string | null;
  status: string;
  pinnedAt: string | null;
  createdAt: string;
  updatedAt: string;
  bookTags: Array<{ tag: typeof tags.$inferSelect }>;
}

function toBookWithTags(row: BookQueryRow): BookWithTags {
  const { bookTags, ...rest } = row;
  return {
    ...rest,
    status: rest.status as BookStatus,
    tags: bookTags.map((bt) => bt.tag),
  };
}

function isDoubanCoverUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "doubanio.com" || host.endsWith(".doubanio.com");
  } catch {
    return false;
  }
}

async function downloadCover(
  coverUrl: string,
  coverDir: string,
  base: string,
): Promise<string | null> {
  if (!isDoubanCoverUrl(coverUrl)) return null;
  try {
    const res = await fetch(coverUrl, {
      headers: { Referer: "https://book.douban.com/", "User-Agent": "bookshelf" },
    });
    if (!res.ok || !res.body) return null;
    const contentType = res.headers.get("content-type") ?? "";
    let ext = ".jpg";
    if (contentType.includes("png")) ext = ".png";
    else if (contentType.includes("webp")) ext = ".webp";
    const filename = `${base.replace(/[^\w.-]/g, "_").slice(0, 80)}${ext}`;
    const filePath = join(coverDir, filename);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(filePath));
    return `/covers/${filename}`;
  } catch {
    return null;
  }
}

export function createService({ db, coverDir }: ServiceDeps) {
  mkdirSync(coverDir, { recursive: true });

  async function ensureTags(names: string[]): Promise<number[]> {
    const ids: number[] = [];
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      const existing = await db.query.tags.findFirst({ where: eq(tags.name, name) });
      if (existing) {
        ids.push(existing.id);
      } else {
        const [created] = await db.insert(tags).values({ name }).returning();
        ids.push(created.id);
      }
    }
    return ids;
  }

  async function attachTags(bookId: number, tagIds: number[]): Promise<void> {
    if (tagIds.length === 0) return;
    await db
      .insert(bookTags)
      .values(tagIds.map((tagId) => ({ bookId, tagId })))
      .onConflictDoNothing();
  }

  async function cleanupOrphanTags(): Promise<void> {
    const rows = await db.select({ tagId: bookTags.tagId }).from(bookTags);
    const used = new Set(rows.map((r) => r.tagId));
    if (used.size === 0) {
      await db.delete(tags).where(sql`1 = 1`);
    } else {
      await db.delete(tags).where(notInArray(tags.id, [...used]));
    }
  }

  return {
    async listBooks(query: ListBooksQuery = {}): Promise<BookWithTags[]> {
      const conditions = [];
      if (query.status) conditions.push(eq(books.status, query.status));
      if (query.q) {
        const kw = `%${query.q}%`;
        conditions.push(like(books.title, kw));
      }
      let ids: number[] | undefined;
      if (query.tag) {
        const tag = await db.query.tags.findFirst({ where: eq(tags.name, query.tag) });
        if (!tag) return [];
        const rows = await db.select({ bookId: bookTags.bookId }).from(bookTags).where(eq(bookTags.tagId, tag.id));
        ids = rows.map((r) => r.bookId);
        if (ids.length === 0) return [];
      }
      let result = await db.query.books.findMany({
        where: conditions.length ? and(...conditions) : undefined,
        with: { bookTags: { with: { tag: true } } },
        orderBy: (t, { desc }) => [desc(t.pinnedAt), desc(t.updatedAt)],
      });
      if (ids) result = result.filter((r) => ids!.includes(r.id));
      return result.map(toBookWithTags);
    },

    async getBook(id: number): Promise<BookWithTags | null> {
      const row = await db.query.books.findFirst({
        where: eq(books.id, id),
        with: { bookTags: { with: { tag: true } } },
      });
      return row ? toBookWithTags(row as BookQueryRow) : null;
    },

    async createBook(input: BookInput): Promise<BookWithTags> {
      if (input.isbn) {
        const existing = await db.query.books.findFirst({ where: eq(books.isbn, input.isbn) });
        if (existing) throw new Error(`ISBN ${input.isbn} 已存在`);
      }
      let coverPath: string | null = null;
      if (input.coverUrl) {
        const base = input.doubanId ?? input.isbn ?? input.title;
        coverPath = await downloadCover(input.coverUrl, coverDir, base);
      }
      const [book] = await db
        .insert(books)
        .values({
          title: input.title,
          author: input.author ?? null,
          authorNationality: input.authorNationality ?? null,
          isbn: input.isbn ?? null,
          coverPath,
          intro: input.intro ?? null,
          publisher: input.publisher ?? null,
          pubdate: input.pubdate ?? null,
          pages: input.pages ?? null,
          price: input.price ?? null,
          rating: input.rating ?? null,
          doubanId: input.doubanId ?? null,
          doubanUrl: input.doubanUrl ?? null,
          status: input.status ?? "unread",
        })
        .returning();
      if (input.tags?.length) {
        const ids = await ensureTags(input.tags);
        await attachTags(book.id, ids);
      }
      return (await this.getBook(book.id))!;
    },

    async updateBook(id: number, patch: Partial<BookInput>): Promise<BookWithTags | null> {
      let coverPath: string | null | undefined;
      if (patch.coverUrl) {
        const base = patch.doubanId ?? patch.isbn ?? patch.title ?? String(id);
        coverPath = await downloadCover(patch.coverUrl, coverDir, base);
      }
      const data: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      const fields: Array<keyof BookInput> = [
        "title", "author", "authorNationality", "isbn", "intro", "publisher",
        "pubdate", "pages", "price", "rating", "doubanId", "doubanUrl", "status",
      ];
      for (const f of fields) {
        if (patch[f] !== undefined) data[f] = patch[f] ?? null;
      }
      if (coverPath) data.coverPath = coverPath;
      await db.update(books).set(data).where(eq(books.id, id));
      return this.getBook(id);
    },

    async updateStatus(id: number, status: BookStatus): Promise<BookWithTags | null> {
      await db
        .update(books)
        .set({ status, updatedAt: new Date().toISOString() })
        .where(eq(books.id, id));
      return this.getBook(id);
    },

    async updatePin(id: number, pinned: boolean): Promise<BookWithTags | null> {
      await db
        .update(books)
        .set({
          pinnedAt: pinned ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(books.id, id));
      return this.getBook(id);
    },

    async deleteBook(id: number): Promise<boolean> {
      const res = await db.delete(books).where(eq(books.id, id));
      if (res.changes > 0) {
        await cleanupOrphanTags();
        return true;
      }
      return false;
    },

    async listTags(): Promise<Tag[]> {
      return db.query.tags.findMany({ orderBy: (t, { asc }) => [asc(t.name)] });
    },

    async createTag(name: string, color?: string | null): Promise<Tag> {
      const existing = await db.query.tags.findFirst({ where: eq(tags.name, name) });
      if (existing) return existing;
      const [tag] = await db.insert(tags).values({ name, color: color ?? null }).returning();
      return tag;
    },

    async deleteTag(id: number): Promise<boolean> {
      const res = await db.delete(tags).where(eq(tags.id, id));
      return res.changes > 0;
    },

    async setBookTags(id: number, names: string[]): Promise<BookWithTags | null> {
      await db.delete(bookTags).where(eq(bookTags.bookId, id));
      const ids = await ensureTags(names);
      await attachTags(id, ids);
      await cleanupOrphanTags();
      return this.getBook(id);
    },

    async batchDelete(ids: number[]): Promise<number> {
      if (ids.length === 0) return 0;
      const res = await db.delete(books).where(inArray(books.id, ids));
      await cleanupOrphanTags();
      return res.changes;
    },

    async batchStatus(ids: number[], status: BookStatus): Promise<number> {
      if (ids.length === 0) return 0;
      const res = await db
        .update(books)
        .set({ status, updatedAt: new Date().toISOString() })
        .where(inArray(books.id, ids));
      return res.changes;
    },

    async batchTags(ids: number[], names: string[]): Promise<number> {
      if (ids.length === 0) return 0;
      const tagIds = await ensureTags(names);
      if (tagIds.length === 0) return 0;
      await db
        .insert(bookTags)
        .values(ids.flatMap((bookId) => tagIds.map((tagId) => ({ bookId, tagId }))))
        .onConflictDoNothing();
      return ids.length;
    },

    async batchPin(ids: number[], pinned: boolean): Promise<number> {
      if (ids.length === 0) return 0;
      const res = await db
        .update(books)
        .set({
          pinnedAt: pinned ? new Date().toISOString() : null,
          updatedAt: new Date().toISOString(),
        })
        .where(inArray(books.id, ids));
      return res.changes;
    },

    async searchDouban(input: { isbn?: string; q?: string; url?: string }): Promise<{
      candidates: DoubanCandidate[];
    }> {
      if (input.isbn) {
        return { candidates: [await douban.searchByIsbn(input.isbn)] };
      }
      if (input.url) {
        return { candidates: [await douban.fetchByUrl(input.url)] };
      }
      if (input.q) {
        return { candidates: await douban.searchByKeyword(input.q) };
      }
      return { candidates: [] };
    },

    async importFromDouban(
      candidate: DoubanCandidate,
      opts: { status?: BookStatus; tags?: string[] } = {},
    ): Promise<BookWithTags> {
      let full = candidate;
      // 搜索页候选缺少简介/ISBN 等详情字段，抓取详情页补全
      if (candidate.doubanUrl && candidate.intro == null && candidate.isbn == null) {
        try {
          full = await douban.fetchByUrl(candidate.doubanUrl);
        } catch {
          // 抓取详情页失败则回退到搜索页数据
        }
      }
      return this.createBook({ ...full, status: opts.status, tags: opts.tags });
    },
  };
}
