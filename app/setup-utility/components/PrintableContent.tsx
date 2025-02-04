"use client";

import { Design, ColorDistribution } from "../types";
import { ItemSizes } from "@/typings/types";

interface PrintableContentProps {
  design: Design;
  size: ItemSizes | "custom";
  colorDistribution: ColorDistribution;
}

export function PrintableContent({
  design,
  size,
  colorDistribution,
}: PrintableContentProps) {
  return (
    <div
      className="printable-content p-4"
      style={{ width: "4in", height: "6in" }}
    >
      <h1 className="text-lg font-bold mb-2">Design Summary</h1>

      <div className="space-y-2 text-sm">
        <div>
          <h2 className="font-semibold">Design Info</h2>
          <p>Name: {design.name}</p>
          <p>Size: {size}</p>
          <p>Colors: {design.colors.length}</p>
        </div>

        <div>
          <h2 className="font-semibold">Pieces</h2>
          <p>Total: {colorDistribution.totalPieces}</p>
          <p>
            Adjustment: {colorDistribution.adjustmentCount} pieces{" "}
            {colorDistribution.adjustmentType === "add"
              ? "added"
              : "subtracted"}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <h2 className="font-semibold text-sm mb-1">Color Distribution</h2>
        <div className="grid grid-cols-2 gap-1 text-xs">
          {colorDistribution.distribution.map(({ color, count }, index) => (
            <div key={index} className="flex items-center space-x-1">
              <div
                style={{
                  backgroundColor: color,
                  width: "0.75rem",
                  height: "0.75rem",
                  border: "1px solid #000",
                }}
              />
              <p>
                {count} (
                {((count / colorDistribution.totalPieces) * 100).toFixed(1)}%)
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2">
        <h2 className="font-semibold text-sm mb-1">Visual</h2>
        <div className="w-full flex flex-wrap border border-black">
          {colorDistribution.distribution.map(({ color, count }, index) => (
            <div
              key={index}
              style={{
                backgroundColor: color,
                width: `${(count / colorDistribution.totalPieces) * 100}%`,
                height: "0.5rem",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
