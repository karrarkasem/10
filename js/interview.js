// ╔══════════════════════════════════════════════════════╗
// ║  عفراء للتوظيف — interview.js                       ║
// ║  المقابلة الذكية — Gemini AI حقيقي                  ║
// ╚══════════════════════════════════════════════════════╝

let ivSpec    = null;
let ivCount   = 0;
let ivScore   = 0;
let ivHistory = [];
let ivWaiting = false;

const SPECS = [
  { id:'tech', l:'تقنية / برمجة',  i:'💻' },
  { id:'biz',  l:'أعمال / مبيعات', i:'📊' },
  { id:'med',  l:'طب / صحة',       i:'🏥' },
  { id:'edu',  l:'تعليم / تدريس',  i:'📚' },
  { id:'eng',  l:'هندسة',           i:'⚙️' },
  { id:'acc',  l:'محاسبة / مالية', i:'💰' },
];

const QS = {
  tech: ['أخبرني عن مشروع تقني نفّذته بشكل كامل.','ما هي تقنياتك المفضلة وما السبب؟','كيف تتعامل مع الـ legacy code؟','ما الفرق بين REST وGraphQL؟','كيف تضمن جودة الكود الذي تكتبه؟'],
  biz:  ['كيف تتعامل مع عميل رافض؟','أخبرني عن صفقة نجحت في إتمامها.','ما أسلوبك في المفاوضة؟','كيف تبني علاقات طويلة الأمد مع العملاء؟','كيف تحدد أولويات يومك؟'],
  med:  ['كيف تتعامل مع حالة طوارئ؟','أخبرني عن أصعب حالة طبية مررت بها.','كيف تتواصل مع مريض مضطرب؟','ما أهمية التعلم المستمر في مجالك؟','كيف تتعامل مع أسرة المريض؟'],
  edu:  ['كيف تجذب انتباه الطلاب؟','كيف تتعامل مع طالب متأخر في الفهم؟','ما طريقتك في الشرح؟','كيف تقيّم مستوى طلابك؟','كيف تطور محتواك التعليمي؟'],
  eng:  ['أخبرني عن مشروع هندسي تفخر به.','كيف تتعامل مع خلاف تقني مع زميل؟','ما معاييرك في ضمان الجودة؟','كيف تدير مشروعاً بميزانية محدودة؟','ما أحدث تقنية تعلمتها؟'],
  acc:  ['كيف تضمن دقة التقارير المالية؟','أخبرني عن خطأ محاسبي اكتشفته.','كيف تتعامل مع ضغط نهاية الفترة المالية؟','ما معرفتك بمعايير IFRS؟','كيف تشرح رقماً مالياً لغير المتخصص؟'],
};

// تقييم الإجابة بـ Gemini AI أو fallback محلي
async function evaluateAnswer(question, answer, spec) {
  // محاولة Gemini أولاً
  const prompt = `أنت محاور وظيفي خبير متخصص في مجال "${spec}".
السؤال: ${question}
إجابة المرشح: ${answer}

قيّم الإجابة بالعربية بالشكل التالي (حرفياً):
SCORE: [رقم من 1 إلى 5]
FEEDBACK: [جملة أو جملتان: ما أجاد فيه المرشح + نقطة تحسين واحدة]
TIP: [نصيحة عملية قصيرة لإجابة أفضل]`;

  const aiRes = await callGemini(prompt);
  if (aiRes) {
    const scoreMatch   = aiRes.match(/SCORE:\s*([1-5])/);
    const feedMatch    = aiRes.match(/FEEDBACK:\s*(.+?)(?=TIP:|$)/s);
    const tipMatch     = aiRes.match(/TIP:\s*(.+)/s);
    const score        = scoreMatch ? parseInt(scoreMatch[1]) : 3;
    const feedback     = feedMatch  ? feedMatch[1].trim() : aiRes.slice(0, 150);
    const tip          = tipMatch   ? tipMatch[1].trim() : '';
    return { score, feedback, tip, isAI: true };
  }

  // fallback محلي إذا لم يتوفر مفتاح Gemini
  const len = answer.trim().length;
  const score = len > 200 ? 5 : len > 120 ? 4 : len > 60 ? 3 : len > 20 ? 2 : 1;
  const feedbacks = {
    5: 'إجابة ممتازة وشاملة! تعكس خبرة حقيقية وتفكيراً منهجياً.',
    4: 'إجابة جيدة جداً. حاول إضافة مثال عملي من تجربتك.',
    3: 'إجابة مقبولة. يمكن تطويرها بتفاصيل أكثر وأمثلة محددة.',
    2: 'الإجابة مختصرة جداً. وسّع في الشرح واذكر موقفاً حقيقياً.',
    1: 'حاول الإجابة بشكل أكثر تفصيلاً وارتباطاً بالسؤال.',
  };
  return { score, feedback: feedbacks[score], tip: 'استخدم أسلوب STAR: الموقف، المهمة، الإجراء، النتيجة.', isAI: false };
}

