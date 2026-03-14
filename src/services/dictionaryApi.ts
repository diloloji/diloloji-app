/**
 * Sözlük — MyMemory çeviri API + Groq kelime analizi.
 * Langpair: hedef dil Türkçe (fr|tr / es|tr); metin Türkçe ise tr|fr veya tr|es.
 */

import type { DictDirection } from '../data/mockDictionary';
import type { SearchResult } from '../data/mockDictionary';

/** Groq LLM kelime analiz cevabı (JSON). */
export interface GroqWordAnalysis {
  phonetic?: string;
  examples?: string[];
}

/**
 * Groq API ile kelime analizi (fonetik + örnek cümleler).
 * language: "Fransızca" veya "İspanyolca"
 * Anahtar yoksa veya hata olursa boş obje döner; böylece "Yükleniyor" sonsuza kadar kalmaz.
 */
export const fetchFromGroq = async (word: string, language: string): Promise<GroqWordAnalysis> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    console.warn('VITE_GROQ_API_KEY tanımlı değil; Groq isteği atlanıyor.');
    return {};
  }
  console.log('Groq isteği atılıyor:', word);
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
          { role: 'system', content: 'Sen profesyonel bir dilbilimci ve sözlük editörüsün. Sadece JSON döndür.' },
          { role: 'user', content: `${language} '${word}' kelimesini analiz et ve sonucu JSON formatında döndür.` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq hatası:', response.status, errText);
      return {};
    }
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') return {};
    try {
      return JSON.parse(raw) as GroqWordAnalysis;
    } catch {
      return {};
    }
  } catch (error) {
    console.error('Groq hatası:', error);
    return {};
  }
};

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
