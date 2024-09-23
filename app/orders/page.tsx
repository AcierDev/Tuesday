"use client"

import { useCallback, useEffect, useState, useMemo } from "react"
import { Toaster, toast } from "sonner"
import { DropResult, ResponderProvided } from "@hello-pangea/dnd"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Header } from "@/components/orders/Header"
import { ItemList } from "@/components/orders/ItemList"
import { NewItemModal } from "@/components/orders/NewItemModal"
import { WeeklySchedule } from "@/components/weekly-schedule/WeeklySchedule"
import { ShippingDashboard } from "@/components/shipping/ShippingDashboard"
import { SettingsPanel } from "@/components/ui/SettingsPanel"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useOrderSettings } from "@/contexts/OrderSettingsContext"
import { useRealmApp } from "@/hooks/useRealmApp"
import { Board, Group, Item, ItemStatus } from "@/typings/types"
import { useBoardOperations } from "@/components/orders/OrderHooks"

export default function OrderManagementPage() {
  // State Management
  const [searchTerm, setSearchTerm] = useState("")
  const { collection, user, isLoading } = useRealmApp()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false)
  const [isShippingDashboardOpen, setIsShippingDashboardOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [isWeeklyPlannerOpen, setIsWeeklyPlannerOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const orderSettingsContext = useOrderSettings()
  const settings = orderSettingsContext.settings || {}
  const updateSettings = orderSettingsContext.updateSettings || (() => {})

  const { board, setBoard, updateItem, addNewItem, deleteItem } = useBoardOperations(null, collection, settings)

  // Responsive Handling
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load Board Data
  const loadBoard = useCallback(async () => {
    if (!collection) return

    try {
      const loadedBoard = await collection.findOne({})
      setBoard(loadedBoard)
      console.log("Board loaded:", loadedBoard)
    } catch (err) {
      console.error("Failed to load board", err)
      toast.error("Failed to load board. Please refresh the page.", {
        style: { background: "#EF4444", color: "white" },
      })
    }
  }, [collection, setBoard])

  useEffect(() => {
    if (!isLoading && collection) {
      loadBoard()
    }
  }, [isLoading, collection, loadBoard])

  // Watch for Changes in Board
  useEffect(() => {
    if (!collection) return

    let isActive = true

    const watchForChanges = async () => {
      while (isActive) {
        try {
          console.log("Starting board watch")
          for await (const change of collection.watch()) {
            if (!isActive) break
            switch (change.operationType) {
              case "update": {
                const { fullDocument } = change
                if (fullDocument && fullDocument.id === board?.id) {
                  console.log("Board updated:", fullDocument)
                  setBoard(fullDocument)
                  toast.success("Board updated", {
                    style: { background: "#10B981", color: "white" },
                  })
                }
                break
              }
              // Handle other operation types if needed
            }
          }
        } catch (error) {
          console.error("Watch stream error:", error)
          toast.error("Error syncing board. Retrying...", {
            style: { background: "#EF4444", color: "white" },
          })
          // Wait before attempting to reconnect
          await new Promise((resolve) => setTimeout(resolve, 5000))
        }
      }
    }

    watchForChanges()

    return () => {
      isActive = false
    }
  }, [collection, board?.id, setBoard])

  const shipItem = useCallback(async (itemId: string) => {
    console.log(`Shipping item: ${itemId}`)
    toast.success("Item marked as shipped", {
      style: { background: "#10B981", color: "white" },
    })
  }, [])

  const markItemCompleted = useCallback(async (itemId: string) => {
    console.log(`Marking item as completed: ${itemId}`)
    toast.success("Item marked as completed", {
      style: { background: "#10B981", color: "white" },
    })
  }, [])

  const onGetLabel = useCallback((item: Item) => {
    console.log(`Getting label for item: ${item.id}`)
    setSelectedItem(item)
    setIsShippingDashboardOpen(true)
  }, [])

  const onDragEnd = useCallback(
    async (result: DropResult, provided: ResponderProvided) => {
      const { source, destination, draggableId } = result

      console.log(result)

      console.log('Drag End:', { source, destination })

      if (!destination) return

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return
      }

      if (!board) return

      const movedItemIndex = board.items_page.items.findIndex(
        (item) => item.id === draggableId
      )
      if (movedItemIndex === -1) return

      const movedItem = { ...board.items_page.items[movedItemIndex] }

      const newStatus = Object.values(ItemStatus).find(
        (status) => status === destination.droppableId
      )

      if (!newStatus) {
        console.warn("Invalid destination droppableId:", destination.droppableId)
        return
      }

      const updatedItems = [...board.items_page.items]
      updatedItems.splice(movedItemIndex, 1)

      const statusChanged = movedItem.status !== newStatus
      if (statusChanged) {
        movedItem.status = newStatus
      }

      const groups = board.items_page.items.reduce<Group[]>((groups, item) => {
        const groupField =
          settings.groupingField === "Status"
            ? item.status
            : item.values.find(
                (v) => v.columnName === settings.groupingField
              )?.text || "Other"
        let group = groups.find((g) => g.title === groupField)
        if (!group) {
          group = { id: groupField, title: groupField, items: [] }
          groups.push(group)
        }
        if (
          item.values.some((value) => {
            const valueText = String(value.text || "").toLowerCase()
            return valueText.includes(searchTerm.toLowerCase())
          })
        ) {
          if (
            settings.groupingField !== "Status" ||
            settings.showCompletedOrders ||
            item.status !== ItemStatus.Done
          ) {
            group.items.push(item)
          }
        }
        return groups
      }, [])

      const sortedGroups = [...groups].sort((a, b) => {
        const aIndex = Object.values(ItemStatus).indexOf(a.title as ItemStatus)
        const bIndex = Object.values(ItemStatus).indexOf(b.title as ItemStatus)
        if (aIndex === -1 && bIndex === -1) return 0
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })

      let insertionIndex = 0
      for (const group of sortedGroups) {
        if (group.id === newStatus) break
        insertionIndex += group.items.length
      }

      insertionIndex += destination.index
      updatedItems.splice(insertionIndex, 0, movedItem)

      try {
        await collection!.updateOne(
          { id: board.id },
          { $set: { "items_page.items": updatedItems } }
        )

        setBoard((prevBoard) => ({
          ...prevBoard!,
          items_page: {
            ...prevBoard!.items_page,
            items: updatedItems,
          },
        }))

        console.log(`Item moved to ${newStatus} and reordered successfully`)
        toast.success(`Item moved to ${newStatus} and reordered successfully`, {
          style: { background: "#10B981", color: "white" },
        })
      } catch (error) {
        console.error("Failed to update item status and order:", error)
        toast.error("Failed to update item status and order. Please try again.", {
          style: { background: "#EF4444", color: "white" },
        })
      }
    },
    [
      board,
      collection,
      setBoard,
      settings.groupingField,
      settings.showCompletedOrders,
      searchTerm,
    ]
  )

  const getUniqueGroupValues = useCallback((items: Item[], field: string) => {
    const uniqueValues = new Set<string>()
    items.forEach(item => {
      const value = item.values.find(v => v.columnName === field)?.text || "Other"
      uniqueValues.add(value)
    })
    return Array.from(uniqueValues)
  }, [])

  const filteredGroups = useMemo(() => {
    if (!board) return []

    let groupValues: string[]
    if (settings.groupingField === "Status") {
      groupValues = Object.values(ItemStatus)
    } else {
      groupValues = getUniqueGroupValues(board.items_page.items, settings.groupingField)
    }

    const groups = groupValues.map(value => ({
      id: value,
      title: value,
      items: [] as Item[]
    }))

    board.items_page.items.forEach(item => {
      if (item.values.some(value => 
        String(value.text || "").toLowerCase().includes(searchTerm.toLowerCase())
      )) {
        const groupField = settings.groupingField === "Status"
          ? item.status
          : item.values.find(v => v.columnName === settings.groupingField)?.text || "Other"
        
        const group = groups.find(g => g.title === groupField)
        if (group && (settings.groupingField !== "Status" || settings.showCompletedOrders || item.status !== ItemStatus.Done)) {
          group.items.push(item)
        }
      }
    })

    return groups
  }, [board, settings.groupingField, settings.showCompletedOrders, searchTerm, getUniqueGroupValues])

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      if (settings.groupingField === "Status") {
        const aIndex = Object.values(ItemStatus).indexOf(a.title as ItemStatus)
        const bIndex = Object.values(ItemStatus).indexOf(b.title as ItemStatus)
        if (aIndex === -1 && bIndex === -1) return 0
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      } 
        return a.title.localeCompare(b.title)
      
    })
  }, [filteredGroups, settings.groupingField])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!collection || !user) {
    return (
      <div>Error: Unable to connect to the database. Please try again later.</div>
    )
  }

  if (!orderSettingsContext) {
    return (
      <div>
        Error: Order settings not available. Please refresh the page.
      </div>
    )
  }

  // Render
  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)]">
      <Toaster position="top-center" />
      <Header
        isMobile={isMobile}
        searchTerm={searchTerm}
        onNewOrder={() => setIsNewItemModalOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSearchChange={setSearchTerm}
      />
      <div className="flex-grow overflow-auto">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row">
            <div className="flex-grow lg:mr-4">
              <ItemList
                board={board!}
                groups={sortedGroups}
                onDelete={deleteItem}
                onDragEnd={onDragEnd}
                onGetLabel={onGetLabel}
                onMarkCompleted={markItemCompleted}
                onShip={shipItem}
                onUpdate={updateItem}
              />
            </div>
            <div
              className={`transition-all duration-300 ease-in-out ${
                isWeeklyPlannerOpen ? "w-80 lg:ml-4" : "w-0"
              }`}
            >
              {isWeeklyPlannerOpen && !isMobile ? (
                <div className="h-full bg-white shadow-lg rounded-lg overflow-hidden">
                  {board ? (
                    <WeeklySchedule
                      boardId={board.id}
                      items={board.items_page.items || []}
                    />
                  ) : null}
                </div>
              ) : null}
            </div>
            <Button
              className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-white shadow-md rounded-l-md p-2"
              variant="ghost"
              onClick={() => setIsWeeklyPlannerOpen(!isWeeklyPlannerOpen)}
            >
              {isWeeklyPlannerOpen ? (
                <ChevronRight className="h-6 w-6" />
              ) : (
                <ChevronLeft className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>
      {/* Modals and Dialogs */}
      {isSettingsOpen ? (
        <SettingsPanel
          settings={settings}
          updateSettings={updateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      ) : null}
      <NewItemModal
        board={board}
        isOpen={isNewItemModalOpen}
        onClose={() => setIsNewItemModalOpen(false)}
        onSubmit={addNewItem}
      />
      <Dialog
        open={isShippingDashboardOpen}
        onOpenChange={setIsShippingDashboardOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedItem ? (
            <ShippingDashboard
              item={selectedItem}
              onUpdateItem={updateItem}
              onClose={() => {
                setIsShippingDashboardOpen(false)
                setSelectedItem(null)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}