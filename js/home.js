// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — home.js                          ║
// ║  الرئيسية + صفحات الأدمن الأربع                    ║
// ╚══════════════════════════════════════════════════════╝

function selectCat(cat) { JF = { type:'', cat:cat, prov:'', q:'' }; JSORT = 'newest'; goTo('jobs'); }

async function toggleCvPublish(btn) {
  if (!U || ROLE !== 'seeker') return;
  const next = !P?.cvPublished;
  P = { ...P, cvPublished: next };
  if (!DEMO && window.db) {
    try { await window.db.collection('users').doc(U.uid).update({ cvPublished: next }); } catch(e) { console.warn('cvPublish:', e.message); }
  }
  notify(
    next ? 'ملفك منشور ✅' : 'تم إخفاء ملفك',
    next ? 'المكاتب وأصحاب العمل يستطيعون الآن رؤية ملفك' : 'لن يظهر ملفك للمكاتب بعد الآن',
    next ? 'success' : 'info'
  );
  // تحديث البطاقة مباشرة بدون إعادة تحميل كاملة
  const ico = btn.querySelector('.qact-ico');
  const tit = btn.querySelector('.qact-tit');
  const sub = btn.querySelector('.qact-sub');
  if (ico) { ico.style.background = next ? 'linear-gradient(135deg,#22c55e,#4ade80)' : 'linear-gradient(135deg,#64748b,#94a3b8)'; ico.innerHTML = `<i class="fas fa-${next ? 'eye' : 'eye-slash'}"></i>`; }
  if (tit) tit.textContent = next ? 'ملفك منشور ✅' : 'انشر ملفك الوظيفي';
  if (sub) sub.textContent = next ? 'المكاتب وأصحاب العمل يستطيعون رؤية ملفك' : 'اجعل ملفك مرئياً للمكاتب وأصحاب العمل';
}

// ════════════════════════════════════════════
// رئيسية الباحث
// ════════════════════════════════════════════
function pgSeekerHome(el) {
  const nm       = P?.name?.split(' ')[0] || 'مستخدم';
  const newJ     = JOBS.filter(j => (Date.now() - tsMs(j.postedAt)) < 86400000 * 3).length;
  const matchedJ = JOBS.filter(j => P?.province && j.province === P.province).length;
  const pct      = getCompletion(P, 'seeker');
  const pColor   = completionColor(pct);
  const stats    = {
    total:     MY_APPS.length,
    pending:   MY_APPS.filter(a => a.status === 'pending').length,
    interview: MY_APPS.filter(a => a.status === 'interview').length,
    hired:     MY_APPS.filter(a => a.status === 'hired').length,
  };
  const greet = new Date().getHours() < 12 ? 'صباح الخير' : new Date().getHours() < 18 ? 'مساء الخير' : 'مساء النور';

  el.innerHTML = `
    <div class="hero-banner fade-up">
      <div class="hero-lamp">🪔</div>
      <div class="hero-content">
        <p class="hero-label">${greet}، مرحباً بك في الفانوس 👋</p>
        <h2 class="hero-name">أهلاً، ${nm}</h2>
        <p class="hero-sub">
          ${newJ ? '<strong>' + newJ + ' وظيفة</strong> جُددت هذا الأسبوع' : 'تصفح الوظائف المتاحة'}
          ${matchedJ ? ' • <strong>' + matchedJ + '</strong> في محافظتك' : ''}
          ${BOOKMARKS.length ? ' • <strong>' + BOOKMARKS.length + '</strong> محفوظة' : ''}
        </p>
        <div class="hero-actions">
          <button class="btn bp" onclick="goTo('jobs')"><i class="fas fa-search"></i>ابحث عن وظيفة</button>
          <button class="btn" style="border:1px solid rgba(255,255,255,.25);color:#fff;background:rgba(255,255,255,.08);gap:6px;padding:9px 16px;border-radius:9px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;cursor:pointer;font-family:Cairo,sans-serif"
            onclick="oMo('moIV');buildIVModal()"><i class="fas fa-robot"></i>تدرّب للمقابلة</button>
          <button class="btn" style="border:1px solid rgba(255,255,255,.2);color:#fff;background:rgba(255,255,255,.07);gap:6px;padding:9px 16px;border-radius:9px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;cursor:pointer;font-family:Cairo,sans-serif"
            onclick="sharePlatform()"><i class="fas fa-share-alt"></i>شارك المنصة</button>
        </div>
      </div>
    </div>

    ${pct < 90 ? `
    <div class="comp-card fade-up del1">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <div class="comp-label"><i class="fas fa-user-check"></i>اكتمال ملفك الشخصي</div>
          <div class="comp-val" style="color:${pColor}">${pct}%</div>
          <div class="comp-hint">ملف مكتمل = فرص توظيف أفضل</div>
        </div>
        <button class="btn bp bsm" onclick="goTo('profile')"><i class="fas fa-pencil-alt"></i>أكمل ملفي</button>
      </div>
      <div class="comp-bar-wrap"><div class="comp-bar" style="--w:${pct}%;background:${pColor}"></div></div>
      <div class="comp-actions">
        ${!P?.phone    ? '<span class="comp-tip"><i class="fas fa-times-circle" style="color:var(--danger)"></i>رقم الهاتف</span>' : ''}
        ${!P?.jobTitle ? '<span class="comp-tip"><i class="fas fa-times-circle" style="color:var(--danger)"></i>المسمى الوظيفي</span>' : ''}
        ${!P?.bio      ? '<span class="comp-tip"><i class="fas fa-times-circle" style="color:var(--danger)"></i>نبذة شخصية</span>' : ''}
      </div>
    </div>` : `
    <div class="comp-card fade-up del1" style="border-color:rgba(34,197,94,.3)">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(34,197,94,.12);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--success);flex-shrink:0"><i class="fas fa-check-circle"></i></div>
        <div><div style="font-size:13px;font-weight:800;color:var(--tx)">ملفك الشخصي مكتمل ✅</div><div style="font-size:11px;color:var(--tx2)">أنت في وضع ممتاز للحصول على وظيفة</div></div>
        <div style="margin-right:auto;font-size:22px;font-weight:900;color:var(--success)">${pct}%</div>
      </div>
    </div>`}

    <div class="sg fade-up del2">
      <div class="sc sc-link" onclick="goTo('jobs')">
        <div class="si tl"><i class="fas fa-briefcase"></i></div>
        <div><div class="sl">وظائف متاحة</div><div class="sv">${JOBS.length}</div>
        <div class="sc-trend up"><i class="fas fa-arrow-up"></i>${newJ} جديدة</div></div>
      </div>
      <div class="sc sc-link" onclick="goTo('myapps')">
        <div class="si am"><i class="fas fa-paper-plane"></i></div>
        <div><div class="sl">طلباتي</div><div class="sv">${stats.total}</div>
        ${stats.pending ? '<div class="sc-trend neu"><i class="fas fa-hourglass-half"></i>' + stats.pending + ' انتظار</div>' : '<div class="sc-trend neu">—</div>'}</div>
      </div>
      <div class="sc sc-link" onclick="goTo('myapps')">
        <div class="si pu"><i class="fas fa-comments"></i></div>
        <div><div class="sl">مقابلات</div><div class="sv">${stats.interview}</div>
        ${stats.interview ? '<div class="sc-trend up"><i class="fas fa-star"></i>أداء رائع!</div>' : '<div class="sc-trend neu">—</div>'}</div>
      </div>
      <div class="sc sc-link" onclick="goTo('myapps')">
        <div class="si gr"><i class="fas fa-check-circle"></i></div>
        <div><div class="sl">تم القبول</div><div class="sv">${stats.hired}</div>
        ${stats.hired ? '<div class="sc-trend up"><i class="fas fa-trophy"></i>مبروك!</div>' : '<div class="sc-trend neu">—</div>'}</div>
      </div>
    </div>

    <div class="sh fade-up del3">
      <div class="st"><div class="st-ico"><i class="fas fa-th-large"></i></div>تصفح حسب التخصص</div>
      <button class="btn bg bsm" onclick="goTo('jobs')">الكل <i class="fas fa-arrow-left"></i></button>
    </div>
    <div class="cat-grid fade-up del3">
      ${[
        { v:'tech',  l:'تقنية',  ic:'fa-laptop-code',    c:'var(--info)' },
        { v:'biz',   l:'أعمال',  ic:'fa-chart-line',     c:'var(--acc)' },
        { v:'med',   l:'طب',     ic:'fa-stethoscope',    c:'var(--danger)' },
        { v:'edu',   l:'تعليم',  ic:'fa-graduation-cap', c:'var(--purple)' },
        { v:'eng',   l:'هندسة',  ic:'fa-cogs',           c:'var(--p)' },
        { v:'other', l:'أخرى',   ic:'fa-ellipsis-h',     c:'var(--tx2)' },
      ].map(c => {
        const cnt = JOBS.filter(j => j.cat === c.v).length;
        return `<div class="cat-item" onclick="selectCat('${c.v}')"><div class="cat-ico" style="color:${c.c};background:${c.c}18"><i class="fas ${c.ic}"></i></div><div class="cat-label">${c.l}</div><div class="cat-count">${cnt} وظيفة</div></div>`;
      }).join('')}
    </div>

    <div class="sh fade-up del4"><div class="st"><div class="st-ico"><i class="fas fa-bolt"></i></div>أدوات المهنة</div></div>
    <div class="qact-grid fade-up del4">
      <div class="qact-card" onclick="oMo('moCV');buildCVModal()">
        <div class="qact-ico" style="background:linear-gradient(135deg,var(--p),var(--pl))"><i class="fas fa-file-alt"></i></div>
        <div class="qact-tit">منشئ السيرة الذاتية</div>
        <div class="qact-sub">أنشئ سيرة ذاتية احترافية وحمّلها PDF</div>
        <i class="fas fa-arrow-left qact-arr"></i>
      </div>
      <div class="qact-card" onclick="oMo('moIV');buildIVModal()">
        <div class="qact-ico" style="background:linear-gradient(135deg,var(--purple),#a78bfa)"><i class="fas fa-robot"></i></div>
        <div class="qact-tit">المقابلة الذكية</div>
        <div class="qact-sub">تدرّب مع الذكاء الاصطناعي وقيّم أداءك</div>
        <i class="fas fa-arrow-left qact-arr"></i>
      </div>
      <div class="qact-card" onclick="goTo('offices')">
        <div class="qact-ico" style="background:linear-gradient(135deg,#f59e0b,#fbbf24)"><i class="fas fa-building"></i></div>
        <div class="qact-tit">مكاتب التوظيف</div>
        <div class="qact-sub">تصفح مكاتب التوظيف وتواصل معها مباشرة</div>
        <i class="fas fa-arrow-left qact-arr"></i>
      </div>
      <div class="qact-card" onclick="toggleCvPublish(this)">
        <div class="qact-ico" style="background:linear-gradient(135deg,${P?.cvPublished ? '#22c55e' : '#64748b'},${P?.cvPublished ? '#4ade80' : '#94a3b8'})">
          <i class="fas fa-${P?.cvPublished ? 'eye' : 'eye-slash'}"></i>
        </div>
        <div class="qact-tit">${P?.cvPublished ? 'ملفك منشور ✅' : 'انشر ملفك الوظيفي'}</div>
        <div class="qact-sub">${P?.cvPublished ? 'المكاتب وأصحاب العمل يستطيعون رؤية ملفك' : 'اجعل ملفك مرئياً للمكاتب وأصحاب العمل'}</div>
        <i class="fas fa-arrow-left qact-arr"></i>
      </div>
    </div>

    <div class="sh fade-up del5">
      <div class="st">
        <div class="st-ico" style="background:linear-gradient(135deg,#ef4444,#f87171)"><i class="fas fa-fire-alt"></i></div>
        أحدث الوظائف
      </div>
      <button class="btn bg bsm" onclick="goTo('jobs')">عرض الكل <i class="fas fa-arrow-left"></i></button>
    </div>
    <div class="jg fade-up del5">${JOBS.slice(0, 4).map(j => jCard(j)).join('')}</div>`;
}

