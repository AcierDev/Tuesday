"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { EmployeeNames } from "@/typings/types";
import { UserIdentificationMenu } from "@/components/identification/identificationMenu";
import {
  authenticate,
  checkAdminPassword,
  getPasswordProtectedUsers,
  getUserPermissions,
  hasPermission,
  isUserPasswordProtected,
  logout,
} from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { toast, Toaster } from "sonner";

type Permission = "read" | "write" | "admin";

type UserContextType = {
  user: EmployeeNames | null;
  isAdmin: boolean;
  login: (formData: FormData) => Promise<void>;
  logout: () => Promise<void>;
  isUserPasswordProtected: (user: EmployeeNames) => Promise<boolean>;
  getPasswordProtectedUsers: () => Promise<EmployeeNames[]>;
  checkAdminPassword: (password: string) => Promise<boolean>;
  getUserPermissions: () => Promise<Permission[]>;
  hasPermission: (permission: Permission) => Promise<boolean>;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<EmployeeNames | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Check for existing user session on component mount
    const checkUserSession = async () => {
      const response = await fetch("/api/user");
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    };
    checkUserSession();
  }, []);

  useEffect(() => {
    const updateAdminStatus = async () => {
      if (user) {
        const permissions = await getUserPermissions(user);
        setIsAdmin(permissions.includes("admin"));
      } else {
        setIsAdmin(false);
      }
    };
    updateAdminStatus();
  }, [user]);

  const login = async (formData: FormData) => {
    const result = await authenticate(formData);
    if (result.success) {
      setUser(formData.get("user") as EmployeeNames);
      toast.success("Login Successful", {
        description: `Welcome, ${formData.get("user")}!`,
      });
    } else {
      toast.error("Login Failed", {
        description: result.error,
      });
    }
  };

  const handleLogout = async () => {
    const result = await logout();
    if (result.success) {
      setUser(null);
      setIsAdmin(false);
      toast.success("Logout Successful", {
        description: "You have been logged out.",
      });
    }
  };

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const value: UserContextType = {
    user,
    isAdmin,
    login,
    logout: handleLogout,
    isUserPasswordProtected,
    getPasswordProtectedUsers,
    checkAdminPassword,
    getUserPermissions: async () => user ? await getUserPermissions(user) : [],
    hasPermission: async (permission) =>
      user ? await hasPermission(user, permission) : false,
    isDarkMode: theme === "dark",
    toggleDarkMode,
  };

  return (
    <UserContext.Provider value={value}>
      <div
        className={`${theme} min-h-screen bg-background text-foreground dark:bg-gray-900`}
      >
        {children}
        <UserIdentificationMenu
          currentUser={user}
          onLogin={login}
          onLogout={handleLogout}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={toggleDarkMode}
          className="fixed bottom-4 right-4"
        >
          {theme === "dark"
            ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
                />
              </svg>
            )
            : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
                />
              </svg>
            )}
          <span className="sr-only">Toggle dark mode</span>
        </Button>
      </div>
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
