"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface Tag {
  id: string
  name: string
}

interface ItemTagsProps {
  itemId: string
  initialTags: Tag[]
  allTags: Tag[]
  onAddTag: (itemId: string, tagId: string) => void
  onRemoveTag: (itemId: string, tagId: string) => void
}

export function ItemTags({ itemId, initialTags, allTags, onAddTag, onRemoveTag }: ItemTagsProps) {
  const [open, setOpen] = React.useState(false)
  const [tags, setTags] = React.useState<Tag[]>(initialTags)

  const handleAddTag = (tag: Tag) => {
    if (!tags.some(t => t.id === tag.id)) {
      setTags([...tags, tag])
      onAddTag(itemId, tag.id)
    }
    setOpen(false)
  }

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.filter(t => t.id !== tagId))
    onRemoveTag(itemId, tagId)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {tags.map(tag => (
        <Badge key={tag.id} variant="secondary" className="text-sm">
          {tag.name}
          <Button
            variant="ghost"
            size="sm"
            className="ml-1 h-auto p-0 text-muted-foreground hover:text-foreground"
            onClick={() => handleRemoveTag(tag.id)}
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove</span>
          </Button>
        </Badge>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 border-dashed">
            Add Tag
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {allTags.map(tag => (
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
    </div>
  )
}