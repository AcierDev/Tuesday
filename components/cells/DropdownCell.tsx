"use client"

import { useState, useEffect, useCallback } from 'react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { XCircle, UserX, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { boardConfig } from '@/config/boardconfig'
import { Board, ColumnTitles, EmployeeNames, GenericColumnValue, Item } from '@/typings/types'

const CREDIT_OPTIONS = ['AM', 'BC', 'AW'] as const
type CreditOption = typeof CREDIT_OPTIONS[number]

const OPTION_IMAGES: Record<CreditOption, string> = {
  'AM': '/images/alex.png',
  'BC': '/images/akiva1.png',
  'AW': '/images/akiva2.png',
}

const EMPLOYEE_MAP: Record<CreditOption, EmployeeNames> = {
  'AW': EmployeeNames.Akiva,
  'AM': EmployeeNames.Alex,
  'BC': EmployeeNames.Ben,
}

const INITIALS_MAP: Record<EmployeeNames, CreditOption> = {
  [EmployeeNames.Akiva]: 'AW',
  [EmployeeNames.Alex]: 'AM',
  [EmployeeNames.Ben]: 'BC',
}

const CREDIT_COLORS: Record<CreditOption, string> = {
  'AW': 'bg-orange-500',
  'AM': 'bg-blue-500',
  'BC': 'bg-green-500',
}

interface DropdownCellProps {
  item: Item
  columnValue: GenericColumnValue
  onUpdate: (updatedItem: Item, changedField: ColumnTitles) => void
  board: Board
}

