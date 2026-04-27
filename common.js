(function () {
  const works = Array.isArray(window.WORKS) ? window.WORKS : [];
  const root = document.documentElement;
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const BOOT_MIN_MS = 900;
  const BOOT_MAX_MS = 2200;
  const BOOT_ANIMATION_MS = 1200;
  const HOME_REVEAL_MS = 1050;
  const LOADER_SLICE_DELAY_MAX_MS = 240;
  let revealObserver;

  function setupLoadingTextAnimation() {
    const loading = document.querySelector(".page-loader .loading");
    if (!(loading instanceof HTMLElement)) return;

    const min = 20;
    const max = 70;
    const minMove = 10;
    const maxMove = 20;
    const originalText = (loading.textContent || "").trim() || "Loading";
    let reverseDirection = false;
    let terminalSliceIndex = 0;

    loading.textContent = "";

    const baseText = document.createElement("div");
    baseText.textContent = originalText;
    loading.appendChild(baseText);

    const getSlices = () =>
      Array.from(loading.querySelectorAll("span[data-loading-slice='true']"))
        .sort(
          (a, b) =>
            Number.parseInt(a.dataset.index || "0", 10) -
            Number.parseInt(b.dataset.index || "0", 10)
        );
    const isLoaderActive = () =>
      root.classList.contains("is-boot-loading") ||
      root.classList.contains("is-nav-loading");

    function setCSSVars(directionReversed, regenerateMotion) {
      const width = Math.max(1, Math.ceil(loading.getBoundingClientRect().width));

      for (let i = 0; i < width; i += 1) {
        let slice = loading.querySelector(`span[data-index="${i}"]`);

        if (!(slice instanceof HTMLSpanElement)) {
          slice = document.createElement("span");
          slice.dataset.loadingSlice = "true";
          slice.dataset.index = String(i);
          slice.textContent = originalText;
          loading.appendChild(slice);
        }

        if (regenerateMotion || slice.dataset.motionReady !== "true") {
          const randomY = Math.floor(Math.random() * (max - min + 1)) + min;
          const randomMove = Math.floor(Math.random() * (maxMove - minMove + 1)) + minMove;
          const direction = i % 2 === 0 ? 1 : -1;
          const moveY = randomY * direction;
          const moveYS =
            i % 2 === 0 ? moveY - randomMove : moveY + randomMove;

          slice.style.setProperty("--move-y", `${moveY}px`);
          slice.style.setProperty("--move-y-s", `${moveYS}px`);
          slice.dataset.motionReady = "true";
        }

        slice.style.setProperty("--x", `${i}px`);
        const order = directionReversed ? width - 1 - i : i;
        const maxOrder = Math.max(1, width - 1);
        const delay = Math.round((order / maxOrder) * LOADER_SLICE_DELAY_MAX_MS);
        slice.style.setProperty("--delay", `${delay}ms`);
      }

      getSlices().forEach((slice) => {
        const index = Number.parseInt(slice.dataset.index || "0", 10);
        if (index >= width) slice.remove();
      });

      return width;
    }

    function startAnimation() {
      const directionReversed = reverseDirection;
      const regenerateMotion = !directionReversed;
      loading.classList.remove("start");
      const width = setCSSVars(directionReversed, regenerateMotion);
      terminalSliceIndex = directionReversed ? 0 : Math.max(0, width - 1);
      void loading.offsetWidth;
      loading.classList.add("start");
      reverseDirection = !reverseDirection;
    }

    loading.addEventListener("animationend", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLSpanElement)) return;
      if (target.dataset.loadingSlice !== "true") return;
      const targetIndex = Number.parseInt(target.dataset.index || "-1", 10);
      if (targetIndex !== terminalSliceIndex) return;
      if (!isLoaderActive() || reducedMotionQuery.matches) return;

      const slices = getSlices();
      if (slices.length === 0) return;
      window.requestAnimationFrame(() => {
        if (!isLoaderActive() || reducedMotionQuery.matches) return;
        startAnimation();
      });
    });

    const onMotionChange = () => {
      if (reducedMotionQuery.matches) {
        loading.classList.remove("start");
        return;
      }

      startAnimation();
    };

    if (typeof reducedMotionQuery.addEventListener === "function") {
      reducedMotionQuery.addEventListener("change", onMotionChange);
    } else if (typeof reducedMotionQuery.addListener === "function") {
      reducedMotionQuery.addListener(onMotionChange);
    }

    onMotionChange();
  }

  function setupBootLoading() {
    const startedAt = performance.now();
    const minVisibleMs = Math.max(BOOT_MIN_MS, BOOT_ANIMATION_MS);
    let released = false;

    const triggerHomeReveal = () => {
      if (document.body?.dataset.page !== "home") return;
      if (reducedMotionQuery.matches) return;

      root.classList.remove("is-boot-revealing");
      void document.body.offsetWidth;
      root.classList.add("is-boot-revealing");
      window.setTimeout(() => {
        root.classList.remove("is-boot-revealing");
      }, HOME_REVEAL_MS + 80);
    };

    const release = () => {
      if (released) return;
      released = true;
      root.classList.remove("is-boot-loading");
      triggerHomeReveal();
    };

    const forceReleaseTimer = window.setTimeout(release, BOOT_MAX_MS);

    const handleLoad = () => {
      const elapsed = performance.now() - startedAt;
      const waitMs = Math.max(0, minVisibleMs - elapsed);
      window.setTimeout(() => {
        window.clearTimeout(forceReleaseTimer);
        release();
      }, waitMs);
    };

    if (document.readyState === "complete") {
      handleLoad();
      return;
    }

    window.addEventListener("load", handleLoad, { once: true });
  }

  function setupNavigationLoading() {
    root.classList.remove("is-nav-loading");
    root.classList.remove("is-nav-pending");
  }

  function detailHref(slug) {
    return `detail.html?slug=${encodeURIComponent(slug)}`;
  }

  function workThumbSrc(work, featured) {
    if (featured && typeof work.featuredThumb === "string" && work.featuredThumb.trim()) return work.featuredThumb;
    if (typeof work.thumb === "string" && work.thumb.trim()) return work.thumb;
    const seed = work.imageSeed || work.slug || "work";
    return `https://picsum.photos/seed/${seed}/800/600`;
  }

  function workFvSrc(work) {
    if (typeof work.fv === "string" && work.fv.trim()) return work.fv;
    const seed = work.imageSeed || work.slug || "work";
    return `https://picsum.photos/seed/${seed}-detail/1200/750`;
  }

  function workCard(work, featured, options) {
    const showBanners = options && options.showBanners && Array.isArray(work.banners) && work.banners.length > 0;
    const bannerStrip = showBanners
      ? `<div class="work-card-banners">${work.banners.map((src) => `<img src="${src}" alt="${work.title} バナー" loading="lazy" />`).join("")}</div>`
      : "";
    return `
      <article class="work-card">
        <div class="work-card-thumb">
          <img src="${workThumbSrc(work, featured)}" alt="${work.title}" loading="lazy" />
        </div>
        <div class="work-card-body">
          <p class="work-meta">${work.category}</p>
          <h3 class="work-title">${work.title}</h3>
          <p class="work-role">担当範囲: ${work.role}</p>
          <a class="inline-link" href="${detailHref(work.slug)}">詳細を見る</a>
        </div>
        ${bannerStrip}
      </article>
    `;
  }

  function setActiveNav() {
    const page = document.body.dataset.page;
    if (!page) return;

    document.querySelectorAll("[data-nav]").forEach((link) => {
      if (link.dataset.nav === page) {
        link.classList.add("is-active");
      }
    });
  }

  function setYear() {
    document.querySelectorAll("[data-year]").forEach((node) => {
      node.textContent = new Date().getFullYear();
    });
  }

  function renderFeatured() {
    const target = document.getElementById("featured-list");
    if (!target || works.length === 0) return;

    const featured = works.filter((work) => work.featured).slice(0, 4);
    target.innerHTML = featured.map((w) => workCard(w, true)).join("");
  }

  function getDetailSlug() {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("slug");
    if (fromQuery) return fromQuery;
    return document.body.dataset.detailSlug || "";
  }

  function renderDetail() {
    const slug = getDetailSlug();
    const target = document.getElementById("detail-container");
    if (!slug || !target) return;

    const work = works.find((item) => item.slug === slug);
    if (!work) {
      target.innerHTML = '<p>実績データが見つかりませんでした。</p>';
      return;
    }

    const pageTitle = document.getElementById("detail-page-title");
    if (pageTitle) pageTitle.textContent = work.title;
    document.title = `${work.title} | Portfolio`;

    const links = Array.isArray(work.links) && work.links.length > 0
      ? `<ul>${work.links
          .map((link) => `<li><a class="inline-link" href="${link.url}">${link.label}</a></li>`)
          .join("")}</ul>`
      : "<p>関連リンクはありません。</p>";

    const banners = Array.isArray(work.banners) && work.banners.length > 0
      ? `<section class="detail-section">
          <h2>広告バナー</h2>
          <div class="banner-grid">
            ${work.banners.map((src) => `<figure class="banner-item"><img src="${src}" alt="${work.title} バナー" loading="lazy" /></figure>`).join("")}
          </div>
        </section>`
      : "";

    target.innerHTML = `
      <article class="detail-wrap">
        <figure class="detail-kv">
          <img src="${workFvSrc(work)}" alt="${work.title}" loading="lazy" />
        </figure>
        <section class="detail-section">
          <h2>概要</h2>
          <p>${work.summary}</p>
        </section>
        <section class="detail-section">
          <h2>課題</h2>
          <p>${work.challenge}</p>
        </section>
        <section class="detail-section">
          <h2>施策 / 工夫</h2>
          <p>${work.solution}</p>
        </section>
        <section class="detail-section">
          <h2>担当範囲</h2>
          <p>${work.role}</p>
        </section>
        <section class="detail-section">
          <h2>使用ツール / 技術</h2>
          <p>${work.tools}</p>
        </section>
        <section class="detail-section">
          <h2>成果または学び</h2>
          <p>${work.outcome}</p>
        </section>
        ${banners}
        <section class="detail-section">
          <h2>関連リンク</h2>
          ${links}
        </section>
      </article>
    `;
  }

  function revealTargets(root = document) {
    const selectors = [
      "main h1",
      "main h2",
      "main h3",
      "main p",
      "main a",
      "main button",
      "main li",
    ];

    return Array.from(root.querySelectorAll(selectors.join(","))).filter((node) => {
      if (node.closest(".site-header, .footer")) return false;
      if (node.childElementCount > 0) return false;
      if (!node.textContent || !node.textContent.trim()) return false;
      return true;
    });
  }

  function splitRevealText(node) {
    if (node.dataset.revealSplit === "true") return;

    const rawText = node.textContent || "";
    const originalText = rawText.replace(/\s+/g, " ").trim();
    if (!originalText) return;

    const fragment = document.createDocumentFragment();
    const srOnly = document.createElement("span");
    srOnly.className = "sr-only";
    srOnly.textContent = originalText;

    Array.from(originalText).forEach((char, index) => {
      const charNode = document.createElement("span");
      charNode.className = "reveal-char";
      charNode.setAttribute("aria-hidden", "true");
      charNode.style.setProperty("--char-index", index);
      charNode.textContent = char === " " ? "\u00A0" : char;
      fragment.appendChild(charNode);
    });

    node.textContent = "";
    node.appendChild(fragment);
    node.appendChild(srOnly);
    node.dataset.revealSplit = "true";
  }

  function setRevealDelay(nodes) {
    const groups = new Map();

    nodes.forEach((node) => {
      const parent = node.parentElement;
      if (!parent) return;
      const items = groups.get(parent) || [];
      items.push(node);
      groups.set(parent, items);
    });

    groups.forEach((items) => {
      items.forEach((item, index) => {
        const delay = Math.min(index * 90, 360);
        item.style.setProperty("--reveal-delay", `${delay}ms`);
      });
    });
  }

  function prepareReveal(root = document) {
    const nodes = revealTargets(root);
    if (nodes.length === 0) return [];

    setRevealDelay(nodes);

    nodes.forEach((node) => {
      splitRevealText(node);
      node.dataset.reveal = "text";
    });

    return nodes;
  }

  function setupRevealEffects(root = document) {
    const nodes = prepareReveal(root);
    if (nodes.length === 0) return;

    if (reducedMotionQuery.matches) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }

    if (!revealObserver) {
      revealObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          });
        },
        {
          rootMargin: "0px 0px -6% 0px",
          threshold: 0.08,
        }
      );
    }

    nodes.forEach((node) => {
      if (node.classList.contains("is-visible")) return;
      revealObserver.observe(node);
    });
  }

  window.renderWorkCard = workCard;
  window.detailHref = detailHref;
  window.setupRevealEffects = setupRevealEffects;

  setupLoadingTextAnimation();
  setupBootLoading();
  setupNavigationLoading();
  setActiveNav();
  setYear();
  renderFeatured();
  renderDetail();
  setupRevealEffects();
})();
