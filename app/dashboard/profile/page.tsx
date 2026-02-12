"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { DashboardHeader } from "@/components/dashboard-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
  const { user, loading } = useAuth()

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    department: "",
    student_id: "",     // if student
    faculty_id: "",     // if faculty
  })

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Load user data when available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        department: user.department || "",
        student_id: user.student_id || "",
        faculty_id: user.faculty_id || "",
      })
    }
  }, [user])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!user) return

    setIsSaving(true)

    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          department: formData.department,
          // Add student_id / faculty_id only if relevant to role
          ...(user.role === "student" && { student_id: formData.student_id }),
          ...(user.role === "professor" && { faculty_id: formData.faculty_id }),
        }),
      })

      if (res.ok) {
        toast.success("Profile updated successfully")
        setIsEditing(false)
        // Optional: refresh user data in auth context
        // You can call a refreshUser() function if you add it to useAuth
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to update profile")
      }
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <div>Please log in to view your profile</div>
  }

  return (
    <div>
      <DashboardHeader
        title="Profile"
        description="Manage your personal information"
      />

      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your details here. Email cannot be changed.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Email - read only */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email} disabled />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                disabled={!isEditing}
              />
            </div>

            {/* Conditional ID fields */}
            {user.role === "student" && (
              <div className="space-y-2">
                <Label htmlFor="student_id">Student ID</Label>
                <Input
                  id="student_id"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
            )}

            {user.role === "professor" && (
              <div className="space-y-2">
                <Label htmlFor="faculty_id">Faculty ID</Label>
                <Input
                  id="faculty_id"
                  name="faculty_id"
                  value={formData.faculty_id}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-end gap-3">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    // Reset form to original values
                    setFormData({
                      name: user.name || "",
                      phone: user.phone || "",
                      department: user.department || "",
                      student_id: user.student_id || "",
                      faculty_id: user.faculty_id || "",
                    })
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}