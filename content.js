// content.js (ES module)
import { supabase } from './supabase.js';
import { watermarkPDF } from './watermark.js';
import * as PDFLib from './pdf-lib.min.js';

console.log("✅ Aquamark Gmail extension loaded");

// TEMP: Dummy handler for testing (replace with real logic later)
function handleWatermarkClick(attachmentBlob, fileName, userEmail) {
  watermarkPDF(attachmentBlob, userEmail)
    .then((watermarkedBlob) => {
      const url = URL.createObjectURL(watermarkedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(".pdf", " - protected.pdf");
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch((err) => {
      console.error("❌ Error watermarking:", err);
      alert("Failed to watermark file. See console for details.");
    });
}

// TEMP: Button injection for Gmail UI (replace with attachment detection later)
const interval = setInterval(() => {
  const buttons = document.querySelectorAll(".aQw:not([data-aquamark])");
  if (buttons.length > 0) {
    buttons.forEach(btn => {
      const icon = document.createElement("img");
      icon.src = chrome.runtime.getURL("logo.png");
      icon.style.height = "20px";
      icon.style.cursor = "pointer";
      icon.title = "Protect with Aquamark";
      icon.addEventListener("click", () => {
        const dummyBlob = new Blob([], { type: "application/pdf" });
        handleWatermarkClick(dummyBlob, "dummy.pdf", "user@example.com"); // TEMP
      });
      btn.appendChild(icon);
      btn.setAttribute("data-aquamark", "true");
    });
  }
}, 2000);
