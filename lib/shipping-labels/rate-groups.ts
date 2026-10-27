import type { FedExRateQuote } from "@/typings/types";

// Quotes for one shipment arrive once per FedEx account. The dialog shows each
// service once, with the accounts' prices side by side.

export type RateGroup = {
  serviceType: string;
  serviceName: string;
  estimatedDeliveryDate?: string;
  transitTime?: string;
  /** One quote per account, cheapest first. */
  quotes: FedExRateQuote[];
  cheapest: FedExRateQuote;
};

/** Identifies one selectable price: a service on a particular account. */
export const rateKey = (rate: Pick<FedExRateQuote, "serviceType" | "accountId">): string =>
  rate.accountId ? `${rate.accountId}:${rate.serviceType}` : rate.serviceType;

export function cheapestRate(rates: FedExRateQuote[]): FedExRateQuote | undefined {
  return rates.reduce<FedExRateQuote | undefined>(
    (best, rate) => (!best || rate.totalNetCharge < best.totalNetCharge ? rate : best),
    undefined
  );
}

/** Services in order of their cheapest price; ties keep FedEx's order. */
export function groupRatesByService(rates: FedExRateQuote[]): RateGroup[] {
  const byService = new Map<string, FedExRateQuote[]>();
  for (const rate of rates) {
    byService.set(rate.serviceType, [...(byService.get(rate.serviceType) ?? []), rate]);
  }
  return [...byService.values()]
    .map((quotes): RateGroup => {
      const sorted = [...quotes].sort((a, b) => a.totalNetCharge - b.totalNetCharge);
      const cheapest = sorted[0]!;
      const withEstimate = sorted.find((quote) => quote.estimatedDeliveryDate || quote.transitTime) ?? cheapest;
      return {
        serviceType: cheapest.serviceType,
        serviceName: cheapest.serviceName,
        estimatedDeliveryDate: withEstimate.estimatedDeliveryDate,
        transitTime: withEstimate.transitTime,
        quotes: sorted,
        cheapest,
      };
    })
    .sort((a, b) => a.cheapest.totalNetCharge - b.cheapest.totalNetCharge);
}
