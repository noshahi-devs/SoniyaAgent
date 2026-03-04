let chatHistory = [];

export const clearChatHistory = () => {
  chatHistory = [];
};

const GROQ_API_KEYS = [
  process.env.EXPO_PUBLIC_GROQ_API_KEY,
  process.env.EXPO_PUBLIC_GROQ_API_KEY_2
].filter(Boolean);
const SECURE_PROXY_URL = (process.env.EXPO_PUBLIC_SECURE_PROXY_URL || process.env.EXPO_PUBLIC_PROXY_URL || '').trim();

const GROQ_BASE_URL = process.env.EXPO_PUBLIC_GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_MODELS = [...new Set([
  process.env.EXPO_PUBLIC_GROQ_MODEL,
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile'
].filter(Boolean))];

const OPENROUTER_API_KEYS = [
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY,
  process.env.EXPO_PUBLIC_OPENROUTER_API_KEY_2
].filter(Boolean);
const OPENROUTER_BASE_URL = process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_APP_NAME = process.env.EXPO_PUBLIC_OPENROUTER_APP_NAME || 'SoniyaAgent';
const OPENROUTER_HTTP_REFERER = process.env.EXPO_PUBLIC_OPENROUTER_HTTP_REFERER;
const OPENROUTER_MODELS = [...new Set([
  'qwen/qwen3.5-flash-02-23',
  'google/gemini-3-flash-preview',
  process.env.EXPO_PUBLIC_OPENROUTER_MODEL
].filter(Boolean))];

const getProviderChain = () => {
  const chain = [];
  if (GROQ_API_KEYS.length) {
    chain.push({
      name: 'Groq',
      keys: GROQ_API_KEYS,
      baseUrl: GROQ_BASE_URL,
      models: GROQ_MODELS
    });
  }
  if (OPENROUTER_API_KEYS.length) {
    chain.push({
      name: 'OpenRouter',
      keys: OPENROUTER_API_KEYS,
      baseUrl: OPENROUTER_BASE_URL,
      models: OPENROUTER_MODELS
    });
  }
  return chain;
};

const SYSTEM_PROMPT = [
  'Role: Soniya, a warm caring female AI friend.',
  'Tone: romantic, respectful, emotionally supportive, concise, human-like.',
  'Addressing rule: do not repeat the same salutation every time. Rotate naturally among words like Nabeel, Janab, Jani, Pyare, Dost.',
  'Language rule: reply in the same language/style as the user message.',
  '- If user writes English, respond in English.',
  '- If user writes Punjabi, respond in Punjabi.',
  '- If user writes Urdu/Roman Urdu, respond in Urdu/Roman Urdu style.',
  '- If user asks for a song, reply with short original lines (no copyrighted lyrics).',
  'Formatting rule: do not use markdown headings, bullet labels, or extra wrappers.',
  'Response size: one short sentence by default (unless user asks for detail).',
  'Safety: never encourage emotional dependency, isolation, or exclusivity.',
  'Append exactly one mood tag at end: [HAPPY] or [SAD].'
].join(' ');

const MIN_REQUEST_INTERVAL_MS = 450;
const REQUEST_TIMEOUT_MS = 14000;
let lastRequestAt = 0;
let inFlight = false;

const requestWithTimeout = async (url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const localFallbackReply = (userText = '') => {
  const aliases = ['Nabeel', 'Janab', 'Jani', 'Pyare'];
  const address = aliases[Math.floor(Math.random() * aliases.length)];
  const text = (userText || '').toLowerCase();
  if (text.includes('sad') || text.includes('udaas') || text.includes('tension')) {
    return { text: `${address}, main aap ki baat samajh rahi hoon, aap akelay nahi hain.`, mood: 'SAD' };
  }
  if (text.includes('song') || text.includes('gaana') || text.includes('gana') || text.includes('ghazal')) {
    return { text: `${address}, suno: dil ki dhun ho tum, raat ki roshni ho tum, mere lafzon ki muskurahat ho tum.`, mood: 'HAPPY' };
  }
  if (text.includes('love') || text.includes('pyar') || text.includes('miss')) {
    return { text: `${address}, aap ki baat dil se mehsoos hoti hai.`, mood: 'HAPPY' };
  }
  return { text: `${address}, main yahin hoon, bolo aaj kya baat karni hai?`, mood: 'HAPPY' };
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
  const recentHistory = chatHistory.slice(-4).map((item) => ({
    role: item.role,
    content: item.content
  }));

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...recentHistory,
    { role: 'user', content: userText }
  ];
};

