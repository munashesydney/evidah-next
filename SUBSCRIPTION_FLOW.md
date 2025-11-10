# Subscription Flow - Final Implementation (Option B)

## Problem History
1. **Initial Issue**: Multiple PaymentIntents created during checkout (3+ pending transactions)
2. **Second Issue**: Double charging - PaymentIntent charged once, then subscription charged again
3. **Final Solution**: Switched to proper SetupIntent + Subscription pattern

## Current Implementation (Option B - Proper Stripe Pattern)

### Architecture
We now use the **proper Stripe subscription pattern**:
1. **SetupIntent** - Saves payment method without charging
2. **Subscription** - Creates subscription with coupon applied (charges once)
3. **Webhook** - Handles subscription lifecycle events

### Flow
```
User submits checkout
    ↓
Create SetupIntent (no charge)
    ↓
Confirm SetupIntent (saves payment method)
    ↓
Create Subscription with coupon (charges customer once)
    ↓
Save to Firestore
    ↓
Redirect to onboarding completion
```

### Files Structure

#### 1. `/api/stripe/create-setup-intent` (NEW)
- Creates SetupIntent for saving payment method
- Creates or retrieves Stripe customer
- Returns `clientSecret` and `customerId`

#### 2. `/api/stripe/create-subscription` (NEW)
- Creates subscription with coupon applied
- Handles user creation in Firebase
- Saves subscription data to Firestore
- **Only charges customer once** (subscription with discount)

#### 3. `/api/stripe/webhook`
- Handles subscription lifecycle events:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

#### 4. `/checkout/page.tsx`
- Uses `confirmCardSetup` instead of `confirmCardPayment`
- Calls create-subscription API after setup succeeds
- No more PaymentIntent logic

#### 5. Removed Files
- ❌ `/api/stripe/create-payment-intent` (deleted - no longer needed)

## Benefits

### ✅ No Double Charging
- Customer is charged **exactly once** when subscription is created
- Coupon is applied to the subscription's first invoice
- No separate PaymentIntent charge

### ✅ Proper Stripe Pattern
- SetupIntent for saving payment methods
- Subscription for recurring billing
- Clean separation of concerns

### ✅ Better Coupon Handling
- Coupon applied directly to subscription
- First invoice shows discounted price
- Future invoices at full price

### ✅ Cleaner Code
- Removed complex PaymentIntent update logic
- Webhook only handles subscription events
- Easier to maintain and extend

## Testing

### 1. Without Coupon
1. Go to `/checkout`
2. Fill in details
3. Click "Pay $39.00"
4. Check Stripe:
   - ✅ 1 charge for $39.00
   - ✅ 1 subscription created
   - ✅ Payment method saved

### 2. With Coupon (EVIDAH40)
1. Go to `/checkout`
2. Fill in details
3. Apply coupon "EVIDAH40"
4. Click "Pay $23.40"
5. Check Stripe:
   - ✅ 1 charge for $23.40 (40% off)
   - ✅ 1 subscription created
   - ✅ First invoice shows discount
   - ✅ Future invoices at $39.00

### 3. Firestore Data
Should see:
```javascript
subscriptionData: {
  subscriptionId: "sub_xxxxx",
  stripeCustomerId: "cus_xxxxx",
  status: "active",
  amount: 39,
  couponCode: "EVIDAH40",
  discountAmount: 15.6,
  // ... other fields
}
```

## Webhook Events to Monitor

### Expected Events
- `customer.subscription.created` - When subscription is created
- `invoice.payment_succeeded` - When first payment succeeds
- `invoice.payment_succeeded` - Monthly recurring payments

### Handle These
- `customer.subscription.updated` - Status changes (active, past_due, etc.)
- `customer.subscription.deleted` - Cancellations
- `invoice.payment_failed` - Failed recurring payments

## Environment Variables Required
```
STRIPE_MODE=test
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_PRICE_EVIDAH_Q_MONTHLY_TEST=price_...
```

## Troubleshooting

### If subscription not created
1. Check server logs for errors in `/api/stripe/create-subscription`
2. Verify price ID is correct and active in Stripe
3. Check that payment method was saved (SetupIntent succeeded)

### If double charged
- This should NOT happen anymore with Option B
- If it does, check that old PaymentIntent code is fully removed

### If coupon not applied
1. Verify promotion code exists in Stripe with code "EVIDAH40"
2. Check that promotion code is active
3. Look for errors in create-subscription logs
