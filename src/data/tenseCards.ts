/**
 * İspanyolca Zaman Kartları — Referans içerik.
 *
 * Her kart 1 zamanı özetler:
 *   - when_to_use : ne zaman kullanılır
 *   - signal_words: sık eşleşen ifadeler
 *   - endings_regular : düzenli fiil ekleri
 *   - example_verb    : çekim örneğinde kullanılan fiil
 *   - irregulars_note : en sık düzensizlik notu
 *   - examples        : { es, tr } formunda 3 örnek cümle
 *   - confusion_warning : karıştırma uyarısı (yoksa null)
 */

export type TenseCardColor =
  | 'blue'
  | 'violet'
  | 'teal'
  | 'amber'
  | 'orange'
  | 'indigo'
  | 'rose'
  | 'emerald'
  | 'slate';

export type TenseCardExample = { es: string; tr: string };

export type TenseCard = {
  tense: string;
  /** Alıştırma modundaki zaman id'si. 'subjuntivo-imperfecto' id'si şu an sistemde yok, referans olarak bırakıldı. */
  tenseId: string;
  color: TenseCardColor;
  when_to_use: string;
  signal_words: string[];
  /** Ek eşlemesi: anahtar (ör. "-ar" / "-er/-ir"), değer yo..ellos sırasıyla 6 elemanlı dizi. */
  endings_regular: Record<string, string[]>;
  example_verb: string;
  irregulars_note: string;
  examples: TenseCardExample[];
  confusion_warning: string | null;
};

