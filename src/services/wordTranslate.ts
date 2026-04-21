/**
 * Okuma Modu tooltip'i için "İspanyolca kelime → Türkçe anlam" çevirisi.
 *
 * Öncelik: Anthropic Claude (VITE_ANTHROPIC_API_KEY varsa, tarayıcıdan doğrudan çağrı).
 * Yoksa: mevcut Groq kelime analiz servisine (analyzeWord) düşer.
 *
 * Cevap şeması (Anthropic):
 *   { "word": "comieron", "turkish": "yediler", "is_verb": true,
 *     "infinitive": "comer", "tense": "Pretérito Indefinido",
 *     "person": "ellos/ellas", "irregular": false }
 *   Fiil değilse:
 *   { "word": "rápido", "turkish": "hızlı", "is_verb": false }
 */

import { analyzeWord } from './dictionaryApi';

export type TenseLabel =
  | 'Presente'
  | 'Pretérito Indefinido'
  | 'Pretérito Imperfecto'
  | 'Pretérito Perfecto'
  | 'Futuro Simple'
  | 'Condicional'
  | 'Subjuntivo Presente'
  | 'Subjuntivo Imperfecto'
  | 'Imperativo';

export type PersonLabel =
  | 'yo'
  | 'tú'
  | 'él/ella'
  | 'nosotros'
  | 'vosotros'
  | 'ellos/ellas';

export interface WordTip {
  /** Orijinal kelime (opsiyonel — LLM'den dönerse). */
  word?: string;
  /** Türkçe karşılık. '?' ise "emin değil" demektir. */
  tr: string;
  /** Fiil mi? */
  isVerb?: boolean;
  /** Fiilse mastar. */
  infinitive?: string;
  /** Fiilse zaman etiketi. */
  tenseLabel?: TenseLabel | string;
  /** Fiilse şahıs. */
  person?: PersonLabel | string;
  /** Fiilse düzensiz mi? */
  irregular?: boolean;
}

/* ───────────────────── Anthropic ───────────────────── */

const ANTH_SYSTEM =
  'Sen bir İspanyolca dil analizcisisin. Sana bir İspanyolca metin veya tek kelime gönderilecek, sen de kelimenin anlamını JSON olarak döndüreceksin. Kurallar: (1) Sadece JSON döndür, başka hiçbir şey yazma. (2) Markdown kod bloğu koyma, direkt { ile başlasın. (3) Fiil ise şu formatta dön: {"word":"comieron","turkish":"yediler","is_verb":true,"infinitive":"comer","tense":"Pretérito Indefinido","person":"ellos/ellas","irregular":false}. (4) Fiil değilse: {"word":"rápido","turkish":"hızlı","is_verb":false}. (5) tense değerleri her zaman şunlardan biri olsun: Presente, Pretérito Indefinido, Pretérito Imperfecto, Pretérito Perfecto, Futuro Simple, Condicional, Subjuntivo Presente, Subjuntivo Imperfecto, Imperativo. (6) person değerleri: yo, tú, él/ella, nosotros, vosotros, ellos/ellas. (7) Emin olamadığın durumlarda "turkish": "?" yaz, tahmin etme.';

interface AnthRaw {
  word?: string;
  turkish?: string;
  is_verb?: boolean;
  infinitive?: string | null;
  tense?: string | null;
  person?: string | null;
  irregular?: boolean;
}

function mapAnthropicToTip(raw: AnthRaw): WordTip | null {
  if (!raw || typeof raw.turkish !== 'string') return null;
  const tip: WordTip = {
    word: raw.word || undefined,
    tr: raw.turkish,
    isVerb: Boolean(raw.is_verb),
  };
  if (raw.is_verb) {
    tip.infinitive = raw.infinitive || undefined;
    tip.tenseLabel = raw.tense || undefined;
    tip.person = raw.person || undefined;
    tip.irregular = typeof raw.irregular === 'boolean' ? raw.irregular : undefined;
  }
  return tip;
}

async function translateWithAnthropic(word: string, context?: string): Promise<WordTip | null> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') return null;
  const userMsg = context
    ? `Cümle bağlamı: "${context}". Bu cümledeki "${word}" kelimesini analiz et.`
    : `"${word}" kelimesini analiz et.`;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: 200,
        system: ANTH_SYSTEM,
        messages: [{ role: 'user', content: userMsg }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined = data?.content?.[0]?.text;
    if (!text) return null;
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart < 0 || jsonEnd < 0) return null;
    const raw = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as AnthRaw;
    return mapAnthropicToTip(raw);
  } catch {
    return null;
  }
}

/* ───────────────────── Groq fallback ───────────────────── */

async function translateWithGroq(word: string, context?: string): Promise<WordTip | null> {
  try {
    const res = await analyzeWord(word, 'İspanyolca', context);
    if (!res?.translation) return null;
    const isVerb = (res.type || '').toLowerCase().includes('verb');
    return {
      word: res.word || word,
      tr: res.translation,
      isVerb,
      infinitive: isVerb ? (res.base || undefined) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Bir kelimeyi Türkçe'ye çevir.
 * Önce Anthropic'i dener (env key varsa), başarısızsa Groq'a düşer.
 */
export async function translateWordToTr(
  word: string,
  context?: string
): Promise<WordTip | null> {
  const trimmed = (word || '').trim();
  if (!trimmed) return null;
  const anth = await translateWithAnthropic(trimmed, context);
  if (anth) return anth;
  return translateWithGroq(trimmed, context);
}
