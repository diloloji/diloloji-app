/**
 * Okuma Modu için fiil listesi.
 * Mastar (es) + Türkçe anlam çiftleri.
 *
 * Not: Haber metinlerindeki kelimeler çekimlenmiş olduğundan, burada saf
 * mastarları tutuyoruz; runtime'da `buildConjugatedToInfinitiveMap()` ile
 * her fiilin olası çekimleri üretilip accent-normalize edilmiş bir
 * arama haritası oluşturuluyor.
 */

export interface VerbDictEntry {
  /** Mastar (ör. "hablar") */
  infinitive: string;
  /** Kısa Türkçe karşılığı (ör. "konuşmak") */
  tr: string;
}

/** Okuma Modu'nda vurgulanacak yaygın İspanyolca fiiller + Türkçe anlamları. */
export const READING_VERBS: VerbDictEntry[] = [
  { infinitive: 'ser', tr: 'olmak (kalıcı)' },
  { infinitive: 'estar', tr: 'olmak (geçici)' },
  { infinitive: 'tener', tr: 'sahip olmak' },
  { infinitive: 'haber', tr: '-miş olmak (yardımcı)' },
  { infinitive: 'hacer', tr: 'yapmak' },
  { infinitive: 'ir', tr: 'gitmek' },
  { infinitive: 'decir', tr: 'söylemek' },
  { infinitive: 'poder', tr: '-ebilmek' },
  { infinitive: 'ver', tr: 'görmek' },
  { infinitive: 'querer', tr: 'istemek / sevmek' },
  { infinitive: 'venir', tr: 'gelmek' },
  { infinitive: 'saber', tr: 'bilmek' },
  { infinitive: 'hablar', tr: 'konuşmak' },
  { infinitive: 'comer', tr: 'yemek' },
  { infinitive: 'vivir', tr: 'yaşamak' },
  { infinitive: 'escribir', tr: 'yazmak' },
  { infinitive: 'leer', tr: 'okumak' },
  { infinitive: 'dar', tr: 'vermek' },
  { infinitive: 'pensar', tr: 'düşünmek' },
  { infinitive: 'entender', tr: 'anlamak' },
  { infinitive: 'empezar', tr: 'başlamak' },
  { infinitive: 'comenzar', tr: 'başlamak' },
  { infinitive: 'llegar', tr: 'varmak / ulaşmak' },
  { infinitive: 'deber', tr: '-meli / borçlu olmak' },
  { infinitive: 'poner', tr: 'koymak' },
  { infinitive: 'salir', tr: 'çıkmak' },
  { infinitive: 'volver', tr: 'dönmek' },
  { infinitive: 'conocer', tr: 'tanımak' },
  { infinitive: 'sentir', tr: 'hissetmek' },
  { infinitive: 'pedir', tr: 'istemek / rica etmek' },
  { infinitive: 'dormir', tr: 'uyumak' },
  { infinitive: 'servir', tr: 'hizmet etmek' },
  { infinitive: 'repetir', tr: 'tekrarlamak' },
  { infinitive: 'seguir', tr: 'takip etmek / devam etmek' },
  { infinitive: 'conseguir', tr: 'elde etmek' },
  { infinitive: 'encontrar', tr: 'bulmak / karşılaşmak' },
  { infinitive: 'contar', tr: 'saymak / anlatmak' },
  { infinitive: 'costar', tr: 'fiyatı ... olmak' },
  { infinitive: 'jugar', tr: 'oynamak' },
  { infinitive: 'llamar', tr: 'aramak / çağırmak' },
  { infinitive: 'trabajar', tr: 'çalışmak' },
  { infinitive: 'estudiar', tr: 'çalışmak (ders)' },
  { infinitive: 'ayudar', tr: 'yardım etmek' },
  { infinitive: 'pagar', tr: 'ödemek' },
  { infinitive: 'buscar', tr: 'aramak' },
  { infinitive: 'sacar', tr: 'çıkarmak / almak' },
  { infinitive: 'tomar', tr: 'almak / içmek' },
  { infinitive: 'dejar', tr: 'bırakmak' },
  { infinitive: 'llevar', tr: 'götürmek / taşımak' },
  { infinitive: 'pasar', tr: 'geçmek' },
  { infinitive: 'creer', tr: 'inanmak' },
  { infinitive: 'abrir', tr: 'açmak' },
  { infinitive: 'recibir', tr: 'almak / kabul etmek' },
  { infinitive: 'subir', tr: 'çıkmak / yükselmek' },
  { infinitive: 'bajar', tr: 'inmek / düşmek' },
  { infinitive: 'cerrar', tr: 'kapatmak' },
  { infinitive: 'perder', tr: 'kaybetmek' },
  { infinitive: 'entrar', tr: 'girmek' },
  { infinitive: 'tratar', tr: 'ele almak / denemek' },
  { infinitive: 'ganar', tr: 'kazanmak' },
  { infinitive: 'cambiar', tr: 'değiştirmek' },
  { infinitive: 'preparar', tr: 'hazırlamak' },
  { infinitive: 'usar', tr: 'kullanmak' },
  { infinitive: 'acabar', tr: 'bitirmek' },
  { infinitive: 'aceptar', tr: 'kabul etmek' },
  { infinitive: 'permitir', tr: 'izin vermek' },
  { infinitive: 'decidir', tr: 'karar vermek' },
  { infinitive: 'ocurrir', tr: 'meydana gelmek' },
  { infinitive: 'comprender', tr: 'anlamak / kapsamak' },
  { infinitive: 'ofrecer', tr: 'sunmak' },
  { infinitive: 'recordar', tr: 'hatırlamak' },
  { infinitive: 'terminar', tr: 'bitirmek' },
  { infinitive: 'necesitar', tr: 'ihtiyaç duymak' },
  { infinitive: 'mantener', tr: 'korumak / sürdürmek' },
  { infinitive: 'aparecer', tr: 'ortaya çıkmak' },
  { infinitive: 'comprar', tr: 'satın almak' },
  { infinitive: 'vender', tr: 'satmak' },
  { infinitive: 'correr', tr: 'koşmak' },
  { infinitive: 'aprender', tr: 'öğrenmek' },
  { infinitive: 'responder', tr: 'cevaplamak' },
  { infinitive: 'existir', tr: 'var olmak' },
  { infinitive: 'cumplir', tr: 'yerine getirmek' },
  { infinitive: 'sufrir', tr: 'acı çekmek' },
  { infinitive: 'describir', tr: 'tanımlamak' },
  { infinitive: 'producir', tr: 'üretmek' },
  { infinitive: 'traducir', tr: 'çevirmek' },
  { infinitive: 'conducir', tr: 'sürmek / yol açmak' },
  { infinitive: 'construir', tr: 'inşa etmek' },
  { infinitive: 'elegir', tr: 'seçmek' },
  { infinitive: 'dirigir', tr: 'yönetmek' },
  { infinitive: 'proteger', tr: 'korumak' },
  { infinitive: 'exigir', tr: 'talep etmek' },
  { infinitive: 'presentar', tr: 'sunmak / tanıtmak' },
  { infinitive: 'considerar', tr: 'düşünmek / değerlendirmek' },
  { infinitive: 'explicar', tr: 'açıklamak' },
  { infinitive: 'mostrar', tr: 'göstermek' },
  { infinitive: 'anunciar', tr: 'duyurmak' },
  { infinitive: 'declarar', tr: 'beyan etmek' },
  { infinitive: 'confirmar', tr: 'doğrulamak' },
  { infinitive: 'afirmar', tr: 'iddia etmek' },
  { infinitive: 'señalar', tr: 'işaret etmek / belirtmek' },
  { infinitive: 'indicar', tr: 'belirtmek' },
  { infinitive: 'reconocer', tr: 'tanımak / kabul etmek' },
  { infinitive: 'informar', tr: 'bilgilendirmek' },
  { infinitive: 'publicar', tr: 'yayımlamak' },
  { infinitive: 'celebrar', tr: 'kutlamak' },
  { infinitive: 'iniciar', tr: 'başlatmak' },
  { infinitive: 'finalizar', tr: 'sonlandırmak' },
  { infinitive: 'desarrollar', tr: 'geliştirmek' },
  { infinitive: 'participar', tr: 'katılmak' },
  { infinitive: 'realizar', tr: 'gerçekleştirmek' },
  { infinitive: 'lograr', tr: 'başarmak' },
  { infinitive: 'incluir', tr: 'içermek' },
  { infinitive: 'asegurar', tr: 'sağlamak / güvence vermek' },
  { infinitive: 'proponer', tr: 'önermek' },
  { infinitive: 'apoyar', tr: 'desteklemek' },
  { infinitive: 'aumentar', tr: 'artırmak' },
  { infinitive: 'disminuir', tr: 'azaltmak' },
  { infinitive: 'reducir', tr: 'azaltmak' },
  { infinitive: 'crear', tr: 'yaratmak' },
  { infinitive: 'formar', tr: 'oluşturmak' },
  { infinitive: 'utilizar', tr: 'kullanmak' },
  { infinitive: 'investigar', tr: 'araştırmak' },
  { infinitive: 'descubrir', tr: 'keşfetmek' },
  { infinitive: 'destacar', tr: 'vurgulamak / öne çıkmak' },
  { infinitive: 'suceder', tr: 'olmak / meydana gelmek' },
  { infinitive: 'ocurrir', tr: 'meydana gelmek' },
  { infinitive: 'observar', tr: 'gözlemlemek' },
  { infinitive: 'esperar', tr: 'beklemek / ummak' },
  { infinitive: 'viajar', tr: 'seyahat etmek' },
  { infinitive: 'conocer', tr: 'tanımak' },
  { infinitive: 'agregar', tr: 'eklemek' },
  { infinitive: 'añadir', tr: 'eklemek' },
  { infinitive: 'enviar', tr: 'göndermek' },
  { infinitive: 'recibir', tr: 'almak / kabul etmek' },
  { infinitive: 'firmar', tr: 'imzalamak' },
  { infinitive: 'votar', tr: 'oy vermek' },
  { infinitive: 'gobernar', tr: 'yönetmek' },
  { infinitive: 'elegir', tr: 'seçmek' },
  { infinitive: 'presidir', tr: 'başkanlık etmek' },
  { infinitive: 'acusar', tr: 'suçlamak' },
  { infinitive: 'detener', tr: 'tutuklamak / durdurmak' },
  { infinitive: 'investigar', tr: 'soruşturmak' },
  { infinitive: 'denunciar', tr: 'ihbar etmek' },
  { infinitive: 'protestar', tr: 'protesto etmek' },
  { infinitive: 'manifestar', tr: 'belirtmek' },
  { infinitive: 'criticar', tr: 'eleştirmek' },
  { infinitive: 'advertir', tr: 'uyarmak' },
  { infinitive: 'avisar', tr: 'haber vermek' },
  { infinitive: 'comentar', tr: 'yorum yapmak' },
  { infinitive: 'discutir', tr: 'tartışmak' },
  { infinitive: 'negar', tr: 'inkâr etmek' },
  { infinitive: 'rechazar', tr: 'reddetmek' },
  { infinitive: 'aprobar', tr: 'onaylamak' },
  { infinitive: 'firmar', tr: 'imzalamak' },
];

