/**
 * Öğrenme Yolu — Ünite bazlı detaylı ders içerikleri.
 * Her ünite: id, title, lessons[] (lessonTitle, grammarBlock, content, examples?, conjugation?).
 */

export type LessonExample = {
  original: string;
  phonetic?: string;
  turkish: string;
};

export type LessonConjugationRow = {
  subject: string;
  verb: string;
  phonetic?: string;
  meaning: string;
};

export type QuizQuestionType = 'multiple_choice' | 'fill_blank' | 'true_false';

export type QuizQuestion = {
  type: QuizQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
};

export type LessonItem = {
  lessonTitle: string;
  grammarBlock: string;
  content: string;
  examples?: LessonExample[];
  conjugation?: LessonConjugationRow[];
  quiz?: QuizQuestion[];
};

export type UnitContent = {
  id: string;
  title: string;
  lessons: LessonItem[];
};

/** Ünite içerikleri — dil ve seviyeye göre anahtarlanır */
export const UNIT_CONTENT: Record<string, UnitContent> = {
  fr_a1_1_u1: {
    id: 'fr_a1_1_u1',
    title: 'Ünite 1: Temel Tanışma ve Être Fiili',
    lessons: [
      {
        lessonTitle: 'Ders 1: Özneyi Tanımak (Les Pronoms Sujets)',
        grammarBlock: '[Zorluk: 1/5] Fransızca\'da cümleye kimin başladığını gösteren kelimeler — Türkçedeki "Ben", "Sen", "O" karşılıkları.',
        content: 'Fransızca\'da her cümle, tıpkı Türkçe\'deki gibi, bir özne ile başlar. Özne, cümlede "kim" sorusunun cevabıdır. Düşünürseniz: "Ben öğrenciyim" derken "ben" öznedir. İşte Fransızca\'nın sihirli özne kelimeleri (şimdilik tekil ve çoğul "biz/siz/onlar"ı da ekliyoruz ki formül tam olsun):',
        examples: [
          { original: 'Je', phonetic: '(Jö)', turkish: 'Ben' },
          { original: 'Tu', phonetic: '(Tü)', turkish: 'Sen (samimi, arkadaşa)' },
          { original: 'Il', phonetic: '(İl)', turkish: 'O (eril)' },
          { original: 'Elle', phonetic: '(El)', turkish: 'O (dişil)' },
          { original: 'Nous', phonetic: '(Nu)', turkish: 'Biz' },
          { original: 'Vous', phonetic: '(Vu)', turkish: 'Siz / Siz (nazik "sen")' },
          { original: 'Ils / Elles', phonetic: '(İl / El)', turkish: 'Onlar (eril / dişil)' },
        ],
        quiz: [
          { type: 'multiple_choice', question: '"Je" Türkçede ne anlama gelir?', options: ['Ben', 'Sen', 'O', 'Biz'], correctAnswer: 'Ben', explanation: 'Je = Ben, Fransızcanın tekil 1. şahsı.' },
          { type: 'multiple_choice', question: '"Nous" hangi öznedir?', options: ['Ben', 'Sen', 'Biz', 'Onlar'], correctAnswer: 'Biz', explanation: 'Nous = Biz, çoğul 1. şahıs.' },
          { type: 'true_false', question: '"Tu" samimi hitapta "sen" anlamındadır.', options: ['Doğru', 'Yanlış'], correctAnswer: 'Doğru', explanation: 'Tu, arkadaşa ve samimi ortamda "sen" için kullanılır.' },
        ],
      },
      {
        lessonTitle: 'Ders 2: Être (Olmak) — İlk Formülümüz',
        grammarBlock: 'Formül: [Özne] + être (çekimli) + [İsim / Sıfat] = Cümle',
        content: 'Être fiili, "olmak" demektir. Türkçe\'de "Ben öğrenciyim", "Sen yorgunsun" derken fiilin sonuna gelen -yim, -sin, -ız ekleri Fransızca\'da "être"nin çekimiyle karşılanır. Yani kim olduğumuzu, nerede olduğumuzu veya nasıl hissettiğimizi bu formülle söyleriz. Aşağıdaki tablo, être fiilinin her özneye göre çekimini gösteriyor — bunu ezberlemek ilk adımınız.',
        conjugation: [
          { subject: 'Je', verb: 'suis', phonetic: '(süi)', meaning: 'Ben …-yim / -yım' },
          { subject: 'Tu', verb: 'es', phonetic: '(e)', meaning: 'Sen …-sin / -sın' },
          { subject: 'Il / Elle / On', verb: 'est', phonetic: '(e)', meaning: 'O … / Biz (günlük dilde "on")' },
          { subject: 'Nous', verb: 'sommes', phonetic: '(som)', meaning: 'Biz …-ız / -iz' },
          { subject: 'Vous', verb: 'êtes', phonetic: '(et)', meaning: 'Siz …-sınız / -siniz' },
          { subject: 'Ils / Elles', verb: 'sont', phonetic: '(son)', meaning: 'Onlar …' },
        ],
        examples: [
          { original: 'Je suis étudiant.', phonetic: '(Jö süi etüdian)', turkish: 'Ben öğrenciyim.' },
          { original: 'Tu es fatigué.', phonetic: '(Tü e fatige)', turkish: 'Sen yorgunsun.' },
          { original: 'Il est français.', phonetic: '(İl e fransê)', turkish: 'O Fransız.' },
          { original: 'Nous sommes en vacances.', phonetic: '(Nu som an vakans)', turkish: 'Biz tatildeyiz.' },
          { original: 'Vous êtes d\'où ?', phonetic: '(Vu et du)', turkish: 'Siz nerelisiniz? (Seyahatte çok kullanılır.)' },
        ],
        quiz: [
          { type: 'multiple_choice', question: 'Être fiilinde "Je" hangi çekimi alır?', options: ['suis', 'es', 'est', 'sommes'], correctAnswer: 'suis', explanation: 'Je suis = Ben …-yim. Être fiilinin 1. tekil çekimi.' },
          { type: 'multiple_choice', question: '"Il est français." cümlesinde "est" ne anlama gelir?', options: ['olmak (o)', 'olmak (biz)', 'olmak (siz)', 'olmak (onlar)'], correctAnswer: 'olmak (o)', explanation: 'Il/Elle/On için être çekimi "est" dir.' },
          { type: 'true_false', question: '"Nous sommes" = Biz …-ız / -iz.', options: ['Doğru', 'Yanlış'], correctAnswer: 'Doğru', explanation: 'Nous + sommes, biz öznesi için être çekimi.' },
        ],
      },
      {
        lessonTitle: 'Ders 3: Kendini Tanıt — Seyahatte Kullanacağın Cümleler',
        grammarBlock: '[Özne] + être + [milliyet / meslek / sıfat]',
        content: 'Barselona\'da veya Paris\'te biri size "Vous êtes d\'où?" (Nerelisiniz?) diye sorduğunda artık "Je suis turc." (Ben Türküm.) diyebilirsiniz. Aynı formül: özne + être + isim/sıfat. Aşağıdaki örnekler günlük hayatta ve seyahatte sık duyacağınız kalıplardan seçildi.',
        examples: [
          { original: 'Je suis touriste.', phonetic: '(Jö süi turist)', turkish: 'Ben turistim.' },
          { original: 'Je suis étudiant en français.', phonetic: '(Jö süi etüdian an fransê)', turkish: 'Ben Fransızca öğrencisiyim.' },
          { original: 'Tu es d\'Istanbul ?', phonetic: '(Tü e distanbul)', turkish: 'Sen İstanbul\'dan mısın?' },
          { original: 'Il est sympa.', phonetic: '(İl e sêmba)', turkish: 'O iyi biri. (sympa = sympathique, kısaca)' },
          { original: 'Nous sommes contents.', phonetic: '(Nu som kontan)', turkish: 'Biz mutluyuz.' },
        ],
        quiz: [
          { type: 'multiple_choice', question: '"Je suis touriste." ne demektir?', options: ['Ben turistim.', 'Sen turistsin.', 'O turist.', 'Biz turistiz.'], correctAnswer: 'Ben turistim.', explanation: 'Je suis + isim/sıfat = Ben …-yim.' },
          { type: 'true_false', question: '"Vous êtes d\'où?" = Nerelisiniz? anlamına gelir.', options: ['Doğru', 'Yanlış'], correctAnswer: 'Doğru', explanation: 'Seyahatte sık duyacağınız bir soru kalıbı.' },
        ],
      },
    ],
  },
  en_a1_1_u1: {
    id: 'en_a1_1_u1',
    title: 'Ünite 1: Temel Tanışma ve To Be Fiili',
    lessons: [
      {
        lessonTitle: 'Ders 1: Özne Zamirleri — I, You, He/She/It Mantığı',
        grammarBlock: '[Zorluk: 1/5] İngilizcede cümlenin başında "kim" sorusunun cevabı: özne zamirleri. Türkçe "Ben", "Sen", "O" karşılıkları.',
        content: 'Türkçede "Ben öğrenciyim" derken "ben" öznedir; İngilizcede de cümle özne ile başlar. Fark: İngilizcede "o" için he (eril) ve she (dişil) ayrımı vardır; it cansız ve hayvanlar için kullanılır. Aşağıdaki tablo, dilin matematiğindeki ilk formülün yapı taşlarını veriyor.',
        examples: [
          { original: 'I', phonetic: '(ay)', turkish: 'Ben' },
          { original: 'You', phonetic: '(yu)', turkish: 'Sen / Siz (tekil ve çoğul aynı)' },
          { original: 'He', phonetic: '(hi)', turkish: 'O (eril)' },
          { original: 'She', phonetic: '(şi)', turkish: 'O (dişil)' },
          { original: 'It', phonetic: '(it)', turkish: 'O (cansız / hayvan)' },
          { original: 'We', phonetic: '(vi)', turkish: 'Biz' },
          { original: 'They', phonetic: '(dey)', turkish: 'Onlar' },
        ],
      },
      {
        lessonTitle: "Ders 2: To Be (Am/Is/Are) Formülü",
        grammarBlock: 'Formül: [Özne] + [am / is / are] + [İsim veya Sıfat] = Cümle',
        content: '"To be" = olmak. Türkçede "Ben öğrenciyim" derken "-yim" eki kullanırsınız; İngilizcede bu ek "am" kelimesiyle karşılanır. Yani "I am a student" cümlesinde "am", Türkçedeki "-yim" ekinin ta kendisidir. Özne değiştikçe am → is → are değişir; bu üçlüyü ezberlemek ilk adım.',
        conjugation: [
          { subject: 'I', verb: 'am', phonetic: '(em)', meaning: 'Ben …-yim / -yım' },
          { subject: 'You', verb: 'are', phonetic: '(ar)', meaning: 'Sen / Siz …-sin / -sınız' },
          { subject: 'He / She / It', verb: 'is', phonetic: '(iz)', meaning: 'O …' },
          { subject: 'We', verb: 'are', phonetic: '(ar)', meaning: 'Biz …-ız / -iz' },
          { subject: 'They', verb: 'are', phonetic: '(ar)', meaning: 'Onlar …' },
        ],
        examples: [
          { original: 'I am a student.', phonetic: '(ay em e stüdınt)', turkish: 'Ben öğrenciyim.' },
          { original: 'She is tired.', phonetic: '(şi iz tayırd)', turkish: 'O (kadın) yorgun.' },
          { original: 'They are from Istanbul.', phonetic: '(dey ar from istanbul)', turkish: 'Onlar İstanbul\'dan.' },
          { original: 'You are right.', phonetic: '(yu ar rayt)', turkish: 'Haklısın.' },
        ],
      },
      {
        lessonTitle: 'Ders 3: Günlük Selamlaşmalar',
        grammarBlock: 'Kalıp: Hello / How are you? / Nice to meet you',
        content: 'İngilizcede günlük iletişimin ilk adımları. "How are you?" (Nasılsın?) sorusuna "I am fine, thanks." (İyiyim, teşekkürler.) gibi To Be formülüyle cevap verirsiniz. "Nice to meet you" (Tanıştığımıza memnun oldum) kalıbını ilk tanışmada kullanın.',
        examples: [
          { original: 'Hello!', phonetic: '(helo)', turkish: 'Merhaba!' },
          { original: 'How are you?', phonetic: '(hav ar yu)', turkish: 'Nasılsın? / Nasılsınız?' },
          { original: 'I am fine, thanks.', phonetic: '(ay em fayn, tenks)', turkish: 'İyiyim, teşekkürler.' },
          { original: 'Nice to meet you.', phonetic: '(nays tı mit yu)', turkish: 'Tanıştığımıza memnun oldum.' },
          { original: 'Goodbye.', phonetic: '(gudbay)', turkish: 'Hoşça kal.' },
        ],
      },
    ],
  },
  de_a1_1_u1: {
    id: 'de_a1_1_u1',
    title: 'Ünite 1: Tanışma ve Sein (Olmak) Fiili',
    lessons: [
      {
        lessonTitle: 'Ders 1: Şahıs Zamirleri — Ich, Du, Er/Sie/Es',
        grammarBlock: '[Zorluk: 1/5] Almancada cümlenin öznesi: şahıs zamirleri. "Sie" (siz) büyük harfle yazıldığında nazik "siz" anlamına gelir.',
        content: 'Almancada her cümle bir özne ile başlar. Ich = ben, du = sen (samimi), er/sie/es = o (eril/dişil/nötr). Dikkat: "Sie" (büyük S ile) hem "onlar" hem de nazik "Siz" anlamında kullanılır; bağlamdan anlaşılır. "sie" (küçük s) = "o (dişil)" veya "onlar". Dilin matematiksel yapısında bu ayrımı net tutmak önemlidir.',
        examples: [
          { original: 'Ich', phonetic: '(ih)', turkish: 'Ben' },
          { original: 'Du', phonetic: '(du)', turkish: 'Sen (samimi)' },
          { original: 'Er', phonetic: '(eer)', turkish: 'O (eril)' },
          { original: 'Sie', phonetic: '(zi)', turkish: 'O (dişil) — küçük sie' },
          { original: 'Es', phonetic: '(es)', turkish: 'O (nötr / cansız)' },
          { original: 'Wir', phonetic: '(vir)', turkish: 'Biz' },
          { original: 'Ihr', phonetic: '(ir)', turkish: 'Siz (çoğul samimi)' },
          { original: 'Sie', phonetic: '(zi)', turkish: 'Siz (nazik) / Onlar — büyük Sie' },
        ],
      },
      {
        lessonTitle: 'Ders 2: Sein Fiili Formülü',
        grammarBlock: 'Formül: [Subjekt] + [sein (çekimli)] + [Nomen / Adjektiv]',
        content: 'Sein = olmak. Türkçedeki "-yim, -sin, -ız" ekleri Almancada sein fiilinin çekimiyle ifade edilir. "Ich bin müde" = Ben yorgunum. Burada "bin", Türkçedeki "-im" ekinin karşılığıdır. Okunuş: (İh bin müde). Her özneye göre bin → bist → ist → sind → seid → sind değişir; bu tabloyu ezberlemek Almancanın ilk formülüdür.',
        conjugation: [
          { subject: 'Ich', verb: 'bin', phonetic: '(bin)', meaning: 'Ben …-im / -yim' },
          { subject: 'Du', verb: 'bist', phonetic: '(bist)', meaning: 'Sen …-sin' },
          { subject: 'Er / Sie / Es', verb: 'ist', phonetic: '(ist)', meaning: 'O …' },
          { subject: 'Wir', verb: 'sind', phonetic: '(zint)', meaning: 'Biz …-ız' },
          { subject: 'Ihr', verb: 'seid', phonetic: '(zayt)', meaning: 'Siz …-sınız' },
          { subject: 'Sie / sie', verb: 'sind', phonetic: '(zint)', meaning: 'Siz / Onlar …' },
        ],
        examples: [
          { original: 'Ich bin müde.', phonetic: '(İh bin müde)', turkish: 'Ben yorgunum.' },
          { original: 'Du bist nett.', phonetic: '(Du bist net)', turkish: 'Sen kibarsın.' },
          { original: 'Er ist Student.', phonetic: '(Eer ist ştudant)', turkish: 'O (eril) öğrenci.' },
          { original: 'Wir sind hier.', phonetic: '(Vir zint hiır)', turkish: 'Biz buradayız.' },
        ],
      },
      {
        lessonTitle: 'Ders 3: Artikellerle İlk Temas (Der, Die, Das)',
        grammarBlock: 'Almancada isimlerin cinsiyeti vardır ve matematiksel gruplara ayrılır: der (eril), die (dişil), das (nötr).',
        content: 'Dünyanın en çok korkulan Almanca konusu aslında bir kural meselesidir: Her isim gramatik olarak eril, dişil veya nötrdür. Bu cinsiyet, Türkçedeki "masa" veya "kitap" gibi doğal cinsiyetle bire bir örtüşmez; dilin kendi sınıflandırmasıdır. Der = eril (örn. der Mann), die = dişil (die Frau) veya çoğul tüm isimler (die Männer), das = nötr (das Kind). Başlangıçta her yeni ismi artikelıyla birlikte ezberleyin; zamanla gruplar zihninizde oturur.',
        examples: [
          { original: 'der Mann', phonetic: '(deer man)', turkish: 'erkek (eril)' },
          { original: 'die Frau', phonetic: '(di fırau)', turkish: 'kadın (dişil)' },
          { original: 'das Kind', phonetic: '(das kint)', turkish: 'çocuk (nötr)' },
          { original: 'die Kinder', phonetic: '(di kindır)', turkish: 'çocuklar (çoğulda hep "die")' },
        ],
      },
    ],
  },
};

/** Verilen id için ünite içeriğini döndürür; yoksa null */
export function getUnitContent(unitId: string): UnitContent | null {
  return UNIT_CONTENT[unitId] ?? null;
}
