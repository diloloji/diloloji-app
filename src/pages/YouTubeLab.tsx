/**
 * YouTube Lab — YouTube videolarını dilbilimsel ders materyaline dönüştürür.
 * URL girişi, gömülü oynatıcı, altyazı analizi (Groq), gramer/kelime notları, Cümle Lab'a gönderim.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Youtube, Send, ExternalLink } from 'lucide-react';
import Navbar from '../components/Navbar';
import {
  analyzeYouTubeSubtitles,
  type YouTubeAnalysisResult,
  type YouTubeGrammarItem,
  type YouTubeVocabularyItem,
} from '../services/dictionaryApi';

const VIDEO_ID_REGEX = /[a-zA-Z0-9_-]{11}/;

/** YouTube URL'den video ID çıkarır (watch, shorts, embed, youtu.be, list= içeren linkler). */
function extractVideoId(url: string): string | null {
  const trimmed = (url || '').trim();
  if (!trimmed) return null;
  // Bare 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = u.hostname.replace(/^www\./, '');
    // youtu.be/VIDEO_ID veya youtu.be/VIDEO_ID?si=...
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1).split('/')[0];
      if (VIDEO_ID_REGEX.test(id)) return id;
      return null;
    }
    if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;
    // /watch?v=VIDEO_ID veya /watch?list=...&v=VIDEO_ID
    const v = u.searchParams.get('v');
    if (v && VIDEO_ID_REGEX.test(v)) return v;
    // /shorts/VIDEO_ID
    const shortsMatch = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];
    // /embed/VIDEO_ID
    const embedMatch = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];
    // /v/VIDEO_ID (eski format)
    const vMatch = u.pathname.match(/^\/v\/([a-zA-Z0-9_-]{11})/);
    if (vMatch) return vMatch[1];
  } catch {
    // URL parse hatası; regex fallback
    const patterns = [
      /(?:youtube\.com\/watch\?)(?:[^&]*&)*v=([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const re of patterns) {
      const m = trimmed.match(re);
      if (m) return m[1];
    }
  }
  return null;
}

/** Altyazı metni sağlar. Gerçek altyazı API bağlandığında bu fonksiyon güncellenecek. */
async function fetchSubtitlesMock(_videoId: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 400));
  return 'Sample transcript for language analysis. Replace this with real captions when a subtitle API is connected. The quick brown fox jumps over the lazy dog. Learning grammar and vocabulary from video content helps improve language skills.';
}

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function YouTubeLab() {
  const navigate = useNavigate();
  const [urlInput, setUrlInput] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [embedStart, setEmbedStart] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<YouTubeAnalysisResult | null>(null);

  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0${embedStart != null ? `&start=${Math.floor(embedStart)}` : ''}`
    : null;

  const handleAnalyze = useCallback(async () => {
    const id = extractVideoId(urlInput);
    if (!id) {
      setError('Geçerli bir YouTube URL’si veya video ID girin.');
      return;
    }
    setError(null);
    setLoading(true);
    setAnalysis(null);
    setVideoId(id);
    setEmbedStart(null);
    try {
      const subtitleText = await fetchSubtitlesMock(id);
      const result = await analyzeYouTubeSubtitles(subtitleText, id);
      setAnalysis(result ?? null);
      if (!result) setError('Altyazı analizi alınamadı. Groq API anahtarını kontrol edin.');
    } catch (e) {
      console.error(e);
      setError('Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [urlInput]);

  const handleSeek = useCallback((seconds: number) => {
    setEmbedStart(seconds);
  }, []);

  const handleSendToSyntaxLab = useCallback(
    (sentence: string) => {
      navigate('/syntax-lab', { state: { prefillSentence: sentence, prefillLanguage: 'İngilizce' as const } });
    },
    [navigate]
  );

  return (
    <div className="min-h-screen bg-[#0a0e17] flex flex-col">
      <Helmet>
        <title>YouTube Lab | Diloloji</title>
        <meta name="description" content="YouTube videolarını dilbilimsel ders materyaline dönüştürün. Gramer ve kelime analizi." />
      </Helmet>
      <Navbar />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 pb-16">
        <header className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 mb-1 flex items-center justify-center gap-2">
            <Youtube className="w-7 h-7 text-red-500" strokeWidth={2} aria-hidden />
            YouTube Lab
          </h1>
          <p className="text-slate-400 text-sm">
            Videoyu girin, gramer ve kelime notlarını çıkarın
          </p>
        </header>

        {/* URL girişi + Analiz Et */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => { setError(null); setUrlInput(e.target.value); }}
            placeholder="YouTube URL veya video ID yapıştırın..."
            className="flex-1 min-w-0 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent"
            aria-label="YouTube URL"
          />
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#0a0e17] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden />
                <span className="text-sm">Analiz ediliyor...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" strokeWidth={2} />
                Analiz Et
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="text-red-400 text-sm mb-4" role="alert">
            {error}
          </p>
        )}

        {/* Split: Sol video, Sağ notlar */}
        {videoId && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Sol — Video oynatıcı */}
            <div className="lg:col-span-2">
              <div className="rounded-xl overflow-hidden border border-white/10 bg-black aspect-video min-h-[200px]">
                <iframe
                  key={`${videoId}-${embedStart ?? 0}`}
                  src={embedUrl ?? ''}
                  title="YouTube video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full min-h-[200px] aspect-video"
                />
              </div>
            </div>

            {/* Sağ — Gramer ve Kelime Notları */}
            <div className="lg:col-span-3 space-y-6 overflow-y-auto max-h-[calc(100vh-320px)] lg:max-h-[70vh]">
              {loading ? (
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 flex flex-col items-center justify-center gap-4 text-slate-400">
                  <span className="inline-block w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" aria-hidden />
                  <p className="text-sm">Video analiz ediliyor...</p>
                  <p className="text-xs text-slate-500">Gramer ve kelime notları hazırlanıyor.</p>
                </div>
              ) : analysis ? (
                <>
                  <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                    <h2 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">
                      Gramer Yapıları
                    </h2>
                    <ul className="space-y-3">
                      {analysis.grammarStructures.map((item: YouTubeGrammarItem, i: number) => (
                        <li key={i} className="text-sm">
                          <button
                            type="button"
                            onClick={() => handleSeek(item.timestampSeconds)}
                            className="text-indigo-400 hover:text-indigo-300 font-mono text-xs mr-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded"
                          >
                            {formatTimestamp(item.timestampSeconds)}
                          </button>
                          <span className="font-medium text-slate-200">{item.name}</span>
                          {item.example && (
                            <p className="text-slate-400 mt-0.5 pl-16">{item.example}</p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                    <h2 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">
                      Anahtar Kelimeler
                    </h2>
                    <ul className="space-y-2">
                      {analysis.vocabulary.map((item: YouTubeVocabularyItem, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-sm flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleSeek(item.timestampSeconds)}
                            className="text-indigo-400 hover:text-indigo-300 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded"
                          >
                            {formatTimestamp(item.timestampSeconds)}
                          </button>
                          <span className="font-medium text-slate-200">{item.word}</span>
                          <span className="text-slate-500">—</span>
                          <span className="text-slate-400">{item.meaning}</span>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
                    <h2 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wider">
                      Örnek Cümleler — Cümle Lab’a Gönder
                    </h2>
                    <p className="text-xs text-slate-500 mb-2">
                      Tıklayın: video o saniyeye atlar. Cümleyi Cümle Laboratuvarı’nda analiz etmek için yanındaki oka tıklayın.
                    </p>
                    <ul className="space-y-2">
                      {analysis.sampleSentences.map((s, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm group">
                          <button
                            type="button"
                            onClick={() => handleSeek(s.timestampSeconds)}
                            className="text-indigo-400 hover:text-indigo-300 font-mono text-xs shrink-0 mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded"
                          >
                            {formatTimestamp(s.timestampSeconds)}
                          </button>
                          <span className="text-slate-300 flex-1">{s.text}</span>
                          <button
                            type="button"
                            onClick={() => handleSendToSyntaxLab(s.text)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
                            title="Cümle Laboratuvarı’nda aç"
                            aria-label="Cümle Laboratuvarı’nda aç"
                          >
                            <ExternalLink className="w-4 h-4" strokeWidth={2} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                </>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center text-slate-500">
                  <p className="text-sm font-medium text-slate-400 mb-1">Video analiz edildikten sonra burada görünecek</p>
                  <p className="text-xs">Gramer yapıları, anahtar kelimeler ve örnek cümleler analiz tamamlanınca listelenecek.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!videoId && (
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 text-center text-slate-500 text-sm">
            YouTube video linkini yapıştırıp Analiz Et’e tıklayın. Video ve dilbilimsel notlar burada görüntülenecek.
          </div>
        )}
      </main>
    </div>
  );
}
