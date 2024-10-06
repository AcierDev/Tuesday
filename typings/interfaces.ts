import { Item, ShippingStatus } from "./types";

// Interface for amount and currency
export interface CurrencyAmount {
  amount: number;
  divisor: number;
  currency_code: string;
}

// Interface for shipment details
export interface Shipment {
  receipt_shipping_id: number;
  shipment_notification_timestamp: number;
  carrier_name: string;
  tracking_code: string;
}

// Interface for product variations
export interface Variation {
  property_id: number;
  value_id: number;
  formatted_name: string;
  formatted_value: string;
}

// Interface for product data
export interface ProductData {
  property_id: number;
  property_name: string;
  scale_id: number;
  scale_name: string;
  value_ids: number[];
  values: string[];
}

// Interface for transaction details
export interface Transaction {
  transaction_id: number;
  title: string;
  description: string;
  seller_user_id: number;
  buyer_user_id: number;
  create_timestamp: number;
  created_timestamp: number;
  paid_timestamp: number;
  shipped_timestamp: number;
  quantity: number;
  listing_image_id: number;
  receipt_id: number;
  is_digital: boolean;
  file_data: string;
  listing_id: number;
  transaction_type: string;
  product_id: number;
  sku: string;
  price: CurrencyAmount;
  shipping_cost: CurrencyAmount;
  variations: Variation[];
  product_data: ProductData[];
  shipping_profile_id: number;
  min_processing_days: number;
  max_processing_days: number;
  shipping_method: string;
  shipping_upgrade: string;
  expected_ship_date: number;
  buyer_coupon: number;
  shop_coupon: number;
}

// Interface for refund details
export interface Refund {
  amount: CurrencyAmount;
  created_timestamp: number;
  reason: string;
  note_from_issuer: string;
  status: string;
}

// Interface for the receipt object
export interface Receipt {
  receipt_id: number;
  receipt_type: number;
  seller_user_id: number;
  seller_email: string;
  buyer_user_id: number;
  buyer_email: string;
  name: string;
  first_line: string;
  second_line: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  formatted_address: string;
  country_iso: string;
  payment_method: string;
  payment_email: string;
  message_from_seller: string;
  message_from_buyer: string;
  message_from_payment: string;
  is_paid: boolean;
  is_shipped: boolean;
  create_timestamp: number;
  created_timestamp: number;
  update_timestamp: number;
  updated_timestamp: number;
  is_gift: boolean;
  gift_message: string;
  gift_sender: string;
  grandtotal: CurrencyAmount;
  subtotal: CurrencyAmount;
  total_price: CurrencyAmount;
  total_shipping_cost: CurrencyAmount;
  total_tax_cost: CurrencyAmount;
  total_vat_cost: CurrencyAmount;
  discount_amt: CurrencyAmount;
  gift_wrap_price: CurrencyAmount;
  shipments: Shipment[];
  transactions: Transaction[];
  refunds: Refund[];
}

// Interface for the full API response
export interface EtsyReceiptResponse {
  count: number;
  results: Receipt[];
}

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
  receipt?: Receipt;
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