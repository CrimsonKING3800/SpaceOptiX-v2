import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

type ChatRole = "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface GeminiCallResult {
  ok: boolean;
  payload?: any;
  errorText?: string;
  status?: number;
  model?: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const DOMAIN_KEYWORDS = [
  "spaceoptix",
  "dashboard",
  "booking",
  "book",
  "venue",
  "approval",
  "approve",
  "reject",
  "audit",
  "user management",
  "role",
  "student",
  "professor",
  "admin",
  "campus",
  "login",
  "register",
  "sign in",
  "sign out",
  "availability",
  "conflict",
  "pending",
  "cancel",
  "statuses",
];

function isWebsiteScoped(messages: ChatMessage[]): boolean {
  const joined = messages
    .slice(-6)
    .map((m) => m.content.toLowerCase())
    .join(" ");

  return DOMAIN_KEYWORDS.some((keyword) => joined.includes(keyword));
}

function getRolePlaybook(role: UserRole): string {
  if (role === "student") {
    return [
      "Role-specific guidance: Student.",
      "- Explain how to explore venues, create bookings, track statuses, and cancel when eligible.",
      "- Emphasize pending workflow: pending_professor -> pending_admin -> approved.",
      "- If asked admin-only operations (user/venue management, audit access), clearly state they are not available to students.",
    ].join("\n");
  }

  if (role === "professor") {
    return [
      "Role-specific guidance: Professor.",
      "- Explain approval queue usage, approving/rejecting requests, and professor booking capabilities.",
      "- Explain that professor approval moves requests to pending_admin.",
      "- If asked admin-only operations, explain limitations and point to admin workflows.",
    ].join("\n");
  }

  return [
    "Role-specific guidance: Admin.",
    "- Explain global oversight: venue management, approvals, user management, and audit logs.",
    "- Explain admin approval finalizes pending_admin to approved.",
    "- Provide concise operational guidance for managing platform-wide data.",
  ].join("\n");
}

function buildSystemInstruction(role: UserRole, name: string): string {
  return [
    "You are SpaceOptiX AI Helper for a campus venue booking web application.",
    `Current authenticated user: ${name} (${role}).`,
    "",
    "Hard scope rules:",
    "- Answer ONLY questions related to SpaceOptiX website usage, flows, and role capabilities.",
    "- If a question is outside website scope, refuse briefly and redirect to SpaceOptiX-related help.",
    "- Never provide unrelated general knowledge answers.",
    "",
    "SpaceOptiX domain facts:",
    "- Main entities: users, venues, bookings, approvals, audit logs.",
    "- Booking statuses include: draft, pending_professor, pending_admin, approved, rejected, cancelled.",
    "- Student booking starts at pending_professor.",
    "- Professor approval moves pending_professor to pending_admin.",
    "- Admin approval moves pending_admin to approved.",
    "- Rejection can move booking to rejected with optional reason.",
    "",
    getRolePlaybook(role),
    "",
    "Response style:",
    "- Keep answers short, practical, and step-by-step when needed.",
    "- Prefer concrete route names like /dashboard/bookings when useful.",
    "- If data is needed that you do not have, say what the user should check in the UI.",
  ].join("\n");
}

function normalizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const rec = item as Record<string, unknown>;
      const role = rec.role === "assistant" ? "assistant" : "user";
      const content = typeof rec.content === "string" ? rec.content.trim() : "";
      return { role, content } as ChatMessage;
    })
    .filter((msg) => msg.content.length > 0)
    .slice(-12);
}

function extractGeminiText(payload: any): string {
  const candidates = payload?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return "";

  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";

  const text = parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .join("\n")
    .trim();

  return text;
}

async function callGeminiWithFallback(
  messages: ChatMessage[],
  systemInstruction: string,
): Promise<GeminiCallResult> {
  const preferredModel = GEMINI_MODEL.trim();
  const fallbackModels = [
    preferredModel,
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
  ].filter(
    (value, index, arr) => value.length > 0 && arr.indexOf(value) === index,
  );

  const geminiContents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  let lastFailure: GeminiCallResult = {
    ok: false,
    errorText: "Gemini call failed.",
    status: 502,
  };

  for (const model of fallbackModels) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemInstruction }],
          },
          contents: geminiContents,
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 400,
          },
        }),
      },
    );

    if (response.ok) {
      return {
        ok: true,
        payload: await response.json(),
        model,
      };
    }

    const errorText = await response.text();
    lastFailure = {
      ok: false,
      errorText,
      status: response.status,
      model,
    };

    // Do not keep retrying models on auth/quota errors.
    if (
      response.status === 401 ||
      response.status === 403 ||
      response.status === 429
    ) {
      return lastFailure;
    }
  }

  return lastFailure;
}

