/**
 * Ses ile Çekimleme — Web Speech API üzerine kurulu tek modül.
 *
 * İki ana özellik:
 *  1. TTS (Text-to-Speech): speak(text, opts)
 *     - En iyi İspanyolca (veya verilen dil) sesini seçer
 *     - voiceschanged event'ine bağlı tembel yükleme
 *     - Kullanıcı ayarından `autoSpeak` kapalıysa `speakAuto()` çağrıları sessiz geçer
 *  2. STT (Speech-to-Text): startListening(opts)
 *     - maxAlternatives=3; tanınan tüm alternatifleri döner
 *     - Tarayıcı desteklemiyorsa `sttSupported === false`, Firefox gibi
 *
 * localStorage:
 *   diloloji-speech-settings → { autoSpeak: boolean, lang: 'es-ES' | 'fr-FR' | ... }
 */

/* ───────────────────── Destek algılama ───────────────────── */

export const ttsSupported: boolean =
  typeof window !== 'undefined' &&
  typeof window.speechSynthesis !== 'undefined' &&
  typeof SpeechSynthesisUtterance !== 'undefined';

/* Minimal Web Speech Recognition tip bildirimleri — TS dom.lib tam tipleri içermiyor. */
interface MinimalRecognitionAlternative {
  transcript: string;
  confidence?: number;
}
interface MinimalRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: MinimalRecognitionAlternative;
}
interface MinimalRecognitionEvent {
  resultIndex: number;
  results: { [index: number]: MinimalRecognitionResult; readonly length: number };
}
interface MinimalRecognitionErrorEvent {
  error: string;
  message?: string;
}
interface MinimalRecognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((ev: MinimalRecognitionErrorEvent) => void) | null;
  onresult: ((ev: MinimalRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => MinimalRecognition;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  /** Safari: webkitSpeechRecognition; Chromium: SpeechRecognition */
  const SR =
    (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition ||
    null;
  return SR ?? null;
}

export const sttSupported: boolean =
  typeof window !== 'undefined' && getRecognitionCtor() !== null;

/* ───────────────────── Ayarlar (localStorage) ───────────────────── */

export type SpeechLang = 'es-ES' | 'fr-FR' | 'en-US' | 'tr-TR';

export interface SpeechSettings {
  /** Doğru cevap sonrası otomatik okuma açık mı? */
  autoSpeak: boolean;
}

const SETTINGS_KEY = 'diloloji-speech-settings';

const DEFAULT_SETTINGS: SpeechSettings = {
  autoSpeak: true,
};

export function getSpeechSettings(): SpeechSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<SpeechSettings>;
    return {
      autoSpeak: typeof parsed.autoSpeak === 'boolean' ? parsed.autoSpeak : DEFAULT_SETTINGS.autoSpeak,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function setSpeechSettings(patch: Partial<SpeechSettings>): SpeechSettings {
  const current = getSpeechSettings();
  const next: SpeechSettings = { ...current, ...patch };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
      window.dispatchEvent(
        new CustomEvent<SpeechSettings>('diloloji:speech-settings', { detail: next })
      );
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function subscribeSpeechSettings(listener: (s: SpeechSettings) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<SpeechSettings>).detail;
    if (detail) listener(detail);
  };
  const storageHandler = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY) listener(getSpeechSettings());
  };
  window.addEventListener('diloloji:speech-settings', handler);
  window.addEventListener('storage', storageHandler);
  return () => {
    window.removeEventListener('diloloji:speech-settings', handler);
    window.removeEventListener('storage', storageHandler);
  };
}

/* ───────────────────── TTS ───────────────────── */

