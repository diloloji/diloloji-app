/**
 * Sözlük — MyMemory çeviri API + Groq kelime analizi.
 * Langpair: hedef dil Türkçe (fr|tr / es|tr); metin Türkçe ise tr|fr veya tr|es.
 */

import type { DictDirection } from '../data/mockDictionary';
import type { SearchResult } from '../data/mockDictionary';

/** Groq Playground ile uyumlu tek örnek: original + turkish */
export interface GroqExampleItem {
  original: string;
  turkish: string;
}

/** Groq LLM kelime analiz cevabı (JSON). word + translation = kart için source/target. */
export interface GroqWordAnalysis {
  word?: string;
  phonetic?: string;
  translation?: string;
  examples?: GroqExampleItem[];
  /** Eski format uyumluluğu (fallback) */
  source?: string;
  target?: string;
}

const GROQ_SYSTEM_MESSAGE =
  'Sen profesyonel bir dilbilimci ve sözlük editörüsün. Sana verilen kelimeleri her zaman şu JSON formatında cevapla: { "word": "kelime", "phonetic": "/ipa/", "translation": "türkçe anlam", "examples": [{"original": "örnek cümle", "turkish": "çevirisi"}] }. Asla açıklama yapma, sadece geçerli bir JSON objesi döndür.';

/**
 * Groq API ile kelime analizi (llama-3.3-70b-versatile, json_object).
 * Playground'daki sistem mesajı ve formata uyumlu.
 * API Key: .env.local içindeki VITE_GROQ_API_KEY kullanılır (import.meta.env ile).
 */
export const fetchFromGroq = async (word: string, targetLanguage: string): Promise<GroqWordAnalysis> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    console.warn('[Sözlük] API Key bulunamadı: VITE_GROQ_API_KEY tanımlı değil (.env.local kontrol edin). Groq isteği atlanıyor.');
    return {};
  }
  console.log('[Sözlük] Aranan kelime:', word, '| Hedef dil:', targetLanguage);
  const userMessage = `${targetLanguage} '${word}' kelimesini analiz et ve sonucu JSON formatında döndür.`;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: GROQ_SYSTEM_MESSAGE },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('[Sözlük] Groq HTTP hatası:', response.status, errText || response.statusText);
      return {};
    }
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') {
      console.warn('[Sözlük] Groq boş veya geçersiz cevap: choices[0].message.content yok veya string değil.');
      return {};
    }
    const parsed = JSON.parse(raw) as GroqWordAnalysis;
    console.log('[Sözlük] Groq yanıtı (ham):', {
      word: parsed.word,
      phonetic: parsed.phonetic,
      translation: parsed.translation,
      examplesCount: Array.isArray(parsed.examples) ? parsed.examples.length : 0,
    });
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('[Sözlük] Groq JSON parse hatası:', error);
    } else {
      console.error('[Sözlük] Groq istek hatası:', error);
    }
    return {};
  }
};

/** Fiil çevirisi için Groq yanıtı — sadece mastar (-mak/-mek) */
export interface GroqVerbTranslation {
  translation?: string;
}

const GROQ_VERB_TRANSLATION_SYSTEM =
  'Sen profesyonel bir dilbilimci ve sözlük editörüsün. Sana verilen yabancı dildeki fiilin Türkçe karşılığını kesinlikle mastar halinde (-mak/-mek ekiyle) çevir. Asla isim formu kullanma. Sonucu her zaman şu JSON formatında döndür: { "translation": "çeviri" }';

/**
 * Fiil Laboratuvarı için Groq ile fiil çevirisi (yalnızca mastar: -mak/-mek).
 * @param verb - Fiil (örn. penser, hablar)
 * @param language - "Fransızca" veya "İspanyolca"
 */
export async function fetchVerbTranslationFromGroq(
  verb: string,
  language: string
): Promise<GroqVerbTranslation> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    return {};
  }
  const userMessage = `${language} dilindeki "${verb}" fiilini çevir.`;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: GROQ_VERB_TRANSLATION_SYSTEM },
          { role: 'user', content: userMessage },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_tokens: 128,
      }),
    });
    if (!response.ok) return {};
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') return {};
    const parsed = JSON.parse(raw) as GroqVerbTranslation;
    return parsed;
  } catch {
    return {};
  }
}

/** Groq word+translation → SearchResult source/target (yön bilgisiyle) */
export function groqToSourceTarget(
  groq: GroqWordAnalysis,
  dir: 'tr-fr' | 'fr-tr' | 'tr-es' | 'es-tr'
): { source: string; target: string } | null {
  const word = groq.word?.trim();
  const translation = groq.translation?.trim();
  if (!word || !translation) return null;
  if (dir === 'fr-tr' || dir === 'es-tr') {
    return { source: word, target: translation };
  }
  return { source: translation, target: word };
}

const MYMEMORY_BASE = 'https://api.mymemory.translated.net/get';

