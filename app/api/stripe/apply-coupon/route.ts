import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { couponCode, billingPeriod = 'monthly' } = body;

    if (!couponCode) {
      return NextResponse.json(
        { error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Base price depends on billing period and plan
    const { plan = 'evidah_q' } = body;
    
    let BASE_PRICE;
    if (plan === 'evidah_q') {
      BASE_PRICE = billingPeriod === 'yearly' ? 348 : 39;
    } else {
      // Individual employees
      BASE_PRICE = billingPeriod === 'yearly' ? 228 : 29;
    }

    // Fast-path: If code is EVIDAH40, accept and apply 40% off even if Stripe isn't configured yet
    if (couponCode.toUpperCase() === 'EVIDAH40') {
      const discountPercent = 40;
      const discountAmount = Math.round((BASE_PRICE * discountPercent) ) / 100; // keep double rounding safety below
      const finalPrice = BASE_PRICE - (BASE_PRICE * discountPercent) / 100;

      return NextResponse.json({
        valid: true,
        discountAmount: Math.round(finalPrice !== undefined ? ((BASE_PRICE - finalPrice) * 100) : (BASE_PRICE * 0.4 * 100)) / 100,
        discountPercent,
        finalPrice: Math.round(finalPrice * 100) / 100,
        couponCode: 'EVIDAH40',
      });
    }

    // Validate coupon code - expand coupon to get full details
    const promotionCodes = await stripe.promotionCodes.list({
      code: couponCode.toUpperCase(),
      active: true,
      limit: 1,
      expand: ['data.coupon'],
    });

    if (promotionCodes.data.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired coupon code' },
        { status: 400 }
      );
    }

    const promotionCode = promotionCodes.data[0];
    
    // Retrieve the coupon object
    // Type assertion needed because Stripe types may not include expanded coupon
    const couponIdOrObject = (promotionCode as any).coupon;
    let coupon: any = null;
    if (couponIdOrObject) {
      if (typeof couponIdOrObject === 'string') {
        // If it's just an ID, retrieve the full coupon
        coupon = await stripe.coupons.retrieve(couponIdOrObject);
      } else {
        // If it's already expanded, use it directly
        coupon = couponIdOrObject;
      }
    }

    if (!coupon) {
      return NextResponse.json(
        { error: 'Coupon details could not be loaded' },
        { status: 400 }
      );
    }

    // Calculate discount for generic coupon types
    let discountAmount = 0;
    let discountPercent = 0;

    const percentOff = (coupon as any).percent_off as number | undefined;
    const amountOff = (coupon as any).amount_off as number | undefined;

    if (typeof percentOff === 'number') {
      discountPercent = percentOff;
      discountAmount = (BASE_PRICE * discountPercent) / 100;
    } else if (typeof amountOff === 'number') {
      discountAmount = amountOff / 100; // Convert from cents
    }

    const finalPrice = BASE_PRICE - discountAmount;

    return NextResponse.json({
      valid: true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      discountPercent,
      finalPrice: Math.round(finalPrice * 100) / 100,
      couponCode: couponCode.toUpperCase(),
    });
  } catch (error: any) {
    console.error('Error applying coupon:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate coupon code' },
      { status: 500 }
    );
  }
}

