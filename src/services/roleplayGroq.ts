/**
 * AI Hayatta Kalma Simülatörü — Groq API ile senaryo karakteri yanıtları.
 * Sistem prompt: Karakter rolü, hedef dil, [GÖREV_TAMAM] etiketi.
 */

export const TASK_COMPLETE_TAG = '[GÖREV_TAMAM]';

/** Hedef dil kodu (API ve konuşma analizi için) */
export type RoleplayLangCode = 'fr' | 'es' | 'en';

function buildSystemPrompt(
  characterName: string,
  _scenarioLanguage: string,
  _scenarioRole: string,
  missionGoal: string,
  langCode: RoleplayLangCode
): string {
  const langInstruction =
    langCode === 'es'
      ? 'Sadece İspanyolca ile cevap ver.'
      : langCode === 'fr'
        ? 'Sadece Fransızca ile cevap ver.'
        : 'Sadece İngilizce ile cevap ver.';
  return `Sen ${characterName} rolündesin. ${langInstruction}
Kullanıcı başka dilde (ör. Türkçe) yazarsa, nazikçe hedef dilde yazmasını iste.
Görevin: ${missionGoal}
Kullanıcının dilbilgisi hatalarını konuşmanın sonunda özetle, ama konuşma sırasında akışı bozmadan devam et.
Cevaplarını kısa tut (1-3 cümle), gerçek bir konuşma simüle et.
Asla Türkçeye çevirme yapma, rolden çıkma. Eğer kullanıcı görevdeki asıl amacı başarıyla tamamlarsa, bir sonraki cevabının en sonuna tam olarak şu etiketi ekle: ${TASK_COMPLETE_TAG}`;
}

export type RoleplayMessage = { role: 'user' | 'assistant'; content: string };

export interface ConversationFeedback {
  grammarErrors: {
    original: string;
    corrected: string;
    explanation: string;
  }[];
  vocabularyUsed: string[];
  missedOpportunities: string[];
  score: number;
  levelEstimate: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
  encouragement: string;
}

/**
 * Groq API ile roleplay turu. Cevapta [GÖREV_TAMAM] varsa çağıran replace ile kaldırıp XP tetikleyecek.
 */
export async function sendRoleplayMessage(
  scenarioLanguage: string,
  scenarioRole: string,
  missionGoal: string,
  messages: RoleplayMessage[],
  opts?: { characterName: string; langCode: RoleplayLangCode }
): Promise<{ content: string; taskComplete: boolean }> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    return { content: 'API anahtarı tanımlı değil. .env.local içinde VITE_GROQ_API_KEY ekleyin.', taskComplete: false };
  }

  const characterName = opts?.characterName ?? 'Karakter';
  const langCode = opts?.langCode ?? 'es';
  const systemContent = buildSystemPrompt(characterName, scenarioLanguage, scenarioRole, missionGoal, langCode);
  const apiMessages = [
    { role: 'system' as const, content: systemContent },
    ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: apiMessages,
        temperature: 0.8,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[Roleplay] Groq HTTP:', response.status, errText);
      return { content: 'Yanıt alınamadı. Lütfen tekrar dene.', taskComplete: false };
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content ?? '';
    if (typeof content !== 'string') content = String(content);

    const taskComplete = content.includes(TASK_COMPLETE_TAG);
    if (taskComplete) {
      content = content.replace(TASK_COMPLETE_TAG, '').trim();
    }
    return { content, taskComplete };
  } catch (e) {
    console.error('[Roleplay] Groq istek hatası:', e);
    return { content: 'Bağlantı hatası. Lütfen tekrar dene.', taskComplete: false };
  }
}

