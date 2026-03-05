import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin using Application Default Credentials
if (!getApps().length) {
  initializeApp();
}

export async function POST(req: Request) {
  try {
    const { cookEmail, cookDisplayName, cookId, itemName } = await req.json();

    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
      console.error('ERROR: Mailgun keys are not set in the environment.');
      return NextResponse.json(
        { success: false, message: 'Server configuration error: Mailgun keys missing.' },
        { status: 500 }
      );
    }

    const db = getFirestore();

    // Check if cook already has a live paid order — if so, skip the alert
    const liveOrdersSnapshot = await db
      .collection('orders')
      .where('cookId', '==', cookId)
      .where('status', '==', 'live')
      .limit(1)
      .get();

    if (!liveOrdersSnapshot.empty) {
      console.log(`INFO: Cook ${cookId} has a live order — skipping alert email.`);
      return NextResponse.json({ 
        success: true, 
        message: 'Cook is already active with a live order — no alert needed.',
        alertId: null
      });
    }

    // No live order — create an alert document in Firestore
    const alertRef = await db.collection('cookAlerts').add({
      cookId,
      cookEmail,
      cookDisplayName,
      itemName,
      status: 'pending',
      createdAt: new Date(),
    });

    const alertId = alertRef.id;
    const confirmUrl = `https://cookwho.com/api/confirm-kitchen?cookId=${cookId}&alertId=${alertId}`;

    const fromEmail = `CookWho Alerts <alerts@${mailgunDomain}>`;
    const subject = `⚡ Quick! You've got 2 minutes to grab a sale!`;
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f97316;">🍳 You've Got a Hungry Customer!</h2>
        <p>Hi ${cookDisplayName || 'Cook'},</p>
        <p>A customer has just added your dish <strong>"${itemName}"</strong> to their basket and they're ready to order!</p>
        <p style="font-size: 18px; font-weight: bold; color: #ef4444;">⏰ You have 2 minutes to confirm — don't miss this sale!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" 
             style="display: inline-block; padding: 16px 32px; background: #f97316; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px;">
            ✅ Yes! My Kitchen is Open!
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">If you don't confirm within 2 minutes your kitchen will be automatically marked as closed to protect the customer.</p>
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

    const response = await fetch(
      `https://api.mailgun.net/v3/${mailgunDomain}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Mailgun API error (${response.status}): ${errorBody}`);
      return NextResponse.json(
        { success: false, message: `Mailgun error: ${errorBody}` },
        { status: response.status }
      );
    }

    const responseJson: any = await response.json();
    console.log(`INFO: Email sent successfully to ${cookEmail}. Message ID: ${responseJson.id}`);
    return NextResponse.json({ 
      success: true, 
      message: `Email sent. ID: ${responseJson.id}`,
      alertId: alertId
    });

  } catch (error: any) {
    console.error(`ERROR: Failed to send email. Reason: ${error.message}`);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
