# Categories Feature Setup

## Overview
The categories feature has been successfully implemented in the Next.js app following better coding practices with server-side API routes and proper separation of concerns.

## What's Been Created

### 1. API Routes (`/api/category/*`)

All category operations are handled server-side through Next.js API routes:

#### **GET `/api/category`** - Retrieve Categories
- Fetches all categories for a user's knowledge base
- Parameters: `uid`, `selectedCompany` (optional, defaults to 'default'), `limit` (optional)
- Orders by `createdAt` descending (newest first)
- Returns array of categories with id, name, description, link, timestamps

#### **POST `/api/category/create`** - Create Category
- Creates a new category in Firestore
- Required fields: `uid`, `name`, `description`, `link`
- Optional: `selectedCompany` (defaults to 'default')
- Validates:
  - Link format (only letters, numbers, hyphens, underscores)
  - Duplicate link checking
  - User authentication
- Returns created category data with ID

#### **PUT `/api/category/update`** - Update Category
- Updates existing category metadata
- Required: `uid`, `categoryId`
- Optional: `name`, `description`, `link` (at least one required)
- Validates:
  - Link format if provided
  - Duplicate link checking (excluding current category)
  - Category existence
- Returns updated category data

#### **DELETE `/api/category/delete`** - Delete Category
- Deletes a category from Firestore
- Required: `uid`, `categoryId`, `selectedCompany` (optional)
- Validates:
  - User authentication
  - Category existence
- Returns success confirmation

#### **GET `/api/category/search`** - Smart Search Categories
- Performs efficient Firebase queries for searching categories
- Parameters: `uid`, `selectedCompany` (optional), `query` (search term), `limit` (optional)
- Features:
  - **Prefix matching**: Uses Firebase range queries (`>=` and `<=`) for efficient prefix searches
  - **Case-insensitive**: Searches in both `nameLowercase` and `descriptionLowercase` fields
  - **Dual field search**: Searches name and description simultaneously, prioritizing name matches
  - **Fallback**: If Firestore indexes don't exist, falls back to client-side filtering
- Returns filtered categories matching the search query

### 2. Categories Page (`(main)/[selectedCompany]/categories/page.tsx`)

A fully functional categories page with:

#### Features:
- **Authentication Guard**: Redirects to sign-in if not authenticated
- **Real-time Updates**: Uses Firebase auth state listener
- **Search Functionality**: Filter categories by name or description
- **Loading States**: Skeleton loading animation while fetching data
- **Empty States**: 
  - Shows helpful message when no categories exist
  - Shows "no results" message when search returns nothing
- **CRUD Operations**: Create, Read, Update, Delete categories via modals
- **Auto-generated Links**: Category links auto-generate from titles
- **Link Validation**: Only allows letters, numbers, hyphens, and underscores

