import React, { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 } // Trigger when 10% visible to be more responsive
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

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
