import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin using Application Default Credentials
if (!getApps().length) {
  initializeApp();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cookId = searchParams.get('cookId');
    const alertId = searchParams.get('alertId');

    if (!cookId || !alertId) {
      return new Response(
        `<html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h2>❌ Invalid confirmation link.</h2>
            <p>This link is missing required information.</p>
          </body>
        </html>`,
        { status: 400, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const db = getFirestore();
    const alertRef = db.collection('cookAlerts').doc(alertId);
    const alertDoc = await alertRef.get();

    if (!alertDoc.exists) {
      return new Response(
        `<html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h2>⚠️ This confirmation link has expired or already been used.</h2>
            <p>Please ask your customer to add an item to their basket again.</p>
            <a href="https://cookwho.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#f97316;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Go to CookWho</a>
          </body>
        </html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const alertData = alertDoc.data();

    // Check if already confirmed
    if (alertData?.status === 'confirmed') {
      return new Response(
        `<html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h2>✅ You already confirmed this order!</h2>
            <p>Your customer has been notified. Check your CookWho dashboard for the chat.</p>
            <a href="https://cookwho.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#f97316;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Log In to CookWho</a>
          </body>
        </html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // Check if expired (2 minutes)
    const createdAt = alertData?.createdAt?.toDate();
    const now = new Date();
    const twoMinutes = 2 * 60 * 1000;

    if (createdAt && (now.getTime() - createdAt.getTime()) > twoMinutes) {
      await alertRef.update({ status: 'expired' });
      await db.collection('restaurants').doc(cookId).update({ isAvailable: false });

      return new Response(
        `<html>
          <body style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h2>⏰ Sorry, this confirmation has expired.</h2>
            <p>The 2 minute window has passed. Your kitchen has been marked as closed.</p>
            <p>You can turn it back on from your profile when you're ready.</p>
            <a href="https://cookwho.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#f97316;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Log In to CookWho</a>
          </body>
        </html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // All good — confirm the kitchen!
    await alertRef.update({ status: 'confirmed', confirmedAt: new Date() });
    await db.collection('restaurants').doc(cookId).update({ isAvailable: true });

    // Create the chat session
    const cookDisplayName = alertData?.cookDisplayName || 'Cook';
    const cookEmail = alertData?.cookEmail || '';

    try {
      await fetch('https://cookwho.com/api/create-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookId,
          cookDisplayName,
          cookEmail,
          alertId,
        }),
      });
      console.log(`INFO: Chat creation triggered for cook ${cookId}`);
    } catch (chatError: any) {
      console.error('ERROR: Failed to create chat session:', chatError.message);
      // Don't fail the whole confirmation if chat creation fails
    }

    return new Response(
      `<html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2>🎉 Kitchen Confirmed!</h2>
          <p>Your customer has been notified that you're open and ready to cook!</p>
          <p>A chat session has been started — log in to CookWho to begin the conversation.</p>
          <a href="https://cookwho.com" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#f97316;color:white;border-radius:8px;text-decoration:none;font-weight:bold;">Log In & Start Chatting</a>
          <script>setTimeout(() => { window.location.href = 'https://cookwho.com'; }, 3000);</script>
        </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );

  } catch (error: any) {
    console.error('ERROR: Failed to confirm kitchen:', error.message);
    return new Response(
      `<html>
        <body style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h2>❌ Something went wrong.</h2>
          <p>Please try again or contact support.</p>
        </body>
      </html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } }
    );
  }
}
