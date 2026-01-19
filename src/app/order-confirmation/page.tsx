'use client';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { OrderConfirmation } from '@/components/order-confirmation';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function OrderConfirmationPageWrapper() {
  // The confirmation page doesn't need a client secret for the Elements provider
  // It's only used to get a stripe instance via useStripe()
  return (
    <Elements stripe={stripePromise}>
      <OrderConfirmation />
    </Elements>
  );
}
