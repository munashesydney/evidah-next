# Settings Agents Setup Guide

## Overview
The Settings Agents feature has been successfully implemented in the Next.js app following the same pattern as other features with server-side API routes and proper separation of concerns.

## What's Been Created

### 1. API Routes (`/api/settings/agents/*`)

All agent operations are handled server-side through Next.js API routes:

#### **GET `/api/settings/agents`** - Retrieve All Agents
- Fetches all agents from the user's AdditionalUsers sub-collection
- Parameters: `uid` (required)
- Returns array of agents (excludes hashedPassword for security)
- Located at: `app/api/settings/agents/route.ts`

#### **POST `/api/settings/agents/create`** - Create New Agent
- Creates a new agent in Firestore
- Required fields: `uid`, `additionalEmail`, `additionalPassword`, `role`
- Optional: `additionalUserData` (displayName, phoneNumber)
- Validates:
  - User document exists
  - Email is not already in use
  - Password is hashed with bcrypt before storage
- Returns created agent data (without password)
- Located at: `app/api/settings/agents/create/route.ts`

#### **PUT `/api/settings/agents/update`** - Update Agent
- Updates existing agent information
- Required: `uid`, `agentId`
- Optional: `displayName`, `role`, `phoneNumber` (at least one required)
- Validates:
  - Agent exists
  - At least one field provided
- Returns updated agent data
- Located at: `app/api/settings/agents/update/route.ts`

#### **DELETE `/api/settings/agents/delete`** - Delete Agent
- Deletes an agent from Firestore
- Required: `uid`, `agentId` (query parameters)
- Validates:
  - Agent exists
- Returns success confirmation
- Located at: `app/api/settings/agents/delete/route.ts`

### 2. Agents Settings Page (`(main)/[selectedCompany]/settings/agents/page.tsx`)

A fully functional agents management page with:

#### Features:
- **Authentication Guard**: Redirects to sign-in if not authenticated
- **List Agents**: Display all agents with their information
- **Add Agent**: Form to create new agents with:
  - Agent Name (displayName)
  - Agent Email (userEmail)
  - Agent Category/Role (Sales, Support, Administrator)
  - Password
  - Phone Number (optional)
- **Edit Agent**: Inline editing for:
  - Display Name
  - Role
  - Phone Number
- **Delete Agent**: Remove agents with confirmation dialog
- **Loading States**: Skeleton loaders while fetching data
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation messages after operations

#### UI Components:
- Form inputs for adding agents
- Agent list with edit/delete buttons
- Inline edit forms
- Loading skeletons
- Success/error messages
- Responsive design (mobile/tablet/desktop)

## Firestore Structure

Agents are stored at:
```
Users/{uid}/AdditionalUsers/{agentId}
```

### Document Fields:
- `userEmail` (string) - Agent's email address
- `hashedPassword` (string) - Bcrypt hashed password
- `role` (string) - Agent role (Sales, Support, Admin)
- `displayName` (string) - Agent's display name
- `phoneNumber` (string, optional) - Agent's phone number
- `createdAt` (timestamp) - Creation timestamp

**Note**: The `hashedPassword` field is never returned to the client for security reasons.

## Key Implementation Details

### Password Security
- Passwords are hashed using `bcryptjs` with 10 salt rounds
- Hashed passwords are stored in Firestore
- Passwords are never returned in API responses
- Matches the security pattern from the node scripts

### Email Uniqueness
- The create endpoint checks for existing agents with the same email
- Prevents duplicate agent accounts
- Returns appropriate error message if email already exists

### Role Options
- **Sales**: Sales team member
- **Support**: Support team member
- **Admin**: Administrator with full access

### API Response Formats

