// =====================================================
// LIFESTACK - APP.JS
// =====================================================

// =====================================================
// STATE
// =====================================================
let currentUser = null;
let memories = [];
let plans = [];
let people = [];
let shares = { sent: [], received: [] };
let friendships = { friends: [], pendingReceived: [], pendingSent: [] };
let pendingEmail = '';
let pendingPassword = '';
let pendingName = '';
let currentViewYear = new Date().getFullYear();

// Photo upload state
let selectedPhotos = [];
let uploadedPhotos = [];

// People selection state
let peopleSelectorMode = 'memory'; // 'memory' or 'plan'
let selectedPeopleIds = [];

// Memory filter state
let selectedAdventureFilter = 'all';

// Category state
let selectedCategory = null;

// Bucket List state
let bucketList = [];
let bucketListRecognition = null;
let isBucketListRecording = false;

// Helper function to parse date strings without timezone offset issues
function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  // Handle both "2026-05-02" and "2026-05-02T00:00:00" formats
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

// Predefined adventure categories
const ADVENTURE_CATEGORIES = [
  { id: 'travel', icon: '✈️', name: 'Travel' },
  { id: 'hiking', icon: '🥾', name: 'Hiking' },
  { id: 'camping', icon: '🏕️', name: 'Camping' },
  { id: 'beach', icon: '🏖️', name: 'Beach' },
  { id: 'skiing', icon: '⛷️', name: 'Skiing' },
  { id: 'swimming', icon: '🏊', name: 'Swimming' },
  { id: 'cycling', icon: '🚴', name: 'Cycling' },
  { id: 'running', icon: '🏃', name: 'Running' },
  { id: 'marathon', icon: '🏅', name: 'Marathon' },
  { id: 'climbing', icon: '🧗', name: 'Climbing' },
  { id: 'surfing', icon: '🏄', name: 'Surfing' },
  { id: 'concert', icon: '🎸', name: 'Concert' },
  { id: 'festival', icon: '🎪', name: 'Festival' },
  { id: 'theater', icon: '🎭', name: 'Theater' },
  { id: 'museum', icon: '🏛️', name: 'Museum' },
  { id: 'dining', icon: '🍽️', name: 'Fine Dining' },
  { id: 'cooking', icon: '👨‍🍳', name: 'Cooking Class' },
  { id: 'wine', icon: '🍷', name: 'Wine Tasting' },
  { id: 'spa', icon: '💆', name: 'Spa Day' },
  { id: 'yoga', icon: '🧘', name: 'Yoga Retreat' },
  { id: 'meditation', icon: '🙏', name: 'Meditation' },
  { id: 'photography', icon: '📸', name: 'Photography' },
  { id: 'art', icon: '🎨', name: 'Art Class' },
  { id: 'dance', icon: '💃', name: 'Dancing' },
  { id: 'sports', icon: '⚽', name: 'Sports Game' },
  { id: 'golf', icon: '⛳', name: 'Golf' },
  { id: 'fishing', icon: '🎣', name: 'Fishing' },
  { id: 'sailing', icon: '⛵', name: 'Sailing' },
  { id: 'diving', icon: '🤿', name: 'Scuba Diving' },
  { id: 'skydiving', icon: '🪂', name: 'Skydiving' },
  { id: 'roadtrip', icon: '🚗', name: 'Road Trip' },
  { id: 'wedding', icon: '💒', name: 'Wedding' },
  { id: 'birthday', icon: '🎂', name: 'Birthday' },
  { id: 'anniversary', icon: '💕', name: 'Anniversary' },
  { id: 'graduation', icon: '🎓', name: 'Graduation' },
  { id: 'volunteer', icon: '🤝', name: 'Volunteering' },
  { id: 'learning', icon: '📚', name: 'Learning' },
  { id: 'workshop', icon: '🔧', name: 'Workshop' },
  { id: 'conference', icon: '🎤', name: 'Conference' },
  { id: 'other', icon: '🎯', name: 'Other' }
];

// Custom categories stored in localStorage
let customCategories = JSON.parse(localStorage.getItem('lifestack_custom_categories') || '[]');

// Ensure arrays are always arrays
function ensureArray(data) {
  if (Array.isArray(data)) return data;
  if (data === null || data === undefined) return [];
  return [];
}

// =====================================================
// AUTH API CALLS
// =====================================================

async function apiSignUp(email, password) {
  const response = await fetch(`${CONFIG.API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Signup failed');
  return data;
}

async function apiSignIn(email, password) {
  // DEBUG: Log the request
  console.log('apiSignIn called with:', email);
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    // DEBUG: Show response status
    alert('API Response Status: ' + response.status);
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Login failed');
    return data;
  } catch (error) {
    // DEBUG: Show the actual error
    alert('API Error: ' + error.message);
    throw error;
  }
}

async function apiVerify(email, code, password) {
  const response = await fetch(`${CONFIG.API_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, password })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Verification failed');
  return data;
}

async function apiResendCode(email) {
  const response = await fetch(`${CONFIG.API_URL}/auth/resend-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to resend code');
  return data;
}

// =====================================================
// PLANS API CALLS
// =====================================================

// Helper to get valid tokens (checks expiry, refreshes if needed)
async function getValidTokens() {
  const tokens = JSON.parse(localStorage.getItem('lifestack_tokens') || 'null');
  if (!tokens?.idToken) {
    console.log('No tokens found');
    return null;
  }
  
  // Debug: show token expiry status
  const now = Date.now();
  const expiresIn = tokens.expiresAt ? Math.round((tokens.expiresAt - now) / 1000 / 60) : 'unknown';
  console.log(`Token status: expires in ${expiresIn} minutes, has refreshToken: ${!!tokens.refreshToken}`);
  
  // Check if token is expired (with 5 min buffer)
  // ALSO refresh if expiresAt is NOT set (old tokens from before this feature)
  const needsRefresh = !tokens.expiresAt || (now > tokens.expiresAt - 300000);
  
  if (needsRefresh && tokens.refreshToken) {
    console.log('Token needs refresh (expired or no expiry set), attempting refresh...');
    
    try {
      const response = await fetch(`${CONFIG.API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken })
      });
      
      console.log('Refresh response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Refresh response data:', data);
        // Handle the Lambda's response format: { tokens: { idToken, accessToken } }
        const newTokens = {
          idToken: data.tokens?.idToken || data.idToken,
          accessToken: data.tokens?.accessToken || data.accessToken,
          refreshToken: tokens.refreshToken, // Keep existing refresh token
          expiresAt: Date.now() + 3600000 // 1 hour from now
        };
        localStorage.setItem('lifestack_tokens', JSON.stringify(newTokens));
        console.log('Token refreshed successfully');
        return newTokens;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('Token refresh failed:', errorData);
        showToast('Session expired. Please sign in again.', 'error');
        signOut();
        return null;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      showToast('Session expired. Please sign in again.', 'error');
      signOut();
      return null;
    }
  }
  
  return tokens;
}

async function fetchPlans(year) {
  alert('fetchPlans called for year: ' + year);
  const tokens = await getValidTokens();
  alert('fetchPlans - has tokens: ' + !!tokens?.idToken);
  // Try API first
  if (tokens?.idToken) {
    try {
      const url = `${CONFIG.API_URL}/plans?year=${year}`;
      alert('Fetching plans from: ' + url);
      const response = await fetch(`${CONFIG.API_URL}/plans?year=${year}`, {

        headers: { 'Authorization': `Bearer ${tokens.idToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        alert('Plans fetched: ' + (Array.isArray(data) ? data.length : 'not array'));
        const plansArray = ensureArray(data);
        console.log(`Fetched ${plansArray.length} plans for ${year}:`, 
          plansArray.map(p => `${p.type}: ${p.title}`));
        // Cache to local storage for offline access
        localStorage.setItem(`lifestack_plans_${year}`, JSON.stringify(plansArray));
        return plansArray;
      }
    } catch (error) {
      console.error('Fetch plans error:', error);
    }
  }
  
  // Fallback to local storage
  try {
    const localPlans = localStorage.getItem(`lifestack_plans_${year}`);
    const plansArray = localPlans ? ensureArray(JSON.parse(localPlans)) : [];
    console.log(`Loaded ${plansArray.length} plans from local storage for ${year}`);
    return plansArray;
  } catch (e) {
    return [];
  }
}

// Sync all data from server
async function syncAllData() {
  const syncBtn = document.getElementById('syncBtn');
  if (syncBtn) {
    syncBtn.classList.add('syncing');
    syncBtn.disabled = true;
  }
  
  try {
    console.log('Starting sync for year:', currentViewYear);
    
    // Check tokens
    const tokens = JSON.parse(localStorage.getItem('lifestack_tokens') || 'null');
    console.log('Has tokens:', !!tokens?.idToken);
    
    // Fetch all data in parallel
    const [plansData, memoriesData, peopleData, sharesData, friendshipsData, journalsData] = await Promise.all([
      fetchPlans(currentViewYear),
      fetchMemories(),
      fetchPeople(),
      fetchShares(),
      fetchFriendships(),
      fetchJournalEntries()
    ]);
    
    console.log('Fetched plans:', plansData?.length, plansData?.map(p => `${p.type}: ${p.title}`));
    
    // Debug: Log detailed info for adventures
    console.log('Adventure/Misogi details after fetch:');
    plansData?.filter(p => p.type === 'adventure' || p.type === 'misogi').forEach(p => {
      console.log(`  "${p.title}": year=${p.year} (type: ${typeof p.year}), startDate=${p.startDate}, targetMonth=${p.targetMonth}`);
    });
    
    // Update global state
    plans = plansData || [];
    memories = memoriesData || [];
    people = peopleData || [];
    if (sharesData) shares = sharesData;
    if (friendshipsData) {
      friendships = friendshipsData;
      updateFriendBadge();
    }
    if (journalsData) journalEntries = journalsData;
    
    // Re-render everything
    renderMisogis();
    renderHabits();
    renderMonthGrid();
    renderYearMemories(currentViewYear);
    renderDashboard();
    
    // Refresh month calendar modal if open
    if (currentCalendarMonth) {
      renderMonthCalendarGrid(currentCalendarMonth);
      renderMonthPlansList(currentCalendarMonth);
    }
    
    showToast(`✓ Synced ${plans.length} plans`);
    console.log('Sync complete:', {
      plans: plans.length,
      memories: memories.length,
      people: people.length,
      shares: shares
    });
  } catch (error) {
    console.error('Sync error:', error);
    showToast('Sync failed - check console', 'error');
  } finally {
    if (syncBtn) {
      syncBtn.classList.remove('syncing');
      syncBtn.disabled = false;
    }
  }
}

// Clear local cache and force fresh sync from server
async function clearCacheAndSync() {
  if (!confirm('This will clear cached data and reload from the server. Continue?')) {
    return;
  }
  
  showToast('Clearing cache...');
  
  // Clear all lifestack data from localStorage except tokens and user
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('lifestack_') && 
        !key.includes('tokens') && 
        !key.includes('user')) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log('Removing cached:', key);
    localStorage.removeItem(key);
  });
  
  // Clear in-memory state
  plans = [];
  memories = [];
  people = [];
  shares = { sent: [], received: [] };
  friendships = { friends: [], pendingReceived: [], pendingSent: [] };
  selectedPeopleIds = [];
  
  // Force fresh fetch from server
  await syncAllData();
  
  showToast('✓ Cache cleared and data synced');
}

async function createPlan(planData) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return null;

  try {
    const response = await fetch(`${CONFIG.API_URL}/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify(planData)
    });
    if (response.ok) {
      const result = await response.json();
      console.log('Created plan:', result);
      return result;
    }
  } catch (error) {
    console.error('Create plan error:', error);
  }
  return null;
}

async function updatePlan(planId, updates) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) {
    console.error('updatePlan: No valid tokens');
    return null;
  }

  try {
    console.log('updatePlan: Sending PUT to', `${CONFIG.API_URL}/plans/${planId}`);
    const response = await fetch(`${CONFIG.API_URL}/plans/${planId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify(updates)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('updatePlan: Success', result);
      return result;
    } else {
      const errorText = await response.text();
      console.error('updatePlan: Failed', response.status, errorText);
    }
  } catch (error) {
    console.error('updatePlan: Network error:', error);
  }
  return null;
}

async function deletePlan(planId) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return false;

  try {
    const response = await fetch(`${CONFIG.API_URL}/plans/${planId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    return response.ok;
  } catch (error) {
    console.error('Delete plan error:', error);
  }
  return false;
}

// =====================================================
// BUCKET LIST API CALLS
// =====================================================

async function fetchBucketList() {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return [];
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/bucketlist`, {
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      bucketList = data.items || [];
      localStorage.setItem('lifestack_bucketlist', JSON.stringify(bucketList));
      return bucketList;
    }
  } catch (error) {
    console.error('Fetch bucket list error:', error);
  }
  
  // Fallback to cached
  const cached = localStorage.getItem('lifestack_bucketlist');
  if (cached) {
    bucketList = JSON.parse(cached);
    return bucketList;
  }
  
  return [];
}

async function saveBucketList(items) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return false;
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/bucketlist`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify({ items })
    });
    
    if (response.ok) {
      bucketList = items;
      localStorage.setItem('lifestack_bucketlist', JSON.stringify(items));
      return true;
    }
  } catch (error) {
    console.error('Save bucket list error:', error);
  }
  return false;
}

async function processBucketListWithAI(action, input) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return null;
  
  try {
    const body = action === 'generate' 
      ? { action: 'generate', voiceInput: input }
      : { action: 'modify', modification: input };
    
    const response = await fetch(`${CONFIG.API_URL}/bucketlist/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify(body)
    });
    
    if (response.ok) {
      const data = await response.json();
      bucketList = data.items || [];
      localStorage.setItem('lifestack_bucketlist', JSON.stringify(bucketList));
      return data;
    } else {
      const error = await response.json();
      console.error('AI processing error:', error);
      return { error: error.error || 'AI processing failed' };
    }
  } catch (error) {
    console.error('Process bucket list error:', error);
    return { error: error.message };
  }
}

// =====================================================
// PEOPLE API CALLS
// =====================================================

async function fetchPeople() {
  const tokens = await getValidTokens();
  
  if (tokens?.idToken) {
    try {
      const response = await fetch(`${CONFIG.API_URL}/people`, {
        headers: { 'Authorization': `Bearer ${tokens.idToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        return ensureArray(data);
      }
    } catch (error) {
      console.error('Fetch people error:', error);
    }
  }
  
  // Fallback to local storage
  try {
    return ensureArray(JSON.parse(localStorage.getItem('lifestack_people') || '[]'));
  } catch (e) {
    return [];
  }
}

async function createPerson(personData) {
  const tokens = await getValidTokens();
  
  try {
    if (tokens?.idToken) {
      const response = await fetch(`${CONFIG.API_URL}/people`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.idToken}`
        },
        body: JSON.stringify(personData)
      });
      if (response.ok) {
        return await response.json();
      }
    }
  } catch (error) {
    console.error('Create person error:', error);
  }
  
  // Fallback to local
  const localPerson = {
    id: 'person_' + Date.now(),
    ...personData,
    createdAt: new Date().toISOString()
  };
  people.push(localPerson);
  localStorage.setItem('lifestack_people', JSON.stringify(people));
  return localPerson;
}

async function deletePerson(personId) {
  const tokens = await getValidTokens();
  
  try {
    if (tokens?.idToken) {
      const response = await fetch(`${CONFIG.API_URL}/people/${personId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokens.idToken}` }
      });
      if (response.ok) {
        people = people.filter(p => p.id !== personId);
        return true;
      }
    }
  } catch (error) {
    console.error('Delete person error:', error);
  }
  
  // Fallback to local
  people = people.filter(p => p.id !== personId);
  localStorage.setItem('lifestack_people', JSON.stringify(people));
  return true;
}

// =====================================================
// PHOTO API CALLS
// =====================================================

async function getUploadUrl(fileName, fileType, memoryId) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) {
    console.error('No valid tokens for upload URL');
    return null;
  }

  try {
    console.log('Requesting upload URL for:', { fileName, fileType, memoryId });
    const response = await fetch(`${CONFIG.API_URL}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify({ fileName, fileType, memoryId })
    });
    if (response.ok) {
      const data = await response.json();
      console.log('Got upload URL response:', { key: data.key, hasUploadUrl: !!data.uploadUrl });
      return data;
    } else {
      console.error('Get upload URL failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Get upload URL error:', error);
  }
  return null;
}

async function uploadPhotoToS3(uploadUrl, file, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Upload attempt ${attempt}/${retries} for ${file.name}`);
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
      });
      if (response.ok) {
        return true;
      }
      console.error(`Upload attempt ${attempt} failed with status:`, response.status);
    } catch (error) {
      console.error(`Upload attempt ${attempt} error:`, error);
    }
    // Wait before retry (exponential backoff: 1s, 2s, 4s)
    if (attempt < retries) {
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  return false;
}

// =====================================================
// SHARING API CALLS
// =====================================================

async function fetchShares() {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return { sent: [], received: [] };

  try {
    const response = await fetch(`${CONFIG.API_URL}/shares`, {
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Fetch shares error:', error);
  }
  return { sent: [], received: [] };
}

async function createShare(shareData) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return null;

  try {
    const response = await fetch(`${CONFIG.API_URL}/shares`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify(shareData)
    });
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Create share error:', error);
  }
  return null;
}

async function acceptShare(inviteCode) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) {
    console.log('acceptShare: No valid tokens');
    return null;
  }

  try {
    console.log('Accepting share with invite code:', inviteCode);
    const response = await fetch(`${CONFIG.API_URL}/shares/accept/${inviteCode}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    
    const data = await response.json();
    console.log('Accept share response:', response.status, data);
    
    if (response.ok) {
      return data;
    } else {
      console.error('Accept share failed:', data);
      return null;
    }
  } catch (error) {
    console.error('Accept share error:', error);
  }
  return null;
}

async function deleteShare(shareId) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return false;

  try {
    const response = await fetch(`${CONFIG.API_URL}/shares/${shareId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    return response.ok;
  } catch (error) {
    console.error('Delete share error:', error);
  }
  return false;
}

// =====================================================
// FRIENDS SYSTEM
// =====================================================

// Fetch friendships from API
async function fetchFriendships() {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return { friends: [], pendingReceived: [], pendingSent: [] };

  try {
    const response = await fetch(`${CONFIG.API_URL}/friendships`, {
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      console.log('Fetched friendships:', data);
      return data;
    }
  } catch (error) {
    console.error('Fetch friendships error:', error);
  }
  return { friends: [], pendingReceived: [], pendingSent: [] };
}

// Update notification badge
function updateFriendBadge() {
  const badge = document.getElementById('friendRequestBadge');
  if (!badge) return;
  
  const count = friendships.pendingReceived?.length || 0;
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

// Show friends modal
function showFriendsModal() {
  loadFriendships();
  document.getElementById('friendsModal').classList.add('active');
}

// Close friends modal
function closeFriendsModal() {
  document.getElementById('friendsModal').classList.remove('active');
}

// Load and render friendships
async function loadFriendships() {
  friendships = await fetchFriendships();
  updateFriendBadge();
  renderFriendsList();
}

// Render friends list
function renderFriendsList() {
  // Pending received
  const pendingSection = document.getElementById('pendingRequestsSection');
  const pendingList = document.getElementById('pendingRequestsList');
  
  if (friendships.pendingReceived?.length > 0) {
    pendingSection.classList.remove('hidden');
    pendingList.innerHTML = friendships.pendingReceived.map(req => `
      <div class="friend-request-card">
        <div class="friend-avatar">${getInitials(req.requesterName)}</div>
        <div class="friend-info">
          <div class="friend-name">${escapeHtml(req.requesterName || req.requesterEmail)}</div>
          <div class="friend-detail">${escapeHtml(req.requesterEmail)}</div>
        </div>
        <div class="friend-actions">
          <button class="btn btn-primary btn-small" onclick="acceptFriendRequest('${req.id}')">Accept</button>
          <button class="btn btn-secondary btn-small" onclick="declineFriendRequest('${req.id}')">Decline</button>
        </div>
      </div>
    `).join('');
  } else {
    pendingSection.classList.add('hidden');
  }
  
  // Friends list
  const friendsList = document.getElementById('friendsList');
  if (friendships.friends?.length > 0) {
    friendsList.innerHTML = friendships.friends.map(friend => `
      <div class="friend-card">
        <div class="friend-avatar">${getInitials(friend.name)}</div>
        <div class="friend-info">
          <div class="friend-name">${escapeHtml(friend.name)}</div>
          <div class="friend-detail">
            ${friend.relationshipType ? capitalizeFirst(friend.relationshipType) : ''}
            ${friend.knownSince ? ` · Since ${formatFriendDate(friend.knownSince)}` : ''}
          </div>
        </div>
        <div class="friend-actions">
          <button class="btn btn-secondary btn-small" onclick="editFriend('${friend.id}')">Edit</button>
          <button class="btn btn-danger btn-small" onclick="confirmRemoveFriend('${friend.id}', '${escapeHtml(friend.name)}')">Remove</button>
        </div>
      </div>
    `).join('');
  } else {
    friendsList.innerHTML = '<p class="friends-empty-state">No friends yet. Add someone to get started!</p>';
  }
  
  // Pending sent
  const sentSection = document.getElementById('pendingSentSection');
  const sentList = document.getElementById('pendingSentList');
  
  if (friendships.pendingSent?.length > 0) {
    sentSection.classList.remove('hidden');
    sentList.innerHTML = friendships.pendingSent.map(req => `
      <div class="friend-card">
        <div class="friend-avatar">⏳</div>
        <div class="friend-info">
          <div class="friend-name">${escapeHtml(req.recipientEmail)}</div>
          <div class="friend-detail">Request sent ${formatRelativeTime(req.createdAt)}</div>
        </div>
        <div class="friend-actions">
          <button class="btn btn-secondary btn-small" onclick="cancelFriendRequest('${req.id}')">Cancel</button>
        </div>
      </div>
    `).join('');
  } else {
    sentSection.classList.add('hidden');
  }
}

// Show add friend modal
function showAddFriendModal() {
  // Reset form
  document.getElementById('addFriendForm').reset();
  document.getElementById('friendSearchResult').classList.add('hidden');
  document.getElementById('friendSearchResult').classList.remove('found', 'not-found');
  document.getElementById('friendDetailsSection').classList.add('hidden');
  document.getElementById('smsInviteSection').classList.add('hidden');
  document.getElementById('addFriendBtn').disabled = true;
  document.getElementById('addFriendBtn').textContent = 'Send Friend Request';
  document.getElementById('foundUserId').value = '';
  document.getElementById('foundUserName').value = '';
  
  document.getElementById('addFriendModal').classList.add('active');
}

// Close add friend modal
function closeAddFriendModal() {
  document.getElementById('addFriendModal').classList.remove('active');
}

// Search for user by email
async function searchFriendByEmail() {
  const email = document.getElementById('friendEmail').value.trim();
  if (!email) {
    showToast('Please enter an email address', 'error');
    return;
  }
  
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return;
  
  const resultDiv = document.getElementById('friendSearchResult');
  resultDiv.innerHTML = '<p>Searching...</p>';
  resultDiv.classList.remove('hidden', 'found', 'not-found');
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/users/lookup?email=${encodeURIComponent(email)}`, {
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    
    const data = await response.json();
    console.log('Friend search result:', data);
    
    if (response.ok && data.found) {
      resultDiv.classList.add('found');
      resultDiv.innerHTML = `
        <div class="result-icon">✅</div>
        <div class="result-name">${escapeHtml(data.user.name)}</div>
        <div class="result-email">${escapeHtml(data.user.email)}</div>
      `;
      
      document.getElementById('foundUserId').value = data.user.id;
      document.getElementById('foundUserName').value = data.user.name;
      document.getElementById('friendDetailsSection').classList.remove('hidden');
      document.getElementById('smsInviteSection').classList.add('hidden');
      document.getElementById('addFriendBtn').disabled = false;
      document.getElementById('addFriendBtn').textContent = 'Send Friend Request';
    } else {
      resultDiv.classList.add('not-found');
      resultDiv.innerHTML = `
        <div class="result-icon">❌</div>
        <div class="result-name">No account found</div>
        <div class="result-email">Invite them to join LifeStack?</div>
      `;
      
      document.getElementById('foundUserId').value = '';
      document.getElementById('foundUserName').value = '';
      document.getElementById('friendDetailsSection').classList.remove('hidden');
      document.getElementById('smsInviteSection').classList.remove('hidden');
      document.getElementById('addFriendBtn').disabled = false;
      document.getElementById('addFriendBtn').textContent = 'Send SMS Invite';
    }
    
  } catch (error) {
    console.error('Friend search error:', error);
    resultDiv.classList.add('not-found');
    resultDiv.innerHTML = '<p>Search failed. Please try again.</p>';
  }
}

// Handle add friend form submit
async function handleAddFriend(event) {
  event.preventDefault();
  
  const email = document.getElementById('friendEmail').value.trim();
  const odId = document.getElementById('foundUserId').value;
  const userName = document.getElementById('foundUserName').value;
  const relationshipType = document.getElementById('friendRelationship').value;
  const knownSince = document.getElementById('friendKnownSince').value;
  const notes = document.getElementById('friendNotes').value;
  const phone = document.getElementById('invitePhone')?.value?.trim();
  
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return;
  
  const btn = document.getElementById('addFriendBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  
  try {
    const body = {
      recipientEmail: email,
      recipientId: odId || null,
      recipientName: userName || null,
      relationshipType,
      knownSince: knownSince || null,
      notes: notes || null,
      invitedPhone: phone || null
    };
    
    const response = await fetch(`${CONFIG.API_URL}/friendships`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify(body)
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showToast(data.message || 'Friend request sent!');
      closeAddFriendModal();
      loadFriendships();
      
      // If SMS invite, show the invite info
      if (data.inviteCode && phone) {
        const smsText = `Hey! Join me on LifeStack to plan our adventures together. Download the app and use invite code: ${data.inviteCode}`;
        alert(`Send this text to ${phone}:\n\n${smsText}`);
      }
    } else {
      showToast(data.error || 'Failed to send request', 'error');
      btn.disabled = false;
      btn.textContent = odId ? 'Send Friend Request' : 'Send SMS Invite';
    }
    
  } catch (error) {
    console.error('Add friend error:', error);
    showToast('Failed to send request', 'error');
    btn.disabled = false;
    btn.textContent = odId ? 'Send Friend Request' : 'Send SMS Invite';
  }
}

// Accept friend request
async function acceptFriendRequest(friendshipId) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return;
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/friendships/${friendshipId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify({ action: 'accept' })
    });
    
    if (response.ok) {
      showToast('🎉 Friend request accepted!');
      loadFriendships();
    } else {
      const data = await response.json();
      showToast(data.error || 'Failed to accept request', 'error');
    }
  } catch (error) {
    console.error('Accept friend error:', error);
    showToast('Failed to accept request', 'error');
  }
}

// Decline friend request
async function declineFriendRequest(friendshipId) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return;
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/friendships/${friendshipId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify({ action: 'decline' })
    });
    
    if (response.ok) {
      showToast('Request declined');
      loadFriendships();
    }
  } catch (error) {
    console.error('Decline friend error:', error);
  }
}

