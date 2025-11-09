'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ModalBasic from './modal-basic';
import ModalBlank from './modal-blank';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';

interface CategoryCardProps {
  id: string;
  name: string;
  description: string;
  link: string;
  selectedCompany: string;
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string, description: string, link: string) => void;
}

export default function CategoryCard({
  id,
  name,
  description,
  link,
  selectedCompany,
  onDelete,
  onUpdate,
}: CategoryCardProps) {
  const router = useRouter();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [catName, setCatName] = useState(name);
  const [catDescription, setCatDescription] = useState(description);
  const [catLink, setCatLink] = useState(link);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    if (form.checkValidity()) {
      setIsEditing(true);
      try {
        await onUpdate(id, catName, catDescription, catLink);
        setErrorMessage('');
        setEditModalOpen(false);
      } catch (error) {
        console.error('Error updating category:', error);
      } finally {
        setIsEditing(false);
      }
    } else {
      setErrorMessage('Please fill out all required fields.');
      form.reportValidity();
    }
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLink = e.target.value;
    // Allow only letters, numbers, hyphens, and underscores
    const sanitizedLink = newLink.replace(/[^a-zA-Z0-9-_]/g, '');
    setCatLink(sanitizedLink);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setCatName(newTitle);
  };

  const navigateToArticles = () => {
    router.push(`/${selectedCompany}/articles?categoryId=${id}`);
  };

  return (
    <>
      <div className="col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <div className="flex flex-col h-full">
          {/* Card top */}
          <div className="grow p-5">
            <div className="flex justify-between items-start">
              {/* Image + name */}
              <header>
                <div className="flex mb-2">
                  <button onClick={navigateToArticles} className="relative inline-flex items-start mr-5 cursor-pointer">
                    <div className="absolute top-0 right-0 -mr-2 bg-white dark:bg-gray-700 rounded-full shadow" aria-hidden="true">
                      <svg className="w-6 h-6 fill-current text-yellow-500" viewBox="0 0 32 32">
                        <path d="M21 14.077a.75.75 0 01-.75-.75 1.5 1.5 0 00-1.5-1.5.75.75 0 110-1.5 1.5 1.5 0 001.5-1.5.75.75 0 111.5 0 1.5 1.5 0 001.5 1.5.75.75 0 010 1.5 1.5 1.5 0 00-1.5 1.5.75.75 0 01-.75.75zM14 24.077a1 1 0 01-1-1 4 4 0 00-4-4 1 1 0 110-2 4 4 0 004-4 1 1 0 012 0 4 4 0 004 4 1 1 0 010 2 4 4 0 00-4 4 1 1 0 01-1 1z" />
                      </svg>
                    </div>
                    {/* Category Icon */}
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-tr from-violet-500 to-violet-300 flex items-center justify-center">
                      <svg className="w-8 h-8 fill-current text-white" viewBox="0 0 24 24">
                        <path d="M4 5h4v4H4V5zm6 0h4v4h-4V5zm6 0h4v4h-4V5zM4 11h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 17h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                      </svg>
                    </div>
                  </button>
                  <div className="mt-1 pr-1">
                    <button
                      onClick={navigateToArticles}
                      className="inline-flex text-gray-800 dark:text-gray-100 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                    >
                      <h2 className="text-xl leading-snug justify-center font-semibold">{name}</h2>
                    </button>
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-400 dark:text-gray-500 -mt-0.5 mr-1">-&gt;</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">#category</span>
                    </div>
                  </div>
                </div>
              </header>
              {/* Menu button */}
              <Menu as="div" className="relative inline-flex shrink-0">
                {({ open }) => (
                  <>
                    <MenuButton
                      className={`rounded-full cursor-pointer ${open ? 'bg-gray-100 dark:bg-gray-700/60 text-gray-500 dark:text-gray-400' : 'text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400'}`}
                    >
                      <span className="sr-only">Menu</span>
                      <svg className="w-8 h-8 fill-current" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="2" />
                        <circle cx="10" cy="16" r="2" />
                        <circle cx="22" cy="16" r="2" />
                      </svg>
                    </MenuButton>
                    <Transition
                      as="div"
                      className="origin-top-right z-10 absolute top-full min-w-[9rem] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 py-1.5 rounded-lg shadow-lg overflow-hidden mt-1 right-0"
                      enter="transition ease-out duration-200 transform"
                      enterFrom="opacity-0 -translate-y-2"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-out duration-200"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <MenuItems as="ul" className="focus:outline-hidden">
                        <MenuItem as="li">
                          {({ active }) => (
                            <button
                              onClick={navigateToArticles}
                              className={`font-medium text-sm flex py-1 px-3 w-full text-left cursor-pointer ${active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-300'}`}
                            >
                              Open
                            </button>
                          )}
                        </MenuItem>
                        <MenuItem as="li">
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditModalOpen(true);
                              }}
                              className={`font-medium text-sm flex py-1 px-3 w-full text-left cursor-pointer ${active ? 'text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-300'}`}
                            >
                              Edit
                            </button>
                          )}
                        </MenuItem>
                        <MenuItem as="li">
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteModalOpen(true);
                              }}
                              className={`font-medium text-sm flex py-1 px-3 w-full text-left cursor-pointer ${active ? 'text-red-600' : 'text-red-500'}`}
                            >
                              Remove
                            </button>
                          )}
                        </MenuItem>
                      </MenuItems>
                    </Transition>
                  </>
                )}
              </Menu>
            </div>
            {/* Bio */}
            <div className="mt-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">{description}</div>
            </div>
          </div>
          {/* Card footer */}
          <div className="border-t border-gray-100 dark:border-gray-700/60">
            <div className="flex divide-x divide-gray-100 dark:divide-gray-700/60">
              <button
                onClick={navigateToArticles}
                className="block flex-1 text-center text-sm text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 font-medium px-3 py-4 cursor-pointer"
              >
                <div className="flex items-center justify-center">
                  <svg className="fill-current shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M8 0C3.6 0 0 3.1 0 7s3.6 7 8 7h.6l5.4 2v-4.4c1.2-1.2 2-2.8 2-4.6 0-3.9-3.6-7-8-7zm4 10.8v2.3L8.9 12H8c-3.3 0-6-2.2-6-5s2.7-5 6-5 6 2.2 6 5c0 2.2-2 3.8-2 3.8z" />
                  </svg>
                  <span>View Articles</span>
                </div>
              </button>
              <button
                className="block flex-1 text-center text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-200 font-medium px-3 py-4 group cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditModalOpen(true);
                }}
              >
                <div className="flex items-center justify-center">
                  <svg className="fill-current text-gray-400 dark:text-gray-600 group-hover:text-gray-500 shrink-0 mr-2" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M11.7.3c-.4-.4-1-.4-1.4 0l-10 10c-.2.2-.3.4-.3.7v4c0 .6.4 1 1 1h4c.3 0 .5-.1.7-.3l10-10c.4-.4.4-1 0-1.4l-4-4zM4.6 14H2v-2.6l6-6L10.6 8l-6 6zM12 6.6L9.4 4 11 2.4 13.6 5 12 6.6z" />
                  </svg>
                  <span>Edit Category</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <ModalBasic title="Edit Category" isOpen={editModalOpen} setIsOpen={setEditModalOpen}>
        <form onSubmit={handleEditSubmit}>
          <div className="px-5 py-4">
            <div className="text-sm">
              <div className="font-medium text-gray-800 dark:text-gray-100 mb-3">
                Let&apos;s edit your category 🙌
              </div>
              {errorMessage && <p className="text-red-500 mb-6">{errorMessage}</p>}
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1" htmlFor={`category_name_${id}`}>
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={catName}
                  onChange={handleTitleChange}
                  id={`category_name_${id}`}
                  className="form-input w-full px-2 py-1"
                  type="text"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor={`category_description_${id}`}>
                  Category Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  id={`category_description_${id}`}
                  className="form-textarea w-full px-2 py-1"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" htmlFor={`category_link_${id}`}>
                  Category Link <span className="text-red-500">*</span>
                </label>
                <input
                  id={`category_link_${id}`}
                  value={catLink}
                  onChange={handleLinkChange}
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
                    Saving...
                  </>
                ) : (
                  'Save'
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
                Delete &quot;{name}&quot;?
              </div>
            </div>
            {/* Modal content */}
            <div className="text-sm mb-5">
              <div className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete this category? This action cannot be undone and all articles in this category will also be removed.
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
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsDeleting(true);
                  try {
                    await onDelete(id);
                    setDeleteModalOpen(false);
                  } catch (error) {
                    console.error('Error deleting category:', error);
                  } finally {
                    setIsDeleting(false);
                  }
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
    </>
  );
}