function buildIVModal() {
  const uid      = U?.uid;
  const attempts = uid ? parseInt(localStorage.getItem('iv_attempts_' + uid) || '0') : 0;
  const lastScore = uid ? parseInt(localStorage.getItem('iv_last_score_' + uid) || '0') : 0;

  // محاولتان استُنفدتا
  if (uid && attempts >= 2) {
    document.getElementById('moIVB').innerHTML = `
      <div style="text-align:center;padding:30px 20px">
        <div style="font-size:56px;margin-bottom:12px">🏁</div>
        <div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:8px">انتهت محاولاتك</div>
        <div style="font-size:13px;color:var(--tx2);line-height:1.8;margin-bottom:16px">
          لقد استخدمت المحاولتين المتاحتين للمقابلة الذكية.<br>
          درجتك المحفوظة: <strong style="color:var(--p);font-size:18px">${lastScore}%</strong>
        </div>
        <div style="padding:12px 16px;background:rgba(139,92,246,.08);border-radius:12px;border:1px solid rgba(139,92,246,.2);font-size:12px;color:var(--tx2)">
          <i class="fas fa-info-circle" style="color:var(--purple)"></i>
          درجة مقابلتك مرفقة تلقائياً مع طلبات التوظيف الخاصة بك.
        </div>
      </div>`;
    return;
  }

  // محاولة واحدة أُجريت ودرجتها >= 60 → لا حاجة للإعادة
  if (uid && attempts === 1 && lastScore >= 60) {
    document.getElementById('moIVB').innerHTML = `
      <div style="text-align:center;padding:30px 20px">
        <div style="font-size:56px;margin-bottom:12px">✅</div>
        <div style="font-size:16px;font-weight:800;color:var(--tx);margin-bottom:8px">أنت مؤهّل!</div>
        <div style="font-size:13px;color:var(--tx2);line-height:1.8;margin-bottom:16px">
          حققت درجة <strong style="color:var(--success);font-size:20px">${lastScore}%</strong> في مقابلتك السابقة.<br>
          درجة جيدة — لا حاجة لإعادة المقابلة.
        </div>
        <div style="padding:12px 16px;background:rgba(34,197,94,.08);border-radius:12px;border:1px solid rgba(34,197,94,.2);font-size:12px;color:var(--tx2)">
          <i class="fas fa-check-circle" style="color:var(--success)"></i>
          درجتك مرفقة تلقائياً مع جميع طلبات التوظيف.
        </div>
      </div>`;
    return;
  }

  // محاولة واحدة أُجريت ودرجتها < 60 → يُسمح بإعادة واحدة
  const retryBanner = (uid && attempts === 1 && lastScore < 60) ? `
    <div style="margin-bottom:14px;padding:10px 14px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.25);border-radius:10px;font-size:12px;color:var(--danger)">
      <i class="fas fa-redo"></i>
      درجتك السابقة: <strong>${lastScore}%</strong> — هذه محاولتك الأخيرة المتاحة.
    </div>` : '';

  document.getElementById('moIVB').innerHTML = `
    <div id="ivPicker">
      <div style="text-align:center;margin-bottom:18px">
        <div style="width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,var(--purple),#a78bfa);display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 10px;box-shadow:0 6px 20px rgba(139,92,246,.3)">🤖</div>
        <div style="font-size:15px;font-weight:800;color:var(--tx);margin-bottom:4px">المقابلة الذكية بالـ AI</div>
        <div style="font-size:12px;color:var(--tx2)">اختر تخصصك — 5 أسئلة مع تقييم حقيقي بالذكاء الاصطناعي</div>
        ${!isAIReady() ? `
        <div style="margin-top:10px;padding:8px 14px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:8px;font-size:11px;color:var(--acc)">
          <i class="fas fa-info-circle"></i> وضع تجريبي — أضف مفتاح Gemini API لتقييم AI حقيقي
          <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--p);font-weight:700;margin-right:5px">احصل عليه مجاناً</a>
        </div>` : `
        <div style="margin-top:10px;padding:8px 14px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:8px;font-size:11px;color:var(--success)">
          <i class="fas fa-check-circle"></i> متصل بـ Gemini AI — تقييم ذكي حقيقي مفعّل
        </div>`}
      </div>
      ${retryBanner}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${SPECS.map(s => `
          <div style="padding:16px 10px;border:2px solid var(--br);border-radius:13px;cursor:pointer;text-align:center;transition:all .22s;background:var(--bgc2)"
            onmouseenter="this.style.borderColor='var(--purple)';this.style.background='rgba(139,92,246,.07)';this.style.transform='translateY(-2px)'"
            onmouseleave="this.style.borderColor='var(--br)';this.style.background='var(--bgc2)';this.style.transform=''"
            onclick="startIV('${s.id}','${s.l}')">
            <div style="font-size:28px;margin-bottom:6px">${s.i}</div>
            <div style="font-size:11px;font-weight:800;color:var(--tx)">${s.l}</div>
          </div>`).join('')}
      </div>
    </div>
    <div id="ivChat" style="display:none"></div>`;
}

