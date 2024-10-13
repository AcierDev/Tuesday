import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CountFrequency } from "@/typings/types"
import { Plus, Search } from "lucide-react"

interface SearchAndFilterProps {
  countFilter: "All" | CountFrequency
  handleCountFilterChange: (filter: "All" | CountFrequency) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  setShowAddItemDialog: (show: boolean) => void
}

export default function SearchAndFilter({
  countFilter,
  handleCountFilterChange,
  searchTerm,
  setSearchTerm,
  setShowAddItemDialog
}: SearchAndFilterProps) {
  return (
    <div className="flex justify-between items-center mb-4 space-x-4">
      <div className="flex flex-col sm:flex-row gap-4 w-full">
        <Select value={countFilter} onValueChange={(value: "All" | CountFrequency) => handleCountFilterChange(value)}>
          <SelectTrigger className="w-[180px] bg-input dark:bg-gray-800">
            <SelectValue placeholder="Filter by count frequency" />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800">
            <SelectItem value="All">All</SelectItem>
            <SelectItem value={CountFrequency.Daily}>Daily Count</SelectItem>
            <SelectItem value={CountFrequency.Weekly}>Weekly Count</SelectItem>
            <SelectItem value={CountFrequency.Monthly}>Monthly Count</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-grow">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 bg-input dark:bg-gray-800 w-full"
          />
        </div>
      </div>
      <Button
        onClick={() => setShowAddItemDialog(true)}
        className="bg-gray-600 text-primary-foreground hover:bg-primary/90 dark:bg-gray-700 dark:text-white"
      >
        <Plus className="h-4 w-4 mr-2" /> Add Item
      </Button>
    </div>
  )
}