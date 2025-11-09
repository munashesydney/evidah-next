'use client'

import React from 'react'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'

interface Employee {
  id: string
  name: string
  role: string
  avatar: string
  theme: {
    primary: string
    gradient: string
  }
  capabilities?: string[]
}

interface EmployeeSidebarProps {
  employee: Employee
  onChangeAssistant: () => void
  personalityLevel: number
  onPersonalityChange: (level: number) => void
}

const personalityDescriptions = [
  'Very Playful - Casual, fun, and relaxed communication style',
  'Balanced - Friendly yet professional approach',
  'Professional - Formal and business-focused communication',
  'Very Professional - Strictly formal and corporate tone',
]

export default function EmployeeSidebar({
  employee,
  onChangeAssistant,
  personalityLevel,
  onPersonalityChange,
}: EmployeeSidebarProps) {
  return (
    <div className="w-[280px] h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Employee Profile Card */}
      <div className={`bg-gradient-to-br ${employee.theme.gradient} p-6 text-white`}>
        {/* Avatar */}
        <div className="flex justify-center mb-4">
          <div className="w-32 h-32 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm border-4 border-white/30 shadow-lg">
            <Image
              src={employee.avatar}
              alt={employee.name}
              width={128}
              height={128}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name and Role */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold mb-1 drop-shadow-sm">{employee.name}</h2>
          <p className="text-sm opacity-90 drop-shadow-sm">{employee.role}</p>
        </div>

        {/* Change Assistant Button */}
        <button
          onClick={onChangeAssistant}
          className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
        >
          Change Assistant
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Personality Settings */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Personality Level
          </h3>
          
          {/* Personality Slider */}
          <div className="space-y-4">
            <input
              type="range"
              min="0"
              max="3"
              value={personalityLevel}
              onChange={(e) => onPersonalityChange(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              style={{
                background: `linear-gradient(to right, ${employee.theme.primary} 0%, ${employee.theme.primary} ${(personalityLevel / 3) * 100}%, rgb(229, 231, 235) ${(personalityLevel / 3) * 100}%, rgb(229, 231, 235) 100%)`,
              }}
            />
            
            {/* Level Labels */}
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>Playful</span>
              <span>Balanced</span>
              <span>Professional</span>
            </div>

            {/* Current Level Description */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {personalityDescriptions[personalityLevel]}
              </p>
            </div>
          </div>
        </div>

        {/* Capabilities */}
        {employee.capabilities && employee.capabilities.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Capabilities
            </h3>
            <div className="space-y-2">
              {employee.capabilities.map((capability, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400"
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 bg-gradient-to-br ${employee.theme.gradient}`} />
                  <span>{capability}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
