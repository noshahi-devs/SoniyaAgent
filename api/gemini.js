let chatHistory = [];

export const clearChatHistory = () => {
  chatHistory = [];
};

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "AIzaSyCm1ppzHcB3B_ANF1aycVBSDukpwyMYIsE";

const MODEL_CONFIGS = [
  { ver: 'v1beta', model: 'gemini-2.0-flash' },
  { ver: 'v1beta', model: 'gemini-1.5-flash' },
  { ver: 'v1', model: 'gemini-1.5-flash' }
];

const buildUserMessage = (status, apiErrorMessage) => {
  const msg = (apiErrorMessage || '').toLowerCase();

  if (status === 403 || msg.includes('permission') || msg.includes('api key')) {
    return 'Server auth issue: API key invalid ya restricted hai. Key settings check karein.';
  }

  if (status === 429 || msg.includes('quota') || msg.includes('rate')) {
    return 'Server quota full hai. Thori der baad try karein.';
  }

  if (status >= 500) {
    return 'Server temporary down hai. Thori der baad dobara try karein.';
  }

  return 'Jaani, server busy hai. Ek baar dobara try karen.';
};

export const askSoniya = async (userText) => {
  if (!userText || userText.trim() === "") return null;

  if (!API_KEY || API_KEY.length < 20) {
    return {
      text: 'API key missing hai. Build config update karen.',
      mood: 'SAD'
    };
  }

  let lastErrorMessage = '';
  let lastStatus = 0;

  for (const config of MODEL_CONFIGS) {
    const url = `https://generativelanguage.googleapis.com/${config.ver}/models/${config.model}:generateContent?key=${API_KEY}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Role: Soniya, a warm caring female AI friend. Audience: Nabeel (use his name naturally when suitable). Language priority: Pure Urdu (Pakistan), then Pakistani Punjabi when suitable. Script: Urdu script only (not Roman). Tone: Sweet, emotional, respectful, supportive, human-like. Safety: never encourage emotional dependency, isolation, or exclusivity. Mood: Add [HAPPY] or [SAD]. Format: Very concise and quick (max 1 short sentence, unless user asks detail). User: ${userText}`
            }]
          }]
        }),
      });

      const result = await response.json();

      if (response.ok && result?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const fullText = result.candidates[0].content.parts[0].text;
        const moodMatch = fullText.match(/\[(.*?)\]/);
        const mood = moodMatch ? moodMatch[1].toUpperCase() : 'HAPPY';
        const cleanText = fullText.replace(/\[.*?\]/g, '').trim();
        return { text: cleanText, mood };
      }

      lastStatus = response.status;
      lastErrorMessage = result?.error?.message || `HTTP ${response.status}`;

      // 404 means model unavailable; keep trying fallbacks.
      if (response.status === 404) {
        continue;
      }

      // Auth and quota errors should stop retries immediately.
      if (response.status === 401 || response.status === 403 || response.status === 429) {
        break;
      }
    } catch (e) {
      lastErrorMessage = e?.message || 'Network request failed';
    }
  }

  console.error('Gemini request failed:', { status: lastStatus, message: lastErrorMessage });

  return {
    text: buildUserMessage(lastStatus, lastErrorMessage),
    mood: 'SAD'
  };
};
