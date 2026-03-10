import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

export async function POST(req: Request) {
  try {
    const { chatId } = await req.json();

    if (!chatId) {
      return NextResponse.json(
        { success: false, message: 'Missing chatId.' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const chatDoc = await db.collection('chats').doc(chatId).get();

    if (!chatDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Chat not found.' },
        { status: 404 }
      );
    }

    const chatData = chatDoc.data()!;
    const invoiceTotal = chatData.invoiceTotal || 0;

    if (invoiceTotal <= 0) {
      return NextResponse.json(
        { success: false, message: 'Invoice total must be greater than zero.' },
        { status: 400 }
      );
    }

    // Stripe amounts are in pence
    const amountInPence = Math.round(invoiceTotal * 100);

    // Call Stripe API directly using fetch — no npm package needed
    const stripeResponse = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: amountInPence.toString(),
        currency: 'gbp',
        'metadata[chatId]': chatId,
        'metadata[cookId]': chatData.cookId,
        'metadata[cookEmail]': chatData.cookEmail,
      }).toString(),
    });

    const paymentIntent = await stripeResponse.json() as any;

    if (!stripeResponse.ok) {
      console.error('Stripe error:', paymentIntent);
      return NextResponse.json(
        { success: false, message: paymentIntent.error?.message || 'Stripe error' },
        { status: 500 }
      );
    }

    // Save payment intent ID to chat document
    await db.collection('chats').doc(chatId).update({
      stripePaymentIntentId: paymentIntent.id,
    });

    console.log(`INFO: Payment intent created for chat ${chatId}: ${paymentIntent.id}`);

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });

  } catch (error: any) {
    console.error('ERROR: Failed to create payment intent:', error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
