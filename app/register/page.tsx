"use client"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Building2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import type { UserRole } from "@/lib/types"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "" as UserRole | "",
    department: "",
    phone: "",
    student_id: "",
    faculty_id: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.role) {
      toast.error("Please select a role")
      return
    }
    if (!form.email.toLowerCase().endsWith(".iitkgp.ac.in")) {
      toast.error("Only IIT Kharagpur emails (@*.iitkgp.ac.in) are allowed")
      return
    }
    setLoading(true)
    const result = await register({
      ...form,
      role: form.role as UserRole,
    })
    setLoading(false)
    if (result.success) {
      toast.success("Account created successfully!")
      router.push("/dashboard")
    } else {
      toast.error(result.error || "Registration failed")
    }
  }

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-4 inline-flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-2xl font-bold text-foreground">SpaceOptiX</span>
          </Link>
        </div>

        <Card className="border-border">
          <CardHeader className="text-center">
            <CardTitle className="font-heading text-2xl">Create Your Account</CardTitle>
            <CardDescription>Join SpaceOptiX to start booking campus venues</CardDescription>
          </CardHeader>
          <CardContent>
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v) => updateForm("role", v)}>
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
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {"Already have an account? "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
