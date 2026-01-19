'use client';

import { useStripe } from '@stripe/react-stripe-js';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBasket } from '@/context/basket-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

export function OrderConfirmation() {
  const stripe = useStripe();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { basket, totalPrice, clearBasket } = useBasket();
  const { user } = useUser();
  const firestore = useFirestore();

  const [status, setStatus] = useState<
    'loading' | 'success' | 'failed' | 'processing'
  >('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const clientSecret = searchParams.get('payment_intent_client_secret');

    if (!clientSecret) {
      router.push('/');
      return;
    }

    if (!stripe) {
      // Stripe.js hasn't loaded yet. Wait for it.
      return;
    }

    const retrieveIntent = async () => {
      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
      switch (paymentIntent?.status) {
        case 'succeeded':
          setMessage('Payment succeeded!');
          setStatus('success');

          // Save order to Firestore only if we haven't already.
          // A simple way is to check if the basket is not empty.
          if (user && basket.length > 0 && firestore) {
            try {
              const orderData = {
                userId: user.uid,
                cookId: basket[0].restaurantId, // Assuming all items from same cook
                items: basket,
                totalPrice: totalPrice,
                status: 'paid',
                createdAt: serverTimestamp(),
                stripePaymentIntentId: paymentIntent.id,
              };
              await addDoc(collection(firestore, 'orders'), orderData);
              clearBasket(); // Clear basket after successful order
            } catch (error) {
              console.error('Error saving order to Firestore:', error);
            }
          }
          break;
        case 'processing':
          setMessage('Your payment is processing.');
          setStatus('processing');
          break;
        case 'requires_payment_method':
          setMessage('Your payment was not successful, please try again.');
          setStatus('failed');
          break;
        default:
          setMessage('Something went wrong.');
          setStatus('failed');
          break;
      }
    };
    retrieveIntent();
  }, [stripe, searchParams, router, user, basket, totalPrice, firestore, clearBasket]);

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <>
            <Loader2 className="h-16 w-16 text-muted-foreground animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-center">
              Verifying Payment...
            </h2>
          </>
        );
      case 'success':
        return (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-center">
              Payment Successful!
            </h2>
            <p className="text-muted-foreground mb-6 text-center">
              Thank you for your order. The cook has been notified.
            </p>
          </>
        );
      case 'processing':
        return (
          <>
            <Loader2 className="h-16 w-16 text-muted-foreground animate-spin mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-center">
              Payment Processing
            </h2>
            <p className="text-muted-foreground mb-6 text-center">
              We'll update you once the payment is confirmed.
            </p>
          </>
        );
      case 'failed':
        return (
          <>
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2 text-center">
              Payment Failed
            </h2>
            <p className="text-muted-foreground mb-6 text-center">
              {message ||
                'There was an issue with your payment. Please try again.'}
            </p>
          </>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-10">
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-6">
          {renderContent()}
          <Button asChild className="w-full">
            <Link href="/">Return to Homepage</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
