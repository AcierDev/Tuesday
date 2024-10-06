"use client"

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { useTheme } from 'next-themes'
import { motion, useAnimation, AnimatePresence } from 'framer-motion'
import { LogOut, Lock, ArrowLeft } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { useIdleTimer } from 'react-idle-timer'
import { Alert, AlertDescription } from "@/components/ui/alert"

type CreditOption = 'AM' | 'BC' | 'AW'

enum EmployeeNames {
  Alex = "Alex Morell",
  Ben = "Ben Clark",
  Bentzi = "Ben Steele",
  Akiva = "Akiva Weil",
  Paris = "Paris Carver",
  Dylan = "Dylan Carver",
  Tyler = "Tyler Blancett"
}

const OPTION_IMAGES: Record<CreditOption, string> = {
  'AM': '/images/alex.png',
  'BC': '/images/peter.png',
  'AW': '/images/akiva2.png',
}

const EMPLOYEE_MAP: Record<CreditOption, EmployeeNames> = {
  'AW': EmployeeNames.Akiva,
  'AM': EmployeeNames.Alex,
  'BC': EmployeeNames.Ben,
}

const INITIALS_MAP: Record<EmployeeNames, CreditOption> = {
  [EmployeeNames.Akiva]: 'AW',
  [EmployeeNames.Alex]: 'AM',
  [EmployeeNames.Ben]: 'BC',
}

const CREDIT_COLORS: Record<CreditOption, string> = {
  'AW': 'bg-orange-500',
  'AM': 'bg-blue-500',
  'BC': 'bg-green-500',
}

const PASSWORD_PROTECTED_USERS: CreditOption[] = ['AW']

interface EmployeeAvatarProps {
  credit: CreditOption
  index: number
  totalEmployees: number
  isLogoutHovered: boolean
  onSelect: (credit: CreditOption) => void
  isSelected: boolean
}

const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({ credit, index, totalEmployees, isLogoutHovered, onSelect, isSelected }) => {
  const { theme } = useTheme()
  const controls = useAnimation()
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    const animate = async () => {
      await controls.start("visible")
    }
    animate()
  }, [controls])

  const angle = (Math.PI * index) / (totalEmployees - 1)
  const radius = 180

  const variants = {
    hidden: { x: 0, y: 180, opacity: 0, scale: 0.8 },
    visible: {
      x: radius * Math.cos(angle),
      y: -radius * Math.sin(angle),
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 10,
        delay: index * 0.1
      }
    },
    hovered: {
      x: 0,
      y: 180,
      opacity: 0,
      scale: 0.8,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 20
      }
    }
  }

  const employeeName = EMPLOYEE_MAP[credit]

  return (
    <motion.div
      className="absolute"
      initial="hidden"
      animate={isLogoutHovered ? "hovered" : "visible"}
      variants={variants}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(credit)}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 400, damping: 10 }}
        className={`relative ${isSelected ? 'ring-4 ring-yellow-400' : ''}`}
      >
        {PASSWORD_PROTECTED_USERS.includes(credit) && (
          <div className="absolute -top-2 -right-2 bg-gray-800 rounded-full p-1 z-10">
            <Lock className="w-4 h-4 text-white" />
          </div>
        )}
        <Avatar className={`w-20 h-20 ${CREDIT_COLORS[credit]} ${theme === 'dark' ? 'border-gray-700' : 'border-white'} border-2 cursor-pointer`}>
          <AvatarImage src={OPTION_IMAGES[credit]} alt={employeeName} />
          <AvatarFallback>{credit}</AvatarFallback>
        </Avatar>
        <motion.div
          className={`mt-2 text-center font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: isHovered || isSelected ? 1 : 0, y: isHovered || isSelected ? 0 : -10 }}
          transition={{ duration: 0.2 }}
        >
          {employeeName}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

interface UserIdentificationMenuProps {
  currentUser: EmployeeNames
  onLogin: (user: EmployeeNames) => void
}

export function UserIdentificationMenu({ currentUser, onLogin }: UserIdentificationMenuProps) {
  const [isLogoutHovered, setIsLogoutHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [selectedUser, setSelectedUser] = useState<CreditOption | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { theme } = useTheme()
  const employees = Object.keys(EMPLOYEE_MAP) as CreditOption[]
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleIdle = () => {
    setIsVisible(true)
  }

  const { reset } = useIdleTimer({
    timeout: 30000,
    onIdle: handleIdle,
    debounce: 500
  })

  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden'
      const lastLoggedInUser = localStorage.getItem('lastLoggedInUser')
      if (lastLoggedInUser) {
        const index = employees.findIndex(e => EMPLOYEE_MAP[e] === lastLoggedInUser)
        if (index !== -1) {
          setFocusedIndex(index)
        }
      }
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isVisible, employees])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return

      switch (e.key) {
        case 'ArrowLeft':
          setFocusedIndex((prev) => (prev - 1 + employees.length) % employees.length)
          break
        case 'ArrowRight':
          setFocusedIndex((prev) => (prev + 1) % employees.length)
          break
        case 'Enter':
          if (focusedIndex !== -1) {
            handleUserSelect(employees[focusedIndex])
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown as any)
    return () => document.removeEventListener('keydown', handleKeyDown as any)
  }, [isVisible, employees, focusedIndex])

  const handleClose = () => {
    setIsVisible(false)
    setSelectedUser(null)
    setPassword('')
    setError(null)
    setFocusedIndex(-1)
    reset()
  }

  const handleUserSelect = (credit: CreditOption) => {
    setSelectedUser(credit)
    if (!PASSWORD_PROTECTED_USERS.includes(credit)) {
      onLogin(EMPLOYEE_MAP[credit])
      localStorage.setItem('lastLoggedInUser', EMPLOYEE_MAP[credit])
      handleClose()
    }
  }

  const handleLogin = () => {
    if (selectedUser) {
      // In a real application, you would verify the password here
      if (password === '1234') { // Example password
        onLogin(EMPLOYEE_MAP[selectedUser])
        localStorage.setItem('lastLoggedInUser', EMPLOYEE_MAP[selectedUser])
        handleClose()
      } else {
        setError('Incorrect password. Please try again.')
      }
    }
  }

  const handleBack = () => {
    setSelectedUser(null)
    setPassword('')
    setError(null)
  }

  return (
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
            className={`relative w-[400px] h-[400px] ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'} rounded-full flex items-center justify-center`}
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
                    />
                  ))}
                </AnimatePresence>
                <div className={`w-24 h-24 ${theme === 'dark' ? 'bg-gray-700' : 'bg-white'} rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`} />
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex flex-col items-center space-y-4"
              >
                <Avatar className={`w-24 h-24 ${CREDIT_COLORS[selectedUser]} ${theme === 'dark' ? 'border-gray-700' : 'border-white'} border-2`}>
                  <AvatarImage src={OPTION_IMAGES[selectedUser]} alt={EMPLOYEE_MAP[selectedUser]} />
                  <AvatarFallback>{selectedUser}</AvatarFallback>
                </Avatar>
                <div className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                  {EMPLOYEE_MAP[selectedUser]}
                </div>
                {PASSWORD_PROTECTED_USERS.includes(selectedUser) && (
                  <>
                    <Input
                      type="password"
                      placeholder="Enter password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-64"
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
              size="icon"
              className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 z-10 ${
                theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white text-gray-800 hover:bg-gray-100'
              }`}
              onMouseEnter={() => setIsLogoutHovered(true)}
              onMouseLeave={() => setIsLogoutHovered(false)}
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logout</span>
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}