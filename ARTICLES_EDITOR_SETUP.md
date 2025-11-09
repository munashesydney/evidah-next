# Articles Editor Setup

This document outlines the implementation of the article editor feature using BlockNote in the Next.js application.

## Features Implemented

### 1. API Endpoint - Get Single Article
**File:** `app/api/articles/[articleId]/route.ts`

- **Endpoint:** `GET /api/articles/[articleId]?uid={uid}&selectedCompany={selectedCompany}`
- **Purpose:** Fetches a single article by ID, searching through all categories
- **Response:** Returns article data including content, raw text, metadata, and category info

### 2. Article Editor Component
**File:** `components/blocknote-editor.tsx`

- **Editor:** BlockNote WYSIWYG editor with Mantine styling
- **Features:**
  - Real-time content editing
  - Image upload support (via slash menu `/`)
  - Base64 image conversion to Firebase Storage URLs
  - Dark mode support (auto-detects from theme)
  - Save and publish functionality
  - Custom slash menu items

**Props:**
- `article`: Article data object
- `categoryId`: ID of the category containing the article
- `articleId`: ID of the article
- `uid`: User ID
- `selectedCompany`: Selected company/knowledge base ID
- `theContent`: Initial HTML content
- `theRawText`: Initial markdown/raw text
- `onSave`: Optional callback after successful save

### 3. Article Detail Page
**File:** `app/(main)/[selectedCompany]/articles/[articleId]/page.tsx`

- **Route:** `/[selectedCompany]/articles/[articleId]`
- **Features:**
  - Displays article metadata (title, description, category, published status, creation date)
  - Embeds BlockNote editor for content editing
  - Edit article info modal (title, description, link)
  - Delete article confirmation modal
  - Back to articles navigation
  - Dynamic import for editor (SSR disabled)

### 4. Base64 Image Utility
**File:** `lib/replaceBase64Images.ts`

- **Purpose:** Converts base64-encoded images in HTML/Markdown to Firebase Storage URLs
- **Process:**
  1. Extracts base64 images from HTML and markdown
  2. Uploads images to Firebase Storage
  3. Replaces base64 URLs with permanent Firebase URLs
  4. Returns processed HTML and markdown

### 5. Updated Articles API
**File:** `app/api/articles/update/route.ts`

- **Added:** `content` field support for saving HTML content from editor
- **Existing:** `rawText` field for markdown/plain text

### 6. View Article Button
**File:** `app/(main)/[selectedCompany]/articles/page.tsx`

- **Added:** Eye icon button to navigate to article editor
- **Action:** Opens article in `/[selectedCompany]/articles/[articleId]` route

## Packages Installed

```json
{
  "@blocknote/core": "^latest",
  "@blocknote/react": "^latest",
  "@blocknote/mantine": "^latest",
  "react-icons": "^latest"
}
```

## File Structure

```
aikd-next-clone/
├── app/
│   ├── api/
│   │   └── articles/
│   │       ├── [articleId]/
│   │       │   └── route.ts          # Get single article
│   │       └── update/
│   │           └── route.ts          # Updated to save content
│   └── (main)/
│       └── [selectedCompany]/
│           └── articles/
│               ├── page.tsx           # Articles listing (with view button)
│               └── [articleId]/
│                   └── page.tsx       # Article editor page
├── components/
│   └── blocknote-editor.tsx          # BlockNote editor component
└── lib/
    └── replaceBase64Images.ts        # Image upload utility
```

## Usage Flow

1. **View Articles:** User navigates to `/[selectedCompany]/articles`
2. **Open Article:** Click eye icon on an article
3. **Editor Page:** Opens `/[selectedCompany]/articles/[articleId]`
4. **Edit Content:** Use BlockNote editor to modify article content
5. **Insert Images:** Use `/` slash menu to trigger image upload
6. **Save:** Click "Save" button to save content without publishing
7. **Publish:** Click "Publish Now" to save and make article public
8. **Edit Info:** Click "Edit Info" to update title, description, or link
9. **Delete:** Click "Delete" to remove article (with confirmation)

## Key Implementation Details

### Dynamic Import
The BlockNote editor is dynamically imported with SSR disabled to prevent hydration issues:

```typescript
const BlockNoteEditor = dynamic(() => import('@/components/blocknote-editor'), {
  ssr: false,
  loading: () => <div>Loading editor...</div>,
});
```

### Theme Detection
The editor automatically detects and applies the current theme:

```typescript
useEffect(() => {
  const isDark = document.documentElement.classList.contains('dark');
  setTheme(isDark ? 'dark' : 'light');
}, []);
```

### Image Upload
Images are uploaded via:
1. File input triggered by slash menu
2. Upload to Firebase Storage
3. Insert image block with download URL

### Content Saving
Content is saved in two formats:
- **HTML** (`content`): For display and editing in BlockNote
- **Markdown** (`rawText`): For search and plain text operations

## Firebase Structure

Articles are stored in:
```
Users/
  {uid}/
    knowledgebases/
      {selectedCompany}/
        categories/
          {categoryId}/
            articles/
              {articleId}:
                - title
                - description
                - link
                - content (HTML)
                - rawText (Markdown)
                - published
                - createdAt
                - updatedAt
```

## Styling

BlockNote styles are imported from:
- `@blocknote/core/fonts/inter.css` - Font styles
- `@blocknote/mantine/style.css` - Mantine UI components

The editor inherits the app's Tailwind CSS theme for dark mode support.

## Notes

- The editor uses BlockNote's `BlockNoteView` with Mantine styling
- Custom slash menu items are added via `SuggestionMenuController`
- Base64 images are automatically converted to permanent URLs on save
- The editor is only loaded client-side to avoid SSR issues
- Article metadata can be edited separately from content

