// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس — نظام التواصل الخارجي (Plus + حملات)     ║
// ╚══════════════════════════════════════════════════════╝

let CONTACT_CAMPAIGNS = [];

// ── تحميل الحملات النشطة من Firestore ──
async function loadContactCampaigns() {
  if (DEMO || !window.db) return;
  try {
    const [campSnap, cfgDoc] = await Promise.all([
      window.db.collection('campaigns').where('active', '==', true).get(),
      window.db.collection('config').doc('settings').get(),
    ]);
    CONTACT_CAMPAIGNS = campSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (cfgDoc.exists) {
      const s = cfgDoc.data();
      ['telegram','emailjs','imgbb','facebook','instagram','twitter','linkedin','tiktok','snapchat','youtube','gemini','general'].forEach(k => {
        if (s[k]) CFG[k] = { ...CFG[k], ...s[k] };
      });
    }
  } catch(e) { console.warn('boot config load:', e.message); }
}

// ── هل يحق للمستخدم رؤية أرقام التواصل؟ ──
function isContactVisible() {
  // المشترك Plus يرى دائماً
  if (P?.plus) return true;
  // الأدمن يرى دائماً
  if (ROLE === 'admin') return true;

  const now  = Date.now();
  const prov = P?.province || '';

  return CONTACT_CAMPAIGNS.some(c => {
    if (!c.active) return false;
    const start = c.startAt?.toMillis?.() ?? c.startAt ?? 0;
    const end   = c.endAt?.toMillis?.()   ?? c.endAt   ?? Infinity;
    if (now < start || now > end) return false;
    // إذا الحملة محددة بمحافظات، تحقق أن المستخدم في إحداها
    if (c.provinces?.length && !c.provinces.includes(prov)) return false;
    return true;
  });
}

// ── تمويه رقم الهاتف ──
function maskPhone(phone) {
  if (!phone) return '—';
  const p = phone.replace(/\s/g, '');
  if (p.length <= 5) return p;
  // أظهر 3 أرقام من البداية + XX + آخر رقمين
  return p.slice(0, 3) + 'X'.repeat(Math.min(p.length - 5, 5)) + p.slice(-2);
}

// ── توليد أزرار التواصل (أو شاشة القفل) ──
// phone: رقم الهاتف | wa: true/false | tg: معرّف تيليجرام (اختياري)
function renderContactBtns(phone, wa = true, tg = null) {
  const visible = isContactVisible();

  if (!visible) {
    return `
      <div class="contact-locked">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:rgba(245,158,11,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas fa-lock" style="color:#f59e0b;font-size:14px"></i>
          </div>
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--tx)">معلومات التواصل محمية</div>
            <div style="font-size:11px;color:var(--tx3)">
              الرقم: <span style="direction:ltr;letter-spacing:2px;font-family:monospace;color:var(--tx2)">${maskPhone(phone)}</span>
            </div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--tx3);margin-bottom:10px;padding:8px;background:var(--bgc2);border-radius:8px;border-right:3px solid #f59e0b">
          <i class="fas fa-crown" style="color:#f59e0b"></i>
          اشترك بخطة <strong>Plus</strong> لرؤية أرقام التواصل والتواصل المباشر عبر واتساب وتيليجرام
        </div>
        <button class="btn bsm bfu" style="background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#fff;border:none;font-weight:800"
          onclick="notify('Plus مطلوب','تواصل مع الإدارة لتفعيل اشتراك Plus والوصول لأرقام التواصل','info')">
          <i class="fas fa-crown"></i>اشترك Plus الآن
        </button>
      </div>`;
  }

  if (!phone) return '';
  const waNum  = '964' + phone.replace(/^0/, '').replace(/\s|-/g, '');
  let html = `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
    <a href="tel:${san(phone)}" class="btn bo bsm">
      <i class="fas fa-phone"></i>${san(phone)}
    </a>`;

  if (wa !== false) {
    html += `<a href="https://wa.me/${waNum}" target="_blank" rel="noopener"
      class="btn bsm" style="background:#25d366;color:#fff;border:none">
      <i class="fab fa-whatsapp"></i>واتساب
    </a>`;
  }

  if (tg) {
    const tgLink = tg.startsWith('http') ? tg : `https://t.me/${tg.replace('@', '')}`;
    html += `<a href="${tgLink}" target="_blank" rel="noopener"
      class="btn bsm" style="background:#0088cc;color:#fff;border:none">
      <i class="fab fa-telegram-plane"></i>تيليجرام
    </a>`;
  }

  html += `</div>`;
  return html;
}

