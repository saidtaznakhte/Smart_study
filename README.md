<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1IYnik6IzIQHWDvE_Q0p4rp4rp4bdV7U2H_J

## Run Locally

**Prerequisites:** Node.js

1.  Install dependencies:
    `npm install`
2.  Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3.  **Firebase Setup:**
    *   Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
    *   Enable Google Authentication in your Firebase project.
    *   Enable Firestore Database in your Firebase project.
    *   Add a web app to your Firebase project and copy its configuration.
    *   Add the following Firebase environment variables to your [.env.local](.env.local) file:
        ```
        VITE_FIREBASE_API_KEY="YOUR_FIREBASE_API_KEY"
        VITE_FIREBASE_AUTH_DOMAIN="YOUR_FIREBASE_AUTH_DOMAIN"
        VITE_FIREBASE_PROJECT_ID="YOUR_FIREBASE_PROJECT_ID"
        VITE_FIREBASE_STORAGE_BUCKET="YOUR_FIREBASE_STORAGE_BUCKET"
        VITE_FIREBASE_MESSAGING_SENDER_ID="YOUR_FIREBASE_MESSAGING_SENDER_ID"
        VITE_FIREBASE_APP_ID="YOUR_FIREBASE_APP_ID"
        VITE_FIREBASE_MEASUREMENT_ID="YOUR_FIREBASE_MEASUREMENT_ID"
        ```
4.  Run the app:
    `npm run dev`