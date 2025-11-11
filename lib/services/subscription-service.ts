import { Timestamp } from 'firebase/firestore';

export interface SubscriptionData {
  subscriptionId: string | null;
  stripeCustomerId: string;
  employeeId: string;
  billingCycle: 'monthly' | 'yearly';
  subscriptionType: string;
  status: string;
  amount: number;
  currency: string;
  couponCode?: string;
  discountAmount?: number;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  color: string;
  features: string[];
  employeeKey: 'charlie' | 'marquavious' | 'emma' | 'sungWen' | 'evidahQ';
}

export const PLANS: Record<string, PlanConfig> = {
  evidah_q: {
    id: 'evidah_q',
    name: 'EvidahQ Bundle',
    displayName: 'EvidahQ',
    description: 'Complete AI team - All employees included',
    monthlyPrice: 39,
    yearlyPrice: 348,
    color: '#EF4444',
    features: [
      'All 5 AI employees',
      'Unlimited conversations',
      'Priority support',
      'Advanced analytics',
      'Custom training'
    ],
    employeeKey: 'evidahQ'
  },
  charlie: {
    id: 'charlie',
    name: 'Charlie',
    displayName: 'Charlie',
    description: 'Customer Support Specialist',
    monthlyPrice: 29,
    yearlyPrice: 228,
    color: '#f97316',
    features: [
      'Customer support automation',
      'Ticket management',
      'Email responses',
      'FAQ handling'
    ],
    employeeKey: 'charlie'
  },
  marquavious: {
    id: 'marquavious',
    name: 'Marquavious',
    displayName: 'Marquavious',
    description: 'Live Chat Specialist',
    monthlyPrice: 29,
    yearlyPrice: 228,
    color: '#2563EB',
    features: [
      'Real-time chat support',
      'Instant responses',
      'Multi-channel support',
      'Chat analytics'
    ],
    employeeKey: 'marquavious'
  },
  emma: {
    id: 'emma',
    name: 'Emma',
    displayName: 'Emma',
    description: 'Knowledge Management Expert',
    monthlyPrice: 29,
    yearlyPrice: 228,
    color: '#EC4899',
    features: [
      'Knowledge base management',
      'Content organization',
      'Search optimization',
      'Documentation'
    ],
    employeeKey: 'emma'
  },
  sung_wen: {
    id: 'sung_wen',
    name: 'Sung Wen',
    displayName: 'Sung Wen',
    description: 'Training Specialist',
    monthlyPrice: 29,
    yearlyPrice: 228,
    color: '#10B981',
    features: [
      'Team training',
      'Onboarding automation',
      'Learning materials',
      'Progress tracking'
    ],
    employeeKey: 'sungWen'
  }
};

export function calculateProratedCost(
  currentAmount: number,
  newAmount: number,
  daysRemaining: number,
  daysInPeriod: number
): {
  proratedCharge: number;
  credit: number;
  totalDue: number;
} {
  const credit = (currentAmount * daysRemaining) / daysInPeriod;
  const proratedCharge = (newAmount * daysRemaining) / daysInPeriod;
  const totalDue = proratedCharge - credit;

  return {
    proratedCharge: Math.round(proratedCharge * 100) / 100,
    credit: Math.round(credit * 100) / 100,
    totalDue: Math.round(totalDue * 100) / 100
  };
}

export function getActiveEmployees(knowledgebaseData: any): string[] {
  const employees: string[] = [];
  if (knowledgebaseData.charlie) employees.push('charlie');
  if (knowledgebaseData.marquavious) employees.push('marquavious');
  if (knowledgebaseData.emma) employees.push('emma');
  if (knowledgebaseData.sungWen) employees.push('sung_wen');
  if (knowledgebaseData.evidahQ) employees.push('evidah_q');
  return employees;
}

export function calculateMonthlySavings(billingCycle: 'monthly' | 'yearly', amount: number): number {
  if (billingCycle === 'yearly') {
    const monthlyEquivalent = amount / 12;
    const monthlyPrice = amount === 348 ? 39 : 29;
    return Math.round((monthlyPrice - monthlyEquivalent) * 100) / 100;
  }
  return 0;
}
