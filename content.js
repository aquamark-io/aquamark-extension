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

// Add logo button next to each PDF
function waitForGmailAttachments() {
  const attachments = document.querySelectorAll('div.aQH');

  attachments.forEach(section => {
    const pdfLinks = section.querySelectorAll('a[href$=".pdf"]');

    pdfLinks.forEach(link => {
      if (link.parentElement.querySelector('.aquamark-icon-btn')) return;

      const iconBtn = document.createElement("img");
      iconBtn.src = "https://www.aquamark.io/logo.png";
      iconBtn.title = "Watermark this file";
      iconBtn.className = "aquamark-icon-btn";
      iconBtn.style.width = "20px";
      iconBtn.style.height = "20px";
      iconBtn.style.marginLeft = "6px";
      iconBtn.style.cursor = "pointer";
      iconBtn.style.verticalAlign = "middle";
      iconBtn.style.borderRadius = "4px";
      iconBtn.style.boxShadow = "0 0 2px rgba(0,0,0,0.2)";

      iconBtn.addEventListener("click", async () => {
        const url = link.getAttribute("href");
        const filename = (link.textContent || "document").trim();

        try {
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
            a.download = `watermarked-${filename}`;
            a.click();
            URL.revokeObjectURL(downloadUrl);
          }
        } catch (err) {
          console.error("Watermarking failed for", filename, err);
          alert(`Failed to watermark ${filename}`);
        }
      });

      link.parentElement.appendChild(iconBtn);
    });
  });
}

// ---- Embedded Watermark Logic ----

async function watermarkPDF(pdfBytes, userEmail) {
  const { PDFDocument, rgb } = window.PDFLib;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  // Use your live logo for now
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
