'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';

interface Category {
  id: string;
  name: string;
  description: string;
  link: string;
}

interface CategorySelectProps {
  selectedCategoryId: string | null;
  onSelect: (categoryId: string, categoryName: string) => void;
  userId: string | null;
  selectedCompany: string;
  required?: boolean;
}

export default function CategorySelect({
  selectedCategoryId,
  onSelect,
  userId,
  selectedCompany,
  required = false,
}: CategorySelectProps) {
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
  
  const [categories, setCategories] = useState<Category[]>(() => getInitialCategoriesCache(selectedCompany));
  const [searchQuery, setSearchQuery] = useState('');
  // Only show loading if we don't have cached data
  const hasCachedCategories = getInitialCategoriesCache(selectedCompany).length > 0
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  // Fetch categories
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
      setIsLoading(false)
      // Still fetch in background to update cache (silent refresh)
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
      setIsLoading(true);
      const response = await fetch(
        `/api/category?uid=${userId}&selectedCompany=${selectedCompany}`
      );
      const data = await response.json();

      if (data.success) {
        setCategories(data.data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter categories based on search
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected category name
  const selectedCategory = categories.find((cat) => cat.id === selectedCategoryId);

  // Calculate dropdown position and focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      // Calculate position based on button
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY + 4, // 4px gap (mt-1)
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
      
      // Focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  return (
    <Menu as="div" className="relative w-full">
      {({ open }) => {
        if (open !== isOpen) {
          setIsOpen(open);
          if (!open) {
            setSearchQuery('');
          }
        }
        return (
          <>
            <MenuButton
              ref={buttonRef}
              className={`btn w-full justify-between min-w-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700/60 hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 ${
                !selectedCategoryId && required ? 'border-red-300 dark:border-red-700' : ''
              }`}
              aria-label="Select category"
            >
              <span className="flex items-center truncate">
                <span className="truncate">
                  {selectedCategory ? selectedCategory.name : 'Select a category...'}
                </span>
              </span>
              <svg
                className="shrink-0 ml-1 fill-current text-gray-400 dark:text-gray-500"
                width="11"
                height="7"
                viewBox="0 0 11 7"
              >
                <path d="M5.4 6.8L0 1.4 1.4 0l4 4 4-4 1.4 1.4z" />
              </svg>
            </MenuButton>
            <Transition
              as="div"
              style={{
                position: 'fixed',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
              }}
              className="z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 rounded-lg shadow-lg overflow-hidden"
              enter="transition ease-out duration-100 transform"
              enterFrom="opacity-0 -translate-y-2"
              enterTo="opacity-100 translate-y-0"
              leave="transition ease-out duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <MenuItems className="focus:outline-hidden">
                {/* Search input */}
                <div className="px-3 pt-1.5 pb-2 border-b border-gray-200 dark:border-gray-700/60">
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      type="text"
                      className="form-input w-full pl-8 py-1.5 bg-white dark:bg-gray-800 text-sm"
                      placeholder="Search categories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="absolute inset-0 right-auto flex items-center pointer-events-none">
                      <svg
                        className="shrink-0 fill-current text-gray-400 dark:text-gray-500 ml-2 mr-2"
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M7 14c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zM7 2C4.243 2 2 4.243 2 7s2.243 5 5 5 5-2.243 5-5-2.243-5-5-5z" />
                        <path d="M15.707 14.293L13.314 11.9a8.019 8.019 0 01-1.414 1.414l2.393 2.393a.997.997 0 001.414 0 .999.999 0 000-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Category list */}
                <div className="max-h-48 overflow-y-auto overscroll-contain">
                  {isLoading ? (
                    <div className="py-3 px-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                      Loading...
                    </div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="py-3 px-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                      {searchQuery ? 'No categories found' : 'No categories available'}
                    </div>
                  ) : (
                    filteredCategories.map((category) => (
                      <MenuItem key={category.id}>
                        {({ active }) => (
                          <button
                            type="button"
                            className={`flex items-center justify-between w-full py-2 px-3 cursor-pointer transition-colors ${
                              active ? 'bg-gray-50 dark:bg-gray-700/20' : ''
                            } ${category.id === selectedCategoryId ? 'text-violet-500' : 'text-gray-700 dark:text-gray-300'}`}
                            onClick={() => {
                              onSelect(category.id, category.name);
                              setSearchQuery('');
                            }}
                          >
                            <div className="flex-1 text-left min-w-0 pr-2">
                              <div className="font-medium text-sm truncate">{category.name}</div>
                              {category.description && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                  {category.description}
                                </div>
                              )}
                            </div>
                            <svg
                              className={`shrink-0 fill-current text-violet-500 ${
                                category.id !== selectedCategoryId && 'invisible'
                              }`}
                              width="12"
                              height="9"
                              viewBox="0 0 12 9"
                            >
                              <path d="M10.28.28L3.989 6.575 1.695 4.28A1 1 0 00.28 5.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28.28z" />
                            </svg>
                          </button>
                        )}
                      </MenuItem>
                    ))
                  )}
                </div>
              </MenuItems>
            </Transition>
          </>
        );
      }}
    </Menu>
  );
}

