import { getDb } from "@/lib/mongodb";
import { AuditAction, AuditLog } from "@/lib/models";

export type AuditEntityType = "booking" | "approval" | "venue" | "user";

export interface AuditLogEntry {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  userId: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

export interface AuditFilters {
  user_id?: string;
  action?: AuditAction;
  entity_type?: AuditEntityType;
  limit?: number;
}

export async function logAction(
  entry: AuditLogEntry,
): Promise<{ success: boolean; logId: string }> {
  const db = await getDb();

  const result = await db.collection("audit_logs").insertOne({
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    user_id: entry.userId,
    details: entry.details || null,
    timestamp: entry.timestamp || new Date().toISOString(),
  });

  return {
    success: true,
    logId: result.insertedId.toString(),
  };
}

export async function getAuditLogs(
  filters?: AuditFilters,
): Promise<AuditLog[]> {
  const db = await getDb();

  const query: Record<string, unknown> = {};

  if (filters?.user_id) {
    query.user_id = filters.user_id;
  }
  if (filters?.action) {
    query.action = filters.action;
  }
  if (filters?.entity_type) {
    query.entity_type = filters.entity_type;
  }

  const logs = await db
    .collection("audit_logs")
    .find(query)
    .sort({ timestamp: -1 })
    .limit(filters?.limit || 100)
    .toArray();

  return logs.map((log: any) => ({
    ...log,
    _id: log._id.toString(),
  })) as AuditLog[];
}
