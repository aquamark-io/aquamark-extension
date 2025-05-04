import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import * as PDFLib from 'https://unpkg.com/pdf-lib@1.17.1/+esm';

const SUPABASE_URL = 'https://dvzmnikrvkvgragzhrof.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em1uaWtydmt2Z3JhZ3pocm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5Njg5NzUsImV4cCI6MjA1OTU0NDk3NX0.FaHsjIRNlgf6YWbe5foz0kJFtCO4FuVFo7KVcfhKPEk'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'watermark') {
    try {
      const user = await getOutsetaUser();
      if (!user || !user.Email) throw new Error("Missing Outseta user");

      const logoUrl = await fetchLogoUrl(user.Email);
      const logoBytes = await fetchBinary(logoUrl);
      const hologramBytes = await fetchOptionalBinary(chrome.runtime.getURL('hologram.png'));

      const files = await promptForPDFs();
      const usage = await getUsage(user.Email);
      const totalPages = await getTotalPages(files);

      if (usage.page_credits - usage.pages_used < totalPages) {
        alert(`❌ Not enough page credits. You need ${totalPages}, but have only ${usage.page_credits - usage.pages_used}.`);
        return;
      }

      for (const file of files) {
        const pdfBytes = await tryDecryptPDF(file);
        const processedBytes = await watermarkPDF(pdfBytes, logoBytes, hologramBytes);
        triggerDownload(file.name.replace('.pdf', '') + ' - protected.pdf', processedBytes);

        // Update usage
        await supabase.from('usage')
          .update({ pages_used: usage.pages_used += PDFLib.PDFDocument.load(pdfBytes).getPageCount() })
          .eq('user_email', user.Email);
      }

      alert("✅ Files watermarked and downloaded.");

    } catch (err) {
      console.error(err);
      alert(`❌ Error: ${err.message}`);
    }
  }
});

// Helpers
async function getOutsetaUser() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => Outseta?.nocode?.user,
  }).then(res => res[0].result);
}

async function fetchLogoUrl(email) {
  const { data: files } = await supabase.storage.from("logos").list(email);
  const latest = files.filter(f => f.name.startsWith("logo-")).sort((a, b) =>
    parseInt(b.name.split("-")[1]) - parseInt(a.name.split("-")[1])
  )[0];
  return supabase.storage.from("logos").getPublicUrl(`${email}/${latest.name}`).data.publicUrl;
}

async function fetchBinary(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch binary: " + url);
  return await res.arrayBuffer();
}

async function fetchOptionalBinary(url) {
  try {
    return await fetchBinary(url);
  } catch {
    return null;
  }
}

async function promptForPDFs() {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf";
    input.multiple = true;
    input.style.display = "none";
    input.onchange = () => resolve(Array.from(input.files));
    document.body.appendChild(input);
    input.click();
  });
}

async function getUsage(email) {
  const { data, error } = await supabase.from("usage").select("*").eq("user_email", email).single();
  if (error || !data) throw new Error("Could not load usage");
  return data;
}

async function getTotalPages(files) {
  let total = 0;
  for (const file of files) {
    try {
      const pdf = await PDFLib.PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: false });
      total += pdf.getPageCount();
    } catch {
      const decrypted = await decryptPDF(file);
      const pdf = await PDFLib.PDFDocument.load(decrypted, { ignoreEncryption: true });
      total += pdf.getPageCount();
    }
  }
  return total;
}

async function tryDecryptPDF(file) {
  try {
    return await file.arrayBuffer();
  } catch {
    return await decryptPDF(file);
  }
}

async function decryptPDF(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("https://aquamark-decrypt.onrender.com/decrypt", { method: "POST", body: form });
  if (!res.ok) throw new Error("Failed to decrypt PDF");
  return await res.arrayBuffer();
}

async function watermarkPDF(pdfBytes, logoBytes, hologramBytes) {
  const pdfDoc = await PDFLib.PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  const logoImg = await tryEmbedImage(pdfDoc, logoBytes);
  const logoDims = logoImg.scale(0.35);
  let hologramImg = null;

  if (hologramBytes) {
    try {
      hologramImg = await pdfDoc.embedPng(hologramBytes);
    } catch {}
  }

  for (const page of pages) {
    const { width, height } = page.getSize();

    // Tile the logo
    for (let x = 0; x < width; x += logoDims.width + 100) {
      for (let y = 0; y < height; y += logoDims.height + 100) {
        page.drawImage(logoImg, {
          x, y,
          width: logoDims.width,
          height: logoDims.height,
          opacity: 0.15,
          rotate: PDFLib.degrees(45)
        });
      }
    }

    // Add hologram
    if (hologramImg) {
      page.drawImage(hologramImg, {
        x: width - 55,
        y: height - 55,
        width: 45,
        height: 45,
        opacity: 0.7
      });
    }
  }

  return await pdfDoc.save({
    useObjectStreams: true,
    compressContentStreams: true,
    preservePDFFormFields: true
  });
}

async function tryEmbedImage(pdfDoc, bytes) {
  try {
    return await pdfDoc.embedPng(bytes);
  } catch {
    return await pdfDoc.embedJpg(bytes);
  }
}

function triggerDownload(filename, bytes) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  chrome.downloads.download({
    url,
    filename,
    saveAs: true
  }, () => setTimeout(() => URL.revokeObjectURL(url), 100));
}
