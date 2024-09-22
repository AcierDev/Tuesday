// File: ItemBox.tsx

import React from 'react'

import { cn } from "@/utils/functions"

interface ItemBoxProps {
  itemType: 'box' | 'hardwareBag' | 'mountingRail'
  itemName: string
  count: number
  isLocked: boolean
  isMobile: boolean
  handleItemClick: (itemType: 'box' | 'hardwareBag' | 'mountingRail', itemName: string, isLocked: boolean) => void
}

const ItemBox: React.FC<ItemBoxProps> = ({
  itemType,
  itemName,
  count,
  isLocked,
  isMobile,
  handleItemClick
}) => {
  const backgroundColor = itemType === 'box' ? (itemName === "Custom" ? "black" : itemName.toLowerCase().split(" ").at(0)) : 'gray'
  
  return (
    <div 
      key={`${itemType}-${itemName}-${isLocked}`} 
      className={cn(
        "bg-gray-100 p-4 rounded-lg cursor-pointer transition-all duration-200",
        isLocked ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-gray-200"
      )}
      onClick={() => handleItemClick(itemType, itemName, isLocked)}
    >
      <div 
        style={{ backgroundColor }}
        className={cn(
          "rounded-md flex items-center justify-center text-white font-semibold mb-2",
          isMobile ? "w-8 h-8 text-sm" : "w-16 h-16 text-lg"
        )}
      >
        <span>{count}</span>
      </div>
      <h4 className={cn("font-semibold mb-2", isMobile ? "text-xs" : "text-sm")}>{itemName}</h4>
      <p className={cn("text-gray-600", isMobile ? "text-xs" : "text-sm")}>
        {isLocked ? "prepared" : "to prepare"}
      </p>
    </div>
  )
}

export default ItemBox
