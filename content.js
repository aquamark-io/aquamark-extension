// Inject PDFLib script into Gmail page
const pdfLibScript = document.createElement('script');
pdfLibScript.src = chrome.runtime.getURL('pdf-lib.min.js');
pdfLibScript.onload = () => {
  console.log('✅ PDFLib loaded into Gmail');
};
(document.head || document.documentElement).appendChild(pdfLibScript);

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

      watermarkBtn.addEventListener("click", async () => {
        const url = btn.getAttribute("href");
        if (url && url.endsWith(".pdf")) {
          const response = await fetch(url);
          const blob = await response.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);

          const outputBytes = await watermarkPDF(uint8Array, "test@example.com");
          if (outputBytes) {
            const blobOut = new Blob([outputBytes], { type: "application/pdf" });
            const downloadUrl = URL.createObjectURL(blobOut);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = "watermarked.pdf";
            a.click();
            URL.revokeObjectURL(downloadUrl);
          }
        }
      });

      btn.parentElement.appendChild(watermarkBtn);
    }
  });
}

const observer = new MutationObserver(() => waitForGmailAttachments());
observer.observe(document.body, { childList: true, subtree: true });

// ---- Embedded Watermark Logic ----

async function watermarkPDF(pdfBytes, userEmail) {
  const { PDFDocument, rgb } = window.PDFLib;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  // Fetch your stored logo (replace with Supabase fetch later)
  const logoUrl = 'https://www.aquamark.io/logo.png';
  const logoImageBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
  const logoImage = await pdfDoc.embedJpg(logoImageBytes);

  for (const page of pages) {
    const { width, height } = page.getSize();
    const imgDims = logoImage.scale(0.2);

    // Tile the watermark across the page
    for (let x = 0; x < width; x += imgDims.width * 2) {
      for (let y = 0; y < height; y += imgDims.height * 2) {
        page.drawImage(logoImage, {
          x: x,
          y: y,
          width: imgDims.width,
          height: imgDims.height,
          rotate: { type: 'degrees', angle: 45 },
          opacity: 0.15,
        });
      }
    }
  }

  return await pdfDoc.save();
}
