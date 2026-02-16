// lifestack-cleanup-orphan-shared-plans-lambda.js
// One-time/admin cleanup: remove shared-adventure rows whose owner plan no longer exists.
//
// Invoke with optional query/body params:
// - dryRun: true/false (default true)
// - year: number (optional)
// - ownerUserId: string (optional)
//
// NOTE: keep this admin-only; do not expose publicly without authorization checks.

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

const PLANS_TABLE = process.env.PLANS_TABLE || "lifestack-plans";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "POST,OPTIONS"
};

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  const normalized = String(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function normalizeInput(event) {
  const body = event.body ? JSON.parse(event.body) : {};
  const query = event.queryStringParameters || {};
  return {
    dryRun: parseBool(body.dryRun ?? query.dryRun, true),
    year: body.year ?? query.year ?? null,
    ownerUserId: body.ownerUserId ?? query.ownerUserId ?? null
  };
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Basic auth gate: requires any valid user token.
  const caller = event.requestContext?.authorizer?.claims?.sub;
  if (!caller) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized" })
    };
  }

  try {
    const { dryRun, year, ownerUserId } = normalizeInput(event);

    let lastEvaluatedKey = undefined;
    let scanned = 0;
    let orphaned = 0;
    let deleted = 0;
    const samples = [];

    do {
      const scanResult = await docClient.send(new ScanCommand({
        TableName: PLANS_TABLE,
        ExclusiveStartKey: lastEvaluatedKey,
        // Narrow to shared-adventure rows first.
        FilterExpression: "#type = :sharedAdventure",
        ExpressionAttributeNames: { "#type": "type" },
        ExpressionAttributeValues: { ":sharedAdventure": "shared-adventure" }
      }));

      const sharedRows = scanResult.Items || [];
      scanned += sharedRows.length;

      for (const row of sharedRows) {
        if (year !== null && year !== undefined && parseInt(row.year) !== parseInt(year)) continue;
        if (ownerUserId && row.originalOwnerId !== ownerUserId) continue;

        const originalOwnerId = row.originalOwnerId;
        const originalPlanId = row.originalPlanId;
        if (!originalOwnerId || !originalPlanId) {
          // Malformed shared row -> treat as orphaned.
          orphaned += 1;
          if (!dryRun) {
            await docClient.send(new DeleteCommand({
              TableName: PLANS_TABLE,
              Key: { userId: row.userId, id: row.id }
            }));
            deleted += 1;
          }
          if (samples.length < 20) samples.push({ userId: row.userId, id: row.id, reason: "missing_original_refs" });
          continue;
        }

        const ownerPlan = await docClient.send(new GetCommand({
          TableName: PLANS_TABLE,
          Key: { userId: originalOwnerId, id: originalPlanId }
        }));

        if (!ownerPlan.Item) {
          orphaned += 1;
          if (!dryRun) {
            await docClient.send(new DeleteCommand({
              TableName: PLANS_TABLE,
              Key: { userId: row.userId, id: row.id }
            }));
            deleted += 1;
          }
          if (samples.length < 20) {
            samples.push({
              userId: row.userId,
              id: row.id,
              originalOwnerId,
              originalPlanId,
              reason: "owner_plan_missing"
            });
          }
        }
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        dryRun,
        filters: { year: year ?? null, ownerUserId: ownerUserId ?? null },
        scannedSharedRows: scanned,
        orphanedRows: orphaned,
        deletedRows: deleted,
        samples
      })
    };
  } catch (error) {
    console.error("cleanup orphan shared plans error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Cleanup failed" })
    };
  }
};
