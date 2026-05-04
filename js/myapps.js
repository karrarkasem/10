// ╔══════════════════════════════════════════════════════╗
// ║  عفراء للتوظيف — myapps.js                          ║
// ║  صفحة طلباتي                                        ║
// ╚══════════════════════════════════════════════════════╝

let APPS_FILTER = '';

function pgMyApps(el) {
  const total     = MY_APPS.length;
  const pending   = MY_APPS.filter(a => a.status === 'pending').length;
  const interview = MY_APPS.filter(a => a.status === 'interview').length;
  const hired     = MY_APPS.filter(a => a.status === 'hired').length;

  el.innerHTML = `
    <div class="sh"><div class="st"><div class="st-ico"><i class="fas fa-clipboard-list"></i></div>طلباتي</div>${total ? '<span class="b b-tl">' + total + ' طلب</span>' : ''}</div>
    ${total ? `
    <div class="app-summary fade-up">
      <div class="app-sum-item" onclick="filterMyApps('')" style="${APPS_FILTER===''?'border-color:var(--p)':''}">
        <div class="app-sum-ico" style="color:var(--p)"><i class="fas fa-paper-plane"></i></div>
        <div class="app-sum-val">${total}</div><div class="app-sum-lbl">إجمالي</div>
      </div>
      <div class="app-sum-item" onclick="filterMyApps('pending')" style="${APPS_FILTER==='pending'?'border-color:var(--acc)':''}">
        <div class="app-sum-ico" style="color:var(--acc)"><i class="fas fa-hourglass-half"></i></div>
        <div class="app-sum-val">${pending}</div><div class="app-sum-lbl">انتظار</div>
      </div>
      <div class="app-sum-item" onclick="filterMyApps('interview')" style="${APPS_FILTER==='interview'?'border-color:var(--purple)':''}">
        <div class="app-sum-ico" style="color:var(--purple)"><i class="fas fa-comments"></i></div>
        <div class="app-sum-val">${interview}</div><div class="app-sum-lbl">مقابلة</div>
      </div>
      <div class="app-sum-item" onclick="filterMyApps('hired')" style="${APPS_FILTER==='hired'?'border-color:var(--success)':''}">
        <div class="app-sum-ico" style="color:var(--success)"><i class="fas fa-check-circle"></i></div>
        <div class="app-sum-val">${hired}</div><div class="app-sum-lbl">قُبلت</div>
      </div>
    </div>
    <div class="tabs fade-up del1" style="margin-bottom:16px">
      <button class="tb2 ${APPS_FILTER===''?'on':''}" onclick="filterMyApps('')"><i class="fas fa-th"></i>الكل</button>
      <button class="tb2 ${APPS_FILTER==='pending'?'on':''}" onclick="filterMyApps('pending')"><i class="fas fa-hourglass-half"></i>انتظار</button>
      <button class="tb2 ${APPS_FILTER==='interview'?'on':''}" onclick="filterMyApps('interview')"><i class="fas fa-comments"></i>مقابلة</button>
      <button class="tb2 ${APPS_FILTER==='hired'?'on':''}" onclick="filterMyApps('hired')"><i class="fas fa-check"></i>قُبلت</button>
      <button class="tb2 ${APPS_FILTER==='rejected'?'on':''}" onclick="filterMyApps('rejected')"><i class="fas fa-times"></i>مرفوض</button>
    </div>
    <div id="appsContainer">${renderAppCards(MY_APPS)}</div>`
    : emptyState('📋', 'لم تتقدم لأي وظيفة بعد', 'ابحث في الوظائف وتقدّم الآن!',
        '<button class="btn bp" style="margin-top:4px" onclick="goTo(\'jobs\')"><i class="fas fa-search"></i>تصفح الوظائف</button>')}`;
}

