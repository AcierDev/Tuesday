import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Printer } from 'lucide-react'
import { ShippingRate } from "@/typings/interfaces";

interface ShippingRatesTableProps {
  rates: ShippingRate[];
  isLoading: boolean;
  onPrintLabel: (rate: ShippingRate) => void;
}

const ShippingRatesTable: React.FC<ShippingRatesTableProps> = ({ rates, isLoading, onPrintLabel: onBuyLabel }) => {
  return (
    <Card className="mt-6 border border-gray-200">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Shipping Rates Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Carrier</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Cost per Box</TableHead>
              <TableHead>Total Cost</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate) => (
              <TableRow key={`${rate.serviceName.split(" ")[0]}-${rate.serviceName}`}>
                <TableCell className="font-medium">{rate.serviceName.split(" ")[0]}</TableCell>
                <TableCell>{rate.serviceName}</TableCell>
                <TableCell>${(rate.totalCost / rate.boxes).toFixed(2)}</TableCell>
                <TableCell>${rate.totalCost.toFixed(2)}</TableCell>
                <TableCell>
                  <Button 
                    className="border-black text-black hover:bg-gray-100" 
                    disabled={isLoading} 
                    size="sm" 
                    variant="outline"
                    onClick={() => onBuyLabel(rate)}
                  >
                    <Printer className="mr-2 h-4 w-4" /> {isLoading ? 'Processing...' : 'Print Label'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export default ShippingRatesTable