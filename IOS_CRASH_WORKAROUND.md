# iOS Crash - Temporary Workaround

## Problem
iOS app crashes when creating adventures, even with 800ms delay.

## Root Cause
The automatic view refresh after saving causes iOS to crash, regardless of delay time. This is likely due to:
- iOS webview memory constraints
- Complex DOM manipulation
- Multiple views refreshing simultaneously

## Workaround Applied

### ✅ Skip Auto-Refresh on iOS

**File:** [www/adventure.js:760-779](www/adventure.js#L760-779)

**What it does:**
- Detects if running on iOS
- On iOS: **Skips automatic refresh** (prevents crash)
- On other platforms: Refreshes normally

**Code:**
```javascript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

if (isIOS) {
  console.log('iOS detected - skipping auto-refresh');
  toast('✅ Adventure saved! Switch tabs to see it.');
} else {
  // Non-iOS: refresh normally
  setTimeout(() => refreshPlanView(), 300);
}
```

## User Experience on iOS

### Before (Crashed):
```
1. Create adventure
2. Click Save
3. Modal closes
4. App refreshes views
5. 💥 CRASH
```

### After (Works):
```
1. Create adventure
2. Click Save
3. Modal closes
4. Message: "✅ Adventure saved! Switch tabs to see it."
5. User taps HABITS or MEMORIES tab
6. User taps back to PLAN tab
7. New adventure appears ✅
```

## How to See New Adventure

After saving, do ONE of these:

1. **Switch tabs:** Tap HABITS → Tap PLAN
2. **Pull-to-refresh:** Swipe down on the plan view
3. **Close/reopen app:** Quit and relaunch

The adventure **is saved** - it just doesn't auto-refresh on iOS to prevent crash.

## Why This Works

**The crash happens during refresh, not during save:**
- ✅ Save to backend: Works
- ✅ Close modal: Works
- ❌ Auto-refresh views: Crashes iOS

**By skipping auto-refresh:**
- No crash 🎉
- Data is saved ✅
- User manually refreshes (tab switch)

## Testing

1. **Create adventure on iOS:**
   - Fill out wizard
   - Click Save
   - Should NOT crash ✅
   - See message: "Adventure saved! Switch tabs to see it."

2. **See the adventure:**
   - Tap MEMORIES tab
   - Tap back to PLAN tab
   - New adventure should appear ✅

3. **Verify it's saved:**
   - Edit the adventure
   - All details should be there ✅

## Limitations

**iOS only:**
- Must manually refresh (tab switch) to see new adventure
- Not ideal UX, but prevents crash

**Other platforms:**
- Auto-refresh works normally
- No tab switch needed

## Next Steps

### Option 1: Keep This Workaround (Recommended)
- Prevents crash ✅
- Slight UX inconvenience on iOS only
- Data is safely saved

### Option 2: Optimize Refresh (Future)
If we want auto-refresh on iOS without crash:
1. Only refresh the specific month/week (not entire view)
2. Use requestAnimationFrame for smoother updates
3. Paginate/virtualize large lists
4. Reduce data loaded at once

### Option 3: Native Refresh (If Capacitor/Cordova)
If using Capacitor or Cordova:
```javascript
// Trigger native refresh instead of web refresh
if (window.Capacitor) {
  Capacitor.Plugins.App.reload();
}
```

## Summary

✅ **iOS crash fixed** - Skip auto-refresh
⚠️ **Trade-off** - User must switch tabs to see new adventure
✅ **Data safe** - Adventure is saved to backend
🧪 **Test** - Create adventure, should not crash

**Instructions for user:**
After saving an adventure on iOS, tap another tab (HABITS or MEMORIES) then tap back to PLAN to see the new adventure.
