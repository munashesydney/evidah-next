# Quick Start - New Pricing Implementation

## 🚀 Get Started in 5 Steps

### 1. Create Stripe Prices (15 min)

In Stripe Dashboard → Products, create these prices:

**Required:**
- Trial: $1.00/month → Save as `STRIPE_PRICE_TRIAL_MONTHLY_TEST`
- EvidahQ Discounted Monthly: $23.40 → Save as `STRIPE_PRICE_EVIDAH_Q_MONTHLY_DISCOUNTED_TEST`
- EvidahQ Discounted Yearly: $208.80 → Save as `STRIPE_PRICE_EVIDAH_Q_YEARLY_DISCOUNTED_TEST`

**Optional (for other plans):**
- Charlie, Marquavious, Emma, Sung Wen discounted prices

### 2. Update .env (2 min)

```bash
STRIPE_PRICE_TRIAL_MONTHLY_TEST=price_xxxxxxxxxxxxx
STRIPE_PRICE_EVIDAH_Q_MONTHLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx
STRIPE_PRICE_EVIDAH_Q_YEARLY_DISCOUNTED_TEST=price_xxxxxxxxxxxxx
```

### 3. Configure Webhook (3 min)

Stripe Dashboard → Developers → Webhooks

Add these events:
- `subscription_schedule.updated`
- `subscription_schedule.completed`

### 4. Test (30 min)

Use test card: `4242 4242 4242 4242`

Test these scenarios:
1. Monthly without coupon → $1, then $39
2. Monthly with EVIDAH40 → $1, then $23.40, then $39
3. Yearly with EVIDAH40 → $1, then $208.80, then $348

### 5. Go Live

1. Create same prices in Stripe Live mode
2. Update `.env` with `_LIVE` price IDs
3. Set `STRIPE_MODE=live`
4. Deploy!

---

## 📊 Pricing Breakdown

| Plan | Month 1 | Month 2 (no coupon) | Month 2 (EVIDAH40) | Month 3+ |
|------|---------|---------------------|-------------------|----------|
| EvidahQ Monthly | $1 | $39 | $23.40 | $39 |
| EvidahQ Yearly | $1 | $348 | $208.80 | $348 |
| Individual Monthly | $1 | $29 | $17.40 | $29 |
| Individual Yearly | $1 | $228 | $136.80 | $228 |

---

## 🔍 Quick Verification

After a test signup, check:

**Stripe Dashboard:**
- Subscription has a "Schedule" with 3 phases
- First charge is $1.00

**Firestore:**
```javascript
subscriptionData: {
  currentPhase: "trial",
  hasUsedCoupon: true/false,
  subscriptionScheduleId: "sub_sched_xxx"
}
```

---

## 📚 Full Documentation

- `IMPLEMENTATION_COMPLETE.md` - Complete overview
- `STRIPE_SETUP_INSTRUCTIONS.md` - Detailed Stripe setup
- `.env.stripe.example` - All environment variables

---

## ⚠️ Important Notes

- Existing users are NOT affected (grandfathered in)
- Coupon can only be applied at signup
- If discounted price not found, falls back to full price
- Users can cancel anytime during trial

---

## 🆘 Need Help?

**Common Issues:**

1. **"Trial price configuration not found"**
   - Add `STRIPE_PRICE_TRIAL_MONTHLY_TEST` to `.env`

2. **Coupon not applying discount**
   - Check discounted price IDs are in `.env`
   - Verify price IDs match Stripe dashboard

3. **Webhook not working**
   - Add `subscription_schedule.*` events
   - Verify webhook secret in `.env`

---

That's it! You're ready to test the new pricing. 🎉
