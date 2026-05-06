// ╔══════════════════════════════════════════════════════╗
// ║  عفراء للتوظيف — auth.js                            ║
// ║  تسجيل الدخول / إنشاء حساب / الخروج + Onboarding   ║
// ╚══════════════════════════════════════════════════════╝

// ═══════════════════════════════════════════════
// Landing — شاشة البداية
// ═══════════════════════════════════════════════

function showAuth() {
  document.getElementById('app').style.display        = 'none';
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  mainSwitchTab('login');
}

function initApp() {
  document.getElementById('app').style.display        = 'none';
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('onboarding').style.display = 'block';
  loadLandingJobs();
  animateLandingCounters();
  initLandingScrollAnim();
}

function initLandingScrollAnim() {
  const ob = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        ob.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  // نطبق الأنيميشن على أقسام الـ landing عند التمرير
  const container = document.getElementById('onboarding');
  if (!container) return;
  container.querySelectorAll('.lnd-section, .lnd-how, .lnd-features-strip').forEach((sec, i) => {
    sec.style.opacity = '0';
    sec.style.transform = 'translateY(20px)';
    sec.style.transition = `opacity .45s ease ${i * .07}s, transform .45s ease ${i * .07}s`;
    ob.observe(sec);
  });
}

function _updateLandingCount(id, val, animate) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!animate) { el.textContent = val; return; }
}

function animateLandingCounters() {
  const targets = [
    { id: 'cnt-jobs',  to: 1000, prefix: '+' },
    { id: 'cnt-provs', to: 18,   prefix: ''  },
    { id: 'cnt-users', to: 5000, prefix: '+' },
  ];
  targets.forEach(({ id, to, prefix }, idx) => {
    const el = document.getElementById(id);
    if (!el) return;
    const delay = idx * 120;
    const dur   = 1600;
    setTimeout(() => {
      const t0 = performance.now();
      function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        const val = Math.round(eased * to);
        el.textContent = prefix + val.toLocaleString();
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          el.textContent = prefix + to.toLocaleString();
          el.classList.add('cnt-done');
        }
      }
      requestAnimationFrame(tick);
    }, delay);
  });
}

function landingChooseRole(role) {
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  mainSwitchTab('register');
  chooseRole(role);
}

function landingBrowse() {
  document.getElementById('onboarding').style.display = 'none';
  enterGuest();
}

function landingLogin() {
  document.getElementById('onboarding').style.display = 'none';
  document.getElementById('authScreen').style.display = 'flex';
  mainSwitchTab('login');
}

async function loadLandingJobs() {
  const el = document.getElementById('landingJobsList');
  if (!el) return;
  let jobs = [];
  if (window.db) {
    try {
      const snap = await window.db.collection('jobs')
        .where('status', '==', 'active')
        .orderBy('postedAt', 'desc')
        .limit(6)
        .get();
      jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // تحديث العداد بالعدد الحقيقي عبر count()
      try {
        const countSnap = await window.db.collection('jobs').where('status', '==', 'active').count().get();
        const total = countSnap.data().count;
        if (total > 0) _updateLandingCount('cnt-jobs', '+' + total, false);
      } catch(_) { /* count() غير متاح في بعض البيئات — نترك الأنيميشن */ }
    } catch(e) { console.warn('landingJobs:', e.message); }
  }
  if (!jobs.length) {
    el.innerHTML = `<div style="text-align:center;padding:28px 0;color:rgba(255,255,255,.3);font-size:13px">
      <i class="fas fa-briefcase" style="font-size:28px;display:block;margin-bottom:8px;opacity:.3"></i>
      لا توجد وظائف بعد
    </div>`;
    return;
  }
  el.innerHTML = jobs.map(j => {
    const sal = j.salary ? `${Number(j.salary).toLocaleString()} ${j.currency || 'IQD'}` : 'قابل للتفاوض';
    const types = { full:'دوام كامل', part:'دوام جزئي', remote:'عن بُعد', gig:'مهمة' };
    const colors = { full:'rgba(13,148,136,.25)', part:'rgba(245,158,11,.2)', remote:'rgba(59,130,246,.2)', gig:'rgba(139,92,246,.2)' };
    return `
    <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:14px 15px;cursor:pointer;transition:background .18s,transform .18s" onclick="landingBrowse()"
      onmouseenter="this.style.background='rgba(255,255,255,.07)';this.style.transform='translateY(-1px)'"
      onmouseleave="this.style.background='rgba(255,255,255,.04)';this.style.transform=''">
      <div style="display:flex;align-items:center;gap:11px">
        <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,var(--p),var(--pl));display:flex;align-items:center;justify-content:center;font-size:19px;flex-shrink:0">
          ${san(j.logo) || '🏢'}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${j.title || ''}</div>
          <div style="font-size:11px;color:rgba(255,255,255,.45);margin-top:2px">${j.company || ''} • ${j.province || ''}</div>
        </div>
        <div style="text-align:left;flex-shrink:0">
          <div style="font-size:11px;font-weight:800;color:var(--pl)">${sal}</div>
          <div style="margin-top:4px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:8px;background:${colors[j.type]||colors.full};color:rgba(255,255,255,.7)">${types[j.type]||'وظيفة'}</div>
        </div>
      </div>
    </div>`;
  }).join('');
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
    provider.setCustomParameters({ prompt: 'select_account' });
    // Redirect works on HTTP and restricted environments; popup preferred on HTTPS
    const isHttps = location.protocol === 'https:';
    let res;
    if (isHttps) {
      res = await window.auth.signInWithPopup(provider);
    } else {
      await window.auth.signInWithRedirect(provider);
      return; // redirect will reload the page; result handled by getRedirectResult below
    }
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
  } catch (e) {
    console.error('Google login error:', e.code, e.message);
    // If popup was blocked, fall back to redirect automatically
    if (e.code === 'auth/popup-blocked' || e.code === 'auth/popup-closed-by-user') {
      try {
        const provider2 = new firebase.auth.GoogleAuthProvider();
        provider2.setCustomParameters({ prompt: 'select_account' });
        await window.auth.signInWithRedirect(provider2);
        return;
      } catch (e2) { console.error('Redirect fallback error:', e2.code); }
    }
    notify('خطأ', fbErr(e.code), 'error');
  }
}