function renderAppCards(apps) {
  const filtered = APPS_FILTER ? apps.filter(a => a.status === APPS_FILTER) : apps;
  if (!filtered.length) return '<div style="text-align:center;padding:40px;color:var(--tx3)"><i class="fas fa-filter" style="font-size:28px;opacity:.3;display:block;margin-bottom:12px"></i>لا توجد طلبات بهذه الحالة</div>';

  return filtered.map(a => {
    const s = STAT[a.status] || STAT.pending;
    const steps = [
      { l:'تم الإرسال',     done:true,                                                    active:false },
      { l:'قيد المراجعة',   done:['reviewed','interview','hired','rejected'].includes(a.status), active:a.status==='pending' },
      { l:'مدعو للمقابلة', done:['interview','hired'].includes(a.status),                active:a.status==='interview' },
      { l:'القرار',          done:['hired','rejected'].includes(a.status),                 active:false },
    ];
    const isHired=a.status==='hired', isRej=a.status==='rejected';
    const logo = JOBS.find(j=>j.id===a.jobId)?.logo||'🏢';

    return '<div class="app-card fade-up" style="' + (isHired?'border-color:rgba(34,197,94,.3)':isRej?'border-color:rgba(239,68,68,.2)':'') + '">' +
      '<div class="app-card-header">' +
        '<div class="app-card-logo">' + logo + '</div>' +
        '<div style="flex:1;min-width:0"><div style="font-size:14px;font-weight:800;color:var(--tx);margin-bottom:2px">' + a.jobTitle + '</div><div style="font-size:11px;color:var(--tx2)">' + a.company + '</div></div>' +
        '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px"><span class="b ' + s.c + '"><i class="fas ' + s.ico + '"></i>' + s.l + '</span><span style="font-size:10px;color:var(--tx3)">' + (a.appliedAt||'').slice(0,10) + '</span></div>' +
      '</div>' +
      '<div class="app-card-body">' +
        '<div style="display:flex;margin-bottom:14px">' +
          steps.map((t,i) =>
            '<div style="flex:1;text-align:center;position:relative">' +
            (i<steps.length-1 ? '<div style="position:absolute;top:9px;right:50%;left:-50%;height:2px;background:' + ((steps[i+1].done||steps[i+1].active)?'var(--p)':'var(--br)') + ';z-index:0"></div>' : '') +
            '<div style="width:20px;height:20px;border-radius:50%;margin:0 auto 5px;position:relative;z-index:1;display:flex;align-items:center;justify-content:center;font-size:9px;background:' + (t.done?'var(--success)':t.active?'var(--p)':'var(--br)') + ';color:' + ((t.done||t.active)?'#fff':'var(--tx3)') + ';box-shadow:' + (t.active?'0 0 0 4px rgba(13,148,136,.15)':'none') + '"><i class="fas ' + (t.done?'fa-check':'fa-circle') + '" style="font-size:' + (t.done?8:5) + 'px"></i></div>' +
            '<div style="font-size:9px;color:' + ((t.done||t.active)?'var(--tx)':'var(--tx3)') + ';font-weight:' + ((t.done||t.active)?700:500) + '">' + t.l + '</div></div>'
          ).join('') +
        '</div>' +
        (isHired ? '<div class="al al-s" style="margin-bottom:0"><i class="fas fa-trophy"></i><span>تهانينا! تم قبولك في هذه الوظيفة 🎉</span></div>' :
         isRej   ? '<div class="al al-d" style="margin-bottom:0"><i class="fas fa-info-circle"></i><span>لا تيأس! استمر في البحث. لديك ' + JOBS.length + ' وظيفة أخرى.</span></div>' :
         a.status==='interview' ? '<div class="al al-w" style="margin-bottom:0"><i class="fas fa-comments"></i><span>مبروك! أنت مدعو للمقابلة. تدرّب مع <strong>المقابلة الذكية</strong>.</span></div>' :
         '<div style="font-size:11px;color:var(--tx3);display:flex;align-items:center;gap:5px"><i class="fas fa-clock"></i>طلبك قيد المراجعة.</div>') +
      '</div></div>';
  }).join('');
}

function filterMyApps(status) {
  APPS_FILTER = status;
  document.querySelectorAll('.tabs .tb2').forEach((b,i) => {
    b.classList.toggle('on', ['','pending','interview','hired','rejected'][i] === status);
  });
  document.querySelectorAll('.app-sum-item').forEach((el,i) => {
    const isA = ['','pending','interview','hired'][i] === status;
    const c   = ['var(--p)','var(--acc)','var(--purple)','var(--success)'][i];
    el.style.borderColor = isA ? c : '';
    el.style.background  = isA ? c + '08' : '';
  });
  const cont = document.getElementById('appsContainer');
  if (cont) cont.innerHTML = renderAppCards(MY_APPS);
}
