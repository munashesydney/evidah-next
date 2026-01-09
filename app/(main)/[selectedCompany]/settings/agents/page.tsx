'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

const auth = getAuth(app);

interface Agent {
  id: string;
  userEmail: string;
  role: string;
  displayName: string;
  phoneNumber: string;
  createdAt: string | null;
}

export default function AgentsPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [editingAgent, setEditingAgent] = useState<string | null>(null);

  const [agents, setAgents] = useState<Agent[]>([]);

  // Form state for adding new agent
  const [agentName, setAgentName] = useState('');
  const [agentEmail, setAgentEmail] = useState('');
  const [category, setCategory] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  // Form state for editing agent
  const [editForm, setEditForm] = useState({
    displayName: '',
    role: '',
    phoneNumber: '',
  });

  // Fetch user authentication and agents
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        fetchAgents(user.uid);
      } else {
        router.push('/sign-in');
      }
    });

    return () => unsubscribe();
  }, [router, selectedCompany]);

  // Fetch agents from API
  const fetchAgents = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/settings/agents?uid=${userId}&selectedCompany=${selectedCompany}`);
      const result = await response.json();

      if (result.success) {
        setAgents(result.data);
      } else {
        setError(result.error || 'Failed to fetch agents');
      }
    } catch (err: any) {
      console.error('Error fetching agents:', err);
      setError(err.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission for adding new agent
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError('');

    try {
      const response = await fetch('/api/settings/agents/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          additionalEmail: agentEmail,
          additionalPassword: password,
          role: category,
          additionalUserData: {
            displayName: agentName,
            phoneNumber: phoneNumber,
          },
          selectedCompany: selectedCompany,
        }),
      });

      const result = await response.json();

      if (result.status === 1) {
        // Add the new agent to the list
        setAgents([...agents, result.data]);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);

        // Reset form
        setAgentName('');
        setAgentEmail('');
        setCategory('');
        setPhoneNumber('');
        setPassword('');
      } else {
        setError(result.message || 'Failed to add agent');
      }
    } catch (err: any) {
      console.error('Error adding agent:', err);
      setError(err.message || 'Failed to add agent');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete agent
  const handleDeleteAgent = async (agentId: string) => {
    if (!window.confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    setError('');
    try {
      const response = await fetch(`/api/settings/agents/delete?uid=${uid}&agentId=${agentId}&selectedCompany=${selectedCompany}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Remove the agent from the local state
        setAgents(agents.filter((agent) => agent.id !== agentId));
      } else {
        setError(result.error || 'Failed to delete agent');
      }
    } catch (err: any) {
      console.error('Error deleting agent:', err);
      setError(err.message || 'Failed to delete agent');
    }
  };

  // Handle edit agent button click
  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent.id);
    setEditForm({
      displayName: agent.displayName || '',
      role: agent.role || '',
      phoneNumber: agent.phoneNumber || '',
    });
  };

  // Save edited agent
  const handleSaveAgent = async (agentId: string) => {
    setError('');
    try {
      const response = await fetch('/api/settings/agents/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          agentId,
          displayName: editForm.displayName,
          role: editForm.role,
          phoneNumber: editForm.phoneNumber,
          selectedCompany: selectedCompany,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the agent in the local state
        setAgents(
          agents.map((agent) =>
            agent.id === agentId ? result.data : agent
          )
        );
        setEditingAgent(null);
      } else {
        setError(result.error || 'Failed to update agent');
      }
    } catch (err: any) {
      console.error('Error updating agent:', err);
      setError(err.message || 'Failed to update agent');
    }
  };

  const getSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  );

  return (
    <form className="grow" onSubmit={handleSubmit}>
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">Your Agents</h2>

        {/* Messages */}
        <div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {saved && <p className="text-green-500 text-sm">Saved</p>}
        </div>

        {/* Add Agent Section */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Add Agent
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            These are the details of the agent
          </div>
          <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="agentname">
                Agent Name
              </label>
              <input
                placeholder="Enter Agent Name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                id="agentname"
                className="form-input w-full"
                type="text"
                required
              />
            </div>
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="agentemail">
                Agent Email
              </label>
              <input
                placeholder="Enter Agent Email"
                value={agentEmail}
                onChange={(e) => setAgentEmail(e.target.value)}
                id="agentemail"
                className="form-input w-full"
                type="email"
                required
              />
            </div>
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="category">
                Agent Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                id="category"
                className="form-select w-full"
                required
              >
                <option value="">Select Category</option>
                <option value="Sales">Sales</option>
                <option value="Support">Support</option>
                <option value="Admin">Administrator</option>
              </select>
            </div>
          </div>
          <div className="sm:flex sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 mt-5">
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="password">
                Password
              </label>
              <input
                placeholder="Enter Agent Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                id="password"
                className="form-input w-full"
                type="password"
                required
              />
            </div>
            <div className="sm:w-1/3">
              <label className="block text-sm font-medium mb-1" htmlFor="phonenumber">
                Phone Number (Optional)
              </label>
              <input
                placeholder="Enter Agent Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                id="phonenumber"
                className="form-input w-full"
                type="tel"
              />
            </div>
          </div>
        </section>

        {/* Display List of Agents */}
        <section>
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-5">
            All Agents
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border-b py-2">
                  {getSkeleton()}
                </div>
              ))}
            </div>
          ) : agents.length > 0 ? (
            <ul className="space-y-2">
              {agents.map((agent) => (
                <li
                  key={agent.id}
                  className="border-b border-gray-200 dark:border-gray-700 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
                >
                  <div className="flex-1">
                    {/* Display the agent's info or an editable form */}
                    {editingAgent === agent.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editForm.displayName}
                          onChange={(e) =>
                            setEditForm({ ...editForm, displayName: e.target.value })
                          }
                          className="form-input w-full"
                          placeholder="Agent Name"
                        />
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="form-select w-full"
                        >
                          <option value="">Select Category</option>
                          <option value="Sales">Sales</option>
                          <option value="Support">Support</option>
                          <option value="Admin">Administrator</option>
                        </select>
                        <input
                          type="tel"
                          value={editForm.phoneNumber}
                          onChange={(e) =>
                            setEditForm({ ...editForm, phoneNumber: e.target.value })
                          }
                          className="form-input w-full"
                          placeholder="Phone Number"
                        />
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-gray-800 dark:text-gray-100">
                          {agent.displayName || 'No name'}
                        </span>{' '}
                        <span className="text-gray-600 dark:text-gray-400">
                          - {agent.userEmail} ({agent.role})
                        </span>
                        {agent.phoneNumber && (
                          <span className="text-gray-500 dark:text-gray-500 text-sm ml-2">
                            • {agent.phoneNumber}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editingAgent === agent.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveAgent(agent.id)}
                          className="btn bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingAgent(null)}
                          className="btn bg-gray-600 text-white hover:bg-gray-700 px-3 py-1 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleEditAgent(agent)}
                          className="flex items-center justify-center bg-violet-600 text-white hover:bg-violet-700 px-2 py-1 rounded"
                        >
                          <PencilIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="flex items-center justify-center bg-red-600 text-white hover:bg-red-700 px-2 py-1 rounded"
                        >
                          <TrashIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No agents to display.</p>
          )}
        </section>
      </div>

      {/* Panel footer */}
      <footer>
        <div className="flex flex-col px-6 py-5 border-t border-gray-200 dark:border-gray-700/60">
          <div className="flex self-end">
            {!saving ? (
              <button
                type="submit"
                className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white ml-3"
              >
                Add Agent
              </button>
            ) : (
              <button
                className="btn w-full bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                disabled
              >
                <svg
                  className="animate-spin fill-current shrink-0"
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                >
                  <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"></path>
                </svg>
                <span className="ml-2">Saving...</span>
              </button>
            )}
          </div>
        </div>
      </footer>
    </form>
  );
}