/** Map lookup: infinitive → Turkish (case-insensitive). */
const INFINITIVE_TO_TR = new Map<string, string>();
for (const v of READING_VERBS) {
  if (!INFINITIVE_TO_TR.has(v.infinitive.toLowerCase())) {
    INFINITIVE_TO_TR.set(v.infinitive.toLowerCase(), v.tr);
  }
}
export function getTurkishForInfinitive(infinitive: string): string | undefined {
  return INFINITIVE_TO_TR.get(infinitive.trim().toLowerCase());
}

/** Accent/case normalization for lookup keys. */
export function normalizeWord(w: string): string {
  return w
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu, '')
    .trim();
}

export interface VerbMatch {
  /** Mastar */
  infinitive: string;
  /** Türkçe karşılık */
  tr: string;
  /** Zaman etiketi (ör. "Presente" — varsa) */
  tenseLabel?: string;
  /** Şahıs etiketi (ör. "yo") */
  pronounLabel?: string;
}

/**
 * Çekim haritası: accent-normalize edilmiş her çekim → { infinitive, tr, tenseLabel, pronounLabel }.
 * Tembel inşa: ilk çağrıda çekim motoru kullanılarak bir kez üretilir.
 */
import { getTenses, getPronouns } from './verbs';
import { findVerbKeyEs } from '../conjugation/spanish';
import { getConjugationForTenseForLang } from '../conjugation/helpers';

