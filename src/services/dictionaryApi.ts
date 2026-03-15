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

/** Etimoloji: akraba kelime (cognate) — dil kodu, kelime, ilişki açıklaması */
export interface EtymologyConnection {
  lang: string;
  word: string;
  relation: string;
}

/** Etimoloji: kök + diller arası akrabalıklar */
export interface GroqEtymology {
  root: string;
  connections: EtymologyConnection[];
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
  /** Tarihsel köken: Latince veya PIE kökü + akraba kelimeler (Fr, Es, En) */
  etymology?: GroqEtymology;
  /** Anlam kayması: 1-2 cümlelik eğlenceli bilgi (örn. 14. yüzyılda şu anlama geliyordu) */
  semanticShift?: string;
  /** Eski format uyumluluğu (fallback) */
  source?: string;
  target?: string;
}

const GROQ_SYSTEM_MESSAGE =
  'Sen profesyonel bir dilbilimci ve sözlük editörüsün. Kullanıcının girdiği kelimenin dilini otomatik algıla ve hedeflenen dile çevir. Kullanıcının arattığı kelimenin dilbilgisi türü ne olursa olsun, o kelimenin kökünden türeyen diğer temel formları da bul: İsim (noun), Fiil (verb), Sıfat (adjective), Zarf (adverb). Bulunmayan formlar için null dön. EK OLARAK: (1) Aratılan kelimenin Latince veya Proto-Hint-Avrupa (PIE) kökenini bul; bu kökten türeyen ve Fransızca, İspanyolca, İngilizce dillerinde hâlâ kullanılan akraba kelimeleri (cognates) "etymology" objesinde dön: { "root": "Latince veya PIE kökü", "connections": [ { "lang": "Fr" veya "Es" veya "En", "word": "o dildeki kelime", "relation": "kısa ilişki açıklaması" } ] }. (2) Kelimenin yüzyıllar içindeki anlam kaymasını (semantic shift) 1-2 cümleyle "semanticShift" alanında yaz (örn: "Bu kelime 14. yüzyılda aslında X anlamına geliyordu; zamanla Y anlamını kazanmıştır."). Cevabını her zaman sadece şu JSON formatında ver: { "word", "phonetic", "translation", "examples", "commonPhrases", "wordMatrix", "etymology": { "root", "connections": [{ "lang", "word", "relation" }] }, "semanticShift": "1-2 cümle" }. Asla açıklama ekleme, sadece geçerli JSON döndür.';

