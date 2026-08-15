import { useState, type MouseEvent } from "react";
import {
  STATUS_OPTIONS,
  splitTagText,
  type BookStatus,
  type BookWithTags,
  type Tag,
} from "@bookshelf/shared";
import { BookCard } from "./BookCard";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  books: BookWithTags[];
  tags: Tag[];
  statusFilter: BookStatus | "";
  tagFilter: string;
  query: string;
  batchMode: boolean;
  selectedIds: Set<number>;
  allPinned: boolean;
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
  onBatchPin: () => void;
  onLongPress: (book: BookWithTags) => void;
}

export function Shelf(props: Props) {
  const { books, tags, statusFilter, tagFilter, query, batchMode, selectedIds, allPinned } = props;
  const [panel, setPanel] = useState<"status" | "tag" | null>(null);
  const [batchTagsInput, setBatchTagsInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function submitBatchTags() {
    const names = splitTagText(batchTagsInput);
    if (names.length) props.onBatchTags(names);
    setBatchTagsInput("");
    setPanel(null);
  }

  return (
    <div
      className={`container ${batchMode ? "has-batch-nav" : ""}`}
      onContextMenu={props.onEmptyContextMenu}
    >
      {batchMode && (
        <div className="batch-nav">
          {panel === "status" && (
            <div className="batch-panel">
              {STATUS_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  className="batch-panel-item"
                  onClick={() => {
                    props.onBatchStatus(o.value);
                    setPanel(null);
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          )}
          {panel === "tag" && (
            <div className="batch-panel batch-panel-row">
              <input
                className="search-input"
                placeholder="批量加标签，逗号分隔"
                value={batchTagsInput}
                autoFocus
                onChange={(e) => setBatchTagsInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submitBatchTags();
                }}
              />
              <button className="btn" onClick={submitBatchTags}>
                确认
              </button>
            </div>
          )}

          <div className="batch-nav-top">
            <span className="batch-count">已选 {selectedIds.size} 本</span>
            <button className="btn secondary" onClick={props.onSelectAll}>
              {selectedIds.size === books.length && books.length > 0 ? "取消全选" : "全选"}
            </button>
            <button className="btn secondary" onClick={props.onExitBatch}>
              取消
            </button>
          </div>

          <div className="batch-nav-bar">
            <button className="btn secondary" onClick={props.onBatchPin}>
              {allPinned ? "取消置顶" : "置顶"}
            </button>
            <button
              className={`btn secondary ${panel === "status" ? "active" : ""}`}
              onClick={() => setPanel(panel === "status" ? null : "status")}
            >
              状态
            </button>
            <button
              className={`btn secondary ${panel === "tag" ? "active" : ""}`}
              onClick={() => setPanel(panel === "tag" ? null : "tag")}
            >
              标签
            </button>
            <button className="btn danger-solid" onClick={() => setConfirmDelete(true)}>
              删除
            </button>
          </div>
        </div>
      )}

      {!batchMode && (
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
              onLongPress={() => props.onLongPress(b)}
              onContextMenu={(e) => props.onBookContextMenu(e, b)}
              onToggleSelect={() => props.onToggleSelect(b.id)}
            />
          ))}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          message={`确定删除选中的 ${selectedIds.size} 本书吗？此操作不可撤销。`}
          onConfirm={() => {
            props.onBatchDelete();
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
