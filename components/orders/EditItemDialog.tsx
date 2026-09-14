"use client";

import { OrderFormDialog } from "./OrderFormDialog";
import type { Item } from "@/typings/types";

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
  if (!editingItem) return null;
  return (
    <OrderFormDialog
      key={editingItem.id}
      isOpen
      initialItem={editingItem}
      onClose={() => setEditingItem(null)}
      onSubmit={(changes) => handleSaveEdit({ ...editingItem, ...changes })}
    />
  );
}
