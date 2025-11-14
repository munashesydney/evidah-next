# Authentication & Account Linking Changes

## Overview
Separated account merging logic from the sign-in page and created a dedicated Authentication settings page for proper account linking management.

## Changes Made

### 1. Sign-In Page (`app/(main)/sign-in/page.tsx`)
**Removed:**
- All automatic account merging/linking logic
- `linkWithCredential` functionality during sign-in

**Added:**
- Clear, helpful error messages when users try to sign in with the wrong method
- Guidance directing users to use their original sign-in method
- Instructions to visit Settings > Authentication for account linking

**Behavior:**
- When a user tries to sign in with Google but has an email/password account → Shows error: "This email is registered with email and password. Please sign in using email and password instead. After signing in, you can link your Google account in Settings > Authentication."
- When a user tries to sign in with email/password but has a Google account → Shows error: "This email is registered with Google. Please sign in using Google instead. You can link your email/password in Settings > Authentication after signing in."
- Similar messages for Apple sign-in conflicts

### 2. New Authentication Settings Page (`app/(main)/[selectedCompany]/settings/auth/page.tsx`)
**Features:**
- Displays current account email
- Shows all available sign-in methods (Google, Apple, Email/Password)
- Visual indicators for linked vs unlinked methods
- Link button for unlinked providers
- Unlink button for linked providers (with protection against unlinking the last method)
- Real-time status updates
- Error and success messages
- Loading states for all actions

**Functionality:**
- Users can link multiple sign-in methods to their account
- Users can unlink methods (must keep at least one)
- Proper error handling for:
  - Credential already in use
  - Provider already linked
  - Popup blocked/closed
  - Other Firebase auth errors

### 3. Settings Sidebar (`app/(main)/[selectedCompany]/settings/settings-sidebar.tsx`)
**Added:**
- New "Authentication" menu item
- Positioned between "My Account" and "Agents"
- Uses a key/lock icon for visual identification
- Proper active state highlighting

## User Flow

### Scenario 1: User has email/password, wants to add Google
1. Sign in with email/password
2. Navigate to Settings > Authentication
3. Click "Link" on Google provider
4. Complete Google sign-in popup
5. Google is now linked - user can sign in with either method

### Scenario 2: User tries to sign in with wrong method
1. User has Google account but tries email/password sign-in
2. Receives clear error: "This email is registered with Google. Please sign in using Google instead..."
3. User signs in with Google
4. Can optionally link email/password in Settings > Authentication

### Scenario 3: User wants to remove a sign-in method
1. Navigate to Settings > Authentication
2. Click "Unlink" on desired provider
3. Provider is removed (if not the last one)
4. User can no longer sign in with that method

## Security Features
- Prevents unlinking the last sign-in method
- Requires authentication to access settings page
- Uses Firebase's secure `linkWithPopup` and `unlink` methods
- Proper error handling for credential conflicts

## Technical Details
- Uses Firebase Auth's `linkWithPopup` for secure account linking
- Uses Firebase Auth's `unlink` for removing providers
- Real-time provider status updates via `onAuthStateChanged`
- Proper TypeScript typing throughout
- Responsive design matching existing settings pages
- Dark mode support

## Testing Checklist
- [ ] Sign in with email/password, try to sign in with Google using same email → Should show error
- [ ] Sign in with Google, try to sign in with email/password using same email → Should show error
- [ ] Sign in with email/password, go to Settings > Authentication, link Google → Should work
- [ ] Sign in with Google, go to Settings > Authentication, link Apple → Should work
- [ ] Try to unlink the only sign-in method → Should show error
- [ ] Link multiple methods, unlink one → Should work
- [ ] Test popup blockers → Should show appropriate error
- [ ] Test closing popup without completing → Should show appropriate error
