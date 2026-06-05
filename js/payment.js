// ╔══════════════════════════════════════════════════════╗
// ║  عفراء للتوظيف — payment.js                         ║
// ║  نظام المحفظة والرصيد + عمولة التوظيف              ║
// ╚══════════════════════════════════════════════════════╝

// ── قراءة رصيد المستخدم الحالي ──
function getUserCredits() {
  if (ROLE === 'admin') return Infinity;
  return P?.credits || 0;
}

// ── هل المستخدم لا يزال في الفترة التجريبية؟ ──
function isInFreeTrial() {
  if (ROLE === 'admin') return false;
  const limit = CFG.pricing?.freeJobsLimit ?? 3;
  return (P?.freeJobsUsed || 0) < limit;
}

// ── فحص إمكانية نشر وظيفة (قبل النشر) ──
async function checkJobPostCredit() {
  if (ROLE === 'admin') return { ok: true };

  const freeLimit = CFG.pricing?.freeJobsLimit ?? 3;
  const freeUsed  = P?.freeJobsUsed || 0;

  // لا يزال في الفترة التجريبية المجانية
  if (freeUsed < freeLimit) {
    return { ok: true, free: true, remaining: freeLimit - freeUsed - 1 };
  }

  // فحص الرصيد
  const cost    = CFG.pricing?.jobPostCost ?? 2500;
  const balance = getUserCredits();

  if (balance < cost) {
    return { ok: false, cost, balance };
  }

  return { ok: true, cost, balance };
}

// ── تسجيل استخدام الوظيفة بعد النشر الناجح ──
async function afterJobPosted(jobId) {
  if (ROLE === 'admin' || DEMO || !window.db || !U) return;

  const freeLimit = CFG.pricing?.freeJobsLimit ?? 3;
  const freeUsed  = P?.freeJobsUsed || 0;

  if (freeUsed < freeLimit) {
    // استهلاك وحدة من الفترة التجريبية
    try {
      await window.db.collection('users').doc(U.uid).update({
        freeJobsUsed: firebase.firestore.FieldValue.increment(1),
      });
      P = { ...P, freeJobsUsed: freeUsed + 1 };
      const remaining = freeLimit - freeUsed - 1;
      if (remaining === 0) {
        notify('انتهت الفترة التجريبية', 'استخدمت كل وظائفك المجانية — الوظائف القادمة تتطلب رصيداً', 'info');
      } else {
        notify('وظيفة مجانية', `${remaining} ${remaining === 1 ? 'وظيفة' : 'وظائف'} مجانية متبقية`, 'info');
      }
    } catch(e) { console.warn('afterJobPosted freeUsed update:', e.message); }
  } else {
    // خصم رصيد مقابل نشر الوظيفة
    const cost = CFG.pricing?.jobPostCost ?? 2500;
    try {
      const newBalance = Math.max(0, (P?.credits || 0) - cost);
      await Promise.all([
        window.db.collection('users').doc(U.uid).update({
          credits: firebase.firestore.FieldValue.increment(-cost),
        }),
        window.db.collection('credits_log').add({
          userId      : U.uid,
          type        : 'job_post',
          amount      : -cost,
          balanceAfter: newBalance,
          description : 'نشر وظيفة',
          jobId       : jobId || null,
          createdAt   : firebase.firestore.FieldValue.serverTimestamp(),
        }),
      ]);
      P = { ...P, credits: newBalance };
      notify(
        'تم الخصم',
        `${cost.toLocaleString('ar-IQ')} IQD خُصمت — الرصيد المتبقي: ${newBalance.toLocaleString('ar-IQ')} IQD`,
        'info'
      );
    } catch(e) { console.warn('afterJobPosted deduct:', e.message); }
  }
}

// ── فحص عمولة التوظيف (للمكاتب فقط) ──
async function checkHireCommission() {
  if (ROLE !== 'office') return { ok: true };

  const cost    = CFG.pricing?.hireCost ?? 10000;
  const balance = getUserCredits();

  if (balance < cost) {
    return { ok: false, cost, balance };
  }

  return { ok: true, cost, balance };
}