#### GET `/api/settings/agents` Success Response
```json
{
  "success": true,
  "data": [
    {
      "id": "agent123",
      "userEmail": "agent@example.com",
      "role": "Support",
      "displayName": "John Doe",
      "phoneNumber": "+1234567890",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### POST `/api/settings/agents/create` Success Response
```json
{
  "status": 1,
  "message": "All good",
  "data": {
    "id": "agent123",
    "userEmail": "agent@example.com",
    "role": "Support",
    "displayName": "John Doe",
    "phoneNumber": "+1234567890",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT `/api/settings/agents/update` Success Response
```json
{
  "success": true,
  "message": "Agent updated successfully",
  "data": {
    "id": "agent123",
    "userEmail": "agent@example.com",
    "role": "Support",
    "displayName": "John Doe Updated",
    "phoneNumber": "+1234567890",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### DELETE `/api/settings/agents/delete` Success Response
```json
{
  "success": true,
  "message": "Agent deleted successfully"
}
```

## Key Improvements Over Old React App

### ✅ Server-Side API Routes
- All Firebase operations happen server-side
- Better security with Firebase Admin SDK
- No direct Firestore access from client
- Password hashing happens server-side

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
- Clean file structure following Next.js conventions
- Reusable patterns from other features

### ✅ Enhanced Security
- Passwords never exposed to client
- Server-side password hashing
- Email uniqueness validation
- Proper error handling

### ✅ Enhanced UX
- Loading skeletons for better perceived performance
- Inline editing for quick updates
- Confirmation dialogs for destructive actions
- Success/error feedback messages
- Responsive design

## File Structure

```
aikd-next-clone/
├── app/
│   ├── (main)/
│   │   └── [selectedCompany]/
│   │       └── settings/
│   │           └── agents/
│   │               └── page.tsx            # Agents management page
│   └── api/
│       └── settings/
│           └── agents/
│               ├── route.ts                # GET agents
│               ├── create/
│               │   └── route.ts            # POST create agent
│               ├── update/
│               │   └── route.ts            # PUT update agent
│               └── delete/
│                   └── route.ts            # DELETE agent
```

## Usage

### Accessing the Page
Navigate to: `/{selectedCompany}/settings/agents`

Example: `/default/settings/agents`

### Adding an Agent
1. Fill in the form:
   - Agent Name (required)
   - Agent Email (required)
   - Agent Category (required: Sales, Support, or Administrator)
   - Password (required)
   - Phone Number (optional)
2. Click "Add Agent" button
3. Wait for success message
4. Agent appears in the list

### Editing an Agent
1. Click the pencil icon (✏️) next to an agent
2. Modify the fields (Display Name, Role, Phone Number)
3. Click "Save" to save changes
4. Click "Cancel" to discard changes

### Deleting an Agent
1. Click the trash icon (🗑️) next to an agent
2. Confirm deletion in the dialog
3. Agent is removed from the list

## Validation Rules

### Required Fields (Create)
- Agent Name (displayName)
- Agent Email (userEmail)
- Agent Category (role)
- Password

### Optional Fields
- Phone Number

### Email Validation
- Must be a valid email format
- Must be unique (no duplicate emails)

### Role Validation
- Must be one of: "Sales", "Support", "Admin"

## Testing Checklist

- [x] Can view all agents
- [x] Can add a new agent
- [x] Can edit an agent (displayName, role, phoneNumber)
- [x] Can delete an agent
- [x] Email uniqueness is enforced
- [x] Passwords are hashed before storage
- [x] Form validation works correctly
- [x] Required fields are enforced
- [x] Loading states show while fetching
- [x] Success messages show after operations
- [x] Error messages show on failures
- [x] Authentication redirects to sign-in
- [x] All API routes work correctly
- [x] Responsive design works on all screen sizes
- [x] Dark mode support works
- [x] Inline editing works correctly
- [x] Delete confirmation dialog works

## Dependencies

### New Dependencies
- `@heroicons/react` - For edit and delete icons

### Existing Dependencies
- `bcryptjs` - For password hashing (already installed)
- `firebase-admin` - Server-side Firebase operations
- `firebase` - Client-side Firebase Auth

## Notes

- Agents use the same Firestore structure as the old React app
- All API routes follow REST conventions
- Firebase Admin SDK is used for server-side operations
- Client-side only handles UI and makes API calls
- selectedCompany is from URL params instead of localStorage
- The component follows Next.js 14 App Router patterns
- Password hashing matches the node scripts implementation (bcrypt with 10 rounds)
- The create endpoint matches the `addAgent` function from node scripts
- Email uniqueness check prevents duplicate agents
- Agents can be edited inline without navigating away
- Delete operations require confirmation to prevent accidents

## Comparison with Node Scripts

The implementation matches the node scripts `addAgent` function:
- ✅ Same password hashing (bcrypt, 10 rounds)
- ✅ Same Firestore structure (Users/{uid}/AdditionalUsers/{agentId})
- ✅ Same field names (userEmail, hashedPassword, role, displayName, phoneNumber)
- ✅ Same response format (status: 1 for success, 0 for error)
- ✅ Same validation logic (user exists, email uniqueness)

## Next Steps

Suggested features to implement next:
1. 📝 Password reset functionality for agents
2. 📝 Agent login functionality (separate from main user login)
3. 📝 Agent permissions/access control
4. 📝 Agent activity logging
5. 📝 Bulk agent operations
6. 📝 Agent search/filter functionality
7. 📝 Agent role-based access control in the app
8. 📝 Email notifications when agents are added/updated

## Troubleshooting

### Agent Not Appearing After Creation
- Check browser console for errors
- Verify API response status is 1
- Check Firestore console to see if document was created
- Verify uid is correct

### Password Issues
- Passwords are hashed server-side, never stored in plain text
- Password field is not returned in any API responses
- Use the login endpoint to verify passwords work

### Email Already Exists Error
- Check if agent with same email already exists
- Use edit functionality to update existing agent
- Or delete existing agent first

### Edit Not Saving
- Check browser console for errors
- Verify all required fields are filled
- Check API response for error messages
- Verify agentId is correct

## Security Considerations

1. **Password Hashing**: All passwords are hashed with bcrypt before storage
2. **No Password Exposure**: Passwords are never returned in API responses
3. **Server-Side Validation**: All validation happens server-side
4. **Authentication Required**: All endpoints require authenticated user
5. **Email Uniqueness**: Prevents duplicate accounts