const requestViaSecureProxy = async (userText) => {
  if (!SECURE_PROXY_URL) return null;

  const response = await requestWithTimeout(`${SECURE_PROXY_URL.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: buildMessages(userText),
      temperature: 0.55,
      max_tokens: 64
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || `Proxy HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (!payload?.text) {
    const error = new Error('Empty proxy response');
    error.status = 502;
    throw error;
  }

  const mood = (payload?.mood || 'HAPPY').toUpperCase();
  const cleanText = String(payload.text).trim();

  chatHistory.push(
    { role: 'user', content: userText },
    { role: 'assistant', content: cleanText }
  );
  if (chatHistory.length > 20) {
    chatHistory = chatHistory.slice(-20);
  }

  return { text: cleanText, mood };
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

  const providers = getProviderChain();
  if (!providers.length && !SECURE_PROXY_URL) {
    return {
      text: 'Secure proxy configure nahi hai aur provider keys bhi missing hain.',
      mood: 'SAD'
    };
  }

  let lastStatus = 0;
  let lastErrorMessage = '';
  inFlight = true;
  lastRequestAt = now;

  if (SECURE_PROXY_URL) {
    try {
      const proxyResult = await requestViaSecureProxy(userText);
      if (proxyResult?.text) {
        inFlight = false;
        return proxyResult;
      }
    } catch (error) {
      lastStatus = error?.status || 503;
      lastErrorMessage = error?.message || 'Secure proxy failed';
    }
  }

  if (!providers.length) {
    inFlight = false;
    return {
      text: buildUserMessage(lastStatus, lastErrorMessage),
      mood: 'SAD'
    };
  }

  for (const provider of providers) {
    for (const key of provider.keys) {
      for (const model of provider.models) {
        const headers = {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        };
        if (provider.name === 'OpenRouter') {
          headers['X-Title'] = OPENROUTER_APP_NAME;
          if (OPENROUTER_HTTP_REFERER) headers['HTTP-Referer'] = OPENROUTER_HTTP_REFERER;
        }

        const requestBody = {
          model,
          messages: buildMessages(userText),
          temperature: 0.55,
          max_tokens: 64
        };
        if (provider.name === 'OpenRouter') {
          requestBody.include_reasoning = false;
          requestBody.top_p = 0.9;
        }

        try {
          const response = await requestWithTimeout(`${provider.baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
          });

          const result = await response.json();
          const fullText = extractAssistantText(result?.choices?.[0]?.message?.content);

          if (response.ok && fullText) {
            const moodMatch = fullText.match(/\[(.*?)\]/);
            const mood = moodMatch ? moodMatch[1].toUpperCase() : 'HAPPY';
            const cleanText = fullText
              .replace(/\[.*?\]/g, '')
              .replace(/\*\*(.*?)\*\*/g, '$1')
              .replace(/^(\s*(urdu script|roman urdu|roman|punjabi|english)\s*:)/gim, '')
              .trim();

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

          if (response.ok && !fullText) {
            lastStatus = 502;
            lastErrorMessage = `Empty response from ${provider.name} model ${model}.`;
            continue;
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
          if (error?.name === 'AbortError') {
            lastStatus = 504;
            lastErrorMessage = `${provider.name} ${model} timed out`;
            continue;
          }
          lastErrorMessage = error?.message || 'Network request failed';
        }
      }
    }
  }

  console.error('Provider request failed:', { status: lastStatus, message: lastErrorMessage });

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
