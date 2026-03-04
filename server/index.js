import cors from 'cors';
import express from 'express';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8787;
const REQUEST_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS || 15000);
const PRIMARY_PROVIDER = String(process.env.PRIMARY_PROVIDER || 'groq').toLowerCase();

const GROQ_API_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_2
].filter(Boolean);
const GROQ_BASE_URL = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
const GROQ_MODELS = [...new Set([
  process.env.GROQ_MODEL,
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile'
].filter(Boolean))];

const OPENROUTER_API_KEYS = [
  process.env.OPENROUTER_API_KEY,
  process.env.OPENROUTER_API_KEY_2
].filter(Boolean);
const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
const OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME || 'SoniyaAgentProxy';
const OPENROUTER_HTTP_REFERER = process.env.OPENROUTER_HTTP_REFERER;
const OPENROUTER_MODELS = [...new Set([
  process.env.OPENROUTER_MODEL,
  'qwen/qwen3.5-flash-02-23',
  'google/gemini-3-flash-preview'
].filter(Boolean))];

const orderProviders = (providers = []) => {
  if (!providers.length) return providers;
  if (!['groq', 'openrouter'].includes(PRIMARY_PROVIDER)) return providers;

  const priority = PRIMARY_PROVIDER === 'groq'
    ? { Groq: 0, OpenRouter: 1 }
    : { OpenRouter: 0, Groq: 1 };

  return [...providers].sort((a, b) => (priority[a.name] ?? 9) - (priority[b.name] ?? 9));
};

const getProviderChain = () => {
  const providers = [];
  if (GROQ_API_KEYS.length) {
    providers.push({
      name: 'Groq',
      keys: GROQ_API_KEYS,
      baseUrl: GROQ_BASE_URL,
      models: GROQ_MODELS
    });
  }
  if (OPENROUTER_API_KEYS.length) {
    providers.push({
      name: 'OpenRouter',
      keys: OPENROUTER_API_KEYS,
      baseUrl: OPENROUTER_BASE_URL,
      models: OPENROUTER_MODELS
    });
  }
  return orderProviders(providers);
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

const sanitizeModelReply = (fullText) => {
  const moodMatch = fullText.match(/\[(.*?)\]/);
  const mood = moodMatch ? moodMatch[1].toUpperCase() : 'HAPPY';
  const text = fullText
    .replace(/\[.*?\]/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^(\s*(urdu script|roman urdu|roman|punjabi|english)\s*:)/gim, '')
    .trim();
  return { text, mood };
};

const requestWithTimeout = async (url, options, timeoutMs) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

app.get('/health', (_req, res) => {
  const providers = getProviderChain();
  res.json({
    ok: true,
    primaryProvider: PRIMARY_PROVIDER,
    providers: providers.map((p) => p.name),
    hasKeys: providers.length > 0
  });
});

app.post('/chat/completions', async (req, res) => {
  const providers = getProviderChain();
  if (!providers.length) {
    return res.status(500).json({ error: { message: 'No server-side provider keys configured.' } });
  }

  const { messages, temperature = 0.55, max_tokens = 64 } = req.body || {};
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: { message: 'Invalid messages payload.' } });
  }

  let lastStatus = 500;
  let lastMessage = 'No response from providers.';

  for (const provider of providers) {
    for (const key of provider.keys) {
      for (const model of provider.models) {
        const headers = {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        };
        const body = {
          model,
          messages,
          temperature,
          max_tokens
        };

        if (provider.name === 'OpenRouter') {
          headers['X-Title'] = OPENROUTER_APP_NAME;
          if (OPENROUTER_HTTP_REFERER) headers['HTTP-Referer'] = OPENROUTER_HTTP_REFERER;
          body.include_reasoning = false;
          body.top_p = 0.9;
        }

        try {
          const response = await requestWithTimeout(
            `${provider.baseUrl}/chat/completions`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify(body)
            },
            REQUEST_TIMEOUT_MS
          );
          const payload = await response.json();
          const fullText = extractAssistantText(payload?.choices?.[0]?.message?.content);

          if (response.ok && fullText) {
            const result = sanitizeModelReply(fullText);
            return res.json({
              text: result.text,
              mood: result.mood,
              provider: provider.name,
              model
            });
          }

          lastStatus = response.status;
          lastMessage = payload?.error?.message || `HTTP ${response.status}`;

          if (response.status === 404) continue;
          if (response.status === 401 || response.status === 403 || response.status === 402 || response.status === 429) {
            break;
          }
        } catch (error) {
          if (error?.name === 'AbortError') {
            lastStatus = 504;
            lastMessage = `${provider.name} ${model} timed out`;
            continue;
          }
          lastStatus = 503;
          lastMessage = error?.message || 'Network request failed';
        }
      }
    }
  }

  return res.status(lastStatus).json({ error: { message: lastMessage } });
});

app.listen(PORT, () => {
  console.log(`Soniya secure proxy running on http://localhost:${PORT}`);
});
