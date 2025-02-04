"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import Image from "next/image";
import styles from "../styles.module.css";
import { Design } from "../types";

interface DesignSelectorProps {
  designs: Design[];
  selectedDesign: Design | null;
  setSelectedDesign: (design: Design) => void;
  isDesignSectionExpanded: boolean;
  setIsDesignSectionExpanded: (expanded: boolean) => void;
  showAdditionalSections: boolean;
  setShowAdditionalSections: (show: boolean) => void;
}

export function DesignSelector({
  designs,
  selectedDesign,
  setSelectedDesign,
  isDesignSectionExpanded,
  setIsDesignSectionExpanded,
  showAdditionalSections,
  setShowAdditionalSections,
}: DesignSelectorProps) {
  const renderDesignButton = (design: Design, closeOnSelect = false) => (
    <motion.button
      key={design.id}
      onClick={() => {
        setSelectedDesign(design);
        if (closeOnSelect) {
          setIsDesignSectionExpanded(false);
        }
      }}
      className={`${styles.designButton} ${
        selectedDesign?.id === design.id ? styles.selected : ""
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
      <p className={styles.designName}>{design.name}</p>
    </motion.button>
  );

  const renderDesignCategory = (category: "striped" | "tiled") => {
    const categoryDesigns = designs.filter(
      (design) => design.category === category
    );

    if (categoryDesigns.length === 0) return null;

    return (
      <motion.div className="space-y-3">
        <div className={styles.sectionHeader}>
          <div className={styles.divider} />
        </div>
        <div className={styles.additionalSectionGrid}>
          {categoryDesigns.map((design) => (
            <motion.button
              key={design.id}
              onClick={() => {
                setSelectedDesign(design);
                setIsDesignSectionExpanded(false);
              }}
              className={`relative p-2 rounded-lg border-2 transition-all ${
                selectedDesign?.id === design.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-transparent hover:border-blue-300 dark:hover:border-blue-700"
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
    );
  };

  return (
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
                      .filter((design) => design.category === "geometric")
                      .map((design) => renderDesignButton(design, true))}
                  </div>
                </motion.div>

                {/* Additional Categories */}
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
                      {renderDesignCategory("striped")}
                      {renderDesignCategory("tiled")}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Show More Button - Moved to bottom */}
                <motion.button
                  onClick={() =>
                    setShowAdditionalSections(!showAdditionalSections)
                  }
                  className="w-full flex items-center justify-center gap-2 py-3 text-gray-700 dark:text-gray-300 
                    hover:text-gray-900 dark:hover:text-gray-100 border-2 border-gray-200 dark:border-gray-700 
                    rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:bg-gray-50 
                    dark:hover:bg-gray-800/50 transition-all"
                >
                  <span className="font-medium">
                    {showAdditionalSections ? "Show Less" : "Show More"}
                  </span>
                  <motion.div
                    animate={{ rotate: showAdditionalSections ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </motion.div>
                </motion.button>
              </motion.div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
