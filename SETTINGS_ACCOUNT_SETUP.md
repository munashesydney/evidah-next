# Settings Account Setup Guide

## Overview
The Settings Account feature has been successfully implemented in the Next.js app following the same pattern as other features with server-side API routes and proper separation of concerns.

## What's Been Created

### 1. API Routes (`/api/settings/account/*`)

All account settings operations are handled server-side through Next.js API routes:

#### **GET `/api/settings/account`** - Retrieve User Account Data
- Fetches user account information from Firestore
- Parameters: `uid` (required)
- Returns user data: email, name, surname, companyname, website, profilePicture
- Located at: `app/api/settings/account/route.ts`

#### **POST `/api/settings/account/update`** - Update User Account
- Updates user account information in Firestore
- Required: `uid`
- Optional: `name`, `surname`, `companyname`, `website`, `profilePicture` (at least one required)
- Updates only provided fields
- Returns updated user data
- Located at: `app/api/settings/account/update/route.ts`

### 2. Settings Layout (`(main)/[selectedCompany]/settings/layout.tsx`)

A shared layout for all settings pages with:
- Page header with "Settings" title
- Contains the settings sidebar
- Wrapped content area
- Responsive design

### 3. Settings Sidebar Component (`settings/settings-sidebar.tsx`)

A navigation sidebar for settings pages with:

#### Navigation Items:
- **My Account** - User account settings (✅ Implemented)
- **Agents** - Team/agent management (🔜 Coming soon)
- **Custom Emails** - Email configuration (🔜 Coming soon)
- **Knowledge Base** - Knowledge base settings (🔜 Coming soon)
- **Help Desk** - Help desk settings (🔜 Coming soon)
- **Live Chat** - Live chat settings (🔜 Coming soon)
- **Addons** - Plans and addons (🔜 Coming soon)

#### Features:
- Active route highlighting with violet gradient
- Responsive design (horizontal scroll on mobile)
- SVG icons for each section
- Consistent styling with the app theme

### 4. Account Settings Page (`(main)/[selectedCompany]/settings/account/page.tsx`)

A fully functional account settings page with:

#### Features:
- **Authentication Guard**: Redirects to sign-in if not authenticated
- **Profile Picture Upload**:
  - Image upload with 500x500px validation
  - Image compression before upload
  - Upload to Firebase Storage
  - Real-time preview
  - Upload progress indicator
- **Form Fields**:
  - Company Name (text)
  - Company Website (text, required)
  - Name (text, required)
  - Surname (text, required)
  - Email (read-only, disabled)
- **Save Functionality**:
  - Form validation
  - Loading state during save
  - Success message after save
  - Error handling with user feedback
- **Skeleton Loading**: Loading states while fetching data
- **Password Section**: Placeholder for password change (not functional yet)

#### UI Components:
- Profile picture upload button
- Form inputs with labels
- Save button with loading spinner
- Success/error messages
- Skeleton loaders

## Firestore Structure

User account data is stored at:
```
Users/{uid}
```

### Document Fields:
- `email` (string) - User email address
- `name` (string) - User first name
- `surname` (string) - User last name
- `companyname` (string) - Company name
- `website` (string) - Company website URL
- `profilePicture` (string) - URL to profile picture in Firebase Storage

## Firebase Storage Structure

Profile pictures are stored at:
```
images/{uid}/{filename}
```

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
- Reusable settings layout and sidebar
- Clean file structure following Next.js conventions

### ✅ Modern Next.js 14 Patterns
- App Router with route groups
- Server and client components
- API routes with proper HTTP methods
- Loading and error states

### ✅ Enhanced UX
- Loading skeletons
- Real-time image preview
- Better error handling
- Success feedback
- Smooth transitions and animations

### ✅ Image Optimization
- Client-side image compression
- Size validation (500x500px)
- Firebase Storage integration
- Progress indicators

## File Structure

```
aikd-next-clone/
├── app/
│   ├── (main)/
│   │   └── [selectedCompany]/
│   │       └── settings/
│   │           ├── layout.tsx              # Settings layout wrapper
│   │           ├── settings-sidebar.tsx   # Settings navigation sidebar
│   │           └── account/
│   │               └── page.tsx            # Account settings page
│   └── api/
│       └── settings/
│           └── account/
│               ├── route.ts                # GET account data
│               └── update/
│                   └── route.ts            # POST update account
└── lib/
    └── firebase.ts                         # Firebase client config
```

## Packages Used

### New Dependencies
- `browser-image-compression` - Client-side image compression before upload

### Existing Dependencies
- `firebase` - Client-side Firebase SDK for Auth and Storage
- `firebase-admin` - Server-side Firebase SDK for Firestore operations
- `next` - Next.js framework
- `react` - React library
- `typescript` - TypeScript support

