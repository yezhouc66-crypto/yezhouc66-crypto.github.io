import { projects } from "./projects.js";

const pendulumDrawing = `<svg class="pendulum-drawing" viewBox="0 0 480 240" fill="none" aria-hidden="true" focusable="false">
  <g class="diagram-guides" stroke="currentColor" stroke-width="1">
    <path d="M62 189H418"/>
  </g>
  <g class="diagram-cart" stroke="currentColor" stroke-width="2">
    <rect x="197" y="147" width="86" height="26" rx="5" fill="var(--thumbnail)"/>
    <path d="M240 145 267 61" stroke-width="4" stroke-linecap="round"/>
    <circle cx="213" cy="180" r="7" fill="var(--thumbnail)"/>
    <circle cx="267" cy="180" r="7" fill="var(--thumbnail)"/>
    <path d="M209 160h12m7 0h9" stroke-width="1.5" stroke-linecap="round"/>
  </g>
  <circle class="diagram-weight" cx="267" cy="61" r="10"/>
  <circle class="diagram-pivot" cx="240" cy="147" r="4"/>
</svg>`;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderThumbnail(project) {
  if (project.image) {
    return `<img src="${escapeHTML(project.image)}" alt="" loading="lazy" decoding="async">`;
  }

  if (project.link === "./pendulum/") return pendulumDrawing;

  return `<div class="project-placeholder" aria-hidden="true"><span>${escapeHTML(project.title.slice(0, 2))}</span></div>`;
}

function renderProject(project, index) {
  const external = new URL(project.link, location.href).origin !== new URL(location.href).origin;
  const linkAttributes = external ? ' target="_blank" rel="noopener noreferrer"' : "";
  const tags = project.tags.map((tag) => `<li>${escapeHTML(tag)}</li>`).join("");

  return `<a class="project-card" href="${escapeHTML(project.link)}"${linkAttributes} aria-labelledby="project-title-${index}" aria-describedby="project-description-${index}">
    <div class="thumbnail">${renderThumbnail(project)}</div>
    <div class="project-title-row">
      <h3 id="project-title-${index}">${escapeHTML(project.title)}</h3>
    </div>
    <p class="project-description" id="project-description-${index}">${escapeHTML(project.description)}</p>
    ${tags ? `<ul class="project-tags" aria-label="作品标签">${tags}</ul>` : ""}
    <span class="project-action">查看作品<span class="project-arrow" aria-hidden="true">${external ? "↗" : "→"}</span>${external ? '<span class="visually-hidden">（在新标签页打开）</span>' : ""}</span>
  </a>`;
}

// 页面里的卡片全部来自 projects.js，数组顺序就是展示顺序。
document.querySelector(".project-grid").innerHTML = projects.map(renderProject).join("");
