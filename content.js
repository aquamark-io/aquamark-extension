function injectAquamarkButtons() {
  const buttons = document.querySelectorAll('.aQw');

  buttons.forEach(btn => {
    // Skip if our icon is already inside this specific button
    if (btn.querySelector('[data-aquamark]')) return;

    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("logo.png");
    icon.style.height = "20px";
    icon.style.marginLeft = "6px";
    icon.style.cursor = "pointer";
    icon.title = "Protect with Aquamark";
    icon.setAttribute("data-aquamark", "true");

    icon.addEventListener("click", () => {
      const fileName = btn.closest('.aQH')?.innerText?.trim() || 'protected.pdf';
      chrome.runtime.sendMessage({ type: "watermark", fileName });
    });

    btn.appendChild(icon);
  });
}

// Wait for Gmail to load, then inject once and again only when DOM changes
const observer = new MutationObserver(injectAquamarkButtons);
observer.observe(document.body, { childList: true, subtree: true });

injectAquamarkButtons(); // initial run
