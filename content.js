// Inject PDFLib
const pdfLibScript = document.createElement('script');
pdfLibScript.src = chrome.runtime.getURL('pdf-lib.min.js');
document.head.appendChild(pdfLibScript);

// Inject Supabase from local file
const supabaseScript = document.createElement("script");
supabaseScript.src = chrome.runtime.getURL("supabase.js");
supabaseScript.onload = () => {
  window.supabaseLoaded = true;
};
document.head.appendChild(supabaseScript);

// Supabase config
const SUPABASE_URL = 'https://dvzmnikrvkvgragzhrof.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em1uaWtydmt2Z3JhZ3pocm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5Njg5NzUsImV4cCI6MjA1OTU0NDk3NX0.FaHsjIRNlgf6YWbe5foz0kJFtCO4FuVFo7KVcfhKPEk';

// Helper: extract Gmail address from account button
function getGmailAddress() {
  const accountBtn = document.querySelector('a[aria-label^="Google Account:"]');
  if (accountBtn) {
    const label = accountBtn.getAttribute("aria-label");
    const match = label.match(/\(([^)]+@[^)]+)\)/);
    if (match) return match[1];
  }
  return null;
}

// Helper: decrypt PDF
async function decryptPDF(blob) {
  const formData = new FormData();
  formData.append("file", blob);
  const response = await fetch("https://aquamark-decrypt.onrender.com/decrypt", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) throw new Error("Decryption failed");
  return await response.arrayBuffer();
}

// Watermark handler
async function handleWatermarkClick(link) {
  try {
    const email = getGmailAddress();
    if (!email) {
      alert("❌ Could not detect your Gmail address. Please log into Gmail with your Aquamark account.");
      return;
    }

    const url = link.getAttribute("href");
    const originalName = (link.textContent || "document").replace(".pdf", "");

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const logoListRes = await fetch(`${SUPABASE_URL}/storage/v1/object/list/logos/${email}`, {
      headers: { apikey: SUPABASE_KEY }
    });
    const logoList = await logoListRes.json();
    const logoFile = logoList?.[0]?.name;
    if (!logoFile) throw new Error("No logo found");
    const logoUrl = `${SUPABASE_URL}/storage/v1/object/public/logos/${email}/${logoFile}`;

    const hologramUrl = "https://www.aquamark.io/hologram.png";

    let response = await fetch(url);
    let blob = await response.blob();
    let arrayBuffer;
    try {
      arrayBuffer = await blob.arrayBuffer();
      await PDFLib.PDFDocument.load(arrayBuffer);
    } catch {
      arrayBuffer = await decryptPDF(blob);
    }

    const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();

    const logoBytes = await fetch(logoUrl).then(r => r.arrayBuffer());
    const embeddedLogo = await pdfDoc.embedPng(logoBytes);
    const logoDims = embeddedLogo.scale(0.35);

    const hologramBytes = await fetch(hologramUrl).then(r => r.arrayBuffer());
    const hologramImage = await pdfDoc.embedPng(hologramBytes);

    const usageRes = await supabase.from('usage').select('*').eq('user_email', email).single();
    const usage = usageRes.data;
    if (!usage || usage.pages_remaining < pages.length) {
      alert(`❌ Not enough page credits. You need ${pages.length}, but have ${usage?.pages_remaining || 0}.`);
      return;
    }

    for (const page of pages) {
      const { width, height } = page.getSize();

      for (let x = 0; x < width; x += (logoDims.width + 100)) {
        for (let y = 0; y < height; y += (logoDims.height + 100)) {
          page.drawImage(embeddedLogo, {
            x, y,
            width: logoDims.width,
            height: logoDims.height,
            rotate: PDFLib.degrees(45),
            opacity: 0.15
          });
        }
      }

      page.drawImage(hologramImage, {
        x: width - 55,
        y: height - 55,
        width: 45,
        height: 45,
        opacity: 0.7
      });
    }

    const updatedUsed = usage.pages_used + pages.length;
    const updatedRemaining = usage.page_credits - updatedUsed;
    await supabase.from('usage').update({
      pages_used: updatedUsed,
      pages_remaining: updatedRemaining
    }).eq('user_email', email);

    const finalPdf = await pdfDoc.save();
    const blobOut = new Blob([finalPdf], { type: "application/pdf" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blobOut);
    a.download = `${originalName} - protected.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    console.error("❌ Error watermarking:", err);
    alert("❌ Failed to watermark file: " + err.message);
  }
}

// Observe Gmail DOM
const observer = new MutationObserver(() => waitForGmailAttachments());
observer.observe(document.body, { childList: true, subtree: true });

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
      iconBtn.style.width = "27px";
      iconBtn.style.height = "27px";
      iconBtn.style.margin = "0 2px 0 0";
      iconBtn.style.cursor = "pointer";
      iconBtn.style.verticalAlign = "middle";
      iconBtn.style.borderRadius = "4px";
      iconBtn.style.boxShadow = "0 0 2px rgba(0,0,0,0.2)";

      iconBtn.addEventListener("click", () => {
        if (window.supabaseLoaded) {
          handleWatermarkClick(link);
        } else {
          setTimeout(() => {
            if (window.supabaseLoaded) {
              handleWatermarkClick(link);
            } else {
              alert("Supabase is still loading. Try again in a few seconds.");
            }
          }, 1000);
        }
      });

      link.parentElement.appendChild(iconBtn);
    });
  });
}