// ── خصم عمولة التوظيف بعد تأكيد الحالة ──
async function afterHireConfirmed(applicationId) {
  if (ROLE !== 'office' || DEMO || !window.db || !U) return;

  const cost = CFG.pricing?.hireCost ?? 10000;
  try {
    const newBalance = Math.max(0, (P?.credits || 0) - cost);
    await Promise.all([
      window.db.collection('users').doc(U.uid).update({
        credits: firebase.firestore.FieldValue.increment(-cost),
      }),
      window.db.collection('credits_log').add({
        userId         : U.uid,
        type           : 'hire_commission',
        amount         : -cost,
        balanceAfter   : newBalance,
        description    : 'عمولة توظيف ناجح',
        applicationId  : applicationId || null,
        createdAt      : firebase.firestore.FieldValue.serverTimestamp(),
      }),
    ]);
    P = { ...P, credits: newBalance };
    notify(
      'عمولة التوظيف',
      `${cost.toLocaleString('ar-IQ')} IQD عمولة توظيف — الرصيد المتبقي: ${newBalance.toLocaleString('ar-IQ')} IQD`,
      'info'
    );
  } catch(e) { console.warn('afterHireConfirmed deduct:', e.message); }
}

// ─────────────────────────────────────
// نافذة شحن الرصيد
// ─────────────────────────────────────
function showRechargeModal(requiredAmount = 0) {
  const balance = getUserCredits();
  const jobCost = CFG.pricing?.jobPostCost || 2500;

  const packages = [
    { amount: 10000, desc: `${Math.floor(10000 / jobCost)} وظيفة` },
    { amount: 25000, desc: `${Math.floor(25000 / jobCost)} وظيفة` },
    { amount: 50000, desc: `${Math.floor(50000 / jobCost)} وظيفة` },
  ];

  let mo = document.getElementById('_rechargeModal');
  if (!mo) {
    mo = document.createElement('div');
    mo.id = '_rechargeModal';
    mo.className = 'mo';
    mo.onclick = e => { if (e.target === mo) cmo('_rechargeModal'); };
    mo.innerHTML = `<div class="md" style="max-width:440px">
      <div class="mh">
        <div class="mt" id="_rechModalTitle"></div>
        <div class="mc" onclick="cmo('_rechargeModal')"><i class="fas fa-times"></i></div>
      </div>
      <div class="mb" id="_rechModalBody"></div>
    </div>`;
    document.body.appendChild(mo);
  }

  document.getElementById('_rechModalTitle').innerHTML =
    '<i class="fas fa-wallet" style="color:var(--p);margin-left:6px"></i>شحن الرصيد';

  document.getElementById('_rechModalBody').innerHTML = `
    <!-- الرصيد الحالي -->
    <div style="background:var(--bgc2);border-radius:12px;padding:14px;margin-bottom:16px;text-align:center">
      <div style="font-size:11px;color:var(--tx3);margin-bottom:4px">رصيدك الحالي</div>
      <div style="font-size:24px;font-weight:900;color:${balance > 0 ? 'var(--success)' : 'var(--danger)'}">
        ${balance === Infinity ? '∞' : balance.toLocaleString('ar-IQ')} IQD
      </div>
      ${requiredAmount > 0 ? `<div style="font-size:11px;color:var(--am);margin-top:4px"><i class="fas fa-exclamation-circle"></i> تحتاج ${requiredAmount.toLocaleString('ar-IQ')} IQD</div>` : ''}
    </div>

    <!-- باقات الشحن السريعة -->
    <div style="font-size:12px;font-weight:800;color:var(--tx2);margin-bottom:10px">اختر مبلغ الشحن</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">
      ${packages.map(pkg => `
        <button id="pkg_${pkg.amount}"
          onclick="selectRechargePackage(${pkg.amount})"
          style="padding:12px 8px;text-align:center;cursor:pointer;border:2px solid var(--br);border-radius:12px;transition:all .18s;background:var(--bgc);font-family:Cairo,sans-serif">
          <div style="font-size:13px;font-weight:900;color:var(--p)">${pkg.amount.toLocaleString('ar-IQ')}</div>
          <div style="font-size:10px;color:var(--tx3)">IQD</div>
          <div style="font-size:9px;color:var(--tx3);margin-top:3px">${pkg.desc}</div>
        </button>
      `).join('')}
    </div>

    <!-- مبلغ مخصص -->
    <div class="fg" style="margin-bottom:14px">
      <label class="fl">أو أدخل مبلغاً مخصصاً (IQD)</label>
      <input type="number" id="rechCustomAmt" class="fc" placeholder="مثال: 15000" min="1000"
        oninput="clearPackageSelection()" style="font-size:14px">
    </div>

    <!-- ملاحظة الإيصال -->
    <div class="fg" style="margin-bottom:14px">
      <label class="fl">رقم إيصال الدفع (اختياري)</label>
      <textarea class="fc" id="rechReceiptNote"
        placeholder="مثال: رقم عملية زين كاش: 123456..." rows="2"
        style="resize:none;font-size:13px"></textarea>
    </div>

    <div class="al al-i" style="margin-bottom:14px">
      <i class="fas fa-info-circle"></i>
      <div style="font-size:12px">
        ادفع عبر <b>زين كاش أو حوالة مصرفية</b> ثم أرسل الإيصال.
        سيتم تفعيل رصيدك خلال ساعة من التأكيد.
      </div>
    </div>

    <div class="mf" style="border:none;padding:0">
      <button class="btn bo" onclick="cmo('_rechargeModal')">إلغاء</button>
      <button class="btn bfu" id="rechSubmitBtn" onclick="_doRequestTopUp()">
        <i class="fas fa-paper-plane"></i>إرسال طلب الشحن
      </button>
    </div>`;

  // تحديد الباقة المناسبة تلقائياً
  if (requiredAmount > 0) {
    const bestPkg = packages.find(p => p.amount >= requiredAmount) || packages[packages.length - 1];
    setTimeout(() => selectRechargePackage(bestPkg.amount), 50);
  }

  oMo('_rechargeModal');
}

