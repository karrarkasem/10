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
async function callGeminiWithRetry(prompt, geminiKey, maxTokens = 3000, retries = 3) {
  const models = [GEMINI_MODEL, GEMINI_MODEL_BACKUP];
  let lastErr = null;

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

        // 503 = مشغول → انتظر وأعد المحاولة
        if (res.status === 503) {
          lastErr = `503 UNAVAILABLE (${model} attempt ${attempt})`;
          if (attempt < retries) await new Promise(r => setTimeout(r, attempt * 1500));
          continue;
        }

        // أي خطأ آخر من API
        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          return { ok: false, status: res.status, error: errBody, model };
        }

        const data    = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { ok: true, rawText, model };

      } catch (e) {
        lastErr = e.message;
        if (attempt < retries) await new Promise(r => setTimeout(r, attempt * 1000));
      }
    }
    // فشل الموديل الأول → جرّب الاحتياطي
  }

  return { ok: false, status: 503, error: lastErr || 'All retries exhausted' };
}

// ── Prompt مشترك لتحليل إعلانات الوظائف ──
function buildJobParsePrompt(text, allowNotJob = false) {
  return `أنت خبير متخصص في تحليل إعلانات الوظائف العراقية من مصادر متعددة (تلغرام، فيسبوك، واتساب).
${allowNotJob ? 'إذا لم يكن النص إعلان وظيفة أرجع {"notJob":true} فقط.' : ''}

قواعد الاستخراج الذكي:
1. **المحافظة**: استنتجها من أي إشارة جغرافية:
   - أسماء المناطق: (المنصور/الكرادة/الكاظمية/الأعظمية/الجادرية/العلاوي/الشعب/الحرية/الدورة/الزعفرانية/الصدر/بغداد الجديدة/النهروان = بغداد)
   - (كربلاء/الحسينية/الطف = كربلاء)، (النجف/الكوفة/المشخاب = النجف)
   - (البصرة/العشار/أبو الخصيب/الزبير/الفاو = البصرة)
   - (الموصل/نينوى/تلعفر = نينوى)، (أربيل/هولير = أربيل)
   - (السليمانية/سليمانية = السليمانية)، (دهوك = دهوك)، (كركوك = كركوك)
   - (بابل/الحلة/المسيب = بابل)، (ذي قار/الناصرية = ذي قار)
   - (ميسان/العمارة = ميسان)، (الديوانية/القادسية = القادسية)
   - (الكوت/واسط = واسط)، (السماوة/المثنى = المثنى)
   - (الرمادي/الأنبار/الفلوجة = الأنبار)، (تكريت/صلاح الدين = صلاح الدين)
   - (بعقوبة/ديالى = ديالى)
   - إذا لم تُذكر أي منطقة اتركها فارغة ""

2. **الراتب**: حوّل كل صيغ الراتب العراقية لأرقام بالدينار:
   - أرقام مفردة بدون وحدة (100-999): في العراق تعني دائماً آلاف → "400" = 400000، "700" = 700000، "250" = 250000
   - أرقام مفردة (1-99): قد تعني ألف مضروب → "50" في سياق راتب = 50000
   - "500 الف / 500,000 / نص مليون / 0.5 مليون" → 500000
   - "مليون" → 1000000، "مليون ونص" → 1500000، "مليونين" → 2000000
   - "مليون و500" → 1500000، "مليون و200" → 1200000
   - إذا ذُكر بالدولار ($ أو دولار) → ضع الرقم و currency:"USD"
   - "بالاتفاق / يُحدد / حسب الخبرة / تنافسي" → null
   - إذا كان العمل على القطعة أو نسبة مبيعات أو حافز → salary: null واستخرج تفاصيلها في حقل commission

3. **الحافز أو النسبة (commission)**:
   - "على القطعة / نسبة / حافز / عمولة / حسب البيع / بالقطع" → استخرج وصفاً موجزاً
   - مثال: "راتب + 5% من المبيعات" → commission: "5% من المبيعات"
   - مثال: "العمل على القطعة" → commission: "على القطعة"
   - إذا لا يوجد → commission: null

4. **المسمى الوظيفي**: استخرجه بدقة، لا تضيف كلمات مثل "مطلوب" أو "وظيفة"
   - "مطلوب مبرمج" → title: "مبرمج"
   - "نحن نوظّف محاسب" → title: "محاسب"

5. **نوع الدوام**:
   - دوام كامل/صباحي/مسائي/يومي = "full"
   - جزئي/ساعات/بارتايم = "part"
   - عن بُعد/أونلاين/ريموت/من البيت = "remote"
   - مشروع/مهمة/فريلانس/مستقل = "gig"
   - "حضوري أو أونلاين" → "part"

6. **المهارات**: استخرجها من المتطلبات كقائمة نظيفة

7. **التصنيف**:
   - تقنية/برمجة/IT/حاسوب/شبكات = "tech"
   - محاسبة/مالية/أعمال/تسويق/مبيعات/إدارة = "biz"
   - طب/صيدلة/تمريض/مستشفى/عيادة = "med"
   - تعليم/تدريس/مدرّس/أكاديمي = "edu"
   - هندسة/كهرباء/ميكانيك/مدني/معماري = "eng"
   - باقي المهن = "other"

النص المراد تحليله:
"""
${text.substring(0, 4000)}
"""

أرجع JSON فقط بدون أي نص أو markdown:
{
  ${allowNotJob ? '"notJob": false,' : ''}
  "title": "المسمى الوظيفي المختصر",
  "company": "اسم الشركة أو المحل أو الجهة (فارغ إذا غير مذكور)",
  "province": "المحافظة (من القائمة أعلاه فقط أو فارغ)",
  "type": "full أو part أو remote أو gig",
  "cat": "tech أو biz أو med أو edu أو eng أو other",
  "salary": رقم_بالدينار_أو_null,
  "salaryMax": رقم_الحد_الأعلى_أو_null,
  "currency": "IQD أو USD",
  "commission": "وصف مختصر للحافز أو النسبة أو القطعة أو null",
  "exp": "none أو 1-2 أو 3-5 أو 5+",
  "gender": "any أو male أو female",
  "desc": "وصف الوظيفة والمهام كاملاً",
  "reqs": ["كل متطلب على حدة"],
  "bens": ["المزايا والحوافز"],
  "skills": ["مهارة1", "مهارة2"],
  "phone": "رقم الهاتف بدون مسافات أو فارغ",
  "telegram": "معرف تلغرام بدون @ أو فارغ",
  "address": "العنوان التفصيلي إن وُجد أو فارغ",
  "score": 7
}
ملاحظة score: 1-3 ناقص جداً، 4-6 معقول، 7-10 مكتمل ومفصّل`;
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

    // ── POST / → Gemini Proxy ──
    if (request.method === 'POST') {
      return handleGemini(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(processScheduledPosts(env));
    // Run job discovery every 6 hours (at 00:00, 06:00, 12:00, 18:00 UTC)
    const h = new Date(event.scheduledTime || Date.now()).getUTCHours();
    if (h % 6 === 0) ctx.waitUntil(discoverJobs(env));
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

  const result = await callGeminiWithRetry(prompt, env.GEMINI_KEY);
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
async function handleTelegram(request, env) {
  let update;
  try { update = await request.json(); }
  catch { return new Response('ok'); }

  const token     = env.TELEGRAM_TOKEN;
  const adminChat = env.TELEGRAM_ADMIN_CHAT;
  if (!token || !adminChat) return new Response('ok');

  const msg = update.message || update.channel_post;
  if (msg?.text && msg.text.length >= 60) {
    await processTgJob(msg.text, token, adminChat, env);
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
    const result = await callGeminiWithRetry(prompt, env.GEMINI_KEY);
    if (!result.ok) {
      await tgSend(token, adminChat, `❌ Gemini خطأ ${result.status}\n${String(result.error).substring(0, 200)}`);
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
      const ok = await publishTgJob(data.slice(4));
      await tgAnswer(token, id, ok ? '✅ تم النشر على المنصة!' : '❌ فشل النشر، جرّب من لوحة الأدمن');
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
    const { idToken } = await authRes.json();
    if (!idToken) return false;

    const getRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/telegram_queue/${docId}?key=${FIREBASE_KEY}`
    );
    if (!getRes.ok) return false;
    const doc    = await getRes.json();
    const fields = { ...doc.fields };
    fields.status   = { stringValue: 'active' };
    fields.postedAt = { timestampValue: new Date().toISOString() };

    const addRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/jobs`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
        body:    JSON.stringify({ fields }),
      }
    );
    if (!addRes.ok) return false;
    await deleteTgJob(docId);
    return true;
  } catch (e) {
    console.error('publishTgJob:', e);
    return false;
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

const DISCOVERY_QUERIES = [
  'وظائف شاغرة العراق',
  'مطلوب موظف بغداد',
  'وظيفة شاغرة الموصل البصرة',
  'job vacancy Iraq Baghdad 2025',
  'site:facebook.com وظيفة العراق',
];

const RSS_FEEDS = [
  'https://www.bayt.com/en/iraq/jobs/?format=rss',
  'https://www.wuzzuf.net/search/jobs/?q=&l=iraq&format=rss',
];

async function discoverJobs(env) {
  const items = [];

  if (env.GOOGLE_CSE_KEY && env.GOOGLE_CSE_ID) {
    try { items.push(...await discoverViaGoogle(env)); }
    catch (e) { console.error('[discovery] Google error:', e.message); }
  }

  try { items.push(...await discoverViaRSS()); }
  catch (e) { console.error('[discovery] RSS error:', e.message); }

  console.log(`[discovery] Processing ${items.length} raw items`);
  let saved = 0;
  for (const item of items) {
    try { if (await parseAndSaveDiscovery(item, env)) saved++; }
    catch (e) { console.error('[discovery] parse error:', e.message); }
  }
  console.log(`[discovery] Saved ${saved} new jobs to review queue`);
}

async function discoverViaGoogle(env) {
  const results = [];
  const selected = [...DISCOVERY_QUERIES].sort(() => Math.random() - 0.5).slice(0, 2);
  for (const q of selected) {
    try {
      const url = `https://www.googleapis.com/customsearch/v1?key=${env.GOOGLE_CSE_KEY}&cx=${env.GOOGLE_CSE_ID}&q=${encodeURIComponent(q)}&num=10&dateRestrict=d2&gl=iq&hl=ar`;
      const res  = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of data.items || []) {
        results.push({ source: 'google', sourceUrl: item.link, rawText: `${item.title}\n\n${item.snippet || ''}`.trim() });
      }
    } catch { /* skip */ }
  }
  return results;
}

async function discoverViaRSS() {
  const results = [];
  for (const feedUrl of RSS_FEEDS) {
    try {
      const res = await fetch(feedUrl, { headers: { Accept: 'application/rss+xml, text/xml, */*' }, cf: { cacheTtl: 3600 } });
      if (!res.ok) continue;
      const xml   = await res.text();
      const items = xml.match(/<item[^>]*>([\s\S]*?)<\/item>/gi) || [];
      for (const item of items.slice(0, 8)) {
        const getTag = tag => {
          const m = item.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`, 'i'));
          return (m?.[1] || m?.[2] || '').trim();
        };
        const title = getTag('title');
        const desc  = getTag('description').replace(/<[^>]+>/g, '').trim();
        const link  = getTag('link');
        if (!title) continue;
        results.push({ source: 'rss', sourceUrl: link || feedUrl, rawText: `${title}\n\n${desc}`.substring(0, 2000) });
      }
    } catch { /* skip */ }
  }
  return results;
}

function discoveryHash(text) {
  let h = 0;
  for (let i = 0; i < Math.min(text.length, 120); i++) {
    h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

async function parseAndSaveDiscovery(item, env) {
  if (!env.GEMINI_KEY || !item.rawText || item.rawText.length < 30) return false;

  const hash = discoveryHash(item.rawText);

  // Dedup check — skip if already in telegram_queue with this hash
  const dupCheck = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery?key=${FIREBASE_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'telegram_queue' }],
          where: { fieldFilter: { field: { fieldPath: 'dedupeHash' }, op: 'EQUAL', value: { stringValue: hash } } },
          limit: 1,
        },
      }),
    }
  );
  if (dupCheck.ok) {
    const dupData = await dupCheck.json();
    if ((dupData || []).some(r => r.document)) return false;
  }

  // Parse + score with Gemini
  const result = await callGeminiWithRetry(buildJobParsePrompt(item.rawText, true), env.GEMINI_KEY, 1200);
  if (!result.ok) return false;

  const stripped = result.rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const fi = stripped.indexOf('{'), li = stripped.lastIndexOf('}');
  if (fi === -1 || li <= fi) return false;

  let parsed;
  try { parsed = JSON.parse(stripped.slice(fi, li + 1)); }
  catch { return false; }

  if (parsed.notJob || !parsed.title) return false;
  const score = Number(parsed.score) || 5;
  if (score < 4) return false; // Skip very low quality

  // Auth + save
  const authRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) }
  );
  const { idToken } = await authRes.json();
  if (!idToken) return false;

  // Save to telegram_queue (has correct Firestore rules for anonymous auth)
  const fields = buildFsFields({
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
    status:       'pending_telegram',
    postedByType: 'discovered',
    dedupeHash:   hash,
    applicants:   0,
    postedAt:     new Date().toISOString(),
  });

  const saveRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/telegram_queue`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` }, body: JSON.stringify({ fields }) }
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
  const ok = await publishTgJob(id);
  return ok ? json({ ok: true }) : json({ error: 'Failed to publish' }, 500);
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
