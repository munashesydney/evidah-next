'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface Rule {
  id: string;
  text: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function RulesPanel() {
  const params = useParams();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [rules, setRules] = useState<Rule[]>([]);
  const [newRule, setNewRule] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [rulesLoading, setRulesLoading] = useState(true);

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
      fetchRules();
    }
  }, [uid, selectedCompany]);

  const fetchRules = async () => {
    if (!uid) return;

    try {
      setRulesLoading(true);
      setError('');

      const response = await fetch(
        `/api/training/rules?uid=${uid}&selectedCompany=${selectedCompany || 'default'}`
      );

      const data = await response.json();

      if (data.success) {
        setRules(data.rules || []);
      } else {
        setError(data.error?.message || 'Failed to fetch rules');
      }
    } catch (error: any) {
      console.error('Error fetching rules:', error);
      setError('Failed to fetch rules');
    } finally {
      setRulesLoading(false);
    }
  };

  const addRule = async () => {
    if (!uid || !newRule.trim()) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/training/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          text: newRule.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewRule('');
        setSuccess('Rule added successfully');
        await fetchRules();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Failed to add rule');
      }
    } catch (error: any) {
      console.error('Error adding rule:', error);
      setError('Failed to add rule');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setEditingText(rule.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingText('');
  };

  const saveEdit = async (ruleId: string) => {
    if (!uid || !editingText.trim()) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/training/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          ruleId,
          text: editingText.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Rule updated successfully');
        await fetchRules();
        cancelEdit();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Failed to update rule');
      }
    } catch (error: any) {
      console.error('Error updating rule:', error);
      setError('Failed to update rule');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (rule: Rule) => {
    if (!uid) return;

    try {
      const response = await fetch('/api/training/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          ruleId: rule.id,
          enabled: !(rule.enabled !== false),
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchRules();
      }
    } catch (error: any) {
      console.error('Error toggling rule:', error);
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!uid) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/training/rules', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          ruleId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRules((prev) => prev.filter((r) => r.id !== ruleId));
        setSuccess('Rule deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Failed to delete rule');
      }
    } catch (error: any) {
      console.error('Error deleting rule:', error);
      setError('Failed to delete rule');
    } finally {
      setSaving(false);
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
      <div className="p-6 space-y-6">
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">AI Training Rules</h2>

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

        {/* Rules */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Rules</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Define how your AI should behave and respond to queries
          </div>
          <div className="space-y-4 mt-5">
            <div className="flex items-center space-x-2">
              <input
                className="form-input w-full"
                placeholder="Add a new rule"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !saving) {
                    addRule();
                  }
                }}
                disabled={saving}
              />
              <button
                type="button"
                onClick={addRule}
                className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
                disabled={saving || !newRule.trim()}
              >
                {saving ? 'Adding...' : 'Add'}
              </button>
            </div>

            <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="overflow-x-auto w-full">
                <table className="table-auto w-full min-w-[600px] max-w-full">
                  <thead className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left">Enabled</th>
                      <th className="px-4 py-3 text-left">Rule</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-gray-200 dark:divide-gray-700">
                    {rulesLoading ? (
                      [...Array(3)].map((_, idx) => (
                        <tr key={`skeleton-${idx}`}>
                          <td className="px-4 py-4">
                            <div className="animate-pulse h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="animate-pulse h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="animate-pulse h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                          </td>
                        </tr>
                      ))
                    ) : rules.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                          No rules yet
                        </td>
                      </tr>
                    ) : (
                      rules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              className="w-4 h-4 text-gray-900 bg-gray-100 border-gray-300 rounded focus:ring-gray-500 dark:focus:ring-gray-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                              checked={rule.enabled !== false}
                              onChange={() => toggleEnabled(rule)}
                            />
                          </td>
                          <td className="px-4 py-4">
                            {editingId === rule.id ? (
                              <input
                                className="form-input w-full"
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !saving) {
                                    saveEdit(rule.id);
                                  } else if (e.key === 'Escape') {
                                    cancelEdit();
                                  }
                                }}
                                autoFocus
                              />
                            ) : (
                              <span className="text-gray-800 dark:text-gray-100">{rule.text}</span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {editingId === rule.id ? (
                              <div className="flex space-x-2">
                                <button
                                  className="btn-sm bg-green-500 hover:bg-green-600 text-white"
                                  onClick={() => saveEdit(rule.id)}
                                  disabled={saving}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex space-x-2">
                                <button
                                  className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                                  onClick={() => startEdit(rule)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn-sm bg-red-500 hover:bg-red-600 text-white"
                                  onClick={() => deleteRule(rule.id)}
                                  disabled={saving}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Information Section */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">How rules work</h2>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>• Rules help guide your AI's behavior and responses</p>
              <p>• Each rule should be a clear instruction for how the AI should behave</p>
              <p>• Rules can include tone, style, escalation procedures, and limitations</p>
              <p>• Enable or disable rules as needed</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

