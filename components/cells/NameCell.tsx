"use client"

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command'
import { parseMinecraftColors } from '../../parseMinecraftColors'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

interface Tag {
  id: string
  name: string
}

interface NameCellProps {
  item: any
  columnValue: {
    text: string
    columnName: string
  }
  onUpdate: (updatedItem: any, columnName: string) => Promise<void>
  allTags: Tag[]
  onAddTag: (itemId: string, tagId: string) => void
}

export const NameCell: React.FC<NameCellProps> = ({ item, columnValue, onUpdate, allTags, onAddTag }) => {
  const [inputValue, setInputValue] = useState(columnValue.text || '')
  const [isHovered, setIsHovered] = useState(false)
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'

  useEffect(() => {
    setInputValue(columnValue.text || '')
  }, [columnValue.text])

  const handleUpdate = async () => {
    if (inputValue !== columnValue.text) {
      try {
        const updatedItem = {
          ...item,
          values: item.values.map((value) =>
            value.columnName === columnValue.columnName
              ? { ...value, text: inputValue, lastModifiedTimestamp: Date.now() }
              : value
          )
        }
        await onUpdate(updatedItem, columnValue.columnName)
        toast.success("Name updated successfully")
      } catch (err) {
        console.error("Failed to update ColumnValue", err)
        toast.error("Failed to update the name. Please try again.")
      }
    }
  }

  const handleAddTag = (tag: Tag) => {
    onAddTag(item.id, tag.id)
    toast.success(`Tag "${tag.name}" added successfully`)
  }

  return (
    <div 
      className="flex items-center w-full h-full relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && (
        <Popover>
          <PopoverTrigger asChild>
            <Plus className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-pointer absolute left-2" />
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {[{name: 'Test', id: 1}, {name: 'Test 2', id: 2}].filter(tag => !item.tags?.some((t: Tag) => t.id === tag.id)).map((tag) => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => handleAddTag(tag)}
                    className="cursor-pointer"
                  >
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      )}
      <div className="flex items-center space-x-2 w-full pl-8">
        <Input
          className="font-medium border-0 p-2 bg-transparent w-full text-center text-transparent caret-black dark:caret-white"
          value={inputValue}
          onBlur={handleUpdate}
          onChange={(e) => setInputValue(e.target.value)}
        />
        {item.vertical ? (
          <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-700 whitespace-nowrap">
            Vertical
          </Badge>
        ) : null}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-900 dark:text-gray-100">
        <span className="whitespace-pre-wrap">
          {parseMinecraftColors(inputValue, isDarkMode)}
        </span>
      </div>
    </div>
  )
}