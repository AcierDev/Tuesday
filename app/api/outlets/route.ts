import { NextRequest } from "next/server";

const API_BASE_URL = "http://everwoodbackend.ddns.net:3004";

export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const endpoint = pathname.split("/api/outlets/")[1]; // Get the part after /api/outlets/

  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/outlet/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("Error in outlet proxy:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
