import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  Search,
  Clock,
  Filter,
  ArrowLeftIcon,
  ArrowRightIcon,
  FileImage,
  Calendar as CalendarIcon2,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import ImageAnalysisCard from "@/components/router/ImageAnalysisCard";
import { AnalysisImage, ImageMetadata } from "@/typings/types";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface HistoryViewProps {
  historicalImages: {
    url: string;
    metadata: ImageMetadata;
    timestamp: Date;
    analysis?: any;
    ejectionDecision?: boolean | null;
  }[];
}

const HistoryView: React.FC<HistoryViewProps> = ({
  historicalImages = [], // Default to empty array
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [filterMode, setFilterMode] = useState<"all" | "ejected" | "passed">(
    "all"
  );

  // Filter images by date and search term
  const filteredImages = historicalImages
    .filter((img) => {
      // Date filter
      if (selectedDate) {
        const imgDate = new Date(img.timestamp);
        return (
          imgDate.getDate() === selectedDate.getDate() &&
          imgDate.getMonth() === selectedDate.getMonth() &&
          imgDate.getFullYear() === selectedDate.getFullYear()
        );
      }
      return true;
    })
    .filter((img) => {
      // Filter by ejection decision
      if (filterMode === "ejected") return img.ejectionDecision === true;
      if (filterMode === "passed") return img.ejectionDecision === false;
      return true;
    })
    .filter((img) => {
      // Search term filter (if implemented)
      if (searchTerm.trim() === "") return true;

      // Example: filter by timestamp or metadata properties
      const imgDate = format(new Date(img.timestamp), "yyyy-MM-dd HH:mm:ss");
      return imgDate.includes(searchTerm);
    });

  const currentImage = filteredImages[currentImageIndex] || null;

  const handleNext = () => {
    if (currentImageIndex < filteredImages.length - 1) {
      setCurrentImageIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex((prev) => prev - 1);
    }
  };

  // Get count of ejected/passed images for the current filter
  const ejectedCount = historicalImages.filter(
    (img) => img.ejectionDecision === true
  ).length;
  const passedCount = historicalImages.filter(
    (img) => img.ejectionDecision === false
  ).length;

  return (
    <div className="space-y-6">
      {/* Filters and controls */}
      <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileImage className="h-5 w-5 text-blue-500" />
            <span>Image History</span>
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              {historicalImages.length} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            {/* Date Filter */}
            <div className="space-y-2 flex-1">
              <Label
                htmlFor="date"
                className="flex items-center gap-1 text-sm font-medium"
              >
                <CalendarIcon2 className="h-3.5 w-3.5 text-gray-500" />
                Select Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    id="date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                    {selectedDate ? (
                      format(selectedDate, "PPP")
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Search */}
            <div className="space-y-2 flex-1">
              <Label
                htmlFor="search"
                className="flex items-center gap-1 text-sm font-medium"
              >
                <Search className="h-3.5 w-3.5 text-gray-500" />
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Search by timestamp..."
                  className="pl-8 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filter tabs */}
            <div className="space-y-2 flex-1">
              <Label className="flex items-center gap-1 text-sm font-medium">
                <Tag className="h-3.5 w-3.5 text-gray-500" />
                Filter By Result
              </Label>
              <Tabs
                defaultValue="all"
                className="w-full"
                onValueChange={(v) => setFilterMode(v as any)}
                value={filterMode}
              >
                <TabsList className="grid grid-cols-3 w-full bg-gray-100 dark:bg-gray-800 p-1">
                  <TabsTrigger
                    value="all"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400"
                  >
                    All ({historicalImages.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="ejected"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400"
                  >
                    Ejected ({ejectedCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="passed"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400"
                  >
                    Passed ({passedCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Image Viewer */}
      <AnimatePresence mode="wait">
        {filteredImages.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            key="has-images"
            className="grid grid-cols-1 gap-6"
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2 text-sm text-gray-500 items-center">
                    <Clock className="h-4 w-4" />
                    {currentImage &&
                      format(new Date(currentImage.timestamp), "PPP HH:mm:ss")}

                    <Badge
                      variant={
                        currentImage?.ejectionDecision === true
                          ? "destructive"
                          : "secondary"
                      }
                      className={`ml-2 ${
                        currentImage?.ejectionDecision === false
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : ""
                      }`}
                    >
                      {currentImage?.ejectionDecision === true
                        ? "Ejected"
                        : "Passed"}
                    </Badge>
                  </div>
                  <div className="text-sm bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full font-medium">
                    {currentImageIndex + 1} of {filteredImages.length}
                  </div>
                </div>

                <div className="relative">
                  {/* Make the image container more square and centered */}
                  <div className="max-w-xl mx-auto relative">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentImage?.url}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mx-auto"
                      >
                        {currentImage && (
                          <ImageAnalysisCard
                            imageUrl={currentImage.url}
                            imageMetadata={currentImage.metadata}
                            analysis={currentImage.analysis}
                            ejectionDecision={currentImage.ejectionDecision!}
                            isCapturing={false}
                            isAnalyzing={false}
                          />
                        )}
                      </motion.div>
                    </AnimatePresence>

                    {/* Floating navigation buttons */}
                    <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={handlePrevious}
                        disabled={currentImageIndex === 0}
                        className="ml-2 rounded-full h-10 w-10 shadow-md opacity-80 hover:opacity-100 pointer-events-auto transition-all hover:scale-110 dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        <ArrowLeftIcon className="h-5 w-5" />
                      </Button>

                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={handleNext}
                        disabled={
                          currentImageIndex === filteredImages.length - 1
                        }
                        className="mr-2 rounded-full h-10 w-10 shadow-md opacity-80 hover:opacity-100 pointer-events-auto transition-all hover:scale-110 dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        <ArrowRightIcon className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Bottom navigation (still keep these for accessibility) */}
                <div className="flex justify-between mt-4 md:hidden">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentImageIndex === 0}
                    className="border-gray-200 dark:border-gray-700"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleNext}
                    disabled={currentImageIndex === filteredImages.length - 1}
                    className="border-gray-200 dark:border-gray-700"
                  >
                    Next
                    <ArrowRightIcon className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            key="no-images"
            transition={{ duration: 0.3 }}
          >
            <Card className="bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="rounded-full bg-gray-100 dark:bg-gray-700 p-6 mb-6 shadow-sm">
                  <Filter className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium mb-3">No images found</h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
                  {searchTerm
                    ? "No images match your search criteria."
                    : "No images available for the selected date."}
                </p>
                {selectedDate && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectedDate(new Date())}
                    className="border-gray-200 dark:border-gray-700"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    View Today's Images
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HistoryView;
