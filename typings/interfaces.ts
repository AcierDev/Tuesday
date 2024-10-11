import { Item, ShippingStatus } from "./types";

export interface BoxRequirement {
  [color: string]: number
}

export interface HardwareBagRequirement {
  [bagType: string]: number
}

export interface MountingRailRequirement {
  [railType: string]: number
}

export interface BoxColor {
  color: string
  count: number
  hardwareBag: string
  mountingRail: string
}

export interface Box {
  length: string;
  width: string;
  height: string;
  weight: string;
}

export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ShippingDashboardProps {
  item: Item;
  onClose: () => void;
}

export type ShippingRate = {
  serviceName: string;
  carrierCode: string;
  serviceCode: string;
  shipmentCost: number;
  otherCost: number;
  totalCost: number;
  boxes: number;
  rateId: string;
}

export interface ShipmentDetails {
  carrierCode: string;
  serviceCode: string;
  weight: { value: number; units: string }[];
  dimensions: { length: number; width: number; height: number; units: string }[];
  fromAddress: Address;
  toAddress: Address & { name: string };
}

export interface GroupedRates {
  [key: string]: ShippingRate;
}

export interface ShippingItem extends Item {
  shipmentStatus?: ShippingStatus;
  trackingInfo?: {
    carrier: 'UPS' | 'FedEx';
    status: string;
    estimatedDelivery: string;
    weight?: string;
    dimensions?: string;
    serviceDescription?: string;
    referenceNumbers?: string[];
  };
  activity?: Activity[];
}

export interface Activity {
  date: string;
  time: string;
  description: string;
  location: string;
}