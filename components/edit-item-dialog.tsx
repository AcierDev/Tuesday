"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Item } from '../app/typings/types'

interface EditItemDialogProps {
  editingItem: Item | null
  setEditingItem: (item: Item | null) => void
  handleSaveEdit: () => Promise<void>
}

export function EditItemDialog({ editingItem, setEditingItem, handleSaveEdit }: EditItemDialogProps) {
  return (
    <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {editingItem?.values.map((value) => (
            <div key={value.columnName} className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={value.columnName} className="text-right">
                {value.columnName}
              </Label>
              <Input
                id={value.columnName}
                value={value.text || ''}
                onChange={(e) => {
                  const newValues = editingItem.values.map(v =>
                    v.columnName === value.columnName ? { ...v, text: e.target.value } : v
                  )
                  setEditingItem({ ...editingItem, values: newValues })
                }}
                className="col-span-3"
              />
            </div>
          ))}
        </div>
        <Button onClick={handleSaveEdit}>Save changes</Button>
      </DialogContent>
    </Dialog>
  )
}