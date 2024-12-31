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
import { Search, Plus, X } from "lucide-react";

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
  handleQuickAdd: (day: string, itemId: string) => void;
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
      <DialogContent className="sm:max-w-[600px] dark:bg-gray-800">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl font-semibold">
            Add Items to {currentDay}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-10 dark:bg-gray-700"
                placeholder="Search by customer name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex space-x-2">
              <Select value={filterDesign} onValueChange={setFilterDesign}>
                <SelectTrigger className="flex-1 dark:bg-gray-700">
                  <SelectValue placeholder="Design" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700">
                  <SelectItem value="all">All Designs</SelectItem>
                  {designs.map((design) => (
                    <SelectItem key={design} value={design}>
                      {design}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSize} onValueChange={setFilterSize}>
                <SelectTrigger className="flex-1 dark:bg-gray-700">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700">
                  <SelectItem value="all">All Sizes</SelectItem>
                  {sizes.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items found matching your search criteria
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {getItemValue(item, ColumnTitles.Customer_Name)}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                        {getItemValue(item, ColumnTitles.Design)}
                      </span>
                      <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-xs">
                        {getItemValue(item, ColumnTitles.Size)}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:bg-gray-200 dark:hover:bg-gray-600"
                    onClick={() => {
                      handleQuickAdd(currentDay, item.id);
                      onClose();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
