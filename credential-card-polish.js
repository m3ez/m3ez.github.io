;(() => {
  const MARKER = "m3ez-credential-card-polish-v1";
  const ROOT_ID = "m3ez-credential-carousel-v1";
  const MIN_TITLE_PX = 20;
  const css = `
.credential-carousel-card{overflow:hidden;padding-bottom:2.8rem}
.credential-carousel-title{margin-top:.75rem;line-height:1.03;overflow-wrap:anywhere;word-break:normal}
.credential-carousel-issuer{margin-top:.5rem;font-size:11px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.credential-carousel-issued{display:none!important}
.credential-carousel-verify{position:absolute;right:1rem;bottom:.75rem;margin:0;font-size:11px;line-height:1;white-space:nowrap}
@media (max-width:640px){.credential-carousel-card{padding-bottom:2.6rem}.credential-carousel-title{margin-top:.65rem;line-height:1.02}.credential-carousel-verify{right:1rem;bottom:.7rem}}
`;

  function fitTitle(card, title) {
    title.style.fontSize = "";
    let size = parseFloat(window.getComputedStyle?.(title)?.fontSize || "30") || 30;
    title.style.fontSize = `${size}px`;
    while (card.scrollHeight > card.clientHeight && size > MIN_TITLE_PX) {
      size -= 1;
      title.style.fontSize = `${size}px`;
    }
  }

  function polish(root) {
    if (!document.getElementById(`${MARKER}-style`)) {
      const style = document.createElement("style");
      style.id = `${MARKER}-style`;
      style.textContent = css;
      document.head.appendChild(style);
    }

    const cards = [...root.querySelectorAll(".credential-carousel-card")];
    cards.forEach((card) => {
      const title = card.querySelector(".credential-carousel-title");
      const issuer = card.querySelector(".credential-carousel-issuer");
      const issued = card.querySelector(".credential-carousel-issued");

      if (issuer && issued) {
        const issuerText = issuer.textContent.trim();
        const year = issued.textContent.trim();
        issuer.textContent = year ? `${issuerText} - ${year}` : issuerText;
        issued.remove();
      }

      if (title) fitTitle(card, title);
    });
  }

  function mount() {
    const root = document.getElementById(ROOT_ID);
    if (!root) {
      requestAnimationFrame(mount);
      return;
    }

    polish(root);
    let resizeFrame = 0;
    window.addEventListener("resize", () => {
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0;
        polish(root);
      });
    });
  }

  if (document.readyState === "complete") requestAnimationFrame(mount);
  else window.addEventListener("load", () => requestAnimationFrame(mount), { once: true });
})();