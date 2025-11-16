'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import CategoryCard from '@/components/category-card';
import ModalBasic from '@/components/modal-basic';

interface Category {
  id: string;
  name: string;
  description: string;
  link: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CachedCategories {
  categories: Category[];
  hasMore: boolean;
  lastDocId: string | null;
}

export default function CategoriesPage() {
  const params = useParams();
  const selectedCompany = params.selectedCompany as string;
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  // Check if we have cached data to avoid initial loading state
  const hasCachedData = typeof window !== 'undefined' && selectedCompany && (() => {
    try {
      const cached = sessionStorage.getItem(`categories-cache-${selectedCompany}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        return parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000 && parsed.data && Object.keys(parsed.data).length > 0
      }
    } catch (e) {}
    return false
  })()
  const [isLoading, setIsLoading] = useState(!hasCachedData);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Initialize cache from sessionStorage if available
  const getInitialCache = (company: string): Record<string, CachedCategories> => {
    if (typeof window === 'undefined' || !company) return {}
    try {
      const cached = sessionStorage.getItem(`categories-cache-${company}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        // Only use cache if it's less than 5 minutes old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data || {}
        }
      }
    } catch (e) {
      console.error('Error loading cache from sessionStorage:', e)
    }
    return {}
  }

  const [categoriesCache, setCategoriesCache] = useState<Record<string, CachedCategories>>(() => getInitialCache(selectedCompany))
  const categoriesCacheRef = useRef<Record<string, CachedCategories>>(getInitialCache(selectedCompany))
  
  // Reload cache when selectedCompany changes
  useEffect(() => {
    const cached = getInitialCache(selectedCompany)
    setCategoriesCache(cached)
    categoriesCacheRef.current = cached
  }, [selectedCompany])
  
  // Keep ref in sync with state and persist to sessionStorage
  useEffect(() => {
    categoriesCacheRef.current = categoriesCache
    
    // Persist to sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`categories-cache-${selectedCompany}`, JSON.stringify({
          data: categoriesCache,
          timestamp: Date.now(),
        }))
      } catch (e) {
        console.error('Error saving cache to sessionStorage:', e)
      }
    }
  }, [categoriesCache, selectedCompany])
  
  // Loading states for operations
  const [isAdding, setIsAdding] = useState(false);
  
  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  
  // Helper function to get cache key
  const getCacheKey = (company: string, query: string) => {
    return `${company}:${query || 'all'}`
  }

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        // Redirect to sign-in if not authenticated
        window.location.href = '/sign-in';
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch categories when userId is available
  useEffect(() => {
    if (userId) {
      const cacheKey = getCacheKey(selectedCompany, searchQuery.trim())
      
      // Check cache first for instant display
      if (categoriesCache[cacheKey]) {
        const cached = categoriesCache[cacheKey]
        setCategories(cached.categories)
        setHasMore(cached.hasMore)
        setLastDocId(cached.lastDocId)
        setIsLoading(false)
      } else {
        // No cache - fetch
        fetchCategories(true)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, selectedCompany]);

  // Debounced search effect - reset pagination when search changes
  useEffect(() => {
    if (!userId) return;

    const cacheKey = getCacheKey(selectedCompany, searchQuery.trim())
    
    // Check cache first for instant display
    if (categoriesCache[cacheKey]) {
      const cached = categoriesCache[cacheKey]
      setCategories(cached.categories)
      setHasMore(cached.hasMore)
      setLastDocId(cached.lastDocId)
      setIsLoading(false)
    } else {
      // No cache - show loading and fetch
      setIsLoading(true)
    }

    // Reset pagination when search query changes
    setLastDocId(null);
    setHasMore(false);

    const timeoutId = setTimeout(() => {
      fetchCategories(true); // true = reset categories
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, userId, selectedCompany]);

  const fetchCategories = async (reset = false) => {
    if (!userId) return;

    const cacheKey = getCacheKey(selectedCompany, searchQuery.trim())

    try {
      if (reset) {
        // Only show loading if not in cache
        if (!categoriesCacheRef.current[cacheKey]) {
          setIsLoading(true);
        }
      } else {
        setIsLoadingMore(true);
      }
      
      // Build URL with pagination
      const baseUrl = searchQuery.trim()
        ? `/api/category/search?uid=${userId}&selectedCompany=${selectedCompany}&query=${encodeURIComponent(searchQuery.trim())}`
        : `/api/category?uid=${userId}&selectedCompany=${selectedCompany}`;
      
      const url = lastDocId && !reset
        ? `${baseUrl}&lastDocId=${lastDocId}`
        : baseUrl;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        let updatedCategories: Category[]
        let updatedHasMore: boolean
        let updatedLastDocId: string | null

        if (reset) {
          updatedCategories = data.data.categories
          updatedHasMore = data.data.pagination?.hasMore || false
          updatedLastDocId = data.data.pagination?.lastDocId || null
          setCategories(updatedCategories)
        } else {
          // Append new categories
          updatedCategories = [...categories, ...data.data.categories]
          updatedHasMore = data.data.pagination?.hasMore || false
          updatedLastDocId = data.data.pagination?.lastDocId || null
          setCategories(updatedCategories)
        }
        
        // Update pagination state
        setHasMore(updatedHasMore)
        setLastDocId(updatedLastDocId)
        
        // Update cache
        setCategoriesCache((prev) => ({
          ...prev,
          [cacheKey]: {
            categories: updatedCategories,
            hasMore: updatedHasMore,
            lastDocId: updatedLastDocId,
          },
        }))
      } else {
        console.error('Error fetching categories:', data.error);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      if (reset) {
        setIsLoading(false)
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchCategories(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      setErrorMessage('You must be logged in to create a category');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/category/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userId,
          selectedCompany,
          name,
          description,
          link,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reset form
        setName('');
        setDescription('');
        setLink('');
        setErrorMessage('');
        setAddModalOpen(false);
        
        // Add the new category to state directly (no page reload)
        const newCategory: Category = {
          id: data.data.categoryId,
          name: data.data.name,
          description: data.data.description,
          link: data.data.link,
          createdAt: data.data.createdAt,
          updatedAt: null,
        };
        
        // Always update the "all" cache
        const allCacheKey = getCacheKey(selectedCompany, '')
        const allCached = categoriesCache[allCacheKey]
        if (allCached) {
          const updatedAllCategories = [newCategory, ...allCached.categories]
          setCategoriesCache((prev) => ({
            ...prev,
            [allCacheKey]: {
              categories: updatedAllCategories,
              hasMore: allCached.hasMore,
              lastDocId: allCached.lastDocId,
            },
          }))
        }
        
        // Also update the categories list cache (used by articles page sidebar)
        if (typeof window !== 'undefined') {
          try {
            const listCacheKey = `categories-list-cache-${selectedCompany}`
            const listCached = sessionStorage.getItem(listCacheKey)
            if (listCached) {
              const parsed = JSON.parse(listCached)
              if (parsed.data && Array.isArray(parsed.data)) {
                const updatedList = [newCategory, ...parsed.data]
                sessionStorage.setItem(listCacheKey, JSON.stringify({
                  data: updatedList,
                  timestamp: Date.now(),
                }))
              }
            }
          } catch (e) {
            console.error('Error updating categories list cache:', e)
          }
        }
        
        // If there's a search query, check if the new category matches
        if (searchQuery.trim()) {
          const searchLower = searchQuery.toLowerCase();
          const matchesSearch = 
            newCategory.name.toLowerCase().includes(searchLower) ||
            newCategory.description.toLowerCase().includes(searchLower);
          
          if (matchesSearch) {
            // Add to the beginning of the list (newest first)
            const updatedCategories = [newCategory, ...categories]
            setCategories(updatedCategories)
            
            // Update search cache
            const cacheKey = getCacheKey(selectedCompany, searchQuery.trim())
            setCategoriesCache((prev) => ({
              ...prev,
              [cacheKey]: {
                categories: updatedCategories,
                hasMore: hasMore,
                lastDocId: lastDocId,
              },
            }))
          }
        } else {
          // No search query, add to the beginning
          const updatedCategories = [newCategory, ...categories]
          setCategories(updatedCategories)
        }
      } else {
        setErrorMessage(data.error || 'Error creating category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      setErrorMessage('Error creating category');
    } finally {
      setIsAdding(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setName(newTitle);

    // Auto-generate link from title
    const newLink = newTitle
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with dashes
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
    setLink(newLink);
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value;
    // Allow only letters, numbers, hyphens, and underscores
    const sanitizedLink = newLink.replace(/[^a-zA-Z0-9-_]/g, '');
    setLink(sanitizedLink);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!userId) return;

    try {
      const response = await fetch('/api/category/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userId,
          selectedCompany,
          categoryId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Remove category from state directly (no page reload)
        const updatedCategories = categories.filter((cat) => cat.id !== categoryId)
        setCategories(updatedCategories)
        
        // Update current search cache
        const cacheKey = getCacheKey(selectedCompany, searchQuery.trim())
        setCategoriesCache((prev) => ({
          ...prev,
          [cacheKey]: {
            categories: updatedCategories,
            hasMore: hasMore,
            lastDocId: lastDocId,
          },
        }))
        
        // Also update "all" cache if it exists
        const allCacheKey = getCacheKey(selectedCompany, '')
        const allCached = categoriesCache[allCacheKey]
        if (allCached) {
          const updatedAllCategories = allCached.categories.filter((cat) => cat.id !== categoryId)
          setCategoriesCache((prev) => ({
            ...prev,
            [allCacheKey]: {
              categories: updatedAllCategories,
              hasMore: allCached.hasMore,
              lastDocId: allCached.lastDocId,
            },
          }))
        }
        
        // Also update the categories list cache (used by articles page sidebar)
        if (typeof window !== 'undefined') {
          try {
            const listCacheKey = `categories-list-cache-${selectedCompany}`
            const listCached = sessionStorage.getItem(listCacheKey)
            if (listCached) {
              const parsed = JSON.parse(listCached)
              if (parsed.data && Array.isArray(parsed.data)) {
                const updatedList = parsed.data.filter((cat: Category) => cat.id !== categoryId)
                sessionStorage.setItem(listCacheKey, JSON.stringify({
                  data: updatedList,
                  timestamp: Date.now(),
                }))
              }
            }
          } catch (e) {
            console.error('Error updating categories list cache:', e)
          }
        }
      } else {
        console.error('Error deleting category:', data.error);
        throw new Error(data.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  const handleUpdateCategory = async (
    categoryId: string,
    name: string,
    description: string,
    link: string
  ) => {
    if (!userId) return;

    try {
      const response = await fetch('/api/category/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userId,
          selectedCompany,
          categoryId,
          name,
          description,
          link,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update category in state directly (no page reload)
        const updatedCategory = {
          id: categoryId,
          name: data.data.name,
          description: data.data.description,
          link: data.data.link,
          createdAt: data.data.createdAt,
          updatedAt: data.data.updatedAt,
        };
        
        // Always update the "all" cache
        const allCacheKey = getCacheKey(selectedCompany, '')
        const allCached = categoriesCache[allCacheKey]
        if (allCached) {
          const updatedAllCategories = allCached.categories.map((cat) =>
            cat.id === categoryId ? updatedCategory : cat
          )
          setCategoriesCache((prev) => ({
            ...prev,
            [allCacheKey]: {
              categories: updatedAllCategories,
              hasMore: allCached.hasMore,
              lastDocId: allCached.lastDocId,
            },
          }))
        }
        
        // Also update the categories list cache (used by articles page sidebar)
        if (typeof window !== 'undefined') {
          try {
            const listCacheKey = `categories-list-cache-${selectedCompany}`
            const listCached = sessionStorage.getItem(listCacheKey)
            if (listCached) {
              const parsed = JSON.parse(listCached)
              if (parsed.data && Array.isArray(parsed.data)) {
                const updatedList = parsed.data.map((cat: Category) =>
                  cat.id === categoryId ? updatedCategory : cat
                )
                sessionStorage.setItem(listCacheKey, JSON.stringify({
                  data: updatedList,
                  timestamp: Date.now(),
                }))
              }
            }
          } catch (e) {
            console.error('Error updating categories list cache:', e)
          }
        }
        
        // If there's a search query, check if the updated category still matches
        if (searchQuery.trim()) {
          const searchLower = searchQuery.toLowerCase();
          const matchesSearch = 
            updatedCategory.name.toLowerCase().includes(searchLower) ||
            updatedCategory.description.toLowerCase().includes(searchLower);
          
          if (matchesSearch) {
            // Update in place
            const updatedCategories = categories.map((cat) =>
              cat.id === categoryId ? updatedCategory : cat
            )
            setCategories(updatedCategories)
            
            // Update search cache
            const cacheKey = getCacheKey(selectedCompany, searchQuery.trim())
            setCategoriesCache((prev) => ({
              ...prev,
              [cacheKey]: {
                categories: updatedCategories,
                hasMore: hasMore,
                lastDocId: lastDocId,
              },
            }))
          } else {
            // No longer matches search, remove it from the list
            const updatedCategories = categories.filter((cat) => cat.id !== categoryId)
            setCategories(updatedCategories)
            
            // Update search cache
            const cacheKey = getCacheKey(selectedCompany, searchQuery.trim())
            setCategoriesCache((prev) => ({
              ...prev,
              [cacheKey]: {
                categories: updatedCategories,
                hasMore: hasMore,
                lastDocId: lastDocId,
              },
            }))
          }
        } else {
          // No search query, update in place
          const updatedCategories = categories.map((cat) =>
            cat.id === categoryId ? updatedCategory : cat
          )
          setCategories(updatedCategories)
        }
      } else {
        console.error('Error updating category:', data.error);
        throw new Error(data.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  // Categories are already filtered by the search API

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
      {/* Page header */}
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        {/* Left: Title */}
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            Categories
          </h1>
        </div>

        {/* Right: Actions */}
        <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
          {/* Search form */}
          <div className="relative">
            <label htmlFor="category-search" className="sr-only">
              Search
            </label>
            <input
              id="category-search"
              className="form-input pl-9 bg-white dark:bg-gray-800"
              type="search"
              placeholder="Search categories…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="absolute inset-0 right-auto group"
              type="submit"
              aria-label="Search"
            >
              <svg
                className="shrink-0 fill-current text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400 ml-3 mr-2"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z" />
                <path d="M15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z" />
              </svg>
            </button>
          </div>
          {/* Add category button */}
          <button
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setAddModalOpen(true);
            }}
          >
            <svg
              className="fill-current shrink-0 xs:hidden"
              width="16"
              height="16"
              viewBox="0 0 16 16"
            >
              <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
            </svg>
            <span className="max-xs:sr-only">Add Category</span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-12 gap-6">
        {/* Loading skeletons - only show when actually loading and no cached data */}
        {isLoading && categories.length === 0 &&
          Array.from({ length: 9 }).map((_, index) => (
            <div
              key={index}
              className="col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl animate-pulse"
            >
              <div className="h-48"></div>
            </div>
          ))}

        {/* Category cards */}
        {categories.map((category) => (
            <CategoryCard
              key={category.id}
              id={category.id}
              name={category.name}
              description={category.description}
              link={category.link}
              selectedCompany={selectedCompany}
              onDelete={handleDeleteCategory}
              onUpdate={handleUpdateCategory}
            />
          ))}

        {/* Empty state */}
        {categories.length === 0 && !searchQuery && !isLoading && (
          <div className="col-span-full">
            <div className="max-w-2xl m-auto mt-16">
              <div className="text-center px-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-t from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800 mb-4">
                  <svg className="w-5 h-6 fill-current" viewBox="0 0 20 24">
                    <path
                      className="text-gray-500 dark:text-gray-600"
                      d="M10 10.562l9-5-8.514-4.73a1 1 0 00-.972 0L1 5.562l9 5z"
                    />
                    <path
                      className="text-gray-300 dark:text-gray-400"
                      d="M9 12.294l-9-5v10.412a1 1 0 00.514.874L9 23.294v-11z"
                    />
                    <path
                      className="text-gray-400 dark:text-gray-500"
                      d="M11 12.294v11l8.486-4.714a1 1 0 00.514-.874V7.295l-9 4.999z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-2">
                  Let&apos;s kick off by adding a category
                </h2>
                <div className="mb-6 text-gray-600 dark:text-gray-400">
                  A category is a classification of the articles you will be adding in the future.
                  An example is &apos;General&apos; or &apos;FAQ&apos;
                </div>
                <button
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddModalOpen(true);
                  }}
                >
                  Add Category
                </button>
              </div>
            </div>
          </div>
        )}

        {/* No results state */}
        {categories.length === 0 && searchQuery && !isLoading && (
          <div className="col-span-full">
            <div className="text-center px-4 py-8">
              <div className="text-gray-600 dark:text-gray-400">
                No categories found matching &quot;{searchQuery}&quot;
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {!isLoading && hasMore && categories.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* Add Category Modal */}
      <ModalBasic title="Add Category" isOpen={addModalOpen} setIsOpen={setAddModalOpen}>
        <form onSubmit={handleAddSubmit}>
          <div className="px-5 py-4">
            <div className="text-sm">
              <div className="font-medium text-gray-800 dark:text-gray-100 mb-3">
                Let&apos;s add a new category 🙌
              </div>
              {errorMessage && <p className="text-red-500 mb-6">{errorMessage}</p>}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="category_name">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  onChange={handleTitleChange}
                  value={name}
                  id="category_name"
                  className="form-input w-full px-2 py-1"
                  type="text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="category_description">
                  Category Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  onChange={(e) => setDescription(e.target.value)}
                  value={description}
                  id="category_description"
                  className="form-textarea w-full px-2 py-1"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="category_link">
                  Category Link <span className="text-red-500">*</span>
                </label>
                <input
                  onChange={handleLinkChange}
                  id="category_link"
                  value={link}
                  className="form-input w-full px-2 py-1"
                  type="text"
                  required
                />
              </div>
            </div>
          </div>
          {/* Modal footer */}
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700/60">
            <div className="flex flex-wrap justify-end space-x-2">
              <button
                type="button"
                className="btn-sm border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setAddModalOpen(false);
                }}
                disabled={isAdding}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-sm bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isAdding}
              >
                {isAdding ? (
                  <>
                    <svg className="animate-spin fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M8 16a7.928 7.928 0 01-3.428-.77l.857-1.807A6.006 6.006 0 0014 8c0-3.309-2.691-6-6-6a6.006 6.006 0 00-5.422 8.572l-1.806.859A7.929 7.929 0 010 8c0-4.411 3.589-8 8-8s8 3.589 8 8-3.589 8-8 8z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  'Add'
                )}
              </button>
            </div>
          </div>
        </form>
      </ModalBasic>
    </div>
  );
}

