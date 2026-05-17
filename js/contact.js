// ╔══════════════════════════════════════════════════════╗
// ║  عفراء — نظام التواصل الخارجي (Plus + حملات)       ║
// ╚══════════════════════════════════════════════════════╝

let CONTACT_CAMPAIGNS = [];

// ── تحميل الحملات النشطة من Firestore ──
async function loadContactCampaigns() {
  if (DEMO || !window.db) return;
  try {
    const [campSnap, cfgDoc, hiringSnap, bannerSnap] = await Promise.all([
      window.db.collection('campaigns').where('active', '==', true).get(),
      window.db.collection('config').doc('settings').get(),
      window.db.collection('hiring_campaigns').where('active', '==', true).get(),
      window.db.collection('banners').where('active', '==', true).get(),
    ]);
    CONTACT_CAMPAIGNS  = campSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.HIRING_CAMPS = hiringSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.BANNERS      = bannerSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (cfgDoc.exists) {
      const s = cfgDoc.data();
      ['telegram','emailjs','imgbb','facebook','instagram','twitter','linkedin','tiktok','snapchat','youtube','gemini','general','site'].forEach(k => {
        if (s[k]) CFG[k] = { ...CFG[k], ...s[k] };
      });
      _refreshWaFloat();
    }
  } catch(e) { console.warn('boot config load:', e.message); }
}

// ── عرض البانرات النشطة حسب الموضع ──
function renderActiveBanners(position) {
  const now = Date.now();
  const list = (window.BANNERS || []).filter(b => {
    if (!b.active) return false;
    if (b.position !== position && b.position !== 'both') return false;
    const s = b.startAt?.toMillis?.() ?? 0;
    const e = b.endAt?.toMillis?.()   ?? 0;
    if (s && now < s) return false;
    if (e && now > e) return false;
    return true;
  });
  if (!list.length) return '';
  return list.map(b => `
    <a href="${b.linkUrl||'#'}" target="${b.linkUrl?'_blank':'_self'}" rel="noopener"
       onclick="trackBannerClick('${b.id}')"
       style="display:block;margin-bottom:12px;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);cursor:pointer">
      <img src="${b.imageUrl}" alt="${san(b.title||'إعلان')}"
           style="width:100%;height:auto;display:block;max-height:130px;object-fit:cover"
           onerror="this.parentElement.style.display='none'">
    </a>`).join('');
}

function trackBannerClick(id) {
  if (DEMO || !window.db || !id) return;
  window.db.collection('banners').doc(id).update({
    clickCount: firebase.firestore.FieldValue.increment(1)
  }).catch(() => {});
}

// ── قسم حملات التوظيف الجماعي (للباحثين) ──
function renderHiringCampsSection() {
  const now = Date.now();
  const list = (window.HIRING_CAMPS || []).filter(c => {
    if (!c.active) return false;
    const end = c.deadline?.toMillis?.() ?? 0;
    return !end || now <= end;
  });
  if (!list.length) return '';
  return `
    <div class="sh fade-up">
      <div class="st"><div class="st-ico" style="background:linear-gradient(135deg,var(--p),var(--pd))"><i class="fas fa-users"></i></div>حملات التوظيف الجماعي</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:4px" class="fade-up">
      ${list.map(c => _hiringCampPublicCard(c)).join('')}
    </div>`;
}

