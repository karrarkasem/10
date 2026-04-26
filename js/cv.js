// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — cv.js                            ║
// ║  منشئ السيرة الذاتية + تحميل PDF                   ║
// ╚══════════════════════════════════════════════════════╝

let cvSkills = [];
let cvExps   = [];
let expIdx   = 0;

function buildCVModal() {
  cvSkills = P?.skills || [];
  cvExps   = [];
  expIdx   = 0;
  document.getElementById('moCVB').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px">
      <div>
        <div class="tabs" style="margin-bottom:13px">
          <button class="tb2 on" onclick="swCvTab('basic',this)">الأساسيات</button>
          <button class="tb2"    onclick="swCvTab('exp',this)">الخبرة</button>
          <button class="tb2"    onclick="swCvTab('skills',this)">المهارات</button>
        </div>
        <!-- الأساسيات -->
        <div id="cvtBasic">
          <div class="fg"><label class="fl req">الاسم الكامل</label><input type="text" id="cv_n" class="fc" value="${P?.name||''}" oninput="upCV()"></div>
          <div class="fg"><label class="fl">المسمى الوظيفي</label><input type="text" id="cv_t" class="fc" value="${P?.jobTitle||''}" placeholder="مبرمج ويب" oninput="upCV()"></div>
          <div class="fr">
            <div class="fg"><label class="fl">الهاتف</label><input type="tel" id="cv_ph" class="fc" value="${P?.phone||''}" oninput="upCV()"></div>
            <div class="fg"><label class="fl">البريد</label><input type="email" id="cv_em" class="fc" value="${P?.email||U?.email||''}" oninput="upCV()"></div>
          </div>
          <div class="fr">
            <div class="fg"><label class="fl">المحافظة</label><input type="text" id="cv_pr" class="fc" value="${P?.province||''}" oninput="upCV()"></div>
            <div class="fg"><label class="fl">الموقع الإلكتروني</label><input type="url" id="cv_web" class="fc" placeholder="linkedin.com/..." oninput="upCV()"></div>
          </div>
          <div class="fg"><label class="fl">الملخص المهني</label><textarea id="cv_sum" class="fc" rows="3" oninput="upCV()">${P?.bio||''}</textarea></div>
        </div>
        <!-- الخبرة -->
        <div id="cvtExp" style="display:none">
          <div id="cvExpList"></div>
          <button class="btn bo bsm bfu" onclick="addExp()"><i class="fas fa-plus"></i>إضافة خبرة عملية</button>
        </div>
        <!-- المهارات -->
        <div id="cvtSkills" style="display:none">
          <div class="fg">
            <label class="fl">إضافة مهارة</label>
            <div class="ig">
              <input type="text" id="ski" class="fc" placeholder="مثال: React.js" onkeydown="if(event.key==='Enter')addSkill()">
              <button class="btn bp bsm" onclick="addSkill()"><i class="fas fa-plus"></i></button>
            </div>
          </div>
          <div id="skList" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px">
            ${cvSkills.map((s, i) => skChip(s, i)).join('')}
          </div>
        </div>
        <!-- أزرار -->
        <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn bp bsm" onclick="upCV()"><i class="fas fa-eye"></i>معاينة</button>
          <button class="btn ba bsm" onclick="dlCV()"><i class="fas fa-download"></i>تحميل PDF</button>
          <button class="btn bo bsm" onclick="saveCV()"><i class="fas fa-save"></i>حفظ</button>
          <button class="btn bsm" style="background:linear-gradient(135deg,var(--purple),#a78bfa);color:#fff;border:none" onclick="aiOptimizeCV()" id="aiCvBtn">
            <i class="fas fa-robot"></i>تحسين بـ AI
          </button>
        </div>
        <div id="aiCvResult" style="display:none;margin-top:12px;padding:12px 14px;background:rgba(139,92,246,.07);border-radius:10px;border-right:3px solid var(--purple)">
          <div style="font-size:11px;font-weight:800;color:var(--purple);margin-bottom:7px"><i class="fas fa-robot"></i> اقتراحات AI لتحسين سيرتك الذاتية</div>
          <div id="aiCvText" style="font-size:12px;color:var(--tx2);line-height:1.9;white-space:pre-line"></div>
        </div>
      </div>
      <!-- معاينة -->
      <div>
        <div style="font-size:11px;font-weight:700;color:var(--tx3);margin-bottom:7px;text-align:center">معاينة السيرة الذاتية</div>
        <div id="cvPrev" class="cvp"></div>
      </div>
    </div>`;
  upCV();
}

function swCvTab(tab, btn) {
  ['Basic', 'Exp', 'Skills'].forEach(t => {
    const el = document.getElementById('cvt' + t);
    if (el) el.style.display = t.toLowerCase() === tab ? 'block' : 'none';
  });
  btn.closest('.tabs').querySelectorAll('.tb2').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
}

function skChip(s, i) {
  return `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 11px;background:rgba(13,148,136,.1);color:var(--pd);border-radius:20px;font-size:11px;font-weight:700">
    ${s}
    <span onclick="cvSkills.splice(${i},1);renderSkills();upCV()" style="cursor:pointer;color:var(--tx3);font-size:13px">×</span>
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

function addExp() {
  const i  = expIdx++;
  const el = document.getElementById('cvExpList');
  if (!el) return;
  cvExps.push({ title:'', company:'', from:'', to:'', desc:'' });
  const div = document.createElement('div');
  div.className = 'card cp';
  div.style.marginBottom = '10px';
  div.innerHTML = `
    <div class="fr">
      <div class="fg"><label class="fl">المسمى</label><input type="text" class="fc" placeholder="مبرمج" oninput="cvExps[${i}].title=this.value;upCV()"></div>
      <div class="fg"><label class="fl">الشركة</label><input type="text" class="fc" placeholder="اسم الشركة" oninput="cvExps[${i}].company=this.value;upCV()"></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl">من</label><input type="text" class="fc" placeholder="2022" oninput="cvExps[${i}].from=this.value;upCV()"></div>
      <div class="fg"><label class="fl">إلى</label><input type="text" class="fc" placeholder="2024 / حتى الآن" oninput="cvExps[${i}].to=this.value;upCV()"></div>
    </div>
    <div class="fg"><label class="fl">الوصف</label><textarea class="fc" rows="2" oninput="cvExps[${i}].desc=this.value;upCV()"></textarea></div>
    <button class="btn bda bsm" onclick="cvExps.splice(${i},1);this.parentElement.remove();upCV()"><i class="fas fa-trash"></i>حذف</button>`;
  el.appendChild(div);
}

function upCV() {
  const el = document.getElementById('cvPrev');
  if (!el) return;
  const n  = document.getElementById('cv_n')?.value   || '';
  const t  = document.getElementById('cv_t')?.value   || '';
  const ph = document.getElementById('cv_ph')?.value  || '';
  const em = document.getElementById('cv_em')?.value  || '';
  const pr = document.getElementById('cv_pr')?.value  || '';
  const wb = document.getElementById('cv_web')?.value || '';
  const sm = document.getElementById('cv_sum')?.value || '';
  el.innerHTML = `
    <div class="cvph">
      <div class="cvav">${n.charAt(0) || 'م'}</div>
      <div>
        <div class="cvname">${n || 'الاسم'}</div>
        <div class="cvtitle">${t || 'المسمى الوظيفي'}</div>
        <div class="cvct">
          ${ph ? `<span><i class="fas fa-phone" style="color:var(--p)"></i>${ph}</span>` : ''}
          ${em ? `<span><i class="fas fa-envelope" style="color:var(--p)"></i>${em}</span>` : ''}
          ${pr ? `<span><i class="fas fa-map-marker-alt" style="color:var(--p)"></i>${pr}</span>` : ''}
          ${wb ? `<span><i class="fas fa-globe" style="color:var(--p)"></i>${wb}</span>` : ''}
        </div>
      </div>
    </div>
    ${sm ? `<div class="cvst"><i class="fas fa-user"></i>الملخص المهني</div><p style="font-size:11px;color:#475569;line-height:1.7">${sm}</p>` : ''}
    ${cvExps.filter(e => e.title).length ? `
      <div class="cvst"><i class="fas fa-briefcase"></i>الخبرات العملية</div>
      ${cvExps.filter(e => e.title).map(e => `
        <div class="cvei">
          <div class="cvetit">${e.title}</div>
          <div class="cveco">${e.company}</div>
          <div class="cvedt">${e.from}${e.to ? '—' + e.to : ''}</div>
          ${e.desc ? `<div class="cvdesc">${e.desc}</div>` : ''}
        </div>`).join('')}` : ''}
    ${cvSkills.length ? `
      <div class="cvst"><i class="fas fa-tools"></i>المهارات</div>
      <div class="cvskills">${cvSkills.map(s => `<span class="cvsk">${s}</span>`).join('')}</div>` : ''}`;
}

async function dlCV() {
  notify('جارٍ التحميل...', '', 'info');
  const el = document.getElementById('cvPrev');
  if (!el || typeof html2canvas === 'undefined') { notify('خطأ', 'مكتبة التحميل غير جاهزة', 'error'); return; }
  try {
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const img = canvas.toDataURL('image/png');
    const h   = canvas.height * 210 / canvas.width;
    pdf.addImage(img, 'PNG', 0, 0, 210, h);
    pdf.save(`cv_${document.getElementById('cv_n')?.value || 'سيرة'}.pdf`);
  } catch (e) { notify('خطأ', 'فشل تحميل PDF', 'error'); }
}

async function aiOptimizeCV() {
  const btn = document.getElementById('aiCvBtn');
  const resEl = document.getElementById('aiCvResult');
  const textEl = document.getElementById('aiCvText');
  if (!btn || !resEl || !textEl) return;

  if (!isAIReady()) {
    notify('تنبيه', 'أضف مفتاح Gemini API في js/app.js لتفعيل هذه الميزة', 'warning');
    return;
  }

  const name    = document.getElementById('cv_n')?.value  || '';
  const title   = document.getElementById('cv_t')?.value  || '';
  const summary = document.getElementById('cv_sum')?.value || '';
  const skills  = cvSkills.join('، ');
  const exps    = cvExps.filter(e => e.title).map(e => `${e.title} في ${e.company} (${e.from}–${e.to}): ${e.desc}`).join('\n');

  if (!title && !summary && !skills) {
    notify('تنبيه', 'أكمل بيانات السيرة الذاتية أولاً', 'warning');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-circle-notch spin"></i> جارٍ التحليل...';
  resEl.style.display = 'none';

  const prompt = `أنت خبير في كتابة السيرة الذاتية للسوق العراقي والعربي.
سيرة ذاتية للمراجعة:
- الاسم: ${name}
- المسمى الوظيفي: ${title}
- الملخص: ${summary}
- المهارات: ${skills}
- الخبرات: ${exps || 'لم تُضف بعد'}

قدّم بالعربية:
1. تقييم عام للسيرة (2 جملة)
2. أهم 3 نقاط ضعف يجب إصلاحها
3. مقترح محسّن للملخص المهني (3-4 جمل احترافية)
4. مهارات مقترح إضافتها بناءً على المسمى الوظيفي
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

async function saveCV() {
  const data = {
    name:     document.getElementById('cv_n')?.value,
    title:    document.getElementById('cv_t')?.value,
    phone:    document.getElementById('cv_ph')?.value,
    email:    document.getElementById('cv_em')?.value,
    province: document.getElementById('cv_pr')?.value,
    summary:  document.getElementById('cv_sum')?.value,
    skills:   cvSkills,
    exps:     cvExps,
    updatedAt: new Date().toISOString(),
  };
  if (!DEMO && window.db && U) {
    try { await window.db.collection('cvs').doc(U.uid).set({ ...data, userId: U.uid }, { merge: true }); } catch (e) { console.warn('cv save:', e.message); }
  }
  notify('تم الحفظ ✅', 'تم حفظ سيرتك الذاتية', 'success');
}
