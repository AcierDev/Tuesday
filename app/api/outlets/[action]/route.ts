import { NextRequest } from "next/server";
import { getWarehouseIP } from "../../lib/warehouseStorage";

export async function POST(
  request: NextRequest,
  { params }: { params: { action: string } }
) {
  console.debug("=== Starting outlet proxy request ===");
  console.debug("Raw request URL:", request.url);
  console.debug("Action param:", params.action);

  try {
    console.debug("Fetching warehouse data...");
    const warehouseData = await getWarehouseIP();
    console.debug("Warehouse data retrieved:", warehouseData);

    if (!warehouseData) {
      console.warn(
        "Warehouse connection not established - no warehouse data found"
      );
      return Response.json(
        { error: "Warehouse connection not established" },
        { status: 503 }
      );
    }

    // Add proper endpoint handling
    let warehouseEndpoint: string;
    switch (params.action) {
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
        console.warn("Invalid endpoint requested:", params.action);
        return Response.json({ error: "Invalid endpoint" }, { status: 400 });
    }

    console.debug("Parsing request body...");
    const body = await request.json();
    console.debug("Parsed request body:", body);

    const warehouseUrl = `${process.env.WAREHOUSE_PROTOCOL || "http"}://${
      warehouseData.ip
    }:${process.env.WAREHOUSE_OUTLET_PORT || "3004"}`;

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
