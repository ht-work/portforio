(function () {
  const col1 = document.getElementById("col1");
  const col2 = document.getElementById("col2");
  const col3 = document.getElementById("col3");
  const hero = document.querySelector(".hero");
  const heroGrid = document.querySelector(".hero-grid");
  const scrollBtn = document.querySelector(".hero-scroll-btn");
  const manifestoSection = document.getElementById("manifesto-section");

  if (!col1 || !col2 || !col3) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileMedia = window.matchMedia("(max-width: 800px)");
  const imageSources = [
    "assets/fv/dio-clinic.jpg",
    "assets/fv/ai-school-navi.jpg",
    "assets/fv/sherie-clinic.jpg",
    "assets/fv/kyoiku-navi.jpg",
    "assets/fv/denki-no-mikata.jpg",
    "assets/fv/kaigo-no-mori.jpg",
    "assets/fv/pro-navi.jpg",
    "assets/fv/cardloan-site.jpg",
    "assets/fv/LC.jpg",
    "assets/fv/cleca-navi.jpg",
  ];
  const columns = [
    {
      el: col1,
      speedDesktop: 0.55,
      speedMobile: 0.17,
      phase: 0,
      shift: 0,
      scale: 1.035,
    },
    {
      el: col2,
      speedDesktop: 0.35,
      speedMobile: 0.12,
      phase: 210,
      shift: 2,
      scale: 1.02,
    },
    {
      el: col3,
      speedDesktop: 0.2,
      speedMobile: 0.08,
      phase: 420,
      shift: 4,
      scale: 1.01,
    },
  ];
  const blockedKeys = new Set([
    "ArrowDown",
    "ArrowUp",
    "PageDown",
    "PageUp",
    "Home",
    "End",
    " ",
    "Spacebar",
  ]);

  let measurementsReady = false;
  let autoDistance = 0;
  let lastTime = performance.now();
  let lockActive = false;
  let manualScrollDistance = 0;
  let manualScrollActive = false;
  let touchStartY = null;
  const manualScrollMultiplier = 1.75;
  const touchScrollMultiplier = 12.0;
  const keyboardScrollStep = 220;

  function cardHtml(src, index) {
    const safeIndex = String(index + 1).padStart(2, "0");
    const tilt = ((index % 5) - 2) * 0.45;
    const swing = ((index % 3) - 1) * 0.35;
    return `
      <figure class="parallax-card" style="--card-tilt:${tilt}deg;--card-swing:${swing}deg;">
        <div class="parallax-card-chrome" aria-hidden="true">
          <span class="parallax-card-dot"></span>
          <span class="parallax-card-dot"></span>
          <span class="parallax-card-dot"></span>
        </div>
        <div class="parallax-card-screen">
          <img src="${src}" alt="制作したサイトFVのモックアップ ${safeIndex}" loading="lazy" />
        </div>
      </figure>
    `;
  }

  function setHtmlForColumn(column) {
    const sequence = imageSources.map((_, idx) => {
      const mapped = imageSources[(idx + column.shift) % imageSources.length];
      return cardHtml(mapped, idx);
    });
    const block = sequence.join("");
    column.el.innerHTML = `
      <div class="parallax-track">
        <div class="parallax-set">${block}</div>
        <div class="parallax-set" aria-hidden="true">${block}</div>
      </div>
    `;
    column.track = column.el.querySelector(".parallax-track");
  }

  function setFallbackOnMissingImage() {
    const images = document.querySelectorAll(".parallax-card-screen img");
    images.forEach((img) => {
      img.addEventListener("error", () => {
        const card = img.closest(".parallax-card");
        if (!card) return;
        card.classList.add("is-fallback");
      });
    });
  }

  function measureLoopHeights() {
    columns.forEach((column) => {
      const set = column.el.querySelector(".parallax-set");
      const rawGap = column.track
        ? window.getComputedStyle(column.track).rowGap
        : "0";
      const parsedGap = Number.parseFloat(rawGap);
      const gap = Number.isFinite(parsedGap) ? parsedGap : 0;
      column.loopHeight = set ? set.offsetHeight + gap : 0;
    });
    measurementsReady = true;
  }

  function updatePositions(distance) {
    if (!measurementsReady) return;
    if (reduceMotion.matches) {
      columns.forEach((column) => {
        if (column.track) {
          column.track.style.transform = "translate3d(0, 0, 0)";
        }
      });
      return;
    }

    const isMobile = mobileMedia.matches;
    columns.forEach((column, index) => {
      if (!column.loopHeight) {
        if (column.track) {
          column.track.style.transform = "translate3d(0, 0, 0)";
        }
        return;
      }
      if (isMobile && index > 0) {
        if (column.track) {
          column.track.style.transform = "translate3d(0, 0, 0)";
        }
        return;
      }
      const speed = isMobile ? column.speedMobile : column.speedDesktop;
      const offset = (distance * speed + column.phase) % column.loopHeight;
      if (column.track) {
        if (isMobile) {
          column.track.style.transform = `translateY(${-offset}px)`;
        } else {
          column.track.style.transform = `translateY(${-offset}px) scale(${column.scale})`;
        }
      }
    });
  }

  function updateHeroDepth() {
    if (!hero || !heroGrid || reduceMotion.matches || mobileMedia.matches) {
      if (hero) {
        hero.style.setProperty("--hero-drift-y", "0px");
        hero.style.setProperty("--hero-tilt-x", "0deg");
        hero.style.setProperty("--hero-tilt-y", "0deg");
        hero.style.setProperty("--hero-depth-shift", "0px");
      }
      return;
    }

    const rect = hero.getBoundingClientRect();
    const viewport = Math.max(window.innerHeight, 1);
    const progress = Math.max(0, Math.min(1, (viewport - rect.top) / (viewport + rect.height)));
    const driftY = (progress - 0.35) * -26;
    const depthShift = progress * 32;

    hero.style.setProperty("--hero-drift-y", `${driftY.toFixed(2)}px`);
    hero.style.setProperty("--hero-tilt-x", "0deg");
    hero.style.setProperty("--hero-tilt-y", "0deg");
    hero.style.setProperty("--hero-depth-shift", `${depthShift.toFixed(2)}px`);
  }

  function isHeroVisible() {
    if (!hero) return true;
    const rect = hero.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function animate(now) {
    const delta = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    const shouldPauseAutoScroll = manualScrollActive;
    manualScrollActive = false;

    if (!reduceMotion.matches && isHeroVisible() && !shouldPauseAutoScroll) {
      const baseSpeed = mobileMedia.matches ? 78 : 116;
      autoDistance += delta * baseSpeed;
    }

    updatePositions(autoDistance + manualScrollDistance);
    updateHeroDepth();
    window.requestAnimationFrame(animate);
  }

  function applyManualScroll(delta, multiplier = manualScrollMultiplier) {
    if (!lockActive || !Number.isFinite(delta) || delta === 0) return;
    manualScrollDistance = Math.max(
      0,
      manualScrollDistance + delta * multiplier,
    );
    manualScrollActive = true;
    updatePositions(autoDistance + manualScrollDistance);
    updateHeroDepth();
  }

  function preventScrollWhileLocked(event) {
    if (!lockActive) return;
    if (event.type === "wheel") {
      event.preventDefault();
      applyManualScroll(event.deltaY);
      return;
    }
    if (event.type === "touchmove") {
      if (touchStartY === null) return;
      event.preventDefault();
      const delta = touchStartY - event.touches[0].clientY;
      touchStartY = event.touches[0].clientY;
      applyManualScroll(delta, touchScrollMultiplier);
      return;
    }
    if (event.type === "keydown") {
      if (!blockedKeys.has(event.key)) return;
      event.preventDefault();
      let delta = keyboardScrollStep;
      if (event.key === "ArrowUp" || event.key === "PageUp") delta = -keyboardScrollStep;
      if (event.key === "Home") delta = -manualScrollDistance;
      if (event.key === "End" || event.key === " " || event.key === "Spacebar") {
        delta = keyboardScrollStep * 1.25;
      }
      applyManualScroll(delta);
      return;
    }
    event.preventDefault();
  }

  function lockPageScroll() {
    if (lockActive) return;
    lockActive = true;
    document.body.classList.add("is-hero-locked");
    window.addEventListener("wheel", preventScrollWhileLocked, { passive: false });
    window.addEventListener("touchmove", preventScrollWhileLocked, { passive: false });
    window.addEventListener("keydown", preventScrollWhileLocked);
  }

  function unlockPageScroll() {
    if (!lockActive) return;
    lockActive = false;
    document.body.classList.remove("is-hero-locked");
    window.removeEventListener("wheel", preventScrollWhileLocked);
    window.removeEventListener("touchmove", preventScrollWhileLocked);
    window.removeEventListener("keydown", preventScrollWhileLocked);
  }

  function bindManualScrollGestures() {
    window.addEventListener("touchstart", (event) => {
      if (!lockActive) return;
      touchStartY = event.touches[0]?.clientY ?? null;
    }, { passive: true });
    window.addEventListener("touchend", () => {
      touchStartY = null;
    }, { passive: true });
    window.addEventListener("touchcancel", () => {
      touchStartY = null;
    }, { passive: true });
  }

  function listenMediaChange(mediaQuery) {
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", () => {
        updatePositions(autoDistance);
        updateHeroDepth();
      });
      return;
    }
    if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(() => {
        updatePositions(autoDistance);
        updateHeroDepth();
      });
    }
  }

  function bindScrollButton() {
    if (!scrollBtn || !manifestoSection) return;
    scrollBtn.addEventListener("click", (event) => {
      event.preventDefault();
      unlockPageScroll();
      manifestoSection.scrollIntoView({
        behavior: reduceMotion.matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function setupInitialLock() {
    if (!scrollBtn || !manifestoSection) return;
    if (window.location.hash === "#manifesto-section") return;
    if (window.scrollY > 24) return;
    lockPageScroll();
  }

  function init() {
    columns.forEach(setHtmlForColumn);
    setFallbackOnMissingImage();
    measureLoopHeights();
    bindScrollButton();
    bindManualScrollGestures();
    setupInitialLock();
    updatePositions(autoDistance + manualScrollDistance);
    updateHeroDepth();
    window.requestAnimationFrame(animate);
  }

  window.addEventListener(
    "resize",
    () => {
      measureLoopHeights();
      updatePositions(autoDistance + manualScrollDistance);
      updateHeroDepth();
    },
    { passive: true },
  );
  listenMediaChange(reduceMotion);
  listenMediaChange(mobileMedia);
  window.addEventListener("load", () => {
    measureLoopHeights();
    updatePositions(autoDistance + manualScrollDistance);
    updateHeroDepth();
  });

  init();
})();
