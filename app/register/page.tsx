"use client";

import React from "react";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Building2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import type { UserRole } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [step, setStep] = useState<"register" | "verify">("register");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resendCooldown, setResendCooldown] = useState(60);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "" as UserRole | "",
    department: "",
    phone: "",
    student_id: "",
    faculty_id: "",
  });

  useEffect(() => {
    if (step !== "verify" || resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) {
      toast.error("Please select a role");
      return;
    }
    if (!form.email.toLowerCase().endsWith(".iitkgp.ac.in")) {
      toast.error("Only IIT Kharagpur emails (@*.iitkgp.ac.in) are allowed");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          role: form.role as UserRole,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Registration failed");
        return;
      }

      setPendingEmail(result.email || form.email.toLowerCase());
      setOtp("");
      setResendCooldown(result.resendAfterSeconds || 60);
      setStep("verify");
      toast.success(
        "OTP sent to your email. Please verify to activate your account.",
      );
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail, otp }),
      });

      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "OTP verification failed");
        return;
      }

      toast.success("Email verified. Account created successfully!");
      const currentUser = await refreshUser();
      if (currentUser) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || !pendingEmail) return;

    setLoading(true);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingEmail }),
      });

      const result = await response.json();
      if (!response.ok) {
        if (response.status === 429 && typeof result.retryAfter === "number") {
          setResendCooldown(result.retryAfter);
        }
        toast.error(result.error || "Failed to resend OTP");
        return;
      }

      setResendCooldown(result.resendAfterSeconds || 60);
      toast.success("A new OTP has been sent");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-2xl font-bold text-foreground">
              SpaceOptiX
            </span>
          </Link>
        </div>

        <Card className="border-border">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl">
              {step === "register"
                ? "Create Your Account"
                : "Verify Your Email"}
            </CardTitle>
            <CardDescription>
              {step === "register"
                ? "Join SpaceOptiX to start booking campus venues"
                : `Enter the OTP sent to ${pendingEmail}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === "register" ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email Address</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@kgpian.iitkgp.ac.in"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters"
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) => updateForm("role", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="professor">Professor</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    placeholder="e.g. Computer Science"
                    value={form.department}
                    onChange={(e) => updateForm("department", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                  />
                </div>
                {form.role === "student" && (
                  <div className="space-y-2">
                    <Label htmlFor="student_id">Student ID</Label>
                    <Input
                      id="student_id"
                      placeholder="e.g. STU2024001"
                      value={form.student_id}
                      onChange={(e) => updateForm("student_id", e.target.value)}
                    />
                  </div>
                )}
                {form.role === "professor" && (
                  <div className="space-y-2">
                    <Label htmlFor="faculty_id">Faculty ID</Label>
                    <Input
                      id="faculty_id"
                      placeholder="e.g. FAC2024001"
                      value={form.faculty_id}
                      onChange={(e) => updateForm("faculty_id", e.target.value)}
                    />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label>Enter 6-digit OTP</Label>
                  <div className="flex justify-center py-2">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      pattern="^[0-9]+$"
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify OTP"}
                </Button>
                <div className="text-center text-sm text-muted-foreground">
                  {resendCooldown > 0 ? (
                    <p>Resend OTP in {resendCooldown}s</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="font-medium text-primary hover:underline"
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
                <div className="text-center text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setStep("register");
                      setOtp("");
                    }}
                    disabled={loading}
                  >
                    Edit registration details
                  </button>
                </div>
              </form>
            )}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {"Already have an account? "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
