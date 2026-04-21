/**
 * Wikinews (es) API wrapper.
 * - listRecentArticles(): son eklenen/güncellenen makalelerin başlıklarını döner
 * - fetchArticleExtract(title): plain-text içerik döner
 * - estimateLevel(text): ortalama cümle uzunluğuna göre A2/B1/B2
 */

export type ReadingLevel = 'A2' | 'B1' | 'B2';

export interface NewsListItem {
  title: string;
  timestamp?: string;
  pageUrl: string;
}

export interface NewsArticle {
  title: string;
  extract: string;
  pageUrl: string;
}

const API_BASE = 'https://es.wikinews.org/w/api.php';

/** recentchanges → son 20 benzersiz makale başlığı. */
export async function listRecentArticles(limit = 30): Promise<NewsListItem[]> {
  const params = new URLSearchParams({
    action: 'query',
    list: 'recentchanges',
    rcnamespace: '0',
    rctype: 'edit|new',
    rcprop: 'title|timestamp',
    rclimit: String(limit),
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${API_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`Wikinews list HTTP ${res.status}`);
  const data = await res.json();
  const changes: Array<{ title: string; timestamp?: string }> =
    data?.query?.recentchanges ?? [];

  const seen = new Set<string>();
  const items: NewsListItem[] = [];
  for (const c of changes) {
    if (!c?.title) continue;
    // Namespace=0 filtresi API'den geliyor ama güvenlik için ":" içeren başlıkları da atla.
    if (c.title.includes(':')) continue;
    if (seen.has(c.title)) continue;
    seen.add(c.title);
    items.push({
      title: c.title,
      timestamp: c.timestamp,
      pageUrl: `https://es.wikinews.org/wiki/${encodeURIComponent(c.title.replace(/ /g, '_'))}`,
    });
    if (items.length >= 20) break;
  }
  return items;
}

/** prop=extracts ile makale metnini plain-text olarak çeker. */
export async function fetchArticleExtract(title: string): Promise<NewsArticle> {
  const params = new URLSearchParams({
    action: 'query',
    titles: title,
    prop: 'extracts',
    explaintext: 'true',
    format: 'json',
    origin: '*',
  });
  const res = await fetch(`${API_BASE}?${params.toString()}`);
  if (!res.ok) throw new Error(`Wikinews extract HTTP ${res.status}`);
  const data = await res.json();
  const pages = data?.query?.pages ?? {};
  const firstKey = Object.keys(pages)[0];
  const page = firstKey ? pages[firstKey] : null;
  const raw = (page?.extract ?? '').trim();

  const extract = cleanExtract(raw);

  return {
    title: page?.title ?? title,
    extract,
    pageUrl: `https://es.wikinews.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`,
  };
}

/** Wikinews extract'ında "Fuentes", "Enlaces", "Noticias relacionadas" vb. sonu varsa kırpar. */
function cleanExtract(text: string): string {
  if (!text) return '';
  const stopHeadings = [
    '\nFuentes',
    '\nFuente',
    '\nEnlaces externos',
    '\nEnlaces',
    '\nNoticias relacionadas',
    '\nReferencias',
    '\nVéase también',
  ];
  let min = text.length;
  for (const h of stopHeadings) {
    const idx = text.indexOf(h);
    if (idx >= 0 && idx < min) min = idx;
  }
  return text.slice(0, min).trim();
}

/**
 * Seviye tahmini: basit heuristic — ortalama cümle uzunluğu (kelime).
 * < 8 → A2, 8–15 → B1, > 15 → B2.
 */
export function estimateLevel(text: string): ReadingLevel {
  if (!text || text.trim().length === 0) return 'B1';
  const sentences = text
    .split(/[\.!\?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (sentences.length === 0) return 'B1';
  const totalWords = sentences.reduce(
    (acc, s) => acc + s.split(/\s+/).filter(Boolean).length,
    0
  );
  const avg = totalWords / sentences.length;
  if (avg < 8) return 'A2';
  if (avg <= 15) return 'B1';
  return 'B2';
}
