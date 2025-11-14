# Stripe Setup Instructions for New Pricing

## Overview
The new pricing structure uses Stripe Subscription Schedules with 3 phases:
1. **Phase 1**: $1 trial for 1 month
2. **Phase 2**: Discounted (if coupon) or full price for 1 billing cycle
3. **Phase 3**: Full price ongoing

## Step 1: Create Stripe Products & Prices

### In Stripe Dashboard (Test Mode First)

#### 1. Create Trial Price ($1/month)
- Go to Products → Create Product
- Name: "Trial Month"
- Price: $1.00 USD
- Billing period: Monthly
- Copy the Price ID (starts with `price_`)
- Save as: `STRIPE_PRICE_TRIAL_MONTHLY_TEST`

#### 2. Create Discounted Prices (40% off)

**For EvidahQ Bundle:**
- Product: "EvidahQ Bundle - Discounted"
- Monthly Price: $23.40 USD (40% off $39)
  - Save Price ID as: `STRIPE_PRICE_EVIDAH_Q_MONTHLY_DISCOUNTED_TEST`
- Yearly Price: $208.80 USD (40% off $348)
  - Save Price ID as: `STRIPE_PRICE_EVIDAH_Q_YEARLY_DISCOUNTED_TEST`

**For Charlie:**
- Product: "Charlie - Discounted"
- Monthly Price: $17.40 USD (40% off $29)
  - Save Price ID as: `STRIPE_PRICE_CHARLIE_MONTHLY_DISCOUNTED_TEST`
- Yearly Price: $136.80 USD (40% off $228)
  - Save Price ID as: `STRIPE_PRICE_CHARLIE_YEARLY_DISCOUNTED_TEST`

**For Marquavious:**
- Product: "Marquavious - Discounted"
- Monthly Price: $17.40 USD (40% off $29)
  - Save Price ID as: `STRIPE_PRICE_MARQUAVIOUS_MONTHLY_DISCOUNTED_TEST`
- Yearly Price: $136.80 USD (40% off $228)
  - Save Price ID as: `STRIPE_PRICE_MARQUAVIOUS_YEARLY_DISCOUNTED_TEST`

**For Emma:**
- Product: "Emma - Discounted"
- Monthly Price: $17.40 USD (40% off $29)
  - Save Price ID as: `STRIPE_PRICE_EMMA_MONTHLY_DISCOUNTED_TEST`
- Yearly Price: $136.80 USD (40% off $228)
  - Save Price ID as: `STRIPE_PRICE_EMMA_YEARLY_DISCOUNTED_TEST`

**For Sung Wen:**
- Product: "Sung Wen - Discounted"
- Monthly Price: $17.40 USD (40% off $29)
  - Save Price ID as: `STRIPE_PRICE_SUNG_WEN_MONTHLY_DISCOUNTED_TEST`
- Yearly Price: $136.80 USD (40% off $228)
  - Save Price ID as: `STRIPE_PRICE_SUNG_WEN_YEARLY_DISCOUNTED_TEST`

#### 3. Keep Existing Full Price IDs
You should already have these configured:
- `STRIPE_PRICE_EVIDAH_Q_MONTHLY_TEST` → $39/month
- `STRIPE_PRICE_EVIDAH_Q_YEARLY_TEST` → $348/year
- `STRIPE_PRICE_CHARLIE_MONTHLY_TEST` → $29/month
- `STRIPE_PRICE_CHARLIE_YEARLY_TEST` → $228/year
- etc.

---

## Step 2: Update Environment Variables

Add these to your `.env` file:

