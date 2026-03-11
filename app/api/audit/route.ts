import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getAuditLogs, AuditFilters } from "@/lib/services/audit.service";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const url = new URL(request.url);
    const filters: AuditFilters = {};
    const userId = url.searchParams.get("user_id");
    const action = url.searchParams.get("action");
    const entityType = url.searchParams.get("entity_type");
    const limit = url.searchParams.get("limit");

    if (userId) {
      filters.user_id = userId;
    }
    if (action) {
      filters.action = action as AuditFilters["action"];
    }
    if (entityType) {
      filters.entity_type = entityType as AuditFilters["entity_type"];
    }
    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    const db = await getDb();
    const logs = await getAuditLogs(filters);

    // Populate user names
    const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))];
    const users =
      userIds.length > 0
        ? await db
            .collection("users")
            .find({
              _id: {
                $in: userIds
                  .map((id) => {
                    try {
                      return new ObjectId(id);
                    } catch {
                      return null;
                    }
                  })
                  .filter((id): id is ObjectId => id !== null),
              },
            })
            .project({ name: 1 })
            .toArray()
        : [];
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return NextResponse.json({
      logs: logs.map((l) => ({
        ...l,
        _id: l._id.toString(),
        user: userMap.get(l.user_id)
          ? { ...userMap.get(l.user_id), _id: l.user_id }
          : null,
      })),
    });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
