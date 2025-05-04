function waitForGmailAttachments() {
  const attachmentButtons = document.querySelectorAll('div[data-tooltip^="Download"]');

  attachmentButtons.forEach(btn => {
    if (!btn.dataset.aquamarkInjected) {
      btn.dataset.aquamarkInjected = "true";

      const watermarkBtn = document.createElement("button");
      watermarkBtn.innerText = "Watermark";
      watermarkBtn.style.marginLeft = "8px";
      watermarkBtn.style.padding = "4px 8px";
      watermarkBtn.style.fontSize = "12px";
      watermarkBtn.style.background = "#4f46e5";
      watermarkBtn.style.color = "#fff";
      watermarkBtn.style.border = "none";
      watermarkBtn.style.borderRadius = "4px";
      watermarkBtn.style.cursor = "pointer";

      watermarkBtn.addEventListener("click", () => {
        const url = btn.getAttribute("href");
        if (url && url.endsWith(".pdf")) {
          fetch(url)
            .then(res => res.blob())
            .then(blob => {
              // Call the watermarking logic
              console.log("PDF downloaded, sending to watermark...");
              // TODO: hook up to watermark.js
            });
        }
      });

      btn.parentElement.appendChild(watermarkBtn);
    }
  });
}

// Watch for DOM changes (Gmail is a single-page app)
const observer = new MutationObserver(() => waitForGmailAttachments());
observer.observe(document.body, { childList: true, subtree: true });
