"use server";

import { cookies } from "next/headers";
import { EmployeeNames } from "@/typings/types";
import process from "node:process";

type Permission = "read" | "write" | "admin";

type EmployeeAuth = {
  password?: string;
  permissions?: Permission[];
};

const employeeAuthMap: Record<EmployeeNames, EmployeeAuth> = {
  [EmployeeNames.Alex]: {},
  [EmployeeNames.Ben]: {},
  [EmployeeNames.Bentzi]: {
    password: "4455",
    permissions: ["read", "write", "admin"],
  },
  [EmployeeNames.Akiva]: {
    password: "akiva789",
    permissions: ["read", "write", "admin"],
  },
  [EmployeeNames.Paris]: {},
  [EmployeeNames.Dylan]: {},
  [EmployeeNames.Tyler]: {},
};

export async function authenticate(formData: FormData) {
  console.log("Function called with formData:", formData);
  console.log("Type of formData:", typeof formData);
  console.log("Is FormData?", formData instanceof FormData);

  const user = formData.get("user") as EmployeeNames;
  console.log(user);
  const password = formData.get("password") as string;

  if (!employeeAuthMap[user]) {
    return { success: false, error: "User not found" };
  }

  const { password: correctPassword } = employeeAuthMap[user];

  if (correctPassword && password !== correctPassword) {
    return { success: false, error: "Invalid credentials" };
  }

  // Set a cookie to maintain the session
  cookies().set("user", user, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return { success: true };
}

export async function isUserPasswordProtected(user: EmployeeNames) {
  return !!employeeAuthMap[user]?.password;
}

export async function getPasswordProtectedUsers() {
  return Object.entries(employeeAuthMap)
    .filter(([_, auth]) => !!auth.password)
    .map(([user]) => user as EmployeeNames);
}

export async function logout() {
  cookies().delete("user");
  return { success: true };
}

export async function checkAdminPassword(password: string) {
  const adminUsers = Object.entries(employeeAuthMap).filter(([_, auth]) =>
    auth.permissions?.includes("admin")
  );

  return adminUsers.some(([_, auth]) => auth.password === password);
}

export async function getUserPermissions(user: EmployeeNames) {
  return employeeAuthMap[user]?.permissions || [];
}

export async function hasPermission(
  user: EmployeeNames,
  permission: Permission
) {
  return employeeAuthMap[user]?.permissions?.includes(permission) || false;
}
