import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { createErrorResponse } from "@/lib/validators";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      createErrorResponse("UNAUTHORIZED", "Not signed in"),
      { status: 401 }
    );
  }

  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      specialization: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json(
      createErrorResponse("USER_NOT_FOUND", "User account not active"),
      { status: 401 }
    );
  }

  return NextResponse.json({ user });
}
