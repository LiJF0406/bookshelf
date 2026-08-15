import { useState } from "react";
import {
  BOOK_STATUSES,
  BOOK_STATUS_LABELS,
  type BookStatus,
  type DoubanCandidate,
} from "@bookshelf/shared";
import { api } from "../api";

interface Props {
  onDone: () => void;
}

const EMPTY_FORM = {
  title: "",
  author: "",
  authorNationality: "",
  isbn: "",
  intro: "",
  publisher: "",
  pubdate: "",
  pages: "",
  price: "",
  rating: "",
};

export function AddBook({ onDone }: Props) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState<BookStatus>("unread");
  const [tagsText, setTagsText] = useState("");
  const [error, setError] = useState("");

  const [searchMode, setSearchMode] = useState<"isbn" | "q" | "url">("q");
  const [searchText, setSearchText] = useState("");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<DoubanCandidate[]>([]);
  const [importStatus, setImportStatus] = useState<BookStatus>("unread");
  const [importTags, setImportTags] = useState("");

  function set(key: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submitManual() {
    setError("");
    if (!form.title.trim()) {
      setError("书名不能为空");
      return;
    }
    try {
      await api.createBook({
        title: form.title.trim(),
        author: form.author.trim() || null,
        authorNationality: form.authorNationality.trim() || null,
        isbn: form.isbn.trim() || null,
        intro: form.intro.trim() || null,
        publisher: form.publisher.trim() || null,
        pubdate: form.pubdate.trim() || null,
        pages: form.pages ? Number(form.pages) : null,
        price: form.price.trim() || null,
        rating: form.rating ? Number(form.rating) : null,
        status,
        tags: splitTags(tagsText),
      });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function doSearch() {
    setError("");
    if (!searchText.trim()) return;
    setSearching(true);
    try {
      const { candidates } = await api.searchDouban({
        isbn: searchMode === "isbn" ? searchText.trim() : undefined,
        q: searchMode === "q" ? searchText.trim() : undefined,
        url: searchMode === "url" ? searchText.trim() : undefined,
      });
      setCandidates(candidates);
      if (candidates.length === 0) setError("未找到匹配的书籍");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSearching(false);
    }
  }

  async function doImport(candidate: DoubanCandidate) {
    setError("");
    try {
      await api.importDouban(candidate, importStatus, splitTags(importTags));
      onDone();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="container">
      <div className="form">
        <div className="form-section">
          <h3>从豆瓣导入（推荐）</h3>
          <div className="field-row">
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as any)}
              style={{ minWidth: 120 }}
            >
              <option value="q">书名/关键词</option>
              <option value="isbn">ISBN</option>
              <option value="url">豆瓣链接</option>
            </select>
            <input
              className="search-input"
              placeholder={
                searchMode === "isbn"
                  ? "输入 ISBN，如 9787536692930"
                  : searchMode === "url"
                    ? "粘贴豆瓣读书链接"
                    : "输入书名或关键词"
              }
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
            />
            <button className="btn" onClick={doSearch} disabled={searching}>
              {searching ? "搜索中…" : "搜索"}
            </button>
          </div>

          <div className="field-row">
            <label>导入为</label>
            <select value={importStatus} onChange={(e) => setImportStatus(e.target.value as any)}>
              {BOOK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BOOK_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <input
              placeholder="标签（逗号分隔），如 科幻,中国"
              value={importTags}
              onChange={(e) => setImportTags(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>

          {candidates.length > 0 && (
            <div className="candidates">
              {candidates.map((c, i) => (
                <div className="candidate" key={c.doubanId ?? i}>
                  {c.coverUrl && <img src={c.coverUrl} alt={c.title} />}
                  <div className="info">
                    <div className="title">{c.title}</div>
                    <div className="sub">
                      {[c.author, c.publisher, c.pubdate, c.rating ? `${c.rating} 分` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <button className="btn" onClick={() => doImport(c)}>
                    导入
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-section">
          <h3>手动录入</h3>
          <div className="form-grid">
            <div className="form-field full">
              <label>书名 *</label>
              <input value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="form-field">
              <label>作者</label>
              <input value={form.author} onChange={(e) => set("author", e.target.value)} />
            </div>
            <div className="form-field">
              <label>作者国籍</label>
              <input
                value={form.authorNationality}
                onChange={(e) => set("authorNationality", e.target.value)}
              />
            </div>
            <div className="form-field">
              <label>出版社</label>
              <input value={form.publisher} onChange={(e) => set("publisher", e.target.value)} />
            </div>
            <div className="form-field">
              <label>出版年</label>
              <input value={form.pubdate} onChange={(e) => set("pubdate", e.target.value)} />
            </div>
            <div className="form-field">
              <label>ISBN</label>
              <input value={form.isbn} onChange={(e) => set("isbn", e.target.value)} />
            </div>
            <div className="form-field">
              <label>页数</label>
              <input value={form.pages} onChange={(e) => set("pages", e.target.value)} />
            </div>
            <div className="form-field">
              <label>定价</label>
              <input value={form.price} onChange={(e) => set("price", e.target.value)} />
            </div>
            <div className="form-field">
              <label>评分</label>
              <input value={form.rating} onChange={(e) => set("rating", e.target.value)} />
            </div>
            <div className="form-field full">
              <label>简介</label>
              <textarea value={form.intro} onChange={(e) => set("intro", e.target.value)} />
            </div>
            <div className="form-field">
              <label>状态</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
                {BOOK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {BOOK_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>标签（逗号分隔）</label>
              <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="field-row">
            <button className="btn" onClick={submitManual}>
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function splitTags(text: string): string[] {
  return text
    .split(/[,，、]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
