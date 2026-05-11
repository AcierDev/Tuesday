"use client";

import Link from "next/link";
import { ArrowLeft, ChevronDown, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Item } from "@/typings/types";
import { ItemUtil } from "@/utils/ItemUtil";
import { useOrderStore } from "@/stores/useOrderStore";

const SKELETON_ROWS = 6;
const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

function deletionTimestamp(item: Item): number {
  return item.deletedAt ?? item.completedAt ?? item.createdAt;
}

function formatDeletedAt(value: number | undefined | null): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "";
  }
}

interface DeletedRowProps {
  item: Item;
  restoringId: string | null;
  onRestore: (id: string) => void;
}

function DeletedRow({ item, restoringId, onRestore }: DeletedRowProps) {
  const meta = [item.design, item.size, item.dueDate].filter(Boolean).join(" · ");
  const deletedAt = formatDeletedAt(deletionTimestamp(item));
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">
          {item.customerName || "Unnamed order"}
        </div>
        {meta && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            {meta}
          </div>
        )}
        <div className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mt-0.5">
          Status: {item.status}
          {deletedAt ? ` · ${deletedAt}` : ""}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={restoringId === item.id}
        onClick={() => onRestore(item.id)}
        className="shrink-0"
      >
        <RotateCcw className="h-3.5 w-3.5 mr-1" />
        {restoringId === item.id ? "Restoring…" : "Restore"}
      </Button>
    </li>
  );
}

export default function DeletedOrdersPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showOlder, setShowOlder] = useState(false);
  const loadItems = useOrderStore((state) => state.loadItems);

  const loadDeleted = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/items?deletedOnly=true");
      if (!res.ok) throw new Error("Failed to load deleted items");
      const data: Item[] = await res.json();
      const processed = data.map(ItemUtil.processItem);
      processed.sort((a, b) => deletionTimestamp(b) - deletionTimestamp(a));
      setItems(processed);
    } catch (err) {
      console.error("Failed to load deleted items", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeleted();
  }, [loadDeleted]);

  const handleRestore = useCallback(
    async (id: string) => {
      setRestoringId(id);
      try {
        const res = await fetch("/api/items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, updates: { deleted: false } }),
        });
        if (!res.ok) throw new Error("Failed to restore item");
        setItems((prev) => prev.filter((i) => i.id !== id));
        // Pull the freshly restored item back into the orders store cache.
        loadItems();
      } catch (err) {
        console.error("Failed to restore item", err);
      } finally {
        setRestoringId(null);
      }
    },
    [loadItems]
  );

  const { recent, older } = useMemo(() => {
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    const recent: Item[] = [];
    const older: Item[] = [];
    for (const item of items) {
      if (deletionTimestamp(item) >= cutoff) recent.push(item);
      else older.push(item);
    }
    return { recent, older };
  }, [items]);

  const listClasses =
    "divide-y divide-slate-200 dark:divide-slate-800 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden";

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-black dark:text-white">
      <div className="max-w-4xl mx-auto w-full px-4 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-slate-500 dark:text-slate-400" />
            <h1 className="text-2xl font-semibold">Deleted Orders</h1>
            {!isLoading && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                ({items.length})
              </span>
            )}
          </div>
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-16 border border-dashed border-slate-300 dark:border-slate-700 rounded-md">
            No deleted orders.
          </div>
        ) : (
          <div className="space-y-6">
            {recent.length > 0 && (
              <ul className={listClasses}>
                {recent.map((item) => (
                  <DeletedRow
                    key={item.id}
                    item={item}
                    restoringId={restoringId}
                    onRestore={handleRestore}
                  />
                ))}
              </ul>
            )}

            {recent.length === 0 && older.length > 0 && (
              <div className="text-center text-sm text-slate-500 dark:text-slate-400 py-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-md">
                No orders deleted in the last 30 days.
              </div>
            )}

            {older.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowOlder((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                  aria-expanded={showOlder}
                >
                  <span>Older than 30 days ({older.length})</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showOlder ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {showOlder && (
                  <ul className={`${listClasses} mt-2`}>
                    {older.map((item) => (
                      <DeletedRow
                        key={item.id}
                        item={item}
                        restoringId={restoringId}
                        onRestore={handleRestore}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
