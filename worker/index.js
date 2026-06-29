// ╔══════════════════════════════════════════════════════╗
// ║  Afra AI — Cloudflare Worker                         ║
// ║  1. Gemini Proxy (POST /)                            ║
// ║  2. WhatsApp OG Preview (GET /job/:id)               ║
// ║  3. AI Job Parser (POST /parse-job)                  ║
// ║  4. Telegram Bot Webhook (POST /telegram)            ║
// ║  5. Social Media Publish (POST /social-publish)      ║
// ║  6. Cron: process scheduled social posts             ║
// ║  7. Cron: discover jobs (Google CSE + RSS)           ║
// ║  8. GET /discoveries → pending discovered jobs       ║
// ║  9. POST /discoveries/:id/approve|reject             ║
// ╚══════════════════════════════════════════════════════╝

import { initWasm, Resvg } from '@resvg/resvg-wasm';
import resvgWasm from './resvg.wasm';

const GEMINI_MODEL        = 'gemini-2.5-flash';
const GEMINI_MODEL_BACKUP = 'gemini-1.5-flash';
const MAX_PROMPT_LEN      = 8000;

// ── استدعاء Gemini مع retry تلقائي عند 503 ──
// ── استدعاء Gemini مع retry — يعود للـ Cloudflare AI عند 429 ──
async function callGeminiWithRetry(prompt, geminiKey, maxTokens = 3000, retries = 2, _env = null) {
  // ① جرّب Gemini إذا عنده مفتاح
  if (geminiKey) {
    const models = [GEMINI_MODEL, GEMINI_MODEL_BACKUP];
    for (const model of models) {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: maxTokens, temperature: 0.1 },
              }),
            }
          );
          if (res.status === 503) {
            if (attempt < retries) await new Promise(r => setTimeout(r, attempt * 1500));
            continue;
          }
          // 429 = نفد الرصيد → لا فائدة من إعادة المحاولة، انتقل لـ Cloudflare AI
          if (res.status === 429) { console.warn(`[ai] Gemini 429 quota — falling back to Cloudflare AI`); break; }
          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            // خطأ غير مؤقت → جرّب الموديل الاحتياطي
            console.warn(`[ai] Gemini ${res.status} (${model}): ${errBody.substring(0, 120)}`);
            break;
          }
          const data    = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (rawText) return { ok: true, rawText, model };
        } catch (e) {
          if (attempt < retries) await new Promise(r => setTimeout(r, attempt * 1000));
        }
      }
    }
  }

  // ② Fallback: Cloudflare Workers AI (مجاني تماماً، مدمج في الـ Worker)
  if (_env?.AI) {
    try {
      console.log('[ai] Using Cloudflare Workers AI as fallback');
      const cfRes = await _env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
        messages: [
          { role: 'system', content: 'أنت مساعد متخصص في تحليل إعلانات الوظائف وإرجاع JSON فقط.' },
          { role: 'user',   content: prompt },
        ],
        max_tokens: Math.min(maxTokens, 1500),
      });
      const rawText = cfRes?.response || '';
      if (rawText) return { ok: true, rawText, model: 'cf-llama-3.3-70b' };
    } catch (e) {
      console.error('[ai] Cloudflare AI error:', e.message);
    }
  }

  return { ok: false, status: 429, error: 'All AI providers failed — check GEMINI_KEY or Cloudflare AI binding' };
}