function _hiringCampPublicCard(c) {
  const now = Date.now();
  const end = c.deadline?.toMillis?.() ?? 0;
  const dLeft = end ? Math.ceil((end - now) / 86400000) : null;
  const positions = c.positions || [];
  const typeLabel = { full:'كامل', part:'جزئي', remote:'بُعد', gig:'مهمة' };

  return `<div class="card" style="border-right:4px solid var(--p);padding:14px 16px">
    <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div style="width:46px;height:46px;border-radius:12px;background:var(--grad-p);color:#fff;font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${c.company?.charAt(0)||'ش'}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:900;color:var(--tx);margin-bottom:3px">${san(c.title||c.company||'حملة توظيف')}</div>
        <div style="font-size:11px;color:var(--tx3);display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
          <span><i class="fas fa-building" style="color:var(--p)"></i> ${san(c.company||'—')}</span>
          ${c.province ? `<span><i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> ${san(c.province)}</span>` : ''}
          ${dLeft !== null ? `<span style="color:${dLeft<=3?'var(--danger)':'var(--acc)'}"><i class="fas fa-calendar-alt"></i> ${dLeft > 0 ? 'متبقي ' + dLeft + ' يوم' : 'آخر موعد اليوم'}</span>` : ''}
        </div>
        ${positions.length ? `<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px">
          ${positions.map(p=>`<span class="b b-tl" style="font-size:10px"><i class="fas fa-user-tie"></i> ${san(p.title)}${p.count>1?' ×'+p.count:''}${p.type?` • ${typeLabel[p.type]||p.type}`:''}</span>`).join('')}
        </div>` : ''}
        ${c.desc ? `<div style="font-size:11px;color:var(--tx2);line-height:1.6">${san(c.desc)}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        ${c.applyUrl ? `<a href="${c.applyUrl}" target="_blank" rel="noopener" class="btn bp bsm"><i class="fas fa-external-link-alt"></i>تقديم</a>` : ''}
        ${c.phone ? `<a href="tel:${san(c.phone)}" class="btn bo bsm"><i class="fas fa-phone"></i>${san(c.phone)}</a>` : ''}
      </div>
    </div>
  </div>`;
}

// ── هل يحق للمستخدم رؤية أرقام التواصل؟ ──
function isContactVisible() {
  // الأدمن يرى دائماً
  if (ROLE === 'admin') return true;
  // المشترك بأي خطة مدفوعة يرى أرقام التواصل
  const plan = typeof getUserPlan === 'function' ? getUserPlan() : (P?.plan || 'free');
  if (P?.plus || plan === 'standard' || plan === 'premium') return true;

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

  let phoneCamps = [], hiringCamps = [], banners = [];
  if (!DEMO && window.db) {
    try {
      const [c1, c2, c3] = await Promise.all([
        window.db.collection('campaigns').orderBy('createdAt','desc').get(),
        window.db.collection('hiring_campaigns').orderBy('createdAt','desc').get(),
        window.db.collection('banners').orderBy('createdAt','desc').get(),
      ]);
      phoneCamps  = c1.docs.map(d => ({ id:d.id, ...d.data() }));
      hiringCamps = c2.docs.map(d => ({ id:d.id, ...d.data() }));
      banners     = c3.docs.map(d => ({ id:d.id, ...d.data() }));
    } catch(e) { notify('تحذير','تعذّر التحميل: '+e.message,'error'); }
  }

  window._phoneCamps  = phoneCamps;
  window._hiringCamps = hiringCamps;
  window._banners     = banners;

  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-bullhorn"></i></div>الحملات والإعلانات</div>
    </div>

    <div class="tabs" style="margin-bottom:16px">
      <button class="tb2 on" id="ctab_hiring" onclick="switchCampTab('hiring',this)">
        <i class="fas fa-users"></i>حملات التوظيف <span class="nbadge" style="background:var(--p)">${hiringCamps.length}</span>
      </button>
      <button class="tb2" id="ctab_banners" onclick="switchCampTab('banners',this)">
        <i class="fas fa-image"></i>الإعلانات والبانرات <span class="nbadge" style="background:var(--acc)">${banners.length}</span>
      </button>
      <button class="tb2" id="ctab_phone" onclick="switchCampTab('phone',this)">
        <i class="fas fa-phone"></i>حملات الأرقام <span class="nbadge" style="background:var(--info)">${phoneCamps.length}</span>
      </button>
    </div>

    <div id="ctab_hiring_content">${_renderHiringTab(hiringCamps)}</div>
    <div id="ctab_banners_content" style="display:none">${_renderBannersTab(banners)}</div>
    <div id="ctab_phone_content"   style="display:none">${_renderPhoneTab(phoneCamps)}</div>

    <!-- مودال عام للحملات -->
    <div id="moCampaign" class="mo" onclick="if(event.target===this)cmo('moCampaign')">
      <div class="md" style="max-width:520px">
        <div class="mh">
          <div class="mt"><i class="fas fa-bullhorn" style="color:var(--p)"></i> <span id="campModalTitle"></span></div>
          <div class="mc" onclick="cmo('moCampaign')"><i class="fas fa-times"></i></div>
        </div>
        <div class="mb" id="moCampaignB"></div>
      </div>
    </div>`;
}

