function injectAquamarkButton() {
  const toolbar = document.querySelector("div[command='Files']")?.parentElement;
  if (!toolbar || document.querySelector("#aquamark-btn")) return;

  const btn = document.createElement("button");
  btn.id = "aquamark-btn";
  btn.title = "Watermark with Aquamark";
  btn.style.cssText = `
    margin-left: 10px;
    padding: 6px;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
  `;

  const img = document.createElement("img");
  img.src = chrome.runtime.getURL("icon.png");
  img.alt = "Aquamark";
  img.style.cssText = `
    width: 24px;
    height: 24px;
  `;

  btn.appendChild(img);
  btn.onclick = () => {
    chrome.runtime.sendMessage({ action: "watermark" });
  };

  toolbar.appendChild(btn);
}

const observer = new MutationObserver(() => injectAquamarkButton());
observer.observe(document.body, { childList: true, subtree: true });