// ── Prompt الموحّد لتحليل إعلانات الوظائف ──
function buildJobParsePrompt(text, allowNotJob = false) {
  return `أنت محلل وظائف متخصص في سوق العمل العراقي. مهمتك استخراج كل التفاصيل من النص بدقة عالية.
${allowNotJob ? '\nإذا لم يكن النص إعلان وظيفة واضحاً أرجع {"notJob":true} فقط.' : ''}

═══ قواعد استخراج الراتب (الأكثر أهمية) ═══
• أرقام 100-999 بدون وحدة = آلاف دينار: "700" → 700000، "350" → 350000
• أرقام 1-99 في سياق راتب = آلاف: "50" → 50000
• "ألف" أو "k": "500 الف / 500k" → 500000
• "مليون": "مليون" → 1000000، "مليون ونص" → 1500000، "مليونين" → 2000000
• "مليون و500" → 1500000، "مليون ومائتين" → 1200000
• نطاق الراتب: "من 500 إلى 800 الف" → salary: 500000، salaryMax: 800000
• بالدولار ($ أو USD أو دولار): استخرج الرقم واجعل currency: "USD"
• "بالاتفاق / حسب الخبرة / تنافسي / يُحدد" → salary: null
• نسبة مبيعات أو عمل بالقطعة → salary: null + commission: "وصف النسبة"
• راتب + مزايا: استخرج الراتب الأساسي في salary والمزايا في bens

═══ قواعد استخراج المحافظة ═══
بغداد (المنصور/الكرادة/الكاظمية/الأعظمية/الجادرية/الدورة/الصدر/الشعب/الحرية/الزعفرانية/بغداد الجديدة/الكرخ/الرصافة)
كربلاء (كربلاء/الحسينية/الطف) | النجف (النجف/الكوفة/المشخاب)
البصرة (البصرة/العشار/أبو الخصيب/الزبير/الفاو) | نينوى (الموصل/نينوى/تلعفر)
أربيل (أربيل/هولير/اربيل) | السليمانية (السليمانية/سليمانية)
كركوك (كركوك) | دهوك (دهوك) | بابل (الحلة/بابل/المسيب)
ذي قار (الناصرية/ذي قار) | ميسان (العمارة/ميسان) | القادسية (الديوانية/القادسية)
واسط (الكوت/واسط) | المثنى (السماوة/المثنى) | الأنبار (الرمادي/الفلوجة/الأنبار)
صلاح الدين (تكريت/صلاح الدين) | ديالى (بعقوبة/ديالى)

═══ قواعد أخرى ═══
المسمى الوظيفي: لا تضف "مطلوب" أو "وظيفة" — "مطلوب محاسب" → "محاسب"
نوع الدوام: كامل/صباحي/يومي→"full" | جزئي/بارتايم→"part" | أونلاين/ريموت/من البيت→"remote" | مشروع/فريلانس→"gig"
التصنيف: tech(برمجة/IT/شبكات) | biz(محاسبة/تسويق/مبيعات/إدارة) | med(طب/صيدلة/تمريض) | edu(تدريس/أكاديمي) | eng(هندسة/كهرباء/مدني) | other
الخبرة: none(بدون/لا يشترط) | "1-2"(1-2 سنة) | "3-5"(3-5 سنوات) | "5+"(أكثر من 5)
الجنس: any | male(ذكر/رجل) | female(أنثى/سيدة/بنت)
الهاتف: ابحث عن أي رقم عراقي يبدأ بـ 07 واستخرجه
المزايا (bens): سكن، مواصلات، تأمين، بدل، حوافز، إجازة، عيد إلخ

النص:
"""
${text.substring(0, 4500)}
"""

أرجع JSON فقط — لا markdown ولا نص خارجه:
{
  ${allowNotJob ? '"notJob": false,' : ''}
  "title": "المسمى الوظيفي",
  "company": "اسم الشركة/الجهة أو فارغ",
  "province": "المحافظة من القائمة أعلاه أو فارغ",
  "type": "full|part|remote|gig",
  "cat": "tech|biz|med|edu|eng|other",
  "salary": رقم_بالدينار_أو_null,
  "salaryMax": رقم_الحد_الأعلى_أو_null,
  "currency": "IQD|USD",
  "commission": "وصف النسبة/القطعة أو null",
  "exp": "none|1-2|3-5|5+",
  "gender": "any|male|female",
  "desc": "وصف مفصّل للوظيفة والمهام (جملتان على الأقل)",
  "reqs": ["كل متطلب على حدة"],
  "bens": ["كل ميزة على حدة"],
  "skills": ["المهارات المطلوبة"],
  "phone": "رقم الهاتف أو فارغ",
  "telegram": "معرف تيليجرام بدون @ أو فارغ",
  "address": "العنوان التفصيلي أو فارغ",
  "score": رقم_من_1_إلى_10
}
معايير score: 8-10=كامل(عنوان+راتب+وصف+متطلبات) | 5-7=معقول(معظم الحقول) | 1-4=ناقص(فقط العنوان)`;
}
const FIREBASE_KEY   = 'AIzaSyBKlAEuk3QQJBqWqR1zmBdHGwasIW86Y-I';
const PROJECT_ID     = 'karbala-b4884';
const SITE_URL       = 'https://afra-iq.com';
const OG_IMAGE       = 'https://afra-iq.com/icons/og-image.svg';
const TG_FALLBACK_IMG = 'https://afra-iq.com/icons/icon-512.png';

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

    // ── GET /job-card/:id → Social Media Job Card HTML ──
    if (request.method === 'GET' && url.pathname.startsWith('/job-card/')) {
      const jobId = url.pathname.replace('/job-card/', '').split('?')[0].trim();
      if (jobId) return handleJobCard(jobId);
    }

    // ── POST /telegram → Telegram Bot Webhook ──
    if (request.method === 'POST' && url.pathname === '/telegram') {
      return handleTelegram(request, env);
    }

    // ── GET /setup-webhook → يضبط webhook URL عند البوت تلقائياً ──
    if (request.method === 'GET' && url.pathname === '/setup-webhook') {
      return handleSetupWebhook(request, env);
    }

    // ── GET /webhook-info → يعرض معلومات الـ webhook الحالي ──
    if (request.method === 'GET' && url.pathname === '/webhook-info') {
      if (!env.TELEGRAM_TOKEN) return json({ error: 'TELEGRAM_TOKEN not set' }, 400);
      const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/getWebhookInfo`);
      return new Response(await r.text(), { headers: { 'Content-Type': 'application/json', ...CORS } });
    }

    // ── POST /parse-job → AI Job Parser ──
    if (request.method === 'POST' && url.pathname === '/parse-job') {
      return handleParseJob(request, env);
    }

    // ── POST /social-publish → Social Media Publisher ──
    if (request.method === 'POST' && url.pathname === '/social-publish') {
      return handleSocialPublish(request, env);
    }

    // ── GET /discoveries → pending discovered jobs ──
    if (request.method === 'GET' && url.pathname === '/discoveries') {
      return handleGetDiscoveries(env);
    }

    // ── POST /discoveries/:id/approve → publish job ──
    if (request.method === 'POST' && url.pathname.startsWith('/discoveries/') && url.pathname.endsWith('/approve')) {
      return handleApproveDiscovery(url.pathname.split('/')[2]);
    }

    // ── POST /discoveries/:id/reject → delete discovery ──
    if (request.method === 'POST' && url.pathname.startsWith('/discoveries/') && url.pathname.endsWith('/reject')) {
      return handleRejectDiscovery(url.pathname.split('/')[2]);
    }

    // ── POST /discover-now → manual discovery trigger ──
    if (request.method === 'POST' && url.pathname === '/discover-now') {
      discoverJobs(env); // fire & forget
      return json({ started: true });
    }

    // ── GET /test-sources → اختبار مصادر الاستيراد ──
    if (request.method === 'GET' && url.pathname === '/test-sources') {
      return testDiscoverySources(env);
    }

    // ── POST / → Gemini Proxy ──
    if (request.method === 'POST') {
      return handleGemini(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(processScheduledPosts(env));
    // Run job discovery every hour (at minute 0 of every hour)
    const now = new Date(event.scheduledTime || Date.now());
    if (now.getUTCMinutes() === 0) ctx.waitUntil(discoverJobs(env));
  },
};

// ═══════════════════════════════════════════════
// Job Card HTML: صورة احترافية لوسائل التواصل
// ═══════════════════════════════════════════════
async function handleJobCard(jobId) {
  const TYPE_MAP = { full: 'دوام كامل', part: 'دوام جزئي', remote: 'عن بُعد', gig: 'مهمة حرة' };
  const EXP_MAP  = { none: 'بدون خبرة', no: 'بدون خبرة', '1-2': '1-2 سنة', '3-5': '3-5 سنوات', '5+': 'أكثر من 5 سنوات' };
  let job = { title: 'وظيفة شاغرة', company: '', city: '', type: '', salary: '', exp: '' };

  try {
    const fsURL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/jobs/${jobId}?key=${FIREBASE_KEY}`;
    const res = await fetch(fsURL, { cf: { cacheTtl: 60 } });
    if (res.ok) {
      const data = await res.json();
      const f = data.fields || {};
      const sal = Number(f.salary?.integerValue || f.salary?.doubleValue || 0);
      job = {
        title:   f.title?.stringValue   || 'وظيفة شاغرة',
        company: f.company?.stringValue || '',
        city:    f.province?.stringValue || f.city?.stringValue || '',
        type:    TYPE_MAP[f.type?.stringValue] || '',
        salary:  sal ? `${sal.toLocaleString()} ${f.currency?.stringValue || 'IQD'}` : 'قابل للتفاوض',
        exp:     EXP_MAP[f.exp?.stringValue] || '',
      };
    }
  } catch {}

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html { background:#0a1628; }
body { width:1200px; height:630px; overflow:hidden; background-color:#0a1628; font-family:Arial,sans-serif; direction:rtl; }
table { width:1200px; height:630px; border-collapse:collapse; }
</style>
</head>
<body>
<table>
<tr>
  <!-- شريط جانبي أخضر -->
  <td style="width:8px;background-color:#0d9488;"></td>
  <!-- المحتوى الرئيسي -->
  <td style="background-color:#0d1f3c;padding:50px 60px;vertical-align:top;">
    <div style="color:#0d9488;font-size:20px;font-weight:bold;margin-bottom:16px;">&#9733; عفراء للتوظيف &nbsp;|&nbsp; afra-iq.com</div>
    <div style="display:inline-block;background-color:#0d3b3b;color:#0d9488;border:1px solid #0d9488;border-radius:20px;padding:5px 18px;font-size:16px;margin-bottom:24px;">&#128276; وظيفة شاغرة</div>
    <div style="color:#ffffff;font-size:56px;font-weight:bold;line-height:1.15;margin-bottom:12px;max-height:135px;overflow:hidden;">${escapeHtml(job.title)}</div>
    <div style="color:#94a3b8;font-size:26px;margin-bottom:20px;">${escapeHtml(job.company)}</div>
    <div style="height:3px;width:100px;background-color:#0d9488;margin-bottom:24px;"></div>
    <table style="border-collapse:collapse;margin-bottom:16px;">
    <tr>
      ${job.city ? `<td style="background-color:#1e3a5f;color:#e2e8f0;font-size:20px;padding:8px 16px;border-radius:10px;margin-left:10px;">&#128205; ${escapeHtml(job.city)}</td><td style="width:12px;"></td>` : ''}
      ${job.type ? `<td style="background-color:#1e3a5f;color:#e2e8f0;font-size:20px;padding:8px 16px;border-radius:10px;">&#128188; ${escapeHtml(job.type)}</td>` : ''}
    </tr>
    </table>
    <div style="color:#0d9488;font-size:32px;font-weight:bold;">&#128176; ${escapeHtml(job.salary)}</div>
  </td>
</tr>
<tr>
  <td colspan="2" style="background-color:#0d2a4a;padding:14px 60px;">
    <table width="100%"><tr>
      <td style="color:#0d9488;font-size:20px;font-weight:bold;">&#127760; afra-iq.com</td>
      <td style="color:#64748b;font-size:16px;text-align:left;">منصة التوظيف الأولى في العراق</td>
    </tr></table>
  </td>
</tr>
</table>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


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

  const prompt = buildJobParsePrompt(text, false);

  const result = await callGeminiWithRetry(prompt, env.GEMINI_KEY, 3000, 2, env);
  if (!result.ok)
    return json({ error: `Gemini ${result.status}: ${result.error?.substring(0, 300)}` }, result.status || 502);

  const { rawText } = result;
  if (!rawText)
    return json({ error: 'Gemini empty response' }, 502);

  const stripped  = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const f = stripped.indexOf('{'), l = stripped.lastIndexOf('}');
  const jsonStr = (f !== -1 && l > f) ? stripped.slice(f, l + 1) : stripped;

  let parsed;
  try { parsed = JSON.parse(jsonStr); }
  catch { return json({ error: 'AI parse failed', raw: rawText.substring(0, 300) }, 422); }

  if (parsed.notJob || !parsed.title)
    return json({ error: 'not a job ad', notJob: true }, 422);

  return json({ job: parsed });
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
// Telegram Bot — استقبال منشورات القنوات
// ═══════════════════════════════════════════════
// ── ضبط webhook البوت تلقائياً ──
async function handleSetupWebhook(request, env) {
  if (!env.TELEGRAM_TOKEN) return json({ error: 'TELEGRAM_TOKEN not set in Cloudflare secrets' }, 400);
  const workerUrl = new URL(request.url).origin;
  const webhookUrl = `${workerUrl}/telegram`;
  const res  = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/setWebhook`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query', 'channel_post'] }),
    }
  );
  const data = await res.json();
  return json({ webhook_url: webhookUrl, telegram_response: data });
}

async function handleTelegram(request, env) {
  let update;
  try { update = await request.json(); }
  catch { return new Response('ok'); }

  const token     = env.TELEGRAM_TOKEN;
  const adminChat = env.TELEGRAM_ADMIN_CHAT;
  if (!token) return new Response('ok');

  // دعم الرسائل العادية والرسائل المُعاد توجيهها (نص أو صورة بكابشن)
  const msg = update.message || update.channel_post;
  if (msg) {
    // النص يكون في text (رسالة نصية) أو caption (صورة/فيديو مع نص)
    const text = (msg.text || msg.caption || '').trim();

    // تجاهل الرسائل من البوت نفسه
    if (msg.from?.is_bot && !msg.forward_from && !msg.forward_from_chat) {
      return new Response('ok');
    }

    if (text.length >= 30) {
      // استخدم adminChat من السيكرت أو من الرسالة نفسها (مرسلة من الأدمن)
      const chatId = adminChat || String(msg.chat?.id || '');
      if (chatId) await processTgJob(text, token, chatId, env);
    } else if (text.length > 0 && adminChat) {
      // نص قصير جداً
      await tgSend(token, adminChat, `⚠️ النص قصير جداً (${text.length} حرف).\nأرسل نص الإعلان كاملاً أو عدّل التوجيه.`);
    }
  }

  if (update.callback_query) {
    await handleTgCallback(update.callback_query, token, env);
  }

  return new Response('ok');
}

async function processTgJob(text, token, adminChat, env) {
  if (!env.GEMINI_KEY) {
    await tgSend(token, adminChat, '⚠️ GEMINI\\_KEY غير مُعيَّن في Cloudflare');
    return;
  }

  const prompt = buildJobParsePrompt(text, true);

  try {
    const result = await callGeminiWithRetry(prompt, env.GEMINI_KEY, 3000, 2, env);
    if (!result.ok) {
      await tgSend(token, adminChat, `❌ خطأ AI ${result.status}\n${String(result.error).substring(0, 200)}`);
      return;
    }

    const rawText = result.rawText;
    if (!rawText) {
      await tgSend(token, adminChat, `❌ Gemini رجع فارغ`);
      return;
    }

    const stripped2 = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const f2 = stripped2.indexOf('{'), l2 = stripped2.lastIndexOf('}');
    const jsonStr2 = (f2 !== -1 && l2 > f2) ? stripped2.slice(f2, l2 + 1) : stripped2;

    let job;
    try {
      job = JSON.parse(jsonStr2);
    } catch (pe) {
      await tgSend(token, adminChat, `❌ فشل تحليل JSON:\n${jsonStr2.substring(0, 200)}`);
      return;
    }

    if (job.notJob || !job.title) {
      await tgSend(token, adminChat, `ℹ️ الذكاء الاصطناعي: ليس إعلان وظيفة واضح\nحاول أرسل نص أوضح يحتوي مسمى وظيفي`);
      return;
    }

    const docId = await saveTgJob(job);

    const TYPE_AR2 = { full: 'دوام كامل', part: 'دوام جزئي', remote: 'عن بُعد', gig: 'مهمة' };
    const salTxt  = job.salary
      ? `${Number(job.salary).toLocaleString()} ${job.currency || 'IQD'}`
      : (job.commission ? job.commission : 'قابل للتفاوض');
    const preview = [
      `📋 *وظيفة جديدة من تلغرام*`,
      ``,
      `*${job.title}*`,
      job.company    ? `🏢 ${job.company}`            : '',
      job.province   ? `📍 ${job.province}`           : '',
      `💼 ${TYPE_AR2[job.type] || job.type}`,
      job.salary     ? `💰 ${salTxt}`                 : '',
      job.commission ? `📊 حافز: ${job.commission}`   : (!job.salary ? `💰 قابل للتفاوض` : ''),
      job.exp !== 'none' && job.exp ? `⏱ خبرة: ${EXP_AR[job.exp] || job.exp}` : '',
      job.phone      ? `📞 ${job.phone}`              : '',
      ``,
      job.desc ? job.desc.substring(0, 250) + (job.desc.length > 250 ? '...' : '') : '',
    ].filter(Boolean).join('\n');

    const keyboard = docId ? {
      inline_keyboard: [[
        { text: '✅ نشر الوظيفة', callback_data: `pub:${docId}` },
        { text: '❌ تجاهل',       callback_data: `rej:${docId}` },
      ]],
    } : null;

    await tgSend(token, adminChat, preview, keyboard);
  } catch (e) {
    await tgSend(token, adminChat, `❌ خطأ غير متوقع: ${e.message}`);
    console.error('processTgJob:', e);
  }
}

async function saveTgJob(job) {
  try {
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }
    );
    const { idToken } = await authRes.json();
    if (!idToken) return null;

    const fields = buildFsFields({
      ...job,
      reqs:         Array.isArray(job.reqs) ? job.reqs : [],
      bens:         Array.isArray(job.bens) ? job.bens : [],
      status:       'pending_telegram',
      source:       'telegram',
      logo:         (job.company || '?').charAt(0),
      applicants:   0,
      postedByType: 'telegram',
      postedAt:     new Date().toISOString(),
    });

    const fsRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/telegram_queue`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body:    JSON.stringify({ fields }),
      }
    );
    const fsData = await fsRes.json();
    return fsData.name?.split('/').pop() || null;
  } catch (e) {
    console.error('saveTgJob:', e);
    return null;
  }
}

