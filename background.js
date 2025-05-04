// background.js
chrome.tabs.onUpdated.addListener((tabId, info, tab) => {
  if (info.status === "complete" && tab.url.includes("mail.google.com")) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    });
  }
});