// ════════════════════════════════════════════
// رئيسية الأدمن
// ════════════════════════════════════════════
async function pgAdminHome(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ تحميل البيانات...</div></div>`;

  let totalUsers = 0, totalOffices = 0, totalApps = 0, newThisWeek = 0;
  let recentJobs = JOBS.slice(0, 4);

  if (!DEMO && window.db) {
    const queries = [];

    // محاولة تحميل إحصاءات المستخدمين
    queries.push(
      window.db.collection('users').get()
        .then(snap => {
          totalUsers   = snap.size;
          totalOffices = snap.docs.filter(d => d.data().role === 'office').length;
          newThisWeek  = snap.docs.filter(d => {
            const t = d.data().createdAt?.toMillis?.() || 0;
            return (Date.now() - t) < 86400000 * 7;
          }).length;
        })
        .catch(e => console.warn('Admin users stats:', e.message))
    );

    // محاولة تحميل إجمالي الطلبات
    queries.push(
      window.db.collection('applications').get()
        .then(snap => { totalApps = snap.size; })
        .catch(e => console.warn('Admin apps stats:', e.message))
    );

    // تحميل الوظائف إذا كان المصفوفة فارغة
    if (JOBS.length === 0) {
      queries.push(
        window.db.collection('jobs').orderBy('postedAt', 'desc').limit(10).get()
          .then(snap => {
            recentJobs = snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 4);
            if (JOBS.length === 0) JOBS.push(...recentJobs);
          })
          .catch(e => console.warn('Admin jobs load:', e.message))
      );
    }

    await Promise.all(queries);
  }

  const newJobs = JOBS.filter(j => (Date.now() - tsMs(j.postedAt)) < 86400000 * 7).length;
  if (recentJobs.length === 0) recentJobs = JOBS.slice(0, 4);

  el.innerHTML = `
    <div class="hero-banner fade-up">
      <div class="hero-lamp">🪔</div>
      <div class="hero-content">
        <p class="hero-label">لوحة التحكم</p>
        <h2 class="hero-name">مرحباً بك، مدير النظام 🛡️</h2>
        <p class="hero-sub">نظرة عامة على أداء المنصة — ${new Date().toLocaleDateString('ar-IQ')}</p>
      </div>
    </div>
    <div class="sg fade-up del1">
      <div class="sc sc-link" onclick="goTo('allusers')">
        <div class="si tl"><i class="fas fa-users"></i></div>
        <div><div class="sl">المستخدمون</div><div class="sv">${totalUsers}</div>
        <div class="sc-trend up"><i class="fas fa-arrow-up"></i>+${newThisWeek} هذا الأسبوع</div></div>
      </div>
      <div class="sc sc-link" onclick="goTo('alljobs')">
        <div class="si am"><i class="fas fa-briefcase"></i></div>
        <div><div class="sl">الوظائف</div><div class="sv">${JOBS.length}</div>
        <div class="sc-trend up"><i class="fas fa-arrow-up"></i>${newJobs} جديدة</div></div>
      </div>
      <div class="sc sc-link" onclick="goTo('alloffices')">
        <div class="si bl"><i class="fas fa-building"></i></div>
        <div><div class="sl">مكاتب التوظيف</div><div class="sv">${totalOffices}</div>
        <div class="sc-trend neu"><i class="fas fa-circle"></i>نشطة</div></div>
      </div>
      <div class="sc">
        <div class="si gr"><i class="fas fa-paper-plane"></i></div>
        <div><div class="sl">إجمالي الطلبات</div><div class="sv">${totalApps}</div>
        <div class="sc-trend up"><i class="fas fa-chart-line"></i>مجموع كل الوقت</div></div>
      </div>
    </div>
    <div class="sh fade-up del2"><div class="st"><div class="st-ico"><i class="fas fa-bolt"></i></div>إدارة سريعة</div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:20px" class="fade-up del2">
      ${[
        { ico:'fa-plus-circle', l:'نشر وظيفة جديدة',  c:'var(--success)', a:"openAddJob()" },
        { ico:'fa-briefcase',   l:'الوظائف',            c:'var(--acc)',     a:"goTo('alljobs')" },
        { ico:'fa-building',    l:'مكاتب التوظيف',     c:'var(--purple)',  a:"goTo('alloffices')" },
        { ico:'fa-users',       l:'المستخدمون',          c:'var(--info)',    a:"goTo('allusers')" },
        { ico:'fa-bullhorn',    l:'حملات التواصل',      c:'var(--p)',       a:"goTo('campaigns')" },
        { ico:'fa-cog',         l:'الإعدادات',           c:'var(--tx3)',     a:"goTo('settings')" },
      ].map(a => '<div class="cat-item" onclick="' + a.a + '"><div class="cat-ico" style="color:' + a.c + ';background:' + a.c + '18"><i class="fas ' + a.ico + '"></i></div><div class="cat-label">' + a.l + '</div></div>').join('')}
    </div>
    <div class="sh fade-up del3"><div class="st"><div class="st-ico"><i class="fas fa-briefcase"></i></div>أحدث الوظائف</div>
      <span class="b b-tl" onclick="goTo('alljobs')" style="cursor:pointer">${JOBS.length} وظيفة</span>
    </div>
    ${recentJobs.length
      ? `<div class="jg fade-up del3">${recentJobs.map(j => _adminJobCard(j)).join('')}</div>`
      : `<div class="es" style="padding:28px"><div class="es-ico"><i class="fas fa-briefcase" style="color:var(--tx3)"></i></div><div class="es-desc">لا توجد وظائف بعد — <span style="color:var(--p);cursor:pointer" onclick="openAddJob()">أضف أول وظيفة</span></div></div>`
    }`;
}

// ════════════════════════════════════════════
// صفحة الوظائف — أدمن
// ════════════════════════════════════════════
function pgAdminJobs(el) {
  const live    = JOBS.filter(j => isJobLive(j)).length;
  const expired = JOBS.filter(j => !isJobLive(j)).length;
  const pinned  = JOBS.filter(j => j.adminPinned).length;

  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-briefcase"></i></div>إدارة الوظائف</div>
      <span class="b b-tl">${JOBS.length} وظيفة</span>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
      <span class="b b-gr"><i class="fas fa-circle" style="font-size:8px"></i> نشطة: ${live}</span>
      <span class="b b-rd"><i class="fas fa-clock"></i> منتهية: ${expired}</span>
      <span class="b b-pu"><i class="fas fa-thumbtack"></i> مثبّتة: ${pinned}</span>
    </div>
    <div class="jg">${JOBS.map(j => _adminJobCard(j)).join('')}
    </div>`;
}

