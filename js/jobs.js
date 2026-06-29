// ╔══════════════════════════════════════════════════════╗
// ║  عفراء للتوظيف — jobs.js                            ║
// ║  صفحة الوظائف + التفاصيل + التقديم + المحفوظات     ║
// ╚══════════════════════════════════════════════════════╝

let JF = { type: '', cat: '', prov: '', q: '', skill: '' };
let JSORT = 'newest'; // newest | salary_high | salary_low | applicants
let JOBS_PAGE = 1;
const JOBS_PER_PAGE = 20;

// ── تحديد نوع الوظيفة ──
function jobTypeLabel(type) {
  return { full:'دوام كامل', part:'دوام جزئي', remote:'عن بُعد', gig:'مهمة/مستقل' }[type] || 'مستقل';
}
function jobTypeClass(type) {
  return { full:'b-tl', part:'b-am', remote:'b-bl', gig:'b-pu' }[type] || 'b-pu';
}
function expLabel(exp) {
  return { none:'بدون خبرة', 'no':'بدون خبرة', '1-2':'1-2 سنة', '3-5':'3-5 سنوات', '5+':'أكثر من 5 سنوات' }[exp] || (exp || 'غير محدد');
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

  return `<div class="jc${j.featured ? ' jc-featured' : ''}" onclick="openJob('${j.id}')">
    <!-- الصف الأول: شعار + معلومات + وقت -->
    <div class="jc-top">
      <div class="jlo">${san(j.logo) || san(j.company?.charAt(0)) || '🏢'}</div>
      <div class="ji" style="flex:1;min-width:0;overflow:hidden">
        <div class="jc-title-row">
          <div class="jtit">${j.title}</div>
          <span class="jc-ago">${ago(j.postedAt)}</span>
        </div>
        <div class="jco"><i class="fas fa-building" style="font-size:10px;color:var(--tx3)"></i> ${j.company} • <i class="fas fa-map-marker-alt" style="font-size:10px;color:var(--tx3)"></i> ${j.province || '—'}</div>
      </div>
    </div>
    <!-- الصف الثاني: badges -->
    <div class="jbs" style="margin:8px 0 6px">
      ${j.featured ? `<span class="b" style="background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;font-size:10px"><i class="fas fa-star"></i> مميزة</span>` : ''}
      ${isHot ? `<span class="hot-badge"><i class="fas fa-fire"></i>عاجل</span>` : ''}
      <span class="b ${tc}"><i class="fas fa-clock"></i>${tl}</span>
      ${j.cat ? `<span class="b b-bl">${CATS[j.cat] || j.cat}</span>` : ''}
      ${j.exp && j.exp !== 'none' ? `<span class="b b-gy"><i class="fas fa-briefcase"></i>${expLabel(j.exp)}</span>` : ''}
      ${match === 'high' ? `<span class="match-badge match-high"><i class="fas fa-map-marker-alt"></i>محافظتك</span>` : ''}
      ${j.commission ? `<span class="b" style="background:#fef3c7;color:#92400e"><i class="fas fa-percentage"></i>${j.commission.length > 18 ? j.commission.substring(0,18)+'...' : j.commission}</span>` : ''}
      ${j.socialInsurance ? `<span class="b b-gr"><i class="fas fa-shield-alt"></i>تأمين</span>` : ''}
      ${j.skills?.slice(0,2).map(s => `<span class="b skill-chip" onclick="event.stopPropagation();filterBySkill('${s}')">${s}</span>`).join('') || ''}
    </div>
    <!-- الصف الثالث: راتب + أزرار -->
    <div class="jc-footer">
      <div class="jsal"><i class="fas fa-money-bill-wave" style="font-size:11px;margin-left:3px"></i>${sal} <span style="font-size:10px;font-weight:600;color:var(--tx3)">${j.currency || 'IQD'}</span></div>
      <div class="jc-actions">
        <span style="font-size:10px;color:var(--tx3);display:flex;align-items:center;gap:3px"><i class="fas fa-users" style="font-size:9px"></i>${j.applicants || 0}</span>
        ${daysLeftBadge(j.deadline)}
        <button class="jc-icon-btn" onclick="event.stopPropagation();shareJobGeneral('${j.id}')"><i class="fas fa-share-alt"></i></button>
        <button class="jc-icon-btn ${saved ? 'on' : ''}" data-bkm="${j.id}" onclick="toggleBookmark('${j.id}',event)"><i class="fas fa-bookmark"></i></button>
        ${isOfficeView
          ? `<button class="btn bsm" style="background:rgba(139,92,246,.12);color:var(--purple);border:1px solid rgba(139,92,246,.3)" onclick="event.stopPropagation();referCandidate('${j.id}')"><i class="fas fa-user-plus"></i></button>`
          : `<button class="btn bp bsm jc-apply-btn" onclick="event.stopPropagation();openQuiz('${j.id}')"><i class="fas fa-paper-plane"></i>تقدّم</button>`
        }
      </div>
    </div>
  </div>`;
}

// ── الفئات ──
const JF_CATS = [
  { v:'',      l:'الكل',   ic:'fa-th-large',      color:'#0d9488' },
  { v:'tech',  l:'تقنية',  ic:'fa-laptop-code',   color:'#3b82f6' },
  { v:'biz',   l:'أعمال',  ic:'fa-chart-line',    color:'#f59e0b' },
  { v:'med',   l:'طب',     ic:'fa-stethoscope',   color:'#ef4444' },
  { v:'edu',   l:'تعليم',  ic:'fa-graduation-cap',color:'#22c55e' },
  { v:'eng',   l:'هندسة',  ic:'fa-cog',           color:'#8b5cf6' },
  { v:'other', l:'أخرى',   ic:'fa-ellipsis-h',    color:'#64748b' },
];

