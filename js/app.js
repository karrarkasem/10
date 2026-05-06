// ╔══════════════════════════════════════════════════════╗
// ║  عفراء للتوظيف — app.js                             ║
// ║  الحالة العامة + المساعدات + التنقل + الإعداد       ║
// ╚══════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════
// إعدادات المنصة (API Keys — تُحمَّل من Firestore)
// ═══════════════════════════════════════════════
const CFG = {
  telegram:  { bot: '', chat: '', channel: '', autoPost: false },
  emailjs:   { pub: '', svc: '', tpl: '', admin: '' },
  imgbb:     { key: '' },
  facebook:  { pageToken: '', pageId: '', autoPost: false },
  instagram: { token: '', accountId: '', autoPost: false },
  twitter:   { apiKey: '', apiSecret: '', accessToken: '', accessSecret: '', autoPost: false },
  linkedin:  { accessToken: '', orgId: '', autoPost: false },
  tiktok:    { accessToken: '', openId: '', autoPost: false },
  snapchat:  { accessToken: '', adAccountId: '', autoPost: false },
  youtube:   { apiKey: '', channelId: '' },
  gemini:    { key: '' },
  general:   { maintenance: false, siteName: 'عفراء للتوظيف', siteUrl: 'https://afra-iq.com' },
  site: {
    email:          'afrahub.iq@gmail.com',
    phone:          '',
    address:        'بغداد، العراق',
    facebookUrl:    '',
    instagramUrl:   '',
    tiktokUrl:      '',
    telegramUrl:    '',
    whatsappNum:    '',
    founderPhotoURL:'',
  },
};

// ═══════════════════════════════════════════════
// الحالة العامة للتطبيق
// ═══════════════════════════════════════════════
let U    = null;   // Firebase User
let P    = null;   // Firestore Profile
let ROLE = null;   // 'seeker' | 'office' | 'admin'
const DEMO = window.FIREBASE_ERROR || false;

let JOBS        = [];
let MY_APPS     = [];
let OFFICE_APPS = []; // طلبات وظائف المكتب الحالي
let SEL_JOB     = null;
let SEL_ROLE    = 'seeker';

const CATS  = { tech:'تقنية', biz:'أعمال', med:'طب', edu:'تعليم', eng:'هندسة', other:'أخرى' };
const PROVS = ['بغداد','كربلاء','النجف','البصرة','نينوى','أربيل','كركوك','بابل','ذي قار','ميسان','القادسية','واسط','المثنى','الأنبار','صلاح الدين','ديالى','دهوك','السليمانية'];

// تخصص صاحب العمل → التصنيفات المسموحة لنشر الوظائف
const EMP_CAT_MAP = {
  'شركة تقنية':     ['tech'],
  'محل تجاري':      ['biz', 'other'],
  'مطعم / كافيه':   ['other'],
  'مستشفى / عيادة': ['med'],
  'مدرسة / معهد':   ['edu'],
  'مصنع / مستودع':  ['eng', 'other'],
  'مؤسسة حكومية':   ['biz', 'edu', 'eng', 'other'],
  'أخرى':           ['tech', 'biz', 'med', 'edu', 'eng', 'other'],
};
const STAT  = {
  pending  : { l:'قيد المراجعة',     c:'b-am', ico:'fa-hourglass-half' },
  reviewed : { l:'تمت المراجعة',     c:'b-bl', ico:'fa-eye' },
  interview: { l:'مدعو للمقابلة',   c:'b-pu', ico:'fa-comments' },
  hired    : { l:'تم القبول 🎉',     c:'b-gr', ico:'fa-check-circle' },
  rejected : { l:'غير مقبول',        c:'b-rd', ico:'fa-times-circle' },
};

// ═══════════════════════════════════════════════
// الذكاء الاصطناعي — عبر Firebase Function (المفتاح محمي على السيرفر)
// ═══════════════════════════════════════════════

// عنوان الـ Function — يُحدَّث بعد firebase deploy
// مثال: https://gemini-abc12345-uc.a.run.app
const AI_FUNCTION_URL = window.AI_FUNCTION_URL || '';