```bash
# ============================================
# TRIAL PRICING (same for all plans)
# ============================================
STRIPE_PRICE_TRIAL_MONTHLY_TEST=price_xxxxxxxxxxxxx
STRIPE_PRICE_TRIAL_MONTHLY_LIVE=price_xxxxxxxxxxxxx

# ============================================
# DISCOUNTED PRICING (40% off) - TEST MODE
# ============================================

# EvidahQ Bundle
STRIPE_PRICE_EVIDAH_Q_MONTHLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx
STRIPE_PRICE_EVIDAH_Q_YEARLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx

# Charlie
STRIPE_PRICE_CHARLIE_MONTHLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx
STRIPE_PRICE_CHARLIE_YEARLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx

# Marquavious
STRIPE_PRICE_MARQUAVIOUS_MONTHLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx
STRIPE_PRICE_MARQUAVIOUS_YEARLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx

# Emma
STRIPE_PRICE_EMMA_MONTHLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx
STRIPE_PRICE_EMMA_YEARLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx

# Sung Wen
STRIPE_PRICE_SUNG_WEN_MONTHLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx
STRIPE_PRICE_SUNG_WEN_YEARLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx

# ============================================
# DISCOUNTED PRICING (40% off) - LIVE MODE
# ============================================

# EvidahQ Bundle
STRIPE_PRICE_EVIDAH_Q_MONTHLY_DISCOUNTED_LIVE=price_xxxxxxxxxxxxx
STRIPE_PRICE_EVIDAH_Q_YEARLY_DISCOUNTED_LIVE=price_xxxxxxxxxxxxx

# Charlie
STRIPE_PRICE_CHARLIE_MONTHLY_DISCOUNTED_LIVE=price_xxxxxxxxxxxxx
STRIPE_PRICE_CHARLIE_YEARLY_DISCOUNTED_LIVE=price_xxxxxxxxxxxxx

# Marquavious
STRIPE_PRICE_MARQUAVIOUS_MONTHLY_DISCOUNTED_LIVE=price_xxxxxxxxxxxxx
STRIPE_PRICE_MARQUAVIOUS_YEARLY_DISCOUNTED_LIVE=price_xxxxxxxxxxxxx

# Emma
STRIPE_PRICE_EMMA_MONTHLY_DISCOUNTED_LIVE=price_xxxxxxxxxxxxx
STRIPE_PRICE_EMMA_YEARLY_DISCOUNTED_LIVE=price_xxxxxxxxxxxxx

# Sung Wen
STRIPE_PRICE_SUNG_WEN_MONTHLY_DISCOUNTED_LIVE=price_xxxxxxxxxxxxx
STRIPE_PRICE_SUNG_WEN_YEARLY_DISCOUNTED_LIVE=price_xxxxxxxxxxxxx
```

---

## Step 3: Configure Webhook Events

In Stripe Dashboard → Developers → Webhooks:

### Add these event types to your webhook endpoint:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `subscription_schedule.updated` ← **NEW**
- `subscription_schedule.completed` ← **NEW**
- `invoice.payment_succeeded`
- `invoice.payment_failed`

---

## Step 4: Testing Checklist

### Test in Stripe Test Mode

Use Stripe test cards: https://stripe.com/docs/testing

#### Test Case 1: Monthly Plan - No Coupon
1. Go to checkout with monthly plan
2. Don't enter coupon code
3. Complete payment with test card `4242 4242 4242 4242`
4. Verify:
   - [ ] Charged $1.00 immediately
   - [ ] Subscription schedule created with 3 phases
   - [ ] Phase 1: $1 for 1 month
   - [ ] Phase 2: $39 (or $29) for 1 month
   - [ ] Phase 3: $39 (or $29) ongoing
   - [ ] User document created in Firestore
   - [ ] Access flags set correctly

#### Test Case 2: Monthly Plan - With EVIDAH40 Coupon
1. Go to checkout with monthly plan
2. Enter coupon code "EVIDAH40"
3. Complete payment with test card
4. Verify:
   - [ ] Charged $1.00 immediately
   - [ ] Subscription schedule created with 3 phases
   - [ ] Phase 1: $1 for 1 month
   - [ ] Phase 2: $23.40 (or $17.40) for 1 month
   - [ ] Phase 3: $39 (or $29) ongoing
   - [ ] Coupon code saved in Firestore
   - [ ] `hasUsedCoupon: true` in Firestore

#### Test Case 3: Yearly Plan - No Coupon
1. Go to checkout with yearly plan
2. Don't enter coupon code
3. Complete payment with test card
4. Verify:
   - [ ] Charged $1.00 immediately
   - [ ] Phase 1: $1 for 1 month
   - [ ] Phase 2: $348 (or $228) for 1 year
   - [ ] Phase 3: $348 (or $228) ongoing yearly

#### Test Case 4: Yearly Plan - With EVIDAH40 Coupon
1. Go to checkout with yearly plan
2. Enter coupon code "EVIDAH40"
3. Complete payment with test card
4. Verify:
   - [ ] Charged $1.00 immediately
   - [ ] Phase 1: $1 for 1 month
   - [ ] Phase 2: $208.80 (or $136.80) for 1 year
   - [ ] Phase 3: $348 (or $228) ongoing yearly

#### Test Case 5: Phase Transitions
Use Stripe's test clock feature to simulate time passing:
1. Create subscription
2. Fast-forward 1 month
3. Verify:
   - [ ] Phase 2 payment processed
   - [ ] Correct amount charged (discounted or full)
   - [ ] Firestore updated with `currentPhase: 'discounted'` or `'full'`
4. Fast-forward another billing cycle
5. Verify:
   - [ ] Phase 3 payment processed
   - [ ] Full price charged
   - [ ] Firestore updated with `currentPhase: 'full'`

