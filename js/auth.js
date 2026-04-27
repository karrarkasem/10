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
    mainSwitchTab('login');
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
  mainSwitchTab('login');
}

// ═══════════════════════════════════════════════
// اختيار الدور قبل التسجيل/الدخول
// ═══════════════════════════════════════════════
// التبديل بين تسجيل الدخول والتسجيل الجديد (التابات الرئيسية)
function mainSwitchTab(tab) {
  const isLogin = tab === 'login';
  const tl = document.getElementById('mainTab_login');
  const tr = document.getElementById('mainTab_reg');
  const sl = document.getElementById('screenLogin');
  const sw = document.getElementById('screenWho');

  if (tl) {
    tl.style.background = isLogin ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.07)';
    tl.style.borderColor = isLogin ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.2)';
  }
  if (tr) {
    tr.style.background = isLogin ? 'rgba(255,255,255,.07)' : 'linear-gradient(135deg,var(--p),#6d28d9)';
    tr.style.boxShadow  = isLogin ? 'none' : '0 4px 15px rgba(13,148,136,.4)';
    tr.style.borderColor = isLogin ? 'rgba(255,255,255,.2)' : 'transparent';
  }
  if (sl) sl.style.display = isLogin ? 'block' : 'none';
  if (sw) sw.style.display = isLogin ? 'none'  : 'block';

  // إذا رجعنا للدخول، نخفي نموذج التسجيل
  if (isLogin) {
    const sa = document.getElementById('screenAuth');
    const ws = document.getElementById('whoStep');
    if (sa) sa.style.display = 'none';
    if (ws) ws.style.display = 'block';
  }
}

function chooseRole(role) {
  SEL_ROLE = role;
  document.getElementById('whoStep').style.display    = 'none';
  document.getElementById('screenAuth').style.display = 'block';
  pickRole(role);
}

function backToWho() {
  document.getElementById('screenAuth').style.display = 'none';
  document.getElementById('whoStep').style.display    = 'block';
}

// تشغيل عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', initApp);

function switchAuth(m) {
  mainSwitchTab(m === 'register' ? 'register' : 'login');
}

