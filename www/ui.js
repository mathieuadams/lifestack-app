// =====================================================
// LIFESTACK UI.JS — View logic, planning flow, calendar
// Connects to app.js for API calls
// =====================================================

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
}
function openPanel(n){const o=document.getElementById(n+'Overlay'),p=document.getElementById(n+'Panel');if(o)o.classList.add('open');if(p)p.classList.add('open')}
function closePanel(n){const o=document.getElementById(n+'Overlay'),p=document.getElementById(n+'Panel');if(o)o.classList.remove('open');if(p)p.classList.remove('open')}
function toggleFab(){const m=document.getElementById('fabMenu'),b=document.getElementById('fabBtn');m.classList.toggle('open');b.textContent=m.classList.contains('open')?'×':'+'}
function closeFab(){document.getElementById('fabMenu').classList.remove('open');document.getElementById('fabBtn').textContent='+'}
function toggleProfile(){document.getElementById('profileOverlay').classList.toggle('open');document.getElementById('profilePanel').classList.toggle('open')}
function toast(m){const t=document.getElementById('toastEl');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}
function tgChk(b){b.classList.toggle('done');if(b.classList.contains('done'))toast('✓ Done!')}
function tgHab(b){b.classList.toggle('chk');toast(b.classList.contains('chk')?'🔥 Checked in!':'Unchecked')}
function selTC(c){c.parentElement.querySelectorAll('.tc').forEach(x=>x.classList.remove('sel'));c.classList.add('sel')}
function captureMemory(){if(typeof showMemoryModal==='function')showMemoryModal();else toast('📸 Memory captured!')}

// ===== MONTH CALENDAR =====
const MN=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DIM=[31,28,31,30,31,30,31,31,30,31,30,31];
let curM=new Date().getMonth();
let calS=null,calE=null,lpT=null;

function buildMG(){
  const g=document.getElementById('mGrid');if(!g)return;g.innerHTML='';
  const year=typeof currentViewYear!=='undefined'?currentViewYear:2026;
  document.getElementById('cmTitle').textContent=MN[curM]+' '+year;
  ['M','T','W','T','F','S','S'].forEach(d=>{const h=document.createElement('div');h.className='mgh';h.textContent=d;g.appendChild(h)});
  let sd=(new Date(year,curM,1).getDay()+6)%7;
  for(let i=0;i<sd;i++){const e=document.createElement('div');e.className='mgc empty';g.appendChild(e)}
  const evts=getMonthEvents(curM);
  const today=new Date();
  for(let d=1;d<=DIM[curM];d++){
    const c=document.createElement('div');c.className='mgc';c.dataset.day=d;
    if(curM===today.getMonth()&&d===today.getDate())c.classList.add('today');
    const n=document.createElement('div');n.className='mgn';n.textContent=d;c.appendChild(n);
    const de=evts.filter(e=>e.d===d);
    de.slice(0,2).forEach(e=>{const v=document.createElement('div');v.className='mge c-'+e.c;v.textContent=e.n;c.appendChild(v)});
    if(de.length>2){const m=document.createElement('div');m.className='mgmore';m.textContent='+'+(de.length-2);c.appendChild(m)}
    c.addEventListener('click',()=>calClick(d));
    c.addEventListener('touchstart',ev=>{lpT=setTimeout(()=>{ev.preventDefault();openQuickAdd(d)},600)},{passive:false});
    c.addEventListener('touchend',()=>clearTimeout(lpT));
    c.addEventListener('touchmove',()=>clearTimeout(lpT));
    g.appendChild(c);
  }
  calS=null;calE=null;
  buildActList(evts);
}

function getMonthEvents(month){
  if(typeof plans!=='undefined'&&Array.isArray(plans)&&plans.length>0){
    const evts=[];
    plans.forEach(p=>{
      if(p.type==='habit')return;
      const sd=p.startDate?parseLocalDate(p.startDate):null;
      const ed=p.endDate?parseLocalDate(p.endDate):sd;
      if(sd&&sd.getMonth()===month){
        const endDay=(ed&&ed.getMonth()===month)?ed.getDate():sd.getDate();
        for(let d=sd.getDate();d<=endDay;d++){
          evts.push({d,n:p.title,c:mapCat(p.category||p.type),id:p.id});
        }
      }else if(p.targetMonth&&parseInt(p.targetMonth)-1===month){
        evts.push({d:15,n:p.title,c:mapCat(p.category||p.type),id:p.id});
      }
    });
    if(evts.length>0)return evts;
  }
  return getMockEvents(month);
}

function mapCat(c){
  const m={travel:'travel',hiking:'adventure',camping:'adventure',beach:'adventure',running:'health',marathon:'health',cycling:'health',concert:'culture',festival:'culture',theater:'culture',museum:'culture',dining:'food',cooking:'food',wine:'food',spa:'health',yoga:'health',roadtrip:'roadtrip',birthday:'birthday',anniversary:'date',food:'food',adventure:'adventure',health:'health',culture:'culture',date:'date',misogi:'adventure'};
  return m[c]||'adventure';
}

