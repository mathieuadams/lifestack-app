# Debug iOS Crash - Without Mac

## Current Status

**Still crashing when saving** - even with auto-refresh disabled
**App getting slower** - when clicking calendar

## What This Tells Us

Since crash happens with auto-refresh OFF, the crash is **during save**, not after.

Possible causes:
1. `closeAdvWizard()` function
2. `toast()` message display
3. localStorage write
4. Plans array manipulation

## New Debugging Added

I've added extensive console logging to track exactly where the crash happens:

```javascript
console.log('Starting save operation...')
console.log('Calling createPlan...')
console.log('createPlan completed: success')
console.log('Saving to plans array and localStorage...')
console.log('localStorage save successful')
console.log('Showing success toast...')
console.log('Closing adventure wizard...')
console.log('Wizard closed successfully')
```

## How to View Console Logs on iOS (Without Mac)

### Option 1: Eruda Console (Easiest)

Add this to your `index.html` **temporarily** for debugging:

```html
<!-- Add RIGHT BEFORE </body> tag -->
<script src="https://cdn.jsdelivr.net/npm/eruda"></script>
<script>eruda.init();</script>
```

Then:
1. Open app on iPhone
2. Tap floating console button (bottom right)
3. See console logs
4. Try saving adventure
5. See exactly where it crashes

### Option 2: iOS Settings (Built-in)

Enable Safari debugging:
1. Settings → Safari → Advanced
2. Turn ON "Web Inspector"
3. Connect to Mac (if you get access later)

### Option 3: Alert-Based Debugging

I can add this **temporary** code to show crash point:

```javascript
// Add to adventure.js save function
try {
  alert('1: Starting save');
  await createPlan(planData);
  alert('2: Save completed');
  closeAdvWizard();
  alert('3: Wizard closed');
  // If you see alert 2 but not 3, crash is in closeAdvWizard()
} catch (e) {
  alert('CRASH: ' + e.message);
}
```

Would you like me to add alert-based debugging?

## Calendar Slowdown Investigation

**Symptom:** App slowing down when clicking calendar

**Possible Causes:**

### 1. Memory Leak - Plans Array Growing
```javascript
// Check in console:
console.log('Plans count:', plans.length);
console.log('Memory usage:', JSON.stringify(plans).length, 'bytes');
```

If plans array keeps growing, localStorage might be huge.

### 2. Event Listeners Stacking
`buildWeekView()` might be called too often, recreating DOM.

### 3. localStorage Full
iOS has ~5-10 MB limit. If full, writes get slow.

## Quick Fixes to Try

### Fix 1: Disable Toast on iOS

Toast animation might cause crash:

```javascript
// In adventure.js, replace:
toast('🎉 Adventure created!');

// With:
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
if (!isIOS) {
  toast('🎉 Adventure created!');
} else {
  console.log('Adventure created (toast skipped on iOS)');
}
```

### Fix 2: Clear localStorage Cache

Clear old data to free memory:

```javascript
// Add to app startup:
const dataSize = JSON.stringify(localStorage).length;
if (dataSize > 5000000) { // 5 MB
  console.warn('localStorage nearly full, clearing old data');
  // Clear old years
  Object.keys(localStorage).forEach(key => {
    if (key.includes('2024') || key.includes('2023')) {
      localStorage.removeItem(key);
    }
  });
}
```

### Fix 3: Throttle Calendar Clicks

Prevent rapid clicks:

```javascript
let lastCalendarClick = 0;
function createAdventureOnDate(date) {
  const now = Date.now();
  if (now - lastCalendarClick < 500) {
    console.log('Click throttled');
    return;
  }
  lastCalendarClick = now;
  // ... rest of function
}
```

## What to Report Back

1. **Use Eruda Console** (Option 1 above)
2. **Try saving adventure**
3. **See last console log before crash**
4. **Report:** "Last log was: ___________"

This will tell me **exactly** where it crashes.

## Temporary Workarounds (Until We Fix)

### For Users:
1. **Create adventures on desktop/Android** (no crash)
2. **Edit adventures on iOS** (editing doesn't crash?)
3. **View/check-off items on iOS** (works)

### For Development:
1. **Use Eruda console** to see crash point
2. **Report last log message**
3. I'll add specific fix for that function

## Most Likely Crash Points

Based on code analysis:

**70% probability:** `closeAdvWizard()` function
- Manipulates DOM to hide wizard
- Might conflict with iOS modal animations

**20% probability:** `toast()` display
- Toast animation might crash on iOS
- Easy to test by disabling it

**10% probability:** localStorage write
- Already wrapped in try-catch
- Unlikely but possible if quota exceeded

## Next Steps

1. **Add Eruda console** (easiest debugging)
2. **Try saving adventure**
3. **Report last console log**
4. **I'll add targeted fix**

OR

**Try disabling toast** (quick test):
- If crash goes away, we know it's the toast
- If still crashes, it's something else

Let me know which approach you prefer!