// Cancel sent request
async function cancelFriendRequest(friendshipId) {
  if (!confirm('Cancel this friend request?')) return;
  
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return;
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/friendships/${friendshipId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    
    if (response.ok) {
      showToast('Request cancelled');
      loadFriendships();
    }
  } catch (error) {
    console.error('Cancel friend error:', error);
  }
}

// Confirm remove friend
function confirmRemoveFriend(friendshipId, friendName) {
  if (confirm(`Remove ${friendName} from your friends? You'll no longer see each other's shared adventures.`)) {
    removeFriend(friendshipId);
  }
}

// Remove friend
async function removeFriend(friendshipId) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return;
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/friendships/${friendshipId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    
    if (response.ok) {
      showToast('Friend removed');
      loadFriendships();
    }
  } catch (error) {
    console.error('Remove friend error:', error);
  }
}

// Edit friend (relationship details)
function editFriend(friendshipId) {
  const friend = friendships.friends.find(f => f.id === friendshipId);
  if (!friend) return;
  
  // For now, use prompts. Could create a modal later.
  const newType = prompt('Relationship type (spouse, family, friend, colleague, other):', friend.relationshipType || 'friend');
  if (newType === null) return;
  
  const newNotes = prompt('Notes:', friend.notes || '');
  if (newNotes === null) return;
  
  updateFriendship(friendshipId, { 
    relationshipType: newType, 
    notes: newNotes 
  });
}

// Update friendship
async function updateFriendship(friendshipId, updates) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return;
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/friendships/${friendshipId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify(updates)
    });
    
    if (response.ok) {
      showToast('Updated');
      loadFriendships();
    }
  } catch (error) {
    console.error('Update friendship error:', error);
  }
}

// Helper: Get initials
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

// Helper: Capitalize first letter
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Helper: Format relative time
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

// Helper: Format friend date
function formatFriendDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

// =====================================================
// AUTH HANDLERS
// =====================================================

async function handleSignIn(event) {
  event.preventDefault();
  alert('Sign in started. API URL: ' + CONFIG.API_URL);

  const emailEl = document.getElementById('signInEmail');
  const passwordEl = document.getElementById('signInPassword');
  const btn = document.getElementById('signInBtn');
  const errorDiv = document.getElementById('signInError');

  // Guard (prevents iOS “silent halt” if an element is missing)
  if (!emailEl || !passwordEl || !btn || !errorDiv) {
    alert('Sign-in UI is missing required elements (signInEmail/signInPassword/signInBtn/signInError).');
    return;
  }

  const email = emailEl.value;
  const password = passwordEl.value;

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  errorDiv.classList.add('hidden');

  try {
    const result = await apiSignIn(email, password);

    // IMPORTANT: Clear ALL old cached data BEFORE storing new tokens
    console.log('Sign in successful, clearing previous cache...');
    localStorage.removeItem('lifestack_user');
    localStorage.removeItem('lifestack_memories');
    localStorage.removeItem('lifestack_people');
    localStorage.removeItem('lifestack_friendships');
    localStorage.removeItem('lifestack_plans');

    // Clear year-specific plan caches
    for (let year = 2020; year <= 2035; year++) {
      localStorage.removeItem(`lifestack_plans_${year}`);
      localStorage.removeItem(`lifestack_theme_${year}`);
    }

    // Reset in-memory state (only if these globals exist)
    if (typeof memories !== 'undefined') memories = [];
    if (typeof plans !== 'undefined') plans = [];
    if (typeof people !== 'undefined') people = [];
    if (typeof friendships !== 'undefined') friendships = { friends: [], pendingReceived: [], pendingSent: [] };
    if (typeof shares !== 'undefined') shares = { sent: [], received: [] };
    if (typeof selectedPeopleIds !== 'undefined') selectedPeopleIds = [];
    if (typeof currentUser !== 'undefined') currentUser = null;

    // Store new tokens
    localStorage.setItem(
      'lifestack_tokens',
      JSON.stringify({
        idToken: result.tokens.idToken,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresAt: Date.now() + result.tokens.expiresIn * 1000
      })
    );

    localStorage.setItem(
      'lifestack_auth',
      JSON.stringify({ email: result.email, userId: result.userId })
    );

    // Wrap UI calls so a missing DOM element doesn’t crash iOS builds
    try {
      if (typeof closeAllModals === 'function') closeAllModals();
    } catch (e) {
      console.log('closeAllModals error:', e);
    }

    try {
      if (typeof loadUserData === 'function') {
        await loadUserData();
      } else {
        alert('loadUserData() is not defined.');
      }
    } catch (e) {
      console.log('loadUserData error:', e);
      alert('loadUserData failed: ' + (e?.message || e));
    }
  } catch (error) {
    if (error?.message && error.message.includes('verify')) {
      pendingEmail = email;
      pendingPassword = password;
      if (typeof showVerifyModal === 'function') showVerifyModal();
    } else {
      errorDiv.textContent = error?.message || String(error);
      errorDiv.classList.remove('hidden');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}


async function handleSignUp(event) {
  event.preventDefault();
  const firstName = document.getElementById('signUpFirstName').value;
  const lastName = document.getElementById('signUpLastName').value;
  const email = document.getElementById('signUpEmail').value;
  const password = document.getElementById('signUpPassword').value;
  const btn = document.getElementById('signUpBtn');
  const errorDiv = document.getElementById('signUpError');
  
  btn.disabled = true;
  btn.textContent = 'Creating account...';
  errorDiv.classList.add('hidden');

  try {
    await apiSignUp(email, password);
    pendingEmail = email;
    pendingPassword = password;
    pendingName = `${firstName} ${lastName}`;
    showVerifyModal();
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Account';
  }
}

async function handleVerify(event) {
  event.preventDefault();
  const codeInputs = document.querySelectorAll('.code-input');
  const code = Array.from(codeInputs).map(input => input.value).join('');
  const btn = document.getElementById('verifyBtn');
  const errorDiv = document.getElementById('verifyError');
  const successDiv = document.getElementById('verifySuccess');
  
  if (code.length !== 6) {
    errorDiv.textContent = 'Please enter the 6-digit code';
    errorDiv.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verifying...';
  errorDiv.classList.add('hidden');
  successDiv.classList.add('hidden');

  try {
    const result = await apiVerify(pendingEmail, code, pendingPassword);
    if (result.tokens) {
      localStorage.setItem('lifestack_tokens', JSON.stringify({
        idToken: result.tokens.idToken,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresAt: Date.now() + (3600 * 1000)
      }));
      if (pendingName) localStorage.setItem('lifestack_pending_name', pendingName);
      closeAllModals();
      await loadUserData();
    } else {
      successDiv.textContent = 'Email verified! Please sign in.';
      successDiv.classList.remove('hidden');
      setTimeout(() => showSignInModal(), 2000);
    }
  } catch (error) {
    errorDiv.textContent = error.message;
    errorDiv.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify Email';
  }
}

async function resendCode() {
  try {
    await apiResendCode(pendingEmail);
    showToast('Verification code sent!');
  } catch (error) {
    showError(error.message);
  }
}

// =====================================================
// AUTO LOGOUT AFTER INACTIVITY
// =====================================================

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
let lastActivityTime = Date.now();
let inactivityCheckInterval = null;

function updateActivityTime() {
  lastActivityTime = Date.now();
}

function checkInactivity() {
  const tokens = localStorage.getItem('lifestack_tokens');
  if (!tokens) return; // Not logged in, skip check
  
  const timeSinceActivity = Date.now() - lastActivityTime;
  
  if (timeSinceActivity >= INACTIVITY_TIMEOUT) {
    console.log('Auto logout due to inactivity');
    showToast('Session expired due to inactivity');
    signOut();
  }
}

function startInactivityMonitor() {
  // Update activity on user interactions
  const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
  events.forEach(event => {
    document.addEventListener(event, updateActivityTime, { passive: true });
  });
  
  // Check for inactivity every minute
  if (inactivityCheckInterval) clearInterval(inactivityCheckInterval);
  inactivityCheckInterval = setInterval(checkInactivity, 60 * 1000);
  
  // Initial activity timestamp
  updateActivityTime();
  
  console.log('Inactivity monitor started (30 min timeout)');
}

function stopInactivityMonitor() {
  if (inactivityCheckInterval) {
    clearInterval(inactivityCheckInterval);
    inactivityCheckInterval = null;
  }
}

function signOut() {
  // Stop inactivity monitor
  stopInactivityMonitor();
  
  // Clear all localStorage
  localStorage.removeItem('lifestack_tokens');
  localStorage.removeItem('lifestack_auth');
  localStorage.removeItem('lifestack_user');
  localStorage.removeItem('lifestack_memories');
  localStorage.removeItem('lifestack_plans');
  localStorage.removeItem('lifestack_people');
  localStorage.removeItem('lifestack_friendships');
  
  // Clear all in-memory state
  currentUser = null;
  memories = [];
  plans = [];
  people = [];
  friendships = { friends: [], pendingReceived: [], pendingSent: [] };
  shares = { sent: [], received: [] };
  selectedPeopleIds = [];
  selectedPhotos = [];
  uploadedPhotos = [];
  
  showLanding();
}

// =====================================================
// VERIFICATION CODE INPUT
// =====================================================

function handleCodeInput(input) {
  const value = input.value;
  
  // Handle paste of full code (6 digits)
  if (value.length > 1) {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    const inputs = document.querySelectorAll('.code-input');
    digits.split('').forEach((digit, i) => {
      if (inputs[i]) inputs[i].value = digit;
    });
    // Focus last filled or submit
    const lastIndex = Math.min(digits.length - 1, 5);
    if (inputs[lastIndex]) inputs[lastIndex].focus();
    // If all 6 digits entered, auto-submit after short delay
    if (digits.length === 6) {
      setTimeout(() => document.getElementById('verifyBtn')?.click(), 300);
    }
    return;
  }
  
  // Only allow digits
  input.value = value.replace(/\D/g, '');
  
  if (input.value && input.value.length === 1) {
    const index = parseInt(input.dataset.index);
    const nextInput = document.querySelector(`.code-input[data-index="${index + 1}"]`);
    if (nextInput) nextInput.focus();
    
    // Auto-submit if last digit entered
    if (index === 5) {
      const allFilled = Array.from(document.querySelectorAll('.code-input')).every(i => i.value);
      if (allFilled) {
        setTimeout(() => document.getElementById('verifyBtn')?.click(), 300);
      }
    }
  }
}

function handleCodeKeydown(event, input) {
  if (event.key === 'Backspace' && !input.value) {
    const index = parseInt(input.dataset.index);
    const prevInput = document.querySelector(`.code-input[data-index="${index - 1}"]`);
    if (prevInput) { prevInput.focus(); prevInput.value = ''; }
  }
}

// Handle paste on any code input
document.addEventListener('paste', function(e) {
  const activeEl = document.activeElement;
  if (activeEl && activeEl.classList.contains('code-input')) {
    e.preventDefault();
    const pastedData = (e.clipboardData || window.clipboardData).getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
    const inputs = document.querySelectorAll('.code-input');
    digits.split('').forEach((digit, i) => {
      if (inputs[i]) inputs[i].value = digit;
    });
    if (digits.length === 6) {
      setTimeout(() => document.getElementById('verifyBtn')?.click(), 300);
    }
  }
});

// =====================================================
// MODAL MANAGEMENT
// =====================================================

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active'));
}

function showSignInModal() {
  closeAllModals();
  document.getElementById('signInError').classList.add('hidden');
  document.getElementById('signInForm').reset();
  document.getElementById('signInModal').classList.add('active');
}

function showSignUpModal() {
  closeAllModals();
  document.getElementById('signUpError').classList.add('hidden');
  document.getElementById('signUpForm').reset();
  document.getElementById('signUpModal').classList.add('active');
}

function showVerifyModal() {
  closeAllModals();
  document.getElementById('verifyError').classList.add('hidden');
  document.getElementById('verifySuccess').classList.add('hidden');
  document.getElementById('verifyEmailDisplay').textContent = pendingEmail;
  document.querySelectorAll('.code-input').forEach(input => input.value = '');
  document.getElementById('verifyModal').classList.add('active');
  document.querySelector('.code-input[data-index="0"]').focus();
}

function showMemoryModal(memoryToEdit = null) {
  document.getElementById('memoryForm').reset();
  document.getElementById('memoryId').value = '';
  
  // Default to today's date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('memoryDate').value = today;
  
  selectedPhotos = [];
  uploadedPhotos = [];
  selectedPeopleIds = [];
  document.getElementById('photoPreview').innerHTML = '';
  
  // If an adventure is selected, pre-link it
  const planSelector = document.getElementById('memoryPlanId');
  
  // Check if this is a shared memory (tagged but not owned)
  const isSharedMemory = memoryToEdit && memoryToEdit.isShared === true;
  
  // Get or create shared memory info element
  let sharedInfoEl = document.getElementById('sharedMemoryInfo');
  if (!sharedInfoEl) {
    // Create it dynamically if not in HTML
    const modalBody = document.querySelector('#memoryModal .modal-body');
    sharedInfoEl = document.createElement('div');
    sharedInfoEl.id = 'sharedMemoryInfo';
    sharedInfoEl.style.display = 'none';
    modalBody.insertBefore(sharedInfoEl, modalBody.firstChild);
  }
  
  if (memoryToEdit) {
    // Edit mode
    document.getElementById('memoryId').value = memoryToEdit.id;
    document.getElementById('memoryTitle').value = memoryToEdit.title;
    document.getElementById('memoryDate').value = memoryToEdit.occurredAt;
    document.getElementById('memoryText').value = memoryToEdit.text || '';
    document.getElementById('memoryTags').value = (memoryToEdit.tags || []).join(', ');
    selectedPeopleIds = memoryToEdit.people || [];
    
    // Set location if exists
    if (memoryToEdit.location) {
      document.getElementById('memoryLocation').value = memoryToEdit.location.name || '';
      document.getElementById('memoryLat').value = memoryToEdit.location.lat || '';
      document.getElementById('memoryLng').value = memoryToEdit.location.lng || '';
      if (document.getElementById('memoryPlaceId')) {
        document.getElementById('memoryPlaceId').value = memoryToEdit.location.placeId || '';
      }
      document.getElementById('locationClearBtn').style.display = memoryToEdit.location.name ? 'flex' : 'none';
    } else {
      clearLocationFields();
    }
    
    // Show existing photos
    if (memoryToEdit.photos && memoryToEdit.photos.length > 0) {
      uploadedPhotos = memoryToEdit.photos;
      renderExistingPhotos();
    }
    
    // Handle shared memory - show owner info and limit editing
    if (isSharedMemory) {
      document.getElementById('memoryModalTitle').textContent = '👤 Shared Memory';
      document.getElementById('saveMemoryBtn').style.display = 'none'; // Can't edit
      document.getElementById('deleteMemoryBtn').style.display = 'none'; // Can't delete
      
      // Disable all form fields
      document.getElementById('memoryTitle').disabled = true;
      document.getElementById('memoryDate').disabled = true;
      document.getElementById('memoryText').disabled = true;
      document.getElementById('memoryTags').disabled = true;
      document.getElementById('photoUploadArea').style.display = 'none';
      
      // Show shared memory info banner
      sharedInfoEl.innerHTML = `
        <div style="background: #e8f4fd; padding: 12px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #4a90d9;">
          <strong>👤 Shared by ${escapeHtml(memoryToEdit.ownerName || 'a friend')}</strong>
          <p style="margin: 4px 0 0 0; font-size: 0.9em; color: #666;">
            This memory was shared with you. You can view it but not edit.
          </p>
        </div>
      `;
      sharedInfoEl.style.display = 'block';
      
      // Hide people selector for shared memories
      document.querySelector('#memoryModal .form-group:has(#memoryPeopleGrid)')?.classList.add('hidden');
    } else {
      // Regular edit mode
      document.getElementById('memoryModalTitle').textContent = 'Edit Memory';
      document.getElementById('saveMemoryBtn').textContent = 'Update Memory';
      document.getElementById('saveMemoryBtn').style.display = 'block';
      document.getElementById('deleteMemoryBtn').style.display = 'block';
      
      // Enable all form fields
      document.getElementById('memoryTitle').disabled = false;
      document.getElementById('memoryDate').disabled = false;
      document.getElementById('memoryText').disabled = false;
      document.getElementById('memoryTags').disabled = false;
      document.getElementById('photoUploadArea').style.display = '';
      
      // Hide shared info
      sharedInfoEl.style.display = 'none';
      
      // Show people selector
      document.querySelector('#memoryModal .form-group:has(#memoryPeopleGrid)')?.classList.remove('hidden');
    }
    
    // Set plan link after populating
    populatePlanSelector();
    if (planSelector) planSelector.value = memoryToEdit.planId || '';
  } else {
    // Create mode
    document.getElementById('memoryModalTitle').textContent = 'Capture a Memory';
    document.getElementById('saveMemoryBtn').textContent = 'Save Memory';
    document.getElementById('saveMemoryBtn').style.display = 'block';
    document.getElementById('deleteMemoryBtn').style.display = 'none';
    
    // Enable all form fields
    document.getElementById('memoryTitle').disabled = false;
    document.getElementById('memoryDate').disabled = false;
    document.getElementById('memoryText').disabled = false;
    document.getElementById('memoryTags').disabled = false;
    document.getElementById('photoUploadArea').style.display = '';
    
    // Clear location fields
    clearLocationFields();
    
    // Hide shared info
    sharedInfoEl.style.display = 'none';
    
    // Show people selector
    document.querySelector('#memoryModal .form-group:has(#memoryPeopleGrid)')?.classList.remove('hidden');
    
    populatePlanSelector();
    
    // Pre-select adventure if filter is active
    if (selectedAdventureFilter !== 'all' && planSelector) {
      planSelector.value = selectedAdventureFilter;
    }
  }
  
  renderMemoryPeopleGrid();
  document.getElementById('memoryModal').classList.add('active');
}

function renderExistingPhotos() {
  const preview = document.getElementById('photoPreview');
  preview.innerHTML = uploadedPhotos.map((photo, idx) => `
    <div class="photo-preview-item">
      <img src="${photo.url}" alt="Photo" onclick="openMemoryPhotos(${idx})">
      <button type="button" class="remove-photo" onclick="event.stopPropagation(); removeExistingPhoto(${idx})">×</button>
    </div>
  `).join('');
}

// Open lightbox for photos in memory modal
function openMemoryPhotos(startIndex = 0) {
  if (uploadedPhotos.length === 0) return;
  
  const title = document.getElementById('memoryTitle')?.value || 'Photo';
  const date = document.getElementById('memoryDate')?.value || '';
  
  openMemoryPhotoLightbox(uploadedPhotos, startIndex, title, date);
}

function removeExistingPhoto(index) {
  uploadedPhotos.splice(index, 1);
  renderExistingPhotos();
}

function closeMemoryModal() {
  document.getElementById('memoryModal').classList.remove('active');
  document.getElementById('memoryForm').reset();
  document.getElementById('memoryId').value = '';
  clearLocationFields();
  selectedPhotos = [];
  uploadedPhotos = [];
  selectedPeopleIds = [];
}

// =====================================================
// LOCATION / GEO-TAGGING
// =====================================================

function captureLocation() {
  const btn = document.getElementById('locationBtn');
  const status = document.getElementById('locationStatus');
  
  if (!navigator.geolocation) {
    status.textContent = 'Geolocation not supported by your browser';
    status.className = 'location-status error';
    return;
  }
  
  // Show loading state
  btn.classList.add('loading');
  status.textContent = 'Getting your location...';
  status.className = 'location-status loading';
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      // Store coordinates
      document.getElementById('memoryLat').value = lat;
      document.getElementById('memoryLng').value = lng;
      
      // Reverse geocode to get place name
      try {
        status.textContent = 'Finding location name...';
        const placeName = await reverseGeocode(lat, lng);
        document.getElementById('memoryLocation').value = placeName;
        document.getElementById('locationClearBtn').style.display = 'flex';
        status.textContent = '✓ Location captured';
        status.className = 'location-status success';
      } catch (error) {
        // Still save coords even if geocoding fails
        document.getElementById('memoryLocation').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        document.getElementById('locationClearBtn').style.display = 'flex';
        status.textContent = '✓ Coordinates saved';
        status.className = 'location-status success';
      }
      
      btn.classList.remove('loading');
    },
    (error) => {
      btn.classList.remove('loading');
      let errorMsg = 'Unable to get location';
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMsg = 'Location permission denied. Please allow location access.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMsg = 'Location unavailable. Try again.';
          break;
        case error.TIMEOUT:
          errorMsg = 'Location request timed out. Try again.';
          break;
      }
      
      status.textContent = errorMsg;
      status.className = 'location-status error';
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // Cache for 5 minutes
    }
  );
}

async function reverseGeocode(lat, lng) {
  // Use free Nominatim API for reverse geocoding
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`,
    { headers: { 'User-Agent': 'LifeStack App' } }
  );
  
  if (!response.ok) throw new Error('Geocoding failed');
  
  const data = await response.json();
  
  // Build a nice place name from the response
  const address = data.address || {};
  const parts = [];
  
  // Try to get meaningful location parts
  if (address.tourism || address.amenity || address.building) {
    parts.push(address.tourism || address.amenity || address.building);
  }
  if (address.neighbourhood || address.suburb) {
    parts.push(address.neighbourhood || address.suburb);
  }
  if (address.city || address.town || address.village) {
    parts.push(address.city || address.town || address.village);
  }
  if (address.state) {
    parts.push(address.state);
  }
  
  // If we got good data, use it; otherwise fall back to display_name
  if (parts.length >= 2) {
    return parts.slice(0, 3).join(', ');
  }
  
  // Fall back to shortened display name
  if (data.display_name) {
    const displayParts = data.display_name.split(',').slice(0, 3);
    return displayParts.join(',').trim();
  }
  
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function clearLocation() {
  clearLocationFields();
  document.getElementById('locationStatus').textContent = '';
}

function clearLocationFields() {
  document.getElementById('memoryLocation').value = '';
  document.getElementById('memoryLat').value = '';
  document.getElementById('memoryLng').value = '';
  if (document.getElementById('memoryPlaceId')) {
    document.getElementById('memoryPlaceId').value = '';
  }
  document.getElementById('locationClearBtn').style.display = 'none';
  document.getElementById('locationStatus').textContent = '';
  document.getElementById('locationStatus').className = 'location-status';
  hideLocationDropdown();
}

function getLocationData() {
  const name = document.getElementById('memoryLocation').value.trim();
  const lat = document.getElementById('memoryLat').value;
  const lng = document.getElementById('memoryLng').value;
  const placeId = document.getElementById('memoryPlaceId')?.value;
  
  if (!name && !lat && !lng) return null;
  
  return {
    name: name || null,
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
    placeId: placeId || null
  };
}

// =====================================================
// LOCATION AUTOCOMPLETE (using Photon/OpenStreetMap - free)
// =====================================================

let locationSearchTimeout = null;
let currentAutocompleteIndex = -1;

function initLocationAutocomplete() {
  const input = document.getElementById('memoryLocation');
  const dropdown = document.getElementById('locationAutocomplete');
  
  if (!input || !dropdown) return;
  
  // Handle input changes
  input.addEventListener('input', function() {
    const query = this.value.trim();
    clearTimeout(locationSearchTimeout);
    
    if (query.length < 2) {
      hideLocationDropdown();
      return;
    }
    
    // Debounce search
    locationSearchTimeout = setTimeout(() => {
      searchLocations(query);
    }, 300);
    
    // Show clear button
    document.getElementById('locationClearBtn').style.display = 'flex';
  });
  
  // Handle keyboard navigation
  input.addEventListener('keydown', function(e) {
    const items = dropdown.querySelectorAll('.location-autocomplete-item');
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentAutocompleteIndex = Math.min(currentAutocompleteIndex + 1, items.length - 1);
      updateAutocompleteSelection(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentAutocompleteIndex = Math.max(currentAutocompleteIndex - 1, -1);
      updateAutocompleteSelection(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentAutocompleteIndex >= 0 && items[currentAutocompleteIndex]) {
        items[currentAutocompleteIndex].click();
      }
    } else if (e.key === 'Escape') {
      hideLocationDropdown();
    }
  });
  
  // Hide dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.location-autocomplete-container')) {
      hideLocationDropdown();
    }
  });
}

async function searchLocations(query) {
  const dropdown = document.getElementById('locationAutocomplete');
  
  // Show loading
  dropdown.innerHTML = '<div class="location-autocomplete-loading">Searching...</div>';
  dropdown.classList.add('active');
  currentAutocompleteIndex = -1;
  
  try {
    // Use Photon API (OpenStreetMap-based, free, no API key)
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`,
      { headers: { 'Accept': 'application/json' } }
    );
    
    if (!response.ok) throw new Error('Search failed');
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      dropdown.innerHTML = '<div class="location-autocomplete-empty">No locations found</div>';
      return;
    }
    
    dropdown.innerHTML = data.features.map((feature, index) => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates; // [lng, lat]
      
      // Build display name
      const name = props.name || '';
      const addressParts = [];
      if (props.street) addressParts.push(props.street);
      if (props.city) addressParts.push(props.city);
      if (props.state) addressParts.push(props.state);
      if (props.country) addressParts.push(props.country);
      const address = addressParts.join(', ');
      
      // Determine icon based on type
      let icon = '📍';
      if (props.osm_value === 'restaurant' || props.osm_value === 'cafe') icon = '🍽️';
      else if (props.osm_value === 'hotel') icon = '🏨';
      else if (props.osm_value === 'park') icon = '🌳';
      else if (props.osm_value === 'museum') icon = '🏛️';
      else if (props.osm_value === 'airport') icon = '✈️';
      else if (props.osm_key === 'place') icon = '🏙️';
      
      return `
        <div class="location-autocomplete-item" 
             data-name="${escapeHtml(name || address)}"
             data-address="${escapeHtml(address)}"
             data-lat="${coords[1]}"
             data-lng="${coords[0]}"
             data-place-id="${props.osm_id || ''}"
             onclick="selectLocation(this)">
          <span class="location-autocomplete-icon">${icon}</span>
          <div class="location-autocomplete-text">
            <div class="location-autocomplete-name">${escapeHtml(name || address.split(',')[0])}</div>
            ${address ? `<div class="location-autocomplete-address">${escapeHtml(address)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('Location search error:', error);
    dropdown.innerHTML = '<div class="location-autocomplete-empty">Search failed. Try again.</div>';
  }
}

function selectLocation(element) {
  const name = element.dataset.name;
  const address = element.dataset.address;
  const lat = element.dataset.lat;
  const lng = element.dataset.lng;
  const placeId = element.dataset.placeId;
  
  // Set display name (prefer name, fall back to address)
  const displayName = name || address;
  document.getElementById('memoryLocation').value = displayName;
  document.getElementById('memoryLat').value = lat;
  document.getElementById('memoryLng').value = lng;
  if (document.getElementById('memoryPlaceId')) {
    document.getElementById('memoryPlaceId').value = placeId;
  }
  
  document.getElementById('locationClearBtn').style.display = 'flex';
  document.getElementById('locationStatus').textContent = '✓ Location selected';
  document.getElementById('locationStatus').className = 'location-status success';
  
  hideLocationDropdown();
}

