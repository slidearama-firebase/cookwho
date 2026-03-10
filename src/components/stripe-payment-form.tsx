'use client';

import { useEffect, useState } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PaymentFormInnerProps = {
  chatId: string;
  invoiceTotal: number;
  onSuccess: () => void;
  onCancel: () => void;
};

function PaymentFormInner({ chatId, invoiceTotal, onSuccess, onCancel }: PaymentFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const firestore = useFirestore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [succeeded, setSucceeded] = useState(false);

  const handleSubmit = async () => {
    if (!stripe || !elements || !firestore) return;

    setIsProcessing(true);
    setErrorMessage('');

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
      return;
    }

    if (paymentIntent?.status === 'succeeded') {
      // Update chat status to paid in Firestore
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
      <PaymentElement />
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
          disabled={isProcessing || !stripe || !elements}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            `💳 Pay £${invoiceTotal.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
}

type StripePaymentFormProps = {
  chatId: string;
  invoiceTotal: number;
  onSuccess: () => void;
  onCancel: () => void;
};

export function StripePaymentForm({ chatId, invoiceTotal, onSuccess, onCancel }: StripePaymentFormProps) {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Create payment intent when component mounts
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setClientSecret(data.clientSecret);
        } else {
          setError(data.message || 'Failed to initialise payment.');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to initialise payment. Please try again.');
        setLoading(false);
      });
  }, [chatId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">
        <XCircle className="h-4 w-4 flex-shrink-0" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#f97316',
            borderRadius: '12px',
          },
        },
      }}
    >
      <PaymentFormInner
        chatId={chatId}
        invoiceTotal={invoiceTotal}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
