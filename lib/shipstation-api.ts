import {
  Address,
  Box,
  ShipmentDetails,
  ShippingRate,
} from "@/typings/interfaces";
import {
  Item,
  ItemSizes,
  ItemStatus,
} from "@/typings/types";

const SHIPSTATION_API_URL = "https://ssapi.shipstation.com";
const INCHES_PER_FOOT = 12;
const LEGACY_ITEM_SIZES = {
  Nineteen_By_Ten: "19 x 10",
  TwentyTwo_By_Ten: "22 x 10",
  Nineteen_By_Eleven: "19 x 11",
  TwentyTwo_By_Eleven: "22 x 11",
  TwentySeven_By_Eleven: "27 x 11",
  TwentySeven_By_Fifteen: "27 x 15",
  ThirtyOne_By_Fifteen: "31 x 15",
  ThirtySix_By_Fifteen: "36 x 15",
} as const;
const ITEM_SIZE_BY_DIMENSIONS: Readonly<
  Record<number, Readonly<Record<number, ItemSizes | string>>>
> = {
  18: { 36: ItemSizes.Fourteen_By_Seven, 48: ItemSizes.Sixteen_By_Six },
  30: {
    48: ItemSizes.Sixteen_By_Ten,
    60: LEGACY_ITEM_SIZES.Nineteen_By_Ten,
    72: LEGACY_ITEM_SIZES.TwentyTwo_By_Ten,
  },
  36: {
    60: LEGACY_ITEM_SIZES.Nineteen_By_Eleven,
    72: LEGACY_ITEM_SIZES.TwentyTwo_By_Eleven,
    84: LEGACY_ITEM_SIZES.TwentySeven_By_Eleven,
  },
  48: {
    84: LEGACY_ITEM_SIZES.TwentySeven_By_Fifteen,
    96: LEGACY_ITEM_SIZES.ThirtyOne_By_Fifteen,
    108: LEGACY_ITEM_SIZES.ThirtySix_By_Fifteen,
  },
};

async function shipstationFetch(endpoint: string, method = "GET", body?: any) {
  console.log(`${SHIPSTATION_API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(
        `${process.env.NEXT_PUBLIC_SHIPSTATION_API_KEY}:${process.env.NEXT_PUBLIC_SHIPSTATION_API_SECRET}`
      )}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const response = await fetch(`${SHIPSTATION_API_URL}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${btoa(
        `${process.env.NEXT_PUBLIC_SHIPSTATION_API_KEY}:${process.env.NEXT_PUBLIC_SHIPSTATION_API_SECRET}`
      )}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`ShipStation API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getOrder(orderId: string): Promise<ShipStationOrder> {
  const order: ShipStationOrder = await shipstationFetch(
    `/orders/${orderId}`,
    "GET"
  );

  console.log(order.orderId);
  console.log(order.items);
  console.log(order.customerUsername);
  console.log(order.shipByDate);
  console.log(order.shipTo);

  for (const [index, item] of order.items.entries()) {
    const newOrder: Item = {
      id: order.orderId.toString(),
      customerName: order.shipTo.name,
      dueDate: new Date(order.shipByDate).getTime().toString(),
      design: item.name.split("-")[1]?.trim(),
      size: parseDimensions(item.options[0]!.value)!,
      createdAt: new Date(order.createDate).getTime(),
      status: ItemStatus.New,
      tags: { isVertical: false },
      visible: false,
      deleted: false,
      index,
      shippingDetails: { addressVerified: "unknown", ...order.shipTo },
    };

    console.log(newOrder);
  }

  //14446094
  return order;
}

export async function getShippingRates(
  packageDetails: Box,
  fromAddress: Address,
  toAddress: Address
): Promise<ShippingRate[]> {
  const carriers = ["ups_walleted", "fedex"];
  const ratesPromises = carriers.map(async (carrier) => {
    const rateOptions = {
      carrierCode: carrier,
      serviceCode: null,
      packageCode: null,
      fromPostalCode: fromAddress.postalCode,
      toState: toAddress.state,
      toCountry: toAddress.country,
      toPostalCode: toAddress.postalCode,
      toCity: toAddress.city,
      weight: {
        value: packageDetails.weight,
        units: "ounces",
      },
      dimensions: {
        units: "inches",
        length: packageDetails.length,
        width: packageDetails.width,
        height: packageDetails.height,
      },
    };

    const rates = await shipstationFetch(
      "/shipments/getrates",
      "POST",
      rateOptions
    );

    // Add carrierCode to each rate
    return rates.map((rate: any) => ({
      ...rate,
      carrierCode: carrier,
    }));
  });

  const ratesResults = await Promise.all(ratesPromises);
  return ratesResults.flat();
}

export async function createShippingLabel(shipmentDetails: ShipmentDetails) {
  const labelOptions = {
    carrierCode: shipmentDetails.carrierCode,
    serviceCode: shipmentDetails.serviceCode,
    packageCode: "package",
    confirmation: "none",
    shipDate: new Date().toISOString(),
    weight: shipmentDetails.weight[0],
    dimensions: shipmentDetails.dimensions[0],
    shipFrom: shipmentDetails.fromAddress,
    shipTo: shipmentDetails.toAddress,
    testLabel: true, // Set to false for production
  };

  console.log("label", labelOptions);

  try {
    const response = await shipstationFetch(
      "/shipments/createlabel",
      "POST",
      labelOptions
    );
    console.log("response", response);
    return response;
  } catch (error) {
    console.log(error);
  }

  return;
}

export async function fetchShipmentStatus(
  trackingNumber: string
): Promise<string> {
  try {
    console.log(trackingNumber);
    const response = await shipstationFetch(
      `/shipments?trackingNumber=${trackingNumber}`
    );
    console.log(response);
    if (response.shipments && response.shipments.length > 0) {
      return response.shipments[0].shipmentStatus;
    }
    return "unknown";
  } catch (error) {
    console.error("Error fetching shipment status:", error);
    throw error;
  }
}

function parseDimensions(str: string) {
  // Replace &quot; with a standard double quote
  str = str.replace(/&quot;/g, '"');

  // Patterns to match dimensions
  const inchPattern = /(\d+)"\s*x\s*(\d+)"/i; // Inches, e.g., 18"x12"
  const footInchPattern = /(\d+)"\s*x\s*(\d+)\s*feet/i; // Mix of inches and feet, e.g., 18"x4feet

  let width: number;
  let length: number;

  // Try matching dimensions in inches directly
  const inchMatch = inchPattern.exec(str);
  if (inchMatch) {
    width = Number(inchMatch[1]);
    length = Number(inchMatch[2]);
  } else {
    // Try matching a mix of inches and feet
    const footInchMatch = footInchPattern.exec(str);
    if (footInchMatch) {
      width = Number(footInchMatch[1]);
      length = Number(footInchMatch[2]) * INCHES_PER_FOOT;
    } else {
      console.error("Unable to parse dimensions from:", str);
      return null; // Return null if parsing fails
    }
  }

  // Convert the inches to dimensions in squares
  const size = convertInchesToSize(length, width);

  return size;
}

function convertInchesToSize(length: number, width: number) {
  return ITEM_SIZE_BY_DIMENSIONS[width]?.[length] ?? "Contact Ben";
}
