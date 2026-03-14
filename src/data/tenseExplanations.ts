/**
 * Fiil Laboratuvarı — seçili zamanın (tense) mantığını anlatan kısa ve detaylı açıklamalar.
 * shortDesc: bilgi kutusunda gösterilen kısa metin.
 * longDesc, formation, examples: detay modalında kullanılır.
 */

import type { AppLanguage } from './verbs';
import type { TenseId } from './types';
import type { TenseIdEs } from './spanish';

type TenseIdFr = TenseId;

export interface TenseExplanationDetail {
  shortDesc: string;
  longDesc: string;
  formation: string;
  examples: string[];
}

const FR: Record<TenseIdFr, TenseExplanationDetail> = {
  present: {
    shortDesc:
      'Şu an gerçekleşen eylemleri veya genel geçer durumları ifade eder (Şimdiki/Geniş Zaman).',
    longDesc:
      "Le Présent (şimdiki/geniş zaman), Fransızcada hem şu anda gerçekleşen eylemleri hem de genel geçer doğruları, alışkanlıkları ve süregelen durumları ifade etmek için kullanılır. Haber kiplerinin en temel zamanıdır ve günlük konuşmada en sık karşınıza çıkar. İngilizcedeki 'simple present' ve 'present continuous' anlamlarını tek başına karşılayabilir; bağlam sayesinde 'yapıyorum' mu 'yaparım' mı anlaşılır.",
    formation:
      'Düzenli -er fiillerde: mastarın sonundaki -er çıkarılır, köke -e, -es, -e, -ons, -ez, -ent eklenir (parler → je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent). -ir fiillerde kök + -is, -is, -it, -issons, -issez, -issent; -re fiillerde kök + -s, -s, -, -ons, -ez, -ent. Düzensiz fiillerde (être, avoir, aller, faire vb.) kök değişir ve ezberlenmelidir.',
    examples: [
      'Je mange une pomme. (Bir elma yiyorum.)',
      'Nous parlons français. (Fransızca konuşuyoruz.)',
      'Il fait beau aujourd\'hui. (Bugün hava güzel.)',
    ],
  },
  imparfait: {
    shortDesc:
      'Geçmişte süren, alışkanlık veya tasvir ifade eden eylemler için kullanılır; genelde "iyidi, ederdi" anlamı verir.',
    longDesc:
      "L'Imparfait (bitmemiş geçmiş zaman), geçmişte devam eden, kesin bitişi vurgulanmayan eylemleri ve alışkanlıkları anlatır. Ayrıca arka plan tasviri, hava durumu ve duygusal anlatımlarda sık kullanılır. Passé Composé'dan farkı: Imparfait 'süreç' ve 'alışkanlık' vurgular; Passé Composé 'bir kez olup bitti' vurgular. 'Her yaz denize giderdik' → Imparfait; 'Dün denize gittik' → Passé Composé.",
    formation:
      "Mastarın nous formundan (présent) -ons çıkarılıp kök alınır; sonuna -ais, -ais, -ait, -ions, -iez, -aient eklenir (parler → nous parlons → parl- → je parlais, tu parlais, il parlait…). Être tek düzensiz fiildir: j'étais, tu étais, il était, nous étions, vous étiez, ils étaient.",
    examples: [
      'Quand j\'étais enfant, je jouais au football. (Çocukken futbol oynardım.)',
      'Il pleuvait quand nous sommes arrivés. (Vardığımızda yağmur yağıyordu.)',
      'Nous mangions toujours à 19h. (Her zaman saat 19\'da yerdik.)',
    ],
  },
  'passe-compose': {
    shortDesc:
      'Konuşma dilinde geçmişte tamamlanmış eylemleri anlatır; yardımcı fiil (avoir/être) + participe passé ile kurulur.',
    longDesc:
      "Le Passé Composé (birleşik geçmiş), konuşma dilinde geçmişte tamamlanmış, sonucu ön planda olan eylemleri anlatır. İki parçadan oluşur: yardımcı fiil (avoir veya être, zamana göre çekilir) + fiilin geçmiş ortacı (participe passé). Hareket ve konum değiştiren fiiller (aller, venir, partir, mourir vb.) être ile; diğer çoğu fiil avoir ile kurulur. Imparfait ile birlikte kullanıldığında 'bir eylem devam ederken başka bir eylem oldu' anlamı verir.",
    formation:
      "Avoir veya être'nin présent çekimi + participe passé. -er fiillerde participe passé: kök + -é (parler → parlé). -ir fiillerde: kök + -i (finir → fini). -re fiillerde: kök + -u (vendre → vendu). Être ile kurulduğunda geçmiş ortaç zamir ve özneye göre (e/s) çoğullaştırılır. Düzensiz ortaclar (fait, pris, écrit, ouvert vb.) ezberlenmelidir.",
    examples: [
      'J\'ai mangé une pizza hier. (Dün bir pizza yedim.)',
      'Elle est partie à huit heures. (Saat sekizde gitti.)',
      'Nous avons parlé de toi. (Senin hakkında konuştuk.)',
    ],
  },
  'passe-simple': {
    shortDesc:
      'Yazı dilinde geçmişte tamamlanmış, kesin eylemler için kullanılır; konuşmada yerini Passé Composé alır.',
    longDesc:
      "Le Passé Simple (basit geçmiş), edebiyatta ve resmî yazıda geçmişte bir kez olup bitmiş eylemleri anlatmak için kullanılır. Günlük konuşmada neredeyse hiç kullanılmaz; yerine Passé Composé gelir. Roman, tarih metni veya gazete dilinde sık görürsünüz. Anlam olarak Passé Composé'a yakındır; fark kullanım alanındadır: biri yazı, biri sözlü dil.",
    formation:
      "-er fiillerde: kök + -ai, -as, -a, -âmes, -âtes, -èrent (parler → je parlai, tu parlas, il parla…). -ir ve -re fiillerde farklı ekler: -is, -is, -it, -îmes, -îtes, -irent. Être: je fus, tu fus, il fut, nous fûmes, vous fûtes, ils furent. Avoir: j'eus, tu eus, il eut… Düzensiz kökler (écriv- pour écrire, pr- pour prendre vb.) ayrıca öğrenilir.",
    examples: [
      'Louis XIV régna pendant soixante-douze ans. (XIV. Louis yetmiş iki yıl hüküm sürdü.)',
      'Il entra dans la pièce et ferma la porte. (Odaya girdi ve kapıyı kapattı.)',
      'Nous reçûmes une lettre. (Bir mektup aldık.)',
    ],
  },
  'futur-simple': {
    shortDesc:
      'Gelecekte gerçekleşecek eylemleri veya tahmin/niyet ifade eder.',
    longDesc:
      "Le Futur Simple (basit gelecek), gelecekte gerçekleşecek eylemleri, tahminleri ve niyetleri ifade eder. Türkçedeki '-ecek/-acak' ile benzer kullanılır. Koşul cümlelerinde (si + présent, futur) geleceğe atıf yapar. Yakın gelecek için bazen 'aller + mastar' (futur proche) tercih edilir; futur simple daha genel veya resmî bir ton taşır.",
    formation:
      "Mastarın tamamı (re/ir/er korunur) + -ai, -as, -a, -ons, -ez, -ont ekleri (parler → je parlerai, tu parleras, il parlera…). -re fiillerde son -e düşer: prendre → je prendrai. Düzensizlerde kök değişir: avoir → j'aurai, être → je serai, aller → j'irai, faire → je ferai, venir → je viendrai vb.",
    examples: [
      'Demain il fera beau. (Yarın hava güzel olacak.)',
      'Nous partirons à midi. (Öğlen gideceğiz.)',
      'Tu auras ton diplôme dans un an. (Bir yıla diplomana kavuşacaksın.)',
    ],
  },
  'subjonctif-present': {
    shortDesc:
      'Dilek, olasılık, zorunluluk veya duygu gerektiren cümlelerde kullanılan dilek kipi.',
    longDesc:
      "Le Subjonctif Présent (dilek kipi şimdiki zaman), gerçekliği değil, istek, duygu, olasılık veya zorunluluk ifade eden cümlelerde kullanılır. Ana cümlede 'istemek', 'üzülmek', 'gerekli olmak', 'olası olmak' gibi ifadeler varsa yan cümlede subjonctif kullanılır. Ayrıca 'il faut que', 'bien que', 'pour que' gibi bağlarla gelir. Indicatif'ten farkı: olanı değil, tasarlananı veya hissedileni anlatır.",
    formation:
      "3. çoğul (ils) présent indicatif kökü alınır + -e, -es, -e, -ions, -iez, -ent (parler → ils parlent → parl- → que je parle, que tu parles…). -er fiillerde 1. ve 2. çoğul -ions, -iez ile indicatif'ten ayrılır. Düzensiz: avoir → que j'aie, que tu aies…; être → que je sois…; aller → que j'aille…; faire → que je fasse…; pouvoir → que je puisse… vb.",
    examples: [
      'Il faut que tu viennes. (Gelmen gerekiyor.)',
      'Je suis content qu\'elle soit là. (Orada olduğu için mutluyum.)',
      'Bien qu\'il pleuve, nous sortons. (Yağmur yağsa da çıkıyoruz.)',
    ],
  },
};

