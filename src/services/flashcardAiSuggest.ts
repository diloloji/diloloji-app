/**
 * Deste başlığına göre Claude ile flashcard önerileri (tarayıcı → Anthropic).
 */

const MODEL = 'claude-sonnet-4-20250514';

export type SuggestedPair = { front: string; back: string; hint?: string };

function getKey(): string | null {
  const k = import.meta.env.VITE_ANTHROPIC_API_KEY;
  return typeof k === 'string' && k.trim().length > 0 ? k.trim() : null;
}

function extractJsonArray(text: string): unknown {
  const t = text.trim();
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start < 0 || end < 0 || end <= start) throw new Error('JSON dizi bulunamadı');
  return JSON.parse(t.slice(start, end + 1)) as unknown;
}

/**
 * Deste konusuna uygun tam 10 kart öner (ön yüz = hedef dil, arka yüz = Türkçe anlam).
 */
export async function suggestFlashcardsFromTitle(
  title: string,
  language: string
): Promise<SuggestedPair[]> {
  const apiKey = getKey();
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY tanımlı değil (.env.local)');

  const prompt = `Sen bir dil öğrenme asistanısın. Kullanıcı flashcard destesi oluşturuyor.

Deste adı: "${title}"
Hedef dil: ${language}

Görev: Bu konuya uygun TAM 10 adet flashcard üret. Her kartta:
- "front": hedef dilde kelime veya kısa ifade (tek satır, mümkünse fiil ise yalın hali)
- "back": Türkçe anlamı (kısa, net)
- "hint": isteğe bağlı; kısa ipucu (hedef dilde veya Türkçe)

Yanıtın YALNIZCA geçerli bir JSON dizisi olsun, başka metin yazma. Biçim:
[{"front":"...","back":"...","hint":"..."}, ...]

Örnek konu "En Sık 50 Fiil" ve İspanyolca ise ser, estar, tener gibi fiiller öner.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err.slice(0, 240)}`);
  }

  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string') throw new Error('Boş cevap');

  const raw = extractJsonArray(text);
  if (!Array.isArray(raw)) throw new Error('Beklenen dizi değil');

  const out: SuggestedPair[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const front = typeof o.front === 'string' ? o.front.trim() : '';
    const back = typeof o.back === 'string' ? o.back.trim() : '';
    const hint = typeof o.hint === 'string' ? o.hint.trim() : undefined;
    if (front && back) out.push({ front, back, hint: hint || undefined });
  }

  if (out.length === 0) throw new Error('Geçerli kart çıkarılamadı');
  return out.slice(0, 10);
}