let _selectedRechargeAmt = 0;

function selectRechargePackage(amount) {
  _selectedRechargeAmt = amount;
  document.querySelectorAll('[id^="pkg_"]').forEach(btn => {
    btn.style.borderColor = 'var(--br)';
    btn.style.background  = 'var(--bgc)';
  });
  const btn = document.getElementById(`pkg_${amount}`);
  if (btn) {
    btn.style.borderColor = 'var(--p)';
    btn.style.background  = 'rgba(13,148,136,.07)';
  }
  const ci = document.getElementById('rechCustomAmt');
  if (ci) ci.value = '';
}

function clearPackageSelection() {
  _selectedRechargeAmt = 0;
  document.querySelectorAll('[id^="pkg_"]').forEach(btn => {
    btn.style.borderColor = 'var(--br)';
    btn.style.background  = 'var(--bgc)';
  });
}

async function _doRequestTopUp() {
  if (!U || !window.db) { notify('تنبيه', 'سجّل دخولك أولاً', 'warning'); return; }

  const customAmt = parseInt(document.getElementById('rechCustomAmt')?.value || '0');
  const amount    = customAmt > 0 ? customAmt : _selectedRechargeAmt;

  if (!amount || amount < 1000) {
    notify('تنبيه', 'اختر مبلغ الشحن أو أدخل مبلغاً لا يقل عن 1,000 IQD', 'warning');
    return;
  }

  const note = document.getElementById('rechReceiptNote')?.value.trim() || '';
  loading('rechSubmitBtn', true);

  try {
    await window.db.collection('payments').add({
      userId     : U.uid,
      userName   : P?.name  || 'مستخدم',
      userEmail  : U.email  || '',
      userRole   : ROLE,
      type       : 'top_up',
      amount,
      status     : 'pending',
      receiptNote: note,
      createdAt  : firebase.firestore.FieldValue.serverTimestamp(),
    });

    cmo('_rechargeModal');
    await notifyAdmin(
      `طلب شحن رصيد — ${ROLE === 'office' ? 'مكتب' : 'صاحب عمل'}`,
      `مستخدم: ${P?.name||''} (${U.email||''})\nالمبلغ: ${amount.toLocaleString('ar-IQ')} IQD${note ? '\nإيصال: ' + note : ''}`,
      `💳 طلب شحن رصيد\n👤 ${P?.name||''}\n💰 ${amount.toLocaleString('ar-IQ')} IQD${note ? '\n📄 ' + note : ''}`
    );
    notify('تم إرسال الطلب ✅', 'سيراجع الأدمن طلبك ويضيف الرصيد بعد التحقق من الدفع', 'success');
  } catch(e) {
    console.error('_doRequestTopUp:', e);
    notify('خطأ', 'فشل إرسال الطلب. حاول مجدداً.', 'error');
  } finally { loading('rechSubmitBtn', false); }
}

