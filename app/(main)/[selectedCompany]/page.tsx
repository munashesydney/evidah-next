'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import Image from 'next/image'
import { useTheme } from 'next-themes'

interface Employee {
  id: string
  name: string
  role: string
  description: string
  image: string
  theme: {
    primary: string
    secondary: string
    light: string
    gradient: string
    bg: string
    darkBg: string
  }
  helpText: string
  capabilities: Array<{
    title: string
    description: string
  }>
  requiredFeature?: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const selectedCompany = params.selectedCompany as string
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const currentTheme = mounted ? (resolvedTheme || theme || 'light') : 'light'
  
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Handle theme mounting
  useEffect(() => {
    setMounted(true)
  }, [])

  // Employee data
  const employees: Employee[] = [
    {
      id: 'charlie',
      name: 'Charlie',
      role: 'Customer Support',
      description: 'Smart and charming AI for customer support, Charlie crafts expertly tailored responses to customer queries while maintaining a friendly tone.',
      image: '/images/characters/charlie.png',
      theme: {
        primary: '#D97706',
        secondary: '#92400E',
        light: '#FEF3C7',
        gradient: 'from-amber-500 to-orange-600',
        bg: 'from-amber-50 to-orange-50',
        darkBg: 'from-amber-900 to-orange-900'
      },
      helpText: "How can I help with customer support?",
      capabilities: [
        {
          title: "Handle Support Tickets",
          description: "Resolve customer inquiries and complaints efficiently"
        },
        {
          title: "Customer Communication",
          description: "Craft professional and empathetic responses"
        }
      ],
      requiredFeature: 'helpdesk'
    },
    {
      id: 'marquavious',
      name: 'Marquavious',
      role: 'Live Chat Specialist',
      description: 'Your go-to AI for real-time customer interactions, here to guide you through online store setup, product launches, and streamline business operations.',
      image: '/images/characters/mq.png',
      theme: {
        primary: '#2563EB',
        secondary: '#1D4ED8',
        light: '#DBEAFE',
        gradient: 'from-blue-500 to-blue-700',
        bg: 'from-blue-50 to-blue-100',
        darkBg: 'from-blue-900 to-indigo-900'
      },
      helpText: "How can I help with live chat and business operations?",
      capabilities: [
        {
          title: "Live Chat Support",
          description: "Manage real-time customer conversations"
        },
        {
          title: "Business Operations",
          description: "Streamline your online store and product launches"
        }
      ],
      requiredFeature: 'livechat'
    },
    {
      id: 'emma',
      name: 'Emma',
      role: 'Knowledge Management',
      description: 'Emma specializes in organizing and maintaining your knowledge base, creating comprehensive articles and ensuring information stays current.',
      image: '/images/characters/emma.png',
      theme: {
        primary: '#DB2777',
        secondary: '#BE185D',
        light: '#FCE7F3',
        gradient: 'from-pink-500 to-pink-700',
        bg: 'from-pink-50 to-pink-100',
        darkBg: 'from-pink-900 to-rose-900'
      },
      helpText: "How can I help with knowledge management?",
      capabilities: [
        {
          title: "Create Articles",
          description: "Build comprehensive knowledge base content"
        },
        {
          title: "Organize Information",
          description: "Structure and maintain your knowledge repository"
        }
      ],
      requiredFeature: 'knowledgebase'
    },
    {
      id: 'sung-wen',
      name: 'Sung Wen',
      role: 'Training Specialist',
      description: 'A data genius seamlessly transforming complex data into precise calculations, forecasts, and clear actionable business insights that drive strategic decisions.',
      image: '/images/characters/sw.png',
      theme: {
        primary: '#059669',
        secondary: '#047857',
        light: '#D1FAE5',
        gradient: 'from-emerald-500 to-emerald-700',
        bg: 'from-emerald-50 to-emerald-100',
        darkBg: 'from-emerald-950 to-teal-950'
      },
      helpText: "How can I help with data analysis and training?",
      capabilities: [
        {
          title: "Data Analysis",
          description: "Transform complex data into actionable insights"
        },
        {
          title: "Business Forecasting",
          description: "Generate precise calculations and strategic forecasts"
        }
      ],
      requiredFeature: 'training'
    }
  ]

  // Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid)
      } else {
        router.push('/signin')
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Handle employee selection
  const handleEmployeeSelect = (employee: Employee) => {
    // Navigate to chat page with selected employee
    router.push(`/${selectedCompany}/chat/${employee.id}`)
  }

  // For now, all employees are accessible (we'll add access control later)
  const hasEmployeeAccess = (employee: Employee) => {
    return true // TODO: Implement access control
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col justify-center px-4 sm:px-6 max-w-4xl mx-auto py-8">
      {/* Compact Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Choose Your AI Employee
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Select an AI employee specialized for your needs
        </p>
      </div>

      {/* Employee Cards Grid - More Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        {employees.map((employee) => {
          const hasAccess = hasEmployeeAccess(employee)
          
          return (
            <div
              key={employee.id}
              onClick={() => hasAccess && handleEmployeeSelect(employee)}
              className={`pb-4 relative overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                currentTheme === 'light'
                  ? `bg-white border-2 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg ${!hasAccess ? 'opacity-60' : ''}`
                  : `bg-gradient-to-br ${employee.theme.gradient} ${!hasAccess ? 'opacity-60' : ''}`
              }`}
            >
              {/* Card Content */}
              <div className="relative p-4 h-66 flex flex-col">
                {/* Employee Image */}
                <div className="flex-shrink-0 mb-3">
                  <div className={`w-36 h-36 rounded-full overflow-hidden mx-auto ${
                    currentTheme === 'light'
                      ? `bg-gradient-to-br ${employee.theme.gradient} border-2 border-white shadow-md`
                      : 'bg-white/20 backdrop-blur-sm border-2 border-white/30'
                  }`}>
                    <Image
                      src={employee.image}
                      alt={employee.name}
                      width={144}
                      height={144}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                {/* Employee Info */}
                <div className={`text-center flex-1 flex flex-col justify-between ${
                  currentTheme === 'light' ? 'text-gray-800' : 'text-white'
                }`}>
                  <div>
                    <h3 className={`text-lg font-bold mb-1 ${
                      currentTheme === 'light' ? 'text-gray-900' : 'drop-shadow-sm'
                    }`}>
                      {employee.name}
                    </h3>
                    <p className={`text-xs font-medium ${
                      currentTheme === 'light' 
                        ? `text-gray-600` 
                        : 'opacity-90 drop-shadow-sm'
                    }`}>
                      {employee.role}
                    </p>
                  </div>
                  
                  {/* Start Chat button - Show lock icon if no access */}
                  <div className="mt-3">
                    <div className={`text-xs font-medium rounded-full px-3 py-1 ${
                      currentTheme === 'light'
                        ? `bg-gradient-to-r ${employee.theme.gradient} text-white shadow-md`
                        : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white'
                    }`}>
                      {hasAccess ? 'Start Chat →' : '🔒 Locked'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Theme-aware overlay */}
              {currentTheme === 'dark' && (
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors"></div>
              )}

              {/* Lock overlay for restricted employees */}
              {!hasAccess && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="bg-white/90 dark:bg-gray-800/90 rounded-full p-2">
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer note - More compact */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-5 max-w-md mx-auto">
        Each assistant has specialized knowledge. Switch between them anytime.
      </div>
    </div>
  )
}
