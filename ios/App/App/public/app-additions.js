// =====================================================
// LIFESTACK - APP ADDITIONS
// Add this code to your existing app.js
// =====================================================

// =====================================================
// PLAN LIMITS & TIER SYSTEM
// =====================================================

const PLAN_LIMITS = {
  free: {
    adventures: 5,
    memories: 20,
    habits: 3,
    bucketListItems: 10,
    aiRequestsPerMonth: 3,
    storageMB: 50,
    friends: 3,
    yearInReview: false,
    dataExport: false,
    aiTemplates: false,
    analytics: false,
    widgets: false
  },
  plus: {
    adventures: Infinity,
    memories: Infinity,
    habits: Infinity,
    bucketListItems: Infinity,
    aiRequestsPerMonth: 20,
    storageMB: 2048,
    friends: Infinity,
    yearInReview: true,
    dataExport: true,
    aiTemplates: false,
    analytics: false,
    widgets: false
  },
  pro: {
    adventures: Infinity,
    memories: Infinity,
    habits: Infinity,
    bucketListItems: Infinity,
    aiRequestsPerMonth: Infinity,
    storageMB: 10240,
    friends: Infinity,
    yearInReview: true,
    dataExport: true,
    aiTemplates: true,
    analytics: true,
    widgets: true
  }
};

// User's current tier (loaded from backend/localStorage)
let userTier = 'free';
let userUsage = {
  aiRequestsThisMonth: 0,
  aiRequestsResetDate: null,
  storageUsedMB: 0
};

// =====================================================
// USAGE TRACKING
// =====================================================

// Get user's current usage counts
function getUserUsage() {
  return {
    adventures: plans?.filter(p => p.planType === 'adventure').length || 0,
    memories: memories?.length || 0,
    habits: plans?.filter(p => p.planType === 'habit').length || 0,
    bucketListItems: bucketList?.length || 0,
    aiRequestsThisMonth: userUsage.aiRequestsThisMonth || 0,
    storageMB: userUsage.storageUsedMB || 0,
    friends: friendships?.friends?.length || 0
  };
}

// Check if user can perform an action
function canPerformAction(actionType) {
  const usage = getUserUsage();
  const limits = PLAN_LIMITS[userTier || 'free'];
  
  switch(actionType) {
    case 'add_adventure':
      return usage.adventures < limits.adventures;
    case 'add_memory':
      return usage.memories < limits.memories;
    case 'add_habit':
      return usage.habits < limits.habits;
    case 'add_bucket_item':
      return usage.bucketListItems < limits.bucketListItems;
    case 'ai_request':
      return usage.aiRequestsThisMonth < limits.aiRequestsPerMonth;
    case 'add_friend':
      return usage.friends < limits.friends;
    case 'use_templates':
      return limits.aiTemplates;
    case 'view_year_review':
      return limits.yearInReview;
    case 'export_data':
      return limits.dataExport;
    case 'view_analytics':
      return limits.analytics;
    default:
      return true;
  }
}

// Get remaining count for a resource
function getRemainingCount(resourceType) {
  const usage = getUserUsage();
  const limits = PLAN_LIMITS[userTier || 'free'];
  
  const usageMap = {
    adventures: { used: usage.adventures, limit: limits.adventures },
    memories: { used: usage.memories, limit: limits.memories },
    habits: { used: usage.habits, limit: limits.habits },
    bucketListItems: { used: usage.bucketListItems, limit: limits.bucketListItems },
    aiRequests: { used: usage.aiRequestsThisMonth, limit: limits.aiRequestsPerMonth },
    friends: { used: usage.friends, limit: limits.friends }
  };
  
  const resource = usageMap[resourceType];
  if (!resource) return { used: 0, limit: Infinity, remaining: Infinity };
  
  return {
    used: resource.used,
    limit: resource.limit,
    remaining: resource.limit === Infinity ? Infinity : resource.limit - resource.used
  };
}

