# CookWho Application - DEPLOYMENT GUIDE

I am very sorry that the download and deployment process has been so difficult. This guide provides the final steps to get your code running.

---

### Step 1: Download Your Project Manually

Because the "Zip & Download" feature in Firebase Studio can be slow, this manual method is more reliable.

1.  **Download the `src` folder:**
    *   In the Firebase Studio file explorer on the left, right-click on the `src` folder.
    *   Select "Download" from the menu.
    *   This will download a file named `src.zip`.

2.  **Download the remaining project files:**
    *   In the file explorer, select all of the *other* files (from `.env` down to `tsconfig.json`). To select multiple files, click on `.env`, hold down the **Shift key**, and then click on `tsconfig.json`.
    *   Right-click on any of the selected files and choose "Zip & Download".
    *   This will download a file named `workspace.zip`.

### Step 2: Unzip and Combine

1.  **Create a new folder** on your Mac's Desktop and name it `cookwho`.
2.  **Unzip `src.zip`:** Double-click the `src.zip` file. This will create a `src` folder. Move this `src` folder *inside* your new `cookwho` folder.
3.  **Unzip `workspace.zip`:** Double-click the `workspace.zip` file.
4.  **Move the contents:** Open the newly created `workspace` folder. Select all the files inside it and move them into your `cookwho` folder, alongside the `src` folder.

When you are finished, your `cookwho` folder should contain the `src` folder and all the other project files, just like you see in Firebase Studio.

### Step 3: Configure Environment Variables (Secrets)

Your application needs secret keys to connect to services like Mailgun and Google AI. You must add these to your Firebase App Hosting backend.

1.  **Open your Firebase Console** and navigate to the App Hosting section. In the left-hand menu, look under the **Build** category and click on **App Hosting**.
2.  On the App Hosting page, you will see a list of your backends. You should see a white card with the title **`cookwho-app`**.
3.  **Click directly on the backend name `cookwho-app` inside the card.** Do NOT click the "Create backend" button. This will take you to the dashboard for your backend.
4.  In the backend dashboard, click on the **"Settings"** tab.
5.  In the settings, find the section for **"Secret management"** or **"Environment variables"**.
6.  You need to add each of the keys listed below. For each key:
    *   Click **"Add secret"**.
    *   For **"Secret name"**, enter the name exactly as it appears here (e.g., `MAILGUN_API_KEY`).
    *   For **"Secret value"**, paste in the actual key you get from Mailgun or Google.
    *   Click **"Save"**.
7.  **You MUST add all 3 secrets:** `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, and `GEMINI_API_KEY`.
    *   **For now, it is okay to just put in placeholder text like "test" for each value if you don't have the real keys yet.** The goal is just to make the build succeed.

### Step 4: Upload Your Code to GitHub (Web Method)

This is the step that triggers the deployment.

1.  **Open Your Repository:**
    *   Go to your `cookwho` repository on GitHub: `https://github.com/slidearama-firebase/cookwho`.

2.  **Start the Upload:**
    *   On your repository page, click the **"Add file"** button and select **"Upload files"**.

3.  **Upload Your Project Files:**
    *   Open the `cookwho` folder on your Mac.
    *   **Select all files and folders** inside `cookwho`.
    *   **Drag all of them at once** and drop them into the box on the GitHub website.

4.  **Commit the Files:**
    *   Once the files are processed, scroll to the bottom of the page.
    *   In the first text box, type: `Add project code and secrets config`.
    *   Ensure the "Commit directly to the `main` branch" option is selected.
    *   Click the green **"Commit changes"** button.

This will trigger a new deployment. Because you added the secrets in Step 3, this deployment should succeed.
