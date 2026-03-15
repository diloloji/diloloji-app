/**
 * AI Hayatta Kalma Simülatörü — Groq API ile senaryo karakteri yanıtları.
 * Sistem prompt: Karakter rolü, hedef dil, [GÖREV_TAMAM] etiketi.
 */

export const TASK_COMPLETE_TAG = '[GÖREV_TAMAM]';

function buildSystemPrompt(scenarioLanguage: string, scenarioRole: string, missionGoal: string): string {
  return `Sen bir dil pratiği asistanı değilsin, senaryodaki karaktersin (örn: garson veya fırıncı). Kullanıcı seninle ${scenarioLanguage} konuşacak. Sadece karakterin gibi doğal, kısa ve günlük dilde cevaplar ver. Asla Türkçeye çevirme yapma, rolden çıkma. Kullanıcının dil seviyesine göre inisiyatif al. Eğer kullanıcı görevdeki asıl amacı başarıyla tamamlarsa, bir sonraki cevabının en sonuna tam olarak şu etiketi ekle: ${TASK_COMPLETE_TAG}`;
}

export type RoleplayMessage = { role: 'user' | 'assistant'; content: string };

/**
 * Groq API ile roleplay turu. Cevapta [GÖREV_TAMAM] varsa çağıran replace ile kaldırıp XP tetikleyecek.
 */
export async function sendRoleplayMessage(
  scenarioLanguage: string,
  scenarioRole: string,
  missionGoal: string,
  messages: RoleplayMessage[]
): Promise<{ content: string; taskComplete: boolean }> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    return { content: 'API anahtarı tanımlı değil. .env.local içinde VITE_GROQ_API_KEY ekleyin.', taskComplete: false };
  }

  const systemContent = buildSystemPrompt(scenarioLanguage, scenarioRole, missionGoal);
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
