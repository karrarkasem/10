// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — auth.js                          ║
// ║  تسجيل الدخول / إنشاء حساب / الخروج + Onboarding   ║
// ╚══════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════
// Onboarding — يظهر مرة واحدة للمستخدم الجديد
// ═══════════════════════════════════════════════
let obCurrent = 0;
const OB_TOTAL = 3;

function initApp() {
  const seen = localStorage.getItem('fanoos_onboarded');
  if (!seen) {
    document.getElementById('onboarding').style.display = 'flex';
  } else {
    document.getElementById('authScreen').style.display = 'flex';
  }
}

function obNext() {
  obCurrent++;
  for (let i = 0; i < OB_TOTAL; i++) {
    document.getElementById('obs' + i).style.display = i === obCurrent ? 'block' : 'none';
    const dot = document.getElementById('od' + i);
    if (dot) {
      dot.style.width   = i === obCurrent ? '22px' : '6px';
      dot.style.background = i === obCurrent ? '#fff' : 'rgba(255,255,255,.3)';
    }
  }
  if (obCurrent >= OB_TOTAL - 1) {
    document.getElementById('obNextBtn').style.display  = 'none';
    document.getElementById('obStartBtn').style.display = 'block';
  }
}

function skipOnboarding() {
  localStorage.setItem('fanoos_onboarded', '1');
  document.getElementById('onboarding').style.display  = 'none';
  document.getElementById('authScreen').style.display  = 'flex';
}

// ═══════════════════════════════════════════════
// اختيار الدور قبل التسجيل/الدخول
// ═══════════════════════════════════════════════
function chooseRole(role) {
  SEL_ROLE = role;
  document.getElementById('screenWho').style.display  = 'none';
  document.getElementById('screenAuth').style.display = 'block';
  // عرض نموذج التسجيل مباشرة للمستخدم الجديد
  pickRole(role);
}

function backToWho() {
  document.getElementById('screenAuth').style.display = 'none';
  document.getElementById('screenWho').style.display  = 'block';
}

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);

function switchAuth(m) {
  const show = m === 'login' ? 'formLogin' : 'formReg';
  const hide = m === 'login' ? 'formReg'   : 'formLogin';
  document.getElementById(show).style.display = 'block';
  document.getElementById(hide).style.display = 'none';
  document.getElementById('atab_login').classList.toggle('on', m === 'login');
  document.getElementById('atab_reg').classList.toggle('on',   m === 'register');
}

function pickRole(r) {
  SEL_ROLE = r;
  const rs = document.getElementById('r_seeker');
  const ro = document.getElementById('r_office');
  if (rs) rs.classList.toggle('on', r === 'seeker');
  if (ro) ro.classList.toggle('on', r === 'office');
  const offF = document.getElementById('officeF');
  if (offF) offF.style.display = r === 'office' ? 'block' : 'none';
}

function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.innerHTML = inp.type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
}

// ── دخول بالإيميل ──
async function doLogin() {
  hideErr('lerr');
  const e = document.getElementById('le').value.trim();
  const p = document.getElementById('lp').value;
  if (!e || !p) { showErr('lerr', 'أدخل البريد وكلمة المرور'); return; }
  if (DEMO) { enterDemo(); return; }
  loading('loginBtn', true);
  try {
    await window.auth.signInWithEmailAndPassword(e, p);
  } catch (err) {
    loading('loginBtn', false);
    showErr('lerr', fbErr(err.code));
  }
}