/** İngilizce için ek kurallar: IPA zorunlu, fiil ise 2-3 phrasal verb commonPhrases içinde. */
const GROQ_SYSTEM_MESSAGE_EN =
  'Sen profesyonel bir dilbilimci ve sözlük editörüsün. Hedef dil İngilizce veya Türkçe; kullanıcının girdiği kelimenin dilini otomatik algıla ve hedeflenen dile çevir. ÖNEMLİ — İngilizce: (1) IPA telaffuzu (phonetic) zorunlu. (2) Fiil ise commonPhrases içinde 2-3 phrasal verb. (3) etymology: aratılan kelimenin Latince veya PIE kökünü bul; Fransızca, İspanyolca, İngilizce akraba kelimeleri (cognates) connections listesinde dön: { "root": "köken", "connections": [ { "lang": "Fr|Es|En", "word": "kelime", "relation": "kısa açıklama" } ] }. (4) semanticShift: anlam kaymasını 1-2 cümle (Türkçe). Cevabı şu JSON ile ver: { "word", "phonetic", "translation", "examples", "commonPhrases", "wordMatrix", "etymology", "semanticShift" }. Sadece geçerli JSON döndür.';

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
  const isEnglish = targetLanguage === 'İngilizce';
  const systemContent = isEnglish ? GROQ_SYSTEM_MESSAGE_EN : GROQ_SYSTEM_MESSAGE;
  const userMessage = isEnglish
    ? `Kullanıcı şu kelimeyi girdi: "${word}". Dilini algıla; IPA (phonetic), translation, examples, commonPhrases, wordMatrix ver. Ayrıca etymology (Latince/PIE root + Fr/Es/En cognates) ve semanticShift (1-2 cümle anlam kayması) ekle.`
    : `Kullanıcı şu kelimeyi girdi: "${word}". Dilini algıla ve hedeflenen dile (${targetLanguage}) çevir. wordMatrix, commonPhrases, examples ver. Ayrıca etymology: bu kelimenin Latince veya Proto-Hint-Avrupa kökünü bul; Fransızca, İspanyolca, İngilizce akraba kelimeleri (cognates) connections listesinde dön. semanticShift: yüzyıllar içindeki anlam kaymasını 1-2 cümle Türkçe yaz.`;
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
          { role: 'system', content: systemContent },
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
    if (parsed.etymology && typeof parsed.etymology === 'object') {
      const e = parsed.etymology as unknown as { root?: string; connections?: unknown[] };
      parsed.etymology = {
        root: typeof e.root === 'string' ? e.root : '',
        connections: Array.isArray(e.connections)
          ? e.connections
              .filter((c): c is { lang?: string; word?: string; relation?: string } => c != null && typeof c === 'object')
              .map((c) => ({
                lang: typeof c.lang === 'string' ? c.lang : '',
                word: typeof c.word === 'string' ? c.word : '',
                relation: typeof c.relation === 'string' ? c.relation : '',
              }))
          : [],
      };
    }
    if (parsed.semanticShift !== undefined && typeof parsed.semanticShift !== 'string') {
      parsed.semanticShift = parsed.semanticShift != null ? String(parsed.semanticShift) : undefined;
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

/** AI Shadowing — telaffuz karşılaştırma sonucu */
export interface ShadowingResult {
  score: number;
  advice: string;
  wordCorrect: boolean[];
}

const GROQ_SHADOWING_SYSTEM =
  'Sen bir dil öğretmenisin. Kullanıcı orijinal cümleyi sesli okumuş; sen sadece telaffuz/doğallık analizi yapacaksın. Orijinal cümledeki her kelime/öbek için kullanıcının okuduğu metinle karşılaştırıp doğru mu yanlış mı (telaffuz, yutulan harf, vurgu) karar ver. Çok kısa ve teşvik edici ol. Cevabı SADECE şu JSON formatında ver, başka metin ekleme: { "wordCorrect": [her kelime için true veya false, sırayla], "score": 0-100 arası doğallık skoru, "advice": "Bir cümlelik kısa, teşvik edici tavsiye (Türkçe)" }. wordCorrect dizisinin uzunluğu orijinal kelime sayısıyla aynı olmalı.';

/**
 * AI Shadowing — orijinal cümle ile kullanıcının okuduğu metni Groq ile karşılaştırır.
 * @param originalSentence - Orijinal cümle (analiz edilen)
 * @param userTranscript - Kullanıcının sesinin metne dönümü
 * @param language - Dil (Fransızca, İspanyolca, İngilizce)
 * @param words - Orijinal cümlenin kelime/öbek listesi (sırayla)
 */
export async function analyzeShadowing(
  originalSentence: string,
  userTranscript: string,
  language: string,
  words: string[]
): Promise<ShadowingResult | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') return null;
  if (!words.length) return null;

  try {
    const wordList = words.map((w) => `"${w}"`).join(', ');
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: GROQ_SHADOWING_SYSTEM },
          {
            role: 'user',
            content: `Orijinal cümle (${language}): "${originalSentence}". Kullanıcının okuduğu: "${userTranscript}". Orijinal cümlenin kelimeleri (sırayla): [${wordList}]. Telaffuz hatalarını, yutulan harfleri veya vurgu yanlışlarını dikkate alarak her kelime için wordCorrect (true/false), 0-100 doğallık score ve kısa teşvik edici advice ver. Sadece JSON döndür.`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 512,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') return null;
    const parsed = JSON.parse(raw) as { wordCorrect?: boolean[]; score?: number; advice?: string };
    const wordCorrect = Array.isArray(parsed.wordCorrect)
      ? parsed.wordCorrect.slice(0, words.length)
      : words.map(() => true);
    const score = typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 70;
    const advice = typeof parsed.advice === 'string' ? parsed.advice.trim() : 'Tekrar dinleyip deneyebilirsin.';
    return { score, advice, wordCorrect };
  } catch (e) {
    console.error('[Shadowing] Groq hatası:', e);
    return null;
  }
}

/** YouTube altyazı analizi — gramer yapıları ve kelimeler (zaman damgalı) */
export interface YouTubeGrammarItem {
  name: string;
  example: string;
  timestampSeconds: number;
}

export interface YouTubeVocabularyItem {
  word: string;
  meaning: string;
  timestampSeconds: number;
}

export interface YouTubeAnalysisResult {
  grammarStructures: YouTubeGrammarItem[];
  vocabulary: YouTubeVocabularyItem[];
  /** Tıklanabilir cümleler (timestamp + metin) — Cümle Lab'a gönderilebilir */
  sampleSentences: { text: string; timestampSeconds: number }[];
}

