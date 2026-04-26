"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Design } from "../types";

interface DesignDetailsProps {
  design: Design;
  getImageDimensions: (url: string) => { width: number; height: number };
}

export function DesignDetails({
  design,
  getImageDimensions,
}: DesignDetailsProps) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">
          {design.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10">
          <Image
            src={design.imageUrl}
            alt={design.name}
            width={getImageDimensions(design.imageUrl).width}
            height={getImageDimensions(design.imageUrl).height}
            className="w-full h-auto"
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-gray-900 dark:text-gray-100">
            Number of colors: {design.colors.length}
          </p>
          {new Set(design.colors).size !== design.colors.length && (
            <>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-400" />
              <p className="text-gray-900 dark:text-gray-100">
                Number of unique colors: {new Set(design.colors).size}
              </p>
            </>
          )}
        </div>
        <div className="h-8 w-full flex overflow-hidden rounded-lg ring-1 ring-black/5 dark:ring-white/10">
          {design.colors.map((color, index) => (
            <div
              key={index}
              style={{
                backgroundColor: color,
                width: `${100 / design.colors.length}%`,
              }}
              className="h-full"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
