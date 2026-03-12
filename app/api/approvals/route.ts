import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as approvalController from "@/lib/controllers/approval.controller";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "professor" && user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    return await approvalController.listApprovals({
      user: { userId: user.userId, role: user.role },
      query: {
        status: searchParams.get("status") || undefined,
        limit: searchParams.get("limit") || undefined,
      },
    });
  } catch (error) {
    console.error("Approvals fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
