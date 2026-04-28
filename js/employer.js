// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — employer.js                      ║
// ║  لوحة تحكم صاحب العمل (شركة / محل / مؤسسة)         ║
// ╚══════════════════════════════════════════════════════╝

// ── لوحة التحكم ──
function pgEmployerHome(el) {
  const myJobs   = JOBS.filter(j => j.postedBy === U?.uid);
  const apps     = OFFICE_APPS;
  const hired    = apps.filter(a => a.status === 'hired').length;
  const pend     = apps.filter(a => a.status === 'pending').length;
  const inter    = apps.filter(a => a.status === 'interview').length;
  const compName = san(P?.companyName || P?.name || 'الشركة');
  const pct      = getCompletion(P, 'employer');
  const greet    = new Date().getHours() < 12 ? 'صباح الخير' : new Date().getHours() < 18 ? 'مساء الخير' : 'مساء النور';

  el.innerHTML = `
    <!-- البانر الرئيسي -->
    <div class="hero-banner fade-up" style="background:linear-gradient(135deg,#d97706,#f59e0b,#fbbf24)">
      <div class="hero-lamp">🏢</div>
      <div class="hero-content">
        <p class="hero-label">${greet}،</p>
        <h2 class="hero-name">${compName}</h2>
        <p class="hero-sub">
          <i class="fas fa-map-marker-alt" style="opacity:.7"></i> ${P?.province || '—'}
          • ${myJobs.length} وظيفة • ${apps.length} متقدم
        </p>
        <div class="hero-actions">
          <button class="btn ba" onclick="openAddJob()"><i class="fas fa-plus-circle"></i>نشر وظيفة جديدة</button>
          <button class="btn" style="border:1px solid rgba(255,255,255,.25);color:#fff;background:rgba(255,255,255,.08);gap:6px;padding:9px 16px;border-radius:9px;font-size:13px;font-weight:700;display:inline-flex;align-items:center"
            onclick="goTo('emp_apps')"><i class="fas fa-users"></i>المتقدمون</button>
        </div>
      </div>
    </div>

    <!-- اكتمال الملف -->
    ${pct < 90 ? `
    <div class="comp-card fade-up del1">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px">
          <div class="comp-label"><i class="fas fa-building"></i>اكتمال ملف الشركة</div>
          <div class="comp-val" style="color:${completionColor(pct)}">${pct}%</div>
          <div class="comp-hint">ملف مكتمل يجذب مزيداً من المتقدمين</div>
        </div>
        <button class="btn bp bsm" onclick="goTo('emp_profile')"><i class="fas fa-pencil-alt"></i>أكمل الملف</button>
      </div>
      <div class="comp-bar-wrap"><div class="comp-bar" style="--w:${pct}%;background:${completionColor(pct)}"></div></div>
    </div>` : ''}

    <!-- الإحصائيات الأربع -->
    <div class="sg fade-up del2">
      <div class="sc sc-link" onclick="goTo('emp_jobs')">
        <div class="si tl"><i class="fas fa-briefcase"></i></div>
        <div><div class="sl">وظائف منشورة</div><div class="sv">${myJobs.length}</div>
        <div class="sc-trend ${myJobs.length?'up':'neu'}"><i class="fas fa-arrow-up"></i>${myJobs.length?'نشطة':'لا يوجد'}</div></div>
      </div>
      <div class="sc sc-link" onclick="goTo('emp_apps')">
        <div class="si am"><i class="fas fa-users"></i></div>
        <div><div class="sl">إجمالي المتقدمين</div><div class="sv">${apps.length}</div>
        <div class="sc-trend ${pend?'neu':'up'}"><i class="fas fa-hourglass-half"></i>${pend} انتظار</div></div>
      </div>
      <div class="sc sc-link" onclick="goTo('emp_apps')">
        <div class="si pu"><i class="fas fa-comments"></i></div>
        <div><div class="sl">مدعوون للمقابلة</div><div class="sv">${inter}</div>
        <div class="sc-trend ${inter?'up':'neu'}"><i class="fas fa-${inter?'star':'minus'}"></i>${inter?'مرشحون':'لا يوجد'}</div></div>
      </div>
      <div class="sc sc-link" onclick="goTo('emp_apps')">
        <div class="si gr"><i class="fas fa-user-check"></i></div>
        <div><div class="sl">تم التوظيف</div><div class="sv">${hired}</div>
        <div class="sc-trend up"><i class="fas fa-trophy"></i>${apps.length?Math.round(hired/apps.length*100):0}% معدل</div></div>
      </div>
    </div>

    <!-- إجراءات سريعة + آخر الوظائف -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px" class="fade-up del3">
      <!-- إجراءات سريعة -->
      <div class="card cp">
        <div class="cht" style="margin-bottom:13px"><i class="fas fa-bolt" style="color:var(--acc)"></i> إجراءات سريعة</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            { ico:'fa-plus-circle', l:'نشر وظيفة جديدة', c:'var(--acc)',     a:"openAddJob()" },
            { ico:'fa-users',       l:'عرض المتقدمين',    c:'var(--p)',       a:"goTo('emp_apps')" },
            { ico:'fa-briefcase',   l:'وظائفي',           c:'var(--info)',    a:"goTo('emp_jobs')" },
            { ico:'fa-building',    l:'ملف الشركة',       c:'var(--purple)',  a:"goTo('emp_profile')" },
          ].map(a => `<button class="btn bo" style="justify-content:flex-start;gap:10px;text-align:right" onclick="${a.a}">
            <div style="width:30px;height:30px;border-radius:8px;background:${a.c}18;color:${a.c};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="fas ${a.ico}"></i>
            </div>
            ${a.l}
            <i class="fas fa-arrow-left" style="margin-right:auto;color:var(--tx3);font-size:11px"></i>
          </button>`).join('')}
        </div>
      </div>

      <!-- آخر الوظائف -->
      <div class="card cp">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div class="cht"><i class="fas fa-briefcase" style="color:var(--acc)"></i> آخر الوظائف</div>
          <button class="btn bg bsm" onclick="goTo('emp_jobs')">الكل <i class="fas fa-arrow-left"></i></button>
        </div>
        ${myJobs.length
          ? myJobs.slice(0, 3).map(j => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--br)">
              <div class="av" style="background:linear-gradient(135deg,var(--acc),#d97706);color:#fff;font-size:13px;font-weight:900;flex-shrink:0">${(j.title||'?').charAt(0)}</div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:700;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${san(j.title)}</div>
                <div style="font-size:10px;color:var(--tx3)">${j.applicants||0} متقدم • ${ago(j.postedAt)}</div>
              </div>
              <span class="b b-gr" style="font-size:9px">نشط</span>
            </div>`).join('')
          : `<div style="text-align:center;padding:20px;color:var(--tx3);font-size:12px">
              <i class="fas fa-briefcase" style="font-size:22px;opacity:.25;display:block;margin-bottom:8px"></i>لا توجد وظائف
            </div>`}
      </div>
    </div>

    <!-- آخر المتقدمين -->
    ${apps.length ? `
    <div class="sh fade-up del4">
      <div class="st"><div class="st-ico"><i class="fas fa-users"></i></div>آخر المتقدمين</div>
      <button class="btn bg bsm" onclick="goTo('emp_apps')">عرض الكل <i class="fas fa-arrow-left"></i></button>
    </div>
    <div class="card fade-up del4"><div class="tw"><table class="dt">
      <thead><tr><th>المتقدم</th><th>الوظيفة</th><th>التاريخ</th><th>الحالة</th><th></th></tr></thead>
      <tbody>${apps.slice(0,5).map(a => {
        const s = STAT[a.status] || STAT.pending;
        return `<tr>
          <td><div style="display:flex;align-items:center;gap:8px">
            <div class="cand-avatar">${(a.name||'?').charAt(0)}</div>
            <div style="font-size:12px;font-weight:700">${san(a.name)}</div>
          </div></td>
          <td style="font-size:12px">${san(a.jobTitle)}</td>
          <td style="font-size:11px;color:var(--tx3)">${(a.appliedAt||'').slice(0,10)||'—'}</td>
          <td><span class="b ${s.c}"><i class="fas ${s.ico}"></i>${s.l}</span></td>
          <td><button class="btn bp bsm" onclick="openCand(${JSON.stringify(a).replace(/"/g,'&quot;')})"><i class="fas fa-eye"></i></button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>` : ''}`;
}