function updateAutocompleteSelection(items) {
  items.forEach((item, i) => {
    item.classList.toggle('selected', i === currentAutocompleteIndex);
  });
  
  if (currentAutocompleteIndex >= 0 && items[currentAutocompleteIndex]) {
    items[currentAutocompleteIndex].scrollIntoView({ block: 'nearest' });
  }
}

function hideLocationDropdown() {
  const dropdown = document.getElementById('locationAutocomplete');
  if (dropdown) {
    dropdown.classList.remove('active');
    dropdown.innerHTML = '';
  }
  currentAutocompleteIndex = -1;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
  initLocationAutocomplete();
});

function formatLocationDisplay(location) {
  if (!location) return '';
  if (location.name) return location.name;
  if (location.lat && location.lng) return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  return '';
}

function getLocationMapUrl(location) {
  if (!location || (!location.lat && !location.name)) return null;
  
  if (location.lat && location.lng) {
    return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  }
  if (location.name) {
    return `https://www.google.com/maps/search/${encodeURIComponent(location.name)}`;
  }
  return null;
}

// =====================================================
// PHOTO HANDLING WITH COMPRESSION
// =====================================================

const PHOTO_MAX_SIZE = 1600; // Max width or height in pixels
const PHOTO_QUALITY = 0.8;   // JPEG quality (0-1)

function handlePhotoSelect(event) {
  const files = Array.from(event.target.files);
  files.forEach(file => {
    if (file.type.startsWith('image/')) {
      selectedPhotos.push(file);
      addPhotoPreview(file);
    }
  });
}

function addPhotoPreview(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const preview = document.getElementById('photoPreview');
    const div = document.createElement('div');
    div.className = 'photo-preview-item';
    const idx = selectedPhotos.length - 1;
    div.innerHTML = `
      <img src="${e.target.result}" alt="Preview" onclick="previewNewPhoto(${idx})">
      <button type="button" class="remove-photo" onclick="event.stopPropagation(); removePhoto(${idx})">×</button>
    `;
    preview.appendChild(div);
  };
  reader.readAsDataURL(file);
}

// Preview new (not yet uploaded) photos
function previewNewPhoto(index) {
  if (index < 0 || index >= selectedPhotos.length) return;
  
  // Read all selected photos as data URLs for preview
  const previewPromises = selectedPhotos.map(file => {
    return new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve({ url: e.target.result });
      reader.readAsDataURL(file);
    });
  });
  
  Promise.all(previewPromises).then(photos => {
    const title = document.getElementById('memoryTitle')?.value || 'New Photo';
    const date = document.getElementById('memoryDate')?.value || new Date().toISOString().split('T')[0];
    openMemoryPhotoLightbox(photos, index, title, date);
  });
}

function removePhoto(index) {
  selectedPhotos.splice(index, 1);
  renderPhotoPreview();
}

function renderPhotoPreview() {
  const preview = document.getElementById('photoPreview');
  preview.innerHTML = '';
  selectedPhotos.forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const div = document.createElement('div');
      div.className = 'photo-preview-item';
      div.innerHTML = `
        <img src="${e.target.result}" alt="Preview" onclick="previewNewPhoto(${index})">
        <button type="button" class="remove-photo" onclick="event.stopPropagation(); removePhoto(${index})">×</button>
      `;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

// Compress image before upload
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    // Skip compression for small files (under 500KB) or non-JPEG/PNG
    if (file.size < 500 * 1024 && !file.type.includes('heic')) {
      console.log(`Skipping compression for ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      resolve(file);
      return;
    }
    
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      let { width, height } = img;
      
      // Calculate new dimensions maintaining aspect ratio
      if (width > PHOTO_MAX_SIZE || height > PHOTO_MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * PHOTO_MAX_SIZE) / width);
          width = PHOTO_MAX_SIZE;
        } else {
          width = Math.round((width * PHOTO_MAX_SIZE) / height);
          height = PHOTO_MAX_SIZE;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Draw with white background (for transparent PNGs)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Create new file with same name but compressed
            const compressedFile = new File([blob], file.name, { 
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            const savings = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
            console.log(`Compressed ${file.name}: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB (${savings}% reduction)`);
            
            resolve(compressedFile);
          } else {
            // Fallback to original if compression fails
            resolve(file);
          }
        },
        'image/jpeg',
        PHOTO_QUALITY
      );
    };
    
    img.onerror = () => {
      console.warn(`Could not compress ${file.name}, using original`);
      resolve(file);
    };
    
    // Read file as data URL
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

async function uploadPhotos(memoryId) {
  if (selectedPhotos.length === 0) return [];
  
  const progressBar = document.getElementById('uploadProgressBar');
  const progressContainer = document.getElementById('uploadProgress');
  progressContainer.classList.remove('hidden');
  
  console.log('Starting photo upload for memory:', memoryId, 'Total photos:', selectedPhotos.length);
  
  const uploaded = [];
  const failed = [];
  
  for (let i = 0; i < selectedPhotos.length; i++) {
    let file = selectedPhotos[i];
    console.log(`Processing photo ${i + 1}/${selectedPhotos.length}:`, file.name, file.type, `${(file.size / 1024).toFixed(1)}KB`);
    
    try {
      // Compress the image first
      showToast(`Compressing photo ${i + 1}/${selectedPhotos.length}...`);
      file = await compressImage(file);
      
      const urlData = await getUploadUrl(file.name, file.type, memoryId);
      
      if (urlData) {
        console.log('Got upload URL for:', file.name);
        showToast(`Uploading photo ${i + 1}/${selectedPhotos.length}...`);
        const success = await uploadPhotoToS3(urlData.uploadUrl, file);
        if (success) {
          console.log('Successfully uploaded:', file.name);
          uploaded.push({ key: urlData.key, url: urlData.viewUrl });
        } else {
          console.error('Failed to upload to S3 after retries:', file.name);
          failed.push(file.name);
        }
      } else {
        console.error('Failed to get upload URL for:', file.name);
        failed.push(file.name);
      }
    } catch (error) {
      console.error('Upload error for', file.name, ':', error);
      failed.push(file.name);
    }
    
    // Update progress
    const percent = ((i + 1) / selectedPhotos.length) * 100;
    progressBar.style.width = percent + '%';
  }
  
  console.log('Photo upload complete. Successful:', uploaded.length, 'of', selectedPhotos.length);
  progressContainer.classList.add('hidden');
  
  // Notify user of failed uploads
  if (failed.length > 0) {
    const failedNames = failed.length <= 3 ? failed.join(', ') : `${failed.slice(0, 3).join(', ')} and ${failed.length - 3} more`;
    showError(`Failed to upload ${failed.length} photo(s): ${failedNames}. They were not saved.`);
  }
  
  return uploaded;
}

// Drag and drop
document.addEventListener('DOMContentLoaded', function() {
  const uploadArea = document.getElementById('photoUploadArea');
  if (uploadArea) {
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragging');
    });
    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragging');
    });
    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragging');
      const files = Array.from(e.dataTransfer.files);
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          selectedPhotos.push(file);
          addPhotoPreview(file);
        }
      });
    });
  }
  
  // Set end date minimum to start date when start date changes
  const startDateInput = document.getElementById('planStartDate');
  const endDateInput = document.getElementById('planEndDate');
  if (startDateInput && endDateInput) {
    startDateInput.addEventListener('change', function() {
      if (this.value) {
        endDateInput.min = this.value;
        // If end date is before start date, clear it
        if (endDateInput.value && endDateInput.value < this.value) {
          endDateInput.value = '';
        }
      } else {
        endDateInput.min = '';
      }
    });
  }
});

// =====================================================
// PEOPLE MANAGEMENT
// =====================================================

async function showPeopleSelector(mode) {
  peopleSelectorMode = mode;
  
  // Update modal title and button based on mode
  const titleEl = document.getElementById('peopleSelectorTitle');
  const subtitleEl = document.getElementById('peopleSelectorSubtitle');
  const addBtn = document.getElementById('addPersonBtn');
  
  if (mode === 'plan') {
    titleEl.textContent = 'Tag Friends';
    subtitleEl.textContent = 'Who\'s part of this adventure?';
    addBtn.textContent = '+ Add Friend';
    addBtn.onclick = function() { closePeopleSelector(); showAddFriendModal(); };
    
    // Ensure friendships are loaded
    if (!friendships.friends || friendships.friends.length === 0) {
      // Show loading state
      document.getElementById('peopleList').innerHTML = '<p style="text-align: center; padding: 2rem;">Loading friends...</p>';
      document.getElementById('peopleSelectorModal').classList.add('active');
      
      // Fetch friendships
      friendships = await fetchFriendships();
      updateFriendBadge();
    }
  } else {
    titleEl.textContent = 'Select People';
    subtitleEl.textContent = 'Who was involved?';
    addBtn.textContent = '+ Add New Person';
    addBtn.onclick = function() { showAddPersonModal(); };
  }
  
  renderPeopleList();
  document.getElementById('peopleSelectorModal').classList.add('active');
}

// Handle add person button click (context-aware)
function handleAddPersonFromSelector() {
  if (peopleSelectorMode === 'plan') {
    closePeopleSelector();
    showAddFriendModal();
  } else {
    showAddPersonModal();
  }
}

function closePeopleSelector() {
  document.getElementById('peopleSelectorModal').classList.remove('active');
}

function renderPeopleList() {
  const list = document.getElementById('peopleList');
  
  // For plans, show FRIENDS (users with accounts)
  if (peopleSelectorMode === 'plan') {
    // Use friends from friendships system
    const friends = friendships.friends || [];
    
    console.log('renderPeopleList - friends:', friends);
    
    if (friends.length === 0) {
      list.innerHTML = `
        <div style="text-align: center; color: var(--sage-600); padding: 2rem;">
          <p style="margin-bottom: 1rem;">No friends yet</p>
          <p style="font-size: 0.875rem;">Add friends first, then you can tag them on adventures.</p>
          <button class="btn btn-primary btn-small" style="margin-top: 1rem;" onclick="closePeopleSelector(); showAddFriendModal();">
            👥 Add Friends
          </button>
        </div>
      `;
      return;
    }
    
    list.innerHTML = friends.map(friend => {
      // Use ONLY odId - this is the friend's Cognito user ID
      const friendUserId = friend.odId;
      
      if (!friendUserId) {
        console.warn('Friend missing odId, skipping:', friend.name);
        return '';
      }
      
      const friendEmail = friend.email || '';
      const isSelected = selectedPeopleIds.includes(friendUserId);
      
      console.log('Friend:', friend.name, 'odId:', friendUserId, 'selected:', isSelected);
      
      return `
        <div class="people-list-item ${isSelected ? 'selected' : ''}" onclick="togglePersonSelection('${friendUserId}', '${escapeHtml(friend.name)}')">
          <span class="avatar">${getInitials(friend.name)}</span>
          <div class="people-list-item-info">
            <span class="people-list-item-name">${escapeHtml(friend.name)}</span>
            <span class="people-list-item-detail">${capitalizeFirst(friend.relationshipType || 'Friend')}${friendEmail ? ' · ' + escapeHtml(friendEmail) : ''}</span>
          </div>
          ${isSelected ? '<span class="check-mark">✓</span>' : ''}
        </div>
      `;
    }).filter(html => html).join('');
    return;
  }
  
  // For memories, show all people (non-account people) AND friends
  const allPeople = [];
  
  // Add friends first
  (friendships.friends || []).forEach(friend => {
    const friendUserId = friend.odId;
    if (!friendUserId) {
      console.warn('Friend missing odId in memory mode, skipping:', friend.name);
      return;
    }
    allPeople.push({
      id: friendUserId,
      name: friend.name,
      avatar: getInitials(friend.name),
      detail: capitalizeFirst(friend.relationshipType || 'Friend'),
      isFriend: true
    });
  });
  
  // Add regular people (non-account)
  (people || []).forEach(person => {
    allPeople.push({
      id: person.id,
      name: person.name,
      avatar: person.avatar || '🧑',
      detail: person.knownSince ? `Known for ${getTimeSince(person.knownSince)}` : '',
      isFriend: false
    });
  });
  
  if (allPeople.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: var(--sage-600); padding: 2rem;">No people added yet</p>';
    return;
  }
  
  list.innerHTML = allPeople.map(person => {
    const isSelected = selectedPeopleIds.includes(person.id);
    return `
      <div class="people-list-item ${isSelected ? 'selected' : ''}" onclick="togglePersonSelection('${person.id}', '${escapeHtml(person.name)}')">
        <span class="avatar">${person.avatar}</span>
        <div class="people-list-item-info">
          <span class="people-list-item-name">${escapeHtml(person.name)}${person.isFriend ? ' 👤' : ''}</span>
          ${person.detail ? `<span class="people-list-item-detail">${person.detail}</span>` : ''}
        </div>
        ${isSelected ? '<span class="check-mark">✓</span>' : ''}
      </div>
    `;
  }).join('');
}

function togglePersonSelection(personId, personName) {
  const index = selectedPeopleIds.indexOf(personId);
  if (index > -1) {
    selectedPeopleIds.splice(index, 1);
  } else {
    selectedPeopleIds.push(personId);
  }
  renderPeopleList();
}

function confirmPeopleSelection() {
  closePeopleSelector();
  if (peopleSelectorMode === 'memory') {
    renderMemoryPeopleGrid();
  } else {
    renderPlanPeopleGrid();
  }
}

function renderMemoryPeopleGrid() {
  const grid = document.getElementById('memoryPeopleGrid');
  
  // Get selected people from both friends and regular people
  const friends = friendships.friends || [];
  const selectedFriends = friends.filter(f => {
    const friendUserId = f.odId;
    return friendUserId && selectedPeopleIds.includes(friendUserId);
  });
  const selectedPeople = people.filter(p => selectedPeopleIds.includes(p.id));
  
  let html = '';
  
  // Render selected friends
  html += selectedFriends.map(f => {
    const friendUserId = f.odId;
    return `
      <div class="person-chip selected">
        <span class="person-avatar">${getInitials(f.name)}</span>
        <span class="person-name">${escapeHtml(f.name)}</span>
        <button type="button" class="person-remove" onclick="removePersonFromSelection('${friendUserId}', 'memory')">×</button>
      </div>
    `;
  }).join('');
  
  // Render selected regular people
  html += selectedPeople.map(p => `
    <div class="person-chip selected">
      <span class="person-avatar">${p.avatar || '🧑'}</span>
      <span class="person-name">${escapeHtml(p.name)}</span>
      <button type="button" class="person-remove" onclick="removePersonFromSelection('${p.id}', 'memory')">×</button>
    </div>
  `).join('');
  
  html += `<div class="add-person-chip" onclick="showPeopleSelector('memory')">+ Add people</div>`;
  grid.innerHTML = html;
}

function renderPlanPeopleGrid() {
  const grid = document.getElementById('planPeopleGrid');
  
  // Get selected friends from friendships
  const friends = friendships.friends || [];
  const selectedFriends = friends.filter(f => {
    const friendUserId = f.odId;
    return friendUserId && selectedPeopleIds.includes(friendUserId);
  });
  
  let html = selectedFriends.map(f => {
    const friendUserId = f.odId;
    return `
      <div class="person-chip selected">
        <span class="person-avatar">${getInitials(f.name)}</span>
        <span class="person-name">${escapeHtml(f.name)}</span>
        <button type="button" class="person-remove" onclick="removePersonFromSelection('${friendUserId}', 'plan')">×</button>
      </div>
    `;
  }).join('');
  
  html += `<div class="add-person-chip" onclick="showPeopleSelector('plan')">+ Add people</div>`;
  grid.innerHTML = html;
}

function removePersonFromSelection(personId, mode) {
  selectedPeopleIds = selectedPeopleIds.filter(id => id !== personId);
  if (mode === 'memory') {
    renderMemoryPeopleGrid();
  } else {
    renderPlanPeopleGrid();
  }
}

function showAddPersonModal() {
  document.getElementById('addPersonForm').reset();
  document.getElementById('personKnownSince').value = '';
  document.getElementById('personBirthdate').value = '';
  // Reset avatar selection
  document.querySelectorAll('.avatar-option').forEach(btn => btn.classList.remove('selected'));
  document.querySelector('.avatar-option[data-avatar="👨"]').classList.add('selected');
  // Reset relationship selection
  document.querySelectorAll('.relationship-option').forEach(btn => btn.classList.remove('selected'));
  document.querySelector('.relationship-option[data-rel="friend"]').classList.add('selected');
  
  document.getElementById('addPersonModal').classList.add('active');
}

function closeAddPersonModal() {
  document.getElementById('addPersonModal').classList.remove('active');
}

function showManagePeopleModal() {
  renderManagePeopleList();
  document.getElementById('managePeopleModal').classList.add('active');
}

function closeManagePeopleModal() {
  document.getElementById('managePeopleModal').classList.remove('active');
}

function renderManagePeopleList() {
  const list = document.getElementById('managePeopleList');
  
  if (people.length === 0) {
    list.innerHTML = '<p style="text-align: center; color: var(--sage-600); padding: 2rem;">No people added yet</p>';
    return;
  }
  
  list.innerHTML = people.map(person => {
    const knownFor = person.knownSince ? getTimeSince(person.knownSince) : '';
    return `
      <div class="people-list-item">
        <span class="avatar">${person.avatar || '🧑'}</span>
        <div class="info">
          <div class="name">${escapeHtml(person.name)}</div>
          <div class="relationship">${person.relationship || 'Friend'}${knownFor ? ` · ${knownFor}` : ''}</div>
        </div>
        <button class="btn btn-small btn-danger" onclick="handleDeletePerson('${person.id}')">Delete</button>
      </div>
    `;
  }).join('');
}

function getTimeSince(dateStr) {
  if (!dateStr) return '';
  const start = new Date(dateStr);
  const now = new Date();
  const years = Math.floor((now - start) / (365.25 * 24 * 60 * 60 * 1000));
  if (years < 1) {
    const months = Math.floor((now - start) / (30 * 24 * 60 * 60 * 1000));
    return months <= 1 ? 'Just met' : `${months} months`;
  }
  return years === 1 ? '1 year' : `${years} years`;
}

async function handleAddPerson(event) {
  event.preventDefault();
  
  const name = document.getElementById('personName').value;
  const avatar = document.querySelector('.avatar-option.selected')?.dataset.avatar || '🧑';
  const relationship = document.querySelector('.relationship-option.selected')?.dataset.rel || 'friend';
  const knownSince = document.getElementById('personKnownSince').value || null;
  const birthdate = document.getElementById('personBirthdate').value || null;
  const notes = document.getElementById('personNotes').value || '';
  
  const newPerson = await createPerson({ name, avatar, relationship, knownSince, birthdate, notes });
  
  if (newPerson) {
    if (!people.find(p => p.id === newPerson.id)) {
      people.push(newPerson);
    }
    closeAddPersonModal();
    renderPeopleList();
    renderManagePeopleList();
    showToast('Person added!');
  }
}

async function handleDeletePerson(personId) {
  if (!confirm('Are you sure you want to remove this person?')) return;
  
  await deletePerson(personId);
  renderManagePeopleList();
  showToast('Person removed');
}

// Avatar and relationship picker handlers
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('avatar-option')) {
    document.querySelectorAll('.avatar-option').forEach(btn => btn.classList.remove('selected'));
    e.target.classList.add('selected');
  }
  if (e.target.classList.contains('relationship-option')) {
    document.querySelectorAll('.relationship-option').forEach(btn => btn.classList.remove('selected'));
    e.target.classList.add('selected');
  }
});

function showAddPlanModal(type, month = null) {
  document.getElementById('planId').value = '';
  document.getElementById('planType').value = type;
  document.getElementById('planTitle').value = '';
  document.getElementById('planDescription').value = '';
  document.getElementById('planStartDate').value = '';
  document.getElementById('planEndDate').value = '';
  document.getElementById('planCategory').value = '';
  selectedPeopleIds = [];
  selectedCategory = null;
  renderPlanPeopleGrid();
  
  // Reset category display
  document.getElementById('selectedCategoryIcon').textContent = '🎯';
  document.getElementById('selectedCategoryName').textContent = 'Select category...';
  
  const dateGroup = document.getElementById('dateSelectorGroup');
  const peopleGroup = document.getElementById('planPeopleGroup');
  const categoryGroup = document.getElementById('categoryPickerGroup');
  
  if (type === 'habit') {
    dateGroup.classList.add('hidden');
    peopleGroup.classList.add('hidden');
    categoryGroup.classList.add('hidden');
    document.getElementById('planTargetQuarter').value = month || 1;
    document.getElementById('planTargetMonth').value = '';
    document.getElementById('planModalTitle').textContent = `Add Q${month} Habit`;
  } else {
    dateGroup.classList.remove('hidden');
    peopleGroup.classList.remove('hidden');
    categoryGroup.classList.remove('hidden');
    document.getElementById('planTargetQuarter').value = '';
    
    if (month) {
      document.getElementById('planTargetMonth').value = month;
      // Set default start date to first day of that month
      const startDate = `${currentViewYear}-${String(month).padStart(2, '0')}-01`;
      document.getElementById('planStartDate').value = startDate;
      // Set end date minimum to start date
      document.getElementById('planEndDate').min = startDate;
    } else {
      // Clear end date minimum
      document.getElementById('planEndDate').min = '';
    }
    
    document.getElementById('planModalTitle').textContent = type === 'misogi' ? 'Add Misogi' : 'Add Adventure';
  }
  
  document.getElementById('planSubmitBtn').textContent = 'Save Plan';
  document.getElementById('deletePlanBtn').style.display = 'none';
  document.getElementById('planModal').classList.add('active');
}

function showEditPlanModal(planId) {
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;
  
  const isSharedAdventure = plan.type === 'shared-adventure';
  
  document.getElementById('planId').value = plan.id;
  document.getElementById('planType').value = isSharedAdventure ? 'adventure' : plan.type;
  document.getElementById('planTitle').value = plan.title;
  document.getElementById('planDescription').value = plan.description || '';
  document.getElementById('planStartDate').value = plan.startDate || plan.targetDate || '';
  document.getElementById('planEndDate').value = plan.endDate || '';
  
  // Set end date minimum to start date
  const startDateVal = document.getElementById('planStartDate').value;
  document.getElementById('planEndDate').min = startDateVal || '';
  
  document.getElementById('planTargetMonth').value = plan.targetMonth || '';
  document.getElementById('planTargetQuarter').value = plan.targetQuarter || '';
  document.getElementById('planCategory').value = plan.category || '';
  
  // Set category display
  selectedCategory = plan.category || null;
  if (plan.category) {
    const cat = getAllCategories().find(c => c.id === plan.category);
    if (cat) {
      document.getElementById('selectedCategoryIcon').textContent = cat.icon;
      document.getElementById('selectedCategoryName').textContent = cat.name;
    }
  } else {
    document.getElementById('selectedCategoryIcon').textContent = '🎯';
    document.getElementById('selectedCategoryName').textContent = 'Select category...';
  }
  
  // Load people/participants
  // Handle both old format (people: [id1, id2]) and new format (participants: [{odId, name}])
  if (plan.participants && plan.participants.length > 0) {
    selectedPeopleIds = plan.participants.map(p => p.odId);
  } else {
    selectedPeopleIds = plan.people || [];
  }
  renderPlanPeopleGrid();
  
  const dateGroup = document.getElementById('dateSelectorGroup');
  const peopleGroup = document.getElementById('planPeopleGroup');
  const categoryGroup = document.getElementById('categoryPickerGroup');
  
  if (plan.type === 'habit') {
    dateGroup.classList.add('hidden');
    peopleGroup.classList.add('hidden');
    categoryGroup.classList.add('hidden');
  } else {
    dateGroup.classList.remove('hidden');
    peopleGroup.classList.remove('hidden');
    categoryGroup.classList.remove('hidden');
  }
  
  document.getElementById('planModalTitle').textContent = `Edit ${plan.type === 'misogi' ? 'Misogi' : plan.type === 'habit' ? 'Habit' : 'Adventure'}`;
  document.getElementById('planSubmitBtn').textContent = 'Update Plan';
  document.getElementById('deletePlanBtn').style.display = 'block';
  
  // Handle shared adventures - show owner info and limit editing
  const sharedInfoEl = document.getElementById('sharedAdventureInfo');
  if (isSharedAdventure) {
    document.getElementById('planModalTitle').textContent = '👤 Shared Adventure';
    document.getElementById('planSubmitBtn').textContent = 'Update My Copy';
    document.getElementById('deletePlanBtn').style.display = 'none'; // Can't delete someone else's adventure
    
    // Disable editing of title, dates (these come from the owner)
    document.getElementById('planTitle').disabled = true;
    document.getElementById('planStartDate').disabled = true;
    document.getElementById('planEndDate').disabled = true;
    document.getElementById('planDescription').disabled = true;
    
    // Show shared adventure info
    if (sharedInfoEl) {
      sharedInfoEl.innerHTML = `
        <div style="background: #e8f4fd; padding: 12px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid #4a90d9;">
          <strong>👤 Shared by ${escapeHtml(plan.originalOwnerName || 'a friend')}</strong>
          <p style="margin: 4px 0 0 0; font-size: 0.9em; color: #666;">
            This adventure was shared with you. You can mark it complete independently.
          </p>
        </div>
      `;
      sharedInfoEl.style.display = 'block';
    }
    
    // Hide people selector for shared adventures
    document.getElementById('planPeopleGroup').classList.add('hidden');
  } else {
    // Reset for regular adventures
    document.getElementById('planTitle').disabled = false;
    document.getElementById('planStartDate').disabled = false;
    document.getElementById('planEndDate').disabled = false;
    document.getElementById('planDescription').disabled = false;
    
    if (sharedInfoEl) {
      sharedInfoEl.style.display = 'none';
    }
  }
  
  document.getElementById('planModal').classList.add('active');
}

// Category Picker Functions
function getAllCategories() {
  return [...ADVENTURE_CATEGORIES, ...customCategories];
}

function showCategoryPicker() {
  renderCategoryGrid();
  document.getElementById('categorySearch').value = '';
  document.getElementById('customCategoryInput').classList.add('hidden');
  document.getElementById('categoryPickerModal').classList.add('active');
}

function closeCategoryPicker() {
  document.getElementById('categoryPickerModal').classList.remove('active');
}

function renderCategoryGrid(filter = '') {
  const grid = document.getElementById('categoryGrid');
  const allCategories = getAllCategories();
  const filtered = filter 
    ? allCategories.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))
    : allCategories;
  
  grid.innerHTML = filtered.map(cat => `
    <div class="category-item ${selectedCategory === cat.id ? 'selected' : ''}" onclick="selectCategory('${cat.id}')">
      <span class="category-item-icon">${cat.icon}</span>
      <span class="category-item-name">${cat.name}</span>
    </div>
  `).join('');
}

function filterCategories() {
  const search = document.getElementById('categorySearch').value;
  renderCategoryGrid(search);
}

function selectCategory(categoryId) {
  const cat = getAllCategories().find(c => c.id === categoryId);
  if (!cat) return;
  
  selectedCategory = categoryId;
  document.getElementById('planCategory').value = categoryId;
  document.getElementById('selectedCategoryIcon').textContent = cat.icon;
  document.getElementById('selectedCategoryName').textContent = cat.name;
  closeCategoryPicker();
}

function showCustomCategoryInput() {
  document.getElementById('customCategoryInput').classList.remove('hidden');
  document.getElementById('customCategoryName').focus();
}

function addCustomCategory() {
  const name = document.getElementById('customCategoryName').value.trim();
  const icon = document.getElementById('customCategoryIcon').value.trim() || '🏷️';
  
  if (!name) {
    showError('Please enter a category name');
    return;
  }
  
  const id = 'custom_' + Date.now();
  const newCategory = { id, icon, name };
  
  customCategories.push(newCategory);
  localStorage.setItem('lifestack_custom_categories', JSON.stringify(customCategories));
  
  // Select the new category
  selectCategory(id);
  
  // Clear inputs
  document.getElementById('customCategoryName').value = '';
  document.getElementById('customCategoryIcon').value = '';
  document.getElementById('customCategoryInput').classList.add('hidden');
}

function getCategoryIcon(categoryId) {
  if (!categoryId) return '🎯';
  const cat = getAllCategories().find(c => c.id === categoryId);
  return cat ? cat.icon : '🎯';
}

function closePlanModal() {
  document.getElementById('planModal').classList.remove('active');
  document.getElementById('planForm').reset();
  document.getElementById('planEndDate').min = ''; // Clear end date minimum
  selectedCategory = null;
}

async function confirmDeletePlan(planId) {
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;
  
  if (!confirm(`Delete "${plan.title}"? This cannot be undone.`)) return;
  
  await executeDeletePlan(planId);
}

async function deletePlanFromModal() {
  const planId = document.getElementById('planId').value;
  if (!planId) return;
  
  const plan = plans.find(p => p.id === planId);
  if (!plan) return;
  
  if (!confirm(`Delete "${plan.title}"? This cannot be undone.`)) return;
  
  closePlanModal();
  await executeDeletePlan(planId);
}

async function executeDeletePlan(planId) {
  try {
    await deletePlan(planId);
    
    // Remove from local state
    plans = plans.filter(p => p.id !== planId);
    localStorage.setItem(`lifestack_plans_${currentViewYear}`, JSON.stringify(plans));
    
    // Refresh UI
    renderMisogis();
    renderHabits();
    renderMonthGrid();
    populateMemoryFilter();
    
    // If month calendar is open, refresh it instead of closing
    if (currentCalendarMonth) {
      renderMonthCalendarGrid(currentCalendarMonth);
      renderMonthPlansList(currentCalendarMonth);
    }
    
    showToast('Plan deleted');
  } catch (error) {
    console.error('Delete plan error:', error);
    // Delete locally anyway
    plans = plans.filter(p => p.id !== planId);
    localStorage.setItem(`lifestack_plans_${currentViewYear}`, JSON.stringify(plans));
    renderMisogis();
    renderHabits();
    renderMonthGrid();
    
    // If month calendar is open, refresh it
    if (currentCalendarMonth) {
      renderMonthCalendarGrid(currentCalendarMonth);
      renderMonthPlansList(currentCalendarMonth);
    }
    
    showToast('Plan deleted locally');
  }
}

function showYearModal(year, calendarYear) {
  document.getElementById('yearModalTitle').textContent = `Year ${year}`;
  document.getElementById('yearModalSubtitle').textContent = `Calendar Year ${calendarYear}`;
  
  const yearMemories = memories.filter(m => m.year === year);
  const list = document.getElementById('yearMemoriesList');
  
  if (yearMemories.length === 0) {
    list.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--sage-600);"><p>No memories from this year yet</p><button class="btn btn-primary mt-4" onclick="closeYearModal(); showMemoryModal();">Add a Memory</button></div>`;
  } else {
    list.innerHTML = yearMemories.map(memory => {
      const date = new Date(memory.occurredAt);
      return `<div class="memory-card" style="margin-bottom: 1rem;"><div class="memory-date"><div class="memory-date-day">${date.getDate()}</div><div class="memory-date-month">${date.toLocaleString('default', { month: 'short' })}</div></div><div class="memory-content"><h3>${escapeHtml(memory.title)}</h3><p>${escapeHtml(memory.text || '')}</p></div></div>`;
    }).join('');
  }
  document.getElementById('yearModal').classList.add('active');
}

function closeYearModal() {
  document.getElementById('yearModal').classList.remove('active');
}

// =====================================================
// VIEW MANAGEMENT
// =====================================================

function hideLoading() {
  document.getElementById('loadingScreen').classList.add('hidden');
}

function showLanding() {
  hideLoading();
  var el;
  el = document.getElementById('landing'); if (el) el.classList.remove('hidden');
  el = document.getElementById('onboarding'); if (el) el.classList.add('hidden');
  el = document.getElementById('app'); if (el) el.classList.add('hidden');
}

function showOnboarding() {
  hideLoading();
  var el;
  el = document.getElementById('landing'); if (el) el.classList.add('hidden');
  el = document.getElementById('onboarding'); if (el) el.classList.remove('hidden');
  el = document.getElementById('app'); if (el) el.classList.add('hidden');
  var nameEl = document.getElementById('name');
  if (nameEl) {
    const savedName = localStorage.getItem('lifestack_pending_name');
    if (savedName) {
      nameEl.value = savedName;
      localStorage.removeItem('lifestack_pending_name');
    }
  }
}

function showApp() {
  hideLoading();
  var el;
  el = document.getElementById('landing'); if (el) el.classList.add('hidden');
  el = document.getElementById('onboarding'); if (el) el.classList.add('hidden');
  el = document.getElementById('app'); if (el) el.classList.remove('hidden');
  
  try { updateAvatarDisplay(); } catch(e) { console.log('Avatar error:', e); }
  
  startInactivityMonitor();
  openCurrentYearDesign();
}

function switchView(view) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  
  var ids = ['dashboardView', 'yearDesignView', 'yearReviewView', 'yearLockedView', 'settingsView', 'journalView'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  
  if (view === 'dashboard') {
    var el = document.getElementById('dashboardView'); if (el) el.classList.remove('hidden');
    try { renderDashboard(); } catch(e) { console.log('Dashboard error:', e); }
  } else if (view === 'settings') {
    var el = document.getElementById('settingsView'); if (el) el.classList.remove('hidden');
    try { renderSettings(); } catch(e) { console.log('Settings error:', e); }
  } else if (view === 'journal') {
    var el = document.getElementById('journalView'); if (el) el.classList.remove('hidden');
    try { renderJournalEntries(); } catch(e) { console.log('Journal error:', e); }
  }
}

// =====================================================
// YEAR VIEW LOGIC
// =====================================================

function getYearViewMode(calendarYear) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  if (calendarYear < currentYear) {
    return 'review';
  } else if (calendarYear === currentYear) {
    return 'design';
  } else {
    // Future year - check if unlocked (December)
    if (calendarYear === currentYear + 1 && currentMonth === 12) {
      return 'design';
    }
    return 'locked';
  }
}

