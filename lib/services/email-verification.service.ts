import FormData from "form-data";
import Mailgun from "mailgun.js";
import { getDb } from "@/lib/mongodb";
import { hashPassword, verifyPassword } from "@/lib/auth";
import type { UserRole } from "@/lib/types";

const PENDING_COLLECTION = "pending_user_verifications";
const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = parseInt(
  process.env.OTP_EXPIRY_SECONDS || "600",
  10,
);
const OTP_RESEND_BLOCK_SECONDS = parseInt(
  process.env.OTP_RESEND_BLOCK_SECONDS || "60",
  10,
);

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || "";
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "";
const MAILGUN_BASE_URL =
  process.env.MAILGUN_BASE_URL || "https://api.mailgun.net";
const MAIL_FROM =
  process.env.MAIL_FROM || "SpaceOptiX <no-reply@spaceoptix.local>";

export interface PendingRegistrationInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  phone?: string;
  student_id?: string;
  faculty_id?: string;
}

interface PendingVerificationDoc extends Omit<
  PendingRegistrationInput,
  "phone" | "student_id" | "faculty_id"
> {
  phone?: string | null;
  student_id?: string | null;
  faculty_id?: string | null;
  otp_hash: string;
  otp_expires_at: Date;
  last_otp_sent_at: Date;
  updated_at: string;
}

function generateOtp(): string {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function getExpiryDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + OTP_EXPIRY_SECONDS * 1000);
}

async function getMailgunClient() {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    throw new Error(
      "Mailgun is not configured. Please set MAILGUN_API_KEY and MAILGUN_DOMAIN.",
    );
  }

  const mailgun = new Mailgun(FormData);
  return mailgun.client({
    username: "api",
    key: MAILGUN_API_KEY,
    url: MAILGUN_BASE_URL,
  });
}

async function sendOtpEmail(toEmail: string, name: string, otp: string) {
  const mg = await getMailgunClient();
  await mg.messages.create(MAILGUN_DOMAIN, {
    from: MAIL_FROM,
    to: [toEmail],
    subject: "SpaceOptiX Email Verification OTP",
    text: `Hi ${name},\n\nYour SpaceOptiX OTP is ${otp}. It will expire in ${Math.floor(
      OTP_EXPIRY_SECONDS / 60,
    )} minutes.\n\nIf you did not request this, please ignore this email.`,
  });
}

export async function ensurePendingVerificationIndexes() {
  const db = await getDb();
  const collection = db.collection(PENDING_COLLECTION);

  await collection.createIndex({ email: 1 }, { unique: true });
  await collection.createIndex(
    { otp_expires_at: 1 },
    { expireAfterSeconds: 0, name: "otp_expiry_ttl" },
  );
}

export async function createPendingVerification(
  input: PendingRegistrationInput,
) {
  const db = await getDb();
  await ensurePendingVerificationIndexes();

  const email = input.email.toLowerCase().trim();
  const now = new Date();
  const nowIso = now.toISOString();

  const existingUser = await db.collection("users").findOne({ email });
  if (existingUser) {
    throw new Error("EMAIL_ALREADY_REGISTERED");
  }

  const otp = generateOtp();
  const otpHash = await hashPassword(otp);
  const passwordHash = await hashPassword(input.password);

  const updateDoc: PendingVerificationDoc = {
    name: input.name,
    email,
    password: passwordHash,
    role: input.role,
    department: input.department,
    phone: input.phone || null,
    student_id: input.student_id || null,
    faculty_id: input.faculty_id || null,
    otp_hash: otpHash,
    otp_expires_at: getExpiryDate(now),
    last_otp_sent_at: now,
    updated_at: nowIso,
  };

  await db.collection(PENDING_COLLECTION).updateOne(
    { email },
    {
      $set: updateDoc,
      $setOnInsert: { created_at: nowIso },
    },
    { upsert: true },
  );

  await sendOtpEmail(email, input.name, otp);

  return {
    email,
    expiresInSeconds: OTP_EXPIRY_SECONDS,
    resendAfterSeconds: OTP_RESEND_BLOCK_SECONDS,
  };
}

export async function resendOtp(emailRaw: string) {
  const db = await getDb();
  await ensurePendingVerificationIndexes();

  const email = emailRaw.toLowerCase().trim();
  const pending = await db.collection(PENDING_COLLECTION).findOne({ email });

  if (!pending) {
    throw new Error("PENDING_NOT_FOUND");
  }

  const now = new Date();
  const expiresAt = new Date(pending.otp_expires_at as Date);
  if (expiresAt.getTime() <= now.getTime()) {
    await db.collection(PENDING_COLLECTION).deleteOne({ email });
    throw new Error("OTP_EXPIRED");
  }

  const lastSentAt = new Date(pending.last_otp_sent_at as Date);
  const diffSec = Math.floor((now.getTime() - lastSentAt.getTime()) / 1000);
  if (diffSec < OTP_RESEND_BLOCK_SECONDS) {
    throw new Error(`RESEND_BLOCKED:${OTP_RESEND_BLOCK_SECONDS - diffSec}`);
  }

  const otp = generateOtp();
  const otpHash = await hashPassword(otp);
  const nowIso = now.toISOString();

  await db.collection(PENDING_COLLECTION).updateOne(
    { email },
    {
      $set: {
        otp_hash: otpHash,
        otp_expires_at: getExpiryDate(now),
        last_otp_sent_at: now,
        updated_at: nowIso,
      },
    },
  );

  await sendOtpEmail(email, String(pending.name || "there"), otp);

  return {
    email,
    expiresInSeconds: OTP_EXPIRY_SECONDS,
    resendAfterSeconds: OTP_RESEND_BLOCK_SECONDS,
  };
}

export async function verifyOtpAndActivate(emailRaw: string, otpRaw: string) {
  const db = await getDb();
  await ensurePendingVerificationIndexes();

  const email = emailRaw.toLowerCase().trim();
  const otp = otpRaw.trim();
  const pending = await db.collection(PENDING_COLLECTION).findOne({ email });

  if (!pending) {
    throw new Error("PENDING_NOT_FOUND");
  }

  const now = new Date();
  const expiresAt = new Date(pending.otp_expires_at as Date);
  if (expiresAt.getTime() <= now.getTime()) {
    await db.collection(PENDING_COLLECTION).deleteOne({ email });
    throw new Error("OTP_EXPIRED");
  }

  const otpHash = String(pending.otp_hash || "");
  const valid = await verifyPassword(otp, otpHash);
  if (!valid) {
    throw new Error("OTP_INVALID");
  }

  const alreadyExists = await db.collection("users").findOne({ email });
  if (alreadyExists) {
    await db.collection(PENDING_COLLECTION).deleteOne({ email });
    throw new Error("EMAIL_ALREADY_REGISTERED");
  }

  const nowIso = now.toISOString();
  const result = await db.collection("users").insertOne({
    name: pending.name,
    email,
    password: pending.password,
    role: pending.role,
    department: pending.department,
    phone: pending.phone || null,
    student_id: pending.student_id || null,
    faculty_id: pending.faculty_id || null,
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  });

  await db.collection(PENDING_COLLECTION).deleteOne({ email });

  return {
    _id: result.insertedId.toString(),
    name: String(pending.name),
    email,
    role: pending.role as UserRole,
    department: String(pending.department),
    is_active: true,
    created_at: nowIso,
    updated_at: nowIso,
  };
}