// ── وظائفي ──
function pgEmployerJobs(el) {
  const myJobs = JOBS.filter(j => j.postedBy === U?.uid);
  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico" style="background:linear-gradient(135deg,var(--acc),#d97706)"><i class="fas fa-briefcase"></i></div>وظائفي</div>
      <button class="btn bp bsm" onclick="openAddJob()"><i class="fas fa-plus"></i> نشر وظيفة</button>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px">
      ${myJobs.length
        ? myJobs.map(j => `
          <div class="card cp fade-up">
            <div style="display:flex;align-items:flex-start;gap:12px">
              <div class="av avl" style="background:linear-gradient(135deg,var(--acc),#d97706);color:#fff;font-size:18px;font-weight:900;flex-shrink:0">
                ${(j.title||'?').charAt(0)}
              </div>
              <div style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:4px">
                  <div style="font-size:14px;font-weight:900;color:var(--tx)">${san(j.title)}</div>
                  <span class="b" style="background:rgba(245,158,11,.15);color:var(--acc);border:1px solid rgba(245,158,11,.3);font-size:9px">توظيف مباشر</span>
                </div>
                <div style="font-size:11px;color:var(--tx2)">${san(j.province||'')} • ${j.type==='full'?'دوام كامل':j.type==='part'?'دوام جزئي':'مستقل'}</div>
                <div style="font-size:11px;color:var(--tx3);margin-top:3px"><i class="fas fa-users"></i> ${j.applicants||0} متقدم • ${ago(j.postedAt)}</div>
              </div>
              <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
                <button class="btn bp bsm" onclick="empViewJobApps('${j.id}')"><i class="fas fa-users"></i>المتقدمون</button>
                <button class="btn bda bsm" onclick="empDeleteJob('${j.id}','${san(j.title)}')"><i class="fas fa-trash"></i>حذف</button>
              </div>
            </div>
          </div>`).join('')
        : emptyState('📋', 'لا توجد وظائف بعد', 'انشر أول وظيفة لشركتك مجاناً!',
            `<button class="btn bp" style="margin-top:14px" onclick="openAddJob()"><i class="fas fa-plus"></i> نشر وظيفة الآن</button>`)}
    </div>`;
}

// ── المتقدمون ──
function pgEmployerApps(el) {
  const apps = OFFICE_APPS;
  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico" style="background:linear-gradient(135deg,var(--success),#059669)"><i class="fas fa-users"></i></div>المتقدمون</div>
      <span class="b b-tl">${apps.length} طلب</span>
    </div>

    ${apps.length ? `
    <div class="fb" style="margin-bottom:14px">
      <div class="sb" style="min-width:180px">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="ابحث بالاسم أو الوظيفة..." oninput="empFilterApps(this.value)">
      </div>
      ${['الكل','قيد المراجعة','مدعو للمقابلة','تم القبول','مرفوض'].map((l,i) =>
        `<button class="fc2 ${i===0?'on':''}"
          onclick="this.closest('.fb').querySelectorAll('.fc2').forEach(b=>b.classList.remove('on'));this.classList.add('on');empFilterAppsByStatus(['','pending','interview','hired','rejected'][${i}])">${l}
        </button>`
      ).join('')}
    </div>
    <div class="card"><div class="tw"><table class="dt">
      <thead><tr><th>المتقدم</th><th>الوظيفة</th><th>التاريخ</th><th>الحالة</th><th>إجراءات</th></tr></thead>
      <tbody id="empAppsBody">${renderEmpAppRows(apps)}</tbody>
    </table></div></div>`
    : emptyState('📭', 'لا توجد طلبات بعد', 'عند تقديم مرشحين على وظائفك ستظهر هنا')}`;

  window._empAppsData = apps;
}

function renderEmpAppRows(apps) {
  if (!apps.length) return `<tr><td colspan="5" style="text-align:center;padding:28px;color:var(--tx3)">لا توجد نتائج</td></tr>`;
  return apps.map(a => {
    const s = STAT[a.status] || STAT.pending;
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:9px">
        <div class="cand-avatar">${(a.name||'?').charAt(0)}</div>
        <div style="font-size:12px;font-weight:700">${san(a.name)}</div>
      </div></td>
      <td style="font-size:12px">${san(a.jobTitle)}</td>
      <td style="font-size:11px;color:var(--tx3)">${(a.appliedAt||'').slice(0,10)||'—'}</td>
      <td><span class="b ${s.c}"><i class="fas ${s.ico}"></i>${s.l}</span></td>
      <td><div style="display:flex;gap:5px">
        <button class="btn bp bsm" onclick="openCand(${JSON.stringify(a).replace(/"/g,'&quot;')})"><i class="fas fa-eye"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

function empFilterApps(q) {
  const list = (window._empAppsData || []).filter(a =>
    !q || (a.name||'').includes(q) || (a.jobTitle||'').includes(q)
  );
  const el = document.getElementById('empAppsBody');
  if (el) el.innerHTML = renderEmpAppRows(list);
}

function empFilterAppsByStatus(st) {
  const list = (window._empAppsData || []).filter(a => !st || a.status === st);
  const el = document.getElementById('empAppsBody');
  if (el) el.innerHTML = renderEmpAppRows(list);
}

// ── ملف الشركة ──
function pgEmployerProfile(el) {
  const p = P;
  el.innerHTML = `
    <div class="sh"><div class="st"><div class="st-ico" style="background:linear-gradient(135deg,var(--acc),#d97706)"><i class="fas fa-building"></i></div>ملف الشركة</div></div>

    <div class="card cp" style="margin-bottom:14px">
      <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:14px">
        <i class="fas fa-pencil-alt" style="color:var(--p)"></i> تعديل معلومات الشركة
      </div>
      <div class="fg"><label class="fl req">اسم الشركة / المحل</label>
        <input type="text" class="fc" id="emp_name_edit" value="${san(p?.companyName||p?.name||'')}">
      </div>
      <div class="fr">
        <div class="fg"><label class="fl">نوع النشاط</label>
          <select id="emp_type_edit" class="fc">
            ${['شركة تقنية','محل تجاري','مطعم / كافيه','مستشفى / عيادة','مدرسة / معهد','مصنع / مستودع','مؤسسة حكومية','أخرى']
              .map(t => `<option ${p?.businessType===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div>
        <div class="fg"><label class="fl req">المحافظة</label>
          <select id="emp_prov_edit" class="fc">
            ${PROVS.map(v=>`<option ${p?.province===v?'selected':''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="fg"><label class="fl">رقم الهاتف</label>
        <input type="tel" id="emp_ph_edit" class="fc" value="${san(p?.phone||'')}" placeholder="07X XXXX XXXX">
      </div>
      <div class="fg"><label class="fl">وصف النشاط التجاري</label>
        <textarea id="emp_bio_edit" class="fc" rows="3" placeholder="نبذة عن شركتك أو محلك...">${p?.bio||''}</textarea>
      </div>
      <div class="fg"><label class="fl">السجل التجاري <span class="fh" style="display:inline">(اختياري)</span></label>
        <input type="text" id="emp_reg_edit" class="fc" value="${san(p?.commercialReg||'')}" placeholder="رقم السجل التجاري">
      </div>
      <button class="btn bp" onclick="saveEmployerProfile()"><i class="fas fa-save"></i>حفظ التغييرات</button>
    </div>

    <!-- الأمان -->
    <div class="card cp">
      <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:12px">
        <i class="fas fa-shield-alt" style="color:var(--danger)"></i> الأمان والحساب
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn bo bsm" onclick="showChangePwForm()"><i class="fas fa-key"></i>تغيير كلمة المرور</button>
        <button class="btn bda bsm" onclick="doLogout()"><i class="fas fa-sign-out-alt"></i>تسجيل الخروج</button>
      </div>
      <div id="changePwSection" style="display:none;margin-top:14px">
        <div style="border-top:1px solid var(--br);margin-bottom:14px"></div>
        <div class="fg"><label class="fl req">كلمة المرور الحالية</label>
          <div class="ig"><input type="password" id="pw_curr" class="fc" placeholder="كلمة المرور الحالية">
            <button class="btn bo bsm" onclick="togglePw('pw_curr',this)"><i class="fas fa-eye"></i></button></div>
        </div>
        <div class="fg"><label class="fl req">كلمة المرور الجديدة</label>
          <div class="ig"><input type="password" id="pw_new" class="fc" placeholder="8 أحرف على الأقل">
            <button class="btn bo bsm" onclick="togglePw('pw_new',this)"><i class="fas fa-eye"></i></button></div>
        </div>
        <div class="fg"><label class="fl req">تأكيد كلمة المرور</label>
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

async function saveEmployerProfile() {
  const d = {
    companyName:   document.getElementById('emp_name_edit')?.value.trim() || '',
    businessType:  document.getElementById('emp_type_edit')?.value        || '',
    province:      document.getElementById('emp_prov_edit')?.value        || '',
    phone:         document.getElementById('emp_ph_edit')?.value.trim()   || '',
    bio:           document.getElementById('emp_bio_edit')?.value.trim()  || '',
    commercialReg: document.getElementById('emp_reg_edit')?.value.trim()  || '',
  };
  if (d.phone && !/^07[3-9]\d{8}$/.test(d.phone.replace(/\s/g,''))) {
    notify('خطأ', 'رقم الهاتف يجب أن يكون عراقياً (07XXXXXXXXX)', 'error'); return;
  }
  P = { ...P, ...d };
  if (!DEMO && window.db && U) {
    try { await window.db.collection('users').doc(U.uid).update(d); }
    catch(e) { notify('خطأ', 'فشل حفظ بيانات الشركة: ' + e.message, 'error'); return; }
  }
  updateUserUI();
  notify('تم الحفظ ✅', 'تم تحديث ملف الشركة', 'success');
}

// ── عرض متقدمي وظيفة معينة ──
function empViewJobApps(jobId) {
  const job  = JOBS.find(j => j.id === jobId);
  const apps = OFFICE_APPS.filter(a => a.jobId === jobId);
  const el   = document.getElementById('pcon');
  el.innerHTML = `
    <div class="sh">
      <button class="btn bo bsm" onclick="goTo('emp_jobs')"><i class="fas fa-arrow-right"></i>رجوع</button>
      <div class="st"><div class="st-ico"><i class="fas fa-users"></i></div>متقدمو: ${san(job?.title||'الوظيفة')}</div>
      <span class="b b-tl">${apps.length}</span>
    </div>
    ${apps.length
      ? `<div class="card"><div class="tw"><table class="dt">
          <thead><tr><th>المتقدم</th><th>التاريخ</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>${renderEmpAppRows(apps)}</tbody>
        </table></div></div>`
      : emptyState('📭', 'لا توجد طلبات', 'لم يتقدم أحد على هذه الوظيفة بعد')}`;
}

// ── حذف وظيفة ──
async function empDeleteJob(jobId, jobTitle) {
  confirm2('حذف الوظيفة', `هل تريد حذف وظيفة "${jobTitle}" نهائياً؟`, async () => {
    try {
      if (!DEMO && window.db) await window.db.collection('jobs').doc(jobId).delete();
      JOBS = JOBS.filter(j => j.id !== jobId);
      notify('تم الحذف', `وظيفة "${jobTitle}" حُذفت`, 'info');
      goTo('emp_jobs');
    } catch(e) { notify('خطأ', 'فشل الحذف، حاول مرة أخرى', 'error'); }
  });
}
