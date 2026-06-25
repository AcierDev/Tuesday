// LabelCell.jsx

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Barcode } from "lucide-react";
import { ViewLabel } from "../shipping/ViewLabel";
import { Item } from "@/typings/types";
import { useShippingStore } from "@/stores/useShippingStore";
import { useLabelUpload } from "@/hooks/useLabelUpload";

export const LabelCell = ({ item }: { item: Item }) => {
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isLoading = useShippingStore((state) => state.isLoading);
  const hasLabel = useShippingStore((state) => {
    return state.hasLabel(item.id);
  });
  const { uploadLabels } = useLabelUpload();

  // Has a label → open the dialog to view/manage it. No label yet → skip the
  // dialog and jump straight to the file picker so adding a label is one click.
  // The .click() must run synchronously in this handler to keep the browser's
  // user-gesture, otherwise the native picker is blocked.
  const handleIconClick = () => {
    if (hasLabel) {
      setIsLabelDialogOpen(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFilesPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files;
    if (picked && picked.length > 0) {
      // Upload + tracking extraction runs in the background; progress shows in
      // the global UploadProgress overlay and the icon turns yellow on success.
      uploadLabels(item.id, Array.from(picked));
    }
    // Reset so re-picking the same file still fires onChange.
    event.target.value = "";
  };

  return (
    <div className="!w-[1.21rem] flex-shrink-0 flex items-center justify-center max-w-[1.21rem] min-w-[1.21rem]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={handleFilesPicked}
      />
      <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
        <Button
          className="w-[1.21rem] h-8 p-0 text-foreground"
          variant="ghost"
          onClick={handleIconClick}
          disabled={isLoading}
        >
          <Barcode
            className={`h-[1.1rem] w-[1.1rem] ${
              isLoading
                ? "text-muted-foreground/40"
                : hasLabel
                ? "text-yellow-500"
                : "text-muted-foreground"
            }`}
          />
        </Button>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto bg-secondary text-secondary-foreground border-border">
          <DialogTitle className="sr-only">Shipping Label</DialogTitle>
          <ViewLabel
            orderId={item.id}
            item={item}
            onClose={() => setIsLabelDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};
