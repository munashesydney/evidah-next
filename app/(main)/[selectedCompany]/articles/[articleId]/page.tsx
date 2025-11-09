'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import ModalBasic from '@/components/modal-basic';
import ModalBlank from '@/components/modal-blank';

// Dynamically import the BlockNote editor to avoid SSR issues
const BlockNoteEditor = dynamic(() => import('@/components/blocknote-editor'), {
  ssr: false,
  loading: () => (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-8">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      </div>
    </div>
  ),
});

interface Article {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  link: string;
  content: string;
  rawText: string;
  published: boolean;
  fav: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const selectedCompany = params.selectedCompany as string;
  const articleId = params.articleId as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Edit form states
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editErrorMessage, setEditErrorMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        router.push('/sign-in');
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (userId && articleId) {
      fetchArticle();
    }
  }, [userId, articleId, selectedCompany]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchArticle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/articles/${articleId}?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const data = await response.json();

      if (data.success) {
        setArticle(data.data.article);
        setEditTitle(data.data.article.title);
        setEditDescription(data.data.article.description);
        setEditLink(data.data.article.link);
      } else {
        console.error('Failed to fetch article:', data.error);
      }
    } catch (error) {
      console.error('Error fetching article:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrorMessage('');

    if (!editTitle.trim() || !editDescription.trim() || !editLink.trim()) {
      setEditErrorMessage('Please fill out all required fields.');
      return;
    }

    setIsEditing(true);
    try {
      const response = await fetch('/api/articles/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userId,
          selectedCompany,
          categoryId: article?.categoryId,
          articleId: article?.id,
          title: editTitle,
          description: editDescription,
          link: editLink,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEditModalOpen(false);
        fetchArticle();
      } else {
        setEditErrorMessage(data.error || 'Failed to update article');
      }
    } catch (error) {
      setEditErrorMessage('An error occurred while updating the article');
      console.error('Error updating article:', error);
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteArticle = async () => {
    if (!article) return;

    setIsDeleting(true);
    try {
      const response = await fetch('/api/articles/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userId,
          selectedCompany,
          categoryId: article.categoryId,
          articleId: article.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/${selectedCompany}/articles`);
      } else {
        console.error('Failed to delete article:', data.error);
      }
    } catch (error) {
      console.error('Error deleting article:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value;
    // Allow only letters, numbers, hyphens, and underscores
    const sanitizedLink = newLink.replace(/[^a-zA-Z0-9-_]/g, '');
    setEditLink(sanitizedLink);
  };

  if (isLoading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <div className="mb-8">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Article not found</p>
          <Link
            href={`/${selectedCompany}/articles`}
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white mt-4"
          >
            Back to Articles
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <div className="mb-6">
          <Link
            href={`/${selectedCompany}/articles`}
            className="btn-sm px-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 cursor-pointer"
          >
            <svg
              className="fill-current text-gray-400 dark:text-gray-500 mr-2"
              width="7"
              height="12"
              viewBox="0 0 7 12"
            >
              <path d="M5.4.6 6.8 2l-4 4 4 4-1.4 1.4L0 6z" />
            </svg>
            <span>Back To Articles</span>
          </Link>
        </div>

        {/* Article metadata */}
        <div className="text-sm text-gray-500 dark:text-gray-400 italic mb-2">
          Posted {article.createdAt ? new Date(article.createdAt).toDateString() : 'Unknown date'}
        </div>

        {/* Header */}
        <header className="mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold mb-2">
                {article.title}
              </h1>
              <h4 className="text-gray-800 dark:text-gray-100">{article.description}</h4>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm text-violet-600 dark:text-violet-400">{article.categoryName}</span>
                {article.published && (
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded">
                    Published
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => setEditModalOpen(true)}
                className="text-gray-400 hover:text-violet-500 dark:text-gray-500 dark:hover:text-violet-400 cursor-pointer"
                title="Edit article info"
              >
                <span className="sr-only">Edit</span>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 cursor-pointer"
                title="Delete article"
              >
                <span className="sr-only">Delete</span>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <hr className="my-6 border-t border-gray-100 dark:border-gray-700/60" />

        {/* Editor */}
        {userId && article && (
          <BlockNoteEditor
            article={article}
            categoryId={article.categoryId}
            articleId={article.id}
            uid={userId}
            selectedCompany={selectedCompany}
            theContent={article.content}
            theRawText={article.rawText}
            onSave={() => {
              // Refresh article data after save
              fetchArticle();
            }}
          />
        )}
      </div>

      {/* Edit Modal */}
      <ModalBasic title="Edit Article Info" isOpen={editModalOpen} setIsOpen={setEditModalOpen}>
        <form onSubmit={handleEditSubmit}>
          <div className="px-5 py-4">
            <div className="text-sm">
              <div className="font-medium text-gray-800 dark:text-gray-100 mb-3">
                Update article details
              </div>
              {editErrorMessage && <p className="text-red-500 mb-6">{editErrorMessage}</p>}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="edit_article_title">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  onChange={(e) => setEditTitle(e.target.value)}
                  value={editTitle}
                  id="edit_article_title"
                  className="form-input w-full px-2 py-1"
                  type="text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="edit_article_description">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  onChange={(e) => setEditDescription(e.target.value)}
                  value={editDescription}
                  id="edit_article_description"
                  className="form-textarea w-full px-2 py-1"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="edit_article_link">
                  Link <span className="text-red-500">*</span>
                </label>
                <input
                  onChange={handleEditLinkChange}
                  id="edit_article_link"
                  value={editLink}
                  className="form-input w-full px-2 py-1"
                  type="text"
                  required
                />
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700/60">
            <div className="flex flex-wrap justify-end space-x-2">
              <button
                type="button"
                className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditModalOpen(false);
                }}
                disabled={isEditing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-sm bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isEditing}
              >
                {isEditing ? (
                  <>
                    <svg className="animate-spin fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </button>
            </div>
          </div>
        </form>
      </ModalBasic>

      {/* Delete Confirmation Modal */}
      <ModalBlank isOpen={deleteModalOpen} setIsOpen={setDeleteModalOpen}>
        <div className="p-5 flex space-x-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-red-100 dark:bg-red-900/30">
            <svg className="w-4 h-4 shrink-0 fill-current text-red-600 dark:text-red-400" viewBox="0 0 16 16">
              <path d="M8 0C3.6 0 0 3.6 0 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 12c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-3H7V4h2v5z" />
            </svg>
          </div>
          {/* Content */}
          <div>
            {/* Modal header */}
            <div className="mb-2">
              <div className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                Delete &quot;{article.title}&quot;?
              </div>
            </div>
            {/* Modal content */}
            <div className="text-sm mb-5">
              <div className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this article? This action cannot be undone.
              </div>
            </div>
            {/* Modal footer */}
            <div className="flex flex-wrap justify-end space-x-2">
              <button
                className="btn-sm border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-300 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteModalOpen(false);
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="btn-sm bg-red-500 hover:bg-red-600 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteArticle();
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      </ModalBlank>
    </div>
  );
}

