"use client";

import { OrderFormDialog } from "./OrderFormDialog";
import { applyOrderEditChanges } from "./utils/orderEdit";
import { useOrderStore } from "@/stores/useOrderStore";
import { useAcknowledgeEtsyImport } from "./useAcknowledgeEtsyImport";
import type { Item } from "@/typings/types";

// Latest copy of the order (it may have changed while the dialog was open).
function latestCopy(item: Item): Item {
  const { items, doneItems, scheduledItems } = useOrderStore.getState();
  return (
    items.find((i) => i.id === item.id) ??
    doneItems.find((i) => i.id === item.id) ??
    scheduledItems.find((i) => i.id === item.id) ??
    item
  );
}

interface EditItemDialogProps {
  editingItem: Item | null;
  setEditingItem: (item: Item | null) => void;
  handleSaveEdit: (updatedItem: Item) => Promise<void>;
}

export function EditItemDialog({
  editingItem,
  setEditingItem,
  handleSaveEdit,
}: EditItemDialogProps) {
  useAcknowledgeEtsyImport(editingItem);
  if (!editingItem) return null;
  return (
    <OrderFormDialog
      key={editingItem.id}
      isOpen
      initialItem={editingItem}
      onClose={() => setEditingItem(null)}
      // Only the edited fields, applied to the latest copy, so the save
      // doesn't write back the dialog's stale snapshot of other fields.
      onSubmit={(changes) =>
        handleSaveEdit(applyOrderEditChanges(latestCopy(editingItem), changes))
      }
    />
  );
}
