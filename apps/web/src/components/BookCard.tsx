import type { MouseEvent } from "react";
import type { BookWithTags } from "@bookshelf/shared";

interface Props {
  book: BookWithTags;
  batchMode: boolean;
  selected: boolean;
  onClick: () => void;
  onContextMenu: (e: MouseEvent) => void;
  onToggleSelect: () => void;
}

export function BookCard({ book, batchMode, selected, onClick, onContextMenu, onToggleSelect }: Props) {
  return (
    <div
      className={`book-card ${selected ? "selected" : ""}`}
      onClick={batchMode ? onToggleSelect : onClick}
      onContextMenu={onContextMenu}
    >
      <div className="book-cover">
        {book.coverPath ? (
          <img src={book.coverPath} alt={book.title} loading="lazy" />
        ) : (
          <div className="placeholder">{book.title}</div>
        )}
        {book.pinnedAt && <span className="pin-badge">置顶</span>}
        {batchMode && (
          <input
            type="checkbox"
            className="card-check"
            checked={selected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
      <div className="title">{book.title}</div>
      {book.author && <div className="author">{book.author}</div>}
    </div>
  );
}
