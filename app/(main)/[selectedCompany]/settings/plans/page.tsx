'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { PLANS, SubscriptionData } from '@/lib/services/subscription-service';

export default function PlansPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params.selectedCompany as string;
  
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [activeEmployees, setActiveEmployees] = useState<any>(null);
  const [annual, setAnnual] = useState(true);
  const [viewMode, setViewMode] = useState<'evidahq' | 'employees'>('evidahq');
  const [managingBilling, setManagingBilling] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        fetchSubscription(user.uid);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [selectedCompany, mounted]);

  const fetchSubscription = async (userId: string) => {
    try {
      const response = await fetch(`/api/subscription/current?uid=${userId}&selectedCompany=${selectedCompany}`);
      const data = await response.json();

      if (response.ok) {
        setSubscription(data.subscription);
        setActiveEmployees(data.activeEmployees);
        if (data.subscription) {
          setAnnual(data.subscription.billingCycle === 'yearly');
        }
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEmployeeActive = (planId: string): boolean => {
    if (!activeEmployees) return false;
    const plan = PLANS[planId];
    return activeEmployees[plan.employeeKey] === true;
  };

  const handleSubscribe = (planId: string) => {
    const billingCycle = annual ? 'yearly' : 'monthly';
    router.push(`/checkout?plan=${planId}&billing=${billingCycle}&company=${selectedCompany}`);
  };

  const handleManageBilling = async () => {
    if (!uid) return;
    
    setManagingBilling(true);
    try {
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Error opening billing portal:', error);
      alert(error.message || 'Failed to open billing portal. Please try again.');
      setManagingBilling(false);
    }
  };

  const hasEvidahQ = activeEmployees?.evidahQ === true;
  const hasIndividualEmployees = activeEmployees && Object.keys(activeEmployees).some(
    key => key !== 'evidahQ' && activeEmployees[key] === true
  );

  const getCurrentMonthlyCost = () => {
    if (hasEvidahQ) {
      return annual ? PLANS.evidah_q.yearlyPrice : PLANS.evidah_q.monthlyPrice;
    }
    let total = 0;
    if (activeEmployees) {
      Object.keys(activeEmployees).forEach(key => {
        if (key !== 'evidahQ' && activeEmployees[key] === true) {
          total += annual ? 19 : 29;
        }
      });
    }
    return total;
  };

  if (!mounted || loading) {
    return (
      <div className="grow p-6 space-y-6">
        {/* Skeleton Loading */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-6"></div>
          <div className="h-12 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        <div className="h-12 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-2xl h-96 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const individualEmployees = [PLANS.charlie, PLANS.marquavious, PLANS.emma, PLANS.sung_wen];

  return (
    <div className="grow p-6 space-y-6">
      {/* Header */}
      <div className="mb-8 text-left">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          AI Employee Management
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Manage your AI employees and their specialized capabilities
        </p>
        
        {/* View Mode Toggle */}
        <div className="flex items-left justify-left space-x-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
          <button
            onClick={() => setViewMode('evidahq')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === 'evidahq'
                ? 'bg-gradient-to-r from-red-500 to-red-700 text-white shadow-lg transform scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Evidah Q Bundle
            </div>
          </button>
          <button
            onClick={() => setViewMode('employees')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              viewMode === 'employees'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Individual Employees
          </button>
        </div>
      </div>

      {/* Pricing Toggle */}
      <div className="flex items-left space-x-3 mb-8">
        <div className="text-sm text-gray-500 font-medium">Monthly</div>
        <div className="form-switch">
          <input type="checkbox" id="toggle" className="sr-only" checked={annual} onChange={() => setAnnual(!annual)} />
          <label className="bg-gray-400 dark:bg-gray-700" htmlFor="toggle">
            <span className="bg-white shadow-sm" aria-hidden="true"></span>
            <span className="sr-only">Pay annually</span>
          </label>
        </div>
        <div className="text-sm text-gray-500 font-medium">Annually <span className="text-green-500">(-34%)</span></div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'employees' ? (
        /* Individual Employee Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {individualEmployees.map((employee) => {
            const isHired = isEmployeeActive(employee.id);
            const price = annual ? employee.yearlyPrice : employee.monthlyPrice;
            const monthlyEquivalent = annual ? Math.round(employee.yearlyPrice / 12) : employee.monthlyPrice;
            
            return (
              <div
                key={employee.id}
                className={`relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-xl bg-white dark:bg-gray-800 border-2 ${
                  isHired ? 'border-green-500 shadow-lg' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                } shadow-md`}
              >
                {/* Hired Badge */}
                {isHired && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      ✓ Hired
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className="relative p-6 h-full flex flex-col">
                  {/* Employee Image */}
                  <div className="flex-shrink-0 mb-4">
                    <div className="w-24 h-24 rounded-full overflow-hidden mx-auto border-2 border-white dark:border-gray-700 shadow-md"
                         style={{ background: `linear-gradient(135deg, ${employee.color}, ${employee.color}dd)` }}>
                      <img 
                        src={`/images/employees/${employee.id}.png`}
                        alt={employee.displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/user-avatar-80.png';
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Employee Info */}
                  <div className="text-center flex-1 flex flex-col justify-between text-gray-800 dark:text-gray-100">
                    <div>
                      <h3 className="text-xl font-bold mb-1 text-gray-900 dark:text-gray-100">
                        {employee.displayName}
                      </h3>
                      <p className="text-sm font-medium mb-2 text-gray-600 dark:text-gray-300">
                        {employee.description}
                      </p>
                    </div>
                    
                    {/* Pricing */}
                    <div className="mb-4">
                      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        ${monthlyEquivalent}
                        <span className="text-sm font-normal text-gray-500 dark:text-gray-400">/mo</span>
                      </div>
                      {annual && (
                        <div className="text-xs text-green-500 font-medium">
                          Save 34% with annual billing
                        </div>
                      )}
                    </div>

                    {/* Capabilities */}
                    <div className="mb-4">
                      <div className="text-xs font-semibold uppercase mb-2 text-gray-700 dark:text-gray-300">
                        Capabilities
                      </div>
                      <div className="space-y-1">
                        {employee.features.slice(0, 3).map((feature, index) => (
                          <div key={index} className="flex items-center text-xs">
                            <svg className="w-3 h-3 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                              <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                            </svg>
                            <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="mt-auto">
                      {isHired ? (
                        <button className="w-full text-xs font-medium rounded-full px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700" disabled>
                          ✓ Currently Hired
                        </button>
                      ) : (
                        <button
                          className="w-full text-xs font-medium rounded-full px-4 py-2 transition-colors bg-gradient-to-r text-white shadow-md hover:opacity-90"
                          style={{ background: `linear-gradient(135deg, ${employee.color}, ${employee.color}dd)` }}
                          onClick={() => handleSubscribe(employee.id)}
                        >
                          Hire {employee.displayName}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Evidah Q Bundle Card */
        <div className="w-full">
          {(() => {
            const evidahQ = PLANS.evidah_q;
            const isHired = isEmployeeActive('evidah_q');
            const price = annual ? evidahQ.yearlyPrice : evidahQ.monthlyPrice;
            const monthlyEquivalent = annual ? Math.round(evidahQ.yearlyPrice / 12) : evidahQ.monthlyPrice;
            
            return (
              <div className="relative overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-md">
                {/* Hired Badge */}
                {isHired && (
                  <div className="absolute top-6 right-6 z-10">
                    <div className="bg-green-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                      ✓ Bundle Active
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className="relative p-8">
                  <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
                    {/* Employee Images Overlay */}
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center mb-4">
                        <div className="flex -space-x-4">
                          {individualEmployees.map((emp) => (
                            <div key={emp.id} className="relative">
                              <div className="w-16 h-16 rounded-full overflow-hidden border-3 border-white shadow-lg"
                                   style={{ background: `linear-gradient(135deg, ${emp.color}, ${emp.color}dd)` }}>
                                <img src={`/images/employees/${emp.id}.png`} alt={emp.displayName} className="w-full h-full object-cover" 
                                     onError={(e) => { (e.target as HTMLImageElement).src = '/user-avatar-80.png'; }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Bundle Label */}
                      <div className="text-center">
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-red-500 to-red-700 text-white text-sm font-medium shadow-md">
                          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Complete Bundle
                        </div>
                      </div>
                    </div>
                    
                    {/* Bundle Info */}
                    <div className="flex-1 text-center lg:text-left text-gray-800 dark:text-gray-100">
                      <div className="mb-4">
                        <h3 className="text-3xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                          {evidahQ.displayName}
                        </h3>
                        <p className="text-lg font-medium mb-3 text-gray-600 dark:text-gray-300">
                          {evidahQ.description}
                        </p>
                      </div>
                      
                      {/* Pricing */}
                      <div className="mb-6">
                        <div className="text-4xl font-bold mb-2 text-gray-900 dark:text-gray-100">
                          ${monthlyEquivalent}
                          <span className="text-lg font-normal text-gray-500 dark:text-gray-400">/mo</span>
                        </div>
                        {annual && (
                          <div className="text-sm text-green-500 font-medium mb-2">
                            Save 34% with annual billing
                          </div>
                        )}
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                          Save ${(29 * 4) - monthlyEquivalent}/mo vs individual employees
                        </div>
                      </div>

                      {/* All Capabilities */}
                      <div className="mb-6">
                        <div className="text-sm font-semibold uppercase mb-3 text-gray-700 dark:text-gray-300">
                          All Capabilities Included
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {evidahQ.features.map((feature, index) => (
                            <div key={index} className="flex items-center text-sm">
                              <svg className="w-4 h-4 shrink-0 fill-current text-green-500 mr-2" viewBox="0 0 12 12">
                                <path d="M10.28 1.28L3.989 7.575 1.695 5.28A1 1 0 00.28 6.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 1.28z" />
                              </svg>
                              <span className="text-gray-600 dark:text-gray-400">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="flex justify-center lg:justify-start">
                        {isHired ? (
                          <button className="px-8 py-3 text-sm font-medium rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-700" disabled>
                            ✓ Bundle Active
                          </button>
                        ) : (
                          <button
                            className="px-8 py-3 text-sm font-medium rounded-full transition-colors bg-gradient-to-r from-red-500 to-red-700 text-white shadow-md hover:opacity-90"
                            onClick={() => handleSubscribe('evidah_q')}
                          >
                            Get {evidahQ.displayName} Bundle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Billing Management */}
      <section className="mt-12">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg text-gray-800 dark:text-gray-100 font-semibold mb-4">Billing Management</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Manage your employee subscriptions, update payment methods, view billing history, and cancel individual subscriptions.
          </p>
          
          {/* Subscription Summary */}
          {(hasEvidahQ || hasIndividualEmployees) && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-6">
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">Current Subscriptions</h4>
              <div className="space-y-2 text-sm">
                {hasEvidahQ && (
                  <div className="flex justify-between items-center">
                    <span>Evidah Q Bundle (All Employees)</span>
                    <span className="font-medium">${annual ? PLANS.evidah_q.yearlyPrice : PLANS.evidah_q.monthlyPrice}/mo</span>
                  </div>
                )}
                {!hasEvidahQ && activeEmployees && Object.keys(activeEmployees).map(key => {
                  if (key !== 'evidahQ' && activeEmployees[key] === true) {
                    const employeeNames: Record<string, string> = {
                      charlie: 'Charlie',
                      marquavious: 'Marquavious',
                      emma: 'Emma',
                      sungWen: 'Sung Wen'
                    };
                    return (
                      <div key={key} className="flex justify-between items-center">
                        <span>{employeeNames[key] || key}</span>
                        <span className="font-medium">${annual ? 19 : 29}/mo</span>
                      </div>
                    );
                  }
                  return null;
                })}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total Monthly Cost</span>
                    <span>${getCurrentMonthlyCost()}/mo</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            <button
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
              onClick={handleManageBilling}
              disabled={managingBilling}
            >
              {managingBilling ? (
                <>
                  <svg className="animate-spin fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z" />
                  </svg>
                  Loading...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Manage Billing
                </>
              )}
            </button>
            
            {(hasEvidahQ || hasIndividualEmployees) && (
              <div className="text-xs text-gray-500 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Use the billing portal to cancel individual employee subscriptions or update payment methods
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