function switchCampTab(tab, btn) {
  ['hiring','banners','phone'].forEach(t => {
    document.getElementById('ctab_'+t+'_content').style.display = t===tab ? '' : 'none';
    const b = document.getElementById('ctab_'+t);
    if (b) b.className = 'tb2' + (t===tab?' on':'');
  });
}

// ════════════════════════
// تبويب 1: حملات التوظيف الجماعي
// ════════════════════════
function _renderHiringTab(list) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:12px;color:var(--tx3)">الشركات تنشر حملات لتوظيف عدة أشخاص دفعة واحدة — تظهر بشكل بارز للباحثين</div>
      <button class="btn bp bsm" onclick="openHiringCampaignModal()"><i class="fas fa-plus"></i>حملة جديدة</button>
    </div>
    ${!list.length
      ? emptyState('🏢','لا توجد حملات توظيف بعد','أنشئ أول حملة توظيف جماعي')
      : list.map(c => _hiringCampCard(c)).join('')}`;
}

function _hiringCampCard(c) {
  const now  = Date.now();
  const end  = c.deadline?.toMillis?.() ?? c.deadline ?? 0;
  const isActive = c.active && (!end || now <= end);
  const endStr   = end ? new Date(end).toLocaleDateString('ar-IQ') : '—';
  const positions = c.positions || [];

  return `<div class="card" style="margin-bottom:12px;border-right:4px solid ${isActive?'var(--p)':'var(--tx3)'}">
    <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <div style="width:46px;height:46px;border-radius:12px;background:${isActive?'var(--grad-p)':'linear-gradient(135deg,#9ca3af,#6b7280)'};color:#fff;font-size:20px;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${c.company?.charAt(0)||'ش'}
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px">
          <span class="b ${isActive?'b-gr':'b-rd'}" style="font-size:10px"><i class="fas fa-circle" style="font-size:7px"></i>${isActive?'نشطة':'متوقفة'}</span>
          <div style="font-size:14px;font-weight:900;color:var(--tx)">${san(c.title||c.company||'حملة توظيف')}</div>
        </div>
        <div style="font-size:11px;color:var(--tx3);display:flex;gap:12px;flex-wrap:wrap">
          <span><i class="fas fa-building" style="color:var(--p)"></i> ${san(c.company||'—')}</span>
          ${c.province ? `<span><i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> ${san(c.province)}</span>` : ''}
          <span><i class="fas fa-calendar-alt" style="color:var(--acc)"></i> حتى: ${endStr}</span>
          <span><i class="fas fa-users" style="color:var(--info)"></i> ${positions.length} وظيفة</span>
        </div>
        ${positions.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px">
          ${positions.map(p=>`<span class="b b-tl" style="font-size:10px">${san(p.title)}${p.count>1?' ×'+p.count:''}</span>`).join('')}
        </div>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn ${c.active?'bda':'bg'} bsm" onclick="toggleHiringCamp('${c.id}',${!c.active})">
          <i class="fas ${c.active?'fa-pause':'fa-play'}"></i>
        </button>
        <button class="btn bo bsm" onclick="openHiringCampaignModal(${JSON.stringify(c).replace(/"/g,'&quot;')})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn bda bsm" onclick="deleteHiringCamp('${c.id}','${san(c.title||c.company||'')}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  </div>`;
}

