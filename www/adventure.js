// =====================================================
// ADVENTURE WIZARD — Multi-step creation flow
// =====================================================

const advWizard = {
  step: 1,
  totalSteps: 4,
  data: {
    location: { name: '', lat: null, lng: null, placeId: '' },
    name: '',
    category: '',
    startDate: '',
    endDate: '',
    friends: [],       // array of { id, name }
    subActivities: [], // AI-generated ideas user selected
    notes: ''
  }
};

let advLocationTimeout = null;

// ===== OPEN / CLOSE =====

function startAdventureWizard() {
  // Reset state
  advWizard.step = 1;
  advWizard.data = {
    location: { name: '', lat: null, lng: null, placeId: '' },
    name: '', category: '', startDate: '', endDate: '',
    friends: [], subActivities: [], notes: ''
  };
  if (typeof selectedPeopleIds !== 'undefined') selectedPeopleIds = [];

  renderAdvWizard();
  openPanel('planFlow');
}

function closeAdvWizard() {
  closePanel('planFlow');
}

// ===== RENDER CURRENT STEP =====

function renderAdvWizard() {
  const panel = document.getElementById('planFlowPanel');
  if (!panel) return;

  const progressPct = ((advWizard.step) / advWizard.totalSteps) * 100;

  let stepContent = '';
  switch (advWizard.step) {
    case 1: stepContent = renderAdvStep1(); break;
    case 2: stepContent = renderAdvStep2(); break;
    case 3: stepContent = renderAdvStep3(); break;
    case 4: stepContent = renderAdvStep4(); break;
  }

  panel.innerHTML = `
    <div class="adv-header">
      <button class="adv-back" onclick="${advWizard.step === 1 ? 'closeAdvWizard()' : 'advBack()'}">
        ${advWizard.step === 1 ? '✕' : '←'}
      </button>
      <span class="adv-htitle">New Adventure</span>
      <span class="adv-step-num">Step ${advWizard.step} of ${advWizard.totalSteps}</span>
    </div>
    <div class="adv-progress"><div class="adv-progress-fill" style="width:${progressPct}%"></div></div>
    <div class="adv-scroll">
      ${stepContent}
    </div>
    <div class="adv-footer">
      ${advWizard.step < advWizard.totalSteps
        ? `<button class="adv-next-btn" onclick="advNext()">Continue</button>`
        : `<button class="adv-save-btn" onclick="advSave()">Save Adventure</button>`
      }
    </div>
  `;

  // Init step-specific behavior after render
  setTimeout(() => initAdvStep(advWizard.step), 50);
}

// ===== STEP 1: WHERE =====

function renderAdvStep1() {
  return `
    <div class="adv-step">
      <h2 class="adv-question">Where are you going?</h2>
      <p class="adv-hint">Search for a city, restaurant, park, or any place</p>

      <div class="adv-loc-wrapper">
        <input type="text" class="adv-loc-input" id="advLocation"
          placeholder="Search for a place..."
          value="${escapeHtmlUI(advWizard.data.location.name)}"
          autocomplete="off">
        <button class="adv-loc-gps" onclick="advGetGPS()" title="Use my location">📍</button>
      </div>
      <div class="adv-loc-dropdown" id="advLocDropdown"></div>
      <div class="adv-loc-status" id="advLocStatus"></div>

      <div class="adv-or">or just pick a type</div>

      <div class="adv-quick-types">
        <button class="adv-qt${advWizard.data.category==='date'?' sel':''}" onclick="advQuickType('date')">💕 Date Night</button>
        <button class="adv-qt${advWizard.data.category==='food'?' sel':''}" onclick="advQuickType('food')">🍽️ Food</button>
        <button class="adv-qt${advWizard.data.category==='hiking'?' sel':''}" onclick="advQuickType('hiking')">🥾 Hiking</button>
        <button class="adv-qt${advWizard.data.category==='adventure'?' sel':''}" onclick="advQuickType('adventure')">🏔️ Adventure</button>
      </div>
    </div>
  `;
}

