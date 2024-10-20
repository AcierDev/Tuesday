"use client";

import { KeyboardEvent, ReactNode, useEffect, useState } from "react";
import { EmployeeNames } from "@/typings/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkAdminPassword, hasPermission } from "@/app/actions/auth";
import { AlertCircle } from "lucide-react";

export type AdminActionHandlerProps = {
  user: EmployeeNames | null;
  callback: () => Promise<void>;
  mode: "adminOnly" | "confirmationOnly" | "nonAdminWithPassword";
  actionName: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: (
    props: { onClick: () => Promise<void>; disabled: boolean },
  ) => ReactNode;
};

export function AdminActionHandler({
  user,
  callback,
  mode,
  actionName,
  isOpen,
  onOpenChange,
  children,
}: AdminActionHandlerProps) {
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await hasPermission(user, "admin");
        setIsAdmin(adminStatus);
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);

  const handleAction = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (mode === "adminOnly") {
        if (!user) {
          setError("You must be signed in to perform this action.");
          return;
        }
        if (isAdmin) {
          await callback();
          onOpenChange(false);
        } else {
          setError("You do not have admin permissions to perform this action.");
        }
      } else if (mode === "confirmationOnly") {
        onOpenChange(true);
      } else if (mode === "nonAdminWithPassword") {
        if (isAdmin) {
          await callback();
          onOpenChange(false);
        } else {
          onOpenChange(true);
        }
      }
    } catch (err) {
      setError("An error occurred while processing your request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError(null);
    setIsLoading(true);

    try {
      if (mode === "nonAdminWithPassword" && !isAdmin) {
        const isValidPassword = await checkAdminPassword(adminPassword);
        if (!isValidPassword) {
          setError("Invalid admin password.");
          return;
        }
      }
      await callback();
      onOpenChange(false);
    } catch (err) {
      setError("An error occurred while processing your request.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      onOpenChange(false);
    } else if (e.key === "Enter") {
      handleConfirm();
    }
  };

  return (
    <>
      {children({ onClick: handleAction, disabled: isLoading })}

      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-[425px] dark:bg-gray-800"
          onKeyDown={handleKeyDown}
        >
          <DialogHeader>
            <DialogTitle>{actionName}</DialogTitle>
            <DialogDescription>
              {mode === "nonAdminWithPassword" && !isAdmin
                ? "Please enter the admin password to proceed."
                : "Are you sure you want to perform this action?"}
            </DialogDescription>
          </DialogHeader>
          {mode === "nonAdminWithPassword" && !isAdmin && (
            <Input
              type="password"
              placeholder="Admin password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="dark:bg-gray-700 dark:text-white"
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            />
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="dark:bg-gray-700 dark:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
