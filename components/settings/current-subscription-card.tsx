'use client';

import { SubscriptionData, PLANS } from '@/lib/services/subscription-service';

interface CurrentSubscriptionCardProps {
  subscription: SubscriptionData;
  activeEmployees: {
    charlie: boolean;
    marquavious: boolean;
    emma: boolean;
    sungWen: boolean;
    evidahQ: boolean;
  };
}

export default function CurrentSubscriptionCard({ subscription, activeEmployees }: CurrentSubscriptionCardProps) {
  // Safety checks
  if (!subscription || !subscription.employeeId || !subscription.status) {
    return null;
  }

  const employeeId = subscription.employeeId || 'evidah-q';
  const plan = PLANS[employeeId.replace('-', '_')] || PLANS.evidah_q;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'canceled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  const activeEmployeesList = Object.entries(activeEmployees)
    .filter(([_, isActive]) => isActive)
    .map(([key]) => {
      const employeeNames: Record<string, string> = {
        charlie: 'Charlie',
        marquavious: 'Marquavious',
        emma: 'Emma',
        sungWen: 'Sung Wen',
        evidahQ: 'EvidahQ Bundle'
      };
      return employeeNames[key] || key;
    });

  return (
    <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Current Subscription</h2>
          <p className="text-violet-100">Manage your active plan</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(subscription.status)}`}>
          {subscription.status ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1) : 'Unknown'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p className="text-violet-200 text-sm mb-1">Plan</p>
          <p className="text-xl font-bold">{plan.displayName}</p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p className="text-violet-200 text-sm mb-1">Billing</p>
          <p className="text-xl font-bold">
            ${subscription.amount}/{subscription.billingCycle === 'yearly' ? 'year' : 'month'}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p className="text-violet-200 text-sm mb-1">Cycle</p>
          <p className="text-xl font-bold capitalize">{subscription.billingCycle}</p>
        </div>
      </div>

      {activeEmployeesList.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
          <p className="text-violet-200 text-sm mb-2">Active Employees</p>
          <div className="flex flex-wrap gap-2">
            {activeEmployeesList.map((employee) => (
              <span
                key={employee}
                className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium"
              >
                {employee}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
