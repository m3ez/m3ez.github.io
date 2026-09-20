// Interaction code moved from the exported Next.js chunk.
// Mount the carousel before the redesign replaces its credential source list.
export function initializeInteractions() {
  (() => {
    const MARKER = "m3ez-credential-carousel-v1";
    const ROTATION_MS = 4500;
    const css = `
.hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(25rem,.95fr);column-gap:clamp(2rem,5vw,4rem);align-items:center}
.hero>.role,.hero>h1,.hero>.trust-statement,.hero>.hero-copy,.hero>.proof-links{grid-column:1}
.credential-carousel{grid-column:2;grid-row:1/6;width:100%;max-width:38rem;min-width:0;justify-self:end}
.credential-carousel-stage{position:relative;height:15rem;overflow:hidden}
.credential-carousel-card{position:absolute;top:50%;left:50%;z-index:0;display:flex;flex-direction:column;width:min(58%,18rem);height:12.75rem;padding:1.15rem;border:1px solid var(--line);background:var(--paper);color:var(--ink);opacity:0;transform:translate(-50%,-50%) scale(.68);pointer-events:none;text-decoration:none;cursor:pointer;transition:left 400ms ease,opacity 400ms ease,transform 400ms ease,border-color 400ms ease}
.credential-carousel-card[data-position="current"]{left:50%;z-index:3;border-color:var(--black);opacity:1;transform:translate(-50%,-50%) scale(1);pointer-events:auto}
.credential-carousel-card[data-position="previous"]{left:18%;z-index:2;opacity:.46;transform:translate(-50%,calc(-50% + .6rem)) scale(.78);pointer-events:auto}
.credential-carousel-card[data-position="next"]{left:82%;z-index:2;opacity:.46;transform:translate(-50%,calc(-50% + .6rem)) scale(.78);pointer-events:auto}
.credential-carousel-card[data-position="past"]{left:-12%;opacity:0;transform:translate(-50%,calc(-50% + .8rem)) scale(.68)}
.credential-carousel-card[data-position="future"]{left:112%;opacity:0;transform:translate(-50%,calc(-50% + .8rem)) scale(.68)}
.credential-carousel-kicker,.credential-carousel-issuer,.credential-carousel-issued,.credential-carousel-verify{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.credential-carousel-kicker{color:var(--muted);font-size:10px;letter-spacing:.16em;text-transform:uppercase}
.credential-carousel-title{margin-top:1.05rem;font-size:clamp(26px,3vw,34px);line-height:1;letter-spacing:-.025em}
.credential-carousel-issuer{margin-top:.7rem;font-size:13px}.credential-carousel-issued{margin-top:.2rem;color:var(--muted);font-size:11px}.credential-carousel-verify{align-self:flex-end;margin-top:auto;font-size:12px}
.credential-carousel-controls{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:.25rem;align-items:center;width:min(100%,30rem);margin:.1rem auto 0}
.credential-carousel-arrow,.credential-carousel-dot{font:inherit;cursor:pointer}.credential-carousel-arrow{min-width:44px;min-height:44px;padding:0;border:0;background:transparent;color:var(--ink);opacity:0;pointer-events:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:20px}
.credential-carousel:hover .credential-carousel-arrow,.credential-carousel:focus-within .credential-carousel-arrow{opacity:1;pointer-events:auto}
.credential-carousel-dots{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:0 .05rem}.credential-carousel-dot{position:relative;width:18px;min-height:36px;padding:0;border:0;background:transparent}
.credential-carousel-dot::before{position:absolute;top:50%;left:50%;width:6px;height:6px;background:var(--line);clip-path:circle(50%);content:"";transform:translate(-50%,-50%)}.credential-carousel-dot.is-active::before{background:var(--black)}
@media (hover:none){.credential-carousel-arrow{opacity:1;pointer-events:auto}}@media (prefers-reduced-motion:reduce){.credential-carousel-card{transition:none}}
@media (max-width:880px){.hero{grid-template-columns:1fr;column-gap:0}.credential-carousel{grid-column:1;grid-row:auto;max-width:36rem;justify-self:center;margin-top:1.75rem}}
@media (max-width:640px){.credential-carousel-stage{height:12.5rem}.credential-carousel-card{width:min(72%,17rem);height:11.5rem;padding:1rem}.credential-carousel-card[data-position="previous"]{left:9%}.credential-carousel-card[data-position="next"]{left:91%}.credential-carousel-card[data-position="past"]{left:-24%}.credential-carousel-card[data-position="future"]{left:124%}.credential-carousel-title{font-size:clamp(24px,9vw,30px)}.credential-carousel-controls{width:100%}.credential-carousel-dot{width:16px;min-height:32px}.credential-carousel-arrow{opacity:1;pointer-events:auto}}
`;
    function mount() {
      if (document.getElementById(MARKER)) return;
      const hero = document.querySelector(".hero");
      if (!hero) return;
      const sourceItems = [
        ...document.querySelectorAll(
          '.credential-list li[data-kind="credential"]',
        ),
      ]
        .map((li) => {
          const link = li.querySelector("a");
          if (!link) return null;
          const meta = li.querySelector(".record-meta")?.textContent || "";
          const [issuer = "", issued = ""] = meta
            .split("·")
            .map((v) => v.trim());
          return {
            title: (link.textContent || "").trim(),
            issuer,
            issued: issued.slice(0, 4),
            href: link.href,
          };
        })
        .filter(Boolean);
      const items = sourceItems;
      if (items.length < 2) return;
      const style = document.createElement("style");
      style.id = `${MARKER}-style`;
      style.textContent = css;
      document.head.appendChild(style);
      const root = document.createElement("div");
      root.id = MARKER;
      root.className = "credential-carousel";
      root.setAttribute("role", "region");
      root.setAttribute("aria-roledescription", "carousel");
      root.setAttribute("aria-label", "Credentials");
      const stage = document.createElement("div");
      stage.className = "credential-carousel-stage";
      root.appendChild(stage);
      const cards = items.map((item, index) => {
        const card = document.createElement("a");
        card.className = "credential-carousel-card";
        card.href = item.href;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.dataset.index = String(index);
        const kicker = document.createElement("span");
        kicker.className = "credential-carousel-kicker";
        kicker.textContent = "Certification";
        const title = document.createElement("strong");
        title.className = "credential-carousel-title";
        title.textContent = item.title;
        const issuer = document.createElement("span");
        issuer.className = "credential-carousel-issuer";
        issuer.textContent = item.issuer;
        const issued = document.createElement("span");
        issued.className = "credential-carousel-issued";
        issued.textContent = item.issued;
        const verify = document.createElement("span");
        verify.className = "credential-carousel-verify";
        card.append(kicker, title, issuer, issued, verify);
        stage.appendChild(card);
        return { card, verify, item };
      });
      const controls = document.createElement("div");
      controls.className = "credential-carousel-controls";
      const previous = document.createElement("button");
      previous.className = "credential-carousel-arrow";
      previous.type = "button";
      previous.setAttribute("aria-label", "Previous credential");
      previous.textContent = "←";
      const dots = document.createElement("div");
      dots.className = "credential-carousel-dots";
      dots.setAttribute("aria-label", "Choose credential");
      const dotButtons = items.map((item, index) => {
        const dot = document.createElement("button");
        dot.className = "credential-carousel-dot";
        dot.type = "button";
        dot.setAttribute("aria-label", `Show ${item.title} credential`);
        dot.addEventListener("click", () => select(index));
        dots.appendChild(dot);
        return dot;
      });
      const next = document.createElement("button");
      next.className = "credential-carousel-arrow";
      next.type = "button";
      next.setAttribute("aria-label", "Next credential");
      next.textContent = "→";
      controls.append(previous, dots, next);
      root.appendChild(controls);
      hero.appendChild(root);
      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );
      let activeIndex = 0,
        paused = false,
        timer = 0;
      function positionFor(index) {
        if (index === activeIndex) return "current";
        const forward = (index - activeIndex + items.length) % items.length;
        if (forward === 1) return "next";
        if (forward === items.length - 1) return "previous";
        return forward <= items.length / 2 ? "future" : "past";
      }
      function render() {
        cards.forEach(({ card, verify, item }, index) => {
          const position = positionFor(index),
            current = position === "current",
            visible = current || position === "previous" || position === "next";
          card.dataset.position = position;
          card.tabIndex = visible ? 0 : -1;
          if (visible) card.removeAttribute("aria-hidden");
          else card.setAttribute("aria-hidden", "true");
          if (current) card.setAttribute("aria-current", "true");
          else card.removeAttribute("aria-current");
          card.setAttribute(
            "aria-label",
            current
              ? `Verify ${item.title} credential (opens in new tab)`
              : `Show ${item.title} credential`,
          );
          verify.textContent = current ? "Verified ↗" : "";
        });
        dotButtons.forEach((dot, index) => {
          dot.classList.toggle("is-active", index === activeIndex);
          if (index === activeIndex) dot.setAttribute("aria-current", "true");
          else dot.removeAttribute("aria-current");
        });
      }
      function clearTimer() {
        if (timer) window.clearTimeout(timer);
        timer = 0;
      }
      function schedule() {
        clearTimer();
        if (paused || reducedMotion.matches) return;
        timer = window.setTimeout(() => {
          activeIndex = (activeIndex + 1) % items.length;
          render();
          schedule();
        }, ROTATION_MS);
      }
      function select(index) {
        activeIndex = (index + items.length) % items.length;
        render();
        schedule();
      }
      previous.addEventListener("click", () => select(activeIndex - 1));
      next.addEventListener("click", () => select(activeIndex + 1));
      cards.forEach(({ card }, index) =>
        card.addEventListener("click", (event) => {
          if (index !== activeIndex) {
            event.preventDefault();
            select(index);
          }
        }),
      );
      root.addEventListener("mouseenter", () => {
        paused = true;
        clearTimer();
      });
      root.addEventListener("mouseleave", () => {
        paused = root.contains(document.activeElement);
        if (!paused) schedule();
      });
      root.addEventListener("focusin", () => {
        paused = true;
        clearTimer();
      });
      root.addEventListener("focusout", (event) => {
        if (!root.contains(event.relatedTarget)) {
          paused = root.matches(":hover");
          if (!paused) schedule();
        }
      });
      reducedMotion.addEventListener?.("change", schedule);
      render();
      schedule();
    }
    mount();
  })();

  (() => {
    const METHOD_LINE =
      "Map > Trace > Analyze > Exploit > Verify > Document > Report";
    const updateMethod = () => {
      const methodLine = document.querySelector(".method-line");
      if (methodLine) methodLine.textContent = METHOD_LINE;
    };

    updateMethod();
  })();

  (() => {
    const MARKER = "m3ez-swipe-nav-v1";
    const SWIPE_THRESHOLD = 48;

    function enhance() {
      if (!document.querySelector(".hero")) return;
      if (document.documentElement.dataset.m3ezSwipeNav === MARKER) return;
      document.documentElement.dataset.m3ezSwipeNav = MARKER;

      const nav = document.querySelector(".site-header nav");
      if (nav && !nav.querySelector('a[href="#credentials"]')) {
        const credentials = document.createElement("a");
        credentials.href = "#credentials";
        credentials.className = "nav-credentials";
        credentials.textContent = "Credentials";
        const consulting = nav.querySelector(".nav-consulting");
        nav.insertBefore(credentials, consulting || nav.lastElementChild);
      }

      const root = document.getElementById("m3ez-credential-carousel-v1");
      const stage = root?.querySelector(".credential-carousel-stage");
      const previous = root?.querySelector(
        'button[aria-label="Previous credential"]',
      );
      const next = root?.querySelector('button[aria-label="Next credential"]');
      if (!root || !stage || !previous || !next) {
        delete document.documentElement.dataset.m3ezSwipeNav;
        requestAnimationFrame(enhance);
        return;
      }

      stage.style.touchAction = "pan-y";
      stage.style.cursor = "grab";
      stage.style.willChange = "transform";

      let pointerId = null;
      let startX = 0;
      let startY = 0;
      let dragging = false;
      let suppressClick = false;

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

      function resetStage() {
        stage.style.transition = reducedMotion.matches
          ? "none"
          : "transform 160ms ease";
        stage.style.transform = "translate3d(0,0,0)";
        stage.style.cursor = "grab";
        stage.style.userSelect = "";
      }

      function finish(event, cancelled = false) {
        if (pointerId === null || event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const horizontal = Math.abs(dx) > Math.abs(dy);
        const shouldMove =
          !cancelled && horizontal && Math.abs(dx) >= SWIPE_THRESHOLD;

        if (stage.hasPointerCapture?.(pointerId))
          stage.releasePointerCapture(pointerId);
        pointerId = null;
        resetStage();

        if (shouldMove) {
          suppressClick = true;
          (dx < 0 ? next : previous).click();
          window.setTimeout(() => {
            suppressClick = false;
          }, 0);
        }

        root.dispatchEvent(new Event("mouseleave"));
        dragging = false;
      }

      stage.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        pointerId = event.pointerId;
        startX = event.clientX;
        startY = event.clientY;
        dragging = false;
        stage.style.transition = "none";
        stage.style.cursor = "grabbing";
        stage.style.userSelect = "none";
        stage.setPointerCapture?.(pointerId);
        root.dispatchEvent(new Event("mouseenter"));
      });

      stage.addEventListener("pointermove", (event) => {
        if (pointerId === null || event.pointerId !== pointerId) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (Math.abs(dx) <= Math.abs(dy) || Math.abs(dx) < 6) return;
        dragging = true;
        event.preventDefault();
        const offset = Math.max(-90, Math.min(90, dx * 0.35));
        stage.style.transform = `translate3d(${offset}px,0,0)`;
      });

      stage.addEventListener("pointerup", (event) => finish(event));
      stage.addEventListener("pointercancel", (event) => finish(event, true));
      stage.addEventListener("dragstart", (event) => event.preventDefault());
      stage.addEventListener(
        "click",
        (event) => {
          if (!suppressClick && !dragging) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClick = false;
          dragging = false;
        },
        true,
      );
    }

    enhance();
  })();

  (() => {
    const MARKER = "m3ez-mobile-nav-v1";
    const PANEL_ID = "mobile-primary-navigation";
    const css = `
.mobile-nav-toggle,.mobile-nav-panel{display:none}
@media (max-width:640px){
.site-header nav{position:relative;flex:0 0 auto}
.site-header nav>a{display:none}
.mobile-nav-toggle{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0;border:0;background:transparent;color:var(--ink);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;white-space:nowrap;cursor:pointer}
.mobile-nav-panel{position:absolute;top:calc(100% + 1px);right:0;z-index:40;min-width:10.5rem;border:1px solid var(--black);background:var(--paper);padding:.35rem 0;flex-direction:column;align-items:stretch}
.mobile-nav-panel:not([hidden]){display:flex}
.site-header nav .mobile-nav-panel a{display:flex;align-items:center;min-height:44px;padding:0 .8rem;white-space:nowrap;overflow-wrap:normal;text-decoration:none;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px}
}
`;

    function mount() {
      if (document.getElementById(MARKER)) return;
      const nav = document.querySelector(".site-header nav");
      if (!nav) return;

      const style = document.createElement("style");
      style.id = `${MARKER}-style`;
      style.textContent = css;
      document.head.appendChild(style);

      const button = document.createElement("button");
      button.id = MARKER;
      button.className = "mobile-nav-toggle";
      button.type = "button";
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-controls", PANEL_ID);
      button.setAttribute("aria-label", "Open navigation menu");
      button.textContent = "Menu ▾";

      const panel = document.createElement("div");
      panel.id = PANEL_ID;
      panel.className = "mobile-nav-panel";
      panel.hidden = true;

      [
        ["Research", "#research"],
        ["Credentials", "#credentials"],
        ["Consulting", "#consulting"],
        ["Contact", "#contact"],
      ].forEach(([label, href]) => {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        link.addEventListener("click", () => closeMenu());
        panel.appendChild(link);
      });

      function closeMenu(returnFocus = false) {
        panel.hidden = true;
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Open navigation menu");
        button.textContent = "Menu ▾";
        if (returnFocus) button.focus();
      }

      function openMenu() {
        panel.hidden = false;
        button.setAttribute("aria-expanded", "true");
        button.setAttribute("aria-label", "Close navigation menu");
        button.textContent = "Menu ▴";
      }

      button.addEventListener("click", () => {
        if (button.getAttribute("aria-expanded") === "true") closeMenu();
        else openMenu();
      });

      document.addEventListener("pointerdown", (event) => {
        if (!nav.contains(event.target)) closeMenu();
      });

      document.addEventListener("keydown", (event) => {
        if (
          event.key === "Escape" &&
          button.getAttribute("aria-expanded") === "true"
        ) {
          closeMenu(true);
        }
      });

      const media = window.matchMedia("(max-width: 640px)");
      media.addEventListener?.("change", (event) => {
        if (!event.matches) closeMenu();
      });

      nav.append(button, panel);
    }

    mount();
  })();

  (() => {
    const MARKER = "m3ez-back-to-top-v1";
    const SHOW_AFTER = 200;
    const css = `
#${MARKER}{position:fixed;right:1rem;bottom:1rem;z-index:30;width:32px;height:32px;padding:0;border:1px solid var(--black);border-radius:0;background:var(--paper);color:var(--ink);display:grid;place-items:center;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:16px;line-height:1;cursor:pointer;opacity:0;visibility:hidden;pointer-events:none;transition:opacity 120ms ease,background-color 120ms ease,color 120ms ease}
#${MARKER}.is-visible{opacity:1;visibility:visible;pointer-events:auto}
#${MARKER}:hover,#${MARKER}:focus-visible{background:var(--black);color:var(--paper)}
@media (max-width:640px){#${MARKER}{right:.75rem;bottom:.75rem}}
@media (prefers-reduced-motion:reduce){#${MARKER}{transition:none}}
`;

    function mount() {
      if (document.getElementById(MARKER)) return;

      const style = document.createElement("style");
      style.id = `${MARKER}-style`;
      style.textContent = css;
      document.head.appendChild(style);

      const button = document.createElement("button");
      button.id = MARKER;
      button.type = "button";
      button.setAttribute("aria-label", "Back to top");
      button.setAttribute("aria-hidden", "true");
      button.tabIndex = -1;
      button.textContent = "↑";

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );
      let ticking = false;

      function sync() {
        const visible = window.scrollY > SHOW_AFTER;
        button.classList.toggle("is-visible", visible);
        button.setAttribute("aria-hidden", visible ? "false" : "true");
        button.tabIndex = visible ? 0 : -1;
        ticking = false;
      }

      window.addEventListener(
        "scroll",
        () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(sync);
        },
        { passive: true },
      );

      button.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
      });

      document.body.appendChild(button);
      sync();
    }

    mount();
  })();
}