function getFriendlyGeminiError(result: GeminiCallResult): string {
  const errorText = (result.errorText || "").toLowerCase();

  if (result.status === 401 || result.status === 403) {
    return "Chatbot configuration error: Gemini API key is invalid, restricted, or missing permission for Generative Language API.";
  }

  if (result.status === 429 || errorText.includes("quota")) {
    return "Chatbot is rate-limited or out of quota. Please try again in a while.";
  }

  if (
    result.status === 404 ||
    errorText.includes("not found") ||
    errorText.includes("model")
  ) {
    return "Chatbot model is unavailable in this region/project. Configure GEMINI_MODEL to a supported model and retry.";
  }

  return "Chatbot service is temporarily unavailable.";
}

function getRoleHome(role: UserRole): string {
  if (role === "student") return "/dashboard/bookings and /dashboard/book";
  if (role === "professor")
    return "/dashboard/approvals and /dashboard/bookings";
  return "/dashboard/venues, /dashboard/users, /dashboard/audit";
}

function buildLocalFallbackReply(message: string, role: UserRole): string {
  const text = message.toLowerCase();

  const bookingFlow =
    "Booking flow: pending_professor -> pending_admin -> approved. Rejections move to rejected.";

  if (
    text.includes("status") ||
    text.includes("pending") ||
    text.includes("approve")
  ) {
    if (role === "student") {
      return [
        "Quota mode: I am running with local guidance.",
        bookingFlow,
        "As a student, track this in /dashboard/bookings and create new requests in /dashboard/book.",
      ].join(" ");
    }

    if (role === "professor") {
      return [
        "Quota mode: I am running with local guidance.",
        "Professors review pending_professor requests in /dashboard/approvals.",
        "Approving there pushes the request to pending_admin; rejecting sets rejected.",
      ].join(" ");
    }

    return [
      "Quota mode: I am running with local guidance.",
      "Admins review pending_admin requests in /dashboard/approvals and finalize them to approved/rejected.",
      "Use /dashboard/audit for traceability.",
    ].join(" ");
  }

  if (
    text.includes("book") ||
    text.includes("venue") ||
    text.includes("schedule") ||
    text.includes("conflict")
  ) {
    return [
      "Quota mode: I am running with local guidance.",
      "For bookings, choose a venue in /dashboard/venues, then submit from /dashboard/book.",
      "If you see conflicts, adjust start/end times because overlapping active bookings are blocked.",
    ].join(" ");
  }

  if (
    text.includes("user") ||
    text.includes("audit") ||
    text.includes("manage")
  ) {
    if (role !== "admin") {
      return [
        "Quota mode: I am running with local guidance.",
        "User management and audit logs are admin-only features.",
        `Your main pages are ${getRoleHome(role)}.`,
      ].join(" ");
    }

    return [
      "Quota mode: I am running with local guidance.",
      "Use /dashboard/users for account control, /dashboard/venues for venue operations, and /dashboard/audit for activity logs.",
    ].join(" ");
  }

  return [
    "Quota mode: I am running with local guidance.",
    "I can still help with SpaceOptiX dashboard tasks: bookings, approvals, venues, users, and audit flow.",
    `For your role, start with ${getRoleHome(role)}.`,
  ].join(" ");
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "Chatbot is not configured. Missing GEMINI_API_KEY." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const messages = normalizeMessages(body?.messages);

    if (messages.length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const latestUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");
    if (!latestUserMessage) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    if (latestUserMessage.content.length > 2000) {
      return NextResponse.json(
        { error: "Message is too long. Keep it under 2000 characters." },
        { status: 400 },
      );
    }

    if (!isWebsiteScoped(messages)) {
      return NextResponse.json({
        reply:
          "I can only help with SpaceOptiX website tasks like bookings, approvals, venues, dashboard usage, and role-based actions. Ask me anything related to those.",
      });
    }

    const systemInstruction = buildSystemInstruction(user.role, user.name);
    const geminiResult = await callGeminiWithFallback(
      messages,
      systemInstruction,
    );

    if (!geminiResult.ok) {
      console.error("Gemini API error:", {
        status: geminiResult.status,
        model: geminiResult.model,
        error: geminiResult.errorText,
      });

      if (geminiResult.status === 429) {
        return NextResponse.json(
          {
            reply: buildLocalFallbackReply(
              latestUserMessage.content,
              user.role,
            ),
            meta: {
              provider: "local-fallback",
              reason: "gemini-429",
            },
          },
          { status: 200 },
        );
      }

      return NextResponse.json(
        { error: getFriendlyGeminiError(geminiResult) },
        { status: 502 },
      );
    }

    const payload = geminiResult.payload;
    const reply = extractGeminiText(payload);

    if (!reply) {
      return NextResponse.json(
        {
          reply:
            "I can help with SpaceOptiX tasks like booking venues, approvals, and dashboard flows. Please rephrase your question.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Chatbot error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
