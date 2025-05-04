// Wait for Gmail to finish loading
const observer = new MutationObserver(() => {
  const cards = document.querySelectorAll('.aQw:not([data-aquamark-attached])');

  cards.forEach(card => {
    card.setAttribute('data-aquamark-attached', 'true');

    // Create the Aquamark icon button
    const btn = document.createElement('img');
    btn.src = 'https://www.aquamark.io/logo.png'; // fallback icon
    btn.alt = 'Aquamark';
    btn.title = 'Protect with Aquamark';
    btn.style.cssText = `
      width: 28px;
      height: 28px;
      border-radius: 6px;
      margin-left: 6px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    `;

    // Add click handler
    btn.addEventListener('click', () => {
      const filenameElem = card.querySelector('span.aV3');
      const fileUrlElem = card.querySelector('a[href^="https://mail.google.com/mail/u/0/?ui=2&ik="]');

      if (!filenameElem || !fileUrlElem) {
        alert("Could not find file details. Please try again.");
        return;
      }

      const fileUrl = fileUrlElem.href;
      const filename = filenameElem.textContent.trim();

      chrome.runtime.sendMessage({
        action: "watermarkAttachment",
        fileUrl,
        filename
      });
    });

    // Inject next to existing buttons
    const targetArea = card.querySelector('.aQw div');

    if (targetArea) {
      targetArea.appendChild(btn);
    }
  });
});

// Start observing
observer.observe(document.body, {
  childList: true,
  subtree: true
});
