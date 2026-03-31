import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();
    let objectId: ObjectId;
    try {
      objectId = new ObjectId(user.userId);
    } catch {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const profile = await db
      .collection("users")
      .findOne({ _id: objectId }, { projection: { password: 0 } });

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: { ...profile, _id: profile._id.toString() },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const db = await getDb();
    const now = new Date().toISOString();

    let objectId: ObjectId;
    try {
      objectId = new ObjectId(user.userId);
    } catch {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    // Only allow updating specific fields
    const allowedFields = ["name", "phone", "department"];
    const updateData: Record<string, unknown> = { updated_at: now };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    await db
      .collection("users")
      .updateOne({ _id: objectId }, { $set: updateData });

    // Fetch updated profile
    const updatedProfile = await db
      .collection("users")
      .findOne({ _id: objectId }, { projection: { password: 0 } });

    return NextResponse.json({
      user: updatedProfile
        ? { ...updatedProfile, _id: updatedProfile._id.toString() }
        : null,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
