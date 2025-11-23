'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import { ExclamationTriangleIcon, ExclamationCircleIcon, ChatBubbleLeftEllipsisIcon, QuestionMarkCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import DeleteConfirmationModal from '@/components/ui/delete-confirmation-modal';

interface QuestionChat {
  id: string;
  title: string;
  agentId: string;
  createdAt: any;
  updatedAt: any;
  preview?: string;
  metadata?: {
    type?: string;
    escalation?: boolean;
    reason?: string;
    urgency?: string;
    summary?: string;
    createdAt?: string;
  };
}

export default function QuestionsPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params.selectedCompany as string;

  const [uid, setUid] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuestionChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'answered' | 'unanswered'>('unanswered');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (uid) {
      fetchQuestions();
    }
  }, [uid]);

  const fetchQuestions = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/chat/list?uid=${uid}&companyId=${selectedCompany}&employeeId=sung-wen`
      );
      const data = await response.json();

      if (data.success) {
        // Filter for question chats only
        const questionChats = data.chats.filter(
          (chat: QuestionChat) => chat.metadata?.type === 'question'
        );
        setQuestions(questionChats);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionClick = (chatId: string) => {
    router.push(`/${selectedCompany}/chat/sung-wen?chatId=${chatId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Prevent triggering the card click
    setQuestionToDelete(chatId);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!uid || !questionToDelete) return;

    try {
      setDeletingId(questionToDelete);
      
      const response = await fetch(
        `/api/chat/${questionToDelete}/delete?uid=${uid}&companyId=${selectedCompany}&employeeId=sung-wen`,
        {
          method: 'DELETE',
        }
      );

      const data = await response.json();

      if (data.success) {
        // Remove the question from the list
        setQuestions((prev) => prev.filter((q) => q.id !== questionToDelete));
        setDeleteModalOpen(false);
        setQuestionToDelete(null);
      } else {
        alert('Failed to delete question: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting question:', error);
      alert('Failed to delete question. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setQuestionToDelete(null);
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const UrgencyIcon = ({ urgency }: { urgency?: string }) => {
    switch (urgency) {
      case 'high':
        return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
      case 'medium':
        return <ExclamationCircleIcon className="w-6 h-6 text-yellow-500" />;
      case 'low':
        return <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-emerald-500" />;
      default:
        return <QuestionMarkCircleIcon className="w-6 h-6 text-gray-400" />;
    }
  };

  const convertToDate = (value: any): Date | null => {
    if (!value) return null;

    // Firestore Timestamp instance
    if (typeof value.toDate === 'function') {
      return value.toDate();
    }

    // Firestore timestamp object from JSON ({seconds, nanoseconds} or {_seconds, _nanoseconds})
    if (typeof value === 'object') {
      const seconds = value.seconds ?? value._seconds;
      const nanoseconds = value.nanoseconds ?? value._nanoseconds;

      if (typeof seconds === 'number') {
        const millis = seconds * 1000 + (typeof nanoseconds === 'number' ? nanoseconds / 1_000_000 : 0);
        return new Date(millis);
      }
    }

    // ISO strings or other date-compatible values
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  };

  const formatDate = (timestamp: any) => {
    const date = convertToDate(timestamp);
    if (!date) return '—';

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    };

    return date.toLocaleString(undefined, options);
  };

  const filteredQuestions = questions.filter((question) => {
    if (statusFilter === 'answered') {
      return question.metadata?.escalation === false;
    }
    if (statusFilter === 'unanswered') {
      return question.metadata?.escalation !== false;
    }
    return true;
  });

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4 mb-2">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700">
            <Image
              src="/images/characters/sw.png"
              alt="Sung Wen"
              width={48}
              height={48}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Questions</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Questions from your AI employees that need your attention
            </p>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="mb-6">
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'answered', label: 'Answered' },
            { id: 'unanswered', label: 'Unanswered' },
          ].map((filter) => {
            const isActive = statusFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setStatusFilter(filter.id as typeof statusFilter)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No questions yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Your AI employees will escalate questions here when they need clarification
            </p>
          </div>
        ) : (
          filteredQuestions.map((question) => {
            const isAnswered = question.metadata?.escalation === false;
            const statusClasses = isAnswered
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-200';

            const statusLabel = isAnswered ? 'Answered' : 'Awaiting Answer';

            return (
            <div
              key={question.id}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all relative group"
            >
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleQuestionClick(question.id)}
                >
                  {/* Header */}
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="flex items-center justify-center w-8 h-8">
                      <UrgencyIcon urgency={question.metadata?.urgency} />
                    </span>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getUrgencyColor(
                        question.metadata?.urgency
                      )}`}
                    >
                      {question.metadata?.urgency?.toUpperCase() || 'QUESTION'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusClasses}`}
                    >
                      {statusLabel}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(question.createdAt)}
                    </span>
                  </div>

                  {/* Reason */}
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {question.metadata?.reason || question.title}
                  </h3>

                  {/* Summary */}
                  {question.metadata?.summary && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {question.metadata.summary}
                    </p>
                  )}

                  {/* Preview */}
                  {question.preview && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 line-clamp-1">
                      {question.preview}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteClick(e, question.id)}
                    disabled={deletingId === question.id}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Delete question"
                  >
                    {deletingId === question.id ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                  
                  {/* Arrow */}
                  <div 
                    className="cursor-pointer p-2"
                    onClick={() => handleQuestionClick(question.id)}
                  >
                    <ArrowRightIcon className="w-6 h-6 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <svg
            className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              About Questions
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Your AI employees are trained to escalate questions when they're not 100% certain about
              something. This ensures accuracy and quality in all responses. Click on any question to
              review it and provide guidance to Sung Wen.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Question"
        message="Are you sure you want to delete this question? This will permanently delete the entire conversation and cannot be undone."
        confirmText="Delete Question"
        isDeleting={deletingId === questionToDelete}
      />
    </div>
  );
}