async function handleTgCallback(cb, token, env) {
  const { data, id } = cb;
  try {
    if (data.startsWith('pub:')) {
      const newId = await publishTgJob(data.slice(4));
      await tgAnswer(token, id, newId ? '✅ تم النشر على المنصة!' : '❌ فشل النشر، جرّب من لوحة الأدمن');
    }
    if (data.startsWith('rej:')) {
      await deleteTgJob(data.slice(4));
      await tgAnswer(token, id, '🗑️ تم تجاهل الوظيفة');
    }
  } catch (e) {
    console.error('handleTgCallback:', e);
  }
}

async function publishTgJob(docId) {
  try {
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }
    );
    const authData = await authRes.json();
    const idToken  = authData.idToken;
    if (!idToken) { console.error('publishTgJob: auth failed', JSON.stringify(authData).slice(0,200)); return null; }

    // قراءة الوثيقة باستخدام token (لا بـ API key فقط)
    const getRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/telegram_queue/${docId}`,
      { headers: { 'Authorization': `Bearer ${idToken}` } }
    );
    if (!getRes.ok) {
      const e = await getRes.text().catch(() => '');
      console.error('publishTgJob: read failed', getRes.status, e.slice(0,200));
      return null;
    }
    const doc    = await getRes.json();
    const fields = { ...doc.fields };
    fields.status   = { stringValue: 'active' };
    fields.postedAt = { timestampValue: new Date().toISOString() };
    if (doc.fields?.semanticHash) fields.semanticHash = doc.fields.semanticHash;

    const addRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/jobs`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body:    JSON.stringify({ fields }),
      }
    );
    if (!addRes.ok) {
      const e = await addRes.text().catch(() => '');
      console.error('publishTgJob: write to jobs failed', addRes.status, e.slice(0,300));
      return null;
    }
    const newDoc   = await addRes.json();
    const newJobId = newDoc.name?.split('/').pop() || null;
    await deleteTgJob(docId);
    return newJobId;
  } catch (e) {
    console.error('publishTgJob exception:', e.message);
    return null;
  }
}

async function deleteTgJob(docId) {
  try {
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }
    );
    const { idToken } = await authRes.json();
    if (!idToken) return;
    await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/telegram_queue/${docId}`,
      { method: 'DELETE', headers: { 'Authorization': `Bearer ${idToken}` } }
    );
  } catch (_) {}
}

async function tgSend(token, chatId, text, replyMarkup) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      chat_id:      chatId,
      text,
      parse_mode:   'Markdown',
      reply_markup: replyMarkup || undefined,
    }),
  });
}

async function tgAnswer(token, callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

// ═══════════════════════════════════════════════
// Social Media Publishing + SVG Job Card Generator
// ═══════════════════════════════════════════════
const TYP_AR = { full: 'دوام كامل', part: 'دوام جزئي', remote: 'عن بُعد', gig: 'مهمة حرة' };
const EXP_AR = { none: 'بدون خبرة', no: 'بدون خبرة', '1-2': '1-2 سنة', '3-5': '3-5 سنوات', '5+': 'أكثر من 5 سنوات' };

const CAT_THEME = {
  tech:  { bg: '#0a1628', card: '#0d1f3c', accent: '#0d9488', label: 'تقنية وبرمجة',  en: 'Technology',   icon: '💻' },
  biz:   { bg: '#0f1a0a', card: '#1a2d0f', accent: '#22c55e', label: 'أعمال وإدارة',  en: 'Business',     icon: '💼' },
  med:   { bg: '#0a1220', card: '#0f2233', accent: '#38bdf8', label: 'طب وصحة',        en: 'Healthcare',   icon: '🏥' },
  edu:   { bg: '#120a28', card: '#1e1050', accent: '#a78bfa', label: 'تعليم وتدريب',  en: 'Education',    icon: '📚' },
  eng:   { bg: '#1a0f00', card: '#2d1a00', accent: '#fb923c', label: 'هندسة',          en: 'Engineering',  icon: '⚙️' },
  other: { bg: '#0a1628', card: '#0f2233', accent: '#06b6d4', label: 'وظائف متنوعة',  en: 'General',      icon: '📋' },
};

const PROV_ICON = {
  'بغداد':'🏛','كربلاء':'🕌','النجف':'⭐','البصرة':'⚓','الموصل':'🏙','أربيل':'🏔',
  'السليمانية':'🌿','كركوك':'⚡','بابل':'🏺','ذي قار':'📜','ميسان':'🌊',
  'القادسية':'🌾','واسط':'🌴','المثنى':'🌙','الأنبار':'🌅','صلاح الدين':'🏰',
  'ديالى':'🌻','دهوك':'⛰',
};

// لون خاص بكل محافظة عراقية
const PROV_THEME = {
  'بغداد':      { acc:'#ef4444', bg:'#3b0a0a', en:'BAGHDAD'      },
  'كربلاء':     { acc:'#22c55e', bg:'#0a3b0a', en:'KARBALA'      },
  'النجف':      { acc:'#eab308', bg:'#3b2d00', en:'NAJAF'        },
  'البصرة':     { acc:'#3b82f6', bg:'#0a0f3b', en:'BASRA'        },
  'الموصل':     { acc:'#f97316', bg:'#3b1500', en:'MOSUL'        },
  'نينوى':      { acc:'#f97316', bg:'#3b1500', en:'NINEVEH'      },
  'أربيل':      { acc:'#fbbf24', bg:'#3b2200', en:'ERBIL'        },
  'السليمانية': { acc:'#10b981', bg:'#0a3b1a', en:'SULAYMANIYAH' },
  'كركوك':      { acc:'#8b5cf6', bg:'#1a0a3b', en:'KIRKUK'       },
  'بابل':       { acc:'#b45309', bg:'#3b2800', en:'BABYLON'      },
  'ذي قار':     { acc:'#d97706', bg:'#3b1e00', en:'DHI QAR'      },
  'ميسان':      { acc:'#06b6d4', bg:'#00283b', en:'MAYSAN'       },
  'القادسية':   { acc:'#f59e0b', bg:'#3b2500', en:'QADISIYYAH'   },
  'واسط':       { acc:'#84cc16', bg:'#1a3b00', en:'WASIT'        },
  'المثنى':     { acc:'#fb923c', bg:'#3b1200', en:'MUTHANNA'     },
  'الأنبار':    { acc:'#f59e0b', bg:'#3b2000', en:'ANBAR'        },
  'صلاح الدين': { acc:'#4ade80', bg:'#003b10', en:'SALAH AL-DIN' },
  'ديالى':      { acc:'#34d399', bg:'#003b15', en:'DIYALA'       },
  'دهوك':       { acc:'#a78bfa', bg:'#1a003b', en:'DOHUK'        },
};


// ── SVG Job Card Generator (Arabic text via resvg-wasm + Noto Sans Arabic) ──

function parseHex(hex) {
  const h = (hex || '#0a1628').replace('#', '');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

function brighten(hex, amount) {
  const [r, g, b] = parseHex(hex);
  const hx = (v) => Math.min(255, v + amount).toString(16).padStart(2, '0');
  return `#${hx(r)}${hx(g)}${hx(b)}`;
}

let _resvgInitPromise = null;
let _arabicFonts = null; // [Uint8Array(400), Uint8Array(700)]

async function ensureResvg() {
  if (_resvgInitPromise) { await _resvgInitPromise; return; }
  _resvgInitPromise = initWasm(resvgWasm);
  await _resvgInitPromise;
}

