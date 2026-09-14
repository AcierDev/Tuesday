"use client";

import { OrderFormDialog } from "./OrderFormDialog";
import type { Item } from "@/typings/types";

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newItem: Partial<Item>) => Promise<void>;
}

export function NewItemModal(props: NewItemModalProps) {
  return props.isOpen ? <OrderFormDialog {...props} /> : null;
}
