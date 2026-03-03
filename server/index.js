import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8787;
const API_KEY = process.env.GEMINI_API_KEY;

const ALLOWED_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-1.0-pro'
]);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/generate', async (req, res) => {
  if (!API_KEY) {
    return res.status(500).json({ error: { message: 'GEMINI_API_KEY is not set on the server.' } });
  }

  const { model, contents } = req.body || {};
  if (!model || !ALLOWED_MODELS.has(model)) {
    return res.status(400).json({ error: { message: 'Invalid or unsupported model.' } });
  }
  if (!contents) {
    return res.status(400).json({ error: { message: 'Missing contents.' } });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    const data = await resp.json();
    res.status(resp.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err?.message || 'Proxy request failed.' } });
  }
});

app.listen(PORT, () => {
  console.log(`Soniya proxy running on http://localhost:${PORT}`);
});