function _adminJobCard(j) {
  const live = isJobLive(j);
  const init = (j.company || j.title || 'و').charAt(0);
  return `<div class="jc" style="${live ? '' : 'opacity:.75;'}">
    <div class="jch" style="cursor:pointer" onclick="openJob('${j.id}')">
      <div class="jcl">
        <div class="av avm" style="background:${live ? 'var(--grad-p)' : 'linear-gradient(135deg,#9ca3af,#6b7280)'};color:#fff;font-size:16px;font-weight:900;flex-shrink:0">${init}</div>
        <div style="flex:1;min-width:0">
          <div class="jct" style="margin-bottom:2px">${san(j.title)}</div>
          <div class="jcco">${san(j.company)} • ${san(j.province)}</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
        ${live
          ? `<span class="b b-gr" style="font-size:11px"><i class="fas fa-circle" style="font-size:7px"></i>نشطة</span>`
          : `<span class="b b-rd" style="font-size:11px"><i class="fas fa-clock"></i>منتهية</span>`}
        ${jobExpiryLabel(j)}
      </div>
    </div>
    <div class="jcf" style="display:flex;gap:7px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid var(--br)">
      <button class="btn bp bsm" onclick="openJob('${j.id}')">
        <i class="fas fa-eye"></i> عرض
      </button>
      <button class="btn bsm" style="background:var(--info);color:#fff" onclick="adminJobApps('${j.id}','${san(j.title)}')">
        <i class="fas fa-users"></i> المتقدمون
      </button>
      ${j.adminPinned
        ? `<button class="btn bsm" style="background:#7c3aed;color:#fff" onclick="adminPinJob('${j.id}',false,'${san(j.title)}')">
             <i class="fas fa-thumbtack"></i> إلغاء التثبيت
           </button>`
        : `<button class="btn bsm" style="background:var(--success);color:#fff" onclick="adminPinJob('${j.id}',true,'${san(j.title)}')">
             <i class="fas fa-thumbtack"></i> تثبيت دائم
           </button>`}
      <button class="btn bda bsm" onclick="confirm2('حذف الوظيفة','سيتم حذف الوظيفة نهائياً.',()=>adminDeleteJob('${j.id}','${san(j.title)}'))">
        <i class="fas fa-trash"></i> حذف
      </button>
    </div>
  </div>`;
}

async function adminPinJob(jobId, pin, title) {
  const action = pin ? 'تثبيت' : 'إلغاء تثبيت';
  confirm2(`${action} الوظيفة`, `هل تريد ${action} وظيفة "${title}"؟`, async () => {
    try {
      if (!DEMO && window.db) {
        const upd = { adminPinned: pin };
        if (pin) upd.status = 'active'; // التثبيت يعيد تفعيلها تلقائياً
        await window.db.collection('jobs').doc(jobId).update(upd);
      }
      const job = JOBS.find(j => j.id === jobId);
      if (job) { job.adminPinned = pin; if (pin) job.status = 'active'; }
      notify(pin ? 'تم التثبيت 📌' : 'تم إلغاء التثبيت', `وظيفة "${title}" ${pin ? 'مثبّتة ولن تنتهي تلقائياً' : 'ستنتهي حسب مدتها الأصلية'}`, 'success');
      pgAdminJobs(document.getElementById('pcon'));
    } catch(e) { notify('خطأ', 'فشلت العملية', 'error'); }
  });
}

async function adminDeleteJob(jobId, title) {
  try {
    if (!DEMO && window.db) await window.db.collection('jobs').doc(jobId).delete();
    JOBS = JOBS.filter(j => j.id !== jobId);
    notify('تم الحذف', `وظيفة "${title}" حُذفت`, 'info');
    pgAdminJobs(document.getElementById('pcon'));
  } catch(e) { notify('خطأ', 'فشل الحذف', 'error'); }
}

