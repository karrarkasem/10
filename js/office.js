// ╔══════════════════════════════════════════════════════╗
// ║  الفانوس للتوظيف — office.js                        ║
// ║  لوحة مكتب التوظيف + إدارة الوظائف + المتقدمون     ║
// ╚══════════════════════════════════════════════════════╝

// ── لوحة التحكم الرئيسية ──
function pgOfficeHome(el) {
  const nm   = P?.officeName || P?.name || 'المكتب';
  const apps = DEMO_APPS;
  const hired     = apps.filter(a => a.status === 'hired').length;
  const interview = apps.filter(a => a.status === 'interview').length;
  const pending   = apps.filter(a => a.status === 'pending').length;
  const hireRate  = apps.length ? Math.round((hired / apps.length) * 100) : 0;
  const pct       = getCompletion(P, 'office');
  const greet     = new Date().getHours() < 12 ? 'صباح الخير' : new Date().getHours() < 18 ? 'مساء الخير' : 'مساء النور';

  el.innerHTML = `
    <!-- البانر الرئيسي -->
    <div class="hero-banner fade-up">
      <div class="hero-lamp">🪔</div>
      <div class="hero-content">
        <p class="hero-label">${greet}،</p>
        <h2 class="hero-name">${nm}</h2>
        <p class="hero-sub">
          <i class="fas fa-map-marker-alt" style="opacity:.7"></i> ${P?.province || '—'}
          • معدل التوظيف: <strong>${hireRate}%</strong>
        </p>
        <div class="hero-actions">
          <button class="btn ba" onclick="openAddJob()"><i class="fas fa-plus-circle"></i>نشر وظيفة جديدة</button>
          <button class="btn" style="border:1px solid rgba(255,255,255,.25);color:#fff;background:rgba(255,255,255,.08);gap:6px;padding:9px 16px;border-radius:9px;font-size:13px;font-weight:700;display:inline-flex;align-items:center"
            onclick="goTo('candidates')"><i class="fas fa-users"></i>المتقدمون</button>
        </div>
      </div>
    </div>

    <!-- اكتمال الملف -->
    ${pct < 90 ? `
    <div class="comp-card fade-up del1">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:140px">
          <div class="comp-label"><i class="fas fa-building"></i>اكتمال ملف المكتب</div>
          <div class="comp-val" style="color:${completionColor(pct)}">${pct}%</div>
          <div class="comp-hint">ملف مكتمل يجذب مزيداً من المتقدمين</div>
        </div>
        <button class="btn bp bsm" onclick="goTo('profile')"><i class="fas fa-pencil-alt"></i>أكمل الملف</button>
      </div>
      <div class="comp-bar-wrap"><div class="comp-bar" style="--w:${pct}%;background:${completionColor(pct)}"></div></div>
    </div>` : ''}

    <!-- الإحصائيات -->
    <div class="sg fade-up del2">
      <div class="sc"><div class="si tl"><i class="fas fa-briefcase"></i></div><div>
        <div class="sl">وظائف نشطة</div><div class="sv">3</div>
        <div class="sc-trend up"><i class="fas fa-arrow-up"></i>+1 هذا الشهر</div>
      </div></div>
      <div class="sc"><div class="si am"><i class="fas fa-users"></i></div><div>
        <div class="sl">إجمالي المتقدمين</div><div class="sv">${apps.length}</div>
        <div class="sc-trend up"><i class="fas fa-arrow-up"></i>جديد</div>
      </div></div>
      <div class="sc"><div class="si pu"><i class="fas fa-comments"></i></div><div>
        <div class="sl">مدعوون للمقابلة</div><div class="sv">${interview}</div>
        <div class="sc-trend ${interview?'up':'neu'}"><i class="fas fa-${interview?'star':'minus'}"></i>${interview?'نشاط عال':'لا يوجد'}</div>
      </div></div>
      <div class="sc"><div class="si gr"><i class="fas fa-check-circle"></i></div><div>
        <div class="sl">تم التوظيف</div><div class="sv">${hired}</div>
        <div class="sc-trend up"><i class="fas fa-trophy"></i>معدل ${hireRate}%</div>
      </div></div>
    </div>

    <!-- قسمان: مسار التوظيف + الإجراءات -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px" class="fade-up del3">
      <!-- مسار التوظيف -->
      <div class="card">
        <div class="ch"><div class="cht"><i class="fas fa-filter" style="color:var(--p)"></i> مسار التوظيف</div></div>
        <div class="funnel">
          ${[
            { l:'استلمنا',   v:apps.length,                                      c:'var(--info)',    p:100 },
            { l:'مراجعة',   v:apps.filter(a=>a.status!=='pending').length,        c:'var(--acc)',     p:Math.round((apps.filter(a=>a.status!=='pending').length/Math.max(apps.length,1))*100) },
            { l:'مقابلة',   v:interview,                                           c:'var(--purple)', p:Math.round((interview/Math.max(apps.length,1))*100) },
            { l:'وُظّفوا',  v:hired,                                               c:'var(--success)', p:Math.round((hired/Math.max(apps.length,1))*100) },
          ].map(r => `<div class="fn-row">
            <span class="fn-label">${r.l}</span>
            <div class="fn-bar-wrap">
              <div class="fn-bar" style="width:${r.p}%;background:${r.c}"></div>
            </div>
            <span class="fn-count">${r.v}</span>
          </div>`).join('')}
        </div>
        <div style="padding:0 16px 14px;display:flex;align-items:center;gap:7px">
          <span class="rate-badge ${hireRate>=50?'rate-high':hireRate>=25?'rate-mid':'rate-low'}">
            <i class="fas fa-chart-line"></i> معدل التوظيف: ${hireRate}%
          </span>
        </div>
      </div>

      <!-- إجراءات سريعة -->
      <div class="card cp">
        <div class="cht" style="margin-bottom:13px"><i class="fas fa-bolt" style="color:var(--acc)"></i> إجراءات سريعة</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            { ico:'fa-plus-circle', l:'نشر وظيفة جديدة',  c:'var(--p)',      a:"openAddJob()" },
            { ico:'fa-users',       l:'عرض المتقدمين',     c:'var(--purple)', a:"goTo('candidates')" },
            { ico:'fa-columns',     l:'خط التوظيف Kanban', c:'var(--acc)',    a:"goTo('pipeline')" },
            { ico:'fa-building',    l:'ملف المكتب',        c:'var(--info)',   a:"goTo('profile')" },
          ].map(a => `<button class="btn bo" style="justify-content:flex-start;gap:10px;text-align:right" onclick="${a.a}">
            <div style="width:30px;height:30px;border-radius:8px;background:${a.c}18;color:${a.c};display:flex;align-items:center;justify-content:center;flex-shrink:0">
              <i class="fas ${a.ico}"></i>
            </div>
            ${a.l}
            <i class="fas fa-arrow-left" style="margin-right:auto;color:var(--tx3);font-size:11px"></i>
          </button>`).join('')}
        </div>
      </div>
    </div>

    <!-- آخر الطلبات -->
    <div class="sh fade-up del4">
      <div class="st"><div class="st-ico"><i class="fas fa-bell"></i></div>آخر الطلبات</div>
      <button class="btn bg bsm" onclick="goTo('candidates')">عرض الكل <i class="fas fa-arrow-left"></i></button>
    </div>
    <div class="card fade-up del4"><div class="tw"><table class="dt">
      <thead><tr>
        <th>المتقدم</th><th>الوظيفة</th><th>الخبرة</th><th>التاريخ</th><th>الحالة</th><th></th>
      </tr></thead>
      <tbody>${apps.slice(0, 5).map(a => {
        const s = STAT[a.status] || STAT.pending;
        return `<tr>
          <td><div style="display:flex;align-items:center;gap:8px">
            <div class="cand-avatar">${a.name.charAt(0)}</div>
            <div><div style="font-size:12px;font-weight:700">${a.name}</div><div style="font-size:10px;color:var(--tx3)">${a.phone}</div></div>
          </div></td>
          <td style="font-size:12px;font-weight:600">${a.jobTitle}</td>
          <td style="font-size:11px;color:var(--tx2)">${a.exp}</td>
          <td style="font-size:11px;color:var(--tx3)">${a.appliedAt?.slice(0,10)||'—'}</td>
          <td><span class="b ${s.c}"><i class="fas ${s.ico}"></i>${s.l}</span></td>
          <td><button class="btn bp bsm" onclick="openCand(${JSON.stringify(a).replace(/"/g,'&quot;')})"><i class="fas fa-eye"></i>عرض</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div></div>`;
}

