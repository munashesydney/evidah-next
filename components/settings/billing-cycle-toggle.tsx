'use client';

interface BillingCycleToggleProps {
  billingCycle: 'monthly' | 'yearly';
  onChange: (cycle: 'monthly' | 'yearly') => void;
}

export default function BillingCycleToggle({ billingCycle, onChange }: BillingCycleToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4 mb-8">
      <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
        Monthly
      </span>
      <button
        onClick={() => onChange(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
          billingCycle === 'yearly' ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
            billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
      <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
        Yearly
        <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
          Save up to 25%
        </span>
      </span>
    </div>
  );
}