// ─────────────────────────────────────
// إدارة الأدمن للرصيد
// ─────────────────────────────────────
async function adminAddCredits(userId, amount, userName) {
  if (!window.db || ROLE !== 'admin') return;
  confirm2(
    `إضافة رصيد لـ ${userName}`,
    `هل تريد إضافة ${amount.toLocaleString('ar-IQ')} IQD لرصيد ${userName}؟`,
    async () => {
      try {
        const userSnap    = await window.db.collection('users').doc(userId).get();
        const curCredits  = userSnap.exists ? (userSnap.data().credits || 0) : 0;
        const newBalance  = curCredits + amount;

        await Promise.all([
          window.db.collection('users').doc(userId).update({
            credits: firebase.firestore.FieldValue.increment(amount),
          }),
          window.db.collection('credits_log').add({
            userId,
            type        : 'admin_credit',
            amount,
            balanceAfter: newBalance,
            description : 'إضافة يدوية من الأدمن',
            addedBy     : U.uid,
            createdAt   : firebase.firestore.FieldValue.serverTimestamp(),
          }),
        ]);

        // إشعار داخلي للمستخدم
        window.db.collection('notifications').add({
          userId,
          type : 'top_up',
          title: 'تم شحن رصيدك ✅',
          body : `تمت إضافة ${amount.toLocaleString('ar-IQ')} IQD لرصيدك من قِبل الأدمن`,
          read : false,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        }).catch(() => {});

        notify('تمت الإضافة ✅', `${amount.toLocaleString('ar-IQ')} IQD أُضيفت لـ ${userName}`, 'success');
        pgAdminPayments(document.getElementById('pcon'));
      } catch(e) {
        console.error('adminAddCredits:', e);
        notify('خطأ', 'فشل إضافة الرصيد', 'error');
      }
    }
  );
}

async function adminAddCreditsFromLog(userId, userName) {
  const amount = parseInt(document.getElementById('_manualCredAmt')?.value || '0');
  if (!amount || amount < 100) { notify('تنبيه', 'أدخل مبلغاً صحيحاً', 'warning'); return; }
  cmo('_credLogModal');
  await adminAddCredits(userId, amount, userName);
}

// ── موافقة الأدمن على طلب الشحن ──
async function approveTopUp(paymentId, userId, amount, userName, userEmail) {
  if (DEMO || !window.db) return;
  try {
    const userSnap   = await window.db.collection('users').doc(userId).get();
    const curCredits = userSnap.exists ? (userSnap.data().credits || 0) : 0;
    const newBalance = curCredits + amount;
    const invoiceNo  = _genInvoiceNo();

    await Promise.all([
      window.db.collection('payments').doc(paymentId).update({
        status    : 'approved',
        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        invoiceNo,
      }),
      window.db.collection('users').doc(userId).update({
        credits: firebase.firestore.FieldValue.increment(amount),
      }),
      window.db.collection('credits_log').add({
        userId,
        type        : 'top_up',
        amount,
        balanceAfter: newBalance,
        description : 'شحن رصيد مؤكد',
        paymentId,
        invoiceNo,
        createdAt   : firebase.firestore.FieldValue.serverTimestamp(),
      }),
    ]);

    window.db.collection('notifications').add({
      userId,
      type : 'top_up',
      title: 'تم شحن رصيدك ✅',
      body : `تمت إضافة ${amount.toLocaleString('ar-IQ')} IQD — رقم الإيصال: ${invoiceNo}`,
      read : false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});

    notify('تمت الموافقة ✅', `${amount.toLocaleString('ar-IQ')} IQD أُضيفت لـ ${userName}`, 'success');
    pgAdminPayments(document.getElementById('pcon'));
  } catch(e) {
    console.error('approveTopUp:', e);
    notify('خطأ', 'فشل تفعيل الشحن: ' + e.message, 'error');
  }
}