async function getArabicFonts() {
  if (_arabicFonts) return _arabicFonts;
  const base = 'https://cdn.jsdelivr.net/npm/@fontsource/tajawal/files/tajawal-arabic-';
  const [r400, r800] = await Promise.all([
    fetch(base + '400-normal.woff2').then(r => r.arrayBuffer()),
    fetch(base + '800-normal.woff2').then(r => r.arrayBuffer()),
  ]);
  _arabicFonts = [new Uint8Array(r400), new Uint8Array(r800)];
  return _arabicFonts;
}

// رموز SVG لكل فئة وظيفية — مرسومة حول النقطة (cx, cy)
function getCatIcon(catKey) {
  const sw = `fill="none" stroke="white" stroke-width="3.5" stroke-opacity="0.75" stroke-linecap="round" stroke-linejoin="round"`;
  const fl = `fill="white" fill-opacity="0.68" stroke="none"`;
  const T  = `transform="translate(490,130)"`;

  switch (catKey) {
    case 'tech': // لابتوب
      return `<g ${T} ${sw}>
        <rect x="-25" y="-20" width="50" height="30" rx="3"/>
        <rect x="-31" y="10" width="62" height="8" rx="2"/>
        <line x1="-5" y1="10" x2="5" y2="10"/>
      </g>`;

    case 'biz': // حقيبة عمل
      return `<g ${T} ${sw}>
        <rect x="-25" y="-12" width="50" height="35" rx="4"/>
        <path d="M-12,-12 L-12,-21 Q-12,-25 -8,-25 L8,-25 Q12,-25 12,-21 L12,-12"/>
        <line x1="-25" y1="4" x2="25" y2="4"/>
      </g>`;

    case 'med': // صليب طبي
      return `<g ${T} ${fl}>
        <rect x="-7" y="-27" width="14" height="54" rx="4"/>
        <rect x="-27" y="-7" width="54" height="14" rx="4"/>
      </g>`;

    case 'edu': // قبعة تخرج
      return `<g ${T} ${sw}>
        <path d="M0,-23 L28,-10 L0,3 L-28,-10 Z" fill="white" fill-opacity="0.16" stroke-width="3.5"/>
        <path d="M-16,-4 L-16,13 Q0,23 16,13 L16,-4"/>
        <line x1="28" y1="-10" x2="28" y2="7"/>
      </g>`;

    case 'eng': // تروس هندسية
      return `<g ${T} ${fl}>
        <circle cx="0" cy="0" r="14"/>
        <rect x="-5" y="-28" width="10" height="14" rx="2"/>
        <rect x="-5" y="14" width="10" height="14" rx="2"/>
        <rect x="-28" y="-5" width="14" height="10" rx="2"/>
        <rect x="14" y="-5" width="14" height="10" rx="2"/>
      </g>`;

    default: // مستند
      return `<g ${T} ${sw}>
        <path d="M-20,-28 L10,-28 L21,-17 L21,28 L-20,28 Z"/>
        <path d="M10,-28 L10,-17 L21,-17"/>
        <line x1="-10" y1="-7" x2="10" y2="-7"/>
        <line x1="-10" y1="4" x2="10" y2="4"/>
        <line x1="-10" y1="15" x2="4" y2="15"/>
      </g>`;
  }
}

function buildCardSvg(job) {
  const cat  = CAT_THEME[job.cat] || CAT_THEME.other;
  const prov = PROV_THEME[job.province] || null;

  const cAcc   = cat.accent;
  const pAcc   = prov ? prov.acc : cat.accent;
  const bgBase = brighten(prov ? prov.bg : cat.bg, 45);
  const bgCard = brighten(cat.card, 55);
  const catLabel = cat.label;
  const provName = job.province || '';
  const provEn   = prov ? prov.en : '';
  const PX = 385; // right panel start x

  const provPill = provName ? `
  <rect x="14" y="20" width="170" height="34" rx="8" fill="${pAcc}" fill-opacity="0.88"/>
  <text x="99" y="43" text-anchor="middle" direction="rtl" font-family="Tajawal,Arial,sans-serif" font-size="17" font-weight="bold" fill="white">${provName}</text>` : '';

  const provEnLeft  = provEn ? `<text x="14" y="135" font-family="monospace,sans-serif" font-size="10" fill="${pAcc}" fill-opacity="0.55" letter-spacing="2">${provEn.slice(0,15)}</text>` : '';
  const provEnRight = provEn ? `<text x="490" y="202" text-anchor="middle" font-family="monospace,sans-serif" font-size="10" fill="white" fill-opacity="0.38" letter-spacing="2">${provEn.slice(0,12)}</text>` : '';
  const catIcon = getCatIcon(job.cat || 'other');

  return `<svg width="600" height="315" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
    <stop offset="0%" stop-color="${bgBase}"/>
    <stop offset="100%" stop-color="${bgCard}"/>
  </linearGradient>
</defs>

<!-- background -->
<rect width="600" height="315" fill="url(#bg)"/>

<!-- right panel tint -->
<rect x="${PX}" width="${600-PX}" height="265" fill="${cAcc}" fill-opacity="0.22"/>

<!-- decorative circles -->
<circle cx="585" cy="18" r="100" fill="${cAcc}" fill-opacity="0.14"/>
<circle cx="585" cy="250" r="62" fill="${pAcc}" fill-opacity="0.14"/>
<circle cx="490" cy="130" r="56" fill="none" stroke="white" stroke-width="4" stroke-opacity="0.22"/>

<!-- category icon inside circle + province EN below -->
${catIcon}
${provEnRight}

<!-- top bar: province left | category right -->
<rect width="${PX}" height="8" fill="${pAcc}"/>
<rect x="${PX}" width="${600-PX}" height="8" fill="${cAcc}"/>

<!-- left accent stripe -->
<rect y="8" width="8" height="257" fill="${pAcc}"/>

<!-- province name pill (Arabic) -->
${provPill}

<!-- category label pill (Arabic) -->
<rect x="14" y="66" width="205" height="36" rx="8" fill="${cAcc}" fill-opacity="0.2" stroke="${cAcc}" stroke-width="1" stroke-opacity="0.55"/>
<text x="116" y="91" text-anchor="middle" direction="rtl" font-family="Tajawal,Arial,sans-serif" font-size="17" font-weight="bold" fill="${cAcc}">${catLabel}</text>

<!-- dual accent line + province EN left -->
<rect x="14" y="113" width="90" height="2" fill="${pAcc}" fill-opacity="0.65"/>
<rect x="112" y="113" width="90" height="2" fill="${cAcc}" fill-opacity="0.65"/>
${provEnLeft}

<!-- قدّم الآن button -->
<rect x="14" y="220" width="185" height="40" rx="10" fill="${cAcc}"/>
<rect x="14" y="220" width="185" height="3" rx="2" fill="white" fill-opacity="0.28"/>
<text x="106" y="247" text-anchor="middle" direction="rtl" font-family="Tajawal,Arial,sans-serif" font-size="19" font-weight="bold" fill="white">قدّم الآن</text>

<!-- footer bar -->
<rect y="265" width="600" height="50" fill="#04060c"/>
<rect y="265" width="${PX}" height="3" fill="${pAcc}"/>
<rect x="${PX}" y="265" width="${600-PX}" height="3" fill="${cAcc}"/>

<!-- logo dot -->
<circle cx="30" cy="291" r="13" fill="${cAcc}" fill-opacity="0.38"/>

<!-- afra-iq.com (English, left) -->
<text x="50" y="298" font-family="monospace,sans-serif" font-size="17" font-weight="bold" fill="${cAcc}">afra-iq.com</text>

<!-- عفراء للتوظيف (Arabic, right) -->
<text x="590" y="298" text-anchor="end" direction="rtl" font-family="Tajawal,Arial,sans-serif" font-size="15" font-weight="bold" fill="${pAcc}">عفراء للتوظيف</text>
</svg>`;
}

async function generateJobCardImage(job, env) {
  const imgbbKey = env.IMGBB_KEY;
  if (!imgbbKey) { console.error('IMGBB_KEY missing'); return null; }
  try {
    console.log('Generating SVG→PNG card...');
    await ensureResvg();
    const fonts = await getArabicFonts();
    const svg = buildCardSvg(job);

    const resvg = new Resvg(svg, {
      font: { fontBuffers: fonts },
    });
    const pngData  = resvg.render();
    const png      = pngData.asPng();
    console.log('PNG ready, bytes:', png.length);

    let b64 = '';
    for (let i = 0; i < png.length; i++) b64 += String.fromCharCode(png[i]);
    b64 = btoa(b64);

    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `image=${encodeURIComponent(b64)}&name=afra-card-${job.id}`,
    });
    const data = await res.json();
    console.log('imgbb response:', JSON.stringify(data).slice(0, 200));
    return data.data?.url || null;
  } catch (e) {
    console.error('generateJobCardImage error:', e.message);
    return null;
  }
}