// ── وظائفي ──
function pgOfficeJobs(el) {
  const jobs = DEMO_JOBS.slice(0, 3);
  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-briefcase"></i></div>وظائفي</div>
      <button class="btn bp bsm" onclick="openAddJob()"><i class="fas fa-plus"></i>نشر وظيفة</button>
    </div>
    ${jobs.map(j => `
      <div class="oj-card">
        <div class="oj-header">
          <div class="jlo" style="width:48px;height:48px;border-radius:13px;font-size:20px;flex-shrink:0">${j.logo || '🏢'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:800;color:var(--tx);margin-bottom:3px">${j.title}</div>
            <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap">
              <span class="b ${j.type==='full'?'b-tl':'b-am'}">${j.type==='full'?'دوام كامل':'دوام جزئي'}</span>
              <span style="font-size:11px;color:var(--tx3)"><i class="fas fa-users"></i> ${j.applicants} متقدم</span>
              <span style="font-size:11px;color:var(--tx3)"><i class="fas fa-map-marker-alt"></i> ${j.province}</span>
            </div>
          </div>
          <div style="text-align:left;flex-shrink:0">
            <span class="b b-gr" style="display:inline-flex;margin-bottom:4px"><i class="fas fa-circle" style="font-size:6px"></i>نشطة</span>
            ${daysLeftBadge(j.deadline)}
          </div>
        </div>
        <div class="oj-body">
          <button class="btn bp bsm" onclick="goTo('candidates')"><i class="fas fa-users"></i>المتقدمون (${j.applicants})</button>
          <button class="btn bg bsm" onclick="notify('قريباً','تعديل الوظائف','info')"><i class="fas fa-edit"></i>تعديل</button>
          <button class="btn bda bsm" onclick="confirm2('إيقاف الوظيفة','هل تريد إيقاف هذه الوظيفة مؤقتاً؟',()=>notify('تم','تم إيقاف الوظيفة','warning'))"><i class="fas fa-pause"></i>إيقاف</button>
        </div>
      </div>`).join('')}

    <div class="al al-i"><i class="fas fa-lightbulb"></i>
      <span>تصل إليك التنبيهات تلقائياً عند تقديم طلبات جديدة على وظائفك.</span>
    </div>`;
}

// ── المتقدمون ──
function pgCandidates(el) {
  const apps = DEMO_APPS;
  el.innerHTML = `
    <div class="sh">
      <div class="st"><div class="st-ico"><i class="fas fa-users"></i></div>المتقدمون</div>
      <span class="b b-tl">${apps.length} متقدم</span>
    </div>

    <!-- الفلاتر -->
    <div class="fb" style="margin-bottom:14px">
      <div class="sb" style="min-width:180px">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="ابحث بالاسم أو الوظيفة..." oninput="filterCands(this.value)">
      </div>
      ${['الكل','قيد المراجعة','مدعو للمقابلة','تم القبول','مرفوض'].map((l, i) =>
        `<button class="fc2 ${i===0?'on':''}"
          onclick="this.closest('.fb').querySelectorAll('.fc2').forEach(b=>b.classList.remove('on'));this.classList.add('on');filterCandsByStatus(['','pending','interview','hired','rejected'][${i}])">${l}
        </button>`
      ).join('')}
    </div>

    <!-- الجدول -->
    <div class="card"><div class="tw"><table class="dt">
      <thead><tr>
        <th>المتقدم</th><th>الوظيفة</th><th>الخبرة</th><th>التاريخ</th><th>الحالة</th><th>إجراءات</th>
      </tr></thead>
      <tbody id="candBody">${renderCandRows(apps)}</tbody>
    </table></div></div>`;
}

function renderCandRows(apps) {
  if (!apps.length) return `<tr><td colspan="6" style="text-align:center;padding:28px;color:var(--tx3)">لا توجد نتائج</td></tr>`;
  return apps.map(a => {
    const s = STAT[a.status] || STAT.pending;
    // المكتب المرتبط: إما مكتب الترشيح أو مكتب فانوس (التقديم المباشر)
    const affiliation = a.isReferral
      ? `<span class="b b-pu" style="font-size:9px"><i class="fas fa-building"></i>${san(a.officeName || 'مكتب')}</span>`
      : `<span class="b b-tl" style="font-size:9px"><i class="fas fa-user"></i>مباشر</span>`;

    // نتيجة الاختبار إذا وُجدت
    const quizBadge = a.quizScore != null
      ? `<span class="b ${a.quizScore >= 70 ? 'b-gr' : a.quizScore >= 50 ? 'b-am' : 'b-rd'}" style="font-size:9px">
          <i class="fas fa-robot"></i>${a.quizScore}
        </span>`
      : '';

    return `<tr>
      <td><div style="display:flex;align-items:center;gap:9px">
        <div class="cand-avatar">${a.name.charAt(0)}</div>
        <div>
          <div style="font-size:12px;font-weight:700">${san(a.name)}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px">${affiliation}${quizBadge}</div>
        </div>
      </div></td>
      <td style="font-size:12px;font-weight:600">${san(a.jobTitle)}</td>
      <td style="font-size:11px;color:var(--tx2)">${san(a.exp || '—')}</td>
      <td style="font-size:11px;color:var(--tx3)">${(a.appliedAt||'').slice(0,10)||'—'}</td>
      <td><span class="b ${s.c}"><i class="fas ${s.ico}"></i>${s.l}</span></td>
      <td><div style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="btn bp bsm" onclick="openCand(${JSON.stringify(a).replace(/"/g,'&quot;')})"><i class="fas fa-eye"></i></button>
        <button class="btn bsu bsm" onclick="quickUpdateStatus(this,'hired','${a.id}',event)"   title="قبول"><i class="fas fa-check"></i></button>
        <button class="btn bda bsm" onclick="quickUpdateStatus(this,'rejected','${a.id}',event)" title="رفض"><i class="fas fa-times"></i></button>
      </div></td>
    </tr>`;
  }).join('');
}

function filterCands(q) {
  document.querySelectorAll('#candBody tr').forEach(r => {
    r.style.display = r.textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none';
  });
}

function filterCandsByStatus(status) {
  const apps  = status ? DEMO_APPS.filter(a => a.status === status) : DEMO_APPS;
  const tbody = document.getElementById('candBody');
  if (tbody) tbody.innerHTML = renderCandRows(apps);
}

async function quickUpdateStatus(btn, status, appId, e) {
  if (e) e.stopPropagation();
  const s    = STAT[status];
  const cell = btn.closest('tr')?.querySelector('td:nth-child(5)');
  if (cell && s) cell.innerHTML = `<span class="b ${s.c}"><i class="fas ${s.ico}"></i>${s.l}</span>`;
  // تحديث في Firestore
  if (!DEMO && window.db && appId && !appId.startsWith('a')) {
    try { await window.db.collection('applications').doc(appId).update({ status }); } catch(_) {}
  }
  // تحديث محلي
  const app = DEMO_APPS.find(a => a.id === appId);
  if (app) app.status = status;
  notify('تم التحديث ✅', `تم تغيير الحالة إلى: ${s?.l || status}`, 'success');
}

// ── تفاصيل المتقدم ──
function openCand(a) {
  const s = STAT[a.status] || STAT.pending;
  document.getElementById('moCandB').innerHTML = `
    <!-- رأس المتقدم -->
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">
      <div class="av avl" style="background:var(--grad-p);color:#fff;font-size:22px;font-weight:900">${a.name.charAt(0)}</div>
      <div style="flex:1">
        <div style="font-size:18px;font-weight:900;color:var(--tx);margin-bottom:3px">${san(a.name)}</div>
        <div class="info-row" style="margin-top:4px">
          ${a.isReferral
            ? `<span class="b b-pu"><i class="fas fa-building"></i>مرشّح من: ${san(a.officeName || 'مكتب')}</span>`
            : `<span class="b b-tl"><i class="fas fa-user"></i>تقديم مباشر عبر المنصة</span>`
          }
          ${a.quizScore != null
            ? `<span class="b ${a.quizScore >= 70 ? 'b-gr' : a.quizScore >= 50 ? 'b-am' : 'b-rd'}">
                <i class="fas fa-robot"></i>اختبار: ${a.quizScore}/100
              </span>`
            : ''}
        </div>
        <div style="font-size:11px;color:var(--tx3);margin-top:6px">
          <!-- وسائل التواصل تظهر فقط عند قبول المتقدم -->
          ${['interview','hired'].includes(a.status)
            ? `<div class="info-row" style="margin-top:4px">
                <div class="info-item"><i class="fas fa-envelope" style="color:var(--p)"></i>${san(a.email)}</div>
                <div class="info-item"><i class="fas fa-phone" style="color:var(--success)"></i>${san(a.phone)}</div>
                <a href="https://wa.me/964${san(a.phone).replace(/^0/,'')}" target="_blank"
                  style="display:inline-flex;align-items:center;gap:4px;background:#25D366;color:#fff;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;text-decoration:none;margin-top:4px">
                  <i class="fab fa-whatsapp"></i>واتساب
                </a>
               </div>`
            : `<div class="al al-i" style="margin-top:6px;font-size:10px;padding:6px 10px">
                <i class="fas fa-lock"></i>
                <span>وسائل التواصل تظهر عند دعوته للمقابلة</span>
               </div>`
          }
        </div>
        <span class="b ${s.c}" style="margin-top:8px;display:inline-flex"><i class="fas ${s.ico}"></i>${s.l}</span>
      </div>
    </div>

    <!-- معلومات الوظيفة -->
    <div class="card cp" style="background:var(--bgc2);margin-bottom:12px">
      <div style="font-size:10px;font-weight:700;color:var(--tx3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px">الوظيفة المتقدم إليها</div>
      <div style="font-size:14px;font-weight:800;color:var(--tx)">${a.jobTitle}</div>
      <div style="font-size:11px;color:var(--tx2);margin-top:3px">
        <i class="fas fa-briefcase" style="color:var(--tx3)"></i> خبرة: ${a.exp}
        &nbsp;•&nbsp;
        <i class="fas fa-calendar" style="color:var(--tx3)"></i> ${a.appliedAt?.slice(0,10)||'—'}
      </div>
    </div>

    <!-- رسالة التغطية -->
    <div class="card cp" style="margin-bottom:16px">
      <div style="font-size:11px;font-weight:700;color:var(--tx3);margin-bottom:7px;display:flex;align-items:center;gap:5px">
        <i class="fas fa-align-left" style="color:var(--p)"></i> رسالة التغطية
      </div>
      <p style="font-size:12px;color:var(--tx2);line-height:1.9">${a.cover}</p>
    </div>

    ${a.cvUrl ? `<div style="margin-bottom:16px">
      <a href="${a.cvUrl}" target="_blank" class="btn bo">
        <i class="fas fa-external-link-alt"></i>عرض السيرة الذاتية
      </a>
    </div>` : ''}

    ${a.quizScore !== null && a.quizScore !== undefined ? `
    <div class="card cp" style="margin-bottom:16px;background:linear-gradient(135deg,rgba(13,148,136,.07),rgba(13,148,136,.02));border-color:rgba(13,148,136,.2)">
      <div style="display:flex;align-items:center;gap:12px">
        <div style="font-size:28px;font-weight:900;color:${a.quizScore >= 80 ? 'var(--success)' : a.quizScore >= 55 ? 'var(--acc)' : 'var(--danger)'}">${a.quizScore}</div>
        <div>
          <div style="font-size:11px;color:var(--tx3)"><i class="fas fa-robot"></i> نتيجة الاختبار الذكي</div>
          <div style="font-size:12px;color:var(--tx);font-weight:600">${san(a.quizFeedback || '—')}</div>
        </div>
        <div style="margin-right:auto">
          <span class="b ${a.quizScore >= 80 ? 'b-gr' : a.quizScore >= 55 ? 'b-am' : 'b-rd'}">${a.quizScore >= 80 ? 'ممتاز' : a.quizScore >= 55 ? 'جيد' : 'مقبول'}</span>
        </div>
      </div>
    </div>` : ''}

    <!-- تفاصيل المقابلة إن وُجدت -->
    ${a.status === 'interview' && a.interviewDate ? `
    <div class="card cp" style="margin-bottom:16px;background:linear-gradient(135deg,rgba(139,92,246,.07),rgba(139,92,246,.02));border-color:rgba(139,92,246,.2)">
      <div style="font-size:11px;color:var(--tx3);margin-bottom:6px;font-weight:700"><i class="fas fa-calendar-check" style="color:var(--purple)"></i> موعد المقابلة</div>
      <div style="font-size:13px;font-weight:800;color:var(--tx)">${a.interviewType || 'حضوري'} — ${a.interviewDate} الساعة ${a.interviewTime || ''}</div>
      ${a.interviewNote ? `<div style="font-size:11px;color:var(--tx2);margin-top:6px">${san(a.interviewNote)}</div>` : ''}
    </div>` : ''}

    <!-- سبب الرفض إن وُجد -->
    ${a.status === 'rejected' && a.rejectionReason ? `
    <div class="al al-d" style="margin-bottom:16px">
      <i class="fas fa-info-circle"></i>
      <div><div style="font-weight:700">سبب الرفض: ${san(a.rejectionReason)}</div>
      ${a.rejectionNote ? `<div style="font-size:11px;margin-top:3px">${san(a.rejectionNote)}</div>` : ''}</div>
    </div>` : ''}

    <!-- الإجراءات -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:9px">
      <button class="btn bo bsm" onclick="updateCandStatus('${a.id}','interview')" ${a.status === 'hired' ? 'disabled' : ''}>
        <i class="fas fa-calendar-check"></i>دعوة مقابلة
      </button>
      <button class="btn" style="background:rgba(245,158,11,.12);color:var(--acc);border:1px solid rgba(245,158,11,.3)" onclick="bookCandidate('${a.applicantId}','${san(a.name)}','${a.jobId}')">
        <i class="fas fa-lock"></i>حجز حصري
      </button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">
      <button class="btn bsu bsm" onclick="updateCandStatus('${a.id}','hired')" ${a.status === 'hired' ? 'disabled style="opacity:.5"' : ''}>
        <i class="fas fa-check"></i>قبول
      </button>
      <button class="btn bda bsm" onclick="updateCandStatus('${a.id}','rejected')" ${a.status === 'rejected' ? 'disabled style="opacity:.5"' : ''}>
        <i class="fas fa-times"></i>رفض
      </button>
    </div>`;
  oMo('moCand');
}

async function updateCandStatus(appId, status) {
  // عرض نافذة تحديد موعد المقابلة
  if (status === 'interview') {
    return openInterviewSchedule(appId);
  }
  // عرض نافذة سبب الرفض
  if (status === 'rejected') {
    return openRejectionDialog(appId);
  }
  await _doUpdateStatus(appId, status);
}

async function _doUpdateStatus(appId, status, extra = {}) {
  const s = STAT[status];
  if (!DEMO && window.db && appId && !appId.startsWith('a')) {
    try { await window.db.collection('applications').doc(appId).update({ status, ...extra }); } catch(e) {}
  }
  const app = MY_APPS.find(a => a.id === appId) || DEMO_APPS.find(a => a.id === appId);
  if (app) { app.status = status; Object.assign(app, extra); }
  notify('تم التحديث ✅', `تم تغيير الحالة إلى: ${s?.l}`, 'success');
  cmo('moCand');
  goTo('candidates');
}

function openInterviewSchedule(appId) {
  document.getElementById('moApplyB').innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(139,92,246,.12);color:var(--purple);font-size:22px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px"><i class="fas fa-calendar-check"></i></div>
      <div style="font-size:16px;font-weight:900;color:var(--tx)">دعوة لمقابلة عمل</div>
      <div style="font-size:12px;color:var(--tx2);margin-top:4px">حدد موعد المقابلة وطريقتها</div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl req">تاريخ المقابلة</label>
        <input type="date" id="iv_date" class="fc" min="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="fg"><label class="fl req">الوقت</label>
        <input type="time" id="iv_time" class="fc">
      </div>
    </div>
    <div class="fg"><label class="fl req">طريقة المقابلة</label>
      <select id="iv_type" class="fc">
        <option value="حضوري">حضوري في المكتب</option>
        <option value="فيديو">مقابلة فيديو (Zoom / Teams)</option>
        <option value="هاتفي">هاتفي</option>
      </select>
    </div>
    <div class="fg"><label class="fl">ملاحظات للمتقدم (اختياري)</label>
      <textarea id="iv_note" class="fc" rows="2" placeholder="مثال: احضر سيرتك الذاتية وشهاداتك الأصلية..."></textarea>
    </div>
    <div class="mf" style="padding:0;border:none;margin-top:14px">
      <button class="btn bo" onclick="cmo('moApply')"><i class="fas fa-times"></i>إلغاء</button>
      <button class="btn bsm bfu" id="ivSubmitBtn" style="background:var(--purple);color:#fff;border:none;flex:1"
        onclick="submitInterview('${appId}')">
        <i class="fas fa-paper-plane"></i>إرسال الدعوة
      </button>
    </div>`;
  cmo('moCand');
  oMo('moApply');
}

