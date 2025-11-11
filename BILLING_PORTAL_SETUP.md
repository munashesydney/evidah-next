# Stripe Customer Portal Integration

## ✅ Implementation Complete

The "Manage Billing" button now opens the Stripe Customer Portal where users can:
- Update payment methods
- View billing history
- Download invoices
- Cancel subscriptions
- Update subscription quantities

---

## 🔧 What Was Added

### 1. API Endpoint
**File:** `app/api/stripe/customer-portal/route.ts`

**What it does:**
- Fetches user's Stripe customer ID from Firestore
- Creates a Stripe Customer Portal session
- Returns the portal URL
- Redirects back to `/settings/plans` after user is done

### 2. Plans Page Integration
**File:** `app/(main)/[selectedCompany]/settings/plans/page.tsx`

**Updated:**
- `handleManageBilling()` function now calls the API
- Shows loading state while creating portal session
- Redirects user to Stripe portal
- Handles errors gracefully

### 3. Environment Variable
**File:** `.env`

**Added:**
```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** Update this for production:
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

---

## 🚀 How It Works

### User Flow
1. User clicks "Manage Billing" button
2. Button shows loading state
3. API creates Stripe Customer Portal session
4. User is redirected to Stripe portal
5. User manages their subscription
6. User clicks "Return to [Your App]"
7. Redirected back to `/settings/plans`

### What Users Can Do in Portal
- ✅ Update credit card
- ✅ View billing history
- ✅ Download invoices
- ✅ Cancel subscriptions
- ✅ Update billing email
- ✅ View upcoming invoices

---

## 🔐 Stripe Customer Portal Configuration

### Required Setup in Stripe Dashboard

1. **Go to:** https://dashboard.stripe.com/settings/billing/portal
2. **Enable:** Customer Portal
3. **Configure:**
   - ✅ Allow customers to update payment methods
   - ✅ Allow customers to view invoices
   - ✅ Allow customers to cancel subscriptions
   - ✅ Set cancellation behavior (immediate or end of period)

### Recommended Settings
- **Cancellation:** End of billing period (prevents immediate loss of access)
- **Payment method update:** Enabled
- **Invoice history:** Enabled
- **Proration:** Enabled (for upgrades/downgrades)

---

## 🧪 Testing

### Test the Flow
1. Visit `/default/settings/plans`
2. Click "Manage Billing" button
3. Should redirect to Stripe Customer Portal
4. Test updating payment method
5. Click "Return to [Your App]"
6. Should return to `/default/settings/plans`

### Error Scenarios
- **No subscription:** Shows error "No active subscription found"
- **Network error:** Shows alert with error message
- **Invalid customer ID:** Returns 404 error

---

## 📝 Notes

### Return URL
The portal redirects back to:
```
{NEXT_PUBLIC_APP_URL}/{selectedCompany}/settings/plans
```

Example:
```
http://localhost:3000/default/settings/plans
```

### Security
- Uses Firebase Admin SDK to verify user
- Only allows access to user's own customer portal
- Stripe validates the customer ID

### Production Checklist
- [ ] Update `NEXT_PUBLIC_APP_URL` in production .env
- [ ] Configure Stripe Customer Portal settings
- [ ] Test portal in production mode
- [ ] Verify return URL works correctly
- [ ] Test cancellation flow

---

## 🎉 Ready to Use!

The Manage Billing button is now fully functional and integrated with Stripe's Customer Portal. Users can manage their subscriptions, payment methods, and billing history directly through Stripe's secure interface.
