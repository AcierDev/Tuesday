// ShipStation Order Type Definition

type ISO8601Date = string; // Format: YYYY-MM-DDTHH:mm:ss.000Z

interface Address {
  name: string;
  company: string;
  street1: string;
  street2: string;
  street3: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  residential: boolean;
}

interface Weight {
  value: number;
  units: "ounces" | "pounds" | "grams" | "kilograms";
}

interface Dimensions {
  length: number;
  width: number;
  height: number;
  units: "inches" | "centimeters";
}

interface InsuranceOptions {
  provider: "shipsurance" | "carrier" | "provider";
  insureShipment: boolean;
  insuredValue: number;
}

interface InternationalOptions {
  contents: "merchandise" | "documents" | "gift" | "returned_goods" | "sample";
  customsItems: CustomsItem[];
  nonDelivery: "return_to_sender" | "treat_as_abandoned";
}

interface CustomsItem {
  customsItemId: number;
  description: string;
  quantity: number;
  value: number;
  harmonizedTariffCode: string;
  countryOfOrigin: string;
}

interface AdvancedOptions {
  warehouseId: number;
  nonMachinable: boolean;
  saturdayDelivery: boolean;
  containsAlcohol: boolean;
  storeId: number;
  customField1: string;
  customField2: string;
  customField3: string;
  source: string;
  mergedOrSplit: boolean;
  mergedIds: number[];
  parentId: number;
  billToParty: "my_account" | "recipient" | "third_party";
  billToAccount: string;
  billToPostalCode: string;
  billToCountryCode: string;
}

interface OrderItem {
  orderItemId: number;
  lineItemKey: string;
  sku: string;
  name: string;
  imageUrl: string;
  weight: Weight;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  shippingAmount: number;
  warehouseLocation: string;
  options: { name: string; value: string }[];
  productId: number;
  fulfillmentSku: string;
  adjustment: boolean;
  upc: string;
  createDate: ISO8601Date;
  modifyDate: ISO8601Date;
}

interface ShipStationOrder {
  orderId: number;
  orderNumber: string;
  orderKey: string;
  orderDate: ISO8601Date;
  createDate: ISO8601Date;
  modifyDate: ISO8601Date;
  paymentDate: ISO8601Date;
  shipByDate: ISO8601Date;
  orderStatus: string;
  customerId: number;
  customerUsername: string;
  customerEmail: string;
  billTo: Address;
  shipTo: Address;
  items: OrderItem[];
  orderTotal: number;
  amountPaid: number;
  taxAmount: number;
  shippingAmount: number;
  customerNotes: string;
  internalNotes: string;
  gift: boolean;
  giftMessage: string;
  paymentMethod: string;
  requestedShippingService: string;
  carrierCode: string;
  serviceCode: string;
  packageCode: string;
  confirmation:
    | "none"
    | "delivery"
    | "signature"
    | "adult_signature"
    | "direct_signature";
  shipDate: ISO8601Date;
  holdUntilDate: ISO8601Date;
  weight: Weight;
  dimensions: Dimensions;
  insuranceOptions: InsuranceOptions;
  internationalOptions: InternationalOptions;
  advancedOptions: AdvancedOptions;
  tagIds: number[];
  userId: string;
  externallyFulfilled: boolean;
  externallyFulfilledBy: string;
}