async function submitInterview(appId) {
  const date = document.getElementById('iv_date')?.value;
  const time = document.getElementById('iv_time')?.value;
  const type = document.getElementById('iv_type')?.value;
  const note = document.getElementById('iv_note')?.value.trim();
  if (!date || !time) { notify('تنبيه', 'حدد تاريخ ووقت المقابلة', 'warning'); return; }
  loading('ivSubmitBtn', true);
  const interviewData = { interviewDate: date, interviewTime: time, interviewType: type, interviewNote: note || null };
  cmo('moApply');
  await _doUpdateStatus(appId, 'interview', interviewData);
}

function openRejectionDialog(appId) {
  document.getElementById('moApplyB').innerHTML = `
    <div style="text-align:center;margin-bottom:20px">
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(239,68,68,.1);color:var(--danger);font-size:22px;display:flex;align-items:center;justify-content:center;margin:0 auto 10px"><i class="fas fa-times-circle"></i></div>
      <div style="font-size:16px;font-weight:900;color:var(--tx)">رفض الطلب</div>
      <div style="font-size:12px;color:var(--tx2);margin-top:4px">يساعد ذكر السبب المتقدم على تحسين نفسه</div>
    </div>
    <div class="fg"><label class="fl">سبب الرفض</label>
      <select id="rej_reason" class="fc">
        <option value="الخبرة لا تتطابق مع المتطلبات">الخبرة لا تتطابق مع المتطلبات</option>
        <option value="المؤهلات غير كافية">المؤهلات غير كافية</option>
        <option value="تم شغل الوظيفة">تم شغل الوظيفة</option>
        <option value="لا يتناسب مع بيئة العمل">لا يتناسب مع بيئة العمل</option>
        <option value="طلب راتب أعلى من الميزانية">طلب راتب أعلى من الميزانية</option>
        <option value="أخرى">أخرى (أذكر في الملاحظات)</option>
      </select>
    </div>
    <div class="fg"><label class="fl">ملاحظات إضافية (اختياري)</label>
      <textarea id="rej_note" class="fc" rows="2" placeholder="نصيحة للمتقدم..."></textarea>
    </div>
    <div class="mf" style="padding:0;border:none;margin-top:14px">
      <button class="btn bo" onclick="cmo('moApply')"><i class="fas fa-times"></i>إلغاء</button>
      <button class="btn bda bfu" id="rejSubmitBtn" onclick="submitRejection('${appId}')">
        <i class="fas fa-ban"></i>تأكيد الرفض
      </button>
    </div>`;
  cmo('moCand');
  oMo('moApply');
}