async function openYearView(ageYear, calendarYear) {
  currentViewYear = calendarYear;
  const mode = getYearViewMode(calendarYear);
  
  // Hide all views first (with null checks)
  var ids = ['dashboardView', 'yearDesignView', 'yearReviewView', 'yearLockedView', 'settingsView', 'journalView'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.classList.add('hidden');
  });
  
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  
  if (mode === 'design') {
    await showDesignView(calendarYear);
  } else if (mode === 'review') {
    await showReviewView(calendarYear);
  } else {
    showLockedView(calendarYear);
  }
}

function openCurrentYearDesign() {
  alert('openCurrentYearDesign: starting');
  
  const currentYear = new Date().getFullYear();
  alert('openCurrentYearDesign: year = ' + currentYear);
  
  const birthYear = new Date(currentUser.birthdate).getFullYear();
  alert('openCurrentYearDesign: birthYear = ' + birthYear + ', currentUser = ' + (currentUser ? 'exists' : 'NULL'));
  
  const age = currentYear - birthYear;
  alert('openCurrentYearDesign: age = ' + age);
  
  openYearView(age, currentYear);
}

async function showDesignView(year) {
  var el;
  el = document.getElementById('designYear'); if (el) el.textContent = year;
  el = document.getElementById('yearDesignView'); if (el) el.classList.remove('hidden');
  
  document.querySelector('.nav-item[data-view="yearDesign"]')?.classList.add('active');
  
  plans = await fetchPlans(year);
  
  try { loadYearTheme(); } catch(e) { alert('Theme error: ' + e.message); }
  try { renderMisogis(); } catch(e) { alert('Misogi error: ' + e.message); }
  try { renderHabits(); } catch(e) { alert('Habits error: ' + e.message); }
  try { renderMonthGrid(); } catch(e) { alert('MonthGrid error: ' + e.message); }
  try { renderYearMemories(year); } catch(e) { alert('Memories error: ' + e.message); }
  
  alert('showDesignView COMPLETE');
}

async function showReviewView(year) {
  var el;
  el = document.getElementById('reviewYear'); if (el) el.textContent = year;
  el = document.getElementById('reviewYearBtn'); if (el) el.textContent = year;
  el = document.getElementById('yearReviewView'); if (el) el.classList.remove('hidden');
  
  plans = await fetchPlans(year);
  
  const yearMemories = ensureArray(memories).filter(m => {
    const memYear = new Date(m.occurredAt).getFullYear();
    return memYear === year;
  });
  
  const completedMisogis = plans.filter(p => p.type === 'misogi' && p.status === 'completed').length;
  const totalAdventures = plans.filter(p => p.type === 'adventure').length;
  const completedAdventures = plans.filter(p => p.type === 'adventure' && p.status === 'completed').length;
  const totalHabits = plans.filter(p => p.type === 'habit').length;
  const completedHabits = plans.filter(p => p.type === 'habit' && p.status === 'completed').length;
  
  el = document.getElementById('reviewMisogiCount'); if (el) el.textContent = completedMisogis;
  el = document.getElementById('reviewAdventureCount'); if (el) el.textContent = `${completedAdventures}/${totalAdventures || 6}`;
  el = document.getElementById('reviewHabitCount'); if (el) el.textContent = `${completedHabits}/${totalHabits || 4}`;
  el = document.getElementById('reviewMemoryCount'); if (el) el.textContent = yearMemories.length;
  
  try { renderReviewContent(year); } catch(e) { console.log('Review content error:', e); }
}

function showLockedView(year) {
  var el;
  const currentYear = new Date().getFullYear();
  el = document.getElementById('lockedYear'); if (el) el.textContent = year;
  el = document.getElementById('lockedYearMsg'); if (el) el.textContent = year;
  el = document.getElementById('unlockDate'); if (el) el.textContent = `December ${year - 1}`;
  el = document.getElementById('currentYearBtn'); if (el) el.textContent = currentYear;
  el = document.getElementById('yearLockedView'); if (el) el.classList.remove('hidden');
}

function goToCurrentYear() {
  openCurrentYearDesign();
}

// =====================================================
// DATA LOADING
// =====================================================

async function loadUserData() {
  alert('loadUserData started');
  const storedTokens = JSON.parse(localStorage.getItem('lifestack_tokens') || 'null');
  const auth = JSON.parse(localStorage.getItem('lifestack_auth') || 'null');
  alert('Has tokens: ' + !!storedTokens + ', Has auth: ' + !!auth);
  if (!storedTokens || !auth) { showLanding(); return; }

  const savedUser = localStorage.getItem('lifestack_user');
  if (savedUser) {
    const cachedUser = JSON.parse(savedUser);
    
    // IMPORTANT: Verify cached user matches the logged-in Cognito user
    if (cachedUser.email && auth.email && cachedUser.email.toLowerCase() !== auth.email.toLowerCase()) {
      console.log('Cached user mismatch! Clearing cache. Cached:', cachedUser.email, 'Auth:', auth.email);
      // Clear all user-specific cache - wrong user cached
      localStorage.removeItem('lifestack_user');
      localStorage.removeItem('lifestack_memories');
      localStorage.removeItem('lifestack_people');
      localStorage.removeItem('lifestack_friendships');
      localStorage.removeItem('lifestack_plans');
      // Clear year-specific plan caches
      for (let year = 2020; year <= 2035; year++) {
        localStorage.removeItem(`lifestack_plans_${year}`);
      }
      // Reset in-memory state
      memories = [];
      plans = [];
      people = [];
      friendships = { friends: [], pendingReceived: [], pendingSent: [] };
      // Now fetch fresh data for the correct user
      const tokens = await getValidTokens();
      if (!tokens) { showLanding(); return; }
      await fetchAndSetUserData(tokens);
    } else {
      // Cached user matches - use it
      currentUser = cachedUser;
      loadLocalMemories();
      loadLocalPeople();
      // Also load friendships
      friendships = await fetchFriendships();
      updateFriendBadge();
      showApp();
    }
  } else {
    // No cached user - fetch from API
    const tokens = await getValidTokens();
    if (!tokens) { showLanding(); return; }
    await fetchAndSetUserData(tokens);
  }
}

async function fetchAndSetUserData(tokens) {
  try {
    const response = await fetch(`${CONFIG.API_URL}/users`, { headers: { 'Authorization': `Bearer ${tokens.idToken}` } });
    if (response.ok) {
      const userData = await response.json();
      if (userData && userData.name) {
        currentUser = userData;
        localStorage.setItem('lifestack_user', JSON.stringify(userData));
        await loadMemories(tokens.idToken);
        await loadPeople();
        // Also load friendships
        friendships = await fetchFriendships();
        updateFriendBadge();
        showApp();
      } else { showOnboarding(); }
    } else if (response.status === 404) { showOnboarding(); }
    else { throw new Error('Failed to fetch user'); }
  } catch (error) { 
    console.error('Fetch user error:', error);
    showOnboarding(); 
  }
}

async function loadMemories(idToken) {
  try {
    const response = await fetch(`${CONFIG.API_URL}/memories`, { headers: { 'Authorization': `Bearer ${idToken}` } });
    if (response.ok) { 
      const data = await response.json();
      memories = ensureArray(data);
      localStorage.setItem('lifestack_memories', JSON.stringify(memories)); 
    }
  } catch (error) { 
    console.error('Load memories error:', error);
    loadLocalMemories(); 
  }
}

async function fetchMemories() {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) {
    loadLocalMemories();
    return memories;
  }
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/memories`, { 
      headers: { 'Authorization': `Bearer ${tokens.idToken}` } 
    });
    if (response.ok) { 
      const data = await response.json();
      const memoriesArray = ensureArray(data);
      localStorage.setItem('lifestack_memories', JSON.stringify(memoriesArray));
      return memoriesArray;
    }
  } catch (error) { 
    console.error('Fetch memories error:', error);
  }
  
  // Fallback to local
  loadLocalMemories();
  return memories;
}

async function loadPeople() {
  const data = await fetchPeople();
  people = ensureArray(data);
  localStorage.setItem('lifestack_people', JSON.stringify(people));
}

function loadLocalMemories() {
  try {
    const saved = localStorage.getItem('lifestack_memories');
    memories = saved ? ensureArray(JSON.parse(saved)) : [];
  } catch (e) {
    memories = [];
  }
}

function loadLocalPeople() {
  try {
    const saved = localStorage.getItem('lifestack_people');
    people = saved ? ensureArray(JSON.parse(saved)) : [];
  } catch (e) {
    people = [];
  }
}

// =====================================================
// ONBOARDING
// =====================================================

document.getElementById('onboardingForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const tokens = await getValidTokens();
  const auth = JSON.parse(localStorage.getItem('lifestack_auth') || 'null');
  
  const userData = {
    name: document.getElementById('name').value,
    birthdate: document.getElementById('birthdate').value,
    lifespanYears: parseInt(document.getElementById('lifespan').value),
    goal: document.getElementById('goal').value,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    email: auth?.email || ''
  };

  try {
    if (tokens?.idToken) {
      const response = await fetch(`${CONFIG.API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokens.idToken}` },
        body: JSON.stringify(userData)
      });
      if (response.ok) { currentUser = await response.json(); }
      else { throw new Error('API save failed'); }
    } else { currentUser = { id: 'local-' + Date.now(), ...userData }; }
    localStorage.setItem('lifestack_user', JSON.stringify(currentUser));
    showApp();
    showToast('Welcome to LifeStack, ' + userData.name + '!');
  } catch (error) {
    currentUser = { id: 'local-' + Date.now(), ...userData };
    localStorage.setItem('lifestack_user', JSON.stringify(currentUser));
    showApp();
    showToast('Welcome! (Saved locally)');
  }
});

// =====================================================
// PLAN HANDLING
// =====================================================

async function handlePlanSubmit(event) {
  event.preventDefault();
  
  const planId = document.getElementById('planId').value;
  const type = document.getElementById('planType').value;
  const title = document.getElementById('planTitle').value;
  const description = document.getElementById('planDescription').value;
  const targetQuarter = document.getElementById('planTargetQuarter').value;
  const targetMonth = document.getElementById('planTargetMonth').value;
  const startDate = document.getElementById('planStartDate').value;
  const endDate = document.getElementById('planEndDate').value;
  const category = document.getElementById('planCategory').value || selectedCategory;
  
  // Check if this is a shared adventure (editing someone else's shared plan)
  const existingPlan = planId ? plans.find(p => p.id === planId) : null;
  const isSharedAdventure = existingPlan?.type === 'shared-adventure';
  
  // Extract month from startDate if not set
  let month = targetMonth;
  if (!month && startDate) {
    const parsedDate = parseLocalDate(startDate);
    if (parsedDate) {
      month = parsedDate.getMonth() + 1;
    }
  }
  
  // Build participants array for sharing with friends (only for owned plans)
  let participants = null;
  if (!isSharedAdventure) {
    const friends = friendships.friends || [];
    console.log('Building participants - selectedPeopleIds:', selectedPeopleIds);
    console.log('Building participants - friends available:', friends.map(f => ({
      name: f.name,
      odId: f.odId
    })));
    
    participants = selectedPeopleIds
      .map(id => {
        console.log('Looking for friend with id:', id);
        const friend = friends.find(f => f.odId === id);
        if (friend) {
          console.log('  Found friend:', friend.name, 'odId:', friend.odId);
          return { odId: friend.odId, name: friend.name, email: friend.email || '', role: 'participant' };
        }
        console.log('  Friend not found for id:', id);
        return null;
      })
      .filter(p => p !== null);
    
    console.log('Participants to add:', participants);
  }
  
  // For shared adventures, only allow updating completion status and notes
  const planData = isSharedAdventure ? {
    // Preserve original type so the Lambda knows how to handle it
    type: 'shared-adventure',
    // Only update description (personal notes) for shared adventures
    description,
    // Preserve existing data
    title: existingPlan.title,
    year: existingPlan.year,
    targetMonth: existingPlan.targetMonth,
    startDate: existingPlan.startDate,
    endDate: existingPlan.endDate,
    category: existingPlan.category
  } : {
    type,
    title,
    description,
    year: currentViewYear,
    targetMonth: type !== 'habit' ? parseInt(month) : null,
    startDate: startDate || null,
    endDate: endDate || null,
    targetQuarter: type === 'habit' ? parseInt(targetQuarter) : null,
    category: category || null,
    people: selectedPeopleIds,
    participants: participants && participants.length > 0 ? participants : null,
    ownerName: currentUser?.name || 'Unknown'
  };
  
  const btn = document.getElementById('planSubmitBtn');
  btn.disabled = true;
  btn.textContent = planId ? 'Updating...' : 'Saving...';
  
  let result;
  if (planId) {
    // Update existing plan
    result = await updatePlan(planId, planData);
    if (result) {
      const index = plans.findIndex(p => p.id === planId);
      if (index !== -1) plans[index] = { ...plans[index], ...result };
      // Cache to local storage
      localStorage.setItem(`lifestack_plans_${currentViewYear}`, JSON.stringify(plans));
      showToast('Plan updated!');
    } else {
      // Update locally if API failed
      const index = plans.findIndex(p => p.id === planId);
      if (index !== -1) {
        plans[index] = { ...plans[index], ...planData, updatedAt: new Date().toISOString() };
      }
      localStorage.setItem(`lifestack_plans_${currentViewYear}`, JSON.stringify(plans));
      showToast('Plan saved locally!');
    }
  } else {
    // Create new plan
    result = await createPlan(planData);
    if (result) {
      plans.push(result);
      // Cache to local storage
      localStorage.setItem(`lifestack_plans_${currentViewYear}`, JSON.stringify(plans));
      showToast('Plan added!');
    } else {
      // Save locally
      const localPlan = {
        id: 'plan_' + Date.now(),
        ...planData,
        status: 'planned',
        createdAt: new Date().toISOString()
      };
      plans.push(localPlan);
      localStorage.setItem(`lifestack_plans_${currentViewYear}`, JSON.stringify(plans));
      showToast('Plan saved locally!');
    }
  }
  
  closePlanModal();
  renderMisogis();
  renderHabits();
  renderMonthGrid();
  
  btn.disabled = false;
  btn.textContent = 'Save Plan';
  selectedPeopleIds = [];
}

async function togglePlanStatus(planId) {
  const plan = plans.find(p => p.id === planId);
  if (!plan) {
    console.error('togglePlanStatus: Plan not found:', planId);
    return;
  }
  
  const originalYear = plan.year; // Preserve the original year
  console.log('togglePlanStatus - before:', { id: plan.id, title: plan.title, status: plan.status, year: plan.year, yearType: typeof plan.year });
  
  const newStatus = plan.status === 'completed' ? 'planned' : 'completed';
  const updated = await updatePlan(planId, { status: newStatus });
  
  console.log('togglePlanStatus - API response:', updated);
  
  // Only update status and completedAt, preserve everything else
  plan.status = newStatus;
  plan.completedAt = newStatus === 'completed' ? (updated?.completedAt || new Date().toISOString()) : null;
  
  // Ensure year is preserved (API might return it as string or not at all)
  if (!plan.year) {
    plan.year = originalYear;
  }
  
  console.log('togglePlanStatus - after:', { id: plan.id, title: plan.title, status: plan.status, year: plan.year, yearType: typeof plan.year });
  
  // Cache to local storage
  localStorage.setItem(`lifestack_plans_${currentViewYear}`, JSON.stringify(plans));
  
  renderMisogis();
  renderHabits();
  renderMonthGrid();
  
  // Refresh month calendar if open
  if (currentCalendarMonth) {
    renderMonthCalendarGrid(currentCalendarMonth);
    renderMonthPlansList(currentCalendarMonth);
  }
  
  showToast(newStatus === 'completed' ? '🎉 Completed!' : 'Marked as planned');
}

// =====================================================
// MEMORY HANDLING
// =====================================================

function populatePlanSelector() {
  const select = document.getElementById('memoryPlanId');
  if (!select) return;
  
  select.innerHTML = '<option value="">-- No plan --</option>';
  
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  const currentYearPlans = plans
    .filter(p => parseInt(p.year) === currentViewYear)
    // BUG FIX: Exclude future events - can't attach memory to something that hasn't happened
    .filter(p => {
      if (!p.startDate) return true; // No date set = show it (habits, etc.)
      const startDate = parseLocalDate(p.startDate);
      return startDate && startDate <= today;
    })
    // BUG FIX: Sort by startDate descending (most recent first)
    .sort((a, b) => {
      const dateA = parseLocalDate(a.startDate) || new Date(0);
      const dateB = parseLocalDate(b.startDate) || new Date(0);
      return dateB - dateA; // Descending
    });
  
  currentYearPlans.forEach(plan => {
    const option = document.createElement('option');
    option.value = plan.id;
    // Show date next to title for easier identification
    const dateStr = plan.startDate ? ` (${formatDateShort(plan.startDate)})` : '';
    const icon = plan.type === 'misogi' ? '🏔️' : plan.type === 'adventure' ? '🎯' : '🔄';
    option.textContent = `${icon} ${plan.title}${dateStr}`;
    select.appendChild(option);
  });
}

async function saveMemory() {
  const memoryId = document.getElementById('memoryId').value;
  const title = document.getElementById('memoryTitle').value;
  const occurredAt = document.getElementById('memoryDate').value;
  const text = document.getElementById('memoryText').value;
  const planId = document.getElementById('memoryPlanId').value;
  const tagsInput = document.getElementById('memoryTags').value;
  
  if (!title || !occurredAt) { showError('Please fill in title and date'); return; }

  const birthYear = new Date(currentUser.birthdate).getFullYear();
  const memoryYear = new Date(occurredAt).getFullYear();
  const year = memoryYear - birthYear;
  
  // Generate memory ID for new photos if creating
  const newMemoryId = memoryId || ('mem_' + Date.now());
  
  // Upload new photos if any
  if (selectedPhotos.length > 0) {
    showToast('Uploading photos...');
    const newPhotos = await uploadPhotos(newMemoryId);
    uploadedPhotos = [...uploadedPhotos, ...newPhotos];
  }

  const memoryData = { 
    title, 
    occurredAt, 
    text, 
    tags: tagsInput.split(',').map(t => t.trim()).filter(t => t), 
    year: String(year),  // Convert to string for DynamoDB GSI
    planId: planId || null,
    people: selectedPeopleIds,
    photos: uploadedPhotos,
    location: getLocationData()
  };
  
  const tokens = await getValidTokens();

  try {
    if (memoryId) {
      // Update existing memory
      if (tokens?.idToken) {
        const response = await fetch(`${CONFIG.API_URL}/memories/${memoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokens.idToken}` },
          body: JSON.stringify(memoryData)
        });
        if (response.ok) {
          const updated = await response.json();
          const index = memories.findIndex(m => m.id === memoryId);
          if (index !== -1) memories[index] = updated;
          showToast('Memory updated!');
        } else { throw new Error('Update failed'); }
      } else {
        // Update locally
        const index = memories.findIndex(m => m.id === memoryId);
        if (index !== -1) {
          memories[index] = { ...memories[index], ...memoryData, updatedAt: new Date().toISOString() };
        }
        showToast('Memory updated locally!');
      }
    } else {
      // Create new memory
      if (tokens?.idToken) {
        const response = await fetch(`${CONFIG.API_URL}/memories`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokens.idToken}` },
          body: JSON.stringify(memoryData)
        });
        if (response.ok) { 
          const newMemory = await response.json(); 
          memories.push(newMemory);
          showToast('Memory saved!');
        } else { throw new Error('API save failed'); }
      } else {
        const localMemory = { id: newMemoryId, userId: currentUser.id, ...memoryData, createdAt: new Date().toISOString() };
        memories.push(localMemory);
        showToast('Memory saved locally!');
      }
    }
    
    localStorage.setItem('lifestack_memories', JSON.stringify(memories));
  } catch (error) {
    console.error('Save memory error:', error);
    if (!memoryId) {
      const localMemory = { id: newMemoryId, userId: currentUser.id, ...memoryData, createdAt: new Date().toISOString() };
      memories.push(localMemory);
    }
    localStorage.setItem('lifestack_memories', JSON.stringify(memories));
    showToast('Memory saved locally!');
  }
  
  // Close modal and refresh UI
  closeMemoryModal();
  
  // Refresh all memory displays
  renderDashboard();
  renderYearMemories(currentViewYear);
  renderMonthGrid();  // Refresh to show updated memory counts
  
  // Clear state
  selectedPeopleIds = [];
  selectedPhotos = [];
  uploadedPhotos = [];
}

