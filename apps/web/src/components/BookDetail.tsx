import { useState } from "react";
import {
  BOOK_STATUS_LABELS,
  STATUS_OPTIONS,
  type BookStatus,
  type BookWithTags,
} from "@bookshelf/shared";
import { api } from "../api";
import { Dropdown } from "./Dropdown";

interface Props {
  book: BookWithTags;
  onClose: () => void;
  onUpdated: (book: BookWithTags) => void;
  onDeleted: (id: number) => void;
}

const STATUS_COLORS: Record<BookStatus, string> = {
  want_read: "#4a7fbd",
  unread: "#9a958c",
  reading: "#d18a3a",
  read: "#5a9a6a",
};

export function BookDetail({ book, onClose, onUpdated, onDeleted }: Props) {
  const [newTag, setNewTag] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);

  // 退出动画：先标记 closing 触发 CSS 退场动画，等待动画结束后再真正卸载
  function requestClose() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 180);
  }

  async function changeStatus(status: string) {
    try {
      const updated = await api.updateStatus(book.id, status as BookStatus);
      onUpdated(updated);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function removeTag(name: string) {
    try {
      const next = book.tags.filter((t) => t.name !== name).map((t) => t.name);
      const updated = await api.setTags(book.id, next);
      onUpdated(updated);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function addTag() {
    const name = newTag.trim();
    if (!name) return;
    try {
      const next = [...book.tags.map((t) => t.name), name];
      const updated = await api.setTags(book.id, next);
      onUpdated(updated);
      setNewTag("");
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function doDelete() {
    try {
      await api.deleteBook(book.id);
      onDeleted(book.id);
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className={`modal-overlay${closing ? " closing" : ""}`} onClick={requestClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={requestClose}>
          ×
        </button>

        <div className="detail-body">
          <div className="detail-cover">
            {book.coverPath ? (
              <img src={book.coverPath} alt={book.title} />
            ) : (
              <div className="detail-cover-placeholder">{book.title}</div>
            )}
          </div>
          <div className="detail-info">
            <div className="detail-header">
              <h2>{book.title}</h2>
              <div className="badges">
                <span className="badge" style={{ background: STATUS_COLORS[book.status] }}>
                  {BOOK_STATUS_LABELS[book.status]}
                </span>
                {book.rating != null && <span className="badge rating">★ {book.rating}</span>}
              </div>
            </div>
            <ul className="meta-list">
              {book.author && (
                <li>
                  <span className="meta-key">作者</span>
                  <span className="meta-value">
                    {book.author}
                    {book.authorNationality && `（${book.authorNationality}）`}
                  </span>
                </li>
              )}
              {book.publisher && (
                <li>
                  <span className="meta-key">出版社</span>
                  <span className="meta-value">{book.publisher}</span>
                </li>
              )}
              {book.pubdate && (
                <li>
                  <span className="meta-key">出版年</span>
                  <span className="meta-value">{book.pubdate}</span>
                </li>
              )}
              {book.isbn && (
                <li>
                  <span className="meta-key">ISBN</span>
                  <span className="meta-value">{book.isbn}</span>
                </li>
              )}
              {book.pages && (
                <li>
                  <span className="meta-key">页数</span>
                  <span className="meta-value">{book.pages}</span>
                </li>
              )}
              {book.price && (
                <li>
                  <span className="meta-key">定价</span>
                  <span className="meta-value">{book.price}</span>
                </li>
              )}
              {book.doubanUrl && (
                <li>
                  <span className="meta-key">豆瓣</span>
                  <span className="meta-value">
                    <a href={book.doubanUrl} target="_blank" rel="noreferrer">
                      查看详情
                    </a>
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {book.intro && (
          <div className="intro-block">
            <div className="intro-title">内容简介</div>
            <div className="intro">{book.intro}</div>
          </div>
        )}

        <div className="detail-actions">
          <div className="action-block">
            <span className="action-label">阅读状态</span>
            <Dropdown
              value={book.status}
              options={STATUS_OPTIONS}
              onChange={(v) => changeStatus(v)}
            />
          </div>
          <div className="action-block">
            <span className="action-label">分类</span>
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
                className="tag-input"
                placeholder="添加标签"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
              />
            </div>
          </div>
        </div>

        <div className="detail-footer">
          {confirming ? (
            <>
              <span className="confirm-text">确定删除《{book.title}》吗？此操作不可撤销。</span>
              <button className="btn secondary" onClick={() => setConfirming(false)}>
                取消
              </button>
              <button className="btn danger-solid" onClick={doDelete}>
                确认删除
              </button>
            </>
          ) : (
            <button className="btn danger" onClick={() => setConfirming(true)}>
              删除书籍
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