// Update UI usage counters
function updateUsageCounters() {
  // Update AI usage counter in bucket list modal
  const aiCounter = document.getElementById('aiUsageText');
  const aiUpgradeLink = document.getElementById('aiUsageUpgrade');
  
  if (aiCounter) {
    const aiUsage = getRemainingCount('aiRequests');
    const limitText = aiUsage.limit === Infinity ? '∞' : aiUsage.limit;
    aiCounter.textContent = `AI: ${aiUsage.used} of ${limitText} used`;
    
    // Update styling based on usage
    const counterContainer = document.getElementById('aiUsageCounter');
    if (counterContainer) {
      counterContainer.classList.remove('warning', 'empty');
      if (aiUsage.remaining <= 0 && aiUsage.limit !== Infinity) {
        counterContainer.classList.add('empty');
        aiUpgradeLink?.classList.remove('hidden');
      } else if (aiUsage.remaining <= 1 && aiUsage.limit !== Infinity) {
        counterContainer.classList.add('warning');
        aiUpgradeLink?.classList.add('hidden');
      } else {
        aiUpgradeLink?.classList.add('hidden');
      }
    }
  }
  
  // Update nav badges (if they exist)
  updateNavBadge('adventures');
  updateNavBadge('memories');
  updateNavBadge('habits');
}

function updateNavBadge(resourceType) {
  const badge = document.querySelector(`[data-nav="${resourceType}"] .usage-badge`);
  if (!badge) return;
  
  const usage = getRemainingCount(resourceType);
  
  if (usage.limit === Infinity) {
    badge.classList.add('hidden');
  } else {
    badge.textContent = `${usage.used}/${usage.limit}`;
    badge.classList.remove('hidden');
    badge.classList.toggle('warning', usage.used >= usage.limit * 0.8);
    badge.classList.toggle('full', usage.used >= usage.limit);
  }
}

// Increment AI usage counter
function incrementAIUsage() {
  userUsage.aiRequestsThisMonth++;
  
  // Save to localStorage
  localStorage.setItem('lifestack_ai_usage', JSON.stringify({
    count: userUsage.aiRequestsThisMonth,
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  }));
  
  updateUsageCounters();
}

// Load AI usage from localStorage
function loadAIUsage() {
  const stored = localStorage.getItem('lifestack_ai_usage');
  if (stored) {
    const data = JSON.parse(stored);
    const now = new Date();
    
    // Reset if it's a new month
    if (data.month !== now.getMonth() || data.year !== now.getFullYear()) {
      userUsage.aiRequestsThisMonth = 0;
      localStorage.removeItem('lifestack_ai_usage');
    } else {
      userUsage.aiRequestsThisMonth = data.count;
    }
  }
}

// Get days until month end (for AI reset)
function getDaysUntilMonthEnd() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.ceil((lastDay - now) / (1000 * 60 * 60 * 24));
}

// =====================================================
// UPGRADE PROMPTS
// =====================================================