/** Konuşma geçmişini analiz edip geri bildirim üretir (tek JSON nesnesi döner). */
export async function fetchConversationFeedback(
  langCode: RoleplayLangCode,
  missionGoal: string,
  messages: RoleplayMessage[]
): Promise<ConversationFeedback | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') return null;

  const langName = langCode === 'es' ? 'İspanyolca' : langCode === 'fr' ? 'Fransızca' : 'İngilizce';
  const convoText = messages
    .map((m) => `${m.role === 'user' ? 'Kullanıcı' : 'Karakter'}: ${m.content}`)
    .join('\n');

  const systemPrompt = `Sen bir ${langName} dil öğretmenisin. Aşağıdaki konuşmayı analiz et ve SADECE geçerli bir JSON nesnesi döndür. Başka metin yazma.
JSON şeması:
{
  "grammarErrors": [{"original": "kullanıcının yazdığı", "corrected": "doğrusu", "explanation": "kısa açıklama"}],
  "vocabularyUsed": ["bu konuşmada geçen kelime/cümle kalıpları"],
  "missedOpportunities": ["kullanabilirdi ama kullanmadığı ifadeler"],
  "score": 0-100 sayı,
  "levelEstimate": "A1" | "A2" | "B1" | "B2" | "C1",
  "encouragement": "Bir cümle kişisel teşvik mesajı (Türkçe)"
}
Görev: ${missionGoal}. grammarErrors boş array olabilir. vocabularyUsed ve missedOpportunities en fazla 5-6 öğe.`;

  const userPrompt = `Konuşma:\n${convoText}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content ?? '';
    if (typeof content !== 'string') content = String(content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as ConversationFeedback;
    if (!parsed || typeof parsed.score !== 'number') return null;
    parsed.grammarErrors = Array.isArray(parsed.grammarErrors) ? parsed.grammarErrors : [];
    parsed.vocabularyUsed = Array.isArray(parsed.vocabularyUsed) ? parsed.vocabularyUsed : [];
    parsed.missedOpportunities = Array.isArray(parsed.missedOpportunities) ? parsed.missedOpportunities : [];
    parsed.levelEstimate = ['A1', 'A2', 'B1', 'B2', 'C1'].includes(parsed.levelEstimate) ? parsed.levelEstimate : 'A2';
    parsed.encouragement = typeof parsed.encouragement === 'string' ? parsed.encouragement : 'Harika ilerleme!';
    return parsed;
  } catch (e) {
    console.error('[Roleplay] Feedback istek hatası:', e);
    return null;
  }
}

/** AI ile senaryo oluşturur. Dil, seviye, kategori ver. */
export interface GeneratedScenarioPayload {
  title: string;
  characterName: string;
  roleLabel: string;
  task: string;
  quickPhrases: string[];
  successCriteria: string[];
}

export async function generateScenario(
  langCode: RoleplayLangCode,
  level: string,
  category: string
): Promise<GeneratedScenarioPayload | null> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') return null;

  const langName = langCode === 'es' ? 'İspanyolca' : langCode === 'fr' ? 'Fransızca' : 'İngilizce';
  const categoryLabel = category === 'seyahat' ? 'seyahat' : category === 'is' ? 'iş' : category === 'sosyal' ? 'sosyal' : 'alışveriş';

  const systemPrompt = `Sen bir dil öğrenme senaryosu yazarısın. Verilen parametrelere uygun, gerçekçi bir senaryo oluştur ve SADECE aşağıdaki JSON formatında döndür. Başka metin yazma.
{
  "title": "Senaryo başlığı (Türkçe, örn: Madrid'de Otel)",
  "characterName": "Karakter adı (hedef dilde)",
  "roleLabel": "Rol adı (Türkçe, örn: Resepsiyonist)",
  "task": "Görev açıklaması (Türkçe, 1-2 cümle)",
  "quickPhrases": ["hedef dilde 4-5 kısa ifade"],
  "successCriteria": ["3-4 madde, Türkçe, ne yapılması gerektiği"]
}`;

  const userPrompt = `Dil: ${langName}, Seviye: ${level}, Kategori: ${categoryLabel}. Bu parametreler için gerçekçi bir senaryo oluştur.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content ?? '';
    if (typeof content !== 'string') content = String(content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as GeneratedScenarioPayload;
    if (!parsed?.title || !parsed.characterName || !parsed.task) return null;
    parsed.quickPhrases = Array.isArray(parsed.quickPhrases) ? parsed.quickPhrases : [];
    parsed.successCriteria = Array.isArray(parsed.successCriteria) ? parsed.successCriteria : [];
    return parsed;
  } catch (e) {
    console.error('[Roleplay] Generate scenario error:', e);
    return null;
  }
}
