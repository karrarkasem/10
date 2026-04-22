// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — app.js                           ║
// ║  الحالة العامة + المساعدات + التنقل + الإعداد       ║
// ╚══════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════
// إعدادات الإشعارات الخارجية (Telegram / EmailJS)
// ═══════════════════════════════════════════════
const CFG = {
  telegram: { bot: 'YOUR_BOT_TOKEN',    chat: 'YOUR_CHAT_ID' },
  emailjs:  { pub: 'YOUR_PUBLIC_KEY',   svc:  'YOUR_SERVICE_ID',  tpl: 'YOUR_TEMPLATE_ID', admin: 'YOUR_ADMIN@gmail.com' },
  imgbb:    { key: 'YOUR_IMGBB_API_KEY' },
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
function ago(d)  {
  if (!d) return '';
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
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
        document.getElementById('screenWho').style.display = 'block';
        document.getElementById('screenAuth').style.display = 'none';
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
  let t = localStorage.getItem('fanoos_theme');
  if (!t) t = window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  const ic = document.getElementById('thIco');
  if (ic) ic.className = t === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') === 'dark';
  const nxt = cur ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nxt);
  localStorage.setItem('fanoos_theme', nxt);
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
  { id:'home',       icon:'fa-tachometer-alt', label:'لوحة التحكم',      btm:true  },
  { id:'myjobs',     icon:'fa-briefcase',      label:'وظائفي',            btm:true  },
  { id:'candidates', icon:'fa-users',          label:'المتقدمون',         btm:true  },
  { id:'bookings',   icon:'fa-lock',           label:'الحجوزات',          btm:false },
  { id:'pipeline',   icon:'fa-columns',        label:'خط التوظيف',       btm:false },
  { id:'profile',    icon:'fa-building',       label:'ملف المكتب',       btm:true  },
];
const NAV_ADMIN = [
  { id:'home',        icon:'fa-tachometer-alt', label:'لوحة التحكم',     btm:true  },
  { id:'alljobs',     icon:'fa-briefcase',      label:'الوظائف',          btm:false },
  { id:'alloffices',  icon:'fa-building',       label:'المكاتب',          btm:false },
  { id:'allusers',    icon:'fa-users',          label:'المستخدمون',       btm:false },
  { id:'settings',    icon:'fa-cog',            label:'الإعدادات',        btm:true  },
];

function getNav() {
  if (ROLE === 'office')    return NAV_OFFICE;
  if (ROLE === 'admin')     return NAV_ADMIN;
  if (ROLE === 'employer')  return NAV_EMPLOYER;
  if (ROLE === 'guest')     return NAV_GUEST;
  return NAV_SEEKER;
}

function buildNav() {
  const pages = getNav();
  let html = '<div class="nav-lbl">القائمة</div>';
  pages.forEach(p => {
    html += `<div class="ni" id="ni_${p.id}" onclick="goTo('${p.id}')"><i class="fas ${p.icon} ico"></i>${p.label}</div>`;
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
    if (pg === 'emp_profile') return pgEmployerProfile(el);
    return pgEmployerHome(el);
  }
  if (ROLE === 'office') {
    if (pg === 'home')       return pgOfficeHome(el);
    if (pg === 'myjobs')     return pgOfficeJobs(el);
    if (pg === 'candidates') return pgCandidates(el);
    if (pg === 'bookings')   return pgBookings(el);
    if (pg === 'pipeline')   return pgPipeline(el);
    if (pg === 'profile')    return pgOfficeProfile(el);
    return pgOfficeHome(el); // catch-all — لا يسقط لصفحات الباحث
  }
  if (ROLE === 'admin') {
    if (pg === 'home')        return pgAdminHome(el);
    if (pg === 'alljobs')     return pgAdminJobs(el);
    if (pg === 'alloffices')  return pgAdminOffices(el);
    if (pg === 'allusers')    return pgAdminUsers(el);
    if (pg === 'settings')    return pgAdminSettings(el);
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
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('app').style.display        = 'flex';
  initTheme();
  buildNav();
  updateUserUI();
  // إظهار شارة الإشعارات إذا كان هناك طلبات
  const ndot = document.getElementById('ndot');
  if (ndot && MY_APPS.length > 0) ndot.style.display = 'block';
  // استعادة آخر صفحة من URL hash
  const hash = location.hash.replace('#', '');
  const nav = getNav();
  const validPages = nav.map(p => p.id);
  const startPage = validPages.includes(hash) ? hash : (nav[0]?.id || 'home');
  goTo(startPage);
}

// إغلاق المودالات بالنقر خارجها
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.mo').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('on'); }));
  initTheme();
});

// ═══════════════════════════════════════════════
// نظام المحفوظات (Bookmarks)
// ═══════════════════════════════════════════════
let BOOKMARKS = JSON.parse(localStorage.getItem('fanoos_bookmarks') || '[]');

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
  localStorage.setItem('fanoos_bookmarks', JSON.stringify(BOOKMARKS));
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
  const roleField  = role === 'office' ? 'officeName' : 'jobTitle';
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
  const diff = Math.ceil((new Date(deadline) - Date.now()) / 86400000);
  return diff;
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
