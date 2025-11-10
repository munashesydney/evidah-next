'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  status: 'processing' | 'completed' | 'error';
  useForTraining?: boolean;
}

export default function DocumentsPanel() {
  const params = useParams();
  const selectedCompany = params?.selectedCompany as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);
  const [docsLoading, setDocsLoading] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);

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
      fetchDocuments();
    }
  }, [uid, selectedCompany]);

  const fetchDocuments = async () => {
    if (!uid) return;

    try {
      setDocsLoading(true);
      setError('');

      const response = await fetch(
        `/api/training/documents?uid=${uid}&selectedCompany=${selectedCompany || 'default'}`
      );

      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents || []);
      } else {
        setError(data.error?.message || 'Failed to fetch documents');
      }
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      setError('Failed to fetch documents');
    } finally {
      setDocsLoading(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!uid) {
      setError('User not authenticated');
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only PDF, DOCX, PPTX, and TXT files are allowed.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size too large. Maximum 10MB allowed.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1]; // Remove data URL prefix
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/training/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          fileData: base64Data,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`Document "${file.name}" uploaded successfully!`);
        await fetchDocuments(); // Refresh list
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setError(data.error?.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDeleteFile = (fileId: string, fileName: string) => {
    setFileToDelete({ id: fileId, name: fileName });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete || !uid) return;

    setDeleting(fileToDelete.id);
    try {
      const response = await fetch('/api/training/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          selectedCompany: selectedCompany || 'default',
          fileId: fileToDelete.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDocuments((prev) => prev.filter((doc) => doc.id !== fileToDelete.id));
        setSuccess(`Document "${fileToDelete.name}" deleted successfully`);
        setError('');
      } else {
        setError(data.error?.message || 'Delete failed');
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
      setError('Delete failed. Please try again.');
    } finally {
      setDeleting(null);
      setDeleteModalOpen(false);
      setFileToDelete(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  };

  const getFileType = (mimeType: string): string => {
    switch (mimeType) {
      case 'application/pdf':
        return 'PDF';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'DOCX';
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return 'PPTX';
      case 'text/plain':
        return 'TXT';
      default:
        return 'Unknown';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Completed
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            Processing
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
            Unknown
          </span>
        );
    }
  };

  const getFileIcon = (mimeType: string) => {
    const baseClasses = 'w-8 h-8';
    switch (mimeType) {
      case 'application/pdf':
        return (
          <svg className={`${baseClasses} text-red-500`} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return (
          <svg className={`${baseClasses} text-blue-500`} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
        return (
          <svg className={`${baseClasses} text-orange-500`} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className={`${baseClasses} text-gray-500`} fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
              clipRule="evenodd"
            />
          </svg>
        );
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
    <div className="grow overflow-hidden">
      <div className="p-6 space-y-6 w-full overflow-hidden">
        <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-5">Training Documents</h2>

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

        {/* Upload Section */}
        <section className="mb-8">
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">Upload Documents</h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Upload PDF, DOCX, PPTX, or TXT files to train your AI
          </div>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center max-w-full transition-colors ${
              isDragActive
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="mt-4">
              <label htmlFor="file-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
                  {uploading ? (
                    <span className="text-gray-500">Uploading...</span>
                  ) : (
                    <span className="text-violet-500 hover:text-violet-400">Click to upload</span>
                  )}{' '}
                  or drag and drop
                </span>
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  PDF, DOCX, PPTX, TXT up to 10MB
                </span>
              </label>
              <input
                id="file-upload"
                ref={fileInputRef}
                name="file-upload"
                type="file"
                className="sr-only"
                accept=".pdf,.docx,.pptx,.txt"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </div>
          </div>
        </section>

        {/* Documents List */}
        <section className="w-full">
          <h2 className="text-xl leading-snug text-gray-800 dark:text-gray-100 font-bold mb-1">
            Uploaded Documents
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Manage your training documents</div>

          <div className="w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="table-auto w-full min-w-[600px] max-w-full">
                <thead className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left">Document</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Size</th>
                    <th className="px-4 py-3 text-left">Uploaded</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-200 dark:divide-gray-700">
                  {docsLoading ? (
                    [...Array(3)].map((_, idx) => (
                      <tr key={`skeleton-${idx}`}>
                        <td className="px-4 py-4">
                          <div className="animate-pulse h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="animate-pulse h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="animate-pulse h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="animate-pulse h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="animate-pulse h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="animate-pulse h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded" />
                        </td>
                      </tr>
                    ))
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No documents uploaded yet
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {getFileIcon(doc.fileType)}
                            <div className="ml-3">
                              <div
                                className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]"
                                title={doc.fileName}
                              >
                                {doc.fileName}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-gray-500 dark:text-gray-400">{getFileType(doc.fileType)}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-gray-500 dark:text-gray-400">{formatFileSize(doc.fileSize)}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-gray-500 dark:text-gray-400">{formatDate(doc.uploadedAt)}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">{getStatusBadge(doc.status)}</td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleDeleteFile(doc.id, doc.fileName)}
                            disabled={deleting === doc.id}
                            className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 disabled:opacity-50"
                            title="Delete"
                          >
                            {deleting === doc.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                            ) : (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Delete Document</h3>
              </div>
              <div className="px-5 py-4">
                <div className="text-sm">
                  <div className="font-medium text-gray-800 dark:text-gray-100 mb-3">
                    Are you sure you want to delete this document?
                  </div>
                  {fileToDelete && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      <strong>{fileToDelete.name}</strong> will be permanently deleted and cannot be recovered.
                    </p>
                  )}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700/60 flex flex-wrap justify-end space-x-2">
                <button
                  type="button"
                  className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setFileToDelete(null);
                  }}
                  disabled={!!deleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-sm bg-red-500 hover:bg-red-600 text-white"
                  onClick={confirmDelete}
                  disabled={!!deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