function pickRole(r) {
  SEL_ROLE = r;
  const rs = document.getElementById('r_seeker');
  const ro = document.getElementById('r_office');
  if (rs) rs.classList.toggle('on', r === 'seeker');
  if (ro) ro.classList.toggle('on', r === 'office');
  const offF = document.getElementById('officeF');
  if (offF) offF.style.display = r === 'office' ? 'block' : 'none';
  const empF = document.getElementById('employerF');
  if (empF) empF.style.display = r === 'employer' ? 'block' : 'none';
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
  if (!/^07[3-9]\d{8}$/.test(phone.replace(/\s/g,''))) { showErr('rerr', 'رقم الهاتف يجب أن يكون عراقياً صحيحاً (07XXXXXXXXX)'); return; }
  if (pass.length < 8) { showErr('rerr', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
  if (SEL_ROLE === 'employer') {
    const empName = document.getElementById('remp_name')?.value.trim();
    const empType = document.getElementById('remp_type')?.value;
    if (!empName || !empType) { showErr('rerr', 'أدخل اسم الشركة ونوع النشاط التجاري'); return; }
  }
  if (DEMO) { enterDemo(); return; }
  loading('regBtn', true);
  try {
    const cred = await window.auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    const offN = SEL_ROLE === 'office'   ? document.getElementById('ron')?.value.trim()         : null;
    const offL = SEL_ROLE === 'office'   ? document.getElementById('ron_license')?.value.trim() : null;
    const empN = SEL_ROLE === 'employer' ? document.getElementById('remp_name')?.value.trim()   : null;
    const empT = SEL_ROLE === 'employer' ? document.getElementById('remp_type')?.value          : null;

    // فحص الدعوة من الأدمن
    let assignedRole = SEL_ROLE;
    try {
      const invDoc = await window.db.collection('invites').doc(email.toLowerCase()).get();
      if (invDoc.exists && !invDoc.data().used) {
        assignedRole = invDoc.data().role || SEL_ROLE;
        await window.db.collection('invites').doc(email.toLowerCase()).update({ used: true, usedAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
    } catch(_) {}

    await window.db.collection('users').doc(cred.user.uid).set({
      name, phone, province: prov, email,
      role: assignedRole,
      officeName:    offN || null,
      licenseNum:    offL || null,
      companyName:   empN || null,
      businessType:  empT || null,
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
      const gEmail = (res.user.email || '').toLowerCase();
      let gRole = SEL_ROLE || 'seeker';
      try {
        const invDoc = await window.db.collection('invites').doc(gEmail).get();
        if (invDoc.exists && !invDoc.data().used) {
          gRole = invDoc.data().role || gRole;
          await window.db.collection('invites').doc(gEmail).update({ used: true, usedAt: firebase.firestore.FieldValue.serverTimestamp() });
        }
      } catch(_) {}
      await window.db.collection('users').doc(uid).set({
        name: res.user.displayName || 'مستخدم',
        email: res.user.email,
        photoURL: res.user.photoURL || null,
        role: gRole,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        status: 'active',
      });
    } else {
      // ترحيل المستخدمين القدامى
      const d = doc.data();
      const upd = {};
      if (!d.role)     upd.role     = SEL_ROLE || 'seeker';
      if (!d.status)   upd.status   = 'active';
      // توحيد حقل الصورة: avatar → photoURL
      if (d.avatar && !d.photoURL) upd.photoURL = d.avatar;
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
  const isGuest = U?.isAnonymous;
  const run = async () => {
    if (!DEMO && window.auth) await window.auth.signOut();
    U = null; P = null; ROLE = null;
    document.getElementById('app').style.display        = 'none';
    document.getElementById('authScreen').style.display = 'flex';
    mainSwitchTab('login');
    SEL_ROLE = 'seeker';
    if (!isGuest) notify('وداعاً!', 'تم تسجيل الخروج بنجاح', 'info');
  };
  if (isGuest) { await run(); } else { confirm2('تسجيل الخروج', 'هل تريد تسجيل الخروج من الحساب؟', run); }
}

// ── وضع تجريبي — محذوف (يتطلب تسجيل حقيقي) ──
function enterDemo() {
  notify('تنبيه', 'الوضع التجريبي غير متاح. سجّل حساباً مجانياً للبدء!', 'warning');
}

// ── تصفح كضيف (مجهول) ──
async function enterGuest() {
  if (DEMO || typeof firebase === 'undefined') {
    notify('تنبيه', 'التصفح كضيف يتطلب اتصالاً بالإنترنت', 'warning');
    return;
  }
  try {
    await window.auth.signInAnonymously();
    // onAuthStateChanged يتولى الباقي
  } catch (e) {
    notify('خطأ', 'تعذّر التصفح كضيف، حاول لاحقاً', 'error');
  }
}

// ── ترجمة أخطاء Firebase ──
function fbErr(c) {
  const m = {
    'auth/user-not-found'        : 'البريد الإلكتروني غير مسجل في المنصة',
    'auth/wrong-password'        : 'كلمة المرور غير صحيحة',
    'auth/invalid-credential'    : 'البريد أو كلمة المرور غير صحيحة',
    'auth/email-already-in-use'  : 'البريد الإلكتروني مستخدم مسبقاً',
    'auth/invalid-email'         : 'البريد الإلكتروني غير صالح',
    'auth/weak-password'         : 'كلمة المرور ضعيفة جداً — استخدم 8 أحرف على الأقل',
    'auth/too-many-requests'     : 'محاولات كثيرة، حاول لاحقاً',
    'auth/network-request-failed': 'خطأ في الشبكة، تحقق من اتصالك',
    'auth/popup-closed-by-user'  : 'أُغلقت نافذة تسجيل الدخول، حاول مرة أخرى',
    'auth/cancelled-popup-request': 'تم إلغاء تسجيل الدخول',
    'auth/account-exists-with-different-credential': 'البريد مرتبط بطريقة تسجيل دخول أخرى',
  };
  return m[c] || 'حدث خطأ، يرجى المحاولة مرة أخرى';
}

// ── مراقب حالة المصادقة ──
if (!DEMO && typeof firebase !== 'undefined') {
  firebase.auth().onAuthStateChanged(async user => {
    if (user) {
      U = user;

      // ── ضيف مجهول ──
      if (user.isAnonymous) {
        ROLE = 'guest';
        P    = { name: 'زائر', role: 'guest' };
        try {
          const snap = await window.db.collection('jobs').where('status', '==', 'active').orderBy('postedAt', 'desc').limit(50).get();
          JOBS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (_) { JOBS = []; }
        bootApp();
        return;
      }

      try {
        const doc = await window.db.collection('users').doc(user.uid).get();
        P    = doc.exists ? doc.data() : { name: user.displayName || 'مستخدم', role: 'seeker', email: user.email };
        ROLE = P.role || 'seeker';
        // ترحيل المستخدمين القدامى الذين ليس لديهم role أو status
        if (doc.exists && (!P.role || !P.status)) {
          const upd = {};
          if (!P.role)   upd.role   = 'seeker';
          if (!P.status) upd.status = 'active';
          try { await window.db.collection('users').doc(user.uid).update(upd); P = { ...P, ...upd }; ROLE = P.role; } catch(e) { console.warn('profile migrate:', e.message); }
        }
        const snap = await window.db.collection('jobs').where('status', '==', 'active').orderBy('postedAt', 'desc').limit(50).get();
        JOBS = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (ROLE === 'seeker') {
          const asnap = await window.db.collection('applications').where('applicantId', '==', user.uid).orderBy('appliedAt', 'desc').get();
          MY_APPS = asnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        if (ROLE === 'office') {
          const myJobIds = JOBS.filter(j => j.postedBy === user.uid).map(j => j.id);
          if (myJobIds.length > 0) {
            try {
              // Firestore 'in' يدعم 10 عناصر كحد أقصى — نقسّم على دُفعات
              const chunks = [];
              for (let i = 0; i < myJobIds.length; i += 10) chunks.push(myJobIds.slice(i, i + 10));
              const snaps = await Promise.all(chunks.map(c =>
                window.db.collection('applications').where('jobId', 'in', c).get()
              ));
              OFFICE_APPS = snaps.flatMap(s => s.docs.map(d => ({ id: d.id, ...d.data() })))
                .sort((a, b) => {
                  const ta = a.appliedAt?.toMillis?.() || new Date(a.appliedAt).getTime() || 0;
                  const tb = b.appliedAt?.toMillis?.() || new Date(b.appliedAt).getTime() || 0;
                  return tb - ta;
                });
            } catch (_) { OFFICE_APPS = []; }
          }
        }

        await loadContactCampaigns();
        bootApp();
      } catch (e) { console.error(e); JOBS = []; bootApp(); }
    }
  });
}