function getMockEvents(month){
  const mock={
    0:[{d:1,n:'New Year Run',c:'health'}],
    1:[{d:7,n:'Morning run',c:'health'},{d:8,n:"Sarah's Bday",c:'birthday'},{d:14,n:"Valentine's",c:'food'},{d:21,n:'Day hike',c:'adventure'}],
    2:[{d:15,n:'Marseille ✈️',c:'travel'},{d:16,n:'Marseille',c:'travel'},{d:17,n:'Marseille',c:'travel'},{d:18,n:'Marseille',c:'travel'},{d:19,n:'Marseille',c:'travel'},{d:20,n:'Marseille',c:'travel'},{d:21,n:'Marseille',c:'travel'},{d:22,n:'Marseille',c:'travel'}],
    3:[{d:10,n:'Sushi class',c:'food'}],4:[{d:5,n:'Napa trip',c:'roadtrip'},{d:6,n:'Napa trip',c:'roadtrip'}],
    11:[{d:6,n:'Marathon 🏃',c:'health'}]
  };
  return mock[month]||[];
}

function buildActList(evts){
  const al=document.getElementById('actList');if(!al)return;al.innerHTML='';
  document.getElementById('actListTitle').textContent='Activities in '+MN[curM];
  const icons={travel:'✈️',food:'🍽️',adventure:'🏔️',roadtrip:'🚗',birthday:'🎂',health:'💪',culture:'🎭',date:'💕'};
  const bgs={travel:'var(--cat-travel-bg)',food:'var(--cat-food-bg)',adventure:'var(--cat-adventure-bg)',roadtrip:'var(--cat-roadtrip-bg)',birthday:'var(--cat-birthday-bg)',health:'var(--cat-health-bg)',culture:'var(--cat-culture-bg)',date:'var(--cat-date-bg)'};
  const seen=new Set();const unique=[];
  evts.forEach(e=>{const k=e.n+e.c;if(!seen.has(k)){seen.add(k);const days=evts.filter(x=>x.n===e.n&&x.c===e.c);unique.push({...e,startD:Math.min(...days.map(x=>x.d)),endD:Math.max(...days.map(x=>x.d)),multi:days.length>1})}});
  unique.sort((a,b)=>a.startD-b.startD);
  unique.forEach(e=>{
    const mn=MN[curM].slice(0,3);
    const dateStr=e.multi?`${mn} ${e.startD}–${e.endD}`:`${mn} ${e.startD}`;
    const item=document.createElement('div');item.className='act-item t-'+e.c;
    item.innerHTML=`<div class="act-icon" style="background:${bgs[e.c]||'var(--sand-100)'}">${icons[e.c]||'📋'}</div><div class="act-body"><div class="act-name">${e.n}</div><div class="act-meta"><span>${dateStr}</span><span class="tag tag-${e.c}">${e.c}</span></div></div><span class="act-edit" onclick="event.stopPropagation();openTripDetail('${e.id||''}')">✏️</span>`;
    item.onclick=()=>openTripDetail(e.id||'');
    al.appendChild(item);
  });
}

