'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { EmployeeNames } from '@/typings/types'
import { UserIdentificationMenu } from '@/components/identification/identificationMenu'
import { getPasswordProtectedUsers, isUserPasswordProtected, logout } from '@/app/actions/auth'

type UserContextType = {
  user: EmployeeNames | null
  login: (user: EmployeeNames) => void
  logout: () => Promise<void>
  isUserPasswordProtected: (user: EmployeeNames) => Promise<boolean>
  getPasswordProtectedUsers: () => Promise<EmployeeNames[]>
  isDarkMode: boolean
  toggleDarkMode: () => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<EmployeeNames | null>(null)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    // Check for existing user session on component mount
    const checkUserSession = async () => {
      const response = await fetch('/api/user')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    }
    checkUserSession()
  }, [])

  const login = (user: EmployeeNames) => {
    setUser(user)
  }

  const handleLogout = async () => {
    const result = await logout()
    if (result.success) {
      setUser(null)
    }
  }

  const toggleDarkMode = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const value = {
    user,
    login,
    logout: handleLogout,
    isUserPasswordProtected,
    getPasswordProtectedUsers,
    isDarkMode: theme === 'dark',
    toggleDarkMode,
  }

  useEffect(() => {
    console.log(user)
  }, [user])

  return (
    <UserContext.Provider value={value}>
      {children}
      <UserIdentificationMenu
        currentUser={user}
        onLogin={login}
        onLogout={handleLogout}
      />
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}