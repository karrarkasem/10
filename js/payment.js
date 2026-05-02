// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — payment.js                       ║
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
async function requestPlanUpgrade(plan) {
  if (!U || !window.db) { notify('تنبيه', 'سجّل دخولك أولاً', 'warning'); return; }
  const p = PLANS[plan];
  if (!p || p.price === 0) return;

  confirm2(
    `طلب ترقية إلى ${p.name}`,
    `ستحصل على ${p.limit === Infinity ? 'وظائف غير محدودة' : `حتى ${p.limit} وظائف`} مقابل ${p.price.toLocaleString('ar-IQ')} IQD شهرياً.\n\nسيتواصل معك الأدمن لإتمام الدفع.`,
    async () => {
      try {
        await window.db.collection('payments').add({
          userId:    U.uid,
          userName:  P?.name   || 'مستخدم',
          userEmail: U.email   || '',
          plan,
          planName:  p.name,
          amount:    p.price,
          status:    'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        cmo('moPay');
        notify('تم إرسال الطلب ✅', 'سيراجع الأدمن طلبك ويفعّل خطتك بعد تأكيد الدفع', 'success');
      } catch(e) {
        console.error('requestPlanUpgrade:', e);
        notify('خطأ', 'فشل إرسال الطلب. حاول مجدداً.', 'error');
      }
    }
  );
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

  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-credit-card"></i></div>طلبات الاشتراكات</div>
      <span class="b b-am">${pending.length} معلق</span>
    </div>

    ${pending.length
      ? `<div style="margin-bottom:16px">
           <div style="font-size:12px;font-weight:800;color:var(--am);margin-bottom:8px">
             <i class="fas fa-clock"></i> بانتظار الموافقة (${pending.length})
           </div>
           ${pending.map(p => _paymentCard(p, true)).join('')}
         </div>`
      : `<div class="es" style="padding:24px"><div class="es-ico">✅</div><div class="es-desc">لا توجد طلبات معلقة</div></div>`}

    ${approved.length + rejected.length > 0 ? `
      <div class="sh"><div class="st">السجل السابق</div></div>
      ${[...approved, ...rejected].map(p => _paymentCard(p, false)).join('')}
    ` : ''}`;
}

function _paymentCard(p, showActions) {
  const plan = PLANS[p.plan] || { name: p.planName, color: '#888', icon: 'fa-layer-group' };
  return `
    <div class="card cp" style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div>
          <div style="font-weight:800;font-size:14px;margin-bottom:4px">${san(p.userName)}</div>
          <div style="font-size:12px;color:var(--tx3);margin-bottom:6px">${san(p.userEmail)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="b" style="background:${plan.color}18;color:${plan.color}">
              <i class="fas ${plan.icon}"></i> ${san(p.planName)}
            </span>
            <span class="b b-tl">${(p.amount||0).toLocaleString('ar-IQ')} IQD</span>
            <span style="font-size:11px;color:var(--tx3)">${ago(p.createdAt)}</span>
          </div>
        </div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;align-items:center">
          ${showActions ? `
            <button class="btn bsm" style="background:var(--success);color:#fff"
              onclick="approvePayment('${p.id}','${p.userId}','${p.plan}')">
              <i class="fas fa-check"></i> موافقة
            </button>
            <button class="btn bda bsm" onclick="rejectPayment('${p.id}')">
              <i class="fas fa-times"></i> رفض
            </button>
          ` : `<span class="b ${p.status === 'approved' ? 'b-gr' : 'b-rd'}">${p.status === 'approved' ? 'مقبول ✅' : 'مرفوض'}</span>`}
        </div>
      </div>
    </div>`;
}

async function approvePayment(paymentId, userId, plan) {
  try {
    if (!DEMO && window.db) {
      const expiry = new Date(Date.now() + 30 * 86400000).toISOString();
      await Promise.all([
        window.db.collection('payments').doc(paymentId).update({
          status: 'approved',
          approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        }),
        window.db.collection('users').doc(userId).update({
          plan,
          planExpiry: expiry,
        }),
      ]);
    }
    notify('تمت الموافقة ✅', `تم تفعيل خطة ${PLANS[plan]?.name} للمستخدم`, 'success');
    pgAdminPayments(document.getElementById('pcon'));
  } catch(e) {
    console.error('approvePayment:', e);
    notify('خطأ', 'فشل تفعيل الخطة', 'error');
  }
}

async function rejectPayment(paymentId) {
  try {
    if (!DEMO && window.db) {
      await window.db.collection('payments').doc(paymentId).update({ status: 'rejected' });
    }
    notify('تم الرفض', 'تم رفض طلب الاشتراك', 'info');
    pgAdminPayments(document.getElementById('pcon'));
  } catch(e) {
    console.error('rejectPayment:', e);
    notify('خطأ', 'فشل رفض الطلب', 'error');
  }
}

// ── رابط للأدمن من نافبار ──
function planBadge() {
  if (!P || ROLE === 'guest') return '';
  const plan = getUserPlan();
  const p    = PLANS[plan];
  return `<span class="b" style="background:${p.color}18;color:${p.color};cursor:pointer;font-size:10px"
    onclick="showPaymentPlans()"><i class="fas ${p.icon}"></i>${p.name}</span>`;
}
