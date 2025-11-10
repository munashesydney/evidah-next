'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function RefreshKnowledgePanel() {
  const params = useParams();
  const selectedCompany = params?.selectedCompany as string;
  
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [kbRefreshLoading, setKbRefreshLoading] = useState(false);
  const [kbRefreshText, setKbRefreshText] = useState('Refresh Knowledge');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [indexingProgress, setIndexingProgress] = useState<{
    status: string;
    total: number;
    completed: number;
    failed: number;
    timedOut: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshTrainingData = async () => {
    setError('');
    setSuccess('');
    setIndexingProgress(null);
    setKbRefreshLoading(true);
    setKbRefreshText('Refreshing...');

    if (!uid) {
      console.error('User is not authenticated');
      setError('User is not authenticated');
      setKbRefreshLoading(false);
      setKbRefreshText('Refresh Knowledge');
      return;
    }

    try {
      // Call backend to refresh training data (with indexing wait)
      const response = await fetch('/api/training/refreshknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: uid,
          selectedCompany: selectedCompany || 'default',
          waitForIndexing: true, // Wait for files to be indexed
        }),
      });

      const data = await response.json();
      console.log('Refresh response:', data);

      // Handle response format
      if (data.success) {
        setKbRefreshText('Refreshed ✔️');
        
        // Check indexing status
        if (data.indexing) {
          setIndexingProgress(data.indexing);
          
          if (data.indexing.status === 'completed') {
            setSuccess(`Knowledge base refreshed successfully! All ${data.indexing.completed} files are indexed and ready for AI queries.`);
          } else if (data.indexing.status === 'partial') {
            setSuccess(`Knowledge base refreshed! ${data.indexing.completed}/${data.indexing.total} files are ready. ${data.warning || 'Some files may still be indexing.'}`);
          } else {
            setSuccess(data.message || 'Knowledge base refreshed successfully!');
          }
        } else {
          setSuccess(data.message || 'Knowledge base refreshed successfully!');
        }
        
        // Show duration if available
        if (data.totalDuration) {
          console.log(`Refresh completed in ${(data.totalDuration / 1000).toFixed(1)}s`);
        }
      } else {
        // Handle error response
        const errorMsg = data.error?.message || data.error || 'Unknown error occurred';
        setError('There was an error refreshing the knowledge base: ' + errorMsg);
        setKbRefreshText('Refresh Knowledge');
      }

      setKbRefreshLoading(false);

    } catch (error: any) {
      console.error('Refresh error:', error);
      setError('There seems to be an error with the connection. Please try reloading the page');
      setKbRefreshLoading(false);
      setKbRefreshText('Refresh Knowledge');
      setIndexingProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="grow">
        <div className="p-6 space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-6"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grow">
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">Refresh Knowledge</h2>
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
        {success && <p className="text-green-600 dark:text-green-400">{success}</p>}
        
        {/* Knowledge Sources */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Knowledge Sources</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            By default, all knowledge comes from your knowledge base. Click the button below to refresh your knowledge
          </div>
          {!kbRefreshLoading ? (
            <button 
              onClick={refreshTrainingData} 
              type="button" 
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
            >
              {kbRefreshText}
            </button>
          ) : (
            <button 
              type="button" 
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed" 
              disabled
            >
              <svg className="animate-spin fill-current shrink-0" width="16" height="16" viewBox="0 0 16 16">
                <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"></path>
              </svg>
              <span className="ml-2">Refreshing</span>
            </button>
          )}
        </section>

        {/* Indexing Progress */}
        {indexingProgress && (
          <section>
            <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Indexing Status</h2>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Files Indexed</span>
                  <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                    {indexingProgress.completed} / {indexingProgress.total}
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(indexingProgress.completed / indexingProgress.total) * 100}%` }}
                  ></div>
                </div>
                
                {/* Status details */}
                <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  {indexingProgress.completed > 0 && (
                    <p>✅ {indexingProgress.completed} file{indexingProgress.completed !== 1 ? 's' : ''} ready for AI queries</p>
                  )}
                  {indexingProgress.failed > 0 && (
                    <p>❌ {indexingProgress.failed} file{indexingProgress.failed !== 1 ? 's' : ''} failed to index</p>
                  )}
                  {indexingProgress.timedOut > 0 && (
                    <p>⏱️ {indexingProgress.timedOut} file{indexingProgress.timedOut !== 1 ? 's' : ''} still indexing</p>
                  )}
                  {indexingProgress.duration && (
                    <p>⏰ Completed in {(indexingProgress.duration / 1000).toFixed(1)} seconds</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Information Section */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">How it works</h2>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>• Refreshing your knowledge base will update the AI with all your latest articles and content</p>
              <p>• The system will wait for files to be fully indexed before confirming completion</p>
              <p>• This process may take a few minutes depending on the amount of content</p>
              <p>• Once refreshed, your AI assistant will have access to all your knowledge base articles</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

