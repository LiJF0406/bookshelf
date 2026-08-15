import { useState, type MouseEvent } from "react";
import {
  STATUS_OPTIONS,
  splitTagText,
  type BookStatus,
  type BookWithTags,
  type Tag,
} from "@bookshelf/shared";
import { BookCard } from "./BookCard";

interface Props {
  books: BookWithTags[];
  tags: Tag[];
  statusFilter: BookStatus | "";
  tagFilter: string;
  query: string;
  batchMode: boolean;
  selectedIds: Set<number>;
  onStatusFilter: (s: BookStatus | "") => void;
  onTagFilter: (t: string) => void;
  onQuery: (q: string) => void;
  onSelect: (book: BookWithTags) => void;
  onBookContextMenu: (e: MouseEvent, book: BookWithTags) => void;
  onEmptyContextMenu: (e: MouseEvent) => void;
  onToggleSelect: (id: number) => void;
  onSelectAll: () => void;
  onExitBatch: () => void;
  onBatchStatus: (status: BookStatus) => void;
  onBatchTags: (tags: string[]) => void;
  onBatchDelete: () => void;
}

export function Shelf(props: Props) {
  const { books, tags, statusFilter, tagFilter, query, batchMode, selectedIds } = props;
  const [batchTagsInput, setBatchTagsInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);

  function handleBatchDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    props.onBatchDelete();
    setConfirmDelete(false);
  }

  return (
    <div className="container" onContextMenu={props.onEmptyContextMenu}>
      {batchMode ? (
        <div className="batch-bar">
          <span className="batch-count">已选 {selectedIds.size} 本</span>
          <button className="btn secondary" onClick={props.onSelectAll}>
            {selectedIds.size === books.length && books.length > 0 ? "取消全选" : "全选"}
          </button>
          <div className="dropdown-wrap">
            <button className="btn secondary dropdown-btn" onClick={() => setStatusMenuOpen((v) => !v)}>
              <span>批量改状态</span>
              <span className="caret">▾</span>
            </button>
            {statusMenuOpen && (
              <>
                <div className="context-overlay" onClick={() => setStatusMenuOpen(false)} />
                <div className="dropdown-menu">
                  {STATUS_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      onClick={() => {
                        props.onBatchStatus(o.value);
                        setStatusMenuOpen(false);
                      }}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <input
            className="search-input"
            placeholder="批量加标签，逗号分隔，回车确认"
            value={batchTagsInput}
            onChange={(e) => setBatchTagsInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const names = splitTagText(batchTagsInput);
                if (names.length) props.onBatchTags(names);
                setBatchTagsInput("");
              }
            }}
          />
          <button className="btn danger-solid" onClick={handleBatchDelete}>
            {confirmDelete ? `确认删除 ${selectedIds.size} 本` : "批量删除"}
          </button>
          <button className="btn secondary" onClick={props.onExitBatch}>
            退出批量
          </button>
        </div>
      ) : (
        <>
          <div className="toolbar">
            <div className="tabs">
              <button
                className={`tab ${statusFilter === "" ? "active" : ""}`}
                onClick={() => props.onStatusFilter("")}
              >
                全部
              </button>
              {STATUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  className={`tab ${statusFilter === o.value ? "active" : ""}`}
                  onClick={() => props.onStatusFilter(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <input
              className="search-input"
              placeholder="搜索书名…"
              value={query}
              onChange={(e) => props.onQuery(e.target.value)}
            />
          </div>

          {tags.length > 0 && (
            <div className="toolbar">
              <button
                className={`chip ${tagFilter === "" ? "active" : ""}`}
                onClick={() => props.onTagFilter("")}
              >
                全部标签
              </button>
              {tags.map((t) => (
                <button
                  key={t.id}
                  className={`chip ${tagFilter === t.name ? "active" : ""}`}
                  onClick={() => props.onTagFilter(t.name)}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {books.length === 0 ? (
        <div className="empty">书架上还没有书，点击右上角「录入书籍」开始吧。</div>
      ) : (
        <div className="grid">
          {books.map((b) => (
            <BookCard
              key={b.id}
              book={b}
              batchMode={batchMode}
              selected={selectedIds.has(b.id)}
              onClick={() => props.onSelect(b)}
              onContextMenu={(e) => props.onBookContextMenu(e, b)}
              onToggleSelect={() => props.onToggleSelect(b.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
