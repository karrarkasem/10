// ╔══════════════════════════════════════════════════════╗
// ║  عفراء للتوظيف — profile.js                         ║
// ║  صفحة الملف الشخصي للباحث                          ║
// ╚══════════════════════════════════════════════════════╝

function pgSeekerProfile(el) {
  const p   = P;
  const pct = getCompletion(p, 'seeker');
  const pc  = completionColor(pct);
  el.innerHTML = `
    <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-user"></i></div>حسابي الشخصي</div></div>
    <div class="card" style="margin-bottom:14px">
      <div class="prof-banner"></div>
      <!-- الأفاتار خارج البانر لتجنب قصّه بـ overflow:hidden -->
      <div style="position:relative;height:50px">
        <div style="position:absolute;top:-40px;right:20px;z-index:3">
          <div style="position:relative;display:inline-block;cursor:pointer" onclick="triggerAvatarUpload()" title="تغيير الصورة الشخصية">
            ${p?.photoURL
              ? `<img src="${p.photoURL}" class="av avxl" style="object-fit:cover;border:3px solid var(--bgc);box-shadow:var(--shxl)">`
              : `<div class="av avxl" style="background:var(--grad-p);color:#fff;font-size:28px;font-weight:900;border:3px solid var(--bgc);box-shadow:var(--shxl)">${p?.name?.charAt(0)||'م'}</div>`}
            <div style="position:absolute;bottom:2px;left:2px;width:24px;height:24px;background:var(--p);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid var(--bgc)">
              <i class="fas fa-camera" style="color:#fff;font-size:10px"></i>
            </div>
          </div>
          <input type="file" id="avatarInput" accept="image/*" style="display:none" onchange="uploadAvatar(this.files[0])">
        </div>
      </div>
      <div class="cp" style="padding-top:0">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px">
          <div>
            <div style="font-size:19px;font-weight:900;color:var(--tx)">${p?.name||'مستخدم'}</div>
            <div style="font-size:12px;color:var(--tx2);margin-top:2px">
              ${p?.jobTitle ? '<i class="fas fa-briefcase" style="color:var(--p)"></i> ' + p.jobTitle : ''}
              ${p?.province ? ' • <i class="fas fa-map-marker-alt" style="color:var(--tx3)"></i> ' + p.province : ''}
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:7px;align-items:center">
              <span class="b b-tl"><i class="fas fa-user"></i>باحث عن عمل</span>
              ${p?.verified
                ? '<span class="admin-verified-badge"><i class="fas fa-shield-alt"></i>موثّق من الأدمن</span>'
                : (()=>{ const hasIV=(p?.ivScore||0)>=60; const hasCV=!!(p?.cvUrl||p?.cvBuilt); return pct>=80&&hasIV&&hasCV ? '<span class="verified-badge"><i class="fas fa-certificate"></i>موثّق وجاهز</span>' : ''; })()
              }
            </div>
          </div>
          <div style="text-align:left">
            <div style="font-size:24px;font-weight:900;color:${pc}">${pct}%</div>
            <div style="font-size:10px;color:var(--tx3)">اكتمال الملف</div>
          </div>
        </div>
        <div style="margin-bottom:20px">
          <div class="comp-bar-wrap" style="height:8px"><div class="comp-bar" style="--w:${pct}%;background:${pc}"></div></div>
          <div style="font-size:11px;color:var(--tx3);margin-top:5px">${pct<100 ? 'أكمل ملفك للوصول إلى 100% وزيادة فرصك' : '✅ ملفك مكتمل بالكامل'}</div>
        </div>
        <!-- حالة التوفر للعمل -->
        <div class="availability-toggle-card">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:800;color:var(--tx)"><i class="fas fa-circle" style="color:${p?.seekerAvailable?'var(--success)':'var(--tx3)'}"></i> ${p?.seekerAvailable ? 'أنت متاح للعمل الآن' : 'غير متاح للعمل حالياً'}</div>
            <div style="font-size:11px;color:var(--tx3);margin-top:3px">${p?.seekerAvailable ? 'ملفك مرئي للمكاتب وأصحاب العمل' : 'فعّل لتظهر في نتائج البحث'}</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="seekerAvailableToggle" ${p?.seekerAvailable ? 'checked' : ''} onchange="toggleSeekerAvailability(this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>

        <!-- خطوات التوثيق -->
        ${(() => {
          const hasIV  = (p?.ivScore||0) >= 60;
          const hasCV  = !!(p?.cvUrl || p?.cvBuilt);
          const allDone = pct >= 80 && hasIV && hasCV;
          const steps = [
            { ok: pct >= 80,   label: 'الملف الشخصي مكتمل (80%+)',  dest: 'profile',   ico: 'fa-user-check' },
            { ok: hasIV,       label: 'اجتاز المقابلة الافتراضية',  dest: 'interview', ico: 'fa-comments'   },
            { ok: hasCV,       label: 'سيرة ذاتية مرفوعة أو منشأة', dest: 'cv',        ico: 'fa-file-alt'   },
            { ok: !!p?.verified, label: p?.verified ? 'موثّق من الأدمن ✅' : (p?.verificationRequested ? 'قيد المراجعة من الأدمن...' : 'توثيق الأدمن'), dest: null, ico: 'fa-shield-alt' },
          ];
          return `<div class="readiness-steps">
            ${steps.map(s => `<div class="readiness-step ${s.ok?'ok':''}">
              <i class="fas ${s.ok?'fa-check-circle':s.ico==='fa-shield-alt'&&p?.verificationRequested?'fa-clock':'fa-circle'} step-ico" ${s.ok?'':'style="color:var(--tx3)"'}></i>
              <span>${s.label}</span>
              ${!s.ok && s.dest ? `<button class="btn bsm" style="margin-right:auto;font-size:10px;padding:3px 9px;background:var(--bgc2);border:1px solid var(--br)" onclick="goTo('${s.dest}')">أكمل</button>` : ''}
              ${!s.ok && !s.dest && allDone && !p?.verificationRequested ? `<button class="btn bsm" style="margin-right:auto;font-size:10px;padding:3px 10px;background:linear-gradient(135deg,var(--p),var(--pd));color:#fff;border:none" onclick="requestSeekerVerification()"><i class="fas fa-paper-plane"></i>اطلب</button>` : ''}
            </div>`).join('')}
          </div>`;
        })()}

        <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:14px;display:flex;align-items:center;gap:6px"><i class="fas fa-pencil-alt" style="color:var(--p)"></i>تعديل المعلومات</div>
        <div class="fr">
          <div class="fg"><label class="fl req">الاسم الكامل</label><input type="text" id="en" class="fc" value="${p?.name||''}"></div>
          <div class="fg"><label class="fl req">رقم الهاتف</label><input type="tel" id="eph" class="fc" value="${p?.phone||''}" placeholder="07X XXXX XXXX"></div>
        </div>
        <div class="fr">
          <div class="fg"><label class="fl req">المحافظة</label>
            <select id="eprov" class="fc">${PROVS.map(v=>'<option ' + (p?.province===v?'selected':'') + '>' + v + '</option>').join('')}</select>
          </div>
          <div class="fg"><label class="fl req">المسمى الوظيفي</label><input type="text" id="ejt" class="fc" value="${p?.jobTitle||''}" placeholder="مبرمج ويب، محاسب..."></div>
        </div>
        <div class="fg">
          <label class="fl req">نبذة شخصية</label>
          <textarea id="ebio" class="fc" rows="3" placeholder="اكتب نبذة مختصرة عن خبرتك...">${p?.bio||''}</textarea>
          <div class="fh">تظهر للمكاتب عند مراجعة ملفك</div>
        </div>
        <div class="save-bar">
          <button class="btn bp bfu" onclick="saveProfile()" style="flex:1;max-width:320px"><i class="fas fa-save"></i>حفظ التغييرات</button>
        </div>
      </div>
    </div>

    ${MY_APPS.length ? `
    <div class="card" style="margin-bottom:14px">
      <div class="ch"><div class="cht"><i class="fas fa-clipboard-list" style="color:var(--p)"></i> آخر طلباتي</div><button class="btn bg bsm" onclick="goTo('myapps')">الكل <i class="fas fa-arrow-left"></i></button></div>
      <div class="cp">${MY_APPS.slice(0,3).map(a => {
        const s = STAT[a.status]||STAT.pending;
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--br)"><div><div style="font-size:13px;font-weight:700;color:var(--tx)">' + a.jobTitle + '</div><div style="font-size:11px;color:var(--tx3)">' + a.company + ' • ' + (a.appliedAt||'').slice(0,10) + '</div></div><span class="b ' + s.c + '"><i class="fas ' + s.ico + '"></i>' + s.l + '</span></div>';
      }).join('')}
      ${MY_APPS.length>3 ? '<div style="text-align:center;padding-top:10px"><button class="btn bg bsm" onclick="goTo(\'myapps\')">عرض الكل (' + MY_APPS.length + ')</button></div>' : ''}
      </div>
    </div>` : `
    <div class="card cp" style="margin-bottom:14px;text-align:center">
      <div style="font-size:32px;margin-bottom:8px;opacity:.4">📋</div>
      <div style="font-size:13px;font-weight:700;color:var(--tx)">لم تتقدم لأي وظيفة بعد</div>
      <button class="btn bp bsm" style="margin-top:10px" onclick="goTo('jobs')"><i class="fas fa-search"></i>تصفح الوظائف</button>
    </div>`}

    <div class="card cp">
      <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:12px"><i class="fas fa-shield-alt" style="color:var(--danger)"></i> الأمان</div>
      <div style="font-size:12px;color:var(--tx2);margin-bottom:12px"><i class="fas fa-envelope" style="color:var(--tx3)"></i> ${p?.email||U?.email||'—'}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn bo bsm" onclick="showChangePwForm()"><i class="fas fa-key"></i>تغيير كلمة المرور</button>
        <button class="btn bda bsm" onclick="doLogout()"><i class="fas fa-sign-out-alt"></i>تسجيل الخروج</button>
      </div>
      <div id="changePwSection" style="display:none;margin-top:14px">
        <div style="border-top:1px solid var(--br);margin-bottom:14px"></div>
        <div style="font-size:12px;font-weight:800;color:var(--tx);margin-bottom:10px"><i class="fas fa-lock" style="color:var(--p)"></i> تغيير كلمة المرور</div>
        <div class="fg">
          <label class="fl req">كلمة المرور الحالية</label>
          <div class="ig">
            <input type="password" id="pw_curr" class="fc" placeholder="كلمة المرور الحالية">
            <button class="btn bo bsm" onclick="togglePw('pw_curr',this)"><i class="fas fa-eye"></i></button>
          </div>
        </div>
        <div class="fg">
          <label class="fl req">كلمة المرور الجديدة</label>
          <div class="ig">
            <input type="password" id="pw_new" class="fc" placeholder="8 أحرف على الأقل">
            <button class="btn bo bsm" onclick="togglePw('pw_new',this)"><i class="fas fa-eye"></i></button>
          </div>
        </div>
        <div class="fg">
          <label class="fl req">تأكيد كلمة المرور الجديدة</label>
          <input type="password" id="pw_conf" class="fc" placeholder="أعد كتابة كلمة المرور">
          <div id="pw_err" class="err-msg"></div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn bp bsm" id="pwSaveBtn" onclick="doChangePassword()"><i class="fas fa-save"></i>حفظ</button>
          <button class="btn bg bsm" onclick="document.getElementById('changePwSection').style.display='none'">إلغاء</button>
        </div>
      </div>
    </div>`;
}

