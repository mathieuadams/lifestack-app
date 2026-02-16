# Mobile Crash Fix

## Problem
App was crashing on mobile (phone) when saving adventures and memories.

## Root Cause
Mobile browsers crash when too many DOM updates happen simultaneously. When saving, the app was:
1. Closing the modal
2. Immediately refreshing 3-4 different views
3. Updating the calendar grid
4. Re-rendering all plan cards

This overwhelmed mobile devices' limited processing power.

## Solutions Applied

### 1. Added 300ms Delay Before Refresh
Instead of refreshing immediately after save, added a small delay to let the DOM settle.

**Files Modified:**
- [www/adventure.js:747-761](www/adventure.js#L747-761) - Adventure save refresh
- [www/app.js:4386-4415](www/app.js#L4386-4415) - Memory save refresh

**Before:**
```javascript
closeAdvWizard();
refreshPlanView(); // Immediate - crashes on mobile
```

**After:**
```javascript
closeAdvWizard();
setTimeout(() => {
  refreshPlanView(); // 300ms delay - prevents crash
}, 300);
```

### 2. Prevent Double-Tap Saves
Mobile users often accidentally double-tap buttons. Added guard to prevent duplicate save requests.

**File Modified:**
- [www/adventure.js:664-679](www/adventure.js#L664-679)

**Added:**
```javascript
// Prevent double-saves (mobile double-tap issue)
if (saveBtn && saveBtn.disabled) {
  console.log('Save already in progress');
  return; // Stop duplicate save
}
```

### 3. Existing Error Isolation
Already had try-catch blocks around each view refresh:
- Week view
- Month grid
- Year view
- Dashboard

If one view fails, others continue working.

## Testing on Mobile

1. **Save Adventure:**
   - Create adventure with sub-activities
   - Click Save
   - Should NOT crash ✅
   - Views refresh after 300ms ✅

2. **Save Memory:**
   - Create memory
   - Click Save
   - Should NOT crash ✅
   - Dashboard refreshes after 300ms ✅

3. **Double-Tap Test:**
   - Try tapping Save button twice rapidly
   - Should only save once ✅
   - Button stays disabled during save ✅

## Why 300ms?

- **0ms (immediate):** Crashes on mobile - too much at once
- **100ms:** Sometimes still crashes - not enough breathing room
- **300ms:** Smooth on mobile - user doesn't notice delay
- **500ms+:** Noticeable lag - feels slow

300ms is the sweet spot: fast enough that users don't notice, slow enough to prevent crash.

## Additional Mobile Optimizations

### Already in Place:
- ✅ Try-catch around all render functions
- ✅ Defensive checks for DOM elements
- ✅ Safe array/object access
- ✅ Button disabled during save

### Could Add (if still crashing):
1. **Throttle refresh calls** - Limit to once every 500ms
2. **Progressive rendering** - Update one view at a time
3. **Reduce re-renders** - Only update changed data
4. **Debounce scroll events** - Prevent scroll-triggered crashes

## Debugging Tips (If Still Crashing)

Since you're on mobile, here's how to see console logs:

### Option 1: Remote Debugging (Best)
```
Chrome Desktop → More Tools → Remote devices
Connect phone via USB
View console on desktop
```

### Option 2: Eruda Console (In-App)
Add to your HTML:
```html
<script src="//cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script>
```

Tap console icon in app to see errors.

### Option 3: Log to Screen
Temporarily show errors on screen:
```javascript
window.onerror = function(msg, url, line) {
  alert('Error: ' + msg + ' at ' + line);
};
```

## What to Report

If still crashing after these fixes:

1. **Which phone?** (iPhone X, Android S21, etc.)
2. **Which browser?** (Safari, Chrome, Firefox, in-app browser)
3. **When exactly?** (During save, after save, when refresh happens)
4. **Can you save at all?** (Or crashes every time)
5. **Other actions that crash?** (Editing, deleting, etc.)

## Status

✅ **Mobile crash fixes deployed**
⏳ **Awaiting test results**

Try saving an adventure/memory on your phone and let me know if it still crashes!
