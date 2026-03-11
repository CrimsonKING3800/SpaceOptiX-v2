import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as approvalController from "@/lib/controllers/approval.controller";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    return await approvalController.getApprovals(id);
  } catch (error) {
    console.error("Approvals fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