function buildSocialText(job, style) {
  const salTxt = job.salary
    ? `${Number(job.salary).toLocaleString()} ${job.currency || 'IQD'}`
    : (job.commission ? job.commission : 'قابل للتفاوض');
  const expTxt = EXP_AR[job.exp] || (job.exp && job.exp !== 'none' ? job.exp : null);
  const jobUrl = `${SITE_URL}/#job/${job.id}`;

  if (style === 'tg') {
    return [
      `🔔 *وظيفة جديدة — عفراء للتوظيف*`,
      ``,
      `*${job.title}*`,
      job.company    ? `🏢 ${job.company}`           : '',
      job.province   ? `📍 ${job.province}`          : '',
      `💼 ${TYP_AR[job.type] || job.type || 'دوام كامل'}`,
      job.salary     ? `💰 ${salTxt}`                : '',
      job.commission ? `📊 حافز: ${job.commission}`  : (!job.salary ? `💰 قابل للتفاوض` : ''),
      expTxt         ? `⏱ خبرة: ${expTxt}`          : '',
      ``,
      job.desc ? job.desc.substring(0, 280) + (job.desc.length > 280 ? '...' : '') : '',
      ``,
      `🔗 [قدّم الآن](${jobUrl})`,
    ].filter(Boolean).join('\n');
  }

  if (style === 'wa') {
    return [
      `🔔 *وظيفة جديدة — عفراء للتوظيف*`,
      ``,
      `*${job.title}*`,
      job.company    ? `🏢 ${job.company}`           : '',
      job.province   ? `📍 ${job.province}`          : '',
      `💼 ${TYP_AR[job.type] || job.type || 'دوام كامل'}`,
      job.salary     ? `💰 ${salTxt}`                : '',
      job.commission ? `📊 حافز: ${job.commission}`  : (!job.salary ? `💰 قابل للتفاوض` : ''),
      expTxt         ? `⏱ خبرة: ${expTxt}`          : '',
      ``,
      job.desc ? job.desc.substring(0, 300) + (job.desc.length > 300 ? '...' : '') : '',
      ``,
      `🔗 للتقديم: ${jobUrl}`,
      ``,
      `📲 *عفراء للتوظيف* | afra-iq.com`,
    ].filter(Boolean).join('\n');
  }

  const tags = ['#وظائف_عراق', '#توظيف', '#عفراء_للتوظيف'];
  if (job.province) tags.push(`#وظائف_${job.province.replace(/\s/g, '')}`);
  return [
    `🔔 وظيفة جديدة — عفراء للتوظيف`,
    ``,
    `📌 ${job.title}`,
    job.company    ? `🏢 ${job.company}`            : '',
    job.province   ? `📍 ${job.province}`           : '',
    `💼 ${TYP_AR[job.type] || job.type || 'دوام كامل'}`,
    job.salary     ? `💰 الراتب: ${salTxt}`         : '',
    job.commission ? `📊 الحافز: ${job.commission}` : (!job.salary ? `💰 قابل للتفاوض` : ''),
    expTxt         ? `⏱ الخبرة: ${expTxt}`         : '',
    ``,
    job.desc ? job.desc.substring(0, 400) + (job.desc.length > 400 ? '...' : '') : '',
    ``,
    `للتقديم: ${jobUrl}`,
    ``,
    tags.join(' '),
  ].filter(Boolean).join('\n');
}

function fsJobFromDoc(jobId, doc) {
  const f = doc.fields || {};
  return {
    id:         jobId,
    title:      f.title?.stringValue      || '',
    company:    f.company?.stringValue    || '',
    province:   f.province?.stringValue   || '',
    type:       f.type?.stringValue       || '',
    cat:        f.cat?.stringValue        || 'other',
    salary:     parseFloat(f.salary?.doubleValue || f.salary?.integerValue || 0) || 0,
    currency:   f.currency?.stringValue   || 'IQD',
    commission: f.commission?.stringValue || '',
    exp:        f.exp?.stringValue        || '',
    desc:       f.desc?.stringValue       || '',
    phone:      f.phone?.stringValue      || '',
  };
}

async function postToTelegram(job, token, channelId, imageUrl) {
  if (!token) return { ok: false, error: 'Token not configured' };
  try {
    const text = buildSocialText(job, 'tg');
    const kbd  = { inline_keyboard: [[{ text: '📝 قدّم الآن', url: `${SITE_URL}/#job/${job.id}` }]] };
    if (imageUrl) {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:      channelId,
          photo:        imageUrl,
          caption:      text.slice(0, 1024),
          parse_mode:   'Markdown',
          reply_markup: kbd,
        }),
      });
      const d = await res.json();
      if (d.ok) return { ok: true, messageId: d.result?.message_id };
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: channelId, text, parse_mode: 'Markdown', reply_markup: kbd }),
    });
    const d = await res.json();
    return { ok: d.ok, messageId: d.result?.message_id, error: d.description };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function postToWhatsApp(job, phoneNumberId, token, channelId, imageUrl) {
  try {
    const text = buildSocialText(job, 'wa');
    const api  = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    if (imageUrl && imageUrl !== TG_FALLBACK_IMG) {
      const res = await fetch(api, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to:   channelId,
          type: 'image',
          image: { link: imageUrl, caption: text.slice(0, 1024) },
        }),
      });
      const d = await res.json();
      if (d.messages?.[0]?.id) return { ok: true, messageId: d.messages[0].id };
      // fallback to text if image fails
      console.warn('WA image failed:', JSON.stringify(d).slice(0, 200));
    }

    // text-only fallback
    const res = await fetch(api, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to:   channelId,
        type: 'text',
        text: { preview_url: true, body: text.slice(0, 4096) },
      }),
    });
    const d = await res.json();
    return { ok: !!d.messages?.[0]?.id, messageId: d.messages?.[0]?.id, error: d.error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function postToFacebook(job, token, pageId, imageUrl) {
  try {
    if (imageUrl && imageUrl !== OG_IMAGE) {
      // نشر صورة مع نص (أفضل engagement)
      const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url:          imageUrl,
          caption:      buildSocialText(job, 'fb'),
          access_token: token,
        }),
      });
      const d = await res.json();
      return { ok: !d.error, postId: d.id, error: d.error?.message, imageUrl };
    }
    // fallback: نشر نصي مع رابط
    const res = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message:      buildSocialText(job, 'fb'),
        link:         `${SITE_URL}/#job/${job.id}`,
        access_token: token,
      }),
    });
    const d = await res.json();
    return { ok: !d.error, postId: d.id, error: d.error?.message };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function postToInstagram(job, token, igId, imageUrl) {
  try {
    const imgSrc = imageUrl || OG_IMAGE;
    const createRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imgSrc, caption: buildSocialText(job, 'ig'), access_token: token }),
    });
    const created = await createRes.json();
    if (!created.id) return { ok: false, error: created.error?.message || 'Container creation failed' };

    const pubRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: created.id, access_token: token }),
    });
    const pub = await pubRes.json();
    return { ok: !pub.error, postId: pub.id, error: pub.error?.message, imageUrl: imgSrc };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function handleSocialPublish(request, env) {
  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const { jobId, platforms, scheduledAt } = body;
  if (!jobId) return json({ error: 'jobId required' }, 400);
  if (!Array.isArray(platforms) || !platforms.length) return json({ error: 'platforms required' }, 400);

  const jobRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/jobs/${jobId}?key=${FIREBASE_KEY}`
  );
  if (!jobRes.ok) return json({ error: 'Job not found' }, 404);
  const jobDoc = await jobRes.json();
  if (!jobDoc.fields) return json({ error: 'Job not found' }, 404);
  const job = fsJobFromDoc(jobId, jobDoc);

  if (scheduledAt) {
    const saved = await saveScheduledPost(jobId, platforms, scheduledAt);
    return saved
      ? json({ scheduled: true, scheduledAt })
      : json({ error: 'Failed to save schedule' }, 500);
  }

  const tgChan = env.TG_CHANNEL_ID || '@afraiq_jobs';

  let imageUrl = await generateJobCardImage(job, env) || null;

  const results = {};
  if (platforms.includes('tg'))                                                                               results.tg = await postToTelegram(job, env.TELEGRAM_TOKEN, tgChan, imageUrl || TG_FALLBACK_IMG);
  if (platforms.includes('fb') && env.FB_PAGE_TOKEN && env.FB_PAGE_ID)                                       results.fb = await postToFacebook(job, env.FB_PAGE_TOKEN, env.FB_PAGE_ID, imageUrl);
  if (platforms.includes('ig') && env.FB_PAGE_TOKEN && env.IG_ACCOUNT_ID)                                    results.ig = await postToInstagram(job, env.FB_PAGE_TOKEN, env.IG_ACCOUNT_ID, imageUrl);
  if (platforms.includes('wa') && env.WA_PHONE_NUMBER_ID && env.WA_ACCESS_TOKEN && env.WA_CHANNEL_ID)        results.wa = await postToWhatsApp(job, env.WA_PHONE_NUMBER_ID, env.WA_ACCESS_TOKEN, env.WA_CHANNEL_ID, imageUrl);

  await logSocialPost(jobId, platforms, results);
  return json({ results, imageUrl });
}

async function saveScheduledPost(jobId, platforms, scheduledAt) {
  try {
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }
    );
    const { idToken } = await authRes.json();
    if (!idToken) return false;

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/social_schedule`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body:    JSON.stringify({
          fields: buildFsFields({ jobId, platforms, scheduledAt, status: 'pending', createdAt: new Date().toISOString() }),
        }),
      }
    );
    return res.ok;
  } catch { return false; }
}

