// lifestack-delete-plan-lambda.js
// DELETE /plans/{planId}
// Deletes owner plan and any shared copies tied to that owner plan.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const PLANS_TABLE = process.env.PLANS_TABLE || "lifestack-plans";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "DELETE,OPTIONS"
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const userId = event.requestContext?.authorizer?.claims?.sub;
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: "Unauthorized" })
      };
    }

    let planId = event.pathParameters?.planId ||
                 event.pathParameters?.id ||
                 event.pathParameters?.proxy;
    if (!planId && event.path) {
      const parts = event.path.split("/");
      planId = parts[parts.length - 1];
    }

    if (!planId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "planId is required" })
      };
    }

    // Verify ownership / existence first.
    const existing = await docClient.send(new GetCommand({
      TableName: PLANS_TABLE,
      Key: { userId, id: planId }
    }));

    const plan = existing.Item;
    if (!plan) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: "Plan not found" })
      };
    }

    let deletedSharedCount = 0;

    // Owner delete should remove shared copies too.
    if (plan.type === "adventure" || plan.type === "misogi") {
      const taggedUsers = extractTaggedUserIds(plan).filter(id => id !== userId);

      for (const taggedUserId of taggedUsers) {
        try {
          await docClient.send(new DeleteCommand({
            TableName: PLANS_TABLE,
            Key: {
              userId: taggedUserId,
              id: `shared_${planId}_${taggedUserId}`
            }
          }));
          deletedSharedCount += 1;
        } catch (error) {
          console.log("Shared delete skipped/failed:", taggedUserId, error.message);
        }
      }
    }

    await docClient.send(new DeleteCommand({
      TableName: PLANS_TABLE,
      Key: { userId, id: planId }
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: "Plan deleted",
        id: planId,
        deletedSharedCount
      })
    };
  } catch (error) {
    console.error("Delete plan error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Failed to delete plan" })
    };
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
