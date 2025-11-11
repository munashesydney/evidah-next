'use client'

import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'

interface Employee {
  id: string
  name: string
  role: string
  description: string
  avatar: string
  theme: {
    gradient: string
  }
}

const employees: Employee[] = [
  {
    id: 'charlie',
    name: 'Charlie',
    role: 'Customer Support',
    description: 'Smart and charming AI for customer support, Charlie crafts expertly tailored responses to customer queries while maintaining a friendly tone.',
    avatar: '/images/characters/charlie.png',
    theme: {
      gradient: 'from-amber-500 to-orange-600',
    },
  },
  {
    id: 'marquavious',
    name: 'Marquavious',
    role: 'Live Chat Specialist',
    description: 'Your go-to AI for real-time customer interactions, here to guide you through online store setup, product launches, and streamline business operations.',
    avatar: '/images/characters/mq.png',
    theme: {
      gradient: 'from-blue-500 to-blue-700',
    },
  },
  {
    id: 'emma',
    name: 'Emma',
    role: 'Knowledge Management',
    description: 'Emma specializes in organizing and maintaining your knowledge base, creating comprehensive articles and ensuring information stays current.',
    avatar: '/images/characters/emma.png',
    theme: {
      gradient: 'from-pink-500 to-pink-700',
    },
  },
  {
    id: 'sung-wen',
    name: 'Sung Wen',
    role: 'Training Specialist',
    description: 'A data genius seamlessly transforming complex data into precise calculations, forecasts, and clear actionable business insights that drive strategic decisions.',
    avatar: '/images/characters/sw.png',
    theme: {
      gradient: 'from-emerald-500 to-emerald-700',
    },
  },
]

export default function ChatSelectionPage() {
  const params = useParams()
  const router = useRouter()
  const selectedCompany = params.selectedCompany as string

  const handleEmployeeSelect = (employeeId: string) => {
    router.push(`/${selectedCompany}/chat/${employeeId}`)
  }

  return (
    <div className="h-full flex flex-col justify-center px-4 sm:px-6 max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Choose Your AI Employee
        </h2>
        <p className="text-base text-gray-600 dark:text-gray-400">
          Select an AI employee specialized for your needs
        </p>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        {employees.map((employee) => (
          <div
            key={employee.id}
            onClick={() => handleEmployeeSelect(employee.id)}
            className="relative overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 hover:scale-105 hover:shadow-2xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          >
            {/* Card Content */}
            <div className="relative p-6 flex flex-col h-full">
              {/* Employee Image */}
              <div className="flex-shrink-0 mb-4">
                <div className={`w-40 h-40 rounded-full overflow-hidden mx-auto bg-gradient-to-br ${employee.theme.gradient} border-4 border-white dark:border-gray-700 shadow-lg`}>
                  <Image
                    src={employee.avatar}
                    alt={employee.name}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Employee Info */}
              <div className="text-center flex-1 flex flex-col">
                <div className="mb-3">
                  <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-white">
                    {employee.name}
                  </h3>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {employee.role}
                  </p>
                </div>

                {/*<p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-3">
                  {employee.description}
                </p>*/}

                {/* Start Chat button */}
                <div className="mt-auto">
                  <div className={`text-sm font-medium rounded-full px-4 py-2 bg-gradient-to-r ${employee.theme.gradient} text-white shadow-md hover:shadow-lg transition-shadow`}>
                    Start Chat →
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center mt-8 max-w-2xl mx-auto">
        Each assistant has specialized knowledge and capabilities. You can switch between them anytime during your conversation.
      </div>
    </div>
  )
}