// ── صفحة تصفح الوظائف ──
function pgJobs(el) {
  const res = fSortJobs(fJobs());
  el.innerHTML = `
    ${guestBanner()}
    ${renderActiveBanners('jobs')}
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-briefcase"></i></div>تصفح الوظائف</div>
      <span class="b b-tl" id="jobsCountBadge">${JOBS.length} وظيفة</span>
    </div>

    <div class="jobs-filter-card">

      <!-- ① بحث + زر الفلاتر -->
      <div class="jf-search-row">
        <div class="sb jf-sb">
          <i class="fas fa-search" style="color:var(--tx3);font-size:13px;flex-shrink:0"></i>
          <input type="text" placeholder="ابحث عن وظيفة أو شركة..." oninput="JF.q=this.value;_updateJFBadge();rJobs()" id="jq" value="${JF.q}">
          <button id="jqClear" style="display:${JF.q?'block':'none'};background:none;border:none;color:var(--tx3);cursor:pointer;font-size:14px;padding:0 4px;flex-shrink:0" onclick="document.getElementById('jq').value='';JF.q='';this.style.display='none';_updateJFBadge();rJobs()">✕</button>
        </div>
        <button class="jf-filter-btn" id="jfFilterBtn" onclick="openJobFilter()">
          <i class="fas fa-sliders-h"></i>
          <span class="jf-badge" id="jfBadge" style="display:none">0</span>
        </button>
      </div>

      <!-- ② نوع الوظيفة — chips أفقية -->
      <div class="jf-type-row">
        ${[
          { v:'',       l:'الكل',   ic:'fa-th' },
          { v:'full',   l:'كامل',   ic:'fa-briefcase' },
          { v:'part',   l:'جزئي',   ic:'fa-clock' },
          { v:'remote', l:'عن بُعد',ic:'fa-laptop-house' },
          { v:'gig',    l:'مهام',   ic:'fa-tasks' },
        ].map(t => `<button class="jf-type-btn${JF.type===t.v?' on':''}" onclick="JF.type='${t.v}';document.querySelectorAll('.jf-type-btn').forEach(b=>b.classList.remove('on'));this.classList.add('on');rJobs()"><i class="fas ${t.ic}"></i>${t.l}</button>`).join('')}
      </div>

      <!-- ③ فئات بشكل أيقونات -->
      <div class="jf-cat-row">
        ${JF_CATS.map(c => `
          <button class="jf-cat-btn${JF.cat===c.v?' on':''}" style="--cc:${c.color}" onclick="JF.cat='${c.v}';document.querySelectorAll('.jf-cat-btn').forEach(b=>b.classList.remove('on'));this.classList.add('on');_updateJFBadge();rJobs()">
            <span class="jf-cat-ico"><i class="fas ${c.ic}"></i></span>
            <span class="jf-cat-lbl">${c.l}</span>
          </button>`).join('')}
        ${BOOKMARKS.length ? `
          <button class="jf-cat-btn" style="--cc:#f59e0b" onclick="showBookmarks(this)">
            <span class="jf-cat-ico"><i class="fas fa-bookmark"></i></span>
            <span class="jf-cat-lbl">محفوظة</span>
          </button>` : ''}
      </div>

      <!-- ④ فلاتر نشطة (تظهر عند وجود فلتر) -->
      <div class="jf-active-bar" id="jfActiveBar" style="display:none"></div>

    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <span class="results-count" id="resultsCount">${res.length} نتيجة</span>
    </div>

    <div class="jg" id="jobsList">
      ${res.length ? res.slice(0, JOBS_PER_PAGE).map(j => jCard(j)).join('') : emptyState('🔍', 'لا توجد وظائف مطابقة', 'جرب تغيير الفلاتر أو اختر تخصصاً مختلفاً')}
    </div>
    <div id="jobsPag" class="pag">${res.length > JOBS_PER_PAGE ? _buildPagination(Math.ceil(res.length/JOBS_PER_PAGE), 1, p => { JOBS_PAGE = p; _renderJobsPage(); }) : ''}</div>`;

  const jqEl = document.getElementById('jq');
  if (jqEl) {
    jqEl.addEventListener('input', function() {
      const cl = document.getElementById('jqClear');
      if (cl) cl.style.display = this.value ? 'block' : 'none';
    });
  }
  _updateJFBadge();
}

