function injectAquamarkButtons() {
  const buttons = document.querySelectorAll('.aQw:not([data-aquamark])');
  buttons.forEach(btn => {
    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("logo.png");
    icon.style.height = "20px";
    icon.style.marginLeft = "6px";
    icon.style.cursor = "pointer";
    icon.title = "Protect with Aquamark";
    icon.setAttribute("data-aquamark", "true");

    icon.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "watermark", fileName: "dummy.pdf" });
    });

    btn.appendChild(icon);
  });
}

setInterval(injectAquamarkButtons, 2000);
