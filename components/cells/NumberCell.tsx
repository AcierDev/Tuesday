// NumberCell.jsx

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { StarIcon } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { ColumnValue, Item } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useUser } from "@/contexts/UserContext";

export const NumberCell = ({
  item,
  columnValue,
}: {
  item: Item;
  columnValue: ColumnValue;
}) => {
  const [ratingValue, setRatingValue] = useState(Number(columnValue.text) || 0);

  const { updateItem } = useOrderStore();
  const { user } = useUser();

  const handleUpdate = async (newRating) => {
    setRatingValue(newRating);
    try {
      const updatedItem = {
        ...item,
        rating: newRating.toString(),
      };
      await updateItem(updatedItem, columnValue.columnName, user || undefined);
      toast.success("Rating updated successfully");
    } catch (err) {
      console.error("Failed to update ColumnValue", err);
      toast.error("Failed to update the rating. Please try again.");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="w-full h-full justify-center p-2 text-gray-900 dark:text-gray-100"
          variant="ghost"
        >
          <StarIcon className="mr-2 h-4 w-4" />
          {ratingValue || "Rate"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <div className="space-y-4">
          <h4 className="font-medium text-center">Set Rating</h4>
          <Slider
            max={10}
            step={1}
            value={[ratingValue]}
            onValueChange={(value) => handleUpdate(value[0])}
          />
          <div className="text-center font-bold text-2xl">{ratingValue}</div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
