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

let JOBS      = [];
let MY_APPS   = [];
let SEL_JOB   = null;
let SEL_ROLE  = 'seeker';

// ═══════════════════════════════════════════════
// بيانات تجريبية
// ═══════════════════════════════════════════════
const DEMO_JOBS = [
  { id:'j1', title:'مبرمج ويب React', company:'شركة التقنيات المتقدمة', province:'بغداد', type:'full', cat:'tech', salary:900000, salaryMax:1400000, currency:'IQD', desc:'نبحث عن مبرمج ويب متمرس في React.js وNode.js لتطوير منصاتنا الرقمية. يُشترط خبرة لا تقل عن سنتين.', reqs:['React.js','Node.js','MongoDB','REST APIs','Git'], bens:['تأمين صحي','أجازة 30 يوم','وجبات مجانية','عمل هجين'], deadline:'2026-06-30', logo:'💻', applicants:14, status:'active', postedBy:'off1', postedAt:'2026-03-20', exp:'2-4 سنوات', gender:'الجنسين', hours:'8 ساعات' },
  { id:'j2', title:'محاسب قانوني', company:'مكتب الراشدي للمحاسبة', province:'كربلاء', type:'full', cat:'biz', salary:650000, salaryMax:950000, currency:'IQD', desc:'مطلوب محاسب قانوني معتمد للعمل في أحد أعرق مكاتب المحاسبة في كربلاء. خبرة 3 سنوات على الأقل.', reqs:['بكالوريوس محاسبة','Excel متقدم','برامج محاسبة'], bens:['راتب تنافسي','بيئة مهنية'], deadline:'2026-05-15', logo:'📊', applicants:9, status:'active', postedBy:'off2', postedAt:'2026-03-18', exp:'3+ سنوات', gender:'الجنسين', hours:'8 ساعات' },
  { id:'j3', title:'مصمم جرافيك', company:'وكالة الإبداع الرقمي', province:'النجف', type:'part', cat:'tech', salary:450000, salaryMax:700000, currency:'IQD', desc:'مطلوب مصمم جرافيك موهوب لتصميم هويات بصرية. يمكن العمل عن بُعد.', reqs:['Photoshop','Illustrator','Figma'], bens:['عمل مرن','عن بُعد'], deadline:'2026-05-20', logo:'🎨', applicants:21, status:'active', postedBy:'off1', postedAt:'2026-03-25', exp:'سنة+', gender:'الجنسين', hours:'4 ساعات' },
  { id:'j4', title:'ممرض/ة قسم الطوارئ', company:'مستشفى الحياة الأهلي', province:'البصرة', type:'full', cat:'med', salary:800000, salaryMax:1000000, currency:'IQD', desc:'مطلوب ممرض أو ممرضة مؤهل للعمل في قسم الطوارئ.', reqs:['شهادة التمريض','BLS','ACLS'], bens:['تأمين صحي كامل','بدل خطورة'], deadline:'2026-05-30', logo:'🏥', applicants:6, status:'active', postedBy:'off3', postedAt:'2026-03-22', exp:'سنة+', gender:'الجنسين', hours:'12 ساعة' },
  { id:'j5', title:'مدرّس رياضيات', company:'مدرسة المستقبل الأهلية', province:'أربيل', type:'full', cat:'edu', salary:580000, salaryMax:720000, currency:'IQD', desc:'مطلوب مدرّس رياضيات لمرحلة الإعدادية ضمن بيئة تعليمية متطورة.', reqs:['بكالوريوس رياضيات','مهارات تواصل'], bens:['إجازة صيفية مدفوعة'], deadline:'2026-06-01', logo:'📐', applicants:4, status:'active', postedBy:'off4', postedAt:'2026-03-28', exp:'سنتان+', gender:'الجنسين', hours:'6 ساعات' },
  { id:'j6', title:'مندوب مبيعات', company:'شركة التوزيع الوطنية', province:'بغداد', type:'full', cat:'biz', salary:550000, salaryMax:900000, currency:'IQD', desc:'مطلوب مندوب مبيعات ميداني. راتب ثابت + عمولة + بدل نقل.', reqs:['خبرة مبيعات','رخصة قيادة','سيارة خاصة'], bens:['بدل نقل','عمولة'], deadline:'2026-05-01', logo:'🏪', applicants:28, status:'active', postedBy:'off2', postedAt:'2026-03-15', exp:'سنة+', gender:'ذكور', hours:'8 ساعات' },
  { id:'j7', title:'مهندس مدني', company:'شركة البناء الحديث', province:'بغداد', type:'full', cat:'eng', salary:1100000, salaryMax:1500000, currency:'IQD', desc:'نبحث عن مهندس مدني لمشاريع البنية التحتية. خبرة 4 سنوات.', reqs:['بكالوريوس هندسة مدنية','AutoCAD'], bens:['سيارة + هاتف','تأمين شامل'], deadline:'2026-06-15', logo:'🏗️', applicants:7, status:'active', postedBy:'off1', postedAt:'2026-03-29', exp:'4+ سنوات', gender:'الجنسين', hours:'9 ساعات' },
  { id:'j8', title:'سكرتيرة تنفيذية', company:'مجموعة الخليج التجارية', province:'كربلاء', type:'full', cat:'biz', salary:600000, salaryMax:800000, currency:'IQD', desc:'مطلوبة سكرتيرة تنفيذية ذات خبرة. إتقان الإنجليزية شرط.', reqs:['إنجليزي ممتاز','Office Suite'], bens:['بيئة احترافية','فرص نمو'], deadline:'2026-05-10', logo:'🗂️', applicants:15, status:'active', postedBy:'off4', postedAt:'2026-04-01', exp:'سنتان+', gender:'إناث', hours:'8 ساعات' },
];