#### UI Components:
- Search bar for filtering categories
- "Add Category" button
- Grid layout of category cards (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
- Modal for adding new categories
- Loading skeletons for better UX

### 3. Category Card Component (`components/category-card.tsx`)

Reusable category card component with:

#### Features:
- **Display**: Shows category icon, name, description
- **Actions Menu**: Three-dot menu with:
  - Open (navigate to articles)
  - Edit (opens edit modal)
  - Remove (opens delete confirmation)
- **Edit Modal**: Inline editing with form validation
- **Delete Confirmation**: Safety modal before deletion
- **Navigation**: Click card or "View Articles" to see category's articles
- **Responsive Design**: Works on all screen sizes

#### Props:
- `id`, `name`, `description`, `link` - Category data
- `selectedCompany` - For routing
- `onDelete`, `onUpdate` - Callback functions for CRUD operations

## Firestore Structure

Categories are stored at:
```
Users/{uid}/knowledgebases/{selectedCompany}/categories/{categoryId}
```

### Document Fields:
- `name` (string) - Category name
- `description` (string) - Category description
- `nameLowercase` (string) - Lowercase version of name for efficient searching
- `descriptionLowercase` (string) - Lowercase version of description for efficient searching
- `link` (string) - URL-friendly link identifier
- `createdAt` (timestamp) - Creation timestamp
- `updatedAt` (timestamp) - Last update timestamp

**Note**: The `nameLowercase` and `descriptionLowercase` fields are automatically generated when creating or updating categories. These fields enable efficient case-insensitive prefix searches using Firebase range queries.

## Key Improvements Over Old React App

### ✅ Server-Side API Routes
- All Firebase operations happen server-side
- Better security with Firebase Admin SDK
- No direct Firestore access from client

### ✅ No localStorage Dependency
- Uses `[selectedCompany]` from URL params
- More reliable and shareable links
- Better for SEO and bookmarking

### ✅ TypeScript Throughout
- Type-safe components and API routes
- Better IDE support and error catching
- Interface definitions for all data structures

### ✅ Better Code Organization
- Separated concerns (API, UI, components)
- Reusable components
- Clean file structure following Next.js conventions

### ✅ Modern Next.js 14 Patterns
- App Router with route groups
- Server and client components
- API routes with proper HTTP methods
- Loading and error states

### ✅ Enhanced UX
- Loading skeletons
- Empty states with helpful messages
- Better error handling
- Smooth transitions and animations

### ✅ Smart Server-Side Search
- Firebase range queries for efficient prefix matching
- Case-insensitive search using lowercase fields
- Debounced search (300ms) for better performance
- Searches both name and description simultaneously
- Automatic fallback if Firestore indexes don't exist

## File Structure

```
aikd-next-clone/
├── app/
│   ├── (main)/
│   │   └── [selectedCompany]/
│   │       └── categories/
│   │           └── page.tsx              # Categories page
│   └── api/
│       └── category/
│           ├── route.ts                  # GET categories
│           ├── create/
│           │   └── route.ts              # POST create
│           ├── update/
│           │   └── route.ts              # PUT update
│           └── delete/
│               └── route.ts              # DELETE category
└── components/
    └── category-card.tsx                 # Category card component
```

## Usage

### Accessing the Page
Navigate to: `/{selectedCompany}/categories`

Example: `/default/categories`

### Creating a Category
1. Click "Add Category" button
2. Fill in:
   - Category Name (required)
   - Description (required)
   - Link (auto-generated, editable, required)
3. Click "Add"

### Editing a Category
1. Click three-dot menu on category card
2. Select "Edit"
3. Update fields
4. Click "Save"

### Deleting a Category
1. Click three-dot menu on category card
2. Select "Remove"
3. Confirm deletion

### Searching Categories
- Type in search bar at top right
- **Server-side search**: Uses Firebase queries for efficient prefix matching
- **Debounced**: Waits 300ms after typing stops before searching
- **Case-insensitive**: Automatically searches lowercase versions
- **Real-time**: Results update as you type (after debounce)
- Searches both name and description fields

## Next Steps

The categories feature is now complete and ready for use. Suggested next steps:

1. ✅ Categories page is fully functional
2. 📝 Consider implementing articles page next
3. 📝 Add article management within categories
4. 📝 Implement category-article relationships
5. 📝 Add category icons/images upload feature (optional)
6. 📝 Add sorting options (alphabetical, date, etc.)
7. 📝 Add pagination for large category lists (optional)

## Testing Checklist

- [x] Can create a new category
- [x] Can view all categories
- [x] Can edit a category
- [x] Can delete a category
- [x] Search filters categories correctly
- [x] Empty state shows when no categories exist
- [x] Loading state shows while fetching
- [x] Authentication redirects to sign-in
- [x] Links are validated and auto-generated
- [x] Duplicate links are prevented
- [x] All modals work correctly
- [x] Responsive design works on all screen sizes
- [x] Dark mode support works

## Notes

- Categories use the same Firestore structure as the old React app
- All API routes follow REST conventions
- Firebase Admin SDK is used for server-side operations
- Client-side only handles UI and makes API calls
- selectedCompany is now from URL params instead of localStorage
- The component follows the Next.js 14 App Router patterns
- Lowercase fields (`nameLowercase`, `descriptionLowercase`) are automatically maintained
- Search uses Firebase range queries for efficient prefix matching

## Firestore Indexes (Optional but Recommended)

For optimal search performance, you may want to create composite indexes in Firestore:

1. **Name Search Index**:
   - Collection: `Users/{uid}/knowledgebases/{selectedCompany}/categories`
   - Fields: `nameLowercase` (Ascending)

2. **Description Search Index**:
   - Collection: `Users/{uid}/knowledgebases/{selectedCompany}/categories`
   - Fields: `descriptionLowercase` (Ascending)

**Note**: The search route includes automatic fallback if indexes don't exist, so it will work without them (though less efficiently for large datasets). Firebase will automatically prompt you to create indexes when needed, or you can create them manually in the Firebase Console.

