'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { Settings } from 'lucide-react'

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
  const [showPersonalitySettings, setShowPersonalitySettings] = useState(false)

  return (
    <div className="flex-shrink-0">
      {/* Employee Profile Card - Compact version matching old app */}
      <div className={`relative overflow-hidden bg-gradient-to-br ${employee.theme.gradient} p-6`}>
        {/* Subtle overlay for better text readability */}
        <div className="absolute inset-0 bg-black/10"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Employee Image */}
          <div className="w-24 h-24 rounded-full overflow-hidden bg-white/20 backdrop-blur-sm border-2 border-white/30 shadow-md mb-3">
            <Image 
              src={employee.avatar} 
              alt={employee.name}
              width={96}
              height={96}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Employee Info */}
          <div className="text-white">
            <h3 className="text-xl font-bold mb-1 drop-shadow-sm">
              {employee.name}
            </h3>
            <p className="text-sm font-medium opacity-90 drop-shadow-sm mb-3">
              {employee.role}
            </p>
            
            {/* Personality Settings */}
            <div className="mb-3 p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/90">Personality</span>
                <button
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  onClick={() => setShowPersonalitySettings(!showPersonalitySettings)}
                  aria-label="Toggle personality settings"
                >
                  <Settings size={14} />
                </button>
              </div>
              
              {showPersonalitySettings && (
                <div className="mt-3 space-y-3">
                  {/* Personality Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-white/80">
                      <span>Playful</span>
                      <span>Professional</span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min="0"
                        max="3"
                        value={personalityLevel}
                        onChange={(e) => onPersonalityChange(parseInt(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.3) ${(personalityLevel) * 33.33}%, rgba(255,255,255,0.1) ${(personalityLevel) * 33.33}%, rgba(255,255,255,0.1) 100%)`
                        }}
                      />
                      <style jsx>{`
                        .slider::-webkit-slider-thumb {
                          appearance: none;
                          height: 16px;
                          width: 16px;
                          border-radius: 50%;
                          background: white;
                          cursor: pointer;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        }
                        
                        .slider::-moz-range-thumb {
                          height: 16px;
                          width: 16px;
                          border-radius: 50%;
                          background: white;
                          cursor: pointer;
                          border: none;
                          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                        }
                        
                        .slider:focus {
                          outline: none;
                        }
                      `}</style>
                    </div>
                  </div>
                  
                  {/* Current Personality Description */}
                  <div className="text-xs text-white/90 bg-white/5 rounded-lg p-2">
                    {personalityDescriptions[personalityLevel]}
                  </div>
                </div>
              )}
            </div>
            
            {/* Change Assistant Button */}
            <button
              onClick={onChangeAssistant}
              className="text-xs font-medium bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 border border-white/30 text-white hover:bg-white/30 transition-colors cursor-pointer"
              aria-label="Change assistant"
            >
              Change Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
