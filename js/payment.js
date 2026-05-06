// ╔══════════════════════════════════════════════════════╗
// ║  عفراء للتوظيف — payment.js                         ║
// ║  نظام الاشتراكات + حصة الوظائف + تمييز الإعلانات   ║
// ╚══════════════════════════════════════════════════════╝

const PLANS = {
  free:     { name: 'مجاني',    limit: 3,        price: 0,      color: '#6b7280', icon: 'fa-gift' },
  standard: { name: 'قياسي',   limit: 10,       price: 10000,  color: '#3b82f6', icon: 'fa-layer-group' },
  premium:  { name: 'مميز ⭐', limit: Infinity,  price: 25000,  color: '#f59e0b', icon: 'fa-crown' },
};

function getUserPlan() {
  // الأدمن دائماً على خطة Premium
  if (ROLE === 'admin') return 'premium';
  // فحص انتهاء صلاحية الخطة
  if (P?.plan && P.plan !== 'free' && P?.planExpiry) {
    if (new Date(P.planExpiry) < new Date()) return 'free'; // الخطة منتهية
  }
  return P?.plan || 'free';
}

// ── فحص حصة الوظائف المتاحة للمستخدم ──
async function checkJobQuota() {
  // الأدمن لا حدود عليه
  if (ROLE === 'admin') return { ok: true, remaining: Infinity, plan: 'premium' };

  const plan  = getUserPlan();
  const limit = PLANS[plan]?.limit ?? 3;
  if (limit === Infinity) return { ok: true, remaining: Infinity, plan };
  if (DEMO || !window.db || !U) return { ok: true, remaining: limit, plan };
  try {
    const snap = await window.db.collection('jobs')
      .where('postedBy', '==', U.uid)
      .where('status',   '==', 'active')
      .get();
    const count = snap.size;
    return { ok: count < limit, remaining: Math.max(0, limit - count), plan, count, limit };
  } catch(e) {
    console.warn('checkJobQuota:', e.message);
    return { ok: true, remaining: limit, plan };
  }
}

