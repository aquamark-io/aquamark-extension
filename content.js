(async () => {
  console.log("🔄 Injecting Aquamark...");

  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm');
  const supabase = createClient(
    'https://dvzmnikrvkvgragzhrof.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // full anon key here
  );

  const { watermarkPDF } = await import(chrome.runtime.getURL('watermark.js'));

  // Dummy email for now — later, dynamically pull user email
  const userEmail = '1christinaduncan@gmail.com';

  function injectButton(attachmentButton) {
    const logoUrl = chrome.runtime.getURL('logo.png');

    if (attachmentButton.querySelector('[data-aquamark]')) return;

    const icon = document.createElement('img');
    icon.src = logoUrl;
    icon.style.height = '20px';
    icon.style.marginLeft = '6px';
    icon.style.cursor = 'pointer';
    icon.setAttribute('data-aquamark', 'true');
    icon.title = "Protect with Aquamark";

    icon.onclick = async () => {
      console.log("🔒 Aquamark button clicked");

      // TEMP: Use dummy empty PDF
      const dummyBlob = new Blob([], { type: "application/pdf" });
      const output = await watermarkPDF(dummyBlob, userEmail);

      const a = document.createElement("a");
      a.href = URL.createObjectURL(output);
      a.download = "protected.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    };

    attachmentButton.appendChild(icon);
  }

  setInterval(() => {
    document.querySelectorAll('.aQw').forEach(injectButton);
  }, 2000);
})();
