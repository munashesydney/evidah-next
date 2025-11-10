/**
 * Employee data - shared between client and server
 */
export interface Employee {
  id: string;
  name: string;
  role: string;
  avatar: string;
  theme: {
    primary: string;
    gradient: string;
  };
  capabilities: string[];
}

export const employees: Record<string, Employee> = {
  charlie: {
    id: 'charlie',
    name: 'Charlie',
    role: 'Customer Support',
    avatar: '/images/characters/charlie.png',
    theme: {
      primary: '#D97706',
      gradient: 'from-amber-500 to-orange-600',
    },
    capabilities: [
      'Handle Support Tickets',
      'Customer Communication',
      'Resolve inquiries efficiently',
    ],
  },
  marquavious: {
    id: 'marquavious',
    name: 'Marquavious',
    role: 'Live Chat Specialist',
    avatar: '/images/characters/mq.png',
    theme: {
      primary: '#2563EB',
      gradient: 'from-blue-500 to-blue-700',
    },
    capabilities: [
      'Live Chat Support',
      'Business Operations',
      'Real-time customer interactions',
    ],
  },
  emma: {
    id: 'emma',
    name: 'Emma',
    role: 'Knowledge Management',
    avatar: '/images/characters/emma.png',
    theme: {
      primary: '#DB2777',
      gradient: 'from-pink-500 to-pink-700',
    },
    capabilities: [
      'Create Articles',
      'Organize Information',
      'Maintain knowledge base',
    ],
  },
  'sung-wen': {
    id: 'sung-wen',
    name: 'Sung Wen',
    role: 'Training Specialist',
    avatar: '/images/characters/sw.png',
    theme: {
      primary: '#059669',
      gradient: 'from-emerald-500 to-emerald-700',
    },
    capabilities: [
      'Data Analysis',
      'Business Forecasting',
      'Strategic insights',
    ],
  },
};

/**
 * Get employee by ID
 */
export function getEmployee(employeeId: string): Employee | null {
  return employees[employeeId] || null;
}

