'use client';

import { useBasket } from '@/context/basket-context';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart, ArrowLeft, Loader2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/checkout-form';

// Make sure to call `loadStripe` outside of a component’s render to avoid
// recreating the `Stripe` object on every render.
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

export default function CheckoutPage() {
  const { basket, totalPrice } = useBasket();
  const router = useRouter();
  const [clientSecret, setClientSecret] = useState('');
  const [loadingSecret, setLoadingSecret] = useState(true);

  useEffect(() => {
    if (basket.length > 0) {
      setLoadingSecret(true);
      fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: basket }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            console.error('Failed to get client secret from server');
          }
          setLoadingSecret(false);
        })
        .catch((error) => {
          console.error('Error fetching client secret:', error);
          setLoadingSecret(false);
        });
    } else {
      setLoadingSecret(false);
    }
  }, [basket]);

  useEffect(() => {
    // If basket becomes empty while on checkout page (e.g. cleared in another tab)
    // and we are not in the middle of loading a secret, redirect.
    if (basket.length === 0 && !loadingSecret) {
      router.push('/');
    }
  }, [basket, loadingSecret, router]);

  if (loadingSecret) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-10">
        <Loader2 className="h-16 w-16 text-muted-foreground animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">
          Preparing your secure checkout...
        </h2>
      </div>
    );
  }

  if (basket.length === 0) {
    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-10">
        <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Your Basket is Empty</h2>
        <p className="text-muted-foreground mb-6">
          You need to add some items to your basket before you can check out.
        </p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>
    );
  }
  
  const appearance = {
    theme: 'stripe',
  };
  const options = {
    clientSecret,
    appearance,
  };


  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div className="grid md:grid-cols-2 gap-12">
        {/* Order Summary */}
        <div className="md:order-last">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
              <CardDescription>
                From {basket[0]?.restaurantName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {basket.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                    <Image
                      src={item.imageUrls?.[0] || 'https://placehold.co/100x100'}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x £{item.price.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    £{(item.quantity * item.price).toFixed(2)}
                  </p>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>£{totalPrice.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              {clientSecret ? (
                <Elements options={options as any} stripe={stripePromise}>
                  <CheckoutForm />
                </Elements>
              ) : (
                <p>
                  There was an error loading the payment form. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