// ===== STEP 2: WHAT & WHEN =====

function renderAdvStep2() {
  const locName = advWizard.data.location.name;
  return `
    <div class="adv-step">
      <h2 class="adv-question">What and when?</h2>
      ${locName ? `<p class="adv-hint">📍 ${escapeHtmlUI(locName)}</p>` : ''}

      <label class="adv-label">Activity name</label>
      <input type="text" class="adv-input" id="advName"
        placeholder="e.g., Weekend in Portland, Dinner at Nobu"
        value="${escapeHtmlUI(advWizard.data.name)}">

      <label class="adv-label" style="margin-top:16px">Category</label>
      <div class="adv-cats" id="advCats">
        ${['travel','food','adventure','roadtrip','culture','health','birthday','date','hiking','skiing','swimming','running','concert','camping'].map(c=>{
          const emoji={'travel':'✈️','food':'🍽️','adventure':'🏔️','roadtrip':'🚗','culture':'🎭','health':'💪','birthday':'🎂','date':'💕','hiking':'🥾','skiing':'⛷️','swimming':'🏊','running':'🏃','concert':'🎸','camping':'⛺'}[c]||'🎯';
          return `<button class="adv-cat${advWizard.data.category===c?' sel':''}" onclick="advSelCat('${c}',this)">${emoji} ${c.charAt(0).toUpperCase()+c.slice(1)}</button>`;
        }).join('')}
      </div>

      <label class="adv-label" style="margin-top:16px">When?</label>
      <div class="adv-quick-dates">
        <button class="adv-qd" onclick="advQuickDate('tomorrow')">Tomorrow</button>
        <button class="adv-qd" onclick="advQuickDate('saturday')">This Saturday</button>
        <button class="adv-qd" onclick="advQuickDate('nextweek')">Next weekend</button>
      </div>
      <div class="adv-date-row">
        <div class="adv-date-field">
          <label>Start</label>
          <input type="date" class="adv-date" id="advStartDate" value="${advWizard.data.startDate}" onchange="advStartChanged()">
        </div>
        <div class="adv-date-field">
          <label>End</label>
          <input type="date" class="adv-date" id="advEndDate" value="${advWizard.data.endDate}">
        </div>
      </div>
    </div>
  `;
}

// ===== STEP 3: WHO & IDEAS =====

