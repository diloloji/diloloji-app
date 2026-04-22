const MODEL = 'claude-sonnet-4-20250514';

export const synonymCache = {};

function getAnthropicKey() {
  const k = import.meta.env.VITE_ANTHROPIC_API_KEY;
  return typeof k === 'string' && k.length > 0 ? k : null;
}

function extractJsonObject(text) {
  const t = String(text || '').trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start < 0 || end < 0 || end <= start) {
    throw new Error('JSON bulunamadı');
  }
  return JSON.parse(t.slice(start, end + 1));
}

function clampArray(arr, max) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, max);
}

function sanitizePayload(raw) {
  const synonyms = clampArray(raw?.synonyms, 4)
    .map((x) => ({
      verb: String(x?.verb ?? '').trim(),
      turkish: String(x?.turkish ?? '').trim(),
      difference: String(x?.difference ?? '').trim(),
      register: ['formal', 'informal', 'neutral'].includes(String(x?.register ?? '').trim())
        ? String(x.register).trim()
        : 'neutral',
      example: String(x?.example ?? '').trim(),
    }))
    .filter((x) => x.verb && x.turkish);

  const antonyms = clampArray(raw?.antonyms, 2)
    .map((x) => ({
      verb: String(x?.verb ?? '').trim(),
      turkish: String(x?.turkish ?? '').trim(),
    }))
    .filter((x) => x.verb && x.turkish);

  const note = typeof raw?.note === 'string' && raw.note.trim() ? raw.note.trim() : null;
  return { synonyms, antonyms, note };
}

export async function fetchSynonyms(infinitive) {
  const normalized = String(infinitive || '').trim().toLowerCase();
  if (!normalized) {
    throw new Error('Boş fiil');
  }
  if (synonymCache[normalized]) {
    return synonymCache[normalized];
  }
  const apiKey = getAnthropicKey();
  if (!apiKey) {
    throw new Error('VITE_ANTHROPIC_API_KEY yok');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `İspanyolca fiil: "${normalized}". Sadece JSON döndür, başka hiçbir şey yazma:
{
  "synonyms": [
    {"verb": "eş anlamlı fiil", "turkish": "Türkçe karşılığı", "difference": "aralarındaki nüans farkı Türkçe, max 1 cümle", "register": "formal/informal/neutral", "example": "örnek cümle İspanyolca"}
  ],
  "antonyms": [
    {"verb": "zıt anlamlı fiil", "turkish": "Türkçe karşılığı"}
  ],
  "note": "genel kullanım notu Türkçe, max 2 cümle veya null"
}
Eş anlamlı max 4 tane, zıt anlamlı max 2 tane. Gerçekten yakın anlamlı olmayanları ekleme.`,
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic ${response.status}`);
  }
  const data = await response.json();
  const text = data?.content?.[0]?.text;
  const parsed = extractJsonObject(text);
  const payload = sanitizePayload(parsed);
  synonymCache[normalized] = payload;
  return payload;
}
