// components/packaging/MountingRailsOverview.tsx
'use client'

import ItemBox from '@/components/packaging/ItemBox'
import { Card, CardContent } from "@/components/ui/card"
import { type MountingRailRequirement } from '@/typings/interfaces'
import { cn } from "@/utils/functions"

interface MountingRailsOverviewProps {
  mountingRailRequirements: MountingRailRequirement
  lockedMountingRails: Record<string, number>
  handleItemClick: (itemType: 'mountingRail', itemName: string, isLocked: boolean) => void
  isMobile: boolean
}

const MountingRailsOverview: React.FC<MountingRailsOverviewProps> = ({
  mountingRailRequirements,
  lockedMountingRails,
  handleItemClick,
  isMobile
}) => {
  return (
    <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2")}>
      <Card>
        <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
          <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Mounting Rails Already Prepared</h3>
          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          )}>
            {Object.entries(lockedMountingRails).map(([railType, count]) => (
              <ItemBox 
                key={`locked-rail-${railType}`}
                isLocked
                count={count}
                handleItemClick={handleItemClick}
                isMobile={isMobile}
                itemName={railType}
                itemType='mountingRail'
              />
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
          <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Mounting Rails To Be Prepared</h3>
          <div className={cn(
            "grid gap-4",
            isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
          )}>
            {Object.entries(mountingRailRequirements).map(([railType, count]) => {
              if (count > 0) {
                return (
                  <ItemBox 
                    key={`rail-req-${railType}`}
                    count={count}
                    handleItemClick={handleItemClick}
                    isLocked={false}
                    isMobile={isMobile}
                    itemName={railType}
                    itemType='mountingRail'
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

export default MountingRailsOverview