function renderAdvStep3() {
  const locName = advWizard.data.location.name;
  const friendsList = (typeof friendships !== 'undefined' && friendships.friends) ? friendships.friends : [];

  return `
    <div class="adv-step">
      <h2 class="adv-question">Who's coming?</h2>

      <div class="adv-friends-grid" id="advFriendsGrid">
        ${friendsList.length === 0
          ? '<p class="adv-hint">No friends added yet. You can add them in your profile.</p>'
          : friendsList.map(f => {
              const sel = advWizard.data.friends.some(s => s.id === f.odId);
              const initial = (f.name || '?')[0].toUpperCase();
              return `<div class="adv-friend${sel?' sel':''}" onclick="advToggleFriend('${f.odId}','${escapeHtmlUI(f.name)}',this)">
                <div class="adv-friend-avatar">${f.avatarUrl ? `<img src="${f.avatarUrl}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : initial}</div>
                <div class="adv-friend-name">${escapeHtmlUI(f.name || 'Friend')}</div>
                ${sel ? '<div class="adv-friend-check">✓</div>' : ''}
              </div>`;
            }).join('')
        }
      </div>

      ${locName ? `
        <div class="adv-ideas-section">
          <div class="adv-ideas-header">
            <h3>💡 Ideas in ${escapeHtmlUI(locName)}</h3>
            <button class="adv-ideas-btn" id="advIdeasBtn" onclick="advGetIdeas()">🤖 Get Ideas</button>
          </div>
          <div id="advIdeasList" class="adv-ideas-list"></div>
        </div>
      ` : '<p class="adv-hint" style="margin-top:24px">Go back to Step 1 to add a location and get AI-powered ideas!</p>'}
    </div>
  `;
}

// ===== STEP 4: REVIEW =====

function renderAdvStep4() {
  const d = advWizard.data;
  const friendNames = d.friends.map(f => f.name).join(', ') || 'Solo adventure';
  const ideasHtml = d.subActivities.length > 0
    ? d.subActivities.map(a => `<div class="adv-review-idea">• ${escapeHtmlUI(a.name)}</div>`).join('')
    : '';

  return `
    <div class="adv-step">
      <h2 class="adv-question">Looking good! 🎉</h2>
      <p class="adv-hint">Review your adventure before saving</p>

      <div class="adv-review-card">
        ${d.category ? `<div class="adv-review-cat">${getCatEmoji(d.category)} ${d.category}</div>` : ''}
        <div class="adv-review-title">${escapeHtmlUI(d.name || 'Untitled Adventure')}</div>
        ${d.location.name ? `<div class="adv-review-row">📍 ${escapeHtmlUI(d.location.name)}</div>` : ''}
        ${d.startDate ? `<div class="adv-review-row">📅 ${formatAdvDate(d.startDate)}${d.endDate && d.endDate !== d.startDate ? ' → ' + formatAdvDate(d.endDate) : ''}</div>` : ''}
        <div class="adv-review-row">👥 ${escapeHtmlUI(friendNames)}</div>
        ${ideasHtml ? `<div class="adv-review-ideas"><div class="adv-review-ideas-label">Things to do:</div>${ideasHtml}</div>` : ''}
      </div>

      <label class="adv-label" style="margin-top:16px">Notes (optional)</label>
      <textarea class="adv-textarea" id="advNotes" placeholder="Any extra details...">${escapeHtmlUI(d.notes)}</textarea>
    </div>
  `;
}

// ===== NAVIGATION =====

function advNext() {
  // Save current step data before advancing
  saveAdvStepData();

  // Validate
  if (advWizard.step === 1) {
    // Location or category is fine — either works
    if (!advWizard.data.location.name && !advWizard.data.category) {
      toast('Pick a destination or activity type');
      return;
    }
  }
  if (advWizard.step === 2) {
    if (!advWizard.data.name) {
      toast('Give your adventure a name');
      return;
    }
  }

  advWizard.step = Math.min(advWizard.step + 1, advWizard.totalSteps);
  renderAdvWizard();
}

function advBack() {
  saveAdvStepData();
  advWizard.step = Math.max(advWizard.step - 1, 1);
  renderAdvWizard();
}

function saveAdvStepData() {
  switch (advWizard.step) {
    case 2:
      const nameEl = document.getElementById('advName');
      if (nameEl) advWizard.data.name = nameEl.value.trim();
      const startEl = document.getElementById('advStartDate');
      if (startEl) advWizard.data.startDate = startEl.value;
      const endEl = document.getElementById('advEndDate');
      if (endEl) advWizard.data.endDate = endEl.value;
      break;
    case 4:
      const notesEl = document.getElementById('advNotes');
      if (notesEl) advWizard.data.notes = notesEl.value.trim();
      break;
  }
}

// ===== STEP INIT (after render) =====

function initAdvStep(step) {
  if (step === 1) {
    const input = document.getElementById('advLocation');
    if (input) {
      input.addEventListener('input', function() {
        const q = this.value.trim();
        clearTimeout(advLocationTimeout);
        if (q.length < 2) { hideAdvLocDropdown(); return; }
        advLocationTimeout = setTimeout(() => advSearchLocation(q), 300);
      });
      input.focus();
    }
  }
  if (step === 2) {
    const nameInput = document.getElementById('advName');
    if (nameInput && !nameInput.value) nameInput.focus();
  }

  // Scroll inputs into view on focus (keyboard fix)
  document.querySelectorAll('.adv-scroll input, .adv-scroll textarea').forEach(inp => {
    inp.addEventListener('focus', function() {
      setTimeout(() => this.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
    });
  });
}

// ===== LOCATION AUTOCOMPLETE (reuses Photon API) =====

async function advSearchLocation(query) {
  const dropdown = document.getElementById('advLocDropdown');
  if (!dropdown) return;
  dropdown.innerHTML = '<div class="adv-loc-loading">Searching...</div>';
  dropdown.style.display = 'block';

  try {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      dropdown.innerHTML = '<div class="adv-loc-empty">No results found</div>';
      return;
    }

    dropdown.innerHTML = data.features.map(f => {
      const p = f.properties;
      const coords = f.geometry.coordinates;
      const name = p.name || '';
      const parts = [];
      if (p.city) parts.push(p.city);
      if (p.state) parts.push(p.state);
      if (p.country) parts.push(p.country);
      const addr = parts.join(', ');

      let icon = '📍';
      if (p.osm_value === 'restaurant' || p.osm_value === 'cafe') icon = '🍽️';
      else if (p.osm_value === 'hotel') icon = '🏨';
      else if (p.osm_value === 'park') icon = '🌳';
      else if (p.osm_key === 'place') icon = '🏙️';

      return `<div class="adv-loc-item" onclick="advSelectLocation('${escapeHtmlUI(name || addr)}','${coords[1]}','${coords[0]}','${p.osm_id||''}')">
        <span class="adv-loc-icon">${icon}</span>
        <div><div class="adv-loc-name">${escapeHtmlUI(name || addr.split(',')[0])}</div>
        ${addr ? `<div class="adv-loc-addr">${escapeHtmlUI(addr)}</div>` : ''}</div>
      </div>`;
    }).join('');
  } catch(e) {
    dropdown.innerHTML = '<div class="adv-loc-empty">Search failed</div>';
  }
}

function advSelectLocation(name, lat, lng, placeId) {
  advWizard.data.location = { name, lat: parseFloat(lat), lng: parseFloat(lng), placeId };
  const input = document.getElementById('advLocation');
  if (input) input.value = name;
  hideAdvLocDropdown();
  const status = document.getElementById('advLocStatus');
  if (status) { status.textContent = '✓ ' + name; status.className = 'adv-loc-status success'; }
}

function hideAdvLocDropdown() {
  const d = document.getElementById('advLocDropdown');
  if (d) { d.style.display = 'none'; d.innerHTML = ''; }
}

function advGetGPS() {
  const status = document.getElementById('advLocStatus');
  if (!navigator.geolocation) { if (status) status.textContent = 'GPS not supported'; return; }
  if (status) { status.textContent = 'Getting location...'; status.className = 'adv-loc-status'; }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=12`, { headers: { 'User-Agent': 'LifeStack App' } });
        const data = await resp.json();
        const addr = data.address || {};
        const name = [addr.city || addr.town || addr.village, addr.state].filter(Boolean).join(', ');
        advSelectLocation(name || `${lat.toFixed(3)}, ${lng.toFixed(3)}`, lat, lng, '');
        const input = document.getElementById('advLocation');
        if (input) input.value = name;
      } catch(e) {
        advSelectLocation(`${lat.toFixed(3)}, ${lng.toFixed(3)}`, lat, lng, '');
      }
    },
    (err) => { if (status) status.textContent = 'Location access denied'; },
    { timeout: 10000 }
  );
}

