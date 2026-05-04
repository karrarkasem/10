// ╔══════════════════════════════════════════════════════╗
// ║  عفراء للتوظيف — cv.js                              ║
// ║  منشئ السيرة الذاتية + تحميل PDF                   ║
// ╚══════════════════════════════════════════════════════╝

let cvSkills    = [];
let cvExps      = [];
let cvEdus      = [];
let expIdx      = 0;
let eduIdx      = 0;
let _cvPhotoUrl = '';   // URL الصورة الشخصية المرفوعة

// ── تحميل السيرة المحفوظة من Firestore ──
async function loadCVData() {
  if (DEMO || !window.db || !U) return null;
  try {
    const doc = await window.db.collection('cvs').doc(U.uid).get();
    return doc.exists ? doc.data() : null;
  } catch(e) { console.warn('cv load:', e.message); return null; }
}

// ── فتح منشئ السيرة — يفرّق بين الباحث والشركة ──
async function buildCVModal() {
  const titleEl = document.querySelector('#moCV .mt');
  if (ROLE === 'office' || ROLE === 'employer') {
    if (titleEl) titleEl.innerHTML = `<i class="fas fa-building" style="color:var(--p)"></i> ملف الشركة / المكتب`;
    return buildCompanyProfileModal();
  }
  if (titleEl) titleEl.innerHTML = `<i class="fas fa-file-alt" style="color:var(--p)"></i> منشئ السيرة الذاتية`;
  return _buildSeekerCVModal();
}

async function _buildSeekerCVModal() {
  const el = document.getElementById('moCVB');
  if (!el) return;

  el.innerHTML = `<div style="text-align:center;padding:40px 20px">
    <div class="spin2" style="margin:0 auto 12px"></div>
    <div style="font-size:13px;color:var(--tx2)">جارٍ تحميل سيرتك الذاتية...</div>
  </div>`;

  const saved  = await loadCVData();
  cvSkills     = saved?.skills || P?.skills || [];
  cvExps       = saved?.exps   || [];
  cvEdus       = saved?.edus   || [];
  expIdx       = cvExps.length;
  eduIdx       = cvEdus.length;
  _cvPhotoUrl  = saved?.photoUrl || '';

  const v = (field, fallback = '') => saved?.[field] ?? P?.[field] ?? fallback;

  // درجة المقابلة الذكية المحفوظة
  const ivScore = saved?.ivScore ?? localStorage.getItem(`iv_last_score_${U?.uid}`) ?? null;
  const ivBadge = ivScore !== null ? `
    <div style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;
      background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(139,92,246,.06));
      border:1px solid rgba(139,92,246,.25);border-radius:20px;font-size:11px;
      font-weight:700;color:var(--purple);margin-right:6px">
      <i class="fas fa-robot"></i> درجة المقابلة: <strong>${ivScore}/100</strong>
    </div>` : '';

  el.innerHTML = `
    ${saved ? `<div class="al al-i" style="margin-bottom:12px;padding:8px 14px">
      <i class="fas fa-check-circle" style="color:var(--success)"></i>
      <span style="font-size:12px">سيرتك الذاتية محفوظة — تحريرها سيُحدّث النسخة المحفوظة${ivBadge}</span>
    </div>` : ''}

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px">
      <div>
        <!-- تبويبات -->
        <div class="tabs" style="margin-bottom:13px">
          <button class="tb2 on" onclick="swCvTab('basic',this)">الأساسيات</button>
          <button class="tb2"    onclick="swCvTab('exp',this)">الخبرة</button>
          <button class="tb2"    onclick="swCvTab('edu',this)">التعليم</button>
          <button class="tb2"    onclick="swCvTab('skills',this)">المهارات</button>
        </div>

        <!-- الأساسيات -->
        <div id="cvtBasic">
          <!-- صورة شخصية -->
          <div class="fg">
            <label class="fl">الصورة الشخصية</label>
            <div style="display:flex;align-items:center;gap:12px">
              <div id="cvPhotoCircle" style="width:60px;height:60px;border-radius:50%;
                background:var(--bgc2);border:2.5px dashed var(--br);
                display:flex;align-items:center;justify-content:center;
                overflow:hidden;flex-shrink:0;cursor:pointer"
                onclick="document.getElementById('cvPhotoInput').click()">
                ${_cvPhotoUrl
                  ? `<img src="${_cvPhotoUrl}" style="width:100%;height:100%;object-fit:cover">`
                  : '<i class="fas fa-user-circle" style="font-size:26px;color:var(--tx3)"></i>'}
              </div>
              <div>
                <input type="file" id="cvPhotoInput" accept="image/*" style="display:none"
                  onchange="uploadCVPhoto(this)">
                <button class="btn bo bsm" onclick="document.getElementById('cvPhotoInput').click()">
                  <i class="fas fa-camera"></i>رفع صورة
                </button>
                <div class="fh">صورة احترافية تزيد من فرص القبول</div>
              </div>
            </div>
          </div>

          <div class="fg"><label class="fl req">الاسم الكامل</label>
            <input type="text" id="cv_n" class="fc" value="${v('name')}" oninput="upCV()">
          </div>
          <div class="fg"><label class="fl">المسمى الوظيفي</label>
            <input type="text" id="cv_t" class="fc" value="${v('title', P?.jobTitle||'')}" placeholder="مبرمج ويب" oninput="upCV()">
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">الهاتف</label>
              <input type="tel" id="cv_ph" class="fc" value="${v('phone')}" oninput="upCV()">
            </div>
            <div class="fg"><label class="fl">البريد الإلكتروني</label>
              <input type="email" id="cv_em" class="fc" value="${v('email', U?.email||'')}" oninput="upCV()">
            </div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">المحافظة</label>
              <input type="text" id="cv_pr" class="fc" value="${v('province')}" oninput="upCV()">
            </div>
            <div class="fg"><label class="fl">الموقع / LinkedIn</label>
              <input type="url" id="cv_web" class="fc" value="${v('website', '')}" placeholder="linkedin.com/in/..." oninput="upCV()">
            </div>
          </div>
          <div class="fg"><label class="fl">الملخص المهني</label>
            <textarea id="cv_sum" class="fc" rows="3" oninput="upCV()">${v('summary', P?.bio||'')}</textarea>
          </div>
        </div>

        <!-- الخبرة العملية -->
        <div id="cvtExp" style="display:none">
          <div id="cvExpList"></div>
          <button class="btn bo bsm bfu" onclick="addExp()">
            <i class="fas fa-plus"></i>إضافة خبرة عملية
          </button>
        </div>

        <!-- التعليم -->
        <div id="cvtEdu" style="display:none">
          <div id="cvEduList"></div>
          <button class="btn bo bsm bfu" onclick="addEdu()">
            <i class="fas fa-plus"></i>إضافة مؤهل دراسي
          </button>
        </div>

        <!-- المهارات -->
        <div id="cvtSkills" style="display:none">
          <div class="fg">
            <label class="fl">إضافة مهارة</label>
            <div class="ig">
              <input type="text" id="ski" class="fc" placeholder="مثال: React.js"
                onkeydown="if(event.key==='Enter')addSkill()">
              <button class="btn bp bsm" onclick="addSkill()"><i class="fas fa-plus"></i></button>
            </div>
          </div>
          <div id="skList" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">
            ${cvSkills.map((s, i) => skChip(s, i)).join('')}
          </div>
        </div>

        <!-- أزرار الإجراءات -->
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn bp bsm" onclick="upCV();document.getElementById('cvPrev')?.scrollIntoView({behavior:'smooth',block:'nearest'})"><i class="fas fa-eye"></i>معاينة</button>
          <button class="btn ba bsm" onclick="dlCV()"><i class="fas fa-download"></i>تحميل PDF</button>
          <button class="btn bo bsm" id="saveCvBtn" onclick="saveCV()"><i class="fas fa-save"></i>حفظ</button>
          <button class="btn bsm" id="aiCvBtn"
            style="background:linear-gradient(135deg,var(--purple),#a78bfa);color:#fff;border:none"
            onclick="aiOptimizeCV()">
            <i class="fas fa-robot"></i>تحسين بـ AI
          </button>
        </div>
        <div id="aiCvResult" style="display:none;margin-top:12px;padding:12px 14px;
          background:rgba(139,92,246,.07);border-radius:10px;border-right:3px solid var(--purple)">
          <div style="font-size:11px;font-weight:800;color:var(--purple);margin-bottom:7px">
            <i class="fas fa-robot"></i> اقتراحات AI لتحسين سيرتك الذاتية
          </div>
          <div id="aiCvText" style="font-size:12px;color:var(--tx2);line-height:1.9;white-space:pre-line"></div>
        </div>
      </div>

      <!-- معاينة مباشرة -->
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--tx3);margin-bottom:7px;text-align:center">
          معاينة السيرة الذاتية
        </div>
        <div id="cvPrev" class="cvp"></div>
      </div>
    </div>`;

  cvExps.forEach((exp, i) => _renderExpBlock(i, exp));
  cvEdus.forEach((edu, i) => _renderEduBlock(i, edu));
  upCV();
}