async function deleteMemory() {
  const memoryId = document.getElementById('memoryId').value;
  if (!memoryId) return;
  
  if (!confirm('Are you sure you want to delete this memory?')) return;
  
  const tokens = await getValidTokens();
  
  try {
    if (tokens?.idToken) {
      const response = await fetch(`${CONFIG.API_URL}/memories/${memoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokens.idToken}` }
      });
      if (!response.ok) throw new Error('Delete failed');
    }
    
    memories = memories.filter(m => m.id !== memoryId);
    localStorage.setItem('lifestack_memories', JSON.stringify(memories));
    closeMemoryModal();
    
    // Refresh all displays
    renderDashboard();
    renderYearMemories(currentViewYear);
    renderMonthGrid();
    
    showToast('Memory deleted');
  } catch (error) {
    console.error('Delete memory error:', error);
    // Delete locally anyway
    memories = memories.filter(m => m.id !== memoryId);
    localStorage.setItem('lifestack_memories', JSON.stringify(memories));
    closeMemoryModal();
    
    // Refresh all displays
    renderDashboard();
    renderYearMemories(currentViewYear);
    renderMonthGrid();
    
    showToast('Memory deleted locally');
  }
}

async function saveYearTheme() {
  const theme = document.getElementById('yearTheme').value;
  console.log('saveYearTheme called with:', theme);
  
  // Save locally immediately for responsiveness
  localStorage.setItem(`lifestack_theme_${currentViewYear}`, theme);
  
  // Find existing theme plan for this year or create new one
  let themePlan = plans.find(p => p.type === 'theme' && parseInt(p.year) === currentViewYear);
  console.log('Existing theme plan:', themePlan);
  
  const tokens = await getValidTokens();
  if (tokens?.idToken) {
    try {
      if (themePlan) {
        // Update existing theme
        console.log('Updating existing theme plan:', themePlan.id);
        const updated = await updatePlan(themePlan.id, { title: theme });
        console.log('Update result:', updated);
        if (updated) {
          themePlan.title = theme;
        }
      } else {
        // Create new theme plan
        console.log('Creating new theme plan');
        const result = await createPlan({
          type: 'theme',
          title: theme,
          year: currentViewYear,
          description: 'Year theme'
        });
        console.log('Create result:', result);
        if (result) {
          plans.push(result);
          themePlan = result;
        }
      }
      localStorage.setItem(`lifestack_plans_${currentViewYear}`, JSON.stringify(plans));
      showToast('Theme saved!');
    } catch (error) {
      console.error('Save theme error:', error);
      showToast('Theme saved locally');
    }
  } else {
    console.log('No valid tokens, saving locally only');
    showToast('Theme saved locally');
  }
}

function loadYearTheme() {
  // First try to find theme from plans (synced from server)
  const themePlan = plans.find(p => p.type === 'theme' && parseInt(p.year) === currentViewYear);
  if (themePlan) {
    document.getElementById('yearTheme').value = themePlan.title || '';
    // Also update localStorage
    localStorage.setItem(`lifestack_theme_${currentViewYear}`, themePlan.title || '');
    return;
  }
  
  // Fallback to localStorage
  const savedTheme = localStorage.getItem(`lifestack_theme_${currentViewYear}`);
  document.getElementById('yearTheme').value = savedTheme || '';
}

// =====================================================
// RENDERING
// =====================================================

function renderDashboard() {
  if (!currentUser) return;
  
  const birthDate = new Date(currentUser.birthdate);
  const today = new Date();
  const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  const yearsLeft = currentUser.lifespanYears - age;
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const endOfYear = new Date(today.getFullYear() + 1, 0, 1);
  const yearProgress = ((today - startOfYear) / (endOfYear - startOfYear)) * 100;
  
  // Ensure memories is array for count
  const safeMemories = ensureArray(memories);
  
  document.getElementById('currentYear').textContent = today.getFullYear();
  document.getElementById('currentAge').textContent = age;
  document.getElementById('lifespanDisplay').textContent = currentUser.lifespanYears;
  document.getElementById('yearsLived').textContent = age;
  document.getElementById('yearsLeft').textContent = Math.max(0, yearsLeft);
  document.getElementById('memoriesCount').textContent = safeMemories.length;
  document.getElementById('yearPercent').textContent = Math.round(yearProgress) + '%';
  
  // Update avatar display (supports both initials and image)
  updateAvatarDisplay();
  
  const circumference = 2 * Math.PI * 32;
  const offset = circumference - (yearProgress / 100) * circumference;
  document.getElementById('progressRing').style.strokeDashoffset = offset;
  
  renderTimeline();
  renderMemories();
}

function renderTimeline() {
  const grid = document.getElementById('timelineGrid');
  grid.innerHTML = '';
  
  const birthDate = new Date(currentUser.birthdate);
  const today = new Date();
  const currentAge = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
  
  // Ensure memories is an array before mapping
  const safeMemories = ensureArray(memories);
  const yearsWithMemories = new Set(safeMemories.map(m => m.year));
  
  for (let year = 0; year < currentUser.lifespanYears; year++) {
    const div = document.createElement('div');
    div.className = 'timeline-year';
    
    if (year < currentAge) div.classList.add('past');
    else if (year === currentAge) div.classList.add('current');
    else div.classList.add('future');
    
    if (yearsWithMemories.has(year)) div.classList.add('has-memory');
    
    const calendarYear = birthDate.getFullYear() + year;
    div.innerHTML = `<span class="timeline-year-tooltip">Year ${year} (${calendarYear})</span>`;
    div.addEventListener('click', () => openYearView(year, calendarYear));
    
    grid.appendChild(div);
  }
}

