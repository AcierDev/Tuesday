import { Address, Box, ShipmentDetails, ShippingRate } from "@/typings/interfaces";

const SHIPSTATION_API_URL = 'https://ssapi.shipstation.com';

async function shipstationFetch(endpoint: string, method = 'GET', body?: any) {
  const response = await fetch(`${SHIPSTATION_API_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${process.env.NEXT_PUBLIC_SHIPSTATION_API_KEY}:${process.env.NEXT_PUBLIC_SHIPSTATION_API_SECRET}`)}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`ShipStation API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getShippingRates(packageDetails: Box, fromAddress: Address, toAddress: Address): Promise<ShippingRate[]> {
  const carriers = ['ups_walleted', 'fedex'];
  const ratesPromises = carriers.map(async carrier => {
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
        units: 'ounces'
      },
      dimensions: {
        units: 'inches',
        length: packageDetails.length,
        width: packageDetails.width,
        height: packageDetails.height
      }
    };

    const rates = await shipstationFetch('/shipments/getrates', 'POST', rateOptions);

    // Add carrierCode to each rate
    return rates.map((rate: any) => ({
      ...rate,
      carrierCode: carrier
    }));
  });

  const ratesResults = await Promise.all(ratesPromises);
  return ratesResults.flat();
}


export async function createShippingLabel(shipmentDetails: ShipmentDetails) {
  const labelOptions = {
    carrierCode: shipmentDetails.carrierCode,
    serviceCode: shipmentDetails.serviceCode,
    packageCode: 'package',
    confirmation: 'none',
    shipDate: new Date().toISOString(),
    weight: shipmentDetails.weight[0],
    dimensions: shipmentDetails.dimensions[0],
    shipFrom: shipmentDetails.fromAddress,
    shipTo: shipmentDetails.toAddress,
    testLabel: true // Set to false for production
  };

  console.log('label', labelOptions);

  try {
    const response = await shipstationFetch('/shipments/createlabel', 'POST', labelOptions);
    console.log('response', response)
    return response
  } catch (error) {
    console.log('FOO', error)
  }

  return 
}

export async function fetchShipmentStatus(trackingNumber: string): Promise<string> {
  try {
    console.log(trackingNumber);
    const response = await shipstationFetch(`/shipments?trackingNumber=${trackingNumber}`);
    console.log(response);
    if (response.shipments && response.shipments.length > 0) {
      return response.shipments[0].shipmentStatus;
    }
    return 'unknown';
  } catch (error) {
    console.error('Error fetching shipment status:', error);
    throw error;
  }
}