// ── عرض صفحة الخطط ──
function showPaymentPlans() {
  const cur = getUserPlan();
  const el  = document.getElementById('moPayB');
  if (!el) return;

  el.innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:13px;color:var(--tx2);margin-bottom:8px">خطتك الحالية</div>
      <span class="b" style="background:${PLANS[cur].color}18;color:${PLANS[cur].color};font-size:13px;padding:5px 16px;border-radius:20px">
        <i class="fas ${PLANS[cur].icon}"></i> ${PLANS[cur].name}
      </span>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;margin-bottom:16px">
      ${Object.entries(PLANS).map(([key, p]) => `
        <div class="card cp" style="border:2px solid ${key === cur ? p.color : 'var(--br)'};position:relative;text-align:center">
          ${key === cur ? `<div style="position:absolute;top:-10px;right:50%;transform:translateX(50%);background:${p.color};color:#fff;font-size:10px;font-weight:800;padding:2px 12px;border-radius:10px;white-space:nowrap">خطتك الحالية</div>` : ''}
          <i class="fas ${p.icon}" style="font-size:26px;color:${p.color};margin-bottom:8px;margin-top:${key === cur ? '8px' : '0'}"></i>
          <div style="font-size:15px;font-weight:900;color:var(--tx);margin-bottom:4px">${p.name}</div>
          <div style="font-size:18px;font-weight:900;color:${p.color}">
            ${p.price === 0 ? 'مجاناً' : `${p.price.toLocaleString('ar-IQ')} IQD`}
            ${p.price > 0 ? '<span style="font-size:10px;font-weight:400;color:var(--tx3)">/شهر</span>' : ''}
          </div>
          <div style="font-size:12px;color:var(--tx2);margin:10px 0;text-align:right">
            <div style="margin-bottom:5px"><i class="fas fa-check-circle" style="color:${p.color}"></i>
              ${p.limit === Infinity ? 'وظائف غير محدودة' : `حتى ${p.limit} وظائف نشطة`}
            </div>
            ${key !== 'free' ? `<div style="margin-bottom:5px"><i class="fas fa-check-circle" style="color:${p.color}"></i> أولوية في نتائج البحث</div>` : ''}
            ${key === 'premium' ? `<div><i class="fas fa-check-circle" style="color:${p.color}"></i> تمييز الوظائف ⭐</div>` : ''}
          </div>
          ${key === cur
            ? `<div class="b b-gr" style="width:100%;justify-content:center">✓ مفعّلة</div>`
            : `<button class="btn bfu" style="background:${p.color};color:#fff;width:100%;margin-top:4px" onclick="requestPlanUpgrade('${key}')">
                 <i class="fas fa-arrow-up"></i> الترقية
               </button>`}
        </div>
      `).join('')}
    </div>

    <div class="al al-i" style="background:rgba(59,130,246,.06);border-radius:12px">
      <i class="fas fa-info-circle" style="color:#3b82f6"></i>
      <div>
        <div style="font-weight:700;font-size:13px">طريقة الدفع</div>
        <div style="font-size:12px;color:var(--tx2);margin-top:3px;line-height:1.7">
          ادفع عبر <b>زين كاش / حوالة مصرفية</b> ثم أرسل الإيصال للأدمن عبر تيليجرام أو واتساب.
          سيتم تفعيل خطتك خلال ساعة من التأكيد.
        </div>
      </div>
    </div>`;

  oMo('moPay');
}

// ── طلب ترقية الخطة ──
function requestPlanUpgrade(plan) {
  if (!U || !window.db) { notify('تنبيه', 'سجّل دخولك أولاً', 'warning'); return; }
  const p = PLANS[plan];
  if (!p || p.price === 0) return;

  // نعرض نافذة تأكيد مع حقل لملاحظة إيصال الدفع
  let mo = document.getElementById('_upgradeModal');
  if (!mo) {
    mo = document.createElement('div');
    mo.id = '_upgradeModal';
    mo.className = 'mo';
    mo.onclick = e => { if (e.target === mo) cmo('_upgradeModal'); };
    mo.innerHTML = `<div class="md" style="max-width:440px">
      <div class="mh">
        <div class="mt" id="_upgModalTitle"></div>
        <div class="mc" onclick="cmo('_upgradeModal')"><i class="fas fa-times"></i></div>
      </div>
      <div class="mb" id="_upgModalBody"></div>
    </div>`;
    document.body.appendChild(mo);
  }

  document.getElementById('_upgModalTitle').textContent = `ترقية إلى ${p.name}`;
  document.getElementById('_upgModalBody').innerHTML = `
    <div class="al al-i" style="margin-bottom:14px">
      <i class="fas fa-info-circle"></i>
      <div>
        <div style="font-weight:700;font-size:13px">طريقة الدفع</div>
        <div style="font-size:12px;color:var(--tx2);line-height:1.7;margin-top:3px">
          ادفع <b>${p.price.toLocaleString('ar-IQ')} IQD</b> عبر <b>زين كاش أو حوالة مصرفية</b>،
          ثم أرسل رقم العملية أو صورة الإيصال في الحقل أدناه.
        </div>
      </div>
    </div>
    <div style="background:var(--bgc2);border-radius:12px;padding:14px;margin-bottom:14px;text-align:center">
      <div style="font-size:12px;color:var(--tx3);margin-bottom:4px">المبلغ المطلوب</div>
      <div style="font-size:26px;font-weight:900;color:${p.color}">${p.price.toLocaleString('ar-IQ')} IQD</div>
      <div style="font-size:11px;color:var(--tx3)">${p.limit === Infinity ? 'وظائف غير محدودة' : 'حتى ' + p.limit + ' وظائف'} / شهر</div>
    </div>
    <div class="fg">
      <label class="fl">ملاحظة / رقم إيصال الدفع (اختياري)</label>
      <textarea class="fc" id="upgradeReceiptNote" placeholder="مثال: رقم عملية زين كاش: 123456..." rows="2"
        style="resize:none;font-size:13px"></textarea>
    </div>
    <div class="mf" style="border:none;padding:0;margin-top:12px">
      <button class="btn bo" onclick="cmo('_upgradeModal')">إلغاء</button>
      <button class="btn bfu" id="upgSubmitBtn" style="background:${p.color};color:#fff" onclick="_doRequestUpgrade('${plan}')">
        <i class="fas fa-paper-plane"></i>إرسال الطلب
      </button>
    </div>`;
  oMo('_upgradeModal');
}

async function _doRequestUpgrade(plan) {
  if (!U || !window.db) return;
  const p = PLANS[plan];
  if (!p) return;
  const note = document.getElementById('upgradeReceiptNote')?.value.trim() || '';
  loading('upgSubmitBtn', true);
  try {
    await window.db.collection('payments').add({
      userId     : U.uid,
      userName   : P?.name    || 'مستخدم',
      userEmail  : U.email    || '',
      plan,
      planName   : p.name,
      amount     : p.price,
      status     : 'pending',
      receiptNote: note,
      createdAt  : firebase.firestore.FieldValue.serverTimestamp(),
    });
    cmo('_upgradeModal');
    cmo('moPay');
    await notifyAdmin(
      `طلب اشتراك جديد — ${p.name}`,
      `مستخدم: ${P?.name||''} (${U.email||''})\nالخطة: ${p.name} — ${p.price.toLocaleString('ar-IQ')} IQD\n${note ? 'إيصال: ' + note : ''}`,
      `💳 طلب اشتراك جديد\n👤 ${P?.name||''}\n📧 ${U.email||''}\n✨ ${p.name} — ${p.price.toLocaleString('ar-IQ')} IQD${note ? '\n📄 ' + note : ''}`
    );
    notify('تم إرسال الطلب ✅', 'سيراجع الأدمن طلبك ويفعّل خطتك بعد التحقق من الدفع', 'success');
  } catch(e) {
    console.error('requestPlanUpgrade:', e);
    notify('خطأ', 'فشل إرسال الطلب. حاول مجدداً.', 'error');
  } finally { loading('upgSubmitBtn', false); }
}

// ══════════════════════════════════════════════════════
// توليد رقم الفاتورة
// ══════════════════════════════════════════════════════
function _genInvoiceNo() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${y}${m}${d}-${rand}`;
}

