// ╔══════════════════════════════════════════════════════╗
// ║  Fanoos AI — Cloudflare Worker                      ║
// ║  Gemini Proxy — المفتاح محمي كـ Secret              ║
// ║  مجاني 100% — 100,000 طلب/يوم                      ║
// ╚══════════════════════════════════════════════════════╝
//
// طريقة النشر:
// 1. اذهب إلى: https://workers.cloudflare.com
// 2. سجّل حساب مجاني (بدون بطاقة)
// 3. اضغط "Create Application" → "Create Worker"
// 4. احذف الكود الافتراضي والصق هذا الملف
// 5. اضغط "Deploy"
// 6. اذهب إلى Settings → Variables → Add Variable
//    Name: GEMINI_KEY   |   Value: مفتاحك الحقيقي
//    اضغط "Encrypt" ثم "Save"
// 7. انسخ رابط الـ Worker (مثل: https://fanoos-ai.xxx.workers.dev)
// 8. ضعه في index.html:
//    <script>window.AI_FUNCTION_URL = 'الرابط_هنا';</script>

const ALLOWED_ORIGINS = ['*']; // يمكن تقييده بدومينك فقط لاحقاً
const GEMINI_MODEL    = 'gemini-2.0-flash';
const MAX_PROMPT_LEN  = 8000;

export default {
  async fetch(request, env) {

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // التحقق من المدخلات
    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    const { prompt } = body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return json({ error: 'prompt is required' }, 400);
    }
    if (prompt.length > MAX_PROMPT_LEN) {
      return json({ error: 'prompt too long' }, 400);
    }

    // التحقق من وجود المفتاح
    if (!env.GEMINI_KEY) {
      return json({ error: 'AI not configured' }, 503);
    }

    // استدعاء Gemini
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
          }),
        }
      );

      if (!res.ok) {
        const err = await res.text();
        console.error('Gemini error:', err);
        return json({ error: 'AI service error' }, res.status);
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      return json({ text });

    } catch (e) {
      console.error('Worker error:', e);
      return json({ error: 'Internal error' }, 500);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
