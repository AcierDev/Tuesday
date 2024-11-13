import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Search, Menu } from "lucide-react";

type FiltersProps = {
  filterValue: string;
  onFilterChange: (value: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  filterOptions: string[];
  isMobile: boolean;
};

export function Filters({ filterValue, onFilterChange, searchTerm, onSearchTermChange, filterOptions, isMobile }: FiltersProps) {
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent className="dark:bg-gray-800 dark:text-gray-200">
          <SheetHeader>
            <SheetTitle className="dark:text-gray-200">Filters</SheetTitle>
            <SheetDescription className="dark:text-gray-200">
              Adjust your schedule filters
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <Select value={filterValue} onValueChange={onFilterChange}>
              <SelectTrigger className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                <SelectItem value="all" className="dark:text-gray-200 dark:focus:bg-gray-600">All</SelectItem>
                {filterOptions.map(option => (
                  <SelectItem key={option} value={option} className="dark:text-gray-200 dark:focus:bg-gray-600">{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-200" />
              <Input
                className="pl-10 pr-4 py-2 w-full dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex space-x-4">
      <Select value={filterValue} onValueChange={onFilterChange}>
        <SelectTrigger className="w-[180px] dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600">
          <SelectValue placeholder="Filter" />
        </SelectTrigger>
        <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
          <SelectItem value="all" className="dark:text-gray-200 dark:focus:bg-gray-600">All</SelectItem>
          {filterOptions.map(option => (
            <SelectItem key={option} value={option} className="dark:text-gray-200 dark:focus:bg-gray-600">{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-200" />
        <Input
          className="pl-10 pr-4 py-2 w-full dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
        />
      </div>
    </div>
  );
}