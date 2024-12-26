"use client";

import { Suspense, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { DESIGN_COLORS, ItemDesignImages } from "@/typings/constants";
import { ItemDesigns, ItemSizes } from "@/typings/types";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import styles from './styles.module.css';

type DesignCategory = 'geometric' | 'striped' | 'tiled';

interface Design {
  id: string;
  name: string;
  imageUrl: string;
  colors: string[];
  category: DesignCategory;
}

const designs: Design[] = Object.values(ItemDesigns).map((design, index) => {
  const category: DesignCategory = design.toLowerCase().includes('stripe') 
    ? 'striped' 
    : design.toLowerCase().includes('tile') 
      ? 'tiled' 
      : 'geometric';

  return {
    id: index.toString(),
    name: design,
    imageUrl: ItemDesignImages[design],
    colors: Object.values(DESIGN_COLORS[design] ?? {})?.map((val) => val.hex),
    category,
  };
});

function UtilitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(
    designs[0]!
  );
  const [selectedSize, setSelectedSize] = useState<ItemSizes | "custom">(
    ItemSizes.TwentyEight_By_Sixteen
  );
  const [width, setWidth] = useState<string>("14");
  const [height, setHeight] = useState<string>("7");
  const [showBackButton, setShowBackButton] = useState(false);
  const [isDesignSectionExpanded, setIsDesignSectionExpanded] = useState(false);
  const [showAdditionalSections, setShowAdditionalSections] = useState(false);

  useEffect(() => {
    const designId = searchParams.get("design");
    const size = searchParams.get("size");

    if (designId) {
      const design = designs.find((d) => d.name === designId);
      if (design) setSelectedDesign(design);
    }

    if (size) {
      if (Object.values(ItemSizes).includes(size as ItemSizes)) {
        setSelectedSize(size as ItemSizes);
        const [w, h] = size.split("x").map((dim) => dim.trim());
        setWidth(w);
        setHeight(h);
      }
    }

    setShowBackButton(!!document.referrer);
  }, [searchParams]);

  const calculateColorCount = () => {
    if (!selectedDesign || !width || !height) return null;

    const totalPieces = parseInt(width) * parseInt(height);
    const colorCount = selectedDesign.colors.length;
    const averagePiecesPerColor = totalPieces / colorCount;

    const basePiecesPerColor1 = Math.floor(averagePiecesPerColor);
    const extrasToAdd = totalPieces - basePiecesPerColor1 * colorCount;

    const basePiecesPerColor2 = Math.ceil(averagePiecesPerColor);
    const extrasToSubtract = basePiecesPerColor2 * colorCount - totalPieces;

    const useMethod1 = extrasToAdd <= extrasToSubtract;

    const basePiecesPerColor = useMethod1
      ? basePiecesPerColor1
      : basePiecesPerColor2;
    const adjustmentCount = useMethod1 ? extrasToAdd : extrasToSubtract;
    const adjustmentType = useMethod1 ? "add" : "subtract";

    const distribution = selectedDesign.colors.map((color) => ({
      color,
      count: basePiecesPerColor,
    }));

    for (let i = 0; i < adjustmentCount; i++) {
      const index = Math.floor(i * (colorCount / adjustmentCount));
      distribution[index].count += useMethod1 ? 1 : -1;
    }

    return {
      totalPieces,
      colorCount,
      distribution,
      adjustmentCount,
      adjustmentType,
    };
  };

  useEffect(() => {
    if (selectedSize !== "custom") {
      const [w, h] = selectedSize.split("x").map((dim) => dim.trim());
      setWidth(w);
      setHeight(h);
    }
  }, [selectedSize]);

  const handleSizeChange = (value: string) => {
    setSelectedSize(value as ItemSizes | "custom");
  };

  const handleDimensionChange = (
    dimension: "width" | "height",
    value: string
  ) => {
    if (dimension === "width") {
      setWidth(value);
    } else {
      setHeight(value);
    }

    const newSize = `${width} x ${height}`;
    if (Object.values(ItemSizes).includes(newSize as ItemSizes)) {
      setSelectedSize(newSize as ItemSizes);
    } else {
      setSelectedSize("custom");
    }
  };

  const colorDistribution = calculateColorCount();

  const getImageDimensions = (url: string) => {
    const params = new URLSearchParams(url.split("?")[1]);
    return {
      width: parseInt(params.get("width") || "0"),
      height: parseInt(params.get("height") || "0"),
    };
  };

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div className="container mx-auto p-4 space-y-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {showBackButton && (
          <div className="bg-white dark:bg-gray-800 p-2 rounded-md shadow-sm inline-block">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="p-0 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
          </div>
        )}

        <h1 className="text-3xl font-bold">Setup Utility</h1>

        <Card className="bg-white dark:bg-gray-800">
          <motion.div>
            <CardHeader 
              className="cursor-pointer flex flex-row items-center justify-between"
              onClick={() => setIsDesignSectionExpanded(!isDesignSectionExpanded)}
            >
              <CardTitle className="text-gray-900 dark:text-gray-100">
                Select a Design
              </CardTitle>
              <Button variant="ghost" size="sm" className="p-0">
                <motion.div
                  animate={{ rotate: isDesignSectionExpanded ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronDown className="h-5 w-5" />
                </motion.div>
              </Button>
            </CardHeader>
          </motion.div>
          <AnimatePresence>
            {isDesignSectionExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{ overflow: "hidden" }}
              >
                <CardContent>
                  <motion.div className="space-y-4">
                    {/* Geometric Designs */}
                    <motion.div className="space-y-3">
                      <div className={styles.designGrid}>
                        {designs
                          .filter(design => design.category === 'geometric')
                          .map((design) => (
                            <motion.button
                              key={design.id}
                              onClick={() => {
                                setSelectedDesign(design);
                                setIsDesignSectionExpanded(false);
                                setShowAdditionalSections(false);
                              }}
                              className={`${styles.designButton} ${
                                selectedDesign?.id === design.id ? styles.selected : ''
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              layout
                            >
                              <div className={styles.imageContainer}>
                                <Image
                                  src={design.imageUrl}
                                  alt={design.name}
                                  fill
                                  className={styles.image}
                                />
                              </div>
                              <p className={styles.designName}>
                                {design.name}
                              </p>
                            </motion.button>
                          ))}
                      </div>
                    </motion.div>

                    {/* Show More Button */}
                    <motion.button
                      onClick={() => setShowAdditionalSections(!showAdditionalSections)}
                      className="w-full flex items-center justify-center gap-2 py-3 text-gray-700 dark:text-gray-300 
                        hover:text-gray-900 dark:hover:text-gray-100 border-2 border-gray-200 dark:border-gray-700 
                        rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 
                        dark:hover:bg-gray-800/50 transition-all"
                    >
                      <span className="font-medium">
                        {showAdditionalSections ? 'Show Less' : 'Show More'}
                      </span>
                      <motion.div
                        animate={{ rotate: showAdditionalSections ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ChevronDown className="h-5 w-5" />
                      </motion.div>
                    </motion.button>

                    {/* Additional Sections */}
                    <AnimatePresence>
                      {showAdditionalSections && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                          style={{ overflow: "hidden" }}
                        >
                          {/* Striped Designs */}
                          {designs.some(design => design.category === 'striped') && (
                            <motion.div className="space-y-3">
                              <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}>
                                  Striped
                                </h3>
                                <div className={styles.divider} />
                              </div>
                              <div className={styles.additionalSectionGrid}>
                                {designs
                                  .filter(design => design.category === 'striped')
                                  .map((design) => (
                                    <motion.button
                                      key={design.id}
                                      onClick={() => {
                                        setSelectedDesign(design);
                                        setIsDesignSectionExpanded(false);
                                      }}
                                      className={`relative p-2 rounded-lg border-2 transition-all ${
                                        selectedDesign?.id === design.id
                                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                          : 'border-transparent hover:border-blue-300 dark:hover:border-blue-700'
                                      }`}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      layout
                                    >
                                      <div className="aspect-[2/1] relative mb-1">
                                        <Image
                                          src={design.imageUrl}
                                          alt={design.name}
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
                                        {design.name}
                                      </p>
                                    </motion.button>
                                  ))}
                              </div>
                            </motion.div>
                          )}

                          {/* Tiled Designs */}
                          {designs.some(design => design.category === 'tiled') && (
                            <motion.div className="space-y-3">
                              <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}>
                                  Tiled
                                </h3>
                                <div className={styles.divider} />
                              </div>
                              <div className={styles.additionalSectionGrid}>
                                {designs
                                  .filter(design => design.category === 'tiled')
                                  .map((design) => (
                                    <motion.button
                                      key={design.id}
                                      onClick={() => {
                                        setSelectedDesign(design);
                                        setIsDesignSectionExpanded(false);
                                      }}
                                      className={`relative p-2 rounded-lg border-2 transition-all ${
                                        selectedDesign?.id === design.id
                                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                          : 'border-transparent hover:border-blue-300 dark:hover:border-blue-700'
                                      }`}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                      layout
                                    >
                                      <div className="aspect-[2/1] relative mb-1">
                                        <Image
                                          src={design.imageUrl}
                                          alt={design.name}
                                          fill
                                          className="object-contain"
                                        />
                                      </div>
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 text-center">
                                        {design.name}
                                      </p>
                                    </motion.button>
                                  ))}
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {selectedDesign && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100">
                  {selectedDesign.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Image
                    src={selectedDesign.imageUrl}
                    alt={selectedDesign.name}
                    width={getImageDimensions(selectedDesign.imageUrl).width}
                    height={getImageDimensions(selectedDesign.imageUrl).height}
                    className="w-full h-auto"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-900 dark:text-gray-100">
                    Number of colors: {selectedDesign.colors.length}
                  </p>
                  {new Set(selectedDesign.colors).size !== selectedDesign.colors.length && (
                    <>
                      <div className="h-6 w-px bg-gray-300 dark:bg-gray-400" />
                      <p className="text-gray-900 dark:text-gray-100">
                        Number of unique colors: {new Set(selectedDesign.colors).size}
                      </p>
                    </>
                  )}
                </div>
                <div className="h-8 w-full flex">
                  {selectedDesign.colors.map((color, index) => (
                    <div
                      key={index}
                      style={{
                        backgroundColor: color,
                        width: `${100 / selectedDesign.colors.length}%`,
                      }}
                      className="h-full"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-gray-100">
                  Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="size-select"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Choose a size:
                  </Label>
                  <Select value={selectedSize} onValueChange={handleSizeChange}>
                    <SelectTrigger
                      id="size-select"
                      className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <SelectValue placeholder="Choose a size" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-gray-700">
                      {Object.values(ItemSizes).map((size) => (
                        <SelectItem
                          key={size}
                          value={size}
                          className="text-gray-900 dark:text-gray-100"
                        >
                          {size}
                        </SelectItem>
                      ))}
                      <SelectItem
                        value="custom"
                        className="text-gray-900 dark:text-gray-100"
                      >
                        Custom
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="custom-width"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Dimensions:
                  </Label>
                  <div className="flex space-x-2">
                    <Input
                      id="custom-width"
                      type="number"
                      placeholder="Width"
                      value={width}
                      onChange={(e) =>
                        handleDimensionChange("width", e.target.value)
                      }
                      className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                    <Input
                      id="custom-height"
                      type="number"
                      placeholder="Height"
                      value={height}
                      onChange={(e) =>
                        handleDimensionChange("height", e.target.value)
                      }
                      className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                {colorDistribution && (
                  <>
                    <Card className="bg-white dark:bg-gray-700">
                      <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-gray-100">
                          Total Pieces
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-900 dark:text-gray-100">
                          {colorDistribution.totalPieces}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-700">
                      <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-gray-100">
                          Adjustment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-900 dark:text-gray-100">
                          {colorDistribution.adjustmentCount} pieces{" "}
                          {colorDistribution.adjustmentType === "add"
                            ? "added to"
                            : "subtracted from"}{" "}
                          colors, spread evenly across the design
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-gray-700">
                      <CardHeader>
                        <CardTitle className="text-gray-900 dark:text-gray-100">
                          Distribution Diagram
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="w-full flex flex-wrap">
                          {colorDistribution.distribution.map(
                            ({ color, count }, index) => (
                              <div
                                key={index}
                                style={{
                                  backgroundColor: color,
                                  width: `${
                                    (count / colorDistribution.totalPieces) *
                                    100
                                  }%`,
                                }}
                                className="h-10 relative group h-20 flex items-center justify-center"
                              >
                                <span className="text-xs font-bold text-white text-shadow">
                                  {count}
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Suspense>
  );
}

export default function UtilitiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SearchParamsWrapper>
        {(searchParams) => <UtilitiesContent searchParams={searchParams} />}
      </SearchParamsWrapper>
    </Suspense>
  );
}

function SearchParamsWrapper({ children }) {
  const searchParams = useSearchParams();
  return children(searchParams);
}
