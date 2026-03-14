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

export type LessonItem = {
  lessonTitle: string;
  grammarBlock: string;
  content: string;
  examples?: LessonExample[];
  conjugation?: LessonConjugationRow[];
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
      },
    ],
  },
};

/** Verilen id için ünite içeriğini döndürür; yoksa null */
export function getUnitContent(unitId: string): UnitContent | null {
  return UNIT_CONTENT[unitId] ?? null;
}
