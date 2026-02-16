# Reminders & Sub-Activities Fix

## Issues Found

### 1. ✅ FIXED - Reminders Display Format Mismatch

**Problem:** The display code expected different field names than what was being saved.

**Saved Format:**
```javascript
{
  key: 'ai_0',
  label: '🔔 Book hotel 2 weeks before',
  checked: true
}
```

**Expected Format (WRONG):**
```javascript
{
  emoji: '🔔',
  name: 'Book hotel',
  timing: '2 weeks before'
}
```

**Fix Applied:**
- Updated [app.js:3155](www/app.js#L3155) to use `r.label` instead of `r.emoji + r.name`
- Now displays: `${escapeHtml(r.label || r.name || 'Reminder')}`

### 2. ✅ ADDED - Debug Logging

**Added logging to help diagnose issues:**

**In adventure.js (line 681-689):**
- Logs reminders and sub-activities before saving
- Shows count of each

**In app.js (line 3153, 3166):**
- Logs what data is being loaded when displaying
- Helps identify if data is missing from backend

## What to Test

### Frontend Testing:

1. **Create an adventure with AI-generated reminders:**
   - Start adventure wizard
   - Get to reminders step
   - Click "✨ Generate Smart Reminders"
   - Select some reminders
   - Save adventure
   - **Check console logs** - should show reminder count > 0
   - **Edit the adventure** - reminders should display

2. **Create an adventure with sub-activities:**
   - Start adventure wizard
   - Add location and generate AI activity ideas
   - Select some sub-activities
   - Save adventure
   - **Check console logs** - should show subActivity count > 0
   - **Edit the adventure** - sub-activities should display

### Backend Verification Required:

⚠️ **IMPORTANT**: I don't have access to your Lambda functions for creating/updating plans. You need to verify:

1. **Check your plan creation Lambda** (likely named `lifestack-create-plan-lambda.js` or similar):
   - Verify it's saving `reminderPrefs` field to DynamoDB
   - Verify it's saving `subActivities` field to DynamoDB

2. **Check your plan update Lambda**:
   - Verify updates include `reminderPrefs` and `subActivities`

3. **Check your DynamoDB table schema**:
   - Make sure these fields are allowed (they should be, DynamoDB is schemaless)
   - Check if there are any attribute filters blocking them

4. **Example of what the Lambda should do:**

```javascript
// In your create/update plan Lambda
export const handler = async (event) => {
  const body = JSON.parse(event.body);

  const planItem = {
    userId: userId,
    id: planId,
    type: body.type,
    title: body.title,
    // ... other fields ...
    reminderPrefs: body.reminderPrefs || [],  // ← Make sure this is included
    subActivities: body.subActivities || null, // ← Make sure this is included
    updatedAt: new Date().toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: PLANS_TABLE,
    Item: planItem
  }));

  return {
    statusCode: 200,
    body: JSON.stringify(planItem)  // ← Return full object including these fields
  };
};
```

## Console Log Examples

When creating an adventure, you should see:

```
Adventure save data: {
  reminders: [
    {key: 'ai_0', label: '🔔 Book hotel 2 weeks before', checked: true},
    {key: 'ai_1', label: '✈️ Check flight status 1 day before', checked: true}
  ],
  subActivities: [
    {name: 'Visit Times Square', description: 'Iconic NYC landmark', emoji: '🗽'},
    {name: 'Central Park walk', description: 'Scenic urban park', emoji: '🌳'}
  ],
  reminderCount: 2,
  subActivityCount: 2
}
```

When loading/editing an adventure:

```
Loading reminders for plan: plan_1234567890 reminderPrefs: Array(2)
Loading sub-activities for plan: plan_1234567890 subActivities: Array(2)
```

If you see empty arrays or null, the backend isn't saving the data properly.

## Next Steps

1. ✅ Frontend fixes applied
2. ⚠️ Test creating adventures with reminders and sub-activities
3. ⚠️ Check console logs to see if data is being sent to backend
4. ⚠️ Verify backend Lambda is saving these fields to DynamoDB
5. ⚠️ Verify backend Lambda is returning these fields when fetching plans

## Files Modified

- [www/app.js](www/app.js#L3151-3177) - Fixed reminder display format + added debug logs
- [www/adventure.js](www/adventure.js#L681-702) - Added debug logs for saving
