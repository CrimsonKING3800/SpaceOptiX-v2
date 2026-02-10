import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { cookies } from "next/headers"
import type { User, UserRole } from "./types"

const JWT_SECRET = process.env.JWT_SECRET || "spaceoptix-secret-key"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(password, hashed)
}

export function generateToken(user: Omit<User, "password">): string {
  return jwt.sign(
    { userId: user._id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  )
}

export function verifyToken(token: string): { userId: string; email: string; role: UserRole; name: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; email: string; role: UserRole; name: string }
  } catch {
    return null
  }
}

export async function getCurrentUser(): Promise<{ userId: string; email: string; role: UserRole; name: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get("auth-token")?.value
  if (!token) return null
  return verifyToken(token)
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  })
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("auth-token")
}
