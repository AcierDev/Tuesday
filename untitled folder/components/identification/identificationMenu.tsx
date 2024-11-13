"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useIdleTimer } from "react-idle-timer";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CREDIT_COLORS,
  CreditOption,
  EMPLOYEE_MAP,
  INITIALS_MAP,
  OPTION_IMAGES,
} from "@/utils/constants";
import { EmployeeNames } from "@/typings/types";
import {
  authenticate,
  isUserPasswordProtected,
  getPasswordProtectedUsers,
  getUserPermissions,
} from "@/app/actions/auth";
import { EmployeeAvatar } from "./EmployeeAvatar";
import { useUser } from "@/contexts/UserContext";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";

export function UserIdentificationMenu() {
  const { user: currentUser, isAdmin, login, logout } = useUser();
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<CreditOption | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const employees = Object.keys(EMPLOYEE_MAP) as CreditOption[];
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const [passwordProtectedUsers, setPasswordProtectedUsers] = useState<
    EmployeeNames[]
  >([]);
  const { settings } = useOrderSettings();

  const handleIdle = () => {
    setIsVisible(true);
  };

  const { reset, pause, resume } = useIdleTimer({
    timeout: Math.max(settings.idleTimeout, 5000),
    onIdle: handleIdle,
    debounce: 500,
  });

  useEffect(() => {
    if (isAdmin && !settings.showIdentificationMenuForAdmins) {
      pause();
    } else {
      resume();
    }
  }, [isAdmin, settings.showIdentificationMenuForAdmins, pause, resume]);

  useEffect(() => {
    const fetchPasswordProtectedUsers = async () => {
      const protectedUsers = await getPasswordProtectedUsers();
      setPasswordProtectedUsers(protectedUsers);
    };
    fetchPasswordProtectedUsers();
  }, []);

  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
      if (currentUser) {
        const index = employees.findIndex(
          (e) => EMPLOYEE_MAP[e] === currentUser
        );
        if (index !== -1) {
          setFocusedIndex(index);
        }
      }
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isVisible, employees, currentUser]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;

      if (
        selectedUser &&
        passwordProtectedUsers.includes(EMPLOYEE_MAP[selectedUser])
      ) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleLogin();
        } else if (e.key === "Escape") {
          e.preventDefault();
          handleBack();
        }
      } else {
        switch (e.key) {
          case "ArrowLeft":
            setFocusedIndex(
              (prev) => (prev - 1 + employees.length) % employees.length
            );
            break;
          case "ArrowRight":
            setFocusedIndex((prev) => (prev + 1) % employees.length);
            break;
          case "Enter":
            if (focusedIndex !== -1) {
              handleUserSelect(employees[focusedIndex]);
            }
            break;
          case "Escape":
            handleClose();
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown as any);
    return () => document.removeEventListener("keydown", handleKeyDown as any);
  }, [
    isVisible,
    employees,
    focusedIndex,
    selectedUser,
    passwordProtectedUsers,
  ]);

  useEffect(() => {
    if (
      selectedUser &&
      passwordProtectedUsers.includes(EMPLOYEE_MAP[selectedUser])
    ) {
      passwordInputRef.current?.focus();
    }
  }, [selectedUser, passwordProtectedUsers]);

  const handleClose = () => {
    setIsVisible(false);
    setSelectedUser(null);
    setPassword("");
    setError(null);
    setFocusedIndex(-1);
    reset();
  };

  const handleUserSelect = async (credit: CreditOption) => {
    setSelectedUser(credit);
    const isProtected = await isUserPasswordProtected(EMPLOYEE_MAP[credit]);
    if (!isProtected) {
      // Immediately log in non-password-protected users
      const formData = new FormData();
      formData.append("user", EMPLOYEE_MAP[credit]);

      console.log("User value:", formData.get("user"));

      const result = await authenticate(formData);
      console.log(result);
      if (result.success) {
        document.cookie = `username=${EMPLOYEE_MAP[credit]}; expires=Thu, 18 Dec 2030 12:00:00 UTC; path=/`;
        console.log("Just set cookie to: ", document.cookie);
        login(formData);
        handleClose();
      } else {
        setError(result.error || "Authentication failed. Please try again.");
      }
    }
  };

  const handleLogin = async () => {
    if (selectedUser) {
      const formData = new FormData();
      formData.append("user", EMPLOYEE_MAP[selectedUser]);
      formData.append("password", password);

      const result = await authenticate(formData);

      if (result.success) {
        document.cookie = `username=${EMPLOYEE_MAP[selectedUser]}; expires=Thu, 18 Dec 2030 12:00:00 UTC; path=/`;
        console.log("Just set cookie to: ", document.cookie);
        login(formData);
        handleClose();
      } else {
        setError(result.error || "Authentication failed. Please try again.");
      }
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setPassword("");
    setError(null);
  };

  const handleLogout = async () => {
    await logout();
    handleClose();
  };

  const handleOpenDialog = () => {
    setIsVisible(true);
  };

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={handleClose}
          >
            <motion.div
              ref={containerRef}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`relative w-[400px] h-[400px] ${
                theme === "dark" ? "bg-gray-800" : "bg-gray-100"
              } rounded-full flex items-center justify-center`}
              onClick={(e) => e.stopPropagation()}
            >
              {!selectedUser ? (
                <>
                  <AnimatePresence>
                    {employees.map((credit, index) => (
                      <EmployeeAvatar
                        key={credit}
                        credit={credit}
                        index={index}
                        totalEmployees={employees.length}
                        isLogoutHovered={isLogoutHovered}
                        onSelect={handleUserSelect}
                        isSelected={index === focusedIndex}
                        isPasswordProtected={passwordProtectedUsers.includes(
                          EMPLOYEE_MAP[credit]
                        )}
                      />
                    ))}
                  </AnimatePresence>
                  <AnimatePresence>
                    {!isLogoutHovered && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.2 }}
                        className={`w-32 h-32 ${
                          theme === "dark" ? "bg-gray-700" : "bg-white"
                        } rounded-full absolute inset-0 m-auto flex flex-col items-center justify-center shadow-lg`}
                      >
                        <Users
                          className={`w-12 h-12 ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}
                        />
                        <p
                          className={`mt-2 text-sm font-medium ${
                            theme === "dark" ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {currentUser ? "Switch User" : "Select User"}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="flex flex-col items-center space-y-4"
                >
                  <Avatar
                    className={`w-24 h-24 ${
                      theme === "dark" ? "border-gray-700" : "border-white"
                    } border-2`}
                  >
                    <AvatarImage
                      src={OPTION_IMAGES[selectedUser]}
                      alt={EMPLOYEE_MAP[selectedUser]}
                    />
                    <AvatarFallback>{selectedUser}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`text-xl font-bold ${
                      theme === "dark" ? "text-white" : "text-gray-800"
                    }`}
                  >
                    {EMPLOYEE_MAP[selectedUser]}
                  </div>
                  {passwordProtectedUsers.includes(
                    EMPLOYEE_MAP[selectedUser]
                  ) && (
                    <>
                      <Input
                        ref={passwordInputRef}
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-64"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleLogin();
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            handleBack();
                          }
                        }}
                      />
                      {error && (
                        <Alert variant="destructive">
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}
                      <div className="flex space-x-2">
                        <Button onClick={handleBack} variant="outline">
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back
                        </Button>
                        <Button onClick={handleLogin}>Login</Button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
              <Button
                variant="outline"
                className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-10 rounded-full w-16 h-16 p-0 flex items-center justify-center ${
                  theme === "dark"
                    ? "bg-gray-700 text-white hover:bg-gray-600 hover:text-white border-gray-700"
                    : "bg-white text-gray-800 hover:bg-gray-100 hover:text-gray-900 border-white"
                } border-2`}
                onMouseEnter={() => setIsLogoutHovered(true)}
                onMouseLeave={() => setIsLogoutHovered(false)}
                onClick={handleLogout}
              >
                <LogOut className="h-8 w-8" />
                <span className="sr-only">Logout</span>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current User Display */}
      <Button
        variant="ghost"
        onClick={handleOpenDialog}
        className={`fixed bottom-6 right-6 flex items-center space-x-3 p-3 rounded-full shadow-lg z-40 transition-colors duration-200 ${
          currentUser
            ? CREDIT_COLORS[INITIALS_MAP[currentUser]]
            : theme === "dark"
            ? "bg-gray-800 hover:bg-gray-700"
            : "bg-white hover:bg-gray-100"
        }`}
        style={{
          minWidth: "200px",
          height: "60px",
        }}
      >
        {currentUser ? (
          <>
            <Avatar className="w-12 h-12">
              <AvatarImage
                src={OPTION_IMAGES[INITIALS_MAP[currentUser]]}
                alt={currentUser}
              />
              <AvatarFallback>
                {currentUser
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span
              className={`font-medium text-lg ${
                theme === "dark" ? "text-white" : "text-gray-800"
              }`}
            >
              {currentUser}
            </span>
          </>
        ) : (
          <span
            className={`font-medium text-lg ${
              theme === "dark" ? "text-white" : "text-gray-800"
            }`}
          >
            No user logged in
          </span>
        )}
      </Button>
    </>
  );
}
