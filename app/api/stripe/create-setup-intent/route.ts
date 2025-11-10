import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, fullName, onboardingData } = body;

    // Validation
    if (!email || !fullName) {
      return NextResponse.json(
        { error: 'Missing required fields: email, fullName' },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Create or retrieve customer
    let customer;
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({
        email,
        name: fullName,
        metadata: {
          industry: onboardingData?.industry || '',
          websiteUrl: onboardingData?.websiteUrl || '',
        },
      });
    }

    // Create setup intent for saving payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      usage: 'off_session', // For recurring payments
      metadata: {
        email,
        fullName,
        industry: onboardingData?.industry || '',
        websiteUrl: onboardingData?.websiteUrl || '',
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    });
  } catch (error: any) {
    console.error('Error creating setup intent:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create setup intent' },
      { status: 500 }
    );
  }
}
