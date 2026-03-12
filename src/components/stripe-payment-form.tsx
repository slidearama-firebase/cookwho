'use client';

import { useEffect, useState, useRef } from 'react';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

declare global {
  interface Window {
    Stripe: any;
  }
}

type StripePaymentFormProps = {
  chatId: string;
  invoiceTotal: number;
  onSuccess: () => void;
  onCancel: () => void;
};

export function StripePaymentForm({ chatId, invoiceTotal, onSuccess, onCancel }: StripePaymentFormProps) {
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [succeeded, setSucceeded] = useState(false);
  const stripeRef = useRef<any>(null);
  const elementsRef = useRef<any>(null);
  const paymentElementRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = async () => {
      stripeRef.current = window.Stripe('pk_test_51PPLUXP7ribnEomKm0oXHIvKi8iCzTXUslYZFBb408OY8M3G7StZybhP2JCaIJbKIjt7ivzScI7hZ2z7ImjZ6s4t00tpBrn1Lq');

      try {
        const res = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId }),
        });
        const data = await res.json();

        if (!data.success) {
          setErrorMessage(data.message || 'Failed to initialise payment.');
          setIsLoading(false);
          return;
        }

        elementsRef.current = stripeRef.current.elements({
          clientSecret: data.clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#f97316',
              borderRadius: '12px',
            },
          },
        });

        const paymentElement = elementsRef.current.create('payment');

        paymentElement.on('ready', () => {
          setIsLoading(false);
          setElementReady(true);
        });

        // Small delay to ensure the div is in the DOM before mounting
        setTimeout(() => {
          if (paymentElementRef.current && !mountedRef.current) {
            mountedRef.current = true;
            paymentElement.mount(paymentElementRef.current);
          }
        }, 100);

      } catch (err) {
        setErrorMessage('Failed to initialise payment. Please try again.');
        setIsLoading(false);
      }
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://js.stripe.com/v3/"]');
      if (existingScript) existingScript.remove();
    };
  }, [chatId]);

  const handleSubmit = async () => {
    if (!stripeRef.current || !elementsRef.current || !firestore || !elementReady) return;

    setIsProcessing(true);
    setErrorMessage('');

    const { error, paymentIntent } = await stripeRef.current.confirmPayment({
      elements: elementsRef.current,
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      await updateDoc(doc(firestore, 'chats', chatId), {
        status: 'paid',
        paidAt: new Date(),
      });
      setSucceeded(true);
      setIsProcessing(false);
      setTimeout(() => onSuccess(), 2000);
    }
  };

  if (succeeded) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-3">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="font-semibold text-green-700">Payment successful! 🎉</p>
        <p className="text-sm text-gray-500">Your cook is now preparing your order.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Payment element div is ALWAYS in the DOM so Stripe can mount into it */}
      <div
        ref={paymentElementRef}
        style={{ minHeight: '200px', width: '100%', display: isLoading ? 'none' : 'block' }}
      />

      {isLoading && (
        <div className="flex items-center justify-center py-6" style={{ minHeight: '200px' }}>
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          onClick={handleSubmit}
          disabled={isProcessing || !elementReady}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : !elementReady ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            `💳 Pay £${invoiceTotal.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
}
