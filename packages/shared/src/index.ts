export const BOOK_STATUSES = ["want_read", "unread", "reading", "read"] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

export const BOOK_STATUS_LABELS: Record<BookStatus, string> = {
  want_read: "想读",
  unread: "未读",
  reading: "在读",
  read: "已读",
};

export interface Book {
  id: number;
  title: string;
  author: string | null;
  authorNationality: string | null;
  isbn: string | null;
  coverPath: string | null;
  intro: string | null;
  publisher: string | null;
  pubdate: string | null;
  pages: number | null;
  price: string | null;
  rating: number | null;
  doubanId: string | null;
  doubanUrl: string | null;
  status: BookStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export interface BookWithTags extends Book {
  tags: Tag[];
}

export interface DoubanCandidate {
  title: string;
  author: string | null;
  authorNationality: string | null;
  isbn: string | null;
  coverUrl: string | null;
  intro: string | null;
  publisher: string | null;
  pubdate: string | null;
  pages: number | null;
  price: string | null;
  rating: number | null;
  doubanId: string | null;
  doubanUrl: string | null;
}

export interface BookInput {
  title: string;
  author?: string | null;
  authorNationality?: string | null;
  isbn?: string | null;
  coverUrl?: string | null;
  intro?: string | null;
  publisher?: string | null;
  pubdate?: string | null;
  pages?: number | null;
  price?: string | null;
  rating?: number | null;
  doubanId?: string | null;
  doubanUrl?: string | null;
  status?: BookStatus;
  tags?: string[];
}

export interface ListBooksQuery {
  status?: BookStatus;
  tag?: string;
  q?: string;
}
