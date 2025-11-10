# EvidahQ Pricing Summary

## Plans

### Monthly Plan
- **Price:** $39/month
- **Billed:** Monthly
- **Total per year:** $468

### Yearly Plan
- **Price:** $348/year
- **Equivalent:** $29/month
- **Savings:** $120/year (25.6% off vs monthly)
- **Billed:** Annually

---

## With EVIDAH40 Coupon (40% off first payment)

### Monthly Plan + Coupon
- **First month:** $23.40 (40% off)
- **Recurring:** $39/month
- **Discount:** $15.60 off first month

### Yearly Plan + Coupon
- **First year:** $208.80 (40% off)
- **Recurring:** $348/year
- **Discount:** $139.20 off first year

---

## Checkout Display

### Monthly Checkout
```
EvidahQ
Billed Monthly
$39.00/month
```

### Yearly Checkout
```
EvidahQ
Billed Yearly
$29/month • Save $120
$348.00/year
```

### With Coupon Applied
```
Order Summary:
Subtotal: $348.00 (or $39.00)
Discount: -$139.20 (or -$15.60)
Total: $208.80 (or $23.40)
```

---

## Test Links

### Monthly
```
http://localhost:3000/checkout?plan=evidah_q&billing=monthly&company=default
```

### Yearly
```
http://localhost:3000/checkout?plan=evidah_q&billing=yearly&company=default
```

---

## Stripe Price IDs Required

Make sure these are configured in `.env`:

```env
# Monthly
STRIPE_PRICE_EVIDAH_Q_MONTHLY_TEST=price_1Rydo6I0r9P5XBFe...
STRIPE_PRICE_EVIDAH_Q_MONTHLY_LIVE=price_live_...

# Yearly
STRIPE_PRICE_EVIDAH_Q_YEARLY_TEST=price_1Rydp0I0r9P5XBFe...
STRIPE_PRICE_EVIDAH_Q_YEARLY_LIVE=price_live_...
```

**Important:** Make sure the Stripe price IDs are configured for:
- Monthly: $39.00
- Yearly: $348.00

---

## Value Proposition

### Why Choose Yearly?
- **Save $120** compared to monthly billing
- **25.6% discount** on annual plan
- **Lock in rate** for the full year
- **Fewer transactions** (billed once per year)

### Breakdown
| Plan | Monthly Cost | Annual Cost | Savings |
|------|-------------|-------------|---------|
| Monthly | $39 | $468 | - |
| Yearly | $29 | $348 | $120 |

**Yearly plan is equivalent to getting 2 months free!**