let _voicesCache: SpeechSynthesisVoice[] | null = null;
let _voicesReadyPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/**
 * Sesleri async yükler. `voiceschanged` bir kez dinlenir; cache sonrasında
 * `getVoicesSync` ile anında döner.
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported) return Promise.resolve([]);
  if (_voicesCache && _voicesCache.length > 0) return Promise.resolve(_voicesCache);
  if (_voicesReadyPromise) return _voicesReadyPromise;

  _voicesReadyPromise = new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const initial = synth.getVoices();
    if (initial && initial.length > 0) {
      _voicesCache = initial;
      resolve(initial);
      return;
    }
    const onChange = () => {
      const list = synth.getVoices();
      if (list && list.length > 0) {
        _voicesCache = list;
        synth.removeEventListener?.('voiceschanged', onChange);
        resolve(list);
      }
    };
    synth.addEventListener?.('voiceschanged', onChange);
    // Güvenlik: 2 sn sonra hâlâ boşsa boş liste ile resolve et
    setTimeout(() => {
      if (_voicesCache) return;
      const list = synth.getVoices();
      _voicesCache = list || [];
      resolve(_voicesCache);
    }, 2000);
  });

  return _voicesReadyPromise;
}

/** Verilen dil için en iyi sesi seçer (localService tercihli). */
export function pickBestVoice(
  voices: SpeechSynthesisVoice[],
  lang: SpeechLang
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;
  const prefix = lang.slice(0, 2);
  return (
    voices.find((v) => v.lang === lang && v.localService) ||
    voices.find((v) => v.lang === lang) ||
    voices.find((v) => v.lang.startsWith(prefix) && v.localService) ||
    voices.find((v) => v.lang.startsWith(prefix)) ||
    null
  );
}

export interface SpeakOptions {
  lang?: SpeechLang;
  rate?: number;
  pitch?: number;
  /** true ise ayarlar autoSpeak=false olduğunda sessiz kalır */
  respectAutoSetting?: boolean;
}

/**
 * Metni seslendir. Desteklenmiyorsa sessizce çıkar.
 * `respectAutoSetting: true` → kullanıcı otomatik okumayı kapatmışsa hiç çalmaz.
 */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (!ttsSupported) return;
  const trimmed = (text || '').trim();
  if (!trimmed) return;
  if (opts.respectAutoSetting && !getSpeechSettings().autoSpeak) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const utter = new SpeechSynthesisUtterance(trimmed);
  utter.lang = opts.lang ?? 'es-ES';
  utter.rate = typeof opts.rate === 'number' ? opts.rate : 0.85;
  utter.pitch = typeof opts.pitch === 'number' ? opts.pitch : 1;

  const voices = _voicesCache || synth.getVoices();
  if (voices && voices.length > 0) {
    const v = pickBestVoice(voices, utter.lang as SpeechLang);
    if (v) utter.voice = v;
    synth.speak(utter);
  } else {
    loadVoices().then((list) => {
      const v = pickBestVoice(list, utter.lang as SpeechLang);
      if (v) utter.voice = v;
      try {
        synth.speak(utter);
      } catch {
        /* ignore */
      }
    });
  }
}

/** Ayarlara saygı göstererek speak — `respectAutoSetting: true` kısayolu. */
export function speakAuto(text: string, opts: SpeakOptions = {}): void {
  speak(text, { ...opts, respectAutoSetting: true });
}

