(() => {
  function showProof() {
    if (document.getElementById('xss-poc-proof')) return;

    const dialog = document.createElement('dialog');
    dialog.id = 'xss-poc-proof';
    dialog.textContent = `XSS PoC by Supakiad S. (m3ez) — ${location.origin}`;
    document.body.append(dialog);

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  if (document.body) showProof();
  else document.addEventListener('DOMContentLoaded', showProof, { once: true });
})();
