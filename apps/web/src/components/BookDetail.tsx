import { useState } from "react";
import { BOOK_STATUSES, BOOK_STATUS_LABELS, type BookWithTags } from "@bookshelf/shared";
import { api } from "../api";

interface Props {
  book: BookWithTags;
  onClose: () => void;
  onUpdated: (book: BookWithTags) => void;
  onDeleted: (id: number) => void;
}

export function BookDetail({ book, onClose, onUpdated, onDeleted }: Props) {
  const [newTag, setNewTag] = useState("");

  async function changeStatus(status: string) {
    const updated = await api.updateStatus(book.id, status as any);
    onUpdated(updated);
  }

  async function removeTag(name: string) {
    const next = book.tags.filter((t) => t.name !== name).map((t) => t.name);
    const updated = await api.setTags(book.id, next);
    onUpdated(updated);
  }

  async function addTag() {
    const name = newTag.trim();
    if (!name) return;
    const next = [...book.tags.map((t) => t.name), name];
    const updated = await api.setTags(book.id, next);
    onUpdated(updated);
    setNewTag("");
  }

  async function remove() {
    if (!confirm(`确定删除《${book.title}》吗？`)) return;
    await api.deleteBook(book.id);
    onDeleted(book.id);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <div className="detail-body">
          <div className="detail-cover">
            {book.coverPath ? <img src={book.coverPath} alt={book.title} /> : null}
          </div>
          <div className="detail-info">
            <h2>{book.title}</h2>
            <ul className="meta-list">
              {book.author && (
                <li>
                  作者：<b>{book.author}</b>
                  {book.authorNationality && <span>（{book.authorNationality}）</span>}
                </li>
              )}
              {book.publisher && <li>出版社：<b>{book.publisher}</b></li>}
              {book.pubdate && <li>出版年：<b>{book.pubdate}</b></li>}
              {book.isbn && <li>ISBN：<b>{book.isbn}</b></li>}
              {book.pages && <li>页数：<b>{book.pages}</b></li>}
              {book.price && <li>定价：<b>{book.price}</b></li>}
              {book.rating != null && <li>豆瓣评分：<b>{book.rating}</b></li>}
              {book.doubanUrl && (
                <li>
                  <a href={book.doubanUrl} target="_blank" rel="noreferrer">
                    豆瓣链接
                  </a>
                </li>
              )}
            </ul>
            {book.intro && <div className="intro">{book.intro}</div>}
          </div>
        </div>

        <div className="field-row">
          <label>状态</label>
          <select value={book.status} onChange={(e) => changeStatus(e.target.value)}>
            {BOOK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {BOOK_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <label>分类</label>
          <div className="tag-list">
            {book.tags.map((t) => (
              <span className="tag" key={t.id}>
                {t.name}
                <button className="remove" onClick={() => removeTag(t.name)}>
                  ×
                </button>
              </span>
            ))}
            <input
              placeholder="添加标签"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              style={{ width: 90, padding: "3px 8px" }}
            />
          </div>
        </div>

        <div className="field-row">
          <button className="btn danger" onClick={remove}>
            删除书籍
          </button>
        </div>
      </div>
    </div>
  );
}
