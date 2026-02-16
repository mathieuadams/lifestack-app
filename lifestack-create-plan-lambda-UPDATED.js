// lifestack-create-plan-lambda.js
// POST /plans - Create a new plan
// ALSO creates shared-adventure records for tagged users

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);
const snsClient = new SNSClient({ region: "us-east-1" });

// ============ UPDATE THIS VALUE ============
const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:997493290952:lifestack-notifications';
// ===========================================

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
};

export const handler = async (event) => {
  console.log('Event:', JSON.stringify(event));

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (!event.requestContext?.authorizer?.claims?.sub) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const userId = event.requestContext.authorizer.claims.sub;
    const body = JSON.parse(event.body || '{}');

    const {
      title,
      description,
      type,           // 'misogi', 'adventure', 'habit', 'theme'
      category,
      year,
      targetMonth,
      targetQuarter,
      startDate,
      endDate,
      people,         // Array of USER IDs
      participants,   // Array of {id, name, email, role} objects
      frequency,      // For habits
      checkIns,       // For habits
      ownerName,      // Name of the creator
      location        // Location object {name, lat, lng, placeId}
    } = body;

    if (!title || !type) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'title and type required' }) };
    }

    const now = new Date().toISOString();
    const planId = `plan_${Date.now()}`;

    // Get creator's name for notifications
    const creatorName = ownerName ||
                        event.requestContext.authorizer.claims.name ||
                        event.requestContext.authorizer.claims['custom:name'] ||
                        event.requestContext.authorizer.claims.email?.split('@')[0] || 'Someone';

    const plan = {
      userId,
      id: planId,
      title,
      description: description || '',
      type,
      category: category || null,
      location: location || null,
      reminderPrefs: body.reminderPrefs || [],        // ✅ Reminders
      subActivities: body.subActivities || null,      // ✅ Sub-activities (AI-generated ideas)
      year: year || new Date().getFullYear(),
      targetMonth: targetMonth || null,
      targetQuarter: targetQuarter || null,
      startDate: startDate || null,
      endDate: endDate || null,
      status: 'planned',
      completedAt: null,
      people: people || [],
      participants: participants || [],
      frequency: frequency || null,
      checkIns: checkIns || [],
      ownerName: creatorName,
      createdAt: now,
      updatedAt: now
    };

    console.log('Creating plan with reminders:', plan.reminderPrefs?.length || 0, 'sub-activities:', plan.subActivities?.length || 0);

    // Save plan to DynamoDB
    await docClient.send(new PutCommand({
      TableName: "lifestack-plans",
      Item: plan
    }));

    console.log('Created plan:', plan.id, 'type:', plan.type);

    // For adventures/misogi with tagged people:
    // 1. Create shared-adventure records for each tagged user
    // 2. Send notifications
    if ((type === 'adventure' || type === 'misogi') && people && people.length > 0) {
      await createSharedRecordsAndNotify(plan, userId, creatorName);
    }

    return { statusCode: 201, headers, body: JSON.stringify(plan) };

  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

// =====================================================
// CREATE SHARED RECORDS AND SEND NOTIFICATIONS
// =====================================================
async function createSharedRecordsAndNotify(plan, creatorUserId, creatorName) {
  console.log('Creating shared records for tagged users:', plan.people);

  for (const taggedUserId of plan.people) {
    try {
      // Skip if it's the creator themselves
      if (taggedUserId === creatorUserId) {
        console.log('Skipping creator:', taggedUserId);
        continue;
      }

      // Get user info from lifestack-users
      const userResult = await docClient.send(new GetCommand({
        TableName: 'lifestack-users',
        Key: { id: taggedUserId }
      }));

      const user = userResult.Item;

      if (!user) {
        console.log('User not found:', taggedUserId);
        continue;
      }

      // Create a shared-adventure record for this user
      const sharedRecord = {
        userId: taggedUserId,                    // The tagged user's ID (so it shows in their plans)
        id: `shared_${plan.id}_${taggedUserId}`, // Unique ID
        type: 'shared-adventure',
        title: plan.title,
        description: plan.description,
        category: plan.category,
        location: plan.location,
        year: plan.year,
        targetMonth: plan.targetMonth,
        targetQuarter: plan.targetQuarter,
        startDate: plan.startDate,
        endDate: plan.endDate,
        status: plan.status,
        completedAt: plan.completedAt,
        people: plan.people,
        participants: plan.participants,
        reminderPrefs: plan.reminderPrefs || [],        // ✅ Include reminders
        subActivities: plan.subActivities || null,      // ✅ Include sub-activities
        // Reference to original
        originalPlanId: plan.id,
        originalOwnerId: creatorUserId,
        ownerName: creatorName,
        sharedAt: new Date().toISOString(),
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt
      };

      await docClient.send(new PutCommand({
        TableName: 'lifestack-plans',
        Item: sharedRecord
      }));

      console.log('Created shared record for:', user.name, user.email);

      // Send notification via SNS
      if (user.email) {
        await snsClient.send(new PublishCommand({
          TopicArn: SNS_TOPIC_ARN,
          Message: JSON.stringify({
            recipientUserId: taggedUserId,
            recipientEmail: user.email,
            type: 'tagged_adventure',
            senderName: creatorName,
            itemTitle: plan.title,
            itemId: plan.id,
            itemType: 'adventure'
          })
        }));

        console.log('Notification sent to:', user.email);
      }

    } catch (error) {
      console.error('Error processing user:', taggedUserId, error.message);
    }
  }
}
