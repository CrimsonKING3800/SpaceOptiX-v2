import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as approvalController from "@/lib/controllers/approval.controller";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "professor" && user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    return await approvalController.decideApproval({
      user: { userId: user.userId, role: user.role },
      bookingId: id,
      body,
    });
  } catch (error) {
    console.error("Approval action error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