function startIV(sid, slabel) {
  ivSpec    = { id: sid, l: slabel };
  ivCount   = 0;
  ivScore   = 0;
  ivHistory = [];
  ivWaiting = false;

  document.getElementById('ivPicker').style.display = 'none';
  const chat = document.getElementById('ivChat');
  chat.style.display = 'block';
  chat.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(135deg,var(--pd),var(--p));border-radius:13px;color:#fff;margin-bottom:14px">
      <span style="font-size:22px">🤖</span>
      <div>
        <div style="font-size:13px;font-weight:800">مقابلة ذكية — ${san(slabel)}</div>
        <div style="font-size:11px;opacity:.65">5 أسئلة + تقييم AI حقيقي</div>
      </div>
    </div>
    <div id="ivMsgs" style="min-height:180px;max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:9px;margin-bottom:12px;padding:2px"></div>
    <div style="display:flex;gap:7px">
      <textarea id="ivAns" class="fc" rows="2" placeholder="اكتب إجابتك هنا... (Ctrl+Enter للإرسال)" onkeydown="if(event.ctrlKey&&event.key==='Enter')sendIVAns()"></textarea>
      <button class="btn bp" id="ivSendBtn" onclick="sendIVAns()"><i class="fas fa-paper-plane"></i></button>
    </div>
    <div style="margin-top:9px">
      <div style="display:flex;justify-content:space-between;margin-bottom:3px">
        <span style="font-size:11px;color:var(--tx3)">التقدم</span>
        <span style="font-size:11px;font-weight:700;color:var(--tx)" id="ivProg">0/5</span>
      </div>
      <div class="pb"><div class="pf" id="ivBar" style="width:0%"></div></div>
    </div>`;
  askIV(true);
}

function ivMsg(type, text, extra = null) {
  const el    = document.getElementById('ivMsgs');
  if (!el) return;
  const isBot = type === 'bot';
  const d     = document.createElement('div');
  d.style.cssText = `display:flex;gap:7px;justify-content:${isBot ? 'flex-start' : 'flex-end'}`;
  d.innerHTML = `
    ${isBot ? `<div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--pl));display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">🤖</div>` : ''}
    <div class="iv-bubble ${isBot ? 'bot' : 'user'}">
      ${text}
      ${extra ? `<div class="iv-score">${extra}</div>` : ''}
    </div>`;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
}

function ivTyping() {
  const el = document.getElementById('ivMsgs');
  if (!el) return null;
  const d = document.createElement('div');
  d.id = 'ivTyping';
  d.style.cssText = 'display:flex;gap:7px;align-items:flex-start';
  d.innerHTML = `
    <div style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--pl));display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">🤖</div>
    <div class="iv-bubble bot" style="padding:10px 14px">
      <span style="display:flex;gap:4px;align-items:center">
        <span style="width:7px;height:7px;border-radius:50%;background:var(--p);animation:blink 1s infinite"></span>
        <span style="width:7px;height:7px;border-radius:50%;background:var(--p);animation:blink 1s .2s infinite"></span>
        <span style="width:7px;height:7px;border-radius:50%;background:var(--p);animation:blink 1s .4s infinite"></span>
      </span>
    </div>`;
  el.appendChild(d);
  el.scrollTop = el.scrollHeight;
  return d;
}

function askIV(isFirst = false) {
  const qs = QS[ivSpec.id] || QS.tech;
  if (ivCount >= qs.length) { showIVResult(); return; }
  const prefix = isFirst
    ? `مرحباً! أنا مساعدك الذكي للمقابلات بتقنية AI. سأسألك 5 أسئلة وأقيّم إجاباتك بذكاء حقيقي.<br><br><strong>السؤال ${ivCount + 1}:</strong> `
    : `<strong>السؤال ${ivCount + 1}:</strong> `;
  ivMsg('bot', prefix + san(qs[ivCount]));
}

async function sendIVAns() {
  if (ivWaiting) return;
  const inp = document.getElementById('ivAns');
  const ans = inp?.value?.trim();
  if (!ans) return;
  inp.value = '';
  ivMsg('user', san(ans));

  const qs = QS[ivSpec.id] || QS.tech;
  const currentQ = qs[ivCount];
  ivHistory.push({ q: currentQ, a: ans });
  ivCount++;
  document.getElementById('ivProg').textContent = `${ivCount}/5`;
  document.getElementById('ivBar').style.width  = `${ivCount * 20}%`;

  // تعطيل الإدخال أثناء التقييم
  ivWaiting = true;
  if (inp) inp.disabled = true;
  const sendBtn = document.getElementById('ivSendBtn');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '<i class="fas fa-circle-notch spin"></i>'; }

  const typingEl = ivTyping();

  const result = await evaluateAnswer(currentQ, ans, ivSpec.l);

  if (typingEl) typingEl.remove();

  const stars   = '⭐'.repeat(result.score) + '☆'.repeat(5 - result.score);
  const aiLabel = result.isAI
    ? `<span style="font-size:10px;background:rgba(139,92,246,.15);color:var(--purple);padding:2px 7px;border-radius:10px;margin-right:5px"><i class="fas fa-robot"></i> Gemini AI</span>`
    : `<span style="font-size:10px;background:rgba(107,114,128,.1);color:var(--tx3);padding:2px 7px;border-radius:10px;margin-right:5px"><i class="fas fa-cog"></i> تقييم محلي</span>`;

  ivScore += result.score;
  ivMsg('bot',
    `${result.feedback}${result.tip ? `<br><br><span style="font-size:11px;color:var(--acc)"><i class="fas fa-lightbulb"></i> <strong>نصيحة:</strong> ${san(result.tip)}</span>` : ''}`,
    `${stars} (${result.score}/5) ${aiLabel}`
  );

  ivWaiting = false;
  if (inp) inp.disabled = false;
  if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>'; }

  setTimeout(() => {
    if (ivCount < qs.length) askIV();
    else showIVResult();
  }, 800);
}

async function showIVResult() {
  const total = Math.round((ivScore / (ivCount * 5)) * 100);
  const hasAI = isAIReady();

  // حفظ الدرجة وعدد المحاولات
  const uid = U?.uid;
  if (uid) {
    const prevAttempts = parseInt(localStorage.getItem('iv_attempts_' + uid) || '0');
    localStorage.setItem('iv_last_score_' + uid, total);
    localStorage.setItem('iv_attempts_' + uid, prevAttempts + 1);
    // حفظ الدرجة في وثيقة السيرة الذاتية بـ Firestore
    if (!DEMO && window.db) {
      window.db.collection('cvs').doc(uid).update({ ivScore: total }).catch(() => {});
    }
  }

  // ملخص AI للمقابلة كاملة
  let aiSummary = '';
  if (hasAI && ivHistory.length) {
    const typingEl = ivTyping();
    const historyText = ivHistory.map((h, i) => `س${i+1}: ${h.q}\nج: ${h.a}`).join('\n\n');
    const summaryPrompt = `بناءً على هذه المقابلة الوظيفية في مجال "${ivSpec.l}":\n${historyText}\n\nاكتب بالعربية:\n1. نقاط القوة الرئيسية للمرشح (جملتان)\n2. أهم 2 نقطة يجب تحسينها\n3. توصية نهائية (جملة واحدة)\nكن مباشراً ومفيداً.`;
    const summary = await callGemini(summaryPrompt);
    if (typingEl) typingEl.remove();
    if (summary) aiSummary = `<div style="margin-top:12px;padding:10px 14px;background:rgba(139,92,246,.07);border-radius:10px;border-right:3px solid var(--purple)">
      <div style="font-size:11px;font-weight:800;color:var(--purple);margin-bottom:6px"><i class="fas fa-robot"></i> تحليل AI الشامل</div>
      <div style="font-size:12px;color:var(--tx2);line-height:1.8;white-space:pre-line">${san(summary)}</div>
    </div>`;
  }

  const medal  = total >= 80 ? '🏆' : total >= 60 ? '✅' : '📚';
  const msg    = total >= 80 ? 'ممتاز! أنت مستعد للمقابلات الحقيقية'
               : total >= 60 ? 'جيد! تدرب أكثر على الإجابات المفصلة'
               : 'تحتاج مزيداً من التدريب والممارسة';

  const ansEl = document.getElementById('ivAns');
  const sendBtn = document.getElementById('ivSendBtn');
  if (ansEl) ansEl.disabled = true;
  if (sendBtn) sendBtn.disabled = true;

  ivMsg('bot', `
    <strong>${medal} انتهت المقابلة!</strong><br><br>
    <div style="text-align:center;padding:8px 0">
      <div style="font-size:38px;font-weight:900;color:var(--p)">${total}%</div>
      <div style="font-size:12px;color:var(--tx2);margin-top:3px">درجتك الإجمالية</div>
      <div style="margin-top:6px;font-size:13px;font-weight:700">${msg}</div>
    </div>
    ${aiSummary}
    <div style="margin-top:12px;text-align:center">
      <button class="btn bp bsm" onclick="buildIVModal()"><i class="fas fa-redo"></i>إعادة المقابلة</button>
    </div>`);
}