async function submitRejection(appId) {
  const reason = document.getElementById('rej_reason')?.value;
  const note   = document.getElementById('rej_note')?.value.trim();
  loading('rejSubmitBtn', true);
  cmo('moApply');
  await _doUpdateStatus(appId, 'rejected', { rejectionReason: reason, rejectionNote: note || null });
}

// ── خط التوظيف (Kanban) ──
function pgPipeline(el) {
  const stages = [
    { id:'pending',   l:'جديد',         c:'var(--acc)',     ico:'fa-inbox' },
    { id:'reviewed',  l:'مراجعة',       c:'var(--info)',    ico:'fa-eye' },
    { id:'interview', l:'مقابلة',        c:'var(--purple)',  ico:'fa-comments' },
    { id:'hired',     l:'وُظّف',         c:'var(--success)', ico:'fa-check-circle' },
    { id:'rejected',  l:'مرفوض',        c:'var(--danger)',  ico:'fa-times-circle' },
  ];
  el.innerHTML = `
    <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-columns"></i></div>خط التوظيف</div>
      <span class="b b-tl">${DEMO_APPS.length} متقدم</span>
    </div>
    <div class="kb">
      ${stages.map(s => {
        const apps = DEMO_APPS.filter(a => a.status === s.id);
        return `<div class="kcol">
          <div class="kch">
            <span style="display:flex;align-items:center;gap:5px;color:${s.c};font-size:12px">
              <i class="fas ${s.ico}" style="font-size:11px"></i>${s.l}
            </span>
            <span class="b" style="background:${s.c}18;color:${s.c}">${apps.length}</span>
          </div>
          <div class="kcb">
            ${apps.map(a => `
              <div class="kcard" onclick="openCand(${JSON.stringify(a).replace(/"/g,'&quot;')})">
                <div style="display:flex;align-items:center;gap:7px;margin-bottom:6px">
                  <div class="cand-avatar" style="width:30px;height:30px;font-size:12px">${a.name.charAt(0)}</div>
                  <div>
                    <div class="kn">${a.name}</div>
                    <div class="kj">${a.jobTitle}</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <span style="font-size:10px;color:var(--tx3)">${a.exp}</span>
                  <i class="fas fa-chevron-left" style="font-size:9px;color:var(--tx3)"></i>
                </div>
              </div>`).join('') || `
              <div style="text-align:center;padding:20px 12px;color:var(--tx3)">
                <i class="fas fa-inbox" style="font-size:18px;opacity:.3;display:block;margin-bottom:5px"></i>
                <span style="font-size:10px">لا يوجد</span>
              </div>`}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ── ملف المكتب ──
function pgOfficeProfile(el) {
  const p  = P;
  const nm = p?.officeName || p?.name || 'المكتب';
  el.innerHTML = `
    <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-building"></i></div>ملف المكتب</div></div>

    <div class="card" style="margin-bottom:14px">
      <!-- البانر -->
      <div class="prof-banner">
        <div style="position:absolute;bottom:-20px;right:22px;z-index:2">
          <div class="av avxl" style="background:var(--bgc);color:var(--pd);font-size:28px;font-weight:900;border:3px solid var(--bgc);box-shadow:var(--shxl)">${nm.charAt(0)}</div>
        </div>
      </div>

      <div class="cp" style="padding-top:30px">
        <!-- الإحصائيات -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:20px">
          ${[
            { v:3,               l:'وظائف نشطة',  c:'var(--p)' },
            { v:DEMO_APPS.length, l:'المتقدمون',   c:'var(--acc)' },
            { v:DEMO_APPS.filter(a=>a.status==='hired').length, l:'تم توظيفهم', c:'var(--success)' },
          ].map(x => `<div style="text-align:center;padding:12px 10px;background:var(--bgc2);border-radius:11px;border:1px solid var(--br)">
            <div style="font-size:20px;font-weight:900;color:${x.c}">${x.v}</div>
            <div style="font-size:10px;color:var(--tx3);margin-top:2px">${x.l}</div>
          </div>`).join('')}
        </div>

        <!-- نموذج التعديل -->
        <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:14px;display:flex;align-items:center;gap:6px">
          <i class="fas fa-pencil-alt" style="color:var(--p)"></i>تعديل معلومات المكتب
        </div>
        <div class="fg"><label class="fl req">اسم المكتب / الشركة</label>
          <input type="text" class="fc" value="${nm}" id="eon">
        </div>
        <div class="fr">
          <div class="fg"><label class="fl req">المحافظة</label>
            <select id="eprov2" class="fc">${PROVS.map(v => `<option ${p?.province===v?'selected':''}>${v}</option>`).join('')}</select>
          </div>
          <div class="fg"><label class="fl">هاتف المكتب</label>
            <input type="tel" id="eoph" class="fc" value="${p?.phone||''}" placeholder="07X XXXX XXXX">
          </div>
        </div>
        <div class="fg"><label class="fl">وصف المكتب</label>
          <textarea id="eobio" class="fc" rows="3" placeholder="نبذة عن مكتبك وخدماتك...">${p?.bio||''}</textarea>
        </div>
        <button class="btn bp" onclick="saveOfficeProfile()"><i class="fas fa-save"></i>حفظ التغييرات</button>
      </div>
    </div>

    <!-- خطط الاشتراك -->
    <div class="card cp" style="margin-bottom:14px">
      <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:4px;display:flex;align-items:center;gap:6px">
        <i class="fas fa-crown" style="color:var(--acc)"></i> خطة الاشتراك
        <span class="b b-gr" style="font-size:10px">الخطة الحالية: مجانية</span>
      </div>
      <p style="font-size:11px;color:var(--tx3);margin-bottom:14px">ارفع مستوى اشتراكك للوصول إلى ميزات متقدمة وزيادة ظهور وظائفك</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
        ${[
          {
            name:'مجاني', price:'0', cur:'IQD', period:'دائماً',
            color:'var(--tx2)', bg:'var(--bgc2)', badge:'',
            features:['3 وظائف نشطة','50 مشاهدة/شهر','دعم بالبريد','تقارير أساسية'],
            btn:'الخطة الحالية', btnClass:'bo', disabled:true
          },
          {
            name:'برو', price:'50,000', cur:'IQD', period:'شهرياً',
            color:'var(--p)', bg:'rgba(13,148,136,.06)', badge:'الأكثر طلباً',
            features:['20 وظيفة نشطة','وظائف مميزة (Boost)','1000 مشاهدة/شهر','تقارير متقدمة','دعم أولوية'],
            btn:'ترقية للبرو', btnClass:'bp', disabled:false
          },
          {
            name:'مؤسسة', price:'150,000', cur:'IQD', period:'شهرياً',
            color:'var(--acc)', bg:'rgba(245,158,11,.06)', badge:'للشركات الكبيرة',
            features:['وظائف غير محدودة','ظهور مميز #1','تقارير AI متقدمة','مدير حساب مخصص','API للتكامل'],
            btn:'تواصل معنا', btnClass:'ba', disabled:false
          },
        ].map(plan => `
          <div style="border:2px solid ${plan.disabled ? 'var(--br)' : plan.color};border-radius:14px;padding:14px;background:${plan.bg};position:relative;transition:all .2s"
            ${!plan.disabled ? `onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'" onmouseleave="this.style.transform='';this.style.boxShadow=''"` : ''}>
            ${plan.badge ? `<div style="position:absolute;top:-10px;right:50%;transform:translateX(50%);background:${plan.color};color:#fff;font-size:9px;font-weight:800;padding:3px 10px;border-radius:20px;white-space:nowrap">${plan.badge}</div>` : ''}
            <div style="font-size:13px;font-weight:900;color:${plan.color};margin-bottom:4px">${plan.name}</div>
            <div style="font-size:18px;font-weight:900;color:var(--tx)">${plan.price} <span style="font-size:10px;font-weight:400;color:var(--tx3)">${plan.cur} / ${plan.period}</span></div>
            <div style="margin:10px 0;display:flex;flex-direction:column;gap:5px">
              ${plan.features.map(f => `<div style="font-size:10px;color:var(--tx2);display:flex;align-items:center;gap:5px">
                <i class="fas fa-check-circle" style="color:${plan.color};font-size:9px;flex-shrink:0"></i>${f}
              </div>`).join('')}
            </div>
            <button class="btn ${plan.btnClass} bsm bfu" ${plan.disabled ? 'disabled' : `onclick="notify('${plan.name === 'مؤسسة' ? 'تواصل معنا' : 'الترقية'}','${plan.name === 'مؤسسة' ? 'سيتواصل معك فريقنا قريباً' : 'سيتم تفعيل الدفع الإلكتروني قريباً'}','${plan.name === 'مؤسسة' ? 'info' : 'success'}')"`}>
              ${plan.btn}
            </button>
          </div>`).join('')}
      </div>
      <div class="al al-i" style="margin-top:12px">
        <i class="fas fa-shield-alt"></i>
        <span>ضمان استرجاع خلال 7 أيام. الدفع عبر: <strong>ZainCash</strong> • <strong>AsiaHawala</strong> • <strong>FIB</strong> • بطاقة مصرفية</span>
      </div>
    </div>

    <!-- الأمان -->
    <div class="card cp">
      <div style="font-size:13px;font-weight:800;color:var(--tx);margin-bottom:12px">
        <i class="fas fa-shield-alt" style="color:var(--danger)"></i> الأمان والحساب
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn bo bsm" onclick="showChangePwForm()">
          <i class="fas fa-key"></i>تغيير كلمة المرور
        </button>
        <button class="btn bda bsm" onclick="doLogout()">
          <i class="fas fa-sign-out-alt"></i>تسجيل الخروج
        </button>
      </div>
      <div id="changePwSection" style="display:none;margin-top:14px">
        <div style="border-top:1px solid var(--br);margin-bottom:14px"></div>
        <div style="font-size:12px;font-weight:800;color:var(--tx);margin-bottom:10px"><i class="fas fa-lock" style="color:var(--p)"></i> تغيير كلمة المرور</div>
        <div class="fg">
          <label class="fl req">كلمة المرور الحالية</label>
          <div class="ig">
            <input type="password" id="pw_curr" class="fc" placeholder="كلمة المرور الحالية">
            <button class="btn bo bsm" onclick="togglePw('pw_curr',this)"><i class="fas fa-eye"></i></button>
          </div>
        </div>
        <div class="fg">
          <label class="fl req">كلمة المرور الجديدة</label>
          <div class="ig">
            <input type="password" id="pw_new" class="fc" placeholder="8 أحرف على الأقل">
            <button class="btn bo bsm" onclick="togglePw('pw_new',this)"><i class="fas fa-eye"></i></button>
          </div>
        </div>
        <div class="fg">
          <label class="fl req">تأكيد كلمة المرور</label>
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

async function saveOfficeProfile() {
  const d = {
    officeName: document.getElementById('eon')?.value    || '',
    province:   document.getElementById('eprov2')?.value || '',
    phone:      document.getElementById('eoph')?.value   || '',
    bio:        document.getElementById('eobio')?.value  || '',
  };
  P = { ...P, ...d };
  if (!DEMO && window.db && U) { try { await window.db.collection('users').doc(U.uid).update(d); } catch(e) {} }
  updateUserUI();
  notify('تم الحفظ ✅', 'تم تحديث ملف المكتب', 'success');
}

// ── نشر وظيفة جديدة ──
function openAddJob() {
  if (!requireAuth('office')) return;
  document.getElementById('moAddJobB').innerHTML = `
    <div class="al al-i" style="margin-bottom:16px">
      <i class="fas fa-lightbulb"></i>
      <span>الوظائف ذات الأوصاف الواضحة تجذب متقدمين أفضل. أضف التفاصيل كاملةً.</span>
    </div>

    <div class="fr">
      <div class="fg"><label class="fl req">المسمى الوظيفي</label><input type="text" id="jt" class="fc" placeholder="مثال: مبرمج ويب React.js"></div>
      <div class="fg"><label class="fl req">الشركة / المكتب</label><input type="text" id="jco2" class="fc" value="${P?.officeName||P?.name||''}"></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl req">نوع الدوام</label>
        <select id="jty" class="fc">
          <option value="full">دوام كامل</option>
          <option value="part">دوام جزئي</option>
          <option value="freelance">مستقل / مشروع</option>
        </select>
      </div>
      <div class="fg"><label class="fl req">التخصص</label>
        <select id="jca" class="fc">
          <option value="tech">تقنية</option><option value="biz">أعمال</option>
          <option value="med">طب</option><option value="edu">تعليم</option>
          <option value="eng">هندسة</option><option value="other">أخرى</option>
        </select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl">الراتب الأدنى (IQD)</label><input type="number" id="js" class="fc" placeholder="500000"></div>
      <div class="fg"><label class="fl">الراتب الأعلى (IQD)</label><input type="number" id="jsm" class="fc" placeholder="800000"></div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl req">المحافظة</label>
        <select id="jp" class="fc">${PROVS.map(p=>`<option>${p}</option>`).join('')}</select>
      </div>
      <div class="fg"><label class="fl">الخبرة المطلوبة</label>
        <select id="je" class="fc">
          <option>بدون خبرة</option><option>أقل من سنة</option><option>1-2 سنة</option>
          <option>2-4 سنوات</option><option>4+ سنوات</option>
        </select>
      </div>
    </div>
    <div class="fr">
      <div class="fg"><label class="fl">الجنس</label>
        <select id="jge" class="fc"><option>الجنسين</option><option>ذكور</option><option>إناث</option></select>
      </div>
      <div class="fg"><label class="fl">ساعات العمل</label><input type="text" id="jhr" class="fc" placeholder="8 ساعات يومياً"></div>
    </div>
    <div class="fg"><label class="fl req">وصف الوظيفة والمهام</label>
      <textarea id="jd" class="fc" rows="4" placeholder="صف الوظيفة والمهام اليومية والبيئة العملية..."></textarea>
    </div>
    <div class="fg"><label class="fl">المتطلبات <span class="fh" style="display:inline">(افصل بفاصلة)</span></label>
      <input type="text" id="jr" class="fc" placeholder="React.js, Node.js, MongoDB, Git">
    </div>
    <div class="fg"><label class="fl">المزايا والفوائد <span class="fh" style="display:inline">(افصل بفاصلة)</span></label>
      <input type="text" id="jb" class="fc" placeholder="تأمين صحي, أجازة 30 يوم, عمل هجين">
    </div>
    <div class="fg"><label class="fl">آخر موعد للتقديم</label><input type="date" id="jdl" class="fc"></div>

    <div class="mf" style="padding:0;border:none;margin-top:12px">
      <button class="btn bo" onclick="cmo('moAddJob')"><i class="fas fa-times"></i>إلغاء</button>
      <button class="btn bp blg" id="addJobBtn" onclick="submitJob()"><i class="fas fa-bullhorn"></i>نشر الوظيفة</button>
    </div>`;
  oMo('moAddJob');
}

// ══════════════════════════════════════════════════════
// صفحة مكاتب التوظيف — للباحث عن عمل
// ══════════════════════════════════════════════════════
async function pgOfficesList(el) {
  el.innerHTML = `<div style="text-align:center;padding:30px"><div class="spin2"></div></div>`;

  let offices = [];
  if (!DEMO && window.db) {
    try {
      const snap = await window.db.collection('users')
        .where('role', '==', 'office')
        .where('status', '==', 'active')
        .limit(30).get();
      offices = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {}
  }

  // بيانات تجريبية
  if (!offices.length) {
    offices = [
      { id:'o1', officeName:'مكتب الأمل للتوظيف',    name:'مكتب الأمل',    province:'بغداد',  bio:'متخصصون في التوظيف التقني والإداري', rating:4.7, ratingCount:23, jobsCount:8  },
      { id:'o2', officeName:'مكتب الراشدي',           name:'مكتب الراشدي', province:'كربلاء', bio:'خبرة 10 سنوات في سوق العمل العراقي',  rating:4.5, ratingCount:17, jobsCount:5  },
      { id:'o3', officeName:'مكتب التعليم المتقدم',   name:'مكتب التعليم', province:'أربيل',  bio:'توظيف في القطاع التعليمي والصحي',     rating:4.8, ratingCount:31, jobsCount:6  },
      { id:'o4', officeName:'مكتب الصحة المهنية',     name:'مكتب الصحة',   province:'البصرة', bio:'متخصصون في الكوادر الطبية',            rating:4.3, ratingCount:12, jobsCount:3  },
    ];
  }

  el.innerHTML = `
    <div class="sh fade-up">
      <div class="st"><div class="st-ico" style="background:linear-gradient(135deg,var(--purple),#a78bfa)"><i class="fas fa-building"></i></div>مكاتب التوظيف</div>
      <span class="b b-tl">${offices.length} مكتب</span>
    </div>

    <div class="sb fade-up" style="margin-bottom:14px">
      <i class="fas fa-search"></i>
      <input type="text" placeholder="ابحث عن مكتب..." oninput="filterOfficesList(this.value)">
    </div>

    <div id="officesList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px">
      ${offices.map(o => officeCard(o)).join('')}
    </div>`;

  window._officesData = offices;
}

function officeCard(o) {
  const rating = o.rating || 0;
  const stars  = Math.round(rating);
  const jobsCount = o.jobsCount || JOBS.filter(j => j.postedBy === o.id).length;

  // هل قدّم الباحث على وظيفة من هذا المكتب؟
  const canRate = MY_APPS.some(a => a.postedBy === o.id || a.company === (o.officeName || o.name));

  return `<div class="card cp fade-up">
    <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
      <div class="av avl" style="background:var(--grad-p);color:#fff;font-size:18px;font-weight:900;flex-shrink:0">
        ${(o.officeName || o.name || '؟').charAt(0)}
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:900;color:var(--tx)">${san(o.officeName || o.name)}</div>
        <div style="font-size:11px;color:var(--tx2);margin-top:2px">
          <i class="fas fa-map-marker-alt" style="color:var(--tx3)"></i> ${san(o.province || '—')}
        </div>
        <div style="display:flex;align-items:center;gap:4px;margin-top:5px">
          ${[1,2,3,4,5].map(i =>
            `<i class="fas fa-star" style="font-size:11px;color:${i <= stars ? '#f59e0b' : 'var(--br)'}"></i>`
          ).join('')}
          <span style="font-size:10px;color:var(--tx3);margin-right:4px">${rating ? rating.toFixed(1) : '—'} (${o.ratingCount || 0})</span>
        </div>
      </div>
    </div>

    ${o.bio ? `<div style="font-size:12px;color:var(--tx2);line-height:1.6;margin-bottom:12px">${san(o.bio)}</div>` : ''}

    <div style="display:flex;gap:8px;margin-bottom:12px">
      <div style="flex:1;background:var(--bgc2);border-radius:9px;padding:8px;text-align:center">
        <div style="font-size:16px;font-weight:900;color:var(--p)">${jobsCount}</div>
        <div style="font-size:9px;color:var(--tx3)">وظيفة</div>
      </div>
      <div style="flex:1;background:var(--bgc2);border-radius:9px;padding:8px;text-align:center">
        <div style="font-size:16px;font-weight:900;color:${rating >= 4.5 ? 'var(--success)' : 'var(--acc)'}">⭐${rating ? rating.toFixed(1) : '—'}</div>
        <div style="font-size:9px;color:var(--tx3)">تقييم</div>
      </div>
    </div>

    <div style="display:flex;gap:8px">
      <button class="btn bp bsm" style="flex:1" onclick="viewOfficeJobs('${o.id}','${san(o.officeName || o.name)}')">
        <i class="fas fa-briefcase"></i>عرض الوظائف
      </button>
      ${canRate ? `<button class="btn bsm" style="background:rgba(245,158,11,.12);color:var(--acc);border:1px solid rgba(245,158,11,.3)"
          onclick="openRating('${o.id}','${san(o.officeName || o.name)}')">
          <i class="fas fa-star"></i>قيّم
        </button>` : ''}
    </div>
  </div>`;
}

function filterOfficesList(q) {
  const list = window._officesData || [];
  const filtered = q ? list.filter(o =>
    (o.officeName || o.name || '').includes(q) ||
    (o.province || '').includes(q) ||
    (o.bio || '').includes(q)
  ) : list;
  const el = document.getElementById('officesList');
  if (el) el.innerHTML = filtered.length ? filtered.map(o => officeCard(o)).join('') : emptyState('🔍', 'لا توجد نتائج', '');
}

function viewOfficeJobs(officeId, officeName) {
  const jobs = JOBS.filter(j => j.postedBy === officeId || j.company === officeName);
  const el   = document.getElementById('pcon');
  el.innerHTML = `
    <div class="sh">
      <button class="btn bo bsm" onclick="goTo('offices')"><i class="fas fa-arrow-right"></i>رجوع</button>
      <div class="st"><div class="st-ico"><i class="fas fa-briefcase"></i></div>وظائف ${san(officeName)}</div>
    </div>
    ${jobs.length
      ? `<div class="jg">${jobs.map(j => jCard(j)).join('')}</div>`
      : emptyState('📋', 'لا توجد وظائف نشطة', 'هذا المكتب لا يملك وظائف متاحة حالياً')}`;
}

// ── نظام التقييم ──
function openRating(officeId, officeName) {
  window.selectedStars = 0;
  const el = document.getElementById('moApplyB');
  el.innerHTML = `
    <div style="text-align:center;padding:10px 0 20px">
      <div style="font-size:18px;font-weight:900;color:var(--tx);margin-bottom:4px">${san(officeName)}</div>
      <div style="font-size:12px;color:var(--tx2);margin-bottom:20px">قيّم تجربتك مع هذا المكتب</div>
      <div style="display:flex;justify-content:center;gap:10px;margin-bottom:6px" id="starsRow">
        ${[1,2,3,4,5].map(i =>
          `<i class="fas fa-star" id="star_${i}" data-val="${i}"
            style="font-size:36px;color:var(--br);cursor:pointer;transition:color .15s"
            onmouseover="hoverStars(${i})" onmouseout="hoverStars(window.selectedStars||0)"
            onclick="selectStar(${i},'${officeId}')"></i>`
        ).join('')}
      </div>
      <div id="starLabel" style="font-size:12px;color:var(--tx3);margin-bottom:16px;height:18px"></div>
      <div class="fg" style="text-align:right">
        <label class="fl">تعليق (اختياري)</label>
        <textarea id="ratingNote" class="fc" rows="3" placeholder="شاركنا تجربتك مع هذا المكتب..."></textarea>
      </div>
      <button class="btn bp bfu" id="ratingBtn" style="margin-top:12px" onclick="submitRating('${officeId}','${san(officeName)}')">
        <i class="fas fa-paper-plane"></i>إرسال التقييم
      </button>
    </div>`;
  oMo('moApply');
}

function hoverStars(n) {
  [1,2,3,4,5].forEach(i => {
    const s = document.getElementById(`star_${i}`);
    if (s) s.style.color = i <= n ? '#f59e0b' : 'var(--br)';
  });
  const labels = ['','ضعيف','مقبول','جيد','جيد جداً','ممتاز'];
  const lbl = document.getElementById('starLabel');
  if (lbl) lbl.textContent = labels[n] || '';
}

function selectStar(n, officeId) {
  window.selectedStars = n;
  hoverStars(n);
}

async function submitRating(officeId, officeName) {
  if (!requireAuth('seeker')) return;
  const stars = window.selectedStars || 0;
  if (!stars) { notify('تنبيه', 'اختر عدد النجوم أولاً', 'warning'); return; }
  const note = document.getElementById('ratingNote')?.value.trim();
  loading('ratingBtn', true);
  if (!DEMO && window.db && U) {
    try {
      await window.db.collection('ratings').add({
        officeId, officeName, rating: stars, note: note || null,
        userId: U.uid, userName: P?.name || 'مستخدم',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      // تحديث متوسط التقييم
      const snap = await window.db.collection('ratings').where('officeId','==',officeId).get();
      const ratings = snap.docs.map(d => d.data().rating);
      const avg = ratings.reduce((a,b) => a + b, 0) / ratings.length;
      await window.db.collection('users').doc(officeId).update({
        rating: +avg.toFixed(1), ratingCount: ratings.length
      });
    } catch(e) { console.warn(e); }
  }
  cmo('moApply');
  window.selectedStars = 0;
  notify('شكراً لتقييمك ✅', `تم إرسال تقييمك لـ ${officeName}`, 'success');
}

async function submitJob() {
  if (!requireAuth('office')) return;
  const title = document.getElementById('jt')?.value.trim();
  const co    = document.getElementById('jco2')?.value.trim();
  const desc  = document.getElementById('jd')?.value.trim();
  if (!title || !co || !desc) { notify('خطأ', 'أكمل الحقول المطلوبة: الاسم، الشركة، والوصف', 'error'); return; }
  const job = {
    title, company: co,
    type:      document.getElementById('jty')?.value,
    cat:       document.getElementById('jca')?.value,
    salary:    +document.getElementById('js')?.value  || null,
    salaryMax: +document.getElementById('jsm')?.value || null,
    province:  document.getElementById('jp')?.value,
    exp:       document.getElementById('je')?.value,
    gender:    document.getElementById('jge')?.value,
    hours:     document.getElementById('jhr')?.value,
    desc,
    reqs: document.getElementById('jr')?.value.split(',').map(s=>s.trim()).filter(Boolean),
    bens: document.getElementById('jb')?.value.split(',').map(s=>s.trim()).filter(Boolean),
    deadline:  document.getElementById('jdl')?.value,
    currency: 'IQD', logo: co.charAt(0), applicants: 0, status: 'active',
    postedBy: U?.uid || 'demo', postedAt: new Date().toISOString(),
  };
  loading('addJobBtn', true);
  if (!DEMO && window.db) {
    try {
      const ref = await window.db.collection('jobs').add({ ...job, postedAt: firebase.firestore.FieldValue.serverTimestamp() });
      job.id = ref.id;
    } catch(e) { job.id = 'j_' + Date.now(); }
  } else { job.id = 'j_' + Date.now(); }
  JOBS.unshift(job);
  cmo('moAddJob');
  notify('تم النشر ✅', `وظيفة "${title}" نُشرت بنجاح!`, 'success');
  await notifyAdmin(`وظيفة جديدة — ${title}`, `<b>الشركة:</b> ${co}`, `📢 وظيفة جديدة\n${title}\n${co}`);
  goTo('myjobs');
}
