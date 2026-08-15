import { BOOK_STATUSES, BOOK_STATUS_LABELS, type BookStatus, type BookWithTags, type Tag } from "@bookshelf/shared";
import { BookCard } from "./BookCard";

interface Props {
  books: BookWithTags[];
  tags: Tag[];
  statusFilter: BookStatus | "";
  tagFilter: string;
  query: string;
  onStatusFilter: (s: BookStatus | "") => void;
  onTagFilter: (t: string) => void;
  onQuery: (q: string) => void;
  onSelect: (book: BookWithTags) => void;
}

export function Shelf(props: Props) {
  const { books, tags, statusFilter, tagFilter, query } = props;

  return (
    <div className="container">
      <div className="toolbar">
        <div className="tabs">
          <button
            className={`tab ${statusFilter === "" ? "active" : ""}`}
            onClick={() => props.onStatusFilter("")}
          >
            全部
          </button>
          {BOOK_STATUSES.map((s) => (
            <button
              key={s}
              className={`tab ${statusFilter === s ? "active" : ""}`}
              onClick={() => props.onStatusFilter(s)}
            >
              {BOOK_STATUS_LABELS[s]}
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

      {books.length === 0 ? (
        <div className="empty">书架上还没有书，点击右上角「录入书籍」开始吧。</div>
      ) : (
        <div className="grid">
          {books.map((b) => (
            <BookCard key={b.id} book={b} onClick={() => props.onSelect(b)} />
          ))}
        </div>
      )}
    </div>
  );
}
