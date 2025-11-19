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

const defaultEmployee: Employee = {
  id: 'assistant',
  name: 'Assistant',
  role: 'AI Assistant',
  avatar: '',
  theme: {
    primary: '#6366F1',
    gradient: 'from-indigo-500 to-indigo-600',
  },
  capabilities: [],
};

interface LoadingMessageProps {
  employee?: Employee;
}

const LoadingMessage: React.FC<LoadingMessageProps> = ({ employee = defaultEmployee }) => {
  // Get spinner color based on employee
  const getSpinnerColor = () => {
    const id = employee.id
    switch (id) {
      case 'emma':
        return 'border-pink-500'
      case 'marquavious':
        return 'border-blue-500'
      case 'charlie':
        return 'border-amber-500'
      case 'sung-wen':
        return 'border-emerald-500'
      default:
        return 'border-violet-500'
    }
  }

  return (
    <div className="flex items-start mb-6">
      {/* Bot Avatar */}
      <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${employee.theme.gradient} flex items-center justify-center text-white font-bold mr-3 shrink-0 shadow-lg`}>
        {employee.name.charAt(0)}
      </div>
      
      {/* Loading indicator - Chat bubble with shimmer */}
      <div className="relative overflow-hidden bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
        {/* Shimmer effect on entire card */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-gray-600/40 to-transparent shimmer-animation"
        ></div>
        
        {/* Content */}
        <div className="flex items-center gap-2.5 relative z-10">
          {/* Circular spinner */}
          <div className={`w-4 h-4 border-2 ${getSpinnerColor()} border-t-transparent rounded-full animate-spin`}></div>
          {/* Thinking text */}
          <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Thinking</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingMessage;

