import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin if not already initialized
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'chefbase-ukv2y',
    }),
  });
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

    // Create an alert document in Firestore
    const db = getFirestore();
    const alertRef = await db.collection('cookAlerts').add({
      cookId,
      cookEmail,
      itemName,
      status: 'pending',
      createdAt: new Date(),
    });

    const alertId = alertRef.id;
    const confirmUrl = `https://cookwho.com/api/confirm-kitchen?cookId=${cookId}&alertId=${alertId}`;

    const fromEmail = `CookWho Alerts <alerts@${mailgunDomain}>`;
    const subject = `Cook Alert! Potential Sale for "${itemName}"`;
    const emailBody = `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #f97316;">🍳 Kitchen Alert!</h2>
        <p>Hi ${cookDisplayName || 'Cook'},</p>
        <p>Great news! A customer has just added your dish <strong>"${itemName}"</strong> to their basket.</p>
        <p>Please confirm your kitchen is open and ready within <strong>7 minutes</strong> or the order will be cancelled.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" 
             style="display: inline-block; padding: 16px 32px; background: #f97316; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px;">
            ✅ Confirm My Kitchen is Open
          </a>
        </div>
        <p style="color: #888; font-size: 12px;">This link expires in 7 minutes. If you don't confirm in time your kitchen will be marked as closed.</p>
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
