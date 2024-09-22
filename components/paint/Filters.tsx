import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { cn } from "@/utils/functions"

interface FiltersProps {
  filterDesign: string
  setFilterDesign: (value: string) => void
  searchTerm: string
  setSearchTerm: (value: string) => void
  paintRequirements: Record<string, any>
  isMobile: boolean
}

const Filters: React.FC<FiltersProps> = ({
  filterDesign,
  setFilterDesign,
  searchTerm,
  setSearchTerm,
  paintRequirements,
  isMobile
}) => {
  return (
    <div className={cn(isMobile ? "space-y-4" : "flex space-x-4 mb-6")}>
      <Select value={filterDesign} onValueChange={setFilterDesign}>
        <SelectTrigger className={cn(isMobile ? "w-full" : "w-[180px]")}>
          <SelectValue placeholder="Filter by design" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Designs</SelectItem>
          {Object.keys(paintRequirements).map(design => (
            <SelectItem key={design} value={design}>{design}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative flex-grow">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-10 pr-4 py-2 w-full"
          placeholder="Search designs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
    </div>
  )
}

export default Filters
