"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { EmployeeNames } from "@/typings/types";
import {
  authenticate,
  logout,
  isUserPasswordProtected,
  getPasswordProtectedUsers,
  checkAdminPassword,
  getUserPermissions,
  hasPermission,
} from "@/app/actions/auth";
import { toast } from "sonner";
import { UserIdentificationMenu } from "@/components/identification/identificationMenu";

// Hook to detect mobile devices
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  return isMobile;
}

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
  const [user, setUser] = useState<EmployeeNames | null>(EmployeeNames.Alex);
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check for existing user session on component mount
    // const checkUserSession = async () => {
    //   const response = await fetch("/api/user");
    //   if (response.ok) {
    //     const data = await response.json();
    //     console.log("Fetched data from user api path", data);
    //     setUser(data.user);
    //   } else {
    //     const manualCookie = document.cookie;
    //     const splits = manualCookie.split("=");
    //     console.log("splits", splits);
    //     if (splits && splits.length > 1) {
    //       const user = splits[1];
    //       console.log("user", user);
    //       setUser(user as EmployeeNames);
    //     }
    //   }
    // };
    // checkUserSession();
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
    getUserPermissions: async () =>
      user ? await getUserPermissions(user) : [],
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
        {!isMobile && (
          <UserIdentificationMenu
            currentUser={user}
            onLogin={login}
            onLogout={handleLogout}
          />
        )}
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
