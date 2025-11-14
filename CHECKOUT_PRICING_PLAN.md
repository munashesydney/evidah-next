# Checkout Pricing Restructure Plan

## Current State Analysis

### Current Pricing Structure
- **EvidahQ Bundle**: $39/month or $348/year ($29/month equivalent)
- **Individual Employees**: $29/month or $228/year ($19/month equivalent)
- **Coupon System**: EVIDAH40 gives 40% off (applied to first payment only)
- **Payment Flow**: Full price charged immediately via Stripe subscription

### Current Implementation
1. **Checkout Page** (`app/checkout/page.tsx`):
   - Displays pricing based on plan and billing period
   - Allows coupon code entry (EVIDAH40 for 40% off)
   - Creates Stripe SetupIntent for payment method
   - Creates subscription immediately

2. **Create Subscription API** (`api/stripe/create-subscription/route.ts`):
   - Creates Stripe subscription with selected price
   - Applies coupon if provided (40% off first payment)
   - Stores subscription data in Firestore
   - Sets up user access flags

3. **Apply Coupon API** (`api/stripe/apply-coupon/route.ts`):
   - Validates coupon code
   - Calculates discount amount
   - Returns discount details for UI display

4. **Webhook Handler** (`api/stripe/webhook/route.ts`):
   - Handles subscription updates
   - Handles subscription cancellations
   - Handles payment failures
   - Updates Firestore access flags

---

## New Pricing Strategy

### Goal
- **First Month**: $1 for everyone (trial pricing)
- **Second Month**: 
  - If they used a coupon code → Charge discounted amount
  - If no coupon code → Charge full price
- **Third Month onwards**: Always charge full price

### Pricing Breakdown Examples

#### Example 1: EvidahQ Monthly with EVIDAH40 coupon
- Month 1: $1.00
- Month 2: $23.40 (40% off $39 = $23.40)
- Month 3+: $39.00

#### Example 2: EvidahQ Monthly without coupon
- Month 1: $1.00
- Month 2: $39.00
- Month 3+: $39.00

#### Example 3: Individual Employee Monthly with EVIDAH40
- Month 1: $1.00
- Month 2: $17.40 (40% off $29 = $17.40)
- Month 3+: $29.00

#### Example 4: EvidahQ Yearly with EVIDAH40
- Month 1: $1.00
- Month 2: $208.80 (40% off $348 = $208.80)
- Month 3+: $348.00 (charged annually)

---

## Implementation Plan

### Phase 1: Stripe Product Setup (Manual - In Stripe Dashboard)

#### Create New Price IDs for $1 Trial
1. **Create $1 Monthly Trial Prices** (for each plan):
   - `STRIPE_PRICE_TRIAL_MONTHLY_TEST` → $1.00/month
   - `STRIPE_PRICE_TRIAL_MONTHLY_LIVE` → $1.00/month

2. **Keep Existing Full Price IDs**:
   - `STRIPE_PRICE_EVIDAH_Q_MONTHLY_TEST` → $39/month
   - `STRIPE_PRICE_EVIDAH_Q_YEARLY_TEST` → $348/year
   - `STRIPE_PRICE_CHARLIE_MONTHLY_TEST` → $29/month
   - etc.

3. **Create Discounted Price IDs** (for second month with coupon):
   - `STRIPE_PRICE_EVIDAH_Q_MONTHLY_DISCOUNTED_TEST` → $23.40/month (40% off)
   - `STRIPE_PRICE_EVIDAH_Q_YEARLY_DISCOUNTED_TEST` → $208.80/year (40% off)
   - `STRIPE_PRICE_CHARLIE_MONTHLY_DISCOUNTED_TEST` → $17.40/month (40% off)
   - etc.

**Alternative Approach (Recommended)**: Use Stripe's built-in trial period and phase subscriptions instead of creating multiple price IDs.

---

### Phase 2: Backend Changes

#### 2.1 Update Create Subscription API (`api/stripe/create-subscription/route.ts`)

**Changes Needed**:
1. **Create subscription with phases** instead of single price:
   ```typescript
   // Phase 1: $1 for first month
   // Phase 2: Discounted price (if coupon) or full price
   // Phase 3: Full price forever
   ```

2. **Store coupon information** in Firestore for tracking:
   ```typescript
   subscriptionData: {
     subscriptionId: string,
     couponCode: string | null,
     hasUsedCoupon: boolean,
     phase: 'trial' | 'discounted' | 'full',
     trialEndDate: Timestamp,
     discountEndDate: Timestamp | null,
   }
   ```

3. **Use Stripe Subscription Schedules** for multi-phase pricing:
   - Phase 1: $1 for 1 month
   - Phase 2: Discounted or full price for 1 month (if monthly) or 1 year (if yearly)
   - Phase 3: Full price ongoing

