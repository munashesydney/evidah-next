'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from '@/lib/firebase';
import Link from 'next/link';

const auth = getAuth(app);

interface Email {
  id: string;
  emailAddress: string;
  smtpServer: string;
  port: string;
  default: boolean;
  createdAt: string | null;
}

export default function EmailsPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params?.selectedCompany as string;

  const [uid, setUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [errorDisplay, setErrorDisplay] = useState('');
  const [saved, setSaved] = useState(false);

  const [emails, setEmails] = useState<Email[]>([]);

  // Form state
  const [email, setEmail] = useState('');
  const [smtpServer, setSmtpServer] = useState('');
  const [port, setPort] = useState('');
  const [password, setPassword] = useState('');

  // Fetch user authentication and emails
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        fetchEmails(user.uid);
      } else {
        router.push('/sign-in');
      }
    });

    return () => unsubscribe();
  }, [router, selectedCompany]);

  // Fetch emails from API
  const fetchEmails = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/settings/emails?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const result = await response.json();

      if (result.success) {
        setEmails(result.data);
      } else {
        setErrorDisplay(result.error || 'Failed to fetch emails');
      }
    } catch (err: any) {
      console.error('Error fetching emails:', err);
      setErrorDisplay(err.message || 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!uid) {
      setError('User not authenticated');
      return;
    }

    // Validation
    if (!email || !smtpServer || !port || !password) {
      setError('All fields are required.');
      return;
    }

    setSubmitting(true);

    try {
      // First validate SMTP settings
      const validateResponse = await fetch('/api/settings/emails/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          smtpServer,
          port,
          password,
        }),
      });

      const validateResult = await validateResponse.json();

      if (!validateResult.isGood) {
        setSubmitting(false);
        setError('Your email details are invalid. Please double check.');
        return;
      }

      // If validation passes, create the email
      const createResponse = await fetch('/api/settings/emails/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
          emailAddress: email,
          smtpServer,
          port,
          password,
        }),
      });

      const createResult = await createResponse.json();

      if (createResult.success) {
        // Clear the form
        setEmail('');
        setSmtpServer('');
        setPort('');
        setPassword('');
        setSaved(true);
        setError('');
        setTimeout(() => setSaved(false), 3000);

        // Re-fetch emails after adding a new one
        fetchEmails(uid);
      } else {
        setError(createResult.error || 'Failed to save email.');
      }
    } catch (err: any) {
      console.error('Error adding email:', err);
      setError(err.message || 'Could not check your email details.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete email
  const handleDeleteEmail = async (emailId: string) => {
    if (!window.confirm('Are you sure you want to delete this email?')) {
      return;
    }

    setErrorDisplay('');
    try {
      const response = await fetch(
        `/api/settings/emails/delete?uid=${uid}&selectedCompany=${selectedCompany}&emailId=${emailId}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (result.success) {
        // Remove the email from the local state
        setEmails(emails.filter((email) => email.id !== emailId));
      } else {
        setErrorDisplay(result.error || 'Failed to delete email.');
      }
    } catch (err: any) {
      console.error('Error deleting email:', err);
      setErrorDisplay(err.message || 'Failed to delete email.');
    }
  };

  // Set email as default
  const handleSetDefault = async (emailId: string) => {
    setErrorDisplay('');
    try {
      const response = await fetch('/api/settings/emails/set-default', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany,
          emailId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the emails list with new default status
        setEmails(result.data);
      } else {
        setErrorDisplay(result.error || 'Failed to set default email.');
      }
    } catch (err: any) {
      console.error('Error setting default email:', err);
      setErrorDisplay(err.message || 'Failed to set default email.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-1">
        Add Email for SMTP
      </h2>
      <span className="text-sm text-gray-600 dark:text-gray-400">
        You can add custom email addresses here
      </span>

      <form onSubmit={handleSubmit}>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {saved && <p className="text-green-500 text-sm mb-4">Email saved successfully!</p>}

        {/* Row with Email, SMTP Server, and Port */}
        <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0 mb-4">
          <div className="sm:w-1/3">
            <label className="block text-sm font-medium mb-1" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input w-full"
              placeholder="Enter your email address"
              required
            />
          </div>

          <div className="sm:w-1/3">
            <label className="block text-sm font-medium mb-1" htmlFor="smtpServer">
              SMTP Server
            </label>
            <input
              type="text"
              id="smtpServer"
              value={smtpServer}
              onChange={(e) => setSmtpServer(e.target.value)}
              className="form-input w-full"
              placeholder="Enter SMTP server"
              required
            />
          </div>

          <div className="sm:w-1/3">
            <label className="block text-sm font-medium mb-1" htmlFor="port">
              Port
            </label>
            <input
              type="text"
              id="port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className="form-input w-full"
              placeholder="Enter port"
              required
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" htmlFor="password">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input w-full"
            placeholder="Enter your password"
            required
          />
        </div>

        <button
          type="submit"
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <svg
                className="animate-spin h-5 w-5 mr-3 inline-block"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Validating...
            </>
          ) : (
            'Save Email'
          )}
        </button>
      </form>

      {/* Section to Display All Emails */}
      <section className="mt-10">
        <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-5">
          Saved Custom Emails
        </h2>
        {errorDisplay && <p className="text-red-500 text-sm mb-4">{errorDisplay}</p>}

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border-b border-gray-200 dark:border-gray-700 py-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : emails.length > 0 ? (
          <ul className="space-y-2">
            {emails.map((emailDoc) => (
              <li
                key={emailDoc.id}
                className="border-b border-gray-200 dark:border-gray-700 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4"
              >
                <div>
                  <span className="font-bold text-gray-800 dark:text-gray-100">
                    {emailDoc.emailAddress}
                  </span>{' '}
                  <span className="text-gray-600 dark:text-gray-400">
                    - {emailDoc.smtpServer}:{emailDoc.port}
                  </span>
                  {emailDoc.default && (
                    <span className="ml-2 text-green-600 dark:text-green-400">(Default)</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSetDefault(emailDoc.id)}
                    className={`btn ${
                      emailDoc.default
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-violet-600 text-white hover:bg-violet-700'
                    } px-3 py-1 rounded text-sm`}
                    disabled={emailDoc.default}
                  >
                    {emailDoc.default ? 'Default' : 'Set as Default'}
                  </button>
                  <button
                    onClick={() => handleDeleteEmail(emailDoc.id)}
                    className="btn bg-red-600 text-white hover:bg-red-700 px-3 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No emails saved yet.</p>
        )}
      </section>
    </div>
  );
}

