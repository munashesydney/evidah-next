'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface Scenario {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  condition: string; // Natural language condition
  thenAction: string; // Natural language action
  elseAction?: string | null; // Optional natural language else action
  createdAt?: string;
  updatedAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export default function ScenariosPanel() {
  const params = useParams();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null);

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
      fetchScenarios();
    }
  }, [uid, selectedCompany, currentPage]);

  const fetchScenarios = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `/api/scenarios/list?uid=${uid}&selectedCompany=${selectedCompany || 'default'}&page=${currentPage}&limit=20`
      );

      const data = await response.json();

      if (data.success) {
        setScenarios(data.scenarios || []);
        setPagination(data.pagination || null);
      } else {
        setError(data.error?.message || 'Failed to fetch scenarios');
      }
    } catch (error: any) {
      console.error('Error fetching scenarios:', error);
      setError('Failed to fetch scenarios');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grow">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold">Chat Scenarios</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Create conditional logic to automate responses based on user messages
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Scenario
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
          </div>
        )}

        {/* Scenarios List */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, idx) => (
              <ScenarioCardSkeleton key={`skeleton-${idx}`} />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  onEdit={() => setEditingScenario(scenario)}
                  onDelete={handleDelete}
                  onToggleEnabled={handleToggleEnabled}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} scenarios
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={!pagination.hasMore}
                    className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && scenarios.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-gray-500 dark:text-gray-400 mb-2">No scenarios yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
              Create your first scenario to automate chat responses
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
            >
              Add Scenario
            </button>
          </div>
        )}

        {/* Add/Edit Scenario Modal */}
        {(showAddModal || editingScenario) && (
          <AddScenarioModal
            scenario={editingScenario}
            uid={uid}
            selectedCompany={selectedCompany || 'default'}
            onClose={() => {
              setShowAddModal(false);
              setEditingScenario(null);
            }}
            onSuccess={() => {
              fetchScenarios();
              setShowAddModal(false);
              setEditingScenario(null);
            }}
          />
        )}
      </div>
    </div>
  );

  async function handleDelete(scenarioId: string) {
    if (!uid) return;
    if (!confirm('Are you sure you want to delete this scenario?')) return;

    try {
      setError('');
      setSuccess('');

      const response = await fetch('/api/scenarios/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          scenarioId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Scenario deleted successfully');
        await fetchScenarios();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Failed to delete scenario');
      }
    } catch (error: any) {
      console.error('Error deleting scenario:', error);
      setError('Failed to delete scenario');
    }
  }

  async function handleToggleEnabled(scenario: Scenario) {
    if (!uid) return;

    try {
      const response = await fetch('/api/scenarios/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          scenarioId: scenario.id,
          enabled: !scenario.enabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchScenarios();
      }
    } catch (error: any) {
      console.error('Error toggling scenario:', error);
    }
  }
}

function ScenarioCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="animate-pulse w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <div className="animate-pulse h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="animate-pulse h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
            <div className="animate-pulse h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <div className="animate-pulse h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="animate-pulse h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="animate-pulse h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="animate-pulse h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <div className="animate-pulse h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            <div className="animate-pulse h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({
  scenario,
  onEdit,
  onDelete,
  onToggleEnabled,
}: {
  scenario: Scenario;
  onEdit: () => void;
  onDelete: (id: string) => void;
  onToggleEnabled: (scenario: Scenario) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className={`w-2 h-2 rounded-full ${scenario.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{scenario.name}</h3>
              {scenario.enabled && (
                <span className="px-2 py-1 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded">
                  Active
                </span>
              )}
              {!scenario.enabled && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{scenario.description}</p>

            {/* Flow Visualization */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-4">
              {/* Condition Block */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    When
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                    {scenario.condition}
                  </div>
                </div>
              </div>

              {/* Then Action Block */}
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 mt-0.5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Then
                  </div>
                  <div className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                    {scenario.thenAction}
                  </div>
                </div>
              </div>

              {/* Else Action Block (if exists) */}
              {scenario.elseAction && scenario.elseAction.trim() && (
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center text-amber-600 dark:text-amber-400 mt-0.5">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                      Otherwise
                    </div>
                    <div className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                      {scenario.elseAction}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2 ml-4">
            <button
              type="button"
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onDelete(scenario.id)}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Delete"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddScenarioModal({
  scenario,
  uid,
  selectedCompany,
  onClose,
  onSuccess,
}: {
  scenario?: Scenario | null;
  uid: string | null;
  selectedCompany: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: scenario?.name || '',
    description: scenario?.description || '',
    condition: scenario?.condition || '',
    thenAction: scenario?.thenAction || '',
    hasElse: !!(scenario?.elseAction && scenario.elseAction.trim()),
    elseAction: scenario?.elseAction || '',
  });

  const handleSubmit = async () => {
    if (!uid) {
      alert('User not authenticated');
      return;
    }

    if (!formData.name.trim() || !formData.condition.trim() || !formData.thenAction.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      const url = scenario ? '/api/scenarios/update' : '/api/scenarios/add';
      const method = scenario ? 'PUT' : 'POST';

      const body: any = {
        uid,
        selectedCompany,
        name: formData.name.trim(),
        description: formData.description.trim(),
        condition: formData.condition.trim(),
        thenAction: formData.thenAction.trim(),
      };

      if (scenario) {
        body.scenarioId = scenario.id;
      }

      if (formData.hasElse && formData.elseAction.trim()) {
        body.elseAction = formData.elseAction.trim();
      } else if (scenario) {
        body.elseAction = null;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
      } else {
        alert(data.error?.message || 'Failed to save scenario');
      }
    } catch (error: any) {
      console.error('Error saving scenario:', error);
      alert('Failed to save scenario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              {scenario ? 'Edit Scenario' : 'Create New Scenario'}
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Scenario Name
            </label>
            <input
              type="text"
              className="form-input w-full"
              placeholder="e.g., Refund Request Handler"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              className="form-textarea w-full"
              rows={2}
              placeholder="Describe what this scenario does..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Condition Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Condition</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Describe when this scenario should trigger in natural language
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                When should this scenario trigger?
              </label>
              <textarea
                className="form-textarea w-full"
                rows={3}
                placeholder='e.g., "When the user message contains words like refund, return, or money back" or "When the user asks about product features or specifications"'
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                The AI will understand your natural language description and apply it intelligently
              </p>
            </div>
          </div>

          {/* Then Action Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Then Action</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Describe what should happen when the condition is met
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                What should happen?
              </label>
              <textarea
                className="form-textarea w-full"
                rows={3}
                placeholder='e.g., "Respond with: I can help you with your refund request. Let me check your order details." or "Search the knowledge base for relevant product information and provide a detailed response"'
                value={formData.thenAction}
                onChange={(e) => setFormData({ ...formData, thenAction: e.target.value })}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Describe the action in natural language - respond, escalate, search, redirect, etc.
              </p>
            </div>
          </div>

          {/* Else Action Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Otherwise Action (Optional)</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    What should happen if the condition is not met?
                  </p>
                </div>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-gray-900 bg-gray-100 border-gray-300 rounded focus:ring-gray-500"
                  checked={formData.hasElse}
                  onChange={(e) => setFormData({ ...formData, hasElse: e.target.checked })}
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Add else action</span>
              </label>
            </div>

            {formData.hasElse && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  What should happen otherwise?
                </label>
                <textarea
                  className="form-textarea w-full"
                  rows={3}
                  placeholder='e.g., "Escalate to a human agent with billing expertise" or "Respond with a friendly greeting asking how you can assist them today"'
                  value={formData.elseAction}
                  onChange={(e) => setFormData({ ...formData, elseAction: e.target.value })}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Describe the alternative action in natural language
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="btn border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !formData.name.trim() || !formData.condition.trim() || !formData.thenAction.trim()}
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : scenario ? 'Update Scenario' : 'Create Scenario'}
          </button>
        </div>
      </div>
    </div>
  );
}

