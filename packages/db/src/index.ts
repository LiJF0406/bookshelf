import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type DB = BetterSQLite3Database<typeof schema>;
export type Sqlite = Database.Database;

export { schema };
export * from "./paths.js";

export function createDb(dbPath: string): { db: DB; sqlite: Sqlite } {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

export function migrate(sqlite: Sqlite): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT,
      author_nationality TEXT,
      isbn TEXT UNIQUE,
      cover_path TEXT,
      intro TEXT,
      publisher TEXT,
      pubdate TEXT,
      pages INTEGER,
      price TEXT,
      rating REAL,
      douban_id TEXT,
      douban_url TEXT,
      status TEXT NOT NULL DEFAULT 'unread',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT
    );

    CREATE TABLE IF NOT EXISTS book_tags (
      book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (book_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
  `);
}
