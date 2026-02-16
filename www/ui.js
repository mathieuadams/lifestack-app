// =====================================================
// LIFESTACK UI.JS — View logic, planning flow, calendar
// Connects to app.js for API calls
// =====================================================

// ===== GLOBALS =====
const catIcons={travel:'✈️',food:'🍽️',adventure:'🏔️',roadtrip:'🚗',culture:'🎭',date:'💕',health:'💪',birthday:'🎂',hiking:'🥾',skiing:'⛷️',running:'🏃',surfing:'🏄',swimming:'🏊',camping:'⛺',cycling:'🚴',climbing:'🧗',concert:'🎸',beach:'🏖️',marathon:'🏅',festival:'🎪',theater:'🎭',museum:'🏛️',dining:'🍽️',cooking:'👨‍🍳',wine:'🍷',spa:'💆',yoga:'🧘',meditation:'🙏',photography:'📸',art:'🎨',dance:'💃',sports:'⚽',golf:'⛳',fishing:'🎣',sailing:'⛵',diving:'🤿',skydiving:'🪂',other:'📌',misogi:'🏔️'};
const catColors={travel:'var(--cat-travel)',food:'var(--cat-food)',adventure:'var(--cat-adventure)',roadtrip:'var(--cat-roadtrip)',culture:'var(--cat-culture)',date:'var(--cat-date)',health:'var(--cat-health)',birthday:'var(--cat-birthday)',hiking:'var(--sage-500)',skiing:'var(--blue)',running:'var(--teal)',surfing:'var(--blue)',swimming:'var(--blue)',camping:'var(--sage-500)',cycling:'var(--teal)',climbing:'var(--sage-600)',concert:'var(--lavender)',beach:'var(--blue-light)',marathon:'var(--teal)',festival:'var(--pink)',theater:'var(--lavender)',museum:'var(--sand-300)',dining:'var(--amber)',cooking:'var(--amber)',wine:'var(--pink)',spa:'var(--sage-300)',yoga:'var(--sage-300)',meditation:'var(--lavender-light)',photography:'var(--sand-300)',art:'var(--pink-light)',dance:'var(--coral)',sports:'var(--teal)',golf:'var(--sage-500)',fishing:'var(--blue)',sailing:'var(--blue)',diving:'var(--blue)',skydiving:'var(--teal)',other:'var(--sand-300)'};
const catBgs={travel:'var(--cat-travel-bg)',food:'var(--cat-food-bg)',adventure:'var(--cat-adventure-bg)',roadtrip:'var(--cat-roadtrip-bg)',culture:'var(--cat-culture-bg)',date:'var(--cat-date-bg)',health:'var(--cat-health-bg)',birthday:'var(--cat-birthday-bg)',hiking:'var(--sage-100)',skiing:'var(--blue-light)',running:'var(--teal-light)',surfing:'var(--blue-light)',swimming:'var(--blue-light)',camping:'var(--sage-100)',cycling:'var(--teal-light)',climbing:'var(--sage-100)',concert:'var(--lavender-light)',beach:'var(--blue-light)',marathon:'var(--teal-light)',festival:'var(--pink-light)',theater:'var(--lavender-light)',museum:'var(--sand-100)',dining:'var(--amber-light)',cooking:'var(--amber-light)',wine:'var(--pink-light)',spa:'var(--sage-50)',yoga:'var(--sage-50)',meditation:'var(--lavender-light)',photography:'var(--sand-100)',art:'var(--pink-light)',dance:'var(--coral-bg)',sports:'var(--teal-light)',golf:'var(--sage-100)',fishing:'var(--blue-light)',sailing:'var(--blue-light)',diving:'var(--blue-light)',skydiving:'var(--teal-light)',other:'var(--sand-100)'};

