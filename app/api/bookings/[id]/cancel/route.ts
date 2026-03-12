import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import * as bookingService from "@/lib/services/booking.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { id } = await params;
    const booking = await bookingService.cancelBooking(
      id,
      user.userId,
      user.role,
    );
    return NextResponse.json({ booking });
  } catch (error: any) {
    const message = error?.message || "Internal server error";
    const isUnauthorized = message.includes("Unauthorized");
    const isLogicError =
      message.includes("Cannot cancel") ||
      message.includes("not found") ||
      message.includes("Invalid booking ID");

    return NextResponse.json(
      { error: message },
      { status: isUnauthorized ? 403 : isLogicError ? 400 : 500 },
    );
  }
}