const UPGRADE_PROMPTS = {
  adventure_limit: {
    icon: '🗺️',
    title: "You've Got Big Plans!",
    getMessage: (context) => `You're trying to add your ${context.count}th adventure. Free accounts can track up to 5.`,
    suggestedPlan: 'plus'
  },
  memory_limit: {
    icon: '📸',
    title: 'Precious Memories!',
    getMessage: (context) => `You've captured ${context.count} memories. Upgrade to keep unlimited memories.`,
    suggestedPlan: 'plus'
  },
  habit_limit: {
    icon: '✅',
    title: 'Building Great Habits!',
    getMessage: (context) => `You're tracking ${context.count} habits. Upgrade to track unlimited habits.`,
    suggestedPlan: 'plus'
  },
  bucket_limit: {
    icon: '🪣',
    title: 'Dream Bigger!',
    getMessage: (context) => `You have ${context.count} bucket list items. Upgrade for unlimited dreams!`,
    suggestedPlan: 'plus'
  },
  friend_limit: {
    icon: '👥',
    title: 'Growing Your Circle!',
    getMessage: (context) => `You've connected with ${context.count} friends. Upgrade to share with everyone.`,
    suggestedPlan: 'plus'
  },
  ai_limit: {
    icon: '🤖',
    title: 'AI Limit Reached',
    getMessage: (context) => `You've used all ${PLAN_LIMITS.free.aiRequestsPerMonth} AI requests this month.`,
    suggestedPlan: 'plus',
    showTranscript: true,
    showManualFallback: true
  },
  ai_last_request: {
    icon: '⚠️',
    title: 'Last AI Request Used',
    getMessage: (context) => `That was your last free AI request this month. Resets in ${getDaysUntilMonthEnd()} days.`,
    suggestedPlan: 'plus',
    dismissable: true
  },
  templates: {
    icon: '✨',
    title: 'Pro Feature',
    getMessage: () => 'AI Templates give you personalized bucket list ideas like "5 things to do in LA under $100"',
    suggestedPlan: 'pro',
    features: [
      '🗺️ Local adventure ideas',
      '✈️ Travel destination guides', 
      '🎯 Personal growth suggestions',
      '💪 Fitness goal templates'
    ]
  },
  year_review: {
    icon: '📊',
    title: 'Your Year in Review',
    getMessage: () => 'See your complete year: adventures, memories, habits, and more in a beautiful summary.',
    suggestedPlan: 'plus',
    showPreview: true
  },
  analytics: {
    icon: '📈',
    title: 'Advanced Analytics',
    getMessage: () => 'Track your habit streaks, completion rates, and life patterns over time.',
    suggestedPlan: 'pro'
  }
};

function showUpgradePrompt(reason, context = {}) {
  const prompt = UPGRADE_PROMPTS[reason];
  if (!prompt) return;
  
  const modal = document.getElementById('upgradeModal');
  const content = document.getElementById('upgradeContent');
  
  if (!modal || !content) return;
  
  content.innerHTML = buildUpgradeModalContent(prompt, context);
  modal.classList.remove('hidden');
}

function buildUpgradeModalContent(prompt, context) {
  const message = typeof prompt.getMessage === 'function' 
    ? prompt.getMessage(context) 
    : prompt.getMessage;
  
  let html = `
    <div class="upgrade-header">
      <span class="upgrade-icon">${prompt.icon}</span>
      <h2>${prompt.title}</h2>
    </div>
    
    <p class="upgrade-message">${message}</p>
  `;
  
  // Show transcript if applicable (for AI limit)
  if (prompt.showTranscript && context.transcript) {
    html += `
      <div class="upgrade-transcript">
        <p>"${context.transcript}"</p>
        <p class="transcript-note">We'd love to help with that! 🌟</p>
      </div>
    `;
  }
  
  // Show features list if applicable
  if (prompt.features) {
    html += `
      <ul class="upgrade-features">
        ${prompt.features.map(f => `<li>${f}</li>`).join('')}
      </ul>
    `;
  }
  
  // Show blurred preview if applicable
  if (prompt.showPreview) {
    html += `
      <div class="upgrade-preview blurred">
        <div class="preview-placeholder">
          <span>📊</span>
          <p>Your 2025 Year in Review</p>
        </div>
      </div>
    `;
  }
  
  // Upgrade buttons
  html += `<div class="upgrade-buttons">`;
  
  if (prompt.suggestedPlan === 'plus') {
    html += `
      <button class="btn btn-primary" onclick="startUpgrade('plus')">
        ⭐ Upgrade to Plus · $4.99/mo
      </button>
      <button class="btn btn-secondary" onclick="startUpgrade('pro')">
        🚀 Go Pro · $9.99/mo
      </button>
    `;
  } else {
    html += `
      <button class="btn btn-primary btn-pro" onclick="startUpgrade('pro')">
        🚀 Upgrade to Pro · $9.99/mo
      </button>
    `;
  }
  
  html += `</div>`;
  
  // Manual fallback for AI limit
  if (prompt.showManualFallback && context.transcript) {
    html += `
      <div class="upgrade-alternative">
        <p>Or add manually:</p>
        <button class="btn btn-secondary btn-small" onclick="addManualFromTranscript('${escapeHtml(context.transcript)}')">
          ➕ Add "${truncateText(context.transcript, 30)}" manually
        </button>
      </div>
    `;
  }
  
  // Dismissable option
  if (prompt.dismissable) {
    html += `
      <button class="btn-link" onclick="closeUpgradeModal()">
        Got it, I'll wait
      </button>
    `;
  }
  
  // Footer note
  const footerNote = prompt.showTranscript 
    ? `💡 Resets in ${getDaysUntilMonthEnd()} days`
    : '7-day free trial · Cancel anytime';
  
  html += `<p class="upgrade-note">${footerNote}</p>`;
  
  return html;
}

