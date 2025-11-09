# Authentication Setup Guide

## Overview
This Next.js app now has authentication endpoints and a sign-in page that replaces the old React app's authentication system.

## What's Been Created

### 1. API Endpoints (`/api/auth`)
- **`/api/auth/loginuser`** - Handles agent login (additional users with hashed passwords)
- **`/api/auth/createtoken`** - Creates custom tokens for admin users

### 2. Sign-In Page
- **`/app/(main)/sign-in/page.tsx`** - Clean sign-in page matching the template design
- Located in the `(main)` route group for your main application routes

### 3. Firebase Configuration
- **`/lib/firebase.ts`** - Client-side Firebase initialization
- Configured to use environment variables

### 4. Assets
- Copied `auth-image.jpg` and `simple_logo.png` to `/public`

## Environment Setup

1. Create a `.env.local` file in the root directory (use `.env.local.example` as template):

```env
# Firebase Admin SDK (for API routes)
FIREBASE_PROJECT_ID=ai-knowledge-desk
FIREBASE_CLIENT_EMAIL=your-client-email@ai-knowledge-desk.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://ai-knowledge-desk.firebaseio.com

# Firebase Client SDK (for browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBOcmXt6pcBMEveHJz5TBV2LYdGjXP9-7E
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ai-knowledge-desk.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ai-knowledge-desk
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ai-knowledge-desk.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=302522773755
NEXT_PUBLIC_FIREBASE_APP_ID=1:302522773755:web:c33f50b2e02bd466e1405e
```

2. Get your Firebase Admin private key from the Firebase Console:
   - Go to Project Settings > Service Accounts
   - Generate new private key
   - Copy the values to your `.env.local`

## How It Works

### Authentication Flow

1. **Admin Login**:
   - User enters email/password
   - App tries Firebase email/password auth
   - If successful, calls `/api/auth/createtoken` to get custom token
   - Signs in with custom token (includes role, displayName, etc.)

2. **Agent Login** (fallback):
   - If admin login fails, tries `/api/auth/loginuser`
   - Searches `AdditionalUsers` collection for matching email
   - Verifies bcrypt hashed password
   - Returns custom token with agent's role and info

### API Endpoints

Both endpoints return the same response format:
```json
{
  "status": 1,
  "message": "Login success",
  "customToken": "firebase-custom-token-here"
}
```

Error response:
```json
{
  "status": 0,
  "message": "Error message here",
  "customToken": null
}
```

## Dependencies Installed

- `firebase` - Client-side Firebase SDK
- `firebase-admin` - Server-side Firebase Admin SDK
- `bcryptjs` - Password hashing (for agent login)
- `@types/bcryptjs` - TypeScript types

## Next Steps

1. Set up your `.env.local` file with Firebase credentials
2. Test the sign-in page at `/sign-in`
3. Create additional pages in `(main)` route group for your app
4. Add protected route middleware if needed
5. Create sign-up page following the same pattern

## File Structure

```
aikd-next-clone/
├── app/
│   ├── (main)/
│   │   ├── layout.tsx          # Main app layout
│   │   └── sign-in/
│   │       └── page.tsx        # Sign-in page
│   └── api/
│       └── auth/
│           ├── loginuser/
│           │   └── route.ts    # Agent login endpoint
│           └── createtoken/
│               └── route.ts    # Admin token creation
├── lib/
│   └── firebase.ts             # Firebase client config
├── public/
│   ├── auth-image.jpg          # Sign-in background image
│   └── simple_logo.png         # Logo
└── .env.local                  # Your environment variables (create this)
```

## Notes

- The sign-in page uses the same template styling as the rest of the Next.js app
- All authentication logic is now server-side in API routes
- Client-side only handles UI and calls the API endpoints
- Custom tokens include user role, displayName, and email in claims
