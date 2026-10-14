// 在样式加载前恢复偏好；不依赖作品渲染，404 页也可复用。
(() => {
  const storageKey = "portfolio-theme";
  const modes = ["system", "light", "dark"];
  const labels = { system: "跟随系统", light: "浅色", dark: "深色" };
  let mode = "system";

  try {
    const saved = localStorage.getItem(storageKey);
    if (modes.includes(saved)) mode = saved;
  } catch {
    // 隐私模式或存储受限时仍可在本页切换。
  }

  function applyMode() {
    if (mode === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = mode;

    const button = document.getElementById("theme-toggle");
    if (!button) return;
    const next = modes[(modes.indexOf(mode) + 1) % modes.length];
    button.textContent = `主题：${labels[mode]}`;
    button.setAttribute("aria-label", `当前主题：${labels[mode]}；切换为${labels[next]}`);
    button.hidden = false;
  }

  applyMode();

  function setupButton() {
    const button = document.getElementById("theme-toggle");
    if (!button) return;
    applyMode();
    button.addEventListener("click", () => {
      mode = modes[(modes.indexOf(mode) + 1) % modes.length];
      try {
        if (mode === "system") localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, mode);
      } catch {
        // 保存失败不影响当前页面的选择。
      }
      applyMode();
    });
  }

  // 跟随系统时不设 data-theme，由 CSS 媒体查询自动响应系统变化。
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setupButton, { once: true });
  } else {
    setupButton();
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    mode = modes.includes(event.newValue) ? event.newValue : "system";
    applyMode();
  });
})();