async function rejectTopUp(paymentId, userName) {
  confirm2('رفض طلب الشحن', `هل تريد رفض طلب "${userName || 'المستخدم'}"؟`, async () => {
    try {
      if (!DEMO && window.db) {
        await window.db.collection('payments').doc(paymentId).update({
          status    : 'rejected',
          rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
      notify('تم الرفض', 'تم رفض طلب الشحن', 'info');
      pgAdminPayments(document.getElementById('pcon'));
    } catch(e) {
      console.error('rejectTopUp:', e);
      notify('خطأ', 'فشل رفض الطلب', 'error');
    }
  });
}

// ─────────────────────────────────────
// لوحة الأدمن — إدارة طلبات الشحن
// ─────────────────────────────────────
async function pgAdminPayments(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ التحميل...</div></div>`;

  let payments = [];
  if (!DEMO && window.db) {
    try {
      const snap = await window.db.collection('payments').orderBy('createdAt', 'desc').get();
      payments   = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { console.warn('pgAdminPayments:', e.message); }
  }

  const pending  = payments.filter(p => p.status === 'pending');
  const approved = payments.filter(p => p.status === 'approved');
  const rejected = payments.filter(p => p.status === 'rejected');
  const totalRev = approved.reduce((s, p) => s + (p.amount || 0), 0);

  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-wallet"></i></div>إدارة الرصيد والشحن</div>
      ${pending.length ? `<span class="b b-am"><i class="fas fa-clock"></i> ${pending.length} معلق</span>` : ''}
    </div>

    <!-- الإحصائيات -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:18px">
      ${[
        { l:'معلقة',    v: pending.length,  c:'var(--acc)',     ic:'fa-clock'        },
        { l:'مقبولة',   v: approved.length, c:'var(--success)', ic:'fa-check-circle' },
        { l:'مرفوضة',   v: rejected.length, c:'var(--danger)',  ic:'fa-times-circle' },
        { l:'الإيرادات',v: totalRev.toLocaleString('ar-IQ') + ' IQD', c:'var(--p)', ic:'fa-coins' },
      ].map(x => `<div class="card" style="padding:12px;text-align:center">
        <i class="fas ${x.ic}" style="color:${x.c};font-size:18px;margin-bottom:6px;display:block"></i>
        <div style="font-size:${x.l === 'الإيرادات' ? '11' : '22'}px;font-weight:900;color:var(--tx)">${x.v}</div>
        <div style="font-size:10px;color:var(--tx3);margin-top:3px">${x.l}</div>
      </div>`).join('')}
    </div>

    <!-- الطلبات المعلقة -->
    <div style="margin-bottom:20px">
      <div style="font-size:13px;font-weight:800;color:var(--am);margin-bottom:10px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-clock"></i> بانتظار الموافقة
        ${pending.length ? `<span class="b b-am" style="font-size:10px">${pending.length}</span>` : ''}
      </div>
      ${pending.length
        ? pending.map(p => _topUpCard(p, true)).join('')
        : `<div class="card" style="text-align:center;padding:28px;color:var(--tx3)">
             <div style="font-size:28px;margin-bottom:8px">✅</div>
             <div style="font-weight:700">لا توجد طلبات معلقة</div>
           </div>`}
    </div>

    <!-- السجل السابق -->
    ${approved.length + rejected.length > 0 ? `
      <div>
        <div style="font-size:13px;font-weight:800;color:var(--tx2);margin-bottom:10px">
          <i class="fas fa-history"></i> السجل السابق
          <span style="font-size:10px;color:var(--tx3);font-weight:400">${approved.length + rejected.length} طلب</span>
        </div>
        ${[...approved, ...rejected]
          .sort((a, b) => tsMs(b.approvedAt || b.createdAt) - tsMs(a.approvedAt || a.createdAt))
          .map(p => _topUpCard(p, false)).join('')}
      </div>
    ` : ''}`;
}

function _topUpCard(p, showActions) {
  const roleLabel  = p.userRole === 'office' ? 'مكتب توظيف' : p.userRole === 'employer' ? 'صاحب عمل' : (p.userRole || '');
  const dateStr    = p.createdAt?.toDate?.()?.toLocaleDateString('ar-IQ') || ago(p.createdAt);
  const sideColor  = showActions ? 'var(--am)' : p.status === 'approved' ? 'var(--success)' : 'var(--danger)';

  return `
    <div class="card" style="margin-bottom:10px;border-right:3px solid ${sideColor}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">

        <!-- معلومات المستخدم -->
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px">
            <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--pl));color:#fff;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${(p.userName || 'م').charAt(0)}
            </div>
            <div>
              <div style="font-weight:800;font-size:13.5px;color:var(--tx)">${san(p.userName)}</div>
              <div style="font-size:11px;color:var(--tx3)">${san(p.userEmail)} ${roleLabel ? '· ' + roleLabel : ''}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span class="b b-tl" style="font-size:12px">
              <i class="fas fa-coins"></i>${(p.amount || 0).toLocaleString('ar-IQ')} IQD
            </span>
            <span style="font-size:10.5px;color:var(--tx3)">
              <i class="fas fa-calendar-alt" style="margin-left:3px"></i>${dateStr}
            </span>
          </div>
          ${p.invoiceNo ? `<div style="font-size:10px;color:var(--tx3);margin-top:5px"><i class="fas fa-file-invoice" style="margin-left:3px;color:var(--p)"></i>رقم الإيصال: <strong>${san(p.invoiceNo)}</strong></div>` : ''}
          ${p.receiptNote ? `<div style="font-size:10.5px;color:var(--tx2);margin-top:6px;padding:6px 10px;background:var(--bgc2);border-radius:6px;border-right:2px solid var(--p)"><i class="fas fa-receipt" style="margin-left:4px;color:var(--p)"></i>${san(p.receiptNote)}</div>` : ''}
        </div>

        <!-- الإجراءات -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start">
          ${showActions ? `
            <button class="btn bsm" style="background:var(--success);color:#fff;font-size:12px"
              onclick="approveTopUp('${p.id}','${p.userId}',${p.amount || 0},'${san(p.userName)}','${san(p.userEmail)}')">
              <i class="fas fa-check"></i>موافقة
            </button>
            <button class="btn bda bsm" style="font-size:12px" onclick="rejectTopUp('${p.id}','${san(p.userName)}')">
              <i class="fas fa-times"></i>رفض
            </button>
          ` : `
            <span class="b ${p.status === 'approved' ? 'b-gr' : 'b-rd'}" style="font-size:11px">
              <i class="fas ${p.status === 'approved' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
              ${p.status === 'approved' ? 'مقبول' : 'مرفوض'}
            </span>
          `}
          ${p.userId ? `
            <button class="btn bg bsm" style="font-size:11px" onclick="showUserCreditsLog('${p.userId}')">
              <i class="fas fa-history"></i>السجل
            </button>` : ''}
        </div>

      </div>
    </div>`;
}

// ── عرض سجل معاملات مستخدم (للأدمن) ──
async function showUserCreditsLog(userId) {
  if (!window.db) return;
  try {
    const [logSnap, userSnap] = await Promise.all([
      window.db.collection('credits_log').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(20).get(),
      window.db.collection('users').doc(userId).get(),
    ]);
    const logs = logSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const user = userSnap.exists ? userSnap.data() : {};

    const typeMap = {
      top_up         : { ico: 'fa-arrow-up',    c: 'var(--success)', l: 'شحن رصيد'       },
      job_post       : { ico: 'fa-briefcase',   c: 'var(--p)',       l: 'نشر وظيفة'      },
      hire_commission: { ico: 'fa-user-check',  c: 'var(--acc)',     l: 'عمولة توظيف'    },
      admin_credit   : { ico: 'fa-shield-alt',  c: 'var(--info)',    l: 'إضافة يدوية'    },
    };

    let mo = document.getElementById('_credLogModal');
    if (!mo) {
      mo = document.createElement('div');
      mo.id = '_credLogModal';
      mo.className = 'mo';
      mo.onclick = e => { if (e.target === mo) cmo('_credLogModal'); };
      mo.innerHTML = `<div class="md" style="max-width:480px">
        <div class="mh">
          <div class="mt" id="_credLogTitle"></div>
          <div class="mc" onclick="cmo('_credLogModal')"><i class="fas fa-times"></i></div>
        </div>
        <div class="mb" id="_credLogBody" style="max-height:65vh;overflow-y:auto"></div>
      </div>`;
      document.body.appendChild(mo);
    }

    document.getElementById('_credLogTitle').innerHTML =
      `<i class="fas fa-history" style="color:var(--p);margin-left:6px"></i>سجل المعاملات — ${san(user.name || '')}`;

    const freeLimit = CFG.pricing?.freeJobsLimit || 3;
    document.getElementById('_credLogBody').innerHTML = `
      <div style="background:var(--bgc2);border-radius:12px;padding:12px;text-align:center;margin-bottom:14px">
        <div style="font-size:11px;color:var(--tx3)">الرصيد الحالي</div>
        <div style="font-size:22px;font-weight:900;color:var(--p)">${(user.credits || 0).toLocaleString('ar-IQ')} IQD</div>
        <div style="font-size:11px;color:var(--tx3);margin-top:3px">
          فترة تجريبية: ${user.freeJobsUsed || 0} / ${freeLimit} وظائف مُستخدمة
        </div>
      </div>

      ${logs.length
        ? logs.map(log => {
          const t       = typeMap[log.type] || { ico: 'fa-exchange-alt', c: 'var(--tx2)', l: log.type };
          const isCredit = log.amount > 0;
          const dateStr  = log.createdAt?.toDate?.()?.toLocaleDateString('ar-IQ') || '';
          return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--br)">
            <div style="width:32px;height:32px;border-radius:50%;background:${t.c}18;color:${t.c};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="fas ${t.ico}" style="font-size:12px"></i>
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:700;color:var(--tx)">${t.l}</div>
              <div style="font-size:10px;color:var(--tx3)">${log.description || ''} · ${dateStr}</div>
            </div>
            <div style="font-weight:800;font-size:13px;color:${isCredit ? 'var(--success)' : 'var(--danger)'}">
              ${isCredit ? '+' : ''}${(log.amount || 0).toLocaleString('ar-IQ')} IQD
            </div>
          </div>`;
        }).join('')
        : `<div style="text-align:center;padding:20px;color:var(--tx3)">لا توجد معاملات بعد</div>`}

      <!-- إضافة رصيد يدوي -->
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--br)">
        <div style="font-size:12px;font-weight:800;color:var(--tx2);margin-bottom:8px">
          <i class="fas fa-plus-circle" style="color:var(--success)"></i> إضافة رصيد يدوي
        </div>
        <div style="display:flex;gap:8px">
          <input type="number" id="_manualCredAmt" class="fc"
            placeholder="المبلغ (IQD)" min="1000" style="flex:1;font-size:13px">
          <button class="btn bsu bsm"
            onclick="adminAddCreditsFromLog('${userId}','${san(user.name || '')}')">
            <i class="fas fa-plus"></i>إضافة
          </button>
        </div>
      </div>`;

    oMo('_credLogModal');
  } catch(e) {
    console.warn('showUserCreditsLog:', e.message);
    notify('خطأ', 'فشل تحميل السجل', 'error');
  }
}

// ── شارة الرصيد في الـ sidebar ──
function creditBadge() {
  if (!P || ROLE === 'guest' || ROLE === 'admin') return '';
  const freeLeft = Math.max(0, (CFG.pricing?.freeJobsLimit || 3) - (P?.freeJobsUsed || 0));

  if (freeLeft > 0) {
    return `<span class="b" style="background:rgba(34,197,94,.12);color:var(--success);cursor:pointer;font-size:10px"
      onclick="showRechargeModal()"><i class="fas fa-gift"></i>${freeLeft} مجاني</span>`;
  }

  const balance = getUserCredits();
  const color   = balance > 0 ? 'var(--p)' : 'var(--danger)';
  return `<span class="b" style="background:rgba(13,148,136,.1);color:${color};cursor:pointer;font-size:10px"
    onclick="showRechargeModal()"><i class="fas fa-wallet"></i>${balance.toLocaleString('ar-IQ')} IQD</span>`;
}

// للتوافق مع أي مكان يستدعي planBadge
function planBadge() { return creditBadge(); }

// ── توليد رقم فاتورة ──
function _genInvoiceNo() {
  const now  = new Date();
  const y    = now.getFullYear();
  const m    = String(now.getMonth() + 1).padStart(2, '0');
  const d    = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${y}${m}${d}-${rand}`;
}
