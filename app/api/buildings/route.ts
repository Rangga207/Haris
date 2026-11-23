import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const buildings = await db.building.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });

  return NextResponse.json({ buildings });
}
