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

/** Sık kullanılan kalıp / collocation: hedef dilde ifade + Türkçe anlamı */
export interface GroqCommonPhrase {
  phrase: string;
  meaning: string;
}

/** Kelime Matrisi: aranan kelimenin isim, fiil, sıfat, zarf formları (ve anlamı). Bulunmayan form null. */
export interface WordMatrix {
  noun: string | null;
  verb: string | null;
  adjective: string | null;
  adverb: string | null;
}

/** Groq LLM kelime analiz cevabı (JSON). word + translation = kart için source/target. */
export interface GroqWordAnalysis {
  word?: string;
  phonetic?: string;
  translation?: string;
  examples?: GroqExampleItem[];
  /** Günlük hayatta sık kullanılan kalıplar / collocations */
  commonPhrases?: GroqCommonPhrase[];
  /** Kelime Matrisi: isim, fiil, sıfat, zarf formları (hedef dilde kelime ve anlamı; yoksa null) */
  wordMatrix?: WordMatrix;
  /** Eski format uyumluluğu (fallback) */
  source?: string;
  target?: string;
}

const GROQ_SYSTEM_MESSAGE =
  'Sen profesyonel bir dilbilimci ve sözlük editörüsün. Kullanıcının girdiği kelimenin dilini otomatik algıla ve hedeflenen dile çevir. Kullanıcının arattığı kelimenin dilbilgisi türü ne olursa olsun, o kelimenin kökünden türeyen diğer temel formları da bul: İsim (noun), Fiil (verb), Sıfat (adjective), Zarf (adverb). Bulunmayan formlar için null dön. Cevabını her zaman sadece şu JSON formatında ver, başka açıklama ekleme: { "word": "orijinal kelime", "phonetic": "/ipa telaffuzu/", "translation": "çevirisi", "examples": [ { "original": "hedef dilde örnek cümle", "turkish": "türkçe çevirisi" } ], "commonPhrases": [ { "phrase": "hedef dildeki kalıp", "meaning": "türkçe anlamı" } ], "wordMatrix": { "noun": "isim hali ve (anlamı)", "verb": "fiil hali ve (anlamı)", "adjective": "sıfat hali ve (anlamı)", "adverb": "zarf hali ve (anlamı)" } }. wordMatrix alanında: hedef dildeki kelime formunu ve parantez içinde Türkçe anlamını ver (örn. "beauté (güzellik)"); o form yoksa null yaz. Ayrıca commonPhrases içinde bu kelimenin günlük hayatta en çok kullanıldığı 3 popüler kalıbı döndür. Asla açıklama yapma, sadece geçerli bir JSON objesi döndür.';

/**
 * Groq API ile tek istekte kelime analizi (dil algılama + çeviri + IPA + örnekler).
 * API Key: .env.local içindeki VITE_GROQ_API_KEY kullanılır.
 */
export const fetchFromGroq = async (word: string, targetLanguage: string): Promise<GroqWordAnalysis> => {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    console.warn('[Sözlük] API Key bulunamadı: VITE_GROQ_API_KEY tanımlı değil (.env.local kontrol edin). Groq isteği atlanıyor.');
    return {};
  }
  console.log('[Sözlük] Aranan kelime:', word, '| Hedef dil:', targetLanguage);
  const userMessage = `Kullanıcı şu kelimeyi girdi: "${word}". Bu kelimenin dilini otomatik algıla ve hedeflenen dile (${targetLanguage}) çevir. Bu kelimenin kökünden türeyen isim, fiil, sıfat ve zarf formlarını wordMatrix içinde ver; yoksa null yaz. Cevabı şu JSON formatında ver: { "word": "orijinal kelime", "phonetic": "/ipa telaffuzu/", "translation": "çevirisi", "examples": [ { "original": "hedef dilde örnek cümle", "turkish": "türkçe çevirisi" } ], "commonPhrases": [ { "phrase": "hedef dildeki kalıp", "meaning": "türkçe anlamı" } ], "wordMatrix": { "noun": "isim ve (anlamı) veya null", "verb": "fiil ve (anlamı) veya null", "adjective": "sıfat ve (anlamı) veya null", "adverb": "zarf ve (anlamı) veya null" } }. commonPhrases içinde 3 popüler kalıbı da döndür.`;
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
        max_tokens: 1280,
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
    if (parsed.wordMatrix && typeof parsed.wordMatrix === 'object') {
      const wm = parsed.wordMatrix as unknown as Record<string, unknown>;
      parsed.wordMatrix = {
        noun: typeof wm.noun === 'string' ? wm.noun : null,
        verb: typeof wm.verb === 'string' ? wm.verb : null,
        adjective: typeof wm.adjective === 'string' ? wm.adjective : null,
        adverb: typeof wm.adverb === 'string' ? wm.adverb : null,
      };
    }
    console.log('[Sözlük] Groq yanıtı (ham):', {
      word: parsed.word,
      phonetic: parsed.phonetic,
      translation: parsed.translation,
      examplesCount: Array.isArray(parsed.examples) ? parsed.examples.length : 0,
      commonPhrasesCount: Array.isArray(parsed.commonPhrases) ? parsed.commonPhrases.length : 0,
      wordMatrix: parsed.wordMatrix ?? null,
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

/** Cümle Laboratuvarı — kelime/öbek analiz öğesi */
export interface SentenceAnalysisItem {
  word: string;
  base?: string;
  type?: string;
  grammarDetails?: string;
  translation?: string;
}

const GROQ_SENTENCE_ANALYSIS_SYSTEM =
  'Sen bir profesyonel dilbilimcisin. Kullanıcının verdiği cümleyi kelime kelime veya öbek öbek analiz et. Sonucu sadece şu JSON formatında dön (başka metin ekleme): { "items": [ { "word": "orijinal kelime veya öbek", "base": "mastar/kök hali", "type": "verb | noun | adjective | pronoun | preposition | article | adverb | conjunction | determiner | other", "grammarDetails": "zaman kipi, çoğul/tekil, cinsiyet vb. detaylar", "translation": "türkçe anlamı" } ] }. type alanında İngilizce dilbilgisi terimlerini kullan.';

/**
 * Cümle Laboratuvarı — Groq ile cümle sözdizimi analizi.
 * @param sentence - Analiz edilecek cümle
 * @param language - "Fransızca" veya "İspanyolca" vb.
 */
export async function analyzeSentence(
  sentence: string,
  language: string
): Promise<SentenceAnalysisItem[]> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    console.warn('[Cümle Lab] VITE_GROQ_API_KEY tanımlı değil.');
    return [];
  }
  const trimmed = sentence.trim();
  if (!trimmed) return [];

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
          { role: 'system', content: GROQ_SENTENCE_ANALYSIS_SYSTEM },
          { role: 'user', content: `Şu ${language} cümleyi analiz et ve her kelime/öbek için word, base, type, grammarDetails, translation alanlarını doldur. Cümle: "${trimmed}"` },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 2048,
      }),
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error('[Cümle Lab] Groq HTTP:', response.status, errText);
      return [];
    }
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') return [];
    const parsed = JSON.parse(raw) as { items?: SentenceAnalysisItem[] };
    const items = Array.isArray(parsed?.items) ? parsed.items : [];
    return items.filter((x) => x && typeof x.word === 'string');
  } catch (e) {
    console.error('[Cümle Lab] Groq istek hatası:', e);
    return [];
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
