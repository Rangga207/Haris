import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const rooms = await db.room.findMany({
    where: { buildingId: params.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      floor: true,
      buildingId: true,
    },
  });

  return NextResponse.json({ rooms });
}