function calClick(day){
  if(!calS||(calS&&calE)){calS=day;calE=null;hlRange()}
  else{if(day<calS){calE=calS;calS=day}else calE=day;hlRange();
    setTimeout(()=>{const yr=typeof currentViewYear!=='undefined'?currentViewYear:2026;document.getElementById('pfDateStart').value=`${yr}-${String(curM+1).padStart(2,'0')}-${String(calS).padStart(2,'0')}`;document.getElementById('pfDateEnd').value=`${yr}-${String(curM+1).padStart(2,'0')}-${String(calE).padStart(2,'0')}`;startPlanFlow(2)},300)}
}
function hlRange(){document.querySelectorAll('#mGrid .mgc').forEach(c=>{c.classList.remove('rs','rstart','rend');const d=parseInt(c.dataset.day);if(!d)return;if(calS&&!calE&&d===calS){c.classList.add('rstart','rend')}else if(calS&&calE){if(d===calS)c.classList.add('rstart');else if(d===calE)c.classList.add('rend');else if(d>calS&&d<calE)c.classList.add('rs')}})}
function openQuickAdd(d){const yr=typeof currentViewYear!=='undefined'?currentViewYear:2026;document.getElementById('pfDateStart').value=`${yr}-${String(curM+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;document.getElementById('pfDateEnd').value=document.getElementById('pfDateStart').value;startPlanFlow(1)}
function navMonth(dir){curM=(curM+dir+12)%12;buildMG()}
function navWeek(dir){toast(dir>0?'Next week':'Previous week')}

// ===== YEARLY VIEW =====
function buildYV(){
  const g=document.getElementById('yearGrid');if(!g)return;g.innerHTML='';
  const cm=new Date().getMonth();
  MN.forEach((m,i)=>{
    const card=document.createElement('div');card.className='ym'+(i===cm?' cur':'');
    const evts=getMonthEvents(i);const evMap={};evts.forEach(e=>evMap[e.d]=e.c);
    let cells='';const sd=(new Date(2026,i,1).getDay()+6)%7;
    for(let b=0;b<sd;b++)cells+='<div class="ymc blank"></div>';
    for(let d=1;d<=DIM[i];d++){const c=evMap[d];cells+=`<div class="ymc ${c?'e-'+c:'day'}"></div>`}
    card.innerHTML=`<div class="ymn">${m.slice(0,3)}</div><div class="ymg">${cells}</div><div class="ymc-count">${evts.length} event${evts.length!==1?'s':''}</div>`;
    card.onclick=()=>{curM=i;buildMG();swTab('month',document.querySelectorAll('.ptb')[1])};
    g.appendChild(card);
  });
}

// ===== PLANNING FLOW =====
let pfState={type:null,loc:null,locName:'Near Sacramento',selectedFriends:[],visitType:'first'};

const aiDB={
  'food':[{n:'The Kitchen',d:'Award-winning Sacramento restaurant.',dist:'Downtown · 12 min',e:'🍳',bg:'var(--amber-light)'},{n:'Kru Contemporary Japanese',d:'Omakase and creative sushi.',dist:'East Sac · 8 min',e:'🍣',bg:'var(--cat-food-bg)'},{n:"Mulvaney's B&L",d:'Farm-to-fork fine dining.',dist:'Midtown · 10 min',e:'🥂',bg:'var(--sage-100)'}],
  'adventure':[{n:'American River Trail',d:'Paved path along the river.',dist:'10 min drive',e:'🌲',bg:'var(--teal-light)'},{n:'Auburn SRA',d:'Canyon trails with river views.',dist:'35 min drive',e:'🏔️',bg:'var(--sage-100)'},{n:'Folsom Lake Loop',d:'Lakeside trail with wildflowers.',dist:'25 min drive',e:'💧',bg:'var(--blue-light)'}],
  'travel':[{n:'Napa Valley',d:'World-class wine tasting.',dist:'1.5h drive',e:'🍷',bg:'var(--amber-light)'},{n:'Lake Tahoe',d:'Crystal clear alpine lake.',dist:'2h drive',e:'🏔️',bg:'var(--blue-light)'},{n:'San Francisco',d:'Golden Gate, amazing food.',dist:'1.5h drive',e:'🌉',bg:'var(--coral-bg)'}],
  'roadtrip':[{n:'Pacific Coast Highway',d:'Big Sur coastal drive.',dist:'3.5h to Big Sur',e:'🌊',bg:'var(--blue-light)'},{n:'Napa → Sonoma Loop',d:'Wine country road trip.',dist:'1.5h start',e:'🍷',bg:'var(--amber-light)'},{n:'Lassen Volcanic NP',d:'Geothermal features, hot springs.',dist:'3h drive',e:'🌋',bg:'var(--coral-bg)'}],
  'culture':[{n:'Crocker Art Museum',d:'Oldest art museum in the West.',dist:'Downtown · 12 min',e:'🎨',bg:'var(--lavender-light)'},{n:'Sacramento Philharmonic',d:'World-class orchestra.',dist:'Downtown · 10 min',e:'🎵',bg:'var(--sage-100)'},{n:'B Street Theatre',d:'Intimate local theater.',dist:'Midtown · 8 min',e:'🎭',bg:'var(--coral-bg)'}],
  'date':[{n:'The Firehouse Restaurant',d:'Romantic fine dining.',dist:'Downtown · 12 min',e:'🕯️',bg:'var(--coral-bg)'},{n:'Hawks Public House',d:'Craft cocktails, cozy.',dist:'Midtown · 8 min',e:'🍸',bg:'var(--amber-light)'},{n:'Sac River Sunset Cruise',d:'Evening boat cruise.',dist:'Old Sac · 15 min',e:'🚤',bg:'var(--blue-light)'}],
  'health':[{n:'Sol Yoga Sacramento',d:'Hot yoga and vinyasa.',dist:'Midtown · 7 min',e:'🧘',bg:'var(--teal-light)'},{n:'Sacramento Rock Climbing',d:'Indoor bouldering gym.',dist:'Arden · 15 min',e:'🧗',bg:'var(--sage-100)'},{n:'Folsom Lake Open Water',d:'Open water swimming.',dist:'Folsom · 25 min',e:'🏊',bg:'var(--blue-light)'}],
  'birthday':[{n:'Iron Horse Tavern',d:'Private dining, great for groups.',dist:'Downtown · 10 min',e:'🎂',bg:'var(--pink-light)'},{n:'Topgolf Roseville',d:'Fun group activity.',dist:'Roseville · 20 min',e:'⛳',bg:'var(--sage-100)'},{n:'River Cats Game',d:'Minor league baseball.',dist:'West Sac · 12 min',e:'⚾',bg:'var(--amber-light)'}],
};

// AI-generated reminders matching activity type
const aiReminders={
  'travel':['Check passport expiry','Book flights','Reserve hotel','Pack luggage','Arrange airport transfer'],
  'food':['Make reservation','Check dress code','Review menu','Book babysitter if needed'],
  'adventure':['Check weather forecast','Pack gear & water','Charge phone & battery pack','Share trail plan with someone'],
  'roadtrip':['Check tire pressure & oil','Download offline maps','Pack snacks & drinks','Create playlist'],
  'culture':['Buy tickets online','Check venue hours','Plan parking'],
  'date':['Book restaurant','Plan outfit','Arrange babysitter if needed','Buy flowers or small gift'],
  'health':['Pack workout clothes','Set alarm','Prepare water bottle','Warm up playlist'],
  'birthday':['Buy gift','Order cake','Send invitations','Book venue','Plan decorations'],
};

function startPlanFlow(startStep){
  pfState={type:null,loc:null,locName:'Near Sacramento',selectedFriends:[],visitType:'first'};
  document.querySelectorAll('.pf-step').forEach(s=>s.style.display='none');
  const step=startStep||1;
  document.getElementById('pf'+step).style.display='block';
  updateSteps(step);
  if(step===1){document.querySelectorAll('#pfTypes .tc').forEach(t=>t.classList.remove('sel'));document.getElementById('pfNext1').style.opacity='.5';document.getElementById('pfNext1').style.pointerEvents='none';document.getElementById('pfActName').value=''}
  openPanel('planFlow');
  document.getElementById('pfTitle').textContent='Plan Activity';
}

function updateSteps(n){document.querySelectorAll('#pfSteps .step-dot').forEach((d,i)=>{d.className='step-dot';if(i+1<n)d.classList.add('done');if(i+1===n)d.classList.add('active')})}

function pfSelType(btn,type){
  document.querySelectorAll('#pfTypes .tc').forEach(t=>t.classList.remove('sel'));
  btn.classList.add('sel');pfState.type=type;
  document.getElementById('pfNext1').style.opacity='1';document.getElementById('pfNext1').style.pointerEvents='auto';
}

function pfNext(step){
  document.querySelectorAll('.pf-step').forEach(s=>s.style.display='none');
  document.getElementById('pf'+step).style.display='block';
  updateSteps(step);
  if(step===3)buildPfRecs();
}

function buildPfRecs(){
  const recs=aiDB[pfState.type]||aiDB['food'];
  document.getElementById('pfLocLabel').textContent=pfState.locName||'Near Sacramento';
  const c=document.getElementById('pfAiRecs');c.innerHTML='';
  recs.forEach((r,i)=>{
    const div=document.createElement('div');div.className='airc'+(i===0?' selected':'');
    div.onclick=function(){pfSelRec(this,r.n)};
    div.innerHTML=`<div class="airi" style="background:${r.bg}">${r.e}</div><div class="airb"><div class="airn">${r.n}</div><div class="aird">${r.d}</div><div class="airdist">📍 ${r.dist}</div></div>`;
    c.appendChild(div);
  });
  // Set default name from first rec
  if(!document.getElementById('pfActName').value){
    document.getElementById('pfActName').value=recs[0]?.n||'';
  }
  // Reset custom place
  const custom=document.getElementById('pfCustomOption');if(custom)custom.classList.remove('selected');
  const customInput=document.getElementById('pfCustomPlace');if(customInput)customInput.value='';
  // Build reminders for trip detail
  buildAiReminders(pfState.type);
}

function pfSelRec(el,name){
  document.querySelectorAll('.airc').forEach(c=>c.classList.remove('selected'));
  const custom=document.getElementById('pfCustomOption');if(custom)custom.classList.remove('selected');
  el.classList.add('selected');
  document.getElementById('pfActName').value=name;
}

function pfSelCustom(){
  document.querySelectorAll('.airc').forEach(c=>c.classList.remove('selected'));
  document.getElementById('pfCustomOption').classList.add('selected');
  const val=document.getElementById('pfCustomPlace').value;
  if(val)document.getElementById('pfActName').value=val;
  document.getElementById('pfCustomPlace').focus();
}

function pfUpdateCustom(){
  const val=document.getElementById('pfCustomPlace').value;
  if(val)document.getElementById('pfActName').value=val;
}

function pfQuick(type){
  pfState={type:type,loc:'around',locName:'Near Sacramento',selectedFriends:[],visitType:'first'};
  document.querySelectorAll('.pf-step').forEach(s=>s.style.display='none');
  document.getElementById('pf3').style.display='block';
  updateSteps(3);
  openPanel('planFlow');
  document.getElementById('pfTitle').textContent='Plan Activity';
  document.getElementById('pfActName').value='';
  buildPfRecs();
}

function startRecurring(){openPanel('recur')}

async function pfFinish(){
  const name=document.getElementById('pfActName').value||'New Activity';
  const visitSel=document.querySelector('#pfVisitHistory .tc.sel');
  const isFirstTime=!visitSel||visitSel.textContent.includes('First');
  
  // Create plan via app.js API if available
  if(typeof createPlan==='function'){
    const planData={
      type:'adventure',
      title:name,
      description:'',
      year:typeof currentViewYear!=='undefined'?currentViewYear:2026,
      startDate:document.getElementById('pfDateStart')?.value||null,
      endDate:document.getElementById('pfDateEnd')?.value||null,
      category:pfState.type||'other',
      targetMonth:null,
      people:pfState.selectedFriends.map(f=>f.id),
      visitCount:isFirstTime?1:2,
      ownerName:typeof currentUser!=='undefined'&&currentUser?currentUser.name:'User'
    };
    // Extract month from date
    if(planData.startDate){
      const d=new Date(planData.startDate+'T00:00:00');
      planData.targetMonth=d.getMonth()+1;
    }
    const result=await createPlan(planData);
    if(result){
      if(typeof plans!=='undefined')plans.push(result);
      toast('🎉 '+name+' added to plan!');
    }else{
      toast('🎉 '+name+' added locally!');
    }
  }else{
    toast('🎉 '+name+' added to plan!');
  }
  closePanel('planFlow');
  // Open trip detail with AI reminders
  setTimeout(()=>{
    document.getElementById('tripTitle').textContent=name;
    buildAiReminders(pfState.type);
    renderTripFriends(pfState.selectedFriends);
    openPanel('trip');
  },400);
}

// ===== AI REMINDERS =====
function buildAiReminders(type){
  const list=document.getElementById('remList');if(!list)return;
  const rems=aiReminders[type]||aiReminders['adventure'];
  list.innerHTML='';
  rems.forEach(r=>{
    const ri=document.createElement('div');ri.className='ri';
    ri.innerHTML=`<button class="rchk" onclick="tgRem(this)">✓</button><div class="rbd"><div class="rtx">${r}</div><div class="rwh">🔔 1 week prior</div></div><button class="redit" onclick="editRem(this)">✏️</button><button class="rdl" onclick="this.closest('.ri').remove()">🗑</button>`;
    list.appendChild(ri);
  });
}

function tgRem(b){b.classList.toggle('done');b.closest('.ri').querySelector('.rtx').classList.toggle('sk');if(b.classList.contains('done'))toast('✓ Done')}
function editRem(btn){
  const ri=btn.closest('.ri');if(ri.classList.contains('ri-editing'))return;
  const txt=ri.querySelector('.rtx');const when=ri.querySelector('.rwh');
  const oldText=txt.textContent;
  const timings=['24h','1 week','1 month','3 months'];
  let curTiming='1 week';timings.forEach(t=>{if(when.textContent.includes(t))curTiming=t});
  ri.classList.add('ri-editing');
  const ed=document.createElement('div');ed.className='ri-edit-wrap';
  ed.innerHTML=`<input class="ri-edit-input" value="${oldText}"><div class="ri-edit-timing">${timings.map(t=>`<button class="tc${t===curTiming?' sel':''}" onclick="selTC(this)">${t}</button>`).join('')}</div><div class="ri-edit-actions"><button class="ri-cancel" onclick="cancelEditRem(this)">Cancel</button><button class="ri-save" onclick="saveEditRem(this)">Save</button></div>`;
  ri.querySelector('.rbd').appendChild(ed);
}
function saveEditRem(btn){const ri=btn.closest('.ri');ri.querySelector('.rtx').textContent=ri.querySelector('.ri-edit-input').value;ri.querySelector('.rwh').textContent='🔔 '+(ri.querySelector('.ri-edit-timing .tc.sel')?.textContent||'1 week')+' prior';ri.querySelector('.ri-edit-wrap').remove();ri.classList.remove('ri-editing');toast('Reminder updated!')}
function cancelEditRem(btn){const ri=btn.closest('.ri');ri.querySelector('.ri-edit-wrap').remove();ri.classList.remove('ri-editing')}
function addRem(){const i=document.getElementById('nri'),t=i.value.trim();if(!t)return;const tm=document.querySelector('#trTiming .tc.sel')?.textContent||'1 week';const l=document.getElementById('remList'),it=document.createElement('div');it.className='ri';it.innerHTML=`<button class="rchk" onclick="tgRem(this)">✓</button><div class="rbd"><div class="rtx">${t}</div><div class="rwh">🔔 ${tm} prior</div></div><button class="redit" onclick="editRem(this)">✏️</button><button class="rdl" onclick="this.closest('.ri').remove()">🗑</button>`;l.appendChild(it);i.value='';toast('Reminder added!')}

// ===== TRIP DETAIL =====
let currentTripPlanId=null;

function openTripDetail(planId){
  currentTripPlanId=planId;
  if(planId&&typeof plans!=='undefined'){
    const plan=plans.find(p=>p.id===planId);
    if(plan){
      document.getElementById('tripTitle').textContent=plan.title;
      document.getElementById('tripStartDate').value=plan.startDate||'';
      document.getElementById('tripEndDate').value=plan.endDate||'';
      updateTripDuration();
      buildAiReminders(mapCat(plan.category||plan.type));
      // Render friends
      const friendsList=[];
      if(plan.people&&Array.isArray(plan.people)){
        plan.people.forEach(pid=>{
          const p=typeof people!=='undefined'?people.find(x=>x.id===pid):null;
          if(p)friendsList.push({id:p.id,name:p.name,avatar:p.avatar||'👤'});
        });
      }
      renderTripFriends(friendsList);
    }
  }
  openPanel('trip');
}

function updateTripDuration(){
  const s=document.getElementById('tripStartDate').value;
  const e=document.getElementById('tripEndDate').value;
  const dur=document.getElementById('tripDuration');
  if(s&&e){
    const diff=Math.ceil((new Date(e)-new Date(s))/(1000*60*60*24));
    dur.textContent=diff>0?diff+' night'+(diff>1?'s':''):'Same day';
  }else{dur.textContent='—'}
}
// Listen for date changes
document.addEventListener('DOMContentLoaded',()=>{
  const sd=document.getElementById('tripStartDate');
  const ed=document.getElementById('tripEndDate');
  if(sd)sd.addEventListener('change',updateTripDuration);
  if(ed)ed.addEventListener('change',updateTripDuration);
});

async function saveTripDetail(){
  if(currentTripPlanId&&typeof updatePlan==='function'){
    const updates={
      startDate:document.getElementById('tripStartDate').value||null,
      endDate:document.getElementById('tripEndDate').value||null,
    };
    await updatePlan(currentTripPlanId,updates);
  }
  closePanel('trip');
  toast('Saved!');
  buildMG();buildYV();
}

// ===== FRIEND SELECTOR =====
let friendSelTarget='plan'; // 'plan','trip','recur'
let tempSelectedFriends=[];

function openFriendSelector(target){
  friendSelTarget=target;
  tempSelectedFriends=[];
  const list=document.getElementById('friendSelectorList');if(!list)return;
  list.innerHTML='';
  // Build from people array (from app.js)
  const ppl=typeof people!=='undefined'?people:[];
  if(ppl.length===0){
    list.innerHTML='<p style="color:var(--text-tertiary);font-size:.85rem;padding:20px 0;text-align:center">No people added yet. Add people in Settings.</p>';
  }else{
    ppl.forEach(p=>{
      const item=document.createElement('div');item.className='friend-sel-item';item.dataset.id=p.id;
      item.innerHTML=`<div class="fav" style="background:var(--sage-50)">${p.avatar||'👤'}</div><span class="friend-sel-name">${p.name}</span><div class="friend-sel-check">✓</div>`;
      item.onclick=function(){
        this.classList.toggle('selected');
        const id=this.dataset.id;
        if(this.classList.contains('selected')){
          tempSelectedFriends.push({id:p.id,name:p.name,avatar:p.avatar||'👤'});
        }else{
          tempSelectedFriends=tempSelectedFriends.filter(f=>f.id!==id);
        }
      };
      list.appendChild(item);
    });
  }
  openPanel('friendSel');
}

function confirmFriendSelection(){
  closePanel('friendSel');
  if(friendSelTarget==='plan'){
    pfState.selectedFriends=tempSelectedFriends;
    renderPfFriends();
  }else if(friendSelTarget==='trip'){
    renderTripFriends(tempSelectedFriends);
  }else if(friendSelTarget==='recur'){
    renderRecurFriends(tempSelectedFriends);
  }
}

function renderPfFriends(){
  const c=document.getElementById('pfFriends');if(!c)return;
  c.innerHTML='';
  pfState.selectedFriends.forEach(f=>{
    c.innerHTML+=`<div class="fc"><div class="fav" style="background:var(--sage-50)">${f.avatar}</div>${f.name}<button class="fc-remove" onclick="removePfFriend('${f.id}')">✕</button></div>`;
  });
  c.innerHTML+='<button class="afb" onclick="openFriendSelector(\'plan\')">+ Add friend</button>';
}
function removePfFriend(id){pfState.selectedFriends=pfState.selectedFriends.filter(f=>f.id!==id);renderPfFriends()}

function renderTripFriends(friends){
  const c=document.getElementById('tripFriends');if(!c)return;
  c.innerHTML='';
  friends.forEach(f=>{
    c.innerHTML+=`<div class="fc"><div class="fav" style="background:var(--coral-bg)">${f.avatar||'👤'}</div>${f.name}<button class="fc-remove" onclick="this.closest('.fc').remove()">✕</button></div>`;
  });
  c.innerHTML+='<button class="afb" onclick="openFriendSelector(\'trip\')">+ Add friend</button>';
}

function renderRecurFriends(friends){
  const c=document.getElementById('recurFriends');if(!c)return;
  c.innerHTML='';
  friends.forEach(f=>{c.innerHTML+=`<div class="fc"><div class="fav" style="background:var(--coral-bg)">${f.avatar||'👤'}</div>${f.name}<button class="fc-remove" onclick="this.closest('.fc').remove()">✕</button></div>`});
  c.innerHTML+='<button class="afb" onclick="openFriendSelector(\'recur\')">+ Add</button>';
}

// ===== MEMORIES VIEW =====
let memMap=null;

function switchMemView(view,btn){
  document.querySelectorAll('.mem-yearly-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.getElementById('memTimelineView').style.display=view==='timeline'?'block':'none';
  document.getElementById('memYearlyView').style.display=view==='yearly'?'block':'none';
  document.getElementById('memMapView').style.display=view==='map'?'block':'none';
  if(view==='yearly')buildMemYearGrid();
  if(view==='map')setTimeout(()=>initMemMap(),100);
}

function renderMemoriesView(){
  buildMemTimeline();
  buildOnThisDay();
}

function buildMemTimeline(){
  const c=document.getElementById('memoriesTimeline');if(!c)return;
  const mems=typeof memories!=='undefined'?memories:[];
  if(mems.length===0){
    c.innerHTML='<p style="color:var(--text-tertiary);padding:20px 0;text-align:center">No memories yet. Capture your first one!</p>';
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
    html+=`<div class="mmcd"><div class="mimg" style="${bgStyle}"><span class="mdt">${MN[d.getMonth()].slice(0,3)} ${d.getDate()}</span></div><div class="mbdy"><div class="mbtl">${m.title||'Memory'}</div><div class="mbdsc">${m.text||m.description||''}</div></div></div>`;
  });
  c.innerHTML=html;
}

function buildOnThisDay(){
  const c=document.getElementById('onThisDayContainer');if(!c)return;
  const mems=typeof memories!=='undefined'?memories:[];
  const today=new Date();
  const otd=mems.filter(m=>{const d=new Date(m.occurredAt);return d.getMonth()===today.getMonth()&&d.getDate()===today.getDate()&&d.getFullYear()!==today.getFullYear()});
  if(otd.length>0){
    const m=otd[0];const d=new Date(m.occurredAt);const yearsAgo=today.getFullYear()-d.getFullYear();
    c.innerHTML=`<div class="otd"><div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.1em;opacity:.8;margin-bottom:8px">On This Day</div><div style="font-family:'Fraunces',serif;font-size:1.1rem;font-weight:500;margin-bottom:4px">${m.title}</div><div style="font-size:.8rem;opacity:.75">${yearsAgo} year${yearsAgo>1?'s':''} ago · ${MN[d.getMonth()].slice(0,3)} ${d.getDate()}, ${d.getFullYear()}</div></div>`;
  }else{c.innerHTML=''}
}

