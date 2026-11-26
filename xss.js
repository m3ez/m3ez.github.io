
!function () {
  let page;
  try {
    page = top;
    void page.document.body;
  } catch (_) {
    page = window;
  }
  const doc = page.document;

  function showProof() {
    if (!doc.body) return;
    if (doc.getElementById('m3ez')) return;

    const dialog = doc.createElement('dialog');
    dialog.id = 'm3ez';
    dialog.textContent = 'PoC by Supakiad S. (m3ez) — ' + page.location.origin;
    doc.body.append(dialog);

    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  showProof();
  page.setTimeout(showProof, 2000);

  if (window.location.origin === 'http://127.0.0.1:5041' &&
      new URLSearchParams(window.location.search).has('loader') &&
      !document.querySelector('script[src*="/commonResources/playerLoader/Player.Loader."]')) {
    const player = document.createElement('script');
    player.src = '/commonResources/playerLoader/Player.Loader.521a6e1adc0169d7.js';
    document.head.append(player);
  }
}();