#### 2.2 Update Apply Coupon API (`api/stripe/apply-coupon/route.ts`)

**Changes Needed**:
1. Keep validation logic
2. Update discount calculation to show:
   - "First month: $1"
   - "Second month: $X (with coupon)" or "Second month: $Y (full price)"
   - "After that: $Y (full price)"

#### 2.3 Update Webhook Handler (`api/stripe/webhook/route.ts`)

**Changes Needed**:
1. Handle `customer.subscription.schedule.updated` events
2. Track which phase the subscription is in
3. Update Firestore when transitioning between phases
4. Handle phase transitions properly

---

### Phase 3: Frontend Changes

#### 3.1 Update Checkout Page (`app/checkout/page.tsx`)

**Changes Needed**:

1. **Update Pricing Display**:
   ```typescript
   // Instead of showing single price, show breakdown:
   - First month: $1.00
   - Second month: $X.XX (with EVIDAH40) or $Y.YY
   - After that: $Y.YY per [month/year]
   ```

2. **Update Order Summary**:
   ```typescript
   // Show clear breakdown:
   Total due today: $1.00
   Next billing (Month 2): $X.XX
   Regular price (Month 3+): $Y.YY
   ```

3. **Update Promotional Banner**:
   ```typescript
   // Change from "40% off" to:
   "Start for just $1! Use code EVIDAH40 for 40% off your second month"
   ```

4. **Update Button Text**:
   ```typescript
   // Change from "Pay $X" to:
   "Start Trial for $1"
   ```

5. **Add Clear Pricing Breakdown Section**:
   ```tsx
   <div className="pricing-breakdown">
     <h3>Pricing Breakdown</h3>
     <ul>
       <li>Month 1: $1.00 (trial)</li>
       <li>Month 2: ${secondMonthPrice} {couponApplied ? '(40% off)' : ''}</li>
       <li>Month 3+: ${fullPrice} per {billingPeriod}</li>
     </ul>
   </div>
   ```

---

### Phase 4: Database Schema Updates

#### Firestore Structure Changes

**Users/{uid}/knowledgebases/{company}/subscriptionData**:
```typescript
{
  subscriptionId: string,
  subscriptionScheduleId: string, // NEW - for phase management
  stripeCustomerId: string,
  employeeId: string,
  billingCycle: 'monthly' | 'yearly',
  subscriptionType: string,
  status: 'active' | 'canceled' | 'past_due',
  
  // Pricing info
  amount: number, // Full price
  currency: 'usd',
  
  // Coupon tracking
  couponCode: string | null, // NEW
  hasUsedCoupon: boolean, // NEW
  
  // Phase tracking
  currentPhase: 'trial' | 'discounted' | 'full', // NEW
  trialEndDate: Timestamp, // NEW
  discountEndDate: Timestamp | null, // NEW
  
  // Existing fields
  discountAmount: number,
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

---

### Phase 5: Testing Checklist

#### Test Scenarios

1. **New User - No Coupon - Monthly**:
   - [ ] First charge is $1
   - [ ] Second charge (after 1 month) is full price ($39 or $29)
   - [ ] Third charge onwards is full price

2. **New User - With EVIDAH40 - Monthly**:
   - [ ] First charge is $1
   - [ ] Second charge (after 1 month) is discounted ($23.40 or $17.40)
   - [ ] Third charge onwards is full price

3. **New User - No Coupon - Yearly**:
   - [ ] First charge is $1
   - [ ] Second charge (after 1 month) is full yearly price ($348 or $228)
   - [ ] Third charge (after 1 year) is full yearly price

4. **New User - With EVIDAH40 - Yearly**:
   - [ ] First charge is $1
   - [ ] Second charge (after 1 month) is discounted yearly ($208.80 or $136.80)
   - [ ] Third charge (after 1 year) is full yearly price

5. **Edge Cases**:
   - [ ] User cancels during trial month
   - [ ] User cancels during discounted month
   - [ ] Payment fails during trial
   - [ ] Payment fails during discounted phase
   - [ ] User changes plan during trial
   - [ ] User applies coupon after starting trial

---

## Technical Implementation Details

### Option A: Stripe Subscription Schedules (RECOMMENDED)

**Pros**:
- Native Stripe feature
- Handles phase transitions automatically
- Easy to modify/cancel
- Clear in Stripe dashboard

**Implementation**:
```typescript
const schedule = await stripe.subscriptionSchedules.create({
  customer: customerId,
  start_date: 'now',
  end_behavior: 'release',
  phases: [
    {
      // Phase 1: $1 trial for 1 month
      items: [{ price: TRIAL_PRICE_ID }],
      iterations: 1,
    },
    {
      // Phase 2: Discounted or full price for 1 billing cycle
      items: [{ 
        price: couponCode ? DISCOUNTED_PRICE_ID : FULL_PRICE_ID 
      }],
      iterations: 1,
    },
    {
      // Phase 3: Full price forever
      items: [{ price: FULL_PRICE_ID }],
    },
  ],
});
```

### Option B: Manual Phase Management

**Pros**:
- More control
- Can use existing price IDs

**Cons**:
- More complex
- Need to handle transitions manually
- More webhook events to handle

**Implementation**:
```typescript
// Create initial $1 subscription
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: TRIAL_PRICE_ID }],
  metadata: {
    nextPhase: couponCode ? 'discounted' : 'full',
    nextPriceId: couponCode ? DISCOUNTED_PRICE_ID : FULL_PRICE_ID,
    finalPriceId: FULL_PRICE_ID,
  },
});

