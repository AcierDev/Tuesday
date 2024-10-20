// app/api/ups-tracking/route.ts

import { NextResponse } from 'next/server';
import axios from 'axios';
import { Activity } from '@/typings/interfaces';

interface UPSTrackingResponse {
  trackingNumber: string;
  status: string;
  estimatedDelivery: string;
  weight?: string;
  dimensions?: string;
  serviceDescription?: string;
  referenceNumbers?: string[];
  activity?: Activity[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const trackingNumber = searchParams.get('trackingNumber');

  if (!trackingNumber) {
    return NextResponse.json({ error: 'Invalid tracking number' }, { status: 400 });
  }

  // Fetch credentials from environment variables
  const UPS_OAUTH_URL = 'https://wwwcie.ups.com/security/v1/oauth/token';
  const UPS_API_URL = `https://wwwcie.ups.com/api/track/v1/details/${trackingNumber}`;
  const UPS_USERNAME = process.env.NEXT_PUBLIC_UPS_USERNAME;
  const UPS_PASSWORD = process.env.NEXT_PUBLIC_UPS_PASSWORD;
  const UPS_MERCHANT_ID = process.env.NEXT_PUBLIC_UPS_MERCHANT_ID;

  // Validate that all required environment variables are present
  if (!UPS_USERNAME || !UPS_PASSWORD || !UPS_MERCHANT_ID) {
    console.error('Missing UPS credentials in environment variables.');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    // Step 1: Obtain OAuth token
    const tokenResponse = await axios.post(
      UPS_OAUTH_URL,
      new URLSearchParams({
        grant_type: 'client_credentials',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-merchant-id': UPS_MERCHANT_ID,
          'Authorization': 'Basic ' + Buffer.from(`${UPS_USERNAME}:${UPS_PASSWORD}`).toString('base64'),
        },
      }
    );

    if (!tokenResponse.data.access_token) {
      console.error('Failed to obtain UPS OAuth token:', tokenResponse.data);
      throw new Error('Failed to obtain UPS OAuth token');
    }

    const accessToken = tokenResponse.data.access_token;

    // Step 2: Use the token to fetch tracking data
    const query = new URLSearchParams({
      locale: 'en_US',
      returnSignature: 'false',
      returnMilestones: 'false',
      returnPOD: 'false',
    }).toString();

    const trackingResponse = await axios.get(`${UPS_API_URL}?${query}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'transId': 'string',
        'transactionSrc': 'testing',
        'Content-Type': 'application/json',
      },
    });

    // Validate the structure of the tracking response
    const shipment = trackingResponse.data?.trackResponse?.shipment?.[0];
    if (!shipment) {
      console.error('Shipment data not found in UPS response:', trackingResponse.data);
      throw new Error('Shipment data not found');
    }

    const packageInfo = shipment.package?.[0];
    if (!packageInfo) {
      console.error('Package information not found in shipment data:', shipment);
      throw new Error('Package information not found');
    }

    const activity = packageInfo.activity?.map((act: any) => ({
      date: act.date,
      time: act.time,
      description: act.status.description,
      location: act.location.address?.city || 'Unknown Location',
    })) || [];

    const deliveryDate = shipment.deliveryDate?.date || 'N/A';
    const weight = packageInfo.weight
      ? `${packageInfo.weight.weight} ${packageInfo.weight.unitOfMeasurement}`
      : undefined;
    const dimensions = packageInfo.dimension
      ? `${packageInfo.dimension.length}x${packageInfo.dimension.width}x${packageInfo.dimension.height} ${packageInfo.dimension.unitOfDimension}`
      : undefined;
    const serviceDescription = packageInfo.service?.description;
    const referenceNumbers = packageInfo.referenceNumber?.map((ref: any) => ref.number) || [];

    const response: UPSTrackingResponse = {
      trackingNumber,
      status: shipment.currentStatus.description,
      estimatedDelivery: deliveryDate,
      weight,
      dimensions,
      serviceDescription,
      referenceNumbers,
      activity,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made, and the server responded with a status code outside 2xx
        console.error('UPS API Error Response:', {
          status: error.response.status,
          data: error.response.data,
        });
        return NextResponse.json(
          { error: 'UPS API error', details: error.response.data },
          { status: error.response.status }
        );
      } else if (error.request) {
        // The request was made, but no response was received
        console.error('No response received from UPS API:', error.request);
        return NextResponse.json(
          { error: 'No response from UPS API' },
          { status: 502 } // Bad Gateway
        );
      } else {
        // Something happened in setting up the request
        console.error('Error setting up UPS API request:', error.message);
        return NextResponse.json(
          { error: 'Error setting up UPS API request' },
          { status: 500 }
        );
      }
    } else {
      // Non-Axios errors
      console.error('Unexpected Error:', error);
      return NextResponse.json(
        { error: 'Internal Server Error' },
        { status: 500 }
      );
    }
  }
}
