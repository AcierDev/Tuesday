import { ScrollArea } from "@/components/ui/scroll-area"
import { ColumnTitles, type Item, type ItemDesigns, type ItemSizes } from "@/typings/types"

interface ExpandedDayDetailsProps {
  items: Item[]
  type: 'box' | 'paint'
}

export const ExpandedDayDetails = ({ items, type }: ExpandedDayDetailsProps) => {
  return (
    <div className="h-full">
      <ScrollArea className="h-full pr-4">
        <h3 className="text-lg font-semibold mb-4">Items for the Day</h3>
        <ul className="space-y-2">
          {items.map((item) => {
            const customerName = item.customerName
            const size = item.size as ItemSizes
            const design = item.design as ItemDesigns
            return (
              <li key={item.id} className="bg-gray-50 p-2 rounded">
                <p className="font-medium">{customerName}</p>
                <p className="text-sm text-gray-600">Size: {size}</p>
                {type === 'paint' && <p className="text-sm text-gray-600">Design: {design}</p>}
              </li>
            )
          })}
        </ul>
      </ScrollArea>
    </div>
  )
}