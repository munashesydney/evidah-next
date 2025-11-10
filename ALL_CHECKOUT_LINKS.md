# Complete Checkout Links - All Employees

## Pricing Structure

### EvidahQ Bundle (All Employees)
- **Monthly:** $39/month
- **Yearly:** $348/year ($29/month equivalent) - Save $120/year

### Individual Employees
- **Monthly:** $29/month
- **Yearly:** $228/year ($19/month equivalent) - Save $120/year

### With EVIDAH40 Coupon (40% off first payment)
- **EvidahQ Monthly:** $23.40 first month
- **EvidahQ Yearly:** $208.80 first year
- **Individual Monthly:** $17.40 first month
- **Individual Yearly:** $136.80 first year

---

## EvidahQ Bundle (All Employees)

### Monthly
```
http://localhost:3000/checkout?plan=evidah_q&billing=monthly&company=default
```

### Yearly
```
http://localhost:3000/checkout?plan=evidah_q&billing=yearly&company=default
```

**Includes access to:**
- Charlie (Customer Support Specialist)
- Marquavious (Live Chat Specialist)
- Emma (Knowledge Management Expert)
- Sung Wen (Training Specialist)
- EvidahQ (Complete Bundle)

---

## Charlie (Customer Support Specialist)

### Monthly
```
http://localhost:3000/checkout?plan=charlie&billing=monthly&company=default
```

### Yearly
```
http://localhost:3000/checkout?plan=charlie&billing=yearly&company=default
```

**Access:** Charlie only

---

## Marquavious (Live Chat Specialist)

### Monthly
```
http://localhost:3000/checkout?plan=marquavious&billing=monthly&company=default
```

### Yearly
```
http://localhost:3000/checkout?plan=marquavious&billing=yearly&company=default
```

**Access:** Marquavious only

---

## Emma (Knowledge Management Expert)

### Monthly
```
http://localhost:3000/checkout?plan=emma&billing=monthly&company=default
```

### Yearly
```
http://localhost:3000/checkout?plan=emma&billing=yearly&company=default
```

**Access:** Emma only

---

## Sung Wen (Training Specialist)

### Monthly
```
http://localhost:3000/checkout?plan=sung_wen&billing=monthly&company=default
```

### Yearly
```
http://localhost:3000/checkout?plan=sung_wen&billing=yearly&company=default
```

**Access:** Sung Wen only

---

## Environment Variables Required

Make sure these price IDs are configured in `.env`:

```env
# EvidahQ Bundle
STRIPE_PRICE_EVIDAH_Q_MONTHLY_TEST=price_...
STRIPE_PRICE_EVIDAH_Q_YEARLY_TEST=price_...

# Charlie
STRIPE_PRICE_CHARLIE_MONTHLY_TEST=price_...
STRIPE_PRICE_CHARLIE_YEARLY_TEST=price_...

# Marquavious
STRIPE_PRICE_MARQUAVIOUS_MONTHLY_TEST=price_...
STRIPE_PRICE_MARQUAVIOUS_YEARLY_TEST=price_...

# Emma
STRIPE_PRICE_EMMA_MONTHLY_TEST=price_...
STRIPE_PRICE_EMMA_YEARLY_TEST=price_...

# Sung Wen
STRIPE_PRICE_SUNG_WEN_MONTHLY_TEST=price_...
STRIPE_PRICE_SUNG_WEN_YEARLY_TEST=price_...
```

**Note:** Price IDs should be configured in Stripe for:
- EvidahQ: $39/month, $348/year
- Individual employees: $29/month, $228/year

---

## Firestore Access Flags

### EvidahQ Bundle
```javascript
{
  evidahQ: true,
  charlie: true,
  marquavious: true,
  emma: true,
  sungWen: true
}
```

### Individual Employee (e.g., Charlie)
```javascript
{
  charlie: true,
  marquavious: false,
  emma: false,
  sungWen: false,
  evidahQ: false
}
```

---

## Testing Checklist

### EvidahQ Bundle
- [ ] Monthly checkout works
- [ ] Yearly checkout works
- [ ] All 5 access flags set to `true` in Firestore
- [ ] Correct pricing displayed
- [ ] Coupon applies correctly

### Individual Employees
For each employee (Charlie, Marquavious, Emma, Sung Wen):
- [ ] Monthly checkout works
- [ ] Yearly checkout works
- [ ] Only that employee's flag set to `true` in Firestore
- [ ] Correct pricing ($29/month or $228/year)
- [ ] Coupon applies correctly

### Webhook Events
- [ ] Subscription update sets correct access flags
- [ ] Subscription cancellation disables correct access flags
- [ ] Multiple subscriptions can coexist (e.g., Charlie + Emma)

---

## Subscription Metadata

Each subscription stores:
```javascript
{
  email: "user@example.com",
  fullName: "John Doe",
  country: "United States",
  employeeId: "charlie" | "marquavious" | "emma" | "sung_wen" | "evidah-q",
  subscriptionType: "charlie_bundle" | "evidah_q_bundle" | etc.,
  billingCycle: "monthly" | "yearly",
  selectedCompany: "default",
  industry: "...",
  websiteUrl: "..."
}
```

This metadata is used by webhooks to update the correct access flags.

---

## Quick Test Commands

### Test All Monthly Plans
```bash
# EvidahQ
open http://localhost:3000/checkout?plan=evidah_q&billing=monthly&company=default

# Charlie
open http://localhost:3000/checkout?plan=charlie&billing=monthly&company=default

# Marquavious
open http://localhost:3000/checkout?plan=marquavious&billing=monthly&company=default

# Emma
open http://localhost:3000/checkout?plan=emma&billing=monthly&company=default

# Sung Wen
open http://localhost:3000/checkout?plan=sung_wen&billing=monthly&company=default
```

### Test All Yearly Plans
```bash
# EvidahQ
open http://localhost:3000/checkout?plan=evidah_q&billing=yearly&company=default

# Charlie
open http://localhost:3000/checkout?plan=charlie&billing=yearly&company=default

# Marquavious
open http://localhost:3000/checkout?plan=marquavious&billing=yearly&company=default

# Emma
open http://localhost:3000/checkout?plan=emma&billing=yearly&company=default

# Sung Wen
open http://localhost:3000/checkout?plan=sung_wen&billing=yearly&company=default
```