// ===== UI CORE =====
function swView(v){
  document.querySelectorAll('.v').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(x=>x.classList.remove('active'));
  const map={plan:'planView',habits:'habitsView',memories:'memoriesView'};
  const idx={plan:0,habits:1,memories:2};
  document.getElementById(map[v]).classList.add('active');
  document.querySelectorAll('.ni')[idx[v]].classList.add('active');
  document.querySelector('.mc').scrollTop=0;
  closeFab();
  if(v==='memories') renderMemoriesView();
  if(v==='habits') renderHabitsView();
  if(v==='plan') refreshPlanView();
}
function swTab(t,b){
  document.querySelectorAll('.ptb').forEach(x=>x.classList.remove('active'));
  document.querySelectorAll('.ps').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  document.getElementById('st-'+t).classList.add('active');
  if(t==='week') buildWeekView();
  if(t==='month') buildMG();
  if(t==='year') buildYV();
  if(t==='bucket'){buildBucketView();if(typeof fetchBucketList==='function')fetchBucketList().then(()=>{buildBucketView();refreshPlanView()}).catch(()=>{})}
}
function openPanel(n){const o=document.getElementById(n+'Overlay'),p=document.getElementById(n+'Panel');if(o)o.classList.add('open');if(p)p.classList.add('open');if(n==='notif'&&typeof renderNotificationList==='function')renderNotificationList()}
function closePanel(n){const o=document.getElementById(n+'Overlay'),p=document.getElementById(n+'Panel');if(o)o.classList.remove('open');if(p)p.classList.remove('open')}
function toggleFab(){const m=document.getElementById('fabMenu'),b=document.getElementById('fabBtn');m.classList.toggle('open');b.textContent=m.classList.contains('open')?'×':'+'}
function closeFab(){document.getElementById('fabMenu').classList.remove('open');document.getElementById('fabBtn').textContent='+'}
function toggleProfile(){document.getElementById('profileOverlay').classList.toggle('open');document.getElementById('profilePanel').classList.toggle('open')}
function toast(m){const t=document.getElementById('toastEl');if(!t)return;t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function tgChk(b){b.classList.toggle('done');if(b.classList.contains('done'))toast('✓ Done!')}
function selTC(c){c.parentElement.querySelectorAll('.tc').forEach(x=>x.classList.remove('sel'));c.classList.add('sel')}
function captureMemory(){if(typeof showMemoryModal==='function')showMemoryModal();else toast('📸 Memory captured!')}

// ===== WEEK VIEW =====
let weekOffset=0;
function getWeekRange(offset){
  const now=new Date();
  const day=now.getDay();
  const mon=new Date(now);mon.setDate(now.getDate()-((day+6)%7)+(offset*7));
  const sun=new Date(mon);sun.setDate(mon.getDate()+6);
  return {start:mon,end:sun};
}
function formatWeekTitle(range){
  const now=new Date();const todayMon=new Date(now);todayMon.setDate(now.getDate()-((now.getDay()+6)%7));
  if(range.start.toDateString()===todayMon.toDateString())return 'This Week';
  const opts={month:'short',day:'numeric'};
  return range.start.toLocaleDateString('en-US',opts)+' — '+range.end.toLocaleDateString('en-US',opts);
}
function navWeek(dir){weekOffset+=dir;buildWeekView()}
function buildWeekView(){
  const range=getWeekRange(weekOffset);
  const wt=document.getElementById('weekTitle');if(wt)wt.textContent=formatWeekTitle(range);
  // Build day bar
  const wd=document.getElementById('weekDays');
  if(wd){
    const dayNames=['M','T','W','T','F','S','S'];
    const today=new Date();today.setHours(0,0,0,0);
    let html='';
    for(let i=0;i<7;i++){
      const d=new Date(range.start);d.setDate(range.start.getDate()+i);
      const isToday=d.toDateString()===today.toDateString();
      const isPast=d<today;
      const dateStr=d.toISOString().split('T')[0]; // YYYY-MM-DD format
      html+=`<div class="wdi${isToday?' today':''}${isPast?' past':''}" onclick="createAdventureOnDate('${dateStr}')" style="cursor:pointer">
        <span class="wdl">${dayNames[i]}</span>
        <span class="wdn${isToday?' today':''}">${d.getDate()}</span>
      </div>`;
    }
    wd.innerHTML=html;
  }
  // Build plan cards for this week
  const pc=document.getElementById('planCards');if(!pc)return;
  const safePlans=typeof plans!=='undefined'&&Array.isArray(plans)?plans:[];
  const yr=typeof currentViewYear!=='undefined'?currentViewYear:2026;
  const weekPlans=safePlans.filter(p=>{
    if(p.type==='habit'||p.type==='theme')return false;
    const pYear=parseInt(p.year);if(pYear&&pYear!==yr)return false;
    if(p.startDate){
      const sd=parseWeekDate(p.startDate);if(!sd)return false;
      const ed=p.endDate?parseWeekDate(p.endDate):sd;
      return sd<=range.end&&(ed||sd)>=range.start;
    }
    if(p.targetMonth){const tm=parseInt(p.targetMonth)-1;return range.start.getMonth()===tm||range.end.getMonth()===tm}
    return false;
  });
  if(weekPlans.length===0){
    pc.innerHTML='<p style="color:var(--text-tertiary);text-align:center;padding:12px 0;font-size:.85rem">No activities planned this week</p>';
    return;
  }
  pc.innerHTML=weekPlans.map(p=>{
    const icon=catIcons[(p.category||p.type||'').toLowerCase()]||'📋';
    const cat=p.category||p.type||'';
    const color=catColors[cat]||'var(--sage-500)';
    const sd=p.startDate?parseWeekDate(p.startDate):null;
    const dateStr=sd?sd.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}):'';
    const isDone=p.status==='completed';
    return `<div class="pc t-${cat}" onclick="openPlanDetail('${p.id}')">
      <div class="pcd"><div class="pc-color" style="background:${color}"></div></div>
      <div class="pcb">
        <div class="pct">${icon} ${escapeHtmlUI(p.title)}</div>
        <div class="pcm"><span>${dateStr}</span><span class="tag tag-${cat}">${cat}</span>${p.type==='misogi'?'<span class="tag tag-misogi">Misogi</span>':''}</div>
      </div>
      <button style="background:none;border:none;font-size:.9rem;padding:4px 8px;cursor:pointer" onclick="event.stopPropagation();if(typeof getAIPrepTips==='function')getAIPrepTips('${p.id}')" title="AI Prep Tips">✨</button>
      <button class="pcchk${isDone?' done':''}" onclick="event.stopPropagation();if(typeof togglePlanStatus==='function')togglePlanStatus('${p.id}');else togglePlanDone('${p.id}',this)">✓</button>
    </div>`;
  }).join('');
}
function parseWeekDate(s){if(!s)return null;const p=s.split('T')[0].split('-');if(p.length!==3)return null;return new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]))}
function escapeHtmlUI(s){if(!s)return '';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function openPlanDetail(planId){
  // Try app.js showEditPlanModal first, then fall back to trip panel
  if(typeof showEditPlanModal==='function'){showEditPlanModal(planId);return}
  const p=(typeof plans!=='undefined'?plans:[]).find(x=>x.id===planId);if(!p)return;
  document.getElementById('tripTitle').textContent=p.title||'Activity Detail';
  if(p.startDate)document.getElementById('tripStartDate').value=p.startDate;
  if(p.endDate)document.getElementById('tripEndDate').value=p.endDate;

  // Display sub-activities
  const subList=document.getElementById('subActivitiesList');
  if(subList){
    if(p.subActivities&&p.subActivities.length>0){
      subList.innerHTML=p.subActivities.map(s=>
        `<div style="padding:8px;background:var(--sage-50);border-radius:8px;margin-bottom:6px">
          <div style="font-weight:600;color:var(--text-primary)">${s.emoji||'•'} ${escapeHtmlUI(s.name)}</div>
          ${s.description?`<div style="font-size:.8rem;color:var(--text-tertiary);margin-top:2px">${escapeHtmlUI(s.description)}</div>`:''}
        </div>`
      ).join('');
    }else{
      subList.innerHTML='<div style="color:var(--text-tertiary);font-size:.9rem">No sub-activities</div>';
    }
  }

  openPanel('trip');
}
function togglePlanDone(planId,btn){
  btn.classList.toggle('done');
  if(btn.classList.contains('done')){toast('✓ Completed!');if(typeof quickCompletePlan==='function')quickCompletePlan(planId)}
  else{toast('Marked incomplete')}
}

// ===== MONTH CALENDAR =====
const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DIM=[31,28,31,30,31,30,31,31,30,31,30,31];
let curM=new Date().getMonth();
function getPlansForMonth(month0){
  const month1=month0+1;
  const yr=typeof currentViewYear!=='undefined'?currentViewYear:new Date().getFullYear();
  const safePlans=typeof plans!=='undefined'&&Array.isArray(plans)?plans:[];
  return safePlans.filter(p=>{
    // Exclude habits and themes
    if(p.type==='habit'||p.type==='theme')return false;

    // Year filter: include plans for current year OR plans without a year set
    const pYear=parseInt(p.year);
    if(!isNaN(pYear)&&pYear>0&&pYear!==yr)return false;

    // Include all other plans (adventures with any category: skiing, hiking, etc.)
    return true;
  });
}
let calS=null,calE=null;
function buildMG(){
  const g=document.getElementById('mGrid');if(!g)return;
  const yr=typeof currentViewYear!=='undefined'?currentViewYear:2026;
  const title=document.getElementById('cmTitle');if(title)title.textContent=MN[curM]+' '+yr;
  const fd=(new Date(yr,curM,1).getDay()+6)%7;
  const dim=curM===1&&yr%4===0?29:DIM[curM];
  const mp=getPlansForMonth(curM);
  // Map day -> plans
  const pbd={};mp.forEach(p=>{if(p.startDate){const sd=parseWeekDate(p.startDate);const ed=p.endDate?parseWeekDate(p.endDate):sd;if(!sd)return;const startMonth=sd.getMonth();const endMonth=ed.getMonth();if(startMonth<=curM&&endMonth>=curM){const s1=startMonth===curM?sd.getDate():1;const e1=endMonth===curM?ed.getDate():dim;for(let d=s1;d<=e1;d++){if(!pbd[d])pbd[d]=[];pbd[d].push(p)}}}});
  let html='<div class="mgh">M</div><div class="mgh">T</div><div class="mgh">W</div><div class="mgh">T</div><div class="mgh">F</div><div class="mgh">S</div><div class="mgh">S</div>';
  for(let b=0;b<fd;b++)html+='<div class="mgc blank"></div>';
  const today=new Date();
  for(let d=1;d<=dim;d++){
    const isToday=d===today.getDate()&&curM===today.getMonth()&&yr===today.getFullYear();
    const dayPlans=pbd[d]||[];
    const dots=dayPlans.slice(0,2).map(p=>{const cat=(p.category||p.type||'adventure').toLowerCase();return `<div class="mgev" style="background:var(--cat-${cat},var(--sage-400));font-size:.55rem;color:white;padding:1px 3px;border-radius:2px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${escapeHtmlUI(p.title).substring(0,8)}</div>`}).join('');
    html+=`<div class="mgc${isToday?' today':''}" data-day="${d}">${d}${dots}</div>`;
  }
  g.innerHTML=html;calS=null;calE=null;
  initCalendarDrag();
  // Activity list - filter to only show activities in current month
  const actList=document.getElementById('actList');const actTitle=document.getElementById('actListTitle');
  if(actList&&actTitle){
    actTitle.textContent='Activities in '+MN[curM];
    const monthPlans=mp.filter(p=>{if(!p.startDate)return false;const sd=parseWeekDate(p.startDate);const ed=p.endDate?parseWeekDate(p.endDate):sd;if(!sd)return false;const startMonth=sd.getMonth();const endMonth=ed.getMonth();return startMonth<=curM&&endMonth>=curM});
    if(monthPlans.length===0){actList.innerHTML='<p style="color:var(--text-tertiary);font-size:.85rem;padding:8px 0">No activities this month</p>';return}
    actList.innerHTML=monthPlans.map(p=>{const cat=(p.category||p.type||'adventure').toLowerCase();const icon=catIcons[cat]||'📋';const bg=catBgs[cat]||'var(--sage-100)';const sd=p.startDate?parseWeekDate(p.startDate):null;const ds=sd?MN[curM]+' '+sd.getDate():'';const isDone=p.status==='completed';return `<div class="act-item" onclick="openPlanDetail('${p.id}')"><div class="act-icon" style="background:${bg}">${icon}</div><div class="act-body"><div class="act-name">${escapeHtmlUI(p.title)}</div><div class="act-meta">${ds} <span class="tag tag-${cat}">${escapeHtmlUI(cat)}</span></div></div><button style="background:none;border:none;font-size:.9rem;padding:4px;cursor:pointer" onclick="event.stopPropagation();getAIPrepTips('${p.id}')" title="AI Prep Tips">✨</button><button class="pcchk${isDone?' done':''}" onclick="event.stopPropagation();if(typeof togglePlanStatus==='function')togglePlanStatus('${p.id}')" style="margin-right:8px">✓</button></div>`}).join('');
  }
}
function hlRange(){document.querySelectorAll('#mGrid .mgc').forEach(c=>{c.classList.remove('rs','rstart','rend');const d=parseInt(c.dataset.day);if(!d)return;if(calS&&!calE&&d===calS){c.classList.add('rstart','rend')}else if(calS&&calE){if(d===calS)c.classList.add('rstart');else if(d===calE)c.classList.add('rend');else if(d>calS&&d<calE)c.classList.add('rs')}})}
function openQuickAdd(d){const yr=typeof currentViewYear!=='undefined'?currentViewYear:2026;const dateStr=`${yr}-${String(curM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;startPlanFlow(1);setTimeout(()=>{const startEl=document.getElementById('pfDateStart');const endEl=document.getElementById('pfDateEnd');if(startEl)startEl.value=dateStr;if(endEl)endEl.value=dateStr},50)}
function navMonth(dir){curM=(curM+dir+12)%12;buildMG()}

// ===== YEARLY VIEW =====
function buildYV(){
  const g=document.getElementById('yearGrid');if(!g)return;g.innerHTML='';
  const yr=typeof currentViewYear!=='undefined'?currentViewYear:new Date().getFullYear();
  const cm=new Date().getMonth();
  const cy=new Date().getFullYear();
  MN.forEach((m,i)=>{
    const card=document.createElement('div');card.className='ym'+((i===cm&&yr===cy)?' cur':'');
    const evts=getPlansForMonth(i);const evMap={};
    let monthEventCount=0;
    evts.forEach(p=>{
      const cat=(p.category||p.type||'adventure').toLowerCase();
      if(p.startDate){
        const sd2=parseWeekDate(p.startDate);const ed2=p.endDate?parseWeekDate(p.endDate):sd2;
        if(sd2&&ed2){
          // Check if plan overlaps with month i (plans already filtered by year)
          const startMonth=sd2.getMonth();
          const endMonth=ed2.getMonth();

          // Only render if plan's month range includes month i
          if(startMonth<=i&&endMonth>=i){
            monthEventCount++;
            const startDay=startMonth===i?sd2.getDate():1;
            const endDay=endMonth===i?ed2.getDate():(i===1&&yr%4===0?29:DIM[i]);
            for(let dd=startDay;dd<=endDay;dd++)evMap[dd]=cat;
          }
        }
      } else if(p.targetMonth){
        const tm=parseInt(p.targetMonth);
        if(tm===i+1){  // targetMonth is 1-based, i is 0-based
          monthEventCount++;
          if(!evMap[15])evMap[15]=cat;else if(!evMap[16])evMap[16]=cat;
        }
      }
      // Note: Plans without startDate or targetMonth are not displayed in yearly view
    });
    let cells='';const sd=(new Date(yr,i,1).getDay()+6)%7;
    for(let b=0;b<sd;b++)cells+='<div class="ymc blank"></div>';
    for(let d=1;d<=DIM[i];d++){const c=evMap[d];cells+=`<div class="ymc ${c?'e-'+c:'day'}"></div>`}
    card.innerHTML=`<div class="ymn">${m.slice(0,3)}</div><div class="ymg">${cells}</div><div class="ymc-count">${monthEventCount} event${monthEventCount!==1?'s':''}</div>`;
    card.onclick=()=>{curM=i;buildMG();swTab('month',document.querySelectorAll('.ptb')[1])};
    g.appendChild(card);
  });
}
// ===== BUCKET LIST VIEW =====
function buildBucketView(){
  const c=document.getElementById('bucketListContainer');if(!c)return;
  const items=typeof bucketList!=='undefined'&&Array.isArray(bucketList)?bucketList:[];
  if(items.length===0){c.innerHTML='<p style="color:var(--text-tertiary);text-align:center;padding:20px 0">No bucket list items yet. Tap "+ Add" to start!</p>';return}
  const bucketCatIcons={travel:'✈️',adventure:'🏔️',skills:'🎯',experiences:'🎭',personal:'💫',health:'💪',creative:'🎨',other:'📌'};
  // Split active vs completed (filter out temporary items)
  const active=items.filter(i=>i.status!=='done'&&i.status!=='completed'&&!i.temporary);
  const completed=items.filter(i=>(i.status==='done'||i.status==='completed')&&!i.temporary);
  const confirmedItems=items.filter(i=>!i.temporary);
  let html='';
  html+=`<div class="bucket-summary">${confirmedItems.length} Dream${confirmedItems.length!==1?'s':''} · ${confirmedItems.filter(i=>i.status==='planned').length} Planned · ${completed.length} Done</div>`;
  // Active items grouped by category
  const groups={};active.forEach(i=>{const cat=i.category||'other';if(!groups[cat])groups[cat]=[];groups[cat].push(i)});
  Object.keys(groups).forEach(cat=>{
    const icon=bucketCatIcons[cat]||'📌';
    html+=`<div class="bucket-cat-header">${icon} <strong>${cat.charAt(0).toUpperCase()+cat.slice(1)}</strong> <span class="bucket-cat-count">${groups[cat].length}</span></div>`;
    groups[cat].forEach(item=>{
      html+=`<div class="bucket-item">
        <div class="bucket-check" onclick="event.stopPropagation();toggleBucketDone('${item.id}')">○</div>
        <div class="bucket-info">
          <div class="bucket-title">${escapeHtmlUI(item.title)}</div>
          ${item.description?`<div class="bucket-desc">${escapeHtmlUI(item.description).substring(0,80)}</div>`:''}
          ${item.difficulty?`<div class="bucket-diff">${item.difficulty}</div>`:''}
        </div>
        <div class="bucket-actions">
          <button class="bucket-schedule" onclick="event.stopPropagation();scheduleBucket('${item.id}')">📅</button>
          <button class="bucket-delete" onclick="event.stopPropagation();deleteBucketItem('${item.id}')">🗑</button>
        </div>
      </div>`;
    });
  });
  // Completed section at bottom
  if(completed.length>0){
    html+=`<div class="bucket-done-hdr" onclick="var el=document.getElementById('bucketDoneList');el.style.display=el.style.display==='none'?'':'none'">
      <span>✅ Completed (${completed.length})</span><span>▾</span>
    </div>`;
    html+=`<div id="bucketDoneList">`;
    completed.forEach(item=>{
      html+=`<div class="bucket-item done">
        <div class="bucket-check checked" onclick="event.stopPropagation();toggleBucketDone('${item.id}')">✓</div>
        <div class="bucket-info"><div class="bucket-title done">${escapeHtmlUI(item.title)}</div></div>
        <div class="bucket-actions"><button class="bucket-delete" onclick="event.stopPropagation();deleteBucketItem('${item.id}')">🗑</button></div>
      </div>`;
    });
    html+=`</div>`;
  }
  c.innerHTML=html;
}
function openBucketItem(id){if(typeof showBucketListModal==='function')showBucketListModal()}
function toggleBucketDone(id){
  const items=typeof bucketList!=='undefined'?bucketList:[];
  const item=items.find(i=>i.id===id);if(!item)return;
  item.status=(item.status==='done'||item.status==='completed')?'dream':'done';
  buildBucketView();refreshPlanView();
  toast(item.status==='done'?'🎉 Dream achieved!':'Unmarked');
  if(typeof saveBucketList==='function')saveBucketList(bucketList);
  localStorage.setItem('lifestack_bucketlist',JSON.stringify(bucketList));
}
function deleteBucketItem(id){
  if(!confirm('Remove this bucket list item?'))return;
  if(typeof bucketList!=='undefined'){const idx=bucketList.findIndex(i=>i.id===id);if(idx>-1){bucketList.splice(idx,1);buildBucketView();refreshPlanView();toast('Removed');if(typeof saveBucketList==='function')saveBucketList(bucketList);localStorage.setItem('lifestack_bucketlist',JSON.stringify(bucketList))}}
}
function scheduleBucket(id){
  var items=typeof bucketList!=='undefined'?bucketList:[];
  var item=items.find(function(i){return i.id===id});
  if(!item)return;
  if(typeof startAdventureWizard==='function'){
    startAdventureWizard();
    setTimeout(function(){
      if(typeof advWizard!=='undefined'){
        advWizard.data.name=item.title;
        advWizard.data.notes=item.description||'';
        var catMap={travel:'travel',adventure:'adventure',skills:'culture',experiences:'culture',personal:'health',health:'health',creative:'culture'};
        advWizard.data.category=catMap[item.category]||'adventure';
        advWizard.data._bucketItemId=item.id;
      }
    },200);
  } else if(typeof showAddPlanModal==='function'){
    showAddPlanModal('adventure');
    setTimeout(function(){var t=document.getElementById('planTitle');if(t)t.value=item.title},200);
  }
}

// ===== PLANNING FLOW =====
let pfState={type:null,loc:null,locName:'Near Sacramento',selectedFriends:[],visitType:'first'};



function startPlanFlow(startStep){
  if(typeof startAdventureWizard==='function'){
    startAdventureWizard();
  } else {
    // Fallback to old flow
    openPanel('planFlow');
  }
}

function updateSteps(n){document.querySelectorAll('#pfSteps .step-dot').forEach((d,i)=>{d.className='step-dot';if(i+1<n)d.classList.add('done');if(i+1===n)d.classList.add('active')})}

function pfSelType(btn,type){
  document.querySelectorAll('#pfTypes .tc,#pfTypes .pf-cat').forEach(t=>t.classList.remove('sel'));
  btn.classList.add('sel');pfState.type=type;
    // Show the AI recommendations section
  const recsSection = document.getElementById('pfRecsSection');
  if (recsSection) recsSection.style.display = 'block';
  // Clear previous recommendations
  const recsContainer = document.getElementById('pfRecsContainer');
  if (recsContainer) recsContainer.innerHTML = '';
}
async function pfGetIdeas() {
  const btn = document.getElementById('pfGetIdeasBtn');
  if (btn) { btn.disabled = true; btn.textContent = '🤖 Loading...'; }
  const category = pfState.type || 'adventure';
  const recs = await getAIRecommendations(category);
  if (btn) { btn.disabled = false; btn.textContent = '🤖 Get Ideas'; }
  const container = document.getElementById('pfRecsContainer');
  if (recs && container) showAIRecommendations(recs, container);
}
async function pfGetIdeas() {
  const btn = document.getElementById('pfGetIdeasBtn');
  if (btn) { btn.disabled = true; btn.textContent = '🤖 Loading...'; }

  const category = pfState.type || 'adventure';
  const recs = await getAIRecommendations(category);

  if (btn) { btn.disabled = false; btn.textContent = '🤖 Get Ideas'; }

  const container = document.getElementById('pfRecsContainer');
  if (recs && container) {
    showAIRecommendations(recs, container);
  }
}
function pfSetQuickDate(which,btn){
  document.querySelectorAll('.pf-qd').forEach(t=>t.classList.remove('sel'));btn.classList.add('sel');
  const now=new Date();let d;
  if(which==='tomorrow'){d=new Date(now);d.setDate(d.getDate()+1)}
  else if(which==='saturday'){d=new Date(now);d.setDate(d.getDate()+((6-d.getDay()+7)%7)||7)}
  else if(which==='nextweek'){d=new Date(now);d.setDate(d.getDate()+((6-d.getDay()+7)%7)+7)}
  if(d){const ds=d.toISOString().split('T')[0];const startEl=document.getElementById('pfDateStart');const endEl=document.getElementById('pfDateEnd');if(startEl)startEl.value=ds;if(endEl)endEl.value=ds}
}

function pfNext(step){
  document.querySelectorAll('.pf-step').forEach(s=>s.style.display='none');
  document.getElementById('pf'+step).style.display='block';
  updateSteps(step);
  if(step===3)buildPfRecs();
}

function buildPfRecs(){
  const t=pfState.type||'adventure';
  const recs=aiDB[t]||aiDB['adventure'];
  const c=document.getElementById('pfAiRecs');if(!c)return;
  c.innerHTML=recs.map((r,i)=>`<div class="airc${i===0?' sel':''}" onclick="pfSelRec(this)"><div class="airi" style="background:${r.bg}">${r.e}</div><div class="aird"><div class="airn">${r.n}</div><div class="airt2">${r.d}</div><div class="airdist">${r.dist}</div></div></div>`).join('');
}

function pfSelRec(el){document.querySelectorAll('.airc').forEach(r=>r.classList.remove('sel'));el.classList.add('sel')}
function pfSelCustom(){document.querySelectorAll('.airc').forEach(r=>r.classList.remove('sel'));document.getElementById('pfCustomOption').classList.add('sel')}
function pfUpdateCustom(){}
function pfQuick(type){pfState.type=type;startPlanFlow(1);setTimeout(()=>{document.querySelectorAll('#pfTypes .pf-cat,#pfTypes .tc').forEach(t=>{if(t.textContent.toLowerCase().includes(type))t.classList.add('sel')})},50)}
function startRecurring(){openPanel('recur')}

function pfFinish(){
  // Handled by advSave() in adventure.js now
  if(typeof advSave==='function'){advSave();return}
  toast('Save not available');
}

function saveTripDetail(){closePanel('trip');toast('✓ Saved');setTimeout(()=>{buildWeekView();buildMG()},300)}

// Friend selector
let friendSelContext=null;
function openFriendSelector(ctx){if(typeof showPeopleSelector==='function'){showPeopleSelector(ctx)}else{friendSelContext=ctx;buildFriendSelectorList();openPanel('friendSel')}}
function buildFriendSelectorList(){
  const list=document.getElementById('friendSelectorList');if(!list)return;
  const ppl=typeof people!=='undefined'&&Array.isArray(people)?people:[];
  if(ppl.length===0){list.innerHTML='<p style="color:var(--text-tertiary);text-align:center;padding:12px">No people added yet</p>';return}
  list.innerHTML=ppl.map(p=>`<div class="fsl-item" onclick="this.classList.toggle('sel')"><span class="fsl-avatar">${p.avatar||'🧑'}</span><span class="fsl-name">${escapeHtmlUI(p.name)}</span><span class="fsl-check">✓</span></div>`).join('');
}
function confirmFriendSelection(){
  const sel=document.querySelectorAll('.fsl-item.sel');
  const names=Array.from(sel).map(s=>s.querySelector('.fsl-name').textContent);
  const target=friendSelContext==='plan'?'pfFriends':friendSelContext==='trip'?'tripFriends':'recurFriends';
  const c=document.getElementById(target);
  if(c&&names.length>0){c.innerHTML=names.map(n=>`<span class="friend-chip">${n} <span onclick="this.parentElement.remove()">✕</span></span>`).join('')+`<button class="afb" onclick="openFriendSelector('${friendSelContext}')">+</button>`}
  closePanel('friendSel');
}

// Reminder helper
function addRem(){
  const i=document.getElementById('nri'),t=i.value.trim();if(!t)return;
  const tm=document.querySelector('#trTiming .tc.sel')?.textContent||'1 week';
  const l=document.getElementById('remList');
  const it=document.createElement('div');it.className='ri';
  it.innerHTML=`<button class="rchk" onclick="this.classList.toggle('done')">✓</button><div class="rbd"><div class="rtx">${escapeHtmlUI(t)}</div><div class="rwh">🔔 ${tm} prior</div></div><button class="rdl" onclick="this.closest('.ri').remove()">🗑</button>`;
  l.appendChild(it);i.value='';toast('Reminder added!');
}

// ===== HABITS VIEW =====
function renderHabitsView(){
  const hc=document.getElementById('habitsContainer');
  const mc=document.getElementById('misogiContainer');
  if(!hc||!mc)return;
  if(typeof plans==='undefined'||!Array.isArray(plans)){
    hc.innerHTML='<p style="color:var(--text-tertiary)">Loading habits...</p>';
    mc.innerHTML='';
    return;
  }
  const habits=plans.filter(p=>p.type==='habit');
  const misogis=plans.filter(p=>p.type==='misogi');
  const now=new Date();const todayStr=now.toISOString().split('T')[0];

  // ===== HABITS =====
  if(habits.length===0){
    hc.innerHTML=`<div class="hab-empty">
      <div style="font-size:2rem;margin-bottom:8px">💪</div>
      <p>No habits yet. Start building consistency!</p>
      <button class="btn-p" onclick="openAddHabitModal()">+ Add Habit</button>
    </div>`;
  } else {
    hc.innerHTML=habits.map(h=>{
      const checkIns=Array.isArray(h.checkIns)?h.checkIns:[];
      const checkedToday=checkIns.includes(todayStr);
      const streak=calcStreak(checkIns);

      // Build 8-week (56 day) GitHub grid
      const grid=buildHabitGrid(checkIns,56);

      return `<div class="hab-card">
        <div class="hab-top">
          <div class="hab-info">
            <div class="hab-title">${escapeHtmlUI(h.title)}</div>
            ${streak>0?`<div class="hab-streak">🔥 ${streak} day streak</div>`:'<div class="hab-streak" style="opacity:.4">No streak yet</div>'}
          </div>
          <div class="hab-btns">
            <button class="hab-btn" onclick="event.stopPropagation();if(typeof showEditPlanModal==='function')showEditPlanModal('${h.id}')" title="Edit">✏️</button>
          </div>
        </div>
        ${grid}
        <button class="hab-checkin-btn${checkedToday?' done':''}" onclick="event.stopPropagation();habitCheckinUI('${h.id}',this)">
          ${checkedToday?'✅ Checked in today':'✓ Check In'}
        </button>
      </div>`;
    }).join('')+`<div style="text-align:center;padding:12px 0"><button class="btn-s" onclick="openAddHabitModal()">+ Add Another Habit</button></div>`;
  }

  // ===== MISOGIS =====
  if(misogis.length===0){
    mc.innerHTML=`<div class="hab-empty">
      <div style="font-size:2rem;margin-bottom:8px">🏔️</div>
      <p>No misogi set. What's your big challenge this year?</p>
      <button class="btn-p" onclick="if(typeof showAddPlanModal==='function')showAddPlanModal('misogi')">+ Set Misogi</button>
    </div>`;
  } else {
    const MNS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    mc.innerHTML=misogis.map(m=>{
      const done=m.status==='completed';
      const dateStr=m.startDate?fmtMisogiDate(m.startDate):(m.targetMonth?MNS[(m.targetMonth||1)-1]+' '+(m.year||''):' No date set');
      let daysLabel='';
      if(m.startDate){const dl=Math.ceil((new Date(m.startDate)-now)/(86400000));daysLabel=dl>0?dl+' days away':dl===0?'Today!':'Passed'}
      return `<div class="miso-card${done?' completed':''}">
        <div class="miso-icon">${done?'🏆':'🏔️'}</div>
        <div class="miso-body">
          <div class="miso-title">${escapeHtmlUI(m.title)}</div>
          ${m.description?`<div class="miso-desc">${escapeHtmlUI(m.description)}</div>`:''}
          <div class="miso-meta">
            <span>📅 ${dateStr}</span>
            ${daysLabel?`<span class="miso-days">${daysLabel}</span>`:''}
          </div>
          <div class="miso-status">${done?'<span class="miso-badge done">✓ Completed</span>':'<span class="miso-badge prog">In Progress</span>'}</div>
        </div>
        <div class="miso-actions">
          <button class="hab-btn" onclick="event.stopPropagation();if(typeof showEditPlanModal==='function')showEditPlanModal('${m.id}')" title="Edit">✏️</button>
          <button class="hab-btn" onclick="event.stopPropagation();if(typeof getAIPrepTips==='function')getAIPrepTips('${m.id}')" title="AI Prep">✨</button>
          ${!done?`<button class="hab-btn" onclick="event.stopPropagation();completeMisogiUI('${m.id}')" title="Complete">✓</button>`:''}
        </div>
      </div>`;
    }).join('')+`<div style="text-align:center;padding:12px 0"><button class="btn-s" onclick="if(typeof showAddPlanModal==='function')showAddPlanModal('misogi')">+ Add Another Misogi</button></div>`;
  }
}

// Habit grid - 13 weeks, single flat CSS grid for perfect alignment
function buildHabitGrid(checkIns,totalDays){
  var today=new Date();today.setHours(0,0,0,0);
  var NW=13;
  var start=new Date(today);start.setDate(start.getDate()-(NW*7));
  var dow=start.getDay();start.setDate(start.getDate()+((dow===0)?-6:(1-dow)));
  var cSet=new Set(checkIns);var tStr=today.toISOString().split('T')[0];
  var weeks=[];var cur=new Date(start);
  while(cur<=today){var wk=[];for(var d=0;d<7;d++){var ds=cur.toISOString().split('T')[0];wk.push({d:ds,m:cur.getMonth(),c:cSet.has(ds),f:cur>today,t:ds===tStr});cur.setDate(cur.getDate()+1)}weeks.push(wk)}
  var MS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var NC=weeks.length;
  var cells='';
  // Row 0: month headers
  cells+='<span class="hgl"></span>';
  var lm=-1;for(var w=0;w<NC;w++){var m=weeks[w][0].m;cells+='<span class="hgm">'+(m!==lm?MS[m]:'')+'</span>';lm=m}
  // Rows 1-7: day data
  var dl=['M','T','W','T','F','S','S'];
  for(var r=0;r<7;r++){
    cells+='<span class="hgl">'+dl[r]+'</span>';
    for(var w=0;w<NC;w++){var dd=weeks[w][r];
      if(!dd||dd.f)cells+='<span class="hgd"></span>';
      else cells+='<span class="hgd '+(dd.c?'on':'off')+(dd.t?' today':'')+'" title="'+dd.d+'"></span>';
    }
  }
  return '<div class="hgrid" style="grid-template-columns:14px repeat('+NC+',1fr)">'+cells+'</div>';
}
function calcStreak(checkIns){
  if(!checkIns||checkIns.length===0)return 0;
  const sorted=[...checkIns].sort().reverse();
  const today=new Date().toISOString().split('T')[0];
  const yesterday=new Date(Date.now()-86400000).toISOString().split('T')[0];
  if(sorted[0]!==today&&sorted[0]!==yesterday)return 0;
  let streak=1;
  for(let i=0;i<sorted.length-1;i++){
    const cur=new Date(sorted[i]);const prev=new Date(sorted[i+1]);
    const diff=Math.round((cur-prev)/86400000);
    if(diff===1)streak++;else break;
  }
  return streak;
}

function fmtMisogiDate(dateStr){
  try{const d=new Date(dateStr+'T00:00:00');const MNS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];return MNS[d.getMonth()]+' '+d.getDate()+', '+d.getFullYear()}catch(e){return dateStr}
}

function habitCheckinUI(habitId,btn){
  // Prevent duplicate check-ins if button is already in done state
  if(btn.classList.contains('done')){
    toast('Already checked in today');
    return;
  }
  if(typeof quickCheckin==='function'){
    quickCheckin(habitId);
    btn.classList.add('done');
    btn.textContent='✅ Checked in today';
    setTimeout(()=>{renderHabitsView()},600);
  }else{toast('Check-in not available')}
}

function openAddHabitModal(){
  if(typeof showAddPlanModal==='function'){
    const q=Math.ceil((new Date().getMonth()+1)/3);
    showAddPlanModal('habit',q);
    setTimeout(()=>{
      const title=document.getElementById('planModalTitle');
      if(title)title.textContent='Add Habit';
    },50);
  }
}

function completeMisogiUI(misogiId){
  if(!confirm('Mark this misogi as completed? 🏆'))return;
  if(typeof updatePlan==='function'){
    updatePlan(misogiId,{status:'completed',completedAt:new Date().toISOString()}).then(()=>{
      const m=plans.find(p=>p.id===misogiId);if(m){m.status='completed';m.completedAt=new Date().toISOString()}
      renderHabitsView();
      toast('🏆 Misogi completed! Amazing!');
    }).catch(e=>{toast('Error: '+e.message)});
  }
}

function openHabitDetail(planId){
  if(typeof showEditPlanModal==='function'){showEditPlanModal(planId);return}
  toast('Habit detail');
}
function quickCheckinUI(habitId,btn){
  habitCheckinUI(habitId,btn);
}
function calculateUIHabitProgress(h){
  const checkIns=h.checkIns||[];
  if(checkIns.length===0)return 0;
  const now=new Date();
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1);
  const monthEnd=new Date(now.getFullYear(),now.getMonth()+1,0);
  const totalDays=monthEnd.getDate();
  const daysChecked=checkIns.filter(c=>{const d=new Date(c);return d>=monthStart&&d<=monthEnd}).length;
  return Math.min(1,daysChecked/totalDays);
}

// ===== MEMORIES VIEW =====
function renderMemoriesView(){
  buildMemTimeline();
  buildOnThisDay();
}

function switchMemView(view,btn){
  document.querySelectorAll('.mem-yearly-tab').forEach(t=>t.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.getElementById('memTimelineView').style.display=view==='timeline'?'block':'none';
  document.getElementById('memYearlyView').style.display=view==='yearly'?'block':'none';
  document.getElementById('memMapView').style.display=view==='map'?'block':'none';
  if(view==='timeline')buildMemTimeline();
  if(view==='yearly')buildMemYearGrid();
  if(view==='map')buildMemMap();
}

function buildMemTimeline(){
  const c=document.getElementById('memoriesTimeline');if(!c)return;
  const mems=typeof memories!=='undefined'&&Array.isArray(memories)?memories:[];
  if(mems.length===0){
    c.innerHTML='<div style="text-align:center;padding:30px 0"><p style="color:var(--text-tertiary);margin-bottom:12px">No memories yet.</p><button class="btn-p" onclick="captureMemory()">📸 Capture First Memory</button></div>';
    return;
  }
  const sorted=[...mems].sort((a,b)=>new Date(b.occurredAt)-new Date(a.occurredAt));
  let html='';let lastMonth='';
  sorted.forEach(m=>{
    const d=new Date(m.occurredAt);
    const monthKey=MN[d.getMonth()]+' '+d.getFullYear();
    if(monthKey!==lastMonth){html+=`<div class="mml">${monthKey}</div>`;lastMonth=monthKey}
    const photo=m.photos&&m.photos.length>0?m.photos[0].url:'';
    const bgStyle=photo?`background-image:url(${photo})`:'background:linear-gradient(135deg,var(--sage-200),var(--sage-400))';
    const photoCount=m.photos?m.photos.length:0;
    html+=`<div class="mmcd" onclick="openMemoryForEdit('${m.id}')" style="cursor:pointer">
      <div class="mimg" style="${bgStyle}">
        <span class="mdt">${MN[d.getMonth()].slice(0,3)} ${d.getDate()}</span>
        ${photoCount>1?`<span class="mphoto-count">📷 ${photoCount}</span>`:''}
      </div>
      <div class="mbdy">
        <div class="mbtl">${escapeHtmlUI(m.title||'Memory')}</div>
        <div class="mbdsc">${escapeHtmlUI((m.text||m.description||'').substring(0,80))}</div>
      </div>
    </div>`;
  });
  c.innerHTML=html;
}

function openMemoryForEdit(memoryId){
  const mems=typeof memories!=='undefined'?memories:[];
  const m=mems.find(x=>x.id===memoryId);
  if(m&&typeof showMemoryModal==='function'){showMemoryModal(m);return}
  toast('Memory detail');
}

function buildOnThisDay(){
  const c=document.getElementById('onThisDayContainer');if(!c)return;
  const mems=typeof memories!=='undefined'&&Array.isArray(memories)?memories:[];
  const today=new Date();
  const otd=mems.filter(m=>{const d=new Date(m.occurredAt);return d.getMonth()===today.getMonth()&&d.getDate()===today.getDate()&&d.getFullYear()!==today.getFullYear()});
  if(otd.length>0){
    const m=otd[0];const d=new Date(m.occurredAt);const yearsAgo=today.getFullYear()-d.getFullYear();
    c.innerHTML=`<div class="otd" onclick="openMemoryForEdit('${m.id}')" style="cursor:pointer"><div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;opacity:.8;margin-bottom:8px">On This Day</div><div style="font-family:'Fraunces',serif;font-size:1.1rem;font-weight:500;margin-bottom:4px">${escapeHtmlUI(m.title)}</div><div style="font-size:.8rem;opacity:.75">${yearsAgo} year${yearsAgo>1?'s':''} ago · ${MN[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}</div></div>`;
  }else{c.innerHTML=''}
}

