// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — jobs.js                          ║
// ║  صفحة الوظائف + التفاصيل + التقديم + المحفوظات     ║
// ╚══════════════════════════════════════════════════════╝

let JF = { type: '', cat: '', prov: '', q: '' };
let JSORT = 'newest'; // newest | salary_high | salary_low | applicants

// ── تحديد نوع الوظيفة ──
function jobTypeLabel(type) {
  return { full:'دوام كامل', part:'دوام جزئي', remote:'عن بُعد', gig:'مهمة/مستقل' }[type] || 'مستقل';
}
function jobTypeClass(type) {
  return { full:'b-tl', part:'b-am', remote:'b-bl', gig:'b-pu' }[type] || 'b-pu';
}

// ── بطاقة وظيفة محسّنة ──
function jCard(j) {
  const tl  = jobTypeLabel(j.type);
  const tc  = jobTypeClass(j.type);
  const sal = j.salary ? `${fmt(j.salary)}${j.salaryMax ? '–' + fmt(j.salaryMax) : ''}` : 'قابل للتفاوض';
  const saved = isBookmarked(j.id);
  const d = daysLeft(j.deadline);
  const isHot = d !== null && d >= 0 && d <= 3;
  const match = jobMatchScore(j);
  const isOfficeView = ROLE === 'office';

  return `<div class="jc" onclick="openJob('${j.id}')">
    <div class="jc-top">
      <div class="jlo">${j.logo || j.company?.charAt(0) || '🏢'}</div>
      <div class="ji" style="flex:1;min-width:0">
        <div style="display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;margin-bottom:3px">
          <div class="jtit">${j.title}</div>
          ${isHot ? `<span class="hot-badge"><i class="fas fa-fire"></i>عاجل</span>` : ''}
          ${match === 'high' ? `<span class="match-badge match-high"><i class="fas fa-map-marker-alt"></i>محافظتك</span>` : ''}
        </div>
        <div class="jco"><i class="fas fa-building" style="font-size:10px;color:var(--tx3)"></i> ${j.company} • <i class="fas fa-map-marker-alt" style="font-size:10px;color:var(--tx3)"></i> ${j.province || '—'}</div>
        <div class="jbs" style="margin-top:6px">
          <span class="b ${tc}"><i class="fas fa-clock"></i>${tl}</span>
          ${j.cat ? `<span class="b b-bl">${CATS[j.cat] || j.cat}</span>` : ''}
          ${j.exp ? `<span class="b b-gy"><i class="fas fa-briefcase"></i>${j.exp}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
        <div style="display:flex;gap:6px;align-items:center">
          <button class="bkm-btn ${saved ? 'on' : ''}" data-bkm="${j.id}"
            onclick="toggleBookmark('${j.id}',event)" title="حفظ الوظيفة">
            <i class="fas fa-bookmark" style="font-size:12px"></i>
          </button>
          ${isOfficeView
            ? `<button class="btn bsm" style="background:rgba(139,92,246,.12);color:var(--purple);border:1px solid rgba(139,92,246,.3);gap:5px"
                onclick="event.stopPropagation();referCandidate('${j.id}')">
                <i class="fas fa-user-plus"></i>لديّ موظف
              </button>`
            : `<button class="btn bp bsm jc-apply-btn" onclick="event.stopPropagation();openQuiz('${j.id}')">
                <i class="fas fa-paper-plane"></i>تقدّم
              </button>`
          }
        </div>
        <span style="font-size:10px;color:var(--tx3)">${ago(j.postedAt)}</span>
      </div>
    </div>
    <div style="font-size:12px;color:var(--tx2);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;margin-bottom:10px">${j.desc || ''}</div>
    <div class="jc-meta">
      <div class="jsal"><i class="fas fa-money-bill-wave" style="font-size:11px;margin-left:4px"></i>${sal} ${j.currency || 'IQD'}</div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <span style="font-size:11px;color:var(--tx3);display:flex;align-items:center;gap:3px"><i class="fas fa-users"></i>${j.applicants || 0} متقدم</span>
        ${daysLeftBadge(j.deadline)}
      </div>
    </div>
  </div>`;
}

// ── صفحة تصفح الوظائف ──
function pgJobs(el) {
  const res = fSortJobs(fJobs());
  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-briefcase"></i></div>تصفح الوظائف</div>
      <span class="b b-tl" id="jobsCountBadge">${JOBS.length} وظيفة</span>
    </div>

    <!-- شريط البحث والفلاتر -->
    <div class="card" style="padding:14px;margin-bottom:14px">
      <div style="display:flex;gap:9px;margin-bottom:11px;flex-wrap:wrap">
        <div class="sb" style="flex:1;min-width:180px">
          <i class="fas fa-search"></i>
          <input type="text" placeholder="ابحث عن وظيفة أو شركة..." oninput="JF.q=this.value;rJobs()" id="jq">
          <button id="jqClear" style="display:none;background:none;border:none;color:var(--tx3);cursor:pointer;font-size:12px" onclick="document.getElementById('jq').value='';JF.q='';this.style.display='none';rJobs()">✕</button>
        </div>
        <select class="fc" style="width:auto;padding:8px 12px;font-size:12px" onchange="JF.prov=this.value;rJobs()">
          <option value="">كل المحافظات</option>
          ${PROVS.map(p => `<option ${p === P?.province ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        <select class="sort-select" onchange="JSORT=this.value;rJobs()" title="ترتيب النتائج">
          <option value="newest">الأحدث أولاً</option>
          <option value="salary_high">أعلى راتب</option>
          <option value="salary_low">أقل راتب</option>
          <option value="applicants">الأكثر تقديماً</option>
        </select>
      </div>
      <div class="tabs" style="margin-bottom:11px">
        <button class="tb2 on"  onclick="JF.type='';setTab(this);rJobs()"><i class="fas fa-th"></i>الكل</button>
        <button class="tb2"     onclick="JF.type='full';setTab(this);rJobs()"><i class="fas fa-briefcase"></i>كامل</button>
        <button class="tb2"     onclick="JF.type='part';setTab(this);rJobs()"><i class="fas fa-clock"></i>جزئي</button>
        <button class="tb2"     onclick="JF.type='remote';setTab(this);rJobs()"><i class="fas fa-laptop-house"></i>عن بُعد</button>
        <button class="tb2"     onclick="JF.type='gig';setTab(this);rJobs()"><i class="fas fa-tasks"></i>مهام</button>
      </div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">
        ${[
          { v:'',      l:'الكل',   ic:'fa-th-list' },
          { v:'tech',  l:'تقنية',  ic:'fa-laptop-code' },
          { v:'biz',   l:'أعمال',  ic:'fa-chart-line' },
          { v:'med',   l:'طب',     ic:'fa-stethoscope' },
          { v:'edu',   l:'تعليم',  ic:'fa-graduation-cap' },
          { v:'eng',   l:'هندسة',  ic:'fa-cog' },
          { v:'other', l:'أخرى',   ic:'fa-ellipsis-h' },
        ].map(c => `<button class="fc2 ${c.v === JF.cat ? 'on' : ''}" onclick="JF.cat='${c.v}';setCat(this);rJobs()"><i class="fas ${c.ic}"></i>${c.l}</button>`).join('')}
        ${BOOKMARKS.length ? `<button class="fc2" onclick="showBookmarks(this)" style="margin-right:auto"><i class="fas fa-bookmark" style="color:var(--acc)"></i>محفوظاتي (${BOOKMARKS.length})</button>` : ''}
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
      <span class="results-count" id="resultsCount">${res.length} نتيجة</span>
    </div>

    <div class="jg" id="jobsList">
      ${res.length ? res.map(j => jCard(j)).join('') : emptyState('🔍', 'لا توجد وظائف مطابقة', 'جرب تغيير فلاتر البحث أو اختر تخصصاً مختلفاً')}
    </div>`;

  // مراقبة حقل البحث لإظهار زر المسح
  const jqEl = document.getElementById('jq');
  if (jqEl) {
    jqEl.addEventListener('input', function() {
      const cl = document.getElementById('jqClear');
      if (cl) cl.style.display = this.value ? 'block' : 'none';
    });
  }
}

function setCat(btn) {
  document.querySelectorAll('.fc2').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

function fJobs() {
  return JOBS.filter(j => {
    if (JF.type && j.type !== JF.type) return false;
    if (JF.cat  && j.cat  !== JF.cat)  return false;
    if (JF.prov && j.province !== JF.prov) return false;
    if (JF.q) {
      const q = JF.q.toLowerCase();
      if (!j.title?.toLowerCase().includes(q) &&
          !j.company?.toLowerCase().includes(q) &&
          !j.province?.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function fSortJobs(list) {
  const copy = [...list];
  if (JSORT === 'salary_high') return copy.sort((a,b) => (b.salaryMax || b.salary || 0) - (a.salaryMax || a.salary || 0));
  if (JSORT === 'salary_low')  return copy.sort((a,b) => (a.salary || 0) - (b.salary || 0));
  if (JSORT === 'applicants')  return copy.sort((a,b) => (b.applicants || 0) - (a.applicants || 0));
  return copy.sort((a,b) => new Date(b.postedAt) - new Date(a.postedAt));
}

function rJobs() {
  const res = fSortJobs(fJobs());
  const el  = document.getElementById('jobsList');
  const cnt = document.getElementById('resultsCount');
  if (cnt) cnt.textContent = `${res.length} نتيجة`;
  if (!el) return;
  el.innerHTML = res.length
    ? res.map(j => jCard(j)).join('')
    : emptyState('🔍', 'لا توجد نتائج', 'جرب فلاتر مختلفة');
}

function showBookmarks(btn) {
  // تبديل عرض المحفوظات فقط
  const bkmJobs = JOBS.filter(j => isBookmarked(j.id));
  const el = document.getElementById('jobsList');
  if (!el) return;
  if (btn.classList.contains('on')) {
    btn.classList.remove('on');
    rJobs();
  } else {
    btn.classList.add('on');
    el.innerHTML = bkmJobs.length
      ? bkmJobs.map(j => jCard(j)).join('')
      : emptyState('🔖', 'لا توجد محفوظات', 'احفظ الوظائف التي تهمك بالنقر على أيقونة الإشارة');
  }
}

// ── تفاصيل الوظيفة ──
function openJob(id) {
  const j = JOBS.find(x => x.id === id);
  if (!j) return;
  SEL_JOB = j;
  const sal   = j.salary ? `${fmt(j.salary)}${j.salaryMax ? '–' + fmt(j.salaryMax) : ''}` : 'قابل للتفاوض';
  const saved = isBookmarked(j.id);
  const d     = daysLeft(j.deadline);
  const isHot = d !== null && d >= 0 && d <= 3;

  document.getElementById('moJobB').innerHTML = `
    <!-- رأس الوظيفة -->
    <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:20px">
      <div class="jlo" style="width:64px;height:64px;border-radius:18px;font-size:26px;flex-shrink:0">${j.logo || '🏢'}</div>
      <div style="flex:1">
        <div style="display:flex;align-items:flex-start;gap:8px;flex-wrap:wrap">
          <h2 style="font-size:20px;font-weight:900;color:var(--tx);margin-bottom:4px">${j.title}</h2>
          ${isHot ? `<span class="hot-badge"><i class="fas fa-fire"></i>عاجل</span>` : ''}
        </div>
        <div style="font-size:13px;color:var(--tx2);margin-bottom:8px">${j.company} • ${j.province || ''}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span class="b ${j.type==='full'?'b-tl':j.type==='part'?'b-am':'b-pu'}">${j.type==='full'?'دوام كامل':j.type==='part'?'دوام جزئي':'مستقل'}</span>
          ${j.cat ? `<span class="b b-bl">${CATS[j.cat]||j.cat}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- شبكة المعلومات الرئيسية -->
    <div class="jd-meta-grid">
      ${[
        { ico:'fa-money-bill-wave', c:'var(--success)', l:'الراتب',     v:`${sal} ${j.currency||'IQD'}` },
        { ico:'fa-clock',           c:'var(--info)',    l:'ساعات العمل', v:j.hours || 'غير محدد' },
        { ico:'fa-briefcase',       c:'var(--acc)',     l:'الخبرة',      v:j.exp || 'غير محدد' },
        { ico:'fa-map-marker-alt',  c:'var(--danger)',  l:'الموقع',      v:j.province || '—' },
        { ico:'fa-calendar-alt',    c:'var(--purple)',  l:'آخر موعد',    v:j.deadline || '—' },
        { ico:'fa-users',           c:'var(--p)',       l:'المتقدمون',   v:`${j.applicants||0} شخص` },
      ].map(it => `<div class="jd-meta-item">
        <i class="fas ${it.ico} jd-meta-ico" style="color:${it.c}"></i>
        <div class="jd-meta-lbl">${it.l}</div>
        <div class="jd-meta-val">${it.v}</div>
      </div>`).join('')}
    </div>

    <!-- الوصف -->
    <div style="margin-bottom:16px">
      <h3 style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:8px;display:flex;align-items:center;gap:5px">
        <i class="fas fa-align-left" style="color:var(--p)"></i> وصف الوظيفة
      </h3>
      <p style="font-size:13px;color:var(--tx2);line-height:1.8">${j.desc || ''}</p>
    </div>

    ${j.reqs?.length ? `<div style="margin-bottom:16px">
      <h3 style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:8px;display:flex;align-items:center;gap:5px">
        <i class="fas fa-check-square" style="color:var(--p)"></i> المتطلبات
      </h3>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${j.reqs.map(r => `<span class="b b-tl"><i class="fas fa-code-branch" style="font-size:9px"></i>${r}</span>`).join('')}</div>
    </div>` : ''}

    ${j.bens?.length ? `<div style="margin-bottom:20px">
      <h3 style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:8px;display:flex;align-items:center;gap:5px">
        <i class="fas fa-gift" style="color:var(--acc)"></i> المزايا والفوائد
      </h3>
      <div style="display:flex;flex-direction:column;gap:7px">
        ${j.bens.map(b => `<div style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--tx2)">
          <div style="width:20px;height:20px;border-radius:50%;background:rgba(34,197,94,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas fa-check" style="color:var(--success);font-size:9px"></i>
          </div>${b}
        </div>`).join('')}
      </div>
    </div>` : ''}

    <!-- أزرار الإجراءات -->
    <div style="display:flex;gap:9px;flex-wrap:wrap">
      ${ROLE === 'office'
        ? `<button class="btn blg bfu" style="flex:1;background:linear-gradient(135deg,var(--purple),#a78bfa);color:#fff;border:none"
              onclick="cmo('moJob');referCandidate('${j.id}')">
            <i class="fas fa-user-plus"></i>لديّ موظف مناسب لهذه الوظيفة
          </button>`
        : `<button class="btn bp blg" style="flex:1" onclick="cmo('moJob');openQuiz('${j.id}')">
            <i class="fas fa-paper-plane"></i>تقدّم الآن
          </button>`
      }
      <button class="bkm-btn ${saved?'on':''}" data-bkm="${j.id}" onclick="toggleBookmark('${j.id}',event)"
        style="width:46px;height:46px;border-radius:11px" title="حفظ الوظيفة">
        <i class="fas fa-bookmark" style="font-size:15px"></i>
      </button>
      <button onclick="shareJobWhatsApp('${j.id}')"
        style="width:46px;height:46px;border-radius:11px;background:#25D366;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0"
        title="مشاركة عبر WhatsApp">
        <i class="fab fa-whatsapp"></i>
      </button>
      <button onclick="shareJobGeneral('${j.id}')"
        style="width:46px;height:46px;border-radius:11px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0"
        title="مشاركة على منصات التواصل">
        <i class="fas fa-share-alt"></i>
      </button>
    </div>`;
  oMo('moJob');
}

// ── نموذج التقديم (يستقبل نتيجة الاختبار إذا وُجدت) ──
function openApply(id, quizScore = null, quizFeedback = '') {
  const j = JOBS.find(x => x.id === id);
  if (!j) return;
  SEL_JOB = j;
  if (MY_APPS.find(a => a.jobId === id)) {
    notify('تنبيه', 'لقد تقدمت لهذه الوظيفة مسبقاً', 'warning');
    return;
  }
  document.getElementById('moApplyB').innerHTML = `
    <!-- معلومات الوظيفة -->
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bgc2);border-radius:12px;margin-bottom:20px;border:1px solid var(--br)">
      <div class="jlo" style="width:46px;height:46px;border-radius:12px;font-size:19px;flex-shrink:0">${j.logo || '🏢'}</div>
      <div>
        <div style="font-size:14px;font-weight:800;color:var(--tx)">${j.title}</div>
        <div style="font-size:11px;color:var(--tx2)">${j.company} • ${j.province || ''}</div>
        ${j.salary ? `<div style="font-size:12px;font-weight:700;color:var(--p);margin-top:2px">${fmt(j.salary)}–${fmt(j.salaryMax||j.salary)} ${j.currency||'IQD'}</div>` : ''}
      </div>
    </div>

    <div class="fr">
      <div class="fg"><label class="fl req">الاسم الكامل</label><input type="text" id="ap_n" class="fc" value="${P?.name || ''}"></div>
      <div class="fg"><label class="fl req">رقم الهاتف</label><input type="tel" id="ap_ph" class="fc" value="${P?.phone || ''}" placeholder="07X XXXX XXXX"></div>
    </div>
    <div class="fg"><label class="fl req">البريد الإلكتروني</label><input type="email" id="ap_e" class="fc" value="${P?.email || U?.email || ''}"></div>
    <div class="fg">
      <label class="fl">سنوات الخبرة</label>
      <select id="ap_exp" class="fc">
        <option>بدون خبرة</option><option>أقل من سنة</option><option>1-2 سنة</option>
        <option>2-4 سنوات</option><option>4-6 سنوات</option><option>أكثر من 6 سنوات</option>
      </select>
    </div>
    <div class="fg">
      <label class="fl req">رسالة التغطية</label>
      <textarea id="ap_cv" class="fc" rows="5" placeholder="عرّف بنفسك، واشرح لماذا أنت الأنسب لهذه الوظيفة..."></textarea>
      <div class="fh"><i class="fas fa-lightbulb" style="color:var(--acc)"></i> نصيحة: اذكر مهاراتك المتعلقة بالوظيفة وإنجازاتك السابقة</div>
    </div>
    <div class="fg">
      <label class="fl">رابط السيرة الذاتية <span style="color:var(--tx3);font-weight:400">(اختياري)</span></label>
      <input type="url" id="ap_url" class="fc" placeholder="https://drive.google.com/...">
    </div>

    ${quizScore !== null ? `
    <div style="background:linear-gradient(135deg,rgba(13,148,136,.08),rgba(13,148,136,.03));border:1px solid rgba(13,148,136,.2);border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:center;gap:12px">
      <div style="font-size:24px;font-weight:900;color:${quizScore >= 80 ? 'var(--success)' : quizScore >= 55 ? 'var(--acc)' : 'var(--danger)'}">${quizScore}</div>
      <div>
        <div style="font-size:11px;color:var(--tx3)"><i class="fas fa-robot"></i> نتيجة الاختبار الذكي</div>
        <div style="font-size:12px;color:var(--tx);font-weight:600">${san(quizFeedback)}</div>
      </div>
    </div>` : ''}

    <div class="mf" style="padding:0;border:none;margin-top:14px">
      <button class="btn bo" onclick="cmo('moApply')"><i class="fas fa-times"></i>إلغاء</button>
      <button class="btn bp blg" id="applyBtn" onclick="submitApply(${quizScore !== null ? quizScore : 'null'},'${san(quizFeedback).replace(/'/g,"\\'")}')">
        <i class="fas fa-paper-plane"></i>إرسال الطلب
      </button>
    </div>`;
  oMo('moApply');
}

async function submitApply(quizScore = null, quizFeedback = '') {
  const j    = SEL_JOB;
  const name = document.getElementById('ap_n')?.value.trim();
  const ph   = document.getElementById('ap_ph')?.value.trim();
  const em   = document.getElementById('ap_e')?.value.trim();
  const cv   = document.getElementById('ap_cv')?.value.trim();
  const exp  = document.getElementById('ap_exp')?.value;
  const url  = document.getElementById('ap_url')?.value.trim();
  if (!name || !ph || !em || !cv) { notify('خطأ', 'أكمل الحقول المطلوبة', 'error'); return; }
  const app = {
    jobId: j.id, jobTitle: j.title, company: j.company,
    applicantId: U?.uid || 'demo', name, phone: ph, email: em,
    cover: cv, exp, cvUrl: url || null,
    quizScore: quizScore !== null ? quizScore : null,
    quizFeedback: quizFeedback || null,
    status: 'pending', appliedAt: new Date().toISOString()
  };
  loading('applyBtn', true);
  if (!DEMO && window.db) {
    try {
      const ref = await window.db.collection('applications').add({ ...app, appliedAt: firebase.firestore.FieldValue.serverTimestamp() });
      app.id = ref.id;
      await window.db.collection('jobs').doc(j.id).update({ applicants: firebase.firestore.FieldValue.increment(1) });
    } catch (e) { console.warn(e); }
  }
  app.id = app.id || 'a_' + Date.now();
  MY_APPS.unshift(app);
  j.applicants = (j.applicants || 0) + 1;
  await notifyAdmin(`طلب جديد — ${j.title}`, `<b>المتقدم:</b> ${name}`, `📩 طلب جديد\nالاسم: ${name}\nالوظيفة: ${j.title}\nالهاتف: ${ph}`);
  // تحديث شارة الإشعارات
  const ndot = document.getElementById('ndot');
  if (ndot) ndot.style.display = 'block';
  cmo('moApply');
  notify('تم الإرسال ✅', `طلبك على "${j.title}" أُرسل بنجاح`, 'success');
}

// ── مشاركة الوظيفة عبر WhatsApp ──
function shareJobWhatsApp(id) {
  const j = JOBS.find(x => x.id === id);
  if (!j) return;
  const sal  = j.salary ? `${fmt(j.salary)}${j.salaryMax ? '–' + fmt(j.salaryMax) : ''} ${j.currency || 'IQD'}` : 'قابل للتفاوض';
  const type = jobTypeLabel(j.type);
  const text = `🔔 *فرصة عمل — فانوس للتوظيف*\n\n` +
    `💼 *${j.title}*\n🏢 ${j.company}\n📍 ${j.province || '—'} | ${type}\n💰 ${sal}\n⏳ آخر موعد: ${j.deadline || '—'}\n\n` +
    `${j.desc ? j.desc.slice(0, 120) + '...' : ''}\n\n👆 تقدّم الآن عبر منصة الفانوس للتوظيف`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// ── مشاركة على منصات متعددة ──
function shareJobGeneral(id) {
  const j = JOBS.find(x => x.id === id);
  if (!j) return;
  const text = `فرصة عمل: ${j.title} — ${j.company} | ${j.province || ''} | ${jobTypeLabel(j.type)} — منصة الفانوس للتوظيف`;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;display:flex;gap:10px;background:var(--bgc);border:1px solid var(--br);border-radius:16px;padding:14px 18px;box-shadow:var(--shxl)';
  el.innerHTML = `
    <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(location.href)}&quote=${encodeURIComponent(text)}" target="_blank"
      style="width:44px;height:44px;border-radius:12px;background:#1877f2;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;text-decoration:none">
      <i class="fab fa-facebook-f"></i></a>
    <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}" target="_blank"
      style="width:44px;height:44px;border-radius:12px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-size:18px;text-decoration:none">
      <i class="fab fa-x-twitter"></i></a>
    <a href="https://t.me/share/url?url=${encodeURIComponent(location.href)}&text=${encodeURIComponent(text)}" target="_blank"
      style="width:44px;height:44px;border-radius:12px;background:#229ed9;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;text-decoration:none">
      <i class="fab fa-telegram-plane"></i></a>
    <a href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank"
      style="width:44px;height:44px;border-radius:12px;background:#25d366;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;text-decoration:none">
      <i class="fab fa-whatsapp"></i></a>
    <button onclick="this.closest('div').remove()"
      style="width:44px;height:44px;border-radius:12px;background:var(--bgc2);color:var(--tx3);border:1px solid var(--br);cursor:pointer;font-size:16px">✕</button>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 8000);
}

// ── ترشيح موظف من مكتب التوظيف ──
function referCandidate(jobId) {
  const j = JOBS.find(x => x.id === jobId);
  if (!j) return;
  const el = document.getElementById('moApplyB');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bgc2);border-radius:12px;margin-bottom:20px;border:1px solid var(--br)">
      <div class="jlo" style="width:46px;height:46px;border-radius:12px;font-size:19px;flex-shrink:0">${j.logo || '🏢'}</div>
      <div>
        <div style="font-size:14px;font-weight:800;color:var(--tx)">${san(j.title)}</div>
        <div style="font-size:11px;color:var(--tx2)">${san(j.company)} • ${san(j.province || '')}</div>
      </div>
    </div>
    <div class="al al-i" style="margin-bottom:16px">
      <i class="fas fa-user-plus"></i>
      <span>أدخل بيانات الموظف المرشّح — سيتم إرسال ملفه لصاحب الوظيفة باسم مكتبك</span>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl req">اسم المرشّح</label><input type="text" id="ref_n" class="fc" placeholder="الاسم الكامل"></div>
      <div class="fg"><label class="fl req">رقم الهاتف</label><input type="tel" id="ref_ph" class="fc" placeholder="07X XXXX XXXX"></div>
    </div>
    <div class="fg"><label class="fl req">البريد الإلكتروني</label><input type="email" id="ref_e" class="fc"></div>
    <div class="fg">
      <label class="fl">سنوات الخبرة</label>
      <select id="ref_exp" class="fc">
        <option>بدون خبرة</option><option>أقل من سنة</option><option>1-2 سنة</option>
        <option>2-4 سنوات</option><option>4-6 سنوات</option><option>أكثر من 6 سنوات</option>
      </select>
    </div>
    <div class="fg">
      <label class="fl req">ملاحظات المكتب</label>
      <textarea id="ref_note" class="fc" rows="3" placeholder="وصف مختصر للمرشّح ومؤهلاته..."></textarea>
    </div>
    <div class="mf" style="padding:0;border:none;margin-top:14px">
      <button class="btn bo" onclick="cmo('moApply')"><i class="fas fa-times"></i>إلغاء</button>
      <button class="btn blg bfu" id="refBtn" style="background:linear-gradient(135deg,var(--purple),#a78bfa);color:#fff;border:none"
        onclick="submitReferral('${jobId}')">
        <i class="fas fa-user-plus"></i>إرسال الترشيح
      </button>
    </div>`;
  oMo('moApply');
}

async function submitReferral(jobId) {
  const j    = JOBS.find(x => x.id === jobId);
  const name = document.getElementById('ref_n')?.value.trim();
  const ph   = document.getElementById('ref_ph')?.value.trim();
  const em   = document.getElementById('ref_e')?.value.trim();
  const exp  = document.getElementById('ref_exp')?.value;
  const note = document.getElementById('ref_note')?.value.trim();
  if (!name || !ph || !em) { notify('خطأ', 'أكمل بيانات المرشّح', 'error'); return; }
  loading('refBtn', true);
  const ref = {
    jobId, jobTitle: j?.title, company: j?.company,
    applicantId: 'ref_' + Date.now(),
    name, phone: ph, email: em, exp,
    cover: note || 'مرشّح من مكتب توظيف',
    referredBy: U?.uid, officeName: P?.officeName || P?.name,
    isReferral: true, status: 'pending',
    appliedAt: new Date().toISOString(),
  };
  if (!DEMO && window.db) {
    try {
      await window.db.collection('applications').add({ ...ref, appliedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await window.db.collection('jobs').doc(jobId).update({ applicants: firebase.firestore.FieldValue.increment(1) });
    } catch (e) { console.warn(e); }
  }
  cmo('moApply');
  notify('تم الترشيح ✅', `تم ترشيح ${name} لوظيفة "${j?.title}"`, 'success');
}
