// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — home.js                          ║
// ║  الرئيسية + صفحات الأدمن الأربع                    ║
// ╚══════════════════════════════════════════════════════╝

function selectCat(cat) { JF = { type:'', cat:cat, prov:'', q:'' }; JSORT = 'newest'; goTo('jobs'); }

// ════════════════════════════════════════════
// رئيسية الباحث
// ════════════════════════════════════════════
function pgSeekerHome(el) {
  const nm       = P?.name?.split(' ')[0] || 'مستخدم';
  const newJ     = JOBS.filter(j => (Date.now() - new Date(j.postedAt)) < 86400000 * 3).length;
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

  if (!DEMO && window.db) {
    try {
      const [usersSnap, appsSnap] = await Promise.all([
        window.db.collection('users').get(),
        window.db.collection('applications').get(),
      ]);
      totalUsers   = usersSnap.size;
      totalOffices = usersSnap.docs.filter(d => d.data().role === 'office').length;
      totalApps    = appsSnap.size;
      newThisWeek  = usersSnap.docs.filter(d => {
        const t = d.data().createdAt?.toMillis?.() || 0;
        return (Date.now() - t) < 86400000 * 7;
      }).length;
    } catch(e) { console.warn('Admin stats:', e); }
  } else {
    totalUsers = 124; totalOffices = 8; totalApps = 56; newThisWeek = 8;
  }

  const newJobs = JOBS.filter(j => (Date.now() - new Date(j.postedAt)) < 86400000 * 7).length;

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
        { ico:'fa-briefcase', l:'الوظائف',          c:'var(--p)',      a:"goTo('alljobs')" },
        { ico:'fa-building',  l:'مكاتب التوظيف',    c:'var(--purple)', a:"goTo('alloffices')" },
        { ico:'fa-users',     l:'المستخدمون',         c:'var(--acc)',    a:"goTo('allusers')" },
        { ico:'fa-cog',       l:'الإعدادات',          c:'var(--info)',   a:"goTo('settings')" },
      ].map(a => '<div class="cat-item" onclick="' + a.a + '"><div class="cat-ico" style="color:' + a.c + ';background:' + a.c + '18"><i class="fas ' + a.ico + '"></i></div><div class="cat-label">' + a.l + '</div></div>').join('')}
    </div>
    <div class="sh fade-up del3"><div class="st"><div class="st-ico"><i class="fas fa-briefcase"></i></div>أحدث الوظائف</div></div>
    <div class="jg fade-up del3">${JOBS.slice(0,3).map(j=>jCard(j)).join('')}</div>`;
}

// ════════════════════════════════════════════
// صفحة الوظائف — أدمن
// ════════════════════════════════════════════
function pgAdminJobs(el) {
  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-briefcase"></i></div>إدارة الوظائف</div>
      <span class="b b-tl">${JOBS.length} وظيفة</span>
    </div>
    <div class="jg">${JOBS.map(j => jCard(j)).join('')}</div>`;
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
  } else {
    offices = [
      { id:'off1', name:'مكتب الأمل للتوظيف',   officeName:'مكتب الأمل',   province:'بغداد',  email:'amal@office.iq',  phone:'07701234567', status:'active',  createdAt:null },
      { id:'off2', name:'أحمد الراشدي',           officeName:'مكتب الراشدي', province:'كربلاء', email:'rashdi@off.iq',   phone:'07712345678', status:'active',  createdAt:null },
      { id:'off3', name:'مكتب الصحة المهنية',    officeName:'الصحة المهنية', province:'البصرة', email:'seha@off.iq',     phone:'07723456789', status:'active',  createdAt:null },
      { id:'off4', name:'التعليم المتقدم',         officeName:'التعليم المتقدم',province:'أربيل', email:'edu@off.iq',      phone:'07734567890', status:'inactive',createdAt:null },
    ];
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
  } else {
    users = [
      { id:'u1', name:'أحمد محمد علي',    email:'ahmed@test.iq',  role:'seeker', province:'بغداد',  phone:'07701234567', status:'active',   createdAt:null },
      { id:'u2', name:'سارة الزيدي',      email:'sara@test.iq',   role:'seeker', province:'كربلاء', phone:'07712345678', status:'active',   createdAt:null },
      { id:'u3', name:'مكتب الأمل',       email:'amal@office.iq', role:'office', province:'بغداد',  phone:'07723456789', status:'active',   createdAt:null },
      { id:'u4', name:'مدير النظام',      email:'admin@fanoos.iq',role:'admin',  province:'كربلاء', phone:'07700000000', status:'active',   createdAt:null },
      { id:'u5', name:'علي الموسوي',      email:'ali@test.iq',    role:'seeker', province:'النجف',  phone:'07734567890', status:'inactive', createdAt:null },
    ];
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
      <span class="b b-tl">${total} مستخدم</span>
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

  const roleLabel = { seeker:'باحث', office:'مكتب', admin:'أدمن' };
  const roleClass = { seeker:'b-tl', office:'b-pu', admin:'b-am' };

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
      <td style="padding:10px 12px"><span class="b ${roleClass[role]||'b-tl'}"><i class="fas ${role==='admin'?'fa-shield-alt':role==='office'?'fa-building':'fa-user'}"></i>${roleLabel[role]||'باحث'}</span></td>
      <td style="padding:10px 12px;color:var(--tx2)">${san(u.province||'—')}</td>
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

// ════════════════════════════════════════════
// صفحة الإعدادات — أدمن (مع حفظ في Firestore)
// ════════════════════════════════════════════
async function pgAdminSettings(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ تحميل الإعدادات...</div></div>`;

  // حاول تحميل الإعدادات من Firestore
  if (!DEMO && window.db) {
    try {
      const doc = await window.db.collection('config').doc('settings').get();
      if (doc.exists) {
        const s = doc.data();
        if (s.telegram) CFG.telegram = { ...CFG.telegram, ...s.telegram };
        if (s.emailjs)  CFG.emailjs  = { ...CFG.emailjs,  ...s.emailjs };
        if (s.imgbb)    CFG.imgbb    = { ...CFG.imgbb,    ...s.imgbb };
      }
    } catch(e) { console.warn('Settings load:', e); }
  }

  el.innerHTML = `
    <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-cog"></i></div>إعدادات النظام</div></div>

    <!-- Telegram -->
    <div class="card" style="margin-bottom:14px">
      <div class="ch"><div class="cht"><i class="fas fa-paper-plane" style="color:#0088cc"></i> إعدادات Telegram</div></div>
      <div class="cp">
        <div class="fr">
          <div class="fg">
            <label class="fl">رمز البوت (Bot Token)</label>
            <input type="text" class="fc" id="tgBot" value="${CFG.telegram.bot.startsWith('YOUR')?'':CFG.telegram.bot}" placeholder="123456:ABC-DEF...">
          </div>
          <div class="fg">
            <label class="fl">Chat ID</label>
            <input type="text" class="fc" id="tgChat" value="${CFG.telegram.chat.startsWith('YOUR')?'':CFG.telegram.chat}" placeholder="-100123456789">
          </div>
        </div>
        <button class="btn bg bsm" onclick="testTelegram()"><i class="fas fa-paper-plane"></i>اختبار الإرسال</button>
      </div>
    </div>

    <!-- EmailJS -->
    <div class="card" style="margin-bottom:14px">
      <div class="ch"><div class="cht"><i class="fas fa-envelope" style="color:var(--acc)"></i> إعدادات EmailJS</div></div>
      <div class="cp">
        <div class="fr">
          <div class="fg">
            <label class="fl">Public Key</label>
            <input type="text" class="fc" id="ejPub" value="${CFG.emailjs.pub.startsWith('YOUR')?'':CFG.emailjs.pub}" placeholder="user_xxxxx">
          </div>
          <div class="fg">
            <label class="fl">Service ID</label>
            <input type="text" class="fc" id="ejSvc" value="${CFG.emailjs.svc.startsWith('YOUR')?'':CFG.emailjs.svc}" placeholder="service_xxxxx">
          </div>
        </div>
        <div class="fg">
          <label class="fl">Template ID</label>
          <input type="text" class="fc" id="ejTpl" value="${CFG.emailjs.tpl.startsWith('YOUR')?'':CFG.emailjs.tpl}" placeholder="template_xxxxx">
        </div>
        <div class="fg">
          <label class="fl">إيميل المدير</label>
          <input type="email" class="fc" id="ejAdmin" value="${CFG.emailjs.admin.startsWith('YOUR')?'':CFG.emailjs.admin}" placeholder="admin@example.com">
        </div>
      </div>
    </div>

    <!-- ImgBB -->
    <div class="card" style="margin-bottom:14px">
      <div class="ch"><div class="cht"><i class="fas fa-image" style="color:var(--purple)"></i> رفع الصور (ImgBB)</div></div>
      <div class="cp">
        <div class="fg">
          <label class="fl">ImgBB API Key</label>
          <input type="text" class="fc" id="imgbbKey" value="${CFG.imgbb.key.startsWith('YOUR')?'':CFG.imgbb.key}" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
          <div class="fh">احصل على مفتاحك من <strong>imgbb.com</strong> → API</div>
        </div>
      </div>
    </div>

    <!-- إعدادات عامة -->
    <div class="card" style="margin-bottom:14px">
      <div class="ch"><div class="cht"><i class="fas fa-sliders-h" style="color:var(--info)"></i> إعدادات عامة</div></div>
      <div class="cp">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--br)">
          <div>
            <div style="font-size:13px;font-weight:700;color:var(--tx)">وضع الصيانة</div>
            <div style="font-size:11px;color:var(--tx3)">يمنع المستخدمين من الدخول مؤقتاً</div>
          </div>
          <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer">
            <input type="checkbox" id="maintMode" style="opacity:0;width:0;height:0">
            <span style="position:absolute;inset:0;background:var(--br);border-radius:24px;transition:.3s;cursor:pointer"
              onclick="this.previousElementSibling.checked=!this.previousElementSibling.checked;this.style.background=this.previousElementSibling.checked?'var(--p)':'var(--br)'"></span>
          </label>
        </div>
      </div>
    </div>

    <div style="display:flex;gap:10px">
      <button class="btn bp bfu" style="flex:1" id="saveSettingsBtn" onclick="adminSaveSettings()">
        <i class="fas fa-save"></i>حفظ جميع الإعدادات
      </button>
    </div>`;
}

async function testTelegram() {
  const bot  = document.getElementById('tgBot')?.value.trim();
  const chat = document.getElementById('tgChat')?.value.trim();
  if (!bot || !chat) { notify('تنبيه', 'أدخل Bot Token و Chat ID أولاً', 'warning'); return; }
  try {
    const res = await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id: chat, text: '✅ الفانوس للتوظيف — اختبار إشعار ناجح!' })
    });
    const data = await res.json();
    if (data.ok) notify('تم ✅', 'وصل الإشعار على Telegram', 'success');
    else notify('خطأ', data.description || 'فشل الاختبار', 'error');
  } catch(e) { notify('خطأ', 'تعذّر الاتصال بـ Telegram', 'error'); }
}

async function adminSaveSettings() {
  const settings = {
    telegram: {
      bot:  document.getElementById('tgBot')?.value.trim()   || CFG.telegram.bot,
      chat: document.getElementById('tgChat')?.value.trim()  || CFG.telegram.chat,
    },
    emailjs: {
      pub:   document.getElementById('ejPub')?.value.trim()   || CFG.emailjs.pub,
      svc:   document.getElementById('ejSvc')?.value.trim()   || CFG.emailjs.svc,
      tpl:   document.getElementById('ejTpl')?.value.trim()   || CFG.emailjs.tpl,
      admin: document.getElementById('ejAdmin')?.value.trim() || CFG.emailjs.admin,
    },
    imgbb: {
      key: document.getElementById('imgbbKey')?.value.trim() || CFG.imgbb.key,
    },
  };

  // تحديث CFG في الذاكرة
  CFG.telegram = settings.telegram;
  CFG.emailjs  = settings.emailjs;
  CFG.imgbb    = settings.imgbb;

  // حفظ في Firestore
  if (!DEMO && window.db) {
    loading('saveSettingsBtn', true);
    try {
      await window.db.collection('config').doc('settings').set(settings, { merge: true });
      notify('تم الحفظ ✅', 'تم تحديث الإعدادات وحفظها في قاعدة البيانات', 'success');
    } catch(e) {
      notify('خطأ', 'فشل الحفظ في قاعدة البيانات: ' + e.message, 'error');
    } finally { loading('saveSettingsBtn', false); }
  } else {
    notify('تم ✅', 'تم تحديث الإعدادات مؤقتاً (وضع تجريبي)', 'info');
  }
}
