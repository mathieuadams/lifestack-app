// =====================================================
// LIFESTACK - AI RECOMMENDATIONS & REMINDERS
// Generates activity recommendations AND smart reminders
// =====================================================

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const USERS_TABLE = process.env.USERS_TABLE || 'lifestack-users';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

export const handler = async (event) => {
  console.log('=== AI RECOMMENDATIONS & REMINDERS ===');

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
    const { category, title, description, location, context } = body;

    console.log('Request:', { userId, category, title, location, context: context?.substring(0, 100) });

    // =====================================================
    // SMART REMINDERS MODE
    // =====================================================
    if (category === 'reminders') {
      if (!context && !location) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'context or location required for reminders' }) };
      }

      const prompt = buildReminderPrompt(context, location, title);
      console.log('Calling Anthropic for REMINDERS...');

      const anthropicResponse = await callAnthropic(prompt);
      const recommendations = parseRecommendations(anthropicResponse, 'reminders');

      console.log('Generated', recommendations.length, 'reminders');
      return {
        statusCode: 200, headers,
        body: JSON.stringify({ recommendations })
      };
    }

    // =====================================================
    // PLACE RECOMMENDATIONS MODE
    // =====================================================
    if (!category) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'category is required' }) };
    }

    // Priority: use location from request body > fetch user hometown
    let searchLocation = location;

    if (!searchLocation) {
      console.log('No location provided, fetching user hometown...');
      const userResult = await docClient.send(new GetCommand({
        TableName: USERS_TABLE,
        Key: { id: userId }
      }));
      const user = userResult.Item || {};
      searchLocation = user.hometown?.name || null;
    }

    if (!searchLocation) {
      return {
        statusCode: 200, headers,
        body: JSON.stringify({
          recommendations: [],
          message: 'Set your hometown in Profile settings or enter a location to get recommendations!'
        })
      };
    }

    console.log('Search location:', searchLocation);

    // Build prompt for place recommendations
    const prompt = buildRecommendPrompt(category, searchLocation, title, description);
    console.log('Calling Anthropic for RECOMMENDATIONS...');

    const anthropicResponse = await callAnthropic(prompt);
    const recommendations = parseRecommendations(anthropicResponse, category);

    console.log('Generated', recommendations.length, 'recommendations');

    return {
      statusCode: 200, headers,
      body: JSON.stringify({ recommendations })
    };

  } catch (error) {
    console.error('Unhandled error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

// =====================================================
// CALL ANTHROPIC API
// =====================================================
async function callAnthropic(prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
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

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Anthropic error:', response.status, errorText);
    throw new Error('AI API error');
  }

  const data = await response.json();
  const aiText = data.content?.[0]?.text;

  if (!aiText) {
    throw new Error('No AI response');
  }

  console.log('AI response (first 300):', aiText.substring(0, 300));
  return aiText;
}

// =====================================================
// PARSE RECOMMENDATIONS FROM AI RESPONSE
// =====================================================
function parseRecommendations(aiText, category) {
  try {
    let cleanJson = aiText.trim();

    // Remove markdown code blocks
    if (cleanJson.startsWith('```json')) cleanJson = cleanJson.slice(7);
    if (cleanJson.startsWith('```')) cleanJson = cleanJson.slice(3);
    if (cleanJson.endsWith('```')) cleanJson = cleanJson.slice(0, -3);

    const parsed = JSON.parse(cleanJson.trim());
    const items = parsed.recommendations || parsed.reminders || parsed.places || parsed;

    if (!Array.isArray(items)) {
      console.error('Response is not an array:', typeof items);
      return [];
    }

    return items.map((item, index) => ({
      id: `rec_${Date.now()}_${index}`,
      name: item.name || item.title || 'Recommendation',
      description: item.description || '',
      distance: item.distance || item.timing || '',
      emoji: item.emoji || '📍',
      category: category
    }));

  } catch (parseError) {
    console.error('JSON parse error:', parseError.message);
    console.error('AI text:', aiText);
    return [];
  }
}

// =====================================================
// REMINDER PROMPT
// =====================================================
function buildReminderPrompt(context, location, title) {
  const contextStr = context || `Planning an activity${location ? ` in ${location}` : ''}${title ? `: ${title}` : ''}`;

  return `You are a helpful travel and activity planning assistant.

Context: ${contextStr}

Generate EXACTLY 4 specific, actionable preparation reminders for this activity.

REQUIREMENTS:
- Each reminder must be SPECIFIC to the activity and location mentioned
- Include practical preparation steps someone would actually need to do
- Add timing for when each task should be done (e.g., "1 week before", "day before", "2 days before")
- Pick an appropriate emoji for each reminder
- Keep titles short and actionable (max 8 words)
- Make them USEFUL and RELEVANT to the specific activity

Examples:
- For a museum visit: "🎫 Check ticket availability online — 1 week before"
- For hiking: "🥾 Check trail conditions and weather — 1 day before"
- For restaurant: "📞 Confirm reservation — 1 day before"

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "reminders": [
    {
      "emoji": "🎫",
      "name": "Check ticket availability",
      "description": "Book tickets online in advance",
      "timing": "1 week before"
    },
    {
      "emoji": "🚗",
      "name": "Reserve parking spot",
      "description": "Find and book parking nearby",
      "timing": "3 days before"
    }
  ]
}`;
}

// =====================================================
// PLACE RECOMMENDATION PROMPT
// =====================================================
function buildRecommendPrompt(category, location, title, description) {
  const categoryDescriptions = {
    'travel': 'weekend getaway or trip destinations',
    'food': 'restaurants, dining experiences, or food spots',
    'adventure': 'outdoor activities, hikes, or adventure spots',
    'roadtrip': 'road trip destinations and scenic drives',
    'culture': 'cultural venues, museums, theaters, or exhibitions',
    'date': 'romantic date spots, restaurants, and activities',
    'health': 'fitness activities, gyms, yoga studios, or wellness spots',
    'birthday': 'birthday party venues, group activities, or celebration spots',
    'hiking': 'hiking trails and nature walks',
    'skiing': 'ski resorts and winter sports destinations'
  };

  const catDesc = categoryDescriptions[category] || `${category} activities and places`;
  const contextLine = title ? `\nThe user is thinking about: "${title}"${description ? ` — ${description}` : ''}` : '';

  return `You are a local recommendations expert. Suggest 5 great ${catDesc} IN OR NEAR ${location}.

${contextLine}

IMPORTANT RULES:
1. Recommend REAL places that actually exist IN ${location} or nearby
2. Use REAL business names, REAL trail names, REAL venue names
3. Include distance/drive time FROM ${location} city center
4. Mix nearby options (< 30 min) with slightly farther ones if relevant
5. For each recommendation, pick ONE emoji that best represents it
6. Keep descriptions to ONE short sentence — punchy and useful
7. Prioritize well-rated, popular spots over tourist traps
8. Consider what would be enjoyable to do there

Examples:
- For Portland food: "Pok Pok — Authentic Thai street food, famous wings · 15 min 🍗"
- For Sacramento hiking: "American River Parkway Trail — 32-mile paved trail along river · 10 min 🚴"
- For San Francisco culture: "SFMOMA — World-class modern art museum · Downtown · 12 min 🎨"

Respond ONLY with valid JSON (no markdown, no code blocks):
{
  "recommendations": [
    {
      "name": "The Kitchen Restaurant",
      "description": "Interactive prix fixe dining — Sacramento's best culinary experience",
      "distance": "Downtown · 12 min",
      "emoji": "🍳"
    }
  ]
}`;
}