function renderMemories() {
  const list = document.getElementById('memoriesList');
  
  // Ensure memories is an array
  const safeMemories = ensureArray(memories);
  
  if (safeMemories.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div><h3>No memories yet</h3><p>Start capturing meaningful moments</p><button class="btn btn-primary" onclick="showMemoryModal()">Capture Your First Memory</button></div>`;
    return;
  }
  
  // Sort by date (newest first)
  const sorted = [...safeMemories].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  
  // Ensure people is an array
  const safePeople = ensureArray(people);
  
  list.innerHTML = sorted.slice(0, 5).map(memory => {
    const date = new Date(memory.occurredAt);
    const tags = memory.tags || [];
    const memoryPeople = (memory.people || []).map(pid => safePeople.find(p => p.id === pid)).filter(p => p);
    const photos = memory.photos || [];
    const locationDisplay = memory.location ? formatLocationDisplay(memory.location) : '';
    
    return `
      <div class="memory-card" onclick="showMemoryModal(memories.find(m => m.id === '${memory.id}'))">
        <div class="memory-date">
          <div class="memory-date-day">${date.getDate()}</div>
          <div class="memory-date-month">${date.toLocaleString('default', { month: 'short' })}</div>
        </div>
        <div class="memory-content">
          <h3>${escapeHtml(memory.title)}</h3>
          <p>${escapeHtml(memory.text || '')}</p>
          ${locationDisplay ? `
            <div class="memory-card-location">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="10" r="3"/>
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/>
              </svg>
              <span>${escapeHtml(locationDisplay)}</span>
            </div>
          ` : ''}
          ${photos.length > 0 ? `
            <div class="memory-card-photos" onclick="event.stopPropagation();">
              ${photos.slice(0, 4).map((photo, idx) => `<div class="memory-card-photo" onclick="openFeedPhotoLightbox('${memory.id}', ${idx})"><img src="${photo.url}" alt="Photo" onerror="this.parentElement.style.display='none'"></div>`).join('')}
              ${photos.length > 4 ? `<div class="memory-card-photo" onclick="openFeedPhotoLightbox('${memory.id}', 4)" style="display:flex;align-items:center;justify-content:center;background:var(--sand-200);color:var(--sage-600);font-size:0.75rem;">+${photos.length - 4}</div>` : ''}
            </div>
          ` : ''}
          ${memoryPeople.length > 0 ? `
            <div class="memory-card-people">
              ${memoryPeople.map(p => `<span class="memory-card-person" title="${escapeHtml(p.name)}">${p.avatar || '🧑'}</span>`).join('')}
            </div>
          ` : ''}
          ${tags.length > 0 ? `<div class="memory-tags">${tags.map(tag => `<span class="memory-tag">${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderMisogis() {
  const container = document.getElementById('misogiList');
  const misogis = plans.filter(p => p.type === 'misogi');
  
  if (misogis.length === 0) {
    container.innerHTML = `
      <div class="misogi-empty" onclick="showAddPlanModal('misogi')">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🏔️</div>
        <div>Add your defining challenge for this year</div>
        <div style="font-size: 0.8rem; margin-top: 0.5rem; opacity: 0.7;">Something so hard you might fail, but attempting it will transform you</div>
      </div>
    `;
    return;
  }
  
  // Sort by soonest date first (completed at the end)
  misogis.sort((a, b) => {
    // Completed items go to the end
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (b.status === 'completed' && a.status !== 'completed') return -1;
    
    // Then sort by start date (soonest first)
    const dateA = a.startDate ? new Date(a.startDate) : new Date('9999-12-31');
    const dateB = b.startDate ? new Date(b.startDate) : new Date('9999-12-31');
    return dateA - dateB;
  });
  
  // Count memories linked to each misogi
  const memoryCountByPlan = {};
  ensureArray(memories).forEach(m => {
    if (m.planId) {
      memoryCountByPlan[m.planId] = (memoryCountByPlan[m.planId] || 0) + 1;
    }
  });
  
  container.innerHTML = misogis.map(plan => {
    const planPeople = (plan.people || []).map(pid => people.find(p => p.id === pid)).filter(p => p);
    const dateDisplay = formatDateRange(plan.startDate, plan.endDate) || (plan.targetMonth ? getMonthName(plan.targetMonth) : 'Anytime');
    const memCount = memoryCountByPlan[plan.id] || 0;
    const catIcon = getCategoryIcon(plan.category);
    
    return `
      <div class="misogi-card ${plan.status || 'planned'}">
        <div class="misogi-card-header">
          <div class="misogi-card-title">${catIcon} ${escapeHtml(plan.title)}</div>
          <div class="misogi-card-status">
            <span class="misogi-status-badge ${plan.status || 'planned'}">${plan.status === 'completed' ? '✓ Completed' : '🎯 In Progress'}</span>
          </div>
        </div>
        ${plan.description ? `<div class="misogi-card-description">${escapeHtml(plan.description)}</div>` : ''}
        <div class="misogi-card-meta">
          <span>📅 ${dateDisplay}</span>
          ${planPeople.length > 0 ? `<span>${planPeople.map(p => p.avatar || '🧑').join('')} ${planPeople.length} people</span>` : ''}
          ${memCount > 0 ? `<span>📸 ${memCount} memories</span>` : ''}
        </div>
        <div class="misogi-card-actions">
          <span class="misogi-action-btn" onclick="event.stopPropagation(); togglePlanStatus('${plan.id}')" title="${plan.status === 'completed' ? 'Mark as in progress' : 'Mark as completed'}">
            ${plan.status === 'completed' ? '↩️' : '✅'}
          </span>
          <span class="misogi-action-btn" onclick="event.stopPropagation(); showCalendarExport('${plan.id}')" title="Add to Calendar">📆</span>
          <span class="misogi-action-btn" onclick="event.stopPropagation(); selectAdventureForMemories('${plan.id}')" title="View memories">📸</span>
          <span class="misogi-action-btn" onclick="event.stopPropagation(); showEditPlanModal('${plan.id}')" title="Edit">✏️</span>
          <span class="misogi-action-btn" onclick="event.stopPropagation(); confirmDeletePlan('${plan.id}')" title="Delete">🗑️</span>
        </div>
      </div>
    `;
  }).join('');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function renderHabits() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  
  for (let q = 1; q <= 4; q++) {
    const habit = plans.find(p => p.type === 'habit' && p.targetQuarter === q);
    const container = document.getElementById(`habitQ${q}`);
    if (!container) continue;
    
    const isActive = q === currentQuarter && currentViewYear === currentDate.getFullYear();
    container.className = `quarter-card ${isActive ? 'active' : ''}`;
    
    const headerHtml = `
      <div class="quarter-header">
        <span class="quarter-label">Q${q}</span>
        <span class="quarter-months">${getQuarterMonths(q)}</span>
      </div>
    `;
    
    if (habit) {
      // Calculate real progress from check-ins
      const progress = calculateRealHabitProgress(habit, q);
      const stats = getHabitStats(habit, q);
      
      container.innerHTML = `
        ${headerHtml}
        <div class="quarter-content" onclick="openHabitTracking('${habit.id}')">
          <div class="habit-title">${escapeHtml(habit.title)}</div>
          ${habit.description ? `<div class="habit-description">${escapeHtml(habit.description)}</div>` : ''}
          <div class="habit-progress">
            <div class="habit-progress-bar">
              <div class="habit-progress-fill" style="width: ${progress}%"></div>
            </div>
            <span class="habit-progress-text">${progress}%</span>
          </div>
          <div class="habit-status-row">
            <span class="habit-status-badge ${habit.status === 'completed' ? 'completed' : 'in-progress'}">
              ${stats.currentStreak > 0 ? `🔥 ${stats.currentStreak} day streak` : (habit.status === 'completed' ? '✓ Done' : '🔄 Track')}
            </span>
            <div class="habit-actions">
              <span class="habit-action" onclick="event.stopPropagation(); quickCheckin('${habit.id}')" title="Quick check-in">✓</span>
              <span class="habit-action" onclick="event.stopPropagation(); showEditPlanModal('${habit.id}')" title="Edit">✏️</span>
              <span class="habit-action" onclick="event.stopPropagation(); confirmDeletePlan('${habit.id}')" title="Delete">🗑️</span>
            </div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        ${headerHtml}
        <div class="quarter-content empty" onclick="showAddPlanModal('habit', ${q})">
          <span>+ Add Q${q} Habit</span>
        </div>
      `;
    }
  }
}

function getQuarterMonths(q) {
  const months = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'];
  return months[q - 1];
}

function getQuarterDateRange(quarter, year) {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0); // Last day of quarter
  return { start, end };
}

function calculateRealHabitProgress(habit, quarter) {
  const checkIns = habit.checkIns || [];
  const year = currentViewYear;
  const { start, end } = getQuarterDateRange(quarter, year);
  
  // Calculate based on FULL quarter (90 days), not just days elapsed
  // This gives a more accurate picture of progress toward the goal
  const totalDaysInQuarter = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  
  // Count check-ins within quarter
  const quarterCheckIns = checkIns.filter(date => {
    const d = new Date(date);
    return d >= start && d <= end;
  });
  
  if (totalDaysInQuarter <= 0) return 0;
  return Math.min(100, Math.round((quarterCheckIns.length / totalDaysInQuarter) * 100));
}

function getHabitStats(habit, quarter) {
  const checkIns = (habit.checkIns || []).sort();
  const year = currentViewYear;
  const { start, end } = getQuarterDateRange(quarter, year);
  
  // Filter to this quarter
  const quarterCheckIns = checkIns.filter(date => {
    const d = new Date(date);
    return d >= start && d <= end;
  }).sort();
  
  // Calculate current streak
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let checkDate = new Date(today);
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (quarterCheckIns.includes(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (checkDate.getTime() === today.getTime()) {
      // Today not checked yet, check yesterday
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;
  
  quarterCheckIns.forEach(dateStr => {
    const d = new Date(dateStr);
    if (prevDate) {
      const diff = (d - prevDate) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }
    longestStreak = Math.max(longestStreak, tempStreak);
    prevDate = d;
  });
  
  return {
    currentStreak,
    longestStreak,
    totalCheckIns: quarterCheckIns.length,
    quarterCheckIns
  };
}

// =====================================================
// HABIT TRACKING MODAL
// =====================================================

let currentTrackingHabit = null;

function openHabitTracking(habitId) {
  const habit = plans.find(p => p.id === habitId);
  if (!habit) return;
  
  currentTrackingHabit = habit;
  document.getElementById('trackingHabitId').value = habitId;
  document.getElementById('habitTrackingTitle').textContent = habit.title;
  
  updateHabitTrackingUI();
  document.getElementById('habitTrackingModal').classList.add('active');
}

function closeHabitTracking() {
  document.getElementById('habitTrackingModal').classList.remove('active');
  currentTrackingHabit = null;
}

function updateHabitTrackingUI() {
  if (!currentTrackingHabit) return;
  
  const habit = currentTrackingHabit;
  const quarter = habit.targetQuarter;
  const stats = getHabitStats(habit, quarter);
  const { start, end } = getQuarterDateRange(quarter, currentViewYear);
  
  // Update stats
  document.getElementById('habitCurrentStreak').textContent = stats.currentStreak;
  document.getElementById('habitLongestStreak').textContent = stats.longestStreak;
  document.getElementById('habitTotalCheckins').textContent = stats.totalCheckIns;
  
  // Calculate completion rate based on FULL quarter (90 days)
  const totalDaysInQuarter = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const rate = Math.round((stats.totalCheckIns / totalDaysInQuarter) * 100);
  document.getElementById('habitCompletionRate').textContent = rate + '%';
  
  // Update today button
  const todayStr = new Date().toISOString().split('T')[0];
  const isCheckedToday = (habit.checkIns || []).includes(todayStr);
  const btn = document.getElementById('habitCheckinBtn');
  btn.textContent = isCheckedToday ? '✓ Checked in Today!' : '✓ Check in for Today';
  btn.className = isCheckedToday ? 'btn btn-primary btn-large checked' : 'btn btn-primary btn-large';
  
  // Render calendar
  renderHabitCalendar(habit, quarter);
}

function renderHabitCalendar(habit, quarter) {
  const container = document.getElementById('habitCalendarGrid');
  const year = currentViewYear;
  const { start, end } = getQuarterDateRange(quarter, year);
  const checkIns = habit.checkIns || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  let html = dayNames.map(d => `<div class="habit-calendar-header">${d}</div>`).join('');
  
  // Start from first day of quarter's first week
  const calStart = new Date(start);
  calStart.setDate(calStart.getDate() - calStart.getDay());
  
  // End at last day of quarter's last week
  const calEnd = new Date(end);
  calEnd.setDate(calEnd.getDate() + (6 - calEnd.getDay()));
  
  const current = new Date(calStart);
  while (current <= calEnd) {
    const dateStr = current.toISOString().split('T')[0];
    const isChecked = checkIns.includes(dateStr);
    const isToday = current.getTime() === today.getTime();
    const isFuture = current > today;
    const isInQuarter = current >= start && current <= end;
    
    let classes = 'habit-calendar-day';
    if (isChecked) classes += ' checked';
    if (isToday) classes += ' today';
    if (isFuture) classes += ' future';
    if (!isInQuarter) classes += ' other-month';
    
    html += `
      <div class="${classes}" 
           onclick="${isFuture ? '' : `toggleHabitDay('${dateStr}')`}"
           title="${current.toLocaleDateString()}">
        ${current.getDate()}
      </div>
    `;
    
    current.setDate(current.getDate() + 1);
  }
  
  container.innerHTML = html;
}

async function toggleTodayCheckin() {
  const todayStr = new Date().toISOString().split('T')[0];
  await toggleHabitDay(todayStr);
}

async function toggleHabitDay(dateStr) {
  if (!currentTrackingHabit) return;
  
  const habit = currentTrackingHabit;
  const checkIns = habit.checkIns || [];
  
  const index = checkIns.indexOf(dateStr);
  if (index > -1) {
    checkIns.splice(index, 1);
  } else {
    checkIns.push(dateStr);
    checkIns.sort();
  }
  
  habit.checkIns = checkIns;
  
  // Save to backend
  await saveHabitCheckIns(habit.id, checkIns);
  
  // Update UI
  updateHabitTrackingUI();
  renderHabits();
}

async function quickCheckin(habitId) {
  const habit = plans.find(p => p.id === habitId);
  if (!habit) return;
  
  const todayStr = new Date().toISOString().split('T')[0];
  const checkIns = habit.checkIns || [];
  
  if (!checkIns.includes(todayStr)) {
    checkIns.push(todayStr);
    checkIns.sort();
    habit.checkIns = checkIns;
    
    await saveHabitCheckIns(habitId, checkIns);
    renderHabits();
    showToast('✓ Checked in!');
  } else {
    showToast('Already checked in today');
  }
}

async function saveHabitCheckIns(habitId, checkIns) {
  const habit = plans.find(p => p.id === habitId);
  if (!habit) {
    console.error('saveHabitCheckIns: Habit not found:', habitId);
    return;
  }
  
  console.log('Saving habit check-ins:', { habitId, checkIns, habitTitle: habit.title });
  
  const planData = {
    type: habit.type,
    title: habit.title,
    description: habit.description,
    year: habit.year,
    targetMonth: habit.targetMonth,
    startDate: habit.startDate,
    endDate: habit.endDate,
    targetQuarter: habit.targetQuarter,
    category: habit.category,
    people: habit.people,
    status: habit.status,
    checkIns: checkIns
  };
  
  const result = await updatePlan(habitId, planData);
  
  if (result) {
    console.log('Habit check-in saved successfully:', result);
    const index = plans.findIndex(p => p.id === habitId);
    if (index !== -1) plans[index] = { ...plans[index], ...result };
    showToast('✓ Check-in saved!');
  } else {
    console.error('Habit check-in save FAILED - saving locally');
    // Save locally as fallback
    localStorage.setItem(`lifestack_plans_${currentViewYear}`, JSON.stringify(plans));
    showToast('Check-in saved locally (sync pending)', 'warning');
  }
}

function markHabitComplete() {
  if (!currentTrackingHabit) return;
  togglePlanStatus(currentTrackingHabit.id);
  closeHabitTracking();
}

// Calendar color palette for adventures
const adventureColors = ['adventure-1', 'adventure-2', 'adventure-3', 'adventure-4'];
let currentCalendarMonth = null;

function renderMonthGrid() {
  const container = document.getElementById('monthGrid');
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  console.log('renderMonthGrid - total plans:', plans.length);
  
  container.innerHTML = months.map((name, idx) => {
    const isCurrentMonth = currentViewYear === currentYear && idx === currentMonth;
    const targetMonthNum = idx + 1;
    
    // Filter by actual startDate month, not just targetMonth
    // Include shared-adventure type!
    const monthPlans = ensureArray(plans).filter(p => {
      if (p.type !== 'adventure' && p.type !== 'misogi' && p.type !== 'shared-adventure') return false;
      
      // Check year - handle both string and number types
      const planYear = parseInt(p.year);
      if (planYear && planYear !== currentViewYear) return false;
      
      // If has startDate, check if it falls in this month
      if (p.startDate) {
        const startDate = parseLocalDate(p.startDate);
        const endDate = p.endDate ? parseLocalDate(p.endDate) : startDate;
        if (startDate) {
          // Also check year from startDate
          if (startDate.getFullYear() !== currentViewYear) return false;
          
          // Check if the plan spans this month
          const planStartMonth = startDate.getMonth() + 1;
          const planEndMonth = endDate ? endDate.getMonth() + 1 : planStartMonth;
          return targetMonthNum >= planStartMonth && targetMonthNum <= planEndMonth;
        }
      }
      
      // Fall back to targetMonth - handle both string and number
      return parseInt(p.targetMonth) === targetMonthNum;
    });
    
    // Sort by soonest date first (completed at the end)
    monthPlans.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (b.status === 'completed' && a.status !== 'completed') return -1;
      const dateA = a.startDate ? new Date(a.startDate) : new Date('9999-12-31');
      const dateB = b.startDate ? new Date(b.startDate) : new Date('9999-12-31');
      return dateA - dateB;
    });
    
    // Get days with plans for mini calendar
    const daysWithPlans = getDaysWithPlans(idx + 1, monthPlans);
    
    return `
      <div class="calendar-month-card ${isCurrentMonth ? 'current-month' : ''}" 
           onclick="openMonthCalendar(${idx + 1}, '${name}')">
        <div class="calendar-month-header">
          <span class="calendar-month-name">${name.substring(0, 3).toUpperCase()}</span>
          ${monthPlans.length > 0 ? `<span class="calendar-month-count">${monthPlans.length} plan${monthPlans.length > 1 ? 's' : ''}</span>` : ''}
        </div>
        ${renderMiniCalendar(idx, daysWithPlans, isCurrentMonth)}
        <div class="calendar-plan-bars">
          ${monthPlans.slice(0, 3).map((p, i) => {
            const isShared = p.type === 'shared-adventure';
            const colorClass = isShared ? 'from-friend' : (p.type === 'adventure' ? adventureColors[i % 4] : '');
            return `
              <div class="calendar-plan-bar ${p.type} ${colorClass} ${p.status === 'completed' ? 'completed' : ''}" onclick="event.stopPropagation(); selectAdventureForMemories('${p.id}')">
                <span class="plan-bar-icon">${p.status === 'completed' ? '✅' : getCategoryIcon(p.category)}</span>
                <span class="plan-bar-title">${escapeHtml(p.title)}${isShared ? ' 👤' : ''}</span>
                <div class="plan-bar-actions">
                  <span class="plan-bar-action" onclick="event.stopPropagation(); showEditPlanModal('${p.id}')" title="Edit">✏️</span>
                  <span class="plan-bar-action delete" onclick="event.stopPropagation(); confirmDeletePlan('${p.id}')" title="Delete">🗑️</span>
                </div>
              </div>
            `;
          }).join('')}
          ${monthPlans.length > 3 ? `<div class="calendar-more-plans">+${monthPlans.length - 3} more</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderMiniCalendar(monthIndex, daysWithPlans, isCurrentMonth) {
  const year = currentViewYear;
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  
  let html = '<div class="calendar-mini-grid">';
  
  // Day headers
  const dayHeaders = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  dayHeaders.forEach(d => {
    html += `<div class="calendar-mini-day header">${d}</div>`;
  });
  
  // Empty cells for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-mini-day other-month"></div>';
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const planType = daysWithPlans[day];
    const isToday = isCurrentYear && monthIndex === todayMonth && day === todayDate;
    let classes = 'calendar-mini-day';
    if (planType === 'misogi') classes += ' has-misogi';
    else if (planType) classes += ' has-plan';
    if (isToday) classes += ' today';
    
    html += `<div class="${classes}">${day}</div>`;
  }
  
  html += '</div>';
  return html;
}

function getDaysWithPlans(month, monthPlans) {
  const daysWithPlans = {};
  
  monthPlans.forEach(plan => {
    if (plan.startDate) {
      const start = parseLocalDate(plan.startDate);
      const end = plan.endDate ? parseLocalDate(plan.endDate) : start;
      
      if (!start) return;
      
      // Only process if in this month
      if (start.getMonth() + 1 === month || end.getMonth() + 1 === month) {
        const startDay = start.getMonth() + 1 === month ? start.getDate() : 1;
        const endDay = end.getMonth() + 1 === month ? end.getDate() : new Date(currentViewYear, month, 0).getDate();
        
        for (let d = startDay; d <= endDay; d++) {
          daysWithPlans[d] = plan.type;
        }
      }
    }
  });
  
  return daysWithPlans;
}

function openMonthCalendar(month, monthName) {
  currentCalendarMonth = month;
  document.getElementById('monthCalendarTitle').textContent = `${monthName} ${currentViewYear}`;
  
  renderMonthCalendarGrid(month);
  renderMonthPlansList(month);
  
  document.getElementById('monthCalendarModal').classList.add('active');
}

function closeMonthCalendarModal() {
  document.getElementById('monthCalendarModal').classList.remove('active');
  currentCalendarMonth = null;
}

function renderMonthCalendarGrid(month) {
  const container = document.getElementById('monthCalendarGrid');
  const year = currentViewYear;
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth() + 1;
  
  console.log('renderMonthCalendarGrid - plans:', plans.length, 'month:', month, 'year:', year);
  
  // Get days with plans - build a map of day -> list of plans
  // Filter by actual startDate month, not targetMonth
  // Include shared-adventure type!
  const monthPlans = ensureArray(plans).filter(p => {
    if (p.type !== 'adventure' && p.type !== 'misogi' && p.type !== 'shared-adventure') return false;
    
    // Check year - handle both string and number types
    const planYear = parseInt(p.year);
    
    // Debug: log each plan being checked
    console.log(`Checking plan: "${p.title}" - year: ${p.year} (parsed: ${planYear}), startDate: ${p.startDate}, targetMonth: ${p.targetMonth}`);
    
    if (planYear && planYear !== currentViewYear) {
      console.log(`  -> Filtered out: year mismatch (${planYear} !== ${currentViewYear})`);
      return false;
    }
    
    // If has startDate, check if it falls in this month
    if (p.startDate) {
      const startDate = parseLocalDate(p.startDate);
      const endDate = p.endDate ? parseLocalDate(p.endDate) : startDate;
      if (startDate) {
        // Also check year from startDate
        if (startDate.getFullYear() !== currentViewYear) {
          console.log(`  -> Filtered out: startDate year mismatch (${startDate.getFullYear()} !== ${currentViewYear})`);
          return false;
        }
        
        // Check if the plan spans this month
        const planStartMonth = startDate.getMonth() + 1;
        const planEndMonth = endDate ? endDate.getMonth() + 1 : planStartMonth;
        const matches = month >= planStartMonth && month <= planEndMonth;
        console.log(`  -> startDate month: ${planStartMonth}, endMonth: ${planEndMonth}, checking month ${month}, matches: ${matches}`);
        return matches;
      }
    }
    
    // Fall back to targetMonth - handle both string and number
    const targetMatches = parseInt(p.targetMonth) === month;
    console.log(`  -> No startDate, using targetMonth: ${p.targetMonth} (parsed: ${parseInt(p.targetMonth)}) === ${month} ? ${targetMatches}`);
    return targetMatches;
  });
  
  console.log('Filtered monthPlans:', monthPlans.length, monthPlans.map(p => p.title));
  
  // Map of day -> array of plans for that day
  const plansByDay = {};
  monthPlans.forEach(plan => {
    if (plan.startDate) {
      const start = parseLocalDate(plan.startDate);
      const end = plan.endDate ? parseLocalDate(plan.endDate) : start;
      
      if (!start) return;
      
      // Check if this plan overlaps with the current month
      const monthStart = new Date(year, month - 1, 1);
      const monthEnd = new Date(year, month, 0);
      
      // Skip if plan doesn't overlap with this month
      if (end < monthStart || start > monthEnd) return;
      
      // Get start and end days for this month
      const startDay = start.getMonth() + 1 === month && start.getFullYear() === year ? start.getDate() : 1;
      const endDay = end.getMonth() + 1 === month && end.getFullYear() === year ? end.getDate() : daysInMonth;
      
      for (let d = startDay; d <= endDay; d++) {
        if (!plansByDay[d]) plansByDay[d] = [];
        plansByDay[d].push(plan);
      }
    }
  });
  
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  let html = dayNames.map(d => `<div class="month-calendar-header">${d}</div>`).join('');
  
  // Empty cells for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="month-calendar-day other-month"></div>';
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dayPlans = plansByDay[day] || [];
    const isToday = isCurrentYear && month === todayMonth && day === todayDate;
    let classes = 'month-calendar-day';
    if (dayPlans.length > 0) classes += ' has-plan';
    if (dayPlans.some(p => p.type === 'misogi')) classes += ' has-misogi';
    if (isToday) classes += ' today';
    
    // Build event bars with titles
    let eventsHtml = '';
    if (dayPlans.length > 0) {
      eventsHtml = '<div class="day-events">';
      dayPlans.slice(0, 2).forEach(p => {
        const typeClass = p.type === 'misogi' ? 'misogi' : 'adventure';
        const shortTitle = p.title.length > 8 ? p.title.substring(0, 8) + '…' : p.title;
        eventsHtml += `<div class="day-event-bar ${typeClass}" title="${escapeHtml(p.title)}">${shortTitle}</div>`;
      });
      if (dayPlans.length > 2) {
        eventsHtml += `<div class="day-event-more">+${dayPlans.length - 2}</div>`;
      }
      eventsHtml += '</div>';
    }
    
    html += `<div class="${classes}" onclick="selectDateForPlan(${day})">
      <span class="day-number">${day}</span>
      ${eventsHtml}
    </div>`;
  }
  
  container.innerHTML = html;
}

function renderMonthPlansList(month) {
  const container = document.getElementById('monthPlansList');
  
  // Filter by actual startDate month, not just targetMonth
  // Include shared-adventure type!
  const monthPlans = ensureArray(plans).filter(p => {
    if (p.type !== 'adventure' && p.type !== 'misogi' && p.type !== 'shared-adventure') return false;
    
    // Check year - handle both string and number types
    const planYear = parseInt(p.year);
    if (planYear && planYear !== currentViewYear) return false;
    
    // If has startDate, check if it falls in this month
    if (p.startDate) {
      const startDate = parseLocalDate(p.startDate);
      const endDate = p.endDate ? parseLocalDate(p.endDate) : startDate;
      if (startDate) {
        // Also check year from startDate
        if (startDate.getFullYear() !== currentViewYear) return false;
        
        // Check if the plan spans this month
        const planStartMonth = startDate.getMonth() + 1;
        const planEndMonth = endDate ? endDate.getMonth() + 1 : planStartMonth;
        return month >= planStartMonth && month <= planEndMonth;
      }
    }
    
    // Fall back to targetMonth - handle both string and number
    return parseInt(p.targetMonth) === month;
  });
  
  // Count memories per plan
  const memoryCountByPlan = {};
  ensureArray(memories).forEach(m => {
    if (m.planId) {
      memoryCountByPlan[m.planId] = (memoryCountByPlan[m.planId] || 0) + 1;
    }
  });
  
  // Sort by soonest date first (completed at the end)
  monthPlans.sort((a, b) => {
    // Completed items go to the end
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (b.status === 'completed' && a.status !== 'completed') return -1;
    
    // Then sort by start date (soonest first)
    const dateA = a.startDate ? new Date(a.startDate) : new Date('9999-12-31');
    const dateB = b.startDate ? new Date(b.startDate) : new Date('9999-12-31');
    return dateA - dateB;
  });
  
  if (monthPlans.length === 0) {
    container.innerHTML = '<p style="color: var(--sage-500); text-align: center; padding: 1rem;">No plans yet for this month</p>';
    return;
  }
  
  container.innerHTML = monthPlans.map(p => {
    const dateStr = formatDateRange(p.startDate, p.endDate);
    const memCount = memoryCountByPlan[p.id] || 0;
    const catIcon = getCategoryIcon(p.category);
    const isCompleted = p.status === 'completed';
    const isShared = p.type === 'shared-adventure';
    
    return `
      <div class="month-plan-card ${isCompleted ? 'completed' : ''} ${isShared ? 'from-friend' : ''}" onclick="selectAdventureForMemories('${p.id}'); closeMonthCalendarModal();">
        <div class="month-plan-card-checkbox" onclick="event.stopPropagation(); togglePlanStatus('${p.id}');">
          ${isCompleted ? '✅' : '⬜'}
        </div>
        <div class="month-plan-card-color ${p.type}"></div>
        <div class="month-plan-card-content">
          <div class="month-plan-card-title ${isCompleted ? 'completed' : ''}">${catIcon} ${escapeHtml(p.title)}${isShared ? ' 👤' : ''}</div>
          <div class="month-plan-card-dates">
            ${dateStr || 'No date set'}
            ${memCount > 0 ? ` • 📸 ${memCount} memories` : ''}
            ${isShared && p.originalOwnerName ? ` • From: ${escapeHtml(p.originalOwnerName)}` : ''}
          </div>
        </div>
        <div class="month-plan-card-actions">
          <span class="month-plan-card-action" onclick="event.stopPropagation(); showCalendarExport('${p.id}');" title="Add to Calendar">📆</span>
          <span class="month-plan-card-action" onclick="event.stopPropagation(); showEditPlanModal('${p.id}'); closeMonthCalendarModal();" title="Edit">✏️</span>
          ${!isShared ? `<span class="month-plan-card-action delete" onclick="event.stopPropagation(); confirmDeletePlan('${p.id}');" title="Delete">🗑️</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function selectDateForPlan(day) {
  // Pre-fill date when adding a plan
  const month = currentCalendarMonth;
  const dateStr = `${currentViewYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  closeMonthCalendarModal();
  showAddPlanModal('adventure', month);
  
  // Set the date after modal opens
  setTimeout(() => {
    document.getElementById('planStartDate').value = dateStr;
  }, 100);
}

function addPlanFromCalendar() {
  const month = currentCalendarMonth;
  closeMonthCalendarModal();
  showAddPlanModal('adventure', month);
}

function handlePlanClick(planId, isPast) {
  // Always show edit modal - remove this function usage
  showEditPlanModal(planId);
}

function formatDateRange(start, end) {
  if (!start) return '';
  const startDate = parseLocalDate(start);
  if (!startDate) return '';
  const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  if (!end || start === end) return startStr;
  
  const endDate = parseLocalDate(end);
  if (!endDate) return startStr;
  const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${startStr} - ${endStr}`;
}

function renderYearMemories(year) {
  const container = document.getElementById('yearMemories');
  if (!container) return;
  
  // Update filter dropdowns
  populateMemoryFilter();
  
  // Get all memories for this year (for stats)
  const allYearMemories = ensureArray(memories).filter(m => {
    const memYear = new Date(m.occurredAt).getFullYear();
    return memYear === year;
  });
  
  // Get filtered memories
  const yearMemories = getFilteredMemories(year);
  
  // Show adventure info if filtered
  if (selectedAdventureFilter !== 'all') {
    showSelectedAdventureInfo(selectedAdventureFilter);
  } else {
    hideSelectedAdventureInfo();
  }
  
  // Count photos
  let photoCount = 0;
  yearMemories.forEach(m => {
    photoCount += (m.photos || []).length;
  });
  
  // Render stats
  renderMemoryStats(yearMemories.length, allYearMemories.length, photoCount);
  
  // Sort by date - newest first (most recent at top)
  yearMemories.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  
  if (yearMemories.length === 0) {
    const message = selectedAdventureFilter !== 'all' 
      ? 'No memories linked to this adventure yet'
      : 'No memories yet this year';
    container.innerHTML = `
      <div class="memory-feed-empty">
        <p>${message}</p>
        <button class="btn btn-primary" onclick="showMemoryModal()">Add Memory</button>
      </div>
    `;
    return;
  }
  
  const safePeople = ensureArray(people);
  
  container.innerHTML = yearMemories.map(m => {
    const photos = m.photos || [];
    const date = new Date(m.occurredAt);
    const tags = m.tags || [];
    const memoryPeople = (m.people || []).map(pid => safePeople.find(p => p.id === pid)).filter(p => p);
    const isShared = m.isShared === true;
    const locationDisplay = m.location ? formatLocationDisplay(m.location) : '';
    const locationUrl = m.location ? getLocationMapUrl(m.location) : null;
    
    return `
      <div class="memory-feed-item ${isShared ? 'from-friend' : ''}" onclick="showMemoryModal(memories.find(mem => mem.id === '${m.id}'))">
        <div class="memory-feed-date">
          <div class="memory-feed-day">${date.getDate()}</div>
          <div class="memory-feed-month">${date.toLocaleString('default', { month: 'short' })}</div>
        </div>
        <div class="memory-feed-content">
          <div class="memory-feed-title">${escapeHtml(m.title)}${isShared ? ' 👤' : ''}</div>
          ${isShared ? `<div class="memory-feed-shared" style="font-size: 0.75rem; color: #4a90d9; margin-bottom: 4px;">Shared by ${escapeHtml(m.ownerName || 'a friend')}</div>` : ''}
          ${m.text ? `<div class="memory-feed-text">${escapeHtml(m.text)}</div>` : ''}
          ${locationDisplay ? `
            <div class="memory-feed-location" onclick="event.stopPropagation();">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="10" r="3"/>
                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 7 8 11.7z"/>
              </svg>
              ${locationUrl ? `<a href="${locationUrl}" target="_blank" class="location-link" onclick="event.stopPropagation();">${escapeHtml(locationDisplay)}</a>` : `<span>${escapeHtml(locationDisplay)}</span>`}
            </div>
          ` : ''}
          ${photos.length > 0 ? `
            <div class="memory-feed-photos" onclick="event.stopPropagation();">
              ${photos.slice(0, 4).map((photo, idx) => `
                <div class="memory-feed-photo" onclick="openFeedPhotoLightbox('${m.id}', ${idx})">
                  <img src="${photo.url}" alt="Photo" onerror="this.parentElement.style.display='none'">
                </div>
              `).join('')}
              ${photos.length > 4 ? `<div class="memory-feed-photo" onclick="openFeedPhotoLightbox('${m.id}', 4)" style="display:flex;align-items:center;justify-content:center;background:var(--sand-200);font-size:0.75rem;color:var(--sage-600);">+${photos.length - 4}</div>` : ''}
            </div>
          ` : ''}
          <div class="memory-feed-meta">
            ${memoryPeople.map(p => `<span class="memory-feed-tag">${p.avatar || '🧑'} ${escapeHtml(p.name)}</span>`).join('')}
            ${tags.map(tag => `<span class="memory-feed-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function populateMemoryFilter() {
  const select = document.getElementById('memoryFilter');
  if (!select) return;
  
  // Get adventures for current year - sorted by date (most recent first)
  const yearAdventures = ensureArray(plans)
    .filter(p => (p.type === 'adventure' || p.type === 'misogi') && parseInt(p.year) === currentViewYear)
    .sort((a, b) => {
      const dateA = parseLocalDate(a.startDate) || new Date(0);
      const dateB = parseLocalDate(b.startDate) || new Date(0);
      return dateB - dateA; // Descending - most recent first
    });
  
  select.innerHTML = '<option value="all">All Memories</option>';
  
  yearAdventures.forEach(adv => {
    const option = document.createElement('option');
    option.value = adv.id;
    const dateStr = adv.startDate ? ` (${formatDateShort(adv.startDate)})` : '';
    option.textContent = `${adv.type === 'misogi' ? '🏔️' : '🎯'} ${adv.title}${dateStr}`;
    if (adv.id === selectedAdventureFilter) option.selected = true;
    select.appendChild(option);
  });
}

function filterMemories() {
  const adventureSelect = document.getElementById('memoryFilter');
  const peopleSelect = document.getElementById('memoryPeopleFilter');
  const photoSelect = document.getElementById('memoryPhotoFilter');
  
  selectedAdventureFilter = adventureSelect?.value || 'all';
  
  renderYearMemories(currentViewYear);
}

function filterMemoriesBySearch() {
  renderYearMemories(currentViewYear);
}

function getFilteredMemories(year) {
  const searchInput = document.getElementById('memorySearch');
  const peopleSelect = document.getElementById('memoryPeopleFilter');
  const photoSelect = document.getElementById('memoryPhotoFilter');
  
  const searchTerm = searchInput?.value?.toLowerCase() || '';
  const peopleFilter = peopleSelect?.value || 'all';
  const photoFilter = photoSelect?.value || 'all';
  
  let filtered = ensureArray(memories).filter(m => {
    const memYear = new Date(m.occurredAt).getFullYear();
    return memYear === year;
  });
  
  // Apply adventure filter
  if (selectedAdventureFilter !== 'all') {
    filtered = filtered.filter(m => m.planId === selectedAdventureFilter);
  }
  
  // Apply search filter
  if (searchTerm) {
    filtered = filtered.filter(m => 
      m.title?.toLowerCase().includes(searchTerm) ||
      m.text?.toLowerCase().includes(searchTerm) ||
      (m.tags || []).some(t => t.toLowerCase().includes(searchTerm))
    );
  }
  
  // Apply people filter
  if (peopleFilter !== 'all') {
    filtered = filtered.filter(m => (m.people || []).includes(peopleFilter));
  }
  
  // Apply photo filter
  if (photoFilter === 'with-photos') {
    filtered = filtered.filter(m => (m.photos || []).length > 0);
  } else if (photoFilter === 'without-photos') {
    filtered = filtered.filter(m => (m.photos || []).length === 0);
  }
  
  return filtered;
}

function populateMemoryFilter() {
  const adventureSelect = document.getElementById('memoryFilter');
  const peopleSelect = document.getElementById('memoryPeopleFilter');
  
  if (!adventureSelect) return;
  
  // Populate adventure filter - sorted by date (most recent first)
  const yearAdventures = ensureArray(plans)
    .filter(p => (p.type === 'adventure' || p.type === 'misogi') && parseInt(p.year) === currentViewYear)
    .sort((a, b) => {
      const dateA = parseLocalDate(a.startDate) || new Date(0);
      const dateB = parseLocalDate(b.startDate) || new Date(0);
      return dateB - dateA; // Descending - most recent first
    });
  
  adventureSelect.innerHTML = '<option value="all">All Adventures</option>';
  
  yearAdventures.forEach(adv => {
    const option = document.createElement('option');
    option.value = adv.id;
    const dateStr = adv.startDate ? ` (${formatDateShort(adv.startDate)})` : '';
    option.textContent = `${getCategoryIcon(adv.category)} ${adv.title}${dateStr}`;
    if (adv.id === selectedAdventureFilter) option.selected = true;
    adventureSelect.appendChild(option);
  });
  
  // Populate people filter
  if (peopleSelect) {
    peopleSelect.innerHTML = '<option value="all">All People</option>';
    ensureArray(people).forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.avatar || '🧑'} ${p.name}`;
      peopleSelect.appendChild(option);
    });
  }
}

function renderMemoryStats(filteredCount, totalCount, photoCount) {
  const container = document.getElementById('memoryStats');
  if (!container) return;
  
  container.innerHTML = `
    <span class="memory-stat">📝 ${filteredCount} ${filteredCount === totalCount ? '' : `of ${totalCount}`} memories</span>
    <span class="memory-stat">📸 ${photoCount} photos</span>
  `;
}

// =====================================================
// PHOTO GALLERY
// =====================================================

let galleryPhotos = [];
let currentLightboxIndex = 0;

function showPhotoGallery() {
  document.getElementById('galleryYear').textContent = currentViewYear;
  renderPhotoGallery();
  document.getElementById('photoGalleryModal').classList.add('active');
}

function closePhotoGallery() {
  document.getElementById('photoGalleryModal').classList.remove('active');
}

function renderPhotoGallery() {
  const container = document.getElementById('photoGalleryGrid');
  
  // Get all photos from memories this year
  galleryPhotos = [];
  ensureArray(memories).forEach(m => {
    const memYear = new Date(m.occurredAt).getFullYear();
    if (memYear === currentViewYear && m.photos && m.photos.length > 0) {
      m.photos.forEach(photo => {
        galleryPhotos.push({
          ...photo,
          memoryTitle: m.title,
          memoryDate: m.occurredAt,
          memoryId: m.id
        });
      });
    }
  });
  
  // Sort by date (newest first)
  galleryPhotos.sort((a, b) => new Date(b.memoryDate) - new Date(a.memoryDate));
  
  if (galleryPhotos.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--sage-500);">
        <div style="font-size: 3rem; margin-bottom: 1rem;">📷</div>
        <p>No photos yet this year</p>
        <button class="btn btn-primary" onclick="closePhotoGallery(); showMemoryModal();" style="margin-top: 1rem;">Add Memory with Photos</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = galleryPhotos.map((photo, idx) => `
    <div class="gallery-item" onclick="openLightbox(${idx})">
      <img src="${photo.url}" alt="${escapeHtml(photo.memoryTitle)}" onerror="this.parentElement.style.display='none'">
      <div class="gallery-item-overlay">
        ${escapeHtml(photo.memoryTitle)}<br>
        ${new Date(photo.memoryDate).toLocaleDateString()}
      </div>
    </div>
  `).join('');
}

function openLightbox(index) {
  currentLightboxIndex = index;
  updateLightbox();
  document.getElementById('photoLightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

// Open lightbox for memory photos specifically
let memoryLightboxPhotos = [];

function openMemoryPhotoLightbox(photos, startIndex = 0, memoryTitle = '', memoryDate = '') {
  memoryLightboxPhotos = photos.map(p => ({
    url: p.url,
    memoryTitle: memoryTitle,
    memoryDate: memoryDate
  }));
  
  // Use the memory photos array
  galleryPhotos = memoryLightboxPhotos;
  currentLightboxIndex = startIndex;
  updateLightbox();
  document.getElementById('photoLightbox').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Add counter display
  updateLightboxCounter();
}

function updateLightboxCounter() {
  let counter = document.getElementById('lightboxCounter');
  if (!counter) {
    counter = document.createElement('div');
    counter.id = 'lightboxCounter';
    counter.className = 'lightbox-counter';
    document.querySelector('.lightbox-content').appendChild(counter);
  }
  counter.textContent = `${currentLightboxIndex + 1} / ${galleryPhotos.length}`;
}

// Open lightbox from memory feed or memory cards
function openFeedPhotoLightbox(memoryId, startIndex = 0) {
  const memory = memories.find(m => m.id === memoryId);
  if (!memory || !memory.photos || memory.photos.length === 0) return;
  
  openMemoryPhotoLightbox(memory.photos, startIndex, memory.title, memory.occurredAt);
}

function closeLightbox() {
  document.getElementById('photoLightbox').classList.add('hidden');
  document.body.style.overflow = '';
}

function updateLightbox() {
  const photo = galleryPhotos[currentLightboxIndex];
  if (!photo) return;
  
  document.getElementById('lightboxImage').src = photo.url;
  document.getElementById('lightboxTitle').textContent = photo.memoryTitle || '';
  
  // Handle date display
  const dateEl = document.getElementById('lightboxDate');
  if (photo.memoryDate) {
    const date = new Date(photo.memoryDate);
    if (!isNaN(date.getTime())) {
      dateEl.textContent = date.toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      });
    } else {
      dateEl.textContent = '';
    }
  } else {
    dateEl.textContent = '';
  }
}

function lightboxPrev() {
  currentLightboxIndex = (currentLightboxIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
  updateLightbox();
  updateLightboxCounter();
}

function lightboxNext() {
  currentLightboxIndex = (currentLightboxIndex + 1) % galleryPhotos.length;
  updateLightbox();
  updateLightboxCounter();
}

// Keyboard navigation for lightbox
document.addEventListener('keydown', (e) => {
  if (document.getElementById('photoLightbox').classList.contains('hidden')) return;
  
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lightboxPrev();
  if (e.key === 'ArrowRight') lightboxNext();
});

// Touch swipe support for lightbox
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('DOMContentLoaded', () => {
  const lightbox = document.getElementById('photoLightbox');
  if (!lightbox) return;
  
  lightbox.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });
  
  lightbox.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });
});

function handleSwipe() {
  const swipeThreshold = 50;
  const diff = touchStartX - touchEndX;
  
  if (Math.abs(diff) < swipeThreshold) return;
  
  if (diff > 0) {
    // Swipe left - next photo
    lightboxNext();
  } else {
    // Swipe right - previous photo
    lightboxPrev();
  }
}

// =====================================================
// YEAR IN REVIEW
// =====================================================

let reviewMap = null;
let reviewMapMarkers = [];

function showYearReview() {
  document.getElementById('reviewYearTitle').textContent = currentViewYear;
  
  // Reset to timeline tab
  switchReviewTab('timeline');
  
  // Generate content
  generateYearReview();
  
  document.getElementById('yearReviewModal').classList.add('active');
}

function closeYearReview() {
  document.getElementById('yearReviewModal').classList.remove('active');
  
  // Clean up map
  if (reviewMap) {
    reviewMap.remove();
    reviewMap = null;
  }
}

function switchReviewTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.review-tab').forEach(btn => {
    btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab));
  });
  
  // Update tab content
  document.getElementById('reviewTimelineTab').classList.toggle('active', tab === 'timeline');
  document.getElementById('reviewMapTab').classList.toggle('active', tab === 'map');
  
  // Initialize map when switching to map tab
  if (tab === 'map') {
    setTimeout(() => initReviewMap(), 100);
  }
}

function generateYearReview() {
  const container = document.getElementById('yearReviewContent');
  
  // Gather stats
  const yearMemories = ensureArray(memories).filter(m => 
    new Date(m.occurredAt).getFullYear() === currentViewYear
  );
  
  const yearPlans = ensureArray(plans);
  const misogis = yearPlans.filter(p => p.type === 'misogi');
  const adventures = yearPlans.filter(p => p.type === 'adventure');
  const habits = yearPlans.filter(p => p.type === 'habit');
  
  const completedMisogis = misogis.filter(p => p.status === 'completed').length;
  const completedAdventures = adventures.filter(p => p.status === 'completed').length;
  const completedHabits = habits.filter(p => p.status === 'completed').length;
  
  // Count photos
  let totalPhotos = 0;
  yearMemories.forEach(m => {
    totalPhotos += (m.photos || []).length;
  });
  
  // Count locations
  const memoriesWithLocation = yearMemories.filter(m => m.location && m.location.lat);
  
  // Stats summary
  let html = `
    <div class="review-stats">
      <div class="review-stat">
        <div class="review-stat-value">${yearMemories.length}</div>
        <div class="review-stat-label">Memories</div>
      </div>
      <div class="review-stat">
        <div class="review-stat-value">${totalPhotos}</div>
        <div class="review-stat-label">Photos</div>
      </div>
      <div class="review-stat">
        <div class="review-stat-value">${completedAdventures}/${adventures.length}</div>
        <div class="review-stat-label">Adventures</div>
      </div>
      <div class="review-stat">
        <div class="review-stat-value">${memoriesWithLocation.length}</div>
        <div class="review-stat-label">Places</div>
      </div>
    </div>
  `;
  
  // Generate zig-zag timeline
  html += generateZigzagTimeline(yearPlans, yearMemories);
  
  container.innerHTML = html;
}

function generateZigzagTimeline(yearPlans, yearMemories) {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const isCurrentYear = currentViewYear === currentYear;
  
  let html = '<div class="zigzag-timeline"><div class="zigzag-line"></div>';
  
  months.forEach((monthName, monthIndex) => {
    // Get adventures for this month
    const monthAdventures = yearPlans.filter(p => {
      if (p.type !== 'adventure' && p.type !== 'misogi') return false;
      if (p.startDate) {
        const startDate = new Date(p.startDate);
        return startDate.getMonth() === monthIndex;
      }
      return parseInt(p.targetMonth) === monthIndex + 1;
    });
    
    // Sort by date
    monthAdventures.sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate) : new Date(currentViewYear, monthIndex, 15);
      const dateB = b.startDate ? new Date(b.startDate) : new Date(currentViewYear, monthIndex, 15);
      return dateA - dateB;
    });
    
    // Get memories for this month
    const monthMemories = yearMemories.filter(m => {
      const date = new Date(m.occurredAt);
      return date.getMonth() === monthIndex;
    });
    
    const hasEvents = monthAdventures.length > 0 || monthMemories.length > 0;
    const isCurrent = isCurrentYear && monthIndex === currentMonth;
    const isPast = isCurrentYear ? monthIndex < currentMonth : currentViewYear < currentYear;
    
    html += `
      <div class="timeline-month ${hasEvents ? 'has-events' : ''} ${isCurrent ? 'current' : ''}">
        <div class="timeline-month-marker">
          <div class="timeline-month-name">${monthName.substring(0, 3)}</div>
        </div>
        <div class="timeline-content">
          <div class="timeline-adventures">
    `;
    
    if (monthAdventures.length > 0) {
      monthAdventures.forEach(adventure => {
        // Find linked memories with photos
        const linkedMemories = monthMemories.filter(m => m.planId === adventure.id);
        const photos = linkedMemories.flatMap(m => m.photos || []).slice(0, 3);
        
        html += `
          <div class="timeline-adventure-card ${adventure.status === 'completed' ? 'completed' : ''} ${adventure.type}" 
               onclick="selectAdventureForMemories('${adventure.id}'); closeYearReview();">
            <div class="timeline-adventure-title">
              ${adventure.status === 'completed' ? '✅' : getCategoryIcon(adventure.category)} 
              ${escapeHtml(adventure.title)}
            </div>
            <div class="timeline-adventure-date">${formatDateRange(adventure.startDate, adventure.endDate) || monthName}</div>
            ${photos.length > 0 ? `
              <div class="timeline-adventure-photos">
                ${photos.map(p => `
                  <div class="timeline-adventure-photo">
                    <img src="${p.url}" alt="Photo" onerror="this.parentElement.style.display='none'">
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      });
    } else if (!isPast) {
      html += `<div class="timeline-empty-month">No adventures planned</div>`;
    } else {
      html += `<div class="timeline-empty-month">—</div>`;
    }
    
    html += `
          </div>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  return html;
}

function initReviewMap() {
  const mapContainer = document.getElementById('yearReviewMap');
  if (!mapContainer) return;
  
  // Get memories with location for the current year
  const yearMemories = ensureArray(memories).filter(m => {
    const year = new Date(m.occurredAt).getFullYear();
    return year === currentViewYear && m.location && m.location.lat && m.location.lng;
  });
  
  // Clean up existing map
  if (reviewMap) {
    reviewMap.remove();
    reviewMap = null;
  }
  
  // Default center (US)
  let center = [39.8283, -98.5795];
  let zoom = 4;
  
  // If we have memories, center on them
  if (yearMemories.length > 0) {
    const lats = yearMemories.map(m => m.location.lat);
    const lngs = yearMemories.map(m => m.location.lng);
    center = [
      lats.reduce((a, b) => a + b, 0) / lats.length,
      lngs.reduce((a, b) => a + b, 0) / lngs.length
    ];
    zoom = 6;
  }
  
  // Initialize map
  reviewMap = L.map('yearReviewMap').setView(center, zoom);
  
  // Add tile layer (OpenStreetMap)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(reviewMap);
  
  // Add markers
  reviewMapMarkers = [];
  const bounds = [];
  
  yearMemories.forEach(memory => {
    const lat = memory.location.lat;
    const lng = memory.location.lng;
    bounds.push([lat, lng]);
    
    // Create custom icon
    const hasPhoto = memory.photos && memory.photos.length > 0;
    const photoCount = memory.photos ? memory.photos.length : 0;
    
    const marker = L.marker([lat, lng]).addTo(reviewMap);
    
    // Create popup content with clickable photo
    const photoHtml = hasPhoto ? 
      `<div class="map-popup-photo" onclick="openMapMemoryPhotos('${memory.id}')"><img src="${memory.photos[0].url}" alt="Photo"></div>
       <div style="text-align:center;margin-top:4px;font-size:11px;color:#666;">Click to view ${photoCount} photo${photoCount > 1 ? 's' : ''}</div>` : '';
    
    marker.bindPopup(`
      <div class="map-popup">
        <div class="map-popup-title">${escapeHtml(memory.title)}</div>
        <div class="map-popup-date">${new Date(memory.occurredAt).toLocaleDateString()}</div>
        <div class="map-popup-location">${escapeHtml(memory.location.name || '')}</div>
        ${photoHtml}
      </div>
    `);
    
    marker.on('click', () => highlightMapMemory(memory.id));
    
    reviewMapMarkers.push({ marker, memoryId: memory.id });
  });
  
  // Fit bounds if we have markers
  if (bounds.length > 0) {
    reviewMap.fitBounds(bounds, { padding: [50, 50] });
  }
  
  // Render memory list
  renderMapMemoryList(yearMemories);
}

function renderMapMemoryList(memories) {
  const container = document.getElementById('mapMemoryList');
  if (!container) return;
  
  if (memories.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--sage-500);">
        <p>No memories with locations this year.</p>
        <p style="font-size: 0.85rem; margin-top: 0.5rem;">Add locations to your memories to see them on the map!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = memories.map(m => {
    const photo = m.photos && m.photos.length > 0 ? m.photos[0] : null;
    const photoCount = m.photos ? m.photos.length : 0;
    return `
      <div class="map-memory-item" data-memory-id="${m.id}" onclick="focusMapMarker('${m.id}')">
        <div class="map-memory-thumb" onclick="event.stopPropagation(); openMapMemoryPhotos('${m.id}')">
          ${photo ? `<img src="${photo.url}" alt="Photo" onerror="this.style.display='none'">` : '📍'}
        </div>
        <div class="map-memory-info">
          <div class="map-memory-title">${escapeHtml(m.title)}</div>
          <div class="map-memory-location">
            📍 ${escapeHtml(m.location.name || 'Unknown location')}
          </div>
        </div>
        <div class="map-memory-actions">
          ${photoCount > 0 ? `<button class="map-memory-view-btn" onclick="event.stopPropagation(); openMapMemoryPhotos('${m.id}')" title="View photos">📸 ${photoCount}</button>` : ''}
          <button class="map-memory-view-btn" onclick="event.stopPropagation(); openMemoryFromMap('${m.id}')" title="Edit memory">✏️</button>
        </div>
      </div>
    `;
  }).join('');
}

// Open photos from map view
function openMapMemoryPhotos(memoryId) {
  const memory = memories.find(m => m.id === memoryId);
  if (!memory || !memory.photos || memory.photos.length === 0) {
    showToast('No photos for this memory');
    return;
  }
  
  openMemoryPhotoLightbox(memory.photos, 0, memory.title, memory.occurredAt);
}

// Open memory for editing from map view
function openMemoryFromMap(memoryId) {
  closeYearReview();
  showMemoryModal(memoryId);
}

function focusMapMarker(memoryId) {
  const markerData = reviewMapMarkers.find(m => m.memoryId === memoryId);
  if (markerData && reviewMap) {
    const latlng = markerData.marker.getLatLng();
    reviewMap.setView(latlng, 12);
    markerData.marker.openPopup();
    highlightMapMemory(memoryId);
  }
}

function highlightMapMemory(memoryId) {
  document.querySelectorAll('.map-memory-item').forEach(item => {
    item.classList.toggle('active', item.dataset.memoryId === memoryId);
  });
}

function showSelectedAdventureInfo(adventureId) {
  const container = document.getElementById('selectedAdventureInfo');
  if (!container) return;
  
  const adventure = plans.find(p => p.id === adventureId);
  if (!adventure) {
    hideSelectedAdventureInfo();
    return;
  }
  
  const adventureDate = parseLocalDate(adventure.startDate);
  const isPastDue = adventureDate && adventureDate < new Date();
  const dateStr = formatDateRange(adventure.startDate, adventure.endDate);
  
  container.className = `selected-adventure-info ${isPastDue ? 'past-due' : ''}`;
  container.innerHTML = `
    <h4>${adventure.type === 'misogi' ? '🏔️' : '🎯'} ${escapeHtml(adventure.title)}</h4>
    <p>${dateStr ? dateStr + ' • ' : ''}${isPastDue ? 'Completed' : 'Upcoming'}</p>
  `;
  container.classList.remove('hidden');
}

function hideSelectedAdventureInfo() {
  const container = document.getElementById('selectedAdventureInfo');
  if (container) container.classList.add('hidden');
}

function selectAdventureForMemories(adventureId) {
  selectedAdventureFilter = adventureId;
  const select = document.getElementById('memoryFilter');
  if (select) select.value = adventureId;
  renderYearMemories(currentViewYear);
  
  // Scroll to memories section
  document.getElementById('yearMemories')?.scrollIntoView({ behavior: 'smooth' });
}

function renderReviewContent(year) {
  const container = document.getElementById('reviewContent');
  
  // Misogis
  const misogis = plans.filter(p => p.type === 'misogi');
  let html = '';
  
  if (misogis.length > 0) {
    html += `<div class="review-section"><h3>🏔️ Misogi</h3>`;
    html += misogis.map(p => `
      <div class="review-item">
        <span class="review-item-status">${p.status === 'completed' ? '✅' : '❌'}</span>
        <span class="review-item-title">${escapeHtml(p.title)}</span>
        <span class="review-item-month">${p.targetMonth ? getMonthName(p.targetMonth) : ''}</span>
      </div>
    `).join('');
    html += `</div>`;
  }
  
  // Adventures
  const adventures = plans.filter(p => p.type === 'adventure');
  if (adventures.length > 0) {
    html += `<div class="review-section"><h3>🎯 Adventures</h3>`;
    html += adventures.map(p => `
      <div class="review-item">
        <span class="review-item-status">${p.status === 'completed' ? '✅' : '❌'}</span>
        <span class="review-item-title">${escapeHtml(p.title)}</span>
        <span class="review-item-month">${p.targetMonth ? getMonthName(p.targetMonth) : ''}</span>
      </div>
    `).join('');
    html += `</div>`;
  }
  
  // Habits
  const habits = plans.filter(p => p.type === 'habit');
  if (habits.length > 0) {
    html += `<div class="review-section"><h3>🔄 Habits</h3>`;
    html += habits.map(p => `
      <div class="review-item">
        <span class="review-item-status">${p.status === 'completed' ? '✅' : '❌'}</span>
        <span class="review-item-title">${escapeHtml(p.title)}</span>
        <span class="review-item-month">Q${p.targetQuarter}</span>
      </div>
    `).join('');
    html += `</div>`;
  }
  
  if (!html) {
    html = '<p style="color: var(--sage-600); text-align: center; padding: 2rem;">No plans recorded for this year</p>';
  }
  
  container.innerHTML = html;
}

function renderSettings() {
  const auth = JSON.parse(localStorage.getItem('lifestack_auth') || '{}');
  document.getElementById('settingsName').value = currentUser?.name || '';
  document.getElementById('settingsEmail').value = auth.email || currentUser?.email || '';
  document.getElementById('settingsBirthdate').value = currentUser?.birthdate ? new Date(currentUser.birthdate).toLocaleDateString() : '';
  document.getElementById('settingsLifespan').value = currentUser?.lifespanYears ? currentUser.lifespanYears + ' years' : '';
  
  // Update avatar display
  updateAvatarDisplay();
  
  // Update PWA status
  updatePWAStatus();
}

function updatePWAStatus() {
  const statusEl = document.getElementById('pwaStatus');
  const installBtn = document.getElementById('installAppBtn');
  
  if (!statusEl) return;
  
  // Check if running as installed PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
  
  if (isStandalone) {
    statusEl.textContent = '✓ Running as installed app';
    statusEl.className = 'pwa-status installed';
    if (installBtn) installBtn.classList.add('hidden');
  } else {
    // Check if on iOS (can't auto-prompt, needs manual instruction)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      statusEl.innerHTML = '📲 To install: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>';
      statusEl.className = 'pwa-status';
      if (installBtn) installBtn.classList.add('hidden');
    } else {
      statusEl.textContent = '';
      // Install button visibility is handled by beforeinstallprompt event
    }
  }
}

function updateAvatarDisplay() {
  const initials = getUserInitials(currentUser?.name);
  const avatarUrl = currentUser?.avatarUrl;
  
  // Header avatar
  const headerInitials = document.getElementById('userAvatarInitials');
  const headerImage = document.getElementById('userAvatarImage');
  if (headerInitials) headerInitials.textContent = initials;
  
  if (avatarUrl && headerImage) {
    headerImage.src = avatarUrl;
    headerImage.style.display = 'block';
    if (headerInitials) headerInitials.style.display = 'none';
  } else if (headerImage) {
    headerImage.style.display = 'none';
    if (headerInitials) headerInitials.style.display = '';
  }
  
  // Settings avatar
  const settingsInitials = document.getElementById('settingsAvatarInitials');
  const settingsImage = document.getElementById('settingsAvatarImage');
  if (settingsInitials) settingsInitials.textContent = initials;
  
  if (avatarUrl && settingsImage) {
    settingsImage.src = avatarUrl;
    settingsImage.style.display = 'block';
    if (settingsInitials) settingsInitials.style.display = 'none';
  } else if (settingsImage) {
    settingsImage.style.display = 'none';
    if (settingsInitials) settingsInitials.style.display = '';
  }
}

async function handleAvatarSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.type.startsWith('image/')) {
    showError('Please select an image file');
    return;
  }
  
  // Check file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showError('Image must be less than 5MB');
    return;
  }
  
  showToast('Uploading avatar...');
  
  try {
    // Get presigned URL for avatar upload
    const tokens = await getValidTokens();
    if (!tokens?.idToken) {
      showError('Please sign in to upload avatar');
      return;
    }
    
    const userId = currentUser?.id || 'user';
    const fileName = `avatar_${Date.now()}.${file.name.split('.').pop()}`;
    
    // Request upload URL
    const urlResponse = await fetch(`${CONFIG.API_URL}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify({ 
        fileName: fileName, 
        fileType: file.type, 
        memoryId: 'avatars'  // Use 'avatars' folder
      })
    });
    
    if (!urlResponse.ok) {
      throw new Error('Failed to get upload URL');
    }
    
    const urlData = await urlResponse.json();
    
    // Upload to S3
    const uploadResponse = await fetch(urlData.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image');
    }
    
    // Save avatar URL to user profile
    const updateResponse = await fetch(`${CONFIG.API_URL}/users`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify({ avatarUrl: urlData.viewUrl })
    });
    
    if (updateResponse.ok) {
      const updatedUser = await updateResponse.json();
      currentUser = { ...currentUser, avatarUrl: urlData.viewUrl };
      localStorage.setItem('lifestack_user', JSON.stringify(currentUser));
      updateAvatarDisplay();
      showToast('✓ Avatar updated!');
    } else {
      throw new Error('Failed to save avatar');
    }
    
  } catch (error) {
    console.error('Avatar upload error:', error);
    showError('Failed to upload avatar: ' + error.message);
  }
  
  // Clear the input so the same file can be selected again
  event.target.value = '';
}

// =====================================================
// UTILITIES
// =====================================================

function getUserInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getMonthName(month) {
  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month] || '';
}

// Format date as "Jan 15" style for dropdowns
function formatDateShort(dateStr) {
  const date = parseLocalDate(dateStr);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('error');
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showError(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('error', 'show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =====================================================
// SHARING FUNCTIONS
// =====================================================

function showShareModal() {
  // Reset form
  document.getElementById('shareEverything').checked = false;
  document.getElementById('shareMisogi').checked = false;
  document.getElementById('shareHabits').checked = false;
  document.getElementById('shareAdventures').checked = false;
  document.getElementById('shareMemories').checked = false;
  document.querySelector('input[name="sharePermission"][value="view"]').checked = true;
  document.getElementById('shareContact').value = '';
  document.getElementById('shareResult').classList.add('hidden');
  document.getElementById('shareForm').classList.remove('hidden');
  
  // Enable individual checkboxes
  document.querySelectorAll('.share-item-check').forEach(cb => cb.disabled = false);
  
  document.getElementById('shareModal').classList.add('active');
}

function toggleShareAll(checkbox) {
  const itemChecks = document.querySelectorAll('.share-item-check');
  if (checkbox.checked) {
    // Check all and disable individual selection
    itemChecks.forEach(cb => {
      cb.checked = true;
      cb.disabled = true;
    });
  } else {
    // Uncheck all and enable individual selection
    itemChecks.forEach(cb => {
      cb.checked = false;
      cb.disabled = false;
    });
  }
}

function closeShareModal() {
  document.getElementById('shareModal').classList.remove('active');
}

async function handleShareSubmit(event) {
  event.preventDefault();
  
  const contact = document.getElementById('shareContact').value.trim();
  const permission = document.querySelector('input[name="sharePermission"]:checked').value;
  
  // Get what's being shared
  const shareEverything = document.getElementById('shareEverything').checked;
  const shareMisogi = document.getElementById('shareMisogi').checked;
  const shareHabits = document.getElementById('shareHabits').checked;
  const shareAdventures = document.getElementById('shareAdventures').checked;
  const shareMemories = document.getElementById('shareMemories').checked;
  
  if (!contact) {
    showError('Please enter an email or phone number');
    return;
  }
  
  // Check at least one thing is selected
  if (!shareEverything && !shareMisogi && !shareHabits && !shareAdventures && !shareMemories) {
    showError('Please select what you want to share');
    return;
  }
  
  const btn = document.getElementById('shareSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Creating share link...';
  
  // Build share type
  let shareType = 'custom';
  let shareItems = [];
  if (shareEverything) {
    shareType = 'year';
    shareItems = ['misogi', 'habits', 'adventures', 'memories'];
  } else {
    if (shareMisogi) shareItems.push('misogi');
    if (shareHabits) shareItems.push('habits');
    if (shareAdventures) shareItems.push('adventures');
    if (shareMemories) shareItems.push('memories');
  }
  
  const shareData = {
    recipientContact: contact,
    contactType: contact.includes('@') ? 'email' : 'phone',
    shareType: shareType,
    shareItems: shareItems,
    permission: permission,
    year: currentViewYear
  };
  
  const result = await createShare(shareData);
  
  btn.disabled = false;
  btn.textContent = 'Create Share Link';
  
  if (result && result.inviteLink) {
    // Show the invite link
    document.getElementById('shareForm').classList.add('hidden');
    document.getElementById('shareResult').classList.remove('hidden');
    document.getElementById('shareInviteLink').value = result.inviteLink;
    
    // Refresh shares list
    shares = await fetchShares();
    
    showToast('Share link created!');
  } else {
    showError('Failed to create share link');
  }
}

function copyShareLink() {
  const linkInput = document.getElementById('shareInviteLink');
  linkInput.select();
  document.execCommand('copy');
  showToast('Link copied to clipboard!');
}

async function loadShares() {
  shares = await fetchShares();
  renderSharesList();
}

function renderSharesList() {
  const sentContainer = document.getElementById('sharesSentList');
  const receivedContainer = document.getElementById('sharesReceivedList');
  
  if (!sentContainer || !receivedContainer) return;
  
  // Render sent shares
  if (shares.sent.length === 0) {
    sentContainer.innerHTML = '<p class="no-shares">No shares sent yet</p>';
  } else {
    sentContainer.innerHTML = shares.sent.map(share => `
      <div class="share-item ${share.status}">
        <div class="share-item-info">
          <span class="share-item-title">${escapeHtml(share.itemTitle || share.shareType)}</span>
          <span class="share-item-recipient">→ ${escapeHtml(share.recipientContact)}</span>
          <span class="share-item-status ${share.status}">${share.status === 'accepted' ? '✓ Accepted' : '⏳ Pending'}</span>
        </div>
        <div class="share-item-actions">
          <button class="btn btn-small" onclick="copyToClipboard('${share.inviteLink || ''}')">📋 Copy Link</button>
          <button class="btn btn-small btn-danger" onclick="handleDeleteShare('${share.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }
  
  // Render received shares
  if (shares.received.length === 0) {
    receivedContainer.innerHTML = '<p class="no-shares">No shares received yet</p>';
  } else {
    receivedContainer.innerHTML = shares.received.map(share => `
      <div class="share-item received ${share.status}">
        <div class="share-item-info">
          <span class="share-item-title">${escapeHtml(share.itemTitle || share.shareType)}</span>
          <span class="share-item-from">← from ${escapeHtml(share.ownerName || share.ownerEmail)}</span>
          <span class="share-item-status ${share.status}">${share.status === 'accepted' ? '✓ Connected' : '⏳ Pending'}</span>
        </div>
        <div class="share-item-actions">
          ${share.status === 'pending' ? `<button class="btn btn-small btn-primary" onclick="handleAcceptShare('${share.inviteCode}')">Accept</button>` : ''}
          <button class="btn btn-small btn-danger" onclick="handleDeleteShare('${share.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
  }
}

async function handleDeleteShare(shareId) {
  if (!confirm('Remove this share?')) return;
  
  const success = await deleteShare(shareId);
  if (success) {
    shares = await fetchShares();
    renderSharesList();
    showToast('Share removed');
  } else {
    showError('Failed to remove share');
  }
}

async function handleAcceptShare(inviteCode) {
  const result = await acceptShare(inviteCode);
  if (result) {
    shares = await fetchShares();
    renderSharesList();
    showToast('Share accepted! You can now see shared items.');
  } else {
    showError('Failed to accept share');
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  }).catch(() => {
    showError('Failed to copy');
  });
}

// Check for invite code in URL on page load
async function checkForInviteCode() {
  // Check for query parameter format: ?invite=CODE
  const urlParams = new URLSearchParams(window.location.search);
  let inviteCode = urlParams.get('invite');
  
  // Also check for path format: /invite/CODE (for backwards compatibility)
  if (!inviteCode) {
    const path = window.location.pathname;
    const match = path.match(/\/invite\/([A-Za-z0-9]+)/);
    if (match) {
      inviteCode = match[1];
    }
  }
  
  if (inviteCode) {
    console.log('Found invite code:', inviteCode);
    
    // If user is logged in, accept the invite
    const tokens = localStorage.getItem('lifestack_tokens');
    if (tokens) {
      showToast('Accepting invite...');
      const result = await acceptShare(inviteCode);
      if (result) {
        showToast('🎉 Invite accepted! You can now see shared items.');
        // Refresh shares
        shares = await fetchShares();
        // Clear the URL parameters
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        showError('Invalid or expired invite link');
      }
    } else {
      // Store invite code and prompt login
      localStorage.setItem('pendingInviteCode', inviteCode);
      showToast('Please sign in to accept this invite');
      showSignIn();
    }
  }
}

// After login, check for pending invite
async function processPendingInvite() {
  const inviteCode = localStorage.getItem('pendingInviteCode');
  if (inviteCode) {
    console.log('Processing pending invite:', inviteCode);
    localStorage.removeItem('pendingInviteCode');
    showToast('Accepting invite...');
    const result = await acceptShare(inviteCode);
    if (result) {
      showToast('🎉 Invite accepted! You can now see shared items.');
      // Refresh shares
      shares = await fetchShares();
      // Clear the URL parameters if any
      if (window.location.search.includes('invite=')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    } else {
      showError('Failed to accept invite');
    }
  }
}

function showManageShares() {
  loadShares();
  document.getElementById('manageSharesModal').classList.add('active');
}

function closeManageSharesModal() {
  document.getElementById('manageSharesModal').classList.remove('active');
}

// =====================================================
// CALENDAR EXPORT FUNCTIONALITY
// =====================================================

let currentCalendarPlan = null;

function showCalendarExport(planId) {
  const plan = plans.find(p => p.id === planId);
  if (!plan) {
    showError('Plan not found');
    return;
  }
  
  currentCalendarPlan = plan;
  document.getElementById('calendarExportTitle').textContent = plan.title;
  document.getElementById('calendarExportModal').classList.add('active');
}

function closeCalendarExport() {
  document.getElementById('calendarExportModal').classList.remove('active');
  currentCalendarPlan = null;
}

function exportToGoogleCalendar() {
  if (!currentCalendarPlan) return;
  
  const plan = currentCalendarPlan;
  const startDate = plan.startDate ? new Date(plan.startDate) : null;
  const endDate = plan.endDate ? new Date(plan.endDate) : startDate;
  
  if (!startDate) {
    showError('Please set a date for this adventure first');
    return;
  }
  
  // Format dates for Google Calendar (YYYYMMDD format)
  const formatGoogleDate = (date) => {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  };
  
  // For all-day events, end date needs to be the next day
  const adjustedEndDate = new Date(endDate);
  adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
  
  const title = encodeURIComponent(plan.title);
  const details = encodeURIComponent(plan.description || '');
  const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(adjustedEndDate)}`;
  
  // Build Google Calendar URL
  const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&sf=true&output=xml`;
  
  // Open in new tab
  window.open(googleUrl, '_blank');
  
  closeCalendarExport();
  showToast('Opening Google Calendar...');
}

function exportToAppleCalendar() {
  downloadICSFile();
}

function exportToOutlook() {
  downloadICSFile();
}

function downloadICSFile() {
  if (!currentCalendarPlan) return;
  
  const plan = currentCalendarPlan;
  const startDate = plan.startDate ? new Date(plan.startDate) : null;
  const endDate = plan.endDate ? new Date(plan.endDate) : startDate;
  
  if (!startDate) {
    showError('Please set a date for this adventure first');
    return;
  }
  
  // Format date for ICS (YYYYMMDD format for all-day events)
  const formatICSDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };
  
  // For all-day events, end date needs to be the next day in ICS format
  const adjustedEndDate = new Date(endDate);
  adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);
  
  // Generate unique ID
  const uid = `${plan.id}@lifestack`;
  
  // Escape special characters for ICS
  const escapeICS = (text) => {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };
  
  // Build ICS content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LifeStack//Adventure//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}T000000Z`,
    `DTSTART;VALUE=DATE:${formatICSDate(startDate)}`,
    `DTEND;VALUE=DATE:${formatICSDate(adjustedEndDate)}`,
    `SUMMARY:${escapeICS(plan.title)}`,
    plan.description ? `DESCRIPTION:${escapeICS(plan.description)}` : '',
    `CATEGORIES:${plan.type === 'misogi' ? 'MISOGI' : 'ADVENTURE'}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(line => line).join('\r\n');
  
  // Create and download file
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${plan.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  closeCalendarExport();
  showToast('✓ Calendar file downloaded!');
}

// =====================================================
// PUSH NOTIFICATIONS
// =====================================================

// VAPID public key - generate your own at https://vapidkeys.com/
const VAPID_PUBLIC_KEY = 'BNOk2nkfS_4X4JYOj082lZy8_kYqeddZfC2NL-PDGpRIr-Ia4t1l196Hr_3hNGgrI_VN_01bu1aZ2ivs9xPlbSI'; // Replace with your key

let notificationPreferences = {
  email: true,
  push: false
};

// Load notification preferences
async function loadNotificationPreferences() {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return;
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/notifications/preferences`, {
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    
    if (response.ok) {
      notificationPreferences = await response.json();
      updateNotificationUI();
    }
  } catch (error) {
    console.log('Could not load notification preferences:', error);
  }
}

// Update notification preference toggles in UI
function updateNotificationUI() {
  const emailToggle = document.getElementById('notifEmailToggle');
  const pushToggle = document.getElementById('notifPushToggle');
  
  if (emailToggle) emailToggle.checked = notificationPreferences.email !== false;
  if (pushToggle) pushToggle.checked = notificationPreferences.push === true;
  
  // Update push status
  updatePushNotificationStatus();
}

// Save notification preferences
async function updateNotificationPrefs() {
  const emailToggle = document.getElementById('notifEmailToggle');
  
  notificationPreferences.email = emailToggle?.checked ?? true;
  
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return;
  
  try {
    await fetch(`${CONFIG.API_URL}/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify(notificationPreferences)
    });
    
    showToast('✓ Preferences saved');
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
}

// Toggle push notifications
async function togglePushNotifications() {
  const pushToggle = document.getElementById('notifPushToggle');
  const statusEl = document.getElementById('pushNotifStatus');
  
  if (pushToggle.checked) {
    // Enable push notifications
    const result = await subscribeToPushNotifications();
    if (!result.success) {
      pushToggle.checked = false;
      if (statusEl) {
        statusEl.textContent = result.error;
        statusEl.className = 'notification-status error';
      }
      return;
    }
    
    notificationPreferences.push = true;
    if (statusEl) {
      statusEl.textContent = '✓ Push notifications enabled';
      statusEl.className = 'notification-status success';
    }
  } else {
    // Disable push notifications
    await unsubscribeFromPushNotifications();
    notificationPreferences.push = false;
    if (statusEl) {
      statusEl.textContent = '';
    }
  }
  
  // Save preference
  await updateNotificationPrefs();
}

// Subscribe to push notifications
async function subscribeToPushNotifications() {
  // Check if push is supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Push notifications not supported on this device' };
  }
  
  // Check if running as installed PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
  
  if (!isStandalone) {
    return { success: false, error: 'Install the app first to enable push notifications' };
  }
  
  try {
    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission denied' };
    }
    
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    
    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    
    // Send subscription to server
    const tokens = await getValidTokens();
    if (tokens?.idToken) {
      await fetch(`${CONFIG.API_URL}/notifications/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.idToken}`
        },
        body: JSON.stringify(subscription)
      });
    }
    
    console.log('Push subscription:', subscription);
    return { success: true };
    
  } catch (error) {
    console.error('Push subscription error:', error);
    return { success: false, error: error.message };
  }
}

// Unsubscribe from push notifications
async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('Unsubscribed from push');
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
  }
}

// Update push notification status display
async function updatePushNotificationStatus() {
  const statusEl = document.getElementById('pushNotifStatus');
  const pushToggle = document.getElementById('notifPushToggle');
  
  if (!statusEl) return;
  
  // Check if push is supported
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    statusEl.textContent = 'Push notifications not supported on this device';
    statusEl.className = 'notification-status';
    if (pushToggle) pushToggle.disabled = true;
    return;
  }
  
  // Check if installed as PWA
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;
  
  if (!isStandalone) {
    statusEl.textContent = 'Install the app to enable push notifications';
    statusEl.className = 'notification-status';
    if (pushToggle) pushToggle.disabled = true;
    return;
  }
  
  // Check current subscription status
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      statusEl.textContent = '✓ Push notifications active';
      statusEl.className = 'notification-status success';
      if (pushToggle) {
        pushToggle.checked = true;
        pushToggle.disabled = false;
      }
    } else {
      statusEl.textContent = '';
      if (pushToggle) pushToggle.disabled = false;
    }
  } catch (error) {
    statusEl.textContent = '';
    if (pushToggle) pushToggle.disabled = false;
  }
}

// Helper: Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// =====================================================
// BUCKET LIST UI FUNCTIONS
// =====================================================

function showBucketListModal() {
  // Load cached bucket list
  const cached = localStorage.getItem('lifestack_bucketlist');
  if (cached) {
    bucketList = JSON.parse(cached);
  }
  
  // Reset UI state
  document.getElementById('bucketListVoiceStatus').textContent = '';
  document.getElementById('bucketListVoiceStatus').classList.remove('error');
  document.getElementById('bucketListTranscript').textContent = '';
  document.getElementById('bucketListAiMessage').classList.add('hidden');
  
  // Render current list
  renderBucketList();
  
  // Show modal
  document.getElementById('bucketListModal').classList.add('active');
  
  // Fetch fresh data in background
  fetchBucketList().then(() => renderBucketList());
}

function closeBucketListModal() {
  stopBucketListRecording();
  document.getElementById('bucketListModal').classList.remove('active');
}

function renderBucketList() {
  const container = document.getElementById('bucketListItems');
  if (!container) return;
  
  if (bucketList.length === 0) {
    container.innerHTML = `
      <div class="bucket-list-empty">
        <div class="bucket-list-empty-icon">🪣</div>
        <h3>Your bucket list is empty</h3>
        <p>Tap the microphone and tell me your dreams!</p>
        <p class="bucket-list-hint">Try saying: "I want to travel to Japan, learn to surf, and write a book"</p>
      </div>
    `;
    return;
  }
  
  // Group by category
  const grouped = {};
  bucketList.forEach(item => {
    const cat = item.category || 'other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  
  const categoryIcons = {
    travel: '✈️', adventure: '🏔️', skills: '🎯', experiences: '🎭',
    personal: '💫', health: '💪', creative: '🎨', relationships: '❤️',
    career: '💼', other: '📌'
  };
  
  const categoryNames = {
    travel: 'Travel', adventure: 'Adventure', skills: 'Skills & Learning',
    experiences: 'Experiences', personal: 'Personal Growth', health: 'Health & Fitness',
    creative: 'Creative', relationships: 'Relationships', career: 'Career', other: 'Other'
  };
  
  let html = '';
  
  // Stats at top
  const dreamCount = bucketList.filter(i => i.status === 'dream').length;
  const plannedCount = bucketList.filter(i => i.status === 'planned').length;
  const completedCount = bucketList.filter(i => i.status === 'completed').length;
  
  html += `
    <div class="bucket-list-stats">
      <div class="bucket-stat"><span class="bucket-stat-value">${dreamCount}</span><span class="bucket-stat-label">Dreams</span></div>
      <div class="bucket-stat"><span class="bucket-stat-value">${plannedCount}</span><span class="bucket-stat-label">Planned</span></div>
      <div class="bucket-stat"><span class="bucket-stat-value">${completedCount}</span><span class="bucket-stat-label">Done</span></div>
    </div>
  `;
  
  // Render by category
  for (const [category, items] of Object.entries(grouped)) {
    html += `
      <div class="bucket-category">
        <div class="bucket-category-header">
          <span class="bucket-category-icon">${categoryIcons[category] || '📌'}</span>
          <span class="bucket-category-name">${categoryNames[category] || category}</span>
          <span class="bucket-category-count">${items.length}</span>
        </div>
        <div class="bucket-category-items">
    `;
    
    items.forEach(item => {
      const statusClass = item.status || 'dream';
      const statusIcon = item.status === 'completed' ? '✅' : item.status === 'planned' ? '📅' : '💭';
      const difficultyBadge = item.difficulty ? `<span class="bucket-difficulty ${item.difficulty}">${item.difficulty}</span>` : '';
      
      html += `
        <div class="bucket-item ${statusClass}" data-id="${item.id}">
          <div class="bucket-item-header">
            <span class="bucket-item-status">${statusIcon}</span>
            <span class="bucket-item-title">${escapeHtml(item.title)}</span>
            ${difficultyBadge}
          </div>
          ${item.description ? `<p class="bucket-item-desc">${escapeHtml(item.description)}</p>` : ''}
          <div class="bucket-item-actions">
            ${item.status !== 'planned' && item.status !== 'completed' ? `<button class="btn btn-small" onclick="scheduleBucketItem('${item.id}')">📅 Schedule</button>` : ''}
            ${item.status === 'planned' ? `<button class="btn btn-small" onclick="completeBucketItem('${item.id}')">✅ Complete</button>` : ''}
            <button class="btn btn-small btn-danger" onclick="removeBucketItem('${item.id}')">🗑️</button>
          </div>
          ${item.plannedYear ? `<div class="bucket-item-planned">Planned for ${item.plannedYear}</div>` : ''}
        </div>
      `;
    });
    
    html += `</div></div>`;
  }
  
  container.innerHTML = html;
}

// Voice Recording for Bucket List
function initBucketListSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    bucketListRecognition = new SpeechRecognition();
    bucketListRecognition.continuous = true;
    bucketListRecognition.interimResults = true;
    bucketListRecognition.lang = 'en-US';
    
    let fullTranscript = '';
    
    bucketListRecognition.onstart = function() {
      isBucketListRecording = true;
      fullTranscript = '';
      document.getElementById('bucketListVoiceBtn').classList.add('recording');
      document.getElementById('bucketListVoiceText').textContent = 'Listening...';
      document.getElementById('bucketListVoiceStatus').textContent = 'Speak your bucket list dreams...';
      document.getElementById('bucketListVoiceStatus').classList.remove('error');
    };
    
    bucketListRecognition.onresult = function(event) {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          fullTranscript += transcript + ' ';
        } else {
          interimTranscript = transcript;
        }
      }
      
      document.getElementById('bucketListTranscript').textContent = fullTranscript + interimTranscript;
    };
    
    bucketListRecognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      stopBucketListRecording();
      
      let errorMsg = 'Speech recognition error';
      if (event.error === 'no-speech') errorMsg = 'No speech detected. Try again.';
      else if (event.error === 'not-allowed') errorMsg = 'Microphone access denied.';
      
      document.getElementById('bucketListVoiceStatus').textContent = errorMsg;
      document.getElementById('bucketListVoiceStatus').classList.add('error');
    };
    
    bucketListRecognition.onend = function() {
      if (isBucketListRecording) {
        const transcript = document.getElementById('bucketListTranscript').textContent.trim();
        if (transcript.length > 10) {
          stopBucketListRecording();
          processBucketListVoice(transcript);
        } else {
          try { bucketListRecognition.start(); } catch (e) { stopBucketListRecording(); }
        }
      }
    };
    
    return true;
  }
  return false;
}

function toggleBucketListRecording() {
  if (!bucketListRecognition) {
    if (!initBucketListSpeechRecognition()) {
      document.getElementById('bucketListVoiceStatus').textContent = 'Voice input not supported. Try Chrome or Edge.';
      document.getElementById('bucketListVoiceStatus').classList.add('error');
      return;
    }
  }
  
  if (isBucketListRecording) {
    stopBucketListRecording();
    const transcript = document.getElementById('bucketListTranscript').textContent.trim();
    if (transcript.length > 5) processBucketListVoice(transcript);
  } else {
    startBucketListRecording();
  }
}

function startBucketListRecording() {
  try {
    document.getElementById('bucketListTranscript').textContent = '';
    bucketListRecognition.start();
  } catch (e) {
    console.error('Failed to start bucket list recording:', e);
    document.getElementById('bucketListVoiceStatus').textContent = 'Failed to start. Try again.';
    document.getElementById('bucketListVoiceStatus').classList.add('error');
  }
}

function stopBucketListRecording() {
  isBucketListRecording = false;
  if (bucketListRecognition) {
    try { bucketListRecognition.stop(); } catch (e) {}
  }
  document.getElementById('bucketListVoiceBtn').classList.remove('recording');
  document.getElementById('bucketListVoiceText').textContent = 'Tap to speak';
}

async function processBucketListVoice(transcript) {
  document.getElementById('bucketListVoiceStatus').textContent = '🤖 AI is thinking...';
  document.getElementById('bucketListVoiceBtn').disabled = true;
  
  // Determine action based on context
  const action = bucketList.length === 0 || 
    transcript.toLowerCase().includes('add') || 
    transcript.toLowerCase().includes('want to') ||
    transcript.toLowerCase().includes('dream of') ||
    transcript.toLowerCase().includes('i want')
      ? 'generate' : 'modify';
  
  const result = await processBucketListWithAI(action, transcript);
  
  document.getElementById('bucketListVoiceBtn').disabled = false;
  
  if (result && !result.error) {
    document.getElementById('bucketListVoiceStatus').textContent = '';
    document.getElementById('bucketListTranscript').textContent = '';
    
    const msgEl = document.getElementById('bucketListAiMessage');
    msgEl.textContent = result.message || 'Bucket list updated!';
    msgEl.classList.remove('hidden');
    setTimeout(() => msgEl.classList.add('hidden'), 5000);
    
    renderBucketList();
    showToast(result.message || '✨ Bucket list updated!');
  } else {
    document.getElementById('bucketListVoiceStatus').textContent = result?.error || 'Failed to process. Try again.';
    document.getElementById('bucketListVoiceStatus').classList.add('error');
  }
}

async function scheduleBucketItem(itemId) {
  const item = bucketList.find(i => i.id === itemId);
  if (!item) return;
  
  closeBucketListModal();
  showAddPlanModal('adventure');
  
  setTimeout(() => {
    document.getElementById('planTitle').value = item.title;
    document.getElementById('planDescription').value = item.description || '';
    
    const categoryMap = {
      travel: 'travel', adventure: 'hiking', skills: 'learning', experiences: 'other',
      personal: 'other', health: 'running', creative: 'art', relationships: 'other', career: 'conference'
    };
    
    document.getElementById('planCategory').value = categoryMap[item.category] || 'other';
    document.getElementById('planForm').dataset.bucketItemId = itemId;
  }, 100);
}

async function completeBucketItem(itemId) {
  const item = bucketList.find(i => i.id === itemId);
  if (!item) return;
  
  item.status = 'completed';
  item.completedAt = new Date().toISOString();
  item.completedYear = new Date().getFullYear();
  
  const success = await saveBucketList(bucketList);
  if (success) {
    renderBucketList();
    showToast('🎉 Bucket list item completed!');
  } else {
    showError('Failed to save');
  }
}

async function removeBucketItem(itemId) {
  if (!confirm('Remove this from your bucket list?')) return;
  
  bucketList = bucketList.filter(i => i.id !== itemId);
  
  const success = await saveBucketList(bucketList);
  if (success) {
    renderBucketList();
    showToast('Item removed');
  } else {
    showError('Failed to save');
  }
}

async function addManualBucketItem() {
  const title = document.getElementById('manualBucketTitle').value.trim();
  if (!title) { showError('Please enter a title'); return; }
  
  const newItem = {
    id: `bucket_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title,
    category: document.getElementById('manualBucketCategory').value || 'other',
    status: 'dream',
    createdAt: new Date().toISOString(),
    aiGenerated: false
  };
  
  bucketList.push(newItem);
  
  const success = await saveBucketList(bucketList);
  if (success) {
    document.getElementById('manualBucketTitle').value = '';
    renderBucketList();
    showToast('✨ Added to bucket list!');
  } else {
    showError('Failed to save');
  }
}

function linkAdventureToBucketItem(adventureId, bucketItemId) {
  const item = bucketList.find(i => i.id === bucketItemId);
  if (item) {
    item.status = 'planned';
    item.linkedAdventureId = adventureId;
    item.plannedYear = currentViewYear;
    saveBucketList(bucketList);
  }
}

function getBucketListStatsForYear(year) {
  const completed = bucketList.filter(i => i.completedYear === year);
  const planned = bucketList.filter(i => i.plannedYear === year);
  return { completedCount: completed.length, plannedCount: planned.length, completedItems: completed, plannedItems: planned };
}

// =====================================================
// JOURNAL FUNCTIONALITY
// =====================================================

let journalEntries = [];
let currentJournalMood = null;
let isRecording = false;
let recognition = null;

// Initialize Speech Recognition
function initSpeechRecognition() {
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = function() {
      isRecording = true;
      document.getElementById('voiceRecordBtn').classList.add('recording');
      document.getElementById('voiceRecordText').textContent = 'Listening...';
      document.getElementById('voiceStatus').textContent = 'Speak now...';
      document.getElementById('voiceStatus').classList.remove('error');
    };
    
    recognition.onresult = function(event) {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // Append to existing text
      const textArea = document.getElementById('journalText');
      if (finalTranscript) {
        const currentText = textArea.value;
        const needsSpace = currentText && !currentText.endsWith(' ') && !currentText.endsWith('\n');
        textArea.value = currentText + (needsSpace ? ' ' : '') + finalTranscript;
      }
      
      // Show interim results in status
      if (interimTranscript) {
        document.getElementById('voiceStatus').textContent = interimTranscript;
      }
    };
    
    recognition.onerror = function(event) {
      console.error('Speech recognition error:', event.error);
      stopRecording();
      
      let errorMsg = 'Speech recognition error';
      if (event.error === 'no-speech') {
        errorMsg = 'No speech detected. Try again.';
      } else if (event.error === 'not-allowed') {
        errorMsg = 'Microphone access denied. Please allow microphone access.';
      } else if (event.error === 'network') {
        errorMsg = 'Network error. Check your connection.';
      }
      
      document.getElementById('voiceStatus').textContent = errorMsg;
      document.getElementById('voiceStatus').classList.add('error');
    };
    
    recognition.onend = function() {
      if (isRecording) {
        // Restart if we're still supposed to be recording
        try {
          recognition.start();
        } catch (e) {
          stopRecording();
        }
      }
    };
    
    return true;
  }
  return false;
}

function toggleVoiceRecording() {
  if (!recognition) {
    if (!initSpeechRecognition()) {
      document.getElementById('voiceStatus').textContent = 'Voice input not supported in this browser. Try Chrome or Edge.';
      document.getElementById('voiceStatus').classList.add('error');
      return;
    }
  }
  
  if (isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  try {
    recognition.start();
  } catch (e) {
    console.error('Failed to start recognition:', e);
    document.getElementById('voiceStatus').textContent = 'Failed to start. Try again.';
    document.getElementById('voiceStatus').classList.add('error');
  }
}

function stopRecording() {
  isRecording = false;
  if (recognition) {
    try {
      recognition.stop();
    } catch (e) {}
  }
  document.getElementById('voiceRecordBtn').classList.remove('recording');
  document.getElementById('voiceRecordText').textContent = 'Tap to speak';
  document.getElementById('voiceStatus').textContent = '';
}

function selectMood(mood) {
  currentJournalMood = mood;
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.mood === mood);
  });
}

function showJournalModal(entry = null) {
  // Reset form
  document.getElementById('journalEntryId').value = '';
  document.getElementById('journalText').value = '';
  document.getElementById('journalTags').value = '';
  currentJournalMood = null;
  document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
  
  // Stop any ongoing recording
  stopRecording();
  
  const now = new Date();
  
  if (entry) {
    // Edit mode
    document.getElementById('journalModalTitle').textContent = '📝 Edit Entry';
    document.getElementById('journalEntryId').value = entry.id;
    document.getElementById('journalText').value = entry.text || '';
    document.getElementById('journalTags').value = (entry.tags || []).join(', ');
    
    if (entry.mood) {
      selectMood(entry.mood);
    }
    
    const entryDate = new Date(entry.createdAt);
    document.getElementById('journalModalDate').textContent = entryDate.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
    
    document.getElementById('saveJournalBtn').textContent = 'Update Entry';
    document.getElementById('deleteJournalBtn').style.display = 'block';
  } else {
    // Create mode
    document.getElementById('journalModalTitle').textContent = '📝 New Journal Entry';
    document.getElementById('journalModalDate').textContent = now.toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    document.getElementById('saveJournalBtn').textContent = 'Save Entry';
    document.getElementById('deleteJournalBtn').style.display = 'none';
  }
  
  document.getElementById('journalModal').classList.add('active');
  
  // Focus on text area after modal opens
  setTimeout(() => document.getElementById('journalText').focus(), 100);
}

function closeJournalModal() {
  stopRecording();
  document.getElementById('journalModal').classList.remove('active');
}

async function saveJournalEntry() {
  const text = document.getElementById('journalText').value.trim();
  
  if (!text) {
    showError('Please write something in your journal entry');
    return;
  }
  
  const entryId = document.getElementById('journalEntryId').value;
  const tagsInput = document.getElementById('journalTags').value;
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
  
  const tokens = await getValidTokens();
  if (!tokens?.idToken) {
    showError('Please sign in to save journal entries');
    return;
  }
  
  const entryData = {
    text,
    mood: currentJournalMood,
    tags
  };
  
  try {
    document.getElementById('saveJournalBtn').disabled = true;
    document.getElementById('saveJournalBtn').textContent = 'Saving...';
    
    let response;
    if (entryId) {
      // Update existing
      response = await fetch(`${CONFIG.API_URL}/journals/${entryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.idToken}`
        },
        body: JSON.stringify(entryData)
      });
    } else {
      // Create new
      response = await fetch(`${CONFIG.API_URL}/journals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.idToken}`
        },
        body: JSON.stringify(entryData)
      });
    }
    
    if (response.ok) {
      const savedEntry = await response.json();
      
      if (entryId) {
        // Update in local array
        const index = journalEntries.findIndex(e => e.id === entryId);
        if (index !== -1) journalEntries[index] = savedEntry;
      } else {
        // Add to beginning of array
        journalEntries.unshift(savedEntry);
      }
      
      // Cache locally
      localStorage.setItem('lifestack_journals', JSON.stringify(journalEntries));
      
      closeJournalModal();
      renderJournalEntries();
      showToast(entryId ? '✓ Entry updated!' : '✓ Entry saved!');
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save entry');
    }
  } catch (error) {
    console.error('Save journal error:', error);
    showError('Failed to save: ' + error.message);
  } finally {
    document.getElementById('saveJournalBtn').disabled = false;
    document.getElementById('saveJournalBtn').textContent = entryId ? 'Update Entry' : 'Save Entry';
  }
}

