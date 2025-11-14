# Create $0 Free Trial Price in Stripe

## Quick Steps

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com/test/products

2. **Click "Add product"**

3. **Fill in the details**:
   - Name: `3-Day Free Trial`
   - Description: `Free trial for 3 days`
   - Pricing model: `Standard pricing`
   - Price: `0.00`
   - Billing period: `Monthly`
   - Currency: `USD`

4. **Click "Save product"**

5. **Copy the Price ID** (looks like `price_1ABC123...`)

6. **Update `.env` file**:
   ```bash
   STRIPE_PRICE_FREE_TRIAL_TEST=price_xxxxxxxxxxxxx
   ```
   Replace `price_xxxxxxxxxxxxx` with the actual price ID

7. **Restart your dev server**

## Using Stripe CLI (Faster)

```bash
stripe prices create \
  --unit-amount=0 \
  --currency=usd \
  --recurring[interval]=month \
  --product-data[name]="3-Day Free Trial"
```

Copy the returned price ID to your `.env` file.

## What You Already Have

✅ $1 trial price: `price_1STDhYI0r9P5XBFeFXQSOSbn`
✅ Discounted prices for EvidahQ
❌ $0 free trial price (need to create)

## New Pricing Flow

1. **Days 1-3**: FREE ($0)
2. **Days 4-30**: $1.00
3. **Month 2**: $23.40 (with EVIDAH40) or $39 (without)
4. **Month 3+**: $39 regular price

## After Creating the Price

Test the checkout flow:
1. Go to checkout page
2. Should see "FREE for 3 days"
3. Should see pricing breakdown showing all 4 phases
4. Complete signup with test card: `4242 4242 4242 4242`
5. Check Stripe dashboard for subscription schedule with 4 phases
