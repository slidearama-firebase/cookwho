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

To enable the email alert feature for cooks, please follow these steps carefully.

**Step 1: Sign up for Mailgun and Add a Domain**
*   Go to [Mailgun.com](https://www.mailgun.com/) and sign up for an account.
*   When adding your domain, use a **subdomain** of `cookwho.com`, for example `mg.cookwho.com`.
*   **Crucially, ensure you select the US region when prompted**, as this must match your account's home region.

**Step 2: Verify Your DNS Records**
*   Mailgun will provide you with a list of DNS records (`TXT`, `MX`, `CNAME`). You must add these to your domain registrar's settings.
*   After adding the records, return to your Mailgun dashboard. Wait until Mailgun shows a "Verified" status for each record. This can take some time.
*   **If records are "Unverified":** Carefully double-check the `Host` and `Value` for each record. For the `Host` field, some DNS providers require you to enter only the subdomain part. For example, for the host `pic._domainkey.mg.cookwho.com`, you might only need to enter `pic._domainkey.mg`.

**Step 3: Generate a Private API Key**
*   In your Mailgun dashboard, navigate to **Settings -> API Keys**.
*   Click the **Create API key** button.
*   Give the key a descriptive name (e.g., "CookWho App Key").
*   A new **Private API Key** will be generated. It starts with `key-...`. **Copy this key immediately**, as you will not be able to see it again.

**Step 4: Add Keys to Google Secret Manager (CRITICAL FOR LIVE SITE)**

Your live site on Firebase App Hosting cannot access local environment files. You must securely provide these keys to the production environment using Google Secret Manager.

*   **1. Go to Secret Manager:**
    *   Open the [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager).
    *   Ensure your project (`chefbase-ukv2y`) is selected at the top.

*   **2. Create the MAILGUN_API_KEY Secret:**
    *   Click **+ CREATE SECRET** at the top.
    *   **Name:** Enter `MAILGUN_API_KEY`. The name must be exact.
    *   **Secret value:** Paste your Mailgun Private API Key (the one starting with `key-...`).
    *   Leave "Replication" as is, and click **CREATE SECRET**.

*   **3. Create the MAILGUN_DOMAIN Secret:**
    *   Click **+ CREATE SECRET** again.
    *   **Name:** Enter `MAILGUN_DOMAIN`. The name must be exact.
    *   **Secret value:** Paste your Mailgun domain (e.g., `mg.cookwho.com`). Do not include `https://`.
    *   Click **CREATE SECRET**.

**Step 5: Grant Access to Your Service Accounts (CRITICAL FOR LIVE SITE)**

For your application to read the secrets you just created, you must grant permission to its "service accounts" (identities for your app environments). This is the most common point of failure. Please follow these steps carefully.

*   **1. Go back to the Secret Manager page:**
    *   Open the [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager) page again.

*   **2. Grant Access for your LIVE application on App Hosting (Recommended Method):**
    *   Check the boxes next to **both** `MAILGUN_API_KEY` and `MAILGUN_DOMAIN`.
    *   In the right-hand permissions panel that appears, click **ADD PRINCIPAL**.
    *   In the "New principals" field, paste your App Hosting service account ID: `firebase-app-hosting-compute@chefbase-ukv2y.iam.gserviceaccount.com`
    *   For the role, select `Secret Manager Secret Accessor`.
    *   Click **SAVE**.

*   **3. Grant Access for your LOCAL development environment:**
    *   On the same page, with both secrets still checked, click **ADD PRINCIPAL** again.
    *   In the "New principals" field, paste your local development service account ID: `78058059050-compute@developer.gserviceaccount.com`
    *   For the role, select `Secret Manager Secret Accessor`.
    *   Click **SAVE**.

**Step 6: Add Keys for Local Development Testing**

*   In this development environment, create a file named `.env.local` if it does not already exist. This file is specifically for your local secrets and is excluded from version control by default.
*   Add your Mailgun domain and your Private API Key to this `.env.local` file.

```
MAILGUN_API_KEY=YOUR_NEW_PRIVATE_API_KEY_FROM_MAILGUN
MAILGUN_DOMAIN=mg.cookwho.com
```

**Step 7: Redeploy to Production (FINAL STEP)**

After granting permissions, you must **redeploy your application** for the live site to use them.

**Important:** Permissions can take a few minutes to take effect. If you deploy too quickly after setting permissions, the first build may still fail. **After granting permissions, wait at least 2 minutes before redeploying.**

**Step 8: Understand Mailgun's Free Plan Limits**
*   The free tier of Mailgun has limits on how many emails you can send per hour and per day. If you test the email feature multiple times in a short period, you might see a `403 Forbidden` error in the logs. This is normal and means you've hit a temporary rate limit. You can check your sending limits and logs in the Mailgun dashboard.

---

Once all setup steps are complete, your application will be live, secure, and fully featured on `https://cookwho.com`. Congratulations!
