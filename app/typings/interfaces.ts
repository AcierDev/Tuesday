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
