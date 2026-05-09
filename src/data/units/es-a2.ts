/**
 * İspanyolca A2 — Öğrenme Yolu (12 ünite)
 */

import type { UnitData } from './types';
import { voc, q, expl } from './unitBuilders';

export const ES_A2_UNITS: UnitData[] = [
  {
    id: 'es_a2_u01',
    title: 'Pretérito indefinido — düzenli fiiller',
    description: 'Tamamlanmış geçmiş: hablé, comiste, vivieron.',
    level: 'A2',
    estimatedMinutes: 12,
    topics: ['pretérito', 'regular', 'pasado'],
    explanation: [
      expl(
        '-ar kök + é, aste, ó, amos, asteis, aron',
        'Ayer hablé con el jefe. Peninsular İspanyolca’da birinci çoğul -asteis şekli İspanya’da yaygındır.',
        undefined,
        {
          headers: ['Özne', 'hablar', 'Telaffuz', 'Anlam'],
          rows: [
            ['Yo', 'hablé', '(ablé)', 'konuştum'],
            ['Tú', 'hablaste', '(abláste)', 'konuştun'],
            ['Él/Ella/Usted', 'habló', '(abló)', 'konuştu'],
            ['Nosotros/as', 'hablamos', '(ablámos)', 'konuştuk'],
            ['Vosotros/as', 'hablasteis', '(ablasteis)', 'konuştunuz'],
            ['Ellos/Ustedes', 'hablaron', '(abláron)', 'konuştular'],
          ],
        }
      ),
      expl(
        '-er / -ir',
        '-er: í, iste, ió, imos, isteis, ieron. -ir aynı kalıp: viví, viviste… Not: nosotros genelde pretérito ve presente ile aynı görünür (vivimos). Bağlam ayırır.',
        [
          {
            rule: 'Zaman göstergeleri: ayer, la semana pasada, en 2019.',
            example_es: 'Comimos en un restaurante nuevo.',
            example_tr: 'Yeni bir restoranda yemek yedik.',
          },
        ]
      ),
      expl(
        'Ne zaman kullanılır?',
        'Tek seferlik, sınırlı süreli tamamlanmış olaylar. Süreç/habit için imperfecto (önümüzdeki ünite).',
        undefined
      ),
    ],
    examples: [
      { es: 'Ayer estudié tres horas.', tr: 'Dün üç saat çalıştım.', highlight: 'estudié' },
      { es: '¿Comiste paella?', tr: 'Paella yedin mi?', highlight: 'Comiste' },
      { es: 'No llamaron.', tr: 'Aramadılar.', highlight: 'llamaron' },
      { es: 'Viajamos a Toledo el sábado.', tr: 'Cumartesi Toledo\'ya seyahat ettik.', highlight: 'Viajamos' },
      { es: 'Vivisteis en Lisboa un año.', tr: 'Bir yıl Lizbon\'da yaşadınız.', highlight: 'Vivisteis' },
    ],
    exercises: [
      q('b101', 'multiple', 'hablar yo çekimi:', ['hablé', 'hablo', 'hablaba', 'he hablado'], 'hablé', 'Pretérito -é.'),
      q('b102', 'fill', 'Ayer _____ con mi jefe.', ['hablé', 'hablaba', 'hablo', 'he hablado'], 'hablé', 'Ayer tamamlanmış olay → indefinido.'),
      q('b103', 'translate', '“Dün yazdım” (escribir):', ['Escribí ayer.', 'Escrito ayer.', 'Escribía ayer.', 'Escribo ayer.'], 'Escribí ayer.', 'Escribir düzensiz kök escrip-…'),
      q('b104', 'multiple', 'Zaman göstergesi:', ['ayer', 'siempre', 'a menudo', 'cada día'], 'ayer', 'Tek seferlik geçmiş.'),
      q('b105', 'match', 'comer él indefinido:', ['comió', 'comía', 'come', 'ha comido'], 'comió', 'Él + -ió.'),
    ],
    vocabulary: voc([
      ['ayer', 'dün', 'Ayer llovió.'],
      ['la semana pasada', 'geçen hafta', 'Viajé la semana pasada.'],
      ['el año pasado', 'geçen yıl', 'El año pasado viví en Roma.'],
      ['de repente', 'aniden', 'De repente sonó el teléfono.'],
      ['por fin', 'nihayet', 'Por fin terminé.'],
      ['entonces', 'o zaman', 'Entonces decidimos salir.'],
      ['ya', 'artık / zaten', 'Ya llegamos.'],
      ['todavía', 'henüz', 'Todavía no comí.'],
      ['anoche', 'dün gece', 'Anoche dormí mal.'],
      ['pasado/pasada', 'geçmiş', 'El mes pasado.'],
    ]),
  },
  {
    id: 'es_a2_u02',
    title: 'Pretérito indefinido — düzensiz fiiller',
    description: 'fui, vine, tuve, hice, dije ve sık kök değişimleri.',
    level: 'A2',
    estimatedMinutes: 13,
    topics: ['pretérito', 'irregulares'],
    explanation: [
      expl(
        'Tamamen düzensiz kökler',
        'Ir → fui/fuiste/fue/fuimos/fuisteis/fueron. Ser aynı biçimleri paylaşır — bağlam ayırır. Tener → tuve…; hacer → hice…; decir → dije…',
        [
          {
            rule: 'Venir → vine, traer → traje; okunuşları ezber tablosuyla çalışın.',
            example_es: 'Vine en tren.',
            example_tr: 'Trenle geldim.',
          },
        ]
      ),
      expl(
        'Yo tuşu -e / -i',
        'Poner → puse, poder → pude, querer → quise: İlk tekil sık sık -e/-i ile biter.',
        undefined
      ),
      expl(
        'Üçüncü kişi şoku',
        'Decir → dijo; traer → trajo; conducir → condujo — -jo ile biten kalıplara dikkat.',
        undefined
      ),
    ],
    examples: [
      { es: 'Fui al médico.', tr: 'Doktora gittim.', highlight: 'Fui' },
      { es: 'Tuvimos suerte.', tr: 'Şanslıydık.', highlight: 'Tuvimos' },
      { es: 'Hizo mucho frío.', tr: 'Çok soğuktu (o gün).', highlight: 'Hizo' },
      { es: 'Dijeron la verdad.', tr: 'Gerçeği söylediler.', highlight: 'Dijeron' },
      { es: 'Propuso una idea nueva.', tr: 'Yeni bir fikir önerdi.', highlight: 'Propuso' },
    ],
    exercises: [
      q('b201', 'multiple', '“Geldim” (venir):', ['Vine', 'Venía', 'He venido', 'Vengo'], 'Vine', 'Indefinido vine.'),
      q('b202', 'fill', 'Él _____ que no.', ['dijo', 'decía', 'dice', 'dirá'], 'dijo', 'Decir indefinido.'),
      q('b203', 'translate', '“Yapabildim”:', ['Pude.', 'Podía.', 'He podido.', 'Podré.'], 'Pude', 'Poder indefinido yo.'),
      q('b204', 'multiple', 'Traer él:', ['trajo', 'trajo', 'traía', 'traerá'], 'trajo', 'Trajo forma.'),
      q('b205', 'match', 'Querer yo (istemek — indefinido):', ['quise', 'quería', 'quiero', 'habré querido'], 'quise', 'Geçmiş istek; nuans ileri düzeyde.'),
    ],
    vocabulary: voc([
      ['ir', 'gitmek', 'Fui a casa.'],
      ['venir', 'gelmek', 'Vinieron tarde.'],
      ['tener', 'sahip olmak', 'Tuve un problema.'],
      ['hacer', 'yapmak', 'Hizo falta tiempo.'],
      ['decir', 'demek', 'Dijo la respuesta.'],
      ['poner', 'koymak', 'Puse la mesa.'],
      ['traer', 'getirmek', 'Trajimos regalos.'],
      ['poder', 'ebilmek', 'No pude ir.'],
      ['querer', 'istemek', 'Quise ayudar.'],
      ['saber', 'bilmek', 'Supe el resultado.'],
    ]),
  },
  {
    id: 'es_a2_u03',
    title: 'Pretérito imperfecto',
    description: 'era, tenía, vivía — alışkanlık, süreç ve arka plan.',
    level: 'A2',
    estimatedMinutes: 12,
    topics: ['imperfecto', 'rutina', 'descripción'],
    explanation: [
      expl(
        '-ar: aba / -er,-ir: ía',
        'Cuando era niño, jugaba en el parque. Çocukken parkta oynardım — süregelen geçmiş.',
        undefined,
        {
          headers: ['Özne', 'vivir', 'Telaffuz', 'Anlam'],
          rows: [
            ['Yo', 'vivía', '(ibía)', 'yaşıyordum'],
            ['Tú', 'vivías', '(ibías)', 'yaşıyordun'],
            ['Él/Ella/Usted', 'vivía', '(ibía)', 'yaşıyordu'],
            ['Nosotros/as', 'vivíamos', '(ibíamos)', 'yaşıyorduk'],
            ['Vosotros/as', 'vivíais', '(ibíais)', 'yaşıyordunuz'],
            ['Ellos/Ustedes', 'vivían', '(ibían)', 'yaşıyorlardı'],
          ],
        }
      ),
      expl(
        'Ser ve ir imperfecto çakışması',
        'Yo era / Yo iba biçimi aynı olabilir (person’e göre): Era estudiante; Iba a clase los lunes.',
        [
          {
            rule: 'Hava betimi: Llovía mucho.',
            example_es: 'Ese día llovía.',
            example_tr: 'O gün yağıyordu.',
          },
        ]
      ),
      expl(
        'Imperfecto + mental durum',
        'Creía que… (sanıyordum ki), quería… (istiyordum) geçmişte süren düşünce.',
        undefined
      ),
    ],
    examples: [
      { es: 'Cuando era joven, corría cada mañana.', tr: 'Gençken her sabah koşardım.', highlight: 'era' },
      { es: 'La casa era grande y tenía jardín.', tr: 'Ev büyüktü ve bahçesi vardı.', highlight: 'tenía' },
      { es: '¿Qué hacías a las ocho?', tr: 'Saat sekizde ne yapıyordun?', highlight: 'hacías' },
      { es: 'Siempre llegábamos tarde.', tr: 'Her zaman geç kalırdık.', highlight: 'llegábamos' },
      { es: 'No sabía la respuesta.', tr: 'Cevabı bilmiyordum.', highlight: 'sabía' },
    ],
    exercises: [
      q('b301', 'multiple', 'hablar yo imperfecto:', ['hablaba', 'hablé', 'hablo', 'he hablado'], 'hablaba', '-aba.'),
      q('b302', 'fill', 'De niño, _____ miedo a la oscuridad.', ['tenía', 'tuve', 'tengo', 'tendré'], 'tenía', 'Süregelen duygu → imperfecto.'),
      q('b303', 'translate', '“Her yaz denize giderdik”:', ['Íbamos al mar cada verano.', 'Fuimos al mar cada verano.', 'Vamos al mar cada verano.', 'Iremos…'], 'Íbamos al mar cada verano.', 'Tekrarlayan geçmiş → imperfecto.'),
      q('b304', 'multiple', '“O güzeldi” (tanım):', ['Era bonita.', 'Estuvo bonita.', 'Es bonita.', 'Será bonita.'], 'Era bonita.', 'Geçmişte tanım → era.'),
      q('b305', 'match', 'comía ≈', ['yiyordum / yerdim', 'yedim', 'yiyeceğim', 'yiyorum'], 'yiyordum / yerdim', 'Imperfecto süreklilik.'),
    ],
    vocabulary: voc([
      ['cuando', '…dığında / ne zaman', 'Cuando llegamos…'],
      ['de niño / de niña', 'çocukken', 'De niña leía mucho.'],
      ['siempre', 'her zaman', 'Siempre iba en bici.'],
      ['a menudo', 'sık sık', 'A menudo mentía sin querer.'],
      ['antes', 'önce', 'Antes vivía aquí.'],
      ['mientras', 'iken / sırasında', 'Mientras cocinaba, sonó el teléfono.'],
      ['solía', '…rdım (used to)', 'Solía nadar.'],
      ['por las mañanas', 'sabahları', 'Por las mañanas estudiaba.'],
      ['en aquella época', 'o dönemde', 'En aquella época no había internet.'],
      ['todo el día', 'tüm gün', 'Trabajaba todo el día.'],
    ]),
  },
  {
    id: 'es_a2_u04',
    title: 'Indefinido ve imperfecto ayrımı',
    description: 'Hangisi tek olay, hangisi arka plan veya alışkanlık?',
    level: 'A2',
    estimatedMinutes: 13,
    topics: ['aspecto', 'contraste'],
    explanation: [
      expl(
        'Klasik senaryo',
        'Llovía (arka plan: yağıyordu) cuando salí (keskin olay: çıktım). Imperfecto sahneyi kurar; indefinido tamamlanmış eylemi vurgular.',
        [
          {
            rule: '“Mientras” ile sık çiftlenir.',
            example_es: 'Mientras cocinaba, oyó un ruido.',
            example_tr: 'Yemek pişirirken bir gürültü duydu.',
          },
        ]
      ),
      expl(
        'Saat çizelgesi',
        'A las ocho abrió la tienda (belirli başlangıç) vs La tienda abría a las ocho (genel rutin).',
        undefined
      ),
      expl(
        'Duygu ve algı',
        'Me sentía mal (süreç) vs Me sentí mal (anlık durum değişimi) — B1’de nüans derinleşir.',
        undefined
      ),
    ],
    examples: [
      { es: 'Caminaba por la calle cuando vi el accidente.', tr: 'Sokakta yürüyordum ki kazayı gördüm.', highlight: 'Caminaba' },
      { es: 'De repente empezó a llover.', tr: 'Aniden yağmur yağmaya başladı.', highlight: 'empezó' },
      { es: 'Eran las tres y aún trabajaba.', tr: 'Saat üçtü ve hâlâ çalışıyordum.', highlight: 'trabajaba' },
      { es: 'No quería ir, pero fui.', tr: 'Gitmek istemiyordum ama gittim.', highlight: 'quería' },
      { es: 'La casa estaba oscura y olía a café.', tr: 'Ev karanlıktı ve kahve kokuyordu.', highlight: 'olía' },
    ],
    exercises: [
      q('b401', 'multiple', '“Birden kapı çaldı” (tek olay):', ['Llamaron a la puerta.', 'Llamaban…', 'Han llamado…', 'Llaman…'], 'Llamaron a la puerta.', 'Tamamlanmış olay → indefinido.'),
      q('b402', 'fill', 'Mientras _____, sonó el móvil.', ['leía', 'leyó', 'leo', 'habré leído'], 'leía', 'Süreç sırasında başka olay.'),
      q('b403', 'translate', '“Her hafta yüzerdim”:', ['Nadaba cada semana.', 'Nadé cada semana.', 'He nadado…', 'Nado…'], 'Nadaba cada semana.', 'Alışkanlık imperfecto.'),
      q('b404', 'multiple', 'Geçmişte tanım “ev eskiydi”:', ['La casa era vieja.', 'La casa estuvo vieja.', 'La casa fue vieja.', 'La casa ha sido vieja.'], 'La casa era vieja.', 'Tanım genelde era.'),
      q('b405', 'match', 'ayer + tek sefer:', ['pretérito indefinido', 'imperfecto', 'presente', 'subjuntivo'], 'pretérito indefinido', 'Zaman çizgisinde tamamlanmış.'),
    ],
    vocabulary: voc([
      ['de repente', 'aniden', 'De repente paró.'],
      ['en ese momento', 'o anda', 'En ese momento entró.'],
      ['mientras', 'iken', 'Mientras dormía…'],
      ['cuando', '…dığında', 'Cuando era niño…'],
      ['por primera vez', 'ilk kez', 'Por primera vez viajé solo.'],
      ['normalmente', 'normalde', 'Normalmente corría.'],
      ['a veces', 'bazen', 'A veces fallaba.'],
      ['siempre', 'her zaman', 'Siempre llegaba tarde.'],
      ['un día', 'bir gün', 'Un día cambió todo.'],
      ['de golpe', 'bir anda', 'De golpe calló.'],
    ]),
  },
  {
    id: 'es_a2_u05',
    title: 'Ir + a + infinitivo (yakın gelecek)',
    description: 'Voy a estudiar; plan ve niyet.',
    level: 'A2',
    estimatedMinutes: 10,
    topics: ['futuro próximo', 'ir a'],
    explanation: [
      expl(
        'Formül',
        'Presente ir + a + mastar: Voy a llamarte mañana. Türkçede “edeceğim / niyetliyim” ile örtüşür.',
        [
          {
            rule: 'Zaman zarfları: mañana, esta tarde, pronto.',
            example_es: 'Van a cerrar pronto.',
            example_tr: 'Yakında kapatacaklar.',
          },
        ]
      ),
      expl(
        'Emir yerine',
        'Vas a hacer la tarea — sert uyarı veya plan sorabilir.',
        undefined
      ),
      expl(
        'vs futuro simple',
        'A2’de ir+a günlük plan; futuro simple (hablaré) B1’de genişler.',
        undefined
      ),
    ],
    examples: [
      { es: 'Voy a comprar pan.', tr: 'Ekmek alacağım.', highlight: 'Voy a' },
      { es: '¿Vas a venir a la fiesta?', tr: 'Partiye gelecek misin?', highlight: 'Vas a' },
      { es: 'Va a nevar.', tr: 'Kar yağacak.', highlight: 'Va a' },
      { es: 'Vamos a ver.', tr: 'Göreceğiz / bakalım.', highlight: 'Vamos a' },
      { es: 'Van a mudarse el mes que viene.', tr: 'Gelecek ay taşınacaklar.', highlight: 'Van a' },
    ],
    exercises: [
      q('b501', 'multiple', '“Yemek yiyeceğiz”:', ['Vamos a cenar.', 'Vamos a cenamos.', 'Iremos a cenar.', 'Fuimos a cenar.'], 'Vamos a cenar.', 'Ir + a + infinitivo.'),
      q('b502', 'fill', '¿_____ llover mañana?', ['Va a', 'Va', 'Iba a', 'Ha de'], 'Va a', 'Tahmin + ir a.'),
      q('b503', 'translate', '“Kitap okuyacağım”:', ['Voy a leer un libro.', 'Voy leer un libro.', 'Iré leer un libro.', 'Voy a leo…'], 'Voy a leer un libro.', 'Voy a + leer.'),
      q('b504', 'multiple', 'Olumsuz “gitmeyeceğim”:', ['No voy a ir.', 'No voy ir.', 'No iré a ir.', 'No voy a voy.'], 'No voy a ir.', 'No + voy a + infinitivo.'),
      q('b505', 'match', 'Vamos a ver ≈', ['bakalım', 'görürüz', 'gittik', 'gidelim'], 'bakalım', 'Sabit ifade.'),
    ],
    vocabulary: voc([
      ['ir a', '-ecek / niyet', 'Voy a intentarlo.'],
      ['mañana', 'yarın', 'Mañana hablamos.'],
      ['pronto', 'yakında', 'Volveré pronto.'],
      ['esta tarde', 'bu öğleden sonra', 'Esta tarde voy al médico.'],
      ['el mes que viene', 'gelecek ay', 'Viajo el mes que viene.'],
      ['dentro de poco', 'az sonra', 'Dentro de poco termino.'],
      ['plan', 'plan', 'Tenemos un plan.'],
      ['preparar', 'hazırlamak', 'Voy a preparar la cena.'],
      ['intentar', 'denemek', 'Voy a intentar dormir.'],
      ['empezar a', 'başlamak', 'Empiezo a trabajar el lunes.'],
    ]),
  },
  {
    id: 'es_a2_u06',
    title: 'Gustar ve benzer fiiller',
    description: 'Me gusta / Me encanta / Me duele — ters özne mantığı.',
    level: 'A2',
    estimatedMinutes: 11,
    topics: ['gustar', 'placer', 'dolor'],
    explanation: [
      expl(
        'Çekim mantığı',
        '“Beğenmek” fiilinin öznesi aslında nesnedir: Me gusta el café = Kahve hoşuma gider. Çoğul: Me gustan las tapas.',
        [
          {
            rule: 'İnsan öznesi ile le/les: Le gusta la música.',
            example_es: 'Les gustan los deportes.',
            example_tr: 'Onların sporları sevmesi / sporları hoşlarına gidiyor.',
          },
        ]
      ),
      expl(
        'Benzer yapılar',
        'Encantar (bayılmak), importar (önem vermek), interesar (ilgisini çekmek), molestar (rahatsız etmek).',
        undefined
      ),
      expl(
        'FİİL + mastar',
        'Me gusta bailar; Me encanta viajar — mastar tekil “şey” gibi davranır.',
        undefined
      ),
    ],
    examples: [
      { es: 'Me gusta mucho el chocolate.', tr: 'Çikolatayı çok severim.', highlight: 'gusta' },
      { es: '¿Te gustan las películas de terror?', tr: 'Korku filmlerini sever misin?', highlight: 'gustan' },
      { es: 'Le encanta cocinar.', tr: 'Yemek yapmaya bayılıyor.', highlight: 'encanta' },
      { es: 'Nos interesa la historia local.', tr: 'Yerel tarih ilgimizi çekiyor.', highlight: 'interesa' },
      { es: 'Me duele la cabeza.', tr: 'Başım ağrıyor.', highlight: 'duele' },
    ],
    exercises: [
      q('b601', 'multiple', '“Kitapları severim” (çoğul nesne):', ['Me gustan los libros.', 'Me gusta los libros.', 'Me gusto los libros.', 'Me gustas los libros.'], 'Me gustan los libros.', 'Libros çoğul → gustan.'),
      q('b602', 'fill', 'A ella _____ bailar.', ['le gusta', 'le gustan', 'se gusta', 'la gusta'], 'le gusta', 'Bailar mastar tekil.'),
      q('b603', 'translate', '“Başım ağrıyor”:', ['Me duele la cabeza.', 'Duele me la cabeza.', 'Me duelen la cabeza.', 'Tengo duele la cabeza.'], 'Me duele la cabeza.', 'Doler singular.'),
      q('b604', 'multiple', '“Önemli değil”:', ['No importa.', 'No importo.', 'No es importe.', 'No tiene importe.'], 'No importa.', 'Sabit kalıp.'),
      q('b605', 'match', 'Me encanta ≈', ['bayılıyorum', 'hoşuma gidiyor', 'nefret ediyorum', 'unutmuyorum'], 'bayılıyorum', 'Daha güçlü zevk.'),
    ],
    vocabulary: voc([
      ['gustar', 'hoşuna gitmek', '¿Te gusta?'],
      ['encantar', 'çok hoşuna gitmek', 'Me encanta el mar.'],
      ['interesar', 'ilgisini çekmek', 'Le interesa la política.'],
      ['importar', 'önem vermek', 'No me importa.'],
      ['molestar', 'rahatsız etmek', '¿Te molesta el ruido?'],
      ['doler', 'ağrımak', 'Me duelen los ojos.'],
      ['fascinar', 'büyülemek', 'Me fascina la arquitectura.'],
      ['apasionar', 'tutkulanmak', 'Le apasiona el teatro.'],
      ['parecer', 'seçilmek / görünmek', '¿Qué te parece?'],
      ['chocar', 'sinir bozmak', 'Me choca la mentira.'],
    ]),
  },
  {
    id: 'es_a2_u07',
    title: 'Karşılaştırma',
    description: 'más … que, menos … que, tan … como.',
    level: 'A2',
    estimatedMinutes: 10,
    topics: ['comparativos', 'igualdad'],
    explanation: [
      expl(
        'Üstünlük ve altılık',
        'Más rápido que… / Menos caro que… Sıfat uyumu isimle bağlanır: Ana es más alta que Luis.',
        [
          {
            rule: 'Sayısal karşılaştırma: más de / menos de.',
            example_es: 'Tenemos más de cien clientes.',
            example_tr: 'Yüzden fazla müşterimiz var.',
          },
        ]
      ),
      expl(
        'Eşitlik',
        'Tan + sıfat + como: tan alto como. Fiillerde igual de + sıfat.',
        undefined
      ),
      expl(
        'İstisna sıfatlar',
        'Bueno → mejor, malo → peor, grande → mayor/küçük → menor (anlam bağlamına göre).',
        undefined
      ),
    ],
    examples: [
      { es: 'Este café está más fuerte que el otro.', tr: 'Bu kahve diğerinden daha sert.', highlight: 'más' },
      { es: 'Gano menos dinero que antes.', tr: 'Önceden daha az para kazanıyorum.', highlight: 'menos' },
      { es: 'Corre tan rápido como su hermano.', tr: 'Kardeşi kadar hızlı koşuyor.', highlight: 'tan' },
      { es: 'Es la mejor opción.', tr: 'En iyi seçenek.', highlight: 'mejor' },
      { es: 'Vivo en un piso menor.', tr: 'Daha küçük bir dairede yaşıyorum.', highlight: 'menor' },
    ],
    exercises: [
      q('b701', 'multiple', '“Sen benden uzunsun”:', ['Eres más alto que yo.', 'Eres más alto que mí.', 'Eres más alto como yo.', 'Eres tan alto que yo.'], 'Eres más alto que yo.', 'que + özne zamir yo.'),
      q('b702', 'fill', 'Estudio _____ que el año pasado.', ['más', 'mejor', 'menos', 'tan'], 'más', 'Daha çok çalışıyorum.'),
      q('b703', 'translate', '“Onun kadar zengin değilim”:', ['No soy tan rico como él.', 'No soy tan rico que él.', 'No soy más rico como él.', 'No soy menos rico como él.'], 'No soy tan rico como él.', 'tan … como.'),
      q('b704', 'multiple', 'İyi / daha iyi düzensiz:', ['mejor', 'más bueno', 'más bien', 'buenísimo'], 'mejor', 'İstisna sıfat.'),
      q('b705', 'match', 'menos … que ≈', ['…den daha az', '…den daha çok', 'kadar', 'gibi'], '…den daha az', 'Karşılaştırma.'),
    ],
    vocabulary: voc([
      ['más', 'daha', 'más fácil'],
      ['menos', 'daha az', 'menos caro'],
      ['que', '-den (karşılaştırma)', 'más alto que tú'],
      ['tan … como', 'o kadar … ki', 'tan listo como'],
      ['mejor', 'daha iyi / en iyi', 'el mejor día'],
      ['peor', 'daha kötü', 'cada vez peor'],
      ['mayor', 'daha büyük / yaşça büyük', 'mi hermana mayor'],
      ['menor', 'daha küçük / küçük yaşlı', 'un menor de edad'],
      ['igual', 'eşit', 'Somos iguales.'],
      ['similar', 'benzer', 'un problema similar.'],
    ]),
  },
  {
    id: 'es_a2_u08',
    title: 'Doğrudan ve dolaylı nesne zamirleri',
    description: 'lo, la, los, las — le, les; se lo / preparárselo.',
    level: 'A2',
    estimatedMinutes: 13,
    topics: ['pronombres OD/OI', 'réflexion'],
    explanation: [
      expl(
        'DO lo/la/los/las',
        'Fiilden önce: Lo compré ayer. Nesne tekrarını önler; İspanyolca’da çok sık kullanılır.',
        [
          {
            rule: 'İsimden sonra gelen lo şaşırtmasın — yer fiilin hemen önü.',
            example_es: 'La película la vimos juntos.',
            example_tr: 'Filmi birlikte izledik.',
          },
        ]
      ),
      expl(
        'IO le/les',
        'Le dije la verdad — ona dedim. Çoğul les: Les mandé un correo.',
        undefined
      ),
      expl(
        'Üçüncü kişi + IO + DO → se',
        'Se lo dije — ona onu söyledim. Çift zamir geldiğinde se ile çözülür.',
        undefined
      ),
    ],
    examples: [
      { es: '¿Lo has visto?', tr: 'Onu gördün mü?', highlight: 'Lo' },
      { es: 'Te lo explico mañana.', tr: 'Sana onu yarın açıklarım.', highlight: 'Te lo' },
      { es: 'Les compré flores.', tr: 'Onlara çiçek aldım.', highlight: 'Les' },
      { es: 'No se lo recomiendo.', tr: 'Onu ona önermiyorum.', highlight: 'se lo' },
      { es: 'Dámelo cuando puedas.', tr: 'Elinden geldiğinde onu bana ver.', highlight: 'Dámelo' },
    ],
    exercises: [
      q('b801', 'multiple', '“Onu gördüm” (eril nesne, tek):', ['Lo vi.', 'Le vi.', 'La vi…', 'Les vi.'], 'Lo vi.', 'DO eril tekil lo.'),
      q('b802', 'fill', '_____ di el libro (onlara verdim).', ['Les', 'Los', 'Las', 'Se'], 'Les', 'IO çoğul les.'),
      q('b803', 'translate', '“Sana bunu söylüyorum”:', ['Te lo digo.', 'Lo te digo.', 'Te lo dice.', 'Me lo digo.'], 'Te lo digo.', 'Te + lo sırası.'),
      q('b804', 'multiple', 'Üçüncü kişiye DO+IO:', ['Se lo envío.', 'Le lo envío.', 'Lo le envío.', 'La se envío.'], 'Se lo envío.', 'se lo kuralı.'),
      q('b805', 'match', 'la pizza … comí:', ['La comí', 'Lo comí', 'Le comí', 'Les comí'], 'La comí', 'Dişil nesne la.'),
    ],
    vocabulary: voc([
      ['lo', 'onu (eril)', 'Lo sé.'],
      ['la', 'onu (dişil)', 'La quiero.'],
      ['los', 'onları (eril)', 'Los traigo.'],
      ['las', 'onları (dişil)', 'Las vendemos.'],
      ['le', 'ona / ona (IO)', 'Le escribo.'],
      ['les', 'onlara (IO)', 'Les ayudo.'],
      ['me', 'bana', 'Me das un minuto?'],
      ['te', 'sana', 'Te llamo luego.'],
      ['nos', 'bize', 'Nos lo cuenta todo.'],
      ['os', 'size (İspanya)', 'Os lo repito.'],
    ]),
  },
  {
    id: 'es_a2_u09',
    title: 'Refleksif fiiller',
    description: 'me levanto, nos duchamos, acordarse — günlük ve duygusal kullanım.',
    level: 'A2',
    estimatedMinutes: 12,
    topics: ['pronominales', 'se'],
    explanation: [
      expl(
        'Yerleşim',
        'Olumsuzda no me levanto; emirde ¡Levántate! Refleksif zamir fiille bitişik yazılabilir (infinitivo/emperativo).',
        [
          {
            rule: 'Acordarse de — unutmayın “de”: Me acuerdo de ti.',
            example_es: 'No me acuerdo del nombre.',
            example_tr: 'Adı hatırlamıyorum.',
          },
        ]
      ),
      expl(
        'Değişen anlam',
        'Ir vs irse, dormir vs dormirse — çıkış veya tamamlanma nuansı.',
        undefined
      ),
      expl(
        'Reciprocal',
        'Nos besamos — birbirimizi öptük (çoğul özne).',
        undefined
      ),
    ],
    examples: [
      { es: 'Me despierto a las seis.', tr: 'Saat altı uyanıyorum.', highlight: 'despierto' },
      { es: '¿Os divertisteis en la fiesta?', tr: 'Partide eğlendiniz mi?', highlight: 'divertisteis' },
      { es: 'Se fue sin despedirse.', tr: 'Vedalaşmadan gitti.', highlight: 'despedirse' },
      { es: 'Nos vemos pronto.', tr: 'Yakında görüşürüz.', highlight: 'vemos' },
      { es: 'Te lavas las manos.', tr: 'Ellerini yıkıyorsun.', highlight: 'lavas' },
    ],
    exercises: [
      q('b901', 'multiple', '“Yıkanıyorum”:', ['Me ducho.', 'Yo ducho.', 'Estoy ducho.', 'Tengo ducho.'], 'Me ducho.', 'Refleksif ducharse.'),
      q('b902', 'fill', 'No _____ acordar del código.', ['me', 'te', 'se', 'nos'], 'me', 'Acordarse + me.'),
      q('b903', 'translate', '“Üzgünüz” (duygu ifadesi — kullanışlı kalıp):', ['Lo sentimos.', 'Los sentimos.', 'Nos sentimos.', 'Sentimos lo.'], 'Lo sentimos.', 'Sabit Lo sentimos.'),
      q('b904', 'multiple', 'Nosotros ayakkabı giyiyoruz:', ['Nos ponemos los zapatos.', 'Nos ponemos las zapatos.', 'Ponemos nos…', 'Se ponemos…'], 'Nos ponemos los zapatos.', 'Ponerse.'),
      q('b905', 'match', 'levantarse ≈', ['kalkmak', 'yatmak', 'koşmak', 'gitmek'], 'kalkmak', 'Sabah rutini.'),
    ],
    vocabulary: voc([
      ['levantarse', 'kalkmak', 'Me levanto temprano.'],
      ['acostarse', 'yatmak', 'Me acuesto tarde.'],
      ['ducharse', 'duş almak', 'Me ducho con agua fría.'],
      ['despertarse', 'uyanmak', 'Me despierto sin alarma.'],
      ['vestirse', 'giyinmek', 'Me visto rápido.'],
      ['lavarse', 'yıkanmak', 'Te lavas las manos.'],
      ['llamarse', 'adı olmak', 'Me llamo Paula.'],
      ['sentirse', 'hissetmek', 'Me siento cansado.'],
      ['acordarse', 'hatırlamak', 'No me acuerdo.'],
      ['olvidarse', 'unutmak', 'Se me olvidó.'],
    ]),
  },
  {
    id: 'es_a2_u10',
    title: 'Ev ve şehir kelime bilgisi',
    description: 'Vivienda, barrio, mobilya ve tarif.',
    level: 'A2',
    estimatedMinutes: 10,
    topics: ['casa', 'ciudad', 'vocabulario'],
    explanation: [
      expl(
        'Konut türleri',
        'Piso (daire), chalet (müstakil), habitación (oda), salón (oturma odası), cocina (mutfak).',
        undefined
      ),
      expl(
        'Şehir yapısı',
        'Centro, afueras, barrio, calle peatonal — yön tarifinde birlikte kullanın.',
        undefined
      ),
      expl(
        'İfadeler',
        'Vivir en el centro; alquilar un piso; compartir piso — öğrenci hayatı için kullanışlı.',
        undefined
      ),
    ],
    examples: [
      { es: 'Alquilo un piso pequeño cerca del metro.', tr: 'Metroya yakın küçük bir daire kiralıyorum.', highlight: 'Alquilo' },
      { es: 'El vecino es ruidoso.', tr: 'Komşu gürültülü.', highlight: 'vecino' },
      { es: 'Hay mucho tráfico en hora punta.', tr: 'Yoğun saatte çok trafik var.', highlight: 'tráfico' },
      { es: 'El barrio es tranquilo.', tr: 'Semt sakin.', highlight: 'tranquilo' },
      { es: 'Subo por el ascensor.', tr: 'Asansörle çıkıyorum.', highlight: 'ascensor' },
    ],
    exercises: [
      q('c001', 'multiple', '“Kira” (isim):', ['el alquiler', 'la alquiler', 'el alquila', 'los alquileres'], 'el alquiler', 'İsim eril.'),
      q('c002', 'fill', 'Vivo en las _____ de la ciudad.', ['afueras', 'centros', 'puertas', 'mesas'], 'afueras', 'Şehir dışı.'),
      q('c003', 'translate', '“Komşu”:', ['el vecino / la vecina', 'el vecino / el vecina', 'vecinos', 'vecindad'], 'el vecino / la vecina', 'Cinsiyet çifti.'),
      q('c004', 'multiple', '“Asansör”:', ['el ascensor', 'la ascensor', 'el ascensión', 'la ascensa'], 'el ascensor', 'Yaygın kelime.'),
      q('c005', 'match', 'barrio ≈', ['semt', 'ülke', 'kat', 'şehir'], 'semt', 'Mahalle anlamı.'),
    ],
    vocabulary: voc([
      ['piso', 'daire', 'Un piso luminoso.'],
      ['habitación', 'oda', 'Habitación doble.'],
      ['salón', 'salon', 'El salón es amplio.'],
      ['cocina', 'mutfak', 'Cocina equipada.'],
      ['baño', 'banyo', 'Dos baños.'],
      ['vecino', 'komşu', 'Vecinos amables.'],
      ['barrio', 'semt', 'Barrio antiguo.'],
      ['centro', 'merkez', 'Vivo en el centro.'],
      ['afueras', 'kenar / banliyö', 'Las afueras de Madrid.'],
      ['ascensor', 'asansör', 'Sin ascensor.'],
    ]),
  },
  {
    id: 'es_a2_u11',
    title: 'Seyahat ve ulaşım',
    description: 'Billete, retraso, embarque ve yön.',
    level: 'A2',
    estimatedMinutes: 11,
    topics: ['viaje', 'transporte'],
    explanation: [
      expl(
        'Ulaşım araçları',
        'Avión, tren, autobús, metro, taxi, bicicleta — “en” veya “por” seçimi bağlama göre.',
        [
          {
            rule: '“Perder el vuelo” uçağı kaçırmak.',
            example_es: 'Perdim el tren.',
            example_tr: 'Treni kaçırdım.',
          },
        ]
      ),
      expl(
        'Havalimanı kelimeleri',
        'Embarque, puerta, equipaje de mano, facturar — seyahatte sık duyarsınız.',
        undefined
      ),
      expl(
        'Gecikme ve iptal',
        'Está retrasado / Han cancelado el vuelo.',
        undefined
      ),
    ],
    examples: [
      { es: '¿A qué hora sale el vuelo?', tr: 'Uçak saat kaçta kalkıyor?', highlight: 'vuelo' },
      { es: 'Perdim la conexión en Frankfurt.', tr: 'Frankfurt\'ta aktarmayı kaçırdım.', highlight: 'conexión' },
      { es: 'El tren va con retraso.', tr: 'Tren gecikmeli gidiyor.', highlight: 'retraso' },
      { es: 'Facturo esta maleta.', tr: 'Bu bavulu teslim ediyorum.', highlight: 'Facturo' },
      { es: '¿Dónde está la parada del autobús?', tr: 'Otobüs durağı nerede?', highlight: 'parada' },
    ],
    exercises: [
      q('c101', 'multiple', '“Bilet” (tren):', ['un billete', 'una billete', 'un billet', 'una entrada'], 'un billete', 'Peninsula İspanya billete.'),
      q('c102', 'fill', 'Mi _____ se perdió.', ['equipaje', 'equipo', 'empleado', 'empleada'], 'equipaje', 'Bagaj.'),
      q('c103', 'translate', '“Uçuş iptal edildi”:', ['Han cancelado el vuelo.', 'Han cancelado la vuelo.', 'Ha cancelado los vuelos.', 'Cancelaron el volar.'], 'Han cancelado el vuelo.', 'İnsan öznesiz plural.'),
      q('c104', 'multiple', '“Pasaport kontrolü”:', ['control de pasaportes', 'pasaporte control', 'control los pasaportes', 'pasaportes control'], 'control de pasaportes', 'İsim sırası.'),
      q('c105', 'match', 'embarque ≈', ['biniş / kapıya gitme', 'bagaj', 'bilet', 'pasaport'], 'biniş / kapıya gitme', 'Havalimanı.'),
    ],
    vocabulary: voc([
      ['vuelo', 'uçuş', 'Vuelo directo.'],
      ['billete', 'bilet', 'Billete de ida y vuelta.'],
      ['tren', 'tren', 'Tren de alta velocidad.'],
      ['retraso', 'gecikme', 'Llegó con retraso.'],
      ['embarque', 'biniş', 'Empieza el embarque.'],
      ['equipaje', 'bagaj', 'Equipaje de mano.'],
      ['pasaporte', 'pasaport', 'Pasaporte caducado.'],
      ['aduana', 'gümrük', 'Pasar por la aduana.'],
      ['conexión', 'aktarma', 'Perdí la conexión.'],
      ['parada', 'durak', 'Parada de taxi.'],
    ]),
  },
  {
    id: 'es_a2_u12',
    title: 'Alışveriş ve para',
    description: 'Precio, descuento, efectivo, tarjeta.',
    level: 'A2',
    estimatedMinutes: 10,
    topics: ['compras', 'dinero'],
    explanation: [
      expl(
        'Satın alma fiilleri',
        'Comprar, pagar, gastar, ahorrar — nesne + por para fiyat: Lo compré por diez euros.',
        undefined
      ),
      expl(
        'Ödeme',
        'En efectivo (nakit), con tarjeta — propina kültürü ülkeye göre.',
        undefined
      ),
      expl(
        'İade ve değişim',
        'Devolver, cambiar talla — fiş: el ticket / la factura.',
        undefined
      ),
    ],
    examples: [
      { es: '¿Cuánto cuesta?', tr: 'Ne kadar?', highlight: 'cuesta' },
      { es: 'Hay un descuento del veinte por ciento.', tr: '%20 indirim var.', highlight: 'descuento' },
      { es: 'Pago en efectivo.', tr: 'Nakit ödüyorum.', highlight: 'efectivo' },
      { es: '¿Puedo probármelo?', tr: 'Deneyebilir miyim?', highlight: 'probármelo' },
      { es: 'Me devolvieron el dinero.', tr: 'Paramı iade ettiler.', highlight: 'devolvieron' },
    ],
    exercises: [
      q('c201', 'multiple', '“Ne kadar?” (tekil):', ['¿Cuánto cuesta?', '¿Cuánto cuestan?', '¿Cuántos cuesta?', '¿Cuánta cuesta?'], '¿Cuánto cuesta?', 'Tekil nesne.'),
      q('c202', 'fill', 'Pago _____ tarjeta.', ['con', 'por', 'para', 'de'], 'con', 'Ödeme aracı con.'),
      q('c203', 'translate', '“Nakit ödeyeceğim”:', ['Pagaré en efectivo.', 'Pagaré con efectivo.', 'Pagaré por efectivo.', 'Pagaré de efectivo.'], 'Pagaré en efectivo.', 'En efectivo.'),
      q('c204', 'multiple', '“İndirim”:', ['descuento', 'cuenta', 'propina', 'cambio'], 'descuento', 'İsim.'),
      q('c205', 'match', 'devolver ≈', ['iade etmek', 'satın almak', 'denemek', 'ödemek'], 'iade etmek', 'Para ürün.'),
    ],
    vocabulary: voc([
      ['precio', 'fiyat', 'Precio fijo.'],
      ['descuento', 'indirim', 'Del diez por ciento.'],
      ['oferta', 'kampanya', 'Está de oferta.'],
      ['efectivo', 'nakit', 'Pago en efectivo.'],
      ['tarjeta', 'kart', 'Tarjeta de crédito.'],
      ['cambio', 'para üstü / bozdurma', '¿Tiene cambio?'],
      ['talla', 'beden', '¿Qué talla usa?'],
      ['devolver', 'iade etmek', 'Quiero devolver esto.'],
      ['probarse', 'denemek (kiyafet)', 'Me pruebo la chaqueta.'],
      ['caja', 'kasa', 'Pague en caja.'],
    ]),
  },
];
