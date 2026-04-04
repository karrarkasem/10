// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس — Firebase Cloud Functions                 ║
// ║  Gemini AI Proxy — المفتاح محمي على السيرفر        ║
// ╚══════════════════════════════════════════════════════╝

const { onRequest } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');

// المفتاح محفوظ في .env (غير مرفوع على GitHub)
const GEMINI_KEY = defineString('GEMINI_KEY');
const GEMINI_MODEL = 'gemini-2.0-flash';

exports.gemini = onRequest(
  {
    cors: true,          // السماح للمتصفح بالاتصال
    maxInstances: 10,    // حد أقصى للحماية من الاستهلاك الزائد
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // السماح فقط بـ POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.length > 8000) {
      res.status(400).json({ error: 'Invalid prompt' });
      return;
    }

    try {
      const apiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY.value()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
          }),
        }
      );

      if (!apiRes.ok) {
        const err = await apiRes.text();
        console.error('Gemini API error:', err);
        res.status(apiRes.status).json({ error: 'AI service error' });
        return;
      }

      const data = await apiRes.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      res.json({ text });

    } catch (e) {
      console.error('Function error:', e);
      res.status(500).json({ error: 'Internal error' });
    }
  }
);
