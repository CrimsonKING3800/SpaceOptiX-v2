import { NextResponse } from "next/server";
import * as dashboardService from "@/lib/services/dashboard.service";

export async function getStats(user: dashboardService.DashboardUserContext) {
  const stats = await dashboardService.getStatsForUser(user);
  return NextResponse.json(stats);
}
