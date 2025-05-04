importScripts("supabase.umd.js");
const { PDFDocument, rgb, degrees } = PDFLib;

// Supabase config
const SUPABASE_URL = 'https://dvzmnikrvkvgragzhrof.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em1uaWtydmt2Z3JhZ3pocm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5Njg5NzUsImV4cCI6MjA1OTU0NDk3NX0.FaHsjIRNlgf6YWbe5foz0kJFtCO4FuVFo7KVcfhKPEk'; 
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Listen for message from content.js
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.action === 'watermarkAttachment') {
    const { fileUrl, filename } = request;

    try {
      const { userEmail } = await chrome.storage.local.get('userEmail');
      if (!userEmail) throw new Error("User email not found");

      // Check usage
      const { data: usageData, error } = await supabase
        .from('usage')
        .select('*')
        .eq('user_email', userEmail);

      if (error || !usageData || usageData.length === 0)
        throw new Error("Failed to fetch usage");

      const user = usageData[0];
      if (user.pages_used >= user.page_credits)
        return alert("❌ You’ve run out of Aquamark page credits. Upgrade your plan to continue watermarking.");

      // Download file from Gmail
      const fileRes = await fetch(fileUrl);
      let pdfBlob = await fileRes.blob();

      // Try to load with PDF-lib
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer());
      } catch (e) {
        // If encrypted, send to Render decryption endpoint
        const decryptRes = await fetch("https://aquamark-decrypt.onrender.com/decrypt", {
          method: "POST",
          body: pdfBlob
        });
        pdfBlob = await decryptRes.blob();
        pdfDoc = await PDFDocument.load(await pdfBlob.arrayBuffer());
      }

      const pageCount = pdfDoc.getPageCount();

      // Fetch stored logo
      const { data: logoFile } = await supabase
        .storage
        .from('logos')
        .download('logo.jpg');

      if (!logoFile) throw new Error("Failed to retrieve logo");

      const logoBytes = await logoFile.arrayBuffer();
      const logoImage = await pdfDoc.embedJpg(logoBytes);

      // Tile watermark logo
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        const { width, height } = page.getSize();
        const scale = 0.2;

        for (let x = -width; x < width * 2; x += 180) {
          for (let y = -height; y < height * 2; y += 140) {
            page.drawImage(logoImage, {
              x,
              y,
              width: logoImage.width * scale,
              height: logoImage.height * scale,
              opacity: 0.15,
              rotate: degrees(-45),
            });
          }
        }
      }

      // Add hologram overlay (optional)
      const holoRes = await fetch("https://www.aquamark.io/hologram.png");
      const holoBytes = await holoRes.arrayBuffer();
      const holoImg = await pdfDoc.embedPng(holoBytes);

      for (const page of pages) {
        const { width, height } = page.getSize();
        page.drawImage(holoImg, {
          x: width - 140,
          y: 40,
          width: 100,
          height: 100,
          opacity: 0.18
        });
      }

      // Update usage
      const updatedPagesUsed = user.pages_used + pageCount;
      await supabase.from('usage').update({ pages_used: updatedPagesUsed }).eq('user_email', userEmail);

      // Trigger download
      const finalBytes = await pdfDoc.save();
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      chrome.downloads.download({
        url: blobUrl,
        filename: filename.replace(/\.pdf$/, '') + ' - protected.pdf'
      });

    } catch (err) {
      console.error("❌ Error watermarking file:", err);
      alert("Aquamark failed to process this file. Check console for details.");
    }
  }
});
