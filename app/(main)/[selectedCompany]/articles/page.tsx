'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Image from 'next/image';
import ModalBasic from '@/components/modal-basic';
import ModalBlank from '@/components/modal-blank';
import CategorySelect from '@/components/category-select';

interface Article {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  description: string;
  link: string;
  published: boolean;
  fav: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

interface CachedArticles {
  allArticles: Article[];
  hasMore: boolean;
  lastDocId: string | null;
}

export default function ArticlesPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedCompany = params.selectedCompany as string;
  const categoryIdFromUrl = searchParams.get('categoryId');

  const [articles, setArticles] = useState<Article[]>([]);
  const [allArticles, setAllArticles] = useState<Article[]>([]); // Store unfiltered articles
  const [searchQuery, setSearchQuery] = useState('');
  // Check if we have cached data to avoid initial loading state
  const hasCachedData = typeof window !== 'undefined' && selectedCompany && (() => {
    try {
      const cached = sessionStorage.getItem(`articles-cache-${selectedCompany}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        return parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000 && parsed.data && Object.keys(parsed.data).length > 0
      }
    } catch (e) {}
    return false
  })()
  const [isLoading, setIsLoading] = useState(!hasCachedData);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Filter states
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'unpublished'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');
  
  // Initialize categories cache from sessionStorage
  const getInitialCategoriesCache = (company: string): Category[] => {
    if (typeof window === 'undefined' || !company) return []
    try {
      const cached = sessionStorage.getItem(`categories-list-cache-${company}`)
      if (cached) {
        const parsed = JSON.parse(cached)
        // Only use cache if it's less than 5 minutes old
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data || []
        }
      }
    } catch (e) {
      console.error('Error loading categories cache from sessionStorage:', e)
    }
    return []
  }
  
  const [categories, setCategories] = useState<Category[]>(() => getInitialCategoriesCache(selectedCompany))
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([])
  
  // Persist categories to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && categories.length > 0) {
      try {
        sessionStorage.setItem(`categories-list-cache-${selectedCompany}`, JSON.stringify({
          data: categories,
          timestamp: Date.now(),
        }))
      } catch (e) {
        console.error('Error saving categories cache to sessionStorage:', e)
      }
    }
  }, [categories, selectedCompany])
  
  // Reload categories cache when selectedCompany changes
  useEffect(() => {
    const cached = getInitialCategoriesCache(selectedCompany)
    if (cached.length > 0) {
      setCategories(cached)
    }
  }, [selectedCompany])
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [articleToDelete, setArticleToDelete] = useState<{ id: string; categoryId: string; title: string } | null>(null);
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  
  // Loading states for operations
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState<string | null>(null);
  
  // Initialize cache from sessionStorage if available
  const getInitialCache = (company: string): Record<string, CachedArticles> => {
    if (typeof window === 'undefined' || !company) return {}
    try {
      const cached = sessionStorage.getItem(`articles-cache-${company}`)
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

  const [articlesCache, setArticlesCache] = useState<Record<string, CachedArticles>>(() => getInitialCache(selectedCompany))
  const articlesCacheRef = useRef<Record<string, CachedArticles>>(getInitialCache(selectedCompany))
  
  // Reload cache when selectedCompany changes
  useEffect(() => {
    const cached = getInitialCache(selectedCompany)
    setArticlesCache(cached)
    articlesCacheRef.current = cached
  }, [selectedCompany])
  
  // Keep ref in sync with state and persist to sessionStorage
  useEffect(() => {
    articlesCacheRef.current = articlesCache
    
    // Persist to sessionStorage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`articles-cache-${selectedCompany}`, JSON.stringify({
          data: articlesCache,
          timestamp: Date.now(),
        }))
      } catch (e) {
        console.error('Error saving cache to sessionStorage:', e)
      }
    }
  }, [articlesCache, selectedCompany])
  
  // Helper function to get cache key
  const getCacheKey = (company: string, query: string, categoryId: string) => {
    return `${company}:${query || 'all'}:${categoryId || 'all'}`
  }

  // Form state for Add
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [categoryId, setCategoryId] = useState(categoryIdFromUrl || '');
  const [categoryName, setCategoryName] = useState('');
  const [published, setPublished] = useState(false);

  // Form state for Edit
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLink, setEditLink] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editPublished, setEditPublished] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState('');

  // Listen to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        window.location.href = '/sign-in';
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch categories for filter
  useEffect(() => {
    if (userId) {
      fetchCategories();
    }
  }, [userId, selectedCompany]);

  const fetchCategories = async () => {
    if (!userId) return;

    // Check cache first
    const cached = getInitialCategoriesCache(selectedCompany)
    if (cached.length > 0) {
      setCategories(cached)
      // Still fetch in background to update cache
      fetch(`/api/category?uid=${userId}&selectedCompany=${selectedCompany}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data.categories) {
            setCategories(data.data.categories || [])
          }
        })
        .catch(error => {
          console.error('Error fetching categories in background:', error)
        })
      return
    }