// ════════════════════════════════════════════════════════
// إدارة الحملات — أدمن
// ════════════════════════════════════════════════════════

async function pgAdminCampaigns(el) {
  el.innerHTML = `<div class="es"><div class="es-ico"><i class="fas fa-circle-notch spin" style="color:var(--p)"></i></div><div class="es-desc">جارٍ التحميل...</div></div>`;

  let campaigns = [];
  if (!DEMO && window.db) {
    try {
      const snap = await window.db.collection('campaigns').orderBy('createdAt', 'desc').get();
      campaigns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { console.warn('campaigns admin:', e.message); }
  }

  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-bullhorn"></i></div>حملات ظهور أرقام التواصل</div>
      <button class="btn bp bsm" onclick="openAddCampaignModal()">
        <i class="fas fa-plus"></i>حملة جديدة
      </button>
    </div>

    <div class="card" style="margin-bottom:16px;padding:14px 16px;border-right:4px solid #f59e0b;background:rgba(245,158,11,.04)">
      <div style="font-size:12px;font-weight:700;color:var(--tx);margin-bottom:4px">
        <i class="fas fa-info-circle" style="color:#f59e0b"></i> كيف يعمل النظام؟
      </div>
      <div style="font-size:11px;color:var(--tx3);line-height:1.8">
        • المشتركون <strong>Plus</strong> يرون أرقام التواصل دائماً<br>
        • الحملات تتيح للمستخدمين العاديين رؤية الأرقام في فترة ومنطقة محددة<br>
        • خارج الحملات → الرقم مموّه وتظهر رسالة "اشترك Plus"
      </div>
    </div>

    <div id="campaignsList">
      ${campaigns.length ? campaigns.map(c => _campaignCard(c)).join('') : `
        <div class="card" style="text-align:center;padding:40px 20px;color:var(--tx3)">
          <i class="fas fa-bullhorn" style="font-size:40px;margin-bottom:12px;opacity:.3"></i>
          <div style="font-size:13px">لا توجد حملات بعد</div>
          <div style="font-size:11px;margin-top:4px">أنشئ حملة لإتاحة أرقام التواصل لفترة محددة</div>
        </div>`}
    </div>

    <!-- مودال إضافة / تعديل حملة -->
    <div id="moCampaign" class="mo" style="display:none" onclick="if(event.target===this)cmo('moCampaign')">
      <div class="mob" style="max-width:500px">
        <div class="mh">
          <div class="mt"><i class="fas fa-bullhorn" style="color:var(--p)"></i> <span id="campModalTitle">حملة جديدة</span></div>
          <div class="mc" onclick="cmo('moCampaign')"><i class="fas fa-times"></i></div>
        </div>
        <div class="mbod" id="moCampaignB"></div>
      </div>
    </div>`;
}

function _campaignCard(c) {
  const now   = Date.now();
  const start = c.startAt?.toMillis?.() ?? c.startAt ?? 0;
  const end   = c.endAt?.toMillis?.()   ?? c.endAt   ?? 0;
  const isRunning = c.active && now >= start && now <= end;
  const startStr  = start ? new Date(start).toLocaleDateString('ar-IQ') : '—';
  const endStr    = end   ? new Date(end).toLocaleDateString('ar-IQ')   : '—';
  const provStr   = c.provinces?.length ? c.provinces.join('، ') : 'جميع المحافظات';

  return `
    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
            <span class="b ${isRunning?'b-gr':c.active?'b-am':'b-rd'}" style="font-size:10px">
              <i class="fas fa-circle" style="font-size:7px"></i>
              ${isRunning ? 'نشطة الآن' : c.active ? 'مجدولة' : 'متوقفة'}
            </span>
            <div style="font-size:14px;font-weight:800;color:var(--tx)">${san(c.name || 'حملة بدون اسم')}</div>
          </div>
          <div style="font-size:11px;color:var(--tx3);display:flex;flex-wrap:wrap;gap:12px">
            <span><i class="fas fa-calendar-alt" style="color:var(--p)"></i> ${startStr} ← ${endStr}</span>
            <span><i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> ${provStr}</span>
          </div>
        </div>
        <div style="display:flex;gap:7px;flex-shrink:0">
          <button class="btn ${c.active?'bda':'bg'} bsm"
            onclick="adminToggleCampaign('${c.id}',${!c.active})">
            <i class="fas ${c.active?'fa-pause':'fa-play'}"></i>${c.active?'إيقاف':'تشغيل'}
          </button>
          <button class="btn bo bsm" onclick="openEditCampaign(${JSON.stringify(c).replace(/"/g,'&quot;')})">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn bda bsm" onclick="adminDeleteCampaign('${c.id}','${san(c.name||'')}')">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>`;
}

function openAddCampaignModal() {
  document.getElementById('campModalTitle').textContent = 'حملة جديدة';
  _renderCampaignForm(null);
  oMo('moCampaign');
}

function openEditCampaign(c) {
  document.getElementById('campModalTitle').textContent = 'تعديل الحملة';
  _renderCampaignForm(c);
  oMo('moCampaign');
}

function _renderCampaignForm(c) {
  const provChecks = PROVS.map(p => `
    <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer;padding:3px 0">
      <input type="checkbox" value="${p}" ${c?.provinces?.includes(p) ? 'checked' : ''}
        style="accent-color:var(--p)"> ${p}
    </label>`).join('');

  const toDateVal = (ts) => {
    if (!ts) return '';
    const d = new Date(ts?.toMillis?.() ?? ts);
    return d.toISOString().slice(0, 10);
  };

  document.getElementById('moCampaignB').innerHTML = `
    <input type="hidden" id="camp_id" value="${c?.id || ''}">
    <div class="fg">
      <label class="fl req">اسم الحملة</label>
      <input type="text" class="fc" id="camp_name" value="${san(c?.name||'')}" placeholder="مثال: حملة رمضان 2025">
    </div>
    <div class="fr">
      <div class="fg">
        <label class="fl req">تاريخ البداية</label>
        <input type="date" class="fc" id="camp_start" value="${toDateVal(c?.startAt)}">
      </div>
      <div class="fg">
        <label class="fl req">تاريخ الانتهاء</label>
        <input type="date" class="fc" id="camp_end" value="${toDateVal(c?.endAt)}">
      </div>
    </div>
    <div class="fg">
      <label class="fl">المحافظات (اتركها فارغة = جميع المحافظات)</label>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:2px 8px;padding:10px;border:1px solid var(--br);border-radius:10px;max-height:180px;overflow-y:auto" id="campProvs">
        ${provChecks}
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-top:4px">
      <label style="display:flex;align-items:center;gap:7px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="camp_active" ${c?.active !== false ? 'checked' : ''} style="accent-color:var(--p);width:16px;height:16px">
        <span style="font-weight:700">تفعيل الحملة مباشرة</span>
      </label>
    </div>
    <div class="mf" style="border:none;padding:0;margin-top:16px">
      <button class="btn bo" onclick="cmo('moCampaign')">إلغاء</button>
      <button class="btn bp bfu" id="saveCampBtn" onclick="adminSaveCampaign()">
        <i class="fas fa-save"></i>حفظ الحملة
      </button>
    </div>`;
}

async function adminSaveCampaign() {
  const id     = document.getElementById('camp_id')?.value;
  const name   = document.getElementById('camp_name')?.value.trim();
  const start  = document.getElementById('camp_start')?.value;
  const end    = document.getElementById('camp_end')?.value;
  const active = document.getElementById('camp_active')?.checked ?? true;
  const provs  = [...document.querySelectorAll('#campProvs input:checked')].map(i => i.value);

  if (!name)  { notify('خطأ', 'أدخل اسم الحملة', 'error'); return; }
  if (!start) { notify('خطأ', 'اختر تاريخ البداية', 'error'); return; }
  if (!end)   { notify('خطأ', 'اختر تاريخ الانتهاء', 'error'); return; }
  if (new Date(end) <= new Date(start)) { notify('خطأ', 'تاريخ الانتهاء يجب أن يكون بعد البداية', 'error'); return; }

  const data = {
    name, active,
    provinces: provs,
    startAt: firebase.firestore.Timestamp.fromDate(new Date(start)),
    endAt:   firebase.firestore.Timestamp.fromDate(new Date(end + 'T23:59:59')),
  };

  loading('saveCampBtn', true);
  try {
    if (!DEMO && window.db) {
      if (id) {
        await window.db.collection('campaigns').doc(id).update(data);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await window.db.collection('campaigns').add(data);
      }
      await loadContactCampaigns();
    }
    cmo('moCampaign');
    notify('تم ✅', id ? 'تم تحديث الحملة' : 'تم إنشاء الحملة', 'success');
    goTo('campaigns');
  } catch(e) {
    notify('خطأ', 'فشل الحفظ: ' + e.message, 'error');
  } finally { loading('saveCampBtn', false); }
}

async function adminToggleCampaign(id, newActive) {
  if (DEMO || !window.db) return;
  try {
    await window.db.collection('campaigns').doc(id).update({ active: newActive });
    await loadContactCampaigns();
    notify('تم ✅', newActive ? 'تم تشغيل الحملة' : 'تم إيقاف الحملة', 'success');
    goTo('campaigns');
  } catch(e) { notify('خطأ', 'فشلت العملية', 'error'); }
}

async function adminDeleteCampaign(id, name) {
  confirm2('حذف الحملة', `هل تريد حذف حملة "${name}"؟`, async () => {
    if (DEMO || !window.db) return;
    try {
      await window.db.collection('campaigns').doc(id).delete();
      CONTACT_CAMPAIGNS = CONTACT_CAMPAIGNS.filter(c => c.id !== id);
      notify('تم ✅', 'تم حذف الحملة', 'success');
      goTo('campaigns');
    } catch(e) { notify('خطأ', 'فشل الحذف', 'error'); }
  });
}

// ── تفعيل / إلغاء Plus من لوحة المستخدمين ──
async function adminToggleUserPlus(uid, newVal, name) {
  if (DEMO || !window.db) return;
  const label = newVal ? 'تفعيل Plus' : 'إلغاء Plus';
  confirm2(label, `هل تريد ${label} للمستخدم "${name}"؟`, async () => {
    try {
      await window.db.collection('users').doc(uid).update({ plus: newVal });
      const u = (window._adminUsers || []).find(u => u.id === uid);
      if (u) u.plus = newVal;
      renderAdminUsersList();
      notify('تم ✅', `${newVal ? 'تم تفعيل' : 'تم إلغاء'} Plus للمستخدم "${name}"`, 'success');
    } catch(e) { notify('خطأ', 'فشلت العملية: ' + e.message, 'error'); }
  });
}

// ════════════════════════════════════════════════════════
// النشر التلقائي على السوشال ميديا عند نشر وظيفة
// ════════════════════════════════════════════════════════
async function autoPostJob(job) {
  if (!job) return;
  const sal   = job.salary ? `${job.salary.toLocaleString('ar')} IQD` : 'قابل للتفاوض';
  const site  = CFG.general?.siteUrl || location.href;
  const prov  = job.province || '';
  const type  = job.type === 'full' ? 'دوام كامل' : job.type === 'part' ? 'دوام جزئي' : 'مستقل';

  const tgText =
`📢 <b>وظيفة جديدة — الفانوس للتوظيف</b>

