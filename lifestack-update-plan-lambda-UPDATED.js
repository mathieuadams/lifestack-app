// lifestack-update-plan-lambda.js
// PUT /plans/{planId} - Update a plan
// ALSO manages shared-adventure records when people are added/removed

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
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

    // Extract planId from path
    let planId = event.pathParameters?.planId ||
                 event.pathParameters?.id ||
                 event.pathParameters?.proxy;

    if (!planId && event.path) {
      const pathParts = event.path.split('/');
      planId = pathParts[pathParts.length - 1];
    }

    console.log('Extracted planId:', planId);

    if (!planId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'planId is required' }) };
    }

    const body = JSON.parse(event.body || '{}');
    console.log('Update body:', JSON.stringify(body));

    // Get current plan to check for changes in people
    let existingPlan = null;
    try {
      const existingResult = await docClient.send(new GetCommand({
        TableName: "lifestack-plans",
        Key: { userId, id: planId }
      }));
      existingPlan = existingResult.Item;
    } catch (e) {
      console.log('Could not fetch existing plan:', e.message);
    }

    if (!existingPlan) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Plan not found' }) };
    }

    const existingTaggedUsers = extractTaggedUserIds(existingPlan);
    const planType = existingPlan.type;
    const ownerName = existingPlan.ownerName || 'Someone';

    // Build dynamic update expression
    const updateParts = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    const updatableFields = [
      'title', 'description', 'type', 'category', 'year',
      'targetMonth', 'targetQuarter', 'startDate', 'endDate',
      'status', 'completedAt', 'people', 'participants', 'checkIns', 'frequency',
      'reminderPrefs',      // ✅ Reminders
      'subActivities',      // ✅ Sub-activities
      'location'            // ✅ Location
    ];

    updatableFields.forEach(field => {
      if (body[field] !== undefined) {
        const attrName = `#${field}`;
        const attrValue = `:${field}`;

        updateParts.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = field;
        expressionAttributeValues[attrValue] = body[field];
      }
    });

    // Handle status change - set completedAt automatically
    if (body.status === 'completed' && body.completedAt === undefined) {
      if (!expressionAttributeNames['#completedAt']) {
        updateParts.push('#completedAt = :completedAt');
        expressionAttributeNames['#completedAt'] = 'completedAt';
      }
      expressionAttributeValues[':completedAt'] = new Date().toISOString();
    } else if (body.status === 'planned' && body.completedAt === undefined) {
      if (!expressionAttributeNames['#completedAt']) {
        updateParts.push('#completedAt = :completedAt');
        expressionAttributeNames['#completedAt'] = 'completedAt';
      }
      expressionAttributeValues[':completedAt'] = null;
    }

    // Always update updatedAt
    updateParts.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateParts.length === 1) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'No fields to update' }) };
    }

    const updateExpression = 'SET ' + updateParts.join(', ');
    console.log('UpdateExpression:', updateExpression);

    const result = await docClient.send(new UpdateCommand({
      TableName: "lifestack-plans",
      Key: { userId, id: planId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW"
    }));

    console.log('Update successful');

    const updatedPlan = result.Attributes;


    // Handle shared records for adventures/misogi
    if (planType === 'adventure' || planType === 'misogi') {
      // Rebuild tagged users from both people[] and participants[].
      const hasPeopleUpdate = body.people !== undefined;
      const hasParticipantsUpdate = body.participants !== undefined;
      const newTaggedUsers = (hasPeopleUpdate || hasParticipantsUpdate)
        ? extractTaggedUserIds({
            people: hasPeopleUpdate ? body.people : existingPlan.people,
            participants: hasParticipantsUpdate ? body.participants : existingPlan.participants
          })
        : existingTaggedUsers;

      // Find newly added people
      const addedPeople = newTaggedUsers.filter(p => !existingTaggedUsers.includes(p) && p !== userId);

      // Find removed people
      const removedPeople = existingTaggedUsers.filter(p => !newTaggedUsers.includes(p) && p !== userId);

      console.log('Added people:', addedPeople);
      console.log('Removed people:', removedPeople);

      // Create shared records for newly added people
      for (const taggedUserId of addedPeople) {
        await createSharedRecordAndNotify(updatedPlan, userId, ownerName, taggedUserId);
      }

      // Delete shared records for removed people
      for (const removedUserId of removedPeople) {
        await deleteSharedRecord(planId, removedUserId);
      }

      // Update existing shared records with new plan data (for people who weren't added/removed)
      const unchangedPeople = newTaggedUsers.filter(
        p => existingTaggedUsers.includes(p) && p !== userId
      );

      for (const taggedUserId of unchangedPeople) {
        await updateSharedRecord(updatedPlan, userId, ownerName, taggedUserId);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(updatedPlan)
    };

  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};

function extractTaggedUserIds(planLike) {
  const fromPeople = Array.isArray(planLike?.people)
    ? planLike.people.filter(Boolean)
    : [];

  const fromParticipants = Array.isArray(planLike?.participants)
    ? planLike.participants
        .map(p => p?.odId || p?.id || p?.userId || p?.sub || null)
        .filter(Boolean)
    : [];

  return Array.from(new Set([...fromPeople, ...fromParticipants]));
}

// =====================================================
// CREATE SHARED RECORD AND NOTIFY
// =====================================================
async function createSharedRecordAndNotify(plan, creatorUserId, creatorName, taggedUserId) {
  try {
    // Get user info
    const userResult = await docClient.send(new GetCommand({
      TableName: 'lifestack-users',
      Key: { id: taggedUserId }
    }));

    const user = userResult.Item;
    if (!user) {
      console.log('User not found:', taggedUserId);
      return;
    }

    // Create shared record
    const sharedRecord = {
      userId: taggedUserId,
      id: `shared_${plan.id}_${taggedUserId}`,
      type: 'shared-adventure',
      title: plan.title,
      description: plan.description,
      category: plan.category,
      location: plan.location || null,              // ✅ Include location
      year: plan.year,
      targetMonth: plan.targetMonth,
      targetQuarter: plan.targetQuarter,
      startDate: plan.startDate,
      endDate: plan.endDate,
      status: plan.status,
      completedAt: plan.completedAt,
      people: plan.people,
      participants: plan.participants,
      reminderPrefs: plan.reminderPrefs || [],      // ✅ Include reminders
      subActivities: plan.subActivities || null,    // ✅ Include sub-activities
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

    console.log('Created shared record for:', user.name);

    // Send notification
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
    console.error('Error creating shared record:', error.message);
  }
}

// =====================================================
// DELETE SHARED RECORD (when person is removed)
// =====================================================
async function deleteSharedRecord(planId, removedUserId) {
  try {
    const sharedId = `shared_${planId}_${removedUserId}`;

    await docClient.send(new DeleteCommand({
      TableName: 'lifestack-plans',
      Key: {
        userId: removedUserId,
        id: sharedId
      }
    }));

    console.log('Deleted shared record:', sharedId);

  } catch (error) {
    console.error('Error deleting shared record:', error.message);
  }
}

// =====================================================
// UPDATE SHARED RECORD (when plan is updated)
// =====================================================
async function updateSharedRecord(plan, creatorUserId, creatorName, taggedUserId) {
  try {
    const sharedId = `shared_${plan.id}_${taggedUserId}`;

    // Update the shared record with new plan data
    await docClient.send(new UpdateCommand({
      TableName: 'lifestack-plans',
      Key: {
        userId: taggedUserId,
        id: sharedId
      },
      UpdateExpression: 'SET #title = :title, #description = :description, #status = :status, #startDate = :startDate, #endDate = :endDate, #people = :people, #participants = :participants, #location = :location, #reminderPrefs = :reminderPrefs, #subActivities = :subActivities, #updatedAt = :updatedAt, #completedAt = :completedAt',
      ExpressionAttributeNames: {
        '#title': 'title',
        '#description': 'description',
        '#status': 'status',
        '#startDate': 'startDate',
        '#endDate': 'endDate',
        '#people': 'people',
        '#participants': 'participants',
        '#location': 'location',                    // ✅ Include location
        '#reminderPrefs': 'reminderPrefs',          // ✅ Include reminders
        '#subActivities': 'subActivities',          // ✅ Include sub-activities
        '#updatedAt': 'updatedAt',
        '#completedAt': 'completedAt'
      },
      ExpressionAttributeValues: {
        ':title': plan.title,
        ':description': plan.description || '',
        ':status': plan.status,
        ':startDate': plan.startDate,
        ':endDate': plan.endDate,
        ':people': plan.people || [],
        ':participants': plan.participants || [],
        ':location': plan.location || null,         // ✅ Include location
        ':reminderPrefs': plan.reminderPrefs || [], // ✅ Include reminders
        ':subActivities': plan.subActivities || null, // ✅ Include sub-activities
        ':updatedAt': new Date().toISOString(),
        ':completedAt': plan.completedAt || null
      }
    }));

    console.log('Updated shared record for:', taggedUserId);

  } catch (error) {
    // Record might not exist, that's okay
    console.log('Could not update shared record (may not exist):', error.message);
  }
}