// ── إرسال الفاتورة بالبريد للمستخدم ──
async function _sendInvoiceEmail(payment, plan, invoiceNo, expiry) {
  if (!CFG.emailjs?.pub || CFG.emailjs.pub.startsWith('YOUR')) return;
  const expiryDate = new Date(expiry).toLocaleDateString('ar-IQ');
  const issueDate  = new Date().toLocaleDateString('ar-IQ');
  const subject    = `فاتورة اشتراك عفراء للتوظيف — ${invoiceNo}`;
  const body = `
عفراء للتوظيف — فاتورة اشتراك
══════════════════════════════

رقم الفاتورة : ${invoiceNo}
تاريخ الإصدار: ${issueDate}

══════════════════════════════
بيانات المشترك
──────────────
الاسم  : ${payment.userName}
البريد : ${payment.userEmail}

══════════════════════════════
تفاصيل الاشتراك
────────────────
الخطة     : ${plan.name}
المبلغ    : ${(payment.amount||0).toLocaleString('ar-IQ')} IQD
الحد الأقصى: ${plan.limit === Infinity ? 'غير محدود' : plan.limit + ' وظيفة'}
صالح حتى  : ${expiryDate}

══════════════════════════════
شكراً لاشتراكك في عفراء للتوظيف.
للدعم: ${CFG.emailjs.admin || 'support@afraa.iq'}
  `.trim();

  try {
    if (typeof emailjs !== 'undefined') {
      emailjs.init(CFG.emailjs.pub);
      await emailjs.send(CFG.emailjs.svc, CFG.emailjs.tpl, {
        to_email : payment.userEmail,
        to_name  : payment.userName,
        subject,
        message  : body,
        reply_to : CFG.emailjs.admin || '',
      });
    }
  } catch(e) { console.warn('Invoice email error:', e); }
}

// ══════════════════════════════════════════════════════
// لوحة الأدمن — إدارة طلبات الاشتراكات
// ══════════════════════════════════════════════════════