function closeUpgradeModal() {
  document.getElementById('upgradeModal')?.classList.add('hidden');
}

function showComparePlansModal() {
  // Update current plan indicator
  const cards = document.querySelectorAll('.plan-card');
  cards.forEach(card => {
    const planType = card.classList.contains('plan-free') ? 'free' :
                     card.classList.contains('plan-plus') ? 'plus' : 'pro';
    const btn = card.querySelector('.plan-btn');
    
    if (planType === userTier) {
      btn.disabled = true;
      btn.textContent = 'Current Plan';
      btn.classList.add('btn-current');
    } else if (planType === 'free') {
      btn.disabled = true;
      btn.textContent = 'Free Plan';
    } else {
      btn.disabled = false;
      btn.textContent = `Upgrade to ${planType.charAt(0).toUpperCase() + planType.slice(1)}`;
      btn.classList.remove('btn-current');
    }
  });
  
  document.getElementById('comparePlansModal')?.classList.remove('hidden');
}

function closeComparePlansModal() {
  document.getElementById('comparePlansModal')?.classList.add('hidden');
}

async function startUpgrade(plan) {
  // Close any open modals
  closeUpgradeModal();
  closeComparePlansModal();
  
  // In a real app, this would:
  // 1. Open payment sheet (Apple Pay / Google Pay / Stripe)
  // 2. Process payment
  // 3. Update user's tier in backend
  // 4. Refresh UI
  
  // For now, show a placeholder
  showToast(`Upgrade to ${plan.toUpperCase()} coming soon!`, 'info');
  
  // TODO: Implement actual payment flow
  // Example with RevenueCat or Stripe:
  // const result = await purchaseSubscription(plan);
  // if (result.success) {
  //   userTier = plan;
  //   updateUsageCounters();
  //   showToast(`Welcome to ${plan.toUpperCase()}! 🎉`, 'success');
  // }
}

// =====================================================
// TERMS & PRIVACY MODALS
// =====================================================

function showTermsModal() {
  document.getElementById('termsModal')?.classList.remove('hidden');
}

function closeTermsModal() {
  document.getElementById('termsModal')?.classList.add('hidden');
}

function showPrivacyModal() {
  document.getElementById('privacyModal')?.classList.remove('hidden');
}

function closePrivacyModal() {
  document.getElementById('privacyModal')?.classList.add('hidden');
}

// =====================================================
// CONTENT SAFETY - PHOTO UPLOAD FLOW
// =====================================================

