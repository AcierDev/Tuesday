import { ItemStatus } from "../../typings/types";
import type { ConversationSnapshot, SavedFinding, TuesdaySnapshot } from "./types";

const EMPTY_COUNT = 0;
const SINGLE_ORDER_COUNT = 1;
const normalized = (value: string) => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();

export function auditName(value: string): string {
  return normalized(value).replace(/^\[(ew|wf|sh)\]\s*/, "")
    .replace(/\((rushed|semi-rushed|custom|local|vertical|center fade)\)/g, "").replace(/\s+/g, " ").trim();
}

export function tuesdayOrderScope(snapshot: TuesdaySnapshot) {
  const scope = snapshot.orderScope ?? {orders: snapshot.orders, checkedAt: snapshot.ordersCheckedAt, truncated: snapshot.ordersTruncated};
  const verified = !!scope.checkedAt && !scope.truncated;
  const byId = new Map(scope.orders.map(order => [order.id, order]));
  const byCustomer = new Map<string, typeof scope.orders>();
  for (const order of scope.orders) {
    const name = auditName(order.customerName ?? "");
    if (!name) continue;
    const orders = byCustomer.get(name) ?? [];
    orders.push(order);
    byCustomer.set(name, orders);
  }
  const customerOrders = (name: string) => [...new Map(name.split(/\s+\/\s+/)
    .flatMap(alias => byCustomer.get(auditName(alias)) ?? []).map(order => [order.id, order])).values()];
  const orderIsDone = (orderId: string) => byId.get(orderId)?.status === ItemStatus.Done;
  const knownIds = (ids: string[]) => ids.filter(id => byId.has(id));
  const onlyDone = (ids: string[]) => ids.length > EMPTY_COUNT && ids.every(id => byId.get(id)?.status === ItemStatus.Done);
  const customerIsDone = (name: string) => onlyDone(customerOrders(name)
    .filter(order => order.status !== ItemStatus.Hidden).map(order => order.id));
  const activeIds = (ids: string[]) => [...new Set(ids)].filter(id => {
    const status = byId.get(id)?.status;
    return !!status && status !== ItemStatus.Done && status !== ItemStatus.Hidden;
  });
  const namedActiveIds = (name: string) => {
    const named = customerOrders(name);
    return named.length === SINGLE_ORDER_COUNT ? activeIds(named.map(order => order.id)) : [];
  };
  const linkedFindingIds = (finding: SavedFinding) => {
    const threads = new Set<string>();
    for (const source of finding.sources) {
      try {
        const url = new URL(source.href);
        if (url.protocol !== "https:" || !(url.hostname === "etsy.com" || url.hostname.endsWith(".etsy.com"))) continue;
        const thread = url.pathname.match(/^\/messages\/(\d+)\/?$/)?.[SINGLE_ORDER_COUNT];
        if (thread) threads.add(thread);
      } catch { /* Only actual supplied Etsy thread links establish a relationship. */ }
    }
    return [...new Set((snapshot.knowledge?.conversations ?? [])
      .filter(conversation => threads.has(conversation.threadId)).flatMap(conversation => conversation.orderIds))];
  };
  const findingOrderIds = (finding: SavedFinding) => {
    if (!verified) return [];
    const linked = knownIds(linkedFindingIds(finding));
    if (linked.length) return activeIds(linked);
    return namedActiveIds(finding.customer);
  };
  return {
    verified,
    orderIsDone,
    orderName: (orderId: string) => byId.get(orderId)?.customerName ?? "",
    limitation: verified ? null : scope.truncated
      ? "Current order status coverage is incomplete; saved messages and activity are withheld until Done orders can be excluded."
      : "Current order status is unavailable; saved message and activity coverage is incomplete until Done orders can be excluded.",
    excludeActivity: (orderId: string) => !verified || orderIsDone(orderId),
    excludeConversation: (conversation: ConversationSnapshot) => {
      const linked = knownIds(conversation.orderIds);
      return !verified || (linked.length ? onlyDone(linked) : customerIsDone(conversation.buyerName));
    },
    conversationOrderIds: (conversation: ConversationSnapshot) => {
      if (!verified) return [];
      const linked = knownIds(conversation.orderIds);
      return linked.length ? activeIds(linked) : namedActiveIds(conversation.buyerName);
    },
    excludeFinding: (finding: SavedFinding) => {
      if (!verified) return true;
      const linked = knownIds(linkedFindingIds(finding));
      return linked.length ? onlyDone(linked) : customerIsDone(finding.customer);
    },
    findingOrderIds,
  };
}
