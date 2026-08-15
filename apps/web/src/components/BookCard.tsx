import type { BookWithTags } from "@bookshelf/shared";

export function BookCard({ book, onClick }: { book: BookWithTags; onClick: () => void }) {
  return (
    <div className="book-card" onClick={onClick}>
      <div className="book-cover">
        {book.coverPath ? (
          <img src={book.coverPath} alt={book.title} loading="lazy" />
        ) : (
          <div className="placeholder">{book.title}</div>
        )}
      </div>
      <div className="title">{book.title}</div>
      {book.author && <div className="author">{book.author}</div>}
    </div>
  );
}
