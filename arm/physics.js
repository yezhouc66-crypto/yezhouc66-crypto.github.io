/* 纯数学与物理：浏览器和 Node 共用，不读取 DOM。坐标 y 向下，角度为相对关节角。 */
(function (root) {
  "use strict";
  const TAU = Math.PI * 2;
  const GRAVITY = 680;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const wrap = (angle) => ((angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function forward(base, lengths, angles) {
    const points = [{ ...base }];
    let angle = 0;
    lengths.forEach((length, i) => {
      angle += angles[i];
      const last = points[points.length - 1];
      points.push({ x: last.x + Math.cos(angle) * length, y: last.y + Math.sin(angle) * length });
    });
    return points;
  }

  function solveIK(base, lengths, current, target, limits) {
    const angles = current.map((a, i) => clamp(a, limits[i][0], limits[i][1]));
    // 目标在伸直状态的反方向时，微小的弯曲避免 CCD 共线奇点。
    if (Math.abs(Math.sin(angles[1])) < .0001) angles[1] = clamp(.01, ...limits[1]);
    for (let iteration = 0; iteration < 24; iteration++) {
      for (let i = angles.length - 1; i >= 0; i--) {
        const points = forward(base, lengths, angles);
        const joint = points[i], end = points[points.length - 1];
        const delta = wrap(Math.atan2(target.y - joint.y, target.x - joint.x) - Math.atan2(end.y - joint.y, end.x - joint.x));
        angles[i] = clamp(wrap(angles[i] + delta), limits[i][0], limits[i][1]);
      }
      const points = forward(base, lengths, angles);
      if (distance(points[points.length - 1], target) < .35) break;
    }
    return angles;
  }

  function launchVelocity(velocity) {
    const speed = Math.hypot(velocity.x, velocity.y);
    const scale = speed ? Math.min(1.45, 1100 / speed) : 0;
    return { x: velocity.x * scale, y: velocity.y * scale };
  }

  function collideCircle(ball, x, y, radius, restitution = .65) {
    const dx = ball.x - x, dy = ball.y - y;
    const distance = Math.hypot(dx, dy), minimum = ball.r + radius;
    if (distance >= minimum) return false;
    const nx = distance > .00001 ? dx / distance : 0;
    const ny = distance > .00001 ? dy / distance : -1;
    ball.x = x + nx * minimum;
    ball.y = y + ny * minimum;
    const normalVelocity = ball.vx * nx + ball.vy * ny;
    if (normalVelocity < 0) {
      ball.vx -= (1 + restitution) * normalVelocity * nx;
      ball.vy -= (1 + restitution) * normalVelocity * ny;
    }
    return true;
  }

  function collideRect(ball, rect, restitution = .6) {
    const x = clamp(ball.x, rect.x, rect.x + rect.w), y = clamp(ball.y, rect.y, rect.y + rect.h);
    const dx = ball.x - x, dy = ball.y - y, d = Math.hypot(dx, dy);
    if (d >= ball.r) return false;
    let nx, ny, penetration;
    if (d > .00001) { nx = dx / d; ny = dy / d; penetration = ball.r - d; }
    else {
      const sides = [ball.x - rect.x, rect.x + rect.w - ball.x, ball.y - rect.y, rect.y + rect.h - ball.y];
      const side = sides.indexOf(Math.min(...sides));
      nx = [-1, 1, 0, 0][side]; ny = [0, 0, -1, 1][side]; penetration = sides[side] + ball.r;
    }
    ball.x += nx * penetration; ball.y += ny * penetration;
    const vn = ball.vx * nx + ball.vy * ny;
    if (vn < 0) { ball.vx -= (1 + restitution) * vn * nx; ball.vy -= (1 + restitution) * vn * ny; }
    return true;
  }

  function stepBall(ball, dt, world) {
    const previous = { x: ball.x, y: ball.y };
    ball.vy += GRAVITY * dt;
    const drag = Math.exp(-.09 * dt);
    ball.vx *= drag; ball.vy *= drag;
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    for (const obstacle of world.obstacles) collideRect(ball, obstacle);
    const hoop = world.hoop, half = hoop.width / 2;
    // 篮板和篮圈两端都有实体碰撞；先碰撞，再检查从上往下穿圈。
    collideRect(ball, { x: hoop.x + half + 7, y: hoop.y - 100, w: 9, h: 125 }, .7);
    collideCircle(ball, hoop.x - half, hoop.y, 4);
    collideCircle(ball, hoop.x + half, hoop.y, 4);
    let scored = false;
    if (!ball.scored && previous.y < hoop.y && ball.y >= hoop.y && ball.vy > 0) {
      const ratio = (hoop.y - previous.y) / (ball.y - previous.y);
      const crossingX = previous.x + (ball.x - previous.x) * ratio;
      if (crossingX > hoop.x - half + ball.r + 4 && crossingX < hoop.x + half - ball.r - 4) {
        ball.scored = true; scored = true;
      }
    }
    if (ball.y + ball.r > world.floor) {
      ball.y = world.floor - ball.r;
      if (ball.vy > 0) ball.vy *= -.52;
      ball.vx *= Math.exp(-3 * dt);
      if (Math.abs(ball.vy) < 13) ball.vy = 0;
    }
    if (ball.x - ball.r < 12) { ball.x = 12 + ball.r; ball.vx = Math.abs(ball.vx) * .6; }
    return scored;
  }

  const api = { GRAVITY, clamp, wrap, distance, forward, solveIK, launchVelocity, collideCircle, collideRect, stepBall };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.ArmPhysics = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
