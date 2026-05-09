/**
 * İspanyolca A1 — Öğrenme Yolu (12 ünite)
 */

import type { UnitData } from './types';
import { voc, q, expl } from './unitBuilders';

export const ES_A1_UNITS: UnitData[] = [
  {
    id: 'es_a1_u01',
    title: 'Tanışma ve Selamlama',
    description: 'Hola, buenos días, ¿cómo te llamas?, me llamo ve vedalaşma.',
    level: 'A1',
    estimatedMinutes: 10,
    topics: ['saludos', 'presentarse', 'preguntas básicas'],
    explanation: [
      expl(
        'Günün saatine göre selam',
        'Buenos días sabah, buenas tardes öğleden sonra, buenas noches akşam veya “iyi geceler”. Hola her saatte kullanılabilen gayriresmî “merhaba”dır. Taşınırken hasta luego veya nos vemos ile pratik vedalaşın.',
        [
          {
            rule: 'Resmî ortamda “usted” ile kurulan selamlar daha uzun olabilir.',
            example_es: 'Buenas tardes, encantado de conocerle.',
            example_tr: 'İyi günler, tanıştığımıza memnun oldum (resmî).',
          },
        ]
      ),
      expl(
        'İsim ve tanışma',
        'Ad sormak: ¿Cómo te llamas? Cevap: Me llamo … veya Soy …. Tanışma nezaketi: Mucho gusto — Encantado/a (konuşanın cinsiyetine göre).',
        [
          {
            rule: 'Me llamo fiilinden sonra doğrudan isim gelir; artikel kullanılmaz.',
            example_es: 'Me llamo David.',
            example_tr: 'Benim adım David.',
          },
        ]
      ),
      expl(
        'Mini diyalog',
        '—Hola, ¿cómo estás? —Bien, gracias. ¿Y tú? —Estoy bien. Bu diyalogda estar geçici hâl için kullanılır; detay bir sonraki ünitede.',
        [
          {
            rule: '¿Qué tal? günlük “nasıl gidiyor?” sorusudur.',
            example_es: '¿Qué tal el trabajo?',
            example_tr: 'İş nasıl gidiyor?',
          },
        ]
      ),
    ],
    examples: [
      { es: 'Hola, buenos días.', tr: 'Merhaba, günaydın.', highlight: 'buenos días' },
      { es: '¿Cómo te llamas?', tr: 'Adın ne?', highlight: 'te llamas' },
      { es: 'Me llamo Elena.', tr: 'Benim adım Elena.', highlight: 'Me llamo' },
      { es: 'Mucho gusto.', tr: 'Tanıştığımıza memnun oldum.', highlight: 'gusto' },
      { es: 'Hasta mañana.', tr: 'Yarın görüşürüz.', highlight: 'Hasta' },
    ],
    exercises: [
      q('a101', 'multiple', 'Günaydın:', ['Buenos días', 'Buenas noches', 'Adiós', 'Gracias'], 'Buenos días', 'Días = günler → sabah selamı.'),
      q('a102', 'fill', 'Boşluk: _____ , ¿cómo estás?', ['Hola', 'Perdón', 'Lo siento', 'Salud'], 'Hola', 'Selamlama ile başlayın.'),
      q('a103', 'translate', '“Adın ne?”', ['¿Cómo te llamas?', '¿Cómo se llama usted?', '¿Qué eres?', '¿Dónde vives?'], '¿Cómo te llamas?', 'Samimi tekil için fiil te llamas.'),
      q('a104', 'match', 'Mucho gusto anlamı:', ['Tanıştığımıza memnun oldum', 'Hoşça kal', 'Teşekkürler', 'Özür dilerim'], 'Tanıştığımıza memnun oldum', 'Sabit kalıp.'),
      q('a105', 'multiple', '“Teşekkürler”:', ['Gracias', 'Por favor', 'Perdón', 'Salud'], 'Gracias', 'Teşekkür ifadesi.'),
    ],
    vocabulary: voc([
      ['hola', 'merhaba', 'Hola, ¿qué tal?'],
      ['buenos días', 'günaydın', 'Buenos días, familia.'],
      ['buenas tardes', 'iyi günler / tünaydın', 'Buenas tardes a todos.'],
      ['buenas noches', 'iyi akşamlar / iyi geceler', 'Buenas noches, descansa.'],
      ['adiós', 'hoşça kal', 'Adiós, hasta pronto.'],
      ['gracias', 'teşekkürler', 'Muchas gracias por todo.'],
      ['por favor', 'lütfen', 'Ayuda, por favor.'],
      ['me llamo', 'adım …', 'Me llamo Omar.'],
      ['mucho gusto', 'memnun oldum', 'Mucho gusto; soy de Ankara.'],
      ['hasta luego', 'görüşürüz', 'Hasta luego, cuídate.'],
    ]),
  },
  {
    id: 'es_a1_u02',
    title: 'Ser fiili',
    description: 'soy, eres, es… kimlik, meslek, milliyet ve kalıcı özellik.',
    level: 'A1',
    estimatedMinutes: 11,
    topics: ['ser', 'presente', 'identidad'],
    explanation: [
      expl(
        'Çekim tablosu',
        'Ser olmak fiilinin şimdiki zamanı kimlik ve tanım için kullanılır: Soy profesor, Ella es ingeniera. Bu kullanım İngilizce “to be”nin kalıcı tarafına yakındır.',
        undefined,
        {
          headers: ['Özne', 'Fiil', 'Telaffuz', 'Anlam'],
          rows: [
            ['Yo', 'soy', '(soy)', 'ben …-im'],
            ['Tú', 'eres', '(éres)', 'sen …-sin'],
            ['Él/Ella/Usted', 'es', '(es)', 'o / resmî siz …'],
            ['Nosotros/as', 'somos', '(sómos)', 'biz …-iz'],
            ['Vosotros/as', 'sois', '(sois)', 'siz … (İspanya samimi)'],
            ['Ellos/Ellas/Ustedes', 'son', '(son)', 'onlar / LA siz …'],
          ],
        }
      ),
      expl(
        'Milliyet ve meslek',
        'Soy turco / Soy turca dişil uyumu sıfatla yapılır. Meslek isimleri çoğu zaman eril/dişil biter: el médico / la médica.',
        [
          {
            rule: 'Ser de + yer köken gösterir.',
            example_es: 'Soy de Turquía.',
            example_tr: 'Türkiye\'liyim.',
          },
        ]
      ),
      expl(
        'Saat ile ser',
        'Es la una — bir saat; Son las tres — saat üç (çoğul fiil). Bu kalıpları ezberleyin; konuşma hızını artırır.',
        [
          {
            rule: 'Mediodía öğle vakti için kullanılır.',
            example_es: 'Es mediodía.',
            example_tr: 'Öğle oldu.',
          },
        ]
      ),
    ],
    examples: [
      { es: 'Yo soy estudiante.', tr: 'Ben öğrenciyim.', highlight: 'soy' },
      { es: 'Tú eres muy simpático.', tr: 'Sen çok naziksin.', highlight: 'eres' },
      { es: 'Él es médico.', tr: 'O doktor.', highlight: 'es' },
      { es: 'Nosotras somos vecinas.', tr: 'Biz (kadınlar) komşuyuz.', highlight: 'somos' },
      { es: 'Ellos son hermanos.', tr: 'Onlar kardeş.', highlight: 'son' },
    ],
    exercises: [
      q('a201', 'multiple', '“Ben mühendisim” (erkek):', ['Yo soy ingeniero.', 'Yo estoy ingeniero.', 'Yo tengo ingeniero.', 'Yo hacer ingeniero.'], 'Yo soy ingeniero.', 'Meslek + soy.'),
      q('a202', 'fill', 'Tú _____ estudiante.', ['eres', 'es', 'son', 'somos'], 'eres', 'Tú + eres.'),
      q('a203', 'translate', '“Biz arkadaşız”:', ['Somos amigos.', 'Estamos amigos.', 'Tenemos amigos.', 'Hacemos amigos.'], 'Somos amigos.', 'Kalıcı ilişki → ser.'),
      q('a204', 'multiple', 'Usted _____ profesora.', ['es', 'eres', 'sois', 'somos'], 'es', 'Usted → es.'),
      q('a205', 'match', 'Ellos için doğru çekim:', ['son', 'sois', 'somos', 'eres'], 'son', 'Ellos + son.'),
    ],
    vocabulary: voc([
      ['ser', 'olmak (kimlik)', 'Ser o no ser…'],
      ['soy', 'ben …-im', 'Yo soy traductor.'],
      ['eres', 'sen …-sin', 'Tú eres paciente.'],
      ['es', 'o …', 'La casa es grande.'],
      ['somos', 'biz …-iz', 'Somos optimistas.'],
      ['son', 'onlar …', 'Son las cuatro.'],
      ['médico / médica', 'doktor', 'Mi hermana es médica.'],
      ['ingeniero / ingeniera', 'mühendis', 'Es ingeniero civil.'],
      ['estudiante', 'öğrenci', 'Soy estudiante de español.'],
      ['de', '-den / …lı', 'Somos de España.'],
    ]),
  },
  {
    id: 'es_a1_u03',
    title: 'Estar fiili ve Ser ile temel fark',
    description: 'Konum, geçici hâl (estoy cansado) ve ser ile karşılaştırma.',
    level: 'A1',
    estimatedMinutes: 12,
    topics: ['estar', 'ser vs estar', 'ubicación'],
    explanation: [
      expl(
        'Estar çekimi',
        'Estar konum ve geçici durum için kullanılır: Estoy en casa, Estás cansado. Soy cansado yanlıştır; yorgunluk geçicidir → estar.',
        undefined,
        {
          headers: ['Özne', 'Fiil', 'Telaffuz', 'Anlam'],
          rows: [
            ['Yo', 'estoy', '(estóy)', 'ben …-ım (konum/hâl)'],
            ['Tú', 'estás', '(estás)', 'sen …'],
            ['Él/Ella/Usted', 'está', '(está)', 'o / siz …'],
            ['Nosotros/as', 'estamos', '(estámos)', 'biz …'],
            ['Vosotros/as', 'estáis', '(estáis)', 'siz …'],
            ['Ellos/Ellas/Ustedes', 'están', '(están)', 'onlar …'],
          ],
        }
      ),
      expl(
        'Ser vs estar — pratik kural',
        'Özünde ne olduğun → ser (Soy profesora). O anda nasıl olduğun veya nerede olduğun → estar (Estoy nerviosa / Estoy en el parque). Mal / bueno: Es bueno (iyi bir insan) vs Está bueno (yemek lezzetli — konuşma dilinde).',
        [
          {
            rule: 'Hayır: soy cansado değil, estoy cansado.',
            example_es: 'Estoy cansado del tráfico.',
            example_tr: 'Trafikten yorgunum.',
          },
        ]
      ),
      expl(
        'Konum (+ estar en)',
        'Şehir veya mekân: Estamos en Madrid. Adres tarifinde “estar” sık çıkar; dinleme pratiğinde tanıyın.',
        [
          {
            rule: '“¿Dónde está…?” yer sorar.',
            example_es: '¿Dónde está el baño?',
            example_tr: 'Tuvalet nerede?',
          },
        ]
      ),
    ],
    examples: [
      { es: 'Estoy bien, gracias.', tr: 'İyiyim, teşekkürler.', highlight: 'Estoy' },
      { es: '¿Dónde estás?', tr: 'Neredesin?', highlight: 'estás' },
      { es: 'La tienda está cerrada.', tr: 'Dükkan kapalı.', highlight: 'está' },
      { es: 'Somos optimistas pero estamos cansados.', tr: 'İyimseriz ama yorgunuz.', highlight: 'estamos' },
      { es: 'Están en la playa.', tr: 'Onlar plajda.', highlight: 'Están' },
    ],
    exercises: [
      q('a301', 'multiple', '“Ben yorgunum”:', ['Estoy cansado.', 'Soy cansado.', 'Tengo cansado.', 'Hago cansado.'], 'Estoy cansado.', 'Geçici durum → estar.'),
      q('a302', 'fill', 'Nosotros _____ en Barcelona.', ['estamos', 'somos', 'están', 'son'], 'estamos', 'Konum → estar.'),
      q('a303', 'translate', '“O (kadın) mutlu” (şu an):', ['Ella está contenta.', 'Ella es contenta.', 'Ella tiene contenta.', 'Ella hace contenta.'], 'Ella está contenta.', 'Geçici duygu → estar.'),
      q('a304', 'multiple', '“Biz doktoruz” (meslek):', ['Somos médicos.', 'Estamos médicos.', 'Tenemos médicos.', 'Hacemos médicos.'], 'Somos médicos.', 'Meslek kimliği → ser.'),
      q('a305', 'match', '¿Dónde _____ ? → estar:', ['está', 'es', 'son', 'soy'], 'está', 'Yer sorusu + konum.'),
    ],
    vocabulary: voc([
      ['estar', 'bulunmak / (geçici) olmak', 'Estoy listo.'],
      ['estoy', 'ben …-ım (estar)', 'Estoy aquí.'],
      ['estás', 'sen …', '¿Estás libre?'],
      ['está', 'o …', 'La puerta está abierta.'],
      ['cansado / cansada', 'yorgun', 'Estoy muy cansada.'],
      ['contento / contenta', 'mutlu', 'Están contentos con el resultado.'],
      ['en', '-de / içinde', 'Estoy en la oficina.'],
      ['aquí / allí', 'burada / şurada', 'Está aquí el menú.'],
      ['cerrado / cerrada', 'kapalı', 'El museo está cerrado.'],
      ['abierto / abierta', 'açık', 'La tienda está abierta.'],
    ]),
  },
  {
    id: 'es_a1_u04',
    title: 'Şahıs zamirleri ve hitap',
    description: 'yo, tú, usted, vosotros, ustedes — samimi ve resmî ayrım.',
    level: 'A1',
    estimatedMinutes: 10,
    topics: ['pronombres', 'tú/usted', 'vosotros'],
    explanation: [
      expl(
        'Temel özne tablosu',
        'Yo, tú, él/ella/usted, nosotros/nosotras, vosotros/vosotras (İspanya samimi çoğul siz), ellos/ellas/ustedes. Latin Amerika’da vosotros nadiren kullanılır; çoğul siz için ustedes hem resmî hem samimi olabilir.',
        [
          {
            rule: 'Usted fiillerde 3. tekil çekimi alır.',
            example_es: '¿Usted habla español?',
            example_tr: 'İspanyolca konuşuyor musunuz?',
          },
        ]
      ),
      expl(
        'Tú ve usted seçimi',
        'İlk tanışmada yaşı büyük birine veya resmî ortama usted yakışır. Arkadaş ortamında tú doğaldır. Latın Amerika’sında voseo (vos) bölgeleri vardır; A1’de standart tú/usted ile kalın.',
        [
          {
            rule: 'Komutta usted daha nazik olabilir.',
            example_es: 'Pase, por favor.',
            example_tr: 'Buyurun, lütfen.',
          },
        ]
      ),
      expl(
        'Atılmış özne',
        'Konuşmada “yo” sık düşer çünkü fiil çekimi kimliği gösterir: Hablo español = İspanyolca konuşuyorum. Yazılı öğrenmede özneyi eklemek netlik verir.',
        undefined
      ),
    ],
    examples: [
      { es: 'Yo hablo un poco de español.', tr: 'Biraz İspanyolca konuşuyorum.', highlight: 'Yo' },
      { es: '¿Tú vienes conmigo?', tr: 'Benimle geliyor musun?', highlight: 'Tú' },
      { es: 'Usted tiene razón.', tr: 'Haklısınız.', highlight: 'Usted' },
      { es: 'Vosotros sois de Valencia.', tr: 'Siz (İspanya) Valencialısınız.', highlight: 'Vosotros' },
      { es: 'Ellos estudian aquí.', tr: 'Onlar burada okuyor.', highlight: 'Ellos' },
    ],
    exercises: [
      q('a401', 'multiple', 'Resmî “siz konuşuyor” fiili:', ['Usted habla', 'Tú hablas', 'Vosotros habláis', 'Ellos hablan'], 'Usted habla', 'Usted → habla.'),
      q('a402', 'fill', '_____ somos estudiantes.', ['Nosotros', 'Nosotras', 'Ellos', 'Usted'], 'Nosotros', 'Biz erkek veya karma grup için nosotros yaygın.'),
      q('a403', 'translate', '“Onlar (kadınlar) İspanyol”:', ['Ellas son españolas.', 'Ellos son españolas.', 'Ellas están españolas.', 'Ellas tienen españolas.'], 'Ellas son españolas.', 'Milliyet + ser + uyum.'),
      q('a404', 'multiple', 'İspanya’da “siz arkadaşlar” öznesi:', ['vosotros', 'ustedes', 'ellos', 'nosotros'], 'vosotros', 'Yarımadada vosotros çoğul samimi siz.'),
      q('a405', 'match', 'Atılmış özne ile doğru çekim “konuşuyorum”:', ['hablo', 'hablas', 'hablan', 'hablamos'], 'hablo', '1. tekil -o.'),
    ],
    vocabulary: voc([
      ['yo', 'ben', 'Yo entiendo un poco.'],
      ['tú', 'sen', '¿Tú quieres café?'],
      ['él / ella', 'o (eril/dişil)', 'Ella vive aquí.'],
      ['usted', 'siz (resmî)', '¿Usted necesita ayuda?'],
      ['nosotros / nosotras', 'biz', 'Nosotras cantamos bien.'],
      ['vosotros / vosotras', 'siz (İspanya samimi)', '¿Vosotras venís mañana?'],
      ['ellos / ellas', 'onlar', 'Ellos trabajan mucho.'],
      ['ustedes', 'siz (çoğul)', '¿Ustedes tienen tiempo?'],
      ['conmigo', 'benimle', 'Ven conmigo.'],
      ['contigo', 'seninle', 'Cuento contigo.'],
    ]),
  },
  {
    id: 'es_a1_u05',
    title: 'Tanımlıklar: el, la, los, las, un, una',
    description: 'Cinsiyet, çoğul ve belirsiz artikeller.',
    level: 'A1',
    estimatedMinutes: 11,
    topics: ['artículos', 'género', 'número'],
    explanation: [
      expl(
        'Belirli artikeller',
        'El eril tekil, la dişil tekil; los eril çoğul, las dişil çoğul. İsim eşleşmesi önemlidir: el libro — la mesa.',
        [
          {
            rule: 'Çoğulda artikel ve isim birlikte çoğullaşır.',
            example_es: 'los libros / las mesas',
            example_tr: 'kitaplar / masalar',
          },
        ]
      ),
      expl(
        'Belirsiz artikeller',
        'Un eril, una dişil; “bir” veya belirsiz nesne için. Hayır cümlesinde çoğu zaman un/una kullanımı bağlama göre değişir: No tengo un coche.',
        [
          {
            rule: 'Profesyonel unvanlarla uyum: una médica.',
            example_es: 'Es una médica excelente.',
            example_tr: 'O mükemmel bir doktor (kadın).',
          },
        ]
      ),
      expl(
        'Cinsiyet ipuçları',
        '-o çoğu zaman eril, -a dişil; istisnalar (el día, el problema, la mano) için liste oluşturun.',
        undefined
      ),
    ],
    examples: [
      { es: 'El hotel es nuevo.', tr: 'Otel yeni.', highlight: 'El' },
      { es: 'La ciudad es bonita.', tr: 'Şehir güzel.', highlight: 'La' },
      { es: 'Los niños juegan.', tr: 'Çocuklar oynuyor.', highlight: 'Los' },
      { es: 'Una botella de agua.', tr: 'Bir şişe su.', highlight: 'Una' },
      { es: 'No tengo el pasaporte.', tr: 'Pasaportum yok.', highlight: 'el' },
    ],
    exercises: [
      q('a501', 'multiple', '“Masalar” (dişil):', ['las mesas', 'los mesas', 'las mesos', 'los mesos'], 'las mesas', 'Dişil çoğul las + -as.'),
      q('a502', 'fill', '_____ problema es grave.', ['El', 'La', 'Los', 'Una'], 'El', 'Problema eril istisna.'),
      q('a503', 'translate', '“Bir kahve”:', ['un café', 'una café', 'el café', 'los cafés'], 'un café', 'Café eril → un.'),
      q('a504', 'multiple', '“Şehirler” dişil çoğul:', ['las ciudades', 'los ciudades', 'las ciudad', 'el ciudades'], 'las ciudades', 'Ciudad → las ciudades.'),
      q('a505', 'match', 'la mano →', ['dişil', 'eril', 'nötr', 'çoğul'], 'dişil', 'Mano dişil kalır.'),
    ],
    vocabulary: voc([
      ['el', 'belirli eril tekil', 'El tren sale ahora.'],
      ['la', 'belirli dişil tekil', 'La puerta está abierta.'],
      ['los', 'belirli eril çoğul', 'Los precios suben.'],
      ['las', 'belirli dişil çoğul', 'Las llaves están aquí.'],
      ['un', 'bir (eril)', 'Quiero un billete.'],
      ['una', 'bir (dişil)', 'Necesito una habitación.'],
      ['libro', 'kitap', 'Un libro interesante.'],
      ['mesa', 'masa', 'La mesa está lista.'],
      ['ciudad', 'şehir', 'Una ciudad grande.'],
      ['agua', 'su', 'El agua está fría.'],
    ]),
  },
  {
    id: 'es_a1_u06',
    title: 'Sıfatlar ve uyum',
    description: 'alto/alta, bonito/bonita — cinsiyet ve sayı uyumu.',
    level: 'A1',
    estimatedMinutes: 10,
    topics: ['adjetivos', 'concordancia'],
    explanation: [
      expl(
        'Uyum kuralı',
        'İsimle aynı cinsiyet ve sayıda sıfat biter: un coche rojo / una casa roja / coches rojos / casas rojas.',
        [
          {
            rule: 'Sıfat çoğu zaman isimden sonra gelir; kullanım kaydırmalıdır.',
            example_es: 'una chica inteligente',
            example_tr: 'zeki bir kız',
          },
        ]
      ),
      expl(
        'Tipik sıfatlar',
        'Grande, pequeño, bueno, malo, joven, viejo — hepsi uyumlu. Gran/grande özel kullanımı (un gran hombre) ileri düzeyde.',
        undefined
      ),
      expl(
        'Renk sıfatları',
        'Renkler de uyum gösterir: camisas blancas. İstisna: renk ismi köken ise sabit kalabilir (naranja).',
        undefined
      ),
    ],
    examples: [
      { es: 'Un edificio alto.', tr: 'Uzun bir bina.', highlight: 'alto' },
      { es: 'La montaña es alta.', tr: 'Dağ yüksek.', highlight: 'alta' },
      { es: 'Amigos simpáticos.', tr: 'Samimi arkadaşlar.', highlight: 'simpáticos' },
      { es: 'Las flores bonitas.', tr: 'Güzel çiçekler.', highlight: 'bonitas' },
      { es: 'Es un día fantástico.', tr: 'Harika bir gün.', highlight: 'fantástico' },
    ],
    exercises: [
      q('a601', 'multiple', '“Yüksek kadın”:', ['una mujer alta', 'un mujer alta', 'una mujer alto', 'un alta mujer'], 'una mujer alta', 'Dişil uyumu alta.'),
      q('a602', 'fill', 'Los niños están _____.', ['cansados', 'cansadas', 'cansado', 'cansada'], 'cansados', 'Eril çoğul niños → cansados.'),
      q('a603', 'translate', '“Küçük evler”:', ['casas pequeñas', 'casos pequeños', 'casas pequeños', 'casos pequeñas'], 'casas pequeñas', 'Dişil çoğul.'),
      q('a604', 'multiple', 'Grande çekimi “büyük şehir” dişil:', ['una ciudad grande', 'un ciudad grande', 'una grande ciudad', 'una ciudad grando'], 'una ciudad grande', 'Grande isimden sonra gelebilir.'),
      q('a605', 'match', 'Sıfat çoğul eril -os ile:', ['rojos', 'rojas', 'rojo', 'roja'], 'rojos', 'Eril çoğul -os.'),
    ],
    vocabulary: voc([
      ['alto / alta', 'uzun / yüksek', 'Un árbol alto.'],
      ['grande', 'büyük', 'Una ciudad grande.'],
      ['pequeño / pequeña', 'küçük', 'Niños pequeños.'],
      ['bueno / buena', 'iyi', 'Un buen día.'],
      ['malo / mala', 'kötü', 'Una mala idea.'],
      ['bonito / bonita', 'güzel', 'Un vestido bonito.'],
      ['joven', 'genç', 'Una persona joven.'],
      ['viejo / vieja', 'yaşlı', 'Un hombre viejo.'],
      ['simpático / simpática', 'sıcakkanlı', 'Amigos simpáticos.'],
      ['inteligente', 'zeki', 'Una estudiante inteligente.'],
    ]),
  },
  {
    id: 'es_a1_u07',
    title: 'Tener fiili — yaş ve sahiplik',
    description: 'Tengo 25 años; tengo un coche; tener hambre.',
    level: 'A1',
    estimatedMinutes: 12,
    topics: ['tener', 'edad', 'posesión'],
    explanation: [
      expl(
        'Yaş ifadesi',
        'İspanyolca’da “ben 25 yaşındayım” = Tengo veinticinco años. Yaş “yıl sahibi olmak” metaforuyla kurulur; soy 25 años yanlıştır.',
        [
          {
            rule: 'Años çoğul kalır.',
            example_es: 'Tiene treinta años.',
            example_tr: 'O otuz yaşında.',
          },
        ]
      ),
      expl(
        'Sahiplik ve ilişki',
        'Tengo dos hermanos; tenemos tiempo; tienes razón (haklısın). Fiil çekim tablosunu ezberleyin.',
        undefined,
        {
          headers: ['Özne', 'Fiil', 'Telaffuz', 'Anlam'],
          rows: [
            ['Yo', 'tengo', '(téngo)', 'benim var'],
            ['Tú', 'tienes', '(tiénes)', 'senin var'],
            ['Él/Ella/Usted', 'tiene', '(tiéne)', 'onun var'],
            ['Nosotros/as', 'tenemos', '(tenémos)', 'bizim var'],
            ['Vosotros/as', 'tenéis', '(tenéis)', 'sizin var'],
            ['Ellos/Ustedes', 'tienen', '(tiénen)', 'onların var'],
          ],
        }
      ),
      expl(
        'Tener + isim (ihtiyaç veya duygu)',
        'Tener hambre/sed/sueño/suerte — Türkçede “açlık hissetmek” gibi düşünün.',
        [
          {
            rule: 'Tener frío/calor:',
            example_es: 'Tenemos frío.',
            example_tr: 'Üşüyoruz.',
          },
        ]
      ),
    ],
    examples: [
      { es: 'Tengo veintidós años.', tr: '22 yaşındayım.', highlight: 'Tengo' },
      { es: '¿Tienes hermanos?', tr: 'Kardeşin var mı?', highlight: 'Tienes' },
      { es: 'No tenemos coche.', tr: 'Arabamız yok.', highlight: 'tenemos' },
      { es: 'Tiene mucha paciencia.', tr: 'Çok sabrı var.', highlight: 'Tiene' },
      { es: 'Tienen hambre.', tr: 'Açlar.', highlight: 'Tienen' },
    ],
    exercises: [
      q('a701', 'multiple', '“Benim iki çocuğum var”:', ['Tengo dos hijos.', 'Soy dos hijos.', 'Estoy dos hijos.', 'Hago dos hijos.'], 'Tengo dos hijos.', 'Sahiplik → tener.'),
      q('a702', 'fill', '¿Cuántos años _____ ?', ['tienes', 'tienen', 'tiene', 'tenemos'], 'tienes', 'Tú + tienes.'),
      q('a703', 'translate', '“Susuzum”:', ['Tengo sed.', 'Estoy sed.', 'Soy sed.', 'Hago sed.'], 'Tengo sed.', 'Sabit kalıp tener sed.'),
      q('a704', 'multiple', '“Haklısınız” (resmî):', ['Usted tiene razón.', 'Usted eres razón.', 'Usted está razón.', 'Usted hace razón.'], 'Usted tiene razón.', 'Tener razón.'),
      q('a705', 'match', 'Yaş için doğru fiil:', ['tener', 'ser', 'estar', 'hacer'], 'tener', 'Tengo … años.'),
    ],
    vocabulary: voc([
      ['tener', 'sahip olmak / (yaş) olmak', 'Tener cuidado.'],
      ['tengo', 'benim var / … yaşındayım', 'Tengo tiempo libre.'],
      ['años', 'yıl / yaş', '¿Cuántos años tienes?'],
      ['hermano / hermana', 'kardeş', 'Tengo una hermana.'],
      ['hijo / hija', 'oğul / kız', 'Tiene dos hijas.'],
      ['coche', 'araba', 'No tenemos coche.'],
      ['hambre', 'açlık', 'Tengo hambre.'],
      ['sed', 'susuzluk', '¿Tienes sed?'],
      ['frío', 'soğuk / üşüme', 'Tengo frío.'],
      ['calor', 'sıcak', 'Tienen calor.'],
    ]),
  },
  {
    id: 'es_a1_u08',
    title: 'Presente — düzenli fiiller (-ar / -er / -ir)',
    description: 'hablar, comer, vivir çekimleri ve zamanın şimdiki kullanımı.',
    level: 'A1',
    estimatedMinutes: 13,
    topics: ['presente indicativo', 'regular verbs'],
    explanation: [
      expl(
        '-ar fiiller',
        'Kök + o, as, a, amos, áis, an: hablar → hablo/hablas/habla/hablamos/habláis/hablan.',
        undefined,
        {
          headers: ['Özne', 'hablar', 'Telaffuz', 'Anlam'],
          rows: [
            ['Yo', 'hablo', '(áblo)', 'konuşurum'],
            ['Tú', 'hablas', '(áblas)', 'konuşursun'],
            ['Él/Ella/Usted', 'habla', '(ábla)', 'konuşur'],
            ['Nosotros/as', 'hablamos', '(ablámos)', 'konuşuruz'],
            ['Vosotros/as', 'habláis', '(abláis)', 'konuşursunuz'],
            ['Ellos/Ustedes', 'hablan', '(áblan)', 'konuşurlar'],
          ],
        }
      ),
      expl(
        '-er ve -ir',
        '-er: comer → como/comes/come/comemos/coméis/comen. -ir: vivir → vivo/vives/vive/vivimos/vivís/viven. İlk ve ikinci tekil vurgusu öğrenin.',
        [
          {
            rule: 'Şimdiki zaman geniş zaman gibi de rutinleri anlatır.',
            example_es: 'Trabajo los lunes.',
            example_tr: 'Pazartesileri çalışırım.',
          },
        ]
      ),
      expl(
        'Fiil kökünü bulma',
        'İnfinitivden son iki harfi düşünün; düzensizleri sonraki ünitelerde işleyeceğiz.',
        undefined
      ),
    ],
    examples: [
      { es: 'Hablo español todos los días.', tr: 'Her gün İspanyolca konuşuyorum.', highlight: 'Hablo' },
      { es: '¿Comes carne?', tr: 'Et yer misin?', highlight: 'Comes' },
      { es: 'Vive en Sevilla.', tr: 'Sevilla\'da yaşıyor.', highlight: 'Vive' },
      { es: 'Vivimos cerca del mar.', tr: 'Denizin yakınında yaşıyoruz.', highlight: 'Vivimos' },
      { es: 'Estudian medicina.', tr: 'Tıp okuyorlar.', highlight: 'Estudian' },
    ],
    exercises: [
      q('a801', 'multiple', 'hablar — yo:', ['hablo', 'hablas', 'habla', 'hablan'], 'hablo', '-ar → -o.'),
      q('a802', 'fill', 'Ellos _____ español.', ['hablan', 'hablamos', 'hablo', 'hablas'], 'hablan', 'Ellos + -an.'),
      q('a803', 'translate', '“Biz yemek yiyoruz”:', ['Comemos.', 'Comemos comida.', 'Comemos el.', 'Comemos en.'], 'Comemos.', 'Comer nosotros → comemos.'),
      q('a804', 'multiple', 'vivir — tú:', ['vives', 'vivo', 'vive', 'vivís'], 'vives', 'Tú + -es (-ir).'),
      q('a805', 'match', 'trabajar kökü + amos:', ['trabajamos', 'trabajan', 'trabajo', 'trabajas'], 'trabajamos', 'Nosotros -amos.'),
    ],
    vocabulary: voc([
      ['hablar', 'konuşmak', 'Hablar en público.'],
      ['comer', 'yemek', '¿Comes aquí a menudo?'],
      ['vivir', 'yaşamak', 'Vivir en el centro.'],
      ['estudiar', 'okumak / çalışmak', 'Estudio derecho.'],
      ['trabajar', 'çalışmak', 'Trabajo en remoto.'],
      ['escuchar', 'dinlemek', 'Escucho música clásica.'],
      ['mirar', 'bakmak', 'Miro la pantalla.'],
      ['comprar', 'satın almak', 'Compro pan cada día.'],
      ['necesitar', 'ihtiyaç duymak', 'Necesito ayuda.'],
      ['desear', 'istemek', 'Deseo un café solo.'],
    ]),
  },
  {
    id: 'es_a1_u09',
    title: 'Olumsuz cümle ve sorular',
    description: 'No + fiil; ¿...? ters ünlem; wh- soruları.',
    level: 'A1',
    estimatedMinutes: 10,
    topics: ['negación', 'preguntas', 'entonación'],
    explanation: [
      expl(
        'Olumsuzluk',
        'No + çekimli fiil: No hablo francés. Çift olumsuz (no… nunca / no… nadie) ileri düzey; A1’de no yeterli.',
        [
          {
            rule: 'Sıfat veya isim olumsuzu bazen no es… ile kurulur.',
            example_es: 'No es verdad.',
            example_tr: 'Bu doğru değil.',
          },
        ]
      ),
      expl(
        'Genel sorular',
        '¿Hablas inglés? — yükselen ton veya ¿ ile yazılı işaret. Cevap sí/no veya tam cümle.',
        undefined
      ),
      expl(
        'Soru kelimeleri',
        'Qué (ne), quién (kim), dónde (nerede), cuándo (ne zaman), cómo (nasıl), por qué (neden), cuánto (ne kadar). Fiil çoğu zaman özneden sonra kalır.',
        [
          {
            rule: '¿Qué hora es? saat sorusu.',
            example_es: '¿Qué hora es?',
            example_tr: 'Saat kaç?',
          },
        ]
      ),
    ],
    examples: [
      { es: 'No entiendo.', tr: 'Anlamıyorum.', highlight: 'No' },
      { es: '¿Tienes tiempo?', tr: 'Vaktin var mı?', highlight: '¿' },
      { es: 'No, no tengo tiempo.', tr: 'Hayır, vaktim yok.', highlight: 'no tengo' },
      { es: '¿Por qué estudias español?', tr: 'Neden İspanyolca çalışıyorsun?', highlight: 'Por qué' },
      { es: '¿Dónde vives?', tr: 'Nerede yaşıyorsun?', highlight: 'Dónde' },
    ],
    exercises: [
      q('a901', 'multiple', '“İspanyolca konuşmuyorum”:', ['No hablo español.', 'No soy español.', 'No estoy español.', 'No tengo español.'], 'No hablo español.', 'Fiilin önüne no.'),
      q('a902', 'fill', '_____ necesitas ayuda?', ['¿', '¡', '¿Por qué', 'No'], '¿', 'Soru işareti ¿ ile başlar.'),
      q('a903', 'translate', '“Bu doğru değil”:', ['No es verdad.', 'No tiene verdad.', 'No está verdad.', 'No hace verdad.'], 'No es verdad.', 'Gerçeklik iddiası → ser.'),
      q('a904', 'multiple', '“Nerede”:', ['¿Dónde?', '¿Cuándo?', '¿Quién?', '¿Por qué?'], '¿Dónde?', 'Yer sorusu.'),
      q('a905', 'match', 'Sí / No cevabı:', ['sí = evet', 'no = hayır', 'quizás = belki', 'tal vez = belki'], 'sí = evet', 'Sí kelimesi evet.'),
    ],
    vocabulary: voc([
      ['no', 'hayır / değil', 'No lo sé.'],
      ['sí', 'evet', 'Sí, por supuesto.'],
      ['¿qué?', 'ne?', '¿Qué pasa?'],
      ['¿quién?', 'kim?', '¿Quién es?'],
      ['¿dónde?', 'nerede?', '¿Dónde está el metro?'],
      ['¿cuándo?', 'ne zaman?', '¿Cuándo llegas?'],
      ['¿cómo?', 'nasıl?', '¿Cómo te llamas?'],
      ['¿por qué?', 'neden?', '¿Por qué no vienes?'],
      ['¿cuánto?', 'ne kadar?', '¿Cuánto cuesta?'],
      ['nada', 'hiçbir şey', 'No veo nada.'],
    ]),
  },
  {
    id: 'es_a1_u10',
    title: 'Sayılar ve tarihler',
    description: '1–100, günler, aylar; ¿Qué fecha es hoy?',
    level: 'A1',
    estimatedMinutes: 12,
    topics: ['números', 'fechas', 'días', 'meses'],
    explanation: [
      expl(
        '1–100 özeti',
        'Veinte (20), treinta (30) … noventa (90); birler birleşir: treinta y uno. Yüz = cien / ciento.',
        [
          {
            rule: '16–19: dieciséis, diecisiete…',
            example_es: 'Tengo dieciocho años.',
            example_tr: '18 yaşındayım.',
          },
        ]
      ),
      expl(
        'Tarih söyleme',
        'Hoy es el quince de marzo. İspanyolca’da tarih çoğu zaman eril takvim günü + de + ay: el primero de mayo.',
        undefined
      ),
      expl(
        'Haftanın günleri',
        'Pazartesi lunes … pazar domingo. Haftanın günleri çoğu zaman dişildir (la lunes değil el lunes bazı bölgelerde — İspanyolca genelde “los lunes” rutinde).',
        [
          {
            rule: 'Los martes çılgın indirim — rutin + çoğul gün.',
            example_es: 'Los viernes descanso.',
            example_tr: 'Cumaları dinlenirim.',
          },
        ]
      ),
    ],
    examples: [
      { es: 'Son las tres y cuarto.', tr: 'Saat üçü çeyrek geçiyor.', highlight: 'cuarto' },
      { es: 'Hoy es lunes.', tr: 'Bugün pazartesi.', highlight: 'lunes' },
      { es: 'Mi cumpleaños es el dos de abril.', tr: 'Doğum günüm 2 Nisan.', highlight: 'abril' },
      { es: 'Hay treinta días en abril.', tr: 'Nisan ayında otuz gün vardır.', highlight: 'treinta' },
      { es: '¿Qué día es hoy?', tr: 'Bugün günlerden ne?', highlight: 'Qué día' },
    ],
    exercises: [
      q('aa01', 'multiple', '31 İspanyolca:', ['treinta y uno', 'treinta y dos', 'veintidós', 'cuarenta'], 'treinta y uno', '30 + y + 1.'),
      q('aa02', 'fill', 'Marzo = _____.', ['Mart', 'Nisan', 'Mayıs', 'Şubat'], 'Mart', 'Marzo Mart.'),
      q('aa03', 'translate', '“Saat beş” (bağlam: saat gösterimi — son las …):', ['Son las cinco.', 'Es las cinco.', 'Están las cinco.', 'Tienen las cinco.'], 'Son las cinco.', 'Çoğul saatler son las.'),
      q('aa04', 'multiple', '“Cuma”:', ['viernes', 'jueves', 'martes', 'miércoles'], 'viernes', 'Haftanın günü.'),
      q('aa05', 'match', '¿Cuántos años tienes? anlamı:', ['Kaç yaşındasın?', 'Saat kaç?', 'Bugün ne?', 'Neredesin?'], 'Kaç yaşındasın?', 'Yaş için típik soru.'),
    ],
    vocabulary: voc([
      ['uno / dos / tres', 'bir / iki / üç', 'Uno, dos, tres…'],
      ['diez', 'on', 'Diez minutos.'],
      ['veinte', 'yirmi', 'Veinte años.'],
      ['cien / ciento', 'yüz', 'Ciento uno.'],
      ['lunes', 'pazartesi', 'El lunes viajo.'],
      ['viernes', 'cuma', 'Los viernes hay mercado.'],
      ['enero', 'Ocak', 'En enero hace frío.'],
      ['julio', 'Temmuz', 'En julio hace calor.'],
      ['marzo', 'Mart', 'El primero de marzo.'],
      ['cumpleaños', 'doğum günü', 'Feliz cumpleaños.'],
    ]),
  },
  {
    id: 'es_a1_u11',
    title: 'Günlük rutin fiilleri',
    description: 'Levantarse, desayunar, trabajar, acostarse — mastar ve zaman zarfları.',
    level: 'A1',
    estimatedMinutes: 11,
    topics: ['rutina', 'verbos reflexivos', 'adverbios'],
    explanation: [
      expl(
        'Refleksif mastarlar (giriş)',
        'Levantarse (kalkmak), ducharse (duş almak), acostarse (yatmak) mastarının sonunda -se vardır; çekimde me/te/se/nos/os/se yer alır: Me levanto a las siete.',
        [
          {
            rule: 'Infinitivde se mastara yapışık kalır.',
            example_es: 'Quiero despertarme tarde.',
            example_tr: 'Geç uyanmak istiyorum.',
          },
        ]
      ),
      expl(
        'Zaman dizisi',
        'Primero… luego… después… por la mañana/tarde/noche ile rutini sıralayın.',
        undefined
      ),
      expl(
        'Sık zarflar',
        'Siempre (her zaman), a veces (bazen), nunca (asla), todos los días gibi zarflar presente ile uyumludur.',
        undefined
      ),
    ],
    examples: [
      { es: 'Me levanto a las siete.', tr: 'Saat yedi kalkıyorum.', highlight: 'Me levanto' },
      { es: 'Desayuno café y pan.', tr: 'Kahvaltıda kahve ve ekmek alıyorum.', highlight: 'Desayuno' },
      { es: 'Trabajo hasta las seis.', tr: 'Altıya kadar çalışıyorum.', highlight: 'Trabajo' },
      { es: 'Por la noche me relajo.', tr: 'Akşamları rahatlıyorum.', highlight: 'me relajo' },
      { es: 'Me acuesto tarde los fines de semana.', tr: 'Hafta sonları geç yatıyorum.', highlight: 'Me acuesto' },
    ],
    exercises: [
      q('ab01', 'multiple', '“Saat 7 kalkıyorum”:', ['Me levanto a las siete.', 'Yo levanto a las siete.', 'Me levantas a las siete.', 'Me levantamos a las siete.'], 'Me levanto a las siete.', 'Me levanto.'),
      q('ab02', 'fill', 'Por la mañana _____ el desayuno.', ['tomo', 'tomas', 'tomamos', 'toman'], 'tomo', 'Yo + tomo.'),
      q('ab03', 'translate', '“Duş alıyorum”:', ['Me ducho.', 'Yo ducho.', 'Estoy ducha.', 'Tengo ducha.'], 'Me ducho.', 'Refleksif ducharse.'),
      q('ab04', 'multiple', '“Her zaman”:', ['siempre', 'nunca', 'a veces', 'tal vez'], 'siempre', 'Zarf sıklığı.'),
      q('ab05', 'match', 'luego ≈', ['sonra', 'önce', 'şimdi', 'hiç'], 'sonra', 'Zaman sırası.'),
    ],
    vocabulary: voc([
      ['levantarse', 'kalkmak', 'Me levanto pronto.'],
      ['desayunar', 'kahvaltı etmek', 'Desayuno ligero.'],
      ['almorzar', 'öğle yemeği yemek', 'Almuerzo a las dos.'],
      ['cenar', 'akşam yemeği yemek', 'Ceno en casa.'],
      ['acostarse', 'yatmak', 'Me acuesto pronto.'],
      ['ducharse', 'duş almak', 'Me ducho por la mañana.'],
      ['trabajar', 'çalışmak', 'Trabajo ocho horas.'],
      ['descansar', 'dinlenmek', 'Descanso el domingo.'],
      ['siempre', 'her zaman', 'Siempre puntual.'],
      ['a veces', 'bazen', 'A veces cocino.'],
    ]),
  },
  {
    id: 'es_a1_u12',
    title: 'Yiyecek ve sipariş',
    description: 'Quiero, quisiera, menü ve öneri soruları.',
    level: 'A1',
    estimatedMinutes: 11,
    topics: ['comida', 'restaurante', 'pedir'],
    explanation: [
      expl(
        'İstek fiilleri',
        'Quiero una paella; querer mastarı düzensizdir (quiero/quieres/quiere…). Nazik istek: Quisiera… (Lit. dilek kipi görünümü).',
        [
          {
            rule: 'Me gusta kalıbı bir sonraki seviyede genişler; burada “quiero” ile başlayın.',
            example_es: 'Quiero el menú del día.',
            example_tr: 'Günün menüsünü istiyorum.',
          },
        ]
      ),
      expl(
        'Restoran diyalog kalıbı',
        '¿Qué recomienda? — Garson önerisi. La cuenta, por favor — hesap lütfen.',
        undefined
      ),
      expl(
        'İçecek ve yemek kelimeleri',
        'Agua, vino, cerveza, ensalada, postre — artikel ve sayı ile pratik yapın.',
        undefined
      ),
    ],
    examples: [
      { es: 'Quisiera una mesa para dos.', tr: 'İki kişilik masa istiyorum.', highlight: 'Quisiera' },
      { es: '¿Qué recomienda el chef?', tr: 'Şef ne öneriyor?', highlight: 'recomienda' },
      { es: 'Para mí, la sopa.', tr: 'Benim için çorba.', highlight: 'Para mí' },
      { es: 'Sin gluten, por favor.', tr: 'Glütensiz lütfen.', highlight: 'Sin' },
      { es: '¿Me trae la cuenta?', tr: 'Hesabı getirir misiniz?', highlight: 'cuenta' },
    ],
    exercises: [
      q('ac01', 'multiple', 'Nazik “…isterdim”:', ['Quisiera…', 'Quiero…', 'Tengo…', 'Soy…'], 'Quisiera…', 'Serviste nazik kalıp.'),
      q('ac02', 'fill', '_____, por favor (hesap isteme).', ['La cuenta', 'El menú', 'La propina', 'La mesa'], 'La cuenta', '“La cuenta” sabit kalıbı.'),
      q('ac03', 'translate', '“Benim için su”:', ['Para mí, agua.', 'Por mí, agua.', 'Para yo, agua.', 'De mí, agua.'], 'Para mí, agua.', 'Para mí = benim için.'),
      q('ac04', 'multiple', '“Hesap” kelimesi:', ['la cuenta', 'el menú', 'la propina', 'la mesa'], 'la cuenta', 'Hesap isteme.'),
      q('ac05', 'match', 'sin gluten ≈', ['glütensiz', 'şekerli', 'acılı', 'tatlı'], 'glütensiz', 'Alerji bildirimi.'),
    ],
    vocabulary: voc([
      ['menú', 'menü', 'El menú del día.'],
      ['cuenta', 'hesap', 'La cuenta, por favor.'],
      ['propina', 'bahşiş', 'Dejo propina.'],
      ['plato', 'tabak / yemek', 'Primer plato.'],
      ['postre', 'tatlı', '¿Algún postre?'],
      ['bebida', 'içecek', 'Bebida incluida.'],
      ['agua', 'su', 'Agua con gas.'],
      ['cerveza', 'bira', 'Una cerveza fría.'],
      ['ensalada', 'salata', 'Ensalada mixta.'],
      ['sin', '-siz / olmadan', 'Sin lactosa.'],
    ]),
  },
];
