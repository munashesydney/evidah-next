'use client';

import { PlanConfig } from '@/lib/services/subscription-service';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface PlanCardProps {
  plan: PlanConfig;
  billingCycle: 'monthly' | 'yearly';
  isActive?: boolean;
  selectedCompany: string;
}

export default function PlanCard({ plan, billingCycle, isActive, selectedCompany }: PlanCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
  const savings = billingCycle === 'yearly' ? (plan.monthlyPrice * 12) - plan.yearlyPrice : 0;

  const handleSubscribe = () => {
    setLoading(true);
    router.push(`/checkout?plan=${plan.id}&billing=${billingCycle}&company=${selectedCompany}`);
  };

  const getImagePath = () => {
    const imageMap: Record<string, string> = {
      charlie: '/images/employees/charlie.png',
      marquavious: '/images/employees/marquavious.png',
      emma: '/images/employees/emma.png',
      sung_wen: '/images/employees/sung-wen.png',
      evidah_q: '/images/employees/evidah-q.png',
    };
    return imageMap[plan.id] || '/user-avatar-80.png';
  };

  const getBundleBadgeGradient = () => {
    if (plan.id === 'evidah_q') {
      return 'from-red-500 to-red-700';
    }
    return plan.id === 'evidah_q' ? 'from-red-500 to-red-700' : '';
  };

  return (
    <div 
      className={`relative bg-white dark:bg-gray-800 rounded-lg border-2 transition-all ${
        isActive 
          ? 'border-green-500 shadow-lg' 
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {isActive && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
            ✓ Active
          </span>
        </div>
      )}

      <div className="p-6">
        {/* Header with Avatar */}
        <div className="flex items-center gap-4 mb-4">
          <img
            src={getImagePath()}
            alt={plan.displayName}
            className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-700"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/user-avatar-80.png';
            }}
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {plan.displayName}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {plan.description}
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              ${price}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              /{billingCycle === 'yearly' ? 'year' : 'month'}
            </span>
          </div>
          {billingCycle === 'yearly' && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              ${monthlyEquivalent}/month • Save ${savings}/year
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-2 mb-6">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>

        {/* Action Button */}
        <button
          onClick={handleSubscribe}
          disabled={loading || isActive}
          className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
            isActive
              ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : plan.id === 'evidah_q'
              ? 'bg-gradient-to-r from-red-500 to-red-700 hover:opacity-90 text-white'
              : 'bg-violet-500 hover:bg-violet-600 text-white'
          }`}
        >
          {loading ? 'Loading...' : isActive ? 'Current Plan' : 'Subscribe'}
        </button>
      </div>
    </div>
  );
}
