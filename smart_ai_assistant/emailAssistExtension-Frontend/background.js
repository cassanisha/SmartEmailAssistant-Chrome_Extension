chrome.runtime.onInstalled.addListener(() => {
  console.log("Smart Email Assistant installed!");
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "login") {
    loginWithGoogle()
      .then(token => sendResponse({ success: true, token }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // keep message channel open for async response
  }
});

// Function to trigger Google OAuth sign-in
async function loginWithGoogle() {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: getAuthUrl(),
        interactive: true,
      },
      function (redirectUrl) {
        if (chrome.runtime.lastError || !redirectUrl) {
          return reject(new Error(chrome.runtime.lastError?.message || "Authorization failed"));
        }

        // Extract access_token from redirect URL
        const params = new URL(redirectUrl).hash.substring(1);
        const token = new URLSearchParams(params).get("access_token");

        if (token) {
          // Store token in extension storage
          chrome.storage.local.set({ googleAccessToken: token });
          resolve(token);
        } else {
          reject(new Error("No access token found"));
        }
      }
    );
  });
}

// Helper function to create OAuth URL
function getAuthUrl() {
  const clientId = "234046267923-4h7l9sdho9119ku7of7h9h2f66cacsp4.apps.googleusercontent.com"; // Replace with actual Client ID
  const redirectUri = chrome.identity.getRedirectURL(); 
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
  ].join(" ");

  return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=${encodeURIComponent(scopes)}&prompt=consent`;
}