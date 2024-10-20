"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseMinecraftColors } from "../../parseMinecraftColors";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { ChevronRight, Plus, X } from "lucide-react";

interface Tag {
  id: string;
  name: string;
}

interface NameCellProps {
  item: any;
  columnValue: {
    text: string;
    columnName: string;
  };
  onUpdate: (updatedItem: any, columnName: string) => Promise<void>;
  onAddTag: (itemId: string, tagName: string) => void;
  onRemoveTag: (itemId: string, tagId: string) => void;
  initialTags: Tag[];
}

export const NameCell: React.FC<NameCellProps> = ({
  item,
  columnValue,
  onUpdate,
  onAddTag,
  onRemoveTag,
  initialTags,
}) => {
  const [inputValue, setInputValue] = useState(columnValue.text || "");
  const [isHovered, setIsHovered] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [showAllTags, setShowAllTags] = useState(false);
  const [tags, setTags] = useState<Tag[]>(initialTags);
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const tagInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(columnValue.text || "");
  }, [columnValue.text]);

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  useEffect(() => {
    if (isAddingTag && tagInputRef.current) {
      tagInputRef.current.focus();
    }
  }, [isAddingTag]);

  const handleUpdate = useCallback(async () => {
    if (inputValue !== columnValue.text) {
      try {
        const updatedItem = {
          ...item,
          values: item.values.map((value) =>
            value.columnName === columnValue.columnName
              ? {
                ...value,
                text: inputValue,
                lastModifiedTimestamp: Date.now(),
              }
              : value
          ),
        };
        await onUpdate(updatedItem, columnValue.columnName);
        toast.success("Name updated successfully");
      } catch (err) {
        console.error("Failed to update ColumnValue", err);
        toast.error("Failed to update the name. Please try again.");
      }
    }
  }, [inputValue, columnValue.text, columnValue.columnName, item, onUpdate]);

  const handleAddTag = useCallback(() => {
    if (newTagName.trim()) {
      const newTag = { id: Date.now().toString(), name: newTagName.trim() };
      setTags((prevTags) => [...(prevTags || []), newTag]);
      onAddTag(item.id, newTagName.trim());
      toast.success(`Tag "${newTagName.trim()}" added successfully`);
      setNewTagName("");
      setIsAddingTag(false);
    }
  }, [newTagName, item.id, onAddTag]);

  const handleRemoveTag = useCallback((tagId: string) => {
    setTags((prevTags) => prevTags?.filter((tag) => tag.id !== tagId));
    onRemoveTag(item.id, tagId);
    toast.success("Tag removed successfully");
  }, [item.id, onRemoveTag]);

  const toggleShowAllTags = useCallback(() => {
    setShowAllTags((prev) => !prev);
  }, []);

  const displayedTags = showAllTags ? tags : tags?.slice(0, 1);

  return (
    <div
      className="flex items-center w-full h-full relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Popover open={isAddingTag} onOpenChange={setIsAddingTag}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setIsAddingTag(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="sr-only">Add tag</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-2" align="start">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAddTag();
            }}
          >
            <Input
              ref={tagInputRef}
              placeholder="Enter new tag"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              className="mb-2"
            />
            <Button type="submit" size="sm" className="w-full">
              Add Tag
            </Button>
          </form>
        </PopoverContent>
      </Popover>
      <div className="flex items-center space-x-2 w-full pl-8">
        <Input
          className="font-medium border-0 p-2 bg-transparent w-full text-center text-transparent caret-black dark:caret-white"
          value={inputValue}
          onBlur={handleUpdate}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <div className="flex items-center space-x-1 min-w-fit">
          {displayedTags?.map((tag: Tag) => (
            <TooltipProvider key={tag.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="text-xs px-1 max-w-[60px] truncate cursor-pointer"
                  >
                    {tag.name}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{tag.name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1"
                    onClick={() => handleRemoveTag(tag.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {tags?.length > 1 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0"
                  onClick={toggleShowAllTags}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">
                    {showAllTags ? "Show fewer tags" : "Show more tags"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-2" align="end">
                <ScrollArea className="h-[200px] w-full">
                  {tags.map((tag: Tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center justify-between py-1"
                    >
                      <span className="truncate">{tag.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveTag(tag.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          )}
        </div>
        {item.vertical && (
          <Badge variant="secondary" className="whitespace-nowrap">
            Vertical
          </Badge>
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-900 dark:text-gray-100">
        <span className="whitespace-pre-wrap">
          {parseMinecraftColors(inputValue, isDarkMode)}
        </span>
      </div>
    </div>
  );
};