// ── تسجيل حساب جديد ──
async function doRegister() {
  hideErr('rerr');
  const name  = document.getElementById('rn').value.trim();
  const phone = document.getElementById('rph').value.trim();
  const prov  = document.getElementById('rprov').value;
  const email = document.getElementById('re').value.trim();
  const pass  = document.getElementById('rp2').value;
  if (!name || !phone || !prov || !email || !pass) { showErr('rerr', 'أكمل جميع الحقول المطلوبة'); return; }
  if (pass.length < 8) { showErr('rerr', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
  if (DEMO) { enterDemo(); return; }
  loading('regBtn', true);
  try {
    const cred = await window.auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    const offN = SEL_ROLE === 'office' ? document.getElementById('ron').value.trim() : null;
    await window.db.collection('users').doc(cred.user.uid).set({
      name, phone, province: prov, email,
      role: SEL_ROLE, officeName: offN || null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'active',
    });
  } catch (err) {
    loading('regBtn', false);
    showErr('rerr', fbErr(err.code));
  }
}

// ── دخول بـ Google ──
async function doGoogleLogin() {
  if (DEMO) { enterDemo(); return; }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const res = await window.auth.signInWithPopup(provider);
    const uid = res.user.uid;
    const doc = await window.db.collection('users').doc(uid).get();
    if (!doc.exists) {
      await window.db.collection('users').doc(uid).set({
        name: res.user.displayName || 'مستخدم',
        email: res.user.email,
        photoURL: res.user.photoURL || null,
        role: SEL_ROLE || 'seeker',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'active',
      });
    } else {
      // ترحيل المستخدمين القدامى
      const d = doc.data();
      const upd = {};
      if (!d.role)   upd.role   = SEL_ROLE || 'seeker';
      if (!d.status) upd.status = 'active';
      if (Object.keys(upd).length) await window.db.collection('users').doc(uid).update(upd);
    }
  } catch (e) { notify('خطأ', 'فشل تسجيل الدخول بـ Google', 'error'); }
}

// ── نسيت كلمة المرور ──
async function forgotPass() {
  const e = document.getElementById('le').value.trim();
  if (!e) { showErr('lerr', 'أدخل بريدك الإلكتروني أولاً'); return; }
  if (DEMO) { notify('تجريبي', 'هذه الميزة تتطلب Firebase حقيقي', 'info'); return; }
  try {
    await window.auth.sendPasswordResetEmail(e);
    notify('تم الإرسال ✅', 'تحقق من بريدك لإعادة تعيين كلمة المرور', 'success');
  } catch (e) { showErr('lerr', fbErr(e.code)); }
}

// ── تسجيل الخروج ──
async function doLogout() {
  confirm2('تسجيل الخروج', 'هل تريد تسجيل الخروج من الحساب؟', async () => {
    if (!DEMO && window.auth) await window.auth.signOut();
    U = null; P = null; ROLE = null;
    document.getElementById('app').style.display        = 'none';
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('screenWho').style.display  = 'block';
    document.getElementById('screenAuth').style.display = 'none';
    SEL_ROLE = 'seeker';
    notify('وداعاً!', 'تم تسجيل الخروج بنجاح', 'info');
  });
}

// ── وضع تجريبي ──
function enterDemo() {
  U    = { uid:'demo', email:'demo@fanoos.iq', displayName:'مستخدم تجريبي' };
  P    = { name:'أحمد محمد', role: SEL_ROLE || 'seeker', province:'كربلاء', phone:'07712345678', email:'demo@fanoos.iq', status:'active' };
  ROLE = SEL_ROLE || 'seeker';
  JOBS    = [...DEMO_JOBS];
  MY_APPS = ROLE === 'seeker' ? [...DEMO_APPS.slice(0, 2)] : [];
  bootApp();
}

// ── ترجمة أخطاء Firebase ──
function fbErr(c) {
  const m = {
    'auth/user-not-found'      : 'البريد الإلكتروني غير مسجل',
    'auth/wrong-password'      : 'كلمة المرور غير صحيحة',
    'auth/email-already-in-use': 'البريد الإلكتروني مستخدم مسبقاً',
    'auth/invalid-email'       : 'البريد الإلكتروني غير صالح',
    'auth/weak-password'       : 'كلمة المرور ضعيفة جداً',
    'auth/too-many-requests'   : 'طلبات كثيرة، حاول لاحقاً',
    'auth/network-request-failed': 'خطأ في الشبكة',
  };
  return m[c] || 'حدث خطأ، يرجى المحاولة مرة أخرى';
}

// ── مراقب حالة المصادقة ──
if (!DEMO && typeof firebase !== 'undefined') {
  firebase.auth().onAuthStateChanged(async user => {
    if (user) {
      U = user;
      try {
        const doc = await window.db.collection('users').doc(user.uid).get();
        P    = doc.exists ? doc.data() : { name: user.displayName || 'مستخدم', role: 'seeker', email: user.email };
        ROLE = P.role || 'seeker';
        // ترحيل المستخدمين القدامى الذين ليس لديهم role أو status
        if (doc.exists && (!P.role || !P.status)) {
          const upd = {};
          if (!P.role)   upd.role   = 'seeker';
          if (!P.status) upd.status = 'active';
          try { await window.db.collection('users').doc(user.uid).update(upd); P = { ...P, ...upd }; ROLE = P.role; } catch(_) {}
        }
        const snap = await window.db.collection('jobs').where('status', '==', 'active').orderBy('postedAt', 'desc').limit(50).get();
        JOBS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (ROLE === 'seeker') {
          const asnap = await window.db.collection('applications').where('applicantId', '==', user.uid).orderBy('appliedAt', 'desc').get();
          MY_APPS = asnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        bootApp();
      } catch (e) { console.error(e); JOBS = DEMO_JOBS; bootApp(); }
    }
  });
}
