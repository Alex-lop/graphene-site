#!/usr/bin/env node
/* Deterministic checks for the production graphite field primitives. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const fieldPath = path.join(root, 'assets', 'field.js');
const field = require(fieldPath);
const { CONFIG, TOPOLOGY } = field;

function close(actual, expected, tolerance = 1e-9, message = '') {
  assert(Math.abs(actual - expected) <= tolerance,
    `${message} expected ${expected}, received ${actual}`);
}

/* Exact production mapping at corners, center, interior grid, transforms, and scroll offsets. */
const coordinateCases = [
  { name: 'desktop', rect: { left: 0, top: 0, width: 1440, height: 900 }, width: 1440, height: 900 },
  { name: 'narrow', rect: { left: 0, top: 0, width: 390, height: 844 }, width: 390, height: 844 },
  { name: 'fractional zoom', rect: { left: 12.25, top: 7.75, width: 1000.5, height: 600.25 }, width: 800, height: 480 },
  { name: 'after scroll', rect: { left: -3.5, top: -213.25, width: 1280.5, height: 800.75 }, width: 1280, height: 800 },
  { name: 'visual viewport resize', rect: { left: 4.125, top: 16.5, width: 1023.75, height: 767.5 }, width: 1024, height: 768 },
];
const ratios = [[0, 0], [1 - 1e-6, 0], [0, 1 - 1e-6], [1 - 1e-6, 1 - 1e-6], [.5, .5]];
for (const x of [.25, .5, .75]) for (const y of [.25, .5, .75]) ratios.push([x, y]);

for (const test of coordinateCases) {
  for (const [xUnit, yUnit] of ratios) {
    const clientX = test.rect.left + test.rect.width * xUnit;
    const clientY = test.rect.top + test.rect.height * yUnit;
    const mapped = field.mapPointer(clientX, clientY, test.rect, test.width, test.height);
    close(mapped.x, test.width * xUnit, 1e-7, `${test.name} x`);
    close(mapped.y, test.height * yUnit, 1e-7, `${test.name} y`);
  }
}

for (const dpr of [.8, 1, 1.25, 1.5, 2, 3]) {
  const size = field.canvasSize(1000.5, 600.25, dpr);
  const usedDpr = Math.min(dpr, CONFIG.dprCap);
  assert.deepEqual(size, {
    width: Math.round(1000.5 * usedDpr),
    height: Math.round(600.25 * usedDpr),
    dpr: usedDpr,
  });
  const mapped = field.mapPointer(500.25, 300.125,
    { left: 0, top: 0, width: 1000.5, height: 600.25 }, 1000.5, 600.25);
  close(mapped.x, 500.25, 1e-9, `DPR ${dpr} must not alter CSS x`);
  close(mapped.y, 300.125, 1e-9, `DPR ${dpr} must not alter CSS y`);
}

/* The exact signed topology and its anchors remain independent from pointer state. */
const expectedEdges = [
  [1, 4], [2, 4], [3, 4],
  [1, 5], [2, 5], [3, 5], [4, 5],
  [5, 6],
];
assert.deepEqual(TOPOLOGY.edges, expectedEdges);
assert.equal(TOPOLOGY.nodes[0].kind, 'boundary');
assert.equal(TOPOLOGY.nodes[7].kind, 'candidate');
assert.equal(TOPOLOGY.edges.some(([from, to]) => from === 7 || to === 7), false);
const heroRect = { left: 0, top: 62.5, width: 1440, height: 702.25 };
const anchorsBefore = field.topologyLayout(1440, 900, heroRect, false);

/* First paint is latent; first input is exact with zero false velocity and no reveal gate. */
const state = field.createState(0);
const firstPaint = field.frameState(state, 0, false);
assert(firstPaint.routeOpacities.every((opacity) => opacity > 0));
assert(firstPaint.nodeOpacities.slice(0, -1).every((opacity) => opacity > 0));
assert.equal(firstPaint.reveal, 0);

field.recordSample(state, { x: 100, y: 140, time: 0, receivedAt: 0,
  eventTimestamp: 5, clientX: 100, clientY: 140 });
assert.deepEqual({ x: state.x, y: state.y, vx: state.vx, vy: state.vy },
  { x: 100, y: 140, vx: 0, vy: 0 });
assert.equal(state.revealAt, 0, 'first real input starts reveal immediately');
assert.equal(field.frameState(state, 0, false).pressure, 1, 'first sample creates pressure');
const nextFrame = field.frameState(state, 1000 / 60, false);
assert(nextFrame.reveal > 0 && nextFrame.routeOpacity > firstPaint.routeOpacity,
  'actual rendered state changes by the next 60Hz frame');

