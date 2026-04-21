// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس — الاختبار الذكي قبل التقديم              ║
// ╚══════════════════════════════════════════════════════╝

let QUIZ_JOB     = null;
let QUIZ_QUES    = [];
let QUIZ_ANSWERS = [];
let QUIZ_SCORE   = null;
let QUIZ_FB      = '';

// ── فتح الاختبار ──
function openQuiz(jobId) {
  if (!requireAuth('seeker')) return;
  const j = JOBS.find(x => x.id === jobId);
  if (!j) return;

  // تحقق من عدم التقديم مسبقاً
  if (MY_APPS.find(a => a.jobId === jobId)) {
    notify('تنبيه', 'لقد تقدمت لهذه الوظيفة مسبقاً', 'warning');
    return;
  }

  QUIZ_JOB     = j;
  QUIZ_QUES    = [];
  QUIZ_ANSWERS = [];
  QUIZ_SCORE   = null;
  QUIZ_FB      = '';

  const el = document.getElementById('moQuizB');
  if (!el) { openApply(jobId, null, ''); return; }

  el.innerHTML = `
    <div style="text-align:center;padding:24px 16px">
      <div style="font-size:48px;margin-bottom:14px">🤖</div>
      <div style="font-size:17px;font-weight:900;color:var(--tx);margin-bottom:6px">الاختبار الذكي</div>
      <div style="font-size:13px;color:var(--tx2);margin-bottom:4px">${san(j.title)} — ${san(j.company)}</div>
      <div class="al al-i" style="margin:16px 0;text-align:right">
        <i class="fas fa-info-circle"></i>
        <span>سيُقيّم الذكاء الاصطناعي إجاباتك ويُرسل نتيجتك مع طلبك. الاختبار 4 أسئلة فقط.</span>
      </div>
      <button class="btn bp bfu" onclick="generateQuiz('${jobId}')">
        <i class="fas fa-play"></i>ابدأ الاختبار
      </button>
      <div style="margin-top:10px">
        <button class="btn bo bfu" style="font-size:12px" onclick="cmo('moQuiz');openApply('${jobId}',null,'')">
          <i class="fas fa-forward"></i>تخطي والتقديم مباشرة
        </button>
      </div>
    </div>`;

  oMo('moQuiz');
}

// ── توليد الأسئلة ──
async function generateQuiz(jobId) {
  const j = QUIZ_JOB;
  if (!j) return;
  const el = document.getElementById('moQuizB');

  el.innerHTML = `
    <div style="text-align:center;padding:40px 20px">
      <div class="spin2" style="margin:0 auto 16px"></div>
      <div style="font-size:13px;color:var(--tx2)">الذكاء الاصطناعي يُعدّ الأسئلة...</div>
    </div>`;

  let qs = null;

  if (isAIReady()) {
    const prompt = `أنت خبير موارد بشرية. اكتب بالضبط 4 أسئلة مقابلة وظيفية قصيرة للوظيفة التالية:
الوظيفة: ${j.title}
الشركة: ${j.company}
المتطلبات: ${(j.reqs || []).slice(0, 5).join('، ')}

القواعد الصارمة:
- 4 أسئلة فقط، كل سؤال في سطر منفصل
- لا ترقيم، لا نقاط، لا تنسيق
- كل سؤال لا يتجاوز جملة واحدة
- أسئلة عملية تقيس الكفاءة الحقيقية`;

    const res = await callGemini(prompt);
    if (res) {
      qs = res.split('\n')
        .map(q => q.replace(/^[\d\-\.\*\s]+/, '').trim())
        .filter(q => q.length > 8)
        .slice(0, 4);
    }
  }

  // أسئلة افتراضية إذا لم يعمل الذكاء الاصطناعي
  if (!qs || qs.length < 3) {
    qs = [
      `صف خبرتك العملية في مجال ${san(j.title)}`,
      `ما هو أبرز إنجاز حققته في مسيرتك المهنية؟`,
      `كيف تتعامل مع المواعيد الضيقة وضغط العمل؟`,
      `لماذا تريد الانضمام إلى ${san(j.company)} تحديداً؟`,
    ];
  }

  QUIZ_QUES    = qs;
  QUIZ_ANSWERS = new Array(qs.length).fill('');

  el.innerHTML = `
    <div style="margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <i class="fas fa-robot" style="color:var(--p);font-size:16px"></i>
        <div style="font-size:14px;font-weight:900;color:var(--tx)">اختبار: ${san(j.title)}</div>
      </div>
      <div style="font-size:11px;color:var(--tx2)">أجب على الأسئلة الأربعة — سيُقيّم الذكاء الاصطناعي إجاباتك تلقائياً</div>
    </div>

    ${qs.map((q, i) => `
    <div class="fg" style="margin-bottom:16px">
      <label class="fl" style="font-size:12px;font-weight:700">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;background:var(--p);color:#fff;border-radius:50%;font-size:10px;margin-left:6px;flex-shrink:0">${i + 1}</span>
        ${san(q)}
      </label>
      <textarea class="fc" rows="2" placeholder="اكتب إجابتك..."
        style="resize:none;margin-top:6px"
        oninput="QUIZ_ANSWERS[${i}]=this.value"></textarea>
    </div>`).join('')}

    <div class="mf" style="padding:0;border:none;margin-top:8px">
      <button class="btn bo" onclick="cmo('moQuiz');openApply('${jobId}',null,'')">تخطي</button>
      <button class="btn bp blg" id="quizSubmitBtn" onclick="submitQuiz('${jobId}')">
        <i class="fas fa-check"></i>إرسال وتقييم
      </button>
    </div>`;
}

