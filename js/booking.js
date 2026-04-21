// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس — نظام الحجز الحصري (12 ساعة)             ║
// ╚══════════════════════════════════════════════════════╝

const MAX_BOOKINGS   = 3;
const BOOKING_MS     = 12 * 60 * 60 * 1000; // 12 ساعة

let MY_BOOKINGS = [];

// ── تحميل حجوزات المكتب النشطة ──
async function loadMyBookings() {
  if (DEMO || ROLE !== 'office' || !window.db) return;
  try {
    const snap = await window.db.collection('bookings')
      .where('officeId', '==', U.uid)
      .where('status', '==', 'active')
      .get();
    const now = Date.now();
    MY_BOOKINGS = [];
    for (const d of snap.docs) {
      const b = { id: d.id, ...d.data() };
      const exp = b.expiresAt?.toDate?.() || new Date(b.expiresAt);
      if (exp.getTime() <= now) {
        // انتهى الحجز — تحديث تلقائي
        await d.ref.update({ status: 'expired' });
      } else {
        MY_BOOKINGS.push(b);
      }
    }
  } catch (e) { console.warn('bookings load error', e); }
}

// ── حجز مرشح ──
async function bookCandidate(candidateId, candidateName, jobId) {
  if (!requireAuth('office')) return;

  if (MY_BOOKINGS.length >= MAX_BOOKINGS) {
    notify('وصلت للحد الأقصى', `لا يمكنك حجز أكثر من ${MAX_BOOKINGS} مرشحين في وقت واحد`, 'error');
    return;
  }

  // التحقق أن المرشح غير محجوز حالياً
  try {
    const check = await window.db.collection('bookings')
      .where('candidateId', '==', candidateId)
      .where('status', '==', 'active')
      .get();
    const now = Date.now();
    const stillActive = check.docs.some(d => {
      const exp = d.data().expiresAt?.toDate?.() || new Date(d.data().expiresAt);
      return exp.getTime() > now;
    });
    if (stillActive) {
      notify('مرشح محجوز', 'هذا المرشح محجوز حالياً من قبل مكتب آخر', 'warning');
      return;
    }
  } catch (e) {}

  confirm2('تأكيد الحجز', `هل تريد حجز "${candidateName}" لمدة 12 ساعة حصرياً؟`, async () => {
    try {
      const expiresAt = new Date(Date.now() + BOOKING_MS);
      await window.db.collection('bookings').add({
        officeId:      U.uid,
        officeName:    P.officeName || P.name,
        candidateId,
        candidateName,
        jobId,
        bookedAt:  firebase.firestore.FieldValue.serverTimestamp(),
        expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
        status:    'active',
      });
      // إشعار للمرشح
      await window.db.collection('notifications').add({
        userId:    candidateId,
        type:      'booking',
        title:     '🔔 مكتب مهتم بملفك!',
        body:      `قام ${san(P.officeName || P.name)} بحجز ملفك الوظيفي لمدة 12 ساعة`,
        read:      false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      await loadMyBookings();
      notify('تم الحجز ✅', `تم حجز ${candidateName} حصرياً لـ 12 ساعة`, 'success');
      goTo('candidates');
    } catch (e) { console.error(e); notify('خطأ', 'فشل الحجز، حاول مرة أخرى', 'error'); }
  });
}

// ── إلغاء حجز ──
async function releaseBooking(bookingId) {
  confirm2('إلغاء الحجز', 'هل تريد إلغاء حجز هذا المرشح؟', async () => {
    try {
      await window.db.collection('bookings').doc(bookingId).update({ status: 'released' });
      MY_BOOKINGS = MY_BOOKINGS.filter(b => b.id !== bookingId);
      notify('تم الإلغاء', 'تم إلغاء الحجز', 'info');
      goTo('bookings');
    } catch (e) { notify('خطأ', 'فشل إلغاء الحجز', 'error'); }
  });
}

// ── عداد تنازلي ──
function bookingCountdown(expiresAt) {
  if (!expiresAt) return '';
  const exp  = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
  const diff = exp.getTime() - Date.now();
  if (diff <= 0) return '<span style="color:var(--danger);font-size:11px">انتهى الحجز</span>';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const color = diff < 3600000 ? 'var(--danger)' : diff < 7200000 ? 'var(--acc)' : 'var(--success)';
  return `<span style="color:${color};font-size:11px;font-weight:700"><i class="fas fa-clock"></i> ${h} س ${m} د متبقية</span>`;
}

// ── فحص حالة حجز مرشح (للمكاتب الأخرى) ──
async function getCandidateBookingStatus(candidateId) {
  if (!window.db || DEMO) return null;
  try {
    const snap = await window.db.collection('bookings')
      .where('candidateId', '==', candidateId)
      .where('status', '==', 'active')
      .get();
    const now = Date.now();
    for (const d of snap.docs) {
      const b = d.data();
      const exp = b.expiresAt?.toDate?.() || new Date(b.expiresAt);
      if (exp.getTime() > now) return { id: d.id, ...b };
    }
    return null;
  } catch (e) { return null; }
}

// ── صفحة إدارة الحجوزات ──
async function pgBookings(el) {
  el.innerHTML = `<div style="text-align:center;padding:30px"><div class="spin2"></div></div>`;
  await loadMyBookings();
  const remaining = MAX_BOOKINGS - MY_BOOKINGS.length;
  const pct = Math.round((MY_BOOKINGS.length / MAX_BOOKINGS) * 100);

  el.innerHTML = `
    <div class="sh">
      <div class="st">
        <div class="st-ico" style="background:linear-gradient(135deg,#f59e0b,#d97706)"><i class="fas fa-lock"></i></div>
        الحجوزات الحصرية
      </div>
      <span class="b b-am">${MY_BOOKINGS.length}/${MAX_BOOKINGS}</span>
    </div>

    <div class="card cp fade-up" style="margin-bottom:14px;background:linear-gradient(135deg,rgba(245,158,11,.07),rgba(245,158,11,.02));border-color:rgba(245,158,11,.25)">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px">
        <div style="font-size:32px">🔒</div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:900;color:var(--tx)">نظام الحجز الحصري</div>
          <div style="font-size:11px;color:var(--tx2);margin-top:3px">احجز مرشحاً لمدة 12 ساعة — لا يستطيع مكتب آخر التواصل معه خلالها</div>
        </div>
        <div style="text-align:center;flex-shrink:0">
          <div style="font-size:26px;font-weight:900;color:${remaining > 0 ? 'var(--success)' : 'var(--danger)'}">${remaining}</div>
          <div style="font-size:9px;color:var(--tx3)">متبقي</div>
        </div>
      </div>
      <div style="background:var(--bgc2);border-radius:8px;height:8px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pct >= 100 ? 'var(--danger)' : 'var(--acc)'};border-radius:8px;transition:width .4s"></div>
      </div>
      <div style="font-size:10px;color:var(--tx3);margin-top:5px">
        ${MY_BOOKINGS.length} من أصل ${MAX_BOOKINGS} حجوزات مستخدمة
      </div>
    </div>

    ${MY_BOOKINGS.length ? `
    <div style="display:flex;flex-direction:column;gap:10px" class="fade-up del1">
      ${MY_BOOKINGS.map(b => {
        const exp = b.expiresAt?.toDate ? b.expiresAt.toDate() : new Date(b.expiresAt);
        return `<div class="card cp" id="bk_${b.id}">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="av avm" style="background:var(--grad-p);color:#fff;flex-shrink:0">${(b.candidateName || '؟').charAt(0)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:800;color:var(--tx)">${san(b.candidateName || '—')}</div>
              <div style="font-size:11px;color:var(--tx2);margin-top:2px" id="tmr_${b.id}">${bookingCountdown(b.expiresAt)}</div>
              <div style="font-size:10px;color:var(--tx3);margin-top:2px">
                <i class="fas fa-calendar"></i> حتى ${exp.toLocaleTimeString('ar-IQ',{hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
            <button class="btn bda bsm" onclick="releaseBooking('${b.id}')">
              <i class="fas fa-lock-open"></i>إلغاء
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>` : `
    <div class="fade-up del1">
      ${emptyState('🔓', 'لا توجد حجوزات نشطة', 'ادخل على قائمة المتقدمين واضغط "حجز" على المرشح المناسب')}
    </div>`}

    <div class="al al-i fade-up del2" style="margin-top:14px">
      <i class="fas fa-info-circle"></i>
      <span>يُلغى الحجز تلقائياً بعد 12 ساعة. المرشح المحجوز يظهر للمكاتب الأخرى كـ "محجوز" ولا يمكنهم حجزه.</span>
    </div>`;

  // تحديث العدادات كل دقيقة
  const timerId = setInterval(() => {
    MY_BOOKINGS.forEach(b => {
      const el = document.getElementById(`tmr_${b.id}`);
      if (el) el.innerHTML = bookingCountdown(b.expiresAt);
    });
  }, 60000);
  // تنظيف عند تغيير الصفحة (يُعاد تعيينه في goTo)
  window._bookingTimer = timerId;
}