    try {
      const response = await fetch(
        `/api/category?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const data = await response.json();

      if (data.success) {
        setCategories(data.data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Initialize selected categories from URL
  useEffect(() => {
    if (categoryIdFromUrl) {
      const ids = categoryIdFromUrl.split(',').map(id => id.trim()).filter(id => id);
      setSelectedCategoryIds(ids);
    } else {
      setSelectedCategoryIds([]);
    }
  }, [categoryIdFromUrl]);

  // Fetch articles when userId is available or categoryId changes
  useEffect(() => {
    if (userId) {
      const cacheKey = getCacheKey(selectedCompany, searchQuery.trim(), categoryIdFromUrl || '')
      
      // Check cache first for instant display (use ref to get latest value)
      const cached = articlesCacheRef.current[cacheKey]
      if (cached) {
        setAllArticles(cached.allArticles)
        setArticles(applyFilters(cached.allArticles))
        setHasMore(cached.hasMore)
        setLastDocId(cached.lastDocId)
        setIsLoading(false)
      } else {
        // No cache - show loading and fetch
        setIsLoading(true)
      }
      
      setLastDocId(null);
      setHasMore(false);
      // Use categoryIdFromUrl if it exists (supports multiple IDs)
      fetchArticles(true, categoryIdFromUrl || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, categoryIdFromUrl]);

  // Debounced search effect
  useEffect(() => {
    if (!userId) return;

    const cacheKey = getCacheKey(selectedCompany, searchQuery.trim(), categoryIdFromUrl || '')
    
    // Check cache first for instant display (use ref to get latest value)
    const cached = articlesCacheRef.current[cacheKey]
    if (cached) {
      setAllArticles(cached.allArticles)
      setArticles(applyFilters(cached.allArticles))
      setHasMore(cached.hasMore)
      setLastDocId(cached.lastDocId)
      setIsLoading(false)
    } else {
      // No cache - show loading and fetch
      setIsLoading(true)
    }

    setLastDocId(null);
    setHasMore(false);

    const timeoutId = setTimeout(() => {
      fetchArticles(true, categoryIdFromUrl || '');
    }, 300);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, userId, selectedCompany, categoryIdFromUrl]);

  const fetchArticles = async (reset = false, categoryIdToUse?: string) => {
    if (!userId) return;

    const cacheKey = getCacheKey(selectedCompany, searchQuery.trim(), categoryIdToUse !== undefined ? categoryIdToUse : (categoryIdFromUrl || ''))

    try {
      if (reset) {
        // Only show loading if not in cache
        if (!articlesCacheRef.current[cacheKey]) {
          setIsLoading(true);
        }
      } else {
        setIsLoadingMore(true);
      }

      // Use provided categoryId or fall back to state/URL
      const currentCategoryId = categoryIdToUse !== undefined ? categoryIdToUse : (categoryIdFromUrl || categoryId);

      // Build URL with pagination and filtering
      const baseUrl = searchQuery.trim()
        ? `/api/articles/search?uid=${userId}&selectedCompany=${selectedCompany}&query=${encodeURIComponent(searchQuery.trim())}`
        : `/api/articles?uid=${userId}&selectedCompany=${selectedCompany}`;

      let url = baseUrl;
      if (currentCategoryId) {
        url += `&categoryId=${encodeURIComponent(currentCategoryId)}`;
      }
      if (lastDocId && !reset) {
        url += `&lastDocId=${encodeURIComponent(lastDocId)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        const fetchedArticles = data.data.articles;
        let updatedAllArticles: Article[]
        let updatedHasMore: boolean
        let updatedLastDocId: string | null

        if (reset) {
          updatedAllArticles = fetchedArticles
          updatedHasMore = data.data.pagination?.hasMore || false
          updatedLastDocId = data.data.pagination?.lastDocId || null
          setAllArticles(updatedAllArticles);
          setArticles(applyFilters(updatedAllArticles));
        } else {
          updatedAllArticles = [...allArticles, ...fetchedArticles]
          updatedHasMore = data.data.pagination?.hasMore || false
          updatedLastDocId = data.data.pagination?.lastDocId || null
          setAllArticles(updatedAllArticles);
          setArticles(applyFilters(updatedAllArticles));
        }

        setHasMore(updatedHasMore)
        setLastDocId(updatedLastDocId)
        
        // Update cache
        setArticlesCache((prev) => ({
          ...prev,
          [cacheKey]: {
            allArticles: updatedAllArticles,
            hasMore: updatedHasMore,
            lastDocId: updatedLastDocId,
          },
        }))
      } else {
        console.error('Error fetching articles:', data.error);
      }
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      if (reset) {
        setIsLoading(false)
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  // Apply client-side filters
  const applyFilters = (articlesToFilter: Article[]) => {
    let filtered = [...articlesToFilter];

    // Apply published filter
    if (publishedFilter === 'published') {
      filtered = filtered.filter(article => article.published);
    } else if (publishedFilter === 'unpublished') {
      filtered = filtered.filter(article => !article.published);
    }

    // Apply sorting
    if (sortBy === 'newest') {
      filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
    } else if (sortBy === 'title') {
      filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    return filtered;
  };

  // Apply filters when filter states change
  useEffect(() => {
    setArticles(applyFilters(allArticles));
  }, [publishedFilter, sortBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryToggle = (categoryId: string) => {
    const router = window;
    let newSelectedIds: string[];
    
    if (selectedCategoryIds.includes(categoryId)) {
      // Remove category
      newSelectedIds = selectedCategoryIds.filter(id => id !== categoryId);
    } else {
      // Add category
      newSelectedIds = [...selectedCategoryIds, categoryId];
    }

    // Update URL with new category IDs
    const params = new URLSearchParams(window.location.search);
    if (newSelectedIds.length > 0) {
      params.set('categoryId', newSelectedIds.join(','));
    } else {
      params.delete('categoryId');
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);
    
    const newCategoryIdString = newSelectedIds.join(',')
    const cacheKey = getCacheKey(selectedCompany, searchQuery.trim(), newCategoryIdString)
    
    // Check cache first for instant display (use ref to get latest value)
    const cached = articlesCacheRef.current[cacheKey]
    if (cached) {
      setAllArticles(cached.allArticles)
      setArticles(applyFilters(cached.allArticles))
      setHasMore(cached.hasMore)
      setLastDocId(cached.lastDocId)
      setIsLoading(false)
    } else {
      // No cache - show loading and fetch
      setIsLoading(true)
    }
    
    // Trigger re-fetch
    setSelectedCategoryIds(newSelectedIds);
    setLastDocId(null);
    setHasMore(false);
    fetchArticles(true, newCategoryIdString);
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchArticles(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      setErrorMessage('You must be logged in to create an article');
      return;
    }

    if (!categoryId) {
      setErrorMessage('Please select a category');
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/articles/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: userId,
          selectedCompany,
          categoryId,
          title,
          description,
          link,
          published,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTitle('');
        setDescription('');
        setLink('');
        setCategoryId(categoryIdFromUrl || '');
        setCategoryName('');
        setErrorMessage('');
        setAddModalOpen(false);
        
        // Add the new article to state directly (no page reload)
        const newArticle: Article = {
          id: data.data.articleId,
          categoryId: data.data.categoryId,
          categoryName: data.data.categoryName,
          title: data.data.title,
          description: data.data.description,
          link: data.data.link,
          published: data.data.published,
          fav: false,
          createdAt: data.data.createdAt,
          updatedAt: null,
        };
        
        // Check if article matches current filters
        const matchesCategoryFilter = !categoryIdFromUrl || 
          categoryIdFromUrl.split(',').includes(newArticle.categoryId);
        const matchesSearch = !searchQuery.trim() || 
          newArticle.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          newArticle.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        const updatedAllArticles = [newArticle, ...allArticles]
        setAllArticles(updatedAllArticles)
        
        if (matchesCategoryFilter && matchesSearch) {
          // Add to visible articles and apply filters
          const updatedArticles = applyFilters([newArticle, ...articles])
          setArticles(updatedArticles)
        }
        
        // Update cache for current view
        const cacheKey = getCacheKey(selectedCompany, searchQuery.trim(), categoryIdFromUrl || '')
        setArticlesCache((prev) => ({
          ...prev,
          [cacheKey]: {
            allArticles: updatedAllArticles,
            hasMore: hasMore,
            lastDocId: lastDocId,
          },
        }))
        
        // Also update "all" cache (no filters)
        const allCacheKey = getCacheKey(selectedCompany, '', '')
        const allCached = articlesCache[allCacheKey]
        if (allCached) {
          setArticlesCache((prev) => ({
            ...prev,
            [allCacheKey]: {
              allArticles: [newArticle, ...allCached.allArticles],
              hasMore: allCached.hasMore,
              lastDocId: allCached.lastDocId,
            },
          }))
        }
      } else {
        setErrorMessage(data.error || 'Error creating article');
      }
    } catch (error) {
      console.error('Error creating article:', error);
      setErrorMessage('Error creating article');
    } finally {
      setIsAdding(false);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);

    // Auto-generate link from title
    const newLink = newTitle
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
    setLink(newLink);
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value;
    const sanitizedLink = newLink.replace(/[^a-zA-Z0-9-_]/g, '');
    setLink(sanitizedLink);
  };

  const handleEditClick = (article: Article) => {
    setArticleToEdit(article);
    setEditTitle(article.title);
    setEditDescription(article.description);
    setEditLink(article.link);
    setEditCategoryId(article.categoryId);
    setEditCategoryName(article.categoryName);
    setEditPublished(article.published);
    setEditErrorMessage('');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !articleToEdit) {
      setEditErrorMessage('You must be logged in to edit an article');
      return;
    }

    if (!editCategoryId) {
      setEditErrorMessage('Please select a category');
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
          categoryId: articleToEdit.categoryId, // Original category
          articleId: articleToEdit.id,
          title: editTitle,
          description: editDescription,
          link: editLink,
          published: editPublished,
          newCategoryId: editCategoryId !== articleToEdit.categoryId ? editCategoryId : undefined, // New category if different
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEditModalOpen(false);
        setArticleToEdit(null);
        
        // Update article in state directly (no page reload)
        const updatedArticle: Article = {
          id: data.data.articleId,
          categoryId: data.data.categoryId,
          categoryName: data.data.categoryName,
          title: data.data.title,
          description: data.data.description,
          link: data.data.link,
          published: data.data.published,
          fav: data.data.fav || false,
          createdAt: data.data.createdAt,
          updatedAt: data.data.updatedAt,
        };
        
        // Update in allArticles
        const updatedAllArticles = allArticles.map((article) =>
          article.id === updatedArticle.id ? updatedArticle : article
        )
        setAllArticles(updatedAllArticles)
        
        // Check if article matches current filters
        const matchesCategoryFilter = !categoryIdFromUrl || 
          categoryIdFromUrl.split(',').includes(updatedArticle.categoryId);
        const matchesSearch = !searchQuery.trim() || 
          updatedArticle.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          updatedArticle.description.toLowerCase().includes(searchQuery.toLowerCase());
        
        if (matchesCategoryFilter && matchesSearch) {
          // Check if article was already in the visible list
          const wasVisible = articles.some((article) => article.id === updatedArticle.id);
          
          if (wasVisible) {
            // Update in filtered articles
            const updatedArticles = applyFilters(
              articles.map((article) =>
                article.id === updatedArticle.id ? updatedArticle : article
              )
            )
            setArticles(updatedArticles)
          } else {
            // Wasn't visible before, but now matches - add it
            const updatedArticles = applyFilters([updatedArticle, ...articles])
            setArticles(updatedArticles)
          }
        } else {
          // No longer matches filters, remove from visible list if it was there
          setArticles((prev) => prev.filter((article) => article.id !== updatedArticle.id));
        }
        
        // Update cache for current view
        const cacheKey = getCacheKey(selectedCompany, searchQuery.trim(), categoryIdFromUrl || '')
        setArticlesCache((prev) => ({
          ...prev,
          [cacheKey]: {
            allArticles: updatedAllArticles,
            hasMore: hasMore,
            lastDocId: lastDocId,
          },
        }))
        
        // Also update "all" cache (no filters)
        const allCacheKey = getCacheKey(selectedCompany, '', '')
        const allCached = articlesCache[allCacheKey]
        if (allCached) {
          setArticlesCache((prev) => ({
            ...prev,
            [allCacheKey]: {
              allArticles: allCached.allArticles.map((article) =>
                article.id === updatedArticle.id ? updatedArticle : article
              ),
              hasMore: allCached.hasMore,
              lastDocId: allCached.lastDocId,
            },
          }))
        }
      } else {
        setEditErrorMessage(data.error || 'Error updating article');
      }
    } catch (error) {
      console.error('Error updating article:', error);
      setEditErrorMessage('Error updating article');
    } finally {
      setIsEditing(false);
    }
  };

  const handleEditTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setEditTitle(newTitle);

    // Auto-generate link from title if link hasn't been manually edited
    const newLink = newTitle
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '');
    setEditLink(newLink);
  };

  const handleEditLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value;
    const sanitizedLink = newLink.replace(/[^a-zA-Z0-9-_]/g, '');
    setEditLink(sanitizedLink);
  };

