import { NextResponse } from "next/server";
import { createPendingVerification } from "@/lib/services/email-verification.service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      department,
      phone,
      student_id,
      faculty_id,
    } = body;

    if (!name || !email || !password || !role || !department) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Only allow IIT KGP emails
    if (!email.toLowerCase().endsWith(".iitkgp.ac.in")) {
      return NextResponse.json(
        {
          error:
            "Only IIT Kharagpur emails (@*.iitkgp.ac.in) are allowed to register",
        },
        { status: 400 },
      );
    }

    try {
      const result = await createPendingVerification({
        name,
        email,
        password,
        role,
        department,
        phone,
        student_id,
        faculty_id,
      });

      return NextResponse.json({
        requiresVerification: true,
        email: result.email,
        expiresInSeconds: result.expiresInSeconds,
        resendAfterSeconds: result.resendAfterSeconds,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "EMAIL_ALREADY_REGISTERED") {
          return NextResponse.json(
            { error: "Email already registered" },
            { status: 409 },
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
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
