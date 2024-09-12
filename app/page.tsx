import { OrderManagement } from "@/components/order-management";
import { RealmAppProvider } from "./hooks/useRealmApp";
import { OrderSettingsProvider } from "@/components/contexts-order-settings-context";

export default function Home() {
  return (
    <RealmAppProvider>
      <OrderSettingsProvider>
        <OrderManagement></OrderManagement>
      </OrderSettingsProvider>
    </RealmAppProvider>
  );
}
