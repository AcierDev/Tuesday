'use server'

import { cookies } from 'next/headers'

type EmployeeName = 
  | "Alex Morrell"
  | "Ben Clark"
  | "Ben Steele"
  | "Akiva Weil"
  | "Paris Carver"
  | "Dylan Carver"
  | "Tyler Blancett"

type EmployeeAuth = {
  password?: string;
  isPasswordProtected: boolean;
}

const employeeAuthMap: Record<EmployeeName, EmployeeAuth> = {
  "Alex Morrell": { isPasswordProtected: false,},
  "Ben Clark": { isPasswordProtected: false,},
  "Ben Steele": { isPasswordProtected: false, password: '4455' },
  "Akiva Weil": { isPasswordProtected: true, password: "akiva789" },
  "Paris Carver": { isPasswordProtected: false },
  "Dylan Carver": { isPasswordProtected: false },
  "Tyler Blancett": { isPasswordProtected: false },
}

export async function authenticate(formData: FormData) {
  const user = formData.get('user') as EmployeeName
  const password = formData.get('password') as string

  if (!employeeAuthMap[user]) {
    return { success: false, error: 'User not found' }
  }

  const { isPasswordProtected, password: correctPassword } = employeeAuthMap[user]

  if (isPasswordProtected && password !== correctPassword) {
    return { success: false, error: 'Invalid credentials' }
  }

  // Set a cookie to maintain the session
  cookies().set('user', user, { 
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7 // 1 week
  })

  return { success: true }
}

export async function isUserPasswordProtected(user: EmployeeName) {
  return employeeAuthMap[user]?.isPasswordProtected ?? false
}

export async function getPasswordProtectedUsers() {
  return Object.entries(employeeAuthMap)
    .filter(([_, auth]) => auth.isPasswordProtected)
    .map(([user]) => user)
}

export async function logout() {
  cookies().delete('user')
  return { success: true }
}