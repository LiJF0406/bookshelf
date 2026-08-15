import type {
  BookInput,
  BookStatus,
  BookWithTags,
  DoubanCandidate,
  ListBooksQuery,
  Tag,
} from "@bookshelf/shared";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set("Content-Type", "application/json");
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || `请求失败 ${res.status}`);
  }
  return res.json();
}

function toQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export const api = {
  listBooks: (q: ListBooksQuery = {}) =>
    request<BookWithTags[]>(`/api/books${toQuery({ status: q.status, tag: q.tag, q: q.q })}`),
  createBook: (input: BookInput) =>
    request<BookWithTags>("/api/books", { method: "POST", body: JSON.stringify(input) }),
  updateStatus: (id: number, status: BookStatus) =>
    request<BookWithTags>(`/api/books/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  updatePin: (id: number, pinned: boolean) =>
    request<BookWithTags>(`/api/books/${id}/pin`, {
      method: "PATCH",
      body: JSON.stringify({ pinned }),
    }),
  batchDelete: (ids: number[]) =>
    request<{ count: number }>("/api/books/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
  batchStatus: (ids: number[], status: BookStatus) =>
    request<{ count: number }>("/api/books/batch-status", {
      method: "POST",
      body: JSON.stringify({ ids, status }),
    }),
  batchTags: (ids: number[], tags: string[]) =>
    request<{ count: number }>("/api/books/batch-tags", {
      method: "POST",
      body: JSON.stringify({ ids, tags }),
    }),
  batchPin: (ids: number[], pinned: boolean) =>
    request<{ count: number }>("/api/books/batch-pin", {
      method: "POST",
      body: JSON.stringify({ ids, pinned }),
    }),
  deleteBook: (id: number) => request<{ ok: boolean }>(`/api/books/${id}`, { method: "DELETE" }),
  setTags: (id: number, tags: string[]) =>
    request<BookWithTags>(`/api/books/${id}/tags`, {
      method: "PUT",
      body: JSON.stringify({ tags }),
    }),
  listTags: () => request<Tag[]>("/api/tags"),
  searchDouban: (input: { isbn?: string; q?: string; url?: string }) =>
    request<{ candidates: DoubanCandidate[] }>(
      `/api/douban/search${toQuery({ isbn: input.isbn, q: input.q, url: input.url })}`,
    ),
  importDouban: (candidate: DoubanCandidate, status?: BookStatus, tags?: string[]) =>
    request<BookWithTags>("/api/douban/import", {
      method: "POST",
      body: JSON.stringify({ candidate, status, tags }),
    }),
};
