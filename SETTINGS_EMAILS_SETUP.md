# Settings Custom Emails Setup Guide

## Overview
The Settings Custom Emails feature has been successfully implemented in the Next.js app following the same pattern as other features with server-side API routes and proper separation of concerns.

## What's Been Created

### 1. API Routes (`/api/settings/emails/*`)

All email operations are handled server-side through Next.js API routes:

#### **GET `/api/settings/emails`** - Retrieve All Custom Emails
- Fetches all custom emails from the user's knowledge base
- Parameters: `uid` (required), `selectedCompany` (optional, defaults to 'default')
- Returns array of emails (excludes password for security)
- Located at: `app/api/settings/emails/route.ts`

#### **POST `/api/settings/emails/validate`** - Validate SMTP Settings
- Validates SMTP configuration before saving
- Required fields: `email`, `smtpServer`, `port`, `password`
- Uses nodemailer to verify SMTP connection
- Returns validation result (isGood: true/false)
- Located at: `app/api/settings/emails/validate/route.ts`

#### **POST `/api/settings/emails/create`** - Create New Email
- Creates a new custom email entry
- Required fields: `uid`, `emailAddress`, `smtpServer`, `port`, `password`
- Optional: `selectedCompany` (defaults to 'default')
- Validates:
  - Email address uniqueness
  - Knowledge base exists
- Returns created email data (without password)
- Located at: `app/api/settings/emails/create/route.ts`

#### **PUT `/api/settings/emails/set-default`** - Set Default Email
- Sets an email as the default (only one can be default)
- Required: `uid`, `emailId`
- Optional: `selectedCompany` (defaults to 'default')
- Updates all emails atomically using batch write
- Returns updated list of all emails
- Located at: `app/api/settings/emails/set-default/route.ts`

#### **DELETE `/api/settings/emails/delete`** - Delete Email
- Deletes a custom email from Firestore
- Required: `uid`, `emailId` (query parameters)
- Optional: `selectedCompany` (defaults to 'default')
- Validates email exists
- Returns success confirmation
- Located at: `app/api/settings/emails/delete/route.ts`

### 2. Emails Settings Page (`(main)/[selectedCompany]/settings/emails/page.tsx`)

A fully functional custom emails management page with:

#### Features:
- **Authentication Guard**: Redirects to sign-in if not authenticated
- **Add Email Form**: 
  - Email Address
  - SMTP Server
  - Port
  - Password
- **SMTP Validation**: Validates SMTP settings before saving
- **List Emails**: Display all saved custom emails
- **Set Default**: Mark one email as default (only one can be default)
- **Delete Email**: Remove emails with confirmation dialog
- **Loading States**: Skeleton loaders while fetching data
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation messages after operations

#### UI Components:
- Form inputs for adding emails
- Email list with set default/delete buttons
- Loading skeletons
- Success/error messages
- Responsive design (mobile/tablet/desktop)

## Firestore Structure

Custom emails are stored at:
```
Users/{uid}/knowledgebases/{selectedCompany}/emails/{emailId}
```

### Document Fields:
- `emailAddress` (string) - Email address
- `smtpServer` (string) - SMTP server hostname
- `port` (string) - SMTP port number
- `password` (string) - SMTP password (stored in plain text - consider encrypting in production)
- `default` (boolean) - Whether this is the default email
- `createdAt` (timestamp) - Creation timestamp

**Note**: The `password` field is stored in plain text. Consider encrypting it in production for better security.

## Key Implementation Details

### SMTP Validation
- Uses `nodemailer` to verify SMTP connection
- Validates before saving to prevent invalid configurations
- Secure connections (port 465) are automatically detected
- Returns clear error messages if validation fails

### Default Email Management
- Only one email can be default at a time
- Uses Firestore batch writes for atomic updates
- All emails are updated in a single transaction
- Prevents race conditions

### Email Uniqueness
- The create endpoint checks for existing emails with the same address
- Prevents duplicate email entries
- Returns appropriate error message if email already exists

## API Response Formats