const DEMO_APPS = [
  { id:'a1', name:'محمد علي الربيعي',  phone:'07701234567', email:'mo@test.iq',    jobTitle:'مبرمج ويب React', jobId:'j1', exp:'2-4 سنوات', cover:'لديّ خبرة 3 سنوات في React.js وNode.js.', status:'pending',   appliedAt:'2026-03-30' },
  { id:'a2', name:'سارة أحمد الزيدي', phone:'07712345678', email:'sara@test.iq',  jobTitle:'محاسب قانوني',    jobId:'j2', exp:'3+ سنوات',  cover:'حاصلة على شهادة محاسبة معتمدة وخبرة 4 سنوات.', status:'reviewed',  appliedAt:'2026-03-29' },
  { id:'a3', name:'علي حسين الموسوي', phone:'07723456789', email:'ali@test.iq',   jobTitle:'مصمم جرافيك',     jobId:'j3', exp:'سنة+',      cover:'أعشق التصميم وأتقن Photoshop وFigma.', status:'interview', appliedAt:'2026-03-28' },
  { id:'a4', name:'نور عبدالله الحسيني', phone:'07734567890', email:'noor@test.iq', jobTitle:'مبرمج ويب React', jobId:'j1', exp:'4+ سنوات', cover:'أتمتع بخبرة 4 سنوات وبنيت أكثر من 20 مشروعاً.', status:'hired',     appliedAt:'2026-03-27' },
  { id:'a5', name:'حسن محمد الجبوري', phone:'07745678901', email:'hasan@test.iq', jobTitle:'مندوب مبيعات',    jobId:'j6', exp:'أقل من سنة', cover:'متحمس وأرغب في تطوير نفسي.', status:'rejected',  appliedAt:'2026-03-26' },
  { id:'a6', name:'زينب كريم السعدي',  phone:'07756789012', email:'zainab@test.iq', jobTitle:'ممرض/ة',         jobId:'j4', exp:'سنتان+',   cover:'حاصلة على شهادة التمريض وشهادة BLS.', status:'pending',   appliedAt:'2026-04-01' },
];

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
  const t  = localStorage.getItem('fanoos_theme') || 'light';
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
const NAV_SEEKER = [
  { id:'home',      icon:'fa-home',           label:'الرئيسية',         btm:true  },
  { id:'jobs',      icon:'fa-briefcase',       label:'الوظائف',           btm:true  },
  { id:'myapps',    icon:'fa-clipboard-list',  label:'طلباتي',            btm:true  },
  { id:'cv',        icon:'fa-file-alt',        label:'سيرتي الذاتية',    btm:false },
  { id:'interview', icon:'fa-comments',        label:'مقابلة ذكية',      btm:false },
  { id:'profile',   icon:'fa-user-circle',     label:'حسابي',             btm:true  },
];
const NAV_OFFICE = [
  { id:'home',       icon:'fa-tachometer-alt', label:'لوحة التحكم',      btm:true  },
  { id:'myjobs',     icon:'fa-briefcase',      label:'وظائفي',            btm:true  },
  { id:'candidates', icon:'fa-users',          label:'المتقدمون',         btm:true  },
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
  return ROLE === 'office' ? NAV_OFFICE : ROLE === 'admin' ? NAV_ADMIN : NAV_SEEKER;
}

