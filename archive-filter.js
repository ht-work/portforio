(function () {
  const list = document.getElementById("archive-list");
  const tabs = Array.from(document.querySelectorAll(".tab-btn"));
  const works = Array.isArray(window.WORKS) ? window.WORKS : [];

  if (!list || works.length === 0) return;

  function render(category) {
    const filtered =
      category === "All"
        ? works
        : works.filter((work) => work.category === category);

    const showBanners = category === "Banner";
    list.innerHTML = filtered.map((work) => window.renderWorkCard(work, false, { showBanners })).join("");

    if (typeof window.setupRevealEffects === "function") {
      window.setupRevealEffects(list);
    }
  }

  function activate(btn) {
    tabs.forEach((tab) => tab.classList.remove("is-active"));
    btn.classList.add("is-active");
  }

  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category || "All";
      activate(btn);
      render(category);
    });
  });

  const defaultTab = tabs.find((tab) => tab.dataset.category === "All") || tabs[0];
  if (defaultTab) {
    activate(defaultTab);
    render(defaultTab.dataset.category || "All");
  }
})();
