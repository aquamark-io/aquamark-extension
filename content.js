// Inject PDFLib into Gmail page
const pdfLibScript = document.createElement('script');
pdfLibScript.src = chrome.runtime.getURL('pdf-lib.min.js');
pdfLibScript.onload = () => {
  console.log('✅ PDFLib loaded into Gmail');
};
(document.head || document.documentElement).appendChild(pdfLibScript);

// Watch for Gmail DOM changes
const observer = new MutationObserver(() => waitForGmailAttachments());
observer.observe(document.body, { childList: true, subtree: true });

function waitForGmailAttachments() {
  const attachments = document.querySelectorAll('div.aQH'); // Gmail inbox attachment blocks

  attachments.forEach(card => {
    if (!card.querySelector('.aquamark-btn')) {
      const pdfLink = card.querySelector('a[href$=".pdf"]');
      if (!pdfLink) return;

      const watermarkBtn = document.createElement("button");
      watermarkBtn.innerText = "Watermark";
      watermarkBtn.className = "aquamark-btn";
      watermarkBtn.style.marginLeft = "8px";
      watermarkBtn.style.padding = "4px 8px";
      watermarkBtn.style.fontSize = "12px";
      watermarkBtn.style.background = "#4f46e5";
      watermarkBtn.style.color = "#fff";
      watermarkBtn.style.border = "none";
      watermarkBtn.style.borderRadius = "4px";
      watermarkBtn.style.cursor = "pointer";

      watermarkBtn.addEventListener("click", async () => {
        const url = pdfLink.getAttribute("href");
        if (!url) return alert("Could not find PDF URL.");

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
      });

      card.appendChild(watermarkBtn);
    }
  });
}

// ---- Embedded Watermark Logic ----

async function watermarkPDF(pdfBytes, userEmail) {
  const { PDFDocument, rgb } = window.PDFLib;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  // Use your current logo (public GitHub version)
  const logoUrl = 'https://www.aquamark.io/logo.png';
  const logoImageBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
  const logoImage = await pdfDoc.embedPng(logoImageBytes);

  for (const page of pages) {
    const { width, height } = page.getSize();
    const imgDims = logoImage.scale(0.2);

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