  const handleDeleteClick = (articleId: string, articleCategoryId: string, articleTitle: string) => {
    setArticleToDelete({ id: articleId, categoryId: articleCategoryId, title: articleTitle });
    setDeleteModalOpen(true);
  };

  const handleDeleteArticle = async () => {
    if (!userId || !articleToDelete) return;

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
          categoryId: articleToDelete.categoryId,
          articleId: articleToDelete.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDeleteModalOpen(false);
        setArticleToDelete(null);
        
        // Remove article from state directly (no page reload)
        const updatedAllArticles = allArticles.filter((article) => article.id !== articleToDelete.id)
        const updatedArticles = articles.filter((article) => article.id !== articleToDelete.id)
        setAllArticles(updatedAllArticles)
        setArticles(updatedArticles)
        
        // Update cache for current view
        const cacheKey = getCacheKey(selectedCompany, searchQuery.trim(), categoryIdFromUrl || '')
        setArticlesCache((prev) => ({
          ...prev,
          [cacheKey]: {
            allArticles: updatedAllArticles,
            hasMore: hasMore,
            lastDocId: lastDocId,
          },
        }))
        
        // Also update "all" cache (no filters)
        const allCacheKey = getCacheKey(selectedCompany, '', '')
        const allCached = articlesCache[allCacheKey]
        if (allCached) {
          setArticlesCache((prev) => ({
            ...prev,
            [allCacheKey]: {
              allArticles: allCached.allArticles.filter((article) => article.id !== articleToDelete.id),
              hasMore: allCached.hasMore,
              lastDocId: allCached.lastDocId,
            },
          }))
        }
      } else {
        console.error('Error deleting article:', data.error);
      }
    } catch (error) {
      console.error('Error deleting article:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full mx-auto">
      {/* Page header */}
      <div className="sm:flex sm:justify-between sm:items-center mb-8">
        <div className="mb-4 sm:mb-0">
          <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">
            Articles
          </h1>
          {categoryIdFromUrl && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Filtered by category
            </p>
          )}
        </div>

        <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
          {/* Search form */}
          <div className="relative">
            <label htmlFor="article-search" className="sr-only">
              Search
            </label>
            <input
              id="article-search"
              className="form-input pl-9 bg-white dark:bg-gray-800"
              type="search"
              placeholder="Search articles…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="absolute inset-0 right-auto group" type="submit" aria-label="Search">
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
          {/* Add article button */}
          <button
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              // Pre-select category from URL if available
              if (categoryIdFromUrl && !categoryId) {
                setCategoryId(categoryIdFromUrl);
              }
              setAddModalOpen(true);
            }}
          >
            <svg className="fill-current shrink-0 xs:hidden" width="16" height="16" viewBox="0 0 16 16">
              <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
            </svg>
            <span className="max-xs:sr-only">Add Article</span>
          </button>
        </div>
      </div>

      {/* Main content area with sidebar */}
      <div className="flex flex-col space-y-10 sm:flex-row sm:space-x-6 sm:space-y-0 md:flex-col md:space-x-0 md:space-y-10 xl:flex-row xl:space-x-6 xl:space-y-0">
        
        {/* Sidebar - Filters */}
        <aside className="w-full sm:w-64 xl:w-64 shrink-0">
          <div className="sticky top-[calc(4rem+2rem)] bg-white dark:bg-gray-800 shadow-sm rounded-lg p-5">
            <div className="space-y-6">
              
              {/* Categories Filter */}
              {categories.length > 0 && (
                <div>
                  <div className="text-sm text-gray-800 dark:text-gray-100 font-semibold mb-3">Categories</div>
                  <ul className="space-y-2">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="form-checkbox"
                            checked={selectedCategoryIds.includes(category.id)}
                            onChange={() => handleCategoryToggle(category.id)}
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-300 font-medium ml-2">{category.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Published Status Filter */}
              <div>
                <div className="text-sm text-gray-800 dark:text-gray-100 font-semibold mb-3">Status</div>
                <ul className="space-y-2">
                  <li>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="publishedFilter"
                        className="form-radio"
                        checked={publishedFilter === 'all'}
                        onChange={() => setPublishedFilter('all')}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium ml-2">All Articles</span>
                    </label>
                  </li>
                  <li>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="publishedFilter"
                        className="form-radio"
                        checked={publishedFilter === 'published'}
                        onChange={() => setPublishedFilter('published')}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium ml-2">Published Only</span>
                    </label>
                  </li>
                  <li>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="publishedFilter"
                        className="form-radio"
                        checked={publishedFilter === 'unpublished'}
                        onChange={() => setPublishedFilter('unpublished')}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium ml-2">Drafts Only</span>
                    </label>
                  </li>
                </ul>
              </div>

              {/* Sort By Filter */}
              <div>
                <div className="text-sm text-gray-800 dark:text-gray-100 font-semibold mb-3">Sort By</div>
                <ul className="space-y-2">
                  <li>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="sortBy"
                        className="form-radio"
                        checked={sortBy === 'newest'}
                        onChange={() => setSortBy('newest')}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium ml-2">Newest First</span>
                    </label>
                  </li>
                  <li>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="sortBy"
                        className="form-radio"
                        checked={sortBy === 'oldest'}
                        onChange={() => setSortBy('oldest')}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium ml-2">Oldest First</span>
                    </label>
                  </li>
                  <li>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name="sortBy"
                        className="form-radio"
                        checked={sortBy === 'title'}
                        onChange={() => setSortBy('title')}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300 font-medium ml-2">Title (A-Z)</span>
                    </label>
                  </li>
                </ul>
              </div>

              {/* Filter Summary */}
              {selectedCategoryIds.length > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700/60">
                  <div className="text-xs text-gray-500 dark:text-gray-400 italic mb-2">
                    Filtering by {selectedCategoryIds.length} {selectedCategoryIds.length === 1 ? 'category' : 'categories'}
                  </div>
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(window.location.search);
                      params.delete('categoryId');
                      const newUrl = `${window.location.pathname}?${params.toString()}`;
                      window.history.pushState({}, '', newUrl);
                      setSelectedCategoryIds([]);
                      setLastDocId(null);
                      setHasMore(false);
                      fetchArticles(true, '');
                    }}
                    className="text-xs text-violet-500 hover:text-violet-600 font-medium cursor-pointer"
                  >
                    Clear filters
                  </button>
                </div>
              )}

            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
      {/* Articles list */}
      <div className="space-y-4">
        {/* Loading skeletons - only show when actually loading and no cached data */}
        {isLoading && articles.length === 0 &&
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}

        {/* Article items */}
        {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 flex items-start space-x-3 md:space-x-4">
                  <div className="w-9 h-9 shrink-0 mt-1">
                    <Image
                      src="/images/article_icon.png"
                      alt="Article"
                      width={36}
                      height={36}
                      className="w-9 h-9"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 
                        onClick={() => router.push(`/${selectedCompany}/articles/${article.id}`)}
                        className="text-lg font-semibold text-gray-800 dark:text-gray-100 cursor-pointer hover:text-violet-500 dark:hover:text-violet-400 transition-colors"
                      >
                        {article.title}
                      </h3>
                    {article.published && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded">
                        Published
                      </span>
                    )}
                    {article.fav && (
                      <svg className="w-5 h-5 fill-current text-yellow-500" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {article.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                      <span className="text-violet-600 dark:text-violet-400">{article.categoryName}</span>
                      {article.createdAt && (
                        <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/${selectedCompany}/articles/${article.id}`)}
                    className="text-gray-400 hover:text-violet-500 dark:text-gray-500 dark:hover:text-violet-400 cursor-pointer"
                    title="View article"
                  >
                    <span className="sr-only">View</span>
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEditClick(article)}
                    className="text-gray-400 hover:text-violet-500 dark:text-gray-500 dark:hover:text-violet-400 cursor-pointer"
                    title="Edit article"
                  >
                    <span className="sr-only">Edit</span>
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(article.id, article.categoryId, article.title)}
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
            </div>
          ))}

        {/* Empty state */}
        {articles.length === 0 && !searchQuery && !isLoading && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-t from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800 mb-4">
              <svg className="w-8 h-8 fill-current text-gray-400" viewBox="0 0 20 20">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              No articles yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Get started by creating your first article
            </p>
            <button
              className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white cursor-pointer"
              onClick={() => setAddModalOpen(true)}
            >
              Add Article
            </button>
          </div>
        )}

        {/* No results state */}
        {articles.length === 0 && searchQuery && !isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No articles found matching &quot;{searchQuery}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {!isLoading && hasMore && articles.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoadingMore ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-current"
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
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {/* Add Article Modal */}
      <ModalBasic title="Add Article" isOpen={addModalOpen} setIsOpen={setAddModalOpen}>
        <form onSubmit={handleAddSubmit}>
          <div className="px-5 py-4">
            <div className="text-sm">
              <div className="font-medium text-gray-800 dark:text-gray-100 mb-3">
                Create a new article
              </div>
              {errorMessage && <p className="text-red-500 mb-6">{errorMessage}</p>}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="article_title">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  onChange={handleTitleChange}
                  value={title}
                  id="article_title"
                  className="form-input w-full px-2 py-1"
                  type="text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="article_description">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  onChange={(e) => setDescription(e.target.value)}
                  value={description}
                  id="article_description"
                  className="form-textarea w-full px-2 py-1"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="article_link">
                  Link <span className="text-red-500">*</span>
                </label>
                <input
                  onChange={handleLinkChange}
                  id="article_link"
                  value={link}
                  className="form-input w-full px-2 py-1"
                  type="text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="article_category">
                  Category <span className="text-red-500">*</span>
                </label>
                <CategorySelect
                  selectedCategoryId={categoryId || null}
                  onSelect={(id, name) => {
                    setCategoryId(id);
                    setCategoryName(name);
                  }}
                  userId={userId}
                  selectedCompany={selectedCompany}
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="article_published"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="form-checkbox"
                />
                <label htmlFor="article_published" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Published
                </label>
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

      {/* Edit Article Modal */}
      <ModalBasic title="Edit Article" isOpen={editModalOpen} setIsOpen={setEditModalOpen}>
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
                  onChange={handleEditTitleChange}
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

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor="edit_article_category">
                  Category <span className="text-red-500">*</span>
                </label>
                <CategorySelect
                  selectedCategoryId={editCategoryId || null}
                  onSelect={(id, name) => {
                    setEditCategoryId(id);
                    setEditCategoryName(name);
                  }}
                  userId={userId}
                  selectedCompany={selectedCompany}
                  required
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit_article_published"
                  checked={editPublished}
                  onChange={(e) => setEditPublished(e.target.checked)}
                  className="form-checkbox"
                />
                <label htmlFor="edit_article_published" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  Published
                </label>
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
                  setArticleToEdit(null);
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
                Delete &quot;{articleToDelete?.title}&quot;?
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
                  setArticleToDelete(null);
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
      </div>
    </div>
  );
}

