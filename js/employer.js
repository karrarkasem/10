// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — employer.js                      ║
// ║  لوحة تحكم صاحب العمل (شركة / محل / مؤسسة)         ║
// ╚══════════════════════════════════════════════════════╝

// ── لوحة التحكم ──
function pgEmployerHome(el) {
  const myJobs = JOBS.filter(j => j.postedBy === U?.uid);
  const apps   = OFFICE_APPS;
  const hired  = apps.filter(a => a.status === 'hired').length;
  const pend   = apps.filter(a => a.status === 'pending').length;
  const compName = san(P?.companyName || P?.name || 'الشركة');

  el.innerHTML = `
    <div class="sh">
      <div class="st">
        <div class="st-ico" style="background:linear-gradient(135deg,var(--acc),#d97706)"><i class="fas fa-building"></i></div>
        مرحباً، ${compName}
      </div>
      <span class="b" style="background:rgba(245,158,11,.15);color:var(--acc);border:1px solid rgba(245,158,11,.3);font-size:10px">
        <i class="fas fa-briefcase"></i> توظيف مباشر
      </span>
    </div>

    <!-- إحصائيات -->
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px">
      ${[
        { v:myJobs.length, l:'وظائف منشورة',    ico:'fa-briefcase',   c:'var(--p)' },
        { v:apps.length,   l:'إجمالي المتقدمين', ico:'fa-users',       c:'var(--acc)' },
        { v:pend,          l:'بانتظار المراجعة', ico:'fa-hourglass-half', c:'var(--warning,#f59e0b)' },
        { v:hired,         l:'تم توظيفهم',       ico:'fa-user-check',  c:'var(--success)' },
      ].map(x => `
        <div class="card cp" style="display:flex;align-items:center;gap:12px">
          <div style="width:44px;height:44px;background:${x.c}20;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas ${x.ico}" style="color:${x.c};font-size:18px"></i>
          </div>
          <div>
            <div style="font-size:22px;font-weight:900;color:${x.c};line-height:1">${x.v}</div>
            <div style="font-size:10px;color:var(--tx3);margin-top:2px">${x.l}</div>
          </div>
        </div>`).join('')}
    </div>

    <!-- آخر الوظائف -->
    <div class="card cp" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-size:13px;font-weight:800;color:var(--tx)">
          <i class="fas fa-briefcase" style="color:var(--p)"></i> آخر الوظائف
        </div>
        <button class="btn bp bsm" onclick="openAddJob()"><i class="fas fa-plus"></i> نشر وظيفة</button>
      </div>
      ${myJobs.length
        ? myJobs.slice(0, 4).map(j => `
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--br)">
            <div class="av" style="background:linear-gradient(135deg,var(--acc),#d97706);color:#fff;font-size:14px;font-weight:900;flex-shrink:0">${(j.title||'?').charAt(0)}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${san(j.title)}</div>
              <div style="font-size:11px;color:var(--tx3)">${j.applicants||0} متقدم • ${ago(j.postedAt)}</div>
            </div>
            <span class="b b-gr" style="font-size:9px">نشط</span>
          </div>`).join('')
        : `<div style="text-align:center;padding:20px;color:var(--tx3);font-size:13px">
            <i class="fas fa-briefcase" style="font-size:24px;opacity:.3;margin-bottom:8px;display:block"></i>
            لا توجد وظائف بعد
          </div>`}
    </div>

    <!-- آخر المتقدمين -->
    ${apps.length ? `
    <div class="card cp">
      <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:12px">
        <i class="fas fa-users" style="color:var(--acc)"></i> آخر المتقدمين
      </div>
      ${apps.slice(0, 4).map(a => {
        const s = STAT[a.status] || STAT.pending;
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--br)">
          <div class="cand-avatar">${(a.name||'?').charAt(0)}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:700;color:var(--tx)">${san(a.name)}</div>
            <div style="font-size:10px;color:var(--tx3)">${san(a.jobTitle)} • ${(a.appliedAt||'').slice(0,10)}</div>
          </div>
          <span class="b ${s.c}" style="font-size:9px">${s.l}</span>
        </div>`;
      }).join('')}
      <button class="btn bg bsm bfu" style="margin-top:10px" onclick="goTo('emp_apps')">
        <i class="fas fa-users"></i> عرض الكل
      </button>
    </div>` : ''}`;
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
    try { await window.db.collection('users').doc(U.uid).update(d); } catch(e) {}
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
