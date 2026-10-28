import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();

  // Expire both HTTP-only session cookies
  cookieStore.set("nv-session", "", {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  cookieStore.set("nv-session-temp", "", {
    httpOnly: true,
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });

  return NextResponse.json(
    {
      message: "Logged out successfully",
      success: true,
    },
    { status: 200 }
  );
}
