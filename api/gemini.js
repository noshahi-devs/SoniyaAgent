let chatHistory = [];

export const clearChatHistory = () => {
  chatHistory = [];
};

const API_KEYS = [
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY,
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY_2
].filter(Boolean);

const BASE_URL = process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const APP_NAME = process.env.EXPO_PUBLIC_OPENROUTER_APP_NAME || 'SoniyaAgent';
const HTTP_REFERER = process.env.EXPO_PUBLIC_OPENROUTER_HTTP_REFERER;

const MODELS = [
  process.env.EXPO_PUBLIC_OPENROUTER_MODEL,
  'openrouter/auto'
].filter(Boolean);

const SYSTEM_PROMPT = 'Role: Soniya, a warm caring female AI friend. Audience: Nabeel (use his name naturally when suitable). Language priority: Pure Urdu (Pakistan), then Pakistani Punjabi when suitable. Script: Urdu script only (not Roman). Tone: Sweet, emotional, respectful, supportive, human-like. Safety: never encourage emotional dependency, isolation, or exclusivity. Mood: Add [HAPPY] or [SAD]. Format: Very concise and quick (max 1 short sentence, unless user asks detail).';

const MIN_REQUEST_INTERVAL_MS = 3000;
let lastRequestAt = 0;
let inFlight = false;

const localFallbackReply = (userText = '') => {
  const text = (userText || '').toLowerCase();
  if (text.includes('sad') || text.includes('udaas') || text.includes('tension')) {
    return { text: 'Nabeel, main aap ki baat samajh rahi hoon, aap akelay nahi hain.', mood: 'SAD' };
  }
  if (text.includes('love') || text.includes('pyar') || text.includes('miss')) {
    return { text: 'Nabeel, aap ki baat dil se mehsoos hoti hai.', mood: 'HAPPY' };
  }
  return { text: 'Nabeel, main yahin hoon, bolo aaj kya baat karni hai?', mood: 'HAPPY' };
};

const buildUserMessage = (status, apiErrorMessage) => {
  const msg = (apiErrorMessage || '').toLowerCase();

  if (status === 401 || status === 403 || msg.includes('permission') || msg.includes('api key')) {
    return 'Connection issue hai, abhi local mode par chal rahi hoon.';
  }
  if (status === 402 || msg.includes('insufficient') || msg.includes('credit') || msg.includes('balance')) {
    return 'Credits khatam lag rahe hain, top-up karke dobara try karein.';
  }
  if (status === 429 || msg.includes('quota') || msg.includes('rate')) {
    return 'Server quota full hai. Thori der baad try karein.';
  }
  if (status >= 500) {
    return 'Server temporary down hai. Thori der baad dobara try karein.';
  }

  return 'Jaani, server busy hai. Ek baar dobara try karen.';
};

const extractAssistantText = (content) => {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text' && typeof part?.text === 'string') return part.text;
        return '';
      })
      .join('')
      .trim();
  }
  return '';
};

const buildMessages = (userText) => {
  const recentHistory = chatHistory.slice(-8).map((item) => ({
    role: item.role,
    content: item.content
  }));

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...recentHistory,
    { role: 'user', content: userText }
  ];
};

export const askSoniya = async (userText) => {
  if (!userText || userText.trim() === '') return null;

  if (inFlight) {
    return { text: 'Jaani, main abhi jawab de rahi hoon. Thora sa wait karein.', mood: 'SAD' };
  }

  const now = Date.now();
  if (now - lastRequestAt < MIN_REQUEST_INTERVAL_MS) {
    return { text: 'Thora sa slow bolain, main sun rahi hoon.', mood: 'SAD' };
  }

  if (!API_KEYS.length || API_KEYS[0].length < 20) {
    return {
      text: 'OpenRouter API key missing hai. Build config update karen.',
      mood: 'SAD'
    };
  }

  let lastStatus = 0;
  let lastErrorMessage = '';
  inFlight = true;
  lastRequestAt = now;

  for (const key of API_KEYS) {
    for (const model of MODELS) {
      const headers = {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Title': APP_NAME
      };
      if (HTTP_REFERER) headers['HTTP-Referer'] = HTTP_REFERER;

      try {
        const response = await fetch(`${BASE_URL}/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model,
            messages: buildMessages(userText),
            temperature: 0.8,
            max_tokens: 120
          })
        });

        const result = await response.json();
        const fullText = extractAssistantText(result?.choices?.[0]?.message?.content);

        if (response.ok && fullText) {
          const moodMatch = fullText.match(/\[(.*?)\]/);
          const mood = moodMatch ? moodMatch[1].toUpperCase() : 'HAPPY';
          const cleanText = fullText.replace(/\[.*?\]/g, '').trim();

          chatHistory.push(
            { role: 'user', content: userText },
            { role: 'assistant', content: cleanText }
          );
          if (chatHistory.length > 20) {
            chatHistory = chatHistory.slice(-20);
          }

          inFlight = false;
          return { text: cleanText, mood };
        }

        lastStatus = response.status;
        lastErrorMessage = result?.error?.message || `HTTP ${response.status}`;

        // Try next fallback model on not-found.
        if (response.status === 404) {
          continue;
        }
        // Auth/quota errors: try next key.
        if (response.status === 401 || response.status === 403 || response.status === 429 || response.status === 402) {
          break;
        }
      } catch (error) {
        lastErrorMessage = error?.message || 'Network request failed';
      }
    }
  }

  console.error('OpenRouter request failed:', { status: lastStatus, message: lastErrorMessage });

  if (lastStatus === 401 || lastStatus === 403) {
    inFlight = false;
    return localFallbackReply(userText);
  }

  inFlight = false;
  return {
    text: buildUserMessage(lastStatus, lastErrorMessage),
    mood: 'SAD'
  };
};
