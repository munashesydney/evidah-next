'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { format, subDays } from 'date-fns';
import dynamic from 'next/dynamic';

// Dynamically import SimpleLineChart with SSR disabled (Recharts doesn't work with SSR)
const SimpleLineChart = dynamic(() => import('@/components/simple-line-chart'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center">
      <div className="text-gray-400">Loading chart...</div>
    </div>
  ),
});

interface MetricsOverview {
  uniqueVisitors: number;
  totalPageViews: number;
  totalSessions: number;
  averageVisitDuration: string;
  averageVisitDurationRaw: number;
  comparison: {
    uniqueVisitors: string | null;
    totalPageViews: string | null;
    totalSessions: string | null;
    averageVisitDuration: string | null;
  };
}

interface ChartData {
  labels: string[];
  current: number[];
  previous: number[] | null;
}

interface PageData {
  id: string;
  link: string;
  pageViews: number;
  percentage: string;
}

interface ReferrerData {
  id: string;
  referrer: string;
  count: number;
  percentage: string;
}

interface CountryData {
  id: string;
  country: string;
  count: number;
  percentage: string;
}

interface LiveVisitorsData {
  count: number;
  visitors: Array<{
    sessionId: string;
    timestamp: string;
    page: string;
  }>;
}

export default function DashboardPage() {
  const params = useParams();
  const selectedCompany = params.selectedCompany as string;
  
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string>('');
  
  // Individual loading states for progressive rendering
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [isLoadingPages, setIsLoadingPages] = useState(true);
  const [isLoadingReferrers, setIsLoadingReferrers] = useState(true);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  
  // Date range state (default: yesterday to today)
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  // Metrics data
  const [overview, setOverview] = useState<MetricsOverview | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [topPages, setTopPages] = useState<PageData[]>([]);
  const [topReferrers, setTopReferrers] = useState<ReferrerData[]>([]);
  const [topCountries, setTopCountries] = useState<CountryData[]>([]);
  const [liveVisitors, setLiveVisitors] = useState<LiveVisitorsData>({ count: 0, visitors: [] });

  // Authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        user.getIdTokenResult().then((idTokenResult) => {
          const displayName = idTokenResult.claims.displayName;
          if (displayName) {
            setDisplayName(displayName as string);
          }
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Helper function to get cache key
  const getCacheKey = (type: string) => {
    return `dashboard_${selectedCompany}_${userId}_${type}_${startDate}_${endDate}`;
  };

  // Helper function to load from cache
  const loadFromCache = (type: string) => {
    try {
      const cached = localStorage.getItem(getCacheKey(type));
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache valid for 5 minutes (same as React app)
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.error('Error loading from cache:', error);
    }
    return null;
  };

  // Helper function to save to cache
  const saveToCache = (type: string, data: any) => {
    try {
      localStorage.setItem(
        getCacheKey(type),
        JSON.stringify({ data, timestamp: Date.now() })
      );
    } catch (error) {
      console.error('Error saving to cache:', error);
    }
  };

  // Fetch all metrics on initial load only (when userId changes)
  useEffect(() => {
    if (userId) {
      // Load cached data first for instant display
      const cachedOverview = loadFromCache('overview');
      if (cachedOverview) {
        setOverview(cachedOverview);
        setIsLoadingOverview(false);
      }
      
      const cachedChart = loadFromCache('chart');
      if (cachedChart) {
        setChartData(cachedChart);
        setIsLoadingChart(false);
      }
      
      const cachedPages = loadFromCache('pages');
      if (cachedPages) {
        setTopPages(cachedPages);
        setIsLoadingPages(false);
      }
      
      const cachedReferrers = loadFromCache('referrers');
      if (cachedReferrers) {
        setTopReferrers(cachedReferrers);
        setIsLoadingReferrers(false);
      }
      
      const cachedCountries = loadFromCache('countries');
      if (cachedCountries) {
        setTopCountries(cachedCountries);
        setIsLoadingCountries(false);
      }

      // Then fetch fresh data independently
      fetchOverview();
      fetchChartData();
      fetchTopPages();
      fetchTopReferrers();
      fetchTopCountries();
    }
  }, [userId, selectedCompany]);

  // Poll live visitors every 10 seconds
  useEffect(() => {
    if (userId) {
      fetchLiveVisitors(true); // Initial load with loading state
      const interval = setInterval(() => fetchLiveVisitors(false), 10000); // Updates without loading state
      return () => clearInterval(interval);
    }
  }, [userId, selectedCompany]);

  const fetchOverview = async () => {
    if (!userId) return;
    setIsLoadingOverview(true);
    
    try {
      const response = await fetch(
        `/api/metrics/overview?uid=${userId}&selectedCompany=${selectedCompany}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      if (data.success) {
        setOverview(data.data);
        saveToCache('overview', data.data);
      }
    } catch (error) {
      console.error('Error fetching overview:', error);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const fetchChartData = async () => {
    if (!userId) return;
    setIsLoadingChart(true);
    
    try {
      const response = await fetch(
        `/api/metrics/chart?uid=${userId}&selectedCompany=${selectedCompany}&startDate=${startDate}&endDate=${endDate}&includePrevious=false`
      );
      const data = await response.json();
      if (data.success) {
        setChartData(data.data);
        saveToCache('chart', data.data);
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setIsLoadingChart(false);
    }
  };

  const fetchTopPages = async () => {
    if (!userId) return;
    setIsLoadingPages(true);
    
    try {
      const response = await fetch(
        `/api/metrics/top-pages?uid=${userId}&selectedCompany=${selectedCompany}&startDate=${startDate}&endDate=${endDate}&limit=5`
      );
      const data = await response.json();
      if (data.success) {
        setTopPages(data.data);
        saveToCache('pages', data.data);
      }
    } catch (error) {
      console.error('Error fetching top pages:', error);
    } finally {
      setIsLoadingPages(false);
    }
  };

  const fetchTopReferrers = async () => {
    if (!userId) return;
    setIsLoadingReferrers(true);
    
    try {
      const response = await fetch(
        `/api/metrics/top-referrers?uid=${userId}&selectedCompany=${selectedCompany}&limit=5`
      );
      const data = await response.json();
      if (data.success) {
        setTopReferrers(data.data);
        saveToCache('referrers', data.data);
      }
    } catch (error) {
      console.error('Error fetching top referrers:', error);
    } finally {
      setIsLoadingReferrers(false);
    }
  };

  const fetchTopCountries = async () => {
    if (!userId) return;
    setIsLoadingCountries(true);
    
    try {
      const response = await fetch(
        `/api/metrics/top-countries?uid=${userId}&selectedCompany=${selectedCompany}&limit=5`
      );
      const data = await response.json();
      if (data.success) {
        setTopCountries(data.data);
        saveToCache('countries', data.data);
      }
    } catch (error) {
      console.error('Error fetching top countries:', error);
    } finally {
      setIsLoadingCountries(false);
    }
  };

  const fetchLiveVisitors = async (isInitialLoad = false) => {
    if (!userId) return;
    
    // Only show loading skeleton on initial load, not on polling updates
    if (isInitialLoad) {
      setIsLoadingLive(true);
    }
    
    try {
      const response = await fetch(
        `/api/metrics/live-visitors?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const data = await response.json();
      if (data.success) {
        // Only update state if the value actually changed
        if (data.data.count !== liveVisitors.count || data.data.visitors.length !== liveVisitors.visitors.length) {
          setLiveVisitors(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching live visitors:', error);
    } finally {
      if (isInitialLoad) {
        setIsLoadingLive(false);
      }
    }
  };

  const handleDateRangeChange = () => {
    // Trigger refetch with new dates - each fetches independently
    if (userId) {
      fetchOverview();
      fetchChartData();
      fetchTopPages();
      fetchTopReferrers();
      fetchTopCountries();
    }
  };

  // Prepare chart configuration for Recharts
  const getChartConfig = () => {
    if (!chartData) return null;

    return {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Current',
          data: chartData.current,
        },
      ],
    };
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      {/* Page header */}
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        {/* Left: Title */}
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            Welcome Back{displayName ? `, ${displayName}` : ''}
          </h1>
        </div>

        {/* Right: Date range picker */}
        <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="form-input"
            />
            <span className="text-gray-500 dark:text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="form-input"
            />
            <button
              onClick={handleDateRangeChange}
              className="btn bg-violet-500 hover:bg-violet-600 text-white"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-12 gap-6">
        {/* Analytics Overview Card */}
        <div className="flex flex-col col-span-full xl:col-span-8 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
          <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Analytics</h2>
          </header>
          <div className="px-5 py-1">
            <div className="flex flex-wrap">
              {/* Unique Visitors */}
              <div className="flex items-center py-2 pr-5">
                <div className="mr-5">
                  {isLoadingOverview ? (
                    <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                  ) : (
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                        {overview?.uniqueVisitors || 0}
                      </div>
                      {overview?.comparison.uniqueVisitors && (
                        <div className={`text-sm font-medium ${
                          overview.comparison.uniqueVisitors.startsWith('+') 
                            ? 'text-green-600' 
                            : 'text-red-500'
                        }`}>
                          {overview.comparison.uniqueVisitors}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-400">Unique Visitors</div>
                </div>
                <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700 mr-5" aria-hidden="true"></div>
              </div>

              {/* Total Pageviews */}
              <div className="flex items-center py-2 pr-5">
                <div className="mr-5">
                  {isLoadingOverview ? (
                    <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                  ) : (
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                        {overview?.totalPageViews || 0}
                      </div>
                      {overview?.comparison.totalPageViews && (
                        <div className={`text-sm font-medium ${
                          overview.comparison.totalPageViews.startsWith('+') 
                            ? 'text-green-600' 
                            : 'text-red-500'
                        }`}>
                          {overview.comparison.totalPageViews}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Pageviews</div>
                </div>
                <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700 mr-5" aria-hidden="true"></div>
              </div>

              {/* Total Sessions */}
              <div className="flex items-center py-2 pr-5">
                <div className="mr-5">
                  {isLoadingOverview ? (
                    <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                  ) : (
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                        {overview?.totalSessions || 0}
                      </div>
                      {overview?.comparison.totalSessions && (
                        <div className={`text-sm font-medium ${
                          overview.comparison.totalSessions.startsWith('+') 
                            ? 'text-green-600' 
                            : 'text-red-500'
                        }`}>
                          {overview.comparison.totalSessions}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</div>
                </div>
                <div className="hidden md:block w-px h-8 bg-gray-200 dark:bg-gray-700 mr-5" aria-hidden="true"></div>
              </div>

              {/* Visit Duration */}
              <div className="flex items-center py-2">
                <div>
                  {isLoadingOverview ? (
                    <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                  ) : (
                    <div className="flex items-center">
                      <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">
                        {overview?.averageVisitDuration || '0s'}
                      </div>
                      {overview?.comparison.averageVisitDuration && (
                        <div className={`text-sm font-medium ${
                          overview.comparison.averageVisitDuration.startsWith('+') 
                            ? 'text-green-600' 
                            : 'text-red-500'
                        }`}>
                          {overview.comparison.averageVisitDuration}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-400">Visit Duration</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Chart area - grows dynamically */}
          <div className="grow px-5 pb-5">
            {chartData ? (
              <div className="h-80 min-h-[320px]">
                <SimpleLineChart data={getChartConfig()!} />
              </div>
            ) : (
              isLoadingChart && (
                <div className="h-80 min-h-[320px] bg-gray-200 dark:bg-gray-700 rounded animate-pulse flex items-center justify-center">
                  <div className="text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Live Visitors Card */}
        <div className="flex flex-col col-span-full xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
          <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Active Users Right Now</h2>
          </header>
          {/* Card content */}
          <div className="flex flex-col h-full">
            {/* Live visitors number - left aligned */}
            <div className="px-5 py-3">
              <div className="flex items-center">
                {/* Red pulsing dot */}
                <div className="relative flex items-center justify-center w-3 h-3 mr-3" aria-hidden="true">
                  <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50"></div>
                  <div className="relative inline-flex rounded-full w-1.5 h-1.5 bg-red-500"></div>
                </div>
                {/* Visitors number */}
                <div>
                  {isLoadingLive ? (
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-20"></div>
                  ) : (
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{liveVisitors.count}</div>
                  )}
                  <div className="text-sm text-gray-500 dark:text-gray-400">Live visitors</div>
                </div>
              </div>
            </div>

            {/* Small chart */}
            {chartData && (
              <div className="px-5 pt-3 pb-1">
                <div style={{ height: '70px' }}>
                  <SimpleLineChart 
                    data={{
                      labels: chartData.labels,
                      datasets: [{
                        label: 'Current',
                        data: chartData.current,
                      }],
                    }}
                    hideAxes={true}
                    hideTooltip={true}
                  />
                </div>
              </div>
            )}

            {/* Top Pages Table */}
            <div className="grow px-5 pt-3 pb-1">
              {isLoadingPages ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-auto w-full dark:text-gray-300">
                    <thead className="text-xs uppercase text-gray-400 dark:text-gray-500">
                      <tr>
                        <th className="py-2">
                          <div className="font-semibold text-left">Top pages</div>
                        </th>
                        <th className="py-2">
                          <div className="font-semibold text-right">Page Views</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700/60">
                      {topPages.length > 0 ? (
                        topPages.slice(0, 4).map((page) => (
                          <tr key={page.id}>
                            <td className="py-2">
                              <div className="text-left text-gray-800 dark:text-gray-100">{page.link}</div>
                            </td>
                            <td className="py-2">
                              <div className="font-medium text-right text-gray-800 dark:text-gray-100">{page.pageViews}</div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="py-4 text-center text-gray-500 dark:text-gray-400">
                            No page data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Card footer */}
            <div className="text-right px-5 pb-4">
              <a 
                href={`/${selectedCompany}/reports/pages`}
                className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 cursor-pointer"
              >
                Real-Time Report -&gt;
              </a>
            </div>
          </div>
        </div>

        {/* Top Channels (Referrers) */}
        <div className="col-span-full xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
          <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Top Channels</h2>
          </header>
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="table-auto w-full dark:text-gray-300">
                <thead className="text-xs uppercase text-gray-400 dark:text-gray-500">
                  <tr>
                    <th className="p-2">
                      <div className="font-semibold text-left">Source</div>
                    </th>
                    <th className="p-2">
                      <div className="font-semibold text-center">Visitors</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
                  {isLoadingReferrers ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td className="p-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-3/4"></div>
                        </td>
                        <td className="p-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-16 mx-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : topReferrers.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No referrer data available
                      </td>
                    </tr>
                  ) : (
                    topReferrers.map((referrer) => (
                      <tr key={referrer.id}>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="text-gray-800 dark:text-gray-100 truncate mr-2">
                              {referrer.referrer}
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="text-gray-800 dark:text-gray-100 mr-2">{referrer.count}</div>
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-violet-500 h-2 rounded-full"
                                  style={{ width: referrer.percentage }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="col-span-full xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
          <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Top Pages</h2>
          </header>
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="table-auto w-full dark:text-gray-300">
                <thead className="text-xs uppercase text-gray-400 dark:text-gray-500">
                  <tr>
                    <th className="p-2">
                      <div className="font-semibold text-left">Page</div>
                    </th>
                    <th className="p-2">
                      <div className="font-semibold text-center">Pageviews</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
                  {isLoadingPages ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td className="p-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-3/4"></div>
                        </td>
                        <td className="p-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-16 mx-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : topPages.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No page data available
                      </td>
                    </tr>
                  ) : (
                    topPages.map((page) => (
                      <tr key={page.id}>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="text-gray-800 dark:text-gray-100 truncate mr-2">
                              {page.link}
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="text-gray-800 dark:text-gray-100 mr-2">{page.pageViews}</div>
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-sky-500 h-2 rounded-full"
                                  style={{ width: page.percentage }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Countries */}
        <div className="col-span-full xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
          <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">Top Countries</h2>
          </header>
          <div className="p-3">
            <div className="overflow-x-auto">
              <table className="table-auto w-full dark:text-gray-300">
                <thead className="text-xs uppercase text-gray-400 dark:text-gray-500">
                  <tr>
                    <th className="p-2">
                      <div className="font-semibold text-left">Country</div>
                    </th>
                    <th className="p-2">
                      <div className="font-semibold text-center">Visitors</div>
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
                  {isLoadingCountries ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i}>
                        <td className="p-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-3/4"></div>
                        </td>
                        <td className="p-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded w-16 mx-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : topCountries.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="p-4 text-center text-gray-500 dark:text-gray-400">
                        No country data available
                      </td>
                    </tr>
                  ) : (
                    topCountries.map((country) => (
                      <tr key={country.id}>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="text-gray-800 dark:text-gray-100 mr-2">
                              {country.country}
                            </div>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center">
                            <div className="text-gray-800 dark:text-gray-100 mr-2">{country.count}</div>
                            <div className="flex-1">
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: country.percentage }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
