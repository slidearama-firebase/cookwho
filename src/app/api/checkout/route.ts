
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { type BasketItem } from '@/lib/types';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(req: Request) {
  try {
    const { items }: { items: BasketItem[] } = await req.json();

    if (!items || items.length === 0) {
      return new NextResponse('Basket is empty', { status: 400 });
    }

    const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    // Stripe expects the amount in the smallest currency unit (e.g., pence)
    const amount = Math.round(total * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'gbp', // Great British Pounds
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });

  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
