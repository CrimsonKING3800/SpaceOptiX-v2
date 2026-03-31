import { NextResponse } from "next/server";
import { generateToken, setAuthCookie } from "@/lib/auth";
import { verifyOtpAndActivate } from "@/lib/services/email-verification.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 },
      );
    }

    try {
      const user = await verifyOtpAndActivate(email, otp);

      const token = generateToken({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at,
      });

      await setAuthCookie(token);

      return NextResponse.json({
        user: {
          userId: user._id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "PENDING_NOT_FOUND") {
          return NextResponse.json(
            {
              error:
                "No pending verification found for this email. Please register again.",
            },
            { status: 404 },
          );
        }

        if (error.message === "OTP_EXPIRED") {
          return NextResponse.json(
            { error: "OTP expired. Please request a new OTP." },
            { status: 410 },
          );
        }

        if (error.message === "OTP_INVALID") {
          return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
        }

        if (error.message === "EMAIL_ALREADY_REGISTERED") {
          return NextResponse.json(
            { error: "Email already registered. Please login." },
            { status: 409 },
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
