// components/packaging/SummaryCards.tsx
'use client'

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/utils/functions"

interface SummaryCardsProps {
  totalBoxes: number
  uniqueBoxColors: number
  selectedDates: number
  isMobile: boolean
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  totalBoxes,
  uniqueBoxColors,
  selectedDates,
  isMobile
}) => {
  return (
    <div className={cn("grid gap-6", isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3")}>
      <Card>
        <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
          <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Total Boxes</h3>
          <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{totalBoxes}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
          <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Box Colors</h3>
          <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{uniqueBoxColors}</p>
        </CardContent>
      </Card>
      {!isMobile && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-2">Selected Days</h3>
            <p className="text-xl font-semibold">{selectedDates}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default SummaryCards