## Usage

### Accessing the Page
Navigate to: `/{selectedCompany}/settings/account`

Example: `/default/settings/account`

### Updating Account Information
1. Navigate to the account settings page
2. Update any of the following fields:
   - Company Name
   - Company Website (required)
   - Name (required)
   - Surname (required)
3. Click "Save Changes" button
4. Wait for success message

### Uploading Profile Picture
1. Click "Change" button next to profile picture
2. Select an image file (must be 500x500 pixels)
3. Image will be automatically compressed and uploaded
4. Preview will update immediately
5. Profile picture is saved automatically upon upload

## Validation Rules

### Profile Picture
- **Dimensions**: Must be exactly 500x500 pixels
- **Format**: Any image format (JPEG, PNG, GIF, etc.)
- **Size**: Compressed to max 1MB before upload
- **Error Messages**: 
  - "Image dimensions must be 500x500 pixels."
  - "Invalid image file."
  - "Error compressing image."
  - "Error uploading file."

### Form Fields
- **Company Website**: Required field
- **Name**: Required field
- **Surname**: Required field
- **Company Name**: Optional
- **Email**: Read-only (cannot be changed)

## API Response Formats

### GET `/api/settings/account` Success Response
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "name": "John",
    "surname": "Doe",
    "companyname": "Acme Corp",
    "website": "https://acme.com",
    "profilePicture": "https://firebasestorage.googleapis.com/..."
  }
}
```

### POST `/api/settings/account/update` Success Response
```json
{
  "success": true,
  "message": "Account updated successfully",
  "data": {
    "email": "user@example.com",
    "name": "John",
    "surname": "Doe",
    "companyname": "Acme Corp",
    "website": "https://acme.com",
    "profilePicture": "https://firebasestorage.googleapis.com/..."
  }
}
```

### Error Response
```json
{
  "error": "Error message here",
  "details": "Detailed error information"
}
```

## Testing Checklist

- [x] Can view account settings page
- [x] Can load user data from Firestore
- [x] Can update name and surname
- [x] Can update company name
- [x] Can update company website
- [x] Can upload profile picture (500x500)
- [x] Profile picture is compressed before upload
- [x] Profile picture upload shows progress
- [x] Form validation works correctly
- [x] Required fields are enforced
- [x] Email field is read-only
- [x] Loading states show while fetching
- [x] Success message shows after save
- [x] Error messages show on failures
- [x] Authentication redirects to sign-in
- [x] All API routes work correctly
- [x] Responsive design works on all screen sizes
- [x] Dark mode support works
- [x] Settings sidebar navigation works
- [x] Active route is highlighted

## What's NOT Included (For Future Implementation)

The following features from the settings page are NOT yet implemented:
- ❌ Password change functionality
- ❌ Email change functionality
- ❌ Other settings pages (Agents, Emails, Knowledge Base, etc.)
- ❌ Custom claims/role checking for agent management
- ❌ Smart Sync toggle (was commented out in original)

These features can be added in future iterations following the same pattern.

## Notes

- Account settings use the same Firestore structure as the old React app
- All API routes follow REST conventions
- Firebase Admin SDK is used for server-side operations
- Client-side only handles UI and makes API calls
- selectedCompany is from URL params instead of localStorage
- The component follows Next.js 14 App Router patterns
- Profile pictures are stored in Firebase Storage, not Firestore
- Image compression happens client-side before upload
- Only changed fields are sent to the update API
- Settings sidebar is shared across all settings pages

## Next Steps

Suggested features to implement next:
1. 📝 Agents page (user management)
2. 📝 Custom Emails page (email configuration)
3. 📝 Knowledge Base settings page
4. 📝 Help Desk settings page
5. 📝 Live Chat settings page
6. 📝 Plans/Addons page
7. 📝 Password change functionality
8. 📝 Email change functionality with verification
9. 📝 Role-based access control for settings
10. 📝 Activity log for account changes

## Environment Variables Required

Make sure the following environment variables are set:

### Client-side (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### Server-side (.env.local)
```
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_service_account_private_key
```

## Troubleshooting

### Image Upload Not Working
- Check Firebase Storage rules allow write access
- Verify image is exactly 500x500 pixels
- Check browser console for detailed errors
- Ensure Firebase Storage bucket is configured

### Data Not Saving
- Verify Firebase Admin credentials are set
- Check Firestore security rules
- Ensure user is authenticated
- Check browser console for API errors

### Profile Picture Not Displaying
- Check Firebase Storage public access rules
- Verify profilePicture URL is valid
- Fallback to default avatar if URL is empty
- Check browser network tab for 403 errors