function openHiringCampaignModal(c) {
  c = c || null;
  document.getElementById('campModalTitle').textContent = c ? 'تعديل حملة التوظيف' : 'حملة توظيف جماعي جديدة';
  const toDate = ts => ts ? new Date(ts?.toMillis?.()??ts).toISOString().slice(0,10) : '';
  const positions = c?.positions || [{ title:'', count:1, type:'full' }];

  document.getElementById('moCampaignB').innerHTML = `
    <input type="hidden" id="hc_id" value="${c?.id||''}">
    <div class="fr">
      <div class="fg"><label class="fl req">اسم الشركة</label>
        <input type="text" class="fc" id="hc_company" value="${san(c?.company||'')}" placeholder="شركة المثنى">
      </div>
      <div class="fg"><label class="fl req">عنوان الحملة</label>
        <input type="text" class="fc" id="hc_title" value="${san(c?.title||'')}" placeholder="نحن نوظّف!">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl">المحافظة</label>
        <select class="fc" id="hc_province">
          <option value="">جميع المحافظات</option>
          ${(typeof PROVS!=='undefined'?PROVS:[]).map(p=>`<option value="${p}" ${c?.province===p?'selected':''}>${p}</option>`).join('')}
        </select>
      </div>
      <div class="fg"><label class="fl">آخر موعد للتقديم</label>
        <input type="date" class="fc" id="hc_deadline" value="${toDate(c?.deadline)}">
      </div>
    </div>
    <div class="fg"><label class="fl">وصف الحملة</label>
      <textarea class="fc" id="hc_desc" rows="2" placeholder="نبذة عن الشركة وطبيعة العمل...">${san(c?.desc||'')}</textarea>
    </div>
    <div class="fg"><label class="fl">رقم التواصل</label>
      <input type="tel" class="fc" id="hc_phone" value="${san(c?.phone||c?.contactPhone||'')}" placeholder="07701234567">
    </div>
    <div class="fg"><label class="fl">رابط التقديم (اختياري)</label>
      <input type="url" class="fc" id="hc_applyUrl" value="${san(c?.applyUrl||'')}" placeholder="https://...">
    </div>
    <div style="font-size:12px;font-weight:800;color:var(--tx);margin-bottom:8px">الوظائف المطلوبة</div>
    <div id="hc_positions">
      ${positions.map((p,i) => _positionRow(p,i)).join('')}
    </div>
    <button class="btn bg bsm" style="margin-bottom:14px" onclick="addPositionRow()">
      <i class="fas fa-plus"></i>أضف وظيفة
    </button>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:14px">
      <input type="checkbox" id="hc_active" ${c?.active!==false?'checked':''} style="accent-color:var(--p);width:16px;height:16px">
      <span>نشر الحملة فوراً</span>
    </label>
    <div class="mf"><button class="btn bo" onclick="cmo('moCampaign')">إلغاء</button>
      <button class="btn bp bfu" id="saveHcBtn" onclick="saveHiringCampaign()"><i class="fas fa-save"></i>حفظ الحملة</button>
    </div>`;
  oMo('moCampaign');
}

function _positionRow(p, i) {
  return `<div style="display:flex;gap:7px;margin-bottom:7px;align-items:center" id="prow_${i}">
    <input type="text" class="fc" style="flex:2" placeholder="المسمى الوظيفي" value="${san(p.title||'')}" data-pi="${i}" data-pf="title">
    <input type="number" class="fc" style="flex:0 0 60px" placeholder="عدد" min="1" value="${p.count||1}" data-pi="${i}" data-pf="count">
    <select class="fc" style="flex:1" data-pi="${i}" data-pf="type">
      ${['full','part','remote','gig'].map(t=>`<option value="${t}" ${p.type===t?'selected':''}>${{full:'كامل',part:'جزئي',remote:'بُعد',gig:'مهمة'}[t]}</option>`).join('')}
    </select>
    <button class="btn bda bsm" onclick="document.getElementById('prow_${i}').remove()"><i class="fas fa-times"></i></button>
  </div>`;
}

let _posIdx = 10;
function addPositionRow() {
  const container = document.getElementById('hc_positions');
  const div = document.createElement('div');
  div.innerHTML = _positionRow({ title:'', count:1, type:'full' }, ++_posIdx);
  container.appendChild(div.firstElementChild);
}

