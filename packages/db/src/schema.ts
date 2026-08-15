import { relations, sql } from "drizzle-orm";
import { integer, primaryKey, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  author: text("author"),
  authorNationality: text("author_nationality"),
  isbn: text("isbn").unique(),
  coverPath: text("cover_path"),
  intro: text("intro"),
  publisher: text("publisher"),
  pubdate: text("pubdate"),
  pages: integer("pages"),
  price: text("price"),
  rating: real("rating"),
  doubanId: text("douban_id"),
  doubanUrl: text("douban_url"),
  status: text("status").notNull().default("unread"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const tags = sqliteTable("tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  color: text("color"),
});

export const bookTags = sqliteTable(
  "book_tags",
  {
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.bookId, t.tagId] }),
  }),
);

export type BookRow = typeof books.$inferSelect;
export type NewBook = typeof books.$inferInsert;
export type TagRow = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export const booksRelations = relations(books, ({ many }) => ({
  bookTags: many(bookTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  bookTags: many(bookTags),
}));

export const bookTagsRelations = relations(bookTags, ({ one }) => ({
  book: one(books, { fields: [bookTags.bookId], references: [books.id] }),
  tag: one(tags, { fields: [bookTags.tagId], references: [tags.id] }),
}));