const GROQ_YOUTUBE_SUBTITLE_SYSTEM =
  'Sen bir dil öğretmenisin. Verilen video altyazı metnini analiz et. En önemli 3 gramer yapısını (örn: Past Perfect, Gerunds, Subjunctive) ve öğrenilmesi gereken 5 anahtar kelimeyi tespit et. Her yapı ve kelime için altyazıdaki geçtiği anı saniye cinsinden timestamp olarak ver. Ayrıca analiz ettiğin 3-5 örnek cümleyi (tam metin + timestamp) listele ki kullanıcı tıklayıp Cümle Laboratuvarı\'na gönderebilsin. Cevabı SADECE şu JSON formatında ver: { "grammarStructures": [ { "name": "yapı adı", "example": "örnek cümle", "timestampSeconds": saniye } ], "vocabulary": [ { "word": "kelime", "meaning": "Türkçe anlam", "timestampSeconds": saniye } ], "sampleSentences": [ { "text": "cümle metni", "timestampSeconds": saniye } ] }. timestampSeconds sayı olmalı, 0 veya pozitif.';

/**
 * YouTube altyazı metnini Groq ile analiz eder: gramer yapıları, kelimeler, örnek cümleler.
 */
export async function analyzeYouTubeSubtitles(
  subtitleText: string,
  _videoId?: string
): Promise<YouTubeAnalysisResult | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') return null;
  const trimmed = subtitleText.trim();
  if (!trimmed || trimmed.length < 50) return null;

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
          { role: 'system', content: GROQ_YOUTUBE_SUBTITLE_SYSTEM },
          {
            role: 'user',
            content: `Bu video altyazısındaki en önemli 3 gramer yapısını ve öğrenilmesi gereken 5 anahtar kelimeyi tespit et. Her biri için videodaki zaman damgasını (saniye) belirt. Altyazı metni:\n\n${trimmed.slice(0, 12000)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') return null;
    const parsed = JSON.parse(raw) as {
      grammarStructures?: Array<{ name?: string; example?: string; timestampSeconds?: number }>;
      vocabulary?: Array<{ word?: string; meaning?: string; timestampSeconds?: number }>;
      sampleSentences?: Array<{ text?: string; timestampSeconds?: number }>;
    };
    const grammarStructures: YouTubeGrammarItem[] = (parsed.grammarStructures ?? [])
      .filter((x) => x && typeof x.name === 'string')
      .slice(0, 3)
      .map((x) => ({
        name: String(x.name),
        example: typeof x.example === 'string' ? x.example : '',
        timestampSeconds: typeof x.timestampSeconds === 'number' ? Math.max(0, x.timestampSeconds) : 0,
      }));
    const vocabulary: YouTubeVocabularyItem[] = (parsed.vocabulary ?? [])
      .filter((x) => x && typeof x.word === 'string')
      .slice(0, 5)
      .map((x) => ({
        word: String(x.word),
        meaning: typeof x.meaning === 'string' ? x.meaning : '',
        timestampSeconds: typeof x.timestampSeconds === 'number' ? Math.max(0, x.timestampSeconds) : 0,
      }));
    const sampleSentences = (parsed.sampleSentences ?? [])
      .filter((x) => x && typeof x.text === 'string')
      .slice(0, 8)
      .map((x) => ({
        text: String(x.text).trim(),
        timestampSeconds: typeof x.timestampSeconds === 'number' ? Math.max(0, x.timestampSeconds) : 0,
      }));
    return { grammarStructures, vocabulary, sampleSentences };
  } catch (e) {
    console.error('[YouTube Lab] Groq hatası:', e);
    return null;
  }
}

/** Groq word+translation → SearchResult source/target (yön bilgisiyle) */
export function groqToSourceTarget(
  groq: GroqWordAnalysis,
  dir: 'tr-fr' | 'fr-tr' | 'tr-es' | 'es-tr' | 'tr-en' | 'en-tr'
): { source: string; target: string } | null {
  const word = groq.word?.trim();
  const translation = groq.translation?.trim();
  if (!word || !translation) return null;
  if (dir === 'fr-tr' || dir === 'es-tr' || dir === 'en-tr') {
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
  const isEnglishTab = direction === 'tr-en' || direction === 'en-tr';
  if (isFrenchTab) return isTr ? { from: 'tr', to: 'fr' } : { from: 'fr', to: 'tr' };
  if (isSpanishTab) return isTr ? { from: 'tr', to: 'es' } : { from: 'es', to: 'tr' };
  if (isEnglishTab) return isTr ? { from: 'tr', to: 'en' } : { from: 'en', to: 'tr' };
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

  const lang: 'fr' | 'es' | 'en' = to === 'fr' || from === 'fr' ? 'fr' : to === 'en' || from === 'en' ? 'en' : 'es';
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
