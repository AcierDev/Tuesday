"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { XCircle, UserX, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { boardConfig } from "@/config/boardconfig";
import { ColumnTitles, GenericColumnValue, Item } from "@/typings/types";
import {
  CREDIT_COLORS,
  CREDIT_OPTIONS,
  CreditOption,
  EMPLOYEE_MAP,
  INITIALS_MAP,
  ITEM_DEFAULT_VALUES,
} from "@/typings/constants";
import { combineImages, getEmployeeInfoFromInitials } from "@/utils/functions";

interface DropdownCellProps {
  item: Item;
  columnValue: GenericColumnValue;
  onUpdate: (updatedItem: Item, changedField: ColumnTitles) => void;
  disableCredit?: boolean;
  disabled?: boolean;
}

export function DropdownCell({
  item,
  columnValue,
  onUpdate,
  disableCredit = false,
  disabled = false,
}: DropdownCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [selectedCredits, setSelectedCredits] = useState<CreditOption[]>([]);
  const [combinedImageUrl, setCombinedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (columnValue.credit && columnValue.credit.length > 0) {
      setSelectedCredits(
        columnValue.credit
          .map((credit) => INITIALS_MAP[credit])
          .filter((initial): initial is CreditOption => !!initial)
      );
    } else {
      setSelectedCredits([]);
    }
  }, [columnValue.credit]);

  useEffect(() => {
    const generateCombinedImage = async () => {
      if (selectedCredits.length === 2) {
        try {
          const image1 = getEmployeeInfoFromInitials(selectedCredits[0]!).image;
          const image2 = getEmployeeInfoFromInitials(selectedCredits[1]!).image;
          if (image1 && image2) {
            const combined = await combineImages(image1, image2);
            setCombinedImageUrl(combined);
          }
        } catch (error) {
          console.error("Error combining images:", error);
          setCombinedImageUrl(null);
        }
      } else if (selectedCredits.length === 1) {
        setCombinedImageUrl(
          getEmployeeInfoFromInitials(selectedCredits[0]!).image || null
        );
      } else {
        setCombinedImageUrl(null);
      }
    };

    generateCombinedImage();
  }, [selectedCredits]);

  const handleUpdate = useCallback(
    async (newValue: string, credits: CreditOption[] | null) => {
      try {
        // Ensure all default values are present by spreading ITEM_DEFAULT_VALUES
        const completeValues = Object.values(ColumnTitles).map(
          (columnTitle) => {
            const existingValue = item.values.find(
              (v) => v.columnName === columnTitle
            );
            return existingValue || ITEM_DEFAULT_VALUES[columnTitle];
          }
        );

        const updatedItem = {
          ...item,
          values: completeValues.map((value) =>
            value.columnName === columnValue.columnName
              ? {
                  ...value,
                  text: newValue,
                  lastModifiedTimestamp: Date.now(),
                  credit: credits
                    ? credits.map((credit) => EMPLOYEE_MAP[credit])
                    : [],
                }
              : value
          ),
        };
        await onUpdate(updatedItem, columnValue.columnName);
        toast.success("Value updated successfully");
      } catch (err) {
        console.error("Failed to update ColumnValue", err);
        toast.error("Failed to update the value. Please try again.");
      }
    },
    [item, columnValue.columnName, onUpdate]
  );

  const handleSaveCredits = useCallback(async () => {
    try {
      const updatedCredits = selectedCredits.slice(0, 2);
      await handleUpdate(columnValue.text || "", updatedCredits);
      setIsCreditDialogOpen(false);
    } catch (err) {
      console.error("Failed to update credits", err);
      toast.error("Failed to update credits. Please try again.");
    }
  }, [selectedCredits, columnValue.text, handleUpdate]);

  const handleCancelCredits = useCallback(() => {
    const initials =
      columnValue.credit
        ?.map((credit) => INITIALS_MAP[credit])
        .filter((initial): initial is CreditOption => !!initial) || [];
    setSelectedCredits(initials);
    setIsCreditDialogOpen(false);
  }, [columnValue.credit]);

  const toggleCredit = useCallback((credit: CreditOption) => {
    setSelectedCredits((prev) => {
      if (prev.includes(credit)) {
        return prev.filter((c) => c !== credit);
      } else if (prev.length < 2) {
        return [...prev, credit];
      }
      return prev;
    });
  }, []);

  const buttonStyle =
    columnValue.columnName === "Design" || columnValue.columnName === "Size"
      ? `inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white rounded-full hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors ${
          columnValue.columnName === "Size"
            ? "bg-sky-500 dark:bg-sky-600 hover:bg-sky-600 dark:hover:bg-sky-700 focus-visible:ring-sky-600 dark:focus-visible:ring-sky-500"
            : "bg-primary"
        }`
      : "w-full h-full justify-center p-2 text-foreground";

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            className={`relative ${buttonStyle} ${
              combinedImageUrl ? "bg-cover bg-center" : ""
            }`}
            style={
              combinedImageUrl
                ? { backgroundImage: `url(${combinedImageUrl})` }
                : {}
            }
            variant="ghost"
          >
            <span
              className={`${
                combinedImageUrl ? "bg-background/70 px-1 rounded" : ""
              }`}
            >
              {columnValue.text || "⠀"}
            </span>
            {!disableCredit && selectedCredits.length > 0 && (
              <>
                <span
                  className={`absolute top-0 left-0 ${
                    CREDIT_COLORS[selectedCredits[0]!]
                  } text-white text-[10px] font-bold px-1 rounded-tl`}
                >
                  {selectedCredits[0]}
                </span>
                {selectedCredits[1] && (
                  <span
                    className={`absolute top-0 right-0 ${
                      CREDIT_COLORS[selectedCredits[1]]
                    } text-white text-[10px] font-bold px-1 rounded-tr`}
                  >
                    {selectedCredits[1]}
                  </span>
                )}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        {!disabled && (
          <DropdownMenuContent>
            {boardConfig.columns[columnValue.columnName].options?.map(
              (option) => (
                <DropdownMenuItem
                  key={option}
                  onSelect={() =>
                    handleUpdate(
                      option,
                      selectedCredits.length > 0 ? selectedCredits : null
                    )
                  }
                >
                  {option}
                </DropdownMenuItem>
              )
            )}
            {!disableCredit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setIsCreditDialogOpen(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign Credit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => handleUpdate(columnValue.text || "", [])}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Reset Credit
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => handleUpdate("", null)}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reset Value
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        )}
      </DropdownMenu>

      {!disableCredit && (
        <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign Credit</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {CREDIT_OPTIONS.map((credit) => {
                const isSelected = selectedCredits.includes(credit);
                const employeeInfo = getEmployeeInfoFromInitials(credit);
                return (
                  <Button
                    key={credit}
                    onClick={() => toggleCredit(credit)}
                    variant={isSelected ? "default" : "secondary"}
                    className={`justify-start ${
                      isSelected ? employeeInfo.color : ""
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full bg-cover bg-center mr-2"
                      style={{ backgroundImage: `url(${employeeInfo.image})` }}
                    />
                    <span
                      className={`text-base font-medium ${
                        isSelected ? "text-white" : ""
                      }`}
                    >
                      {employeeInfo.name}
                    </span>
                  </Button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCancelCredits}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveCredits}
                disabled={selectedCredits.length === 0}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
