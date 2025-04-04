
const domesticOrder: ShipStationOrder = {
  orderId: 123456,
  orderNumber: "TEST-001",
  orderKey: "TEST-001-A",
  orderDate: "2023-05-15T10:30:00.000Z",
  createDate: "2023-05-15T10:30:00.000Z",
  modifyDate: "2023-05-15T10:35:00.000Z",
  paymentDate: "2023-05-15T10:32:00.000Z",
  shipByDate: "2023-05-17T23:59:59.000Z",
  orderStatus: "awaiting_shipment",
  customerId: 78901,
  customerUsername: "johndoe",
  customerEmail: "john.doe@example.com",
  billTo: {
    name: "John Doe",
    company: "Home",
    street1: "123 Billing St",
    street2: "Apt 4B",
    street3: "",
    city: "New York",
    state: "NY",
    postalCode: "10001",
    country: "US",
    phone: "212-555-1234",
    residential: true
  },
  shipTo: {
    name: "John Doe",
    company: "Home",
    street1: "456 Shipping Ave",
    street2: "",
    street3: "",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90001",
    country: "US",
    phone: "323-555-6789",
    residential: true
  },
  items: [
    {
      orderItemId: 1,
      lineItemKey: "SKU-001",
      sku: "TSHIRT-L",
      name: "Large T-Shirt",
      imageUrl: "https://example.com/images/tshirt-l.jpg",
      weight: {
        value: 6,
        units: "ounces"
      },
      quantity: 2,
      unitPrice: 15.99,
      taxAmount: 2.56,
      shippingAmount: 5,
      warehouseLocation: "Aisle 3, Shelf 2",
      options: [
        { name: "Color", value: "Blue" },
        { name: "Size", value: "Large" }
      ],
      productId: 100,
      fulfillmentSku: "TSHIRT-L-BLU",
      adjustment: false,
      upc: "123456789012",
      createDate: "2023-05-15T10:30:00.000Z",
      modifyDate: "2023-05-15T10:30:00.000Z"
    },
    {
      orderItemId: 2,
      lineItemKey: "SKU-002",
      sku: "MUGH-001",
      name: "Coffee Mug",
      imageUrl: "https://example.com/images/mug.jpg",
      weight: {
        value: 10,
        units: "ounces"
      },
      quantity: 1,
      unitPrice: 12.99,
      taxAmount: 1.04,
      shippingAmount: 0,
      warehouseLocation: "Aisle 1, Shelf 4",
      options: [],
      productId: 101,
      fulfillmentSku: "MUGH-001-WHT",
      adjustment: false,
      upc: "123456789013",
      createDate: "2023-05-15T10:30:00.000Z",
      modifyDate: "2023-05-15T10:30:00.000Z"
    }
  ],
  orderTotal: 50.57,
  amountPaid: 50.57,
  taxAmount: 3.60,
  shippingAmount: 5,
  customerNotes: "Please handle with care",
  internalNotes: "Fragile item in order",
  gift: false,
  giftMessage: "",
  paymentMethod: "credit_card",
  requestedShippingService: "USPS Priority Mail",
  carrierCode: "usps",
  serviceCode: "priority_mail",
  packageCode: "package",
  confirmation: "delivery",
  shipDate: "2023-05-16T14:00:00.000Z",
  holdUntilDate: "2023-05-16T08:00:00.000Z",
  weight: {
    value: 22,
    units: "ounces"
  },
  dimensions: {
    length: 12,
    width: 8,
    height: 6,
    units: "inches"
  },
  insuranceOptions: {
    provider: "carrier",
    insureShipment: true,
    insuredValue: 50.57
  },
  internationalOptions: {
    contents: "merchandise",
    customsItems: [],
    nonDelivery: "return_to_sender"
  },
  advancedOptions: {
    warehouseId: 12345,
    nonMachinable: false,
    saturdayDelivery: false,
    containsAlcohol: false,
    storeId: 67890,
    customField1: "VIP Customer",
    customField2: "Marketing Promo: SUMMER2023",
    customField3: "",
    source: "Shopify",
    mergedOrSplit: false,
    mergedIds: [],
    parentId: null,
    billToParty: "my_account",
    billToAccount: "",
    billToPostalCode: "",
    billToCountryCode: ""
  },
  tagIds: [1, 4],
  userId: "user_123",
  externallyFulfilled: false,
  externallyFulfilledBy: ""
};

