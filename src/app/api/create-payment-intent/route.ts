import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp();
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

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

    // Stripe amounts are in pence (smallest currency unit)
    const amountInPence = Math.round(invoiceTotal * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      metadata: {
        chatId,
        cookId: chatData.cookId,
        cookEmail: chatData.cookEmail,
      },
    });

    // Save the payment intent ID to the chat document
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
