/**
 * İspanyolca B1 — Öğrenme Yolu (10 ünite)
 */

import type { UnitData } from './types';
import { voc, q, expl } from './unitBuilders';

export const ES_B1_UNITS: UnitData[] = [
  {
    id: 'es_b1_u01',
    title: 'Pretérito perfecto',
    description: 'he comido, has ido — yakın geçmiş ve deneyim.',
    level: 'B1',
    estimatedMinutes: 13,
    topics: ['pretérito perfecto', 'experiencia'],
    explanation: [
      expl(
        'Yapı',
        'haber (presente) + participio: He trabajado hasta tarde. Çoğu fiilde participio -ado/-ido; düzensiz hecho, dicho, visto…',
        undefined,
        {
          headers: ['Özne', 'haber', 'Participio', 'Anlam'],
          rows: [
            ['Yo', 'he', 'hablado', 'konuştum (yakın geçmiş)'],
            ['Tú', 'has', 'comido', 'yedın'],
            ['Él/Ella/Usted', 'ha', 'vivido', 'yaşadı'],
            ['Nosotros/as', 'hemos', 'estudiado', 'çalıştık'],
            ['Vosotros/as', 'habéis', 'viajado', 'seyahat ettiniz'],
            ['Ellos/Ustedes', 'han', 'decidido', 'karar verdiler'],
          ],
        }
      ),
      expl(
        'Peninsula vs Amerika',
        'İspanya’da bugün içinde biten olaylar için perfecto sık; Amerika’da pretérito tercih edilebilir. DELE sınavında metindeki işaret kelimelere dikkat.',
        [
          {
            rule: 'Ya + perfecto: Ya he terminado.',
            example_es: 'Todavía no he comido.',
            example_tr: 'Henüz yemedim.',
          },
        ]
      ),
      expl(
        'Deneyim',
        'Nunca he estado en Chile — hayat deneyimi (ve hâlâ geçerli olabilir).',
        undefined
      ),
    ],
    examples: [
      { es: 'He perdido las llaves.', tr: 'Anahtarları kaybettim.', highlight: 'He perdido' },
      { es: '¿Has leído el informe?', tr: 'Raporu okudun mu?', highlight: 'Has leído' },
      { es: 'Todavía no ha llegado el paquete.', tr: 'Paket henüz gelmedi.', highlight: 'ha llegado' },
      { es: 'Hemos vivido aquí dos años.', tr: 'İki yıldır burada yaşıyoruz.', highlight: 'Hemos vivido' },
      { es: 'Han anunciado cambios.', tr: 'Değişiklikleri duyurdular.', highlight: 'Han anunciado' },
    ],
    exercises: [
      q('d101', 'multiple', 'hablar perfecto yo:', ['He hablado.', 'Hablo hablado.', 'He hablando.', 'Yo he hablar.'], 'He hablado.', 'haber + participio.'),
      q('d102', 'fill', '¿_____ visto la película?', ['Has', 'Hayas', 'Has habido', 'Habías'], 'Has', 'Tú + has.'),
      q('d103', 'translate', '“Henüz bitirmedim”:', ['Todavía no he terminado.', 'Ya no he terminado.', 'Todavía no terminé.', 'No he terminado ya.'], 'Todavía no he terminado.', 'Ya/todavía + perfecto.'),
      q('d104', 'multiple', 'Participio düzensiz “yazmak”:', ['escrito', 'escribido', 'escribiendo', 'escritado'], 'escrito', 'Escribir → escrito.'),
      q('d105', 'match', 'hemos + participio ≈', ['biz … -dık (yakın)', 'biz … -mişiz', 'biz … -eceğiz', 'biz … -iyorduk'], 'biz … -dık (yakın)', 'Perfecto compound.'),
    ],
    vocabulary: voc([
      ['he / has / ha', 'yardımcı haber', 'Ha llovido.'],
      ['hemos / habéis / han', 'yardımcı haber (çoğul)', 'Han cerrado la tienda.'],
      ['participio', 'ortac', 'Hecho / dicho / visto.'],
      ['ya', 'zaten / çoktan', 'Ya hemos salido.'],
      ['todavía', 'henüz / hâlâ', 'Todavía estoy aquí.'],
      ['nunca', 'asla / hiç', 'Nunca he ido.'],
      ['alguna vez', 'bir zaman', '¿Has estado alguna vez en París?'],
      ['recientemente', 'son zamanlarda', 'He viajado recientemente.'],
      ['últimamente', 'son zamanlarda', 'Últimamente trabajo mucho.'],
      ['experiencia', 'deneyim', 'Es una buena experiencia.'],
    ]),
  },
  {
    id: 'es_b1_u02',
    title: 'Pluscuamperfecto',
    description: 'había comido — geçmişte daha önce tamamlanmış.',
    level: 'B1',
    estimatedMinutes: 12,
    topics: ['pluscuamperfecto', 'anterioridad'],
    explanation: [
      expl(
        'Formül',
        'había / habías… + participio: Cuando llegué, ya habían empezado. Geçmişteki olaydan daha önce olan eylem.',
        [
          {
            rule: 'Sık görülen bağlaç: cuando, después de que (indicativo ile).',
            example_es: 'Después de que había cenado, salió.',
            example_tr: 'Akşam yemeğinden sonra çıktı.',
          },
        ]
      ),
      expl(
        'İlişki dolayısı ve sıralama',
        '“Önce … sonra …” anlatımında temporal çiftler kurdurun.',
        undefined
      ),
      expl(
        'Si + pluscuamperfecto',
        'Hayır gerçekleşmiş koşul (si hubiera…) B2’de; B1’de había estudiado ile geçmiş hazırlığı anlatın.',
        undefined
      ),
    ],
    examples: [
      { es: 'Ya había terminado cuando llamaste.', tr: 'Sen aradığında çoktan bitirmiştim.', highlight: 'había terminado' },
      { es: 'No sabía que habías estado enfermo.', tr: 'Hasta olduğunu bilmiyordum.', highlight: 'habías estado' },
      { es: 'Habían cerrado la tienda.', tr: 'Dükkanı kapatmışlardı.', highlight: 'Habían cerrado' },
      { es: 'Siempre había querido viajar solo.', tr: 'Her zaman tek başıma seyahat etmek istemişimdir.', highlight: 'había querido' },
      { es: 'Me di cuenta de que me había equivocado.', tr: 'Yanıldığımı fark ettim.', highlight: 'había equivocado' },
    ],
    exercises: [
      q('d201', 'multiple', '“Yememiştim”:', ['No había comido.', 'No he comido.', 'No comía.', 'No comí.'], 'No había comido.', 'Önceki geçmiş.'),
      q('d202', 'fill', 'Cuando llegó, el tren ya _____.', ['había salido', 'ha salido', 'salía', 'salió'], 'había salido', 'Önce tren çıkmıştı.'),
      q('d203', 'translate', '“Gitmişlerdi”:', ['Habían ido.', 'Han ido.', 'Iban.', 'Fueron.'], 'Habían ido.', 'Ellos + habían + participio.'),
      q('d204', 'multiple', 'había + estado →', ['geçmişte bir süre olmuştu', 'şu an', 'gelecek', 'her zaman'], 'geçmişte bir süre olmuştu', 'Pluscuamperfecto estar.'),
      q('d205', 'match', 'anterioridad ≈', ['öncelik / daha önce', 'sonra', 'şimdi', 'asla'], 'öncelik / daha önce', 'Zaman sırası.'),
    ],
    vocabulary: voc([
      ['había', 'yardımcı (geçmiş)', 'Había llovido.'],
      ['anterioridad', 'önce gelmiş olma', 'Marca de anterioridad.'],
      ['cuando', '…dığında', 'Cuando llegó…'],
      ['antes de que', '…meden önce', 'Antes de que empiece…'],
      ['después de que', '…dıktan sonra', 'Después de que terminó…'],
      ['ya', 'çoktan', 'Ya habían llegado.'],
      ['todavía no', 'henüz değil', 'Todavía no había amanecido.'],
      ['darse cuenta', 'farkına varmak', 'Me di cuenta.'],
      ['equivocarse', 'yanılmak', 'Me había equivocado.'],
      ['llegar tarde', 'geç kalmak', 'Había llegado tarde.'],
    ]),
  },
  {
    id: 'es_b1_u03',
    title: 'Futuro simple',
    description: 'hablaré, comerás — tahmin, vaat ve uzak gelecek.',
    level: 'B1',
    estimatedMinutes: 12,
    topics: ['futuro simple', 'predicción'],
    explanation: [
      expl(
        'Düzenli ekler',
        '-é, -ás, -á, -emos, -éis, -án eklenir; mastara (hablar → hablaré).',
        undefined,
        {
          headers: ['Özne', 'comer', 'Telaffuz', 'Anlam'],
          rows: [
            ['Yo', 'comeré', '(comeré)', 'yiyeceğim'],
            ['Tú', 'comerás', '(comerás)', 'yiyeceksin'],
            ['Él/Ella/Usted', 'comerá', '(comerá)', 'yiyecek'],
            ['Nosotros/as', 'comeremos', '(comerémos)', 'yiyeceğiz'],
            ['Vosotros/as', 'comeréis', '(comeréis)', 'yiyeceksiniz'],
            ['Ellos/Ustedes', 'comerán', '(comerán)', 'yiyecekler'],
          ],
        }
      ),
      expl(
        'Kullanım',
        'Resmî vaat, uzak plan, raporda tahmin: El proyecto costará más de lo previsto.',
        [
          {
            rule: 'Konuşmada ir+a daha sık; yazılı ve resmî futuro simple görülür.',
            example_es: 'Le enviaré el archivo mañana.',
            example_tr: 'Dosyayı yarın göndereceğim.',
          },
        ]
      ),
      expl(
        'Düzensiz kökler',
        'Tendré, tendrás (tener); haré (hacer); podré (poder) — tablo ezberi.',
        undefined
      ),
    ],
    examples: [
      { es: 'Te llamaré más tarde.', tr: 'Seni sonra arayacağım.', highlight: 'llamaré' },
      { es: '¿Vendrás a la reunión?', tr: 'Toplantıya gelecek misin?', highlight: 'Vendrás' },
      { es: 'El informe saldrá el viernes.', tr: 'Rapor cuma günü çıkacak.', highlight: 'saldrá' },
      { es: 'No cabrá duda.', tr: 'Kuşku olmayacak.', highlight: 'cabrá' },
      { es: 'Habrá muchos cambios.', tr: 'Çok değişiklik olacak.', highlight: 'Habrá' },
    ],
    exercises: [
      q('d301', 'multiple', 'hablar yo futuro:', ['hablaré', 'hablo', 'hablaría', 'he hablado'], 'hablaré', '-é eki.'),
      q('d302', 'fill', 'Mañana _____ el resultado.', ['sabrás', 'sabes', 'supiste', 'sabías'], 'sabrás', 'Saber futuro düzensiz → sabrás.'),
      q('d303', 'translate', '“Yardım edeceğim”:', ['Ayudaré.', 'Voy a ayudar.', 'Ayudo.', 'Ayudaba.'], 'Ayudaré.', 'Futuro simple net vaat.'),
      q('d304', 'multiple', 'haber futuro (impersonal):', ['Habrá', 'Haya', 'Hay', 'Había'], 'Habrá', 'Habrá + sustantivo.'),
      q('d305', 'match', 'costará ≈', ['mal olacak / tutacak', 'mal oldu', 'tutuyor', 'tuttu'], 'mal olacak / tutacak', 'Gelecek fiyat.'),
    ],
    vocabulary: voc([
      ['futuro', 'gelecek zaman', 'Tiempo futuro.'],
      ['predicción', 'tahmin', 'Predicción meteorológica.'],
      ['promesa', 'vaat', 'Cumpliré mi promesa.'],
      ['plazo', 'süre', 'El plazo termina el lunes.'],
      ['previsto', 'öngörülen', 'Más de lo previsto.'],
      ['vencer', 'vadesi dolmak', 'El contrato vencerá.'],
      ['renovar', 'yenilemek', 'Renovaré el carnet.'],
      ['adjuntar', 'eklemek', 'Adjuntaré el archivo.'],
      ['confirmar', 'onaylamak', 'Confirmaré la hora.'],
      ['reenviar', 'yeniden göndermek', 'Reenviaré el correo.'],
    ]),
  },
  {
    id: 'es_b1_u04',
    title: 'Condicional',
    description: 'hablaría, comería — nazik istek, hipotez ve “would”.',
    level: 'B1',
    estimatedMinutes: 12,
    topics: ['condicional', 'cortesía'],
    explanation: [
      expl(
        'Biçim',
        '-ía, -ías, -ía, -íamos, -íais, -ían (fiile eklenir): Me gustaría un café.',
        [
          {
            rule: 'Koşul cümlesi tip 2 (si + imperfecto…) ile birlikte B2’de derinleşir.',
            example_es: 'Si tuviera tiempo, viajaría más.',
            example_tr: 'Zamanım olsa daha çok seyahat ederdim.',
          },
        ]
      ),
      expl(
        'Nazik talep',
        '¿Podría repetir? — Could you… İş Türkçesinde şart kipi gibi yumuşatır.',
        undefined
      ),
      expl(
        'Haber conditional',
        'Habría sido mejor… — olması daha iyi olurdu.',
        undefined
      ),
    ],
    examples: [
      { es: 'Me gustaría reservar una mesa.', tr: 'Masa ayırtmak isterdim.', highlight: 'gustaría' },
      { es: '¿Podrías ayudarme?', tr: 'Yardım edebilir misin?', highlight: 'Podrías' },
      { es: 'Sería conveniente esperar.', tr: 'Beklemek uygun olur.', highlight: 'Sería' },
      { es: 'No lo compraría.', tr: 'Onu satın almazdım.', highlight: 'compraría' },
      { es: 'Habría que revisar los datos.', tr: 'Verileri gözden geçirmek gerekirdi.', highlight: 'Habría' },
    ],
    exercises: [
      q('d401', 'multiple', 'Nazik “bağışlar mısınız”:', ['¿Podría…?', '¿Puede…?', '¿Puedes…?', '¿Podías…?'], '¿Podría…?', 'Condicional cortesía.'),
      q('d402', 'fill', 'Me _____ mucho ir contigo.', ['gustaría', 'gusta', 'gustaré', 'gustaba'], 'gustaría', 'Me gustaría.'),
      q('d403', 'translate', '“Daha iyi olurdu”:', ['Sería mejor.', 'Era mejor.', 'Fue mejor.', 'Ha sido mejor.'], 'Sería mejor.', 'Koşullu öneri.'),
      q('d404', 'multiple', 'Deber conditional:', ['deberías', 'debes', 'debías', 'habrías de'], 'deberías', 'Tavsiye.'),
      q('d405', 'match', '¿Podrías…? ≈', ['Yardım edebilir misin?', 'Edebilir misin?', 'Ettin mi?', 'Ediyor musun?'], 'Yardım edebilir misin?', 'Nazik modal.'),
    ],
    vocabulary: voc([
      ['gustaría', 'isterdim (hoşuma giderdi)', 'Me gustaría saber…'],
      ['podría', 'edebilirdim / edebilir miydiniz', '¿Podría abrir la ventana?'],
      ['debería', 'meliyim', 'Deberías descansar.'],
      ['sería', 'olurdu', 'Sería útil.'],
      ['habría', 'olurdu (haber)', 'Habría problema.'],
      ['conviene', 'uygundur', 'Conviene llegar temprano.'],
      ['preferiría', 'tercih ederdim', 'Preferiría la opción B.'],
      ['quisiera', 'isterdim (querer)', 'Quisiera dos entradas.'],
      ['necesitaría', 'ihtiyacım olurdu', 'Necesitaría más tiempo.'],
      ['una cosa', 'bir şey', 'Hay una cosa que me gustaría decir.'],
    ]),
  },
  {
    id: 'es_b1_u05',
    title: 'Subjuntivo presente — giriş',
    description: 'Quiero que vengas; espero que… iki özneye dikkat.',
    level: 'B1',
    estimatedMinutes: 13,
    topics: ['subjuntivo', 'volición'],
    explanation: [
      expl(
        'Ne zaman başlar?',
        'İstek, emir, şüphe, duygu gerektiren yan cümlede ikinci özne subjuntivo alır: Quiero que estudies.',
        [
          {
            rule: 'Esperar que + subjuntivo.',
            example_es: 'Espero que llegues bien.',
            example_tr: 'İyi gelmeni umuyorum.',
          },
        ]
      ),
      expl(
        'Düzenli çekim ipucu',
        '-ar fiillerde -e, -es…; -er/-ir fiillerde -a, -as… (çoğu zaman yo biçimi ile ters vokal).',
        undefined
      ),
      expl(
        'Belirsizlik',
        'Quizás llueva yarın — bazı yapılar indicative yerine subjunctive alır (bölgeye göre).',
        undefined
      ),
    ],
    examples: [
      { es: 'Quiero que vengas pronto.', tr: 'Çabuk gelmeni istiyorum.', highlight: 'vengas' },
      { es: 'Es necesario que sepas la verdad.', tr: 'Gerçeği bilmen gerek.', highlight: 'sepas' },
      { es: 'Prefiero que no fumes aquí.', tr: 'Burada sigara içmeni tercih etmem.', highlight: 'fumes' },
      { es: 'Ojalá encuentres trabajo.', tr: 'İş bulman dileğiyle.', highlight: 'encuentres' },
      { es: 'No creo que sea tarde.', tr: 'Geç olduğunu sanmıyorum.', highlight: 'sea' },
    ],
    exercises: [
      q('d501', 'multiple', 'querer que + …:', ['vengas', 'vienes', 'vendrás', 'viniste'], 'vengas', 'Presente subjuntivo.'),
      q('d502', 'fill', 'Es importante que _____ puntual.', ['seas', 'eres', 'serás', 'fuiste'], 'seas', 'Ser → seas.'),
      q('d503', 'translate', '“Umarım iyisindir”:', ['Espero que estés bien.', 'Espero que eres bien.', 'Espero que estar bien.', 'Espero estar bien.'], 'Espero que estés bien.', 'Estés subjuntivo.'),
      q('d504', 'multiple', '“Belki yağmur yağar” (kuralsız yazım):', ['Quizás llueva.', 'Quizás llueve.', 'Quizás lloverá.', 'Quizás llovió.'], 'Quizás llueva.', 'Subjuntivo olasılık.'),
      q('d505', 'match', 'ojalá ≈', ['keşke / umarım', 'belki', 'ama', 'çünkü'], 'keşke / umarım', 'Dilek.'),
    ],
    vocabulary: voc([
      ['subjuntivo', 'dilek kipi', 'Modo subjuntivo.'],
      ['quiero que', '…mesini istiyorum', 'Quiero que participes.'],
      ['es necesario que', '… gerek', 'Es necesario que envíes el formulario.'],
      ['es importante que', 'önemli ki', 'Es importante que descanses.'],
      ['esperar que', 'ummak ki', 'Espero que nos veamos.'],
      ['preferir que', 'tercih etmek ki', 'Prefiero que llames antes.'],
      ['pedir que', 'istemek ki', 'Pido que revisen el caso.'],
      ['prohibir que', 'yasaklamak ki', 'Prohíben que se fume.'],
      ['recomendar que', 'tavsiye etmek ki', 'Recomiendo que llegues temprano.'],
      ['sugerir que', 'önermek ki', 'Sugiero que leas el informe.'],
    ]),
  },
  {
    id: 'es_b1_u06',
    title: 'Subjuntivo — duygu ve dilek',
    description: 'Me alegra que, ojalá, temo que…',
    level: 'B1',
    estimatedMinutes: 12,
    topics: ['subjuntivo', 'emoción'],
    explanation: [
      expl(
        'Duygu fiilleri',
        'Me alegra que + subjuntivo: katılımcı başka özneye geçince zorunlu. Es una pena que llueva.',
        undefined
      ),
      expl(
        'Korku ve endişe',
        'Temo que no llegue a tiempo — belirsizlik duygusu subjuntivo çeker.',
        [
          {
            rule: 'Alegrarse de que…',
            example_es: 'Me alegro de que hayas venido.',
            example_tr: 'Geldiğine sevindim.',
          },
        ]
      ),
      expl(
        'Olumsuz inanç',
        'No creo que… subjuntivo; Creo que… genelde indicativo — inanç kesinliği.',
        undefined
      ),
    ],
    examples: [
      { es: 'Me sorprende que digas eso.', tr: 'Bunu söylemene şaşıyorum.', highlight: 'digas' },
      { es: 'Tengo miedo de que pierdas el vuelo.', tr: 'Uçağı kaçırmanndan korkuyorum.', highlight: 'pierdas' },
      { es: 'Espero que te recuerdes.', tr: 'Hatırlamanı umuyorum.', highlight: 'recuerdes' },
      { es: 'Ojalá fuera tan fácil.', tr: 'Keşke bu kadar kolay olsaydı.', highlight: 'fuera' },
      { es: 'Es una lástima que no puedas venir.', tr: 'Gelemeyeceğin için yazık.', highlight: 'puedas' },
    ],
    exercises: [
      q('d601', 'multiple', 'Me alegra que + …:', ['vengas', 'vienes', 'viniste', 'vendrás'], 'vengas', 'Subjuntivo duygu.'),
      q('d602', 'fill', 'Temo que no _____ a tiempo.', ['llegue', 'llega', 'llegó', 'llegaba'], 'llegue', 'Temo que + subjuntivo.'),
      q('d603', 'translate', '“Gelmenize sevindim”:', ['Me alegro de que hayáis venido.', 'Me alegro que venís.', 'Me alegro de haber venido vosotros.', 'Me alegra que venisteis.'], 'Me alegro de que hayáis venido.', 'perfecto subjuntivo değil B1 presente subj hayáis.'),
      q('d604', 'multiple', 'No creo que … verdad:', ['sea', 'es', 'será', 'era'], 'sea', 'Inanç olumsuz → subjuntivo.'),
      q('d605', 'match', 'Es una pena que ≈', ['… yazık ki', '… güzel ki', '… doğru ki', '… iyi ki'], '… yazık ki', 'Empatía.'),
    ],
    vocabulary: voc([
      ['alegrarse', 'sevinmek', 'Me alegro por ti.'],
      ['sorprenderse', 'şaşırmak', 'Me sorprende el resultado.'],
      ['tener miedo', 'korkmak', 'Tengo miedo de volar.'],
      ['esperar', 'ummak', 'Espero una respuesta.'],
      ['ojalá', 'keşke', 'Ojalá todo salga bien.'],
      ['lástima', 'yazık', 'Qué lástima.'],
      ['temer', 'korkmak (formal)', 'Temo equivocarme.'],
      ['preocuparse', 'endişelenmek', 'Me preocupa que…'],
      ['emoción', 'duygu', 'Es una emoción fuerte.'],
      ['pena', 'üzüntü', 'Da pena verlo así.'],
    ]),
  },
  {
    id: 'es_b1_u07',
    title: 'Por vs para',
    description: 'Süre, neden, yarar ve hedef ayrımı.',
    level: 'B1',
    estimatedMinutes: 13,
    topics: ['por', 'para', 'preposiciones'],
    explanation: [
      expl(
        'Por: neden ve süre',
        'Lo hice por ti — senin için / senin sayende. Por la mañana — zaman dilimi. Caminé por el parque — içinden/yoluyla.',
        [
          {
            rule: 'Por + miktar/taki: por primera vez.',
            example_es: 'Gracias por tu ayuda.',
            example_tr: 'Yardımın için teşekkürler.',
          },
        ]
      ),
      expl(
        'Para: hedef ve son tarih',
        'Este regalo es para ti — alıcı. Para el viernes — teslim tarihi. Para ser médico — amaç.',
        undefined
      ),
      expl(
        'Karışan çiftler',
        'Estudio español por trabajo vs Estudio español para trabajar en España — ilkin “iş gereği”, ikinci “İspanya’da çalışmak için”.',
        undefined
      ),
    ],
    examples: [
      { es: 'Lo hago por amistad.', tr: 'Dostluk için yapıyorum.', highlight: 'por' },
      { es: 'Salimos por la puerta trasera.', tr: 'Arka kapıdan çıktık.', highlight: 'por' },
      { es: 'Este café es para llevar.', tr: 'Bu kahve paket.', highlight: 'para' },
      { es: 'Necesito el informe para mañana.', tr: 'Raporu yarına kadar istiyorum.', highlight: 'para' },
      { es: 'Gracias por venir.', tr: 'Geldiğin için teşekkürler.', highlight: 'por' },
    ],
    exercises: [
      q('d701', 'multiple', '“Senin için (hediye)”:', ['para ti', 'por ti', 'de ti', 'a ti'], 'para ti', 'Alıcı para.'),
      q('d702', 'fill', '_____ qué estudias español?', ['¿Por', '¿Para', '¿De', '¿En'], '¿Por', 'Neden por qué / por qué razón → Por dinero vs soru kalıbı değil — burada “neden” anlatımı: Por trabajo.'),
      q('d703', 'translate', '“Yarına kadar”:', ['para mañana', 'por mañana', 'en mañana', 'hasta mañana'], 'para mañana', 'Deadline para.'),
      q('d704', 'multiple', '“Şehir içinden yürüdüm”:', ['por la ciudad', 'para la ciudad', 'en la ciudad', 'hacia la ciudad'], 'por la ciudad', 'Geçiş por.'),
      q('d705', 'match', 'Gracias por ≈', ['… için teşekkür', '… ya teşekkür', '… kadar teşekkür', '… olan teşekkür'], '… için teşekkür', 'Por + isim.'),
    ],
    vocabulary: voc([
      ['por', 'için / yüzünden / boyunca', 'Por aquí, por favor.'],
      ['para', 'için / amaç / -e kadar', 'Para siempre.'],
      ['a cambio de', 'karşılığında', 'A cambio de nada.'],
      ['en lugar de', 'yerine', 'En lugar de eso…'],
      ['debido a', 'nedeniyle', 'Debido al tráfico…'],
      ['gracias por', '… için teşekkür', 'Gracias por tu mensaje.'],
      ['razón', 'sebep', 'La razón por la que…'],
      ['objetivo', 'hedef', 'El objetivo para este año.'],
      ['plazo', 'son tarih', 'El plazo para entregar.'],
      ['finalidad', 'amaç', 'La finalidad del proyecto.'],
    ]),
  },
  {
    id: 'es_b1_u08',
    title: 'Ser ve estar ileri düzey',
    description: 'Mal/buen, listo, casado — çift anlamlı sıfatlar.',
    level: 'B1',
    estimatedMinutes: 12,
    topics: ['ser', 'estar', 'nuance'],
    explanation: [
      expl(
        'Kişilik vs durum',
        'Es nervioso (huylu biri) vs Está nervioso (şu an gergin).',
        undefined
      ),
      expl(
        'Olmuş sonuç vs süreç',
        'La sopa está lista — hazır (resultado). María es lista — zeki.',
        [
          {
            rule: 'Casado: está casado (durum) yaygın; es casado daha az.',
            example_es: 'Está casado con Ana.',
            example_tr: 'Ana ile evli.',
          },
        ]
      ),
      expl(
        'Mal/bien çiftleri',
        'Es mal estudiante vs Está mal del estómago.',
        undefined
      ),
    ],
    examples: [
      { es: 'Es verde por fuera y rojo por dentro.', tr: 'Dışı yeşil içi kırmızı (tanım).', highlight: 'Es' },
      { es: 'La manzana está verde; aún no está madura.', tr: 'Elma yeşil; henüz olmamış.', highlight: 'está' },
      { es: 'Es listo para los exámenes.', tr: 'Sınavlar için zeki / hazır değil — bağlama göre.', highlight: 'Es' },
      { es: 'Está listo el pedido.', tr: 'Sipariş hazır.', highlight: 'Está' },
      { es: 'Son las tres y Juan está de mal humor.', tr: 'Saat üç ve Juan kötü huylu / keyifsiz.', highlight: 'está' },
    ],
    exercises: [
      q('d801', 'multiple', '“Şu an hasta”:', ['Está enfermo.', 'Es enfermo.', 'Estuvo enfermo.', 'Será enfermo.'], 'Está enfermo.', 'Geçici sağlık.'),
      q('d802', 'fill', 'Ella _____ muy inteligente.', ['es', 'está', 'estuvo', 'será'], 'es', 'Kalıcı özellik.'),
      q('d803', 'translate', '“Ev kirada”:', ['La casa está alquilada.', 'La casa es alquilada.', 'La casa tiene alquilada.', 'La casa fue alquilada.'], 'La casa está alquilada.', 'Durum estar + participio.'),
      q('d804', 'multiple', '“Profesyonel bir müzisyen”:', ['Es músico profesional.', 'Está músico profesional.', 'Tiene músico profesional.', 'Hace músico profesional.'], 'Es músico profesional.', 'Kimlik ser.'),
      q('d805', 'match', 'estar cansado ≈', ['yorgun hissetmek', 'tembel insan olmak', 'hasta tanımı', 'meslek'], 'yorgun hissetmek', 'Geçici.'),
    ],
    vocabulary: voc([
      ['listo', 'hazır / zeki', 'Está listo el pedido.'],
      ['casado', 'evli', 'Está casado.'],
      ['soltero', 'bekâr', 'Es soltero.'],
      ['divorciado', 'boşanmış', 'Está divorciado.'],
      ['contento', 'mutlu (hal)', 'Está contento con el resultado.'],
      ['amable', 'nazik (kişilik)', 'Es muy amable.'],
      ['enfadado', 'kızgın', 'Está enfadado conmigo.'],
      ['orgulloso', 'gururlu', 'Está orgulloso de su hijo.'],
      ['seguro', 'emin', 'Estoy seguro de la respuesta.'],
      ['preocupado', 'endişeli', 'Está preocupado por el futuro.'],
    ]),
  },
  {
    id: 'es_b1_u09',
    title: 'İleri düzey zamanlar karşılaştırması',
    description: 'Perfecto vs indefinido vs imperfecto — özet akış şeması.',
    level: 'B1',
    estimatedMinutes: 13,
    topics: ['tiempo verbal', 'contraste'],
    explanation: [
      expl(
        'Karar ağacı',
        'Yaşam deneyimi mi (he vivido), tek olay mı (viví), arka plan mı (vivía)? Metinde zaman işaretçilerini işaretleyin.',
        undefined
      ),
      expl(
        'Yakın geçmiş köprüsü',
        'Bu sabah he terminado vs Esta mañana terminé — coğrafya ve kayıt türü etkiler.',
        undefined
      ),
      expl(
        'Pluscuamperfecto sırası',
        'Önce había cerrado, después llegaron — önce/sonra ilişkisi.',
        undefined
      ),
    ],
    examples: [
      { es: 'Nunca había visto algo igual.', tr: 'Böyle bir şey görmemiştim.', highlight: 'había visto' },
      { es: 'El año pasado viajé a Chile.', tr: 'Geçen yıl Şili\'ye gittim.', highlight: 'viajé' },
      { es: 'De niño, viajaba cada verano.', tr: 'Çocukken her yaz seyahat ederdim.', highlight: 'viajaba' },
      { es: 'Ya he viajado a Chile tres veces.', tr: 'Şili\'ye üç kez gittim (hayat deneyimi).', highlight: 'he viajado' },
      { es: 'Cuando llegué, ya habían cerrado.', tr: 'Vardığımda çoktan kapatmışlardı.', highlight: 'habían cerrado' },
    ],
    exercises: [
      q('d901', 'multiple', 'Hayat deneyimi “hiç uçmadım”:', ['No he volado nunca.', 'No volé nunca.', 'No volaba nunca.', 'No hubiera volado.'], 'No he volado nunca.', 'Perfecto experiencia.'),
      q('d902', 'fill', 'En 2010 _____ en Buenos Aires.', ['vivía', 'he vivido', 'vivo', 'había vivido'], 'vivía', 'Uzun süre geçmiş süreç → imperfecto (alternatif: viví oturuş — bağlam).'),
      q('d903', 'translate', '“Kapıyı kilitlemiştim”:', ['Había cerrado la puerta.', 'He cerrado la puerta.', 'Cerré la puerta.', 'Cerraba la puerta.'], 'Había cerrado la puerta.', 'Önceki eylem.'),
      q('d904', 'multiple', '“Dün bitirdim”:', ['Terminé ayer.', 'He terminado ayer.', 'Terminaba ayer.', 'Había terminado ayer.'], 'Terminé ayer.', 'Tek sefer dün.'),
      q('d905', 'match', 'perfecto experiencia ≈', ['hayatta hiç / deneyim', 'tek an', 'arka plan', 'gelecek'], 'hayatta hiç / deneyim', 'He vivido…'),
    ],
    vocabulary: voc([
      ['marcador temporal', 'zaman işaretçisi', 'Ayer, hoy, mañana…'],
      ['aspecto', 'yön (gramer)', 'Aspecto imperfectivo.'],
      ['antecedencia', 'önce gelme', 'Prioridad temporal.'],
      ['simultaneidad', 'eş zamanlılık', 'Al mismo tiempo.'],
      ['duración', 'süre', 'Durante tres años.'],
      ['punto final', 'tamamlanma anı', 'En ese momento terminó.'],
      ['habitualidad', 'alışkanlık', 'Solía hacerlo.'],
      ['iterativo', 'yinelenen', 'Todos los días.'],
      ['resultado', 'sonuç', 'El resultado ha sido positivo.'],
      ['experiencia vital', 'yaşam deneyimi', 'Experiencia vital compartida.'],
    ]),
  },
  {
    id: 'es_b1_u10',
    title: 'İş ve kariyer kelime bilgisi',
    description: 'Contrato, nómina, teletrabajo ve görüşme.',
    level: 'B1',
    estimatedMinutes: 11,
    topics: ['trabajo', 'léxico profesional'],
    explanation: [
      expl(
        'İş arama',
        'Currículum, carta de presentación, entrevista — fiiller enviar, conseguir, firmar.',
        undefined
      ),
      expl(
        'Çalışma biçimleri',
        'Teletrabajo, jornada intensiva, contrato indefinido — İspanya iş hukuku terimleri.',
        undefined
      ),
      expl(
        'Ofis diyalogu',
        'Reunión, agenda, minuta — toplantı dilinde kullanın.',
        undefined
      ),
    ],
    examples: [
      { es: 'He firmado el contrato indefinido.', tr: 'Süresiz sözleşmeyi imzaladım.', highlight: 'contrato' },
      { es: 'Trabajo a tiempo parcial.', tr: 'Yarı zamanlı çalışıyorum.', highlight: 'parcial' },
      { es: 'La empresa ofrece teletrabajo dos días.', tr: 'Şirket iki gün uzaktan çalışma sunuyor.', highlight: 'teletrabajo' },
      { es: 'Subieron la nómina este mes.', tr: 'Bu ay bordroyu artırdılar.', highlight: 'nómina' },
      { es: 'Tengo una reunión con el equipo a las 10.', tr: 'Saat 10’da ekiple toplantım var.', highlight: 'reunión' },
    ],
    exercises: [
      q('e001', 'multiple', '“Özgeçmiş”:', ['currículum', 'contrato', 'nómina', 'agenda'], 'currículum', 'CV.'),
      q('e002', 'fill', 'Busco trabajo _____ sector tecnológico.', ['en el', 'por el', 'para el', 'de el'], 'en el', 'Sektörde en.'),
      q('e003', 'translate', '“Toplantıyı erteledik”:', ['Aplazamos la reunión.', 'Cancelamos la reunión.', 'Adelantamos la reunión.', 'Convocamos la reunión.'], 'Aplazamos la reunión.', 'Aplazar = ertelemek.'),
      q('e004', 'multiple', '“Maaş” (aylık):', ['salario / sueldo', 'nómina only', 'contrato', 'beca'], 'salario / sueldo', 'Genel kullanım.'),
      q('e005', 'match', 'teletrabajo ≈', ['uzaktan çalışma', 'mesai', 'izin', 'terfi'], 'uzaktan çalışma', 'Lexico laboral.'),
    ],
    vocabulary: voc([
      ['contrato', 'sözleşme', 'Contrato temporal.'],
      ['currículum', 'özgeçmiş', 'Adjunto mi currículum.'],
      ['entrevista', 'mülakat', 'Entrevista de trabajo.'],
      ['empresa', 'şirket', 'Multinacional.'],
      ['nómina', 'bordro', 'La nómina mensual.'],
      ['teletrabajo', 'uzaktan çalışma', 'Política de teletrabajo.'],
      ['jornada', 'mesai / iş günü', 'Jornada intensiva.'],
      ['promoción', 'terfi', 'Merecer una promoción.'],
      ['desempleo', 'işsizlik', 'Tasa de desempleo.'],
      ['competencia', 'yetkinlik / rekabet', 'Competencias digitales.'],
    ]),
  },
];