// ===== CATEGORY SELECTION =====

function advQuickType(type) {
  advWizard.data.category = type;
  document.querySelectorAll('.adv-qt').forEach(b => b.classList.remove('sel'));
  event.target.classList.add('sel');
}

function advSelCat(cat, btn) {
  advWizard.data.category = cat;
  document.querySelectorAll('.adv-cat').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
}

// ===== DATE HANDLING =====

function advQuickDate(which) {
  const now = new Date();
  let d;
  if (which === 'tomorrow') { d = new Date(now); d.setDate(d.getDate() + 1); }
  else if (which === 'saturday') { d = new Date(now); const day = d.getDay(); d.setDate(d.getDate() + (6 - day)); }
  else if (which === 'nextweek') { d = new Date(now); const day = d.getDay(); d.setDate(d.getDate() + (13 - day)); }
  if (d) {
    const ds = d.toISOString().split('T')[0];
    advWizard.data.startDate = ds;
    advWizard.data.endDate = ds;
    const startEl = document.getElementById('advStartDate');
    const endEl = document.getElementById('advEndDate');
    if (startEl) startEl.value = ds;
    if (endEl) { endEl.value = ds; endEl.min = ds; }
  }
  document.querySelectorAll('.adv-qd').forEach(b => b.classList.remove('sel'));
  if (event && event.target) event.target.classList.add('sel');
}

