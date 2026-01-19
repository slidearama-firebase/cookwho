# CookWho Application - DEPLOYMENT GUIDE

I am very sorry that the download process is causing trouble. The slowness you are seeing is unusual. This guide provides a main method and a manual workaround to ensure you can get your code downloaded and deployed.

---

## Main Method

### Step 1: Download Your Project from Firebase Studio

First, you need to download all the project files from this cloud environment to your computer.

1.  In the file list on the left side of the Studio, click on any single file (like `README.md`) to make sure that panel is active.
2.  Press **Cmd + A** on your keyboard to select **ALL** files and folders. Everything in the list should become highlighted.
3.  **Right-click** on any one of the highlighted files.
4.  From the menu that appears, choose the **"Zip & Download"** option.
5.  **This process may be very slow.** Please allow it several minutes to complete.
6.  A single file named `cookwho.zip` should eventually save to your Mac's "Downloads" folder.

**If the download does not start after 5 minutes, please cancel and proceed to the "Manual Workaround" section below.**

### Step 2: Unzip the Project

1.  Go to your "Downloads" folder and find the `cookwho.zip` file.
2.  Double-click it. This will create a new folder named `cookwho` containing all of your application code. This is your local project folder.

### Step 3: Upload Your Code to GitHub (Web Method)

Now we will upload your code to GitHub using your web browser.

1.  **Open Your Repository:**
    *   Go to your `cookwho` repository on GitHub. It should be at a URL like `https://github.com/slidearama-firebase/cookwho`.

2.  **Start the Upload:**
    *   On your repository page, click the **"Add file"** button.
    *   From the dropdown menu that appears, select **"Upload files"**.

3.  **Upload Your Project Files:**
    *   You will see a page that says "Drag files here...".
    *   Open the `cookwho` folder that you unzipped in Step 2.
    *   **Select all the files AND folders** inside your `cookwho` folder.
    *   **Drag all of them at once** and drop them into the box on the GitHub website.
    *   Wait for GitHub to finish processing all the files. This might take a minute or two.

4.  **Commit the Files:**
    *   Once the files are processed, scroll to the bottom of the page.
    *   In the first text box (the one for the commit message), type: `Initial project commit`.
    *   Ensure the "Commit directly to the `main` branch" option is selected.
    *   Click the green **"Commit changes"** button.

That's it! This will trigger your first real deployment on Firebase App Hosting.

---

## Manual Workaround (If Main Method Fails)

If the main download method fails after 5 minutes, we have to do it piece by piece. I apologize for this inconvenience.

**Part A: Download the `src` folder**
1. Right-click *only* on the `src` folder in the file list.
2. Select "Zip & Download". This should be much faster.
3. A file `src.zip` will download. Find and unzip it on your computer.

**Part B: Download the rest of the files**
1. Create a new folder on your Mac called `cookwho`.
2. Move the `src` folder from Part A into your new `cookwho` folder.
3. Now, for the remaining files (`package.json`, `README.md`, etc.), you may have to download them one-by-one. Right-click on each file in the Studio file list and look for a "Download" option.
4. Place each downloaded file into your `cookwho` folder alongside the `src` folder.

Once you have the `cookwho` folder fully assembled on your computer, you can proceed with **Step 3: Upload Your Code to GitHub**.