// In webhook, when subscription renews:
if (metadata.nextPhase) {
  await stripe.subscriptions.update(subscriptionId, {
    items: [{ price: metadata.nextPriceId }],
    metadata: {
      nextPhase: 'full',
      nextPriceId: metadata.finalPriceId,
    },
  });
}
```

---

## Recommendation

**Use Option A (Subscription Schedules)** because:
1. Cleaner implementation
2. Less error-prone
3. Better user experience in Stripe dashboard
4. Automatic phase transitions
5. Easy to modify if needed

---

## Migration Strategy

### For Existing Users
- **Do NOT change existing subscriptions**
- Only apply new pricing to new signups
- Optionally: Offer existing users a "restart with new pricing" option

### Rollout Plan
1. Set up new Stripe prices in TEST mode
2. Implement and test all code changes in development
3. Test thoroughly with Stripe test cards
4. Set up new Stripe prices in LIVE mode
5. Deploy to production
6. Monitor first few signups closely
7. Send announcement email about new pricing

---

## Environment Variables Needed

Add to `.env`:
```bash
# Trial pricing (same for all plans)
STRIPE_PRICE_TRIAL_MONTHLY_TEST=price_xxx
STRIPE_PRICE_TRIAL_MONTHLY_LIVE=price_xxx

# Discounted pricing (40% off)
STRIPE_PRICE_EVIDAH_Q_MONTHLY_DISCOUNTED_TEST=price_xxx
STRIPE_PRICE_EVIDAH_Q_MONTHLY_DISCOUNTED_LIVE=price_xxx
STRIPE_PRICE_EVIDAH_Q_YEARLY_DISCOUNTED_TEST=price_xxx
STRIPE_PRICE_EVIDAH_Q_YEARLY_DISCOUNTED_LIVE=price_xxx

STRIPE_PRICE_CHARLIE_MONTHLY_DISCOUNTED_TEST=price_xxx
STRIPE_PRICE_CHARLIE_MONTHLY_DISCOUNTED_LIVE=price_xxx
# ... etc for other employees
```

---

## Timeline Estimate

- **Stripe Setup**: 1-2 hours
- **Backend Implementation**: 4-6 hours
- **Frontend Updates**: 3-4 hours
- **Testing**: 4-6 hours
- **Documentation**: 1-2 hours
- **Total**: 13-20 hours

---

## Questions to Clarify

1. **Yearly Subscriptions**: Should the $1 trial be for 1 month, then charge the yearly price? Or should it be $1 for the first year?
   - **Recommended**: $1 for first month, then yearly price (keeps it simple)

2. **Coupon Expiry**: Should EVIDAH40 have an expiration date?
   - **Recommended**: Keep it active indefinitely for now

3. **Multiple Coupons**: Can users stack coupons or use different codes?
   - **Recommended**: One coupon per subscription, applied at signup only

4. **Existing Users**: What happens to users who already subscribed?
   - **Recommended**: Grandfather them in, don't change their pricing

5. **Refunds**: If someone cancels during trial, do they get refunded the $1?
   - **Recommended**: No refunds for $1 trial (too small to matter)

6. **Plan Changes**: If user upgrades/downgrades during trial, what happens?
   - **Recommended**: Reset to new plan's pricing schedule

---

## Success Metrics

Track these metrics after launch:
- Conversion rate (visitors → paid users)
- Trial-to-paid conversion rate
- Coupon usage rate
- Average revenue per user (ARPU)
- Churn rate by cohort (trial, discounted, full price)
- Customer lifetime value (LTV)

---

## Risk Mitigation

1. **Test thoroughly** with Stripe test mode
2. **Monitor closely** for first week after launch
3. **Have rollback plan** ready
4. **Set up alerts** for failed payments
5. **Prepare customer support** for pricing questions
6. **Document everything** for future reference
