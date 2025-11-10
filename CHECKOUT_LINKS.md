# Checkout Links for Testing

## EvidahQ Plans

### Monthly Billing
```
http://localhost:3000/checkout?plan=evidah_q&billing=monthly&company=default
```

**Details:**
- Plan: EvidahQ Bundle
- Price: $39/month
- Billing: Monthly
- Company: default

**With Coupon (40% off):**
- First month: $23.40
- Recurring: $39/month

---

### Yearly Billing
```
http://localhost:3000/checkout?plan=evidah_q&billing=yearly&company=default
```

**Details:**
- Plan: EvidahQ Bundle
- Price: $348/year ($29/month equivalent)
- Billing: Yearly
- Company: default
- Savings: $120/year vs monthly ($468 - $348)

**With Coupon (40% off):**
- First year: $208.80
- Recurring: $348/year

---

## Query Parameters

### Available Parameters
- `plan` - The subscription plan (default: `evidah_q`)
  - Options: `evidah_q`, `charlie`, `marquavious`, `emma`, `sung_wen`
- `billing` - The billing period (default: `monthly`)
  - Options: `monthly`, `yearly`
- `company` - The selected company/knowledgebase (default: `default`)
  - Can be any string identifier

### Examples

**Custom company:**
```
http://localhost:3000/checkout?plan=evidah_q&billing=monthly&company=my-company
```

**Different plan (when implemented):**
```
http://localhost:3000/checkout?plan=charlie&billing=monthly&company=default
```

---

## Environment Variables Required

Make sure these are set in your `.env`:

```env
# Monthly prices
STRIPE_PRICE_EVIDAH_Q_MONTHLY_TEST=price_1Rydo6I0r9P5XBFe...
STRIPE_PRICE_EVIDAH_Q_MONTHLY_LIVE=price_live_...

# Yearly prices
STRIPE_PRICE_EVIDAH_Q_YEARLY_TEST=price_1Rydp0I0r9P5XBFe...
STRIPE_PRICE_EVIDAH_Q_YEARLY_LIVE=price_live_...
```

---

## What Gets Stored

### Subscription Metadata (Stripe)
```javascript
{
  email: "user@example.com",
  fullName: "John Doe",
  country: "United States",
  employeeId: "evidah-q",
  subscriptionType: "evidah_q_bundle",
  billingCycle: "monthly" | "yearly",
  selectedCompany: "default",
  industry: "...",
  websiteUrl: "..."
}
```

### Firestore (knowledgebase document)
```javascript
{
  subscriptionData: {
    subscriptionId: "sub_xxxxx",
    stripeCustomerId: "cus_xxxxx",
    employeeId: "evidah-q",
    billingCycle: "monthly" | "yearly",
    subscriptionType: "evidah_q_bundle",
    status: "active",
    amount: 39 | 348,
    currency: "usd",
    couponCode: "EVIDAH40" | "",
    discountAmount: 15.6 | 139.2,
    createdAt: Timestamp,
    updatedAt: Timestamp
  },
  evidahQ: true  // Access control flag
}
```

---

## Webhook Behavior

### Subscription Created
- Sets `evidahQ: true` in knowledgebase
- Stores subscription data

### Subscription Updated
- Updates `subscriptionData.status`
- Sets `evidahQ: true` if status is `active` or `trialing`
- Sets `evidahQ: false` if status is `past_due`, `canceled`, etc.

### Subscription Deleted/Canceled
- Sets `subscriptionData.status: "canceled"`
- Sets `evidahQ: false` (disables access)

---

## Testing Checklist

### Monthly Plan
- [ ] Visit monthly checkout link
- [ ] Fill in details
- [ ] Complete payment
- [ ] Verify Firestore: `amount: 39`, `billingCycle: "monthly"`
- [ ] Verify Firestore: `evidahQ: true`
- [ ] Verify Stripe: subscription created with monthly price

### Yearly Plan
- [ ] Visit yearly checkout link
- [ ] Fill in details
- [ ] Complete payment
- [ ] Verify Firestore: `amount: 348`, `billingCycle: "yearly"`
- [ ] Verify Firestore: `evidahQ: true`
- [ ] Verify Stripe: subscription created with yearly price

### With Coupon
- [ ] Apply coupon "EVIDAH40"
- [ ] Verify discounted price shown
- [ ] Complete payment
- [ ] Verify only 1 charge (discounted amount)
- [ ] Verify Firestore: `couponCode: "EVIDAH40"`, `discountAmount: 15.6` (or 139.2 for yearly)

### Webhook Events
- [ ] Cancel subscription in Stripe
- [ ] Verify Firestore: `evidahQ: false`
- [ ] Reactivate subscription in Stripe
- [ ] Verify Firestore: `evidahQ: true`
