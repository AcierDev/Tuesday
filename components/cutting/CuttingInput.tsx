import { useState, useEffect } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CalendarIcon,
  Loader2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/utils/functions";
import { useCuttingData } from "@/contexts/CuttingContext";

export default function CuttingInput({
  date,
  setDate,
}: {
  date: Date;
  setDate: (date: Date) => void;
}) {
  const { data, isLoading, updateCuttingData } = useCuttingData();
  const [count, setCount] = useState<string>("");
  const [selectedDateCount, setSelectedDateCount] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const existingRecord = data.find((record) => {
      const recordDate =
        typeof record.date === "string" ? new Date(record.date) : record.date;
      return isSameDay(recordDate, date);
    });

    if (existingRecord) {
      setSelectedDateCount(existingRecord.count);
      setCount(existingRecord.count.toString());
    } else {
      setSelectedDateCount(0);
      setCount("");
    }
    setError(null);
  }, [data, date]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!count) {
      setError("Please enter a count value");
      return;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const newCount = parseInt(count, 10);
      if (isNaN(newCount) || newCount < 0) {
        throw new Error("Invalid count value");
      }
      await updateCuttingData(date, newCount);
      setSelectedDateCount(newCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update count");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickUpdate = async (increment: number) => {
    if (isUpdating) return;

    setIsUpdating(true);
    setError(null);

    try {
      const newCount = Math.max(0, selectedDateCount + increment);
      await updateCuttingData(date, newCount);
      setSelectedDateCount(newCount);
    } catch (err) {
      setError("Failed to update count");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(startOfDay(newDate));
      setOpen(false);
    }
  };

  const QuickAdjustButton = ({
    value,
    large = false,
  }: {
    value: number;
    large?: boolean;
  }) => (
    <Button
      onClick={() => handleQuickUpdate(value)}
      variant="outline"
      disabled={isUpdating}
      className={cn(
        "transition-colors rounded-full",
        large ? "h-30 w-20" : "h-2- w-20",
        "dark:bg-gray-800 dark:hover:bg-gray-700",
        value > 0 ? "dark:border-green-600/30" : "dark:border-red-600/30"
      )}
    >
      <span
        className={cn(
          "font-medium flex items-center gap-1",
          value > 0 ? "text-green-500" : "text-red-500"
        )}
      >
        {large ? (
          value > 0 ? (
            <ChevronUp className="h-8 w-8" />
          ) : (
            <ChevronDown className="h-8 w-8" />
          )
        ) : (
          <span className="text-lg">
            {value > 0 ? "+" : "-"}
            {Math.abs(value)}
          </span>
        )}
      </span>
    </Button>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-2 text-center">
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-4 w-1/3 mx-auto" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <CardHeader className="text-center space-y-2 pb-2">
        <CardTitle className="text-xl font-bold tracking-tight">
          Daily Cut Counter
        </CardTitle>
        <CardDescription className="text-sm">
          Track 2x4's cut today
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Date Selection */}
          <div className="flex justify-center">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-center font-medium",
                    "dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700",
                    "border-gray-700"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 dark:bg-gray-800">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  initialFocus
                  className="dark:bg-gray-800 dark:text-gray-200"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Current Count Display */}
          <motion.div
            key={selectedDateCount}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-center space-y-1"
          >
            <div className="text-sm text-muted-foreground dark:text-gray-400">
              Current Count
            </div>
            <div className="text-4xl font-bold dark:text-gray-100">
              {selectedDateCount}
            </div>
          </motion.div>

          {/* Quick Adjust Controls */}
          <div className="space-y-4">
            {/* All Buttons in a Single Row */}
            <div className="flex justify-center items-center space-x-4">
              <QuickAdjustButton value={-10} />
              <QuickAdjustButton value={-5} />
              <QuickAdjustButton value={-1} large />
              <QuickAdjustButton value={1} large />
              <QuickAdjustButton value={5} />
              <QuickAdjustButton value={10} />
            </div>
          </div>

          {/* Manual Input */}
          <div className="flex space-x-2">
            <Input
              type="number"
              value={count}
              onChange={(e) => {
                setCount(e.target.value);
                setError(null);
              }}
              placeholder="Enter count"
              className="dark:bg-gray-800 dark:text-gray-200 text-center text-lg"
              disabled={isUpdating}
            />
            <Button
              onClick={() => handleSubmit()}
              disabled={isUpdating || count === selectedDateCount.toString()}
              className="dark:bg-blue-600 dark:hover:bg-blue-700 min-w-[100px]"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
          </div>

          {/* Error Display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-center"
              >
                <Alert
                  variant="destructive"
                  className="dark:bg-red-900/20 dark:border-red-900"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </>
  );
}
