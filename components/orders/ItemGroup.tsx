"use client";

import { ChevronDown } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  memo,
} from "react";
import { useItemGroupLayout } from "./useItemGroupLayout";
import { format } from "date-fns";
import { useDndContext, useDroppable } from "@dnd-kit/core";

import {
  DropdownMenu,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import {
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { itemSortFuncs } from "@/utils/itemSortFuncs";

import { useOrderSettings } from "../../contexts/OrderSettingsContext";
import {
  ColumnTitles,
  ColumnTypes,
  Group,
  Item,
  ItemStatus,
  DayName,
} from "../../typings/types";
import { cn } from "../../utils/functions";
import { DeleteConfirmationDialog } from "../ui/DeleteConfirmationDialog";

import { EditItemDialog } from "./EditItemDialog";
import { ItemActions } from "./ItemActions";
import { BorderedTable } from "./BoarderedTable";
import { ItemTableRow } from "./ItemTableRow";
import { PreviewTableRow } from "./PreviewTableRow";
import {
  DEFAULT_COLUMN_VISIBILITY,
  FRONTEND_HIDDEN_COLUMN_TITLES,
  STATUS_COLORS,
} from "@/typings/constants";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderStore } from "@/stores/useOrderStore";
import { LoadMoreSentinel } from "./LoadMoreSentinel";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";
import { useTrackingStore } from "@/stores/useTrackingStore";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚚 IN-TRANSIT TRACKER STATUSES                                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
const IN_TRANSIT_TRACKER_STATUSES = new Set([
  "in_transit",
  "out_for_delivery",
]);

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

const GROUP_COLORS = {
  ...STATUS_COLORS,
  Hidden: "gray-500",
} as const;

interface ItemGroupProps {
  group: Group;
  onDelete: (itemId: string) => Promise<void>;
  onShip: (itemId: string) => Promise<void>;
  onGetLabel: (item: Item) => void;
  onStatusChange?: (itemId: string, newStatus: ItemStatus) => Promise<void>;
  isPreview?: boolean;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  clickToAddTarget?: { day: DayName; weekKey: string } | null;
  onItemClick?: (item: Item) => Promise<void>;
  sortColumn: ColumnTitles | null;
  sortDirection: "asc" | "desc" | null;
  onSort: (column: ColumnTitles) => void;
}

export const ItemGroupSection = memo(function ItemGroupSection({
  group,
  onDelete,
  onShip,
  onGetLabel,
  onStatusChange,
  isPreview = false,
  isCollapsible = false,
  defaultCollapsed = true,
  clickToAddTarget,
  onItemClick,
  sortColumn,
  sortDirection,
  onSort,
  ...props
}: ItemGroupProps) {
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const { settings } = useOrderSettings();
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: Item;
  } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const addItemToDay = useWeeklyScheduleStore((s) => s.addItemToDay);

  const loadDoneItems = useOrderStore((state) => state.loadDoneItems);
  const removeDoneItems = useOrderStore((state) => state.removeDoneItems);
  const doneItemsLoaded = useOrderStore((state) => state.doneItemsLoaded);
  const updateItem = useOrderStore((state) => state.updateItem);
  const hasMoreDoneItems = useOrderStore((state) => state.hasMoreDoneItems);
  const isDoneLoading = useOrderStore((state) => state.isDoneLoading);
  const searchQuery = useOrderStore((state) => state.searchQuery);

  // Auto-expand Done/New while a search is active, then auto-collapse when
  // the search clears — but only if *we* were the ones who opened it. A
  // manual click flips this ref back so we don't fight the user.
  const isSearchAutoExpandable =
    group.title === ItemStatus.Done || group.title === ItemStatus.New;
  const autoExpandedBySearchRef = useRef(false);
  useEffect(() => {
    if (!isSearchAutoExpandable) return;
    if (searchQuery && group.items.length > 0 && isCollapsed) {
      autoExpandedBySearchRef.current = true;
      setIsCollapsed(false);
      return;
    }
    if (!searchQuery && autoExpandedBySearchRef.current && !isCollapsed) {
      autoExpandedBySearchRef.current = false;
      setIsCollapsed(true);
    }
  }, [isSearchAutoExpandable, searchQuery, group.items.length, isCollapsed]);

  const handleScheduleUpdate = useCallback(() => {
    const event = new CustomEvent("weeklyScheduleUpdate");
    window.dispatchEvent(event);
  }, []);

  const handleEdit = useCallback((item: Item) => {
    setEditingItem(item);
    setContextMenu(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (updatedItem: Item) => {
      if (!updatedItem) return;
      // Let errors bubble up so EditItemDialog keeps the dialog open and shows
      // the user a message; otherwise a swallowed error looks like success.
      await updateItem(updatedItem);
      setEditingItem(null);
    },
    [updateItem]
  );

  const handleDelete = useCallback((item: Item) => {
    setDeletingItem(item);
    setContextMenu(null);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deletingItem) {
      await onDelete(deletingItem.id);
      setDeletingItem(null);
    }
  }, [deletingItem, onDelete]);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: Item) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        closeContextMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [closeContextMenu]);

  // FRONTEND-ONLY HIDE: columns in FRONTEND_HIDDEN_COLUMN_TITLES (Painted,
  // Backboard, Boxes, Glued, Notes, Rating) are force-hidden regardless of
  // any persisted columnVisibility settings. Backend/data is untouched.
  // Also drop unknown column names — stale localStorage from removed enum
  // values (e.g. "Rating" pre-7089ec2) would otherwise leak through and
  // render a blank TextCell input next to the kebab.
  const KNOWN_COLUMN_TITLES = new Set<string>(Object.values(ColumnTitles));
  const visibleColumns = Object.entries(
    settings.columnVisibility[group.title as ItemStatus] ||
      DEFAULT_COLUMN_VISIBILITY
  )
    .filter(([_, isVisible]) => isVisible)
    .map(([columnName]) => columnName as ColumnTitles)
    .filter((columnName) => KNOWN_COLUMN_TITLES.has(columnName))
    .filter((columnName) => !FRONTEND_HIDDEN_COLUMN_TITLES.has(columnName));

  const trackingInfo = useTrackingStore((state) => state.trackingInfo);

  // Set of orderIds whose order has at least one tracker reporting an
  // in-transit status (in_transit or out_for_delivery). "Any" semantics
  // because an order can carry multiple labels — if any one shipment is
  // moving, the order should float to the top of Done. Once all trackers
  // flip to delivered (or another non-in-transit state), the order leaves
  // this set and falls back to its natural index position.
  const inTransitOrderIds = useMemo(() => {
    const ids = new Set<string>();
    for (const info of trackingInfo) {
      const trackers = info.trackers;
      if (!trackers || trackers.length === 0) continue;
      for (const tracker of trackers) {
        const status = tracker?.status?.toLowerCase();
        if (status && IN_TRANSIT_TRACKER_STATUSES.has(status)) {
          ids.add(info.orderId);
          break;
        }
      }
    }
    return ids;
  }, [trackingInfo]);

  const sortedItems = useMemo(() => {
    let items = [...group.items];

    items.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

    if (sortColumn && sortDirection && itemSortFuncs[sortColumn]) {
      items = itemSortFuncs[sortColumn](items, sortDirection === "asc");
    }

    // Done section: float in-transit packages to the top as a final pass.
    // Done last so it always wins over any column sort. Sort is stable, so
    // relative order within each tier is preserved. Once a tracker flips
    // to delivered (or another non-in-transit state) the item leaves the
    // top tier and falls back to its previous position.
    if (group.title === ItemStatus.Done) {
      items.sort((a, b) => {
        const aTier = inTransitOrderIds.has(a.id) ? 0 : 1;
        const bTier = inTransitOrderIds.has(b.id) ? 0 : 1;
        return aTier - bTier;
      });
    }

    return items;
  }, [group.items, sortColumn, sortDirection, group.title, inTransitOrderIds]);

  const inTransitCount = useMemo(() => {
    if (group.title !== ItemStatus.Done) return 0;
    // Use global tracking set so the count survives collapse, when
    // group.items is unloaded by removeDoneItems().
    return inTransitOrderIds.size;
  }, [group.title, inTransitOrderIds]);

  const { newLeftBodyRef, newRightBodyRef, newRowPad } = useItemGroupLayout({
    groupTitle: group.title,
    isPreview,
    isCollapsed,
    itemCount: sortedItems.length,
  });

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 🎯 STATUS DROP TARGET                                                ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  // Each section header acts as the drop zone for its status. The drop ID
  // matches the group title (which equals the ItemStatus enum value for
  // every visible lane), so the page-level handler can map drop → status
  // change directly.
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: group.title,
    data: { status: group.title },
  });
  const { active } = useDndContext();
  const activeIdStr = active?.id != null ? String(active.id) : null;
  const isDraggingFromThisGroup =
    !!activeIdStr && group.items.some((i) => i.id === activeIdStr);
  // For the source section, suppress the highlight until the cursor has
  // first wandered off — only re-highlight on return. Stops the source
  // from lighting up at the start of every drag (which the user would
  // already know is the origin) while still treating a return-to-source
  // as a real drop target.
  const [hasLeftSource, setHasLeftSource] = useState(false);
  useEffect(() => {
    if (!activeIdStr) {
      setHasLeftSource(false);
      return;
    }
    if (isDraggingFromThisGroup && !isOver) {
      setHasLeftSource(true);
    }
  }, [activeIdStr, isDraggingFromThisGroup, isOver]);
  const showDropHighlight =
    !!activeIdStr &&
    isOver &&
    (!isDraggingFromThisGroup || hasLeftSource);
  // When the section is collapsed or has nothing visible to ring around, the
  // header doubles as the drop surface — highlight it instead of the empty
  // body. Otherwise the ring lives down on the table.
  const isActuallyCollapsed = isCollapsible && isCollapsed;
  const bodyIsEmpty = group.items.length === 0;
  const highlightOnHeader =
    showDropHighlight && (isActuallyCollapsed || bodyIsEmpty);
  const highlightOnBody = showDropHighlight && !highlightOnHeader;

  const handleDaySelect = useCallback(
    async (itemId: string, selectedDate: Date) => {
      const item = sortedItems.find((i) => i.id === itemId);
      if (!item) return;

      const updatedItem = {
        ...item,
        // Directly update due date field
        dueDate: format(selectedDate, "yyyy-MM-dd"),
        // Keep values for compatibility if needed, or rely on store to handle patch
      };

      try {
        await updateItem(updatedItem);
      } catch (error) {
        console.error("Failed to update due date:", error);
      }
    },
    [sortedItems, updateItem]
  );

  const handleGroupClick = useCallback(() => {
    if (!isCollapsible) return;

    // Manual toggle wins over the search auto-expand: clear the ref so a
    // later search-clear doesn't fight the user's choice.
    autoExpandedBySearchRef.current = false;
    setIsCollapsed(!isCollapsed);
    if (group.title === ItemStatus.Done) {
      if (isCollapsed) {
        loadDoneItems(true);
      } else {
        removeDoneItems();
      }
    }
  }, [
    isCollapsible,
    isCollapsed,
    group.title,
    loadDoneItems,
    removeDoneItems,
  ]);

  const shouldShowSkeleton =
    group.title === ItemStatus.Done && !doneItemsLoaded;

  const renderSkeletonRows = useCallback(() => {
    return Array(3)
      .fill(0)
      .map((_, index) => (
        <TableRow
          key={`skeleton-${index}`}
          className={
            index % 2 === 0
              ? "bg-white dark:bg-gray-800"
              : "bg-gray-50 dark:bg-gray-800/60"
          }
        >
          <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-2 text-center">
            <Skeleton className="h-6 w-6 mx-auto" />
          </TableCell>
          {visibleColumns.map((columnName, i) => (
            <TableCell
              key={`${index}-${columnName}`}
              className="border-b border-gray-100 dark:border-gray-700/60 p-2"
            >
              <Skeleton className="h-6 w-full" />
            </TableCell>
          ))}
          <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-2 text-center">
            <Skeleton className="h-6 w-20 mx-auto" />
          </TableCell>
          <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-2 text-center">
            <div className="flex justify-center gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </TableCell>
        </TableRow>
      ));
  }, [visibleColumns]);

  return (
    <div
      ref={setDroppableRef}
      className={cn(
        "mb-6 overflow-visible"
      )}
    >
      {group.title === ItemStatus.Done && (
        <div
          aria-hidden
          className={cn(
            "mb-6 mx-auto h-px w-[90%] rounded-full",
            `bg-${
              GROUP_COLORS[group.title as keyof typeof GROUP_COLORS]
            }`,
            "[mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
          )}
        />
      )}
      <div
        className={cn(
          "group relative mx-auto p-2 sm:p-4 rounded-xl flex items-center min-h-[3.5rem] sm:min-h-[4rem]",
          "transition-[width,background-color,color] duration-200 ease-out",
          isCollapsible && !isCollapsed ? "w-[95%]" : "w-[98%]",
          `text-${
            GROUP_COLORS[group.title as keyof typeof GROUP_COLORS]
          } dark:text-${
            GROUP_COLORS[group.title as keyof typeof GROUP_COLORS]
          }`,
          "sticky top-[88px] lg:top-[73px] z-30 glass-surface will-change-transform select-none",
          isCollapsible && "cursor-pointer",
          // Collapsed-section drop target: the header IS the section here,
          // so light it up the same way the table does when expanded.
          highlightOnHeader &&
            "ring-2 ring-primary ring-offset-2 ring-offset-transparent transition-shadow duration-150"
        )}
        onClick={handleGroupClick}
      >
        {isCollapsible && (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0 top-2 bottom-2 w-1 rounded-r bg-current",
              "origin-top transition-transform duration-300 ease-out",
              "scale-y-0 group-hover:scale-y-100 group-hover:duration-200"
            )}
          />
        )}
        <div className="flex items-center justify-between flex-1">
          <span className="font-semibold text-lg whitespace-nowrap leading-none transition-transform duration-200 ease-out group-hover:translate-x-2">
            {group.title === ItemStatus.Wip ? "WIP" : group.title}
            {isCollapsible && isCollapsed && group.title !== ItemStatus.Done && (
              <span className="ml-2 font-normal text-[0.9625rem] opacity-70">
                ({group.items.length} hidden)
              </span>
            )}
            {group.title === ItemStatus.Done && inTransitCount > 0 && (
              <span className="ml-2 font-normal text-[0.9625rem] text-blue-500">
                ({inTransitCount} in transit)
              </span>
            )}
          </span>
          {isCollapsible && (
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-all duration-200 ease-out group-hover:scale-110",
                !isCollapsed && "transform rotate-180"
              )}
            />
          )}
        </div>
      </div>
      {(!isCollapsible || !isCollapsed) && (
        <div
          className={cn(
            // mt-2 keeps the table from butting up against the section
            // header, so the drop-target ring has clear sky above it.
            "relative overflow-visible mt-2",
            group.title !== ItemStatus.Done &&
              "animate-in fade-in slide-in-from-top-1 duration-150 ease-out",
            // While dragging an item from another section over this
            // expanded section, ring the table. rounded-2xl + ring-offset-4
            // matches the BorderedTable's own radius and floats the ring
            // off the table edge so it reads as an outline rather than a
            // bolted-on stripe.
            highlightOnBody &&
              "rounded-2xl ring-2 ring-primary ring-offset-4 ring-offset-transparent transition-shadow duration-150"
          )}
        >
          {!shouldShowSkeleton && sortedItems.length === 0 ? (
            // New uses a column-balancing layout that breaks if we render
            // anything when empty; Done starts collapsed and an empty inline
            // message would just be noise alongside the in-transit header.
            group.title !== ItemStatus.New &&
            group.title !== ItemStatus.Done ? (
              <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 italic">
                No items in this section.
              </p>
            ) : null
          ) : !isPreview ? (
            (() => {
              const renderTable = (
                items: Item[],
                indexOffset: number,
                keySuffix: string,
                bodyRef?: React.Ref<HTMLTableSectionElement>,
                rowExtraPx: number = 0
              ) => (
                <BorderedTable
                  key={keySuffix}
                  className="table-fixed"
                  data-row-pad={rowExtraPx > 0 ? "true" : undefined}
                  style={
                    rowExtraPx > 0
                      ? ({
                          ["--row-extra-pb" as any]: `${rowExtraPx}px`,
                        } as React.CSSProperties)
                      : undefined
                  }
                  borderColor={`bg-${
                    GROUP_COLORS[group.title as keyof typeof GROUP_COLORS]
                  }`}
                >
                  <TableBody
                    ref={bodyRef}
                    key={`${group.title}-body-${keySuffix}`}
                  >
                    {shouldShowSkeleton
                      ? renderSkeletonRows()
                      : items.map((item, index) => (
                          <ItemTableRow
                            key={item.id}
                            item={item}
                            index={index + indexOffset}
                            visibleColumns={visibleColumns}
                            onContextMenu={handleContextMenu}
                            onDaySelect={handleDaySelect}
                            onAddToSchedule={addItemToDay}
                            onScheduleUpdate={handleScheduleUpdate}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onGetLabel={onGetLabel}
                            onShip={onShip}
                            onStatusChange={onStatusChange}
                            clickToAddTarget={clickToAddTarget}
                            onItemClick={onItemClick}
                          />
                        ))}
                  </TableBody>
                </BorderedTable>
              );

              if (group.title === ItemStatus.New && !shouldShowSkeleton) {
                const splitAt = Math.ceil(sortedItems.length / 2);
                const left = sortedItems.slice(0, splitAt);
                const right = sortedItems.slice(splitAt);
                const leftExtra =
                  newRowPad.side === "left" ? newRowPad.px : 0;
                const rightExtra =
                  newRowPad.side === "right" ? newRowPad.px : 0;
                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {renderTable(
                        left,
                        0,
                        "left",
                        newLeftBodyRef,
                        leftExtra
                      )}
                      {right.length > 0 &&
                        renderTable(
                          right,
                          splitAt,
                          "right",
                          newRightBodyRef,
                          rightExtra
                        )}
                    </div>
                  </>
                );
              }

              return renderTable(sortedItems, 0, "body");
            })()
          ) : (
            <BorderedTable
              className="table-fixed"
              borderColor={`bg-${
                GROUP_COLORS[group.title as keyof typeof GROUP_COLORS]
              }`}
            >
              <TableBody key={`${group.title}-preview-body`}>
                {shouldShowSkeleton
                  ? renderSkeletonRows()
                  : sortedItems.map((item, index) => (
                      <PreviewTableRow
                        key={item.id}
                        item={item}
                        index={index}
                        visibleColumns={visibleColumns}
                        onDaySelect={handleDaySelect}
                        onAddToSchedule={addItemToDay}
                        onScheduleUpdate={handleScheduleUpdate}
                      />
                    ))}
              </TableBody>
            </BorderedTable>
          )}
          {group.title === ItemStatus.Done && !isCollapsed && (
            <LoadMoreSentinel
              hasMore={hasMoreDoneItems}
              isLoading={isDoneLoading}
              onLoadMore={() => loadDoneItems(false)}
            />
          )}
        </div>
      )}
      {group.title === ItemStatus.New && (
        <div
          aria-hidden
          className={cn(
            "mt-6 mx-auto h-px w-[90%] rounded-full",
            `bg-${
              GROUP_COLORS[group.title as keyof typeof GROUP_COLORS]
            }`,
            "[mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
          )}
        />
      )}
      <EditItemDialog
        editingItem={editingItem}
        handleSaveEdit={handleSaveEdit}
        setEditingItem={setEditingItem}
      />
      <DeleteConfirmationDialog
        isOpen={Boolean(deletingItem)}
        itemName={deletingItem?.customerName || "Unknown"}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
      />
      {contextMenu ? (
        <div
          ref={contextMenuRef}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000,
          }}
        >
          <DropdownMenu open>
            <DropdownMenuContent>
              <ItemActions
                item={contextMenu.item}
                showTrigger={false}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onGetLabel={onGetLabel}
                onShip={onShip}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}
    </div>
  );
});

export function getStatusColor(columnValue: {
  columnName: string;
  type: ColumnTypes;
  text?: string;
}): string {
  if (columnValue.type === ColumnTypes.Dropdown) {
    switch (columnValue.text?.toLowerCase()) {
      case "done":
        return "bg-green-200 dark:bg-green-800";
      case "working on it":
        return "bg-yellow-100 dark:bg-yellow-800";
      case "stuck":
        return "bg-red-200 dark:bg-red-800";
      default:
        return "";
    }
  }
  return "";
}
