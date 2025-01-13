import { Activity, BaseActivity } from "@/typings/types";
import { useUser } from "@/contexts/UserContext";

export function useActivities() {
  const { user } = useUser();

  const logActivity = async (
    itemId: string,
    type: Activity["type"],
    changes: Activity["changes"],
    metadata?: Activity["metadata"]
  ) => {
    const activity: Omit<BaseActivity, "id"> = {
      itemId,
      type,
      timestamp: Date.now(),
      userName: user || "",
      changes,
      metadata,
    };

    try {
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(activity),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to log activity");
      }

      return await response.json();
    } catch (error) {
      console.error("Error logging activity:", error);
      throw error;
    }
  };

  const getActivities = async (
    itemId?: string,
    limit?: number,
    skip?: number
  ) => {
    const params = new URLSearchParams();
    if (itemId) params.append("itemId", itemId);
    if (limit) params.append("limit", limit.toString());
    if (skip) params.append("skip", skip.toString());

    try {
      const response = await fetch(`/api/activities?${params}`);
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch activities");
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!contentType?.includes("application/json")) {
        throw new Error("Response is not JSON");
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("useActivities: Error fetching activities:", error);
      throw error;
    }
  };

  return {
    logActivity,
    getActivities,
  };
}