function buildNav() {
  const pages = getNav();
  let html = '<div class="nav-lbl">القائمة</div>';
  pages.forEach(p => {
    html += `<div class="ni" id="ni_${p.id}" onclick="goTo('${p.id}')"><i class="fas ${p.icon} ico"></i>${p.label}</div>`;
  });
  html += `<div class="nav-lbl">أخرى</div>
    <div class="ni" onclick="doLogout()"><i class="fas fa-sign-out-alt ico"></i>تسجيل الخروج</div>`;
  document.getElementById('navEl').innerHTML = html;

  const btm = pages.filter(p => p.btm);
  document.getElementById('bnav').innerHTML = btm.map(p =>
    `<div class="bni" id="bni_${p.id}" onclick="goTo('${p.id}')"><i class="fas ${p.icon}"></i>${p.label}</div>`
  ).join('');
}

function goTo(page) {
  closeSidebar();
  document.querySelectorAll('.ni').forEach(el  => el.classList.remove('on'));
  document.querySelectorAll('.bni').forEach(el => el.classList.remove('on'));
  document.getElementById(`ni_${page}`)?.classList.add('on');
  document.getElementById(`bni_${page}`)?.classList.add('on');
  const def = getNav().find(p => p.id === page);
  document.getElementById('tbTitle').textContent = def?.label || '';
  renderPage(page);
}

function renderPage(pg) {
  pageFadeIn();
  const el = document.getElementById('pcon');
  if (ROLE === 'office') {
    if (pg === 'home')       return pgOfficeHome(el);
    if (pg === 'myjobs')     return pgOfficeJobs(el);
    if (pg === 'candidates') return pgCandidates(el);
    if (pg === 'pipeline')   return pgPipeline(el);
    if (pg === 'profile')    return pgOfficeProfile(el);
  }
  if (ROLE === 'admin') {
    if (pg === 'home')        return pgAdminHome(el);
    if (pg === 'alljobs')     return pgAdminJobs(el);
    if (pg === 'alloffices')  return pgAdminOffices(el);
    if (pg === 'allusers')    return pgAdminUsers(el);
    if (pg === 'settings')    return pgAdminSettings(el);
  }
  // seeker (default)
  if (pg === 'home')      return pgSeekerHome(el);
  if (pg === 'jobs')      return pgJobs(el);
  if (pg === 'myapps')    return pgMyApps(el);
  if (pg === 'cv')        { oMo('moCV'); buildCVModal(); return; }
  if (pg === 'interview') { oMo('moIV'); buildIVModal(); return; }
  if (pg === 'profile')   return pgSeekerProfile(el);
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
  document.getElementById('srole').textContent = ROLE === 'office' ? 'مكتب توظيف' : ROLE === 'admin' ? 'مدير النظام' : 'باحث عن عمل';
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
  goTo('home');
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
