import { useEffect, useState } from "react";
import type { BookStatus, BookWithTags, Tag } from "@bookshelf/shared";
import { api } from "./api";
import { Shelf } from "./components/Shelf";
import { AddBook } from "./components/AddBook";
import { BookDetail } from "./components/BookDetail";

export default function App() {
  const [view, setView] = useState<"shelf" | "add">("shelf");
  const [books, setBooks] = useState<BookWithTags[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [statusFilter, setStatusFilter] = useState<BookStatus | "">("");
  const [tagFilter, setTagFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BookWithTags | null>(null);

  useEffect(() => {
    api.listTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .listBooks({ status: statusFilter || undefined, tag: tagFilter || undefined })
      .then(setBooks)
      .catch(() => {});
  }, [statusFilter, tagFilter, view]);

  const filtered = query
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          (b.author ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : books;

  function handleUpdated(updated: BookWithTags) {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    setSelected(updated);
  }

  function handleDeleted(id: number) {
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setSelected(null);
    api.listTags().then(setTags).catch(() => {});
  }

  return (
    <div>
      <header className="app-header">
        <h1>我的书架</h1>
        <div className="actions">
          {view === "add" ? (
            <button className="btn secondary" onClick={() => setView("shelf")}>
              返回书架
            </button>
          ) : (
            <button className="btn" onClick={() => setView("add")}>
              录入书籍
            </button>
          )}
        </div>
      </header>

      {view === "add" ? (
        <AddBook onDone={() => setView("shelf")} />
      ) : (
        <Shelf
          books={filtered}
          tags={tags}
          statusFilter={statusFilter}
          tagFilter={tagFilter}
          query={query}
          onStatusFilter={setStatusFilter}
          onTagFilter={setTagFilter}
          onQuery={setQuery}
          onSelect={setSelected}
        />
      )}

      {selected && (
        <BookDetail
          book={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