async function deleteJournalEntry() {
  const entryId = document.getElementById('journalEntryId').value;
  if (!entryId) return;
  
  if (!confirm('Are you sure you want to delete this journal entry?')) return;
  
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return;
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/journals/${entryId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    
    if (response.ok) {
      journalEntries = journalEntries.filter(e => e.id !== entryId);
      localStorage.setItem('lifestack_journals', JSON.stringify(journalEntries));
      closeJournalModal();
      renderJournalEntries();
      showToast('Entry deleted');
    }
  } catch (error) {
    console.error('Delete journal error:', error);
    showError('Failed to delete entry');
  }
}

async function fetchJournalEntries() {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return [];
  
  try {
    console.log('Fetching journals from:', `${CONFIG.API_URL}/journals`);
    const response = await fetch(`${CONFIG.API_URL}/journals`, {
      headers: { 'Authorization': `Bearer ${tokens.idToken}` }
    });
    
    console.log('Journals response status:', response.status);
    
    if (response.ok) {
      const entries = await response.json();
      console.log('Fetched', entries.length, 'journal entries');
      journalEntries = entries;
      localStorage.setItem('lifestack_journals', JSON.stringify(journalEntries));
      return entries;
    } else {
      console.error('Journals API error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Fetch journals error:', error);
  }
  
  // Fallback to cached
  const cached = localStorage.getItem('lifestack_journals');
  if (cached) {
    console.log('Using cached journals');
    journalEntries = JSON.parse(cached);
    return journalEntries;
  }
  
  return [];
}

function renderJournalEntries() {
  const container = document.getElementById('journalEntries');
  if (!container) return;
  
  // Load from cache if not loaded
  if (journalEntries.length === 0) {
    const cached = localStorage.getItem('lifestack_journals');
    if (cached) journalEntries = JSON.parse(cached);
  }
  
  if (journalEntries.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>No journal entries yet</h3>
        <p>Start capturing your thoughts and reflections</p>
        <button class="btn btn-primary" onclick="showJournalModal()">Write First Entry</button>
      </div>
    `;
    return;
  }
  
  // Sort by date descending
  const sorted = [...journalEntries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Group by date
  const grouped = {};
  sorted.forEach(entry => {
    const date = new Date(entry.createdAt);
    const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(entry);
  });
  
  const moodEmojis = {
    great: '😊',
    good: '🙂',
    okay: '😐',
    low: '😔',
    stressed: '😰'
  };
  
  container.innerHTML = Object.entries(grouped).map(([dateKey, entries]) => `
    <div class="journal-date-group">
      <div class="journal-date-group-header">${dateKey}</div>
      ${entries.map(entry => {
        const date = new Date(entry.createdAt);
        return `
          <div class="journal-entry-card" onclick="showJournalModal(journalEntries.find(e => e.id === '${entry.id}'))">
            <div class="journal-entry-header">
              <div class="journal-entry-date">
                <div class="journal-entry-time">${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
              </div>
              ${entry.mood ? `<div class="journal-entry-mood">${moodEmojis[entry.mood] || ''}</div>` : ''}
            </div>
            <div class="journal-entry-text">${escapeHtml(entry.text)}</div>
            ${entry.tags && entry.tags.length > 0 ? `
              <div class="journal-entry-tags">
                ${entry.tags.map(tag => `<span class="journal-entry-tag">${escapeHtml(tag)}</span>`).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `).join('');
}

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', async function() {
  const tokens = localStorage.getItem('lifestack_tokens');
  if (tokens) {
    await loadUserData();
    await processPendingInvite();
    checkForInviteCode();
  } else {
    showLanding();
    checkForInviteCode();
  }
  
  // Click outside modal to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function(e) {
      // Only close if clicking the overlay background, not the modal content
      if (e.target === overlay) {
        const modalId = overlay.id;
        if (modalId === 'signInModal' || modalId === 'signUpModal' || modalId === 'verifyModal') {
          closeAllModals();
        } else if (modalId === 'memoryModal') {
          closeMemoryModal();
        } else if (modalId === 'planModal') {
          closePlanModal();
        } else if (modalId === 'monthCalendarModal') {
          closeMonthCalendarModal();
        } else if (modalId === 'yearModal') {
          closeYearModal();
        } else if (modalId === 'peopleSelectorModal') {
          closePeopleSelector();
        } else if (modalId === 'addPersonModal') {
          closeAddPersonModal();
        } else if (modalId === 'managePeopleModal') {
          closeManagePeopleModal();
        } else if (modalId === 'categoryPickerModal') {
          closeCategoryPicker();
        } else if (modalId === 'habitTrackingModal') {
          closeHabitTracking();
        } else if (modalId === 'journalModal') {
          closeJournalModal();
        } else if (modalId === 'calendarExportModal') {
          closeCalendarExport();
        } else if (modalId === 'photoGalleryModal') {
          closePhotoGallery();
        } else if (modalId === 'yearReviewModal') {
          closeYearReview();
        } else if (modalId === 'shareModal') {
          closeShareModal();
        } else if (modalId === 'manageSharesModal') {
          closeManageSharesModal();
        } else if (modalId === 'friendsModal') {
          closeFriendsModal();
        } else if (modalId === 'addFriendModal') {
          closeAddFriendModal();
        } else if (modalId === 'bucketListModal') {
          closeBucketListModal();
        } else {
          overlay.classList.remove('active');
        }
      }
    });
  });
});