// ── تقديم وتقييم الاختبار ──
async function submitQuiz(jobId) {
  if (QUIZ_ANSWERS.some(a => !a.trim())) {
    notify('تنبيه', 'يرجى الإجابة على جميع الأسئلة', 'warning');
    return;
  }

  loading('quizSubmitBtn', true);
  const el = document.getElementById('moQuizB');

  el.innerHTML = `
    <div style="text-align:center;padding:40px 20px">
      <div class="spin2" style="margin:0 auto 16px"></div>
      <div style="font-size:13px;color:var(--tx2)">الذكاء الاصطناعي يُقيّم إجاباتك...</div>
    </div>`;

  let score = 65, feedback = 'إجابات جيدة تدل على خبرة مقبولة';

  if (isAIReady()) {
    const qa = QUIZ_QUES.map((q, i) => `س${i+1}: ${q}\nج: ${QUIZ_ANSWERS[i]}`).join('\n\n');
    const prompt = `أنت مقيّم وظيفي. قيّم هذه الإجابات لوظيفة "${QUIZ_JOB?.title}" في "${QUIZ_JOB?.company}":

${qa}

أجب بهذا التنسيق الدقيق فقط ولا شيء آخر:
SCORE: [رقم من 0 إلى 100 فقط]
FEEDBACK: [جملة تقييم واحدة مختصرة باللغة العربية]`;

    const res = await callGemini(prompt);
    if (res) {
      const sm = res.match(/SCORE:\s*(\d+)/);
      const fm = res.match(/FEEDBACK:\s*(.+)/);
      if (sm) score    = Math.min(100, Math.max(0, parseInt(sm[1])));
      if (fm) feedback = fm[1].trim();
    }
  } else {
    // تقييم محلي بسيط
    const avgLen = QUIZ_ANSWERS.reduce((s, a) => s + a.trim().length, 0) / QUIZ_ANSWERS.length;
    score    = Math.min(95, Math.max(30, Math.floor(avgLen * 0.8) + 20));
    feedback = score >= 70 ? 'إجابات واضحة ومفصّلة' : score >= 50 ? 'إجابات مقبولة تحتاج مزيداً من التفصيل' : 'يُنصح بتفصيل الإجابات أكثر';
  }

  QUIZ_SCORE = score;
  QUIZ_FB    = feedback;

  // حفظ النتيجة في Firestore
  if (!DEMO && window.db && U) {
    try {
      await window.db.collection('quizResults').add({
        applicantId: U.uid,
        jobId,
        score,
        feedback,
        questions: QUIZ_QUES,
        answers:   QUIZ_ANSWERS,
        takenAt:   firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (e) {}
  }

  const color   = score >= 80 ? 'var(--success)' : score >= 55 ? 'var(--acc)' : 'var(--danger)';
  const emoji   = score >= 80 ? '🏆' : score >= 55 ? '👍' : '💪';
  const label   = score >= 80 ? 'ممتاز' : score >= 55 ? 'جيد' : 'مقبول';

  el.innerHTML = `
    <div style="text-align:center;padding:20px 16px">
      <div style="font-size:52px;margin-bottom:6px">${emoji}</div>
      <div style="font-size:48px;font-weight:900;color:${color};line-height:1">${score}</div>
      <div style="font-size:13px;color:var(--tx3);margin-bottom:4px">/ 100 نقطة</div>
      <div style="font-size:16px;font-weight:800;color:${color};margin-bottom:14px">${label}</div>
      <div style="background:${color}15;border:1px solid ${color}30;border-radius:12px;padding:12px 14px;margin-bottom:16px;text-align:right">
        <div style="font-size:11px;color:var(--tx3);margin-bottom:4px"><i class="fas fa-robot"></i> تقييم الذكاء الاصطناعي</div>
        <div style="font-size:13px;color:var(--tx);font-weight:600">${san(feedback)}</div>
      </div>
      <div style="font-size:11px;color:var(--tx2);margin-bottom:20px">
        ستُرسل هذه النتيجة مع طلبك إلى <strong>${san(QUIZ_JOB?.company || '')}</strong>
      </div>
      <button class="btn bp bfu" onclick="cmo('moQuiz');openApply('${jobId}',${score},'${feedback.replace(/'/g, "\\'")}')">
        <i class="fas fa-paper-plane"></i>تقدّم للوظيفة الآن
      </button>
    </div>`;
}
