(() => {
  "use strict";
  const P = ArmPhysics;
  const $ = (id) => document.getElementById(id);
  const canvas = $("game"), ctx = canvas.getContext("2d");
  if (!ctx) { $("game-status").textContent = "浏览器无法创建 Canvas 画布，请尝试其他浏览器。"; return; }
  const W = 1000, H = 600, DT = 1 / 120;
  const base = { x: 220, y: 510 }, cradle = { x: 365, y: 502 };
  const levels = [
    { name: "初次出手", hoop: { x: 720, y: 285, width: 90 }, obstacles: [], note: "开放场地 · 命中一球即可过关 · 每球 100 分", points: 100 },
    { name: "越过高墙", hoop: { x: 790, y: 245, width: 84 }, obstacles: [{ x: 560, y: 365, w: 24, h: 185 }], note: "篮筐后移 · 让弧线越过挡板 · 每球 150 分", points: 150 },
    { name: "有限的自由", hoop: { x: 745, y: 215, width: 78 }, obstacles: [{ x: 545, y: 330, w: 26, h: 220 }], note: "肩关节 −165°～−10° · 肘关节 ±135° · 腕关节 ±100° · 每球 200 分", points: 200 },
  ];
  let level = 0, linkCount = 2, lengths, limits, angles, points;
  let target = { x: 410, y: 315 }, velocity = { x: 0, y: 0 };
  let ball, mode = "ready", score = 0, attempts = 0, hits = 0, best = 0;
  let flightTime = 0, stillTime = 0, winTime = 0, complete = false;
  let pointerId = null, dragging = false, autopick = false;
  let keys = new Set(), trail = [], particles = [], workspace = [];
  let color = {}, camera = { scale: 1, x: 0, y: 0 }, lastTime = 0, accumulator = 0;
  let readoutTick = 0, themeQuery = matchMedia("(prefers-color-scheme: dark)");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  try { best = Math.max(0, Number(localStorage.getItem("arm-basket-best")) || 0); } catch { /* 存储受限时仍可玩。 */ }

  function world() { return { ...levels[level], floor: 550 }; }
  function message(text) { $("game-status").textContent = text; }
  function readout() {
    $("score").textContent = String(score).padStart(3, "0");
    $("shots").textContent = `${hits} / ${attempts}`;
    $("best").textContent = String(best).padStart(3, "0");
    $("throw").disabled = mode !== "held" || complete;
    $("grab").disabled = mode !== "ready" || complete;
  }
  function setupArm() {
    lengths = linkCount === 2 ? [155, 145] : [115, 105, 80];
    limits = lengths.map((_, i) => level === 2
      ? [-(i === 0 ? 165 : i === 1 ? 135 : 100) * Math.PI / 180, (i === 0 ? -10 : i === 1 ? 135 : 100) * Math.PI / 180]
      : [-Math.PI + .001, Math.PI - .001]);
    angles = linkCount === 2 ? [-1.7, 1.6] : [-1.8, 1.1, .9];
    angles = P.solveIK(base, lengths, angles, target, limits);
    points = P.forward(base, lengths, angles);
    velocity = { x: 0, y: 0 };
    buildWorkspace();
  }
  function buildWorkspace() {
    workspace = [];
    // 确定性低差异采样；限位改变时重建，而不是画一个不准确的圆盘。
    for (let i = 1; i <= 3000; i++) {
      const sample = lengths.map((_, j) => {
        const t = (i * [.6180339887, .4142135623, .7320508076][j]) % 1;
        return limits[j][0] + t * (limits[j][1] - limits[j][0]);
      });
      workspace.push(P.forward(base, lengths, sample).pop());
    }
  }
  function releaseCapture() {
    if (pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    pointerId = null; dragging = false;
  }
  function resetBall(announce = true) {
    releaseCapture(); keys.clear(); autopick = false; complete = false;
    ball = { ...cradle, r: 11, vx: 0, vy: 0, scored: false };
    mode = "ready"; flightTime = stillTime = winTime = 0;
    velocity = { x: 0, y: 0 }; trail = []; particles = [];
    $("result").hidden = true;
    if (announce) message("先把夹爪移向橙色小球；也可以点击「抓球」。");
    readout();
  }
  function startLevel(index) {
    level = index; target = { x: 410, y: 315 };
    $("level-label").textContent = `0${level + 1} / 03　${levels[level].name}`;
    $("level-note").textContent = levels[level].note;
    setupArm(); resetBall();
  }
  function grab() {
    if (mode !== "ready" || complete) return;
    target = { ...cradle }; autopick = true;
    message("正在靠近小球……抓住后，快速向右上甩动并松手。");
    canvas.focus({ preventScroll: true });
  }
  function launch() {
    if (mode !== "held" || complete) return;
    const v = P.launchVelocity(velocity);
    ball.vx = v.x; ball.vy = v.y;
    mode = "flying"; attempts++; flightTime = 0; autopick = false;
    message(Math.hypot(v.x, v.y) < 100 ? "这次出手速度较小。试试快速甩动，在夹爪还在移动时松手。" : "球已出手，看看这条弧线！");
    readout();
  }
  function win() {
    hits++; score += levels[level].points; winTime = .85;
    if (score > best) {
      best = score;
      try { localStorage.setItem("arm-basket-best", String(best)); } catch { /* 本局记分不依赖存储。 */ }
    }
    message(`命中！+${levels[level].points} 分。${level === 2 ? "三关全部完成！" : "准备进入下一关。"}`);
    if (!reducedMotion) for (let i = 0; i < 24; i++) {
      const a = i * Math.PI * 2 / 24;
      particles.push({ x: ball.x, y: ball.y, vx: Math.cos(a) * (80 + i % 4 * 25), vy: Math.sin(a) * 130 - 70, life: 1 });
    }
    readout();
  }
  function showResult() {
    complete = true; keys.clear(); releaseCapture();
    $("result-kicker").textContent = level === 2 ? "ALL CLEAR / 03" : `LEVEL 0${level + 1} CLEAR`;
    $("result-title").textContent = level === 2 ? "好球，机械臂投手！" : "漂亮的弧线！";
    $("result-copy").textContent = level === 2 ? `三关完成 · ${attempts} 次出手 · 总分 ${score}。换一种连杆，再试试手感？` : `+${levels[level].points} 分 · ${level === 0 ? "下一关：篮筐更远，场上多了一道挡板。" : "下一关：更高的篮筐，加上关节限位。"}`;
    $("next-level").textContent = level === 2 ? "再来一局 ↗" : "下一关 →";
    $("result").hidden = false;
    $("next-level").focus({ preventScroll: true });
    readout();
  }
  function update(dt) {
    if (complete) return;
    const endBefore = points[points.length - 1];
    if (keys.size) {
      const speed = keys.has("Shift") ? 800 : 400;
      const dx = Number(keys.has("ArrowRight")) - Number(keys.has("ArrowLeft"));
      const dy = Number(keys.has("ArrowDown")) - Number(keys.has("ArrowUp"));
      target.x = P.clamp(target.x + dx * speed * dt, 20, 975);
      target.y = P.clamp(target.y + dy * speed * dt, 65, 535);
    }
    // 先限制末端每步的位移，避免各关节独立限速使快速甩动走出反向弧线。
    const gap = P.distance(endBefore, target);
    const follow = Math.min(1, 850 * dt / Math.max(gap, .001));
    const command = { x: endBefore.x + (target.x - endBefore.x) * follow, y: endBefore.y + (target.y - endBefore.y) * follow };
    const solved = P.solveIK(base, lengths, angles, command, limits);
    angles = angles.map((a, i) => {
      const delta = level === 2 ? solved[i] - a : P.wrap(solved[i] - a);
      const next = a + P.clamp(delta, -9 * dt, 9 * dt);
      return level === 2 ? P.clamp(next, limits[i][0], limits[i][1]) : P.wrap(next);
    });
    points = P.forward(base, lengths, angles);
    const end = points[points.length - 1];
    const blend = 1 - Math.exp(-dt / .055);
    velocity.x += ((end.x - endBefore.x) / dt - velocity.x) * blend;
    velocity.y += ((end.y - endBefore.y) / dt - velocity.y) * blend;
    if (mode === "ready" && (dragging || autopick || keys.size > 0) && P.distance(end, ball) < 23) {
      mode = "held"; autopick = false;
      velocity = { x: 0, y: 0 };
      message("抓住了！先往左下拉，再快速向右上甩动，松手投出。");
      readout();
    }
    if (mode === "held") { ball.x = end.x; ball.y = end.y; }
    if (mode === "flying") {
      flightTime += dt;
      if (P.stepBall(ball, dt, world())) win();
      if (trail.length === 0 || P.distance(ball, trail[trail.length - 1]) > 7) {
        trail.push({ x: ball.x, y: ball.y });
        if (trail.length > 110) trail.shift();
      }
      if (ball.y >= 538 && Math.hypot(ball.vx, ball.vy) < 50) stillTime += dt;
      else stillTime = 0;
      if (!ball.scored && (flightTime > 7 || stillTime > 1 || ball.x > W + 100 || ball.y < -600)) {
        resetBall(false); message("差一点！小球已放回。试着调整出手方向和速度，再来一次。");
      }
    }
    if (winTime > 0) { winTime -= dt; if (winTime <= 0) showResult(); }
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt; }
    particles = particles.filter((p) => p.life > 0);
    readoutTick += dt;
    if (readoutTick > .15) {
      readoutTick = 0;
      const error = P.distance(end, target);
      $("reach-status").textContent = error < 6 ? "CCD · 目标已到达" : error > 20 ? `CCD · 误差 ${Math.round(error)} px` : "CCD · 实时跟随";
    }
  }

  function setColors() {
    const style = getComputedStyle(document.documentElement);
    for (const name of ["background", "text", "muted", "line", "accent", "thumbnail", "diagram", "diagram-guide"]) color[name] = style.getPropertyValue(`--${name}`).trim();
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    const scale = Math.min(rect.width / W, rect.height / H);
    camera = { scale, x: (rect.width - W * scale) / 2, y: (rect.height - H * scale) / 2, dpr };
    draw();
  }
  function line(x1, y1, x2, y2, stroke = color.line, width = 1) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke();
  }
  function circle(x, y, radius, fill, stroke, width = 1) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function text(value, x, y, fill = color.muted, size = 12, align = "left") {
    ctx.fillStyle = fill; ctx.font = `${size}px -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif`; ctx.textAlign = align; ctx.fillText(value, x, y);
  }
  function drawHoop() {
    const h = levels[level].hoop, left = h.x - h.width / 2, right = h.x + h.width / 2;
    line(right + 21, h.y - 28, right + 40, h.y - 28, color["diagram-guide"], 3);
    line(right + 40, h.y - 28, right + 40, 550, color["diagram-guide"], 3);
    line(right + 15, 550, right + 67, 550, color["diagram-guide"], 4);
    ctx.fillStyle = color.background; ctx.fillRect(right + 7, h.y - 100, 9, 125);
    ctx.strokeStyle = color.diagram; ctx.lineWidth = 2; ctx.strokeRect(right + 7, h.y - 100, 9, 125);
    for (let i = 0; i <= 6; i++) {
      const x = left + i * h.width / 6;
      line(x, h.y + 3, h.x - 22 + i * 44 / 6, h.y + 60, color["diagram-guide"]);
    }
    for (let j = 1; j <= 3; j++) {
      const t = j / 3;
      line(left + (h.width / 2 - 22) * t, h.y + t * 60, right - (h.width / 2 - 22) * t, h.y + t * 60, color["diagram-guide"]);
    }
    line(left, h.y, right, h.y, color.accent, 4);
    circle(left, h.y, 4, color.accent); circle(right, h.y, 4, color.accent);
    text("从上方穿圈", h.x, h.y - 123, color.muted, 12, "center");
    text(`+${levels[level].points}`, h.x, h.y + 89, color.accent, 14, "center");
  }
  function drawArm() {
    // 底座与刻度。
    ctx.fillStyle = color.background; ctx.fillRect(base.x - 35, base.y + 19, 70, 20);
    ctx.strokeStyle = color.diagram; ctx.lineWidth = 2; ctx.strokeRect(base.x - 35, base.y + 19, 70, 20);
    line(base.x, base.y, base.x, base.y + 19, color.diagram, 14);
    for (let i = 0; i < 5; i++) line(base.x - 26 + i * 13, base.y + 25, base.x - 20 + i * 13, base.y + 25, color["diagram-guide"]);
    for (let i = 0; i < lengths.length; i++) {
      const a = points[i], b = points[i + 1];
      ctx.lineCap = "round";
      line(a.x, a.y, b.x, b.y, color.diagram, 19);
      line(a.x, a.y, b.x, b.y, color.background, 13);
      line(a.x, a.y, b.x, b.y, color["diagram-guide"], 1);
      if ($("show-angles").checked) {
        const offset = i % 2 ? -18 : 22;
        text(`L${i + 1} · ${lengths[i]}`, (a.x + b.x) / 2 + 10, (a.y + b.y) / 2 + offset, color.muted, 11);
      }
    }
    ctx.lineCap = "butt";
    points.slice(0, -1).forEach((p, i) => {
      circle(p.x, p.y, i === 0 ? 17 : 13, color.background, color.diagram, 2);
      circle(p.x, p.y, i === 0 ? 6 : 4, color.accent);
      if ($("show-angles").checked) {
        ctx.beginPath(); ctx.arc(p.x, p.y, 25, -.5, 1.4); ctx.strokeStyle = color["diagram-guide"]; ctx.lineWidth = 1; ctx.stroke();
        const limited = level === 2 && (Math.abs(angles[i] - limits[i][0]) < .04 || Math.abs(angles[i] - limits[i][1]) < .04);
        text(`θ${i + 1} ${Math.round(angles[i] * 180 / Math.PI)}°${limited ? " 限位" : ""}`, p.x - 22, p.y - 34, limited ? color.accent : color.muted, 12);
      }
    });
    const end = points[points.length - 1], before = points[points.length - 2];
    const a = Math.atan2(end.y - before.y, end.x - before.x);
    ctx.save(); ctx.translate(end.x, end.y); ctx.rotate(a);
    const spread = mode === "held" ? 11 : 16;
    for (const sign of [-1, 1]) {
      line(-8, sign * 6, 4, sign * spread, color.diagram, 3);
      line(4, sign * spread, 15, sign * spread, color.diagram, 3);
    }
    ctx.restore(); circle(end.x, end.y, 5, color.accent, color.background, 2);
    text("固定基座", base.x, 579, color.muted, 11, "center");
  }
  function drawBall() {
    circle(ball.x, ball.y, ball.r, color.accent, color.background, 1.5);
    ctx.save(); ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r - 1, 0, Math.PI * 2); ctx.clip();
    line(ball.x - 11, ball.y + 3, ball.x + 11, ball.y - 3, color.background);
    ctx.beginPath(); ctx.ellipse(ball.x, ball.y, 4, 12, .25, 0, Math.PI * 2); ctx.strokeStyle = color.background; ctx.lineWidth = .8; ctx.stroke(); ctx.restore();
  }
  function draw() {
    if (!ball || !points) return;
    const c = camera;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = color.thumbnail; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(c.scale * c.dpr, 0, 0, c.scale * c.dpr, c.x * c.dpr, c.y * c.dpr);
    ctx.save();
    ctx.globalAlpha = .55;
    for (let x = 30; x < W; x += 25) for (let y = 60; y < 550; y += 25) circle(x, y, .75, color["diagram-guide"]);
    ctx.restore();
    line(28, 550, 972, 550, color["diagram-guide"]);
    for (let x = 40; x < W - 28; x += 40) line(x, 550, x, 555, color["diagram-guide"]);
    text("拖动目标 / 松手出球", 966, 579, color.muted, 11, "right");
    if ($("show-workspace").checked) {
      ctx.save(); ctx.globalAlpha = .16;
      workspace.forEach((p) => { ctx.fillStyle = color.accent; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); });
      ctx.restore();
      text(level === 2 ? "限位后的可达点采样" : "机械臂可达点采样", 35, 90, color.accent, 11);
    }
    for (const obstacle of levels[level].obstacles) {
      ctx.fillStyle = color.background; ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = color["diagram-guide"]; ctx.lineWidth = 1.5; ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.save(); ctx.beginPath(); ctx.rect(obstacle.x, obstacle.y, obstacle.w, obstacle.h); ctx.clip();
      for (let y = obstacle.y - 24; y < obstacle.y + obstacle.h; y += 12) line(obstacle.x, y + 24, obstacle.x + obstacle.w, y, color.line);
      ctx.restore(); text("挡板", obstacle.x + obstacle.w / 2, obstacle.y - 16, color.muted, 11, "center");
    }
    drawHoop();
    ctx.save(); ctx.setLineDash([4, 5]);
    if (trail.length > 1) {
      ctx.beginPath(); trail.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = color.accent; ctx.globalAlpha = .45; ctx.lineWidth = 1.4; ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (mode === "held" && $("show-path").checked) {
      const v = P.launchVelocity(velocity), ghost = { ...ball, vx: v.x, vy: v.y, scored: false };
      ctx.beginPath(); ctx.moveTo(ghost.x, ghost.y);
      for (let i = 0; i < 160; i++) { P.stepBall(ghost, DT, world()); if (i % 4 === 0) ctx.lineTo(ghost.x, ghost.y); }
      ctx.strokeStyle = color.accent; ctx.globalAlpha = .5; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
    // 球台在球飞出后仍保留，提示下一次的抓取位置。
    line(cradle.x - 22, cradle.y + 15, cradle.x + 22, cradle.y + 15, color["diagram-guide"], 2);
    line(cradle.x, cradle.y + 15, cradle.x, 550, color["diagram-guide"], 2);
    if (mode === "ready") { text("小球 / 靠近即抓取", cradle.x + 29, cradle.y + 3, color.accent, 12); }
    drawArm();
    const end = points[points.length - 1], error = P.distance(end, target);
    ctx.save(); ctx.setLineDash([3, 5]); ctx.globalAlpha = .65;
    if (error > 12) line(end.x, end.y, target.x, target.y, color.accent);
    ctx.restore();
    circle(target.x, target.y, 17, null, color.accent, 1);
    for (const sign of [-1, 1]) {
      line(target.x + sign * 10, target.y, target.x + sign * 23, target.y, color.accent);
      line(target.x, target.y + sign * 10, target.x, target.y + sign * 23, color.accent);
    }
    text(error > 30 ? "目标 / 未到达" : "拖动这里", target.x + 27, target.y - 20, color.accent, 12);
    drawBall();
    particles.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life); circle(p.x, p.y, 3, color.accent); }); ctx.globalAlpha = 1;
  }

  function pointerTarget(event) {
    const rect = canvas.getBoundingClientRect(), c = camera;
    target = { x: P.clamp((event.clientX - rect.left - c.x) / c.scale, 20, 975), y: P.clamp((event.clientY - rect.top - c.y) / c.scale, 65, 535) };
  }
  canvas.addEventListener("pointerdown", (event) => {
    if (complete || pointerId !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault(); pointerId = event.pointerId; dragging = true; autopick = false;
    canvas.setPointerCapture(pointerId); canvas.focus({ preventScroll: true }); pointerTarget(event);
    if (mode === "ready" && P.distance(target, ball) < 35) autopick = true;
  });
  canvas.addEventListener("pointermove", (event) => {
    if (dragging && event.pointerId === pointerId) { event.preventDefault(); pointerTarget(event); }
  });
  canvas.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pointerId) return;
    // 以最后一次实际跟随速度出球，不能用指针瞬移制造超速。
    if (mode === "held") launch();
    releaseCapture();
  });
  function cancelGesture() {
    releaseCapture(); keys.clear(); velocity = { x: 0, y: 0 };
  }
  canvas.addEventListener("pointercancel", cancelGesture);
  canvas.addEventListener("lostpointercapture", () => {
    if (pointerId !== null) cancelGesture();
  });
  canvas.addEventListener("keydown", (event) => {
    if (complete) return;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Shift"].includes(event.key)) {
      event.preventDefault(); keys.add(event.key); autopick = false;
    } else if (!event.repeat && [" ", "g", "G", "r", "R"].includes(event.key)) {
      event.preventDefault();
      if (event.key.toLowerCase() === "r") resetBall();
      else if (event.key.toLowerCase() === "g") grab();
      else if (mode === "held") launch(); else grab();
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.key));
  canvas.addEventListener("blur", () => keys.clear());
  window.addEventListener("blur", cancelGesture);
  document.addEventListener("visibilitychange", () => { cancelGesture(); lastTime = 0; accumulator = 0; });
  $("grab").addEventListener("click", grab);
  $("throw").addEventListener("click", launch);
  $("retry").addEventListener("click", () => {
    if (ball.scored || complete) { message("本关已经命中，请点击下一关；也可以重新开始本局。"); return; }
    resetBall(); canvas.focus({ preventScroll: true });
  });
  $("restart").addEventListener("click", () => { score = attempts = hits = 0; startLevel(0); });
  $("next-level").addEventListener("click", () => {
    if (level === 2) { score = attempts = hits = 0; startLevel(0); }
    else startLevel(level + 1);
    canvas.focus({ preventScroll: true });
  });
  document.querySelectorAll("[data-links]").forEach((button) => button.addEventListener("click", () => {
    if (ball.scored || complete) { message("本关已经命中；进入下一关后可切换连杆。"); return; }
    linkCount = Number(button.dataset.links); setupArm(); resetBall();
    document.querySelectorAll("[data-links]").forEach((b) => {
      const active = Number(b.dataset.links) === linkCount;
      b.classList.toggle("active", active); b.setAttribute("aria-pressed", String(active));
    });
    message(`已切换为${linkCount === 2 ? "二" : "三"}连杆。小球已放回，分数和出手数保留。`);
  }));
  new MutationObserver(setColors).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  themeQuery.addEventListener("change", setColors);
  new ResizeObserver(resize).observe(canvas);
  setColors(); startLevel(0); resize();
  function frame(time) {
    if (!document.hidden) {
      if (lastTime) accumulator += Math.min((time - lastTime) / 1000, .05);
      while (accumulator >= DT) { update(DT); accumulator -= DT; }
      draw(); lastTime = time;
    } else lastTime = 0;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
