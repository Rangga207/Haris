import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comparePassword, signJWT, setAuthCookie } from "@/lib/auth";
import { loginSchema, createErrorResponse } from "@/lib/validators";
import { STRINGS } from "@/lib/constants/strings";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        createErrorResponse("VALIDATION_ERROR", "Invalid input", parseResult.error.format()),
        { status: 400 }
      );
    }

    const { email, password } = parseResult.data;

    // Search user
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json(
        createErrorResponse("INVALID_CREDENTIALS", STRINGS.auth.invalidCredentials),
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        createErrorResponse("ACCOUNT_DEACTIVATED", STRINGS.auth.deactivatedAccount),
        { status: 403 }
      );
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        createErrorResponse("INVALID_CREDENTIALS", STRINGS.auth.invalidCredentials),
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await signJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      specialization: user.specialization,
    });

    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        specialization: user.specialization,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      createErrorResponse("INTERNAL_ERROR", "An unexpected error occurred during login."),
      { status: 500 }
    );
  }
}