async function callGemini(prompt) {
  if (!AI_FUNCTION_URL) return null;
  try {
    const res = await fetch(AI_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.text || null;
  } catch (e) { console.warn('AI Function error:', e); return null; }
}

function isAIReady() { return !!AI_FUNCTION_URL; }

// ═══════════════════════════════════════════════
// دوال مساعدة عامة
// ═══════════════════════════════════════════════

// حماية XSS — تنظيف المدخلات قبل عرضها
function san(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function fmt(n)  { return n ? n.toLocaleString('ar-IQ') : '—'; }

// بناء عناصر pagination — يُعيد HTML جاهز للعرض
// onPage: إما اسم دالة عالمية (string) أو callback مباشر
function _buildPagination(pages, cur, onPage) {
  if (pages <= 1) return '';
  const call = typeof onPage === 'string' ? `${onPage}` : onPage.toString();
  const invokeStr = typeof onPage === 'string'
    ? p => `onclick="${call}(${p})"`
    : p => `onclick="(${call})(${p})"`;

  const btn = (p, label, disabled, active) =>
    `<button class="pag-btn${active?' on':''}" ${disabled?'disabled':''} ${invokeStr(p)}>${label}</button>`;

  let html = btn(cur - 1, '<i class="fas fa-chevron-right"></i>', cur <= 1, false);

  const range = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - cur) <= 1) range.push(i);
    else if (range[range.length - 1] !== '...') range.push('...');
  }
  range.forEach(p => {
    if (p === '...') html += `<span class="pag-btn" style="pointer-events:none;opacity:.4">…</span>`;
    else html += btn(p, p, false, p === cur);
  });

  html += btn(cur + 1, '<i class="fas fa-chevron-left"></i>', cur >= pages, false);
  return html;
}
function tsMs(d) {
  if (!d) return 0;
  if (d?.toMillis) return d.toMillis();           // Firestore Timestamp
  if (d?.seconds)  return d.seconds * 1000;       // raw {seconds,nanoseconds}
  const n = new Date(d).getTime();
  return isNaN(n) ? 0 : n;
}
function ago(d)  {
  if (!d) return '';
  const s = Math.floor((Date.now() - tsMs(d)) / 1000);
  if (s < 3600)   return `منذ ${Math.floor(s/60)||1} دقيقة`;
  if (s < 86400)  return `منذ ${Math.floor(s/3600)} ساعة`;
  if (s < 604800) return `منذ ${Math.floor(s/86400)} يوم`;
  return `منذ ${Math.floor(s/604800)} أسبوع`;
}