// Updated photo upload function with safety scanning
async function uploadPhotoWithSafetyScan(file, memoryId) {
  const userId = currentUser?.userId;
  if (!userId) {
    showToast('Please sign in to upload photos', 'error');
    return null;
  }
  
  // Show processing modal
  showPhotoProcessingModal();
  updatePhotoProcessingStep('upload', 'active');
  
  try {
    // Step 1: Get presigned URL for TEMP bucket
    const fileName = `${memoryId}_${Date.now()}_${file.name}`;
    const key = `${userId}/memories/${fileName}`;
    
    const uploadData = await getUploadUrlForTempBucket(key, file.type);
    if (!uploadData) {
      throw new Error('Failed to get upload URL');
    }
    
    // Step 2: Upload to temp bucket
    const uploadSuccess = await uploadPhotoToS3(uploadData.uploadUrl, file);
    if (!uploadSuccess) {
      throw new Error('Upload failed');
    }
    
    updatePhotoProcessingStep('upload', 'complete');
    updatePhotoProcessingStep('scan', 'active');
    updatePhotoProcessingStatus('Safety scan in progress...');
    
    // Step 3: Wait for scanning to complete (poll for file in photos bucket)
    const scanResult = await waitForPhotoScan(key, 15000); // 15 second timeout
    
    if (scanResult.status === 'approved') {
      updatePhotoProcessingStep('scan', 'complete');
      updatePhotoProcessingStep('save', 'active');
      updatePhotoProcessingStatus('Saving to your memories...');
      
      // Brief delay for UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      updatePhotoProcessingStep('save', 'complete');
      closePhotoProcessingModal();
      
      return {
        bucket: 'lifestack-photos',
        key: key,
        url: uploadData.photoUrl || `https://lifestack-photos.s3.amazonaws.com/${key}`
      };
      
    } else if (scanResult.status === 'rejected') {
      closePhotoProcessingModal();
      showPhotoRejectedModal();
      return null;
      
    } else {
      // Timeout or processing - show as pending
      closePhotoProcessingModal();
      showToast('Photo is being processed. It will appear shortly.', 'info');
      return {
        bucket: 'lifestack-photos',
        key: key,
        status: 'processing'
      };
    }
    
  } catch (error) {
    console.error('Photo upload error:', error);
    closePhotoProcessingModal();
    showToast('Failed to upload photo. Please try again.', 'error');
    return null;
  }
}

