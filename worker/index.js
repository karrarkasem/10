// ╔══════════════════════════════════════════════════════╗
// ║  Afra AI — Cloudflare Worker                        ║
// ║  1. Gemini Proxy (POST /)                           ║
// ║  2. WhatsApp OG Preview (GET /job/:id)              ║
// ║  3. AI Job Parser (POST /parse-job)                 ║
// ║  4. Telegram Bot Webhook (POST /telegram)           ║
// ║  5. Social Media Publish (POST /social-publish)     ║
// ║  6. Cron: process scheduled social posts            ║
// ╚══════════════════════════════════════════════════════╝

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
  "address": "العنوان التفصيلي إن وُجد أو فارغ"
}`;
}
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

    // ── POST / → Gemini Proxy ──
    if (request.method === 'POST') {
      return handleGemini(request, env);
    }

    return json({ error: 'Not found' }, 404);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(processScheduledPosts(env));
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
// Social Media Publishing
// ═══════════════════════════════════════════════
const TYP_AR = { full: 'دوام كامل', part: 'دوام جزئي', remote: 'عن بُعد', gig: 'مهمة حرة' };
const EXP_AR = { none: 'بدون خبرة', no: 'بدون خبرة', '1-2': '1-2 سنة', '3-5': '3-5 سنوات', '5+': 'أكثر من 5 سنوات' };

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
    id:       jobId,
    title:    f.title?.stringValue    || '',
    company:  f.company?.stringValue  || '',
    province: f.province?.stringValue || '',
    type:     f.type?.stringValue     || '',
    salary:   parseFloat(f.salary?.doubleValue || f.salary?.integerValue || 0) || 0,
    currency: f.currency?.stringValue || 'IQD',
    exp:      f.exp?.stringValue      || '',
    desc:     f.desc?.stringValue     || '',
  };
}

async function postToTelegram(job, token, channelId) {
  if (!token) return { ok: false, error: 'Token not configured' };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id:      channelId,
        text:         buildSocialText(job, 'tg'),
        parse_mode:   'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '📝 قدّم الآن', url: `${SITE_URL}/#job/${job.id}` }]] },
      }),
    });
    const d = await res.json();
    return { ok: d.ok, messageId: d.result?.message_id, error: d.description };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function postToFacebook(job, token, pageId) {
  try {
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

async function postToInstagram(job, token, igId) {
  try {
    const createRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: OG_IMAGE, caption: buildSocialText(job, 'ig'), access_token: token }),
    });
    const created = await createRes.json();
    if (!created.id) return { ok: false, error: created.error?.message || 'Container creation failed' };

    const pubRes = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: created.id, access_token: token }),
    });
    const pub = await pubRes.json();
    return { ok: !pub.error, postId: pub.id, error: pub.error?.message };
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
  const results = {};
  if (platforms.includes('tg'))                                               results.tg = await postToTelegram(job, env.TELEGRAM_TOKEN, tgChan);
  if (platforms.includes('fb') && env.FB_PAGE_TOKEN && env.FB_PAGE_ID)       results.fb = await postToFacebook(job, env.FB_PAGE_TOKEN, env.FB_PAGE_ID);
  if (platforms.includes('ig') && env.FB_PAGE_TOKEN && env.IG_ACCOUNT_ID)    results.ig = await postToInstagram(job, env.FB_PAGE_TOKEN, env.IG_ACCOUNT_ID);

  await logSocialPost(jobId, platforms, results);
  return json({ results });
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
        if (platforms.includes('tg'))                                             await postToTelegram(job, env.TELEGRAM_TOKEN, tgChan);
        if (platforms.includes('fb') && env.FB_PAGE_TOKEN && env.FB_PAGE_ID)     await postToFacebook(job, env.FB_PAGE_TOKEN, env.FB_PAGE_ID);
        if (platforms.includes('ig') && env.FB_PAGE_TOKEN && env.IG_ACCOUNT_ID)  await postToInstagram(job, env.FB_PAGE_TOKEN, env.IG_ACCOUNT_ID);
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
