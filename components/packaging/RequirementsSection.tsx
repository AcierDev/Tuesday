// components/packaging/RequirementsSection.tsx
'use client'

import ItemBox from '@/components/packaging/ItemBox'
import { Card, CardContent } from "@/components/ui/card"
import { type BoxRequirement, type HardwareBagRequirement, type MountingRailRequirement } from '@/typings/interfaces'
import { BOX_COLORS } from '@/utils/constants'
import { cn } from "@/utils/functions"

interface RequirementsSectionProps {
  boxRequirements: BoxRequirement
  hardwareBagRequirements: HardwareBagRequirement
  mountingRailRequirements: MountingRailRequirement
  lockedBoxes: Record<string, number>
  lockedHardwareBags: Record<string, number>
  lockedMountingRails: Record<string, number>
  handleItemClick: (itemType: 'box' | 'hardwareBag' | 'mountingRail', itemName: string, isLocked: boolean) => void
  isMobile: boolean
}

const RequirementsSection: React.FC<RequirementsSectionProps> = ({
  boxRequirements,
  hardwareBagRequirements,
  mountingRailRequirements,
  lockedBoxes,
  lockedHardwareBags,
  lockedMountingRails,
  handleItemClick,
  isMobile
}) => {
  return (
    <>
      <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
        <Card>
          <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
            <h3 className={cn("font-semibold mb-4", isMobile ? "text-lg" : "text-xl")}>Boxes Already Made</h3>
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            )}>
              {Object.entries(lockedBoxes).map(([color, count]) => (
                <ItemBox 
                  key={`locked-box-${color}`}
                  isLocked
                  count={count}
                  handleItemClick={handleItemClick}
                  isMobile={isMobile}
                  itemName={color}
                  itemType='box'
                />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
            <h3 className={cn("font-semibold mb-4", isMobile ? "text-lg" : "text-xl")}>Boxes To Be Made</h3>
            <div className={cn(
              "grid gap-4",
              isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
            )}>
              {Object.entries(boxRequirements).map(([color, count]) => {
                if (count > 0) {
                  return (
                    <ItemBox 
                      key={`box-req-${color}`}
                      count={count}
                      handleItemClick={handleItemClick}
                      isLocked={false}
                      isMobile={isMobile}
                      itemName={color}
                      itemType='box'
                    />
                  )
                }
                return null
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Similar sections can be created for Hardware Bags and Mounting Rails */}
    </>
  )
}

export default RequirementsSection
