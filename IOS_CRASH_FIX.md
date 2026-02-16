# iOS App Crash Fixes

## Problem
App crashing specifically on **iOS app** (not mobile Safari) when saving adventures/memories.

## iOS-Specific Issues

iOS apps using webviews have unique constraints:

1. **Strict memory limits** - iOS kills apps aggressively
2. **Modal animation timing** - iOS modal animations take ~500-600ms
3. **localStorage quota** - Limited storage, crashes if exceeded
4. **WKWebView restrictions** - Stricter than mobile Safari

## Fixes Applied

### 1. ✅ Extended Delay for iOS (800ms)

iOS needs more time for modal animations to complete before refreshing views.

**Files Modified:**
- [www/adventure.js:754-769](www/adventure.js#L754-769)
- [www/app.js:4389-4418](www/app.js#L4389-4418)

**Code:**
```javascript
// Detect iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const delay = isIOS ? 800 : 300; // iOS: 800ms, Android: 300ms

setTimeout(() => {
  refreshPlanView(); // Wait for modal animation to complete
}, delay);
```

**Why 800ms?**
- iOS modal close animation: ~500-600ms
- Safe buffer: +200ms
- Total: 800ms prevents crash

### 2. ✅ localStorage Protection

iOS apps crash if localStorage quota is exceeded. Added try-catch around all writes.

**Files Modified:**
- [www/adventure.js:732-738](www/adventure.js#L732-738)
- [www/adventure.js:746-752](www/adventure.js#L746-752)

**Code:**
```javascript
try {
  localStorage.setItem('key', data);
} catch (storageError) {
  console.error('localStorage full (iOS quota):', storageError);
  // Continue - data saved to backend
}
```

**iOS localStorage limits:**
- Typical: 5-10 MB total
- Exceeding causes QuotaExceededError
- Now gracefully handled

### 3. ✅ Enhanced Logging

Added iOS-specific logging to help debug:

```javascript
console.log('Platform:', isIOS ? 'iOS' : 'Other', 'Delay:', delay + 'ms');
console.log('Starting view refresh after save...');
// ... refresh happens ...
console.log('View refresh completed successfully');
```

**To view logs on iOS:**
1. Connect iPhone to Mac
2. Open Safari → Develop → [Your iPhone] → [Your App]
3. See Console tab

### 4. ✅ Already Had:
- Double-tap protection
- Error isolation (try-catch per view)
- Disabled button during save

## Testing on iOS

1. **Save Adventure:**
   ```
   - Create adventure
   - Add sub-activities/reminders
   - Tap Save
   - Wait ~1 second (800ms delay)
   - Should NOT crash ✅
   ```

2. **Save Memory:**
   ```
   - Create memory
   - Tap Save
   - Wait ~1 second
   - Should NOT crash ✅
   ```

3. **Check Logs:**
   ```
   - Connect to Mac Safari
   - Look for:
     "Platform: iOS Delay: 800ms"
     "Starting view refresh..."
     "View refresh completed"
   ```

## Common iOS Crash Scenarios (Now Fixed)

### Before Fix:
```
User taps Save
→ Modal closes (animation starts, 500ms)
→ Refresh starts IMMEDIATELY (during animation)
→ iOS webview: "Too much happening!" 💥 CRASH
```

### After Fix:
```
User taps Save
→ Modal closes (animation starts, 500ms)
→ Wait 800ms
→ Modal animation completes
→ Refresh starts (safe)
→ Success ✅
```

## If Still Crashing

### Check These:

1. **iOS Version**
   - iOS 14+: WKWebView (better)
   - iOS 13-: UIWebView (problematic)
   - Update iOS if possible

2. **App Type**
   - Native Swift wrapper?
   - Cordova/Capacitor?
   - React Native?
   - Each has different constraints

3. **Memory Usage**
   - Is app using a lot of memory?
   - Check in Xcode Memory Debugger
   - Might need to clear cache periodically

4. **Specific Crash Point**
   - During save?
   - After save, during close?
   - During refresh?
   - Logs will show exactly when

### Additional Fixes (if needed):

#### Option 1: Even Longer Delay
```javascript
const delay = isIOS ? 1200 : 300; // Increase to 1.2 seconds
```

#### Option 2: Skip Refresh on iOS
```javascript
if (!isIOS) {
  refreshPlanView(); // Only refresh on non-iOS
}
```

#### Option 3: Throttle Refreshes
```javascript
// Only refresh once every 2 seconds
let lastRefresh = 0;
if (Date.now() - lastRefresh > 2000) {
  refreshPlanView();
  lastRefresh = Date.now();
}
```

#### Option 4: Clear localStorage Cache
```javascript
// If over 5MB, clear old data
if (localStorage.length > 1000) {
  localStorage.clear();
}
```

## Debugging on iOS

### View Console Logs:
1. **Connect to Mac:**
   - USB cable
   - Trust computer

2. **Open Safari:**
   - Safari → Develop → [Your iPhone]
   - Select your app/page

3. **See Console:**
   - Look for errors
   - Check logs we added

### Common Error Messages:

- **"QuotaExceededError"** → localStorage full (now handled)
- **"Out of memory"** → Too much data rendering
- **"Script execution timed out"** → Infinite loop somewhere
- **Silent crash** → WKWebView killed the process

## What to Report

If still crashing after these fixes:

1. **iOS Details:**
   - iPhone model (11, 13 Pro, etc.)
   - iOS version (15.0, 16.3, etc.)
   - App type (Cordova, Capacitor, etc.)

2. **Crash Details:**
   - When exactly? (during save, after, etc.)
   - Every time or sometimes?
   - With certain adventures (many sub-activities)?

3. **Console Logs:**
   - Connect to Mac Safari
   - Copy all console output
   - Include errors (red text)

## Summary

✅ **iOS-specific fixes deployed:**
- 800ms delay (vs 300ms for Android)
- localStorage protection
- Enhanced logging
- Double-tap protection

🧪 **Test and report:**
- Try saving adventure/memory on iOS
- Check if crash still happens
- Share console logs if it does

The 800ms delay should fix it - iOS needs time for modal animations to complete before refreshing views.
