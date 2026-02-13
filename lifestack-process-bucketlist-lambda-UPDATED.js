// =====================================================
// LIFESTACK - PROCESS BUCKET LIST (AI GENERATION)
// Generates bucket list items with location extraction
// =====================================================

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const BUCKETLIST_TABLE = process.env.BUCKETLIST_TABLE || 'lifestack-bucketlist';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

export const handler = async (event) => {
  console.log('=== PROCESS BUCKET LIST ===');

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }) };
    }

    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const body = JSON.parse(event.body || '{}');
    const { action, input } = body;

    console.log('Request:', { userId, action, input: input?.substring(0, 100) });

    if (!action || !input) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'action and input required' }) };
    }

    // =====================================================
    // BUILD AI PROMPT
    // =====================================================
    let prompt = '';

    if (action === 'generate') {
      prompt = `You are helping someone create their life bucket list.

User wants to add: "${input}"

IMPORTANT RULES:
1. If the user wants to complete a COLLECTION, EXPAND it into INDIVIDUAL items
   Example: "Visit all 50 US states" → Create items for 5-10 specific states
   Example: "Try cuisines from around the world" → List 5-10 specific cuisines
2. LIMIT to 10 items maximum
3. For TRAVEL items, extract the LOCATION (city/place name)
4. Use real, accurate data for places, events, or experiences

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "items": [
    {
      "title": "Visit Yellowstone National Park",
      "description": "Wyoming - America's first national park, famous for geysers and wildlife",
      "category": "travel",
      "difficulty": "medium",
      "timeframe": "year",
      "location": "Yellowstone National Park, Wyoming"
    },
    {
      "title": "Learn to play guitar",
      "description": "Master basic chords and play favorite songs",
      "category": "skills",
      "difficulty": "medium",
      "timeframe": "year",
      "location": ""
    }
  ],
  "encouragement": "Amazing goals! Let's make them happen 🌟"
}

LOCATION RULES:
- For travel items: Extract the destination (e.g., "Paris, France", "Grand Canyon, Arizona", "Tokyo, Japan")
- For location-based activities: Include the general area (e.g., "Napa Valley", "Rocky Mountains")
- For skills/experiences with no specific location: Leave blank ("")
- Be specific - use city/landmark names, not just countries when possible

CATEGORY GUIDE:
- travel: Destinations, trips, countries to visit
- adventure: Outdoor activities, extreme sports, physical challenges
- skills: Learning instruments, languages, crafts, talents
- experiences: Concerts, festivals, events, unique activities
- personal: Self-improvement, life milestones, achievements
- health: Fitness goals, wellness challenges, physical achievements
- creative: Art projects, writing, music creation, design
- relationships: Family goals, friendship experiences, social milestones
- career: Professional achievements, business goals, work milestones

DIFFICULTY & TIMEFRAME:
- difficulty: "easy", "medium", "hard"
- timeframe: "month", "year", "5years", "lifetime"

Keep descriptions SHORT (one sentence) but specific and inspiring!`;

    } else if (action === 'add') {
      // Manual add - just validate and structure the input
      prompt = `The user wants to add this to their bucket list: "${input}"

Create a single bucket list item with:
- A clear, concise title
- A short description (one sentence)
- Appropriate category
- Realistic difficulty and timeframe
- Location if it's a travel/location-based item

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "items": [
    {
      "title": "...",
      "description": "...",
      "category": "...",
      "difficulty": "...",
      "timeframe": "...",
      "location": "..."
    }
  ],
  "encouragement": "Great addition to your bucket list!"
}`;
    }

    // =====================================================
    // CALL ANTHROPIC API
    // =====================================================
    console.log('Calling Anthropic API...');

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        temperature: 0.7,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic error:', anthropicResponse.status, errorText);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'AI API error' }) };
    }

    const anthropicData = await anthropicResponse.json();
    const aiText = anthropicData.content?.[0]?.text;

    if (!aiText) {
      console.error('No AI response text');
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No AI response' }) };
    }

    console.log('AI response (first 300):', aiText.substring(0, 300));

    // =====================================================
    // PARSE AI RESPONSE
    // =====================================================
    let aiResult;
    try {
      let cleanJson = aiText.trim();

      // Remove markdown code blocks if present
      if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
      if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
      if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

      aiResult = JSON.parse(cleanJson.trim());

      if (!aiResult.items || !Array.isArray(aiResult.items)) {
        throw new Error('Invalid AI response structure');
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      console.error('AI text:', aiText);
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to parse AI response' }) };
    }

    // =====================================================
    // CREATE BUCKET LIST ITEMS WITH LOCATION & TEMPORARY FLAG
    // =====================================================
    const newItems = aiResult.items.map((item, index) => ({
      ...item,
      id: `bucket_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
      status: 'dream',
      location: item.location || '',  // ✅ Include location field
      createdAt: new Date().toISOString(),
      aiGenerated: true,
      temporary: true  // ✅ Mark as temporary until user confirms
    }));

    console.log('Created', newItems.length, 'items with temporary flag');

    // =====================================================
    // SAVE TO DYNAMODB
    // =====================================================
    // Get existing bucket list
    let existingItems = [];
    try {
      const getResult = await docClient.send(new GetCommand({
        TableName: BUCKETLIST_TABLE,
        Key: { userId }
      }));

      if (getResult.Item?.items) {
        existingItems = getResult.Item.items;
      }
    } catch (getError) {
      console.error('Error fetching existing items:', getError);
      // Continue anyway - will create new list
    }

    // Combine existing + new temporary items
    const allItems = [...existingItems, ...newItems];

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: BUCKETLIST_TABLE,
      Item: {
        userId,
        items: allItems,
        updatedAt: new Date().toISOString()
      }
    }));

    console.log('Saved to DynamoDB');

    // =====================================================
    // RETURN RESPONSE
    // =====================================================
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        items: newItems,
        encouragement: aiResult.encouragement || 'Amazing goals! Let\'s make them happen 🌟',
        message: 'Items generated successfully (temporary until confirmed)'
      })
    };

  } catch (error) {
    console.error('Unhandled error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
