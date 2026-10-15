/* 离线自测：node arm/test.cjs。仅使用 Node 内置模块，不参与页面运行。 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const P = require('./physics.js');
const tests = [];
function test(name, run) { tests.push({ name, run }); }
const near = (actual, expected, epsilon = .6) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≠ ${expected}`);
const base = { x: 220, y: 510 };
const openLimits = (n) => Array.from({ length: n }, () => [-Math.PI + .001, Math.PI - .001]);
const world = { floor: 550, obstacles: [], hoop: { x: 720, y: 285, width: 90 } };
const makeBall = (x, y, vx = 0, vy = 0) => ({ x, y, vx, vy, r: 11, scored: false });

test('二、三连杆 CCD 收敛，连杆长度保持不变', () => {
  for (const lengths of [[155, 145], [115, 105, 80]]) {
    for (const target of [{ x: 365, y: 502 }, { x: 350, y: 330 }, { x: 180, y: 280 }, { x: 430, y: 380 }]) {
      const angles = P.solveIK(base, lengths, lengths.length === 2 ? [-1.7, 1.6] : [-1.8, 1.1, .9], target, openLimits(lengths.length));
      const points = P.forward(base, lengths, angles);
      assert.ok(P.distance(points.at(-1), target) < 1.5, `${lengths.length} links: ${JSON.stringify(target)}`);
      lengths.forEach((length, i) => near(P.distance(points[i], points[i + 1]), length, .00001));
    }
  }
});
test('不可达目标不会使连杆伸长或产生 NaN', () => {
  for (const lengths of [[155, 145], [115, 105, 80]]) {
    const a = P.solveIK(base, lengths, lengths.map(() => 0), { x: 2000, y: -1000 }, openLimits(lengths.length));
    assert.ok(a.every(Number.isFinite));
    assert.ok(P.distance(base, P.forward(base, lengths, a).at(-1)) <= 300.00001);
  }
});
test('共线与目标正好落在关节上时数值稳定', () => {
  for (const target of [base, { x: 100, y: 510 }, { x: 520, y: 510 }]) {
    assert.ok(P.solveIK(base, [155, 145], [0, 0], target, openLimits(2)).every(Number.isFinite));
  }
});
test('关节限位在随机目标下始终生效', () => {
  const limits = [[-165, -10], [-135, 135], [-100, 100]].map((pair) => pair.map((a) => a * Math.PI / 180));
  let angles = [-1.8, 1.1, .9];
  for (let i = 0; i < 180; i++) {
    angles = P.solveIK(base, [115, 105, 80], angles, { x: 220 + Math.cos(i) * 450, y: 350 + Math.sin(i * 1.3) * 250 }, limits);
    angles.forEach((a, j) => assert.ok(a >= limits[j][0] && a <= limits[j][1]));
  }
});
test('出手速度继承方向、限速，静止松手没有额外动力', () => {
  assert.deepEqual(P.launchVelocity({ x: 0, y: 0 }), { x: 0, y: 0 });
  const slow = P.launchVelocity({ x: 300, y: -400 }); near(slow.x, 435); near(slow.y, -580);
  const fast = P.launchVelocity({ x: 3000, y: -4000 }); near(Math.hypot(fast.x, fast.y), 1100);
});
test('球受到重力，地面反弹且逐渐失去能量', () => {
  const b = makeBall(400, 400); P.stepBall(b, 1 / 120, world); assert.ok(b.vy > 0);
  const falling = makeBall(400, 538, 200, 500); P.stepBall(falling, 1 / 120, world);
  assert.ok(falling.vy < 0 && Math.abs(falling.vy) < 500); assert.equal(falling.y, 539);
});
test('只从上往下穿过篮圈内侧记分，同一球只记一次', () => {
  const b = makeBall(720, 284, 0, 200);
  assert.equal(P.stepBall(b, 1 / 120, world), true);
  for (let i = 0; i < 120; i++) assert.equal(P.stepBall(b, 1 / 120, world), false);
  const rising = makeBall(720, 286, 0, -300);
  assert.equal(P.stepBall(rising, 1 / 120, world), false);
  const outside = makeBall(650, 284, 0, 200);
  assert.equal(P.stepBall(outside, 1 / 120, world), false);
});
test('篮圈边缘与篮板产生实体反弹，不会误判得分', () => {
  const rim = makeBall(675, 273, 0, 250);
  assert.equal(P.stepBall(rim, 1 / 120, world), false); assert.ok(rim.vy < 0);
  const board = makeBall(765, 230, 500, 0);
  P.stepBall(board, 1 / 120, world); assert.ok(board.vx < 0);
});
test('障碍物碰撞与球恰在矩形内部的情况数值稳定', () => {
  const rect = { x: 560, y: 365, w: 24, h: 185 };
  const b = makeBall(553, 420, 400, 0); assert.equal(P.collideRect(b, rect), true); assert.ok(b.vx < 0); near(b.x, 549);
  const inside = makeBall(570, 400, 200, 0); P.collideRect(inside, rect);
  assert.ok([inside.x, inside.y, inside.vx, inside.vy].every(Number.isFinite));
});

// 实际 game.js 放入最小 DOM/Canvas 环境；通过真实按钮和 PointerEvent/键盘事件驱动。
function createGame() {
  const elements = new Map();
  class Element {
    constructor() { this.events = {}; this.dataset = {}; this.checked = false; this.hidden = false; this.disabled = false; this.classList = { toggle() {} }; }
    addEventListener(name, handler) { (this.events[name] ||= []).push(handler); }
    emit(name, props = {}) { for (const fn of this.events[name] || []) fn({ preventDefault() {}, ...props }); }
    setAttribute(name, value) { this[name] = value; }
    focus() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 600 }; }
    hasPointerCapture(id) { return this.capture === id; }
    setPointerCapture(id) { this.capture = id; }
    releasePointerCapture() { this.capture = null; }
  }
  const get = (id) => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const buttons = [2, 3].map((n) => { const b = new Element(); b.dataset.links = String(n); return b; });
  get('show-angles').checked = get('show-path').checked = true;
  const ctx = new Proxy({}, { get(object, key) { return object[key] || (() => {}); }, set(object, key, value) { object[key] = value; return true; } });
  get('game').getContext = () => ctx;
  const doc = new Element(); doc.getElementById = get; doc.documentElement = new Element();
  doc.querySelectorAll = () => buttons; doc.hidden = false;
  const win = new Element(), saved = new Map();
  const sandbox = {
    ArmPhysics: P, document: doc, window: win,
    localStorage: { getItem: (key) => saved.get(key), setItem: (key, value) => saved.set(key, value) },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    MutationObserver: class { observe() {} }, ResizeObserver: class { observe() {} },
    getComputedStyle: () => ({ getPropertyValue: () => '#282824' }), devicePixelRatio: 1,
    requestAnimationFrame() {},
  };
  const source = fs.readFileSync(__dirname + '/game.js', 'utf8');
  // 测试入口仅注入 VM 中的副本，生产页面没有调试/跳关 API。
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/, `globalThis.testAPI = {
    update, startLevel, draw,
    state: () => ({ball, mode, score, attempts, hits, level, complete, angles, limits, target, velocity, points, linkCount})
  };})();`), sandbox);
  const api = sandbox.testAPI;
  return {
    ...api, get, buttons, doc, win, saved,
    tick(seconds) { for (let i = 0; i < Math.round(seconds * 120); i++) api.update(1 / 120); },
    pointer(type, x, y, extra = {}) { get('game').emit(type, { pointerId: 1, pointerType: 'touch', clientX: x, clientY: y, ...extra }); },
    key(key, extra = {}) { get('game').emit('keydown', { key, ...extra }); },
  };
}
test('按钮自动抓球，静止投出，未命中后自动放回并保留出手数', () => {
  const g = createGame(); assert.equal(g.state().mode, 'ready');
  g.get('grab').emit('click'); g.tick(1.2); assert.equal(g.state().mode, 'held');
  g.get('throw').emit('click'); assert.equal(g.state().mode, 'flying'); assert.equal(g.state().attempts, 1);
  g.tick(8); assert.equal(g.state().mode, 'ready'); assert.equal(g.state().attempts, 1);
});
test('手机指针捕获，第二根手指被忽略；取消手势不误投', () => {
  const g = createGame(); g.get('grab').emit('click'); g.tick(1);
  g.pointer('pointerdown', 320, 400); g.tick(.2);
  g.pointer('pointermove', 900, 70, { pointerId: 2 }); assert.equal(g.state().target.x, 320);
  g.pointer('pointercancel', 320, 400); g.tick(.5);
  assert.equal(g.state().mode, 'held'); assert.equal(g.state().attempts, 0);
  assert.ok(Math.hypot(g.state().velocity.x, g.state().velocity.y) < 2);
});
test('拖动并松手投出，指针瞬移不会直接变成球速', () => {
  const g = createGame(); g.get('grab').emit('click'); g.tick(1);
  g.pointer('pointerdown', 300, 420); g.tick(.5);
  g.pointer('pointermove', 450, 250); g.tick(.1); g.pointer('pointerup', 450, 250);
  assert.equal(g.state().mode, 'flying'); assert.equal(g.state().attempts, 1);
  assert.ok(Math.hypot(g.state().ball.vx, g.state().ball.vy) <= 1100.00001);
  assert.ok(g.state().ball.vx > 0 && g.state().ball.vy < 0);
});
test('键盘可抓球、移动、投出，失焦后不继续移动', () => {
  const g = createGame(); g.key('g'); g.tick(1); assert.equal(g.state().mode, 'held');
  g.key('ArrowUp'); g.key('ArrowRight'); g.tick(.15); g.key(' ');
  assert.equal(g.state().mode, 'flying'); assert.ok(g.state().ball.vy < 0);
  g.win.emit('blur'); const target = { ...g.state().target }; g.tick(.2);
  assert.equal(g.state().target.x, target.x); assert.equal(g.state().target.y, target.y);
});
test('切换连杆保留成绩，第三关限位，重开清空本局', () => {
  const g = createGame(); g.key('g'); g.tick(1); g.key(' ');
  g.buttons[1].emit('click'); assert.equal(g.state().angles.length, 3); assert.equal(g.state().attempts, 1);
  g.startLevel(2); g.pointer('pointerdown', 900, 535); g.tick(1);
  g.state().angles.forEach((a, i) => assert.ok(a >= g.state().limits[i][0] && a <= g.state().limits[i][1]));
  g.get('show-workspace').checked = true; g.draw(); // 包含工作空间、障碍、关节角绘制路径。
  g.get('restart').emit('click'); assert.equal(g.state().level, 0); assert.equal(g.state().attempts, 0); assert.equal(g.state().score, 0);
});

test('二、三连杆均可用真实拖动手势连续通关，成绩与最佳分数正确', () => {
  for (const count of [2, 3]) {
    const g = createGame(); if (count === 3) g.buttons[1].emit('click');
    const durations = count === 2 ? [.28, .26, .26] : [.22, .26, .26];
    const scores = [100, 250, 450];
    for (let level = 0; level < 3; level++) {
      assert.equal(g.state().level, level);
      g.get('grab').emit('click'); g.tick(1);
      g.pointer('pointerdown', 360, 430); g.tick(.6);
      const frames = Math.round(durations[level] * 120);
      for (let f = 1; f <= frames; f++) {
        g.pointer('pointermove', 360 + 75 * f / frames, 430 - 90 * f / frames); g.tick(1 / 120);
      }
      g.pointer('pointerup', 435, 340); g.tick(2.5);
      assert.equal(g.state().score, scores[level], `${count} 连杆第 ${level + 1} 关`);
      assert.equal(g.state().hits, level + 1); assert.equal(g.state().attempts, level + 1);
      assert.equal(g.get('result').hidden, false); assert.equal(g.state().complete, true);
      assert.equal(g.saved.get('arm-basket-best'), String(scores[level]));
      // 过关后重置/切连杆不能重复刷本关分数。
      g.get('retry').emit('click'); g.buttons[0].emit('click');
      assert.equal(g.state().score, scores[level]); assert.equal(g.state().complete, true);
      g.get('next-level').emit('click');
    }
    assert.equal(g.state().score, 0); assert.equal(g.state().level, 0); assert.equal(g.state().attempts, 0);
    assert.equal(g.get('best').textContent, '450');
  }
});

if (process.argv.includes('--find-shots')) {
  // 找出每一种机械臂在各关可复现的真实拖动手势，保证六种组合均可玩。
  for (let count = 2; count <= 3; count++) for (let level = 0; level < 3; level++) {
    let found = null;
    outer: for (const start of [[360, 430], [370, 400], [350, 420], [380, 380]]) {
      for (const end of [[435, 340], [440, 310], [450, 300], [460, 310], [430, 280], [450, 230]]) {
        for (const duration of [.18, .22, .26, .28, .3, .34, .38, .42]) {
          const g = createGame(); if (count === 3) g.buttons[1].emit('click'); g.startLevel(level);
          g.get('grab').emit('click'); g.tick(1);
          g.pointer('pointerdown', ...start); g.tick(.6);
          const frames = Math.round(duration * 120);
          for (let f = 1; f <= frames; f++) {
            g.pointer('pointermove', start[0] + (end[0] - start[0]) * f / frames, start[1] + (end[1] - start[1]) * f / frames); g.tick(1 / 120);
          }
          g.pointer('pointerup', ...end);
          g.tick(2.5);
          if (g.state().score > 0) { found = { count, level: level + 1, start, end, duration }; break outer; }
        }
      }
    }
    assert.ok(found, `${count} 连杆第 ${level + 1} 关没有找到可行手势`);
    console.log('可行出手', JSON.stringify(found));
  }
}

let failed = 0;
for (const { name, run } of tests) {
  try { run(); console.log('✓', name); } catch (error) { failed++; console.error('✗', name, error.message); }
}
console.log(`${tests.length - failed}/${tests.length} 项通过`);
process.exitCode = failed ? 1 : 0;
