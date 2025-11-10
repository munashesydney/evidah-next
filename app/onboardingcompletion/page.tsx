'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import { useTheme } from 'next-themes';

export default function Onboarding09() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string>('default');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    subdomain: '',
    heading: '',
    subheading: '',
    seotitle: '',
    seodescription: '',
    primaryColor: '#6366f1',
    choice_company_type: ''
  });

  useEffect(() => {
    setMounted(true);
    
    // Get selectedCompany from localStorage
    if (typeof window !== 'undefined') {
      const storedCompany = localStorage.getItem('selectedCompany') || 'default';
      setSelectedCompany(storedCompany);
    }
    
    // Get user from Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid);
        
        // Load existing knowledgebase data if available
        try {
          const kbRef = doc(db, 'Users', user.uid, 'knowledgebases', selectedCompany);
          const kbDoc = await getDoc(kbRef);
          
          if (kbDoc.exists()) {
            const kbData = kbDoc.data();
            setFormData({
              name: kbData.name || '',
              website: kbData.website || '',
              subdomain: kbData.subdomain || '',
              heading: kbData.heading || '',
              subheading: kbData.subheading || '',
              seotitle: kbData.seotitle || '',
              seodescription: kbData.seodescription || '',
              primaryColor: kbData.primaryColor || '#6366f1',
              choice_company_type: kbData.choice_company_type || ''
            });
          }
        } catch (error) {
          console.error('Error loading knowledgebase data:', error);
        }
      } else {
        router.push('/sign-in');
      }
    });

    return () => unsubscribe();
  }, [router, selectedCompany]);

  // Autofill Step 2 fields when user reaches that step
  useEffect(() => {
    if (currentStep === 2 && formData.name) {
      setFormData(prevData => ({
        ...prevData,
        heading: prevData.heading || `Welcome to ${prevData.name} Support`,
        subheading: prevData.subheading || 'Find answers to your questions and get the help you need',
        seotitle: prevData.seotitle || `${prevData.name} - Knowledge Base`,
        seodescription: prevData.seodescription || `Get help and find answers to your questions about ${prevData.name}. Our knowledge base contains helpful articles and guides.`
      }));
    }
  }, [currentStep, formData.name]);

  // Debounced subdomain validation
  useEffect(() => {
    if (!formData.subdomain || formData.subdomain.length < 3 || !userId) return;

    const timeoutId = setTimeout(async () => {
      const subdomainExists = await checkSubdomainExists(formData.subdomain);
      if (subdomainExists) {
        setValidationErrors(prev => ({
          ...prev,
          subdomain: 'This subdomain is already taken. Please choose another one.'
        }));
      } else {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.subdomain;
          return newErrors;
        });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [formData.subdomain, userId]);

  const checkSubdomainExists = async (subdomain: string): Promise<boolean> => {
    if (!subdomain || !subdomain.trim() || !userId) return false;
    
    try {
      setSubdomainChecking(true);
      const response = await fetch(
        `/api/settings/knowledge-base/check-subdomain?uid=${userId}&selectedCompany=${selectedCompany}&subdomain=${subdomain}`
      );
      const data = await response.json();
      
      if (data.exists && !data.isOwnSubdomain) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking subdomain:', error);
      return false;
    } finally {
      setSubdomainChecking(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear validation error for this field when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateCurrentStep = async (): Promise<Record<string, string>> => {
    const errors: Record<string, string> = {};
    
    switch (currentStep) {
      case 1:
        if (!formData.name?.trim()) {
          errors.name = 'Company name is required';
        }
        if (!formData.subdomain?.trim()) {
          errors.subdomain = 'Subdomain is required';
        } else {
          const subdomainExists = await checkSubdomainExists(formData.subdomain);
          if (subdomainExists) {
            errors.subdomain = 'This subdomain is already taken. Please choose another one.';
          }
        }
        break;
      case 2:
        if (!formData.heading?.trim()) {
          errors.heading = 'Knowledge base heading is required';
        }
        break;
      default:
        break;
    }
    
    return errors;
  };

  const nextStep = async () => {
    const errors = await validateCurrentStep();
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setError('');
      setValidationErrors({});
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError('');
      setValidationErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Validate required fields
      if (!formData.name || !formData.subdomain || !formData.heading) {
        throw new Error('Please fill in all required fields');
      }

      // Check if subdomain already exists globally
      const subdomainExists = await checkSubdomainExists(formData.subdomain);
      if (subdomainExists) {
        throw new Error('This subdomain is already taken. Please choose another one.');
      }

      // Complete onboarding
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: userId,
          selectedCompany,
          formData
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Store selectedCompany in localStorage if not already set
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedCompany', selectedCompany);
      }
      
      // Redirect to dashboard
      const redirectTo = searchParams.get('from') || `/${selectedCompany}/chat`;
      router.push(redirectTo);

    } catch (error: any) {
      console.error('Error completing onboarding:', error);
      setError(error.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get hired employees for display (from subscription)
  const getHiredEmployees = () => {
    // For now, since we're using EvidahQ, show all employees
    return [
      { name: 'Charlie', role: 'Customer Support Specialist' },
      { name: 'Marquavious', role: 'Live Chat Specialist' },
      { name: 'Emma', role: 'Knowledge Management Expert' },
      { name: 'Sung Wen', role: 'Training Specialist' },
      { name: 'Evidah Q', role: 'Complete Bundle' }
    ];
  };

  const hiredEmployees = getHiredEmployees();

  // Step titles
  const stepTitles = [
    'Company Information',
    'Branding & Design',
    'Review & Confirm',
    'Complete Setup'
  ];

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100" htmlFor="name">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                className={`form-input w-full ${validationErrors.name ? 'border-red-500 dark:border-red-500' : ''}`}
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
              {validationErrors.name && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{validationErrors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100" htmlFor="subdomain">
                Subdomain <span className="text-red-500">*</span>
              </label>
              <div className="flex">
                <input
                  id="subdomain"
                  name="subdomain"
                  className={`form-input w-full rounded-r-none ${validationErrors.subdomain ? 'border-red-500 dark:border-red-500' : ''}`}
                  type="text"
                  value={formData.subdomain}
                  onChange={handleInputChange}
                  placeholder="yourcompany"
                  required
                />
                <div className="flex items-center px-3 bg-gray-50 dark:bg-gray-700 border border-l-0 border-gray-300 dark:border-gray-600 rounded-r text-sm text-gray-500 dark:text-gray-400">
                  .ourkd.help
                </div>
              </div>
              {validationErrors.subdomain && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{validationErrors.subdomain}</p>
              )}
              {subdomainChecking && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Checking subdomain availability...</p>
              )}
              {formData.subdomain && formData.subdomain.length >= 3 && !subdomainChecking && !validationErrors.subdomain && (
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">✓ Subdomain is available!</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100" htmlFor="website">
                Website URL
              </label>
              <input
                id="website"
                name="website"
                className="form-input w-full"
                type="url"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://yourcompany.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100" htmlFor="choice_company_type">
                Company Type
              </label>
              <select
                id="choice_company_type"
                name="choice_company_type"
                className="form-select w-full"
                value={formData.choice_company_type}
                onChange={handleInputChange}
              >
                <option value="">Select company type</option>
                <option value="startup">Startup</option>
                <option value="small_business">Small Business</option>
                <option value="enterprise">Enterprise</option>
                <option value="agency">Agency</option>
                <option value="nonprofit">Non-profit</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100" htmlFor="heading">
                Knowledge Base Heading <span className="text-red-500">*</span>
              </label>
              <input
                id="heading"
                name="heading"
                className={`form-input w-full ${validationErrors.heading ? 'border-red-500 dark:border-red-500' : ''}`}
                type="text"
                value={formData.heading}
                onChange={handleInputChange}
                placeholder="How can we help you?"
                required
              />
              {validationErrors.heading && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{validationErrors.heading}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100" htmlFor="subheading">
                Knowledge Base Subheading
              </label>
              <input
                id="subheading"
                name="subheading"
                className="form-input w-full"
                type="text"
                value={formData.subheading}
                onChange={handleInputChange}
                placeholder="Find answers to common questions"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100" htmlFor="primaryColor">
                Brand Color
              </label>
              <div className="flex items-center space-x-3">
                <input
                  id="primaryColor"
                  name="primaryColor"
                  className="w-12 h-12 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  type="color"
                  value={formData.primaryColor}
                  onChange={handleInputChange}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  This color will be used throughout your knowledge base
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100" htmlFor="seotitle">
                SEO Title
              </label>
              <input
                id="seotitle"
                name="seotitle"
                className="form-input w-full"
                type="text"
                value={formData.seotitle}
                onChange={handleInputChange}
                placeholder="Your Company - Knowledge Base"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-800 dark:text-gray-100" htmlFor="seodescription">
                SEO Description
              </label>
              <textarea
                id="seodescription"
                name="seodescription"
                className="form-textarea w-full"
                rows={3}
                value={formData.seodescription}
                onChange={handleInputChange}
                placeholder="Find answers to your questions and get help from our team"
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* Show hired employees */}
            {hiredEmployees.length > 0 && (
              <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg">
                <h3 className="text-sm font-semibold text-violet-900 dark:text-violet-100 mb-3">
                  Your Hired Employees:
                </h3>
                <div className="space-y-2">
                  {hiredEmployees.map((employee, index) => (
                    <div key={index} className="flex items-center text-sm text-violet-700 dark:text-violet-300">
                      <div className="w-2 h-2 bg-violet-500 rounded-full mr-2"></div>
                      <span className="font-medium">{employee.name}</span>
                      <span className="text-violet-600 dark:text-violet-400 ml-2">- {employee.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Review form data */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Review Your Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Company Name</label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{formData.name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subdomain</label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{formData.subdomain ? `${formData.subdomain}.ourkd.help` : 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Website</label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{formData.website || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Company Type</label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{formData.choice_company_type || 'Not selected'}</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Knowledge Base Heading</label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{formData.heading || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Subheading</label>
                    <p className="text-sm text-gray-800 dark:text-gray-200">{formData.subheading || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Brand Color</label>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
                        style={{ backgroundColor: formData.primaryColor }}
                      ></div>
                      <span className="text-sm text-gray-800 dark:text-gray-200">{formData.primaryColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
  return (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">Ready to Complete Setup!</h3>
          <p className="text-gray-600 dark:text-gray-400">
                Your knowledge base is ready to be configured with the information you've provided. 
                Click the button below to finish the setup process.
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>What happens next?</strong> Your knowledge base will be configured with your company information, 
                and your hired AI employees will be ready to assist your customers.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!mounted || !userId) {
    return null;
  }

  return (
    <main className="bg-white dark:bg-gray-900">
      <div className="relative flex">
        {/* Content */}
        <div className="w-full md:w-1/2">
          <div className="min-h-[100dvh] h-full flex flex-col after:flex-1">
            <div className="flex-1">
              {/* Header */}
              <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
                {mounted ? (
                  <Image
                    src={resolvedTheme === 'dark' ? '/simple_logo.png' : '/simple_logo.png'}
                    alt="Evidah Logo"
                    width={50}
                    height={50}
                    priority
                  />
                ) : (
                  <Image
                    src="/simple_logo.png"
                    alt="Evidah Logo"
                    width={50}
                    height={50}
                    priority
                  />
                )}
                <div className="text-sm text-gray-800 dark:text-gray-100">
                  Need help?{' '}
                  <a className="font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400" href="mailto:support@evidah.com">
                    Contact Support
                  </a>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-4 pt-12 pb-8">
                <div className="max-w-md mx-auto w-full">
                  <div className="relative">
                    <div className="absolute left-0 top-1/2 -mt-px w-full h-0.5 bg-gray-200 dark:bg-gray-700/60" aria-hidden="true"></div>
                    <ul className="relative flex justify-between w-full">
                      {Array.from({ length: totalSteps }, (_, index) => {
                        const stepNumber = index + 1;
                        const isCompleted = stepNumber < currentStep;
                        const isCurrent = stepNumber === currentStep;
                        
                        return (
                          <li key={stepNumber}>
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                              isCompleted 
                                ? 'bg-violet-500 text-white' 
                                : isCurrent 
                                  ? 'bg-violet-500 text-white' 
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}>
                              {isCompleted ? '✓' : stepNumber}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  {/* Step title */}
                  <div className="mt-4 text-center">
                    <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Step {currentStep} of {totalSteps}
                    </h2>
                    <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      {stepTitles[currentStep - 1]}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-8">
              <div className="max-w-md mx-auto">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                {currentStep === 4 ? (
                  // Final step - show completion form
                  <form onSubmit={handleSubmit}>
                    {renderStepContent()}
                    
                    <div className="flex items-center justify-between mt-8">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="btn bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        Previous
                      </button>
                      <button
                        className="btn bg-violet-500 text-white hover:bg-violet-600"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? 'Completing Setup...' : 'Complete Setup'}
                      </button>
                    </div>
                  </form>
                ) : (
                  // Other steps - show step content with navigation
                  <div>
                    {renderStepContent()}
                    
                    <div className="flex items-center justify-between mt-8">
                      <button
                        type="button"
                        onClick={prevStep}
                        className={`btn ${
                          currentStep === 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                        }`}
                        disabled={currentStep === 1}
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        onClick={nextStep}
                        className="btn bg-violet-500 text-white hover:bg-violet-600"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="hidden md:block absolute top-0 bottom-0 right-0 md:w-1/2" aria-hidden="true">
          <Image 
            className="object-cover object-center w-full h-full" 
            src="/images/onboarding-image.jpg" 
            width={760} 
            height={1024} 
            alt="Onboarding" 
            priority
          />
        </div>
      </div>
    </main>
  );
}