// ── فتح Bottom Sheet للفلاتر المتقدمة ──
function openJobFilter() {
  const el = document.getElementById('moJobFilterB');
  if (!el) return;
  el.innerHTML = `
    <!-- المحافظة -->
    <div class="jff-sec">
      <div class="jff-lbl"><i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> المحافظة</div>
      <select class="fc" id="jffProv" onchange="JF.prov=this.value" style="width:100%">
        <option value="">📍 كل المحافظات</option>
        ${PROVS.map(p => `<option ${JF.prov===p?'selected':''}>${p}</option>`).join('')}
      </select>
    </div>
    <!-- الترتيب -->
    <div class="jff-sec">
      <div class="jff-lbl"><i class="fas fa-sort-amount-down" style="color:var(--p)"></i> ترتيب النتائج</div>
      <div class="jff-sort-row">
        ${[
          { v:'newest',      l:'الأحدث',        ic:'fa-clock' },
          { v:'salary_high', l:'الراتب الأعلى', ic:'fa-arrow-up' },
          { v:'salary_low',  l:'الراتب الأقل',  ic:'fa-arrow-down' },
          { v:'applicants',  l:'الأكثر تقديماً',ic:'fa-users' },
        ].map(s => `<button class="jff-sort-btn${JSORT===s.v?' on':''}" onclick="JSORT='${s.v}';this.closest('.jff-sort-row').querySelectorAll('.jff-sort-btn').forEach(b=>b.classList.remove('on'));this.classList.add('on')"><i class="fas ${s.ic}"></i>${s.l}</button>`).join('')}
      </div>
    </div>
    <!-- المهارات -->
    <div class="jff-sec">
      <div class="jff-lbl"><i class="fas fa-tag" style="color:var(--acc)"></i> فلتر بالمهارة</div>
      <div class="jff-skills-wrap">
        ${['Excel','Python','JavaScript','React','PHP','SQL','AutoCAD','Photoshop','محاسبة','تسويق رقمي','مبيعات','خدمة عملاء','إدارة مشاريع'].map(sk =>
          `<button class="jff-skill-chip${JF.skill===sk?' on':''}" onclick="JF.skill=(JF.skill==='${sk}'?'':'${sk}');this.closest('.jff-skills-wrap').querySelectorAll('.jff-skill-chip').forEach(b=>b.classList.remove('on'));if(JF.skill)this.classList.add('on')">${sk}</button>`
        ).join('')}
      </div>
    </div>
    <!-- موقع جغرافي -->
    <div class="jff-sec">
      <button class="btn bfu" style="border:1.5px solid var(--br);background:var(--bgc2);color:var(--tx2)" onclick="geoFilterJobs();cmo('moJobFilter')">
        <i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> وظائف قريبة من موقعي
      </button>
    </div>`;
  oMo('moJobFilter');
}

// ── تطبيق الفلاتر من الـ Bottom Sheet ──
function applyJobFilter() {
  cmo('moJobFilter');
  _updateJFBadge();
  rJobs();
}

// ── مسح الفلاتر المتقدمة ──
function clearJobFilters() {
  JF.prov = ''; JF.skill = ''; JSORT = 'newest';
  const el = document.getElementById('moJobFilterB');
  if (el) {
    el.querySelectorAll('.jff-skill-chip').forEach(b => b.classList.remove('on'));
    el.querySelectorAll('.jff-sort-btn').forEach((b, i) => b.classList.toggle('on', i === 0));
    const sel = el.querySelector('#jffProv');
    if (sel) sel.value = '';
  }
  _updateJFBadge();
}

// ── تحديث شارة عدد الفلاتر النشطة ──
function _updateJFBadge() {
  let n = 0;
  if (JF.prov)            n++;
  if (JF.skill)           n++;
  if (JSORT !== 'newest') n++;

  const badge = document.getElementById('jfBadge');
  const btn   = document.getElementById('jfFilterBtn');
  if (badge) { badge.textContent = n; badge.style.display = n ? 'flex' : 'none'; }
  if (btn)   btn.classList.toggle('active', n > 0);

  // شريط الفلاتر النشطة
  const bar = document.getElementById('jfActiveBar');
  if (!bar) return;
  const chips = [];
  if (JF.prov)  chips.push(`<button class="jf-active-chip" onclick="JF.prov='';_updateJFBadge();rJobs()"><i class="fas fa-map-marker-alt"></i>${JF.prov}<i class="fas fa-times"></i></button>`);
  if (JF.skill) chips.push(`<button class="jf-active-chip" onclick="JF.skill='';_updateJFBadge();rJobs()"><i class="fas fa-tag"></i>${JF.skill}<i class="fas fa-times"></i></button>`);
  if (JSORT !== 'newest') {
    const sl = { salary_high:'راتب↑', salary_low:'راتب↓', applicants:'الأكثر تقديماً' }[JSORT] || JSORT;
    chips.push(`<button class="jf-active-chip" onclick="JSORT='newest';_updateJFBadge();rJobs()"><i class="fas fa-sort"></i>${sl}<i class="fas fa-times"></i></button>`);
  }
  bar.style.display = chips.length ? 'flex' : 'none';
  bar.innerHTML = chips.join('');
}