async function saveHiringCampaign() {
  const id       = document.getElementById('hc_id')?.value;
  const company  = document.getElementById('hc_company')?.value.trim();
  const title    = document.getElementById('hc_title')?.value.trim();
  const province = document.getElementById('hc_province')?.value;
  const deadline = document.getElementById('hc_deadline')?.value;
  const desc     = document.getElementById('hc_desc')?.value.trim();
  const phone    = document.getElementById('hc_phone')?.value.trim();
  const applyUrl = document.getElementById('hc_applyUrl')?.value.trim();
  const active   = document.getElementById('hc_active')?.checked ?? true;

  if (!company) { notify('خطأ','أدخل اسم الشركة','error'); return; }
  if (!title)   { notify('خطأ','أدخل عنوان الحملة','error'); return; }

  const positions = [...document.querySelectorAll('#hc_positions > div')].map(row => ({
    title: row.querySelector('[data-pf="title"]')?.value.trim() || '',
    count: parseInt(row.querySelector('[data-pf="count"]')?.value) || 1,
    type:  row.querySelector('[data-pf="type"]')?.value || 'full',
  })).filter(p => p.title);

  const data = {
    company, title, province, desc, phone, applyUrl, active, positions,
    deadline: deadline ? firebase.firestore.Timestamp.fromDate(new Date(deadline+'T23:59:59')) : null,
  };

  loading('saveHcBtn', true);
  try {
    if (!DEMO && window.db) {
      if (id) await window.db.collection('hiring_campaigns').doc(id).update(data);
      else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await window.db.collection('hiring_campaigns').add(data);
      }
    }
    cmo('moCampaign');
    notify('تم ✅', id ? 'تم تحديث الحملة' : 'تم إنشاء حملة التوظيف', 'success');
    goTo('campaigns');
  } catch(e) { notify('خطأ','فشل الحفظ: '+e.message,'error'); }
  finally { loading('saveHcBtn', false); }
}

async function toggleHiringCamp(id, val) {
  if (DEMO || !window.db) return;
  try {
    await window.db.collection('hiring_campaigns').doc(id).update({ active: val });
    notify('تم ✅', val ? 'تم تشغيل الحملة' : 'تم إيقاف الحملة', 'success');
    goTo('campaigns');
  } catch(e) { notify('خطأ','فشلت العملية','error'); }
}

async function deleteHiringCamp(id, name) {
  confirm2('حذف الحملة', `حذف حملة "${name}" نهائياً؟`, async () => {
    if (DEMO || !window.db) return;
    try {
      await window.db.collection('hiring_campaigns').doc(id).delete();
      notify('تم ✅','تم حذف الحملة','success');
      goTo('campaigns');
    } catch(e) { notify('خطأ','فشل الحذف','error'); }
  });
}

