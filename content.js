console.log("Aquamark content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "injectButton") {
    console.log("Injecting button (placeholder)");
  }
});
