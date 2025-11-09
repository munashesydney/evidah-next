'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  BlockNoteEditor,
  filterSuggestionItems,
  PartialBlock,
} from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import {
  DefaultReactSuggestionItem,
  getDefaultReactSlashMenuItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import './blocknote-style.css';
import { HiOutlineGlobeAlt } from 'react-icons/hi';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { replaceBase64Images } from '@/lib/replaceBase64Images';

interface BlockNoteEditorProps {
  article: any;
  categoryId: string;
  articleId: string;
  uid: string;
  selectedCompany: string;
  theContent?: string;
  theRawText?: string;
  onSave?: () => void;
}

// Custom Slash Menu item to insert an uploaded image.
const insertImageItem = (
  editor: BlockNoteEditor,
  inputRef: React.RefObject<HTMLInputElement>
) => ({
  title: 'Insert Image',
  onItemClick: () => {
    // Trigger the file input click for uploading an image.
    inputRef.current?.click();
  },
  aliases: ['image', 'img'],
  group: 'Media',
  icon: <HiOutlineGlobeAlt size={18} />,
  subtext: 'Upload and insert an image from your local machine.',
});

// List containing all default Slash Menu Items, as well as our custom one for image upload.
const getCustomSlashMenuItems = (
  editor: BlockNoteEditor,
  inputRef: React.RefObject<HTMLInputElement>
): DefaultReactSuggestionItem[] => [
  ...getDefaultReactSlashMenuItems(editor),
  insertImageItem(editor, inputRef),
];

export default function BlockNoteEditorComponent({
  article,
  categoryId,
  articleId,
  uid,
  selectedCompany,
  theContent,
  theRawText,
  onSave,
}: BlockNoteEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [html, setHTML] = useState<string>('<p></p>');
  const [markdown, setMarkdown] = useState<string>('');
  const [save, setSave] = useState('Save');
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const editor = useCreateBlockNote();

  useEffect(() => {
    // Detect theme
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Update the editorHtml state when props.theContent changes
    async function loadInitialHTML() {
      if (theContent) {
        setHTML(theContent);
        const blocksFromHTML = await editor.tryParseHTMLToBlocks(theContent);
        editor.replaceBlocks(editor.document, blocksFromHTML);
      }
    }
    loadInitialHTML();

    if (theRawText) {
      setMarkdown(theRawText);
    }
  }, [theContent, theRawText, editor]);

  const onChange = async () => {
    // Converts the editor's contents from Block objects to HTML and store to state.
    const html = await editor.blocksToHTMLLossy(editor.document);
    setHTML(html);

    const markdown = await editor.blocksToMarkdownLossy(editor.document);
    setMarkdown(markdown);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const storage = getStorage();
      const storageRef = ref(storage, `articleImages/${file.name}`);

      try {
        // Upload file to Firebase Storage
        await uploadBytes(storageRef, file);

        // Get the download URL
        const imageURL = await getDownloadURL(storageRef);

        // Insert the image block in the editor
        const currentBlock = editor.getTextCursorPosition().block;
        const imageBlock: PartialBlock = {
          type: 'image',
          props: { url: imageURL },
        };

        editor.insertBlocks([imageBlock], currentBlock, 'after');
      } catch (error) {
        console.error('Error uploading image: ', error);
      }
    }
  };

  const saveArticle = async () => {
    setSaving(true);

    try {
      const { html: processedHtml, markdown: processedMarkdown, replacements } = await replaceBase64Images({
        html,
        markdown,
        uid,
        companyId: selectedCompany,
        categoryId,
        articleId,
      });

      if (replacements.size > 0) {
        try {
          const updatedBlocks = await editor.tryParseHTMLToBlocks(processedHtml);
          if (updatedBlocks) {
            editor.replaceBlocks(editor.document, updatedBlocks);
          }
        } catch (parseError) {
          console.error('Error syncing editor after image upload:', parseError);
        }
      }

      // Call the API to update the article
      const response = await fetch(`/api/articles/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          selectedCompany,
          categoryId,
          articleId,
          content: processedHtml,
          rawText: processedMarkdown,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHTML(processedHtml);
        setMarkdown(processedMarkdown);
        setSave('Saved');
        if (onSave) onSave();
      } else {
        setSave("Can't save this article. Please contact support");
      }
    } catch (error) {
      setSave("Can't save this article. Please contact support");
      console.error('Error saving article:', error);
    } finally {
      setSaving(false);
      setTimeout(() => setSave('Save'), 2000);
    }
  };

  const publishArticle = async () => {
    setSaving(true);

    try {
      // Process images first
      const { html: processedHtml, markdown: processedMarkdown, replacements } = await replaceBase64Images({
        html,
        markdown,
        uid,
        companyId: selectedCompany,
        categoryId,
        articleId,
      });

      if (replacements.size > 0) {
        try {
          const updatedBlocks = await editor.tryParseHTMLToBlocks(processedHtml);
          if (updatedBlocks) {
            editor.replaceBlocks(editor.document, updatedBlocks);
          }
        } catch (parseError) {
          console.error('Error syncing editor after image upload:', parseError);
        }
      }

      // Save content and toggle published status in one call
      const response = await fetch(`/api/articles/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid,
          selectedCompany,
          categoryId,
          articleId,
          content: processedHtml,
          rawText: processedMarkdown,
          published: !article.published,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHTML(processedHtml);
        setMarkdown(processedMarkdown);
        setSave('Saved');
        if (onSave) onSave();
        // Update the local article state
        article.published = !article.published;
      } else {
        setSave("Can't publish this article. Please contact support");
      }
    } catch (error) {
      setSave("Can't publish this article. Please contact support");
      console.error('Error publishing article:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ minHeight: '300px' }} className="bg-white dark:bg-gray-800 shadow-sm rounded-xl">
        <input
          type="file"
          ref={inputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={handleImageUpload}
        />

        <BlockNoteView
          theme={theme}
          editor={editor}
          slashMenu={false}
          onChange={onChange}
          data-theming-css-variables-demo
        >
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(getCustomSlashMenuItems(editor, inputRef), query)
            }
          />
        </BlockNoteView>
      </div>
      <div>
        {/* Save Button */}
        <button
          onClick={saveArticle}
          disabled={saving}
          className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-4"
        >
          {save}
        </button>
        <div className="mt-6">
          {article != null && !article.published && !saving && (
            <p className="font-medium italic mb-6">Ready to publish?</p>
          )}
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center">
              {/* Publish button */}
              {article != null && !article.published ? (
                !saving && (
                  <button
                    onClick={publishArticle}
                    className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white whitespace-nowrap cursor-pointer"
                  >
                    Publish Now →
                  </button>
                )
              ) : (
                !saving && (
                  <button
                    onClick={publishArticle}
                    className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white whitespace-nowrap cursor-pointer"
                  >
                    Unpublish
                  </button>
                )
              )}
              {saving && (
                <button
                  className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white disabled:border-gray-200 dark:disabled:border-gray-700 disabled:bg-white dark:disabled:bg-gray-800 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
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
                  <span className="ml-2">Loading</span>
                </button>
              )}
            </div>
          </div>
        </div>
        <hr className="my-6 border-t border-gray-100 dark:border-gray-700/60" />
      </div>
    </div>
  );
}

