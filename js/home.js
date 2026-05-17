// ╔══════════════════════════════════════════════════════╗
// ║  عفراء للتوظيف — home.js                            ║
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
      <div class="hero-lamp">✨</div>
      <div class="hero-content">
        <p class="hero-label">${greet}، مرحباً بك في عفراء 👋</p>
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

    ${pct < 80 ? `
    <div class="comp-card fade-up del1">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:160px">
          <div class="comp-label"><i class="fas fa-user-check"></i>أكمل ملفك لتكون مرئياً ومنشوراً</div>
          <div class="comp-val" style="color:${pColor}">${pct}%</div>
          <div class="comp-hint">المكاتب وأصحاب العمل لا يرون ملفك حتى تكمله</div>
        </div>
        <button class="btn bp bsm" onclick="goTo('profile')"><i class="fas fa-pencil-alt"></i>أكمل ملفي</button>
      </div>
      <div class="comp-bar-wrap"><div class="comp-bar" style="--w:${pct}%;background:${pColor}"></div></div>
      <div class="comp-actions">
        ${!P?.phone    ? '<span class="comp-tip"><i class="fas fa-times-circle" style="color:var(--danger)"></i>رقم الهاتف</span>' : ''}
        ${!P?.jobTitle ? '<span class="comp-tip"><i class="fas fa-times-circle" style="color:var(--danger)"></i>المسمى الوظيفي</span>' : ''}
        ${!P?.bio      ? '<span class="comp-tip"><i class="fas fa-times-circle" style="color:var(--danger)"></i>نبذة شخصية</span>' : ''}
      </div>
    </div>` : P?.verified ? `
    <div class="comp-card fade-up del1" style="border-color:rgba(13,148,136,.4);background:linear-gradient(135deg,rgba(13,148,136,.06),var(--bgc))">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--pd));display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;flex-shrink:0"><i class="fas fa-shield-alt"></i></div>
        <div>
          <div style="font-size:13px;font-weight:800;color:var(--tx)">ملفك موثّق من الأدمن <span class="admin-verified-badge" style="vertical-align:middle"><i class="fas fa-shield-alt"></i>موثّق</span></div>
          <div style="font-size:11px;color:var(--tx2);margin-top:2px">تظهر في نتائج البحث بأولوية للمكاتب وأصحاب العمل</div>
        </div>
        <div style="margin-right:auto;font-size:22px;font-weight:900;color:var(--p)">${pct}%</div>
      </div>
    </div>` : P?.verificationRequested ? `
    <div class="comp-card fade-up del1" style="border-color:rgba(245,158,11,.35)">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(245,158,11,.12);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--acc);flex-shrink:0"><i class="fas fa-clock"></i></div>
        <div>
          <div style="font-size:13px;font-weight:800;color:var(--tx)">طلب التوثيق قيد المراجعة</div>
          <div style="font-size:11px;color:var(--tx2);margin-top:2px">سيراجع الأدمن طلبك ويوثّق ملفك قريباً</div>
        </div>
        <div style="margin-right:auto;font-size:22px;font-weight:900;color:var(--success)">${pct}%</div>
      </div>
    </div>` : `
    <div class="comp-card fade-up del1" style="border-color:rgba(34,197,94,.3)">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="width:44px;height:44px;border-radius:50%;background:rgba(34,197,94,.12);display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--success);flex-shrink:0"><i class="fas fa-check-circle"></i></div>
        <div style="flex:1;min-width:120px">
          <div style="font-size:13px;font-weight:800;color:var(--tx)">ملفك مكتمل ✅ — اطلب التوثيق</div>
          <div style="font-size:11px;color:var(--tx2);margin-top:2px">توثيق الأدمن يجعلك مميّزاً ويظهرك في الأولويات</div>
        </div>
        <button class="btn bp bsm" onclick="goTo('profile')" style="flex-shrink:0"><i class="fas fa-shield-alt"></i>اطلب التوثيق</button>
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

    ${renderHiringCampsSection()}
    ${renderActiveBanners('home')}

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
      <div class="qact-card" onclick="toggleJobAlerts(this)">
        <div class="qact-ico" style="background:linear-gradient(135deg,${P?.jobAlerts ? '#22c55e' : '#64748b'},${P?.jobAlerts ? '#4ade80' : '#94a3b8'})">
          <i class="fas fa-bell"></i>
        </div>
        <div class="qact-tit">${P?.jobAlerts ? 'التنبيهات مفعّلة 🔔' : 'تنبيهات الوظائف'}</div>
        <div class="qact-sub">${P?.jobAlerts ? 'ستصلك إشعارات عند نشر وظائف جديدة' : 'فعّل الإشعارات لتعلم بأحدث الوظائف'}</div>
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
    <div class="jg fade-up del5">${JOBS.filter(j => isJobLive(j)).slice(0, 4).map(j => jCard(j)).join('')}</div>`;
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
            const t = tsMs(d.data().createdAt);
            return t && (Date.now() - t) < 86400000 * 7;
          }).length;
        })
        .catch(e => {
          console.error('Admin users stats:', e);
          notify('تنبيه', 'تعذّر تحميل بيانات المستخدمين: ' + e.message, 'warning');
        })
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
        { ico:'fa-plus-circle', l:'نشر وظيفة جديدة',    c:'var(--success)',  a:"openAddJob()" },
        { ico:'fa-user-plus',   l:'إضافة مستخدم',       c:'var(--info)',     a:"openAddUserDirect()" },
        { ico:'fa-briefcase',   l:'الوظائف',              c:'var(--acc)',     a:"goTo('alljobs')" },
        { ico:'fa-building',    l:'مكاتب التوظيف',       c:'var(--purple)', a:"goTo('alloffices')" },
        { ico:'fa-users',       l:'المستخدمون',            c:'var(--info)',   a:"goTo('allusers')" },
        { ico:'fa-user-tie',    l:'الموظفون المُدارون',   c:'#7c3aed',       a:"goTo('admin_seekers')" },
        { ico:'fa-credit-card', l:'الاشتراكات',            c:'#f59e0b',       a:"goTo('payments')" },
        { ico:'fa-bullhorn',    l:'حملات التواصل',        c:'var(--p)',       a:"goTo('campaigns')" },
        { ico:'fa-cog',         l:'الإعدادات',             c:'var(--tx3)',     a:"goTo('settings')" },
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
      <button class="btn bp bsm" onclick="openAddJob()"><i class="fas fa-plus"></i>نشر وظيفة</button>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
      <span class="b b-gr"><i class="fas fa-circle" style="font-size:8px"></i> نشطة: ${live}</span>
      <span class="b b-rd"><i class="fas fa-clock"></i> منتهية: ${expired}</span>
      <span class="b b-pu"><i class="fas fa-thumbtack"></i> مثبّتة: ${pinned}</span>
      <button class="btn bsm" id="deleteAllJobsBtn"
        style="background:#ef4444;color:#fff;border:none;margin-right:auto"
        onclick="deleteAllJobs()">
        <i class="fas fa-trash-alt"></i> حذف جميع الوظائف
      </button>
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
      ${j.featured
        ? `<button class="btn bsm" style="background:#b45309;color:#fff" onclick="adminFeatureJob('${j.id}',false,'${san(j.title)}')">
             <i class="fas fa-star"></i> إلغاء التمييز
           </button>`
        : `<button class="btn bsm" style="background:#f59e0b;color:#fff" onclick="adminFeatureJob('${j.id}',true,'${san(j.title)}')">
             <i class="fas fa-star"></i> تمييز ⭐
           </button>`}
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

