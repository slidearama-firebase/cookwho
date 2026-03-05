import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fetch from 'node-fetch';

// Initialize Firebase Admin using Application Default Credentials
if (!getApps().length) {
  initializeApp();
}

// This route is called by a Cloud Scheduler job every 2 minutes.
// It finds any pending cook alerts older than 2 minutes,
// marks them as expired, turns off the cook's isAvailable toggle,
// clears the customer's basket, and sends the cook a notification email.
export async function GET(req: Request) {
  try {
    // Verify this request is from Cloud Scheduler using a secret token
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    if (token !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    const db = getFirestore();
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    // Find all pending alerts older than 2 minutes
    const expiredAlertsSnapshot = await db
      .collection('cookAlerts')
      .where('status', '==', 'pending')
      .where('createdAt', '<=', Timestamp.fromDate(twoMinutesAgo))
      .get();

    if (expiredAlertsSnapshot.empty) {
      console.log('INFO: No expired alerts found.');
      return NextResponse.json({ success: true, expired: 0 });
    }

    console.log(`INFO: Found ${expiredAlertsSnapshot.size} expired alert(s) to process.`);

    const batch = db.batch();
    const emailPromises: Promise<any>[] = [];

    for (const alertDoc of expiredAlertsSnapshot.docs) {
      const alertData = alertDoc.data();
      const { cookId, cookEmail, cookDisplayName, customerId } = alertData;

      // Mark alert as expired
      batch.update(alertDoc.ref, { status: 'expired', expiredAt: new Date() });

      // Turn off cook's isAvailable toggle
      const restaurantRef = db.collection('restaurants').doc(cookId);
      batch.update(restaurantRef, { isAvailable: false });

      // Clear the customer's basket by updating their basket document
      if (customerId) {
        const basketRef = db.collection('baskets').doc(customerId);
        batch.set(basketRef, { 
          items: [], 
          clearedAt: new Date(),
          clearedReason: 'cook_unavailable'
        }, { merge: true });
      }

      // Write a notification document for the customer so the UI can react
      if (customerId) {
        const notifRef = db.collection('customerNotifications').doc(customerId);
        batch.set(notifRef, {
          type: 'kitchen_closed',
          cookId,
          cookDisplayName: cookDisplayName || 'Your cook',
          message: `Sorry, ${cookDisplayName || 'your cook'}'s kitchen is currently closed. Your basket has been cleared.`,
          createdAt: new Date(),
          read: false,
        }, { merge: false });
      }

      console.log(`INFO: Expiring alert ${alertDoc.id} for cook ${cookId}`);

      // Send notification email to cook
      if (cookEmail && mailgunApiKey && mailgunDomain) {
        const fromEmail = `CookWho Alerts <alerts@${mailgunDomain}>`;
        const subject = `Your CookWho Kitchen Has Been Marked as Closed`;
        const emailBody = `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #ef4444;">⚠️ Kitchen Marked as Closed</h2>
            <p>Hi ${cookDisplayName || 'Cook'},</p>
            <p>Your kitchen on CookWho is <strong>no longer active</strong>.</p>
            <p>A customer was waiting to order <strong>"${alertData.itemName}"</strong> but you did not confirm your kitchen was open within the 2 minute window.</p>
            <p>To protect our customers, your kitchen has been automatically marked as closed and their basket has been cleared.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://cookwho.com" 
                 style="display: inline-block; padding: 16px 32px; background: #f97316; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                Log In to Reactivate My Kitchen
              </a>
            </div>
            <p style="color: #888; font-size: 12px;">Once logged in, you can turn your kitchen back on from your profile page when you're ready to accept orders again.</p>
            <p>Best,</p>
            <p>The CookWho Team</p>
          </div>
        `;

        const body = new URLSearchParams({
          from: fromEmail,
          to: cookEmail,
          subject: subject,
          html: emailBody,
        }).toString();

        const emailPromise = fetch(
          `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body,
          }
        ).then(async res => {
          if (res.ok) {
            console.log(`INFO: Expiry notification sent to ${cookEmail}`);
          } else {
            const err = await res.text();
            console.error(`ERROR: Failed to send expiry email to ${cookEmail}: ${err}`);
          }
        });

        emailPromises.push(emailPromise);
      }
    }

    // Commit all Firestore updates in one batch
    await batch.commit();

    // Send all emails
    await Promise.allSettled(emailPromises);

    return NextResponse.json({ 
      success: true, 
      expired: expiredAlertsSnapshot.size 
    });

  } catch (error: any) {
    console.error('ERROR: Failed to expire alerts:', error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
