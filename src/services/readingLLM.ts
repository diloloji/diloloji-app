/**
 * Okuma modu: kelime analizi ve mini quiz (Anthropic). Önbellek yalnızca bellekte.
 */

const MODEL = 'claude-sonnet-4-20250514';

export interface ReadingWordAnalysis {
  turkish: string;
  is_verb: boolean;
  infinitive: string | null;
  tense: string | null;
  person: string | null;
  irregular: boolean;
}

export interface ReadingQuizItem {
  sentence: string;
  answer: string;
  verb: string;
  tense: string;
  hint: string;
}

/** Kelime (normalize) → analiz. Sayfa yenilenene kadar bellekte. */
export const wordCache: Record<string, ReadingWordAnalysis> = {};

/** Metin imzası → quiz soruları. */
export const quizCache: Record<string, ReadingQuizItem[]> = {};

function getAnthropicKey(): string | null {
  const k = import.meta.env.VITE_ANTHROPIC_API_KEY;
  return typeof k === 'string' && k.length > 0 ? k : null;
}

function parseJsonObject(text: string): unknown {
  const t = text.trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('JSON bulunamadı');
  }
  return JSON.parse(t.slice(start, end + 1)) as unknown;
}

function parseJsonArray(text: string): unknown {
  const t = text.trim();
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('JSON dizi bulunamadı');
  }
  return JSON.parse(t.slice(start, end + 1)) as unknown;
}

async function callAnthropic(userContent: string, maxTokens: number): Promise<string> {
  const apiKey = getAnthropicKey();
  if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY yok');
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
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userContent }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = (await res.json()) as { content?: Array<{ text?: string }> };
  const text = data?.content?.[0]?.text;
  if (typeof text !== 'string' || !text) throw new Error('Boş cevap');
  return text;
}

/**
 * Okuma modu kelime analizi (tek kelime, JSON).
 * Önbellek: wordCache[lowerCaseWord]
 */
export async function analyzeWordForReading(rawWord: string): Promise<ReadingWordAnalysis> {
  const word = (rawWord || '').trim();
  const key = word.toLowerCase();
  if (wordCache[key]) return wordCache[key];

  const userContent = `İspanyolca kelime: "${word}". Sadece JSON döndür, başka hiçbir şey yazma:
{"turkish":"Türkçe anlam","is_verb":true/false,"infinitive":"mastar form veya null","tense":"zaman adı veya null","person":"kişi veya null","irregular":true/false}`;

  const text = await callAnthropic(userContent, 150);
  const parsed = parseJsonObject(text) as Record<string, unknown>;
  const out: ReadingWordAnalysis = {
    turkish: typeof parsed.turkish === 'string' ? parsed.turkish : '?',
    is_verb: Boolean(parsed.is_verb),
    infinitive: typeof parsed.infinitive === 'string' ? parsed.infinitive : null,
    tense: typeof parsed.tense === 'string' ? parsed.tense : null,
    person: typeof parsed.person === 'string' ? parsed.person : null,
    irregular: Boolean(parsed.irregular),
  };
  wordCache[key] = out;
  return out;
}

/**
 * FNV-1a hash — kısa metin imzası (quizCache anahtarı).
 */
function fnv1a32(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

export function readingQuizKey(articleTitle: string, articleText: string): string {
  return `${fnv1a32(articleTitle + '\0' + articleText)}`;
}

export async function generateReadingQuiz(
  articleTitle: string,
  articleText: string
): Promise<ReadingQuizItem[]> {
  const k = readingQuizKey(articleTitle, articleText);
  if (quizCache[k]) return quizCache[k];

  const userContent = `Bu İspanyolca metinden 3 cloze sorusu üret. Sadece JSON array döndür:
[{"sentence":"boşluklu cümle _____","answer":"doğru çekim","verb":"mastar","tense":"zaman","hint":"Türkçe kural ipucu"}]

Metin: ${articleText}`;

  const text = await callAnthropic(userContent, 500);
  const arr = parseJsonArray(text) as unknown[];
  const items: ReadingQuizItem[] = [];
  for (const el of arr) {
    if (!el || typeof el !== 'object') continue;
    const o = el as Record<string, unknown>;
    items.push({
      sentence: String(o.sentence ?? ''),
      answer: String(o.answer ?? '').trim(),
      verb: String(o.verb ?? '').trim(),
      tense: String(o.tense ?? '').trim(),
      hint: String(o.hint ?? ''),
    });
  }
  if (items.length < 1) {
    throw new Error('Quiz üretilemedi');
  }
  quizCache[k] = items;
  return items;
}

export function hasAnthropicKey(): boolean {
  return getAnthropicKey() !== null;
}
