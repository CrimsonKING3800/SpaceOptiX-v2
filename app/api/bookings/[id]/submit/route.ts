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
    const result = await bookingService.submitBooking(
      id,
      user.userId,
      user.role,
    );

    if (!result.success) {
      const unauthorized = result.message.includes("Unauthorized");
      return NextResponse.json(
        { error: result.message },
        { status: unauthorized ? 403 : 400 },
      );
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    console.error("Booking submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
