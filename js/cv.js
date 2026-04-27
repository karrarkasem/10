// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — cv.js                            ║
// ║  منشئ السيرة الذاتية + تحميل PDF                   ║
// ╚══════════════════════════════════════════════════════╝

let cvSkills = [];
let cvExps   = [];
let cvEdus   = [];
let expIdx   = 0;
let eduIdx   = 0;

// ── تحميل السيرة المحفوظة من Firestore ──
async function loadCVData() {
  if (DEMO || !window.db || !U) return null;
  try {
    const doc = await window.db.collection('cvs').doc(U.uid).get();
    return doc.exists ? doc.data() : null;
  } catch(e) { console.warn('cv load:', e.message); return null; }
}

// ── فتح منشئ السيرة وتعبئة البيانات المحفوظة ──
async function buildCVModal() {
  const el = document.getElementById('moCVB');
  if (!el) return;

  el.innerHTML = `<div style="text-align:center;padding:40px 20px">
    <div class="spin2" style="margin:0 auto 12px"></div>
    <div style="font-size:13px;color:var(--tx2)">جارٍ تحميل سيرتك الذاتية...</div>
  </div>`;

  const saved  = await loadCVData();
  cvSkills = saved?.skills || P?.skills || [];
  cvExps   = saved?.exps   || [];
  cvEdus   = saved?.edus   || [];
  expIdx   = cvExps.length;
  eduIdx   = cvEdus.length;

  const v = (field, fallback = '') => saved?.[field] ?? P?.[field] ?? fallback;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
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
          <button class="btn bp bsm" onclick="upCV()"><i class="fas fa-eye"></i>معاينة</button>
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

  // تعبئة الخبرات والتعليم المحفوظة
  cvExps.forEach((exp, i) => _renderExpBlock(i, exp));
  cvEdus.forEach((edu, i) => _renderEduBlock(i, edu));

  upCV();
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

// ── تحديث المعاينة ──
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

  el.innerHTML = `
    <div class="cvph">
      <div class="cvav">${n.charAt(0) || 'م'}</div>
      <div style="flex:1">
        <div class="cvname">${san(n) || 'الاسم الكامل'}</div>
        <div class="cvtitle">${san(t) || 'المسمى الوظيفي'}</div>
        <div class="cvct">
          ${ph ? `<span><i class="fas fa-phone" style="color:var(--p)"></i>${san(ph)}</span>` : ''}
          ${em ? `<span><i class="fas fa-envelope" style="color:var(--p)"></i>${san(em)}</span>` : ''}
          ${pr ? `<span><i class="fas fa-map-marker-alt" style="color:var(--p)"></i>${san(pr)}</span>` : ''}
          ${wb ? `<span><i class="fas fa-globe" style="color:var(--p)"></i>${san(wb)}</span>` : ''}
        </div>
      </div>
    </div>

    ${sm ? `
      <div class="cvst"><i class="fas fa-user"></i>الملخص المهني</div>
      <p style="font-size:11px;color:#475569;line-height:1.7;margin:0">${san(sm)}</p>` : ''}

    ${validExps.length ? `
      <div class="cvst"><i class="fas fa-briefcase"></i>الخبرات العملية</div>
      ${validExps.map(e => `
        <div class="cvei">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <div class="cvetit">${san(e.title)}</div>
            <div class="cvedt">${san(e.from||'')}${e.to ? ' — ' + san(e.to) : ''}</div>
          </div>
          <div class="cveco">${san(e.company||'')}</div>
          ${e.desc ? `<div class="cvdesc">${san(e.desc)}</div>` : ''}
        </div>`).join('')}` : ''}

    ${validEdus.length ? `
      <div class="cvst"><i class="fas fa-graduation-cap"></i>التعليم والمؤهلات</div>
      ${validEdus.map(e => `
        <div class="cvei">
          <div style="display:flex;justify-content:space-between;align-items:baseline">
            <div class="cvetit">${san(e.degree)}</div>
            <div class="cvedt">${san(e.year||'')}</div>
          </div>
          <div class="cveco">${san(e.institution||'')}</div>
          ${e.grade ? `<div class="cvdesc">التقدير: ${san(e.grade)}</div>` : ''}
        </div>`).join('')}` : ''}

    ${cvSkills.length ? `
      <div class="cvst"><i class="fas fa-tools"></i>المهارات</div>
      <div class="cvskills">${cvSkills.map(s => `<span class="cvsk">${san(s)}</span>`).join('')}</div>` : ''}`;
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

    // دعم السيرة متعددة الصفحات
    while (posY < imgH) {
      if (posY > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.95), 'JPEG',
        0, -posY, pageW, imgH
      );
      posY += pageH;
    }

    const name = document.getElementById('cv_n')?.value?.trim() || 'سيرة_ذاتية';
    pdf.save(`${name}_CV.pdf`);
  } catch(e) { notify('خطأ', 'فشل تحميل PDF: ' + e.message, 'error'); }
}

// ── تحسين بـ AI ──
async function aiOptimizeCV() {
  const btn   = document.getElementById('aiCvBtn');
  const resEl = document.getElementById('aiCvResult');
  const textEl= document.getElementById('aiCvText');
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

// ── حفظ السيرة ──
async function saveCV() {
  const data = {
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
    updatedAt: new Date().toISOString(),
  };
  if (!DEMO && window.db && U) {
    loading('saveCvBtn', true);
    try {
      await window.db.collection('cvs').doc(U.uid).set({ ...data, userId: U.uid }, { merge: true });
      notify('تم الحفظ ✅', 'تم حفظ سيرتك الذاتية', 'success');
    } catch(e) {
      console.warn('cv save:', e.message);
      notify('خطأ', 'فشل الحفظ: ' + e.message, 'error');
    } finally { loading('saveCvBtn', false); }
  } else {
    notify('تم ✅', 'تم الحفظ مؤقتاً (وضع تجريبي)', 'info');
  }
}
