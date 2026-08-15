import { useRef, type MouseEvent, type PointerEvent } from "react";
import type { BookWithTags } from "@bookshelf/shared";

interface Props {
  book: BookWithTags;
  batchMode: boolean;
  selected: boolean;
  onClick: () => void;
  onLongPress: () => void;
  onContextMenu: (e: MouseEvent) => void;
  onToggleSelect: () => void;
}

const LONG_PRESS_MS = 500;

export function BookCard({
  book,
  batchMode,
  selected,
  onClick,
  onLongPress,
  onContextMenu,
  onToggleSelect,
}: Props) {
  const timerRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);

  function clearTimer() {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.pointerType !== "touch") return;
    longPressFiredRef.current = false;
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      longPressFiredRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function handlePointerMove() {
    clearTimer();
  }

  function handlePointerEnd() {
    clearTimer();
  }

  function handleClick() {
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (batchMode) onToggleSelect();
    else onClick();
  }

  return (
    <div
      className={`book-card ${selected ? "selected" : ""}`}
      onClick={handleClick}
      onContextMenu={onContextMenu}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onPointerLeave={handlePointerEnd}
    >
      <div className="book-cover">
        {book.coverPath ? (
          <img src={book.coverPath} alt={book.title} loading="lazy" draggable={false} />
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
