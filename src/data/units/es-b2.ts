/**
 * İspanyolca B2 — Öğrenme Yolu (8 ünite)
 */

import type { UnitData } from './types';
import { voc, q, expl } from './unitBuilders';

export const ES_B2_UNITS: UnitData[] = [
  {
    id: 'es_b2_u01',
    title: 'Subjuntivo ileri düzey',
    description: 'Aunque, para que, sin que — zamir ve iki özne.',
    level: 'B2',
    estimatedMinutes: 14,
    topics: ['subjuntivo', 'concesivas', 'finalidad'],
    explanation: [
      expl(
        'Aunque + subjuntivo vs indicative',
        'Aunque llueva (beklenen ihtimal) vs Aunque llueve (kesin bilinen gerçek). Kontrastı kontrol edin.',
        [
          {
            rule: 'Para que + subjuntivo amaç yan cümlesi.',
            example_es: 'Te llamo para que sepas la verdad.',
            example_tr: 'Gerçeği bilmen için arıyorum.',
          },
        ]
      ),
      expl(
        'Sin que — olumsuz amaç',
        'Se fue sin que nadie lo notara — edilgen his.',
        undefined
      ),
      expl(
        'Nominalization riskleri',
        'El hecho de que + subjuntivo çünkü öznel içerik taşır.',
        undefined
      ),
    ],
    examples: [
      { es: 'Aunque esté cansado, seguiré trabajando.', tr: 'Yorgun olsa da çalışmaya devam edeceğim.', highlight: 'esté' },
      { es: 'Te envío el enlace para que revises el borrador.', tr: 'Taslağı gözden geçirmen için linki gönderiyorum.', highlight: 'revises' },
      { es: 'No salgas sin que cierres la ventana.', tr: 'Pencereyi kilitlemeden çıkma.', highlight: 'cierres' },
      { es: 'El problema es que no confíen en nosotros.', tr: 'Sorun bize güvenmemeleri.', highlight: 'confíen' },
      { es: 'No habrá paz mientras exista la injusticia.', tr: 'Adaletsizlik oldukça barış olmayacak.', highlight: 'exista' },
    ],
    exercises: [
      q('f101', 'multiple', 'para que + …:', ['vengas', 'vienes', 'vendrás', 'viniste'], 'vengas', 'Amaç cümlesi.'),
      q('f102', 'fill', 'Aunque _____ tarde, llegamos.', ['sea', 'es', 'era', 'será'], 'sea', 'Koncessive subjuntivo.'),
      q('f103', 'translate', '“Kimse fark etmeden çıktı”:', ['Salió sin que nadie lo notara.', 'Salió sin que nadie lo notó.', 'Salió sin nadie notar.', 'Salió sin que nadie notaba.'], 'Salió sin que nadie lo notara.', 'Sin que + subjuntivo.'),
      q('f104', 'multiple', '“El hecho de que” içeriği öznel:', ['El hecho de que no venga es grave.', 'El hecho de que no viene es grave.', 'El hecho de que no vendrá es grave.', 'El hecho de que no venía es grave.'], 'El hecho de que no venga es grave.', 'Subjuntivo.'),
      q('f105', 'match', 'mientras + subjuntivo ≈', ['süre boyunca (belirsiz)', 'kesin şimdiki', 'geçmiş', 'gelecek'], 'süre boyunca (belirsiz)', 'Zaman çizelgesi.'),
    ],
    vocabulary: voc([
      ['aunque', 'rağmen / olsa bile', 'Aunque sea difícil…'],
      ['para que', '…sin diye', 'Para que lo sepas.'],
      ['sin que', '…madan', 'Sin que te enteres.'],
      ['mientras', 'iken / süreyle', 'Mientras tanto…'],
      ['antes de que', '…meden önce', 'Antes de que anochezca.'],
      ['hasta que', '…ana kadar', 'Hasta que llegues.'],
      ['siempre que', '…dığı sürece', 'Siempre que puedas.'],
      ['con tal de que', '…dığı takdirde', 'Con tal de que paguen.'],
      ['a menos que', '…madıkça', 'A menos que llueva.'],
      ['el hecho de que', '… olması gerçeği', 'El hecho de que sea así…'],
    ]),
  },
  {
    id: 'es_b2_u02',
    title: 'Pasif yapı ve impersonal se',
    description: 'Fue construido; se vende; se habla español.',
    level: 'B2',
    estimatedMinutes: 13,
    topics: ['pasiva', 'se pasiva'],
    explanation: [
      expl(
        'Ser + participio',
        'La novela fue escrita en 1920 — edilgen odak üretir; fiil geçmişte tamamlanmış.',
        [
          {
            rule: 'Participio uyumu: la casa fue pintada.',
            example_es: 'Fueron detenidos tres sospechosos.',
            example_tr: 'Üç şüpheli gözaltına alındı.',
          },
        ]
      ),
      expl(
        'Se pasiva / impersonal',
        'Aquí se venden entradas — özne belirsiz veya genel.',
        undefined
      ),
      expl(
        'Estilo académico',
        'Se analizarán los datos — rapor dili.',
        undefined
      ),
    ],
    examples: [
      { es: 'El puente fue inaugurado ayer.', tr: 'Köprü dün açıldı.', highlight: 'fue inaugurado' },
      { es: 'Se vende piso luminoso.', tr: 'Aydınlık daire satılıyor.', highlight: 'Se vende' },
      { es: 'En esta zona se habla catalán.', tr: 'Bu bölgede Katalanca konuşulur.', highlight: 'se habla' },
      { es: 'Los errores fueron corregidos.', tr: 'Hatalar düzeltildi.', highlight: 'fueron corregidos' },
      { es: 'Se necesitan voluntarios.', tr: 'Gönüllülere ihtiyaç var.', highlight: 'Se necesitan' },
    ],
    exercises: [
      q('f201', 'multiple', 'Geçmiş edilgen kadın nesne:', ['La carta fue enviada.', 'La carta fue enviado.', 'La carta fue enviados.', 'La carta fue enviadó.'], 'La carta fue enviada.', 'Uyum la carta.'),
      q('f202', 'fill', 'Aquí _____ cocina tradicional.', ['se sirve', 'sirve', 'se sirven', 'sirven'], 'se sirve', 'Se + 3. tekil.'),
      q('f203', 'translate', '“Karar verildi”:', ['Se tomó la decisión.', 'La decisión tomó.', 'Se tomaba la decisión.', 'Tomó la decisión se.'], 'Se tomó la decisión.', 'Pasiva refleja.'),
      q('f204', 'multiple', '“İşçiler işten çıkarıldı”:', ['Los trabajadores fueron despedidos.', 'Los trabajadores despidieron.', 'Se despidieron los trabajadores.', 'Los trabajadores se despidiendo.'], 'Los trabajadores fueron despedidos.', 'Ser + participio.'),
      q('f205', 'match', 'se vende ≈', ['satılıyor', 'satıldı', 'satacağız', 'satın alınır'], 'satılıyor', 'İlan dili.'),
    ],
    vocabulary: voc([
      ['pasiva', 'edilgen', 'Construcción pasiva.'],
      ['participio', 'ortac', 'Hecho / escrito.'],
      ['ser + participio', 'edilgen yapı', 'Fue publicado.'],
      ['agente', 'eyleyen', 'Por el autor.'],
      ['impersonal', 'öznesiz', 'Se dice que…'],
      ['construir', 'inşa etmek', 'Fue construido en 1998.'],
      ['publicar', 'yayımlamak', 'Será publicado mañana.'],
      ['detener', 'tutuklamak', 'Fue detenido en el aeropuerto.'],
      ['nombrar', 'atamak', 'Fue nombrado director.'],
      ['revocar', 'geri çekmek', 'La norma fue revocada.'],
    ]),
  },
  {
    id: 'es_b2_u03',
    title: 'Koşul cümleleri (período condicional)',
    description: 'Si tuviera… ; si hubiera sabido… ; habría ido.',
    level: 'B2',
    estimatedMinutes: 14,
    topics: ['condicional compuesto', 'si'],
    explanation: [
      expl(
        'Tip 2 ve 3',
        'Si tuviera dinero, viajaría (şu an gerçek dışı). Si hubiera sabido, habría venido (geçmişte pişmanlık).',
        [
          {
            rule: 'Si ile başlayan cümlede asla koşul kipi sonrası indicative olmaz (si + presente → futuro hariç bazı yapılar).',
            example_es: 'Si llueve, cancelamos.',
            example_tr: 'Yağarsa iptal ederiz.',
          },
        ]
      ),
      expl(
        'Mix tip',
        'Si has terminado, sal — tamamlanmış koşul + emir.',
        undefined
      ),
      expl(
        'Alternatif koşul',
        'De haberlo sabido… — kitap dili.',
        undefined
      ),
    ],
    examples: [
      { es: 'Si hubiera estudiado más, habría aprobado.', tr: 'Daha çok çalışsaydım geçerdim.', highlight: 'habría aprobado' },
      { es: 'Si tuviera tiempo, te ayudaría.', tr: 'Zamanım olsa yardım ederdim.', highlight: 'ayudaría' },
      { es: 'De ser cierto, habría que actuar.', tr: 'Doğruysa hareket etmek gerekir.', highlight: 'De ser' },
      { es: 'Si llueve, nos quedamos en casa.', tr: 'Yağmur yağarsa evde kalırız.', highlight: 'llueve' },
      { es: 'Habrían venido si les hubieras avisado.', tr: 'Uyarmış olsaydın gelirlerdi.', highlight: 'hubieras avisado' },
    ],
    exercises: [
      q('f301', 'multiple', 'Geçmiş koşul + sonuç:', ['Si lo hubiera sabido, habría actuado.', 'Si lo sabía, habría actuado.', 'Si lo sabré, habría actuado.', 'Si lo he sabido, habría actuado.'], 'Si lo hubiera sabido, habría actuado.', 'Pluscuamperfecto subj + cond comp.'),
      q('f302', 'fill', 'Si _____ rico, viajaría más.', ['fuera', 'es', 'era', 'sería'], 'fuera', 'İmp. subj ser.'),
      q('f303', 'translate', '“Yağmur yağmasaydı giderdik”:', ['Si no hubiera llovido, habríamos ido.', 'Si no lloviera, habríamos ido.', 'Si no llovió, habríamos ido.', 'Si no llueve, habríamos ido.'], 'Si no hubiera llovido, habríamos ido.', 'Geçmiş olumsuz koşul.'),
      q('f304', 'multiple', 'Koşul + gelecek (konuşma):', ['Si terminas, salimos.', 'Si terminarás, salimos.', 'Si terminas, saldremos si…', 'Si terminaras, salimos.'], 'Si terminas, salimos.', 'Gerçekçi koşul şimdiki.'),
      q('f305', 'match', 'habría + participio ≈', ['olurdu (geçmiş koşul sonucu)', 'olacaktı', 'olmuştur', 'oluyordu'], 'olurdu (geçmiş koşul sonucu)', 'Condicional compuesto.'),
    ],
    vocabulary: voc([
      ['si', 'eğer', 'Si puedes…'],
      ['condicional', 'koşul kipi', 'Lo haría.'],
      ['hipótesis', 'varsayım', 'Hipótesis contraria.'],
      ['irreal', 'gerçek dışı', 'Condición irreal.'],
      ['pluscuamperfecto de subjuntivo', 'geçmiş subjuntivo', 'Hubiera sabido.'],
      ['condicional compuesto', 'bileşik koşul', 'Habría venido.'],
      ['arrepentimiento', 'pişmanlık', 'Lamento no haber ido.'],
      ['consecuencia', 'sonuç', 'Consecuencia inevitable.'],
      ['premisa', 'ön koşul', 'La premisa es falsa.'],
      ['escenario', 'senaryo', 'En el peor escenario…'],
    ]),
  },
  {
    id: 'es_b2_u04',
    title: 'Dolaylı anlatım',
    description: 'Dijo que vendría; preguntó si… — zaman uyumu.',
    level: 'B2',
    estimatedMinutes: 13,
    topics: ['estilo indirecto', 'discurso'],
    explanation: [
      expl(
        'Temel kaydırma',
        'Presente → geçmiş rapor: “Vendré” → Dijo que vendría. Zaman çiftini eşleştirin.',
        [
          {
            rule: 'Komut raporu: Me pidió que esperara.',
            example_es: 'Preguntó si podíamos ayudar.',
            example_tr: 'Yardım edip edemeyeceğimizi sordu.',
          },
        ]
      ),
      expl(
        'Bağlaç que / si',
        'No sabía si habría tiempo — belirsizlik.',
        undefined
      ),
      expl(
        'Özne ve zamir dönüşümü',
        '“Yo iré” → Dijo que él iría (özne değişir).',
        undefined
      ),
    ],
    examples: [
      { es: 'Dijo que llegaría tarde.', tr: 'Geç geleceğini söyledi.', highlight: 'llegaría' },
      { es: 'Preguntó si conocíamos el camino.', tr: 'Yolu bilip bilmediğimizi sordu.', highlight: 'conocíamos' },
      { es: 'Me contó que había estado enfermo.', tr: 'Hasta olduğunu anlattı.', highlight: 'había estado' },
      { es: 'Aseguró que todo estaba listo.', tr: 'Her şeyin hazır olduğunu garanti etti.', highlight: 'estaba' },
      { es: 'No entendí lo que había querido decir.', tr: 'Ne demek istediğini anlamadım.', highlight: 'había querido' },
    ],
    exercises: [
      q('f401', 'multiple', '“Geleceğim” raporu:', ['Dijo que vendría.', 'Dijo que vendrá.', 'Dijo que vende.', 'Dijo que vendió.'], 'Dijo que vendría.', 'Zaman kayması.'),
      q('f402', 'fill', 'Preguntó _____ podíamos ayudar.', ['si', 'que', 'porque', 'para'], 'si', 'İfadeler si ile.'),
      q('f403', 'translate', '“Gitmem gerektiğini söyledi”:', ['Dijo que tuviera que irme.', 'Dijo que tenía que irme.', 'Dijo que tengo que irme.', 'Dijo que tendré que irme.'], 'Dijo que tenía que irme.', 'Geçmiş raporunda tenía ir.'),
      q('f404', 'multiple', 'Buyruk raporu:', ['Pidió que nos calláramos.', 'Pidió que nos callamos.', 'Pidió que nos calláis.', 'Pidió que nos hemos callado.'], 'Pidió que nos calláramos.', 'Subjuntivo imperfecto.'),
      q('f405', 'match', 'estilo indirecto ≈', ['dolaylı anlatım', 'doğrudan konuşma', 'aktif çatı', 'pasif'], 'dolaylı anlatım', 'Terim.'),
    ],
    vocabulary: voc([
      ['decir que', '… dedi ki', 'Dice que vendrá.'],
      ['contar que', 'anlatmak ki', 'Me contó que…'],
      ['preguntar si', 'sormak … mı', 'Preguntó si estabas.'],
      ['asegurar que', 'garanti etmek ki', 'Aseguró que era verdad.'],
      ['explicar que', 'açıklamak ki', 'Explicó que había un error.'],
      ['añadir que', 'eklemek ki', 'Añadió que era urgente.'],
      ['negar que', 'inkâr etmek ki', 'Negó que fuera cierto.'],
      ['admitir que', 'kabul etmek ki', 'Admitió que se había equivocado.'],
      ['informar de que', 'bilgilendirmek', 'Informó de que había retrasos.'],
      ['subrayar que', 'vurgulamak ki', 'Subrayó que era prioritario.'],
    ]),
  },
  {
    id: 'es_b2_u05',
    title: 'İleri düzey bağlaçlar',
    description: 'Sin embargo, no obstante, a pesar de — tutarlı akış.',
    level: 'B2',
    estimatedMinutes: 12,
    topics: ['conectores', 'cohesión'],
    explanation: [
      expl(
        'Kontrast',
        'Sin embargo / no obstante / no obstante lo anterior — akademik ve editoryal dil.',
        [
          {
            rule: 'A pesar de + isim; aunque + fiil.',
            example_es: 'A pesar de la lluvia, salimos.',
            example_tr: 'Yağmura rağmen çıktık.',
          },
        ]
      ),
      expl(
        'Sonuç',
        'Por consiguiente, en consecuencia, por tanto — tez yazımında.',
        undefined
      ),
      expl(
        'Ek ve sınırlama',
        'Asimismo, en cambio, no obstante — paragraf geçişleri.',
        undefined
      ),
    ],
    examples: [
      { es: 'El coste es alto; no obstante, merece la pena.', tr: 'Maliyet yüksek; yine de değer.', highlight: 'no obstante' },
      { es: 'A pesar de los riesgos, avanzamos.', tr: 'Risklere rağmen ilerliyoruz.', highlight: 'A pesar de' },
      { es: 'Sin embargo, la evidencia es débil.', tr: 'Ancak kanıt zayıf.', highlight: 'Sin embargo' },
      { es: 'Por consiguiente, suspendemos el acto.', tr: 'Bu nedenle etkinliği iptal ediyoruz.', highlight: 'Por consiguiente' },
      { es: 'En cambio, el sector público creció.', tr: 'Öte yandan kamu sektörü büyüdü.', highlight: 'En cambio' },
    ],
    exercises: [
      q('f501', 'multiple', 'Kontrast (resmî):', ['No obstante', 'Pero', 'Y', 'O'], 'No obstante', 'Yazı dilinde.'),
      q('f502', 'fill', '_____ la crisis, la empresa creció.', ['A pesar de', 'Sin embargo', 'Por consiguiente', 'Además'], 'A pesar de', 'İsim öncesi.'),
      q('f503', 'translate', '“Bu nedenle”:', ['Por consiguiente', 'Sin embargo', 'A pesar de', 'Además'], 'Por consiguiente', 'Sonuç bağlacı.'),
      q('f504', 'multiple', '“Öte yandan”:', ['Por otro lado', 'Por consiguiente', 'Por tanto', 'Asimismo'], 'Por otro lado', 'Karşılaştırma geçişi.'),
      q('f505', 'match', 'asimismo ≈', ['ayrıca / benzer şekilde', 'ancak', 'sonuçta', 'önce'], 'ayrıca / benzer şekilde', 'Ekleyici.'),
    ],
    vocabulary: voc([
      ['sin embargo', 'ancak / fakat', 'Es caro; sin embargo…'],
      ['no obstante', 'buna rağmen', 'No obstante las dudas…'],
      ['a pesar de', 'rağmen', 'A pesar del frío.'],
      ['por consiguiente', 'dolayısıyla', 'Por consiguiente, se cancela.'],
      ['no obstante lo anterior', 'öncekine rağmen', 'Transición formal.'],
      ['por otro lado', 'öte yandan', 'Por otro lado, suben los precios.'],
      ['en consecuencia', 'sonuç olarak', 'En consecuencia, dimite.'],
      ['asimismo', 'ayrıca', 'Asimismo conviene revisar…'],
      ['en cambio', 'aksine / öte yandan', 'En cambio, el norte nieva.'],
      ['no obstante', 'yine de', 'No obstante, sigue vivo el debate.'],
    ]),
  },
  {
    id: 'es_b2_u06',
    title: 'Akademik ve resmi yazı',
    description: 'Hipótesis, metodoloji, sonuç bölümü ve gölgelenme (hedging).',
    level: 'B2',
    estimatedMinutes: 14,
    topics: ['registro formal', 'academia'],
    explanation: [
      expl(
        'Yapı',
        'Introducción, marco teórico, metodología, resultados, discusión, conclusiones — bölüm başlıkları sabit.',
        undefined
      ),
      expl(
        'Hedging',
        'Podría argumentarse que…; los datos sugieren… — kesin iddiadan kaçınma.',
        [
          {
            rule: 'Pasiva refleja: se observó un incremento.',
            example_es: 'Se concluye que la hipótesis es plausible.',
            example_tr: 'Hipotezin makul olduğu sonucuna varılır.',
          },
        ]
      ),
      expl(
        'Atıf',
        'Según García (2020)…; en palabras de… — intihale dikkat.',
        undefined
      ),
    ],
    examples: [
      { es: 'Los resultados sugieren una correlación moderada.', tr: 'Sonuçlar orta düzey bir korelasyon düşündürüyor.', highlight: 'sugieren' },
      { es: 'Podría interpretarse como una limitación metodológica.', tr: 'Metodolojik bir sınırlama olarak yorumlanabilir.', highlight: 'interpretarse' },
      { es: 'Así pues, conviene profundizar en el tema.', tr: 'Öyleyse konuda derinleşmek uygundur.', highlight: 'conviene' },
      { es: 'En líneas generales, la muestra es representativa.', tr: 'Genel hatlarıyla örneklem temsilidir.', highlight: 'En líneas generales' },
      { es: 'No cabe descartar factores externos.', tr: 'Dış faktörleri eleyemeyiz.', highlight: 'No cabe' },
    ],
    exercises: [
      q('f601', 'multiple', 'Hedging:', ['Es plausible que…', 'Es seguro que…', 'Es imposible que…', 'Es falso que…'], 'Es plausible que…', 'İhtiyatlı iddia.'),
      q('f602', 'fill', 'Los datos _____ que hay sesgo.', ['indican', 'demuestran rotundamente', 'prueban del todo', 'obligan'], 'indican', 'Yumuşak fiil.'),
      q('f603', 'translate', '“Sonuç olarak”:', ['En conclusión', 'En cambio', 'No obstante', 'A pesar de'], 'En conclusión', 'Makale sonu.'),
      q('f604', 'multiple', 'Pasiva analítica:', ['Se realizó un estudio longitudinal.', 'Realizó un estudio…', 'Estudió longitudinalmente…', 'Realizado un estudio…'], 'Se realizó un estudio longitudinal.', 'Objektif ton.'),
      q('f605', 'match', 'metodología ≈', ['yöntem bilimi', 'sonuç', 'giriş', 'tartışma'], 'yöntem bilimi', 'Bölüm adı.'),
    ],
    vocabulary: voc([
      ['hipótesis', 'hipotez', 'Contrastar la hipótesis.'],
      ['marco teórico', 'kuramsal çerçeve', 'En el marco teórico…'],
      ['metodología', 'yöntembilim', 'Metodología mixta.'],
      ['muestra', 'örneklem', 'Muestra aleatoria.'],
      ['sesgo', 'yanlılık', 'Evitar el sesgo.'],
      ['correlación', 'korelasyon', 'Correlación positiva.'],
      ['interpretación', 'yorum', 'Interpretación prudente.'],
      ['conclusión', 'sonuç', 'En conclusión…'],
      ['limitación', 'sınırlılık', 'Limitaciones del estudio.'],
      ['plausible', 'makul', 'Hipótesis plausible.'],
    ]),
  },
  {
    id: 'es_b2_u07',
    title: 'İdiyomlar ve deyimler',
    description: 'Tomar el pelo, meter la patata — konuşmayı doğallaştırın.',
    level: 'B2',
    estimatedMinutes: 11,
    topics: ['modismos', 'coloquial'],
    explanation: [
      expl(
        'Vücut ve metafor',
        'Meter la pata (ayıp etmek), echar una mano (yardım), costar un ojo de la cara (çok pahalı).',
        undefined
      ),
      expl(
        'Tomar / dar kalıpları',
        'Tomar el pelo (alay etmek); dar la vuelta (tersine dönmek).',
        undefined
      ),
      expl(
        'Kayıt',
        'Resmî yazıda idiom azaltın; konuşma ve podcast için biriktirin.',
        undefined
      ),
    ],
    examples: [
      { es: 'No me tomes el pelo.', tr: 'Benimle dalga geçme.', highlight: 'tomes el pelo' },
      { es: 'Metió la pata delante del jefe.', tr: 'Patronun önünde gaf yaptı.', highlight: 'Metió la pata' },
      { es: 'Me costó un ojo de la cara.', tr: 'Bana bir servete mal oldu.', highlight: 'un ojo de la cara' },
      { es: 'Echó una mano sin pedir nada.', tr: 'Karşılıksız yardım etti.', highlight: 'Echó una mano' },
      { es: 'Salió a cuenta.', tr: 'Ucuza geldi / kar etti.', highlight: 'a cuenta' },
    ],
    exercises: [
      q('f701', 'multiple', '“Dalga geçmek”:', ['tomar el pelo', 'tirar el pelo', 'cortar el pelo', 'lavar el pelo'], 'tomar el pelo', 'İdyom.'),
      q('f702', 'fill', '_____ la pata en la reunión.', ['Metió', 'Puso', 'Hizo', 'Dio'], 'Metió', 'Meter la pata.'),
      q('f703', 'translate', '“Pahalıya patladı”:', ['Me costó un ojo de la cara.', 'Me costó los ojos.', 'Me costó cara.', 'Me costó barato.'], 'Me costó un ojo de la cara.', 'Deyim.'),
      q('f704', 'multiple', '“Yardım etmek” deyim:', ['echar una mano', 'tirar una mano', 'dar la mano solo literal', 'subir la mano'], 'echar una mano', 'Kolekyal.'),
      q('f705', 'match', 'ser pan comido ≈', ['çok kolay', 'çok zor', 'çok tatlı', 'çok tuzlu'], 'çok kolay', 'İdyom.'),
    ],
    vocabulary: voc([
      ['tomar el pelo', 'dalga geçmek', 'No me tomes el pelo.'],
      ['meter la pata', 'gaf yapmak', 'Metí la pata.'],
      ['echar una mano', 'yardım etmek', '¿Te echo una mano?'],
      ['costar un ojo de la cara', 'servete mal olmak', 'Cuesta un ojo…'],
      ['ser pan comido', 'çok kolay olmak', 'El examen fue pan comido.'],
      ['quedarse en blanco', 'şakır şukur unutmak', 'Me quedé en blanco.'],
      ['perder el hilo', 'konuyu kaybetmek', 'Perdí el hilo de la charla.'],
      ['en el aire', 'havada / belirsiz', 'Quedó en el aire.'],
      ['dar en el clavo', 'tam isabet', 'Diste en el clavo.'],
      ['más vale tarde que nunca', 'geç olsun güç olmasın', 'Proverbio.'],
    ]),
  },
  {
    id: 'es_b2_u08',
    title: "C1'e hazırlık",
    description: 'Üst kayıt, nüans ve otonom öğrenme stratejileri.',
    level: 'B2',
    estimatedMinutes: 12,
    topics: ['C1', 'autonomía', 'precisión'],
    explanation: [
      expl(
        'Hedef',
        'Haber hablado / haber estado — bileşik zamanlar ve incelikli bağlaçlar (ya que, puesto que, bien que).',
        undefined
      ),
      expl(
        'Okuma',
        'El País, podcasts Radio Nacional — uzun metin ve hızlı konuşma.',
        undefined
      ),
      expl(
        'Üretim',
        'Her hafta 250 kelime görüş yazısı; hata günlüğü tutun.',
        undefined
      ),
    ],
    examples: [
      { es: 'Habría estado mejor preparado de haber practicado más.', tr: 'Daha çok pratik yapmış olsaydım daha iyi hazır olurdum.', highlight: 'Habría estado' },
      { es: 'No por mucho madrugar amanece más temprano.', tr: 'Erken kalkmak her zaman şafağı erken getirmez (atasözü).', highlight: 'madrugar' },
      { es: 'Cuestión de matices: “demasiado” vs “demasiada”.', tr: 'Nüans meselesi: demasiado/demasiada.', highlight: 'matices' },
      { es: 'Prefiero que lo revisemos con calma.', tr: 'Sakinçe gözden geçirmemizi tercih ederim.', highlight: 'con calma' },
      { es: 'El uso variará según el registro.', tr: 'Kullanım üsluba göre değişir.', highlight: 'registro' },
    ],
    exercises: [
      q('f801', 'multiple', 'C1 yoğunluğu:', ['matices', 'palabras simples only', 'solo presente', 'solo pasado'], 'matices', 'Nüans.'),
      q('f802', 'fill', '_____ que sea difícil, lo intentaré.', ['Aunque', 'Porque', 'Cuando', 'Siempre'], 'Aunque', 'Concesiva.'),
      q('f803', 'translate', '“Pratik yapmış olsaydım geçerdim”:', ['Si hubiera practicado, habría aprobado.', 'Si practicaba, habría aprobado.', 'Si practico, habría aprobado.', 'Si practicaré…'], 'Si hubiera practicado, habría aprobado.', 'Tip 3 koşul.'),
      q('f804', 'multiple', 'Üslup kaydı:', ['registro', 'acento', 'sílaba', 'tilde'], 'registro', 'Formal/informal.'),
      q('f805', 'match', 'autonomía ≈', ['özerklik / kendi kendine', 'otomatik', 'otorite', 'önyargı'], 'özerklik / kendi kendine', 'Öğrenen otonomisi.'),
    ],
    vocabulary: voc([
      ['matiz', 'nüans', 'Un matiz importante.'],
      ['registro', 'üslup / kayıt', 'Registro culto.'],
      ['precisión', 'kesinlik', 'Precisión léxica.'],
      ['coherencia', 'tutarlılık', 'Coherencia textual.'],
      ['cohesión', 'bağdaşıklık', 'Conectores dan cohesión.'],
      ['autonomía', 'özerklik', 'Aprendizaje autónomo.'],
      ['retroalimentación', 'geri bildirim', 'Feedback del tutor.'],
      ['interculturalidad', 'kültürlerarasılık', 'Competencia intercultural.'],
      ['norma culta', 'yüksek dil normu', 'Norma culta del español.'],
      ['corpus', 'derlem', 'Consultar el corpus CORDE.'],
    ]),
  },
];
