# Final Setup Instructions for Your Application

This guide contains the final steps to connect your custom domain, secure your API keys, and enable email features.

---

## 1. Connect Your Custom Domain (`cookwho.com`)

Your application is deployed, but your custom domain `cookwho.com` needs to be pointed to it.

**Step 1: Go to Firebase App Hosting**
*   Open the [Firebase Console](https://console.firebase.google.com/).
*   Select your project (`chefbase-ukv2y`).
*   In the left-hand menu under "Build", click on **App Hosting**.
*   You will see your `cookwho` backend. Click to open its dashboard.

**Step 2: Start the Domain Connection**
*   In the **Domains** tab of your backend dashboard, click **Add custom domain**.
*   Enter `cookwho.com` when prompted.

**Step 3: Update Your DNS Records**
*   Firebase will display a list of DNS records that you need to add to your domain registrar (the website where you purchased `cookwho.com`). This will include one `A` record and one or more `TXT` or `CNAME` records.
*   Go to your domain registrar's DNS management section.
*   **Carefully delete any old 'A' records** that are not the ones Firebase has provided. This is a critical step.
*   Add **all** the new records exactly as they are shown in the Firebase console.

**Step 4: Wait for Propagation**
*   After saving your DNS records, it may take anywhere from a few minutes to a few hours for the changes to take effect across the internet. You can click "Verify" or "Finish" in the Firebase console. The status for all records will eventually change to "Verified" or "Connected".

---

## 2. Secure Your Public API Key

To resolve the security alert from Google and protect your app from misuse, you need to restrict your API key. This will also allow you to sign in and test the application from your development environment.

**Step 1: Go to Google Cloud Console**
*   Open the [Google Cloud Credentials Page](https://console.cloud.google.com/apis/credentials).
*   Ensure you have the correct project (`chefbase-ukv2y`) selected at the top of the page.

**Step 2: Select the API Key**
*   In the "API Keys" section, find the key named **Browser key (auto created by Firebase)** and click on its name to edit it.

**Step 3: Add Website Restrictions**
*   Under "Application restrictions", select the **Websites** option.
*   Click **ADD**.
*   In the "Website" field that appears, enter `cookwho.com` and click **DONE**.
*   Click **ADD** again.
*   In the new "Website" field, enter `*.cookwho.com` and click **DONE**.
*   Click **ADD** again.
*   In the new "Website" field, enter `chefbase-ukv2y.web.app` and click **DONE**.
*   Click **ADD** again.
*   In the new "Website" field, enter `*.firebaseapp.com` and click **DONE**.
*   Click **ADD** again.
*   In the new "Website" field, enter `*.cloudworkstations.dev` and click **DONE**. This is required to allow sign-in from your development environment.

**Step 4: Save Your Changes**
*   Click the **SAVE** button at the bottom of the page.

Your API key is now secured and can only be used from your approved domains.

---

## 3. Configure Email Alerts for Cooks (Mailgun)

To resolve the `401 Forbidden` error and enable the email alert feature for cooks, please follow these consolidated steps carefully.

**Step 1: Sign up for Mailgun and Add a Domain**
*   Go to [Mailgun.com](https://www.mailgun.com/) and sign up for an account.
*   When adding your domain, use a **subdomain** of `cookwho.com`, for example `mg.cookwho.com`.
*   **Crucially, ensure you select the US region when prompted**, as your Mailgun account is based in the US.

**Step 2: Verify Your DNS Records**
*   Mailgun will provide you with a list of DNS records (`TXT`, `MX`, `CNAME`). You must add these to your domain registrar's settings.
*   After adding the records, return to your Mailgun dashboard. Wait until Mailgun shows a "Verified" status for each record. This can take some time.
*   **If records are "Unverified":** Carefully double-check the `Host` and `Value` for each record. For the `Host` field, some DNS providers require you to enter only the subdomain part. For example, for the host `pic._domainkey.mg.cookwho.com`, you might only need to enter `pic._domainkey.mg`.

**Step 3: Generate a New Private API Key**
*   In your Mailgun dashboard, navigate to **Settings -> API Keys**.
*   To ensure you are using a valid key, we recommend creating a new one. Click the **Create API key** button.
*   Give the key a descriptive name (e.g., "CookWho App Key").
*   A new **Private API Key** will be generated. It starts with `key-...`. **Copy this new key immediately**, as you will not be able to see it again.

**Step 4: Add Keys to Your `.env` File**
*   In this development environment, open the file named `.env` (or `.env.local`).
*   Update the file with your Mailgun domain and your **newly generated** Private API Key.

```
MAILGUN_API_KEY=YOUR_NEW_PRIVATE_API_KEY_FROM_MAILGUN
MAILGUN_DOMAIN=mg.cookwho.com
```

**Step 5: Restart the Application Server**
*   **CRITICAL STEP:** To load the new environment variables from your `.env` file, the development server **must be restarted**.
*   The server should restart automatically when you save the `.env` file. If the error persists, it means the server did not load the new key. Please **manually stop and restart the development server** to be certain.

**Step 6: Understand Mailgun's Free Plan Limits**
*   The free tier of Mailgun has limits on how many emails you can send per hour and per day. If you test the email feature multiple times in a short period, you might see a `403 Forbidden` error in the logs. This is normal and means you've hit a temporary rate limit. You can check your sending limits and logs in the Mailgun dashboard.

---

Once all setup steps are complete, your application will be live, secure, and fully featured on `https://cookwho.com`. Congratulations!
