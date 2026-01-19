# CookWho Application - FINAL DEPLOYMENT GUIDE

I am very sorry for the difficult and confusing process. This is the final, corrected guide. The old instructions were flawed, but these steps will work. We will do this in two parts.

---

### **PART 1: Create the Backend (This build will fail, and that is OK)**

The goal of this part is to simply make the new `cookwho-app` backend appear in Firebase.

1.  **Download Your Project Manually**
    *   Right-click the `src` folder in the file explorer and select "Download".
    *   Select all *other* files (from `.env` to `tsconfig.json`), right-click, and select "Zip & Download".

2.  **Unzip and Combine on Your Desktop**
    *   Create a new, empty folder on your desktop named `cookwho`.
    *   Unzip `src.zip` and move the resulting `src` folder inside your `cookwho` folder.
    *   Unzip `workspace.zip` and move all of its contents into your `cookwho` folder.

3.  **Upload to GitHub to Create the Backend**
    *   Go to your `cookwho` repository on GitHub: `https://github.com/slidearama-firebase/cookwho`.
    *   Click **"Add file"** > **"Upload files"**.
    *   Drag everything from your `cookwho` folder on your desktop into the GitHub upload box.
    *   For the commit message, type: `Create backend`.
    *   Click the green **"Commit changes"** button.

4.  **Confirm the (Failed) Build**
    *   Go to the **App Hosting** section in your Firebase Console.
    *   You will see a **new backend card named `cookwho-app`** appear.
    *   A build will start automatically. **This build will fail.** This is normal and expected. Wait for it to finish.

You are now ready for Part 2.

---

### **PART 2: Add Secrets and Trigger the Successful Build**

Now that the `cookwho-app` backend exists, we can give it the secrets it needs.

1.  **Navigate to Secret Management**
    *   In the Firebase App Hosting page, **click on the name `cookwho-app`** inside the new white card.
    *   Click the **"Settings"** tab.
    *   Find the section for **"Secret management"**.

2.  **Add the Three Secrets**
    *   You MUST add all 3 secrets: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `GEMINI_API_KEY`.
    *   For each one, click "Add secret", type the name exactly, and for the value, you can just type `test` for now.

3.  **Trigger the Final, Successful Build**
    *   Go back to your GitHub repository page.
    *   Once again, click **"Add file"** > **"Upload files"**.
    *   Drag the **exact same files and folders** from your `cookwho` folder on your desktop and drop them into the upload box.
    *   For the commit message, type: `Add secrets and deploy`.
    *   Click the green **"Commit changes"** button.

This second upload triggers a new build. Because the secrets are now in place, this build will succeed. You can watch its status in the Firebase App Hosting dashboard. Once it says "Live", your app will be running.