function advStartChanged() {
  const startEl = document.getElementById('advStartDate');
  const endEl = document.getElementById('advEndDate');
  if (startEl && endEl) {
    const sv = startEl.value;
    advWizard.data.startDate = sv;
    endEl.min = sv;
    // If end date is before start date or empty, set to start date
    if (!endEl.value || endEl.value < sv) {
      endEl.value = sv;
      advWizard.data.endDate = sv;
    }
  }
}

// ===== FRIENDS SELECTION =====

function advToggleFriend(id, name, el) {
  const idx = advWizard.data.friends.findIndex(f => f.id === id);
  if (idx >= 0) {
    advWizard.data.friends.splice(idx, 1);
    el.classList.remove('sel');
    const checkEl = el.querySelector('.adv-friend-check');
    if (checkEl) checkEl.remove();
  } else {
    advWizard.data.friends.push({ id, name });
    el.classList.add('sel');
    el.insertAdjacentHTML('beforeend', '<div class="adv-friend-check">✓</div>');
  }
  // Sync with global selectedPeopleIds for handlePlanSubmit compatibility
  if (typeof selectedPeopleIds !== 'undefined') {
    selectedPeopleIds = advWizard.data.friends.map(f => f.id);
  }
}

// ===== AI IDEAS =====

async function advGetIdeas() {
  const btn = document.getElementById('advIdeasBtn');
  const list = document.getElementById('advIdeasList');
  if (!btn || !list) return;
  btn.disabled = true;
  btn.textContent = '🤖 Loading...';
  list.innerHTML = '<p class="adv-hint">Asking AI for ideas...</p>';

  const loc = advWizard.data.location.name;
  const cat = advWizard.data.category || 'things to do';

  try {
    // Call AI recommend Lambda
    const tokens = typeof getValidTokens === 'function' ? await getValidTokens() : null;
    if (!tokens?.idToken) { list.innerHTML = '<p class="adv-hint">Please log in to get ideas</p>'; return; }

    const resp = await fetch((typeof CONFIG !== 'undefined' ? CONFIG.API_URL : '') + '/ai-recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tokens.idToken },
      body: JSON.stringify({ category: cat, location: loc })
    });

    if (!resp.ok) throw new Error('AI request failed');
    const data = await resp.json();
    const ideas = data.recommendations || data || [];

    if (ideas.length === 0) {
      list.innerHTML = '<p class="adv-hint">No ideas found. Try a different location.</p>';
      return;
    }

    list.innerHTML = ideas.map((idea, i) => {
      const selected = advWizard.data.subActivities.some(a => a.name === idea.name);
      return `<div class="adv-idea${selected ? ' sel' : ''}" onclick="advToggleIdea(${i}, this)" data-idx="${i}">
        <div class="adv-idea-emoji">${idea.emoji || '📌'}</div>
        <div class="adv-idea-body">
          <div class="adv-idea-name">${escapeHtmlUI(idea.name)}</div>
          <div class="adv-idea-desc">${escapeHtmlUI(idea.description || '')}</div>
          ${idea.distance ? `<div class="adv-idea-dist">${escapeHtmlUI(idea.distance)}</div>` : ''}
        </div>
        <div class="adv-idea-check">${selected ? '✓' : '+'}</div>
      </div>`;
    }).join('');

    // Store ideas for toggle
    window._advIdeas = ideas;
  } catch(e) {
    console.error('AI Ideas error:', e);
    list.innerHTML = '<p class="adv-hint">Failed to get ideas. The AI recommend Lambda may not be deployed yet.</p>';
  } finally {
    btn.disabled = false;
    btn.textContent = '🤖 Get Ideas';
  }
}

