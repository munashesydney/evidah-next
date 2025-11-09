import React from "react";

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

interface LoadingMessageProps {
  employee: Employee;
}

const LoadingMessage: React.FC<LoadingMessageProps> = ({ employee }) => {
  // Get dot color based on employee
  const getDotColor = () => {
    const id = employee.id
    switch (id) {
      case 'emma':
        return 'bg-pink-500'
      case 'marquavious':
        return 'bg-blue-500'
      case 'charlie':
        return 'bg-amber-500'
      case 'sung-wen':
        return 'bg-emerald-500'
      default:
        return 'bg-violet-500'
    }
  }

  return (
    <div className="flex items-start mb-6">
      {/* Bot Avatar */}
      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${employee.theme.gradient} flex items-center justify-center text-white font-bold mr-3 shrink-0 shadow-lg`}>
        {employee.name.charAt(0)}
      </div>
      
      {/* Loading indicator */}
      <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-2xl rounded-tl-md shadow-lg border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
        <div className="flex space-x-1">
          <div className={`w-2 h-2 rounded-full ${getDotColor()} animate-bounce`} style={{ animationDelay: '0ms' }}></div>
          <div className={`w-2 h-2 rounded-full ${getDotColor()} animate-bounce`} style={{ animationDelay: '150ms' }}></div>
          <div className={`w-2 h-2 rounded-full ${getDotColor()} animate-bounce`} style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingMessage;