async function getUploadUrlForTempBucket(key, fileType) {
  const tokens = await getValidTokens();
  if (!tokens?.idToken) return null;
  
  try {
    const response = await fetch(`${CONFIG.API_URL}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify({
        key: key,
        fileType: fileType,
        bucket: 'lifestack-uploads-temp'  // Upload to temp bucket for scanning
      })
    });
    
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Get upload URL error:', error);
  }
  
  return null;
}

async function waitForPhotoScan(key, timeoutMs = 15000) {
  const startTime = Date.now();
  const checkInterval = 1000;
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      // Check if file exists in approved photos bucket
      const photoUrl = `https://lifestack-photos.s3.amazonaws.com/${key}`;
      const response = await fetch(photoUrl, { method: 'HEAD' });
      
      if (response.ok) {
        return { status: 'approved' };
      }
      
      // Check if file is in quarantine (rejected)
      // This would require a backend endpoint
      // For now, we just wait for approval
      
    } catch (e) {
      // File not ready yet, continue waiting
    }
    
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  
  // Timeout reached
  return { status: 'processing' };
}

// Photo processing modal functions
function showPhotoProcessingModal() {
  document.getElementById('photoProcessingModal')?.classList.remove('hidden');
  
  // Reset steps
  ['upload', 'scan', 'save'].forEach(step => {
    updatePhotoProcessingStep(step, 'pending');
  });
}

function closePhotoProcessingModal() {
  document.getElementById('photoProcessingModal')?.classList.add('hidden');
}

function updatePhotoProcessingStatus(message) {
  const statusEl = document.getElementById('photoProcessingStatus');
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function updatePhotoProcessingStep(step, status) {
  const stepEl = document.getElementById(`step-${step}`);
  if (!stepEl) return;
  
  stepEl.classList.remove('active', 'complete', 'pending');
  
  const statusIcon = stepEl.querySelector('.step-status');
  
  switch(status) {
    case 'active':
      stepEl.classList.add('active');
      if (statusIcon) statusIcon.textContent = '...';
      break;
    case 'complete':
      stepEl.classList.add('complete');
      if (statusIcon) statusIcon.textContent = '✓';
      break;
    default:
      stepEl.classList.add('pending');
      if (statusIcon) statusIcon.textContent = '';
  }
}

function showPhotoRejectedModal() {
  document.getElementById('photoRejectedModal')?.classList.remove('hidden');
}

function closePhotoRejectedModal() {
  document.getElementById('photoRejectedModal')?.classList.add('hidden');
}

// =====================================================
// BUCKET LIST TEMPLATES (Pro Feature)
// =====================================================

const BUCKET_TEMPLATES = [
  {
    category: 'local',
    icon: '🗺️',
    name: 'Local Adventures',
    templates: [
      { id: 'local_weekend', name: 'Weekend in my city', icon: '🎯', 
        description: '5 things under your budget',
        fields: [
          { name: 'city', label: 'City or Area', type: 'text', placeholder: 'Los Angeles' },
          { name: 'budget', label: 'Budget ($)', type: 'number', placeholder: '100' },
          { name: 'preferences', label: 'Preferences (optional)', type: 'text', placeholder: 'Outdoor activities' }
        ]
      },
      { id: 'local_dates', name: 'Date nights nearby', icon: '💑',
        description: 'Romantic spots in your area',
        fields: [
          { name: 'city', label: 'City', type: 'text', placeholder: 'San Francisco' },
          { name: 'vibe', label: 'Vibe', type: 'select', options: ['Romantic', 'Adventurous', 'Casual', 'Fancy'] }
        ]
      },
      { id: 'local_free', name: 'Free things to do', icon: '🆓',
        description: 'No-cost local adventures',
        fields: [
          { name: 'city', label: 'City', type: 'text', placeholder: 'New York' }
        ]
      }
    ]
  },
  {
    category: 'travel',
    icon: '✈️',
    name: 'Travel Dreams',
    templates: [
      { id: 'travel_destination', name: 'Dream trip must-dos', icon: '🌍',
        description: 'Top experiences for any destination',
        fields: [
          { name: 'destination', label: 'Destination', type: 'text', placeholder: 'Japan' },
          { name: 'duration', label: 'Trip Length', type: 'select', options: ['Weekend', '1 Week', '2 Weeks', '1 Month'] },
          { name: 'style', label: 'Travel Style', type: 'select', options: ['Adventure', 'Relaxation', 'Culture', 'Food', 'Mixed'] }
        ]
      },
      { id: 'travel_hidden', name: 'Hidden gems', icon: '💎',
        description: 'Off-the-beaten-path spots',
        fields: [
          { name: 'destination', label: 'Country/Region', type: 'text', placeholder: 'Italy' }
        ]
      }
    ]
  },
  {
    category: 'growth',
    icon: '🎯',
    name: 'Personal Growth',
    templates: [
      { id: 'growth_skills', name: 'Skills to learn', icon: '🧠',
        description: 'Based on your interests',
        fields: [
          { name: 'interests', label: 'Your Interests', type: 'text', placeholder: 'Technology, music, languages' },
          { name: 'timeframe', label: 'Timeframe', type: 'select', options: ['This month', 'This year', 'Next 5 years'] }
        ]
      },
      { id: 'growth_30day', name: '30-day challenges', icon: '📆',
        description: 'Quick wins to try',
        fields: [
          { name: 'category', label: 'Focus Area', type: 'select', options: ['Health', 'Creativity', 'Productivity', 'Social', 'Learning'] }
        ]
      }
    ]
  },
  {
    category: 'health',
    icon: '💪',
    name: 'Health & Fitness',
    templates: [
      { id: 'health_fitness', name: 'Fitness milestones', icon: '🏃',
        description: 'Achievable fitness goals',
        fields: [
          { name: 'level', label: 'Current Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
          { name: 'interests', label: 'Interests', type: 'text', placeholder: 'Running, yoga, strength' }
        ]
      },
      { id: 'health_outdoor', name: 'Outdoor challenges', icon: '⛰️',
        description: 'Hikes, climbs, swims near you',
        fields: [
          { name: 'location', label: 'Your Location', type: 'text', placeholder: 'Colorado' },
          { name: 'difficulty', label: 'Difficulty', type: 'select', options: ['Easy', 'Moderate', 'Challenging', 'Expert'] }
        ]
      }
    ]
  }
];

function showBucketTemplates() {
  // Check if user has Pro
  if (!canPerformAction('use_templates')) {
    showUpgradePrompt('templates');
    return;
  }
  
  // Show template categories
  const modal = document.getElementById('bucketTemplatesModal');
  const container = document.getElementById('templateCategories');
  const form = document.getElementById('templateForm');
  const results = document.getElementById('templateResults');
  
  if (!modal || !container) return;
  
  // Reset state
  form?.classList.add('hidden');
  results?.classList.add('hidden');
  container.classList.remove('hidden');
  
  // Build category buttons
  container.innerHTML = BUCKET_TEMPLATES.map(cat => `
    <button class="template-category-btn" onclick="showTemplateCategory('${cat.category}')">
      <span class="template-cat-icon">${cat.icon}</span>
      <span class="template-cat-name">${cat.name}</span>
      <span class="template-cat-count">${cat.templates.length} templates</span>
    </button>
  `).join('');
  
  modal.classList.remove('hidden');
}

function showTemplateCategory(categoryId) {
  const category = BUCKET_TEMPLATES.find(c => c.category === categoryId);
  if (!category) return;
  
  const container = document.getElementById('templateCategories');
  const form = document.getElementById('templateForm');
  
  if (!container || !form) return;
  
  // Show templates list
  container.innerHTML = `
    <button class="back-btn" onclick="showBucketTemplates()">
      ← Back to categories
    </button>
    <h3>${category.icon} ${category.name}</h3>
    <div class="template-list">
      ${category.templates.map(t => `
        <button class="template-item-btn" onclick="showTemplateForm('${categoryId}', '${t.id}')">
          <span class="template-item-icon">${t.icon}</span>
          <div class="template-item-info">
            <span class="template-item-name">${t.name}</span>
            <span class="template-item-desc">${t.description}</span>
          </div>
        </button>
      `).join('')}
    </div>
  `;
}

function showTemplateForm(categoryId, templateId) {
  const category = BUCKET_TEMPLATES.find(c => c.category === categoryId);
  const template = category?.templates.find(t => t.id === templateId);
  if (!template) return;
  
  const container = document.getElementById('templateCategories');
  const form = document.getElementById('templateForm');
  
  if (!container || !form) return;
  
  container.classList.add('hidden');
  form.classList.remove('hidden');
  
  // Build form
  form.innerHTML = `
    <button class="back-btn" onclick="showTemplateCategory('${categoryId}')">
      ← Back to ${category.name}
    </button>
    <h3>${template.icon} ${template.name}</h3>
    <p class="template-form-desc">${template.description}</p>
    
    <div class="template-form-fields">
      ${template.fields.map(field => {
        if (field.type === 'select') {
          return `
            <div class="form-group">
              <label>${field.label}</label>
              <select id="template_${field.name}" required>
                <option value="">Select...</option>
                ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
              </select>
            </div>
          `;
        } else {
          return `
            <div class="form-group">
              <label>${field.label}</label>
              <input type="${field.type}" id="template_${field.name}" 
                placeholder="${field.placeholder || ''}" 
                ${field.name === 'city' || field.name === 'destination' ? 'required' : ''}>
            </div>
          `;
        }
      }).join('')}
    </div>
    
    <button class="btn btn-primary" onclick="generateFromTemplate('${categoryId}', '${templateId}')">
      ✨ Generate Ideas
    </button>
  `;
}

async function generateFromTemplate(categoryId, templateId) {
  const category = BUCKET_TEMPLATES.find(c => c.category === categoryId);
  const template = category?.templates.find(t => t.id === templateId);
  if (!template) return;
  
  // Gather field values
  const fields = {};
  for (const field of template.fields) {
    const el = document.getElementById(`template_${field.name}`);
    if (el) {
      fields[field.name] = el.value;
    }
  }
  
  // Validate required fields
  if (!fields.city && !fields.destination && !fields.location) {
    showToast('Please fill in the required fields', 'error');
    return;
  }
  
  // Show loading
  const form = document.getElementById('templateForm');
  const results = document.getElementById('templateResults');
  
  if (form) {
    form.innerHTML = `
      <div class="template-loading">
        <div class="loading-spinner"></div>
        <p>Generating personalized ideas...</p>
      </div>
    `;
  }
  
  try {
    // Call AI API
    const tokens = await getValidTokens();
    if (!tokens?.idToken) {
      showToast('Please sign in', 'error');
      return;
    }
    
    const response = await fetch(`${CONFIG.API_URL}/bucketlist/template`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokens.idToken}`
      },
      body: JSON.stringify({
        templateId: template.id,
        fields: fields
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate ideas');
    }
    
    const data = await response.json();
    
    // Show results
    form?.classList.add('hidden');
    if (results) {
      results.classList.remove('hidden');
      results.innerHTML = buildTemplateResults(data.items, template, fields);
    }
    
  } catch (error) {
    console.error('Template generation error:', error);
    showToast('Failed to generate ideas. Please try again.', 'error');
    showTemplateForm(categoryId, templateId);
  }
}

function buildTemplateResults(items, template, fields) {
  const title = fields.city || fields.destination || fields.location || 'Your Ideas';
  
  return `
    <h3>✨ Ideas for ${title}</h3>
    
    <div class="template-results-list">
      ${items.map((item, i) => `
        <div class="template-result-item">
          <label class="template-result-check">
            <input type="checkbox" id="result_${i}" checked>
            <span class="checkmark"></span>
          </label>
          <div class="template-result-info">
            <strong>${item.title}</strong>
            ${item.cost ? `<span class="result-cost">$${item.cost}</span>` : ''}
            <p>${item.description || ''}</p>
            ${item.tip ? `<p class="result-tip">💡 ${item.tip}</p>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="template-results-actions">
      <button class="btn btn-primary" onclick="addSelectedTemplateItems()">
        ✅ Add Selected to Bucket List
      </button>
      <button class="btn btn-secondary" onclick="showBucketTemplates()">
        🔄 Try Another Template
      </button>
    </div>
  `;
}

async function addSelectedTemplateItems() {
  // Get selected items (this would need to track the items)
  // For now, show success
  showToast('Items added to bucket list!', 'success');
  closeBucketTemplatesModal();
  closeBucketListModal();
  // Refresh bucket list
  await loadBucketList();
  showBucketListModal();
}

function closeBucketTemplatesModal() {
  document.getElementById('bucketTemplatesModal')?.classList.add('hidden');
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function addManualFromTranscript(transcript) {
  closeUpgradeModal();
  
  // Open manual add and pre-fill
  const details = document.querySelector('.bucket-manual-add');
  if (details) {
    details.open = true;
  }
  
  const titleInput = document.getElementById('manualBucketTitle');
  if (titleInput) {
    titleInput.value = truncateText(transcript, 100);
    titleInput.focus();
  }
}

// =====================================================
// INITIALIZATION
// =====================================================

// Add to your existing initialization code
function initializeUpgradeSystem() {
  // Load user tier from localStorage/backend
  const storedTier = localStorage.getItem('lifestack_tier');
  if (storedTier) {
    userTier = storedTier;
  }
  
  // Load AI usage
  loadAIUsage();
  
  // Update counters
  updateUsageCounters();
}

// Call this after user logs in
// initializeUpgradeSystem();

// =====================================================
// MODIFIED BUCKET LIST AI FUNCTION
// Update your existing toggleBucketListRecording to include limit check
// =====================================================

// Wrap your existing AI request with limit check
async function processBucketListWithLimitCheck(voiceInput) {
  // Check limit first
  if (!canPerformAction('ai_request')) {
    showUpgradePrompt('ai_limit', { transcript: voiceInput });
    return null;
  }
  
  // Process with AI
  const result = await processBucketListWithAI({ 
    action: 'generate', 
    voiceInput: voiceInput 
  });
  
  if (result && !result.error) {
    // Increment usage
    incrementAIUsage();
    
    // Check if this was the last request
    const remaining = getRemainingCount('aiRequests');
    if (remaining.remaining === 0 && remaining.limit !== Infinity) {
      // Show "last request" notification after a delay
      setTimeout(() => {
        showUpgradePrompt('ai_last_request');
      }, 2000);
    }
  }
  
  return result;
}

console.log('LifeStack app additions loaded');