// ── معالجة نتيجة Redirect بعد العودة من Google ──
async function handleGoogleRedirect() {
  try {
    const res = await window.auth.getRedirectResult();
    if (!res || !res.user) return;
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
    }
  } catch (e) {
    console.error('Google redirect result error:', e.code, e.message);
    if (e.code !== 'auth/no-auth-event') notify('خطأ', fbErr(e.code), 'error');
  }
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
    showAuth();
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
    'auth/unauthorized-domain'   : 'النطاق غير مصرح به في Firebase — أضف afra-iq.com إلى الدومينات المصرح بها',
    'auth/operation-not-allowed' : 'تسجيل الدخول بـ Google غير مفعّل في Firebase',
    'auth/popup-blocked'         : 'النافذة المنبثقة محجوبة — سيتم التحويل إلى Google...',
    'auth/internal-error'        : 'خطأ داخلي، تحقق من إعدادات Firebase أو حاول مجدداً',
  };
  return m[c] || `حدث خطأ (${c || 'unknown'})، يرجى المحاولة مرة أخرى`;
}

// ── مراقب حالة المصادقة ──
if (!DEMO && typeof firebase !== 'undefined') {
  // معالجة نتيجة تسجيل الدخول بعد Redirect (HTTP env)
  handleGoogleRedirect().catch(() => {});

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

        // ترحيل المستخدمين من النظام القديم
        if (doc.exists) {
          const upd = {};
          // role: "user" → "seeker"
          if (!P.role || P.role === 'user') upd.role = 'seeker';
          // status: "approved" أو غائب → "active"
          if (!P.status || P.status === 'approved') upd.status = 'active';
          // avatar → photoURL
          if (P.avatar && !P.photoURL) upd.photoURL = P.avatar;
          if (Object.keys(upd).length) {
            try {
              await window.db.collection('users').doc(user.uid).update(upd);
              P = { ...P, ...upd };
              ROLE = P.role;
            } catch(e) { console.warn('profile migrate:', e.message); }
          }
        }
        // الأدمن يرى كل الوظائف — بقية الأدوار يرون النشطة فقط
        const jobsSnap = ROLE === 'admin'
          ? await window.db.collection('jobs').orderBy('postedAt', 'desc').limit(100).get()
          : await window.db.collection('jobs').where('status', '==', 'active').orderBy('postedAt', 'desc').limit(50).get();
        JOBS = jobsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (ROLE === 'seeker') {
          const asnap = await window.db.collection('applications').where('applicantId', '==', user.uid).orderBy('appliedAt', 'desc').get();
          MY_APPS = asnap.docs.map(d => ({ id: d.id, ...d.data() }));
        }

        if (ROLE === 'office' || ROLE === 'employer') {
          // تحميل وظائف المكتب/صاحب العمل المتوقفة أيضاً
          try {
            const pausedSnap = await window.db.collection('jobs')
              .where('postedBy', '==', user.uid)
              .where('status', '==', 'paused').get();
            const pausedJobs = pausedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const existingIds = new Set(JOBS.map(j => j.id));
            pausedJobs.forEach(j => { if (!existingIds.has(j.id)) JOBS.push(j); });
          } catch (_) {}

          const myJobIds = JOBS.filter(j => j.postedBy === user.uid).map(j => j.id);
          if (myJobIds.length > 0) {
            try {
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
