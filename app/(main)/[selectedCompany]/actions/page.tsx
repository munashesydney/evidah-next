'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import ActionEventViewer from '@/components/actions/action-event-viewer';

interface Action {
  id: string;
  trigger: string;
  employee: string;
  prompt: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const employees = [
  { id: 'emma', name: 'Emma', avatar: '/images/characters/emma.png', gradient: 'from-pink-500 to-pink-700' },
  { id: 'marquavious', name: 'Marquavious', avatar: '/images/characters/mq.png', gradient: 'from-blue-500 to-blue-700' },
  { id: 'sung-wen', name: 'Sung Wen', avatar: '/images/characters/sw.png', gradient: 'from-emerald-500 to-emerald-700' },
  { id: 'charlie', name: 'Charlie', avatar: '/images/characters/charlie.png', gradient: 'from-amber-500 to-orange-600' },
];

const triggers = [
  { id: 'new_ticket', label: 'New Ticket Created' },
  { id: 'ticket_reply', label: 'Ticket Reply Received' },
  { id: 'new_chat', label: 'New Chat Started' },
  { id: 'chat_message', label: 'Chat Message Received' },
  { id: 'article_created', label: 'Article Created' },
  { id: 'article_updated', label: 'Article Updated' },
];

export default function ActionsPage() {
  const params = useParams();
  const selectedCompany = params.selectedCompany as string;

  const [uid, setUid] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Form state
  const [selectedTrigger, setSelectedTrigger] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [prompt, setPrompt] = useState('');

  // Event viewer state
  const [viewingAction, setViewingAction] = useState<Action | null>(null);
  
  // Edit state
  const [editingAction, setEditingAction] = useState<Action | null>(null);

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
      fetchActions();
    }
  }, [uid]);

  const fetchActions = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/actions?uid=${uid}&selectedCompany=${selectedCompany}`
      );
      const data = await response.json();

      if (data.success) {
        setActions(data.actions);
      }
    } catch (error) {
      console.error('Error fetching actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!uid || !selectedTrigger || !selectedEmployee || !prompt.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
          trigger: selectedTrigger,
          employee: selectedEmployee,
          prompt: prompt.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActions([data.action, ...actions]);
        setSelectedTrigger('');
        setSelectedEmployee('');
        setPrompt('');
      } else {
        alert('Failed to create action');
      }
    } catch (error) {
      console.error('Error creating action:', error);
      alert('Failed to create action');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (action: Action) => {
    setEditingAction(action);
    setSelectedTrigger(action.trigger);
    setSelectedEmployee(action.employee);
    setPrompt(action.prompt);
    // Scroll to form
    setTimeout(() => {
      document.getElementById('action-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingAction(null);
    setSelectedTrigger('');
    setSelectedEmployee('');
    setPrompt('');
  };

  const handleUpdate = async () => {
    if (!uid || !editingAction || !selectedTrigger || !selectedEmployee || !prompt.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch('/api/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
          actionId: editingAction.id,
          trigger: selectedTrigger,
          employee: selectedEmployee,
          prompt: prompt.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActions(actions.map((a) => (a.id === editingAction.id ? data.action : a)));
        handleCancelEdit();
      } else {
        alert('Failed to update action');
      }
    } catch (error) {
      console.error('Error updating action:', error);
      alert('Failed to update action');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggle = async (actionId: string, enabled: boolean) => {
    if (!uid) return;

    try {
      const response = await fetch('/api/actions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
          actionId,
          enabled: !enabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActions(actions.map((a) => (a.id === actionId ? data.action : a)));
      }
    } catch (error) {
      console.error('Error toggling action:', error);
    }
  };

  const handleDelete = async (actionId: string) => {
    if (!uid || !confirm('Are you sure you want to delete this action?')) return;

    try {
      const response = await fetch('/api/actions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
          actionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setActions(actions.filter((a) => a.id !== actionId));
      }
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  };

  const getEmployeeData = (employeeId: string) => {
    return employees.find((e) => e.id === employeeId);
  };

  const getTriggerLabel = (triggerId: string) => {
    return triggers.find((t) => t.id === triggerId)?.label || triggerId;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Actions</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Automate tasks by creating actions that trigger when specific events occur
        </p>
      </div>

      {/* Actions List */}
      <div className="mb-6 space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : actions.length === 0 ? (
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No actions yet</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating your first action below
            </p>
          </div>
        ) : (
          actions.map((action) => {
            const employee = getEmployeeData(action.employee);
            return (
              <div
                key={action.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setViewingAction(action)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Employee Avatar */}
                    {employee && (
                      <div className={`w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br ${employee.gradient} flex-shrink-0`}>
                        <Image
                          src={employee.avatar}
                          alt={employee.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Action Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300">
                          {getTriggerLabel(action.trigger)}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {employee?.name}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {action.prompt}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Click to view event history
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(action.id, action.enabled);
                      }}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        action.enabled ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          action.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(action);
                      }}
                      className="p-2 text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                      title="Edit action"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(action.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete action"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Event Viewer Modal */}
      {viewingAction && uid && (
        <ActionEventViewer
          uid={uid}
          selectedCompany={selectedCompany}
          actionId={viewingAction.id}
          actionName={getTriggerLabel(viewingAction.trigger)}
          employeeId={viewingAction.employee}
          onClose={() => setViewingAction(null)}
        />
      )}

      {/* Create/Edit Action Card */}
      <div id="action-form" className="bg-white dark:bg-gray-800 rounded-2xl p-6 border-2 border-gray-200 dark:border-gray-700 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingAction ? 'Edit Action' : 'Create New Action'}
          </h3>
          {editingAction && (
            <button
              onClick={handleCancelEdit}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Trigger Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              When this happens
            </label>
            <select
              value={selectedTrigger}
              onChange={(e) => setSelectedTrigger(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">Select a trigger...</option>
              {triggers.map((trigger) => (
                <option key={trigger.id} value={trigger.id}>
                  {trigger.label}
                </option>
              ))}
            </select>
          </div>

          {/* Employee Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign to
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  onClick={() => setSelectedEmployee(employee.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    selectedEmployee === employee.id
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className={`w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 bg-gradient-to-br ${employee.gradient}`}>
                    <Image
                      src={employee.avatar}
                      alt={employee.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white text-center">
                    {employee.name}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Prompt Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              What should they do?
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what action should be taken..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Create/Update Button */}
          {editingAction ? (
            <button
              onClick={handleUpdate}
              disabled={updating || !selectedTrigger || !selectedEmployee || !prompt.trim()}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {updating ? 'Updating...' : 'Update Action'}
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating || !selectedTrigger || !selectedEmployee || !prompt.trim()}
              className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {creating ? 'Creating...' : 'Create Action'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
