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

  return `<a class="project-card" href="${escapeHTML(project.link)}"${linkAttributes} aria-labelledby="project-title-${index}" aria-describedby="project-description-${index}${external ? ` project-external-${index}` : ""}">
    <div class="thumbnail">${renderThumbnail(project)}</div>
    <div class="project-title-row">
      <h3 id="project-title-${index}">${escapeHTML(project.title)}</h3>
    </div>
    <p class="project-description" id="project-description-${index}">${escapeHTML(project.description)}</p>
    ${tags ? `<ul class="project-tags" aria-label="作品标签">${tags}</ul>` : ""}
    <span class="project-action">查看作品<span class="project-arrow" aria-hidden="true">${external ? "↗" : "→"}</span>${external ? `<span class="visually-hidden" id="project-external-${index}">（在新标签页打开）</span>` : ""}</span>
  </a>`;
}

// 标签与卡片都来自 projects.js；筛选不会改变数组或原始展示顺序。
const grid = document.querySelector(".project-grid");
const filters = document.querySelector(".project-filters");
const status = document.getElementById("project-status");
const tags = [...new Set(projects.flatMap((project) => project.tags))];
let selectedTag = null;

function updateProjects() {
  const visible = projects
    .map((project, index) => ({ project, index }))
    .filter(({ project }) => selectedTag === null || project.tags.includes(selectedTag));

  grid.innerHTML = visible.length
    ? visible.map(({ project, index }) => renderProject(project, index)).join("")
    : '<p class="project-description">暂无作品，正在慢慢积累中。</p>';
  status.textContent = selectedTag === null
    ? `全部作品 · ${visible.length} 个`
    : `${selectedTag} · ${visible.length} 个作品`;

  for (const button of filters.querySelectorAll("button")) {
    const tagIndex = Number(button.dataset.tagIndex);
    button.setAttribute("aria-pressed", String(
      tagIndex === -1 ? selectedTag === null : selectedTag === tags[tagIndex],
    ));
  }
}

for (const [index, label] of ["全部", ...tags].entries()) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "filter-button";
  button.textContent = label;
  button.dataset.tagIndex = String(index - 1);
  button.setAttribute("aria-controls", "project-grid");
  button.addEventListener("click", () => {
    selectedTag = index === 0 ? null : tags[index - 1];
    updateProjects();
  });
  filters.append(button);
}

filters.hidden = tags.length === 0;
updateProjects();
