import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/utils/functions"
import { Card, CardContent } from "@/components/ui/card"

interface SummaryTabsProps {
  activeTab: string
  setActiveTab: (value: string) => void
  totalPieces: number
  filteredRequirements: [string, Record<string, number>][]
  filteredRequirementsLength: number
  selectedDatesLength: number
  isMobile: boolean
}

const SummaryTabs: React.FC<SummaryTabsProps> = ({
  activeTab,
  setActiveTab,
  totalPieces,
  filteredRequirements,
  filteredRequirementsLength,
  selectedDatesLength,
  isMobile
}) => {

  const renderColorBox = (design: string, color: string | number, pieces: number) => {
    let backgroundColor: string;

    // Example color mapping logic. Adjust based on actual color constants.
    // Replace with actual color logic or import color mappings.
    if (typeof color === 'string') {
      backgroundColor = `#${color}` // Assuming color is a hex code string
    } else {
      const hue = (color * 30) % 360
      backgroundColor = `hsl(${hue}, 70%, 50%)`
    }

    return (
      <div key={color} className="flex flex-col items-center">
        <div 
          style={{ backgroundColor }}
          className={cn(
            "rounded-md flex items-center justify-center text-white font-semibold",
            isMobile ? "w-8 h-8 text-xs" : "w-12 h-12 text-sm"
          )}
        >
          <span>{pieces}</span>
        </div>
        <span className={cn("mt-1 font-medium", isMobile ? "text-xs" : "text-sm")}>{color}</span>
      </div>
    )
  }

  return (
    <div className="flex-grow mt-4 overflow-hidden">
      <Tabs className="h-full flex flex-col" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={cn(
          "w-full justify-start pt-2 bg-transparent border-b",
          isMobile ? "px-2" : "px-6"
        )}>
          <TabsTrigger 
            value="overview" 
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:border-b-2 rounded-none",
              isMobile ? "flex-1" : ""
            )}
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="details" 
            className={cn(
              "data-[state=active]:bg-background data-[state=active]:shadow-none data-[state=active]:border-primary data-[state=active]:border-b-2 rounded-none",
              isMobile ? "flex-1" : ""
            )}
          >
            Details
          </TabsTrigger>
        </TabsList>
        <TabsContent className="flex-grow overflow-auto" value="overview">
          <ScrollArea className="h-full">
            <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
              {/* Summary Cards */}
              <div className={cn("grid gap-6", isMobile ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
                <Card>
                  <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
                    <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Total Pieces</h3>
                    <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{totalPieces}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className={cn("flex flex-col justify-center", isMobile ? "p-4" : "p-6")}>
                    <h3 className={cn("font-semibold mb-2", isMobile ? "text-sm" : "text-lg")}>Designs</h3>
                    <p className={cn("font-bold", isMobile ? "text-2xl" : "text-4xl")}>{filteredRequirementsLength}</p>
                  </CardContent>
                </Card>
                {!isMobile && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-2">Selected Days</h3>
                      <p className="text-xl font-semibold">{selectedDatesLength}</p>
                    </CardContent>
                  </Card>
                )}
              </div>
              {/* Design Overview */}
              <Card>
                <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                  <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>Design Overview</h3>
                  <div className={cn(
                    "grid gap-4",
                    isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                  )}>
                    {filteredRequirements.map(([design, colorRequirements]) => (
                      <div key={design} className="bg-gray-100 p-4 rounded-lg">
                        <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>{design}</h4>
                        <p className={cn("font-bold", isMobile ? "text-lg" : "text-2xl")}>
                          {Object.values(colorRequirements).reduce((sum, pieces) => sum + pieces, 0)}
                        </p>
                        <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>pieces</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent className="flex-grow overflow-hidden" value="details">
          <ScrollArea className="h-full">
            <div className={cn("space-y-6", isMobile ? "p-4" : "p-6")}>
              {filteredRequirements.map(([design, colorRequirements]) => (
                <Card key={design}>
                  <CardContent className={cn(isMobile ? "p-4" : "p-6")}>
                    <h3 className={cn("font-semibold mb-4", isMobile ? "text-sm" : "text-lg")}>{design}</h3>
                    <div className={cn(
                      "grid gap-4",
                      isMobile ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10"
                    )}>
                      {Object.entries(colorRequirements).map(([color, pieces]) => 
                        <ColorBox 
                          key={color} 
                          design={design} 
                          color={color} 
                          pieces={pieces} 
                          isMobile={isMobile} 
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface ColorBoxProps {
  design: string
  color: string | number
  pieces: number
  isMobile: boolean
}

const ColorBox: React.FC<ColorBoxProps> = ({ design, color, pieces, isMobile }) => {
  let backgroundColor: string;

  // Define color mapping based on design
  // Replace with actual color logic or import color mappings
  switch (design) {
    case "Coastal":
      backgroundColor = "#00ADEF" // Example color
      break
    case "Amber":
      backgroundColor = "#FFBF00"
      break
    // Add other cases as needed
    default:
      backgroundColor = typeof color === 'number' ? `hsl(${(color * 30) % 360}, 70%, 50%)` : '#6B7280'
  }

  return (
    <div className="flex flex-col items-center">
      <div 
        style={{ backgroundColor }}
        className={cn(
          "rounded-md flex items-center justify-center text-white font-semibold",
          isMobile ? "w-8 h-8 text-xs" : "w-12 h-12 text-sm"
        )}
      >
        <span>{pieces}</span>
      </div>
      <span className={cn("mt-1 font-medium", isMobile ? "text-xs" : "text-sm")}>{color}</span>
    </div>
  )
}

export default SummaryTabs
