import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  // console.log("all cookies", (await cookies()).getAll());

  const userCookie = (await cookies()).get("user");
  if (userCookie) {
    return NextResponse.json({ user: userCookie.value });
  } else {
    return NextResponse.json({ user: null });
  }
}
