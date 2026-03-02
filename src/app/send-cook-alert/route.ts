import { NextResponse } from 'next/server';
import fetch from 'node-fetch';

export async function POST(req: Request) {
  try {
    const { cookEmail, cookDisplayName, itemName } = await req.json();

    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    if (!mailgunApiKey || !mailgunDomain) {
      console.error('ERROR: Mailgun keys are not set in the environment.');
      return NextResponse.json(
        { success: false, message: 'Server configuration error: Mailgun keys missing.' },
        { status: 500 }
      );
    }

    const fromEmail = `CookWho Alerts <alerts@${mailgunDomain}>`;
    const subject = `Cook Alert! Potential Sale for "${itemName}"`;
    const emailBody = `
      <p>Hi ${cookDisplayName || 'Cook'},</p>
      <p>Great news! A customer has just added your dish "<strong>${itemName}</strong>" to their basket.</p>
      <p>Get ready, a sale might be coming through soon.</p>
      <p>Best,</p>
      <p>The CookWho Team</p>
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
    return NextResponse.json({ success: true, message: `Email sent. ID: ${responseJson.id}` });

  } catch (error: any) {
    console.error(`ERROR: Failed to send email. Reason: ${error.message}`);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
