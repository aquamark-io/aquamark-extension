Outseta.nocode.user.get().then(async user => {
  const userEmail = user?.email;
  const encodedEmail = encodeURIComponent(userEmail);

  const LOGO_PATH = `https://dvzmnikrvkvgragzhrof.supabase.co/storage/v1/object/public/logos/${encodedEmail}/logo.jpg`;
  const HOLOGRAM_URL = "https://www.aquamark.io/hologram.png";

  document.getElementById("processBtn").addEventListener("click", async () => {
    const status = document.getElementById("status");
    const input = document.getElementById("pdfInput");

    if (!input.files.length) {
      status.textContent = "Please upload at least one PDF.";
      return;
    }

    for (const file of input.files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        const pngImage = await pdfDoc.embedPng(LOGO_PATH);
        const holoImage = await pdfDoc.embedPng(HOLOGRAM_URL);
        const pages = pdfDoc.getPages();

        for (const page of pages) {
          const { width, height } = page.getSize();

          // Tile logo watermark diagonally
          const logoWidth = pngImage.width * 0.25;
          const logoHeight = pngImage.height * 0.25;
          for (let y = -logoHeight; y < height + logoHeight; y += logoHeight * 2) {
            for (let x = -logoWidth; x < width + logoWidth; x += logoWidth * 2) {
              page.drawImage(pngImage, {
                x,
                y,
                width: logoWidth,
                height: logoHeight,
                opacity: 0.4,
                rotate: PDFLib.degrees(45)
              });
            }
          }

          // Full-page hologram overlay
          page.drawImage(holoImage, {
            x: 0,
            y: 0,
            width,
            height,
            opacity: 0.07
          });
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${file.name.replace(".pdf", "")}_protected.pdf`;
        a.click();
      } catch (err) {
        status.textContent = `Error processing ${file.name}`;
        console.error(err);
      }
    }

    status.textContent = "Watermarking complete.";
  });
});
