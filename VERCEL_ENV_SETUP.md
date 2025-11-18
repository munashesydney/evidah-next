# Vercel Environment Variables Setup

## Critical Environment Variables for Actions

For the Actions feature to work properly in production, you need to set the following environment variable in Vercel:

### Required Variable

**`NEXT_PUBLIC_BASE_URL`**
- **Value**: `https://app.evidah.com` (or your production domain)
- **Why**: When the AI employee processes actions, it needs to make internal API calls. This variable tells it where to find your API endpoints.
- **Without it**: You'll get `ECONNREFUSED` errors when actions try to use tools like `get_ticket_messages`

### How to Set in Vercel

1. Go to your Vercel project dashboard
2. Click on **Settings**
3. Click on **Environment Variables**
4. Add the following:
   - **Key**: `NEXT_PUBLIC_BASE_URL`
   - **Value**: `https://app.evidah.com`
   - **Environments**: Check all (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application for changes to take effect

### Alternative Variables (Fallback Order)

The system will try these variables in order:
1. `NEXT_PUBLIC_BASE_URL` (recommended)
2. `NEXT_PUBLIC_APP_URL`
3. `VERCEL_URL` (automatically set by Vercel)
4. `http://localhost:3000` (development fallback)

### Verification

After setting the variable and redeploying:

1. Create a test action with "Ticket Reply Received" trigger
2. Send a ticket reply
3. Check Vercel logs - you should see:
   ```
   [EMPLOYEE PROCESSOR] Converted relative URL to: https://app.evidah.com/api/...
   ```
4. The action should complete successfully without `ECONNREFUSED` errors

### Common Issues

**Issue**: Still getting `ECONNREFUSED` errors
- **Solution**: Make sure you redeployed after adding the environment variable
- **Check**: Vercel logs should show the correct URL being used

**Issue**: Variable not being picked up
- **Solution**: Environment variables starting with `NEXT_PUBLIC_` are embedded at build time
- **Action**: You must redeploy (not just restart) for changes to take effect

**Issue**: Works in development but not production
- **Solution**: Development uses localhost, production needs the full URL
- **Check**: Make sure `NEXT_PUBLIC_BASE_URL` is set in Vercel

### Testing Locally

To test with production-like settings locally:

1. Add to your `.env.local`:
   ```
   NEXT_PUBLIC_BASE_URL=http://localhost:3000
   ```

2. Restart your dev server

3. Test actions - they should work with the full URL

### Firebase Functions

The Firebase functions also need the correct URL set in their environment:

**File**: `evidah-node-scripts/functions/.env`
```
API_BASE_URL='https://app.evidah.com'
FUNCTIONS_MODE='live'
```

This is already configured correctly in your setup.