const ES: Record<TenseIdEs, TenseExplanationDetail> = {
  presente: {
    shortDesc:
      'Şu an gerçekleşen eylemleri veya genel geçer durumları ifade eder (Şimdiki/Geniş Zaman).',
    longDesc:
      "El Presente (şimdiki/geniş zaman), İspanyolcada hem şu anki eylemleri hem de genel doğruları, alışkanlıkları ve kalıcı durumları anlatmak için kullanılır. Indicativo (haber kipi) içinde en temel zamanlardan biridir. İngilizcedeki simple present ve bazen present continuous anlamını taşır; 'yapıyorum' ve 'yaparım' ayrımı bağlamla anlaşılır.",
    formation:
      "Düzenli -ar fiillerde: mastardan -ar çıkarılır, köke -o, -as, -a, -amos, -áis, -an eklenir (hablar → yo hablo, tú hablas, él habla…). -er: -o, -es, -e, -emos, -éis, -en; -ir: -o, -es, -e, -imos, -ís, -en. Düzensiz fiillerde (ser, estar, ir, tener, hacer, poder, decir vb.) kök değişir ve kişiye göre farklı ekler gelir.",
    examples: [
      'Yo como una manzana. (Bir elma yiyorum.)',
      'Nosotros hablamos español. (İspanyolca konuşuyoruz.)',
      'Hoy hace buen tiempo. (Bugün hava güzel.)',
    ],
  },
  imperfecto: {
    shortDesc:
      'Geçmişte süren, alışkanlık veya tasvir ifade eden eylemler için kullanılır; "iyidi, ederdi" anlamına gelir.',
    longDesc:
      "El Pretérito Imperfecto (bitmemiş geçmiş), geçmişte süregelen eylemleri, alışkanlıkları ve arka plan tasvirlerini anlatır. Türkçedeki '-iyordu, -erdi' karşılığıdır. Pretérito Indefinido ile farkı: Imperfecto süreç ve alışkanlık vurgular; Indefinido geçmişte bir kez tamamlanmış eylemi vurgular. 'Her gün yürürdüm' → Imperfecto; 'Dün yürüdüm' → Indefinido.",
    formation:
      "-ar fiillerde: kök + -aba, -abas, -aba, -ábamos, -abais, -aban (hablar → hablaba, hablabas…). -er ve -ir fiillerde: kök + -ía, -ías, -ía, -íamos, -íais, -ían (comer → comía; vivir → vivía). Sadece 3 düzensiz: ser (era, eras, era…), ir (iba, ibas…), ver (veía, veías…).",
    examples: [
      'Cuando era niño, jugaba al fútbol. (Çocukken futbol oynardım.)',
      'Llovía cuando llegamos. (Vardığımızda yağmur yağıyordu.)',
      'Siempre comíamos a las ocho. (Her zaman saat sekizde yerdik.)',
    ],
  },
  preterito: {
    shortDesc:
      'Geçmişte belirli bir anda tamamlanmış eylemler için kullanılır (Pretérito Indefinido).',
    longDesc:
      "El Pretérito Indefinido (basit geçmiş), geçmişte bir kez olup bitmiş, sınırı net eylemleri anlatır. Türkçedeki '-di/dı' geçmiş zamanına benzer. Imperfecto ile birlikte kullanıldığında: Indefinido 'olay', Imperfecto 'ortam veya süreç' verir. 'Yemek yerken telefon çaldı' → comía (Imperfecto) + sonó (Indefinido). Konuşma ve yazıda sık kullanılır.",
    formation:
      "-ar fiillerde: kök + -é, -aste, -ó, -amos, -asteis, -aron (hablar → hablé, hablaste, habló…). -er/-ir: -í, -iste, -ió, -imos, -isteis, -ieron (comer → comí…; vivir → viví…). Düzensiz kökler: estar → estuv-, tener → tuv-, hacer → hic- (él/ella hizo), poder → pud-, decir → dij-, venir → vin-, ser/ir → aynı çekim (fui, fuiste, fue…).",
    examples: [
      'Ayer comí una pizza. (Dün bir pizza yedim.)',
      'Ella salió a las ocho. (Saat sekizde çıktı.)',
      'Recibimos una carta. (Bir mektup aldık.)',
    ],
  },
  'preterito-perfecto': {
    shortDesc:
      'Konuşma dilinde geçmişte tamamlanan eylemler için; haber (şimdiki) + participio ile kurulur.',
    longDesc:
      "El Pretérito Perfecto (birleşik geçmiş), haber fiilinin presente çekimi + fiilin geçmiş ortacı (participio) ile kurulur. Henüz bitmemiş bir zaman dilimi içinde tamamlanan eylemleri anlatır: bugün, bu hafta, bu yıl vb. 'Hoy he comido' (bugün yedim) doğru; 'Ayer he comido' yerine 'Ayer comí' (Indefinido) kullanılır. Latin Amerika'da bazı bölgelerde Indefinido ile kullanım farkı azalabilir.",
    formation:
      "Haber (presente) + participio. Haber: he, has, ha, hemos, habéis, han. Participio: -ar → -ado (hablar → hablado), -er/-ir → -ido (comer → comido, vivir → vivido). Düzensiz participiolar: abrir → abierto, escribir → escrito, hacer → hecho, ver → visto, volver → vuelto vb.",
    examples: [
      'Hoy he comido paella. (Bugün paella yedim.)',
      'Esta semana hemos hablado con ella. (Bu hafta onunla konuştuk.)',
      'Nunca he estado en Japón. (Hiç Japonya\'da bulunmadım.)',
    ],
  },
  pluscuamperfecto: {
    shortDesc:
      'Geçmişte başka bir eylemden önce tamamlanmış eylemler için; había + participio ile kurulur.',
    longDesc:
      "El Pluscuamperfecto (önceki geçmiş), geçmişte bir başka eylemden veya zamandan önce tamamlanmış eylemi anlatır. Türkçede '-mişti, -mıştı' ile ifade edilir. Ana cümlede genelde Indefinido veya Imperfecto kullanılır; Pluscuamperfecto 'daha önce olmuştu' anlamını verir. 'Eve vardığımda yemek yemişti' → Llegué (Indefinido) + había comido (Pluscuamperfecto).",
    formation:
      "Haber'in Imperfecto çekimi (había, habías, había, habíamos, habíais, habían) + participio (-ado/-ido veya düzensiz: escrito, hecho, visto vb.). Fiil anlamı participio ile taşınır; haber sadece zamanı verir.",
    examples: [
      'Cuando llegué, ya había salido. (Vardığımda çoktan çıkmıştı.)',
      'Había comido cuando me llamaste. (Beni aradığında yemek yemişti.)',
      'No sabía que habías estado allí. (Orada bulunduğunu bilmiyordum.)',
    ],
  },
  futuro: {
    shortDesc:
      'Gelecekte gerçekleşecek eylemleri veya tahmin ifade eder.',
    longDesc:
      "El Futuro Simple (basit gelecek), gelecekte gerçekleşecek eylemleri, tahminleri ve niyetleri ifade eder. Türkçedeki '-ecek/-acak' ile benzerdir. Koşul cümlelerinde (si + presente, futuro) kullanılır. Nazik sorularda da yer alır: '¿Me darás el libro?' (Bana kitabı verir misin?). İngilizce 'will' veya 'going to' karşılığı gibi düşünülebilir.",
    formation:
      "Mastarın tamamı + -é, -ás, -á, -emos, -éis, -án (hablar → hablaré, hablarás, hablará…). Düzensizlerde kök değişir ve aynı ekler gelir: tener → tendré, poder → podré, decir → diré, hacer → haré, haber → habré, salir → saldré vb.",
    examples: [
      'Mañana hará buen tiempo. (Yarın hava güzel olacak.)',
      'Saldremos al mediodía. (Öğlen çıkacağız.)',
      '¿Me ayudarás? (Bana yardım eder misin?)',
    ],
  },
  'futuro-compuesto': {
    shortDesc:
      'Gelecekte bir zamana kadar tamamlanmış olacak eylemler için; habré + participio ile kurulur.',
    longDesc:
      "El Futuro Compuesto (birleşik gelecek), gelecekte belirli bir ana kadar 'tamamlanmış olacak' eylemi anlatır. Haber'in Futuro Simple'ı (habré, habrás…) + participio ile kurulur. Türkçede '…-miş olacak' ile ifade edilir. Örneğin: 'Yarın bu saatte bitirmiş olacağım' → Mañana a esta hora habré terminado.",
    formation:
      "Haber en Futuro Simple (habré, habrás, habrá, habremos, habréis, habrán) + participio (-ado/-ido veya düzensiz). Fiil anlamı participio ile taşınır.",
    examples: [
      'Para el viernes habré terminado el informe. (Cuma gününe kadar raporu bitirmiş olacağım.)',
      'En 2030 habremos vivido aquí diez años. (2030\'da burada on yıl yaşamış olacağız.)',
      '¿Habrás llegado ya? (Varmış olacak mısın?)',
    ],
  },
  condicional: {
    shortDesc:
      'Koşula bağlı olasılık, nazik istek veya geçmişte geleceğe dönük eylemleri anlatır.',
    longDesc:
      "El Condicional (koşul/gelecek-geçmiş), koşula bağlı olasılık ('yapardım'), nazik istek ('bir kahve alır mıydınız?') ve geçmişte geleceğe atıf ('ertesi gün yapacaktı') anlamlarında kullanılır. Si + Imperfecto de Subjuntivo + Condicional yapısında 'koşul' anlamı verir. İngilizce 'would' ile benzer kullanımı vardır.",
    formation:
      "Futuro Simple kökü (bazen düzensiz) + Imperfecto ekleri: -ía, -ías, -ía, -íamos, -íais, -ían. Düzenli: hablar → hablaría, comer → comería. Düzensiz kökler Futuro ile aynı: tendría, podría, diría, haría, habría, saldría vb.",
    examples: [
      'Me gustaría un café. (Bir kahve isterdim.)',
      'Si tuviera tiempo, iría. (Zamanım olsaydı giderdim.)',
      'Dijo que llegaría tarde. (Geç geleceğini söyledi.)',
    ],
  },
  'subjuntivo-presente': {
    shortDesc:
      'Dilek, olasılık, duygu veya zorunluluk ifade eden cümlelerde kullanılan dilek kipi.',
    longDesc:
      "El Presente de Subjuntivo (dilek kipi şimdiki zaman), gerçekleşmesi kesin olmayan, istek/duygu/zorunluluk ifade eden yan cümlelerde kullanılır. Ana cümlede 'istemek', 'üzülmek', 'gerekli olmak', 'şüphe' gibi ifadeler varsa yan cümlede subjuntivo gelir. Ojalá, para que, aunque, antes de que gibi bağlarla da kullanılır. Indicativo 'olanı', Subjuntivo 'tasarlananı veya hissedileni' anlatır.",
    formation:
      "Yo (presente indicativo) kökü alınır, 1. tekil -o çıkarılır; sonra -e, -es, -e, -emos, -éis, -en eklenir (hablar → hablo → habl- → que yo hable, que tú hables…). -er/-ir'de -a, -as, -a, -amos, -áis, -an. Düzensiz: tener → tenga, poder → pueda, decir → diga, hacer → haga, ir → vaya, ser → sea, estar → esté vb.",
    examples: [
      'Quiero que vengas. (Gelmeni istiyorum.)',
      'Es posible que llueva. (Yağmur yağabilir.)',
      'Aunque no tenga dinero, es feliz. (Parası olmasa da mutlu.)',
    ],
  },
};

const BY_LANG: Record<AppLanguage, Record<string, TenseExplanationDetail>> = {
  fr: FR,
  es: ES,
};

/**
 * Seçilen dil ve zaman id'sine göre detaylı açıklama objesi döner; yoksa null.
 */
export function getTenseExplanation(
  lang: AppLanguage,
  tenseId: string
): TenseExplanationDetail | null {
  const byLang = BY_LANG[lang];
  if (!byLang || !tenseId) return null;
  return byLang[tenseId] ?? null;
}