function buildMemYearGrid(){
  const g=document.getElementById('memYearGrid');if(!g)return;
  const mems=typeof memories!=='undefined'?memories:[];
  const year=typeof currentViewYear!=='undefined'?currentViewYear:2026;
  g.innerHTML='';
  MN.forEach((name,i)=>{
    const monthMems=mems.filter(m=>{const d=new Date(m.occurredAt);return d.getMonth()===i&&d.getFullYear()===year});
    const card=document.createElement('div');card.className='mem-month-card';
    let photoHtml='';
    const photos=monthMems.flatMap(m=>(m.photos||[]).map(p=>p.url)).slice(0,3);
    if(photos.length>0){photoHtml=`<div class="mem-month-photos">${photos.map(u=>`<img src="${u}" alt="">`).join('')}</div>`}
    else{photoHtml=`<div class="mem-month-empty">${monthMems.length===0?'No memories':'No photos'}</div>`}
    card.innerHTML=`<div class="mem-month-name">${name.slice(0,3)}</div><div class="mem-month-count">${monthMems.length} memor${monthMems.length===1?'y':'ies'}</div>${photoHtml}`;
    card.onclick=()=>{switchMemView('timeline',document.querySelector('.mem-yearly-tab'));/* TODO: scroll to month */};
    g.appendChild(card);
  });
}

