import { ColumnTitles, Item } from "@/typings/types";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { Search } from "lucide-react";

interface AddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentDay: string;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filterDesign: string;
  setFilterDesign: (design: string) => void;
  filterSize: string;
  setFilterSize: (size: string) => void;
  designs: string[];
  sizes: string[];
  filteredItems: Item[];
  handleQuickAdd: (day: string, item: Item) => void;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
}

export function AddItemDialog({
  isOpen,
  onClose,
  currentDay,
  searchTerm,
  setSearchTerm,
  filterDesign,
  setFilterDesign,
  filterSize,
  setFilterSize,
  designs,
  sizes,
  filteredItems,
  handleQuickAdd,
  getItemValue,
}: AddItemDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Item to {currentDay}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              className="flex-grow"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            <Select value={filterDesign} onValueChange={setFilterDesign}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by design" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">All Designs</SelectItem>
                {designs.map((design) => (
                  <SelectItem key={design} value={design}>{design}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSize} onValueChange={setFilterSize}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sizes</SelectItem>
                {sizes.map((size) => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-md"
              >
                <div>
                  <p className="font-semibold text-sm">
                    {getItemValue(item, ColumnTitles.Customer_Name)}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {getItemValue(item, ColumnTitles.Design)} -{" "}
                    {getItemValue(item, ColumnTitles.Size)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    handleQuickAdd(currentDay, item);
                    onClose();
                  }}
                >
                  Add
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
