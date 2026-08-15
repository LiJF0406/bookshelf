import { useEffect, useState, type MouseEvent } from "react";
import type { BookStatus, BookWithTags, Tag } from "@bookshelf/shared";
import { api } from "./api";
import { Shelf } from "./components/Shelf";
import { AddBook } from "./components/AddBook";
import { BookDetail } from "./components/BookDetail";
import { ContextMenu, type ContextMenuState } from "./components/ContextMenu";
import { ConfirmDialog } from "./components/ConfirmDialog";

export default function App() {
  const [view, setView] = useState<"shelf" | "add">("shelf");
  const [books, setBooks] = useState<BookWithTags[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [statusFilter, setStatusFilter] = useState<BookStatus | "">("");
  const [tagFilter, setTagFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<BookWithTags | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BookWithTags | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [reload, setReload] = useState(0);

  useEffect(() => {
    api.listTags().then(setTags).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .listBooks({ status: statusFilter || undefined, tag: tagFilter || undefined })
      .then(setBooks)
      .catch(() => {});
  }, [statusFilter, tagFilter, view, reload]);

  const filtered = query
    ? books.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          (b.author ?? "").toLowerCase().includes(query.toLowerCase()),
      )
    : books;

  function refreshTags() {
    api
      .listTags()
      .then((next) => {
        setTags(next);
        if (tagFilter && !next.some((t) => t.name === tagFilter)) {
          setTagFilter("");
        }
      })
      .catch(() => {});
  }

  function handleUpdated(updated: BookWithTags) {
    setBooks((prev) => {
      const next = prev.map((b) => (b.id === updated.id ? updated : b));
      // 服务端是按状态/标签过滤返回的，本地替换后需把不再匹配过滤条件的书移除
      const mismatch =
        (statusFilter && updated.status !== statusFilter) ||
        (tagFilter && !updated.tags.some((t) => t.name === tagFilter));
      return mismatch ? next.filter((b) => b.id !== updated.id) : next;
    });
    setSelected(updated);
    refreshTags();
  }

  function handleDeleted(id: number) {
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setSelected(null);
    refreshTags();
  }

  async function handlePin(book: BookWithTags) {
    try {
      await api.updatePin(book.id, !book.pinnedAt);
      setReload((r) => r + 1);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleDeleteBook(book: BookWithTags) {
    try {
      await api.deleteBook(book.id);
      handleDeleted(book.id);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  function handleBookContextMenu(e: MouseEvent, book: BookWithTags) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        { label: book.pinnedAt ? "取消置顶" : "置顶书籍", onClick: () => handlePin(book) },
        { label: "删除书籍", danger: true, onClick: () => setConfirmDelete(book) },
      ],
    });
  }

  function handleEmptyContextMenu(e: MouseEvent) {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [{ label: "批量处理", onClick: () => setBatchMode(true) }],
    });
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) =>
      prev.size === filtered.length && filtered.length > 0
        ? new Set()
        : new Set(filtered.map((b) => b.id)),
    );
  }

  function exitBatch() {
    setBatchMode(false);
    setSelectedIds(new Set());
    setReload((r) => r + 1);
  }

  async function handleBatchStatus(status: BookStatus) {
    try {
      await api.batchStatus([...selectedIds], status);
      exitBatch();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleBatchTags(names: string[]) {
    try {
      await api.batchTags([...selectedIds], names);
      exitBatch();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function handleBatchDelete() {
    try {
      await api.batchDelete([...selectedIds]);
      exitBatch();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="app-root">
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
          batchMode={batchMode}
          selectedIds={selectedIds}
          onStatusFilter={setStatusFilter}
          onTagFilter={setTagFilter}
          onQuery={setQuery}
          onSelect={setSelected}
          onBookContextMenu={handleBookContextMenu}
          onEmptyContextMenu={handleEmptyContextMenu}
          onToggleSelect={toggleSelect}
          onSelectAll={toggleSelectAll}
          onExitBatch={exitBatch}
          onBatchStatus={handleBatchStatus}
          onBatchTags={handleBatchTags}
          onBatchDelete={handleBatchDelete}
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

      <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />

      {confirmDelete && (
        <ConfirmDialog
          message={`确定删除《${confirmDelete.title}》吗？此操作不可撤销。`}
          onConfirm={() => {
            handleDeleteBook(confirmDelete);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