// ── رفع الصورة الشخصية عبر ImgBB ──
async function uploadCVPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const key = CFG.imgbb?.key;
  if (!key) {
    notify('إعداد مطلوب', 'أدخل مفتاح ImgBB في الإعدادات أولاً', 'warning');
    return;
  }
  const fd = new FormData();
  fd.append('image', file);
  notify('جارٍ رفع الصورة...', '', 'info');
  try {
    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      _cvPhotoUrl = data.data.url;
      const circle = document.getElementById('cvPhotoCircle');
      if (circle) circle.innerHTML = `<img src="${_cvPhotoUrl}" style="width:100%;height:100%;object-fit:cover">`;
      upCV();
      notify('تم الرفع ✅', 'تم رفع الصورة الشخصية', 'success');
    } else {
      notify('خطأ', 'فشل رفع الصورة', 'error');
    }
  } catch(e) {
    notify('خطأ', 'تعذّر الاتصال بخدمة رفع الصور', 'error');
  }
}

function swCvTab(tab, btn) {
  ['Basic','Exp','Edu','Skills'].forEach(t => {
    const el = document.getElementById('cvt' + t);
    if (el) el.style.display = t.toLowerCase() === tab ? 'block' : 'none';
  });
  btn.closest('.tabs').querySelectorAll('.tb2').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

// ── المهارات ──
function skChip(s, i) {
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 11px;
    background:rgba(13,148,136,.1);color:var(--pd);border-radius:20px;font-size:11px;font-weight:700">
    ${san(s)}
    <span onclick="cvSkills.splice(${i},1);renderSkills();upCV()"
      style="cursor:pointer;color:var(--tx3);font-size:13px;line-height:1">×</span>
  </span>`;
}
function addSkill() {
  const inp = document.getElementById('ski');
  const v   = inp?.value?.trim();
  if (!v) return;
  cvSkills.push(v);
  inp.value = '';
  renderSkills();
  upCV();
}
function renderSkills() {
  const el = document.getElementById('skList');
  if (el) el.innerHTML = cvSkills.map((s, i) => skChip(s, i)).join('');
}

// ── الخبرة العملية ──
function addExp() {
  const i = expIdx++;
  cvExps.push({ title:'', company:'', from:'', to:'', desc:'' });
  _renderExpBlock(i, cvExps[i]);
}
function _renderExpBlock(i, exp) {
  const el = document.getElementById('cvExpList');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'card cp';
  div.style.marginBottom = '10px';
  div.id = `expBlock_${i}`;
  div.innerHTML = `
    <div class="fr">
      <div class="fg"><label class="fl">المسمى الوظيفي</label>
        <input type="text" class="fc" value="${san(exp.title||'')}" placeholder="مبرمج" oninput="cvExps[${i}].title=this.value;upCV()">
      </div>
      <div class="fg"><label class="fl">الشركة / الجهة</label>
        <input type="text" class="fc" value="${san(exp.company||'')}" placeholder="اسم الشركة" oninput="cvExps[${i}].company=this.value;upCV()">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl">من (سنة)</label>
        <input type="text" class="fc" value="${san(exp.from||'')}" placeholder="2022" oninput="cvExps[${i}].from=this.value;upCV()">
      </div>
      <div class="fg"><label class="fl">إلى</label>
        <input type="text" class="fc" value="${san(exp.to||'')}" placeholder="2024 / حتى الآن" oninput="cvExps[${i}].to=this.value;upCV()">
      </div>
    </div>
    <div class="fg"><label class="fl">وصف المهام</label>
      <textarea class="fc" rows="2" oninput="cvExps[${i}].desc=this.value;upCV()">${san(exp.desc||'')}</textarea>
    </div>
    <button class="btn bda bsm" onclick="cvExps[${i}]={};document.getElementById('expBlock_${i}')?.remove();upCV()">
      <i class="fas fa-trash"></i>حذف
    </button>`;
  el.appendChild(div);
}

// ── التعليم ──
function addEdu() {
  const i = eduIdx++;
  cvEdus.push({ degree:'', institution:'', year:'', grade:'' });
  _renderEduBlock(i, cvEdus[i]);
}
function _renderEduBlock(i, edu) {
  const el = document.getElementById('cvEduList');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'card cp';
  div.style.marginBottom = '10px';
  div.id = `eduBlock_${i}`;
  div.innerHTML = `
    <div class="fr">
      <div class="fg"><label class="fl">الشهادة / الدرجة العلمية</label>
        <input type="text" class="fc" value="${san(edu.degree||'')}" placeholder="بكالوريوس هندسة حاسبات"
          oninput="cvEdus[${i}].degree=this.value;upCV()">
      </div>
      <div class="fg"><label class="fl">المؤسسة التعليمية</label>
        <input type="text" class="fc" value="${san(edu.institution||'')}" placeholder="جامعة بغداد"
          oninput="cvEdus[${i}].institution=this.value;upCV()">
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl">سنة التخرج</label>
        <input type="text" class="fc" value="${san(edu.year||'')}" placeholder="2023"
          oninput="cvEdus[${i}].year=this.value;upCV()">
      </div>
      <div class="fg"><label class="fl">المعدل / التقدير (اختياري)</label>
        <input type="text" class="fc" value="${san(edu.grade||'')}" placeholder="جيد جداً / 85%"
          oninput="cvEdus[${i}].grade=this.value;upCV()">
      </div>
    </div>
    <button class="btn bda bsm" onclick="cvEdus[${i}]={};document.getElementById('eduBlock_${i}')?.remove();upCV()">
      <i class="fas fa-trash"></i>حذف
    </button>`;
  el.appendChild(div);
}

// ── تحديث المعاينة — تصميم احترافي ──
function upCV() {
  const el = document.getElementById('cvPrev');
  if (!el) return;
  const n   = document.getElementById('cv_n')?.value   || '';
  const t   = document.getElementById('cv_t')?.value   || '';
  const ph  = document.getElementById('cv_ph')?.value  || '';
  const em  = document.getElementById('cv_em')?.value  || '';
  const pr  = document.getElementById('cv_pr')?.value  || '';
  const wb  = document.getElementById('cv_web')?.value || '';
  const sm  = document.getElementById('cv_sum')?.value || '';

  const validExps = cvExps.filter(e => e?.title);
  const validEdus = cvEdus.filter(e => e?.degree);

  // درجة المقابلة الذكية
  const ivScore = localStorage.getItem(`iv_last_score_${U?.uid}`);

  el.innerHTML = `
    <!-- رأس السيرة -->
    <div style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 100%);padding:18px 16px;border-radius:8px 8px 0 0;display:flex;align-items:center;gap:14px">
      <div style="width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.2);
        border:2.5px solid rgba(255,255,255,.5);display:flex;align-items:center;justify-content:center;
        overflow:hidden;flex-shrink:0">
        ${_cvPhotoUrl
          ? `<img src="${_cvPhotoUrl}" style="width:100%;height:100%;object-fit:cover" crossorigin="anonymous">`
          : `<span style="font-size:22px;font-weight:900;color:#fff">${n.charAt(0)||'م'}</span>`}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:16px;font-weight:900;color:#fff;margin-bottom:2px">${san(n)||'الاسم الكامل'}</div>
        <div style="font-size:11px;color:rgba(255,255,255,.85);margin-bottom:7px">${san(t)||'المسمى الوظيفي'}</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;font-size:10px;color:rgba(255,255,255,.8)">
          ${ph ? `<span style="display:flex;align-items:center;gap:3px"><i class="fas fa-phone" style="font-size:9px"></i>${san(ph)}</span>` : ''}
          ${em ? `<span style="display:flex;align-items:center;gap:3px"><i class="fas fa-envelope" style="font-size:9px"></i>${san(em)}</span>` : ''}
          ${pr ? `<span style="display:flex;align-items:center;gap:3px"><i class="fas fa-map-marker-alt" style="font-size:9px"></i>${san(pr)}</span>` : ''}
          ${wb ? `<span style="display:flex;align-items:center;gap:3px"><i class="fas fa-globe" style="font-size:9px"></i>${san(wb)}</span>` : ''}
        </div>
      </div>
      ${ivScore ? `<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:6px 10px;text-align:center;flex-shrink:0">
        <div style="font-size:16px;font-weight:900;color:#fff">${ivScore}</div>
        <div style="font-size:9px;color:rgba(255,255,255,.75)">مقابلة AI</div>
      </div>` : ''}
    </div>

    <!-- جسم السيرة -->
    <div style="padding:14px 16px;background:#fff;border-radius:0 0 8px 8px;direction:rtl">

      ${sm ? `
      <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0">
        <div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:6px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-user"></i>الملخص المهني
        </div>
        <p style="font-size:11px;color:#475569;line-height:1.8;margin:0;white-space:pre-wrap">${san(sm)}</p>
      </div>` : ''}

      ${validExps.length ? `
      <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0">
        <div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:7px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-briefcase"></i>الخبرات العملية
        </div>
        ${validExps.map(e => `
          <div style="margin-bottom:9px;padding-right:9px;border-right:2.5px solid #99f6e4">
            <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px">
              <span style="font-size:11px;font-weight:800;color:#1e293b">${san(e.title)}</span>
              <span style="font-size:9px;color:#94a3b8;white-space:nowrap">${san(e.from||'')}${e.to?' — '+san(e.to):''}</span>
            </div>
            <div style="font-size:10px;font-weight:700;color:#0d9488;margin-bottom:2px">${san(e.company||'')}</div>
            ${e.desc ? `<div style="font-size:9px;color:#64748b;line-height:1.65">${san(e.desc)}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}

      ${validEdus.length ? `
      <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0">
        <div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:7px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-graduation-cap"></i>التعليم والمؤهلات
        </div>
        ${validEdus.map(e => `
          <div style="margin-bottom:7px;padding-right:9px;border-right:2.5px solid #99f6e4">
            <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:4px">
              <span style="font-size:11px;font-weight:800;color:#1e293b">${san(e.degree)}</span>
              <span style="font-size:9px;color:#94a3b8">${san(e.year||'')}</span>
            </div>
            <div style="font-size:10px;font-weight:700;color:#0d9488">${san(e.institution||'')}</div>
            ${e.grade ? `<div style="font-size:9px;color:#64748b">التقدير: ${san(e.grade)}</div>` : ''}
          </div>`).join('')}
      </div>` : ''}

      ${cvSkills.length ? `
      <div>
        <div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:7px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-tools"></i>المهارات والكفاءات
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${cvSkills.map(s => `<span style="background:#f0fdf4;color:#0d9488;border:1px solid #86efac;
            border-radius:4px;padding:2px 8px;font-size:9px;font-weight:700">${san(s)}</span>`).join('')}
        </div>
      </div>` : ''}

    </div>`;
}

// ── تحميل PDF ──
async function dlCV() {
  notify('جارٍ التحميل...', 'قد تستغرق بضع ثوانٍ', 'info');
  const el = document.getElementById('cvPrev');
  if (!el || typeof html2canvas === 'undefined') {
    notify('خطأ', 'مكتبة التحميل غير جاهزة', 'error'); return;
  }
  try {
    const canvas = await html2canvas(el, {
      scale: 3,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const imgH  = canvas.height * pageW / canvas.width;
    let   posY  = 0;
    while (posY < imgH) {
      if (posY > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, -posY, pageW, imgH);
      posY += pageH;
    }
    const name = document.getElementById('cv_n')?.value?.trim() || 'سيرة_ذاتية';
    pdf.save(`${name}_CV.pdf`);
  } catch(e) { notify('خطأ', 'فشل تحميل PDF: ' + e.message, 'error'); }
}

// ── تحسين بـ AI ──
async function aiOptimizeCV() {
  const btn    = document.getElementById('aiCvBtn');
  const resEl  = document.getElementById('aiCvResult');
  const textEl = document.getElementById('aiCvText');
  if (!btn || !resEl || !textEl) return;

  if (!isAIReady()) {
    notify('تنبيه', 'فعّل Gemini API من إعدادات الأدمن', 'warning'); return;
  }

  const name    = document.getElementById('cv_n')?.value  || '';
  const title   = document.getElementById('cv_t')?.value  || '';
  const summary = document.getElementById('cv_sum')?.value || '';
  const skills  = cvSkills.join('، ');
  const exps    = cvExps.filter(e=>e?.title).map(e=>`${e.title} في ${e.company} (${e.from||''}–${e.to||''}): ${e.desc||''}`).join('\n');
  const edus    = cvEdus.filter(e=>e?.degree).map(e=>`${e.degree} — ${e.institution||''} ${e.year||''} ${e.grade?'| '+e.grade:''}`).join('\n');

  if (!title && !summary && !skills) {
    notify('تنبيه', 'أكمل بيانات السيرة الذاتية أولاً', 'warning'); return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> جارٍ التحليل...';
  resEl.style.display = 'none';

  const prompt = `أنت خبير في كتابة السيرة الذاتية للسوق العراقي والعربي.
سيرة ذاتية للمراجعة:
- الاسم: ${name}
- المسمى: ${title}
- الملخص: ${summary}
- المهارات: ${skills}
- الخبرات: ${exps || 'لم تُضف'}
- التعليم: ${edus || 'لم يُضف'}

قدّم بالعربية:
1. تقييم عام (2 جملة)
2. أهم 3 نقاط ضعف يجب إصلاحها
3. مقترح محسّن للملخص المهني (3-4 جمل احترافية)
4. مهارات مقترح إضافتها بناءً على المسمى
كن مباشراً وعملياً.`;

  const result = await callGemini(prompt);
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-robot"></i>تحسين بـ AI';

  if (result) {
    textEl.textContent = result;
    resEl.style.display = 'block';
    resEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    notify('خطأ', 'فشل الاتصال بـ Gemini AI', 'error');
  }
}

// ── حفظ السيرة (للباحث) ──
async function saveCV() {
  const ivScore = localStorage.getItem(`iv_last_score_${U?.uid}`);
  const data = {
    type:     'resume',
    name:     document.getElementById('cv_n')?.value  || '',
    title:    document.getElementById('cv_t')?.value  || '',
    phone:    document.getElementById('cv_ph')?.value || '',
    email:    document.getElementById('cv_em')?.value || '',
    province: document.getElementById('cv_pr')?.value || '',
    website:  document.getElementById('cv_web')?.value|| '',
    summary:  document.getElementById('cv_sum')?.value|| '',
    skills:   cvSkills,
    exps:     cvExps.filter(e => e?.title),
    edus:     cvEdus.filter(e => e?.degree),
    photoUrl: _cvPhotoUrl || '',
    ivScore:  ivScore !== null ? Number(ivScore) : null,
    updatedAt: new Date().toISOString(),
  };
  if (!DEMO && window.db && U) {
    loading('saveCvBtn', true);
    try {
      await window.db.collection('cvs').doc(U.uid).set({ ...data, userId: U.uid }, { merge: true });

      // إذا كان الملف منشوراً → إلغاء النشر تلقائياً بعد التعديل
      const wasPublished = P?.cvPublished;
      if (wasPublished) {
        await window.db.collection('users').doc(U.uid).update({ cvPublished: false });
        P = { ...P, cvPublished: false };
        notify('تم الحفظ ✅', 'تم حفظ السيرة — ملفك يحتاج إعادة نشر بعد التعديل', 'info');
      } else {
        notify('تم الحفظ ✅', 'تم حفظ سيرتك الذاتية', 'success');
      }
    } catch(e) {
      console.warn('cv save:', e.message);
      notify('خطأ', 'فشل الحفظ: ' + e.message, 'error');
    } finally { loading('saveCvBtn', false); }
  } else {
    notify('تم ✅', 'تم الحفظ مؤقتاً (وضع تجريبي)', 'info');
  }
}

// ══════════════════════════════════════════════════════════
// ملف الشركة / المكتب — للمكاتب وأصحاب العمل
// ══════════════════════════════════════════════════════════

async function buildCompanyProfileModal() {
  const el = document.getElementById('moCVB');
  if (!el) return;

  el.innerHTML = `<div style="text-align:center;padding:40px 20px">
    <div class="spin2" style="margin:0 auto 12px"></div>
    <div style="font-size:13px;color:var(--tx2)">جارٍ تحميل ملف الشركة...</div>
  </div>`;

  let saved = null;
  if (!DEMO && window.db && U) {
    try {
      const doc = await window.db.collection('cvs').doc(U.uid).get();
      if (doc.exists && doc.data().type === 'company') saved = doc.data();
    } catch(e) { console.warn('company profile load:', e.message); }
  }

  const v = (f, fb = '') => saved?.[f] ?? P?.[f] ?? fb;
  const COMPANY_TYPES = ['مكتب توظيف','شركة خاصة','مطعم / كافيه','محل تجاري','عيادة / مستشفى','مؤسسة تعليمية','مصنع / ورشة','مؤسسة حكومية','أخرى'];

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">

      <!-- نموذج التعديل -->
      <div>
        <div class="tabs" style="margin-bottom:13px">
          <button class="tb2 on" onclick="swCpTab('info',this)">معلومات الشركة</button>
          <button class="tb2"    onclick="swCpTab('contact',this)">التواصل</button>
          <button class="tb2"    onclick="swCpTab('services',this)">الخدمات</button>
        </div>

        <!-- معلومات الشركة -->
        <div id="cptInfo">

          <!-- شعار + صورة الواجهة -->
          <div class="fg">
            <label class="fl">شعار الشركة (Logo)</label>
            <div style="display:flex;align-items:center;gap:10px">
              <div id="cpLogoCircle" style="width:54px;height:54px;border-radius:10px;
                background:var(--bgc2);border:2px dashed var(--br);
                display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">
                ${v('logoUrl') ? `<img src="${v('logoUrl')}" style="width:100%;height:100%;object-fit:cover">` : '<i class="fas fa-building" style="font-size:22px;color:var(--tx3)"></i>'}
              </div>
              <div>
                <input type="file" id="cpLogoInput" accept="image/*" style="display:none" onchange="uploadCpLogo(this)">
                <button class="btn bo bsm" onclick="document.getElementById('cpLogoInput').click()">
                  <i class="fas fa-image"></i>رفع الشعار
                </button>
              </div>
            </div>
          </div>

          <div class="fg">
            <label class="fl">صورة الغلاف / الواجهة</label>
            <div style="height:70px;border-radius:8px;overflow:hidden;border:2px dashed var(--br);
              background:var(--bgc2);display:flex;align-items:center;justify-content:center;
              cursor:pointer;position:relative;margin-bottom:6px" id="cpBannerPreview"
              onclick="document.getElementById('cpBannerInput').click()">
              ${v('bannerUrl') ? `<img src="${v('bannerUrl')}" style="width:100%;height:100%;object-fit:cover">` :
                '<span style="font-size:11px;color:var(--tx3)"><i class="fas fa-panorama"></i> انقر لرفع صورة الغلاف</span>'}
            </div>
            <input type="file" id="cpBannerInput" accept="image/*" style="display:none" onchange="uploadCpBanner(this)">
          </div>

          <div class="fg"><label class="fl req">اسم الشركة / المكتب</label>
            <input type="text" id="cp_name" class="fc" value="${v('companyName', P?.companyName || P?.officeName || P?.name || '')}" oninput="upCP()">
          </div>
          <div class="fr">
            <div class="fg"><label class="fl req">نوع النشاط</label>
              <select id="cp_type" class="fc" onchange="upCP()">
                ${COMPANY_TYPES.map(t => `<option ${v('companyType') === t ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div class="fg"><label class="fl">سنة التأسيس</label>
              <input type="number" id="cp_year" class="fc" value="${v('established', '')}" placeholder="2018" min="1900" max="2030" oninput="upCP()">
            </div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl req">المحافظة</label>
              <select id="cp_prov" class="fc" onchange="upCP()">
                ${PROVS.map(p => `<option ${v('province') === p ? 'selected' : ''}>${p}</option>`).join('')}
              </select>
            </div>
            <div class="fg"><label class="fl">رقم الترخيص التجاري</label>
              <input type="text" id="cp_lic" class="fc" value="${v('licenseNo', '')}" placeholder="اختياري" oninput="upCP()">
            </div>
          </div>
          <div class="fg"><label class="fl">العنوان التفصيلي</label>
            <input type="text" id="cp_addr" class="fc" value="${v('address', '')}" placeholder="مثال: شارع فلسطين، مبنى الرشيد، الطابق 3" oninput="upCP()">
          </div>
          <div class="fg"><label class="fl">رابط الموقع على الخارطة</label>
            <input type="url" id="cp_map" class="fc" value="${v('mapUrl', '')}" placeholder="https://maps.google.com/..." oninput="upCP()">
            <div class="fh"><i class="fas fa-map-marker-alt" style="color:var(--danger)"></i> انسخ رابط الموقع من Google Maps أو Waze</div>
          </div>
          <div class="fg"><label class="fl">أوقات العمل</label>
            <input type="text" id="cp_hours" class="fc" value="${v('workHours', '')}" placeholder="السبت–الخميس ٩ص–٦م" oninput="upCP()">
          </div>
          <div class="fg"><label class="fl">نبذة عن الشركة</label>
            <textarea id="cp_about" class="fc" rows="4" placeholder="اكتب نبذة تعريفية تجذب المتقدمين..." oninput="upCP()">${v('about', P?.bio || '')}</textarea>
          </div>
        </div>

        <!-- التواصل -->
        <div id="cptContact" style="display:none">
          <div class="fr">
            <div class="fg"><label class="fl">هاتف التواصل</label>
              <input type="tel" id="cp_phone" class="fc" value="${v('phone', P?.phone || '')}" placeholder="07X XXXX XXXX" oninput="upCP()">
            </div>
            <div class="fg"><label class="fl">واتساب</label>
              <input type="tel" id="cp_wa" class="fc" value="${v('whatsapp', '')}" placeholder="07X XXXX XXXX" oninput="upCP()">
            </div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">تيليجرام</label>
              <input type="text" id="cp_tg" class="fc" value="${v('telegram', '')}" placeholder="@username أو رابط" oninput="upCP()">
            </div>
            <div class="fg"><label class="fl">البريد الإلكتروني</label>
              <input type="email" id="cp_em" class="fc" value="${v('email', U?.email || '')}" oninput="upCP()">
            </div>
          </div>
          <div class="fg"><label class="fl">الموقع الإلكتروني</label>
            <input type="url" id="cp_web" class="fc" value="${v('website', '')}" placeholder="https://yourcompany.iq" oninput="upCP()">
          </div>
        </div>

        <!-- الخدمات -->
        <div id="cptServices" style="display:none">
          <div class="fg">
            <label class="fl">الخدمات / التخصصات المقدمة</label>
            <textarea id="cp_srv" class="fc" rows="6" placeholder="اكتب كل خدمة في سطر أو افصل بفاصلة..." oninput="upCP()">${v('services', '')}</textarea>
          </div>
          <div class="fg"><label class="fl">عدد الموظفين (اختياري)</label>
            <select id="cp_emp" class="fc" onchange="upCP()">
              <option value="">—</option>
              ${['1-5','6-20','21-50','51-200','200+'].map(o => `<option ${v('employeeCount') === o ? 'selected' : ''}>${o}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- أزرار -->
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn bo bsm" id="saveCpBtn" onclick="saveCompanyProfile()"><i class="fas fa-save"></i>حفظ الملف</button>
          <button class="btn ba bsm" onclick="dlCompanyProfile()"><i class="fas fa-download"></i>تحميل PDF</button>
        </div>
      </div>

      <!-- معاينة -->
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--tx3);margin-bottom:7px;text-align:center">
          معاينة ملف الشركة
        </div>
        <div id="cpPrev" class="cvp"></div>
      </div>
    </div>`;

  upCP();
}

// ── رفع شعار الشركة ──
async function uploadCpLogo(input) {
  const file = input.files[0];
  if (!file) return;
  const key = CFG.imgbb?.key;
  if (!key) { notify('إعداد مطلوب', 'أدخل مفتاح ImgBB في الإعدادات', 'warning'); return; }
  const fd = new FormData();
  fd.append('image', file);
  notify('جارٍ رفع الشعار...', '', 'info');
  try {
    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      window._cpLogoUrl = data.data.url;
      const circle = document.getElementById('cpLogoCircle');
      if (circle) circle.innerHTML = `<img src="${window._cpLogoUrl}" style="width:100%;height:100%;object-fit:cover">`;
      upCP();
      notify('تم ✅', 'تم رفع شعار الشركة', 'success');
    }
  } catch(e) { notify('خطأ', 'فشل رفع الشعار', 'error'); }
}

// ── رفع صورة الغلاف ──
async function uploadCpBanner(input) {
  const file = input.files[0];
  if (!file) return;
  const key = CFG.imgbb?.key;
  if (!key) { notify('إعداد مطلوب', 'أدخل مفتاح ImgBB في الإعدادات', 'warning'); return; }
  const fd = new FormData();
  fd.append('image', file);
  notify('جارٍ رفع صورة الغلاف...', '', 'info');
  try {
    const res  = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success) {
      window._cpBannerUrl = data.data.url;
      const prev = document.getElementById('cpBannerPreview');
      if (prev) prev.innerHTML = `<img src="${window._cpBannerUrl}" style="width:100%;height:100%;object-fit:cover">`;
      upCP();
      notify('تم ✅', 'تم رفع صورة الغلاف', 'success');
    }
  } catch(e) { notify('خطأ', 'فشل رفع صورة الغلاف', 'error'); }
}

function swCpTab(tab, btn) {
  ['Info','Contact','Services'].forEach(t => {
    const el = document.getElementById('cpt' + t);
    if (el) el.style.display = t.toLowerCase() === tab ? 'block' : 'none';
  });
  btn.closest('.tabs').querySelectorAll('.tb2').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

function upCP() {
  const el = document.getElementById('cpPrev');
  if (!el) return;

  const name   = document.getElementById('cp_name')?.value  || '';
  const type   = document.getElementById('cp_type')?.value  || '';
  const year   = document.getElementById('cp_year')?.value  || '';
  const prov   = document.getElementById('cp_prov')?.value  || '';
  const lic    = document.getElementById('cp_lic')?.value   || '';
  const hours  = document.getElementById('cp_hours')?.value || '';
  const about  = document.getElementById('cp_about')?.value || '';
  const addr   = document.getElementById('cp_addr')?.value  || '';
  const mapUrl = document.getElementById('cp_map')?.value   || '';
  const phone  = document.getElementById('cp_phone')?.value || '';
  const wa     = document.getElementById('cp_wa')?.value    || '';
  const tg     = document.getElementById('cp_tg')?.value    || '';
  const em     = document.getElementById('cp_em')?.value    || '';
  const web    = document.getElementById('cp_web')?.value   || '';
  const srv    = document.getElementById('cp_srv')?.value   || '';
  const empCnt = document.getElementById('cp_emp')?.value   || '';
  const logo   = window._cpLogoUrl  || '';
  const banner = window._cpBannerUrl || '';

  el.innerHTML = `
    <!-- غلاف الشركة -->
    ${banner ? `<div style="height:80px;border-radius:8px 8px 0 0;overflow:hidden;margin-bottom:0">
      <img src="${san(banner)}" style="width:100%;height:100%;object-fit:cover">
    </div>` : ''}

    <!-- رأس الملف -->
    <div style="background:linear-gradient(135deg,var(--p),var(--pd));padding:${banner?'0 16px 14px':'16px'};
      ${banner ? 'padding-top:0' : 'border-radius:8px 8px 0 0'};color:#fff;
      ${!banner ? 'border-radius:8px 8px 0 0;' : ''}">
      <div style="display:flex;align-items:center;gap:12px;${banner ? 'margin-top:-20px' : ''}">
        <div style="width:52px;height:52px;border-radius:10px;
          background:${logo ? 'transparent' : 'rgba(255,255,255,.2)'};
          border:2.5px solid rgba(255,255,255,.4);
          display:flex;align-items:center;justify-content:center;
          font-size:20px;font-weight:900;flex-shrink:0;overflow:hidden;
          ${banner ? 'box-shadow:0 2px 10px rgba(0,0,0,.2)' : ''}">
          ${logo ? `<img src="${san(logo)}" style="width:100%;height:100%;object-fit:cover">` : (name.charAt(0) || '🏢')}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:15px;font-weight:900">${san(name) || 'اسم الشركة'}</div>
          <div style="font-size:11px;opacity:.85;margin-top:2px">${san(type)}${year ? ' • تأسست ' + san(year) : ''}</div>
          <div style="font-size:10px;opacity:.7;margin-top:2px">
            ${prov ? `<i class="fas fa-map-marker-alt"></i> ${san(prov)}` : ''}
            ${empCnt ? ` • ${san(empCnt)} موظف` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- جسم الملف -->
    <div style="padding:12px 14px;background:#fff;border-radius:0 0 8px 8px">

      ${about ? `
      <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
        <div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:5px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-building"></i>نبذة
        </div>
        <p style="font-size:11px;color:#475569;line-height:1.8;margin:0;white-space:pre-wrap">${san(about)}</p>
      </div>` : ''}

      ${srv ? `
      <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
        <div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:5px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-list-check"></i>الخدمات
        </div>
        <div style="font-size:11px;color:#475569;line-height:1.8">${san(srv).replace(/\n/g,'<br>')}</div>
      </div>` : ''}

      ${(addr || hours || lic || mapUrl) ? `
      <div style="margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #e2e8f0">
        <div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:6px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-info-circle"></i>معلومات إضافية
        </div>
        ${addr  ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><i class="fas fa-location-dot" style="color:var(--danger);width:12px"></i> ${san(addr)}</div>` : ''}
        ${hours ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><i class="fas fa-clock" style="color:var(--p);width:12px"></i> ${san(hours)}</div>` : ''}
        ${lic   ? `<div style="font-size:10px;color:#475569;margin-bottom:3px"><i class="fas fa-certificate" style="color:var(--acc);width:12px"></i> رخصة: ${san(lic)}</div>` : ''}
        ${mapUrl ? `<a href="${san(mapUrl)}" target="_blank" style="font-size:10px;color:var(--p);font-weight:700;display:inline-flex;align-items:center;gap:3px;text-decoration:none">
          <i class="fas fa-map"></i> عرض على الخارطة</a>` : ''}
      </div>` : ''}

      ${(phone || wa || tg || em || web) ? `
      <div>
        <div style="font-size:11px;font-weight:800;color:#0d9488;margin-bottom:6px;display:flex;align-items:center;gap:5px">
          <i class="fas fa-address-book"></i>التواصل
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;font-size:10px;color:#475569">
          ${phone ? `<span><i class="fas fa-phone" style="color:var(--p);width:12px"></i> ${san(phone)}</span>` : ''}
          ${wa    ? `<span><i class="fab fa-whatsapp" style="color:#25d366;width:12px"></i> ${san(wa)}</span>` : ''}
          ${tg    ? `<span><i class="fab fa-telegram" style="color:#229ed9;width:12px"></i> ${san(tg)}</span>` : ''}
          ${em    ? `<span><i class="fas fa-envelope" style="color:var(--p);width:12px"></i> ${san(em)}</span>` : ''}
          ${web   ? `<span><i class="fas fa-globe" style="color:var(--p);width:12px"></i> ${san(web)}</span>` : ''}
        </div>
      </div>` : ''}
    </div>`;
}

async function saveCompanyProfile() {
  const data = {
    type:          'company',
    companyName:   document.getElementById('cp_name')?.value  || '',
    companyType:   document.getElementById('cp_type')?.value  || '',
    established:   document.getElementById('cp_year')?.value  || '',
    province:      document.getElementById('cp_prov')?.value  || '',
    licenseNo:     document.getElementById('cp_lic')?.value   || '',
    workHours:     document.getElementById('cp_hours')?.value || '',
    about:         document.getElementById('cp_about')?.value || '',
    address:       document.getElementById('cp_addr')?.value  || '',
    mapUrl:        document.getElementById('cp_map')?.value   || '',
    phone:         document.getElementById('cp_phone')?.value || '',
    whatsapp:      document.getElementById('cp_wa')?.value    || '',
    telegram:      document.getElementById('cp_tg')?.value    || '',
    email:         document.getElementById('cp_em')?.value    || '',
    website:       document.getElementById('cp_web')?.value   || '',
    logoUrl:       window._cpLogoUrl  || '',
    bannerUrl:     window._cpBannerUrl || '',
    services:      document.getElementById('cp_srv')?.value   || '',
    employeeCount: document.getElementById('cp_emp')?.value   || '',
    updatedAt:     new Date().toISOString(),
  };
  if (!DEMO && window.db && U) {
    loading('saveCpBtn', true);
    try {
      await window.db.collection('cvs').doc(U.uid).set({ ...data, userId: U.uid }, { merge: true });
      notify('تم الحفظ ✅', 'تم حفظ ملف الشركة', 'success');
    } catch(e) {
      notify('خطأ', 'فشل الحفظ: ' + e.message, 'error');
    } finally { loading('saveCpBtn', false); }
  } else {
    notify('تم ✅', 'تم الحفظ مؤقتاً (وضع تجريبي)', 'info');
  }
}

async function dlCompanyProfile() {
  notify('جارٍ التحميل...', 'قد تستغرق بضع ثوانٍ', 'info');
  const el = document.getElementById('cpPrev');
  if (!el || typeof html2canvas === 'undefined') {
    notify('خطأ', 'مكتبة التحميل غير جاهزة', 'error'); return;
  }
  try {
    const canvas = await html2canvas(el, { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false });
    const { jsPDF } = window.jspdf;
    const pdf  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const imgH  = canvas.height * pageW / canvas.width;
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, pageW, imgH);
    const name = document.getElementById('cp_name')?.value?.trim() || 'ملف_الشركة';
    pdf.save(`${name}_profile.pdf`);
  } catch(e) { notify('خطأ', 'فشل التحميل: ' + e.message, 'error'); }
}
