import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Fire when 10% of the sentinel is visible.
const LOAD_MORE_VISIBLE_THRESHOLD = 0.1;

interface LoadMoreSentinelProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
}

export const LoadMoreSentinel: React.FC<LoadMoreSentinelProps> = ({
  hasMore,
  isLoading,
  onLoadMore,
}) => {
  const observerTarget = useRef<HTMLDivElement>(null);
  // Latest values via ref so the observer is created once per mounted target,
  // not rebuilt whenever a parent re-renders with a new callback.
  const latestRef = useRef({ hasMore, isLoading, onLoadMore });
  latestRef.current = { hasMore, isLoading, onLoadMore };

  useEffect(() => {
    const target = observerTarget.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const { hasMore, isLoading, onLoadMore } = latestRef.current;
        if (entries[0]?.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: LOAD_MORE_VISIBLE_THRESHOLD }
    );
    observer.observe(target);
    return () => observer.disconnect();
    // Re-attach when the sentinel mounts/unmounts (hasMore) or a load
    // finishes (isLoading) so a still-visible sentinel fires again.
  }, [hasMore, isLoading]);

  if (!hasMore) return null;

  return (
    <div ref={observerTarget} className="p-4 flex justify-center w-full">
      {isLoading && (
        <Button disabled variant="outline">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </Button>
      )}
    </div>
  );
};