let _conjugationMap: Map<string, VerbMatch> | null = null;

export async function buildConjugationMap(): Promise<Map<string, VerbMatch>> {
  if (_conjugationMap) return _conjugationMap;

  const map = new Map<string, VerbMatch>();
  const tenses = getTenses('es');
  const pronouns = getPronouns('es');

  for (const entry of READING_VERBS) {
    const key = findVerbKeyEs(entry.infinitive);
    if (!key) {
      const n = normalizeWord(entry.infinitive);
      if (n && !map.has(n)) map.set(n, { infinitive: entry.infinitive, tr: entry.tr });
      continue;
    }

    const infN = normalizeWord(entry.infinitive);
    if (infN && !map.has(infN)) map.set(infN, { infinitive: entry.infinitive, tr: entry.tr });

    for (const t of tenses) {
      let conj: Record<string, string>;
      try {
        conj = getConjugationForTenseForLang(key, t.id, 'es');
      } catch {
        continue;
      }
      for (const p of pronouns) {
        const value = conj[p.id];
        if (!value) continue;
        const parts = value.split(/\s+/);
        const verbForm = parts[parts.length - 1];
        const nn = normalizeWord(verbForm);
        if (!nn || map.has(nn)) continue;
        map.set(nn, {
          infinitive: entry.infinitive,
          tr: entry.tr,
          tenseLabel: t.label,
          pronounLabel: p.label,
        });
      }
    }
  }

  _conjugationMap = map;
  return map;
}