function initMemMap(){
  const container=document.getElementById('memMapContainer');if(!container)return;
  const mems=(typeof memories!=='undefined'?memories:[]).filter(m=>m.location&&m.location.lat&&m.location.lng);
  if(memMap){memMap.remove();memMap=null}
  let center=[38.58,-121.49],zoom=10;
  if(mems.length>0){
    const lats=mems.map(m=>m.location.lat);const lngs=mems.map(m=>m.location.lng);
    center=[lats.reduce((a,b)=>a+b,0)/lats.length,lngs.reduce((a,b)=>a+b,0)/lngs.length];zoom=8;
  }
  memMap=L.map(container).setView(center,zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OSM'}).addTo(memMap);
  const bounds=[];
  mems.forEach(m=>{
    bounds.push([m.location.lat,m.location.lng]);
    L.marker([m.location.lat,m.location.lng]).addTo(memMap).bindPopup(`<b>${m.title||'Memory'}</b><br>${m.location.name||''}`);
  });
  if(bounds.length>1)memMap.fitBounds(bounds,{padding:[30,30]});
  // Render list
  const list=document.getElementById('memMapList');if(!list)return;
  if(mems.length===0){list.innerHTML='<p style="text-align:center;color:var(--text-tertiary);padding:20px">No memories with locations yet.</p>';return}
  list.innerHTML=mems.map(m=>`<div class="mem-map-item" onclick="memMap&&memMap.setView([${m.location.lat},${m.location.lng}],14)"><span class="mem-map-pin">📍</span><div class="mem-map-info"><div class="mem-map-title">${m.title||'Memory'}</div><div class="mem-map-date">${m.location.name||''}</div></div></div>`).join('');
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
  if(habits.length===0){hc.innerHTML='<p style="color:var(--text-tertiary);padding:10px 0">No habits set. Add one from the Plan tab.</p>'}
  else{hc.innerHTML=habits.map(h=>`<div class="hc"><div class="hr"><svg viewBox="0 0 52 52"><circle class="hrbg" cx="26" cy="26" r="22"/><circle class="hrf" cx="26" cy="26" r="22" stroke="var(--teal)" stroke-dasharray="138.23" stroke-dashoffset="${138.23*(1-(h.completionRate||0.5))}"/></svg><div class="hrc">💪</div></div><div class="hinf"><div class="hnam">${h.title}</div><div class="hstr">Q${h.targetQuarter||'?'}</div></div><button class="hci${h.status==='completed'?' chk':''}" onclick="tgHab(this)">✓</button></div>`).join('')}
  if(misogis.length===0){mc.innerHTML='<p style="color:var(--text-tertiary);padding:10px 0">No misogi set. Define your year\'s biggest challenge!</p>'}
  else{mc.innerHTML=misogis.map(m=>`<div class="hc" style="border-left:4px solid var(--coral)"><div class="hr"><svg viewBox="0 0 52 52"><circle class="hrbg" cx="26" cy="26" r="22"/><circle class="hrf" cx="26" cy="26" r="22" stroke="var(--coral)" stroke-dasharray="138.23" stroke-dashoffset="${138.23*(1-(m.completionRate||0.3))}"/></svg><div class="hrc">🏔️</div></div><div class="hinf"><div class="hnam">${m.title}</div><div class="hstr">🎯 ${m.status==='completed'?'Complete!':'In Progress'}</div></div></div>`).join('')}
}

// ===== PLAN VIEW REFRESH =====
function refreshPlanView(){
  if(typeof plans!=='undefined'&&Array.isArray(plans)){
    const adventures=plans.filter(p=>p.type==='adventure').length;
    const misogis=plans.filter(p=>p.type==='misogi').length;
    const el=document.getElementById('statAdventures');if(el)el.textContent=adventures;
    const mel=document.getElementById('statMisogi');if(mel)mel.textContent=misogis;
  }
  buildMG();buildYV();
  // Update profile name
  if(typeof currentUser!=='undefined'&&currentUser){
    const pn=document.getElementById('profileName');if(pn)pn.textContent=currentUser.name||'User';
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded',()=>{
  buildMG();buildYV();
  // After app.js loads data, refresh views
  setTimeout(()=>{refreshPlanView()},1000);
  setTimeout(()=>{refreshPlanView()},3000);
});

// Helper: parseLocalDate (also in app.js, defining here as fallback)
if(typeof parseLocalDate==='undefined'){
  window.parseLocalDate=function(dateStr){
    if(!dateStr)return null;
    const parts=dateStr.split('T')[0].split('-');
    if(parts.length!==3)return null;
    return new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]));
  };
}
