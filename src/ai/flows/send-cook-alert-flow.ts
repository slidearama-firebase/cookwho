'use server';
/**
 * @fileOverview A Genkit flow for sending an alert to a cook when a customer
 * adds one of their items to the basket.
 *
 * This file exports:
 * - sendCookAlert: The function to trigger the alert flow.
 * - SendCookAlertInput: The input type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';

const SendCookAlertInputSchema = z.object({
  cookEmail: z.string().email().describe("The email address of the cook to notify."),
  cookDisplayName: z.string().optional().describe("The display name of the cook."),
  itemName: z.string().describe("The name of the item added to the basket."),
});
export type SendCookAlertInput = z.infer<typeof SendCookAlertInputSchema>;

const SendCookAlertOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendCookAlertOutput = z.infer<typeof SendCookAlertOutputSchema>;

export async function sendCookAlert(
  input: SendCookAlertInput
): Promise<SendCookAlertOutput> {
  return sendCookAlertFlow(input);
}

const sendCookAlertFlow = ai.defineFlow(
  {
    name: 'sendCookAlertFlow',
    inputSchema: SendCookAlertInputSchema,
    outputSchema: SendCookAlertOutputSchema,
  },
  async ({ cookEmail, cookDisplayName, itemName }) => {
    
    // Super-Detailed Diagnostic Logging
    console.log('--- BEGIN FORENSIC ENVIRONMENT DIAGNOSTICS ---');
    const allEnvKeys = Object.keys(process.env);
    const mailgunRelatedKeys = allEnvKeys.filter(key => key.toUpperCase().includes('MAILGUN'));
    
    console.log('Searching for any environment variables containing "MAILGUN"...');
    console.log('Found potential Mailgun-related env keys:', mailgunRelatedKeys);

    const mailgunApiKey = process.env.MAILGUN_API_KEY;
    const mailgunDomain = process.env.MAILGUN_DOMAIN;

    console.log(`Value of process.env.MAILGUN_API_KEY is of type: ${typeof mailgunApiKey}`);
    if (mailgunApiKey) {
        console.log(`Value of process.env.MAILGUN_API_KEY has length: ${mailgunApiKey.length}`);
    } else {
        console.log('Value of process.env.MAILGUN_API_KEY is falsy (undefined, null, or empty string).');
    }

    console.log(`Value of process.env.MAILGUN_DOMAIN is of type: ${typeof mailgunDomain}`);
    if (mailgunDomain) {
        console.log(`Value of process.env.MAILGUN_DOMAIN has length: ${mailgunDomain.length}`);
    } else {
        console.log('Value of process.env.MAILGUN_DOMAIN is falsy (undefined, null, or empty string).');
    }
    console.log('--- END FORENSIC ENVIRONMENT DIAGNOSTICS ---');


    if (!mailgunApiKey || !mailgunDomain || mailgunApiKey.trim() === '' || mailgunDomain.trim() === '') {
        const errorMsg = 'Mailgun keys are not set in the production environment. Please ensure that the secrets have been created in Google Secret Manager AND that the App Hosting service account has the "Secret Manager Secret Accessor" role. See the README.md for detailed instructions.';
        console.error(`ERROR: ${errorMsg}`);
        return { success: false, message: errorMsg };
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

    try {
      const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let friendlyMessage = `Mailgun API error (${response.status}): ${errorBody}`;
        if (response.status === 403) {
            friendlyMessage += " This often means you've hit a sending limit on your Mailgun plan. Please check your Mailgun dashboard for usage details."
        }
        throw new Error(friendlyMessage);
      }

      const responseJson: any = await response.json();
      const successMessage = `Successfully sent email alert to ${cookEmail} for item ${itemName}. Message ID: ${responseJson.id}`;
      console.log(`INFO: ${successMessage}`);
      return { success: true, message: successMessage };
        
    } catch (error: any) {
        const errorMessage = `Failed to send email alert. Reason: ${error.message || 'Unknown error'}`;
        console.error(`ERROR: ${errorMessage}`);
        return { success: false, message: errorMessage };
    }
  }
);
