// BoxInputs.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Copy, Minus } from "lucide-react";
import { Box } from "@/typings/interfaces";

interface BoxInputsProps {
  boxes: Box[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, field: keyof Box, value: string) => void;
}

const BoxInputs: React.FC<BoxInputsProps> = (
  { boxes, onAdd, onRemove, onUpdate },
) => {
  return (
    <>
      {boxes.map((box, index) => (
        <Card
          key={index}
          className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
        >
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-1 relative">
                <Input
                  className="pr-12 border-gray-300 dark:border-gray-600 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Length"
                  value={box.length}
                  onChange={(e) => onUpdate(index, "length", e.target.value)}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  inches
                </span>
              </div>
              <div className="col-span-1 relative">
                <Input
                  className="pr-12 border-gray-300 dark:border-gray-600 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Width"
                  value={box.width}
                  onChange={(e) => onUpdate(index, "width", e.target.value)}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  inches
                </span>
              </div>
              <div className="col-span-1 relative">
                <Input
                  className="pr-12 border-gray-300 dark:border-gray-600 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Height"
                  value={box.height}
                  onChange={(e) => onUpdate(index, "height", e.target.value)}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  inches
                </span>
              </div>
              <div className="col-span-1 relative">
                <Input
                  className="pr-10 border-gray-300 dark:border-gray-600 focus:ring-black dark:focus:ring-white focus:border-black dark:focus:border-white dark:bg-gray-700 dark:text-gray-100"
                  placeholder="Weight"
                  value={box.weight}
                  onChange={(e) => onUpdate(index, "weight", e.target.value)}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                  lbs
                </span>
              </div>
              <Button
                className="col-span-1 border-black dark:border-white text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
                size="icon"
                variant="outline"
                onClick={() => onRemove(index)}
              >
                <Minus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      <Button
        className="border-black dark:border-white text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 mt-2"
        size="sm"
        variant="outline"
        onClick={onAdd}
      >
        <Copy className="mr-2 h-4 w-4" /> Add Box
      </Button>
    </>
  );
};

export default BoxInputs;
