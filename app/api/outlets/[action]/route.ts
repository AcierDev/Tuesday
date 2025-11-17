import { NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  console.debug("=== Starting outlet proxy request ===");
  console.debug("Raw request URL:", request.url);

  const { action } = await params;
  console.debug("Action param:", action);

  try {
    const warehouseIP = process.env.WAREHOUSE_IP;

    if (!warehouseIP) {
      console.warn("Warehouse IP not configured");
      return Response.json(
        { error: "Warehouse IP not configured" },
        { status: 503 }
      );
    }

    // Add proper endpoint handling
    let warehouseEndpoint: string;
    switch (action) {
      case "on":
        warehouseEndpoint = "on";
        break;
      case "off":
        warehouseEndpoint = "off";
        break;
      case "status":
        warehouseEndpoint = "status";
        break;
      default:
        console.warn("Invalid endpoint requested:", action);
        return Response.json({ error: "Invalid endpoint" }, { status: 400 });
    }

    console.debug("Parsing request body...");
    const body = await request.json();
    console.debug("Parsed request body:", body);

    const warehouseUrl = `${
      process.env.WAREHOUSE_PROTOCOL || "http"
    }://${warehouseIP}:${process.env.WAREHOUSE_OUTLET_PORT || "3004"}`;

    console.debug(
      "Full warehouse endpoint:",
      `${warehouseUrl}/outlet/${warehouseEndpoint}`
    );

    const response = await fetch(
      `${warehouseUrl}/outlet/${warehouseEndpoint}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        credentials: "include",
      }
    );

    const data = await response.json();
    console.debug("Warehouse response status:", response.status);
    console.debug("=== Completed outlet proxy request ===");
    return Response.json(data);
  } catch (error) {
    console.error("=== Error in outlet proxy ===");
    console.error("Error details:", error);
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