async function logSocialPost(jobId, platforms, results) {
  try {
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }
    );
    const { idToken } = await authRes.json();
    if (!idToken) return;
    const summary = Object.entries(results).map(([p, r]) => `${p}:${r.ok ? '✓' : '✗'}`).join(', ');
    await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/social_posts_log`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body:    JSON.stringify({ fields: buildFsFields({ jobId, platforms, summary, postedAt: new Date().toISOString() }) }),
      }
    );
  } catch { /* silent */ }
}

async function processScheduledPosts(env) {
  try {
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }
    );
    const { idToken } = await authRes.json();
    if (!idToken) return;

    const now = new Date().toISOString();
    const qRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'social_schedule' }],
            where: {
              compositeFilter: {
                op: 'AND',
                filters: [
                  { fieldFilter: { field: { fieldPath: 'status' },      op: 'EQUAL',              value: { stringValue: 'pending' } } },
                  { fieldFilter: { field: { fieldPath: 'scheduledAt' }, op: 'LESS_THAN_OR_EQUAL', value: { stringValue: now }       } },
                ],
              },
            },
            limit: 10,
          },
        }),
      }
    );

    const docs = await qRes.json();
    if (!Array.isArray(docs)) return;

    for (const item of docs) {
      if (!item.document) continue;
      const docName  = item.document.name;
      const f        = item.document.fields || {};
      const jobId    = f.jobId?.stringValue;
      const platforms = f.platforms?.arrayValue?.values?.map(v => v.stringValue) || [];
      if (!jobId || !platforms.length) continue;

      let status = 'failed';
      const jobRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/jobs/${jobId}?key=${FIREBASE_KEY}`
      );
      if (jobRes.ok) {
        const job = fsJobFromDoc(jobId, await jobRes.json());
        const tgChan = env.TG_CHANNEL_ID || '@afraiq_jobs';
        const imgUrl = await generateJobCardImage(job, env) || null;
        if (platforms.includes('tg'))                                                                          await postToTelegram(job, env.TELEGRAM_TOKEN, tgChan, imgUrl || TG_FALLBACK_IMG);
        if (platforms.includes('fb') && env.FB_PAGE_TOKEN && env.FB_PAGE_ID)                                  await postToFacebook(job, env.FB_PAGE_TOKEN, env.FB_PAGE_ID, imgUrl);
        if (platforms.includes('ig') && env.FB_PAGE_TOKEN && env.IG_ACCOUNT_ID)                               await postToInstagram(job, env.FB_PAGE_TOKEN, env.IG_ACCOUNT_ID, imgUrl);
        if (platforms.includes('wa') && env.WA_PHONE_NUMBER_ID && env.WA_ACCESS_TOKEN && env.WA_CHANNEL_ID)   await postToWhatsApp(job, env.WA_PHONE_NUMBER_ID, env.WA_ACCESS_TOKEN, env.WA_CHANNEL_ID, imgUrl);
        status = 'done';
      }

      await fetch(
        `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=status&updateMask.fieldPaths=processedAt`,
        {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify({ fields: buildFsFields({ status, processedAt: new Date().toISOString() }) }),
        }
      );
    }
  } catch (e) { console.error('processScheduledPosts:', e); }
}

// ═══════════════════════════════════════════════════════════
// Job Discovery System — Google CSE + RSS feeds
// ═══════════════════════════════════════════════════════════

// ── محلية (عراقية) أولاً ثم إقليمية ──
const DISCOVERY_QUERIES_LOCAL = [
  'وظائف شاغرة بغداد 2025',
  'مطلوب موظف بغداد براتب',
  'وظيفة شاغرة كربلاء النجف',
  'مطلوب موظف البصرة الموصل',
  'وظيفة شاغرة اربيل السليمانية',
  'وظائف عراقية جديدة اليوم',
  'مطلوب سكرتيرة محاسب مهندس بغداد',
  'وظائف شاغرة ديالى الانبار كركوك',
  'hiring Baghdad Iraq',
  'job vacancy Iraq Basra Mosul',
];

const DISCOVERY_QUERIES_REGIONAL = [
  'وظائف العراق site:bayt.com',
  'Iraq jobs site:akhtaboot.com',
  'وظائف العراق site:naukrigulf.com',
];

// قائمة مجمّعة — المحلية أولاً دائماً
const DISCOVERY_QUERIES = [...DISCOVERY_QUERIES_LOCAL, ...DISCOVERY_QUERIES_REGIONAL];

// قنوات تيليجرام العراقية الافتراضية (تعمل بدون ضبط Firestore)
const DEFAULT_TG_CHANNELS = [
  'afraiq_jobs',
];

// Google News RSS — مجاني تماماً، لا يحتاج مفتاح، يعمل دائماً
const RSS_FEEDS = [
  { url: 'https://news.google.com/rss/search?q=%D9%88%D8%B8%D8%A7%D8%A6%D9%81+%D8%A8%D8%BA%D8%AF%D8%A7%D8%AF+%D8%A7%D9%84%D8%B9%D8%B1%D8%A7%D9%82&hl=ar&gl=IQ&ceid=IQ:ar', priority: 'local' },
  { url: 'https://news.google.com/rss/search?q=%D9%85%D8%B7%D9%84%D9%88%D8%A8+%D9%85%D9%88%D8%B8%D9%81+%D8%A8%D8%BA%D8%AF%D8%A7%D8%AF+%D8%A8%D8%B1%D8%A7%D8%AA%D8%A8&hl=ar&gl=IQ&ceid=IQ:ar', priority: 'local' },
  { url: 'https://news.google.com/rss/search?q=%D9%88%D8%B8%D9%8A%D9%81%D8%A9+%D8%B4%D8%A7%D8%BA%D8%B1%D8%A9+%D8%A7%D9%84%D8%B9%D8%B1%D8%A7%D9%82+2025&hl=ar&gl=IQ&ceid=IQ:ar', priority: 'local' },
  { url: 'https://news.google.com/rss/search?q=iraq+jobs+hiring+vacancy+2025&hl=en&gl=IQ&ceid=IQ:en', priority: 'local' },
  { url: 'https://news.google.com/rss/search?q=%D9%88%D8%B8%D8%A7%D8%A6%D9%81+%D8%A7%D9%84%D8%B9%D8%B1%D8%A7%D9%82+site:bayt.com&hl=ar&gl=IQ&ceid=IQ:ar', priority: 'regional' },
  { url: 'https://news.google.com/rss/search?q=iraq+jobs+site:akhtaboot.com&hl=en&gl=IQ&ceid=IQ:en', priority: 'regional' },
];

// ── اختبار مصادر الاستيراد — للتشخيص فقط ──
async function testDiscoverySources(env) {
  const report = { rss: [], telegram: [], google: null, linkedin: null };

  // اختبار RSS
  for (const feed of RSS_FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AfraBot/1.0)', Accept: 'application/rss+xml,text/xml,*/*' },
        signal: AbortSignal.timeout(6000),
      });
      const xml = res.ok ? await res.text() : '';
      const count = (xml.match(/<item/gi) || []).length + (xml.match(/<entry/gi) || []).length;
      report.rss.push({ url: feed.url.substring(0, 80), status: res.status, items: count, priority: feed.priority });
    } catch (e) {
      report.rss.push({ url: feed.url.substring(0, 80), error: e.message, priority: feed.priority });
    }
  }

  // اختبار Telegram RSS
  const tgChannels = await _loadTgChannelsFromFirestore();
  for (const ch of tgChannels.slice(0, 2)) {
    const handle = ch.replace(/^@/, '');
    const providers = [
      `https://rsshub.app/telegram/channel/${handle}`,
      `https://hub.slarker.me/telegram/channel/${handle}`,
    ];
    for (const url of providers) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        const xml = res.ok ? await res.text() : '';
        const count = (xml.match(/<item/gi) || []).length;
        report.telegram.push({ channel: handle, provider: url.split('/')[2], status: res.status, items: count });
        if (count > 0) break;
      } catch (e) {
        report.telegram.push({ channel: handle, provider: url.split('/')[2], error: e.message });
      }
    }
  }

  // اختبار Google CSE
  if (env.GOOGLE_CSE_KEY && env.GOOGLE_CSE_ID) {
    try {
      const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_CSE_KEY}&cx=${env.GOOGLE_CSE_ID}&q=وظائف+بغداد&num=3`);
      const data = await res.json();
      report.google = { status: res.status, items: (data.items || []).length, error: data.error?.message };
    } catch (e) { report.google = { error: e.message }; }
  } else {
    report.google = { error: 'GOOGLE_CSE_KEY أو GOOGLE_CSE_ID غير مضبوطين' };
  }

  // اختبار LinkedIn
  try {
    const res = await fetch('https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=jobs&location=Iraq&start=0&count=3', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(6000),
    });
    const html = res.ok ? await res.text() : '';
    const titles = (html.match(/base-search-card__title/g) || []).length;
    report.linkedin = { status: res.status, jobs_found: titles };
  } catch (e) { report.linkedin = { error: e.message }; }

  return new Response(JSON.stringify(report, null, 2), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function discoverJobs(env) {
  const items = [];

  // ① محلية: قنوات تيليجرام العراقية (الأولوية القصوى) — تُقرأ من Firestore
  const tgChannels = await _loadTgChannelsFromFirestore();
  if (tgChannels.length) {
    try { items.push(...await discoverViaTelegramChannels(tgChannels, env.TELEGRAM_TOKEN)); }
    catch (e) { console.error('[discovery] Telegram channels error:', e.message); }
  }

  // ② محلية: Google CSE (عراقية)
  if (env.GOOGLE_CSE_KEY && env.GOOGLE_CSE_ID) {
    try { items.push(...await discoverViaGoogle(env)); }
    catch (e) { console.error('[discovery] Google error:', e.message); }
  }

  // ③ محلية + إقليمية: RSS
  try { items.push(...await discoverViaRSS()); }
  catch (e) { console.error('[discovery] RSS error:', e.message); }

  // ④ إقليمية: LinkedIn
  try { items.push(...await discoverViaLinkedIn()); }
  catch (e) { console.error('[discovery] LinkedIn error:', e.message); }

  // ترتيب: المحلية أولاً ثم الإقليمية
  items.sort((a, b) => {
    if (a.priority === 'local' && b.priority !== 'local') return -1;
    if (b.priority === 'local' && a.priority !== 'local') return 1;
    return 0;
  });

  console.log(`[discovery] Processing ${items.length} items (${items.filter(i => i.priority === 'local').length} local)`);

  let saved = 0;
  for (const item of items) {
    try { if (await parseAndSaveDiscovery(item, env)) saved++; }
    catch (e) { console.error('[discovery] parse error:', e.message); }
  }
  console.log(`[discovery] Saved ${saved} new jobs to review queue`);
}

// ── قراءة قنوات المصادر من Firestore config/settings (مع fallback للقنوات الافتراضية) ──
async function _loadTgChannelsFromFirestore() {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/config/settings?key=${FIREBASE_KEY}`,
      { cf: { cacheTtl: 300 } }
    );
    if (res.ok) {
      const doc = await res.json();
      const arr = doc.fields?.telegram?.mapValue?.fields?.jobChannels?.arrayValue?.values || [];
      const configured = arr.map(v => v.stringValue).filter(Boolean);
      if (configured.length) return configured;
    }
  } catch { /* skip */ }
  return DEFAULT_TG_CHANNELS;
}

