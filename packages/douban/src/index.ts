import * as cheerio from "cheerio";
import type { DoubanCandidate } from "@bookshelf/shared";
import { inferNationality } from "./nationality.js";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
  Referer: "https://book.douban.com/",
  "Cache-Control": "no-cache",
};

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
  if (!res.ok) throw new Error(`豆瓣请求失败：${res.status} ${url}`);
  return res.text();
}

function extractDoubanId(url: string): string | null {
  const m = url.match(/subject\/(\d+)/);
  return m ? m[1] : null;
}

function normalizeCover(src: string | undefined): string | null {
  if (!src) return null;
  let url = src.startsWith("//") ? `https:${src}` : src;
  url = url.replace(/\/view\/subject\/[ms]\//, "/view/subject/l/");
  return url;
}

const INFO_LABELS = ["作者", "出版社", "出版年", "ISBN", "页数", "定价", "装帧", "副标题", "原作名", "译者", "丛书"];

function parseInfo($: cheerio.CheerioAPI): Record<string, string> {
  const info: Record<string, string> = {};
  const text = $("#info").text().replace(/\s+/g, " ").trim();
  if (!text) return info;
  const labelPattern = INFO_LABELS.join("|");
  const re = new RegExp(
    `(${labelPattern})\\s*[:：]\\s*([^:：]+?)(?=\\s+(?:${labelPattern})\\s*[:：]|$)`,
    "g",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const key = m[1];
    const value = m[2].trim();
    if (value && !info[key]) info[key] = value;
  }
  return info;
}

function pickFirstAuthor(raw: string | undefined): string | null {
  if (!raw) return null;
  const author = raw.split(/[/／]|、/)[0].replace(/\s*[著译编]$/, "").trim();
  return author || null;
}

function parseIntro($: cheerio.CheerioAPI): string | null {
  const parts: string[] = [];
  $(".related_info .intro").first().find("p").each((_, el) => {
    const t = $(el).text().trim();
    if (t) parts.push(t);
  });
  if (parts.length === 0) {
    $(".intro").first().find("p").each((_, el) => {
      const t = $(el).text().trim();
      if (t) parts.push(t);
    });
  }
  return parts.length ? parts.join("\n") : null;
}

export function parseSubjectHtml(html: string, url: string): DoubanCandidate {
  const $ = cheerio.load(html);
  const title =
    $('h1 span[property="v:itemreviewed"]').text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("title").text().replace(/\(豆瓣\)\s*$/, "").trim() ||
    "";

  const coverUrl = normalizeCover(
    $("#mainpic img").attr("src") || $("a.nbg img").attr("src") || undefined,
  );

  const info = parseInfo($);
  const author = pickFirstAuthor(info["作者"]);
  const ratingText = $("strong.ll.rating_num").text().trim();
  const pagesRaw = parseInt(info["页数"] || "", 10);

  return {
    title,
    author,
    authorNationality: inferNationality(author),
    isbn: info["ISBN"]?.replace(/\s+/g, "") || null,
    coverUrl,
    intro: parseIntro($),
    publisher: info["出版社"] || null,
    pubdate: info["出版年"] || null,
    pages: Number.isNaN(pagesRaw) ? null : pagesRaw,
    price: info["定价"] || null,
    rating: ratingText ? Number.parseFloat(ratingText) : null,
    doubanId: extractDoubanId(url),
    doubanUrl: url,
  };
}

export async function searchByIsbn(isbn: string): Promise<DoubanCandidate> {
  const url = `https://book.douban.com/isbn/${encodeURIComponent(isbn)}/`;
  const html = await fetchText(url);
  return parseSubjectHtml(html, url);
}

export async function fetchByUrl(url: string): Promise<DoubanCandidate> {
  const html = await fetchText(url);
  return parseSubjectHtml(html, url);
}

interface DoubanSearchItem {
  abstract?: string;
  cover_url?: string;
  id?: number;
  rating?: { value?: number };
  title?: string;
  url?: string;
}

function extractJsonObject(text: string, from: number): string | null {
  const open = text.indexOf("{", from);
  if (open === -1) return null;
  const openChar = text[open];
  const closeChar = openChar === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
    else if (c === openChar) depth++;
    else if (c === closeChar && --depth === 0) return text.slice(open, i + 1);
  }
  return null;
}

export async function searchByKeyword(keyword: string): Promise<DoubanCandidate[]> {
  const url = `https://search.douban.com/book/subject_search?search_text=${encodeURIComponent(keyword)}&cat=1001`;
  const html = await fetchText(url);
  const idx = html.indexOf("window.__DATA__");
  if (idx === -1) return [];
  const json = extractJsonObject(html, idx);
  if (!json) return [];
  const data = JSON.parse(json) as { items?: DoubanSearchItem[] };
  const items = Array.isArray(data?.items) ? data.items : [];
  return items
    .map((it): DoubanCandidate | null => {
      const title = it.title?.trim();
      const link = it.url;
      if (!title || !link) return null;
      const abstractParts = (it.abstract ?? "").split("/").map((s) => s.trim()).filter(Boolean);
      const author = abstractParts[0]?.replace(/^\[.+\]\s*/, "") ?? null;
      return {
        title,
        author,
        authorNationality: inferNationality(author),
        isbn: null,
        coverUrl: normalizeCover(it.cover_url),
        intro: null,
        publisher: abstractParts[1] ?? null,
        pubdate: abstractParts[2] ?? null,
        pages: null,
        price: abstractParts[3] ?? null,
        rating: typeof it.rating?.value === "number" ? it.rating.value : null,
        doubanId: it.id ? String(it.id) : extractDoubanId(link),
        doubanUrl: link,
      };
    })
    .filter((x): x is DoubanCandidate => x !== null);
}