// ════════════════════════
// تبويب 2: الإعلانات والبانرات
// ════════════════════════
function _renderBannersTab(list) {
  const sponsored = JOBS.filter(j => j.sponsored);
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div style="font-size:12px;color:var(--tx3)">بانرات إعلانية تظهر في الصفحة الرئيسية وصفحة الوظائف</div>
      <button class="btn bp bsm" onclick="openBannerModal()"><i class="fas fa-plus"></i>إعلان جديد</button>
    </div>

    <!-- الوظائف المموّلة -->
    <div class="card" style="margin-bottom:16px;padding:14px">
      <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:10px">
        <i class="fas fa-ad" style="color:var(--acc)"></i> وظائف مموّلة (Sponsored)
        <span class="b b-am" style="font-size:10px;margin-right:6px">${sponsored.length} وظيفة</span>
      </div>
      <div style="font-size:11px;color:var(--tx3);margin-bottom:10px">الوظائف المميزة (⭐) تظهر في الصدارة — تمييزها من صفحة الوظائف بزر "تمييز ⭐"</div>
      ${sponsored.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:6px">${sponsored.map(j=>`
            <div style="display:flex;align-items:center;gap:6px;background:var(--bgc2);border-radius:8px;padding:6px 10px;font-size:11px">
              <i class="fas fa-star" style="color:var(--acc)"></i>
              <span style="font-weight:700">${san(j.title)}</span>
              <span style="color:var(--tx3)">${san(j.company||'')}</span>
              <button class="btn bda bsm" style="font-size:10px;padding:3px 7px" onclick="adminFeatureJob('${j.id}',false,'${san(j.title)}')">إلغاء</button>
            </div>`).join('')}
          </div>`
        : `<div style="font-size:11px;color:var(--tx3)">لا توجد وظائف مموّلة حالياً — ميّز الوظائف من صفحة الوظائف</div>`}
    </div>

    <!-- البانرات -->
    <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:10px">البانرات الإعلانية</div>
    ${!list.length
      ? emptyState('🖼','لا توجد بانرات بعد','أضف أول إعلان بانر')
      : list.map(b => _bannerCard(b)).join('')}`;
}

function _bannerCard(b) {
  const now  = Date.now();
  const start = b.startAt?.toMillis?.() ?? 0;
  const end   = b.endAt?.toMillis?.()   ?? 0;
  const isLive = b.active && (!start || now >= start) && (!end || now <= end);
  const POS = { home:'الرئيسية', jobs:'الوظائف', both:'كليهما' };

  return `<div class="card" style="margin-bottom:12px">
    <div style="display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
      ${b.imageUrl
        ? `<img src="${b.imageUrl}" style="width:90px;height:50px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1px solid var(--br)">`
        : `<div style="width:90px;height:50px;background:var(--bgc2);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-image" style="color:var(--tx3)"></i></div>`}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span class="b ${isLive?'b-gr':'b-rd'}" style="font-size:10px">${isLive?'نشط':'متوقف'}</span>
          <div style="font-size:13px;font-weight:800;color:var(--tx)">${san(b.title||'إعلان')}</div>
        </div>
        <div style="font-size:11px;color:var(--tx3);display:flex;gap:10px;flex-wrap:wrap">
          <span><i class="fas fa-map-signs" style="color:var(--p)"></i> ${POS[b.position]||b.position}</span>
          ${b.clickCount ? `<span><i class="fas fa-mouse-pointer"></i> ${b.clickCount} ضغطة</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn ${b.active?'bda':'bg'} bsm" onclick="toggleBanner('${b.id}',${!b.active})">
          <i class="fas ${b.active?'fa-pause':'fa-play'}"></i>
        </button>
        <button class="btn bo bsm" onclick="openBannerModal(${JSON.stringify(b).replace(/"/g,'&quot;')})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn bda bsm" onclick="deleteBanner('${b.id}','${san(b.title||'')}')">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>
  </div>`;
}

function openBannerModal(b) {
  b = b || null;
  document.getElementById('campModalTitle').textContent = b ? 'تعديل الإعلان' : 'إعلان بانر جديد';
  const toDate = ts => ts ? new Date(ts?.toMillis?.()??ts).toISOString().slice(0,10) : '';

  document.getElementById('moCampaignB').innerHTML = `
    <input type="hidden" id="bn_id" value="${b?.id||''}">
    <div class="fg"><label class="fl req">اسم الإعلان</label>
      <input type="text" class="fc" id="bn_title" value="${san(b?.title||'')}" placeholder="إعلان شركة المثنى">
    </div>
    <div class="fg"><label class="fl req">رابط الصورة</label>
      <input type="url" class="fc" id="bn_img" value="${san(b?.imageUrl||'')}" placeholder="https://... (1200×300px مثالي)">
    </div>
    <div class="fg"><label class="fl">رابط الضغط</label>
      <input type="url" class="fc" id="bn_link" value="${san(b?.linkUrl||'')}" placeholder="https://...">
    </div>
    <div class="fr">
      <div class="fg"><label class="fl req">موضع الظهور</label>
        <select class="fc" id="bn_pos">
          <option value="home"  ${b?.position==='home' ?'selected':''}>الصفحة الرئيسية</option>
          <option value="jobs"  ${b?.position==='jobs' ?'selected':''}>صفحة الوظائف</option>
          <option value="both"  ${b?.position==='both' ?'selected':''}>كلا الصفحتين</option>
        </select>
      </div>
      <div class="fg"><label class="fl">تاريخ البداية</label>
        <input type="date" class="fc" id="bn_start" value="${toDate(b?.startAt)}">
      </div>
    </div>
    <div class="fg"><label class="fl">تاريخ الانتهاء</label>
      <input type="date" class="fc" id="bn_end" value="${toDate(b?.endAt)}">
    </div>
    <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;margin-bottom:14px">
      <input type="checkbox" id="bn_active" ${b?.active!==false?'checked':''} style="accent-color:var(--p);width:16px;height:16px">
      <span>تفعيل الإعلان فوراً</span>
    </label>
    <div class="mf"><button class="btn bo" onclick="cmo('moCampaign')">إلغاء</button>
      <button class="btn bp bfu" id="saveBnBtn" onclick="saveBanner()"><i class="fas fa-save"></i>حفظ الإعلان</button>
    </div>`;
  oMo('moCampaign');
}

async function saveBanner() {
  const id     = document.getElementById('bn_id')?.value;
  const title  = document.getElementById('bn_title')?.value.trim();
  const imgUrl = document.getElementById('bn_img')?.value.trim();
  const linkUrl= document.getElementById('bn_link')?.value.trim();
  const pos    = document.getElementById('bn_pos')?.value;
  const start  = document.getElementById('bn_start')?.value;
  const end    = document.getElementById('bn_end')?.value;
  const active = document.getElementById('bn_active')?.checked ?? true;

  if (!title)  { notify('خطأ','أدخل اسم الإعلان','error'); return; }
  if (!imgUrl) { notify('خطأ','أدخل رابط الصورة','error'); return; }

  const data = {
    title, imageUrl: imgUrl, linkUrl, position: pos, active, clickCount: 0,
    startAt: start ? firebase.firestore.Timestamp.fromDate(new Date(start)) : null,
    endAt:   end   ? firebase.firestore.Timestamp.fromDate(new Date(end+'T23:59:59')) : null,
  };

  loading('saveBnBtn', true);
  try {
    if (!DEMO && window.db) {
      if (id) await window.db.collection('banners').doc(id).update(data);
      else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await window.db.collection('banners').add(data);
      }
    }
    cmo('moCampaign');
    notify('تم ✅', id ? 'تم تحديث الإعلان' : 'تم إضافة الإعلان', 'success');
    goTo('campaigns');
  } catch(e) { notify('خطأ','فشل الحفظ: '+e.message,'error'); }
  finally { loading('saveBnBtn', false); }
}