### GET `/api/settings/emails` Success Response
```json
{
  "success": true,
  "data": [
    {
      "id": "email123",
      "emailAddress": "support@example.com",
      "smtpServer": "smtp.gmail.com",
      "port": "587",
      "default": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### POST `/api/settings/emails/validate` Success Response
```json
{
  "status": 1,
  "isGood": true
}
```

### POST `/api/settings/emails/create` Success Response
```json
{
  "success": true,
  "message": "Email saved successfully",
  "data": {
    "id": "email123",
    "emailAddress": "support@example.com",
    "smtpServer": "smtp.gmail.com",
    "port": "587",
    "default": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### PUT `/api/settings/emails/set-default` Success Response
```json
{
  "success": true,
  "message": "Default email updated successfully",
  "data": [
    {
      "id": "email123",
      "emailAddress": "support@example.com",
      "smtpServer": "smtp.gmail.com",
      "port": "587",
      "default": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### DELETE `/api/settings/emails/delete` Success Response
```json
{
  "success": true,
  "message": "Email deleted successfully"
}
```

## Key Improvements Over Old React App

### ✅ Server-Side API Routes
- All Firebase operations happen server-side
- Better security with Firebase Admin SDK
- No direct Firestore access from client
- SMTP validation happens server-side

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
- SMTP validation before saving
- Server-side validation
- Password field never returned in responses

### ✅ Enhanced UX
- Loading skeletons for better perceived performance
- SMTP validation feedback during save
- Success/error messages
- Responsive design
- Default email indicator

## File Structure

```
aikd-next-clone/
├── app/
│   ├── (main)/
│   │   └── [selectedCompany]/
│   │       └── settings/
│   │           └── emails/
│   │               └── page.tsx            # Emails management page
│   └── api/
│       └── settings/
│           └── emails/
│               ├── route.ts                # GET emails
│               ├── validate/
│               │   └── route.ts            # POST validate SMTP
│               ├── create/
│               │   └── route.ts            # POST create email
│               ├── set-default/
│               │   └── route.ts            # PUT set default
│               └── delete/
│                   └── route.ts            # DELETE email
```

## Usage

### Accessing the Page
Navigate to: `/{selectedCompany}/settings/emails`

Example: `/default/settings/emails`

### Adding an Email
1. Fill in the form:
   - Email Address (required)
   - SMTP Server (required, e.g., smtp.gmail.com)
   - Port (required, e.g., 587 or 465)
   - Password (required)
2. Click "Save Email" button
3. SMTP settings are validated automatically
4. If valid, email is saved
5. Success message appears

### Setting Default Email
1. Click "Set as Default" button next to an email
2. All other emails are automatically set to non-default
3. Only one email can be default at a time

### Deleting an Email
1. Click "Delete" button next to an email
2. Confirm deletion in the dialog
3. Email is removed from the list

## Validation Rules

### Required Fields (Create)
- Email Address (must be valid email format)
- SMTP Server
- Port (must be valid port number)
- Password

### SMTP Validation
- Connection is verified using nodemailer
- Port 465 uses secure connection automatically
- Other ports use non-secure connection
- Validation must pass before email is saved

### Email Uniqueness
- Email address must be unique per knowledge base
- Duplicate emails are rejected

## Common SMTP Settings

### Gmail
- SMTP Server: `smtp.gmail.com`
- Port: `587` (TLS) or `465` (SSL)
- Password: App-specific password (not regular password)

### Outlook/Hotmail
- SMTP Server: `smtp-mail.outlook.com`
- Port: `587`
- Password: Account password

### FastMail
- SMTP Server: `smtp.fastmail.com`
- Port: `465`
- Password: App password

## Testing Checklist

- [x] Can view all custom emails
- [x] Can add a new email with valid SMTP settings
- [x] SMTP validation works correctly
- [x] Invalid SMTP settings are rejected
- [x] Can set an email as default
- [x] Only one email can be default at a time
- [x] Can delete an email
- [x] Email uniqueness is enforced
- [x] Form validation works correctly
- [x] Required fields are enforced
- [x] Loading states show while fetching
- [x] Success messages show after operations
- [x] Error messages show on failures
- [x] Authentication redirects to sign-in
- [x] All API routes work correctly
- [x] Responsive design works on all screen sizes
- [x] Dark mode support works

## Dependencies

### Existing Dependencies
- `nodemailer` - For SMTP validation (already installed)
- `firebase-admin` - Server-side Firebase operations
- `firebase` - Client-side Firebase Auth

## Notes

- Emails use the same Firestore structure as the old React app
- All API routes follow REST conventions
- Firebase Admin SDK is used for server-side operations
- Client-side only handles UI and makes API calls
- selectedCompany is from URL params instead of localStorage
- The component follows Next.js 14 App Router patterns
- SMTP validation matches the node scripts `validateSMTP` function
- Passwords are stored in plain text (consider encrypting in production)
- Default email management uses atomic batch writes
- The validate endpoint matches the `isSMTPValid` function from node scripts

## Comparison with Node Scripts

The implementation matches the node scripts:
- ✅ Same SMTP validation logic (nodemailer verify)
- ✅ Same Firestore structure (Users/{uid}/knowledgebases/{selectedCompany}/emails)
- ✅ Same field names (emailAddress, smtpServer, port, password, default)
- ✅ Same validation response format (status: 1, isGood: true/false)

## Security Considerations

1. **SMTP Validation**: All SMTP settings are validated before saving
2. **Password Storage**: Passwords are stored in plain text - consider encrypting in production
3. **Server-Side Validation**: All validation happens server-side
4. **Authentication Required**: All endpoints require authenticated user
5. **Email Uniqueness**: Prevents duplicate email entries

## Next Steps

Suggested features to implement next:
1. 📝 Password encryption for stored SMTP passwords
2. 📝 Email testing functionality (send test email)
3. 📝 Edit email functionality (update SMTP settings)
4. 📝 Email usage statistics
5. 📝 Bulk email operations
6. 📝 Email templates integration
7. 📝 SMTP connection health monitoring
8. 📝 Email sending rate limits

## Troubleshooting

### SMTP Validation Fails
- Check SMTP server address is correct
- Verify port number is correct (587 for TLS, 465 for SSL)
- Ensure password is correct (use app passwords for Gmail)
- Check firewall/network settings
- Verify email service allows SMTP access

### Email Not Appearing After Creation
- Check browser console for errors
- Verify API response indicates success
- Check Firestore console to see if document was created
- Verify uid and selectedCompany are correct

### Cannot Set Default Email
- Check browser console for errors
- Verify email exists in Firestore
- Check API response for error messages
- Ensure batch write completed successfully

### Delete Not Working
- Check browser console for errors
- Verify emailId is correct
- Check API response for error messages
- Verify user has permission to delete