interface MyMemoryResponse {
  responseData?: {
    translatedText?: string;
    match?: number;
  };
  matches?: Array<{
    segment?: string;
    translation?: string;
    quality?: string;
  }>;
  responseStatus?: number;
  responseDetails?: string;
}

const TURKISH_CHARS = /[ğüşıöçĞÜŞİÖÇ]/;
const FRENCH_CHARS = /[éèêëàâçîïôùûœü]/i;
const SPANISH_CHARS = /[ñáéíóúü¿¡]/i;

function isLikelyTurkish(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (TURKISH_CHARS.test(t)) return true;
  const lower = t.toLowerCase();
  const turkishWords = ['ve', 'bir', 'bu', 'için', 'ile', 'gibi', 'kadar', 'mi', 'mı', 'mu', 'mü', 'da', 'de', 'ta', 'te', 'ne', 'nasıl', 'var', 'yok', 'gitmek', 'olmak', 'yapmak', 'gelmek', 'almak', 'demek', 'bilmek', 'istemek', 'daha', 'çok', 'en', 'şey', 'zaman', 'şimdi', 'sonra', 'önce', 'her', 'bazı', 'tüm', 'kendi', 'merhaba', 'evet', 'hayır'];
  const firstWord = lower.split(/\s+/)[0].replace(/[^a-zğüşıöç]/gi, '');
  return turkishWords.some((w) => firstWord === w || lower.startsWith(w + ' '));
}

function getLangPair(direction: DictDirection, word: string): { from: string; to: string } {
  const trimmed = word.trim();
  const isTr = isLikelyTurkish(trimmed);
  const isFrenchTab = direction === 'tr-fr' || direction === 'fr-tr';
  const isSpanishTab = direction === 'tr-es' || direction === 'es-tr';
  if (isFrenchTab) return isTr ? { from: 'tr', to: 'fr' } : { from: 'fr', to: 'tr' };
  if (isSpanishTab) return isTr ? { from: 'tr', to: 'es' } : { from: 'es', to: 'tr' };
  return { from: 'tr', to: 'fr' };
}

function resultLooksLikeSourceLanguage(translatedText: string, fromLang: string): boolean {
  const t = translatedText.trim();
  if (TURKISH_CHARS.test(t)) return false;
  if (fromLang === 'fr' && FRENCH_CHARS.test(t)) return true;
  if (fromLang === 'es' && SPANISH_CHARS.test(t)) return true;
  return false;
}

function isValidResult(
  translatedText: string,
  source: string,
  fromLang: string,
  toLang: string
): boolean {
  const normalizedInput = source.toLowerCase().replace(/\s+/g, ' ');
  const normalizedTranslation = translatedText.toLowerCase().replace(/\s+/g, ' ');
  if (normalizedInput === normalizedTranslation) return false;
  if (toLang === 'tr' && resultLooksLikeSourceLanguage(translatedText, fromLang)) return false;
  return true;
}

async function fetchTranslation(
  word: string,
  langpair: string,
  useMt: boolean
): Promise<MyMemoryResponse | null> {
  const url = `${MYMEMORY_BASE}?q=${encodeURIComponent(word)}&langpair=${encodeURIComponent(langpair)}${useMt ? '&mt=1' : ''}`;
  const res = await fetch(url);
  const data = (await res.json()) as MyMemoryResponse;
  return data;
}

/**
 * MyMemory API ile kelime çevirir; sonucu SearchResult formatına dönüştürür.
 * Hatalı veya aynı kelime dönerse &mt=1 ile tekrar dener; yine geçersizse null.
 */
export async function translateWord(
  word: string,
  direction: DictDirection
): Promise<SearchResult | null> {
  const trimmed = word.trim();
  if (!trimmed) return null;

  const { from, to } = getLangPair(direction, trimmed);
  const langpair = `${from}|${to}`;

  let data = await fetchTranslation(trimmed, langpair, false);
  let translatedText = data?.responseData?.translatedText?.trim();

  if (!translatedText || !isValidResult(translatedText, trimmed, from, to)) {
    data = await fetchTranslation(trimmed, langpair, true);
    translatedText = data?.responseData?.translatedText?.trim();
    if (!translatedText || !isValidResult(translatedText, trimmed, from, to)) return null;
  }

  const lang: 'fr' | 'es' = to === 'fr' || from === 'fr' ? 'fr' : 'es';
  const firstMatch = Array.isArray(data?.matches) && data.matches.length > 0 ? data.matches[0] : null;

  const result: SearchResult = {
    source: trimmed,
    target: translatedText,
    type: 'kelime',
    lang,
    phonetic: undefined,
    exampleSource: firstMatch?.segment,
    exampleTarget: firstMatch?.translation,
    synonyms: undefined,
    antonyms: undefined,
    prefix: undefined,
    root: undefined,
    targetVerb: undefined,
  };

  return result;
}