// Sample 2: International order with customs information
const internationalOrder: ShipStationOrder = {
  orderId: 789012,
  orderNumber: "INT-001",
  orderKey: "INT-001-B",
  orderDate: "2023-05-16T09:15:00.000Z",
  createDate: "2023-05-16T09:15:00.000Z",
  modifyDate: "2023-05-16T09:20:00.000Z",
  paymentDate: "2023-05-16T09:17:00.000Z",
  shipByDate: "2023-05-18T23:59:59.000Z",
  orderStatus: "awaiting_shipment",
  customerId: 45678,
  customerUsername: "emilybrown",
  customerEmail: "emily.brown@example.com",
  billTo: {
    name: "Emily Brown",
    company: "Brown Enterprises",
    street1: "789 Billing Road",
    street2: "",
    street3: "",
    city: "London",
    state: "",
    postalCode: "SW1A 1AA",
    country: "GB",
    phone: "+44 20 1234 5678",
    residential: false
  },
  shipTo: {
    name: "Emily Brown",
    company: "Brown Enterprises",
    street1: "101 Shipping Street",
    street2: "Floor 3",
    street3: "",
    city: "Paris",
    state: "",
    postalCode: "75001",
    country: "FR",
    phone: "+33 1 23 45 67 89",
    residential: false
  },
  items: [
    {
      orderItemId: 3,
      lineItemKey: "SKU-003",
      sku: "BOOK-001",
      name: "International Business Guide",
      imageUrl: "https://example.com/images/business-book.jpg",
      weight: {
        value: 2,
        units: "pounds"
      },
      quantity: 1,
      unitPrice: 49.99,
      taxAmount: 10,
      shippingAmount: 15,
      warehouseLocation: "Aisle 5, Shelf 1",
      options: [],
      productId: 102,
      fulfillmentSku: "BOOK-001-ENG",
      adjustment: false,
      upc: "123456789014",
      createDate: "2023-05-16T09:15:00.000Z",
      modifyDate: "2023-05-16T09:15:00.000Z"
    }
  ],
  orderTotal: 74.99,
  amountPaid: 74.99,
  taxAmount: 10,
  shippingAmount: 15,
  customerNotes: "Please deliver during business hours",
  internalNotes: "High-value item, signature required",
  gift: false,
  giftMessage: "",
  paymentMethod: "paypal",
  requestedShippingService: "DHL Express",
  carrierCode: "dhl_express",
  serviceCode: "express_worldwide",
  packageCode: "package",
  confirmation: "signature",
  shipDate: "2023-05-17T11:00:00.000Z",
  holdUntilDate: "2023-05-17T09:00:00.000Z",
  weight: {
    value: 2,
    units: "pounds"
  },
  dimensions: {
    length: 11,
    width: 8.5,
    height: 2,
    units: "inches"
  },
  insuranceOptions: {
    provider: "carrier",
    insureShipment: true,
    insuredValue: 74.99
  },
  internationalOptions: {
    contents: "merchandise",
    customsItems: [
      {
        customsItemId: 1,
        description: "Business Book",
        quantity: 1,
        value: 49.99,
        harmonizedTariffCode: "4901.99.0000",
        countryOfOrigin: "US"
      }
    ],
    nonDelivery: "return_to_sender"
  },
  advancedOptions: {
    warehouseId: 67890,
    nonMachinable: false,
    saturdayDelivery: false,
    containsAlcohol: false,
    storeId: 12345,
    customField1: "International Customer",
    customField2: "Promo: GLOBAL2023",
    customField3: "",
    source: "Manual",
    mergedOrSplit: false,
    mergedIds: [],
    parentId: null,
    billToParty: "recipient",
    billToAccount: "",
    billToPostalCode: "75001",
    billToCountryCode: "FR"
  },
  tagIds: [2, 5],
  userId: "user_456",
  externallyFulfilled: false,
  externallyFulfilledBy: ""
};