import Stripe from 'stripe';

/**
 * Get Stripe configuration based on environment
 */
const getStripeConfig = () => {
  const isProduction = process.env.STRIPE_MODE === 'live';
  const suffix = isProduction ? 'LIVE' : 'TEST';
  
  return {
    publishableKey: process.env[`STRIPE_PUBLISHABLE_KEY_${suffix}`],
    secretKey: process.env[`STRIPE_SECRET_KEY_${suffix}`],
    webhookSecret: process.env[`STRIPE_WEBHOOK_SECRET_${suffix}`],
    isProduction,
    suffix
  };
};

/**
 * Get Stripe instance for server-side operations
 */
export const getStripe = (): Stripe => {
  const config = getStripeConfig();
  
  if (!config.secretKey) {
    throw new Error(`Missing STRIPE_SECRET_KEY_${config.suffix}`);
  }
  
  return new Stripe(config.secretKey, {
    apiVersion: '2025-10-29.clover',
  });
};

/**
 * Get publishable key for client-side
 */
export const getPublishableKey = (): string => {
  const config = getStripeConfig();
  
  if (!config.publishableKey) {
    throw new Error(`Missing STRIPE_PUBLISHABLE_KEY_${config.suffix}`);
  }
  
  return config.publishableKey;
};

/**
 * Get webhook secret
 */
export const getWebhookSecret = (): string => {
  const config = getStripeConfig();
  
  if (!config.webhookSecret) {
    throw new Error(`Missing STRIPE_WEBHOOK_SECRET_${config.suffix}`);
  }
  
  return config.webhookSecret;
};

/**
 * Get price ID for EvidahQ monthly subscription
 */
export const getEvidahQMonthlyPriceId = (): string => {
  const config = getStripeConfig();
  const priceId = process.env[`STRIPE_PRICE_EVIDAH_Q_MONTHLY_${config.suffix}`];
  
  if (!priceId) {
    throw new Error(`Missing STRIPE_PRICE_EVIDAH_Q_MONTHLY_${config.suffix}`);
  }
  
  return priceId;
};

/**
 * Check if we're in production mode
 */
export const isProduction = (): boolean => {
  return getStripeConfig().isProduction;
};

