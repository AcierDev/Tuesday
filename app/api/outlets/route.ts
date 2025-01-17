import { NextRequest } from "next/server";
import { getWarehouseIP } from "../lib/warehouseStorage";

export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const endpoint = pathname.split("/api/outlets/")[1]; // Get the part after /api/outlets/
  console.debug("Received request for endpoint:", endpoint);

  try {
    const warehouseData = await getWarehouseIP();
    console.debug("Warehouse data retrieved:", warehouseData);

    if (!warehouseData) {
      console.warn("Warehouse connection not established");
      return Response.json(
        { error: "Warehouse connection not established" },
        { status: 503 }
      );
    }

    const body = await request.json();
    console.debug("Request body:", body);

    const warehouseUrl = `${process.env.WAREHOUSE_PROTOCOL || "http"}://${
      warehouseData.ip
    }:${process.env.WAREHOUSE_OUTLET_PORT || "3004"}`;
    console.debug("Constructed warehouse URL:", warehouseUrl);

    const response = await fetch(`${warehouseUrl}/outlet/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      credentials: "include",
    });

    const data = await response.json();
    console.debug("Response from warehouse:", data);
    return Response.json(data);
  } catch (error) {
    console.error("Error in outlet proxy:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
