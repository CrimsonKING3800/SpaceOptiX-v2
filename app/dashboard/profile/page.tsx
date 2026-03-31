"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { useAuth } from "@/lib/auth-context";
import { DashboardHeader } from "@/components/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  IdCard,
  Save,
  X,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProfilePage() {
  const { user: authUser } = useAuth();
  const { data, isLoading } = useSWR("/api/auth/profile", fetcher);
  const profile = data?.user;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    department: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        phone: profile.phone || "",
        department: profile.department || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success("Profile updated successfully");
        mutate("/api/auth/profile");
        setEditing(false);
      } else {
        toast.error("Failed to update profile");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        name: profile.name || "",
        phone: profile.phone || "",
        department: profile.department || "",
      });
    }
    setEditing(false);
  };

  const initials = profile?.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel =
    profile?.role === "admin"
      ? "Administrator"
      : profile?.role === "professor"
        ? "Professor"
        : "Student";

  return (
    <div>
      <DashboardHeader title="My Profile" description="View and manage your account details" />
      <div className="mx-auto max-w-2xl p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header Card */}
            <Card>
              <CardContent className="flex items-center gap-5 p-6">
                <Avatar className="h-20 w-20 border-2 border-border">
                  <AvatarFallback className="bg-primary text-lg text-primary-foreground">
                    {initials || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="font-heading text-2xl font-bold text-foreground">
                    {profile.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {roleLabel}
                    </Badge>
                    <Badge variant={profile.is_active ? "default" : "destructive"}>
                      {profile.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
                {!editing && (
                  <Button variant="outline" className="gap-2" onClick={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">Account Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Name */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <UserIcon className="h-4 w-4" /> Full Name
                  </Label>
                  {editing ? (
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">{profile.name}</p>
                  )}
                </div>

                <Separator />

                {/* Email (non-editable) */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /> Email
                  </Label>
                  <p className="text-sm font-medium text-foreground">{profile.email}</p>
                </div>

                <Separator />

                {/* Department */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" /> Department
                  </Label>
                  {editing ? (
                    <Input
                      value={form.department}
                      onChange={(e) => setForm({ ...form, department: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {profile.department || "Not set"}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Phone */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" /> Phone
                  </Label>
                  {editing ? (
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm font-medium text-foreground">
                      {profile.phone || "Not set"}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Student/Faculty ID (non-editable) */}
                {(profile.student_id || profile.faculty_id) && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-muted-foreground">
                      <IdCard className="h-4 w-4" />{" "}
                      {profile.student_id ? "Student ID" : "Faculty ID"}
                    </Label>
                    <p className="text-sm font-medium text-foreground">
                      {profile.student_id || profile.faculty_id}
                    </p>
                  </div>
                )}

                {/* Member Since */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Member Since</Label>
                  <p className="text-sm font-medium text-foreground">
                    {new Date(profile.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {/* Action Buttons */}
                {editing && (
                  <div className="flex gap-3 pt-2">
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      <Save className="h-4 w-4" />
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="outline" onClick={handleCancel} className="gap-2">
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <UserIcon className="mb-3 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium text-foreground">Profile not found</p>
          </div>
        )}
      </div>
    </div>
  );
}
