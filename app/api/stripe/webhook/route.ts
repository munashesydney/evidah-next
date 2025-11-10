import { NextRequest, NextResponse } from 'next/server';
import { getStripe, getWebhookSecret, isProduction } from '@/lib/stripe';
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

// Disable body parsing for webhook signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    const webhookSecret = getWebhookSecret();

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
        console.log('Subscription created:', event.data.object.id);
        // Subscription is already handled in create-subscription API
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        console.log('Invoice payment succeeded:', event.data.object.id);
        // Recurring payments - already handled by subscription
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdated(subscription: any) {
  try {
    const customerId = subscription.customer;
    const metadata = subscription.metadata || {};
    const selectedCompany = metadata.selectedCompany || 'default';
    
    // Find user by customer ID
    const usersSnapshot = await db.collection('Users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error('User not found for customer:', customerId);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const uid = userDoc.id;

    // Update subscription status in knowledgebase
    const knowledgebaseRef = db.collection('Users').doc(uid).collection('knowledgebases').doc(selectedCompany);
    
    // Determine if subscription is active
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    
    // Get employee ID from metadata to update correct access flag
    const employeeId = metadata.employeeId || 'evidah-q';
    const subscriptionType = metadata.subscriptionType || 'evidah_q_bundle';
    
    const updates: any = {
      'subscriptionData.status': subscription.status,
      'subscriptionData.updatedAt': Timestamp.now(),
    };
    
    // Update access flags based on employee/plan
    if (subscriptionType.includes('evidah_q')) {
      updates.evidahQ = isActive;
      updates.charlie = isActive;
      updates.marquavious = isActive;
      updates.emma = isActive;
      updates.sungWen = isActive;
    } else if (employeeId === 'charlie') {
      updates.charlie = isActive;
    } else if (employeeId === 'marquavious') {
      updates.marquavious = isActive;
    } else if (employeeId === 'emma') {
      updates.emma = isActive;
    } else if (employeeId === 'sung-wen' || employeeId === 'sung_wen') {
      updates.sungWen = isActive;
    }
    
    await knowledgebaseRef.update(updates);

    console.log('Subscription updated:', subscription.id, 'Status:', subscription.status, 'Employee:', employeeId, 'Active:', isActive);
  } catch (error: any) {
    console.error('Error handling subscription update:', error);
  }
}

async function handleSubscriptionDeleted(subscription: any) {
  try {
    const customerId = subscription.customer;
    const metadata = subscription.metadata || {};
    const selectedCompany = metadata.selectedCompany || 'default';
    
    // Find user by customer ID
    const usersSnapshot = await db.collection('Users')
      .where('stripeCustomerId', '==', customerId)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      console.error('User not found for customer:', customerId);
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const uid = userDoc.id;

    // Update subscription status in knowledgebase
    const knowledgebaseRef = db.collection('Users').doc(uid).collection('knowledgebases').doc(selectedCompany);
    
    // Get employee ID from metadata to disable correct access flag
    const employeeId = metadata.employeeId || 'evidah-q';
    const subscriptionType = metadata.subscriptionType || 'evidah_q_bundle';
    
    const updates: any = {
      'subscriptionData.status': 'canceled',
      'subscriptionData.updatedAt': Timestamp.now(),
    };
    
    // Disable access flags based on employee/plan
    if (subscriptionType.includes('evidah_q')) {
      updates.evidahQ = false;
      updates.charlie = false;
      updates.marquavious = false;
      updates.emma = false;
      updates.sungWen = false;
    } else if (employeeId === 'charlie') {
      updates.charlie = false;
    } else if (employeeId === 'marquavious') {
      updates.marquavious = false;
    } else if (employeeId === 'emma') {
      updates.emma = false;
    } else if (employeeId === 'sung-wen' || employeeId === 'sung_wen') {
      updates.sungWen = false;
    }
    
    await knowledgebaseRef.update(updates);

    console.log('Subscription canceled:', subscription.id, 'Employee:', employeeId, 'Access disabled');
  } catch (error: any) {
    console.error('Error handling subscription deletion:', error);
  }
}

async function handleInvoicePaymentFailed(invoice: any) {
  try {
    console.error('Invoice payment failed:', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due / 100,
    });
    // TODO: Send notification email to user
  } catch (error: any) {
    console.error('Error handling invoice payment failure:', error);
  }
}