export const ES_TENSE_CARDS: TenseCard[] = [
  {
    tense: 'Presente',
    tenseId: 'presente',
    color: 'blue',
    when_to_use:
      "Şu an olan, her zaman doğru olan veya yakın gelecekte planlanan eylemler için kullanılır. 'Siempre', 'normalmente', 'todos los días' gibi ifadelerle sık gelir.",
    signal_words: ['siempre', 'normalmente', 'todos los días', 'ahora', 'hoy', 'a veces'],
    endings_regular: {
      '-ar': ['o', 'as', 'a', 'amos', 'áis', 'an'],
      '-er': ['o', 'es', 'e', 'emos', 'éis', 'en'],
      '-ir': ['o', 'es', 'e', 'imos', 'ís', 'en'],
    },
    example_verb: 'hablar',
    irregulars_note:
      "yo formunda düzensizlik çok yaygın: tengo, hago, salgo, conozco, sé. e→ie: quiero, pienso. o→ue: puedo, vuelvo. e→i: pido, sirvo.",
    examples: [
      { es: 'Todos los días como a las dos.', tr: 'Her gün saat ikiye yemek yiyorum.' },
      { es: '¿Hablas español?', tr: 'İspanyolca biliyor musun? / Konuşuyor musun?' },
      { es: 'Mañana voy al médico.', tr: 'Yarın doktora gideceğim.' },
    ],
    confusion_warning: null,
  },
  {
    tense: 'Pretérito Indefinido',
    tenseId: 'preterito',
    color: 'violet',
    when_to_use:
      "Geçmişte başlayıp kesin olarak tamamlanmış eylemler için. Belirli bir zaman dilimine ait, tekrarlanmayan olaylar. 'Ayer', 'el lunes pasado', 'en 2010' gibi ifadelerle gelir.",
    signal_words: ['ayer', 'anteayer', 'el año pasado', 'en + yıl', 'de repente', 'una vez', 'el lunes'],
    endings_regular: {
      '-ar': ['é', 'aste', 'ó', 'amos', 'asteis', 'aron'],
      '-er/-ir': ['í', 'iste', 'ió', 'imos', 'isteis', 'ieron'],
    },
    example_verb: 'hablar',
    irregulars_note:
      "ser/ir aynı: fui, fuiste, fue, fuimos, fuisteis, fueron. tener→tuve, hacer→hice/hizo, estar→estuve, poder→pude, querer→quise, venir→vine, decir→dije, saber→supe.",
    examples: [
      { es: 'Ayer comí una paella deliciosa.', tr: 'Dün lezzetli bir paella yedim.' },
      { es: 'El año pasado fui a Barcelona.', tr: 'Geçen yıl Barselona’ya gittim.' },
      { es: 'De repente sonó el teléfono.', tr: 'Aniden telefon çaldı.' },
    ],
    confusion_warning:
      "Imperfecto ile karıştırma: tek seferlik tamamlanmış → Indefinido, geçmişte süregelen/alışkanlık → Imperfecto. 'Ayer estudié 3 horas' (bitti) vs 'De niño estudiaba mucho' (alışkanlık).",
  },
  {
    tense: 'Pretérito Imperfecto',
    tenseId: 'imperfecto',
    color: 'teal',
    when_to_use:
      "Geçmişteki süregelen durumlar, alışkanlıklar veya arka plan betimlemeleri için. 'Cuando era niño', 'siempre', 'todos los veranos' gibi ifadelerle gelir.",
    signal_words: [
      'cuando era niño/a',
      'siempre',
      'normalmente',
      'antes',
      'todos los veranos',
      'mientras',
    ],
    endings_regular: {
      '-ar': ['aba', 'abas', 'aba', 'ábamos', 'abais', 'aban'],
      '-er/-ir': ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    },
    example_verb: 'hablar',
    irregulars_note:
      "Sadece 3 düzensiz fiil: ser→era/eras/era/éramos/erais/eran, ir→iba/ibas/iba/íbamos/ibais/iban, ver→veía/veías/veía/veíamos/veíais/veían.",
    examples: [
      { es: 'Cuando era pequeño, vivía en Madrid.', tr: 'Küçükken Madrid’de yaşıyordum.' },
      { es: 'Todos los veranos íbamos a la playa.', tr: 'Her yaz plaja giderdik.' },
      { es: 'Mientras cocinaba, escuchaba música.', tr: 'Yemek pişirirken müzik dinliyordum.' },
    ],
    confusion_warning:
      "Indefinido ile karıştırma: Imperfecto arka planı/durumu, Indefinido ön plandaki olayı anlatır. 'Llovía (Imp.) cuando salí (Ind.)' — yağmur süregeliyordu, çıkma eylemi tamamlandı.",
  },
  {
    tense: 'Pretérito Perfecto',
    tenseId: 'preterito-perfecto',
    color: 'amber',
    when_to_use:
      "Bugün veya yakın geçmişte tamamlanmış, hâlâ güncelliği olan eylemler için. 'Hoy', 'esta semana', 'este año', 'ya', 'todavía no' ile sık gelir. İspanya İspanyolcasında daha yaygın, Latin Amerika'da Indefinido tercih edilir.",
    signal_words: [
      'hoy',
      'esta semana',
      'este año',
      'ya',
      'todavía no',
      'alguna vez',
      'nunca',
    ],
    endings_regular: {
      'haber (presente)': ['he', 'has', 'ha', 'hemos', 'habéis', 'han'],
      '+ participio (-ar → -ado, -er/-ir → -ido)': ['—', '—', '—', '—', '—', '—'],
    },
    example_verb: 'hablar',
    irregulars_note:
      "Yardımcı fiil haber + participio. Düzensiz participiolar: hecho (hacer), dicho (decir), visto (ver), puesto (poner), vuelto (volver), roto (romper), abierto (abrir), escrito (escribir).",
    examples: [
      { es: 'Hoy he comido demasiado.', tr: 'Bugün çok yedim.' },
      { es: '¿Has visto esta película alguna vez?', tr: 'Bu filmi hiç izledin mi?' },
      { es: 'Todavía no he terminado el libro.', tr: 'Kitabı henüz bitirmedim.' },
    ],
    confusion_warning:
      "Indefinido ile fark: Perfecto yakın/güncel geçmiş ('hoy he ido'), Indefinido uzak/kapalı geçmiş ('ayer fui'). Latin Amerika'da bu ayrım genellikle yapılmaz.",
  },
  {
    tense: 'Pluscuamperfecto',
    tenseId: 'pluscuamperfecto',
    color: 'orange',
    when_to_use:
      "Geçmişteki bir olaydan önce gerçekleşen eylemi anlatır — geçmişin geçmişi. 'Ya', 'cuando', 'antes de que' ile sık kullanılır.",
    signal_words: ['ya', 'cuando', 'antes de que', 'después de que', 'porque', 'todavía no'],
    endings_regular: {
      'haber (imperfecto)': ['había', 'habías', 'había', 'habíamos', 'habíais', 'habían'],
      '+ participio': ['—', '—', '—', '—', '—', '—'],
    },
    example_verb: 'hablar',
    irregulars_note:
      "haber'in Imperfecto çekimi (había/habías/había/habíamos/habíais/habían) + participio. Participio düzensizlikleri Pretérito Perfecto ile aynı: hecho, dicho, visto, puesto, vuelto.",
    examples: [
      { es: 'Cuando llegué, ella ya había salido.', tr: 'Vardığımda o çoktan çıkmıştı.' },
      { es: 'No había comido nada desde la mañana.', tr: 'Sabahtan beri hiçbir şey yememiştim.' },
      { es: 'Nunca había visto tanta nieve.', tr: 'Hiç bu kadar çok kar görmemiştim.' },
    ],
    confusion_warning:
      "Pretérito Perfecto ile karıştırma: Pluscuamperfecto geçmişteki bir noktadan önceyi anlatır, Perfecto ise şimdiye yakın geçmişi. Zaman çizelgesinde Pluscuamperfecto daha geride.",
  },
  {
    tense: 'Futuro Simple',
    tenseId: 'futuro',
    color: 'indigo',
    when_to_use:
      "Gelecekte olacak eylemler için. Aynı zamanda şu anki duruma dair tahmin veya olasılık ifade eder: '¿Dónde estará?' (Nerede olabilir ki?)",
    signal_words: ['mañana', 'el próximo año', 'dentro de', 'pronto', 'algún día', 'quizás'],
    endings_regular: {
      'mastar + ek': ['é', 'ás', 'á', 'emos', 'éis', 'án'],
    },
    example_verb: 'hablar',
    irregulars_note:
      "Kök düzensizlikleri: tener→tendr-, poder→podr-, querer→querr-, saber→sabr-, haber→habr-, hacer→har-, salir→saldr-, venir→vendr-, decir→dir-, poner→pondr-. Ekler hep aynı: é/ás/á/emos/éis/án.",
    examples: [
      { es: 'Mañana iré al gimnasio.', tr: 'Yarın spor salonuna gideceğim.' },
      { es: 'El año que viene viviremos en París.', tr: 'Gelecek yıl Paris’te yaşayacağız.' },
      { es: '¿Dónde estará mi teléfono?', tr: 'Telefonum nerede olabilir ki?' },
    ],
    confusion_warning:
      "Ir a + infinitivo ile fark: 'voy a comer' yakın/planlanmış gelecek, 'comeré' daha belirsiz/resmi gelecek. Konuşma dilinde 'ir a' çok daha yaygın.",
  },
  {
    tense: 'Condicional',
    tenseId: 'condicional',
    color: 'rose',
    when_to_use:
      "Koşula bağlı eylemler ('yapardım'), kibarca istek ('ister misiniz?') ve dolaylı anlatım için. Si (eğer) cümleleriyle sık kullanılır.",
    signal_words: [
      'si + Imperfecto Subjuntivo',
      'me gustaría',
      'podría',
      'debería',
      'querría',
    ],
    endings_regular: {
      'mastar + ek': ['ía', 'ías', 'ía', 'íamos', 'íais', 'ían'],
    },
    example_verb: 'hablar',
    irregulars_note:
      "Futuro Simple ile aynı düzensiz kökler: tendr-, podr-, querr-, sabr-, habr-, har-, saldr-, vendr-, dir-, pondr-. Ekler: ía/ías/ía/íamos/íais/ían.",
    examples: [
      { es: 'Si tuviera dinero, viajaría por el mundo.', tr: 'Param olsa dünyayı gezerdim.' },
      { es: '¿Podrías ayudarme, por favor?', tr: 'Bana yardım eder misin, lütfen?' },
      { es: 'Me gustaría un café con leche.', tr: 'Sütlü bir kahve isterim.' },
    ],
    confusion_warning:
      "Imperfecto ile karıştırma: Condicional '-ría' ekiyle, Imperfecto '-ía' ekiyle biter. 'Comía' (yiyordum) vs 'comería' (yerdim). Nosotros formunda dikkat: 'comíamos' vs 'comeríamos'.",
  },
  {
    tense: 'Subjuntivo Presente',
    tenseId: 'subjuntivo-presente',
    color: 'emerald',
    when_to_use:
      "İstek, şüphe, duygu veya olasılık içeren yan cümlelerde. 'Quiero que', 'espero que', 'es importante que', 'ojalá' gibi tetikleyicilerden sonra gelir.",
    signal_words: [
      'quiero que',
      'espero que',
      'ojalá',
      'es importante que',
      'dudo que',
      'cuando + gelecek',
    ],
    endings_regular: {
      '-ar': ['e', 'es', 'e', 'emos', 'éis', 'en'],
      '-er/-ir': ['a', 'as', 'a', 'amos', 'áis', 'an'],
    },
    example_verb: 'hablar',
    irregulars_note:
      "Yo formu Presente Indicativo'nun yo'sundan türer: tengo→tenga, haga, salga, conozca, sepa. Tamamen düzensiz: ser→sea, ir→vaya, estar→esté, haber→haya, dar→dé.",
    examples: [
      { es: 'Quiero que vengas a la fiesta.', tr: 'Partiye gelmeni istiyorum.' },
      { es: 'Ojalá haga buen tiempo mañana.', tr: 'Keşke yarın hava güzel olsa.' },
      { es: 'Es importante que estudies todos los días.', tr: 'Her gün ders çalışman önemli.' },
    ],
    confusion_warning:
      "Indicativo ile karıştırma: Indicativo gerçek/kesin, Subjuntivo belirsiz/öznel. 'Sé que viene' (kesin bilgi) vs 'Espero que venga' (umut/belirsizlik).",
  },
  {
    tense: 'Subjuntivo Imperfecto',
    tenseId: 'subjuntivo-imperfecto',
    color: 'slate',
    when_to_use:
      "Geçmişteki istek, şüphe veya koşul cümlelerinde. Si cümlelerinde Condicional ile birlikte çok yaygın: 'Si pudiera... haría...'",
    signal_words: [
      'si + Condicional',
      'ojalá + geçmiş',
      'quería que',
      'era importante que',
      'como si',
    ],
    endings_regular: {
      '-ar (-ra)': ['ara', 'aras', 'ara', 'áramos', 'arais', 'aran'],
      '-er/-ir (-ra)': ['iera', 'ieras', 'iera', 'iéramos', 'ierais', 'ieran'],
    },
    example_verb: 'hablar',
    irregulars_note:
      "Pretérito Indefinido'nun ellos formundan türer: fueron→fuera, tuvieron→tuviera, hicieron→hiciera, pudieron→pudiera, quisieron→quisiera, dijeron→dijera. İki paralel form: -ra ve -se (ikisi de doğru).",
    examples: [
      { es: 'Si tuviera tiempo, aprendería chino.', tr: 'Zamanım olsa Çince öğrenirdim.' },
      { es: 'Ojalá hubiera más horas en el día.', tr: 'Keşke günde daha çok saat olsa.' },
      { es: 'Quería que lo hicieras tú.', tr: 'Bunu senin yapmanı istiyordum.' },
    ],
    confusion_warning:
      "Subjuntivo Presente ile fark: Presente tetikleyici cümle şimdiki/gelecek zamandaysa, Imperfecto geçmişteyse veya si cümlelerinde kullanılır.",
  },
];

/** tenseId ile eşleşen kartı döner (yoksa null). */
export function getTenseCardById(tenseId: string): TenseCard | null {
  return ES_TENSE_CARDS.find((c) => c.tenseId === tenseId) ?? null;
}
