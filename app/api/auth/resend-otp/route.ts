import { NextResponse } from "next/server";
import { resendOtp } from "@/lib/services/email-verification.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    try {
      const result = await resendOtp(email);
      return NextResponse.json({
        success: true,
        resendAfterSeconds: result.resendAfterSeconds,
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
            { error: "OTP expired. Please register again." },
            { status: 410 },
          );
        }

        if (error.message.startsWith("RESEND_BLOCKED:")) {
          const retryAfter = Number(error.message.split(":")[1] || "60");
          return NextResponse.json(
            {
              error: `Please wait ${retryAfter}s before requesting another OTP.`,
              retryAfter,
            },
            { status: 429 },
          );
        }

        if (error.message.includes("Mailgun is not configured")) {
          return NextResponse.json(
            {
              error:
                "Email service is not configured. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN.",
            },
            { status: 500 },
          );
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("Resend OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