// ── استخراج محتوى وظيفة من صفحة ويب بشكل احترافي ──
// يجرب بالترتيب: JSON-LD JobPosting schema → Open Graph → نص الصفحة
async function fetchJobContent(url, maxLen = 4000) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AfraBot/1.0; +https://afra-iq.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
      cf: { cacheTtl: 7200 },
    });
    if (!res.ok) return null;
    const html = await res.text();

    // ① JSON-LD JobPosting schema — أدق مصدر (يضعه Indeed, LinkedIn, Bayt, إلخ)
    const ldTags = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
    for (const [, raw] of ldTags) {
      try {
        const parsed = JSON.parse(raw.trim());
        const items  = Array.isArray(parsed) ? parsed : [parsed];
        const job    = items.find(d => d?.['@type'] === 'JobPosting');
        if (job) {
          const desc = (job.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const sal  = job.baseSalary?.value?.value
            ? `الراتب: ${job.baseSalary.value.value}–${job.baseSalary.value.maxValue || ''} ${job.baseSalary.currency || ''}`.trim()
            : '';
          const parts = [
            job.title             ? `المسمى: ${job.title}`                                      : '',
            job.hiringOrganization?.name ? `الشركة: ${job.hiringOrganization.name}`             : '',
            job.jobLocation?.address?.addressLocality ? `الموقع: ${job.jobLocation.address.addressLocality}` : '',
            job.employmentType    ? `نوع الدوام: ${job.employmentType}`                          : '',
            sal,
            job.experienceRequirements ? `الخبرة: ${job.experienceRequirements}`                : '',
            desc                  ? `الوصف: ${desc.substring(0, 2000)}`                         : '',
            Array.isArray(job.skills) && job.skills.length ? `المهارات: ${job.skills.join(', ')}` : '',
          ].filter(Boolean);
          if (parts.length >= 2) return parts.join('\n').substring(0, maxLen);
        }
      } catch { /* skip bad JSON */ }
    }

    // ② Open Graph / meta tags — ثاني خيار
    const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1]
                 || html.match(/name="twitter:title"\s+content="([^"]+)"/i)?.[1] || '';
    const ogDesc  = html.match(/property="og:description"\s+content="([^"]+)"/i)?.[1]
                 || html.match(/name="description"\s+content="([^"]+)"/i)?.[1] || '';

    // ③ استخراج النص الرئيسي — إزالة القوائم والـ header والـ footer
    const stripped = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const combined = [ogTitle, ogDesc, stripped]
      .filter(Boolean)
      .join('\n')
      .substring(0, maxLen);

    return combined || null;
  } catch { return null; }
}

// للتوافق مع الكود القديم
const fetchPageText = (url, maxLen) => fetchJobContent(url, maxLen);

// ── سحب من قنوات تيليجرام العامة عبر RSSHub ──
// RSSHub تحوّل أي قناة عامة لـ RSS بدون حجب
async function discoverViaTelegramChannels(channels, botToken) {
  const results = [];

  for (const ch of channels) {
    const handle = ch.replace(/^@/, '').trim();
    if (!handle) continue;

    // جرّب مزودي RSS لقنوات تيليجرام (من الأسرع للأبطأ)
    const rssProviders = [
      `https://rsshub.app/telegram/channel/${handle}`,
      `https://hub.slarker.me/telegram/channel/${handle}`,
      `https://rsshub.rssforever.com/telegram/channel/${handle}`,
      `https://rss.telegram.group/${handle}`,
      `https://telegram.rss.plus/feed/@${handle}`,
    ];

    let fetched = false;
    for (const rssUrl of rssProviders) {
      try {
        const res = await fetch(rssUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/rss+xml, text/xml, */*' },
          cf: { cacheTtl: 1800 },
        });
        if (!res.ok) continue;
        const xml = await res.text();
        if (!xml.includes('<item') && !xml.includes('<entry')) continue;

        // استخراج الرسائل من RSS
        const items = xml.match(/<item[^>]*>[\s\S]*?<\/item>|<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
        for (const item of items.slice(0, 15)) {
          const getTag = tag => {
            const m = item.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`, 'i'));
            return (m?.[1] || m?.[2] || '').replace(/<[^>]+>/g, '').trim();
          };
          const title = getTag('title');
          const desc  = getTag('description') || getTag('content') || getTag('summary');
          const text  = `${title}\n${desc}`.trim();
          if (text.length < 40) continue;
          results.push({
            source:    'telegram_channel',
            sourceUrl: `https://t.me/${handle}`,
            rawText:   text.substring(0, 2000),
            priority:  'local',
          });
        }
        console.log(`[tg-ch] ${handle} via ${rssUrl}: ${items.length} posts`);
        fetched = true;
        break; // نجح — لا حاجة لمزود آخر
      } catch (e) {
        console.warn(`[tg-ch] ${handle} RSS failed: ${e.message}`);
      }
    }

    // آخر محاولة: Bot API إذا البوت مشرف في القناة
    if (!fetched && botToken) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=50&timeout=0`);
        if (res.ok) {
          const data = await res.json();
          const posts = (data.result || [])
            .filter(u => u.channel_post?.chat?.username === handle && u.channel_post?.text)
            .map(u => u.channel_post.text);
          for (const text of posts) {
            if (text.length < 40) continue;
            results.push({ source: 'telegram_channel', sourceUrl: `https://t.me/${handle}`, rawText: text.substring(0, 2000), priority: 'local' });
          }
        }
      } catch (_) {}
    }
  }
  return results;
}

// ── LinkedIn Jobs — public guest API ──
async function discoverViaLinkedIn() {
  const results = [];
  const searches = [
    { q: 'وظائف+العراق',    location: 'Iraq' },
    { q: 'jobs+Iraq+Baghdad', location: 'Iraq' },
  ];
  for (const s of searches) {
    try {
      const url = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${s.q}&location=${encodeURIComponent(s.location)}&start=0&count=8`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ar,en-US;q=0.9',
        },
        cf: { cacheTtl: 3600 },
      });
      if (!res.ok) continue;
      const html  = await res.text();
      // استخراج عناوين الوظائف من HTML
      const titles  = [...html.matchAll(/class="base-search-card__title[^"]*"[^>]*>\s*([^<]+)/g)].map(m => m[1].trim());
      const companies = [...html.matchAll(/class="base-search-card__subtitle[^"]*"[^>]*>\s*([^<]+)/g)].map(m => m[1].trim());
      const locations = [...html.matchAll(/class="job-search-card__location[^"]*"[^>]*>\s*([^<]+)/g)].map(m => m[1].trim());
      const links   = [...html.matchAll(/href="(https:\/\/www\.linkedin\.com\/jobs\/view\/[^"?]+)/g)].map(m => m[1]);

      for (let i = 0; i < titles.length; i++) {
        if (!titles[i]) continue;
        const rawText = [
          titles[i],
          companies[i] ? `الشركة: ${companies[i]}` : '',
          locations[i] ? `الموقع: ${locations[i]}` : '',
        ].filter(Boolean).join('\n');
        results.push({
          source:    'linkedin',
          sourceUrl: links[i] || 'https://linkedin.com/jobs',
          rawText,
          priority:  'regional',
        });
      }
    } catch { /* skip */ }
  }
  return results;
}

async function discoverViaGoogle(env) {
  const results = [];

  // 3 محلية + 1 إقليمية في كل دورة
  const localQ    = [...DISCOVERY_QUERIES_LOCAL].sort(() => Math.random() - 0.5).slice(0, 3);
  const regionalQ = [...DISCOVERY_QUERIES_REGIONAL].sort(() => Math.random() - 0.5).slice(0, 1);
  const selected  = [...localQ, ...regionalQ];

  for (const q of selected) {
    try {
      const isLocal = DISCOVERY_QUERIES_LOCAL.includes(q);
      const apiUrl  = `https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_CSE_KEY}&cx=${env.GOOGLE_CSE_ID}&q=${encodeURIComponent(q)}&num=10&dateRestrict=d7&gl=iq&hl=ar`;
      const res     = await fetch(apiUrl);
      if (!res.ok) continue;
      const data = await res.json();
      const items = data.items || [];
      if (!items.length) continue;

      // جلب محتوى الصفحات بالتوازي (حد أقصى 5 طلبات معاً)
      const fetchTasks = items.map(async item => {
        // ① أولاً: بيانات pagemap من Google (بدون طلب إضافي)
        const og     = item.pagemap?.metatags?.[0] || {};
        const ogText = [
          og['og:title'] || og['twitter:title'] || '',
          og['og:description'] || og['twitter:description'] || item.snippet || '',
        ].filter(Boolean).join('\n');

        // ② إذا البيانات غنية (>300 حرف) → استخدمها مباشرة
        if (ogText.length > 300) {
          return {
            source:    'google',
            sourceUrl: item.link,
            rawText:   `${item.title}\n\n${ogText}`.substring(0, 4000),
            priority:  isLocal ? 'local' : 'regional',
          };
        }

        // ③ محتوى قصير → اجلب الصفحة كاملة للحصول على JobPosting schema والتفاصيل
        const pageContent = await fetchJobContent(item.link);
        const rawText = pageContent
          ? `${item.title}\n\n${pageContent}`
          : `${item.title}\n\n${item.snippet || ''}`;

        return {
          source:    'google',
          sourceUrl: item.link,
          rawText:   rawText.trim().substring(0, 4000),
          priority:  isLocal ? 'local' : 'regional',
        };
      });

      // تنفيذ 5 طلبات بالتوازي ثم الـ 5 التالية
      for (let i = 0; i < fetchTasks.length; i += 5) {
        const batch = await Promise.allSettled(fetchTasks.slice(i, i + 5));
        for (const r of batch) {
          if (r.status === 'fulfilled' && r.value) results.push(r.value);
        }
      }
    } catch { /* skip */ }
  }
  return results;
}

async function discoverViaRSS() {
  const results = [];
  const sorted = [...RSS_FEEDS].sort((a, b) =>
    a.priority === 'local' && b.priority !== 'local' ? -1 : 1
  );

  for (const feed of sorted) {
    try {
      const res = await fetch(feed.url, {
        headers: {
          Accept: 'application/rss+xml, text/xml, application/atom+xml, */*',
          'User-Agent': 'Mozilla/5.0 (compatible; AfraBot/1.0; +https://afra-iq.com)',
        },
        cf: { cacheTtl: 3600 },
      });
      if (!res.ok) continue;
      const xml   = await res.text();
      const items = xml.match(/<item[^>]*>[\s\S]*?<\/item>|<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
      const limit = feed.priority === 'local' ? 10 : 6;

      // جلب محتوى الصفحات الغنية بالتوازي
      const fetchTasks = items.slice(0, limit).map(async item => {
        const getTag = (tag, fallback = '') => {
          // يدعم CDATA وNS وعلامات مغلقة
          const patterns = [
            new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'),
            new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'),
          ];
          for (const p of patterns) {
            const m = item.match(p);
            if (m?.[1]) return m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          }
          return fallback;
        };

        const title   = getTag('title');
        const link    = getTag('link') || getTag('id');
        // <content:encoded> يحتوي على المقال كاملاً في كثير من RSS
        const fullContent = getTag('content:encoded') || getTag('content');
        const desc    = fullContent || getTag('description') || getTag('summary');
        if (!title && !desc) return null;

        let rawText = `${title}\n\n${desc}`.trim();

        // إذا الوصف قصير جداً (<200 حرف) → اجلب الصفحة الكاملة
        if (desc.length < 200 && link) {
          const pageContent = await fetchJobContent(link);
          if (pageContent && pageContent.length > 200) {
            rawText = `${title}\n\n${pageContent}`;
          }
        }

        return {
          source:    'rss',
          sourceUrl: link || feed.url,
          rawText:   rawText.substring(0, 4000),
          priority:  feed.priority,
        };
      });

      const batch = await Promise.allSettled(fetchTasks);
      for (const r of batch) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
      }
    } catch { /* skip */ }
  }
  return results;
}

// ── Hash خام للنص (dedup سريع من نفس المصدر) ──
function discoveryHash(text) {
  let h = 0;
  for (let i = 0; i < Math.min(text.length, 120); i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// ── Hash دلالي من البيانات المحللة (dedup قوي عبر المصادر) ──
function semanticHash(job) {
  const norm = s => (s || '').trim().toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^؀-ۿa-z0-9]/g, '');
  const key = [
    norm(job.title   || '').substring(0, 25),
    norm(job.phone   || '').substring(0, 12),
    norm(job.company || '').substring(0, 20),
  ].filter(Boolean).join('|');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (Math.imul(31, h) + key.charCodeAt(i)) | 0;
  return 'sem_' + Math.abs(h).toString(36);
}

// ── فحص وجود hash في collection معينة ──
async function _hashExists(collection, field, value) {
  try {
    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: collection }],
            where: { fieldFilter: { field: { fieldPath: field }, op: 'EQUAL', value: { stringValue: value } } },
            limit: 1,
          },
        }),
      }
    );
    if (!res.ok) return false;
    const data = await res.json();
    return (data || []).some(r => r.document);
  } catch { return false; }
}