function advToggleIdea(idx, el) {
  const ideas = window._advIdeas || [];
  const idea = ideas[idx];
  if (!idea) return;

  const existIdx = advWizard.data.subActivities.findIndex(a => a.name === idea.name);
  if (existIdx >= 0) {
    advWizard.data.subActivities.splice(existIdx, 1);
    el.classList.remove('sel');
    el.querySelector('.adv-idea-check').textContent = '+';
  } else {
    advWizard.data.subActivities.push({ name: idea.name, description: idea.description, emoji: idea.emoji });
    el.classList.add('sel');
    el.querySelector('.adv-idea-check').textContent = '✓';
  }
}

// ===== SAVE ADVENTURE =====

async function advSave() {
  saveAdvStepData();
  const d = advWizard.data;

  if (!d.name && d.location.name) d.name = 'Trip to ' + d.location.name;
  if (!d.name) { toast('Please add an adventure name'); advWizard.step = 2; renderAdvWizard(); return; }

  // Build description with location
  const descParts = [];
  if (d.location.name) descParts.push(d.location.name);
  if (d.notes) descParts.push(d.notes);
  const description = descParts.join(' — ');

  // Build plan data compatible with handlePlanSubmit / createPlan
  const month = d.startDate ? (new Date(d.startDate + 'T00:00:00').getMonth() + 1) : null;
  const yr = typeof currentViewYear !== 'undefined' ? currentViewYear : new Date().getFullYear();

  const planData = {
    type: 'adventure',
    title: d.name,
    description: description,
    year: yr,
    targetMonth: month,
    startDate: d.startDate || null,
    endDate: d.endDate || null,
    category: d.category || null,
    people: advWizard.data.friends.map(f => f.id),
    participants: buildAdvParticipants(),
    ownerName: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : 'Unknown',
    location: d.location.name ? d.location : null,
    subActivities: d.subActivities.length > 0 ? d.subActivities : null
  };

  // Save via app.js createPlan
  const saveBtn = document.querySelector('.adv-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

  try {
    let result = null;
    if (typeof createPlan === 'function') {
      result = await createPlan(planData);
    }

    if (result) {
      plans.push(result);
      localStorage.setItem(`lifestack_plans_${yr}`, JSON.stringify(plans));
      toast('🎉 Adventure created!');
    } else {
      // Local fallback
      const localPlan = { id: 'plan_' + Date.now(), ...planData, status: 'planned', createdAt: new Date().toISOString() };
      plans.push(localPlan);
      localStorage.setItem(`lifestack_plans_${yr}`, JSON.stringify(plans));
      toast('📋 Saved locally!');
    }

    closeAdvWizard();
    // Refresh views
    if (typeof refreshPlanView === 'function') refreshPlanView();
    else { if (typeof buildMG === 'function') buildMG(); if (typeof buildYV === 'function') buildYV(); }
  } catch(e) {
    console.error('Save error:', e);
    toast('Error saving: ' + e.message);
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Adventure'; }
  }
}

function buildAdvParticipants() {
  const friends = (typeof friendships !== 'undefined' && friendships.friends) ? friendships.friends : [];
  return advWizard.data.friends.map(f => {
    const friend = friends.find(fr => fr.odId === f.id);
    if (friend) return { odId: friend.odId, name: friend.name, email: friend.email || '', role: 'participant' };
    return null;
  }).filter(Boolean);
}

// ===== HELPERS =====

function getCatEmoji(cat) {
  const map = { travel:'✈️', food:'🍽️', adventure:'🏔️', roadtrip:'🚗', culture:'🎭', health:'💪', birthday:'🎂', date:'💕', hiking:'🥾', skiing:'⛷️', swimming:'🏊', running:'🏃', concert:'🎸', camping:'⛺' };
  return map[cat] || '🎯';
}

function formatAdvDate(ds) {
  try { const d = new Date(ds + 'T00:00:00'); const m = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return m[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); } catch(e) { return ds; }
}

function escapeHtmlUI(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}