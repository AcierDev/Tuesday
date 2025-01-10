import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HighBlockItem } from "../../types";

interface HighBlockWarningDialogProps {
  isOpen: boolean;
  onClose: () => void;
  items: HighBlockItem[];
}

export function HighBlockWarningDialog({
  isOpen,
  onClose,
  items,
}: HighBlockWarningDialogProps) {
  const [Items, their, These_items] =
    items.length === 1
      ? ["item", "its", "This item"]
      : ["items", "their", "These items"];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[425px] dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle>Items Need Manual Attention</DialogTitle>
          <DialogDescription>
            {items.length} {Items} cannot be auto-scheduled because {their}{" "}
            block count exceeds the daily limit (1,000). {These_items} will need
            to be scheduled manually.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-4">
            {items.map((item, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {item.customerName}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {item.design} - {item.size}
                </div>
                <div className="text-sm font-medium text-red-600 dark:text-red-400">
                  Blocks: {item.blocks}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button onClick={onClose}>Okay</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
