const { PDFDocument, degrees } = PDFLib;

const SUPABASE_URL = "https://dvzmnikrvkvgragzhrof.supabase.co";
const LOGO_PATH =
  "https://dvzmnikrvkvgragzhrof.supabase.co/storage/v1/object/public/logos/1christinaduncan@gmail.com/logo-1746324106120.png";
const HOLOGRAM_URL = "https://www.aquamark.io/hologram.png"; // Optional if you're layering both

document
  .getElementById("processBtn")
  .addEventListener("click", async () => {
    const status = document.getElementById("status");
    const input = document.getElementById("pdfInput");

    if (!input.files.length) {
      status.textContent = "Please select at least one PDF.";
      return;
    }

    for (const file of input.files) {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // ✅ Load logo
      const logoResponse = await fetch(LOGO_PATH);
      const logoBuffer = await logoResponse.arrayBuffer();
      const contentType = logoResponse.headers.get("Content-Type");

      let logoImage;
      if (contentType === "image/png") {
        logoImage = await pdfDoc.embedPng(logoBuffer);
      } else if (
        contentType === "image/jpeg" ||
        contentType === "image/jpg"
      ) {
        logoImage = await pdfDoc.embedJpg(logoBuffer);
      } else {
        status.textContent = "Unsupported image format.";
        return;
      }

      const logoDims = logoImage.scale(0.3);

      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();

        page.drawImage(logoImage, {
          x: width / 2 - logoDims.width / 2,
          y: height / 2 - logoDims.height / 2,
          width: logoDims.width,
          height: logoDims.height,
          rotate: degrees(-45),
          opacity: 0.25,
        });
      }

      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = file.name.replace(".pdf", "-protected.pdf");
      downloadLink.click();

      URL.revokeObjectURL(url);
    }

    status.textContent = "Watermarking complete!";
  });