function buildMemYearGrid(){
  const g=document.getElementById('memYearGrid');if(!g)return;
  const mems=typeof memories!=='undefined'&&Array.isArray(memories)?memories:[];
  const year=typeof currentViewYear!=='undefined'?currentViewYear:2026;
  g.innerHTML='';
  MN.forEach((name,i)=>{
    const monthMems=mems.filter(m=>{const d=new Date(m.occurredAt);return d.getMonth()===i&&d.getFullYear()===year});
    const photos=monthMems.flatMap(m=>m.photos||[]);
    const card=document.createElement('div');card.className='mem-month-card';
    card.innerHTML=`<div class="mem-month-name">${name.slice(0,3)}</div><div class="mem-month-count">${monthMems.length} memor${monthMems.length!==1?'ies':'y'}</div>${photos.length>0?`<div class="mem-month-photos">${photos.slice(0,3).map(p=>`<img src="${p.url}" alt="" class="mem-month-thumb">`).join('')}</div>`:''}`;
    card.onclick=()=>{curM=i;switchMemView('timeline',document.querySelector('.mem-yearly-tab'))};
    g.appendChild(card);
  });
}

let memMap=null;
function buildMemMap(){
  const container=document.getElementById('memMapContainer');if(!container)return;
  const mems=(typeof memories!=='undefined'&&Array.isArray(memories)?memories:[]).filter(m=>m.location&&m.location.lat&&m.location.lng);
  if(memMap){memMap.remove();memMap=null}
  container.style.height='300px';
  if(mems.length===0){container.innerHTML='<p style="color:var(--text-tertiary);text-align:center;padding:40px 0">No geotagged memories yet</p>';return}
  const bounds=[];const center=[mems[0].location.lat,mems[0].location.lng];const zoom=10;
  memMap=L.map(container).setView(center,zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(memMap);
  mems.forEach(m=>{
    bounds.push([m.location.lat,m.location.lng]);
    L.marker([m.location.lat,m.location.lng]).addTo(memMap).bindPopup(`<b>${escapeHtmlUI(m.title||'Memory')}</b><br>${escapeHtmlUI(m.location.name||'')}`);
  });
  if(bounds.length>1)memMap.fitBounds(bounds,{padding:[30,30]});
  const list=document.getElementById('memMapList');if(!list)return;
  list.innerHTML=mems.map(m=>`<div class="mem-map-item" onclick="openMemoryForEdit('${m.id}')" style="cursor:pointer"><span class="mem-map-pin">📍</span><div class="mem-map-info"><div class="mem-map-title">${escapeHtmlUI(m.title||'Memory')}</div><div class="mem-map-date">${escapeHtmlUI(m.location.name||'')}</div></div></div>`).join('');
}

// ===== ACCOUNT SETTINGS =====
function openAccountSettings(){
  toggleProfile();
  if(typeof currentUser!=='undefined'&&currentUser){
    const n=document.getElementById('acctName');if(n)n.value=currentUser.name||'';
    const e=document.getElementById('acctEmail');if(e)e.value=currentUser.email||'';
    const b=document.getElementById('acctBirthdate');if(b)b.value=currentUser.birthdate||'';
    const ht=document.getElementById('acctHometown');if(ht)ht.value=currentUser.hometown?.name||'';
    const av=document.getElementById('acctAvatarDisplay');
    if(av){
      if(currentUser.avatarUrl){av.innerHTML=`<img src="${currentUser.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`}
      else{av.textContent=currentUser.avatar||getInitials(currentUser.name)||'👤'}
    }
  }
  openPanel('account');
}
function getInitials(name){if(!name)return'';return name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
function saveAccountSettings(){
  const name=document.getElementById('acctName').value.trim();
  const birthdate=document.getElementById('acctBirthdate').value;
  const hometown=document.getElementById('acctHometown')?.value?.trim()||'';
  if(!name){toast('Name is required');return}
  if(typeof currentUser!=='undefined'){
    currentUser.name=name;
    if(birthdate)currentUser.birthdate=birthdate;
    if(hometown)currentUser.hometown={name:hometown};
    localStorage.setItem('lifestack_user',JSON.stringify(currentUser));
  }
  (async()=>{
    try{
      const tokens=typeof getValidTokens==='function'?await getValidTokens():null;
      if(tokens?.idToken){
        const body={name};
        if(birthdate)body.birthdate=birthdate;
        if(hometown)body.hometown={name:hometown};
        await fetch((typeof CONFIG!=='undefined'?CONFIG.API_URL:'')+'/users',{
          method:'PUT',
          headers:{'Content-Type':'application/json','Authorization':'Bearer '+tokens.idToken},
          body:JSON.stringify(body)
        });
      }
    }catch(e){console.error('Save settings error:',e)}
  })();
  const pn=document.getElementById('profileName');if(pn)pn.textContent=name;
  toast('✓ Settings saved');
  closePanel('account');
}
function openAvatarPicker(){
  // Simple: use file input to pick photo
  const inp=document.createElement('input');inp.type='file';inp.accept='image/*';
  inp.onchange=async(e)=>{
    const file=e.target.files[0];if(!file)return;
    if(typeof uploadAvatar==='function'){
      try{await uploadAvatar(file);toast('✓ Avatar updated')}catch(err){toast('Upload failed')}
    }else{
      // Preview locally
      const reader=new FileReader();
      reader.onload=(ev)=>{
        const av=document.getElementById('acctAvatarDisplay');
        if(av)av.innerHTML=`<img src="${ev.target.result}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">`;
      };
      reader.readAsDataURL(file);
      toast('Avatar preview set');
    }
  };
  inp.click();
}

// ===== THEME EDITING =====
function editYearTheme(){
  const current=document.getElementById('yearBannerTheme').textContent.replace(/"/g,'');
  const newTheme=prompt('Enter your year theme:',current);
  if(newTheme!==null&&newTheme.trim()){
    document.getElementById('yearBannerTheme').textContent='"'+newTheme.trim()+'"';
    const ytEl=document.getElementById('yearTheme');if(ytEl){ytEl.value=newTheme.trim();if(typeof saveYearTheme==='function')saveYearTheme()}
  }
}

// ===== CALENDAR DRAG SELECTION =====
let calDragStart=null;
let calLongPressTimer=null;
let calLongPressActivated=false;
function initCalendarDrag(){
  const grid=document.getElementById('mGrid');if(!grid)return;
  grid.addEventListener('pointerdown',function(e){
    const cell=e.target.closest('.mgc:not(.blank)');if(!cell)return;
    const day=parseInt(cell.dataset.day);if(!day)return;

    // Start long-press timer (800ms)
    calLongPressActivated=false;
    calLongPressTimer=setTimeout(()=>{
      calLongPressActivated=true;
      calDragStart=day;
      calS=calDragStart;calE=null;hlRange();
    },800);

    e.preventDefault();
  });
  grid.addEventListener('pointermove',function(e){
    if(!calLongPressActivated||!calDragStart)return;
    const cell=document.elementFromPoint(e.clientX,e.clientY);
    if(!cell||!cell.classList.contains('mgc')||cell.classList.contains('blank'))return;
    const day=parseInt(cell.dataset.day);if(!day)return;
    if(day>=calDragStart){calS=calDragStart;calE=day}else{calS=day;calE=calDragStart}
    hlRange();
  });
  grid.addEventListener('pointerup',function(e){
    // Clear long-press timer
    if(calLongPressTimer){clearTimeout(calLongPressTimer);calLongPressTimer=null}

    if(!calLongPressActivated||!calDragStart){calLongPressActivated=false;return}
    const yr=typeof currentViewYear!=='undefined'?currentViewYear:2026;
    const startStr=`${yr}-${String(curM+1).padStart(2,'0')}-${String(calS).padStart(2,'0')}`;
    const endStr=calE?`${yr}-${String(curM+1).padStart(2,'0')}-${String(calE).padStart(2,'0')}`:startStr;

    // Use adventure wizard with date pre-fill
    if(typeof startAdventureWizardWithData==='function'){
      startAdventureWizardWithData({startDate:startStr,endDate:endStr});
    }else{
      startPlanFlow(1);
      setTimeout(()=>{const startEl=document.getElementById('pfDateStart');const endEl=document.getElementById('pfDateEnd');if(startEl)startEl.value=startStr;if(endEl)endEl.value=endStr},50);
    }
    calDragStart=null;
    calLongPressActivated=false;
  });
  // Cancel long-press if pointer leaves the grid
  grid.addEventListener('pointercancel',function(){
    if(calLongPressTimer){clearTimeout(calLongPressTimer);calLongPressTimer=null}
    calLongPressActivated=false;
  });

  // Click outside calendar to deselect range
  document.addEventListener('click',function(e){
    if(!grid.contains(e.target)&&(calS||calE)){
      calS=null;calE=null;calDragStart=null;
      document.querySelectorAll('#mGrid .mgc').forEach(c=>c.classList.remove('rs','rstart','rend'));
    }
  });
}

// ===== PLAN VIEW REFRESH =====
function refreshPlanView(){
  try{
    if(typeof plans!=='undefined'&&Array.isArray(plans)){
      const adventures=plans.filter(p=>p.type==='adventure').length;
      const misogis=plans.filter(p=>p.type==='misogi').length;
      const bucketCount=typeof bucketList!=='undefined'&&Array.isArray(bucketList)?bucketList.length:0;

      const el=document.getElementById('statAdventures');if(el)el.textContent=adventures;
      const mel=document.getElementById('statMisogi');if(mel)mel.textContent=misogis;
      const bel=document.getElementById('statBucket');if(bel)bel.textContent=bucketCount;
    }
  }catch(e){console.error('Error updating stats:',e)}

  try{buildWeekView()}catch(e){console.error('Error building week view:',e)}
  try{buildMG()}catch(e){console.error('Error building month grid:',e)}
  try{buildYV()}catch(e){console.error('Error building year view:',e)}

  // Update profile
  try{
    if(typeof currentUser!=='undefined'&&currentUser){
      const pn=document.getElementById('profileName');if(pn)pn.textContent=currentUser.name||'User';
    }
  }catch(e){console.error('Error updating profile:',e)}

  // Update year theme
  try{
    if(typeof yearData!=='undefined'&&yearData){
      const th=document.getElementById('yearBannerTheme');if(th&&yearData.theme)th.textContent='"'+yearData.theme+'"';
    }
  }catch(e){console.error('Error updating theme:',e)}
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded',()=>{
  buildWeekView();buildMG();buildYV();
  setTimeout(() => { refreshPlanView() }, 500);
  setTimeout(() => { refreshPlanView() }, 2000);
  // Theme editing
  const themeEl=document.getElementById('yearBannerTheme');
  if(themeEl){themeEl.onclick=function(){editYearTheme()}}
  // Keyboard scroll fix
  document.addEventListener('focusin',function(e){if(e.target.matches('.pf-fullscreen input,.pf-fullscreen textarea,.sp input,.sp textarea,.modal input,.modal textarea')){setTimeout(()=>{e.target.scrollIntoView({behavior:'smooth',block:'center'})},300)}});
  // Hook: after app.js renderHabits, also refresh our habits view
  setTimeout(()=>{
    if(typeof renderHabits==='function'){
      const origRenderHabits=renderHabits;
      window.renderHabits=function(){origRenderHabits();try{renderHabitsView()}catch(e){}}
    }
  },2000);
});

// Helper: parseLocalDate fallback
if(typeof parseLocalDate==='undefined'){
  window.parseLocalDate=function(dateStr){
    if(!dateStr)return null;
    const parts=dateStr.split('T')[0].split('-');
    if(parts.length!==3)return null;
    return new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]));
  };
}