function setCat(btn) {
  document.querySelectorAll('.fc2').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

function filterBySkill(sk) {
  JF.skill = (JF.skill === sk) ? '' : sk;
  _updateJFBadge();
  rJobs();
}

function fJobs() {
  return JOBS.filter(j => {
    if (!isJobLive(j)) return false;  // فلتر الوظائف المنتهية
    if (JF.type && j.type !== JF.type) return false;
    if (JF.cat  && j.cat  !== JF.cat)  return false;
    if (JF.prov && j.province !== JF.prov) return false;
    if (JF.skill && !j.skills?.includes(JF.skill)) return false;
    if (JF.q) {
      const q = JF.q.toLowerCase();
      if (!j.title?.toLowerCase().includes(q) &&
          !j.company?.toLowerCase().includes(q) &&
          !j.province?.toLowerCase().includes(q) &&
          !j.skills?.some(s => s.toLowerCase().includes(q))) return false;
    }
    return true;
  });
}

function fSortJobs(list) {
  let sortFn;
  if (JSORT === 'salary_high') sortFn = (a,b) => (b.salaryMax || b.salary || 0) - (a.salaryMax || a.salary || 0);
  else if (JSORT === 'salary_low') sortFn = (a,b) => (a.salary || 0) - (b.salary || 0);
  else if (JSORT === 'applicants') sortFn = (a,b) => (b.applicants || 0) - (a.applicants || 0);
  else sortFn = (a,b) => tsMs(b.postedAt) - tsMs(a.postedAt);

  // المثبّتة أولاً، ثم المميزة، ثم الباقي
  const featured = list.filter(j =>  j.featured && !j.adminPinned).sort(sortFn);
  const pinned   = list.filter(j =>  j.adminPinned).sort(sortFn);
  const rest     = list.filter(j => !j.featured && !j.adminPinned);

  // عند الترتيب بالأحدث: وظائف محافظة المستخدم تظهر أولاً ضمن الباقي
  const userProv = P?.province;
  if (userProv && JSORT === 'newest') {
    const local  = rest.filter(j => j.province === userProv).sort(sortFn);
    const remote = rest.filter(j => j.province !== userProv).sort(sortFn);
    return [...pinned, ...featured, ...local, ...remote];
  }
  return [...pinned, ...featured, ...rest.sort(sortFn)];
}

function rJobs() {
  JOBS_PAGE = 1;
  _renderJobsPage();
}

function _renderJobsPage() {
  const res  = fSortJobs(fJobs());
  const el   = document.getElementById('jobsList');
  const cnt  = document.getElementById('resultsCount');
  const pagEl = document.getElementById('jobsPag');
  if (cnt) cnt.textContent = `${res.length} نتيجة`;
  if (!el) return;

  const total = res.length;
  const pages = Math.ceil(total / JOBS_PER_PAGE);
  const start = (JOBS_PAGE - 1) * JOBS_PER_PAGE;
  const slice = res.slice(start, start + JOBS_PER_PAGE);

  el.innerHTML = slice.length
    ? slice.map(j => jCard(j)).join('')
    : emptyState('🔍', 'لا توجد نتائج', 'جرب فلاتر مختلفة');

  if (pagEl) pagEl.innerHTML = pages > 1 ? _buildPagination(pages, JOBS_PAGE, p => { JOBS_PAGE = p; _renderJobsPage(); }) : '';
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
      <div class="jlo" style="width:64px;height:64px;border-radius:18px;font-size:26px;flex-shrink:0">${san(j.logo) || '🏢'}</div>
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
        { ico:'fa-money-bill-wave', c:'var(--success)', l:'الراتب',     v: j.salary ? `${sal} ${j.currency||'IQD'}` : (j.commission ? 'حسب الحافز' : 'قابل للتفاوض') },
        ...(j.commission ? [{ ico:'fa-percentage', c:'#b45309', l:'الحافز / النسبة', v: j.commission }] : []),
        { ico:'fa-clock',           c:'var(--info)',    l:'ساعات العمل', v:j.hours || 'غير محدد' },
        { ico:'fa-briefcase',       c:'var(--acc)',     l:'الخبرة',      v:expLabel(j.exp) },
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

    <!-- معلومات العقد وفق قانون العمل -->
    ${(j.contractType || j.socialInsurance) ? `
    <div style="background:rgba(13,148,136,.05);border:1px solid rgba(13,148,136,.18);border-radius:13px;padding:12px 14px;margin-bottom:14px">
      <div style="font-size:11px;font-weight:800;color:var(--p);margin-bottom:8px;display:flex;align-items:center;gap:5px">
        <i class="fas fa-balance-scale"></i> معلومات العقد — قانون العمل رقم 37 لسنة 2015
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${j.contractType ? `<span class="b b-tl"><i class="fas fa-file-contract"></i>${{permanent:'عقد دائم',temp:'عقد مؤقت',contract:'عقد مشروع',training:'تدريب'}[j.contractType]||j.contractType}</span>` : ''}
        ${j.socialInsurance ? `<span class="b b-gr"><i class="fas fa-shield-alt"></i>يشمل التأمين الاجتماعي</span>` : `<span class="b b-gy"><i class="fas fa-shield-alt"></i>بدون تأمين اجتماعي</span>`}
        ${j.hours ? `<span class="b b-bl"><i class="fas fa-clock"></i>${j.hours}</span>` : ''}
      </div>
      <details style="margin-top:9px">
        <summary style="font-size:11px;color:var(--tx3);cursor:pointer;font-weight:700">حقوق العامل وفق القانون <i class="fas fa-chevron-down" style="font-size:9px"></i></summary>
        <div style="font-size:11px;color:var(--tx2);line-height:1.8;margin-top:7px;padding-top:7px;border-top:1px solid var(--br)">
          • الحد الأقصى للعمل: <b>8 ساعات يومياً / 48 ساعة أسبوعياً</b><br>
          • إجازة سنوية مدفوعة: <b>30 يوماً</b> بعد سنة خدمة<br>
          • الفصل التعسفي يستوجب <b>تعويضاً قانونياً</b><br>
          • التأمين الاجتماعي إلزامي على صاحب العمل بنسبة <b>12%</b> من الراتب
        </div>
      </details>
    </div>` : ''}

    <!-- المهارات المطلوبة -->
    ${j.skills?.length ? `<div style="margin-bottom:14px">
      <h3 style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:8px;display:flex;align-items:center;gap:5px">
        <i class="fas fa-tags" style="color:var(--acc)"></i> المهارات المطلوبة
      </h3>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${j.skills.map(s => `<span class="b skill-chip" onclick="filterBySkill('${s}')">${s}</span>`).join('')}</div>
    </div>` : ''}

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

    <!-- التواصل المباشر — مخفي حتى يتقدم ويُقبل -->
    ${(ROLE === 'seeker') && j.phone ? `
    <div style="margin-bottom:20px;padding:14px;background:var(--bgc2);border-radius:14px;border:1px solid var(--br)">
      <div style="font-size:11px;font-weight:700;color:var(--tx3);margin-bottom:8px">
        <i class="fas fa-headset" style="color:var(--p)"></i> التواصل المباشر
      </div>
      <div style="display:flex;align-items:center;gap:8px;background:rgba(13,148,136,.06);border:1px solid rgba(13,148,136,.15);border-radius:10px;padding:10px 13px">
        <i class="fas fa-lock" style="color:var(--p);font-size:13px"></i>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--tx)">${j.phone.slice(0,4) + '×'.repeat(Math.max(0,j.phone.length-4))}</div>
          <div style="font-size:10px;color:var(--tx3);margin-top:2px">رقم التواصل يظهر بعد قبول طلبك من جهة العمل</div>
        </div>
      </div>
      ${j.telegram ? `<div style="margin-top:8px;font-size:11px;color:var(--tx3)"><i class="fab fa-telegram"></i> تلجرام: مُتاح بعد القبول</div>` : ''}
    </div>` : (ROLE === 'guest') && j.phone ? `
    <div style="margin-bottom:20px;padding:12px 14px;background:var(--bgc2);border-radius:14px;border:1px solid var(--br);text-align:center">
      <i class="fas fa-lock" style="color:var(--tx3);font-size:18px;display:block;margin-bottom:6px"></i>
      <div style="font-size:12px;color:var(--tx2);font-weight:700">سجّل حساباً مجانياً لعرض بيانات التواصل</div>
      <button class="btn bp bsm" style="margin-top:8px" onclick="cmo('moJob');showAuth()">تسجيل مجاني</button>
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
        title="مشاركة عبر واتساب">
        <i class="fab fa-whatsapp"></i>
      </button>
      <button onclick="shareJobTelegram('${j.id}')"
        style="width:46px;height:46px;border-radius:11px;background:#229ed9;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0"
        title="مشاركة عبر تيليغرام">
        <i class="fab fa-telegram-plane"></i>
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
  if (!requireAuth('seeker')) return;
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
      <div class="jlo" style="width:46px;height:46px;border-radius:12px;font-size:19px;flex-shrink:0">${san(j.logo) || '🏢'}</div>
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

    ${(() => {
      const ivSc = U?.uid ? parseInt(localStorage.getItem('iv_last_score_' + U.uid) || '0') : 0;
      const rows = [];
      if (quizScore !== null) rows.push(`
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:22px;font-weight:900;color:${quizScore >= 80 ? 'var(--success)' : quizScore >= 55 ? 'var(--acc)' : 'var(--danger)'}">${quizScore}</div>
          <div>
            <div style="font-size:11px;color:var(--tx3)"><i class="fas fa-puzzle-piece"></i> اختبار المعرفة</div>
            <div style="font-size:12px;color:var(--tx);font-weight:600">${san(quizFeedback)}</div>
          </div>
        </div>`);
      if (ivSc > 0) rows.push(`
        <div style="display:flex;align-items:center;gap:12px${quizScore !== null ? ';border-top:1px solid rgba(13,148,136,.15);padding-top:10px;margin-top:10px' : ''}">
          <div style="font-size:22px;font-weight:900;color:${ivSc >= 80 ? 'var(--success)' : ivSc >= 60 ? 'var(--acc)' : 'var(--danger)'}">${ivSc}%</div>
          <div>
            <div style="font-size:11px;color:var(--tx3)"><i class="fas fa-robot"></i> المقابلة الذكية</div>
            <div style="font-size:12px;color:var(--tx);font-weight:600">${ivSc >= 80 ? 'ممتاز' : ivSc >= 60 ? 'جيد جداً' : 'يحتاج تحسين'}</div>
          </div>
        </div>`);
      return rows.length ? `
        <div style="background:linear-gradient(135deg,rgba(13,148,136,.08),rgba(13,148,136,.03));border:1px solid rgba(13,148,136,.2);border-radius:12px;padding:12px 14px;margin-bottom:14px">
          ${rows.join('')}
        </div>` : '';
    })()}

    <div class="mf" style="padding:0;border:none;margin-top:14px">
      <button class="btn bo" onclick="cmo('moApply')"><i class="fas fa-times"></i>إلغاء</button>
      <button class="btn bp blg" id="applyBtn" onclick="submitApply(${quizScore !== null ? quizScore : 'null'},'${san(quizFeedback).replace(/'/g,"\\'")}')">
        <i class="fas fa-paper-plane"></i>إرسال الطلب
      </button>
    </div>`;
  oMo('moApply');
}

// حماية من الإرسال المتكرر — 30 ثانية بين كل طلبَين
const _applyThrottle = {};
async function submitApply(quizScore = null, quizFeedback = '') {
  if (!requireAuth('seeker')) return;
  const j    = SEL_JOB;
  // منع التكرار: 30 ثانية بين كل طلب وآخر
  const now = Date.now();
  if (_applyThrottle[j.id] && now - _applyThrottle[j.id] < 30000) {
    notify('تنبيه', 'انتظر قليلاً قبل المحاولة مجدداً', 'warning'); return;
  }
  // التحقق أن المستخدم لم يتقدم مسبقاً (فحص ثانٍ قبل الإرسال)
  if (MY_APPS.find(a => a.jobId === j.id)) {
    notify('تنبيه', 'لقد تقدمت لهذه الوظيفة مسبقاً', 'warning'); return;
  }

  const name = document.getElementById('ap_n')?.value.trim();
  const ph   = document.getElementById('ap_ph')?.value.trim();
  const em   = document.getElementById('ap_e')?.value.trim();
  const cv   = document.getElementById('ap_cv')?.value.trim();
  const exp  = document.getElementById('ap_exp')?.value;
  const url  = document.getElementById('ap_url')?.value.trim();
  if (!name) { notify('خطأ', 'أدخل الاسم الكامل', 'error'); return; }
  if (!ph)   { notify('خطأ', 'أدخل رقم الهاتف', 'error'); return; }
  if (!em)   { notify('خطأ', 'أدخل البريد الإلكتروني', 'error'); return; }
  if (!cv || cv.length < 30) { notify('خطأ', 'رسالة التغطية يجب أن تكون 30 حرفاً على الأقل', 'error'); return; }
  const cleanPh = ph.replace(/[\s\-]/g, '');
  if (!/^(07[3-9]\d{8}|\+9647[3-9]\d{8}|009647[3-9]\d{8})$/.test(cleanPh)) {
    notify('خطأ', 'رقم الهاتف يجب أن يكون عراقياً صحيحاً (07XXXXXXXXX أو +9647XXXXXXXXX)', 'error'); return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { notify('خطأ', 'البريد الإلكتروني غير صحيح', 'error'); return; }
  if (url && !url.startsWith('http')) { notify('خطأ', 'رابط السيرة الذاتية يجب أن يبدأ بـ http', 'error'); return; }
  const ivScore = U?.uid ? parseInt(localStorage.getItem('iv_last_score_' + U.uid) || '0') : null;
  const app = {
    jobId: j.id, jobTitle: j.title, company: j.company,
    postedBy: j.postedBy || null,
    applicantId: U?.uid, name, phone: ph, email: em,
    cover: cv, exp, cvUrl: url || null,
    quizScore: quizScore !== null ? quizScore : null,
    quizFeedback: quizFeedback || null,
    ivScore: ivScore || null,
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
  _applyThrottle[j.id] = Date.now(); // تسجيل وقت الإرسال
  MY_APPS.unshift(app);
  j.applicants = (j.applicants || 0) + 1;
  await notifyAdmin(`طلب جديد — ${j.title}`, `<b>المتقدم:</b> ${name}`, `📩 طلب جديد\nالاسم: ${name}\nالوظيفة: ${j.title}\nالهاتف: ${ph}`);
  // تحديث شارة الإشعارات
  const ndot = document.getElementById('ndot');
  if (ndot) ndot.style.display = 'block';
  cmo('moApply');
  notify('تم الإرسال ✅', `طلبك على "${j.title}" أُرسل بنجاح`, 'success');
}

// ══════════════════════════════════════════════════════════
// نظام المشاركة على التواصل الاجتماعي
// ══════════════════════════════════════════════════════════

// رابط الوظيفة المخصص — يمر عبر Worker لإنشاء بطاقة OG احترافية لواتساب
function _getJobShareURL(jobId) {
  return `${window.WORKER_URL}/job/${jobId}`;
}

function _buildShareText(j, long = false) {
  const sal     = j.salary ? `${fmt(j.salary)}${j.salaryMax ? '–' + fmt(j.salaryMax) : ''} ${j.currency || 'IQD'}` : 'قابل للتفاوض';
  const type    = jobTypeLabel(j.type);
  const shareURL = _getJobShareURL(j.id);
  if (long) {
    return `🔔 *فرصة عمل — عفراء للتوظيف*\n\n` +
      `💼 *${j.title}*\n🏢 ${j.company}\n📍 ${j.province || '—'} | ${type}\n💰 ${sal}\n⏳ آخر موعد: ${j.deadline || '—'}\n\n` +
      `${j.desc ? j.desc.slice(0, 150) + '...' : ''}\n\n` +
      `👆 تقدّم الآن عبر منصة عفراء للتوظيف ✨\n${shareURL}`;
  }
  return `فرصة عمل: ${j.title} — ${j.company} | ${j.province || ''} | ${type} | ${sal} — عفراء للتوظيف ✨ ${shareURL}`;
}

// ── مشاركة الوظيفة عبر WhatsApp ──
function shareJobWhatsApp(id) {
  const j = JOBS.find(x => x.id === id);
  if (!j) return;
  window.open(`https://wa.me/?text=${encodeURIComponent(_buildShareText(j, true))}`, '_blank');
}

// ── مشاركة الوظيفة عبر تيليغرام ──
function shareJobTelegram(id) {
  const j = JOBS.find(x => x.id === id);
  if (!j) return;
  const shareURL = _getJobShareURL(id);
  window.open(`https://t.me/share/url?url=${encodeURIComponent(shareURL)}&text=${encodeURIComponent(_buildShareText(j, false))}`, '_blank');
}

// ── نافذة المشاركة الشاملة ──
function shareJobGeneral(id) {
  const j = JOBS.find(x => x.id === id);
  if (!j) return;
  const shareURL = _getJobShareURL(id);
  _openSharePanel({
    title:    j.title,
    text:     _buildShareText(j, false),
    longText: _buildShareText(j, true),
    url:      shareURL,
  });
}

// ── مشاركة المنصة نفسها ──
function sharePlatform() {
  const base  = 'https://afra-iq.com';
  const text  = `✨ عفراء للتوظيف — منصة التوظيف الأولى في العراق!\n\nآلاف الوظائف في 18 محافظة، تقدّم بنقرة واحدة وتابع طلبك لحظة بلحظة.\nذكاء اصطناعي يساعدك في المقابلة والسيرة الذاتية.\n\n${base}`;
  const short = `عفراء للتوظيف — منصة التوظيف الأولى في العراق ✨ ${base}`;
  _openSharePanel({ title: 'عفراء للتوظيف', text: short, longText: text, url: base });
}

// ── بناء نافذة المشاركة ──
function _openSharePanel({ title, text, longText, url }) {
  document.getElementById('_sharePanel')?.remove();

  // Web Share API (موبايل أصلي)
  if (navigator.share) {
    navigator.share({ title, text, url }).catch(() => {});
    return;
  }

  const enc   = encodeURIComponent;
  const panel = document.createElement('div');
  panel.id    = '_sharePanel';
  panel.className = 'share-panel';
  panel.innerHTML = `
    <div class="share-panel-inner">
      <div class="share-panel-title"><i class="fas fa-share-alt" style="color:var(--p)"></i> مشاركة</div>
      <div class="share-btns">
        <a class="share-btn" style="background:#25d366" href="https://wa.me/?text=${enc(longText)}" target="_blank" title="WhatsApp">
          <i class="fab fa-whatsapp"></i><span>واتساب</span></a>
        <a class="share-btn" style="background:#229ed9" href="https://t.me/share/url?url=${enc(url)}&text=${enc(text)}" target="_blank" title="Telegram">
          <i class="fab fa-telegram-plane"></i><span>تيليغرام</span></a>
        <a class="share-btn" style="background:#1877f2" href="https://www.facebook.com/sharer/sharer.php?u=${enc(url)}&quote=${enc(text)}" target="_blank" title="Facebook">
          <i class="fab fa-facebook-f"></i><span>فيسبوك</span></a>
        <a class="share-btn" style="background:#000" href="https://twitter.com/intent/tweet?text=${enc(text)}" target="_blank" title="X / Twitter">
          <i class="fab fa-x-twitter"></i><span>تويتر</span></a>
        <a class="share-btn" style="background:#0a66c2" href="https://www.linkedin.com/shareArticle?mini=true&url=${enc(url)}&title=${enc(title)}&summary=${enc(text)}" target="_blank" title="LinkedIn">
          <i class="fab fa-linkedin-in"></i><span>لينكدإن</span></a>
        <button class="share-btn share-copy" style="background:var(--bgc2);color:var(--tx);border:1.5px solid var(--br)" onclick="_copyShareLink('${url}',this)">
          <i class="fas fa-link"></i><span>نسخ الرابط</span></button>
      </div>
      <button class="share-close" onclick="document.getElementById('_sharePanel')?.remove()">
        <i class="fas fa-times"></i> إغلاق
      </button>
    </div>`;

  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.classList.add('on'));
  panel.addEventListener('click', e => { if (e.target === panel) panel.remove(); });
}

function _copyShareLink(url, btn) {
  navigator.clipboard?.writeText(url).then(() => {
    btn.innerHTML = '<i class="fas fa-check"></i><span>تم النسخ!</span>';
    btn.style.background = 'rgba(34,197,94,.15)';
    btn.style.color      = 'var(--success)';
    btn.style.borderColor = 'var(--success)';
    setTimeout(() => {
      btn.innerHTML = '<i class="fas fa-link"></i><span>نسخ الرابط</span>';
      btn.style = '';
    }, 2000);
  }).catch(() => notify('تنبيه', 'انسخ الرابط يدوياً من شريط العنوان', 'info'));
}

// ══════════════════════════════════════════════════════════
// الفلتر الجغرافي — وظائف قريبة مني
// ══════════════════════════════════════════════════════════

function geoFilterJobs() {
  if (!navigator.geolocation) {
    notify('غير مدعوم', 'متصفحك لا يدعم تحديد الموقع', 'error');
    return;
  }
  const btn = document.getElementById('geoBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> جارٍ...'; }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      let nearest = null, minDist = Infinity;
      for (const [name, [pLat, pLng]] of Object.entries(PROV_COORDS)) {
        const d = (lat - pLat) ** 2 + (lng - pLng) ** 2;
        if (d < minDist) { minDist = d; nearest = name; }
      }
      if (btn) { btn.disabled = false; btn.innerHTML = `<i class="fas fa-map-marker-alt"></i> ${nearest || 'قريبة'}`; }
      if (nearest) {
        JF.prov = nearest;
        const sel = document.querySelector('select[onchange*="JF.prov"]');
        if (sel) sel.value = nearest;
        rJobs();
        notify('تم التحديد 📍', `يعرض وظائف ${nearest}`, 'success');
      }
    },
    () => {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-map-marker-alt"></i> قريبة مني'; }
      notify('تعذّر التحديد', 'اسمح بالوصول للموقع من إعدادات المتصفح', 'warning');
    },
    { timeout: 10000, maximumAge: 300000 }
  );
}

// ══════════════════════════════════════════════════════════
// التقديم السريع بدون حساب (Guest Mode)
// ══════════════════════════════════════════════════════════
function guestQuickApply(jobId) {
  const j = JOBS.find(x => x.id === jobId);
  if (!j) return;

  document.getElementById('moApplyB').innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(13,148,136,.1),rgba(13,148,136,.03));border:1px solid rgba(13,148,136,.25);border-radius:12px;padding:12px 14px;margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:var(--p);margin-bottom:3px"><i class="fas fa-bolt"></i> تقديم سريع — بدون حساب</div>
      <div style="font-size:11px;color:var(--tx2)">قدّم الآن ثم سجّل حساباً لمتابعة طلبك وزيادة فرصك</div>
    </div>

    <div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bgc2);border-radius:12px;margin-bottom:16px;border:1px solid var(--br)">
      <div class="jlo" style="width:44px;height:44px;border-radius:10px;font-size:18px;flex-shrink:0">${san(j.logo) || '🏢'}</div>
      <div>
        <div style="font-size:13px;font-weight:800;color:var(--tx)">${san(j.title)}</div>
        <div style="font-size:11px;color:var(--tx2)">${san(j.company)} • ${san(j.province || '')}</div>
      </div>
    </div>

    <div class="fr">
      <div class="fg"><label class="fl req">الاسم الكامل</label><input type="text" id="ga_n" class="fc" placeholder="محمد علي الحسيني"></div>
      <div class="fg"><label class="fl req">رقم الهاتف</label><input type="tel" id="ga_ph" class="fc" placeholder="07XXXXXXXXX"></div>
    </div>
    <div class="fg">
      <label class="fl">رسالة مختصرة <span style="color:var(--tx3);font-weight:400">(اختياري)</span></label>
      <textarea id="ga_cv" class="fc" rows="3" placeholder="لماذا أنت مناسب لهذه الوظيفة؟"></textarea>
    </div>
    <div class="al al-i" style="margin-bottom:14px;font-size:11px">
      <i class="fas fa-shield-alt"></i>
      <span>بياناتك محمية ولن تُشارك إلا مع صاحب الوظيفة المباشر</span>
    </div>
    <div class="mf" style="padding:0;border:none">
      <button class="btn bo" onclick="cmo('moApply')"><i class="fas fa-times"></i>إلغاء</button>
      <button class="btn bp blg" id="guestApplyBtn" onclick="submitGuestApply('${j.id}')">
        <i class="fas fa-paper-plane"></i>تقديم سريع
      </button>
    </div>
    <div style="text-align:center;margin-top:14px;padding-top:12px;border-top:1px solid var(--br)">
      <span style="font-size:11px;color:var(--tx3)">لديك حساب؟ </span>
      <button onclick="cmo('moApply');showAuth()" style="background:none;border:none;color:var(--p);font-size:11px;font-family:Cairo,sans-serif;cursor:pointer;font-weight:800">سجّل الدخول وقدّم بملف كامل</button>
    </div>`;
  oMo('moApply');
}

async function submitGuestApply(jobId) {
  const j    = JOBS.find(x => x.id === jobId);
  const name = document.getElementById('ga_n')?.value.trim();
  const ph   = document.getElementById('ga_ph')?.value.trim();
  const cv   = document.getElementById('ga_cv')?.value.trim() || 'طلب تقديم سريع';

  if (!name) { notify('خطأ', 'أدخل اسمك الكامل', 'error'); return; }
  const cleanPh = ph.replace(/[\s\-]/g, '');
  if (!/^(07[3-9]\d{8}|\+9647[3-9]\d{8}|009647[3-9]\d{8})$/.test(cleanPh)) {
    notify('خطأ', 'رقم الهاتف يجب أن يكون عراقياً (07XXXXXXXXX)', 'error'); return;
  }

  loading('guestApplyBtn', true);
  const app = {
    jobId,
    jobTitle:    j?.title,
    company:     j?.company,
    postedBy:    j?.postedBy || null,
    applicantId: 'guest_' + Date.now(),
    name, phone: ph, email: '',
    cover:       cv,
    exp:         'غير محدد',
    isGuestApply: true,
    status:      'pending',
    appliedAt:   new Date().toISOString(),
  };

  if (!DEMO && window.db) {
    try {
      await window.db.collection('applications').add({ ...app, appliedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await window.db.collection('jobs').doc(jobId).update({ applicants: firebase.firestore.FieldValue.increment(1) });
    } catch(e) { console.warn('guestApply:', e); }
  }

  cmo('moApply');
  j.applicants = (j.applicants || 0) + 1;
  notify('تم الإرسال ✅', 'سجّل حساباً لمتابعة طلبك وزيادة فرصك!', 'success');

  setTimeout(() => {
    confirm2(
      'سجّل لمتابعة طلبك',
      `تم إرسال طلبك على "${j?.title}" بنجاح! سجّل حساباً مجانياً الآن لمتابعة حالة طلبك وتحسين فرصك في القبول.`,
      () => showAuth()
    );
  }, 1500);
}

// ── ترشيح موظف من مكتب التوظيف ──
function referCandidate(jobId) {
  if (!requireAuth('office')) return;
  const j = JOBS.find(x => x.id === jobId);
  if (!j) return;
  const el = document.getElementById('moApplyB');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:14px;background:var(--bgc2);border-radius:12px;margin-bottom:20px;border:1px solid var(--br)">
      <div class="jlo" style="width:46px;height:46px;border-radius:12px;font-size:19px;flex-shrink:0">${san(j.logo) || '🏢'}</div>
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
  if (!requireAuth('office')) return;
  const j    = JOBS.find(x => x.id === jobId);
  const name = document.getElementById('ref_n')?.value.trim();
  const ph   = document.getElementById('ref_ph')?.value.trim();
  const em   = document.getElementById('ref_e')?.value.trim();
  const exp  = document.getElementById('ref_exp')?.value;
  const note = document.getElementById('ref_note')?.value.trim();
  if (!name || !ph || !em) { notify('خطأ', 'أكمل بيانات المرشّح', 'error'); return; }
  if (!/^07[3-9]\d{8}$/.test(ph.replace(/\s/g,''))) { notify('خطأ', 'رقم الهاتف يجب أن يكون عراقياً (07XXXXXXXXX)', 'error'); return; }
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