async function parseAndSaveDiscovery(item, env) {
  if (!env.GEMINI_KEY || !item.rawText || item.rawText.length < 30) return false;

  // ① Dedup سريع بـ hash النص الخام (يمنع نفس المنشور من نفس المصدر)
  const rawHash = discoveryHash(item.rawText);
  if (await _hashExists('telegram_queue', 'dedupeHash', rawHash)) return false;

  // Parse + score with Gemini
  const result = await callGeminiWithRetry(buildJobParsePrompt(item.rawText, true), env.GEMINI_KEY, 1200, 2, env);
  if (!result.ok) return false;

  const stripped = result.rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const fi = stripped.indexOf('{'), li = stripped.lastIndexOf('}');
  if (fi === -1 || li <= fi) return false;

  let parsed;
  try { parsed = JSON.parse(stripped.slice(fi, li + 1)); }
  catch { return false; }

  if (parsed.notJob || !parsed.title) return false;

  // ② Dedup دلالي بعد التحليل — يمنع نفس الوظيفة من مصادر مختلفة
  const semHash = semanticHash(parsed);
  // فحص في قائمة الانتظار
  if (await _hashExists('telegram_queue', 'semanticHash', semHash)) return false;
  // فحص في الوظائف المنشورة
  if (await _hashExists('jobs', 'semanticHash', semHash)) return false;

  // الوظائف المحلية (عراقية) تحصل على دفعة +2 في الدرجة
  const baseScore  = Number(parsed.score) || 5;
  const localBoost = (item.priority === 'local' || parsed.province) ? 2 : 0;
  const score      = Math.min(10, baseScore + localBoost);
  // عتبة الجودة: محلية ≥ 3، إقليمية ≥ 4
  const minScore = (item.priority === 'local') ? 3 : 4;
  if (baseScore < minScore) return false;

  // Auth
  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }
  );
  const { idToken } = await authRes.json();
  if (!idToken) return false;

  const jobData = {
    title:        parsed.title     || '',
    company:      parsed.company   || '',
    province:     parsed.province  || '',
    type:         parsed.type      || 'full',
    cat:          parsed.cat       || 'other',
    salary:       Number(parsed.salary) || 0,
    currency:     parsed.currency  || 'IQD',
    commission:   parsed.commission || '',
    exp:          parsed.exp       || 'none',
    desc:         parsed.desc      || '',
    phone:        parsed.phone     || '',
    reqs:         Array.isArray(parsed.reqs) ? parsed.reqs : [],
    bens:         Array.isArray(parsed.bens) ? parsed.bens : [],
    logo:         (parsed.company || '?').charAt(0),
    source:       item.source,
    sourceUrl:    item.sourceUrl   || '',
    score,
    postedByType: 'discovered',
    dedupeHash:   rawHash,
    semanticHash: semHash,
    applicants:   0,
    postedAt:     new Date().toISOString(),
  };

  // وظائف عالية الجودة (score ≥ 7) → نشر تلقائي فوري على تيليجرام + jobs collection
  if (score >= 7 && env.TELEGRAM_TOKEN) {
    const pubRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/jobs`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body:    JSON.stringify({ fields: buildFsFields({ ...jobData, status: 'active' }) }),
      }
    );
    if (pubRes.ok) {
      const newDoc   = await pubRes.json();
      const newJobId = newDoc.name?.split('/').pop() || null;
      const tgChan   = env.TG_CHANNEL_ID || '@afraiq_jobs';
      const imgUrl   = await generateJobCardImage({ ...jobData, id: newJobId }, env).catch(() => null);
      await postToTelegram({ ...jobData, id: newJobId }, env.TELEGRAM_TOKEN, tgChan, imgUrl || TG_FALLBACK_IMG);
      console.log(`[discovery] Auto-published "${jobData.title}" (score ${score}) → Telegram`);
      return true;
    }
  }

  // وظائف متوسطة الجودة (score 4-6) → قائمة انتظار للمراجعة اليدوية
  const saveRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/telegram_queue`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body:    JSON.stringify({ fields: buildFsFields({ ...jobData, status: 'pending_telegram' }) }),
    }
  );
  return saveRes.ok;
}

// ── GET /discoveries → pending discovered jobs from telegram_queue ──
async function handleGetDiscoveries(env) {
  try {
    // Need auth token — Firestore rules require it for telegram_queue
    const authRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }
    );
    const { idToken } = await authRes.json();
    if (!idToken) return json({ error: 'Auth failed' }, 500);

    const res = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body: JSON.stringify({
          structuredQuery: {
            from:  [{ collectionId: 'telegram_queue' }],
            where: { fieldFilter: { field: { fieldPath: 'postedByType' }, op: 'EQUAL', value: { stringValue: 'discovered' } } },
            limit: 30,
          },
        }),
      }
    );
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return json({ error: 'Firestore error', detail: errText.substring(0, 200) }, 500);
    }
    const data = await res.json();
    const jobs = (data || [])
      .filter(r => r.document)
      .map(r => {
        const f  = r.document.fields || {};
        const id = r.document.name.split('/').pop();
        return {
          id,
          title:        f.title?.stringValue       || '',
          company:      f.company?.stringValue     || '',
          province:     f.province?.stringValue    || '',
          type:         f.type?.stringValue         || '',
          cat:          f.cat?.stringValue          || '',
          salary:       Number(f.salary?.doubleValue || f.salary?.integerValue || 0),
          commission:   f.commission?.stringValue   || '',
          exp:          f.exp?.stringValue          || '',
          desc:         f.desc?.stringValue         || '',
          phone:        f.phone?.stringValue        || '',
          source:       f.source?.stringValue       || '',
          sourceUrl:    f.sourceUrl?.stringValue    || '',
          score:        Number(f.score?.doubleValue || f.score?.integerValue || 0),
          postedAt:     f.postedAt?.stringValue     || '',
        };
      })
      .sort((a, b) => b.score - a.score);
    return json({ jobs, total: jobs.length });
  } catch (e) { return json({ error: e.message }, 500); }
}

// ── POST /discoveries/:id/approve → reuse publishTgJob (telegram_queue → jobs) ──
async function handleApproveDiscovery(id) {
  const jobId = await publishTgJob(id);
  return jobId
    ? json({ ok: true, jobId })
    : json({ error: 'Failed to publish' }, 500);
}

// ── POST /discoveries/:id/reject → reuse deleteTgJob ──
async function handleRejectDiscovery(id) {
  await deleteTgJob(id);
  return json({ ok: true });
}

function buildFsFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'string')       fields[k] = { stringValue: v };
    else if (typeof v === 'number')  fields[k] = { doubleValue: v };
    else if (typeof v === 'boolean') fields[k] = { booleanValue: v };
    else if (Array.isArray(v))       fields[k] = { arrayValue: { values: v.map(s => ({ stringValue: String(s) })) } };
  }
  return fields;
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
