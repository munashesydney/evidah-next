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

    // Calculate base amount based on plan
    let baseAmount: number;
    let discountedAmount: number;
    if (plan === 'evidah_q') {
      baseAmount = billingPeriod === 'yearly' ? 348 : 39;
      discountedAmount = billingPeriod === 'yearly' ? 208.80 : 23.40; // 40% off
    } else {
      // Individual employees
      baseAmount = billingPeriod === 'yearly' ? 228 : 29;
      discountedAmount = billingPeriod === 'yearly' ? 136.80 : 17.40; // 40% off
    }

    // Get free trial price ID ($0 for 3 days)
    const freeTrialPriceIdKey = `STRIPE_PRICE_FREE_TRIAL_${isProduction() ? 'LIVE' : 'TEST'}`;
    const freeTrialPriceId = process.env[freeTrialPriceIdKey];
    
    if (!freeTrialPriceId) {
      console.error(`Free trial price ID not found: ${freeTrialPriceIdKey}`);
      return NextResponse.json(
        { error: 'Free trial price configuration not found' },
        { status: 400 }
      );
    }

    // Get trial price ID ($1 for rest of first month)
    const trialPriceIdKey = `STRIPE_PRICE_TRIAL_MONTHLY_${isProduction() ? 'LIVE' : 'TEST'}`;
    const trialPriceId = process.env[trialPriceIdKey];
    
    if (!trialPriceId) {
      console.error(`Trial price ID not found: ${trialPriceIdKey}`);
      return NextResponse.json(
        { error: 'Trial price configuration not found' },
        { status: 400 }
      );
    }

    // Determine if coupon is valid
    const hasCoupon = couponCode && couponCode.toUpperCase() === 'EVIDAH40';
    let discountAmount = 0;
    
    if (hasCoupon) {
      discountAmount = Math.round((baseAmount - discountedAmount) * 100) / 100;
    }

    // Get discounted price ID if coupon is used
    let secondPhasePriceId = priceId; // Default to full price
    if (hasCoupon) {
      const discountedPriceIdKey = `STRIPE_PRICE_${plan.toUpperCase()}_${billingPeriod.toUpperCase()}_DISCOUNTED_${isProduction() ? 'LIVE' : 'TEST'}`;
      const discountedPriceId = process.env[discountedPriceIdKey];
      
      if (discountedPriceId) {
        secondPhasePriceId = discountedPriceId;
      } else {
        console.warn(`Discounted price ID not found: ${discountedPriceIdKey}, using full price`);
      }
    }

    // Metadata for tracking
    const metadata = {
      email,
      fullName,
      country: country || '',
      employeeId: plan === 'evidah_q' ? 'evidah-q' : plan,
      subscriptionType: `${plan}_bundle`,
      billingCycle: billingPeriod,
      selectedCompany: selectedCompany,
      industry: onboardingData?.industry || '',
      websiteUrl: onboardingData?.websiteUrl || '',
      couponCode: hasCoupon ? 'EVIDAH40' : '',
      hasUsedCoupon: hasCoupon ? 'true' : 'false',
    };

    // Calculate phase end dates (timestamps in seconds)
    const nowTimestamp = Math.floor(Date.now() / 1000);
    const threeDaysLater = nowTimestamp + (3 * 24 * 60 * 60); // 3 days free
    const thirtyDaysLater = nowTimestamp + (30 * 24 * 60 * 60); // End of first month
    const secondBillingCycleEnd = billingPeriod === 'yearly' 
      ? thirtyDaysLater + (365 * 24 * 60 * 60) // 1 year after first month
      : thirtyDaysLater + (30 * 24 * 60 * 60); // 1 month after first month

    // Create subscription schedule with 4 phases
    const schedule = await stripe.subscriptionSchedules.create(
      {
        customer: customerId,
        start_date: nowTimestamp,
        end_behavior: 'release',
        metadata: metadata,
        phases: [
          {
            // Phase 1: 3 days free
            items: [{ price: freeTrialPriceId }],
            end_date: threeDaysLater,
            billing_cycle_anchor: 'phase_start',
            metadata: {
              phase: 'free_trial',
              phaseDescription: '3 days free trial',
            },
          },
          {
            // Phase 2: $1 for rest of first month (days 4-30)
            items: [{ price: trialPriceId }],
            end_date: thirtyDaysLater,
            billing_cycle_anchor: 'phase_start',
            metadata: {
              phase: 'trial',
              phaseDescription: '$1 for rest of first month',
            },
          },
          {
            // Phase 3: Discounted (if coupon) or full price for 1 billing cycle
            items: [{ price: secondPhasePriceId }],
            end_date: secondBillingCycleEnd,
            billing_cycle_anchor: 'phase_start',
            metadata: {
              phase: hasCoupon ? 'discounted' : 'full',
              phaseDescription: hasCoupon ? 'Discounted (40% off)' : 'Full price',
            },
          },
          {
            // Phase 4: Full price forever (no end_date = ongoing)
            items: [{ price: priceId }],
            metadata: {
              phase: 'full',
              phaseDescription: 'Regular pricing',
            },
          },
        ],
      } as any
    );

    // Get the subscription ID from the schedule
    const subscription = await stripe.subscriptions.retrieve(schedule.subscription as string);

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

    // Calculate phase end dates
    const now = new Date();
    const freeTrialEndDate = new Date(now);
    freeTrialEndDate.setDate(freeTrialEndDate.getDate() + 3); // 3 days
    
    const trialEndDate = new Date(now);
    trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 days
    
    const discountEndDate = hasCoupon ? new Date(trialEndDate) : null;
    if (discountEndDate) {
      if (billingPeriod === 'yearly') {
        discountEndDate.setFullYear(discountEndDate.getFullYear() + 1);
      } else {
        discountEndDate.setMonth(discountEndDate.getMonth() + 1);
      }
    }

    // Save subscription data with phase tracking
    const subscriptionData = {
      subscriptionId: subscription.id,
      subscriptionScheduleId: schedule.id,
      stripeCustomerId: customerId,
      employeeId: plan === 'evidah_q' ? 'evidah-q' : plan,
      billingCycle: billingPeriod,
      subscriptionType: `${plan}_bundle`,
      status: 'active',
      amount: baseAmount,
      currency: 'usd',
      couponCode: hasCoupon ? 'EVIDAH40' : '',
      hasUsedCoupon: hasCoupon,
      discountAmount: discountAmount,
      currentPhase: 'free_trial',
      freeTrialEndDate: Timestamp.fromDate(freeTrialEndDate),
      trialEndDate: Timestamp.fromDate(trialEndDate),
      discountEndDate: discountEndDate ? Timestamp.fromDate(discountEndDate) : null,
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
