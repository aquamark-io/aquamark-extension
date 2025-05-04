import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { PDFDocument, rgb } from 'https://cdn.jsdelivr.net/npm/pdf-lib/+esm';

// Setup Supabase
const supabase = createClient(
  'https://dvzmnikrvkvgragzhrof.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em1uaWtydmt2Z3JhZ3pocm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5Njg5NzUsImV4cCI6MjA1OTU0NDk3NX0.FaHsjIRNlgf6YWbe5foz0kJFtCO4FuVFo7KVcfhKPEk'
);

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === "watermark") {
    console.log("📥 Received watermark request");

    // Fetch logo
    const { data, error } = await supabase.storage.from("logos").download("logo.jpg");
    if (error || !data) return console.error("❌ Failed to get logo:", error);

    const logoBlob = data;
    const pdfBytes = await createBlankPDF(); // Or fetch the real file

    const watermarked = await watermarkPDF(pdfBytes, logoBlob);
    const file = new Blob([watermarked], { type: "application/pdf" });

    const url = URL.createObjectURL(file);
    chrome.downloads.download({
      url,
      filename: msg.fileName.replace(".pdf", " - protected.pdf"),
      saveAs: false
    });
  }
});

async function createBlankPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  page.drawText("Test PDF", { x: 50, y: 750, size: 24 });
  return await pdfDoc.save();
}

async function watermarkPDF(pdfBytes, logoBlob) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const logoImage = await pdfDoc.embedPng(await logoBlob.arrayBuffer());
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    const scale = 0.25;
    const logoWidth = logoImage.width * scale;
    const logoHeight = logoImage.height * scale;
    const x = (width - logoWidth) / 2;
    const y = (height - logoHeight) / 2;

    page.drawImage(logoImage, {
      x,
      y,
      width: logoWidth,
      height: logoHeight,
      opacity: 0.25
    });
  }

  return await pdfDoc.save();
}