async function pgAdminPayments(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ التحميل...</div></div>`;

  let payments = [];
  if (!DEMO && window.db) {
    try {
      const snap = await window.db.collection('payments').orderBy('createdAt', 'desc').get();
      payments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { console.warn('pgAdminPayments:', e.message); }
  }

  const pending  = payments.filter(p => p.status === 'pending');
  const approved = payments.filter(p => p.status === 'approved');
  const rejected = payments.filter(p => p.status === 'rejected');
  const totalRev = approved.reduce((s, p) => s + (p.amount||0), 0);

  el.innerHTML = `
    <!-- رأس الصفحة -->
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-credit-card"></i></div>طلبات الاشتراكات</div>
      ${pending.length ? `<span class="b b-am"><i class="fas fa-clock"></i> ${pending.length} معلق</span>` : ''}
    </div>

    <!-- إحصائيات سريعة -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:18px">
      ${[
        {l:'معلقة',    v:pending.length,  c:'var(--am)',      ic:'fa-clock'},
        {l:'مقبولة',   v:approved.length, c:'var(--success)', ic:'fa-check-circle'},
        {l:'مرفوضة',   v:rejected.length, c:'var(--danger)',  ic:'fa-times-circle'},
        {l:'الإيرادات',v:totalRev.toLocaleString('ar-IQ')+' IQD', c:'var(--p)', ic:'fa-coins'},
      ].map(x => `<div class="card" style="padding:12px;text-align:center">
        <i class="fas ${x.ic}" style="color:${x.c};font-size:18px;margin-bottom:6px;display:block"></i>
        <div style="font-size:${x.l==='الإيرادات'?'13':'22'}px;font-weight:900;color:var(--tx)">${x.v}</div>
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
        ? pending.map(p => _paymentCard(p, true)).join('')
        : `<div class="card" style="text-align:center;padding:28px;color:var(--tx3)">
             <div style="font-size:28px;margin-bottom:8px">✅</div>
             <div style="font-weight:700">لا توجد طلبات معلقة</div>
             <div style="font-size:11px;margin-top:4px">جميع الطلبات تمت معالجتها</div>
           </div>`}
    </div>

    <!-- السجل السابق -->
    ${approved.length + rejected.length > 0 ? `
      <div>
        <div style="font-size:13px;font-weight:800;color:var(--tx2);margin-bottom:10px;display:flex;align-items:center;gap:6px">
          <i class="fas fa-history"></i> السجل السابق
          <span style="font-size:10px;color:var(--tx3);font-weight:400">${approved.length + rejected.length} طلب</span>
        </div>
        ${[...approved, ...rejected].sort((a,b) => tsMs(b.approvedAt||b.createdAt) - tsMs(a.approvedAt||a.createdAt)).map(p => _paymentCard(p, false)).join('')}
      </div>
    ` : ''}`;
}

function _paymentCard(p, showActions) {
  const plan = PLANS[p.plan] || { name: p.planName||'', color: '#888', icon: 'fa-layer-group', limit: 0 };
  const dateStr = p.createdAt?.toDate?.()?.toLocaleDateString('ar-IQ') || ago(p.createdAt);
  const expiryStr = p.planExpiry ? new Date(p.planExpiry).toLocaleDateString('ar-IQ') : '';

  return `
    <div class="card" style="margin-bottom:10px;border-right:3px solid ${showActions ? 'var(--am)' : p.status === 'approved' ? 'var(--success)' : 'var(--danger)'}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap">

        <!-- معلومات المستخدم -->
        <div style="flex:1;min-width:200px">
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:8px">
            <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--p),var(--pl));color:#fff;font-size:15px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">
              ${(p.userName||'م').charAt(0)}
            </div>
            <div>
              <div style="font-weight:800;font-size:13.5px;color:var(--tx)">${san(p.userName)}</div>
              <div style="font-size:11px;color:var(--tx3)">${san(p.userEmail)}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
            <span class="b" style="background:${plan.color}18;color:${plan.color};border:1px solid ${plan.color}30">
              <i class="fas ${plan.icon}"></i> ${san(p.planName||plan.name)}
            </span>
            <span class="b b-tl" style="font-size:11px">
              <i class="fas fa-coins"></i>${(p.amount||0).toLocaleString('ar-IQ')} IQD
            </span>
            <span style="font-size:10.5px;color:var(--tx3)"><i class="fas fa-calendar-alt" style="margin-left:3px"></i>${dateStr}</span>
          </div>
          ${p.invoiceNo ? `<div style="font-size:10px;color:var(--tx3);margin-top:5px"><i class="fas fa-file-invoice" style="margin-left:3px;color:var(--p)"></i>رقم الفاتورة: <strong>${san(p.invoiceNo)}</strong></div>` : ''}
          ${expiryStr && p.status === 'approved' ? `<div style="font-size:10px;color:var(--success);margin-top:3px"><i class="fas fa-check-circle" style="margin-left:3px"></i>صالح حتى: ${expiryStr}</div>` : ''}
          ${p.receiptNote ? `<div style="font-size:10.5px;color:var(--tx2);margin-top:6px;padding:6px 10px;background:var(--bgc2);border-radius:6px;border-right:2px solid var(--p)"><i class="fas fa-receipt" style="margin-left:4px;color:var(--p)"></i>${san(p.receiptNote)}</div>` : ''}
        </div>

        <!-- الإجراءات -->
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:flex-start">
          ${showActions ? `
            <button class="btn bsm" style="background:var(--success);color:#fff;font-size:12px"
              onclick="approvePayment('${p.id}','${p.userId}','${p.plan}','${san(p.userName)}','${san(p.userEmail)}')">
              <i class="fas fa-check"></i>موافقة + فاتورة
            </button>
            <button class="btn bda bsm" style="font-size:12px" onclick="rejectPayment('${p.id}','${san(p.userName)}')">
              <i class="fas fa-times"></i>رفض
            </button>
          ` : `
            <div style="text-align:center">
              <span class="b ${p.status === 'approved' ? 'b-gr' : 'b-rd'}" style="font-size:11px">
                <i class="fas ${p.status === 'approved' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                ${p.status === 'approved' ? 'مقبول' : 'مرفوض'}
              </span>
              ${p.status === 'approved' && p.invoiceNo ? `
                <div style="margin-top:5px">
                  <button class="btn bg bsm" style="font-size:10px" onclick="resendInvoice('${p.id}')">
                    <i class="fas fa-envelope"></i>إعادة إرسال الفاتورة
                  </button>
                </div>` : ''}
            </div>
          `}
        </div>
      </div>
    </div>`;
}

async function approvePayment(paymentId, userId, plan, userName, userEmail) {
  if (DEMO || !window.db) { notify('تنبيه', 'يتطلب Firebase حقيقي', 'info'); return; }
  const planObj = PLANS[plan];
  if (!planObj) { notify('خطأ', 'نوع الخطة غير صحيح', 'error'); return; }

  try {
    const expiry    = new Date(Date.now() + 30 * 86400000).toISOString();
    const invoiceNo = _genInvoiceNo();
    const paySnap   = await window.db.collection('payments').doc(paymentId).get();
    const payData   = paySnap.exists ? { id: paymentId, ...paySnap.data() } : { id: paymentId, userName, userEmail, plan, planName: planObj.name, amount: planObj.price };

    await Promise.all([
      window.db.collection('payments').doc(paymentId).update({
        status     : 'approved',
        approvedAt : firebase.firestore.FieldValue.serverTimestamp(),
        invoiceNo,
        planExpiry : expiry,
      }),
      window.db.collection('users').doc(userId).update({
        plan,
        planExpiry : expiry,
      }),
    ]);

    // إرسال إشعار داخلي للمستخدم
    if (userId) {
      window.db.collection('notifications').add({
        userId,
        type  : 'subscription',
        title : `تم تفعيل خطة ${planObj.name} ✅`,
        body  : `اشتراكك نشط حتى ${new Date(expiry).toLocaleDateString('ar-IQ')} — رقم الفاتورة: ${invoiceNo}`,
        read  : false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
    }

    // إرسال الفاتورة بالبريد
    await _sendInvoiceEmail(payData, planObj, invoiceNo, expiry);

    notify('تمت الموافقة ✅', `تم تفعيل خطة ${planObj.name} وإرسال الفاتورة إلى ${userEmail}`, 'success');
    pgAdminPayments(document.getElementById('pcon'));
  } catch(e) {
    console.error('approvePayment:', e);
    notify('خطأ', 'فشل تفعيل الخطة: ' + e.message, 'error');
  }
}

async function rejectPayment(paymentId, userName) {
  confirm2('رفض طلب الاشتراك', `هل تريد رفض طلب "${userName||'المستخدم'}"؟`, async () => {
    try {
      if (!DEMO && window.db) {
        await window.db.collection('payments').doc(paymentId).update({
          status    : 'rejected',
          rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
      notify('تم الرفض', 'تم رفض طلب الاشتراك', 'info');
      pgAdminPayments(document.getElementById('pcon'));
    } catch(e) {
      console.error('rejectPayment:', e);
      notify('خطأ', 'فشل رفض الطلب', 'error');
    }
  });
}

async function resendInvoice(paymentId) {
  if (DEMO || !window.db) return;
  try {
    const snap = await window.db.collection('payments').doc(paymentId).get();
    if (!snap.exists) { notify('خطأ', 'لم يُعثر على الطلب', 'error'); return; }
    const p = { id: snap.id, ...snap.data() };
    const planObj = PLANS[p.plan] || { name: p.planName, color: '#888', icon: 'fa-layer-group', limit: 0 };
    await _sendInvoiceEmail(p, planObj, p.invoiceNo || _genInvoiceNo(), p.planExpiry || new Date(Date.now()+30*86400000).toISOString());
    notify('تم الإرسال ✅', `أُعيد إرسال الفاتورة إلى ${p.userEmail}`, 'success');
  } catch(e) { notify('خطأ', 'فشل إعادة الإرسال', 'error'); }
}

// ── رابط للأدمن من نافبار ──
function planBadge() {
  if (!P || ROLE === 'guest') return '';
  const plan = getUserPlan();
  const p    = PLANS[plan];
  return `<span class="b" style="background:${p.color}18;color:${p.color};cursor:pointer;font-size:10px"
    onclick="showPaymentPlans()"><i class="fas ${p.icon}"></i>${p.name}</span>`;
}