async function adminJobApps(jobId, title) {
  const mb = document.getElementById('moJobB');
  if (!mb) return;

  const mhTitle = document.querySelector('#moJob .mt');
  if (mhTitle) mhTitle.innerHTML = `<i class="fas fa-users" style="color:var(--p)"></i> متقدمو الوظيفة`;

  mb.innerHTML = `<div style="text-align:center;padding:30px"><i class="fas fa-circle-notch spin" style="color:var(--p);font-size:28px"></i></div>`;
  oMo('moJob');

  let apps = [];
  if (!DEMO && window.db) {
    try {
      const snap = await window.db.collection('applications').where('jobId', '==', jobId).get();
      apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { console.warn('adminJobApps:', e); }
  }

  const STAT_L = { pending:'انتظار', interview:'مقابلة', hired:'قُبل', rejected:'مرفوض' };
  const STAT_C = { pending:'b-am', interview:'b-pu', hired:'b-gr', rejected:'b-rd' };

  mb.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:14px;font-weight:800;color:var(--tx)">${san(title)}</div>
      <span class="b b-tl">${apps.length} طلب</span>
    </div>
    ${!apps.length
      ? `<div style="text-align:center;padding:40px;color:var(--tx3)"><i class="fas fa-inbox" style="font-size:36px;opacity:.3;display:block;margin-bottom:12px"></i>لا يوجد متقدمون بعد</div>`
      : `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bgc2);text-align:right">
            <th style="padding:9px 12px;white-space:nowrap">الاسم</th>
            <th style="padding:9px 12px;white-space:nowrap">الهاتف</th>
            <th style="padding:9px 12px;white-space:nowrap">الإيميل</th>
            <th style="padding:9px 12px;white-space:nowrap">التاريخ</th>
            <th style="padding:9px 12px;white-space:nowrap">الحالة</th>
          </tr></thead>
          <tbody>${apps.map(a => {
            const dateMs = tsMs(a.appliedAt);
            const dateStr = dateMs ? new Date(dateMs).toLocaleDateString('ar-IQ') : '—';
            return `<tr style="border-bottom:1px solid var(--br)">
              <td style="padding:9px 12px;font-weight:700">${san(a.name||'—')}</td>
              <td style="padding:9px 12px">
                <a href="tel:${a.phone||''}" style="color:var(--p);font-weight:700;text-decoration:none;white-space:nowrap">
                  <i class="fas fa-phone"></i> ${a.phone||'—'}
                </a>
              </td>
              <td style="padding:9px 12px">
                <a href="mailto:${a.email||''}" style="color:var(--info);text-decoration:none;white-space:nowrap">
                  <i class="fas fa-envelope"></i> ${san(a.email||'—')}
                </a>
              </td>
              <td style="padding:9px 12px;color:var(--tx3);white-space:nowrap">${dateStr}</td>
              <td style="padding:9px 12px"><span class="b ${STAT_C[a.status]||'b-am'}">${STAT_L[a.status]||'انتظار'}</span></td>
            </tr>`;
          }).join('')}
          </tbody>
        </table></div>`}`;
}

// ════════════════════════════════════════════
// صفحة المكاتب — أدمن (بيانات حقيقية)
// ════════════════════════════════════════════
async function pgAdminOffices(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ تحميل المكاتب...</div></div>`;

  let offices = [];

  if (!DEMO && window.db) {
    try {
      const snap = await window.db.collection('users').where('role', '==', 'office').get();
      offices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { console.warn('Admin offices:', e); }
  }
  if (!offices.length) {
    el.innerHTML = `
      <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-building"></i></div>مكاتب التوظيف</div></div>
      ${emptyState('🏢', 'لا توجد مكاتب مسجّلة بعد', 'لم يُسجَّل أي مكتب توظيف حتى الآن')}`;
    return;
  }

  const render = (list) => {
    if (!list.length) return emptyState('🏢', 'لا توجد مكاتب', 'لم يُسجَّل أي مكتب توظيف بعد');
    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
      ${list.map(o => {
        const jobCount = JOBS.filter(j => j.postedBy === o.id).length;
        const isActive = o.status === 'active' || !o.status;
        const initials = (o.officeName || o.name || 'م').charAt(0);
        const created  = o.createdAt?.toDate?.()?.toLocaleDateString('ar-IQ') || '—';
        return `<div class="card cp fade-up">
          <div style="display:flex;align-items:center;gap:11px;margin-bottom:12px">
            <div class="av avm" style="background:var(--grad-p);color:#fff;font-size:18px">${initials}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:800;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${san(o.officeName || o.name)}</div>
              <div style="font-size:11px;color:var(--tx2)"><i class="fas fa-map-marker-alt"></i> ${san(o.province||'—')}</div>
            </div>
            <span class="b ${isActive?'b-gr':'b-rd'}" style="flex-shrink:0"><i class="fas ${isActive?'fa-check-circle':'fa-times-circle'}"></i>${isActive?'نشط':'موقوف'}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:12px">
            <div style="background:var(--bgc2);border-radius:9px;padding:8px;text-align:center">
              <div style="font-size:18px;font-weight:900;color:var(--p)">${jobCount}</div>
              <div style="font-size:10px;color:var(--tx3)">وظيفة</div>
            </div>
            <div style="background:var(--bgc2);border-radius:9px;padding:8px;text-align:center">
              <div style="font-size:12px;font-weight:700;color:var(--tx2);direction:ltr">${san(o.email||'—')}</div>
              <div style="font-size:10px;color:var(--tx3)">البريد</div>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn bp bsm bfu" style="flex:1" onclick="adminViewOffice(${JSON.stringify({id:o.id,name:san(o.officeName||o.name),province:san(o.province||''),email:san(o.email||''),phone:san(o.phone||''),status:o.status||'active',created}).replace(/"/g,'&quot;')})">
              <i class="fas fa-eye"></i>عرض
            </button>
            ${isActive
              ? `<button class="btn bda bsm" onclick="adminToggleOffice('${o.id}','inactive','${san(o.officeName||o.name)}')"><i class="fas fa-ban"></i></button>`
              : `<button class="btn" style="background:var(--success);color:#fff" onclick="adminToggleOffice('${o.id}','active','${san(o.officeName||o.name)}')"><i class="fas fa-check"></i></button>`
            }
          </div>
        </div>`;
      }).join('')}
    </div>`;
  };

  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-building"></i></div>مكاتب التوظيف</div>
      <span class="b b-tl">${offices.length} مكتب</span>
    </div>
    <div id="officesGrid">${render(offices)}</div>`;
}

function adminViewOffice(o) {
  const jobCount = JOBS.filter(j => j.postedBy === o.id).length;
  const officeJobs = JOBS.filter(j => j.postedBy === o.id);
  const el = document.getElementById('pcon');
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px">
      <button class="btn bg bsm" onclick="goTo('alloffices')"><i class="fas fa-arrow-right"></i>رجوع</button>
      <div style="font-size:16px;font-weight:800;color:var(--tx)">تفاصيل المكتب</div>
    </div>
    <div class="card cp fade-up" style="margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
        <div class="av avxl" style="background:var(--grad-p);color:#fff;font-size:26px;font-weight:900">${(o.name||'م').charAt(0)}</div>
        <div>
          <div style="font-size:20px;font-weight:900;color:var(--tx)">${o.name}</div>
          <div style="font-size:12px;color:var(--tx2);margin-top:3px"><i class="fas fa-map-marker-alt"></i> ${o.province}</div>
          <span class="b ${o.status==='active'?'b-gr':'b-rd'}" style="margin-top:6px;display:inline-flex">${o.status==='active'?'نشط':'موقوف'}</span>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px">
        <div><span style="color:var(--tx3)">البريد:</span> <strong>${o.email||'—'}</strong></div>
        <div><span style="color:var(--tx3)">الهاتف:</span> <strong>${o.phone||'—'}</strong></div>
        <div><span style="color:var(--tx3)">الوظائف:</span> <strong style="color:var(--p)">${jobCount}</strong></div>
        <div><span style="color:var(--tx3)">تاريخ التسجيل:</span> <strong>${o.created||'—'}</strong></div>
      </div>
    </div>
    ${officeJobs.length ? `
    <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-briefcase"></i></div>وظائف هذا المكتب</div></div>
    <div class="jg">${officeJobs.map(j => jCard(j)).join('')}</div>`
    : emptyState('📋', 'لا توجد وظائف', 'هذا المكتب لم ينشر أي وظيفة بعد')}`;
}

async function adminToggleOffice(uid, newStatus, name) {
  if (DEMO || !window.db) { notify('تنبيه', 'يتطلب Firebase حقيقي', 'info'); return; }
  const label = newStatus === 'active' ? 'تفعيل' : 'إيقاف';
  confirm2(`${label} المكتب`, `هل تريد ${label} مكتب "${name}"؟`, async () => {
    try {
      await window.db.collection('users').doc(uid).update({ status: newStatus });
      notify('تم ✅', `تم ${label} المكتب بنجاح`, 'success');
      pgAdminOffices(document.getElementById('pcon'));
    } catch(e) { notify('خطأ', 'فشلت العملية', 'error'); }
  });
}

// ════════════════════════════════════════════
// صفحة المستخدمين — أدمن (بيانات حقيقية)
// ════════════════════════════════════════════
let _usersSearch = '', _usersRoleFilter = '';

async function pgAdminUsers(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ تحميل المستخدمين...</div></div>`;

  let users = [];
  if (!DEMO && window.db) {
    try {
      const snap = await window.db.collection('users').orderBy('createdAt', 'desc').get();
      users = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { console.warn('Admin users:', e); }
  }
  if (!users.length) {
    el.innerHTML = `
      <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-users"></i></div>المستخدمون</div></div>
      ${emptyState('👤', 'لا يوجد مستخدمون بعد', 'لم يُسجَّل أي مستخدم حتى الآن')}`;
    return;
  }

  const seekers = users.filter(u => u.role === 'seeker' || !u.role).length;
  const offices = users.filter(u => u.role === 'office').length;
  const admins  = users.filter(u => u.role === 'admin').length;
  const total   = users.length;

  window._adminUsers = users;
  _usersSearch = '';
  _usersRoleFilter = '';

  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-users"></i></div>المستخدمون</div>
      <button class="btn bp bsm" onclick="openInviteUser()">
        <i class="fas fa-user-plus"></i>دعوة مستخدم
      </button>
    </div>

    <div class="resp-g3" style="gap:12px;margin-bottom:20px">
      ${[
        {l:'الباحثون',   v:seekers, ic:'fa-user-tie',   c:'var(--p)',      f:'seeker'},
        {l:'المكاتب',    v:offices, ic:'fa-building',   c:'var(--purple)', f:'office'},
        {l:'المديرون',   v:admins,  ic:'fa-shield-alt', c:'var(--acc)',    f:'admin'},
      ].map(x => `<div class="card cp" style="text-align:center;cursor:pointer" onclick="filterAdminUsers('${x.f}')">
        <div class="si" style="width:44px;height:44px;border-radius:12px;background:${x.c}18;color:${x.c};margin:0 auto 10px;font-size:18px;display:flex;align-items:center;justify-content:center">
          <i class="fas ${x.ic}"></i>
        </div>
        <div style="font-size:28px;font-weight:900;color:var(--tx)">${x.v}</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:3px">${x.l}</div>
        <div style="font-size:10px;color:var(--tx3);margin-top:2px">${Math.round(x.v/total*100)||0}%</div>
      </div>`).join('')}
    </div>

    <div class="card" style="margin-bottom:14px">
      <div class="cp" style="padding-bottom:0">
        <div class="ig" style="margin-bottom:10px">
          <input type="search" class="fc" id="usersSearch" placeholder="بحث بالاسم أو البريد أو الهاتف..."
            oninput="_usersSearch=this.value;renderAdminUsersList()">
          <select class="fc" id="usersRoleFilter" style="width:auto;min-width:110px"
            onchange="_usersRoleFilter=this.value;renderAdminUsersList()">
            <option value="">جميع الأدوار</option>
            <option value="seeker">باحث</option>
            <option value="office">مكتب</option>
            <option value="admin">أدمن</option>
          </select>
        </div>
      </div>
      <div id="usersTableWrap" style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:12px" id="usersTable">
          <thead>
            <tr style="border-bottom:2px solid var(--br)">
              <th style="padding:10px 12px;text-align:right;color:var(--tx3);font-weight:700">المستخدم</th>
              <th style="padding:10px 12px;text-align:right;color:var(--tx3);font-weight:700">الدور</th>
              <th style="padding:10px 12px;text-align:right;color:var(--tx3);font-weight:700">المحافظة</th>
              <th style="padding:10px 12px;text-align:right;color:var(--tx3);font-weight:700">Plus</th>
              <th style="padding:10px 12px;text-align:right;color:var(--tx3);font-weight:700">الحالة</th>
              <th style="padding:10px 12px;text-align:right;color:var(--tx3);font-weight:700">إجراء</th>
            </tr>
          </thead>
          <tbody id="usersTableBody"></tbody>
        </table>
      </div>
    </div>`;

  renderAdminUsersList();
}

function filterAdminUsers(role) {
  _usersRoleFilter = role;
  const sel = document.getElementById('usersRoleFilter');
  if (sel) sel.value = role;
  renderAdminUsersList();
}

function renderAdminUsersList() {
  const users = window._adminUsers || [];
  const q = _usersSearch.toLowerCase();
  const filtered = users.filter(u => {
    const matchRole  = !_usersRoleFilter || u.role === _usersRoleFilter || (!u.role && _usersRoleFilter === 'seeker');
    const matchSearch = !q || (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u.phone||'').includes(q);
    return matchRole && matchSearch;
  });

  const roleLabel = { seeker:'باحث', office:'مكتب', employer:'صاحب عمل', admin:'أدمن' };
  const roleClass = { seeker:'b-tl', office:'b-pu', employer:'b-bl', admin:'b-am' };

  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--tx3)">لا توجد نتائج</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(u => {
    const isActive = u.status === 'active' || !u.status;
    const role     = u.role || 'seeker';
    const created  = u.createdAt?.toDate?.()?.toLocaleDateString('ar-IQ') || '—';
    return `<tr style="border-bottom:1px solid var(--br);transition:background .15s" onmouseenter="this.style.background='var(--bgc2)'" onmouseleave="this.style.background=''">
      <td style="padding:10px 12px">
        <div style="display:flex;align-items:center;gap:9px">
          <div class="av" style="width:32px;height:32px;border-radius:50%;background:var(--grad-p);color:#fff;font-size:13px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0">${(u.name||'م').charAt(0)}</div>
          <div>
            <div style="font-weight:700;color:var(--tx)">${san(u.name||'—')}</div>
            <div style="color:var(--tx3);font-size:11px">${san(u.email||'—')}</div>
          </div>
        </div>
      </td>
      <td style="padding:10px 12px">
        <div style="display:flex;align-items:center;gap:6px">
          <span class="b ${roleClass[role]||'b-tl'}"><i class="fas ${role==='admin'?'fa-shield-alt':role==='office'?'fa-building':role==='employer'?'fa-briefcase':'fa-user'}"></i>${roleLabel[role]||'باحث'}</span>
          ${role !== 'admin' ? `<button class="btn bo bsm" style="padding:2px 7px;font-size:10px" title="تغيير الدور"
            onclick="adminChangeRole('${u.id}','${role}','${san(u.name||'')}')">
            <i class="fas fa-exchange-alt"></i>
          </button>` : ''}
        </div>
      </td>
      <td style="padding:10px 12px;color:var(--tx2)">${san(u.province||'—')}</td>
      <td style="padding:10px 12px">
        ${u.plus
          ? `<span class="b b-am" style="cursor:pointer" title="إلغاء Plus" onclick="adminToggleUserPlus('${u.id}',false,'${san(u.name||'')}')">
               <i class="fas fa-crown" style="color:#f59e0b"></i>Plus
             </span>`
          : `<button class="btn bo bsm" onclick="adminToggleUserPlus('${u.id}',true,'${san(u.name||'')}')">
               <i class="fas fa-crown"></i>تفعيل
             </button>`}
      </td>
      <td style="padding:10px 12px"><span class="b ${isActive?'b-gr':'b-rd'}"><i class="fas ${isActive?'fa-check-circle':'fa-times-circle'}"></i>${isActive?'نشط':'موقوف'}</span></td>
      <td style="padding:10px 12px">
        ${role !== 'admin' ? `
        <button class="btn ${isActive?'bda':'bg'} bsm" onclick="adminToggleUser('${u.id}','${isActive?'inactive':'active'}','${san(u.name||'')}')">
          <i class="fas ${isActive?'fa-ban':'fa-check'}"></i>${isActive?'إيقاف':'تفعيل'}
        </button>` : '<span style="color:var(--tx3);font-size:11px">محمي</span>'}
      </td>
    </tr>`;
  }).join('');
}

async function adminToggleUser(uid, newStatus, name) {
  if (DEMO || !window.db) { notify('تنبيه', 'يتطلب Firebase حقيقي', 'info'); return; }
  const label = newStatus === 'active' ? 'تفعيل' : 'إيقاف';
  confirm2(`${label} المستخدم`, `هل تريد ${label} حساب "${name}"؟`, async () => {
    try {
      await window.db.collection('users').doc(uid).update({ status: newStatus });
      const u = (window._adminUsers||[]).find(u => u.id === uid);
      if (u) u.status = newStatus;
      renderAdminUsersList();
      notify('تم ✅', `تم ${label} الحساب بنجاح`, 'success');
    } catch(e) { notify('خطأ', 'فشلت العملية', 'error'); }
  });
}

// ── تغيير دور المستخدم ──
function adminChangeRole(uid, currentRole, name) {
  const roles = [
    { v:'seeker',   l:'باحث عن عمل',  ico:'fa-user' },
    { v:'office',   l:'مكتب توظيف',    ico:'fa-building' },
    { v:'employer', l:'صاحب عمل',      ico:'fa-briefcase' },
    { v:'admin',    l:'مدير النظام',   ico:'fa-shield-alt' },
  ];
  const opts = roles.map(r =>
    `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:2px solid ${r.v===currentRole?'var(--p)':'var(--br)'};
      border-radius:10px;cursor:pointer;margin-bottom:8px;transition:.2s"
      onclick="document.querySelectorAll('.role-opt').forEach(x=>x.style.borderColor='var(--br)');this.style.borderColor='var(--p)';document.getElementById('roleSelect').value='${r.v}'">
      <i class="fas ${r.ico}" style="color:var(--p);width:18px;text-align:center"></i>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--tx)">${r.l}</div>
      </div>
      ${r.v===currentRole?'<span class="b b-tl" style="margin-right:auto;font-size:10px">الحالي</span>':''}
    </label>`
  ).join('');

  const body = `
    <input type="hidden" id="roleSelect" value="${currentRole}">
    <div style="font-size:13px;color:var(--tx2);margin-bottom:14px">
      تغيير دور <strong>${san(name)}</strong> إلى:
    </div>
    <div class="role-opts">${opts}</div>
    <div class="mf" style="border:none;padding:0;margin-top:12px">
      <button class="btn bo" onclick="cmo('_adminModal')">إلغاء</button>
      <button class="btn bp bfu" onclick="_doChangeRole('${uid}','${san(name)}')">
        <i class="fas fa-check"></i>تأكيد التغيير
      </button>
    </div>`;

  _showAdminModal('تغيير الدور', body);
}

async function _doChangeRole(uid, name) {
  const newRole = document.getElementById('roleSelect')?.value;
  if (!newRole) return;
  cmo('_adminModal');
  if (DEMO || !window.db) return;
  try {
    await window.db.collection('users').doc(uid).update({ role: newRole });
    const u = (window._adminUsers||[]).find(u => u.id === uid);
    if (u) u.role = newRole;
    renderAdminUsersList();
    const roleNames = { seeker:'باحث', office:'مكتب توظيف', employer:'صاحب عمل', admin:'مدير نظام' };
    notify('تم ✅', `تم تغيير دور "${name}" إلى ${roleNames[newRole]||newRole}`, 'success');
  } catch(e) { notify('خطأ', 'فشل تغيير الدور: ' + e.message, 'error'); }
}

// ── دعوة مستخدم جديد ──
function openInviteUser() {
  const body = `
    <div class="al al-i" style="margin-bottom:14px">
      <i class="fas fa-info-circle"></i>
      <span>سيُحدَّد الدور تلقائياً عند تسجيل المستخدم بهذا الإيميل</span>
    </div>
    <div class="fg">
      <label class="fl req">البريد الإلكتروني</label>
      <input type="email" class="fc" id="invEmail" placeholder="user@example.com">
    </div>
    <div class="fg">
      <label class="fl req">الدور المخصص</label>
      <select class="fc" id="invRole">
        <option value="seeker">باحث عن عمل</option>
        <option value="office">مكتب توظيف</option>
        <option value="employer">صاحب عمل</option>
        <option value="admin">مدير نظام</option>
      </select>
    </div>
    <div class="fg">
      <label class="fl">ملاحظة للمستخدم (اختياري)</label>
      <input type="text" class="fc" id="invNote" placeholder="مثال: حساب مكتب التوظيف المركزي">
    </div>
    <div class="mf" style="border:none;padding:0;margin-top:12px">
      <button class="btn bo" onclick="cmo('_adminModal')">إلغاء</button>
      <button class="btn bp bfu" id="inviteBtn" onclick="adminSendInvite()">
        <i class="fas fa-paper-plane"></i>إرسال الدعوة
      </button>
    </div>`;
  _showAdminModal('دعوة مستخدم جديد', body);
}

async function adminSendInvite() {
  const email = document.getElementById('invEmail')?.value.trim().toLowerCase();
  const role  = document.getElementById('invRole')?.value;
  const note  = document.getElementById('invNote')?.value.trim();
  if (!email) { notify('خطأ', 'أدخل البريد الإلكتروني', 'error'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify('خطأ', 'البريد الإلكتروني غير صحيح', 'error'); return; }
  loading('inviteBtn', true);
  try {
    if (!DEMO && window.db) {
      await window.db.collection('invites').doc(email).set({
        email, role, note: note || '',
        invitedBy: U?.uid,
        invitedAt: firebase.firestore.FieldValue.serverTimestamp(),
        used: false,
      });
    }
    cmo('_adminModal');
    notify('تم ✅', `تم حفظ الدعوة — عند تسجيل ${email} سيحصل على دور "${role}"`, 'success');
  } catch(e) {
    notify('خطأ', 'فشل الحفظ: ' + e.message, 'error');
  } finally { loading('inviteBtn', false); }
}

// ── مودال عام للأدمن ──
function _showAdminModal(title, body) {
  let mo = document.getElementById('_adminModal');
  if (!mo) {
    mo = document.createElement('div');
    mo.id = '_adminModal';
    mo.className = 'mo';
    mo.onclick = e => { if (e.target === mo) cmo('_adminModal'); };
    mo.innerHTML = `<div class="mob" style="max-width:460px">
      <div class="mh">
        <div class="mt" id="_adminModalTitle"></div>
        <div class="mc" onclick="cmo('_adminModal')"><i class="fas fa-times"></i></div>
      </div>
      <div class="mbod" id="_adminModalB"></div>
    </div>`;
    document.body.appendChild(mo);
  }
  document.getElementById('_adminModalTitle').textContent = title;
  document.getElementById('_adminModalB').innerHTML = body;
  oMo('_adminModal');
}

// ════════════════════════════════════════════
// صفحة الإعدادات — أدمن (شاملة كل المنصات)
// ════════════════════════════════════════════
function _cfgVal(v) { return v && !v.startsWith('YOUR') ? v : ''; }
function _toggle(id, val) {
  return `<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer">
    <input type="checkbox" id="${id}" ${val?'checked':''} style="opacity:0;width:0;height:0">
    <span style="position:absolute;inset:0;background:var(--br);border-radius:24px;transition:.3s;cursor:pointer;display:block"
      onclick="var c=this.previousElementSibling;c.checked=!c.checked;this.style.background=c.checked?'var(--p)':'var(--br)'"
      style="${val?'background:var(--p)':''}"></span>
  </label>`;
}
function _toggleRow(id, val, label, hint) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--br)">
    <div><div style="font-size:13px;font-weight:700;color:var(--tx)">${label}</div>${hint?`<div style="font-size:11px;color:var(--tx3)">${hint}</div>`:''}
    </div>${_toggle(id, val)}</div>`;
}
function _apiSection(color, icon, fab, title, hint, link, linkLabel, fields, toggleId, toggleVal) {
  return `<div class="card" style="margin-bottom:14px">
    <div class="ch" style="display:flex;align-items:center;justify-content:space-between">
      <div class="cht"><i class="${fab?'fab':'fas'} ${icon}" style="color:${color}"></i> ${title}</div>
      ${hint ? `<a href="${link}" target="_blank" rel="noopener" style="font-size:10px;color:var(--p);text-decoration:none"><i class="fas fa-external-link-alt"></i> ${linkLabel}</a>` : ''}
    </div>
    <div class="cp">
      ${toggleId ? _toggleRow(toggleId, toggleVal, 'نشر تلقائي عند إضافة وظيفة', 'سيُنشر إعلان الوظيفة تلقائياً عند إنشائها') : ''}
      ${fields}
    </div>
  </div>`;
}

async function pgAdminSettings(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ تحميل الإعدادات...</div></div>`;

  if (!DEMO && window.db) {
    try {
      const doc = await window.db.collection('config').doc('settings').get();
      if (doc.exists) {
        const s = doc.data();
        ['telegram','emailjs','imgbb','facebook','instagram','twitter','linkedin','tiktok','snapchat','youtube','gemini','general'].forEach(k => {
          if (s[k]) CFG[k] = { ...CFG[k], ...s[k] };
        });
      }
    } catch(e) { console.warn('Settings load:', e); }
  }

  const c = CFG;
  el.innerHTML = `
    <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-cog"></i></div>إعدادات النظام</div></div>

    <!-- تبويبات -->
    <div class="tabs" style="margin-bottom:18px">
      <button class="tb2 on" onclick="swSettTab('social',this)"><i class="fas fa-share-alt"></i> السوشال ميديا</button>
      <button class="tb2"    onclick="swSettTab('services',this)"><i class="fas fa-plug"></i> الخدمات</button>
      <button class="tb2"    onclick="swSettTab('general',this)"><i class="fas fa-sliders-h"></i> عام</button>
    </div>

    <!-- ══ السوشال ميديا ══ -->
    <div id="stSocial">

      ${_apiSection('#0088cc','fa-paper-plane',false,'Telegram','','https://t.me/BotFather','BotFather',`
        <div class="fr">
          <div class="fg"><label class="fl">Bot Token</label>
            <input class="fc" id="tgBot" value="${_cfgVal(c.telegram.bot)}" placeholder="123456:ABC-DEF...">
          </div>
          <div class="fg"><label class="fl">Chat ID (الأدمن)</label>
            <input class="fc" id="tgChat" value="${_cfgVal(c.telegram.chat)}" placeholder="-100xxxxxxxxx">
          </div>
        </div>
        <div class="fg"><label class="fl">Channel ID (للنشر العام)</label>
          <input class="fc" id="tgChannel" value="${c.telegram.channel||''}" placeholder="@channel_username أو -100xxxxxxxxx">
          <div class="fh">معرّف القناة العامة التي ستُنشر فيها الوظائف تلقائياً</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn bsm" style="background:#0088cc;color:#fff;border:none" onclick="testTelegram()">
            <i class="fas fa-paper-plane"></i>اختبار الإرسال للأدمن
          </button>
          <button class="btn bsm" style="background:#229ed9;color:#fff;border:none" onclick="testTelegramChannel()">
            <i class="fas fa-broadcast-tower"></i>اختبار نشر القناة
          </button>
        </div>
      `,'tgAutoPost', c.telegram.autoPost)}

      ${_apiSection('#1877f2','fa-facebook-f',true,'Facebook Page','','https://developers.facebook.com','Facebook Developers',`
        <div class="al al-i" style="margin-bottom:10px">
          <i class="fas fa-info-circle"></i>
          <span>احصل على Page Access Token من: Meta Business Suite → إعدادات → الوصول للواجهة البرمجية</span>
        </div>
        <div class="fg"><label class="fl">Page Access Token</label>
          <input class="fc" id="fbToken" value="${c.facebook.pageToken||''}" placeholder="EAABxxxxx...">
        </div>
        <div class="fg"><label class="fl">Page ID</label>
          <input class="fc" id="fbPageId" value="${c.facebook.pageId||''}" placeholder="123456789012345">
          <div class="fh">من صفحتك على فيسبوك → معلومات الصفحة → معرّف الصفحة</div>
        </div>
        <button class="btn bsm" style="background:#1877f2;color:#fff;border:none;margin-top:8px" onclick="testFacebook()">
          <i class="fab fa-facebook-f"></i>اختبار النشر
        </button>
      `,'fbAutoPost', c.facebook.autoPost)}

      ${_apiSection('#e1306c','fa-instagram',true,'Instagram','','https://developers.facebook.com','Meta Developers',`
        <div class="al al-i" style="margin-bottom:10px">
          <i class="fas fa-info-circle"></i>
          <span>Instagram يستخدم نفس Token مال Facebook — يجب أن يكون الحساب Business أو Creator</span>
        </div>
        <div class="fg"><label class="fl">Access Token (نفس Facebook)</label>
          <input class="fc" id="igToken" value="${c.instagram.token||''}" placeholder="EAABxxxxx...">
        </div>
        <div class="fg"><label class="fl">Instagram Account ID</label>
          <input class="fc" id="igAccountId" value="${c.instagram.accountId||''}" placeholder="17841400000000000">
          <div class="fh">من Graph API Explorer: /me/accounts ثم /PAGE_ID?fields=instagram_business_account</div>
        </div>
      `,'igAutoPost', c.instagram.autoPost)}

      ${_apiSection('#1da1f2','fa-x-twitter',true,'Twitter / X','','https://developer.twitter.com','Twitter Developer',`
        <div class="al al-w" style="margin-bottom:10px">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Twitter API v2 مدفوع ($100/شهر للنشر). Basic Plan مطلوب للـ Write access.</span>
        </div>
        <div class="fr">
          <div class="fg"><label class="fl">API Key</label>
            <input class="fc" id="twApiKey" value="${c.twitter.apiKey||''}" placeholder="xxxxxxxxxxxxxxxxxxxxxx">
          </div>
          <div class="fg"><label class="fl">API Secret</label>
            <input class="fc" id="twApiSecret" value="${c.twitter.apiSecret||''}" placeholder="xxxxxxxxxxxxxxxxxx...">
          </div>
        </div>
        <div class="fr">
          <div class="fg"><label class="fl">Access Token</label>
            <input class="fc" id="twAccessToken" value="${c.twitter.accessToken||''}" placeholder="000000000-xxxxxxxx...">
          </div>
          <div class="fg"><label class="fl">Access Token Secret</label>
            <input class="fc" id="twAccessSecret" value="${c.twitter.accessSecret||''}" placeholder="xxxxxxxxxxxxxxxx...">
          </div>
        </div>
      `,'twAutoPost', c.twitter.autoPost)}

      ${_apiSection('#0a66c2','fa-linkedin-in',true,'LinkedIn','','https://www.linkedin.com/developers','LinkedIn Developers',`
        <div class="al al-i" style="margin-bottom:10px">
          <i class="fas fa-info-circle"></i>
          <span>النشر على صفحة الشركة يحتاج OAuth 2.0 Token مع صلاحية w_organization_social</span>
        </div>
        <div class="fg"><label class="fl">Access Token</label>
          <input class="fc" id="liToken" value="${c.linkedin.accessToken||''}" placeholder="AQV...">
        </div>
        <div class="fg"><label class="fl">Organization ID (رقم صفحة الشركة)</label>
          <input class="fc" id="liOrgId" value="${c.linkedin.orgId||''}" placeholder="12345678">
          <div class="fh">من رابط صفحة الشركة: linkedin.com/company/<strong>XXXXXXXX</strong>/admin</div>
        </div>
      `,'liAutoPost', c.linkedin.autoPost)}

      ${_apiSection('#000000','fa-tiktok',true,'TikTok','','https://developers.tiktok.com','TikTok Developers',`
        <div class="al al-w" style="margin-bottom:10px">
          <i class="fas fa-exclamation-triangle"></i>
          <span>TikTok Content Posting API يحتاج موافقة خاصة من TikTok — قدّم طلب Developer Account أولاً</span>
        </div>
        <div class="fg"><label class="fl">Access Token</label>
          <input class="fc" id="ttAccessToken" value="${c.tiktok.accessToken||''}" placeholder="act.xxxxxxxxxx...">
        </div>
        <div class="fg"><label class="fl">Open ID</label>
          <input class="fc" id="ttOpenId" value="${c.tiktok.openId||''}" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx">
        </div>
      `,'ttAutoPost', c.tiktok.autoPost)}

      ${_apiSection('#fffc00','fa-snapchat-ghost',true,'Snapchat','','https://ads.snapchat.com','Snapchat Business',`
        <div class="al al-w" style="margin-bottom:10px">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Snapchat Marketing API مخصص للإعلانات المدفوعة فقط — لا يدعم النشر العضوي</span>
        </div>
        <div class="fg"><label class="fl">Access Token</label>
          <input class="fc" id="scToken" value="${c.snapchat.accessToken||''}" placeholder="xxxxxxxx-xxxx...">
        </div>
        <div class="fg"><label class="fl">Ad Account ID</label>
          <input class="fc" id="scAdId" value="${c.snapchat.adAccountId||''}" placeholder="xxxxxxxx-xxxx...">
        </div>
      `, null, false)}

      ${_apiSection('#ff0000','fa-youtube',true,'YouTube','','https://console.cloud.google.com','Google Cloud Console',`
        <div class="al al-i" style="margin-bottom:10px">
          <i class="fas fa-info-circle"></i>
          <span>YouTube API يستخدم لرفع الفيديوهات فقط — لا يدعم نشر إعلانات نصية</span>
        </div>
        <div class="fg"><label class="fl">API Key</label>
          <input class="fc" id="ytApiKey" value="${c.youtube.apiKey||''}" placeholder="AIzaSy...">
        </div>
        <div class="fg"><label class="fl">Channel ID</label>
          <input class="fc" id="ytChannelId" value="${c.youtube.channelId||''}" placeholder="UCxxxxxxxxxxxxxxxxxx">
        </div>
      `, null, false)}

    </div>

    <!-- ══ الخدمات ══ -->
    <div id="stServices" style="display:none">

      ${_apiSection('#0088cc','fa-paper-plane',false,'Telegram — الإشعارات الداخلية','','','',`
        <div class="fh" style="margin-bottom:10px">نفس Bot Token أعلاه — هذا Chat ID خاص بالأدمن فقط لاستقبال إشعارات النظام</div>
        <button class="btn bsm" style="background:#0088cc;color:#fff;border:none" onclick="testTelegram()">
          <i class="fas fa-vial"></i>اختبار إشعار الأدمن
        </button>
      `, null, false)}

      <div class="card" style="margin-bottom:14px">
        <div class="ch"><div class="cht"><i class="fas fa-envelope" style="color:var(--acc)"></i> EmailJS — البريد الإلكتروني</div>
          <a href="https://www.emailjs.com" target="_blank" style="font-size:10px;color:var(--p);text-decoration:none"><i class="fas fa-external-link-alt"></i> emailjs.com</a>
        </div>
        <div class="cp">
          <div class="fr">
            <div class="fg"><label class="fl">Public Key</label>
              <input class="fc" id="ejPub" value="${_cfgVal(c.emailjs.pub)}" placeholder="user_xxxxx">
            </div>
            <div class="fg"><label class="fl">Service ID</label>
              <input class="fc" id="ejSvc" value="${_cfgVal(c.emailjs.svc)}" placeholder="service_xxxxx">
            </div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">Template ID</label>
              <input class="fc" id="ejTpl" value="${_cfgVal(c.emailjs.tpl)}" placeholder="template_xxxxx">
            </div>
            <div class="fg"><label class="fl">إيميل المدير</label>
              <input type="email" class="fc" id="ejAdmin" value="${_cfgVal(c.emailjs.admin)}" placeholder="admin@example.com">
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="ch"><div class="cht"><i class="fas fa-image" style="color:var(--purple)"></i> ImgBB — رفع الصور</div>
          <a href="https://imgbb.com" target="_blank" style="font-size:10px;color:var(--p);text-decoration:none"><i class="fas fa-external-link-alt"></i> imgbb.com</a>
        </div>
        <div class="cp">
          <div class="fg"><label class="fl">API Key</label>
            <input class="fc" id="imgbbKey" value="${_cfgVal(c.imgbb.key)}" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px">
        <div class="ch"><div class="cht"><i class="fas fa-robot" style="color:var(--purple)"></i> Gemini AI — الذكاء الاصطناعي</div>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" style="font-size:10px;color:var(--p);text-decoration:none"><i class="fas fa-external-link-alt"></i> Google AI Studio</a>
        </div>
        <div class="cp">
          <div class="fg"><label class="fl">Gemini API Key</label>
            <input class="fc" id="geminiKey" value="${c.gemini?.key||''}" placeholder="AIzaSy...">
            <div class="fh">مجاني حتى حد معين — من aistudio.google.com/app/apikey</div>
          </div>
        </div>
      </div>

    </div>

    <!-- ══ الإعدادات العامة ══ -->
    <div id="stGeneral" style="display:none">
      <div class="card" style="margin-bottom:14px">
        <div class="ch"><div class="cht"><i class="fas fa-sliders-h" style="color:var(--info)"></i> إعدادات الموقع</div></div>
        <div class="cp">
          <div class="fg"><label class="fl">اسم المنصة</label>
            <input class="fc" id="siteName" value="${c.general?.siteName||'الفانوس للتوظيف'}" placeholder="الفانوس للتوظيف">
          </div>
          <div class="fg"><label class="fl">رابط الموقع (للمشاركة)</label>
            <input class="fc" id="siteUrl" value="${c.general?.siteUrl||''}" placeholder="https://fanoos.app">
          </div>
          ${_toggleRow('maintMode', c.general?.maintenance, 'وضع الصيانة', 'يمنع المستخدمين من الدخول مؤقتاً')}
        </div>
      </div>
    </div>

    <div style="position:sticky;bottom:0;background:var(--bg);padding:12px 0;border-top:1px solid var(--br);margin-top:8px">
      <button class="btn bp bfu blg" style="width:100%" id="saveSettingsBtn" onclick="adminSaveSettings()">
        <i class="fas fa-save"></i>حفظ جميع الإعدادات
      </button>
    </div>`;
}

function swSettTab(tab, btn) {
  ['Social','Services','General'].forEach(t => {
    const el = document.getElementById('st' + t);
    if (el) el.style.display = t.toLowerCase() === tab ? 'block' : 'none';
  });
  btn.closest('.tabs').querySelectorAll('.tb2').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

async function _tgSend(bot, chatId, text) {
  const res = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
  return res.json();
}

async function testTelegram() {
  const bot  = document.getElementById('tgBot')?.value.trim();
  const chat = document.getElementById('tgChat')?.value.trim();
  if (!bot || !chat) { notify('تنبيه', 'أدخل Bot Token و Chat ID أولاً', 'warning'); return; }
  try {
    const data = await _tgSend(bot, chat, '✅ <b>الفانوس للتوظيف</b> — اختبار إشعار الأدمن ناجح!');
    if (data.ok) notify('تم ✅', 'وصل الإشعار للأدمن على Telegram', 'success');
    else notify('خطأ', data.description || 'فشل الاختبار', 'error');
  } catch(e) { notify('خطأ', 'تعذّر الاتصال بـ Telegram', 'error'); }
}

async function testTelegramChannel() {
  const bot     = document.getElementById('tgBot')?.value.trim();
  const channel = document.getElementById('tgChannel')?.value.trim();
  if (!bot || !channel) { notify('تنبيه', 'أدخل Bot Token و Channel ID أولاً', 'warning'); return; }
  try {
    const data = await _tgSend(bot, channel, '📢 <b>الفانوس للتوظيف</b>\n\nاختبار نشر وظيفة على القناة ✅\nسيظهر هنا إعلان الوظيفة تلقائياً عند نشرها.');
    if (data.ok) notify('تم ✅', 'وصل المنشور التجريبي للقناة', 'success');
    else notify('خطأ', data.description || 'تأكد أن البوت مشرف في القناة', 'error');
  } catch(e) { notify('خطأ', 'تعذّر الاتصال بـ Telegram', 'error'); }
}

async function testFacebook() {
  const token  = document.getElementById('fbToken')?.value.trim();
  const pageId = document.getElementById('fbPageId')?.value.trim();
  if (!token || !pageId) { notify('تنبيه', 'أدخل Page Token و Page ID أولاً', 'warning'); return; }
  try {
    const res  = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '📢 الفانوس للتوظيف — اختبار نشر تلقائي ✅', access_token: token })
    });
    const data = await res.json();
    if (data.id) notify('تم ✅', 'نُشر المنشور التجريبي على صفحة Facebook', 'success');
    else notify('خطأ', data.error?.message || 'فشل النشر — تحقق من الصلاحيات', 'error');
  } catch(e) { notify('خطأ', 'تعذّر الاتصال بـ Facebook API', 'error'); }
}

function _gv(id) { return document.getElementById(id)?.value.trim() || ''; }
function _gc(id) { return document.getElementById(id)?.checked || false; }

async function adminSaveSettings() {
  const settings = {
    telegram: {
      bot:      _gv('tgBot'),
      chat:     _gv('tgChat'),
      channel:  _gv('tgChannel'),
      autoPost: _gc('tgAutoPost'),
    },
    facebook: {
      pageToken: _gv('fbToken'),
      pageId:    _gv('fbPageId'),
      autoPost:  _gc('fbAutoPost'),
    },
    instagram: {
      token:     _gv('igToken'),
      accountId: _gv('igAccountId'),
      autoPost:  _gc('igAutoPost'),
    },
    twitter: {
      apiKey:      _gv('twApiKey'),
      apiSecret:   _gv('twApiSecret'),
      accessToken: _gv('twAccessToken'),
      accessSecret:_gv('twAccessSecret'),
      autoPost:    _gc('twAutoPost'),
    },
    linkedin: {
      accessToken: _gv('liToken'),
      orgId:       _gv('liOrgId'),
      autoPost:    _gc('liAutoPost'),
    },
    tiktok: {
      accessToken: _gv('ttAccessToken'),
      openId:      _gv('ttOpenId'),
      autoPost:    _gc('ttAutoPost'),
    },
    snapchat: {
      accessToken: _gv('scToken'),
      adAccountId: _gv('scAdId'),
    },
    youtube: {
      apiKey:    _gv('ytApiKey'),
      channelId: _gv('ytChannelId'),
    },
    emailjs: {
      pub:   _gv('ejPub'),
      svc:   _gv('ejSvc'),
      tpl:   _gv('ejTpl'),
      admin: _gv('ejAdmin'),
    },
    imgbb: {
      key: _gv('imgbbKey'),
    },
    gemini: {
      key: _gv('geminiKey'),
    },
    general: {
      siteName:    _gv('siteName'),
      siteUrl:     _gv('siteUrl'),
      maintenance: _gc('maintMode'),
    },
  };

  // تحديث CFG في الذاكرة
  Object.keys(settings).forEach(k => { if (CFG[k]) CFG[k] = { ...CFG[k], ...settings[k] }; });

  if (!DEMO && window.db) {
    loading('saveSettingsBtn', true);
    try {
      await window.db.collection('config').doc('settings').set(settings, { merge: true });
      notify('تم الحفظ ✅', 'تم حفظ جميع الإعدادات في قاعدة البيانات', 'success');
    } catch(e) {
      notify('خطأ', 'فشل الحفظ: ' + e.message, 'error');
    } finally { loading('saveSettingsBtn', false); }
  } else {
    notify('تم ✅', 'تم تحديث الإعدادات مؤقتاً (وضع تجريبي)', 'info');
  }
}
