// popup.js

document.getElementById("loginBtn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "login" }, (response) => {
    if (response.success) {
      alert("Login successful! Access token saved.");
      console.log("Access Token:", response.token);
    } else {
      alert("Login failed: " + response.error);
    }
  });
});