function showChangePwForm() {
  const sec = document.getElementById('changePwSection');
  if (sec) sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
}

async function doChangePassword() {
  const curr = document.getElementById('pw_curr')?.value || '';
  const nw   = document.getElementById('pw_new')?.value  || '';
  const conf = document.getElementById('pw_conf')?.value || '';
  const err  = document.getElementById('pw_err');

  if (err) { err.style.display = 'none'; err.textContent = ''; }
  if (!curr || !nw || !conf) { notify('خطأ', 'يرجى ملء جميع الحقول', 'error'); return; }
  if (nw.length < 8) { if (err) { err.textContent = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'; err.style.display = 'block'; } return; }
  if (nw !== conf)   { if (err) { err.textContent = 'كلمة المرور الجديدة غير متطابقة'; err.style.display = 'block'; } return; }
  if (DEMO || !window.auth || !U) { notify('تنبيه', 'هذه الميزة تتطلب تسجيل دخول حقيقي', 'info'); return; }

  loading('pwSaveBtn', true);
  try {
    const cred = firebase.auth.EmailAuthProvider.credential(U.email, curr);
    await U.reauthenticateWithCredential(cred);
    await U.updatePassword(nw);
    notify('تم ✅', 'تم تغيير كلمة المرور بنجاح', 'success');
    document.getElementById('changePwSection').style.display = 'none';
    ['pw_curr','pw_new','pw_conf'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  } catch(e) {
    const msgs = {
      'auth/wrong-password'        : 'كلمة المرور الحالية غير صحيحة',
      'auth/invalid-credential'    : 'كلمة المرور الحالية غير صحيحة',
      'auth/too-many-requests'     : 'محاولات كثيرة جداً، حاول لاحقاً',
      'auth/requires-recent-login' : 'يرجى تسجيل الدخول مجدداً ثم المحاولة',
      'auth/network-request-failed': 'خطأ في الشبكة، تحقق من اتصالك',
    };
    const msg = msgs[e.code] || 'حدث خطأ، حاول مجدداً';
    if (err) { err.textContent = msg; err.style.display = 'block'; }
    notify('خطأ', msg, 'error');
  } finally { loading('pwSaveBtn', false); }
}

function triggerAvatarUpload() {
  document.getElementById('avatarInput')?.click();
}

async function uploadAvatar(file) {
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { notify('خطأ', 'الصورة أكبر من 5 ميغابايت', 'error'); return; }

  const key = CFG.imgbb?.key;
  if (!key) {
    notify('إعداد مطلوب', 'أدخل مفتاح ImgBB في الأدمن > الإعدادات أولاً', 'warning');
    return;
  }

  notify('جارٍ الرفع...', 'يرجى الانتظار', 'info');

  try {
    const fd = new FormData();
    fd.append('image', file);
    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, { method: 'POST', body: fd });
    const json = await res.json();
    if (!json.success) throw new Error('upload failed');

    const url = json.data.url;
    if (!DEMO && window.db && U) {
      await window.db.collection('users').doc(U.uid).update({ photoURL: url });
    }
    P = { ...P, photoURL: url };
    updateUserUI();
    notify('تم ✅', 'تم تحديث صورتك الشخصية', 'success');
    pgSeekerProfile(document.getElementById('pcon'));
  } catch(e) {
    notify('خطأ', 'فشل رفع الصورة، تحقق من مفتاح ImgBB', 'error');
  }
}

async function toggleSeekerAvailability(val) {
  P = { ...P, seekerAvailable: val };
  if (!DEMO && window.db && U) {
    try { await window.db.collection('users').doc(U.uid).update({ seekerAvailable: val }); }
    catch(e) { console.warn('toggleSeekerAvailability:', e.message); }
  }
  notify(val ? 'أنت متاح الآن ✅' : 'تم الإخفاء', val ? 'ملفك مرئي للمكاتب وأصحاب العمل' : 'ملفك مخفي عن نتائج البحث', val ? 'success' : 'info');
}

async function saveProfile() {
  const d = {
    name:     document.getElementById('en')?.value    || '',
    phone:    document.getElementById('eph')?.value   || '',
    province: document.getElementById('eprov')?.value || '',
    jobTitle: document.getElementById('ejt')?.value   || '',
    bio:      document.getElementById('ebio')?.value  || '',
  };
  if (!d.name) { notify('خطأ', 'يرجى إدخال اسمك الكامل', 'error'); return; }
  if (d.phone && !/^07[3-9]\d{8}$/.test(d.phone.replace(/\s/g,''))) { notify('خطأ', 'رقم الهاتف يجب أن يكون رقم عراقي صحيح (07XXXXXXXXX)', 'error'); return; }
  P = { ...P, ...d };
  if (!DEMO && window.db && U) {
    try { await window.db.collection('users').doc(U.uid).update(d); }
    catch(e) { notify('خطأ', 'فشل حفظ الملف الشخصي: ' + e.message, 'error'); return; }
  }
  updateUserUI();
  notify('تم الحفظ ✅', 'تم تحديث ملفك الشخصي بنجاح', 'success');
  setTimeout(() => pgSeekerProfile(document.getElementById('pcon')), 600);
}

async function requestSeekerVerification() {
  if (DEMO || !window.db || !U) return;
  if (P?.verificationRequested) { notify('تنبيه', 'طلبك قيد المراجعة بالفعل', 'info'); return; }
  try {
    await window.db.collection('users').doc(U.uid).update({
      verificationRequested: true,
      verificationRequestedAt: new Date().toISOString()
    });
    P = { ...P, verificationRequested: true };
    await notifyAdmin(
      `طلب توثيق باحث — ${P?.name||''}`,
      `<b>الباحث:</b> ${P?.name||''} (${U.email})<br><b>المحافظة:</b> ${P?.province||'—'}<br><b>المسمى:</b> ${P?.jobTitle||'—'}`,
      `✅ طلب توثيق باحث\nالاسم: ${P?.name||''}\nالبريد: ${U.email}\nالمحافظة: ${P?.province||'—'}`
    );
    notify('تم الإرسال ✅', 'طلبك وصل للأدمن وسيتم مراجعته قريباً', 'success');
    pgSeekerProfile(document.getElementById('pcon'));
  } catch(e) { notify('خطأ', e.message, 'error'); }
}
