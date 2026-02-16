// lifestack-sync-shared-adventures-lambda.js
// Admin/maintenance endpoint to rebuild shared-adventure copies from owner plans.
//
// POST body/query options:
// - dryRun: boolean (default true)
// - year: number (optional)
// - activeOnly: boolean (default true) -> only sync owner plans not completed
// - ownerUserId: string (optional) -> limit to one owner
// - cleanupOrphans: boolean (default true) -> delete shared rows whose owner plan is missing

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

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
    activeOnly: parseBool(body.activeOnly ?? query.activeOnly, true),
    ownerUserId: body.ownerUserId ?? query.ownerUserId ?? null,
    cleanupOrphans: parseBool(body.cleanupOrphans ?? query.cleanupOrphans, true)
  };
}

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

function buildSharedRecord(ownerPlan, taggedUserId, previousShared) {
  const now = new Date().toISOString();
  const sharedId = `shared_${ownerPlan.id}_${taggedUserId}`;

  return {
    userId: taggedUserId,
    id: sharedId,
    type: "shared-adventure",
    title: ownerPlan.title,
    description: ownerPlan.description || "",
    category: ownerPlan.category || null,
    location: ownerPlan.location || null,
    year: ownerPlan.year,
    targetMonth: ownerPlan.targetMonth ?? null,
    targetQuarter: ownerPlan.targetQuarter ?? null,
    startDate: ownerPlan.startDate ?? null,
    endDate: ownerPlan.endDate ?? null,
    status: ownerPlan.status || "planned",
    completedAt: ownerPlan.completedAt || null,
    people: ownerPlan.people || [],
    participants: ownerPlan.participants || [],
    reminderPrefs: ownerPlan.reminderPrefs || [],
    subActivities: ownerPlan.subActivities || null,
    originalPlanId: ownerPlan.id,
    originalOwnerId: ownerPlan.userId,
    ownerName: ownerPlan.ownerName || "Someone",
    sharedAt: previousShared?.sharedAt || now,
    createdAt: previousShared?.createdAt || ownerPlan.createdAt || now,
    updatedAt: now
  };
}

async function scanByType(typeValue, yearFilter) {
  let lastEvaluatedKey = undefined;
  const rows = [];

  do {
    const expressionNames = { "#type": "type" };
    const expressionValues = { ":type": typeValue };
    let filterExpression = "#type = :type";

    if (yearFilter !== null && yearFilter !== undefined) {
      expressionNames["#year"] = "year";
      expressionValues[":year"] = parseInt(yearFilter);
      filterExpression += " AND #year = :year";
    }

    const result = await docClient.send(new ScanCommand({
      TableName: PLANS_TABLE,
      ExclusiveStartKey: lastEvaluatedKey,
      FilterExpression: filterExpression,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues
    }));

    rows.push(...(result.Items || []));
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return rows;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  // Keep this admin-only. At minimum require an authenticated caller.
  const caller = event.requestContext?.authorizer?.claims?.sub;
  if (!caller) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: "Unauthorized" })
    };
  }

  try {
    const { dryRun, year, activeOnly, ownerUserId, cleanupOrphans } = normalizeInput(event);

    // Load owner plans (both types) for this year/filter.
    const adventures = await scanByType("adventure", year);
    const misogis = await scanByType("misogi", year);
    let ownerPlans = [...adventures, ...misogis];

    if (ownerUserId) {
      ownerPlans = ownerPlans.filter(p => p.userId === ownerUserId);
    }

    const allOwnerPlanIds = new Set(ownerPlans.map(p => p.id));
    const targetOwnerPlans = activeOnly
      ? ownerPlans.filter(p => (p.status || "planned") !== "completed")
      : ownerPlans;

    // Load all shared rows for this year/filter.
    let sharedRows = await scanByType("shared-adventure", year);
    if (ownerUserId) {
      sharedRows = sharedRows.filter(r => r.originalOwnerId === ownerUserId);
    }

    const sharedByOriginalPlanId = new Map();
    for (const row of sharedRows) {
      const key = row.originalPlanId || "__missing__";
      if (!sharedByOriginalPlanId.has(key)) sharedByOriginalPlanId.set(key, []);
      sharedByOriginalPlanId.get(key).push(row);
    }

    let createdShared = 0;
    let updatedShared = 0;
    let deletedStaleShared = 0;
    let deletedOrphanShared = 0;
    let processedOwnerPlans = 0;
    const samples = [];

    for (const ownerPlan of targetOwnerPlans) {
      processedOwnerPlans += 1;
      const taggedUsers = extractTaggedUserIds(ownerPlan).filter(id => id && id !== ownerPlan.userId);
      const taggedSet = new Set(taggedUsers);

      const existingRows = sharedByOriginalPlanId.get(ownerPlan.id) || [];
      const existingByUserId = new Map(existingRows.map(r => [r.userId, r]));

      // Ensure each tagged user has a fresh shared copy.
      for (const taggedUserId of taggedUsers) {
        const existing = existingByUserId.get(taggedUserId);
        const sharedRecord = buildSharedRecord(ownerPlan, taggedUserId, existing);

        if (!dryRun) {
          await docClient.send(new PutCommand({
            TableName: PLANS_TABLE,
            Item: sharedRecord
          }));
        }

        if (existing) {
          updatedShared += 1;
          if (samples.length < 25) {
            samples.push({ action: "upsert_update", ownerPlanId: ownerPlan.id, userId: taggedUserId });
          }
        } else {
          createdShared += 1;
          if (samples.length < 25) {
            samples.push({ action: "upsert_create", ownerPlanId: ownerPlan.id, userId: taggedUserId });
          }
        }
      }

      // Remove stale shared copies for users no longer tagged.
      for (const staleRow of existingRows) {
        if (!taggedSet.has(staleRow.userId)) {
          if (!dryRun) {
            await docClient.send(new DeleteCommand({
              TableName: PLANS_TABLE,
              Key: { userId: staleRow.userId, id: staleRow.id }
            }));
          }
          deletedStaleShared += 1;
          if (samples.length < 25) {
            samples.push({ action: "delete_stale", ownerPlanId: ownerPlan.id, userId: staleRow.userId, sharedId: staleRow.id });
          }
        }
      }
    }

    if (cleanupOrphans) {
      for (const row of sharedRows) {
        if (!row.originalPlanId || !allOwnerPlanIds.has(row.originalPlanId)) {
          if (!dryRun) {
            await docClient.send(new DeleteCommand({
              TableName: PLANS_TABLE,
              Key: { userId: row.userId, id: row.id }
            }));
          }
          deletedOrphanShared += 1;
          if (samples.length < 25) {
            samples.push({ action: "delete_orphan", sharedId: row.id, userId: row.userId, originalPlanId: row.originalPlanId || null });
          }
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        dryRun,
        filters: { year: year ?? null, activeOnly, ownerUserId: ownerUserId ?? null, cleanupOrphans },
        scannedOwnerPlans: ownerPlans.length,
        processedOwnerPlans,
        scannedSharedRows: sharedRows.length,
        createdShared,
        updatedShared,
        deletedStaleShared,
        deletedOrphanShared,
        samples
      })
    };
  } catch (error) {
    console.error("sync shared adventures error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Sync failed" })
    };
  }
};
