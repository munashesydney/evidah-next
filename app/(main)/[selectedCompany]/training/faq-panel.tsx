'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  enabled: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function FAQPanel() {
  const params = useParams();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState('');
  const [editingAnswer, setEditingAnswer] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [faqsLoading, setFaqsLoading] = useState(true);

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
      fetchFAQs();
    }
  }, [uid, selectedCompany]);

  const fetchFAQs = async () => {
    if (!uid) return;

    try {
      setFaqsLoading(true);
      setError('');

      const response = await fetch(
        `/api/training/faq?uid=${uid}&selectedCompany=${selectedCompany || 'default'}`
      );

      const data = await response.json();

      if (data.success) {
        setFaqs(data.faqs || []);
      } else {
        setError(data.error?.message || 'Failed to fetch FAQs');
      }
    } catch (error: any) {
      console.error('Error fetching FAQs:', error);
      setError('Failed to fetch FAQs');
    } finally {
      setFaqsLoading(false);
    }
  };

  const addFAQ = async () => {
    if (!uid || !newQuestion.trim() || !newAnswer.trim()) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/training/faq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewQuestion('');
        setNewAnswer('');
        setShowAddForm(false);
        setSuccess('FAQ added successfully');
        await fetchFAQs();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Failed to add FAQ');
      }
    } catch (error: any) {
      console.error('Error adding FAQ:', error);
      setError('Failed to add FAQ');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (faq: FAQ) => {
    setEditingId(faq.id);
    setEditingQuestion(faq.question);
    setEditingAnswer(faq.answer);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingQuestion('');
    setEditingAnswer('');
  };

  const saveEdit = async (faqId: string) => {
    if (!uid || !editingQuestion.trim() || !editingAnswer.trim()) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/training/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          faqId,
          question: editingQuestion.trim(),
          answer: editingAnswer.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('FAQ updated successfully');
        await fetchFAQs();
        cancelEdit();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Failed to update FAQ');
      }
    } catch (error: any) {
      console.error('Error updating FAQ:', error);
      setError('Failed to update FAQ');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async (faq: FAQ) => {
    if (!uid) return;

    try {
      const response = await fetch('/api/training/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          faqId: faq.id,
          enabled: !(faq.enabled !== false),
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchFAQs();
      }
    } catch (error: any) {
      console.error('Error toggling FAQ:', error);
    }
  };

  const deleteFAQ = async (faqId: string) => {
    if (!uid) return;

    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/training/faq', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          faqId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setFaqs((prev) => prev.filter((f) => f.id !== faqId));
        setSuccess('FAQ deleted successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error?.message || 'Failed to delete FAQ');
      }
    } catch (error: any) {
      console.error('Error deleting FAQ:', error);
      setError('Failed to delete FAQ');
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
        <div className="flex items-center justify-between">
          <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold">Frequently Asked Questions</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
          >
            {showAddForm ? 'Cancel' : '+ Add FAQ'}
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

        {/* Add FAQ Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Add New FAQ</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question
                </label>
                <input
                  type="text"
                  className="form-input w-full"
                  placeholder="Enter the question"
                  value={newQuestion}
                  onChange={(e) => setNewQuestion(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Answer
                </label>
                <textarea
                  className="form-textarea w-full"
                  rows={4}
                  placeholder="Enter the answer"
                  value={newAnswer}
                  onChange={(e) => setNewAnswer(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={addFAQ}
                  disabled={saving || !newQuestion.trim() || !newAnswer.trim()}
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add FAQ'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewQuestion('');
                    setNewAnswer('');
                  }}
                  className="btn border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAQs List */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-4">FAQs</h2>
          {faqsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, idx) => (
                <div key={`skeleton-${idx}`} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">No FAQs yet. Click "Add FAQ" to create your first one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqs.map((faq) => (
                <div
                  key={faq.id}
                  className={`bg-white dark:bg-gray-800 border rounded-lg p-6 shadow-sm transition-all ${
                    faq.enabled !== false
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-gray-300 dark:border-gray-600 opacity-60'
                  }`}
                >
                  {editingId === faq.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Question
                        </label>
                        <input
                          type="text"
                          className="form-input w-full"
                          value={editingQuestion}
                          onChange={(e) => setEditingQuestion(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Answer
                        </label>
                        <textarea
                          className="form-textarea w-full"
                          rows={4}
                          value={editingAnswer}
                          onChange={(e) => setEditingAnswer(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={faq.enabled !== false}
                            onChange={() => toggleEnabled(faq)}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Enabled</span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            className="btn-sm bg-green-500 hover:bg-green-600 text-white"
                            onClick={() => saveEdit(faq.id)}
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
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                            {faq.question}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={faq.enabled !== false}
                            onChange={() => toggleEnabled(faq)}
                            title={faq.enabled !== false ? 'Disable' : 'Enable'}
                          />
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-wrap">{faq.answer}</p>
                      <div className="flex space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                          onClick={() => startEdit(faq)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-sm bg-red-500 hover:bg-red-600 text-white"
                          onClick={() => deleteFAQ(faq.id)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Information Section */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">About FAQs</h2>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p>• FAQs help provide quick answers to common questions</p>
              <p>• FAQs are included in your knowledge base when you refresh it</p>
              <p>• Enable or disable FAQs as needed</p>
              <p>• FAQs appear at the end of your knowledge base content</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