function notify(title, msg = '', type = 'success') {
  const icons = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
  const el = document.createElement('div');
  el.className = `notif ${type}`;
  el.innerHTML = `
    <div class="ni2"><i class="fas ${icons[type]}"></i></div>
    <div class="ntx">
      <div class="ntit">${title}</div>
      ${msg ? `<div class="nmsg">${msg}</div>` : ''}
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--tx3);cursor:pointer;font-size:14px;padding:2px 6px;margin-right:auto">✕</button>
  `;
  document.getElementById('nc').appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function oMo(id) { document.getElementById(id)?.classList.add('on'); }
function cmo(id) { document.getElementById(id)?.classList.remove('on'); }

function confirm2(title, msg, fn) {
  document.getElementById('moConTitle').textContent = title;
  document.getElementById('moConMsg').textContent   = msg;
  document.getElementById('moConBtn').onclick = () => { cmo('moConfirm'); fn(); };
  oMo('moConfirm');
}

function loading(btnId, on) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (on) { btn.disabled = true; btn.dataset.orig = btn.innerHTML; btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> جارٍ...'; }
  else    { btn.disabled = false; btn.innerHTML = btn.dataset.orig || btn.innerHTML; }
}

function showErr(id, msg) { const e = document.getElementById(id); if (e) { e.style.display = 'block'; e.textContent = msg; } }
function hideErr(id)       { const e = document.getElementById(id); if (e) e.style.display = 'none'; }

// ═══════════════════════════════════════════════
// حماية الصلاحيات — يُستخدم في كل إجراء حساس
// ═══════════════════════════════════════════════
function requireAuth(requiredRole) {
  // المستخدم غير مسجّل أو ضيف مجهول
  if (DEMO || !U || ROLE === 'guest') {
    confirm2(
      'تسجيل مطلوب',
      'يجب أن تكون مسجلاً في المنصة للقيام بهذا الإجراء. سجّل الآن مجاناً!',
      async () => {
        // تسجيل خروج الضيف المجهول أولاً
        if (U?.isAnonymous && window.auth) await window.auth.signOut();
        U = null; P = null; ROLE = null;
        document.getElementById('app').style.display = 'none';
        document.getElementById('authScreen').style.display = 'flex';
        mainSwitchTab('login');
      }
    );
    return false;
  }
  // التحقق من الدور
  if (requiredRole && ROLE !== requiredRole) {
    const msgs = {
      seeker: 'هذه الميزة للباحثين عن عمل فقط',
      office: 'هذه الميزة لمكاتب التوظيف فقط',
      admin:  'هذه الميزة للمدير فقط',
    };
    notify('غير مسموح ⛔', msgs[requiredRole] || 'ليس لديك صلاحية لهذا الإجراء', 'error');
    return false;
  }
  return true;
}

function guestBanner() {
  if (ROLE !== 'guest') return '';
  return `<div style="background:linear-gradient(135deg,var(--p),#a78bfa);border-radius:14px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
    <i class="fas fa-eye" style="color:rgba(255,255,255,.8);font-size:20px"></i>
    <div style="flex:1;min-width:160px">
      <div style="color:#fff;font-weight:700;font-size:14px;margin-bottom:2px">تصفح كضيف — الوظائف والمكاتب فقط</div>
      <div style="color:rgba(255,255,255,.8);font-size:12px">سجّل مجاناً للتقديم على الوظائف والاستفادة من جميع الميزات</div>
    </div>
    <button onclick="requireAuth()" style="background:#fff;color:var(--p);border:none;border-radius:9px;padding:8px 18px;font-weight:700;font-size:13px;cursor:pointer;font-family:Cairo,sans-serif;white-space:nowrap">سجّل الآن</button>
  </div>`;
}

function emptyState(ico, tit, desc, btn = '') {
  return `<div class="es"><div class="es-ico">${ico}</div><div class="es-tit">${tit}</div><div class="es-desc">${desc}</div>${btn}</div>`;
}

function setTab(btn) {
  btn.closest('.tabs').querySelectorAll('.tb2').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

// ═══════════════════════════════════════════════
// إرسال إشعارات خارجية
// ═══════════════════════════════════════════════
async function tgSend(txt) {
  if (!CFG.telegram.bot || CFG.telegram.bot.startsWith('YOUR')) return;
  try {
    await fetch(`https://api.telegram.org/bot${CFG.telegram.bot}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ chat_id: CFG.telegram.chat, text: txt, parse_mode: 'HTML' })
    });
  } catch (e) { console.warn('TG err', e); }
}

async function ejsSend(subj, msg) {
  if (!CFG.emailjs.pub || CFG.emailjs.pub.startsWith('YOUR')) return;
  try {
    if (typeof emailjs !== 'undefined') {
      emailjs.init(CFG.emailjs.pub);
      await emailjs.send(CFG.emailjs.svc, CFG.emailjs.tpl, {
        to_email: CFG.emailjs.admin, subject: subj, message: msg, reply_to: CFG.emailjs.admin
      });
    }
  } catch (e) { console.warn('EJS err', e); }
}

async function notifyAdmin(subj, html, tg) {
  await Promise.allSettled([ejsSend(subj, html), tgSend(tg)]);
}

// ═══════════════════════════════════════════════
// الثيم
// ═══════════════════════════════════════════════
function initTheme() {
  let t = localStorage.getItem('afraa_theme');
  if (!t) t = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  const ic = document.getElementById('thIco');
  if (ic) ic.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark';
  const nxt = cur ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nxt);
  localStorage.setItem('afraa_theme', nxt);
  const ic = document.getElementById('thIco');
  if (ic) ic.className = nxt === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ═══════════════════════════════════════════════
// قائمة التنقل
// ═══════════════════════════════════════════════
const NAV_EMPLOYER = [
  { id:'emp_home',    icon:'fa-tachometer-alt', label:'لوحة التحكم',  btm:true  },
  { id:'emp_jobs',    icon:'fa-briefcase',       label:'وظائفي',        btm:true  },
  { id:'emp_apps',    icon:'fa-users',           label:'المتقدمون',     btm:true  },
  { id:'emp_seekers', icon:'fa-address-card',    label:'ملفات الباحثين', btm:false },
  { id:'emp_profile', icon:'fa-building',        label:'ملف الشركة',   btm:true  },
];
const NAV_GUEST = [
  { id:'jobs',    icon:'fa-briefcase', label:'الوظائف',         btm:true  },
  { id:'offices', icon:'fa-building',  label:'مكاتب التوظيف', btm:true  },
];
const NAV_SEEKER = [
  { id:'home',      icon:'fa-home',           label:'الرئيسية',         btm:true  },
  { id:'jobs',      icon:'fa-briefcase',       label:'الوظائف',           btm:true  },
  { id:'myapps',    icon:'fa-clipboard-list',  label:'طلباتي',            btm:true  },
  { id:'offices',   icon:'fa-building',        label:'مكاتب التوظيف',   btm:false },
  { id:'cv',        icon:'fa-file-alt',        label:'سيرتي الذاتية',    btm:false },
  { id:'interview', icon:'fa-comments',        label:'مقابلة ذكية',      btm:false },
  { id:'profile',   icon:'fa-user-circle',     label:'حسابي',             btm:true  },
];
const NAV_OFFICE = [
  { id:'home',            icon:'fa-tachometer-alt', label:'لوحة التحكم',      btm:true  },
  { id:'myjobs',          icon:'fa-briefcase',      label:'وظائفي',            btm:true  },
  { id:'candidates',      icon:'fa-users',          label:'المتقدمون',         btm:true  },
  { id:'managed_seekers', icon:'fa-id-card',        label:'باحثون مُدارون',    btm:false },
  { id:'bookings',        icon:'fa-lock',           label:'الحجوزات',          btm:false },
  { id:'pipeline',        icon:'fa-columns',        label:'خط التوظيف',       btm:false },
  { id:'profile',         icon:'fa-building',       label:'ملف المكتب',       btm:true  },
];
const NAV_ADMIN = [
  { id:'home',            icon:'fa-tachometer-alt', label:'لوحة التحكم',     btm:true  },
  { id:'alljobs',         icon:'fa-briefcase',      label:'الوظائف',          btm:false },
  { id:'alloffices',      icon:'fa-building',       label:'المكاتب',          btm:false },
  { id:'allusers',        icon:'fa-users',          label:'المستخدمون',       btm:false },
  { id:'admin_seekers',   icon:'fa-user-tie',       label:'الموظفون المُدارون', btm:false },
  { id:'payments',        icon:'fa-credit-card',    label:'الاشتراكات',       btm:false },
  { id:'campaigns',       icon:'fa-bullhorn',       label:'حملات التواصل',    btm:false },
  { id:'settings',        icon:'fa-cog',            label:'الإعدادات',        btm:true  },
];

function getNav() {
  if (ROLE === 'office')    return NAV_OFFICE;
  if (ROLE === 'admin')     return NAV_ADMIN;
  if (ROLE === 'employer')  return NAV_EMPLOYER;
  if (ROLE === 'guest')     return NAV_GUEST;
  return NAV_SEEKER;
}

// شارات عداد الإشعارات لقائمة الأدمن { pageId: count }
const _navBadges = {};

function buildNav() {
  const pages = getNav();
  let html = '<div class="nav-lbl">القائمة</div>';
  pages.forEach(p => {
    const badge = (_navBadges[p.id] > 0) ? `<span class="nbadge" style="background:#ef4444;color:#fff">${_navBadges[p.id]}</span>` : '';
    html += `<div class="ni" id="ni_${p.id}" onclick="goTo('${p.id}')"><i class="fas ${p.icon} ico"></i>${p.label}${badge}</div>`;
  });
  if (ROLE === 'guest') {
    html += `<div class="nav-lbl">انضم إلينا</div>
      <div class="ni" onclick="doLogout()" style="background:var(--p);color:#fff;border-radius:10px;margin:4px 8px;font-weight:700">
        <i class="fas fa-user-plus ico"></i>سجّل مجاناً الآن
      </div>`;
  } else {
    html += `<div class="nav-lbl">أخرى</div>
      <div class="ni" onclick="doLogout()"><i class="fas fa-sign-out-alt ico"></i>تسجيل الخروج</div>`;
  }
  document.getElementById('navEl').innerHTML = html;

  const btm = pages.filter(p => p.btm);
  document.getElementById('bnav').innerHTML = btm.map(p =>
    `<div class="bni" id="bni_${p.id}" onclick="goTo('${p.id}')"><i class="fas ${p.icon}"></i>${p.label}</div>`
  ).join('');
}

// ── تحديث شارة الدفعات المعلقة للأدمن ──
async function updatePaymentBadge() {
  if (ROLE !== 'admin' || DEMO || !window.db) return;
  try {
    const snap = await window.db.collection('payments').where('status', '==', 'pending').get();
    const cnt = snap.size;
    if (cnt !== _navBadges.payments) {
      _navBadges.payments = cnt || 0;
      buildNav();
      const cur = window.location.hash.replace('#', '') || 'home';
      document.getElementById(`ni_${cur}`)?.classList.add('on');
      document.getElementById(`bni_${cur}`)?.classList.add('on');
    }
  } catch(e) { /* نتجاهل الأخطاء في الخلفية */ }
}

function goTo(page) {
  // تنظيف عداد الحجوزات عند مغادرة الصفحة
  if (window._bookingTimer) { clearInterval(window._bookingTimer); window._bookingTimer = null; }
  closeSidebar();
  document.querySelectorAll('.ni').forEach(el  => el.classList.remove('on'));
  document.querySelectorAll('.bni').forEach(el => el.classList.remove('on'));
  document.getElementById(`ni_${page}`)?.classList.add('on');
  document.getElementById(`bni_${page}`)?.classList.add('on');
  const def = getNav().find(p => p.id === page);
  document.getElementById('tbTitle').textContent = def?.label || '';
  // حفظ الصفحة في الـ hash لاستعادتها عند التحديث
  history.replaceState(null, '', '#' + page);
  renderPage(page);
}

function renderPage(pg) {
  pageFadeIn();
  const el = document.getElementById('pcon');
  if (ROLE === 'guest') {
    if (pg === 'jobs')    return pgJobs(el);
    if (pg === 'offices') return pgOfficesList(el);
    notify('تسجيل مطلوب', 'سجّل حساباً مجانياً للوصول لهذه الميزة', 'warning');
    return pgJobs(el);
  }
  if (ROLE === 'employer') {
    if (pg === 'emp_home')    return pgEmployerHome(el);
    if (pg === 'emp_jobs')    return pgEmployerJobs(el);
    if (pg === 'emp_apps')    return pgEmployerApps(el);
    if (pg === 'emp_seekers') return pgEmployerSeekers(el);
    if (pg === 'emp_profile') return pgEmployerProfile(el);
    return pgEmployerHome(el);
  }
  if (ROLE === 'office') {
    if (pg === 'home')            return pgOfficeHome(el);
    if (pg === 'myjobs')          return pgOfficeJobs(el);
    if (pg === 'candidates')      return pgCandidates(el);
    if (pg === 'managed_seekers') return pgOfficeManagedSeekers(el);
    if (pg === 'bookings')        return pgBookings(el);
    if (pg === 'pipeline')        return pgPipeline(el);
    if (pg === 'profile')         return pgOfficeProfile(el);
    return pgOfficeHome(el); // catch-all — لا يسقط لصفحات الباحث
  }
  if (ROLE === 'admin') {
    if (pg === 'home')        return pgAdminHome(el);
    if (pg === 'alljobs')     return pgAdminJobs(el);
    if (pg === 'alloffices')  return pgAdminOffices(el);
    if (pg === 'allusers')      return pgAdminUsers(el);
    if (pg === 'admin_seekers') return pgAdminManagedSeekers(el);
    if (pg === 'settings')      return pgAdminSettings(el);
    if (pg === 'campaigns')     return pgAdminCampaigns(el);
    if (pg === 'payments')      return pgAdminPayments(el);
    return pgAdminHome(el); // catch-all
  }
  // seeker (default)
  if (pg === 'home')      return pgSeekerHome(el);
  if (pg === 'jobs')      return pgJobs(el);
  if (pg === 'myapps')    return pgMyApps(el);
  if (pg === 'offices')   return pgOfficesList(el);
  if (pg === 'cv')        { history.replaceState(null,'','#home'); oMo('moCV'); buildCVModal(); return; }
  if (pg === 'interview') { history.replaceState(null,'','#home'); oMo('moIV'); buildIVModal(); return; }
  if (pg === 'profile')   return pgSeekerProfile(el);
  return pgSeekerHome(el);
}

function openSidebar()  { document.getElementById('sidebar').classList.add('open'); document.getElementById('ov').style.display = 'block'; }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('ov').style.display = 'none'; }
// openNotifs() is defined below with full panel functionality

// ═══════════════════════════════════════════════
// إعداد عام عند بدء التطبيق
// ═══════════════════════════════════════════════
function updateUserUI() {
  const name  = P?.name || 'مستخدم';
  const photo = P?.photoURL || P?.avatar || U?.photoURL;
  const init  = name.charAt(0);
  ['sav', 'tbav'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = photo ? `<img src="${photo}" alt="">` : init;
  });
  document.getElementById('sname').textContent = name;
  const roleLabels = { office:'مكتب توظيف', admin:'مدير النظام', employer:'صاحب عمل', guest:'زائر — سجّل للاستفادة الكاملة', seeker:'باحث عن عمل' };
  document.getElementById('srole').textContent = roleLabels[ROLE] || 'باحث عن عمل';
}

function bootApp() {
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('app').style.display        = 'flex';
  initTheme();
  buildNav();
  updateUserUI();
  const ndot = document.getElementById('ndot');
  if (ndot && MY_APPS.length > 0) ndot.style.display = 'block';
  if (ROLE === 'admin') {
    updatePaymentBadge();
    setInterval(updatePaymentBadge, 120000);
  }
  const hash = location.hash.replace('#', '');
  const nav = getNav();
  const validPages = nav.map(p => p.id);
  const startPage = validPages.includes(hash) ? hash : (nav[0]?.id || 'home');
  goTo(startPage);
  // عرض مودال الترحيب للمستخدم الجديد (مرة واحدة فقط)
  if (!U?.isAnonymous && ROLE !== 'guest') setTimeout(maybeShowWelcome, 700);
}

// ═══════════════════════════════════════════════
// مودال الترحيب — يظهر مرة واحدة لكل مستخدم
// ═══════════════════════════════════════════════
function maybeShowWelcome() {
  if (!U || U.isAnonymous) return;
  const key = 'afra_welcomed_' + U.uid;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');
  showWelcomeModal();
}

function showWelcomeModal() {
  const el = document.getElementById('moWelcomeB');
  if (!el) return;
  const nm = (P?.name || '').split(' ')[0] || 'مستخدم';

  const configs = {
    seeker: {
      emoji: '🧑‍💼', roleLbl: 'باحث عن عمل', roleClass: 'seeker',
      title: `أهلاً ${nm}! 👋`,
      sub: 'رحلتك نحو وظيفتك المثالية تبدأ الآن',
      steps: [
        { ico: '👤', bg: 'linear-gradient(135deg,var(--p),var(--pl))',  tit: 'أكمل ملفك الشخصي', desc: 'أضف مهاراتك وخبراتك لتظهر لأصحاب العمل', fn: "cmo('moWelcome');goTo('profile')" },
        { ico: '🔍', bg: 'linear-gradient(135deg,#3b82f6,#60a5fa)',      tit: 'ابحث عن وظيفة',    desc: 'آلاف الوظائف في كل محافظات العراق',    fn: "cmo('moWelcome');goTo('jobs')" },
        { ico: '📄', bg: 'linear-gradient(135deg,var(--purple),#a78bfa)',tit: 'أنشئ سيرتك الذاتية',desc: 'احترافية وجاهزة للتحميل بصيغة PDF',    fn: "cmo('moWelcome');oMo('moCV');buildCVModal()" },
      ],
      cta: "cmo('moWelcome');goTo('jobs')", ctaLbl: 'ابدأ البحث عن وظيفة',
    },
    office: {
      emoji: '🏢', roleLbl: 'مكتب توظيف', roleClass: 'office',
      title: `أهلاً ${nm}! 👋`,
      sub: 'لوحة إدارة مكتب التوظيف جاهزة',
      steps: [
        { ico: '📢', bg: 'linear-gradient(135deg,var(--p),var(--pl))',  tit: 'انشر وظيفتك الأولى',  desc: 'بضع خطوات وتصل لآلاف الباحثين',        fn: "cmo('moWelcome');openAddJob()" },
        { ico: '👥', bg: 'linear-gradient(135deg,#3b82f6,#60a5fa)',      tit: 'تصفح طلبات المتقدمين', desc: 'راجع وأدر كل الطلبات من مكان واحد',   fn: "cmo('moWelcome');goTo('candidates')" },
        { ico: '⚙️', bg: 'linear-gradient(135deg,var(--acc),var(--accl))',tit: 'أكمل ملف مكتبك',     desc: 'ملف قوي يزيد ثقة الباحثين بمكتبك',    fn: "cmo('moWelcome');goTo('profile')" },
      ],
      cta: "cmo('moWelcome');openAddJob()", ctaLbl: 'انشر وظيفتك الأولى',
    },
    employer: {
      emoji: '🏪', roleLbl: 'صاحب عمل', roleClass: 'employer',
      title: `أهلاً ${nm}! 👋`,
      sub: 'لوحة تحكم صاحب العمل جاهزة',
      steps: [
        { ico: '📢', bg: 'linear-gradient(135deg,var(--acc),var(--accl))',tit: 'انشر وظيفتك الأولى',  desc: 'الوصول للكفاءات المناسبة بسهولة',       fn: "cmo('moWelcome');openAddJob()" },
        { ico: '🏢', bg: 'linear-gradient(135deg,var(--purple),#a78bfa)', tit: 'أكمل ملف شركتك',      desc: 'ملف قوي يجذب المتقدمين المناسبين',      fn: "cmo('moWelcome');goTo('profile')" },
        { ico: '👁️', bg: 'linear-gradient(135deg,#3b82f6,#60a5fa)',       tit: 'تصفح ملفات الباحثين', desc: 'اكتشف المواهب المناسبة لشركتك',         fn: "cmo('moWelcome');goTo('home')" },
      ],
      cta: "cmo('moWelcome');openAddJob()", ctaLbl: 'انشر وظيفتك الأولى',
    },
  };

  const cfg = configs[ROLE] || configs.seeker;

  el.innerHTML = `
    <div style="text-align:center;padding:4px 0 18px">
      <div style="font-size:48px;margin-bottom:8px;display:inline-block;animation:pulse2 2.5s ease-in-out infinite">${cfg.emoji}</div>
      <div class="welcome-role-badge ${cfg.roleClass}"><i class="fas fa-user-check"></i> ${cfg.roleLbl}</div>
      <h2 style="font-size:18px;font-weight:900;color:var(--tx);margin:0 0 5px">${cfg.title}</h2>
      <p style="font-size:12px;color:var(--tx2);margin:0">${cfg.sub}</p>
    </div>

    <div style="margin-bottom:18px">
      <p style="font-size:11px;font-weight:800;color:var(--tx3);margin:0 0 10px;letter-spacing:.5px">— ماذا تريد أن تفعل الآن؟ —</p>
      ${cfg.steps.map((s, i) => `
        <div class="welcome-step" onclick="${s.fn}" style="animation-delay:${i * .08 + .1}s">
          <div class="welcome-step-ico" style="background:${s.bg}">${s.ico}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:800;color:var(--tx)">${s.tit}</div>
            <div style="font-size:11px;color:var(--tx2);margin-top:2px">${s.desc}</div>
          </div>
          <i class="fas fa-arrow-left" style="color:var(--tx3);font-size:11px;flex-shrink:0"></i>
        </div>
      `).join('')}
    </div>

    <button class="btn bp bfu" onclick="${cfg.cta}" style="margin-bottom:10px">
      <i class="fas fa-rocket"></i> ${cfg.ctaLbl}
    </button>
    <button onclick="cmo('moWelcome')" style="width:100%;background:none;border:none;color:var(--tx3);font-size:12px;font-family:Cairo,sans-serif;cursor:pointer;font-weight:600;padding:5px">
      سأستكشف بنفسي
    </button>
  `;

  // تحديث عنوان المودال
  const titleEl = document.getElementById('moWelcomeTitle');
  if (titleEl) titleEl.innerHTML = `<i class="fas fa-hand-sparkles" style="color:var(--acc)"></i> مرحباً في عفراء!`;

  oMo('moWelcome');
}

// إغلاق المودالات بالنقر خارجها
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mo').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('on'); }));
  initTheme();
});

// ═══════════════════════════════════════════════
// نظام المحفوظات (Bookmarks)
// ═══════════════════════════════════════════════
let BOOKMARKS = JSON.parse(localStorage.getItem('afraa_bookmarks') || '[]');

function toggleBookmark(id, e) {
  if (e) e.stopPropagation();
  const idx = BOOKMARKS.indexOf(id);
  if (idx === -1) {
    BOOKMARKS.push(id);
    notify('تم الحفظ', 'أُضيفت الوظيفة للمحفوظات', 'success');
  } else {
    BOOKMARKS.splice(idx, 1);
    notify('تمت الإزالة', 'حُذفت من المحفوظات', 'info');
  }
  localStorage.setItem('afraa_bookmarks', JSON.stringify(BOOKMARKS));
  document.querySelectorAll(`[data-bkm="${id}"]`).forEach(btn => {
    const saved = BOOKMARKS.includes(id);
    btn.className = 'bkm-btn' + (saved ? ' on' : '');
    btn.innerHTML = `<i class="fas fa-bookmark" style="font-size:12px"></i>`;
  });
  // تحديث عدد المحفوظات في البانر
  const bkEl = document.getElementById('bkmCount');
  if (bkEl) bkEl.textContent = BOOKMARKS.length;
}

function isBookmarked(id) { return BOOKMARKS.includes(id); }

// ═══════════════════════════════════════════════
// حساب اكتمال الملف الشخصي
// ═══════════════════════════════════════════════
function getCompletion(p, role) {
  if (!p) return 0;
  const baseFields = ['name', 'phone', 'province', 'bio'];
  const roleField  = role === 'office' ? 'officeName' : role === 'employer' ? 'companyName' : 'jobTitle';
  const fields     = [...baseFields, roleField];
  const filled     = fields.filter(f => p[f] && String(p[f]).trim()).length;
  const hasApps    = (role === 'seeker' && MY_APPS.length > 0) ? 1 : 0;
  const total      = fields.length + 1;
  return Math.round(((filled + hasApps) / total) * 100);
}

function completionColor(pct) {
  if (pct >= 80) return 'var(--success)';
  if (pct >= 50) return 'var(--acc)';
  return 'var(--danger)';
}

// ═══════════════════════════════════════════════
// انيميشن تحوّل الصفحات
// ═══════════════════════════════════════════════
function pageFadeIn() {
  const el = document.getElementById('pcon');
  if (!el) return;
  el.style.opacity = '0';
  el.style.transform = 'translateY(10px)';
  requestAnimationFrame(() => {
    el.style.transition = 'opacity .28s ease, transform .28s ease';
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    setTimeout(() => { el.style.transition = ''; }, 300);
  });
}

// ═══════════════════════════════════════════════
// لوحة الإشعارات المنسدلة
// ═══════════════════════════════════════════════
function openNotifs() {
  const existing = document.getElementById('notifsPanel');
  if (existing) { existing.remove(); return; }

  const panel = document.createElement('div');
  panel.id = 'notifsPanel';
  panel.className = 'notif-panel';

  const unread = MY_APPS.length;
  const ndot = document.getElementById('ndot');

  const items = unread ? MY_APPS.slice(0, 6).map(a => {
    const s = STAT[a.status] || STAT.pending;
    const cls = a.status === 'hired' ? 'gr' : a.status === 'rejected' ? 'rd' : a.status === 'interview' ? 'pu' : 'tl';
    return `<div class="np-item" onclick="cmo('notifsPanel');goTo('myapps')">
      <div class="np-ico ${cls}"><i class="fas ${s.ico}"></i></div>
      <div class="np-tx">
        <div class="np-tit">طلبك على "${a.jobTitle}"</div>
        <div class="np-sub">${s.l} • ${a.appliedAt?.slice(0,10) || ''}</div>
      </div>
    </div>`;
  }) : [`<div class="np-empty"><i class="fas fa-bell-slash" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>لا توجد إشعارات</div>`];

  panel.innerHTML = `
    <div class="np-header">
      <span><i class="fas fa-bell" style="color:var(--p);margin-left:5px"></i>الإشعارات</span>
      ${unread ? `<span class="b b-tl">${unread}</span>` : ''}
    </div>
    ${items.join('')}
    ${unread ? `<div style="padding:10px 16px;border-top:1px solid var(--br);text-align:center">
      <button class="btn bg bsm" onclick="document.getElementById('notifsPanel')?.remove();goTo('myapps')"><i class="fas fa-eye"></i>عرض كل الطلبات</button>
    </div>` : ''}`;

  document.body.appendChild(panel);
  if (ndot) ndot.style.display = 'none';

  setTimeout(() => {
    function closePanel(e) {
      if (!panel.contains(e.target)) { panel.remove(); document.removeEventListener('click', closePanel); }
    }
    document.addEventListener('click', closePanel);
  }, 80);
}

// ═══════════════════════════════════════════════
// مساعدات تنسيق متقدمة
// ═══════════════════════════════════════════════
function daysLeft(deadline) {
  if (!deadline) return null;
  const ms = tsMs(deadline) || new Date(deadline).getTime();
  if (!ms) return null;
  return Math.ceil((ms - Date.now()) / 86400000);
}

function daysLeftBadge(deadline) {
  const d = daysLeft(deadline);
  if (d === null) return '';
  if (d < 0)   return `<span class="days-badge urgent"><i class="fas fa-times-circle"></i>انتهى</span>`;
  if (d === 0) return `<span class="days-badge urgent"><i class="fas fa-fire"></i>ينتهي اليوم</span>`;
  if (d <= 3)  return `<span class="days-badge urgent"><i class="fas fa-exclamation-circle"></i>${d} أيام متبقية</span>`;
  return `<span class="days-badge"><i class="fas fa-calendar"></i>${d} يوم</span>`;
}

function jobMatchScore(j) {
  if (!P?.province) return null;
  if (j.province === P.province) return 'high';
  return null;
}

// ═══════════════════════════════════════════════
// نظام عمر الوظيفة والانتهاء
// ═══════════════════════════════════════════════

// هل الوظيفة لا تزال متاحة فعلياً؟
function isJobLive(j) {
  if (!j) return false;
  if (j.status === 'paused' || j.status === 'closed') return false;
  // الأدمن يثبّت الوظيفة → تتجاوز أي انتهاء
  if (j.adminPinned) return true;
  // وظيفة دائمة أو بدون expiresAt
  if (!j.expiresAt) return true;
  return tsMs(j.expiresAt) > Date.now();
}

// التسمية المرئية لعمر الوظيفة
function jobExpiryLabel(j) {
  if (j.adminPinned) return `<span class="b b-pu" style="font-size:11px"><i class="fas fa-thumbtack"></i> مثبّت من الأدمن</span>`;
  if (!j.expiresAt)  return `<span class="b b-gr" style="font-size:11px"><i class="fas fa-infinity"></i> دائمي</span>`;
  const ms   = tsMs(j.expiresAt) - Date.now();
  if (ms <= 0) return `<span class="b b-rd" style="font-size:11px"><i class="fas fa-clock"></i> منتهية</span>`;
  const mins = Math.floor(ms / 60000);
  const hrs  = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (mins < 60)  return `<span class="b b-am" style="font-size:11px"><i class="fas fa-clock"></i> تنتهي خلال ${mins} دقيقة</span>`;
  if (hrs  < 24)  return `<span class="b b-am" style="font-size:11px"><i class="fas fa-clock"></i> تنتهي خلال ${hrs} ساعة</span>`;
  if (days < 30)  return `<span class="b b-tl" style="font-size:11px"><i class="fas fa-calendar"></i> تنتهي خلال ${days} يوم</span>`;
  return `<span class="b b-gr" style="font-size:11px"><i class="fas fa-calendar-check"></i> تنتهي ${new Date(tsMs(j.expiresAt)).toLocaleDateString('ar-IQ')}</span>`;
}

// حساب expiresAt من قيمة duration
function calcExpiresAt(duration) {
  const now = Date.now();
  const map = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
  if (!duration || duration === 'permanent' || !map[duration]) return null;
  return new Date(now + map[duration]).toISOString();
}