🏢 <b>${job.title}</b>
🏛 ${job.company}
📍 ${prov} | ${type}
💰 ${sal}

${job.desc ? job.desc.slice(0, 200) + (job.desc.length > 200 ? '...' : '') : ''}

🔗 للتقديم: ${site}
#وظائف #${prov.replace(/\s/g,'')} #العراق`;

  const fbText =
`📢 وظيفة جديدة — ${job.title}
🏛 ${job.company} | 📍 ${prov}
💰 ${sal}

${job.desc ? job.desc.slice(0, 300) : ''}

سجّل وتقدّم الآن: ${site}
#وظائف_العراق #${prov.replace(/\s/g,'')}`;

  const results = [];

  // Telegram Channel
  if (CFG.telegram?.autoPost && CFG.telegram.bot && CFG.telegram.channel) {
    try {
      const r = await fetch(`https://api.telegram.org/bot${CFG.telegram.bot}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CFG.telegram.channel, text: tgText, parse_mode: 'HTML' })
      });
      const d = await r.json();
      results.push(d.ok ? '✅ Telegram' : `❌ Telegram: ${d.description}`);
    } catch(e) { results.push('❌ Telegram: خطأ في الاتصال'); }
  }

  // Facebook Page
  if (CFG.facebook?.autoPost && CFG.facebook.pageToken && CFG.facebook.pageId) {
    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${CFG.facebook.pageId}/feed`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: fbText, access_token: CFG.facebook.pageToken })
      });
      const d = await r.json();
      results.push(d.id ? '✅ Facebook' : `❌ Facebook: ${d.error?.message || 'فشل'}`);
    } catch(e) { results.push('❌ Facebook: خطأ في الاتصال'); }
  }

  if (results.length) {
    console.info('Auto-post results:', results.join(' | '));
  }
}

