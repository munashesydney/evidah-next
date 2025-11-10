import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getEvidahQMonthlyPriceId, isProduction } from '@/lib/stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const auth = getAuth();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      fullName, 
      country, 
      couponCode, 
      customerId, 
      paymentMethodId,
      onboardingData,
      plan = 'evidah_q',
      billingPeriod = 'monthly',
      selectedCompany = 'default'
    } = body;

    // Validation
    if (!email || !fullName || !customerId || !paymentMethodId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    
    // Get the correct price ID based on plan and billing period
    const priceIdEnvKey = `STRIPE_PRICE_${plan.toUpperCase()}_${billingPeriod.toUpperCase()}_${isProduction() ? 'LIVE' : 'TEST'}`;
    const priceId = process.env[priceIdEnvKey];
    
    if (!priceId) {
      console.error(`Price ID not found for: ${priceIdEnvKey}`);
      return NextResponse.json(
        { error: `Price configuration not found for ${plan} ${billingPeriod}` },
        { status: 400 }
      );
    }

    // Set payment method as default
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Calculate base amount based on plan (needed for discount calculation)
    let baseAmount: number;
    if (plan === 'evidah_q') {
      baseAmount = billingPeriod === 'yearly' ? 348 : 39;
    } else {
      // Individual employees
      baseAmount = billingPeriod === 'yearly' ? 228 : 29;
    }

    // Prepare subscription params
    const subscriptionParams: any = {
      customer: customerId,
      items: [{ price: priceId }],
      metadata: {
        email,
        fullName,
        country: country || '',
        employeeId: plan === 'evidah_q' ? 'evidah-q' : plan,
        subscriptionType: `${plan}_bundle`,
        billingCycle: billingPeriod,
        selectedCompany: selectedCompany,
        industry: onboardingData?.industry || '',
        websiteUrl: onboardingData?.websiteUrl || '',
      },
    };

    // Apply coupon if provided
    let discountAmount = 0;
    if (couponCode && couponCode.toUpperCase() === 'EVIDAH40') {
      try {
        const promotionCodes = await stripe.promotionCodes.list({
          code: 'EVIDAH40',
          active: true,
          limit: 1,
        });

        if (promotionCodes.data.length > 0) {
          subscriptionParams.discounts = [{ promotion_code: promotionCodes.data[0].id }];
          // 40% discount calculated from base amount
          discountAmount = Math.round(baseAmount * 0.4 * 100) / 100;
        }
      } catch (error) {
        console.error('Error validating coupon:', error);
      }
    }

    // Create subscription (this will charge the customer immediately)
    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Get or create user in Firebase
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (authError: any) {
      if (authError.code === 'auth/user-not-found') {
        const tempPassword = generateTempPassword();
        userRecord = await auth.createUser({
          email,
          password: tempPassword,
          displayName: fullName,
          emailVerified: true,
        });
      } else {
        throw authError;
      }
    }

    const uid = userRecord.uid;

    // Create or update user document
    const userRef = db.collection('Users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        uid,
        email,
        name: fullName,
        surname: fullName,
        selectedCompany,
        stripeCustomerId: customerId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        accountCreatedVia: 'evidah_q_subscription',
      });
    } else {
      await userRef.update({
        stripeCustomerId: customerId,
        updatedAt: Timestamp.now(),
      });
    }

    // Create or update knowledgebase
    const knowledgebaseRef = db.collection('Users').doc(uid).collection('knowledgebases').doc(selectedCompany);
    const knowledgebaseDoc = await knowledgebaseRef.get();

    const knowledgebaseData: any = {
      name: onboardingData?.websiteUrl || 'My Company',
      website: onboardingData?.websiteUrl || '',
      industry: onboardingData?.industry || '',
      updatedAt: Timestamp.now(),
      // Set employee access based on plan
      charlie: plan === 'evidah_q' || plan === 'charlie',
      marquavious: plan === 'evidah_q' || plan === 'marquavious',
      emma: plan === 'evidah_q' || plan === 'emma',
      sungWen: plan === 'evidah_q' || plan === 'sung_wen',
      evidahQ: plan === 'evidah_q',
      onboardingDone: false,
    };

    if (!knowledgebaseDoc.exists) {
      knowledgebaseData.createdAt = Timestamp.now();
      await knowledgebaseRef.set(knowledgebaseData);
    } else {
      await knowledgebaseRef.update(knowledgebaseData);
    }

    // Save subscription data (baseAmount already calculated above)
    const subscriptionData = {
      subscriptionId: subscription.id,
      stripeCustomerId: customerId,
      employeeId: plan === 'evidah_q' ? 'evidah-q' : plan,
      billingCycle: billingPeriod,
      subscriptionType: `${plan}_bundle`,
      status: 'active',
      amount: baseAmount,
      currency: 'usd',
      couponCode: couponCode || '',
      discountAmount: discountAmount,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Update access flags based on plan
    const accessUpdates: any = {
      subscriptionData: subscriptionData,
    };
    
    if (plan === 'evidah_q') {
      accessUpdates.evidahQ = true;
      accessUpdates.charlie = true;
      accessUpdates.marquavious = true;
      accessUpdates.emma = true;
      accessUpdates.sungWen = true;
    } else if (plan === 'charlie') {
      accessUpdates.charlie = true;
    } else if (plan === 'marquavious') {
      accessUpdates.marquavious = true;
    } else if (plan === 'emma') {
      accessUpdates.emma = true;
    } else if (plan === 'sung_wen') {
      accessUpdates.sungWen = true;
    }
    
    await knowledgebaseRef.update(accessUpdates);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      uid,
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

function generateTempPassword(): string {
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
}