#### Test Case 6: Cancellation During Trial
1. Create subscription
2. Cancel immediately
3. Verify:
   - [ ] Subscription canceled
   - [ ] Access flags disabled in Firestore
   - [ ] No further charges

#### Test Case 7: Payment Failure
1. Create subscription
2. Use test card `4000 0000 0000 0341` (requires authentication)
3. Fail the authentication
4. Verify:
   - [ ] Subscription status updated
   - [ ] Webhook received
   - [ ] Error logged

---

## Step 5: Deploy to Production

### After thorough testing in test mode:

1. **Create Live Mode Prices**:
   - Repeat Step 1 in Stripe Live Mode
   - Update `.env` with `_LIVE` price IDs

2. **Update Webhook**:
   - Ensure live webhook endpoint is configured
   - Add all required event types
   - Update `STRIPE_WEBHOOK_SECRET_LIVE` in `.env`

3. **Set Stripe Mode**:
   ```bash
   STRIPE_MODE=live
   ```

4. **Deploy**:
   - Deploy code to production
   - Monitor first few signups closely
   - Check Stripe dashboard for subscription schedules
   - Verify Firestore updates

5. **Monitor**:
   - Watch for webhook errors
   - Check payment success rate
   - Monitor customer support for pricing questions

---

## Step 6: Verify Firestore Structure

After a successful signup, verify the Firestore document structure:

```
Users/{uid}/knowledgebases/{company}/
  subscriptionData: {
    subscriptionId: "sub_xxxxx",
    subscriptionScheduleId: "sub_sched_xxxxx",  // NEW
    stripeCustomerId: "cus_xxxxx",
    employeeId: "evidah-q",
    billingCycle: "monthly",
    subscriptionType: "evidah_q_bundle",
    status: "active",
    amount: 39,
    currency: "usd",
    couponCode: "EVIDAH40",  // or ""
    hasUsedCoupon: true,  // or false
    discountAmount: 15.60,
    currentPhase: "trial",  // NEW
    trialEndDate: Timestamp,  // NEW
    discountEndDate: Timestamp,  // NEW (null if no coupon)
    lastPaymentDate: Timestamp,  // NEW
    lastPaymentAmount: 1.00,  // NEW
    createdAt: Timestamp,
    updatedAt: Timestamp,
  }
```

---

## Troubleshooting

### Issue: "Trial price configuration not found"
**Solution**: Make sure `STRIPE_PRICE_TRIAL_MONTHLY_TEST` (or `_LIVE`) is set in `.env`

### Issue: "Discounted price ID not found"
**Solution**: The code will fall back to full price. Add the discounted price IDs to `.env`

### Issue: Webhook not receiving events
**Solution**: 
1. Check webhook URL is correct
2. Verify webhook secret matches `.env`
3. Check event types are selected in Stripe dashboard
4. Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Issue: Phase not transitioning
**Solution**:
1. Check subscription schedule in Stripe dashboard
2. Verify phases are configured correctly
3. Check webhook logs for `subscription_schedule.updated` events
4. Use Stripe test clock to simulate time

### Issue: Wrong amount charged
**Solution**:
1. Verify price IDs in `.env` match Stripe dashboard
2. Check subscription schedule phases in Stripe
3. Verify coupon code logic in create-subscription API

---

## Rollback Plan

If issues arise in production:

1. **Quick Fix**: Set `STRIPE_MODE=test` to stop live charges
2. **Revert Code**: Deploy previous version without subscription schedules
3. **Grandfather Users**: Existing users on new pricing keep their schedules
4. **New Signups**: Will use old pricing until fixed

---

## Support Resources

- Stripe Subscription Schedules Docs: https://stripe.com/docs/billing/subscriptions/subscription-schedules
- Stripe Test Cards: https://stripe.com/docs/testing
- Stripe Webhooks: https://stripe.com/docs/webhooks
- Stripe CLI: https://stripe.com/docs/stripe-cli

---

## Success Metrics to Track

After launch, monitor:
- Trial-to-paid conversion rate
- Coupon usage rate (% using EVIDAH40)
- Average revenue per user (ARPU)
- Churn rate by cohort (trial, discounted, full)
- Payment failure rate
- Customer support tickets about pricing

---

## Next Steps

1. [ ] Create all Stripe prices in test mode
2. [ ] Update `.env` with test price IDs
3. [ ] Test all scenarios with Stripe test cards
4. [ ] Create all Stripe prices in live mode
5. [ ] Update `.env` with live price IDs
6. [ ] Deploy to production
7. [ ] Monitor first 10 signups closely
8. [ ] Send announcement about new pricing
