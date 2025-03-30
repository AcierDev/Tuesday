import {
  Address,
  Box,
  ShipmentDetails,
  ShippingRate,
} from "@/typings/interfaces";
import {
  ColumnTitles,
  ColumnTypes,
  Item,
  ItemSizes,
  ItemStatus,
} from "@/typings/types";

const SHIPSTATION_API_URL = "https://ssapi.shipstation.com";

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

  for (const item of order.items) {
    const newOrder: Item = {
      id: order.orderId.toString(),
      values: [
        {
          text: order.shipTo.name,
          columnName: ColumnTitles.Customer_Name,
          type: ColumnTypes.Text,
        },
        {
          text: new Date(order.shipByDate).getTime().toString(),
          columnName: ColumnTitles.Due,
          type: ColumnTypes.Date,
        },
        {
          columnName: ColumnTitles.Design,
          type: ColumnTypes.Dropdown,
          text: item.name.split("-")[1]?.trim(),
        },
        {
          columnName: ColumnTitles.Size,
          type: ColumnTypes.Dropdown,
          text: parseDimensions(item.options[0]!.value)!,
        },
      ],
      createdAt: new Date(order.createDate).getTime(),
      status: ItemStatus.New,
      vertical: false,
      visible: false,
      deleted: false,
      shippingDetails: order.shipTo,
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

  let width = 0;
  let length = 0;

  // Try matching dimensions in inches directly
  const inchMatch = inchPattern.exec(str);
  if (inchMatch) {
    width = parseInt(inchMatch[1]);
    length = parseInt(inchMatch[2]);
  } else {
    // Try matching a mix of inches and feet
    const footInchMatch = footInchPattern.exec(str);
    if (footInchMatch) {
      width = parseInt(footInchMatch[1]);
      length = parseInt(footInchMatch[2]) * 12; // Convert feet to inches
    } else {
      console.error("Unable to parse dimensions from:", str);
      return null; // Return null if parsing fails
    }
  }

  // Convert the inches to dimensions in blocks
  const size = convertInchesToSize(length, width);

  return size;
}

function convertInchesToSize(
  length: number,
  width: number
): ItemSizes | "Contact Ben" {
  switch (width) {
    case 18:
      switch (length) {
        case 36:
          return ItemSizes.Fourteen_By_Seven;
        case 48:
          return ItemSizes.Sixteen_By_Six;
      }
    case 30:
      switch (length) {
        case 48:
          return ItemSizes.Sixteen_By_Ten;
        case 60:
          return ItemSizes.Nineteen_By_Ten;
        case 72:
          return ItemSizes.TwentyTwo_By_Ten;
      }
    case 36:
      switch (length) {
        case 60:
          return ItemSizes.Nineteen_By_Eleven;
        case 72:
          return ItemSizes.TwentyTwo_By_Eleven;
        case 84:
          return ItemSizes.TwentySeven_By_Eleven;
      }
    case 48:
      switch (length) {
        case 84:
          return ItemSizes.TwentySeven_By_Fifteen;
        case 96:
          return ItemSizes.ThirtyOne_By_Fifteen;
        case 108:
          return ItemSizes.ThirtySix_By_Fifteen;
      }
    default:
      return "Contact Ben";
  }
}
