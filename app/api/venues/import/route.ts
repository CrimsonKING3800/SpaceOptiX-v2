import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getCurrentUser } from "@/lib/auth";
import * as auditService from "@/lib/services/audit.service";

const VALID_VENUE_TYPES = [
  "classroom",
  "lab",
  "auditorium",
  "conference_room",
  "sports_facility",
  "open_area",
];

interface ParsedVenue {
  name: string;
  type: string;
  building: string;
  floor: number;
  capacity: number;
  amenities: string[];
  description: string | null;
  availability_hours: { start: string; end: string };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function validateVenue(
  fields: string[],
  headers: string[],
  rowIndex: number,
): { venue?: ParsedVenue; error?: string } {
  const row: Record<string, string> = {};
  headers.forEach((h, i) => {
    row[h.toLowerCase().trim()] = fields[i]?.trim() || "";
  });

  const name = row["name"];
  const type = row["type"];
  const building = row["building"];
  const floorStr = row["floor"];
  const capacityStr = row["capacity"];
  const amenities = row["amenities"] || "";
  const description = row["description"] || "";

  if (!name) return { error: `Row ${rowIndex}: missing 'name'` };
  if (!type) return { error: `Row ${rowIndex}: missing 'type'` };
  if (!VALID_VENUE_TYPES.includes(type.toLowerCase())) {
    return {
      error: `Row ${rowIndex}: invalid type '${type}'. Must be one of: ${VALID_VENUE_TYPES.join(", ")}`,
    };
  }
  if (!building) return { error: `Row ${rowIndex}: missing 'building'` };

  const floor = parseInt(floorStr || "1");
  const capacity = parseInt(capacityStr || "0");

  if (isNaN(floor))
    return { error: `Row ${rowIndex}: invalid floor '${floorStr}'` };
  if (isNaN(capacity) || capacity <= 0)
    return { error: `Row ${rowIndex}: invalid capacity '${capacityStr}'` };

  return {
    venue: {
      name,
      type: type.toLowerCase(),
      building,
      floor,
      capacity,
      amenities: amenities
        .split(";")
        .map((a) => a.trim())
        .filter(Boolean),
      description: description || null,
      availability_hours: { start: "08:00", end: "22:00" },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 },
      );
    }

    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return NextResponse.json(
        { error: "CSV must have a header row and at least one data row" },
        { status: 400 },
      );
    }

    const headers = parseCSVLine(lines[0]);
    const requiredHeaders = ["name", "type", "building", "floor", "capacity"];
    const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

    const missingHeaders = requiredHeaders.filter(
      (h) => !lowerHeaders.includes(h),
    );
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingHeaders.join(", ")}. Required: name, type, building, floor, capacity`,
        },
        { status: 400 },
      );
    }

    const venues: ParsedVenue[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      const result = validateVenue(fields, lowerHeaders, i + 1);
      if (result.error) {
        errors.push(result.error);
      } else if (result.venue) {
        venues.push(result.venue);
      }
    }

    if (venues.length === 0) {
      return NextResponse.json(
        { error: "No valid venues found in CSV", errors },
        { status: 400 },
      );
    }

    const db = await getDb();
    const now = new Date().toISOString();

    const documents = venues.map((v) => ({
      ...v,
      is_active: true,
      created_at: now,
      updated_at: now,
    }));

    const result = await db.collection("venues").insertMany(documents);

    // Audit log for each venue
    const insertedIds = Object.values(result.insertedIds);
    for (const id of insertedIds) {
      await auditService.logAction({
        userId: user.userId,
        action: "venue_created",
        entityType: "venue",
        entityId: id.toString(),
        details: { method: "csv_import", batch_size: venues.length },
        timestamp: now,
      });
    }

    return NextResponse.json({
      imported: result.insertedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
