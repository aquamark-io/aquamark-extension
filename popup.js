const { PDFDocument, degrees } = PDFLib;

const LOGO_PATH = "https://dvzmnikrvkvgragzhrof.supabase.co/storage/v1/object/public/logos/1christinaduncan@gmail.com/logo-1746324106120.png";
const HOLOGRAM_URL = "https://www.aquamark.io/hologram.png";

document.getElementById("processBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const input = document.getElementById("pdfInput");

  if (!input.files.length) {
    status.textContent = "Please select at least one PDF.";
    return;
  }

  for (const file of input.files) {
    try {
      const arrayBuffer = await file.arrayBuffer();

      // Attempt to load PDF
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(arrayBuffer);
      } catch (e) {
        status.textContent = `Failed to read PDF: ${file.name}`;
        continue;
      }

      // Load logo from Supabase
      const logoResponse = await fetch(LOGO_PATH);
      const logoBytes = await logoResponse.arrayBuffer();
      const contentType = logoResponse.headers.get("Content-Type");

      let logoImage;
      if (contentType === "image/png") {
        logoImage = await pdfDoc.embedPng(logoBytes);
      } else if (contentType === "image/jpeg" || contentType === "image/jpg") {
        logoImage = await pdfDoc.embedJpg(logoBytes);
      } else {
        status.textContent = "Unsupported logo format.";
        return;
      }

      const logoDims = logoImage.scale(0.3);
      const pages = pdfDoc.getPages();

      // Load hologram (optional)
      let hologramImage = null;
      try {
        const hologramResponse = await fetch(HOLOGRAM_URL);
        const hologramBytes = await hologramResponse.arrayBuffer();
        hologramImage = await pdfDoc.embedPng(hologramBytes);
      } catch (err) {
        console.warn("Hologram failed to load.");
      }

      // Watermark all pages
      for (const page of pages) {
        const { width, height } = page.getSize();

        // Tiled logo watermark
        for (let x = 0; x < width; x += logoDims.width + 100) {
          for (let y = 0; y < height; y += logoDims.height + 100) {
            page.drawImage(logoImage, {
              x,
              y,
              width: logoDims.width,
              height: logoDims.height,
              opacity: 0.15,
              rotate: degrees(45),
            });
          }
        }

        // Bottom-right hologram
        if (hologramImage) {
          page.drawImage(hologramImage, {
            x: width - 50,
            y: height - 50,
            width: 40,
            height: 40,
            opacity: 0.7,
          });
        }
      }

      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const downloadLink = document.createElement("a");
      const baseName = file.name.replace(/\.pdf$/i, "");
      downloadLink.href = url;
      downloadLink.download = `${baseName}-protected.pdf`;
      downloadLink.click();
      URL.revokeObjectURL(url);

      status.textContent = "Watermarking complete!";
    } catch (error) {
      console.error("Error watermarking:", error);
      status.textContent = `Error processing: ${file.name}`;
    }
  }
});