field.recordSample(state, { x: 140, y: 140, time: 50 });
assert(state.vx > 0 && state.vy === 0);
const pathSamples = state.wake.slice(0, state.wakeCount);
for (let index = 2; index < pathSamples.length; index++) {
  assert(Math.hypot(pathSamples[index].x - pathSamples[index - 1].x,
    pathSamples[index].y - pathSamples[index - 1].y) <= CONFIG.wakeSpacing + 1e-9,
    'fast paths are resampled without holes');
}

function orderedWake(current) {
  const ordered = [];
  const start = (current.wakeHead - current.wakeCount + current.wake.length) % current.wake.length;
  for (let index = 0; index < current.wakeCount; index++) {
    ordered.push(current.wake[(start + index) % current.wake.length]);
  }
  return ordered;
}
const longSweep = field.createState(0);
field.recordSample(longSweep, { x: 0, y: 0, time: 0 });
field.recordSample(longSweep, { x: 1400, y: 800, time: 1000 });
for (const direction of [[0, 0, 2000], [1400, 0, 3000]]) {
  field.recordSample(longSweep, { x: direction[0], y: direction[1], time: direction[2] });
  const retained = orderedWake(longSweep);
  for (let index = 1; index < retained.length; index++) {
    assert(Math.hypot(retained[index].x - retained[index - 1].x,
      retained[index].y - retained[index - 1].y) <= CONFIG.wakeSpacing + 1e-7,
    'long diagonal and reversal paths retain 8–12px sampling');
  }
}

const at100 = field.frameState(state, 100, false);
const at250 = field.frameState(state, 250, false);
assert(at100.reveal > .5, 'route is visibly underway at 100ms');
assert(at250.routeOpacities.every((opacity) =>
  (opacity - CONFIG.latentRoute) / (CONFIG.settledRoute - CONFIG.latentRoute) >= .9));
assert(at250.nodeOpacities.slice(0, -1).every((opacity) =>
  (opacity - CONFIG.latentNode) / (CONFIG.settledNode - CONFIG.latentNode) >= .9));
assert.equal(at250.candidateOpacity, firstPaint.candidateOpacity,
  'pointer reveal never advances the candidate boundary');
assert.deepEqual(field.topologyLayout(1440, 900, heroRect, false), anchorsBefore,
  'pointer input never moves route anchors');

field.resetContact(state);
field.recordSample(state, { x: 930, y: 410, time: 300 });
assert.deepEqual({ x: state.x, y: state.y, vx: state.vx, vy: state.vy },
  { x: 930, y: 410, vx: 0, vy: 0 }, 're-entry seeds zero velocity at exact contact');
close(field.wakeDecay(CONFIG.wakeHalfLifeMs), .5, 1e-12, 'wake half-life');
assert(field.frameState(state, 300 + CONFIG.wakeStopMs - 1, false).running);
assert.equal(field.frameState(state, 300 + CONFIG.wakeStopMs, false).wakeEnergy, 0);
assert.equal(field.frameState(state, 300 + CONFIG.wakeStopMs, false).running, false);

/* Absolute-time state is refresh-rate independent and deterministic. */
function sampledSchedule(hz) {
  const sampledState = field.createState(0);
  field.recordSample(sampledState, { x: 240, y: 180, time: 0 });
  const frames = [];
  const interval = 1000 / hz;
  for (let index = 1; index * interval <= 250 + 1e-7; index++) {
    const now = index * interval;
    const sampled = field.frameState(sampledState, now, false);
    frames.push({ now, reveal: sampled.reveal, route: sampled.routeOpacity, node: sampled.nodeOpacity });
  }
  return frames;
}
const frames60 = sampledSchedule(60), frames120 = sampledSchedule(120);
for (const frames of [frames60, frames120]) {
  assert(frames[0].now <= 1000 / 60 && frames[0].reveal > 0, 'next scheduled frame responds');
  const by100 = frames.filter((item) => item.now <= 100 + 1e-7).at(-1);
  assert(by100.reveal > .5, 'scheduled route frame is underway by 100ms');
  const by250 = frames.at(-1);
  assert(by250.now >= 250 - 1e-7);
  assert((by250.route - CONFIG.latentRoute) / (CONFIG.settledRoute - CONFIG.latentRoute) >= .9);
  assert((by250.node - CONFIG.latentNode) / (CONFIG.settledNode - CONFIG.latentNode) >= .9);
}
close(frames60.at(-1).reveal, frames120.at(-1).reveal, 1e-12, '60/120Hz reveal');
assert.deepEqual(sampledSchedule(60), sampledSchedule(60));

const fallback = field.createState(0);
assert.equal(field.frameState(fallback, CONFIG.idleDelayMs - 1, false).reveal, 0);
assert(field.frameState(fallback, CONFIG.idleDelayMs + 100, false).reveal > .5);
assert.equal(field.frameState(fallback, CONFIG.idleDelayMs + CONFIG.resolveMs, false).reveal, 1);
const reduced = field.frameState(field.createState(0), 0, true);
assert.equal(reduced.reveal, 1);
assert.equal(reduced.running, false);
assert.equal(reduced.pressure, 0);

