import ItemBox from '@/components/packaging/ItemBox'
import { Card, CardContent } from "@/components/ui/card"
import { type HardwareBagRequirement } from '@/typings/interfaces'
import { cn } from "@/utils/functions"

interface HardwareBagOverviewProps {
  hardwareBagRequirements: HardwareBagRequirement
  lockedHardwareBags: Record<string, number>
  handleItemClick: (itemType: 'hardwareBag', itemName: string, isLocked: boolean) => void
  isMobile: boolean
}

export default function Component({
  hardwareBagRequirements,
  lockedHardwareBags,
  handleItemClick,
  isMobile
}: HardwareBagOverviewProps) {
  return (
    <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-2")}>
      <Card>
        <CardContent className={cn("flex flex-col", isMobile ? "p-4" : "p-6")}>
          <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Already Prepared</h3>
          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          )}>
            {Object.entries(lockedHardwareBags).map(([bagType, count]) => (
              <ItemBox 
                key={`locked-hardware-${bagType}`}
                isLocked
                count={count}
                handleItemClick={handleItemClick}
                isMobile={isMobile}
                itemName={bagType}
                itemType='hardwareBag'
              />
            ))}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className={cn("flex flex-col", isMobile ? "p-4" : "p-6")}>
          <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>To Be Prepared</h3>
          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          )}>
            {Object.entries(hardwareBagRequirements).map(([bagType, count]) => {
              if (count > 0) {
                return (
                  <ItemBox 
                    key={`hardware-req-${bagType}`}
                    count={count}
                    handleItemClick={handleItemClick}
                    isLocked={false}
                    isMobile={isMobile}
                    itemName={bagType}
                    itemType='hardwareBag'
                  />
                )
              }
              return null
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}