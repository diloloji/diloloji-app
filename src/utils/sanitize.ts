/**
 * XSS koruması: Kullanıcı ve API kaynaklı metinleri ekrana basmadan önce temizler.
 * DOMPurify kullanır (tarayıcı); SSR/build ortamında tag strip yapar.
 */

import DOMPurify from 'dompurify';

const MAX_INPUT_LENGTH = 500;

function stripTagsServerSide(text: string): string {
  if (typeof text !== 'string') return '';
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Metni HTML etkilerinden arındırır; sadece düz metin kalır.
 * Arama kutusu ve ekranda gösterilecek tüm kullanıcı/API verisi için kullanın.
 */
export function sanitizeForDisplay(text: string): string {
  if (text == null || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';
  let out: string;
  if (typeof window !== 'undefined') {
    try {
      out = DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
    } catch {
      out = stripTagsServerSide(trimmed);
    }
  } else {
    out = stripTagsServerSide(trimmed);
  }
  return out.length > MAX_INPUT_LENGTH ? out.slice(0, MAX_INPUT_LENGTH) : out;
}