/* Source-level lifecycle and stacking invariants guard the browser wiring. */
const source = fs.readFileSync(fieldPath, 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'site.css'), 'utf8');
const tokens = fs.readFileSync(path.join(root, 'assets', 'design-tokens.css'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.equal((source.match(/requestAnimationFrame\(/g) || []).length, 1, 'one RAF scheduling site');
assert(source.includes("window.addEventListener('pointermove', onPointerMove, passive)"));
assert(source.includes('getCoalescedEvents'));
assert(source.includes("params.has('fieldDebug')"));
assert(!source.includes("hero.addEventListener('pointermove'"));
assert(!source.includes('canvas.closest'));
assert(!source.includes('IntersectionObserver'));
assert(!source.includes('pointerTauMs'));
assert(!source.includes('dwellMs'));
assert(!source.includes('Math.random'));
assert(css.includes('.field-plane {\n  position: fixed; inset: 0; z-index: 0;'));
assert(css.includes('pointer-events: none'));
assert(css.includes('main, footer { position: relative; z-index: 1; }'));
assert(tokens.includes('color-scheme: dark'));
assert(tokens.includes('--bg: #202020'));
assert(tokens.includes('--field-active: rgba(218, 218, 218, 0.10)'));
assert(tokens.includes('--field-route: #dedede'));
assert(html.indexOf('class="field-plane"') < html.indexOf('<nav class="nav"'));
assert(!/<header class="hero"[^]*?<canvas data-field/.test(html));

/* Mount the production handler/draw wiring against a minimal deterministic canvas. */
const listeners = new Map();
let queuedFrame = null;
let frameId = 0;
const noop = () => {};
const context = new Proxy({}, {
  get: (target, key) => target[key] || noop,
  set: (target, key, value) => { target[key] = value; return true; },
});
const canvas = {
  dataset: {}, clientWidth: 1440, clientHeight: 900, width: 0, height: 0,
  getContext: () => context,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: 1440, height: 900 }),
};
const hero = { getBoundingClientRect: () => ({ left: 0, top: 62, width: 1440, height: 702 }) };
global.document = {
  hidden: false, readyState: 'complete',
  querySelector: (selector) => selector === '.hero' ? hero : null,
  querySelectorAll: (selector) => selector === 'canvas[data-field]' ? [canvas] : [],
  addEventListener: noop,
};
global.getComputedStyle = () => ({ getPropertyValue: () => '' });
global.requestAnimationFrame = (callback) => { queuedFrame = callback; return ++frameId; };
global.cancelAnimationFrame = (id) => { if (id === frameId) queuedFrame = null; };
global.window = {
  location: { search: '?fieldDebug=1' }, devicePixelRatio: .8, visualViewport: null,
  matchMedia: (query) => ({ matches: query.includes('pointer: fine'), addEventListener: noop }),
  addEventListener: (name, listener) => listeners.set(name, listener),
  removeEventListener: (name, listener) => { if (listeners.get(name) === listener) listeners.delete(name); },
};
delete require.cache[require.resolve(fieldPath)];
require(fieldPath);
let callback = queuedFrame; queuedFrame = null; callback(performance.now());
const anchorsAtRest = window.GrapheneFieldDiagnostics.read().nodeAnchors;
listeners.get('pointermove')({
  pointerType: 'mouse', clientX: 321.25, clientY: 456.5, timeStamp: 0,
  getCoalescedEvents() { return []; },
});
callback = queuedFrame; queuedFrame = null; callback(performance.now() + 1000 / 60);
const mounted = window.GrapheneFieldDiagnostics.read();
close(mounted.injection.x, 321.25, 1e-9, 'mounted injection x');
close(mounted.contact.y, 456.5, 1e-9, 'mounted contact y');
assert.equal(mounted.paintedSequence, 1);
assert(Math.hypot(mounted.responsePeak.x - mounted.contact.x,
  mounted.responsePeak.y - mounted.contact.y) <= mounted.markSpacing,
'visible contact peak stays within one production mark spacing');
assert.deepEqual(mounted.nodeAnchors, anchorsAtRest, 'mounted pointer input leaves anchors fixed');
assert.deepEqual([canvas.width, canvas.height, mounted.dpr], [1152, 720, .8]);
listeners.get('pagehide')();
assert(!listeners.has('pointermove'), 'pagehide tears down the production pointer listener');
assert.equal(queuedFrame, null, 'pagehide stops the queued RAF');

console.log('all pass: exact field mapping, contact, wake, reveal, topology, lifecycle, and graphite stack');
