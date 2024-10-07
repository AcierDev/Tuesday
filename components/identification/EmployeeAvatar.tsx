'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { motion, useAnimation } from 'framer-motion'
import { Lock } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { CREDIT_COLORS, CreditOption, EMPLOYEE_MAP, OPTION_IMAGES } from '@/utils/constants'
import { EmployeeNames } from '@/typings/types'

interface EmployeeAvatarProps {
  credit: CreditOption
  index: number
  totalEmployees: number
  isLogoutHovered: boolean
  onSelect: (credit: CreditOption) => void
  isSelected: boolean
  isPasswordProtected: boolean
}

export const EmployeeAvatar: React.FC<EmployeeAvatarProps> = ({ 
  credit, 
  index, 
  totalEmployees, 
  isLogoutHovered, 
  onSelect, 
  isSelected, 
  isPasswordProtected 
}) => {
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
        {isPasswordProtected && (
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