/** Çalmakta olan sesi durdurur. */
export function cancelSpeaking(): void {
  if (!ttsSupported) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

/* ───────────────────── STT ───────────────────── */

export type ListenErrorCode =
  | 'unsupported'
  | 'no-speech'
  | 'aborted'
  | 'not-allowed'
  | 'audio-capture'
  | 'network'
  | 'unknown';

export interface ListenResult {
  /** maxAlternatives kadar sonuç; tümü lower-case + trim edilmiş. */
  alternatives: string[];
  /** En yüksek güvenle dönen alternatif (ilki). */
  transcript: string;
}

export interface ListenError {
  code: ListenErrorCode;
  message: string;
}

export interface ListenHandle {
  /** Tanıma sonucu veya hata. */
  promise: Promise<{ ok: true; result: ListenResult } | { ok: false; error: ListenError }>;
  /** Kullanıcı iptali için manuel durdurma. */
  stop: () => void;
}

export interface ListenOptions {
  lang?: SpeechLang;
  maxAlternatives?: number;
  /** true ise partial sonuçlar gelir (interimResults). Varsayılan: true (alıştırma için anlık metin). */
  interim?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  /** Partial sonuçlar; interim=true ise tetiklenir. */
  onInterim?: (text: string) => void;
}

/**
 * Mikrofondan tek bir ifade dinler, alternatifleri döner.
 * Tarayıcı desteklemiyorsa promise `{ ok:false, code:'unsupported' }` ile resolve olur.
 */
export function startListening(opts: ListenOptions = {}): ListenHandle {
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    return {
      stop: () => {},
      promise: Promise.resolve({
        ok: false,
        error: { code: 'unsupported', message: 'Tarayıcı mikrofon tanımasını desteklemiyor.' },
      }),
    };
  }

  const rec = new Ctor();
  const lang = opts.lang ?? 'es-ES';
  rec.lang = lang;
  const useInterim = opts.interim !== false;
  rec.interimResults = useInterim;
  rec.maxAlternatives = typeof opts.maxAlternatives === 'number' ? opts.maxAlternatives : 3;
  /** interim açıkken sürekli dinle; kullanıcı Mic ile durdurana kadar parçalar gelir */
  rec.continuous = useInterim;

  let stopped = false;
  let settled = false;
  /** Manuel stop / final gelmeden önce son ara metin */
  let lastInterimText = '';

  const promise = new Promise<
    { ok: true; result: ListenResult } | { ok: false; error: ListenError }
  >((resolve) => {
    const settle = (
      v: { ok: true; result: ListenResult } | { ok: false; error: ListenError }
    ) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };

    rec.onstart = () => opts.onStart?.();
    rec.onend = () => {
      opts.onEnd?.();
      if (!settled && lastInterimText.trim()) {
        const t = lastInterimText.toLowerCase().trim();
        settle({ ok: true, result: { alternatives: [t], transcript: t } });
        return;
      }
      if (!settled) {
        settle({ ok: false, error: { code: 'no-speech', message: 'Ses algılanmadı.' } });
      }
    };
    rec.onerror = (ev: MinimalRecognitionErrorEvent) => {
      console.error('[SpeechRecognition] onerror', ev.error, ev.message ?? '');
      /** stop() çağrısında tarayıcı genelde "aborted" gönderir; hata olarak çözmeyelim, onend biter. */
      if (ev.error === 'aborted') {
        return;
      }
      const code: ListenErrorCode =
        ev.error === 'no-speech'
          ? 'no-speech'
          : ev.error === 'aborted'
            ? 'aborted'
            : ev.error === 'not-allowed'
              ? 'not-allowed'
              : ev.error === 'audio-capture'
                ? 'audio-capture'
                : ev.error === 'network'
                  ? 'network'
                  : 'unknown';
      settle({ ok: false, error: { code, message: ev.message || ev.error || 'Tanıma hatası.' } });
    };
    rec.onresult = (ev: MinimalRecognitionEvent) => {
      if (!ev.results || ev.results.length === 0) return;
      const start = typeof ev.resultIndex === 'number' ? ev.resultIndex : 0;
      let lastFinal: MinimalRecognitionResult | null = null;

      for (let i = start; i < ev.results.length; i++) {
        const result = ev.results[i];
        if (!result) continue;
        if (result.isFinal) {
          lastFinal = result;
        } else if (useInterim) {
          const raw = (result[0]?.transcript ?? '').trim();
          if (raw) {
            lastInterimText = raw;
            opts.onInterim?.(raw);
          }
        }
      }

      if (!lastFinal) return;

      const alternatives: string[] = [];
      for (let i = 0; i < lastFinal.length; i++) {
        const t = lastFinal[i]?.transcript;
        if (typeof t === 'string') {
          alternatives.push(t.toLowerCase().trim());
        }
      }
      const firstRaw = (lastFinal[0]?.transcript ?? '').trim();
      if (alternatives.length === 0 && firstRaw) {
        alternatives.push(firstRaw.toLowerCase());
      }
      settle({
        ok: true,
        result: {
          alternatives,
          transcript: alternatives[0] ?? firstRaw.toLowerCase(),
        },
      });
    };

    try {
      rec.start();
    } catch (e) {
      settle({
        ok: false,
        error: { code: 'unknown', message: e instanceof Error ? e.message : String(e) },
      });
    }
  });

  return {
    promise,
    stop: () => {
      if (stopped) return;
      stopped = true;
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    },
  };
}

/* ───────────────────── Cevap eşleme yardımcıları ───────────────────── */

/** Aksan/boşluk/tire temizleyen normalize. Eşleştirme için. */
export function normalizeTranscript(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;:!?¿¡"'`´-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * alternatives arasından hedefle (doğru cevap) eşleşen var mı?
 * normalizeTranscript ile karşılaştırır. Cümle içinde geçiyorsa da kabul eder
 * (örn. "fui al mercado" içinde hedef "fui" geçer).
 */
export function matchTranscript(alternatives: string[], expected: string): string | null {
  const want = normalizeTranscript(expected);
  if (!want) return null;
  for (const raw of alternatives) {
    const got = normalizeTranscript(raw);
    if (!got) continue;
    if (got === want) return raw;
    // Cümle içinde kelime olarak geçiyorsa
    const tokens = got.split(' ');
    if (tokens.includes(want)) return raw;
  }
  return null;
}