async function toggleBanner(id, val) {
  if (DEMO || !window.db) return;
  try {
    await window.db.collection('banners').doc(id).update({ active: val });
    notify('تم ✅', val ? 'تم تشغيل الإعلان' : 'تم إيقاف الإعلان', 'success');
    goTo('campaigns');
  } catch(e) { notify('خطأ','فشلت العملية','error'); }
}

async function deleteBanner(id, name) {
  confirm2('حذف الإعلان', `حذف إعلان "${name}" نهائياً؟`, async () => {
    if (DEMO || !window.db) return;
    try {
      await window.db.collection('banners').doc(id).delete();
      notify('تم ✅','تم حذف الإعلان','success');
      goTo('campaigns');
    } catch(e) { notify('خطأ','فشل الحذف','error'); }
  });
}

// ════════════════════════
// تبويب 3: حملات الأرقام (الموجودة)
// ════════════════════════
function _renderPhoneTab(campaigns) {
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div class="card" style="padding:12px 14px;border-right:4px solid #f59e0b;background:rgba(245,158,11,.04);flex:1">
        <div style="font-size:11px;color:var(--tx3);line-height:1.7">
          <i class="fas fa-info-circle" style="color:#f59e0b"></i>
          المشتركون <strong>Plus</strong> يرون الأرقام دائماً •
          الحملات تتيح للعاديين رؤيتها في فترة محددة
        </div>
      </div>
      <button class="btn bp bsm" onclick="openAddCampaignModal()"><i class="fas fa-plus"></i>حملة جديدة</button>
    </div>
    <div id="campaignsList">
      ${campaigns.length ? campaigns.map(c => _campaignCard(c)).join('') : emptyState('📞','لا توجد حملات بعد','أنشئ حملة لإتاحة الأرقام')}
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
    <div class="mf">
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
  const jobURL = job.id ? `https://api.afra-iq.com/job/${job.id}` : (CFG.general?.siteUrl || 'https://afra-iq.com');
  const prov  = job.province || '';
  const TYPE_AR = { full:'دوام كامل', part:'دوام جزئي', remote:'عن بُعد', gig:'مهمة' };
  const type  = TYPE_AR[job.type] || job.type || '';

  const tgText =
`📢 <b>وظيفة جديدة — عفراء للتوظيف</b>

🏢 <b>${job.title}</b>
🏛 ${job.company || ''}
📍 ${prov}${type ? ' | ' + type : ''}
💰 ${sal}

${job.desc ? job.desc.slice(0, 200) + (job.desc.length > 200 ? '...' : '') : ''}

🔗 <a href="${jobURL}">تقدّم الآن</a>
#وظائف #${prov.replace(/\s/g,'_')} #العراق #عفراء`;

  const fbText =
`📢 وظيفة جديدة — ${job.title}
🏛 ${job.company || ''} | 📍 ${prov}
💰 ${sal}

${job.desc ? job.desc.slice(0, 300) : ''}

سجّل وتقدّم الآن: ${jobURL}
#وظائف_العراق #${prov.replace(/\s/g,'_')} #عفراء`;

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

