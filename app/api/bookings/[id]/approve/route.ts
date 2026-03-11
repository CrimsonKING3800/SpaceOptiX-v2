import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as approvalController from "@/lib/controllers/approval.controller";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.role !== "professor" && user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    return await approvalController.approveBooking(
      id,
      user.userId,
      user.role,
      body,
    );
  } catch (error) {
    console.error("Booking approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
