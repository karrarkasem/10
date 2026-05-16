// ╔══════════════════════════════════════════════════════╗
// ║  Afra AI — Cloudflare Worker                        ║
// ║  1. Gemini Proxy (POST /)                           ║
// ║  2. WhatsApp OG Preview (GET /job/:id)              ║
// ║  3. AI Job Parser (POST /parse-job)                 ║
// ╚══════════════════════════════════════════════════════╝

const GEMINI_MODEL   = 'gemini-2.0-flash';
const MAX_PROMPT_LEN = 8000;
const FIREBASE_KEY   = 'AIzaSyBKlAEuk3QQJBqWqR1zmBdHGwasIW86Y-I';
const PROJECT_ID     = 'karbala-b4884';
const SITE_URL       = 'https://afra-iq.com';
const OG_IMAGE       = 'https://afra-iq.com/icons/og-image.svg';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age':       '86400',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── CORS preflight ──
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // ── GET /job/:id → WhatsApp OG HTML ──
    if (request.method === 'GET' && url.pathname.startsWith('/job/')) {
      const jobId = url.pathname.replace('/job/', '').split('?')[0].trim();
      if (jobId) return handleJobOG(jobId);
    }

    // ── POST /parse-job → AI Job Parser ──
    if (request.method === 'POST' && url.pathname === '/parse-job') {
      return handleParseJob(request, env);
    }

    // ── POST / → Gemini Proxy ──
    if (request.method === 'POST') {
      return handleGemini(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },
};

// ═══════════════════════════════════════════════
// WhatsApp OG: جلب بيانات الوظيفة + إرجاع HTML
// ═══════════════════════════════════════════════
async function handleJobOG(jobId) {
  const TYPE_MAP  = { full: 'دوام كامل', part: 'دوام جزئي', remote: 'عن بُعد', gig: 'مهمة' };
  const targetURL = `${SITE_URL}/#job/${jobId}`;

  let title = 'فرصة عمل — عفراء للتوظيف';
  let desc  = 'اكتشف فرصتك المهنية وقدّم طلبك الآن عبر منصة عفراء للتوظيف';

  try {
    const fsURL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/jobs/${jobId}?key=${FIREBASE_KEY}`;
    const res   = await fetch(fsURL, { cf: { cacheTtl: 300 } });

    if (res.ok) {
      const data   = await res.json();
      const f      = data.fields || {};
      const jTitle = f.title?.stringValue    || '';
      const co     = f.company?.stringValue  || '';
      const prov   = f.province?.stringValue || '';
      const sal    = f.salary?.integerValue  || f.salary?.doubleValue || 0;
      const cur    = f.currency?.stringValue || 'IQD';
      const type   = TYPE_MAP[f.type?.stringValue] || '';
      const salTxt = sal ? `${Number(sal).toLocaleString('ar-IQ')} ${cur}` : 'قابل للتفاوض';

      if (jTitle) {
        title = `${jTitle}${co ? ' — ' + co : ''}`;
        const parts = [prov, type, salTxt].filter(Boolean);
        desc = parts.join(' | ') + ' — قدّم الآن عبر عفراء للتوظيف ✨';
      }
    }
  } catch (_) {
    // تجاهل أخطاء الجلب — نستخدم البيانات الافتراضية
  }

  const h = esc; // alias
  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${h(title)}</title>

<!-- Open Graph (WhatsApp / Facebook) -->
<meta property="og:type"        content="article">
<meta property="og:title"       content="${h(title)}">
<meta property="og:description" content="${h(desc)}">
<meta property="og:image"       content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height"content="630">
<meta property="og:url"         content="${targetURL}">
<meta property="og:site_name"   content="عفراء للتوظيف">
<meta property="og:locale"      content="ar_IQ">

<!-- Twitter Card -->
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="${h(title)}">
<meta name="twitter:description" content="${h(desc)}">
<meta name="twitter:image"       content="${OG_IMAGE}">

<!-- Redirect -->
<meta http-equiv="refresh" content="0;url=${targetURL}">
</head>
<body style="font-family:sans-serif;direction:rtl;text-align:center;padding:40px;background:#0f172a;color:#fff">
<p style="font-size:18px">جارٍ الانتقال إلى الوظيفة...</p>
<a href="${targetURL}" style="color:#0d9488">انقر هنا إذا لم يتم التحويل تلقائياً</a>
<script>window.location.replace(${JSON.stringify(targetURL)});</script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type':  'text/html;charset=UTF-8',
      'Cache-Control': 'public, max-age=300, s-maxage=300',
      ...CORS,
    },
  });
}

// ═══════════════════════════════════════════════
// AI Job Parser — يحلّل نص إعلان وظيفة ويرجع JSON
// ═══════════════════════════════════════════════
async function handleParseJob(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const { text } = body;
  if (!text || typeof text !== 'string' || !text.trim())
    return json({ error: 'text is required' }, 400);
  if (text.length > 6000)
    return json({ error: 'text too long' }, 400);
  if (!env.GEMINI_KEY)
    return json({ error: 'AI not configured' }, 503);

  const prompt = `أنت مساعد ذكي متخصص في تحليل إعلانات الوظائف العراقية. استخرج المعلومات من النص التالي وأرجع JSON فقط بدون أي نص إضافي.

النص:
"""
${text}
"""

أرجع JSON بهذا الشكل بالضبط (لا تضف أي تعليق أو markdown):
{
  "title": "المسمى الوظيفي",
  "company": "اسم الشركة أو الجهة",
  "province": "اسم المحافظة العراقية (بغداد/كربلاء/النجف/البصرة/نينوى/أربيل/كركوك/بابل/ذي قار/ميسان/القادسية/واسط/المثنى/الأنبار/صلاح الدين/ديالى/دهوك/السليمانية) أو فارغ",
  "type": "full أو part أو remote أو gig",
  "cat": "tech أو business أو medical أو education أو engineering أو trade أو legal أو media أو admin أو other",
  "salary": رقم أو null,
  "salaryMax": رقم أو null,
  "currency": "IQD أو USD",
  "exp": "none أو 1-2 أو 3-5 أو 5+",
  "gender": "any أو male أو female",
  "desc": "وصف الوظيفة كامل",
  "reqs": ["متطلب1", "متطلب2"],
  "bens": ["ميزة1", "ميزة2"],
  "phone": "رقم الهاتف أو فارغ",
  "telegram": "معرف تلغرام بدون @ أو فارغ"
}`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.1 },
        }),
      }
    );

    if (!res.ok) return json({ error: 'AI service error' }, res.status);

    const data    = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch { return json({ error: 'AI parse failed', raw: rawText }, 422); }

    return json({ job: parsed });
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
}

// ═══════════════════════════════════════════════
// Gemini Proxy
// ═══════════════════════════════════════════════
async function handleGemini(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const { prompt } = body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim())
    return json({ error: 'prompt is required' }, 400);
  if (prompt.length > MAX_PROMPT_LEN)
    return json({ error: 'prompt too long' }, 400);
  if (!env.GEMINI_KEY)
    return json({ error: 'AI not configured' }, 503);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${env.GEMINI_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
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
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