async function adminFeatureJob(jobId, feature, title) {
  const action = feature ? 'تمييز' : 'إلغاء تمييز';
  confirm2(`${action} الوظيفة`, `هل تريد ${action} وظيفة "${title}"؟\nالوظائف المميزة تظهر أولاً مع شارة ⭐`, async () => {
    try {
      if (!DEMO && window.db) {
        await window.db.collection('jobs').doc(jobId).update({ featured: feature });
      }
      const job = JOBS.find(j => j.id === jobId);
      if (job) job.featured = feature;
      notify(feature ? 'تم التمييز ⭐' : 'تم إلغاء التمييز', `وظيفة "${title}" ${feature ? 'مميزة وستظهر في الصدارة' : 'عادت للترتيب الطبيعي'}`, 'success');
      pgAdminJobs(document.getElementById('pcon'));
    } catch(e) { notify('خطأ', 'فشلت العملية', 'error'); }
  });
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
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn bp bsm bfu" style="flex:1" onclick="adminViewOffice(${JSON.stringify({id:o.id,name:san(o.officeName||o.name),province:san(o.province||''),email:san(o.email||''),phone:san(o.phone||''),status:o.status||'active',created}).replace(/"/g,'&quot;')})">
              <i class="fas fa-eye"></i>عرض
            </button>
            ${!o.verified
              ? `<button class="btn bsm" style="background:var(--success);color:#fff" title="توثيق المكتب"
                   onclick="adminVerifyOffice('${o.id}','${san(o.officeName||o.name)}')">
                   <i class="fas fa-check-circle"></i>توثيق
                 </button>`
              : `<span class="b b-gr" style="font-size:11px;align-self:center"><i class="fas fa-check-circle"></i>موثّق</span>`}
            ${isActive
              ? `<button class="btn bda bsm" onclick="adminToggleOffice('${o.id}','inactive','${san(o.officeName||o.name)}')"><i class="fas fa-ban"></i></button>`
              : `<button class="btn bsm" style="background:var(--info);color:#fff" onclick="adminToggleOffice('${o.id}','active','${san(o.officeName||o.name)}')"><i class="fas fa-check"></i></button>`
            }
            <button class="btn bsm" style="background:none;border:1px solid var(--br);color:#ef4444"
              onclick="adminDeleteOffice('${o.id}','${san(o.officeName||o.name)}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  };

  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-building"></i></div>مكاتب التوظيف</div>
      <div style="display:flex;gap:8px;align-items:center">
        <span class="b b-tl">${offices.length} مكتب</span>
        <button class="btn bp bsm" onclick="openAddOfficeDirect()"><i class="fas fa-plus"></i>إضافة مكتب</button>
      </div>
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

async function adminVerifyOffice(uid, name) {
  confirm2('توثيق المكتب', `هل تريد توثيق مكتب "${name}"؟\nسيحصل على شارة "موثّق ✅" وسيُفعَّل حسابه.`, async () => {
    if (DEMO || !window.db) { notify('تنبيه', 'يتطلب Firebase', 'info'); return; }
    try {
      await window.db.collection('users').doc(uid).update({ verified: true, status: 'active' });
      notify('تم التوثيق ✅', `تم توثيق مكتب "${name}" بنجاح`, 'success');
      pgAdminOffices(document.getElementById('pcon'));
    } catch(e) { notify('خطأ', 'فشل التوثيق: ' + e.message, 'error'); }
  });
}

function openAddOfficeDirect() {
  const body = `
    <div class="fr">
      <div class="fg">
        <label class="fl req">اسم المكتب</label>
        <input type="text" class="fc" id="aoName" placeholder="مكتب التوظيف الذهبي">
      </div>
      <div class="fg">
        <label class="fl req">رقم الهاتف</label>
        <input type="tel" class="fc" id="aoPhone" placeholder="07801234567">
      </div>
    </div>
    <div class="fr">
      <div class="fg">
        <label class="fl req">البريد الإلكتروني</label>
        <input type="email" class="fc" id="aoEmail" placeholder="office@example.com">
      </div>
      <div class="fg">
        <label class="fl req">كلمة المرور (6+ أحرف)</label>
        <input type="password" class="fc" id="aoPass" placeholder="••••••••" minlength="6">
      </div>
    </div>
    <div class="fg">
      <label class="fl req">المحافظة</label>
      <select class="fc" id="aoProvince">
        ${Object.keys(PROV_COORDS).map(p => `<option value="${p}">${p}</option>`).join('')}
      </select>
    </div>
    <div class="mf" style="border:none;padding:0;margin-top:14px">
      <button class="btn bo" onclick="cmo('_adminModal')">إلغاء</button>
      <button class="btn bp bfu" id="aoSubmitBtn" onclick="adminDoAddOffice()">
        <i class="fas fa-building"></i>إنشاء حساب المكتب
      </button>
    </div>`;
  _showAdminModal('إضافة مكتب توظيف', body);
}

async function adminDoAddOffice() {
  const name     = document.getElementById('aoName')?.value.trim();
  const email    = document.getElementById('aoEmail')?.value.trim().toLowerCase();
  const pass     = document.getElementById('aoPass')?.value;
  const phone    = document.getElementById('aoPhone')?.value.trim();
  const province = document.getElementById('aoProvince')?.value;

  if (!name || name.length < 2) { notify('خطأ', 'أدخل اسم المكتب', 'error'); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify('خطأ', 'البريد غير صحيح', 'error'); return; }
  if (!pass || pass.length < 6) { notify('خطأ', 'كلمة المرور 6 أحرف على الأقل', 'error'); return; }

  loading('aoSubmitBtn', true);
  let secondaryApp = null;
  try {
    secondaryApp = firebase.initializeApp(firebase.app().options, 'officeCreate_' + Date.now());
    const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, pass);
    const uid  = cred.user.uid;
    await window.db.collection('users').doc(uid).set({
      officeName: name, name, email, phone: phone || '', province: province || '',
      role: 'office', status: 'active', verified: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: U?.uid,
    });
    await secondaryApp.auth().signOut();
    cmo('_adminModal');
    notify('تم الإنشاء ✅', `تم إنشاء حساب مكتب "${name}" بنجاح`, 'success');
    pgAdminOffices(document.getElementById('pcon'));
  } catch(e) {
    const msgs = { 'auth/email-already-in-use': 'البريد مستخدم بالفعل', 'auth/weak-password': 'كلمة المرور ضعيفة', 'auth/invalid-email': 'البريد غير صالح' };
    notify('خطأ', msgs[e.code] || 'فشل الإنشاء: ' + e.message, 'error');
  } finally {
    loading('aoSubmitBtn', false);
    try { if (secondaryApp) await secondaryApp.delete(); } catch(_) {}
  }
}

async function adminDeleteOffice(uid, name) {
  confirm2('حذف المكتب', `سيُحذف حساب مكتب "${name}" من قاعدة البيانات نهائياً.\n\nملاحظة: يبقى حساب المصادقة قائماً — احذفه من Firebase Console إن لزم.`, async () => {
    if (DEMO || !window.db) { notify('تنبيه', 'يتطلب Firebase', 'info'); return; }
    try {
      await window.db.collection('users').doc(uid).delete();
      notify('تم الحذف', `تم حذف مكتب "${name}"`, 'info');
      pgAdminOffices(document.getElementById('pcon'));
    } catch(e) { notify('خطأ', 'فشل الحذف: ' + e.message, 'error'); }
  });
}

// ════════════════════════════════════════════
// صفحة المستخدمين — أدمن (بيانات حقيقية)
// ════════════════════════════════════════════
let _usersSearch = '', _usersRoleFilter = '', _usersPage = 1;
const _USERS_PER_PAGE = 20;

async function pgAdminUsers(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ تحميل المستخدمين...</div></div>`;

  let users = [];
  if (!DEMO && window.db) {
    try {
      const snap = await window.db.collection('users').get();
      users = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt));
    } catch(e) {
      console.error('Admin users:', e);
      notify('خطأ', 'تعذّر تحميل المستخدمين: ' + e.message, 'error');
    }
  }

  const seekers   = users.filter(u => u.role === 'seeker' || !u.role).length;
  const offices   = users.filter(u => u.role === 'office').length;
  const employers = users.filter(u => u.role === 'employer').length;
  const admins    = users.filter(u => u.role === 'admin').length;
  const total     = users.length;
  const active    = users.filter(u => u.status === 'active' || !u.status).length;

  window._adminUsers = users;
  _usersSearch = '';
  _usersRoleFilter = '';
  _usersPage = 1;

  el.innerHTML = `
    <!-- رأس الصفحة -->
    <div class="sh" style="flex-wrap:wrap;gap:8px">
      <div class="st"><div class="st-ico"><i class="fas fa-users"></i></div>إدارة المستخدمين
        <span class="b b-tl" style="font-size:10px;margin-right:6px">${total} مستخدم</span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button class="btn bp bsm" onclick="openAddUserDirect()">
          <i class="fas fa-user-plus"></i>إضافة مستخدم
        </button>
        <button class="btn bg bsm" onclick="openInviteUser()">
          <i class="fas fa-paper-plane"></i>دعوة بالبريد
        </button>
      </div>
    </div>

    <!-- بطاقات الإحصائيات -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:18px">
      ${[
        {l:'الباحثون',     v:seekers,   ic:'fa-user-tie',   c:'var(--p)',       f:'seeker',   bg:'rgba(13,148,136,.1)'},
        {l:'المكاتب',      v:offices,   ic:'fa-building',   c:'var(--purple)',  f:'office',   bg:'rgba(124,58,237,.1)'},
        {l:'أصحاب العمل',  v:employers, ic:'fa-briefcase',  c:'var(--info)',    f:'employer', bg:'rgba(59,130,246,.1)'},
        {l:'المديرون',     v:admins,    ic:'fa-shield-alt', c:'var(--acc)',     f:'admin',    bg:'rgba(245,158,11,.1)'},
        {l:'نشط',          v:active,    ic:'fa-check-circle',c:'var(--success)',f:'',         bg:'rgba(34,197,94,.1)'},
      ].map(x => `
        <div class="card" style="text-align:center;padding:14px 10px;cursor:${x.f?'pointer':'default'};transition:all .2s"
          ${x.f ? `onclick="filterAdminUsers('${x.f}')"
          onmouseenter="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shl)'"
          onmouseleave="this.style.transform='';this.style.boxShadow=''"` : ''}>
          <div style="width:38px;height:38px;border-radius:10px;background:${x.bg};color:${x.c};margin:0 auto 8px;font-size:16px;display:flex;align-items:center;justify-content:center">
            <i class="fas ${x.ic}"></i>
          </div>
          <div style="font-size:24px;font-weight:900;color:var(--tx);line-height:1">${x.v}</div>
          <div style="font-size:10px;color:var(--tx3);margin-top:4px">${x.l}</div>
          <div style="height:3px;border-radius:2px;background:${x.c};opacity:.25;margin-top:8px;
            width:${Math.round(x.v/Math.max(total,1)*100)}%"></div>
        </div>`).join('')}
    </div>

    <!-- شريط البحث والفلترة -->
    <div class="card" style="margin-bottom:12px;padding:12px 14px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:180px;position:relative">
          <i class="fas fa-search" style="position:absolute;right:11px;top:50%;transform:translateY(-50%);color:var(--tx3);font-size:13px;pointer-events:none"></i>
          <input type="search" class="fc" id="usersSearch" placeholder="اسم، بريد إلكتروني أو هاتف..."
            style="padding-right:34px"
            oninput="_usersSearch=this.value;_usersPage=1;renderAdminUsersList()">
        </div>
        <select class="fc" id="usersRoleFilter" style="width:auto;min-width:120px"
          onchange="_usersRoleFilter=this.value;_usersPage=1;renderAdminUsersList()">
          <option value="">جميع الأدوار</option>
          <option value="seeker">باحث عن عمل</option>
          <option value="office">مكتب توظيف</option>
          <option value="employer">صاحب عمل</option>
          <option value="admin">مدير النظام</option>
        </select>
        <button class="btn bg bsm" onclick="_usersSearch='';_usersRoleFilter='';_usersPage=1;document.getElementById('usersSearch').value='';document.getElementById('usersRoleFilter').value='';renderAdminUsersList()">
          <i class="fas fa-undo"></i>إعادة تعيين
        </button>
      </div>
    </div>

    <!-- قائمة المستخدمين -->
    <div class="card" style="overflow:hidden">
      <div id="usersTableBody"></div>
      <div id="usersPagination" style="padding:10px 14px;border-top:1px solid var(--br);display:flex;justify-content:center"></div>
    </div>`;

  if (!users.length) {
    document.getElementById('usersTableBody').innerHTML = `
      <tr><td colspan="6">${emptyState('👤', 'لا يوجد مستخدمون بعد', 'لم يُسجَّل أي مستخدم حتى الآن')}</td></tr>`;
    return;
  }

  renderAdminUsersList();
}

function filterAdminUsers(role) {
  _usersRoleFilter = role;
  _usersPage = 1;
  const sel = document.getElementById('usersRoleFilter');
  if (sel) sel.value = role;
  renderAdminUsersList();
}

function renderAdminUsersList() {
  const users = window._adminUsers || [];
  const q = _usersSearch.toLowerCase();
  const filtered = users.filter(u => {
    const matchRole   = !_usersRoleFilter || u.role === _usersRoleFilter || (!u.role && _usersRoleFilter === 'seeker');
    const matchSearch = !q || (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q) || (u.phone||'').includes(q);
    return matchRole && matchSearch;
  });

  const roleLabel = { seeker:'باحث', office:'مكتب', employer:'صاحب عمل', admin:'أدمن' };
  const roleClass = { seeker:'b-tl', office:'b-pu', employer:'b-bl', admin:'b-am' };
  const roleIcon  = { seeker:'fa-user', office:'fa-building', employer:'fa-briefcase', admin:'fa-shield-alt' };

  const tbody = document.getElementById('usersTableBody');
  const pagDiv = document.getElementById('usersPagination');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `<div style="text-align:center;padding:40px;color:var(--tx3)">
      <div style="font-size:32px;margin-bottom:8px">🔍</div>
      <div style="font-weight:700;margin-bottom:4px">لا توجد نتائج</div>
      <div style="font-size:11px">جرّب تغيير كلمة البحث أو الفلتر</div>
    </div>`;
    if (pagDiv) pagDiv.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(filtered.length / _USERS_PER_PAGE);
  if (_usersPage > totalPages) _usersPage = totalPages;
  const start = (_usersPage - 1) * _USERS_PER_PAGE;
  const page  = filtered.slice(start, start + _USERS_PER_PAGE);

  tbody.innerHTML = page.map(u => {
    const isActive = u.status === 'active' || !u.status;
    const role     = u.role || 'seeker';
    const plan     = u.plan || (u.plus ? 'standard' : 'free');
    const expired  = plan !== 'free' && u.planExpiry && new Date(u.planExpiry) < new Date();
    const PCOLOR   = { free:'#6b7280', standard:'#3b82f6', premium:'#f59e0b' };
    const PNAME    = { free:'مجاني', standard:'قياسي', premium:'مميز ⭐' };
    const dateStr  = u.createdAt?.toDate?.()?.toLocaleDateString('ar-IQ') || (u.createdAt ? u.createdAt.slice?.(0,10) : '');

    return `
    <div style="padding:13px 14px;border-bottom:1px solid var(--br);transition:background .15s"
      onmouseenter="this.style.background='var(--bgc2)'" onmouseleave="this.style.background=''">

      <!-- الصف الأول: الأفاتار + الاسم + الدور -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--pl));color:#fff;font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 6px rgba(13,148,136,.25)">
          ${(u.name||'م').charAt(0)}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:800;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px">
            ${san(u.name||'—')}
            ${u.verified ? '<i class="fas fa-check-circle" style="color:var(--p);font-size:10px;margin-right:2px"></i>' : ''}
            ${u.verificationRequested && !u.verified ? '<i class="fas fa-clock" style="color:var(--acc);font-size:10px;margin-right:2px" title="طلب توثيق معلّق"></i>' : ''}
          </div>
          <div style="color:var(--tx3);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${san(u.email||'—')}</div>
          ${u.phone ? `<div style="color:var(--tx3);font-size:10.5px">${san(u.phone)}</div>` : ''}
        </div>
        <span class="b ${roleClass[role]||'b-tl'}" style="font-size:10px;flex-shrink:0">
          <i class="fas ${roleIcon[role]||'fa-user'}"></i>${roleLabel[role]||'باحث'}
        </span>
      </div>

      <!-- الصف الثاني: شارات المعلومات -->
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:9px;padding-right:50px">
        <span class="b ${isActive?'b-gr':'b-rd'}" style="font-size:10px">
          <i class="fas ${isActive?'fa-check-circle':'fa-times-circle'}"></i>${isActive?'نشط':'موقوف'}
        </span>
        <span class="b" style="background:${PCOLOR[plan]||'#888'}15;color:${PCOLOR[plan]||'#888'};border:1px solid ${PCOLOR[plan]||'#888'}25;font-size:10px;${expired?'text-decoration:line-through':''}">${PNAME[plan]||plan}</span>
        ${u.province ? `<span style="font-size:10px;color:var(--tx3);display:flex;align-items:center;gap:2px"><i class="fas fa-map-marker-alt" style="color:var(--danger);font-size:9px"></i>${san(u.province)}</span>` : ''}
        ${dateStr ? `<span style="font-size:10px;color:var(--tx3)">${dateStr}</span>` : ''}
      </div>

      <!-- الصف الثالث: أزرار الإجراءات -->
      ${role !== 'admin' ? `
      <div style="display:flex;gap:5px;flex-wrap:wrap;padding-right:50px">
        <button class="btn ${isActive?'bda':'bg'} bsm" style="font-size:11px;padding:5px 10px;border-radius:8px"
          onclick="adminToggleUser('${u.id}','${isActive?'inactive':'active'}','${san(u.name||'')}')">
          <i class="fas ${isActive?'fa-ban':'fa-check'}"></i>${isActive?'إيقاف':'تفعيل'}
        </button>
        ${!u.verified ? `
        <button class="btn bsm" style="background:${u.verificationRequested?'var(--acc)':'var(--success)'};color:#fff;font-size:11px;padding:5px 10px;border-radius:8px"
          onclick="adminVerifyUser('${u.id}','${san(u.name||'')}','${role}')">
          <i class="fas ${u.verificationRequested?'fa-user-check':'fa-check-circle'}"></i>${u.verificationRequested?'طلب توثيق':'توثيق'}
        </button>` : `<span class="b b-tl" style="font-size:10px;padding:5px 10px"><i class="fas fa-shield-alt"></i>موثّق</span>`}
        <button class="btn bo bsm" style="font-size:11px;padding:5px 10px;border-radius:8px"
          onclick="adminChangeRole('${u.id}','${role}','${san(u.name||'')}')">
          <i class="fas fa-exchange-alt"></i>الدور
        </button>
        <button class="btn bsm" style="background:none;border:1px solid var(--br);color:var(--tx3);font-size:11px;padding:5px 8px;border-radius:8px"
          onclick="adminDeleteUser('${u.id}','${san(u.name||'')}')">
          <i class="fas fa-trash"></i>
        </button>
        <button class="btn bsm" style="background:none;border:1px solid var(--p);color:var(--p);font-size:11px;padding:5px 8px;border-radius:8px"
          onclick="adminUserPermissions('${u.id}','${san(u.name||'')}')">
          <i class="fas fa-shield-alt"></i>
        </button>
      </div>` : `
      <div style="padding-right:50px">
        <span class="b b-am" style="font-size:10px"><i class="fas fa-shield-alt"></i>حساب محمي</span>
      </div>`}
    </div>`;
  }).join('');

  if (pagDiv) {
    pagDiv.innerHTML = totalPages > 1
      ? `<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tx3)">
           <span>عرض ${start+1}–${Math.min(start+_USERS_PER_PAGE,filtered.length)} من ${filtered.length}</span>
           ${_buildPagination(totalPages, _usersPage, p => { _usersPage=p; renderAdminUsersList(); })}
         </div>`
      : `<div style="font-size:11px;color:var(--tx3)">إجمالي النتائج: ${filtered.length} مستخدم</div>`;
  }
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

async function adminDeleteUser(uid, name) {
  confirm2('حذف المستخدم', `سيُحذف ملف "${name}" من قاعدة البيانات نهائياً.\n\nملاحظة: يبقى حساب المصادقة قائماً — احذفه من Firebase Console إن لزم.`, async () => {
    if (DEMO || !window.db) { notify('تنبيه', 'يتطلب Firebase', 'info'); return; }
    try {
      await window.db.collection('users').doc(uid).delete();
      window._adminUsers = (window._adminUsers||[]).filter(u => u.id !== uid);
      renderAdminUsersList();
      notify('تم الحذف', `تم حذف ملف "${name}"`, 'info');
    } catch(e) { notify('خطأ', 'فشل الحذف: ' + e.message, 'error'); }
  });
}

async function adminVerifyUser(uid, name, role) {
  const lbl = role === 'office' ? 'المكتب' : role === 'employer' ? 'صاحب العمل' : role === 'seeker' ? 'الباحث' : 'المستخدم';
  confirm2('توثيق الحساب', `هل تريد توثيق ${lbl} "${name}"؟\nسيظهر شارة "موثّق" على ملفه وسيُفعَّل حسابه.`, async () => {
    if (DEMO || !window.db) { notify('تنبيه', 'يتطلب Firebase', 'info'); return; }
    try {
      await window.db.collection('users').doc(uid).update({ verified: true, status: 'active', verificationRequested: false });
      const u = (window._adminUsers||[]).find(u => u.id === uid);
      if (u) { u.verified = true; u.status = 'active'; u.verificationRequested = false; }
      renderAdminUsersList();
      notify('تم التوثيق ✅', `تم توثيق ${lbl} "${name}" بنجاح`, 'success');
    } catch(e) { notify('خطأ', 'فشل التوثيق: ' + e.message, 'error'); }
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

// ── إضافة مستخدم مباشر ──
function openAddUserDirect() {
  const body = `
    <div class="al al-i" style="margin-bottom:14px">
      <i class="fas fa-info-circle"></i>
      <span>سيتم إنشاء حساب Firebase Auth كامل مع ملف في قاعدة البيانات</span>
    </div>
    <div class="fr">
      <div class="fg">
        <label class="fl req">الاسم الكامل</label>
        <input type="text" class="fc" id="auName" placeholder="أحمد محمد">
      </div>
      <div class="fg">
        <label class="fl req">رقم الهاتف</label>
        <input type="tel" class="fc" id="auPhone" placeholder="07801234567">
      </div>
    </div>
    <div class="fr">
      <div class="fg">
        <label class="fl req">البريد الإلكتروني</label>
        <input type="email" class="fc" id="auEmail" placeholder="user@example.com">
      </div>
      <div class="fg">
        <label class="fl req">كلمة المرور (6+ أحرف)</label>
        <input type="password" class="fc" id="auPass" placeholder="••••••••" minlength="6">
      </div>
    </div>
    <div class="fg">
      <label class="fl req">الدور</label>
      <select class="fc" id="auRole">
        <option value="seeker">باحث عن عمل</option>
        <option value="office">مكتب توظيف</option>
        <option value="employer">صاحب عمل</option>
        <option value="admin">مدير نظام</option>
      </select>
    </div>
    <div class="mf" style="border:none;padding:0;margin-top:14px">
      <button class="btn bo" onclick="cmo('_adminModal')">إلغاء</button>
      <button class="btn bp bfu" id="auSubmitBtn" onclick="adminDoAddUser()">
        <i class="fas fa-user-plus"></i>إنشاء الحساب
      </button>
    </div>`;
  _showAdminModal('إضافة مستخدم جديد', body);
}

async function adminDoAddUser() {
  const name  = document.getElementById('auName')?.value.trim();
  const email = document.getElementById('auEmail')?.value.trim().toLowerCase();
  const pass  = document.getElementById('auPass')?.value;
  const role  = document.getElementById('auRole')?.value;
  const phone = document.getElementById('auPhone')?.value.trim();

  if (!name || name.length < 2)   { notify('خطأ', 'أدخل الاسم الكامل', 'error'); return; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify('خطأ', 'البريد غير صحيح', 'error'); return; }
  if (!pass || pass.length < 6)   { notify('خطأ', 'كلمة المرور 6 أحرف على الأقل', 'error'); return; }

  loading('auSubmitBtn', true);
  let secondaryApp = null;
  try {
    // نستخدم تطبيق Firebase ثانوي لإنشاء المستخدم دون تغيير جلسة الأدمن
    secondaryApp = firebase.initializeApp(firebase.app().options, 'adminCreate_' + Date.now());
    const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, pass);
    const uid  = cred.user.uid;

    await window.db.collection('users').doc(uid).set({
      name, email,
      phone: phone || '',
      role,
      status: 'active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: U?.uid,
    });

    await secondaryApp.auth().signOut();
    cmo('_adminModal');

    if (window._adminUsers) {
      window._adminUsers.unshift({ id: uid, name, email, phone: phone||'', role, status: 'active' });
    }
    renderAdminUsersList();
    notify('تم الإنشاء ✅', `تم إنشاء حساب "${name}" بنجاح`, 'success');
  } catch(e) {
    const msgs = {
      'auth/email-already-in-use': 'البريد الإلكتروني مستخدم بالفعل',
      'auth/weak-password':        'كلمة المرور ضعيفة جداً',
      'auth/invalid-email':        'البريد الإلكتروني غير صالح',
    };
    notify('خطأ', msgs[e.code] || 'فشل إنشاء الحساب: ' + e.message, 'error');
  } finally {
    loading('auSubmitBtn', false);
    try { if (secondaryApp) await secondaryApp.delete(); } catch(_) {}
  }
}

// ── مودال عام للأدمن ──
function _showAdminModal(title, body) {
  let mo = document.getElementById('_adminModal');
  if (!mo) {
    mo = document.createElement('div');
    mo.id = '_adminModal';
    mo.className = 'mo';
    mo.onclick = e => { if (e.target === mo) cmo('_adminModal'); };
    mo.innerHTML = `<div class="md" style="max-width:460px">
      <div class="mh">
        <div class="mt" id="_adminModalTitle"></div>
        <div class="mc" onclick="cmo('_adminModal')"><i class="fas fa-times"></i></div>
      </div>
      <div class="mb" id="_adminModalB"></div>
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

// ════════════════════════════════════════════
// الموظفون المُدارون — أدمن (كل المكاتب)
// ════════════════════════════════════════════
async function pgAdminManagedSeekers(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ التحميل...</div></div>`;

  let seekers = [], offices = [];
  if (!DEMO && window.db) {
    try {
      const [sSnap, oSnap] = await Promise.all([
        window.db.collection('managed_seekers').get(),
        window.db.collection('users').where('role', '==', 'office').get(),
      ]);
      seekers = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      offices = oSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { console.warn('adminManagedSeekers:', e.message); }
  }

  const officeMap = {};
  offices.forEach(o => { officeMap[o.id] = o.officeName || o.name || '—'; });

  if (!seekers.length) {
    el.innerHTML = `
      <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-user-tie"></i></div>الموظفون المُدارون</div></div>
      ${emptyState('👤', 'لا يوجد موظفون مُدارون', 'المكاتب لم تُضف أي موظفين بعد')}`;
    return;
  }

  const published = seekers.filter(s => s.published).length;

  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-user-tie"></i></div>الموظفون المُدارون</div>
      <span class="b b-tl">${seekers.length} موظف • ${published} منشور</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px">
      ${seekers.map(s => {
        const officeName = officeMap[s.officeId] || '—';
        const init = (s.name||'م').charAt(0);
        return `<div class="card cp fade-up" style="${s.published ? 'border-color:rgba(168,85,247,.3)' : ''}">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            ${s.photo
              ? `<img src="${s.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0">`
              : `<div class="av" style="width:40px;height:40px;border-radius:50%;background:var(--grad-p);color:#fff;font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">${init}</div>`}
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:800;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${san(s.name)}</div>
              <div style="font-size:11px;color:var(--tx3)">${san(s.title||'—')}</div>
            </div>
            <span class="b ${s.published ? 'b-pu' : 'b-rd'}" style="font-size:10px;flex-shrink:0">${s.published ? 'منشور' : 'خاص'}</span>
          </div>
          <div style="font-size:11px;color:var(--tx3);margin-bottom:10px">
            <i class="fas fa-building" style="color:var(--purple)"></i> ${san(officeName)}
            ${s.province ? ` • <i class="fas fa-map-marker-alt"></i> ${san(s.province)}` : ''}
            ${s.phone ? ` • <i class="fas fa-phone"></i> ${san(s.phone)}` : ''}
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn ${s.published ? '' : 'bp'} bsm" style="${s.published ? 'background:#7c3aed;color:#fff' : ''};flex:1"
              onclick="adminToggleManagedSeeker('${s.id}',${!s.published},'${san(s.name)}')">
              <i class="fas ${s.published ? 'fa-eye-slash' : 'fa-eye'}"></i>${s.published ? 'إخفاء' : 'نشر'}
            </button>
            <button class="btn bda bsm" onclick="adminDeleteManagedSeeker('${s.id}','${san(s.name)}')">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

async function adminToggleManagedSeeker(id, publish, name) {
  if (DEMO || !window.db) return;
  try {
    await window.db.collection('managed_seekers').doc(id).update({ published: publish });
    notify('تم ✅', `"${name}" ${publish ? 'منشور الآن للأصحاب العمل' : 'تم إخفاؤه'}`, 'success');
    pgAdminManagedSeekers(document.getElementById('pcon'));
  } catch(e) { notify('خطأ', 'فشلت العملية', 'error'); }
}

async function adminDeleteManagedSeeker(id, name) {
  confirm2('حذف الموظف', `هل تريد حذف ملف "${name}" نهائياً؟`, async () => {
    if (DEMO || !window.db) return;
    try {
      await window.db.collection('managed_seekers').doc(id).delete();
      notify('تم الحذف', `تم حذف "${name}"`, 'info');
      pgAdminManagedSeekers(document.getElementById('pcon'));
    } catch(e) { notify('خطأ', 'فشل الحذف', 'error'); }
  });
}


// ════════════════════════════════════════════
// إعدادات النظام — أدمن
// ════════════════════════════════════════════
async function pgAdminSettings(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ تحميل الإعدادات...</div></div>`;

  if (!DEMO && window.db) {
    try {
      const doc = await window.db.collection('config').doc('settings').get();
      if (doc.exists) {
        const s = doc.data();
        ['telegram','emailjs','imgbb','facebook','instagram','twitter','linkedin','tiktok','snapchat','youtube','gemini','general','site'].forEach(k => {
          if (s[k]) CFG[k] = { ...CFG[k], ...s[k] };
        });
      }
    } catch(e) { console.warn('Settings load:', e); }
  }

  const c = CFG;
  el.innerHTML = `
    <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-cog"></i></div>إعدادات النظام</div></div>

    <!-- تبويبات -->
    <div class="tabs" style="margin-bottom:18px;flex-wrap:wrap">
      <button class="tb2 on" onclick="swSettTab('social',this)"><i class="fas fa-share-alt"></i> السوشال ميديا</button>
      <button class="tb2"    onclick="swSettTab('services',this)"><i class="fas fa-plug"></i> الخدمات</button>
      <button class="tb2"    onclick="swSettTab('general',this)"><i class="fas fa-sliders-h"></i> عام</button>
      <button class="tb2"    onclick="swSettTab('siteinfo',this)"><i class="fas fa-id-card"></i> معلومات الموقع</button>
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
            <input class="fc" id="siteName" value="${c.general?.siteName||'عفراء للتوظيف'}" placeholder="عفراء للتوظيف">
          </div>
          <div class="fg"><label class="fl">رابط الموقع (للمشاركة)</label>
            <input class="fc" id="siteUrl" value="${c.general?.siteUrl||''}" placeholder="https://afraa.iq">
          </div>
          ${_toggleRow('maintMode', c.general?.maintenance, 'وضع الصيانة', 'يمنع المستخدمين من الدخول مؤقتاً')}
        </div>
      </div>
    </div>

    <!-- ══ معلومات الموقع ══ -->
    <div id="stSiteinfo" style="display:none">

      <!-- صورة المؤسسة -->
      <div class="card" style="margin-bottom:14px">
        <div class="ch"><div class="cht"><i class="fas fa-user-circle" style="color:var(--p)"></i> صورة المؤسسة</div></div>
        <div class="cp">
          <div style="display:flex;align-items:center;gap:18px;margin-bottom:16px;flex-wrap:wrap">
            <div id="founderPhotoPreview" style="width:90px;height:90px;border-radius:50%;overflow:hidden;border:3px solid var(--p);flex-shrink:0;background:var(--bgc2);display:flex;align-items:center;justify-content:center">
              ${c.site?.founderPhotoURL
                ? `<img src="${c.site.founderPhotoURL}" style="width:100%;height:100%;object-fit:cover" alt="صورة المؤسسة">`
                : `<i class="fas fa-user" style="font-size:32px;color:var(--tx3)"></i>`}
            </div>
            <div style="flex:1;min-width:180px">
              <div style="font-size:13px;font-weight:700;color:var(--tx);margin-bottom:6px">صورة المهندسة عفراء الهاشمي</div>
              <div style="font-size:11px;color:var(--tx3);margin-bottom:10px">تُستخدم في صفحة "عن المنصة" — ارفع صورة بجودة عالية</div>
              <button id="founderUploadBtn" class="btn bsm" style="background:var(--p);color:#fff;border:none;margin-bottom:6px"
                onclick="uploadFounderPhoto()">
                <i class="fas fa-upload"></i> رفع صورة جديدة
              </button>
            </div>
          </div>
          <div class="fg">
            <label class="fl">أو الصق رابط الصورة مباشرة</label>
            <input class="fc" id="founderPhotoURL" value="${c.site?.founderPhotoURL||''}" placeholder="https://i.ibb.co/...">
            <div class="fh">يمكن رفع الصورة عبر ImgBB أو أي خدمة رفع صور — تأكد أن الرابط يفتح مباشرة كصورة</div>
          </div>
        </div>
      </div>

      <!-- معلومات التواصل -->
      <div class="card" style="margin-bottom:14px">
        <div class="ch"><div class="cht"><i class="fas fa-address-card" style="color:var(--acc)"></i> معلومات التواصل</div></div>
        <div class="cp">
          <div class="fr">
            <div class="fg">
              <label class="fl">البريد الإلكتروني الرسمي</label>
              <input type="email" class="fc" id="siteEmail" value="${c.site?.email||'afrahub.iq@gmail.com'}" placeholder="afrahub.iq@gmail.com">
            </div>
            <div class="fg">
              <label class="fl">رقم الهاتف / واتساب</label>
              <input type="tel" class="fc" id="sitePhone" value="${c.site?.phone||''}" placeholder="07XXXXXXXXX">
              <div class="fh">سيظهر في فوتر الموقع ويُستخدم لزر واتساب</div>
            </div>
          </div>
          <div class="fg">
            <label class="fl">العنوان</label>
            <input class="fc" id="siteAddress" value="${c.site?.address||'بغداد، العراق'}" placeholder="بغداد، العراق">
          </div>
        </div>
      </div>

      <!-- روابط صفحات التواصل الاجتماعي -->
      <div class="card" style="margin-bottom:14px">
        <div class="ch"><div class="cht"><i class="fas fa-link" style="color:var(--purple)"></i> روابط صفحات التواصل الاجتماعي</div></div>
        <div class="cp">
          <div class="al al-i" style="margin-bottom:12px">
            <i class="fas fa-info-circle"></i>
            <span>هذه روابط <b>صفحات</b> التواصل (مثال: facebook.com/afra-iq) — تُعرض في الفوتر لزوار الموقع</span>
          </div>
          <div class="fr">
            <div class="fg">
              <label class="fl"><i class="fab fa-facebook-f" style="color:#1877f2"></i> رابط صفحة فيسبوك</label>
              <input class="fc" id="siteFbUrl" value="${c.site?.facebookUrl||''}" placeholder="https://facebook.com/afra-iq">
            </div>
            <div class="fg">
              <label class="fl"><i class="fab fa-instagram" style="color:#e1306c"></i> رابط حساب إنستقرام</label>
              <input class="fc" id="siteIgUrl" value="${c.site?.instagramUrl||''}" placeholder="https://instagram.com/afra_iq">
            </div>
          </div>
          <div class="fr">
            <div class="fg">
              <label class="fl"><i class="fab fa-tiktok"></i> رابط حساب تيك توك</label>
              <input class="fc" id="siteTtUrl" value="${c.site?.tiktokUrl||''}" placeholder="https://tiktok.com/@afra_iq">
            </div>
            <div class="fg">
              <label class="fl"><i class="fab fa-telegram-plane" style="color:#0088cc"></i> رابط قناة / مجموعة تلغرام</label>
              <input class="fc" id="siteTgUrl" value="${c.site?.telegramUrl||''}" placeholder="https://t.me/afra_iq">
            </div>
          </div>
          <div class="fg">
            <label class="fl"><i class="fab fa-whatsapp" style="color:#25d366"></i> رقم واتساب (بدون صفر أمامي)</label>
            <input type="tel" class="fc" id="siteWaNum" value="${c.site?.whatsappNum||''}" placeholder="7XXXXXXXXX">
            <div class="fh">مثال: 7701234567 — سيُحوَّل تلقائياً إلى رابط wa.me/9647701234567</div>
          </div>
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
  ['Social','Services','General','Siteinfo'].forEach(t => {
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
    const data = await _tgSend(bot, chat, '✅ <b>عفراء للتوظيف</b> — اختبار إشعار الأدمن ناجح!');
    if (data.ok) notify('تم ✅', 'وصل الإشعار للأدمن على Telegram', 'success');
    else notify('خطأ', data.description || 'فشل الاختبار', 'error');
  } catch(e) { notify('خطأ', 'تعذّر الاتصال بـ Telegram', 'error'); }
}

async function testTelegramChannel() {
  const bot     = document.getElementById('tgBot')?.value.trim();
  const channel = document.getElementById('tgChannel')?.value.trim();
  if (!bot || !channel) { notify('تنبيه', 'أدخل Bot Token و Channel ID أولاً', 'warning'); return; }
  try {
    const data = await _tgSend(bot, channel, '📢 <b>عفراء للتوظيف</b>\n\nاختبار نشر وظيفة على القناة ✅\nسيظهر هنا إعلان الوظيفة تلقائياً عند نشرها.');
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
      body: JSON.stringify({ message: '📢 عفراء للتوظيف — اختبار نشر تلقائي ✅', access_token: token })
    });
    const data = await res.json();
    if (data.id) notify('تم ✅', 'نُشر المنشور التجريبي على صفحة Facebook', 'success');
    else notify('خطأ', data.error?.message || 'فشل النشر — تحقق من الصلاحيات', 'error');
  } catch(e) { notify('خطأ', 'تعذّر الاتصال بـ Facebook API', 'error'); }
}

function _gv(id) { return document.getElementById(id)?.value.trim() || ''; }
function _gc(id) { return document.getElementById(id)?.checked || false; }

// ── رفع صورة المؤسسة إلى ImgBB ──
async function uploadFounderPhoto() {
  const key = _gv('imgbbKey') || CFG.imgbb?.key;
  if (!key) {
    notify('مطلوب', 'انتقل لتبويب "الخدمات" وأدخل ImgBB API Key أولاً', 'warning');
    return;
  }
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    const btn = document.getElementById('founderUploadBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> جارٍ الرفع...'; }
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res  = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        const url = data.data.url;
        const urlInp = document.getElementById('founderPhotoURL');
        if (urlInp) urlInp.value = url;
        const preview = document.getElementById('founderPhotoPreview');
        if (preview) preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" alt="صورة المؤسسة">`;
        notify('تم الرفع ✅', 'تم رفع الصورة — اضغط "حفظ جميع الإعدادات" لتطبيق التغيير', 'success');
      } else {
        notify('خطأ', data.error?.message || 'فشل الرفع — تحقق من API Key', 'error');
      }
    } catch(e) {
      notify('خطأ', 'تعذّر الاتصال بـ ImgBB', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-upload"></i> رفع صورة جديدة'; }
    }
  };
  inp.click();
}

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
    site: {
      email:          _gv('siteEmail')   || 'afrahub.iq@gmail.com',
      phone:          _gv('sitePhone'),
      address:        _gv('siteAddress') || 'بغداد، العراق',
      facebookUrl:    _gv('siteFbUrl'),
      instagramUrl:   _gv('siteIgUrl'),
      tiktokUrl:      _gv('siteTtUrl'),
      telegramUrl:    _gv('siteTgUrl'),
      whatsappNum:    _gv('siteWaNum'),
      founderPhotoURL:_gv('founderPhotoURL'),
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

// ══════════════════════════════════════════════════════════
// استيراد وظائف من السوشل ميديا بالذكاء الاصطناعي
// ══════════════════════════════════════════════════════════
function pgAdminImport(el) {
  el.innerHTML = `
    <div class="sh fade-up">
      <div class="st">
        <div class="st-ico" style="background:linear-gradient(135deg,#7c3aed,#a78bfa)">
          <i class="fas fa-cloud-download-alt"></i>
        </div>
        استيراد وظائف بالذكاء الاصطناعي
      </div>
    </div>

    <div class="tabs fade-up" style="margin-bottom:18px">
      <button class="tb2 on" onclick="swImportTab('manual',this)"><i class="fas fa-paste"></i>استيراد يدوي</button>
      <button class="tb2"    onclick="swImportTab('telegram',this)"><i class="fab fa-telegram"></i>بوت تلغرام</button>
    </div>

    <!-- ══ الاستيراد اليدوي ══ -->
    <div id="importTabManual">
      <div class="card cp fade-up" style="margin-bottom:16px">
        <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:10px">
          <i class="fas fa-paste" style="color:#7c3aed;margin-left:6px"></i>
          الصق نص الإعلان من أي مصدر (فيسبوك، واتساب، تلغرام...)
        </div>
        <textarea id="importText" class="fc" rows="7"
          placeholder="الصق نص إعلان الوظيفة هنا...&#10;&#10;مثال:&#10;مطلوب محاسب لشركة تجارية في بغداد&#10;الراتب: 500,000 دينار&#10;الخبرة: 3 سنوات&#10;للتواصل: 07701234567"
          style="font-size:13px;line-height:1.8;resize:vertical;min-height:140px"></textarea>
        <div style="display:flex;gap:8px;margin-top:12px;align-items:center">
          <button class="btn bfu" id="parseBtn"
            onclick="aiParseJob()"
            style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;border:none;font-weight:800">
            <i class="fas fa-magic"></i> تحليل بالذكاء الاصطناعي
          </button>
          <button class="btn bda bsm" onclick="document.getElementById('importText').value=''">
            <i class="fas fa-eraser"></i> مسح
          </button>
          <span id="parseStatus" style="font-size:12px;color:var(--tx3)"></span>
        </div>
      </div>

      <!-- نموذج النتيجة (مخفي حتى بعد التحليل) -->
      <div id="importResult" style="display:none">
        <div class="card cp fade-up" style="margin-bottom:16px;border:2px solid rgba(124,58,237,.3)">
          <div style="font-size:13px;font-weight:800;color:#7c3aed;margin-bottom:14px">
            <i class="fas fa-check-circle"></i> تم التحليل — راجع البيانات وعدّل إذا لزم
          </div>

          <div class="fr" style="margin-bottom:10px">
            <div class="fg">
              <label class="fl">المسمى الوظيفي *</label>
              <input class="fc" id="imp_title" placeholder="مثال: محاسب أول">
            </div>
            <div class="fg">
              <label class="fl">الشركة / الجهة</label>
              <input class="fc" id="imp_company" placeholder="اسم الشركة">
            </div>
          </div>

          <div class="fr" style="margin-bottom:10px">
            <div class="fg">
              <label class="fl">المحافظة</label>
              <select class="fc" id="imp_province">
                <option value="">— اختر —</option>
                ${PROVS.map(p => `<option value="${p}">${p}</option>`).join('')}
              </select>
            </div>
            <div class="fg">
              <label class="fl">نوع الدوام</label>
              <select class="fc" id="imp_type">
                <option value="full">دوام كامل</option>
                <option value="part">دوام جزئي</option>
                <option value="remote">عن بُعد</option>
                <option value="gig">مهمة</option>
              </select>
            </div>
            <div class="fg">
              <label class="fl">التصنيف</label>
              <select class="fc" id="imp_cat">
                <option value="other">أخرى</option>
                <option value="tech">تقنية</option>
                <option value="business">أعمال</option>
                <option value="medical">طب</option>
                <option value="education">تعليم</option>
                <option value="engineering">هندسة</option>
                <option value="trade">تجارة</option>
                <option value="legal">قانون</option>
                <option value="media">إعلام</option>
                <option value="admin">إداري</option>
              </select>
            </div>
          </div>

          <div class="fr" style="margin-bottom:10px">
            <div class="fg">
              <label class="fl">الراتب (أدنى)</label>
              <input class="fc" id="imp_salary" type="number" placeholder="500000">
            </div>
            <div class="fg">
              <label class="fl">الراتب (أعلى)</label>
              <input class="fc" id="imp_salaryMax" type="number" placeholder="800000">
            </div>
            <div class="fg">
              <label class="fl">العملة</label>
              <select class="fc" id="imp_currency">
                <option value="IQD">دينار عراقي</option>
                <option value="USD">دولار</option>
              </select>
            </div>
          </div>

          <div class="fr" style="margin-bottom:10px">
            <div class="fg">
              <label class="fl">الخبرة</label>
              <select class="fc" id="imp_exp">
                <option value="none">بدون خبرة</option>
                <option value="1-2">1-2 سنة</option>
                <option value="3-5">3-5 سنوات</option>
                <option value="5+">أكثر من 5</option>
              </select>
            </div>
            <div class="fg">
              <label class="fl">الجنس</label>
              <select class="fc" id="imp_gender">
                <option value="any">الجميع</option>
                <option value="male">ذكر</option>
                <option value="female">أنثى</option>
              </select>
            </div>
            <div class="fg">
              <label class="fl">رقم الهاتف</label>
              <input class="fc" id="imp_phone" placeholder="07701234567">
            </div>
          </div>

          <div class="fg" style="margin-bottom:10px">
            <label class="fl">وصف الوظيفة</label>
            <textarea class="fc" id="imp_desc" rows="4" style="resize:vertical"></textarea>
          </div>

          <div class="fr" style="margin-bottom:10px">
            <div class="fg">
              <label class="fl">المتطلبات (افصل بفاصلة)</label>
              <input class="fc" id="imp_reqs" placeholder="خبرة محاسبة, معرفة Excel">
            </div>
            <div class="fg">
              <label class="fl">المزايا (افصل بفاصلة)</label>
              <input class="fc" id="imp_bens" placeholder="راتب ثابت, بدل نقل">
            </div>
          </div>

          <div style="display:flex;gap:10px;margin-top:16px">
            <button class="btn bfu" id="publishImportBtn" onclick="publishImportedJob()"
              style="background:linear-gradient(135deg,var(--p),var(--pl));color:#fff;border:none;font-weight:800;flex:1">
              <i class="fas fa-paper-plane"></i> نشر الوظيفة
            </button>
            <button class="btn bda bsm" onclick="document.getElementById('importResult').style.display='none'">
              إلغاء
            </button>
          </div>
        </div>
      </div>

      <!-- سجل الاستيراد -->
      <div id="importHistory" class="fade-up"></div>
    </div>

    <!-- ══ بوت تلغرام ══ -->
    <div id="importTabTelegram" style="display:none">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div style="font-size:12px;color:var(--tx3)">الوظائف التي حللها البوت وتنتظر موافقتك — وافق عليها لتظهر في المنصة</div>
        <button class="btn bg bsm" onclick="loadTelegramQueue()"><i class="fas fa-sync"></i>تحديث</button>
      </div>
      <div id="tgQueueList">
        <div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ التحميل...</div></div>
      </div>
    </div>
  `;

  _loadImportHistory();
}

function swImportTab(tab, btn) {
  document.querySelectorAll('.tb2').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('importTabManual').style.display   = tab === 'manual'   ? '' : 'none';
  document.getElementById('importTabTelegram').style.display = tab === 'telegram' ? '' : 'none';
  if (tab === 'telegram') loadTelegramQueue();
}

async function loadTelegramQueue() {
  const el = document.getElementById('tgQueueList');
  if (!el) return;
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ التحميل...</div></div>`;

  if (DEMO || !window.db) {
    el.innerHTML = emptyState('🤖', 'لا توجد وظائف معلقة', 'وظائف البوت ستظهر هنا بعد تحليلها');
    return;
  }

  try {
    const snap = await window.db.collection('telegram_queue').orderBy('postedAt', 'desc').get();
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!list.length) {
      el.innerHTML = emptyState('🤖', 'لا توجد وظائف معلقة', 'عندما يحلل البوت وظيفة ستظهر هنا للمراجعة');
      return;
    }

    el.innerHTML = list.map(j => _tgQueueCard(j)).join('');
  } catch (e) {
    el.innerHTML = `<div class="al al-e"><i class="fas fa-exclamation-circle"></i> فشل التحميل: ${e.message}</div>`;
  }
}

function _tgQueueCard(j) {
  const TYPE_AR = { full:'دوام كامل', part:'دوام جزئي', remote:'عن بُعد', gig:'مهمة' };
  const sal = j.salary ? `${Number(j.salary).toLocaleString()} ${j.currency || 'IQD'}` : 'قابل للتفاوض';
  const init = (j.company || j.title || 'و').charAt(0);

  return `<div class="card" style="margin-bottom:12px;border-right:4px solid #229ed9" id="tgcard_${j.id}">
    <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#229ed9,#0088cc);color:#fff;font-size:18px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${init}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:900;color:var(--tx);margin-bottom:4px">${san(j.title || '—')}</div>
        <div style="font-size:11px;color:var(--tx3);display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
          ${j.company  ? `<span><i class="fas fa-building" style="color:var(--p)"></i> ${san(j.company)}</span>`  : ''}
          ${j.province ? `<span><i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> ${san(j.province)}</span>` : ''}
          <span><i class="fas fa-briefcase" style="color:var(--acc)"></i> ${TYPE_AR[j.type] || j.type || '—'}</span>
          <span><i class="fas fa-money-bill-wave" style="color:var(--success)"></i> ${sal}</span>
          ${j.phone ? `<span><i class="fas fa-phone"></i> ${san(j.phone)}</span>` : ''}
        </div>
        ${j.desc ? `<div style="font-size:11px;color:var(--tx2);line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${san(j.desc)}</div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0;flex-direction:column">
        <button class="btn bsm bfu" style="background:#22c55e;color:#fff;border:none"
          id="tgpub_${j.id}" onclick="approveTgJob('${j.id}')">
          <i class="fas fa-check"></i> نشر
        </button>
        <button class="btn bda bsm" onclick="rejectTgJob('${j.id}','${san(j.title||'')}')">
          <i class="fas fa-times"></i> رفض
        </button>
      </div>
    </div>
  </div>`;
}

async function approveTgJob(docId) {
  if (DEMO || !window.db) return;
  loading(`tgpub_${docId}`, true);
  try {
    const snap = await window.db.collection('telegram_queue').doc(docId).get();
    if (!snap.exists) { notify('خطأ', 'الوظيفة غير موجودة', 'error'); return; }

    const data = snap.data();
    delete data.status;
    await window.db.collection('jobs').add({
      ...data,
      status:      'active',
      postedAt:    firebase.firestore.FieldValue.serverTimestamp(),
      applicants:  0,
      source:      'telegram',
    });
    await window.db.collection('telegram_queue').doc(docId).delete();

    document.getElementById(`tgcard_${docId}`)?.remove();
    notify('تم ✅', 'نُشرت الوظيفة في المنصة', 'success');

    const el = document.getElementById('tgQueueList');
    if (el && !el.querySelector('[id^=tgcard_]')) {
      el.innerHTML = emptyState('🤖', 'لا توجد وظائف معلقة', 'تم مراجعة جميع الوظائف');
    }
  } catch (e) {
    notify('خطأ', 'فشل النشر: ' + e.message, 'error');
  } finally {
    loading(`tgpub_${docId}`, false);
  }
}

async function rejectTgJob(docId, name) {
  confirm2('رفض الوظيفة', `حذف وظيفة "${name}" نهائياً؟`, async () => {
    if (DEMO || !window.db) return;
    try {
      await window.db.collection('telegram_queue').doc(docId).delete();
      document.getElementById(`tgcard_${docId}`)?.remove();
      notify('تم', 'تم رفض الوظيفة', 'success');

      const el = document.getElementById('tgQueueList');
      if (el && !el.querySelector('[id^=tgcard_]')) {
        el.innerHTML = emptyState('🤖', 'لا توجد وظائف معلقة', 'تم مراجعة جميع الوظائف');
      }
    } catch (e) { notify('خطأ', 'فشل الحذف: ' + e.message, 'error'); }
  });
}

async function aiParseJob() {
  const text = document.getElementById('importText')?.value?.trim();
  if (!text) { notify('نبّه', 'الصق نص الإعلان أولاً', 'warning'); return; }

  const btn    = document.getElementById('parseBtn');
  const status = document.getElementById('parseStatus');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> جارٍ التحليل...';
  status.textContent = '';

  try {
    const res  = await fetch('https://api.afra-iq.com/parse-job', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok || !data.job) throw new Error(data.error || 'فشل التحليل');

    const j = data.job;
    _fillImportForm(j);
    document.getElementById('importResult').style.display = '';
    document.getElementById('importResult').scrollIntoView({ behavior: 'smooth', block: 'start' });
    status.textContent = '✅ تم التحليل';
  } catch (e) {
    notify('خطأ', 'فشل تحليل النص: ' + e.message, 'error');
    status.textContent = '❌ ' + e.message;
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magic"></i> تحليل بالذكاء الاصطناعي';
  }
}

function _fillImportForm(j) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
  set('imp_title',     j.title     || '');
  set('imp_company',   j.company   || '');
  set('imp_province',  j.province  || '');
  set('imp_type',      j.type      || 'full');
  set('imp_cat',       j.cat       || 'other');
  set('imp_salary',    j.salary    || '');
  set('imp_salaryMax', j.salaryMax || '');
  set('imp_currency',  j.currency  || 'IQD');
  set('imp_exp',       j.exp       || 'none');
  set('imp_gender',    j.gender    || 'any');
  set('imp_phone',     j.phone     || '');
  set('imp_desc',      j.desc      || '');
  set('imp_reqs',      Array.isArray(j.reqs) ? j.reqs.join('، ') : (j.reqs || ''));
  set('imp_bens',      Array.isArray(j.bens) ? j.bens.join('، ') : (j.bens || ''));
}

async function publishImportedJob() {
  const title = document.getElementById('imp_title')?.value?.trim();
  if (!title) { notify('مطلوب', 'أدخل المسمى الوظيفي', 'warning'); return; }

  const company = document.getElementById('imp_company')?.value?.trim() || 'جهة التوظيف';
  const reqsRaw = document.getElementById('imp_reqs')?.value || '';
  const bensRaw = document.getElementById('imp_bens')?.value || '';

  const job = {
    title,
    company,
    province:  document.getElementById('imp_province')?.value  || '',
    type:      document.getElementById('imp_type')?.value      || 'full',
    cat:       document.getElementById('imp_cat')?.value       || 'other',
    salary:    Number(document.getElementById('imp_salary')?.value)    || null,
    salaryMax: Number(document.getElementById('imp_salaryMax')?.value) || null,
    currency:  document.getElementById('imp_currency')?.value  || 'IQD',
    exp:       document.getElementById('imp_exp')?.value       || 'none',
    gender:    document.getElementById('imp_gender')?.value    || 'any',
    phone:     document.getElementById('imp_phone')?.value?.trim() || null,
    desc:      document.getElementById('imp_desc')?.value?.trim()  || '',
    reqs:      reqsRaw.split(/[,،]/).map(s => s.trim()).filter(Boolean),
    bens:      bensRaw.split(/[,،]/).map(s => s.trim()).filter(Boolean),
    logo:      company.charAt(0),
    status:    'active',
    applicants: 0,
    postedBy:   U?.uid || 'admin',
    postedByType: 'admin',
    source:    'import',
    adminPinned: false,
    socialInsurance: false,
    laborLawAgreed: true,
    contractType: 'permanent',
    skills: [],
  };

  loading('publishImportBtn', true);
  try {
    if (!DEMO && window.db) {
      const ref = await window.db.collection('jobs').add({
        ...job,
        postedAt:  firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
      job.id = ref.id;
      JOBS.unshift(job);
    }
    notify('تم النشر ✅', `تم نشر "${title}" بنجاح`, 'success');
    document.getElementById('importResult').style.display = 'none';
    document.getElementById('importText').value = '';
    _saveImportHistory({ title, company, province: job.province, id: job.id });
    _loadImportHistory();
    if (typeof autoPostJob === 'function') autoPostJob(job);
  } catch (e) {
    notify('خطأ', 'فشل النشر: ' + e.message, 'error');
  } finally {
    loading('publishImportBtn', false);
  }
}

function _saveImportHistory(item) {
  try {
    const hist = JSON.parse(localStorage.getItem('importHistory') || '[]');
    hist.unshift({ ...item, at: Date.now() });
    localStorage.setItem('importHistory', JSON.stringify(hist.slice(0, 20)));
  } catch (_) {}
}

function _loadImportHistory() {
  const el = document.getElementById('importHistory');
  if (!el) return;
  try {
    const hist = JSON.parse(localStorage.getItem('importHistory') || '[]');
    if (!hist.length) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <div class="sh" style="margin-top:8px">
        <div class="st" style="font-size:13px"><i class="fas fa-history" style="margin-left:6px;color:var(--tx3)"></i>آخر الوظائف المستوردة</div>
        <button class="btn bda bsm" onclick="localStorage.removeItem('importHistory');_loadImportHistory()">مسح السجل</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${hist.map(h => `
          <div class="card cp" style="display:flex;align-items:center;gap:10px;padding:10px 14px">
            <div class="av" style="background:linear-gradient(135deg,#7c3aed,#a78bfa);color:#fff;font-size:14px;font-weight:900;width:36px;height:36px;border-radius:10px;flex-shrink:0">${(h.company||'؟').charAt(0)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:800;color:var(--tx)">${san(h.title)}</div>
              <div style="font-size:11px;color:var(--tx3)">${san(h.company||'')}${h.province?' — '+san(h.province):''} · ${new Date(h.at).toLocaleDateString('ar-IQ')}</div>
            </div>
            ${h.id ? `<button class="btn bsm" style="font-size:11px" onclick="openJob('${h.id}')"><i class="fas fa-eye"></i></button>` : ''}
          </div>
        `).join('')}
      </div>`;
  } catch (_) { el.innerHTML = ''; }
}

async function deleteAllJobs() {
  if (!JOBS.length) { notify('لا يوجد', 'لا توجد وظائف لحذفها', 'info'); return; }
  confirm2(
    'حذف جميع الوظائف',
    `سيتم حذف ${JOBS.length} وظيفة نهائياً من قاعدة البيانات.\n\nهذه العملية لا يمكن التراجع عنها!`,
    async () => {
      loading('deleteAllJobsBtn', true);
      let deleted = 0, failed = 0;
      for (const j of [...JOBS]) {
        try {
          if (!DEMO && window.db) await window.db.collection('jobs').doc(j.id).delete();
          const idx = JOBS.findIndex(x => x.id === j.id);
          if (idx !== -1) JOBS.splice(idx, 1);
          deleted++;
        } catch (e) {
          console.warn('deleteAllJobs failed:', j.id, e.message);
          failed++;
        }
      }
      loading('deleteAllJobsBtn', false);
      notify(
        deleted ? 'تم الحذف ✅' : 'تنبيه',
        `حُذفت ${deleted} وظيفة${failed ? ` — فشل حذف ${failed}` : ''}`,
        deleted ? 'success' : 'warning'
      );
      pgAdminJobs(document.getElementById('pcon'));
    }
  );
}

// ════════════════════════════════════════════
// كتالوج الباحثين
// ════════════════════════════════════════════
let _catFilter = { q: '', province: '' , available: false };

async function pgSeekersCatalog(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ تحميل الباحثين...</div></div>`;

  let seekers = [];
  if (!DEMO && window.db) {
    try {
      let q = window.db.collection('users').where('role', '==', 'seeker');
      if (ROLE !== 'admin') q = q.where('cvPublished', '==', true);
      const snap = await q.limit(200).get();
      seekers = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          if (!!a.permissions?.featured !== !!b.permissions?.featured) return a.permissions?.featured ? -1 : 1;
          if (!!a.seekerAvailable !== !!b.seekerAvailable) return a.seekerAvailable ? -1 : 1;
          return 0;
        });
    } catch(e) { console.warn('pgSeekersCatalog:', e.message); }
  }

  window._catalogSeekers = seekers;
  _catFilter = { q: '', province: '', available: false };

  const provinces = [...new Set(seekers.map(s => s.province).filter(Boolean))].sort();
  const total     = seekers.length;
  const available = seekers.filter(s => s.seekerAvailable).length;
  const published = seekers.filter(s => s.cvPublished).length;
  const verified  = seekers.filter(s => s.verified).length;

  el.innerHTML = `
    <div class="sh fade-up">
      <div class="st"><div class="st-ico" style="background:linear-gradient(135deg,var(--p),var(--pl))"><i class="fas fa-address-card"></i></div>كتالوج الباحثين</div>
      <span class="b b-tl">${total} باحث</span>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:16px">
      ${[
        { l:'إجمالي',       v:total,     c:'var(--p)',       ico:'fa-users'       },
        { l:'متاح للعمل',   v:available, c:'var(--success)', ico:'fa-check-circle'},
        { l:'ملف منشور',    v:published, c:'var(--info)',     ico:'fa-eye'         },
        { l:'موثّق',        v:verified,  c:'var(--purple)',   ico:'fa-shield-alt'  },
      ].map(x => `
        <div class="card" style="text-align:center;padding:12px 8px">
          <div style="width:32px;height:32px;border-radius:9px;background:${x.c}18;color:${x.c};margin:0 auto 6px;font-size:14px;display:flex;align-items:center;justify-content:center">
            <i class="fas ${x.ico}"></i>
          </div>
          <div style="font-size:20px;font-weight:900;color:var(--tx)">${x.v}</div>
          <div style="font-size:10px;color:var(--tx3)">${x.l}</div>
        </div>`).join('')}
    </div>

    <div class="card" style="padding:12px 14px;margin-bottom:14px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:160px;position:relative">
          <i class="fas fa-search" style="position:absolute;right:11px;top:50%;transform:translateY(-50%);color:var(--tx3);font-size:12px;pointer-events:none"></i>
          <input type="search" class="fc" placeholder="ابحث بالاسم أو المسمى أو المهارة..." style="padding-right:34px"
            oninput="_catFilter.q=this.value;renderCatalog()">
        </div>
        <select class="fc" style="width:auto;min-width:130px" onchange="_catFilter.province=this.value;renderCatalog()">
          <option value="">جميع المحافظات</option>
          ${provinces.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:var(--tx2);cursor:pointer;white-space:nowrap">
          <input type="checkbox" onchange="_catFilter.available=this.checked;renderCatalog()"> متاحون فقط
        </label>
      </div>
    </div>

    <div id="catalogGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:12px"></div>`;

  renderCatalog();
}

function renderCatalog() {
  const all = window._catalogSeekers || [];
  const { q, province, available } = _catFilter;
  const qL = q.toLowerCase();
  const filtered = all.filter(s => {
    if (available && !s.seekerAvailable) return false;
    if (province  && s.province !== province) return false;
    if (qL && !`${s.name||''} ${s.jobTitle||''} ${s.bio||''} ${(s.skills||[]).join(' ')}`.toLowerCase().includes(qL)) return false;
    return true;
  });
  const el = document.getElementById('catalogGrid');
  if (!el) return;
  el.innerHTML = filtered.length
    ? filtered.map(s => seekerCatalogCard(s)).join('')
    : emptyState('🔍', 'لا توجد نتائج', 'جرّب تغيير كلمة البحث أو الفلتر');
}

function seekerCatalogCard(s) {
  const name       = s.name || 'باحث عن عمل';
  const isFeatured = s.permissions?.featured;
  return `<div class="card cp fade-up" style="${isFeatured ? 'border-color:rgba(245,158,11,.4);background:linear-gradient(135deg,var(--bgc),rgba(245,158,11,.03))' : ''}">
    ${isFeatured ? `<div style="font-size:10px;color:var(--acc);font-weight:800;margin-bottom:8px"><i class="fas fa-star"></i> باحث مميز</div>` : ''}
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:10px">
      ${s.photoURL
        ? `<img src="${s.photoURL}" class="av avl" style="object-fit:cover;flex-shrink:0">`
        : `<div class="av avl" style="background:var(--grad-p);color:#fff;font-size:16px;font-weight:900;flex-shrink:0">${name.charAt(0)}</div>`}
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:900;color:var(--tx);display:flex;align-items:center;gap:5px">
          ${san(name)}
          ${s.verified ? '<i class="fas fa-check-circle" style="color:var(--p);font-size:10px"></i>' : ''}
        </div>
        ${s.jobTitle ? `<div style="font-size:11px;color:var(--p);font-weight:700;margin-top:1px">${san(s.jobTitle)}</div>` : ''}
        <div style="font-size:11px;color:var(--tx3);margin-top:2px">
          ${s.province  ? `<i class="fas fa-map-marker-alt"></i> ${san(s.province)}` : ''}
          ${s.experience ? ` &nbsp;•&nbsp; ${san(s.experience)}` : ''}
        </div>
      </div>
      <span class="b ${s.seekerAvailable ? 'b-gr' : 'b-rd'}" style="font-size:9px;flex-shrink:0">
        <i class="fas fa-circle" style="font-size:7px"></i>${s.seekerAvailable ? 'متاح' : 'غير متاح'}
      </span>
    </div>
    ${s.bio ? `<div style="font-size:11px;color:var(--tx2);line-height:1.6;margin-bottom:9px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${san(s.bio)}</div>` : ''}
    ${s.skills?.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px">${s.skills.slice(0,5).map(sk=>`<span class="b skill-chip" style="font-size:9px">${san(sk)}</span>`).join('')}</div>` : ''}
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn bg bsm" onclick="viewSeekerProfile('${s.id}')">
        <i class="fas fa-eye"></i>عرض
      </button>
      ${ROLE === 'admin'
        ? `<button class="btn bp bsm" style="flex:1" onclick="adminUserPermissions('${s.id}','${san(name)}')">
             <i class="fas fa-shield-alt"></i>الصلاحيات
           </button>
           ${s.phone ? `<a href="tel:${san(s.phone)}" class="btn bo bsm"><i class="fas fa-phone"></i></a>` : ''}`
        : `<button class="btn bp bsm" style="flex:1" onclick="bookCandidate('${s.id}','${san(name)}','')">
             <i class="fas fa-lock"></i>حجز الملف
           </button>
           ${s.phone ? `<a href="tel:${san(s.phone)}" class="btn bo bsm"><i class="fas fa-phone"></i></a>` : ''}`}
    </div>
  </div>`;
}

// ════════════════════════════════════════════
// صلاحيات المستخدم — نافذة الأدمن
// ════════════════════════════════════════════
function adminUserPermissions(uid, name) {
  const allUsers = [...(window._adminUsers||[]), ...(window._catalogSeekers||[])];
  const u    = allUsers.find(x => x.id === uid) || {};
  const perms = u.permissions || {};

  const permsList = [
    { key:'canPostJobs',      label:'نشر الوظائف',           icon:'fa-briefcase',    desc:'يسمح بنشر إعلانات الوظائف'           },
    { key:'canBrowseSeekers', label:'تصفح كتالوج الباحثين',  icon:'fa-address-card', desc:'الوصول إلى قائمة الباحثين'           },
    { key:'featured',         label:'ملف مميز ⭐',            icon:'fa-star',         desc:'يظهر في صدارة الكتالوج بإطار ذهبي'   },
    { key:'unlimited',        label:'بدون قيود نشر',         icon:'fa-infinity',     desc:'يتجاوز حدود نشر الوظائف الشهرية'     },
    { key:'canExportData',    label:'تصدير البيانات',         icon:'fa-download',     desc:'تصدير بيانات المتقدمين والإحصائيات'  },
    { key:'vip',              label:'عضوية VIP',              icon:'fa-crown',        desc:'جميع المزايا الممتازة مفتوحة'         },
  ];

  const adminLevels = [
    { v:'',          l:'مستخدم عادي — لا صلاحيات إدارية'        },
    { v:'moderator', l:'مشرف — يوثّق ويفعّل الحسابات فقط'       },
    { v:'province',  l:'أدمن محافظة — يدير بيانات محافظته'      },
    { v:'super',     l:'أدمن رئيسي — صلاحيات كاملة'             },
  ];

  const body = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:12px;background:var(--bgc2);border-radius:10px">
      <div class="av" style="width:40px;height:40px;border-radius:50%;background:var(--grad-p);color:#fff;font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">${name.charAt(0)}</div>
      <div>
        <div style="font-weight:800;color:var(--tx)">${san(name)}</div>
        <div style="font-size:11px;color:var(--tx3)">${san(u.email||u.role||'')}</div>
      </div>
      <span class="b ${u.status==='inactive'?'b-rd':'b-gr'}" style="margin-right:auto;font-size:10px">${u.status==='inactive'?'موقوف':'نشط'}</span>
    </div>

    <div style="font-size:10px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">الصلاحيات المخصصة</div>
    <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:18px">
      ${permsList.map(p => `
        <label style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:var(--bgc2);border-radius:10px;cursor:pointer;border:2px solid ${perms[p.key]?'var(--p)':'transparent'};transition:.15s"
          onmouseenter="this.style.borderColor=this.querySelector('input').checked?'var(--p)':'var(--br)'"
          onmouseleave="this.style.borderColor=this.querySelector('input').checked?'var(--p)':'transparent'">
          <i class="fas ${p.icon}" style="width:17px;text-align:center;color:${perms[p.key]?'var(--p)':'var(--tx3)'}"></i>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700;color:var(--tx)">${p.label}</div>
            <div style="font-size:10px;color:var(--tx3)">${p.desc}</div>
          </div>
          <input type="checkbox" id="perm_${p.key}" ${perms[p.key]?'checked':''}
            style="width:16px;height:16px;accent-color:var(--p);flex-shrink:0"
            onchange="this.closest('label').style.borderColor=this.checked?'var(--p)':'transparent'">
        </label>`).join('')}
    </div>

    <div style="font-size:10px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">مستوى الإدارة</div>
    <select class="fc" id="adminLevelSelect" style="margin-bottom:18px">
      ${adminLevels.map(l => `<option value="${l.v}" ${(u.adminLevel||'')===l.v?'selected':''}>${l.l}</option>`).join('')}
    </select>

    <div class="mf" style="border:none;padding:0;margin-top:0">
      <button class="btn bo" onclick="cmo('_adminModal')">إلغاء</button>
      <button class="btn bp bfu" id="savePermsBtn" onclick="_doSavePermissions('${uid}','${san(name)}')">
        <i class="fas fa-save"></i>حفظ الصلاحيات
      </button>
    </div>`;

  _showAdminModal(`صلاحيات: ${san(name)}`, body);
}

async function _doSavePermissions(uid, name) {
  const permKeys = ['canPostJobs','canBrowseSeekers','featured','unlimited','canExportData','vip'];
  const permissions = {};
  permKeys.forEach(k => {
    const el = document.getElementById(`perm_${k}`);
    if (el) permissions[k] = el.checked;
  });
  const adminLevel = document.getElementById('adminLevelSelect')?.value || '';
  loading('savePermsBtn', true);
  try {
    if (!DEMO && window.db) {
      const upd = { permissions, adminLevel: adminLevel || null };
      await window.db.collection('users').doc(uid).update(upd);
    }
    const allUsers = [...(window._adminUsers||[]), ...(window._catalogSeekers||[])];
    const u = allUsers.find(x => x.id === uid);
    if (u) { u.permissions = permissions; u.adminLevel = adminLevel || null; }
    cmo('_adminModal');
    renderAdminUsersList();
    notify('تم الحفظ ✅', `تم تحديث صلاحيات "${name}"`, 'success');
  } catch(e) {
    notify('خطأ', 'فشل حفظ الصلاحيات: ' + e.message, 'error');
  } finally {
    loading('savePermsBtn', false);
  }
}

// ════════════════════════════════════════════
// ملف الباحث العام — مودال
// ════════════════════════════════════════════
async function viewSeekerProfile(uid) {
  let mo = document.getElementById('_seekerProfMo');
  if (!mo) {
    mo = document.createElement('div');
    mo.id = '_seekerProfMo';
    mo.className = 'mo';
    mo.innerHTML = `<div class="moc" style="max-width:520px;width:100%;padding:0;overflow:hidden;border-radius:18px">
      <div id="_seekerProfBody"></div>
    </div>`;
    mo.addEventListener('click', e => { if (e.target === mo) cmo('_seekerProfMo'); });
    document.body.appendChild(mo);
  }
  document.getElementById('_seekerProfBody').innerHTML =
    `<div style="padding:50px;text-align:center"><i class="fas fa-circle-notch spin" style="font-size:28px;color:var(--p)"></i></div>`;
  oMo('_seekerProfMo');

  const cache = [...(window._catalogSeekers||[]), ...(window._adminUsers||[])];
  let s = cache.find(x => x.id === uid);
  if (!s && !DEMO && window.db) {
    try { const d = await window.db.collection('users').doc(uid).get(); if (d.exists) s = { id: d.id, ...d.data() }; }
    catch(e) {}
  }
  if (!s) { cmo('_seekerProfMo'); return; }

  const name  = s.name || 'باحث عن عمل';
  const title = s.jobTitle || s.title || '';
  const SC    = ['b-tl','b-pu','b-bl','b-gr','b-am'];
  const TYPE_AR = { full:'دوام كامل', part:'دوام جزئي', remote:'عن بُعد', gig:'مهمة' };
  const details = [
    { ico:'fa-graduation-cap', c:'var(--purple)', l:'التعليم',      v: s.education },
    { ico:'fa-language',       c:'var(--info)',   l:'اللغات',       v: (s.languages||[]).join('، ') || null },
    { ico:'fa-briefcase',      c:'var(--p)',      l:'نوع الدوام',    v: TYPE_AR[s.preferredType] },
    { ico:'fa-money-bill-wave',c:'var(--success)',l:'الراتب المتوقع',v: s.expectedSalary ? Number(s.expectedSalary).toLocaleString('ar-IQ') + ' IQD' : null },
  ].filter(x => x.v);

  document.getElementById('_seekerProfBody').innerHTML = `
    <div class="prof-banner" style="border-radius:18px 18px 0 0;height:88px"></div>
    <div style="position:relative;padding:0 20px">
      <div style="position:absolute;top:-38px">
        ${s.photoURL
          ? `<img src="${s.photoURL}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:3px solid var(--bgc);box-shadow:var(--shxl)">`
          : `<div style="width:70px;height:70px;border-radius:50%;background:var(--grad-p);color:#fff;font-size:25px;font-weight:900;display:flex;align-items:center;justify-content:center;border:3px solid var(--bgc);box-shadow:var(--shxl)">${name.charAt(0)}</div>`}
      </div>
    </div>
    <div style="padding:42px 22px 20px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px">
        <div>
          <div style="font-size:18px;font-weight:900;color:var(--tx);display:flex;align-items:center;gap:6px">
            ${san(name)}
            ${s.verified ? '<i class="fas fa-check-circle" style="color:var(--p);font-size:13px"></i>' : ''}
            ${s.permissions?.featured ? '<i class="fas fa-star" style="color:var(--acc);font-size:12px"></i>' : ''}
          </div>
          ${title ? `<div style="font-size:12px;color:var(--p);font-weight:700;margin-top:2px">${san(title)}</div>` : ''}
          <div style="font-size:11px;color:var(--tx3);margin-top:4px;display:flex;gap:10px;flex-wrap:wrap">
            ${s.province   ? `<span><i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> ${san(s.province)}</span>` : ''}
            ${s.experience ? `<span><i class="fas fa-clock" style="color:var(--info)"></i> ${san(s.experience)}</span>` : ''}
            ${s.gender === 'male' ? '<span><i class="fas fa-mars" style="color:#3b82f6"></i> ذكر</span>' : s.gender === 'female' ? '<span><i class="fas fa-venus" style="color:#ec4899"></i> أنثى</span>' : ''}
          </div>
        </div>
        <span class="b ${s.seekerAvailable ? 'b-gr' : 'b-rd'}" style="flex-shrink:0">
          <i class="fas fa-circle" style="font-size:8px"></i>${s.seekerAvailable ? 'متاح للعمل' : 'غير متاح'}
        </span>
      </div>

      ${s.bio ? `<div style="padding:12px;background:var(--bgc2);border-radius:10px;font-size:12px;color:var(--tx2);line-height:1.7;margin-bottom:14px">${san(s.bio)}</div>` : ''}

      ${s.skills?.length ? `
        <div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:800;color:var(--tx3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:7px">المهارات</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">
            ${s.skills.map((sk,i) => `<span class="b ${SC[i%SC.length]}" style="font-size:11px">${san(sk)}</span>`).join('')}
          </div>
        </div>` : ''}

      ${details.length ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:16px">
          ${details.map(x => `
            <div style="background:var(--bgc2);border-radius:10px;padding:9px 12px">
              <div style="font-size:10px;color:var(--tx3);margin-bottom:3px"><i class="fas ${x.ico}" style="color:${x.c}"></i> ${x.l}</div>
              <div style="font-size:12px;font-weight:700;color:var(--tx)">${san(x.v)}</div>
            </div>`).join('')}
        </div>` : ''}

      <div style="display:flex;gap:7px;flex-wrap:wrap">
        ${ROLE === 'admin' && s.phone
          ? `<a href="tel:${san(s.phone)}" class="btn bp bsm" style="flex:1"><i class="fas fa-phone"></i> ${san(s.phone)}</a>`
          : `<button class="btn bp bsm" style="flex:1" onclick="cmo('_seekerProfMo');bookCandidate('${s.id}','${san(name)}','')">
               <i class="fas fa-lock"></i>حجز الملف
             </button>`}
        ${ROLE === 'admin'
          ? `<button class="btn bo bsm" onclick="cmo('_seekerProfMo');adminUserPermissions('${s.id}','${san(name)}')">
               <i class="fas fa-shield-alt"></i>الصلاحيات
             </button>` : ''}
        ${s.cvUrl
          ? `<a href="${s.cvUrl}" target="_blank" class="btn bg bsm"><i class="fas fa-file-pdf"></i>CV</a>` : ''}
        <button class="btn bg bsm" onclick="cmo('_seekerProfMo')"><i class="fas fa-times"></i></button>
      </div>
    </div>`;
}

// ════════════════════════════════════════════
// كتالوج الشركات وأصحاب العمل
// ════════════════════════════════════════════
let _compQ = '', _compProv = '', _compType = 'all';

async function pgEmployersCatalog(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ تحميل الشركات...</div></div>`;

  let companies = [];
  if (!DEMO && window.db) {
    try {
      const [empSnap, offSnap] = await Promise.all([
        window.db.collection('users').where('role','==','employer').where('status','==','active').limit(100).get(),
        window.db.collection('users').where('role','==','office').where('status','==','active').limit(100).get(),
      ]);
      companies = [
        ...empSnap.docs.map(d => ({ id: d.id, _type:'employer', ...d.data() })),
        ...offSnap.docs.map(d => ({ id: d.id, _type:'office',   ...d.data() })),
      ].sort((a,b) => (a.companyName||a.officeName||a.name||'').localeCompare(b.companyName||b.officeName||b.name||''));
    } catch(e) { console.warn('pgEmployersCatalog:', e.message); }
  }

  window._companiesList = companies;
  _compQ = ''; _compProv = ''; _compType = 'all';
  const provinces = [...new Set(companies.map(c => c.province).filter(Boolean))].sort();

  el.innerHTML = `
    <div class="sh fade-up">
      <div class="st"><div class="st-ico" style="background:linear-gradient(135deg,var(--acc),#d97706)"><i class="fas fa-building"></i></div>الشركات والمكاتب</div>
      <span class="b b-tl">${companies.length} جهة</span>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;margin-bottom:16px">
      ${[
        { l:'إجمالي',       v:companies.length,                              c:'var(--acc)',    ico:'fa-building'   },
        { l:'شركات',        v:companies.filter(c=>c._type==='employer').length, c:'var(--info)',   ico:'fa-briefcase'  },
        { l:'مكاتب توظيف', v:companies.filter(c=>c._type==='office').length,   c:'var(--purple)', ico:'fa-id-badge'   },
        { l:'موثّقة',       v:companies.filter(c=>c.verified).length,          c:'var(--success)',ico:'fa-check-circle'},
      ].map(x => `
        <div class="card" style="text-align:center;padding:12px 8px">
          <div style="width:32px;height:32px;border-radius:9px;background:${x.c}18;color:${x.c};margin:0 auto 6px;font-size:14px;display:flex;align-items:center;justify-content:center">
            <i class="fas ${x.ico}"></i>
          </div>
          <div style="font-size:20px;font-weight:900;color:var(--tx)">${x.v}</div>
          <div style="font-size:10px;color:var(--tx3)">${x.l}</div>
        </div>`).join('')}
    </div>

    <div class="card" style="padding:12px 14px;margin-bottom:14px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <div style="flex:1;min-width:160px;position:relative">
          <i class="fas fa-search" style="position:absolute;right:11px;top:50%;transform:translateY(-50%);color:var(--tx3);font-size:12px;pointer-events:none"></i>
          <input type="search" class="fc" placeholder="ابحث باسم الشركة أو المكتب..." style="padding-right:34px"
            oninput="_compQ=this.value;_renderCompanies()">
        </div>
        <select class="fc" style="width:auto;min-width:130px" onchange="_compProv=this.value;_renderCompanies()">
          <option value="">جميع المحافظات</option>
          ${provinces.map(p => `<option value="${p}">${p}</option>`).join('')}
        </select>
        <div style="display:flex;gap:4px">
          <button class="btn bsm" id="cbt_all" style="background:var(--p);color:#fff" onclick="_compType='all';_renderCompanies();_setCompBtn('all')">الكل</button>
          <button class="btn bg bsm" id="cbt_employer" onclick="_compType='employer';_renderCompanies();_setCompBtn('employer')">شركات</button>
          <button class="btn bg bsm" id="cbt_office"   onclick="_compType='office';_renderCompanies();_setCompBtn('office')">مكاتب</button>
        </div>
      </div>
    </div>

    <div id="companiesGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(255px,1fr));gap:12px"></div>`;

  _renderCompanies();
}

function _setCompBtn(active) {
  ['all','employer','office'].forEach(k => {
    const b = document.getElementById('cbt_' + k);
    if (!b) return;
    if (k === active) { b.style.background='var(--p)'; b.style.color='#fff'; }
    else              { b.style.background=''; b.style.color=''; b.className='btn bg bsm'; }
  });
}

function _renderCompanies() {
  const qL  = _compQ.toLowerCase();
  const list = (window._companiesList || []).filter(c => {
    const nm = (c.companyName||c.officeName||c.name||'').toLowerCase();
    if (_compType !== 'all' && c._type !== _compType) return false;
    if (_compProv && c.province !== _compProv) return false;
    if (qL && !nm.includes(qL) && !(c.province||'').includes(_compQ)) return false;
    return true;
  });
  const el = document.getElementById('companiesGrid');
  if (!el) return;
  el.innerHTML = list.length ? list.map(c => companyCard(c)).join('') : emptyState('🔍', 'لا توجد نتائج', '');
}

function companyCard(c) {
  const name     = c.companyName || c.officeName || c.name || 'جهة عمل';
  const isOffice = c._type === 'office';
  const color    = isOffice ? 'var(--purple)' : 'var(--acc)';
  const bg       = isOffice ? 'linear-gradient(135deg,var(--purple),#a78bfa)' : 'linear-gradient(135deg,var(--acc),#d97706)';
  const jobCount = JOBS.filter(j => j.postedBy === c.id).length;

  return `<div class="card cp fade-up">
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
      <div style="width:48px;height:48px;border-radius:12px;background:${bg};color:#fff;font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${name.charAt(0)}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:900;color:var(--tx);display:flex;align-items:center;gap:5px">
          ${san(name)}
          ${c.verified ? `<i class="fas fa-check-circle" style="color:var(--p);font-size:10px"></i>` : ''}
        </div>
        <span class="b" style="font-size:9px;background:${color}18;color:${color};border:1px solid ${color}30;margin-top:3px">
          <i class="fas ${isOffice ? 'fa-id-badge' : 'fa-briefcase'}"></i>${isOffice ? 'مكتب توظيف' : 'شركة'}
        </span>
        ${c.province ? `<div style="font-size:11px;color:var(--tx3);margin-top:4px"><i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> ${san(c.province)}</div>` : ''}
      </div>
    </div>

    ${c.bio||c.about ? `<div style="font-size:11px;color:var(--tx2);line-height:1.6;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${san(c.bio||c.about)}</div>` : ''}

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <div style="flex:1;background:var(--bgc2);border-radius:9px;padding:8px;text-align:center">
        <div style="font-size:18px;font-weight:900;color:${color}">${jobCount}</div>
        <div style="font-size:10px;color:var(--tx3)">وظيفة</div>
      </div>
      ${c.phone ? `<div style="flex:1;background:var(--bgc2);border-radius:9px;padding:8px;text-align:center">
        <div style="font-size:11px;font-weight:700;color:var(--tx);direction:ltr">${san(c.phone)}</div>
        <div style="font-size:10px;color:var(--tx3)">الهاتف</div>
      </div>` : ''}
    </div>

    <div style="display:flex;gap:7px">
      <button class="btn ${jobCount?'bp':'bg'} bsm bfu" style="flex:1" ${!jobCount?'disabled':''} onclick="viewCompanyJobs('${c.id}','${san(name)}')">
        <i class="fas fa-briefcase"></i>${jobCount ? 'وظائفه' : 'لا وظائف'}
      </button>
      ${c.phone ? `<a href="tel:${san(c.phone)}" class="btn bo bsm"><i class="fas fa-phone"></i></a>` : ''}
    </div>
  </div>`;
}

function viewCompanyJobs(companyId, companyName) {
  const jobs = JOBS.filter(j => j.postedBy === companyId);
  if (!jobs.length) { notify('تنبيه', 'لا توجد وظائف نشطة لهذه الجهة', 'info'); return; }
  let mo = document.getElementById('_compJobsMo');
  if (!mo) {
    mo = document.createElement('div');
    mo.id = '_compJobsMo';
    mo.className = 'mo';
    mo.innerHTML = `<div class="moc" style="max-width:540px;width:100%">
      <div class="mh"><div class="mt" id="_compJobsTitle"></div><button class="mcl" onclick="cmo('_compJobsMo')"><i class="fas fa-times"></i></button></div>
      <div id="_compJobsBody" class="mb"></div>
    </div>`;
    mo.addEventListener('click', e => { if (e.target === mo) cmo('_compJobsMo'); });
    document.body.appendChild(mo);
  }
  document.getElementById('_compJobsTitle').innerHTML = `<i class="fas fa-briefcase" style="color:var(--p)"></i> وظائف ${san(companyName)}`;
  document.getElementById('_compJobsBody').innerHTML = `<div class="jg">${jobs.map(j => jCard(j)).join('')}</div>`;
  oMo('_compJobsMo');
}