export function DropdownCell({ item, columnValue, onUpdate, board }: DropdownCellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false)
  const [selectedCredits, setSelectedCredits] = useState<CreditOption[]>([])
  const [combinedImageUrl, setCombinedImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (columnValue.credit && columnValue.credit.length > 0) {
      setSelectedCredits(columnValue.credit.map(credit => INITIALS_MAP[credit]).filter((initial): initial is CreditOption => !!initial))
    } else {
      setSelectedCredits([])
    }
  }, [columnValue.credit])

  useEffect(() => {
    const generateCombinedImage = async () => {
      if (selectedCredits.length === 2) {
        try {
          const combined = await combineImages(OPTION_IMAGES[selectedCredits[0]], OPTION_IMAGES[selectedCredits[1]])
          setCombinedImageUrl(combined)
        } catch (error) {
          console.error('Error combining images:', error)
          setCombinedImageUrl(null)
        }
      } else if (selectedCredits.length === 1) {
        setCombinedImageUrl(OPTION_IMAGES[selectedCredits[0]])
      } else {
        setCombinedImageUrl(null)
      }
    }

    generateCombinedImage()
  }, [selectedCredits])

  const handleUpdate = useCallback(async (newValue: string, credits: CreditOption[] | null) => {
    try {
      const updatedItem = {
        ...item,
        values: item.values.map(value =>
          value.columnName === columnValue.columnName
            ? {
                ...value,
                text: newValue,
                lastModifiedTimestamp: Date.now(),
                credit: credits ? credits.map(credit => EMPLOYEE_MAP[credit]) : []
              }
            : value
        )
      }
      await onUpdate(updatedItem, columnValue.columnName)
      toast.success("Value updated successfully")
    } catch (err) {
      console.error("Failed to update ColumnValue", err)
      toast.error("Failed to update the value. Please try again.")
    }
  }, [item, columnValue.columnName, onUpdate])

  const handleSaveCredits = useCallback(async () => {
    try {
      const updatedCredits = selectedCredits.slice(0, 2)
      await handleUpdate(columnValue.text || '', updatedCredits)
      setIsCreditDialogOpen(false)
    } catch (err) {
      console.error("Failed to update credits", err)
      toast.error("Failed to update credits. Please try again.")
    }
  }, [selectedCredits, columnValue.text, handleUpdate])

  const handleCancelCredits = useCallback(() => {
    const initials = columnValue.credit?.map(credit => INITIALS_MAP[credit]).filter((initial): initial is CreditOption => !!initial) || []
    setSelectedCredits(initials)
    setIsCreditDialogOpen(false)
  }, [columnValue.credit])

  const toggleCredit = useCallback((credit: CreditOption) => {
    setSelectedCredits(prev => {
      if (prev.includes(credit)) {
        return prev.filter(c => c !== credit)
      } else if (prev.length < 2) {
        return [...prev, credit]
      }
      return prev
    })
  }, [])

  const buttonStyle = columnValue.columnName === 'Design' || columnValue.columnName === 'Size'
    ? 'inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white bg-primary rounded-full hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors'
    : 'w-full h-full justify-center p-2 text-foreground'

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            className={`relative ${buttonStyle} ${combinedImageUrl ? 'bg-cover bg-center' : ''}`}
            style={combinedImageUrl ? { backgroundImage: `url(${combinedImageUrl})` } : {}}
            variant="ghost"
          >
            <span className={`${combinedImageUrl ? 'bg-background/70 px-1 rounded' : ''}`}>
              {columnValue.text || '⠀'}
            </span>
            {selectedCredits.length > 0 && (
              <>
                <span className={`absolute top-0 left-0 ${CREDIT_COLORS[selectedCredits[0]]} text-white text-[10px] font-bold px-1 rounded-tl`}>
                  {selectedCredits[0]}
                </span>
                {selectedCredits[1] && (
                  <span className={`absolute top-0 right-0 ${CREDIT_COLORS[selectedCredits[1]]} text-white text-[10px] font-bold px-1 rounded-tr`}>
                    {selectedCredits[1]}
                  </span>
                )}
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {boardConfig.columns[columnValue.columnName].options?.map(option => (
            <DropdownMenuItem
              key={option}
              onSelect={() => handleUpdate(option, selectedCredits.length > 0 ? selectedCredits : null)}
            >
              {option}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setIsCreditDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Assign Credit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleUpdate(columnValue.text || '', [])}>
            <UserX className="mr-2 h-4 w-4" />
            Reset Credit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => handleUpdate('', null)}>
            <XCircle className="mr-2 h-4 w-4" />
            Reset Value
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Assign Credit</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {CREDIT_OPTIONS.map((credit) => {
              const isSelected = selectedCredits.includes(credit)
              return (
                <Button
                  key={credit}
                  onClick={() => toggleCredit(credit)}
                  variant={isSelected ? "default" : "secondary"}
                  className={`justify-start ${isSelected ? CREDIT_COLORS[credit] : ''}`}
                >
                  <div
                    className="w-8 h-8 rounded-full bg-cover bg-center mr-2"
                    style={{ backgroundImage: `url(${OPTION_IMAGES[credit]})` }}
                  />
                  <span className={`text-base font-medium ${isSelected ? 'text-white' : ''}`}>
                    {EMPLOYEE_MAP[credit]}
                  </span>
                </Button>
              )
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelCredits}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveCredits}
              disabled={selectedCredits.length === 0}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

async function combineImages(imageUrl1: string, imageUrl2: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img1 = new Image()
    const img2 = new Image()

    img1.crossOrigin = "anonymous"
    img2.crossOrigin = "anonymous"

    img1.src = imageUrl1
    img2.src = imageUrl2

    img1.onload = () => {
      img2.onload = () => {
        const targetHeight = Math.max(img1.height, img2.height)
        const img1AspectRatio = img1.width / img1.height
        const img2AspectRatio = img2.width / img2.height
        const img1TargetWidth = targetHeight * img1AspectRatio
        const img2TargetWidth = targetHeight * img2AspectRatio

        const canvas = document.createElement("canvas")
        const totalWidth = img1TargetWidth + img2TargetWidth
        canvas.width = totalWidth
        canvas.height = targetHeight
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Failed to get canvas context"))
          return
        }

        ctx.drawImage(img1, 0, 0, img1TargetWidth, targetHeight)
        ctx.drawImage(img2, img1TargetWidth, 0, img2TargetWidth, targetHeight)

        resolve(canvas.toDataURL("image/png"))
      }

      img2.onerror = () => reject(new Error(`Failed to load image: ${imageUrl2}`))
    }

    img1.onerror = () => reject(new Error(`Failed to load image: ${imageUrl1}`))
  })
}