import { PDFDocument, degrees } from "https://cdn.skypack.dev/pdf-lib@1.17.1";

const SUPABASE_URL = "https://dvzmnikrvkvgragzhrof.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em1uaWtydmt2Z3JhZ3pocm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5Njg5NzUsImV4cCI6MjA1OTU0NDk3NX0.FaHsjIRNlgf6YWbe5foz0kJFtCO4FuVFo7KVcfhKPEk"; // Your full anon key here
const LOGO_PATH = "your_email/logo.png"; // replace with the user's real email logic
const HOLOGRAM_URL = "https://www.aquamark.io/hologram.png";

document.getElementById("processBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const input = document.getElementById("pdfInput");
  const files = Array.from(input.files);
  if (files.length === 0) return (status.textContent = "No PDFs selected.");

  status.textContent = "Loading logo...";
  const logo = await fetchLogo();
  const hologram = await fetchImageBytes(HOLOGRAM_URL);

  for (const file of files) {
    status.textContent = `Watermarking ${file.name}...`;
    const originalBytes = await file.arrayBuffer();
    const pdfDoc = await PDFDocument.load(originalBytes);
    const logoImg = await embedImage(pdfDoc, logo);
    const holoImg = hologram ? await embedImage(pdfDoc, hologram) : null;

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width, height } = page.getSize();

      // Tiled logo watermark
      const dims = logoImg.scale(0.35);
      for (let x = 0; x < width; x += dims.width + 100) {
        for (let y = 0; y < height; y += dims.height + 100) {
          page.drawImage(logoImg, {
            x,
            y,
            width: dims.width,
            height: dims.height,
            opacity: 0.15,
            rotate: degrees(45),
          });
        }
      }

      // Hologram in corner
      if (holoImg) {
        page.drawImage(holoImg, {
          x: width - 55,
          y: height - 55,
          width: 45,
          height: 45,
          opacity: 0.7,
        });
      }
    }

    const watermarked = await pdfDoc.save();
    const blob = new Blob([watermarked], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    chrome.downloads.download({
      url,
      filename: file.name.replace(".pdf", "") + "-protected.pdf",
      saveAs: true,
    });
  }

  status.textContent = "✅ All files processed.";
});

async function fetchLogo() {
  const logoUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${LOGO_PATH}`;
  return await fetchImageBytes(logoUrl);
}

async function fetchImageBytes(url) {
  try {
    const res = await fetch(url);
    return await res.arrayBuffer();
  } catch (err) {
    console.warn("Image fetch failed:", err);
    return null;
  }
}

async function embedImage(pdfDoc, imageBytes) {
  try {
    return await pdfDoc.embedPng(imageBytes);
  } catch {
    return await pdfDoc.embedJpg(imageBytes);
  }
}
