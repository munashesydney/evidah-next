# Email Settings Redesign

## Overview
Redesigned the email configuration system to properly separate SMTP authentication credentials from the email sender information.

## Changes Made

### Database Schema Changes
**Old Structure:**
- `emailAddress` - Used for both SMTP auth and "from" address
- `smtpServer`
- `port`
- `password`
- `default`

**New Structure:**
- `username` - SMTP authentication username
- `fromEmail` - The email address to send FROM
- `senderName` - Display name for the sender
- `smtpServer` - SMTP server hostname
- `port` - SMTP port
- `password` - SMTP password
- `default` - Whether this is the default email

### Files Modified

#### Frontend
1. **`app/(main)/[selectedCompany]/settings/emails/page.tsx`**
   - Updated form to include username, fromEmail, and senderName fields
   - Reorganized layout into two rows for better UX
   - Updated Email interface to match new schema
   - Updated display to show sender name and from email

2. **`components/inbox-input-area.tsx`**
   - Updated email selection dropdown to use `fromEmail` instead of `emailAddress`
   - Updated display format to show "Sender Name <email@domain.com>"
   - Updated localStorage key matching to use `fromEmail`

#### Backend API Routes
1. **`app/api/settings/emails/create/route.ts`**
   - Updated to accept and store username, fromEmail, senderName
   - Changed duplicate check to use `fromEmail` instead of `emailAddress`

2. **`app/api/settings/emails/validate/route.ts`**
   - Updated to use `username` for SMTP authentication instead of `email`

3. **`app/api/settings/emails/route.ts`** (GET)
   - Updated response to return username, fromEmail, senderName

4. **`app/api/settings/emails/set-default/route.ts`**
   - Updated response to return new email structure

5. **`app/api/inbox/emails/route.ts`**
   - Updated to return username, fromEmail, senderName for custom emails
   - Updated default email structure to include all new fields

6. **`app/api/inbox/emails/send/route.ts`**
   - Updated EmailConfig interface with new fields
   - Updated to use `username` for SMTP auth
   - Updated to use `fromEmail` for the from address
   - Updated to use `senderName` in the email "from" header
   - Email now sends as: "Sender Name <from@email.com>"

## Benefits

1. **Proper Separation**: SMTP username is now separate from the "from" email address
2. **Professional Emails**: Sender name is now included in email headers
3. **Flexibility**: Allows using different usernames for authentication vs. sending
4. **Better UX**: Clear labeling and organization of fields

## Migration Notes

- No migration script needed as no existing users have configured emails
- Fresh installations will use the new schema
- All validation and sending logic updated to use new structure

## Example Configuration

```
Username: user@smtp-provider.com
From Email: support@yourdomain.com
Sender Name: Support Team
SMTP Server: smtp.gmail.com
Port: 587
Password: ••••••••
```

This will send emails as: "Support Team <support@yourdomain.com>"
