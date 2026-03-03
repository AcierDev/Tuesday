import { NextResponse } from "next/server";

// Mock function to fetch the backend URL from environment or config
function getBackendUrl() {
  // In a real application this might come from environment variables
  return process.env.ROUTER_BACKEND_URL || "http://localhost:3001";
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { position, angle, settings } = body;

    // Create the appropriate command based on the request
    let command;
    let servoAngle;

    switch (position) {
      case "analysis":
        servoAngle = settings?.slave?.servoAnalysisAngle || 30;
        command = { servoPosition: servoAngle };
        break;
      case "idle":
        servoAngle = settings?.slave?.servoIdleAngle || 80;
        command = { servoPosition: servoAngle };
        break;
      case "pass":
        servoAngle = settings?.slave?.servoPassAngle || 10;
        command = { servoPosition: servoAngle };
        break;
      case "eject":
        servoAngle = settings?.slave?.servoEjectAngle || 180;
        command = { servoPosition: servoAngle };
        break;
      case "custom":
        servoAngle = angle || 90;
        command = { servoPosition: servoAngle };
        break;
      default:
        return NextResponse.json(
          { error: "Invalid position specified" },
          { status: 400 }
        );
    }

    // Forward the command to the router backend
    const backendUrl = getBackendUrl();
    const response = await fetch(`${backendUrl}/servo-control`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });

    if (!response.ok) {
      throw new Error(`Backend returned error: ${response.statusText}`);
    }

    const result = await response.json();
    return NextResponse.json({
      success: true,
      message: `Servo moved to ${position} position (${servoAngle}°)`,
      details: result,
    });
  } catch (error) {
    console.error("Error handling manual servo request:", error);
    return NextResponse.json(
      { error: "Failed to control servo", details: (error as Error).message },
      { status: 500 }
    );
  }
}
