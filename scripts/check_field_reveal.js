#!/usr/bin/env node
/* Deterministic checks for the production Governance Lens primitives. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fieldPath = path.join(__dirname, '..', 'assets', 'field.js');
const field = require(fieldPath);

const { CONFIG, TOPOLOGY } = field;
assert.equal(CONFIG.dwellMs + CONFIG.resolveMs, 540, 'pause-to-settle must be 540ms');
assert.equal(CONFIG.radius, 168);
assert.equal(CONFIG.desktopCap, 1600);
assert.equal(CONFIG.narrowCap, 900);
assert(CONFIG.idleStopMs <= 4500, 'onboarding must stop within 4.5s');

assert.equal(field.influence(0, CONFIG.radius), 1);
assert.equal(field.influence(CONFIG.radius, CONFIG.radius), 0);
assert(field.influence(80, CONFIG.radius) > field.influence(140, CONFIG.radius));
assert(field.expSmooth(0, 1, 100, CONFIG.strengthInMs) > .5, 'input must visibly respond within 100ms');
assert.equal(field.releaseValue(40, 1), 1, 'release holds briefly');
assert(field.releaseValue(300, 1) < field.releaseValue(150, 1), 'release decays smoothly');
assert(CONFIG.releaseHoldMs + CONFIG.releaseStopMs <= 700, 'release must settle within 700ms');
assert(field.releaseValue(CONFIG.releaseHoldMs + CONFIG.releaseStopMs, 1) < .04);

const desktopLeft = field.mapPointer(0, 100, 1200, 700, false);
const desktopRight = field.mapPointer(1200, 100, 1200, 700, false);
assert(desktopLeft.x >= 1200 * .43 && desktopRight.x > desktopLeft.x, 'all hero input maps into the visual stage');
const mobile = field.mapPointer(10, 10, 390, 760, true);
assert(mobile.y >= 760 * .64, 'touch-size composition lives below the copy');

const expectedEdges = [
  [1, 4], [2, 4], [3, 4],
  [1, 5], [2, 5], [3, 5], [4, 5],
  [5, 6],
];
assert.deepEqual(TOPOLOGY.edges, expectedEdges);
assert.equal(TOPOLOGY.nodes[0].kind, 'boundary');
assert.equal(TOPOLOGY.nodes[7].kind, 'candidate');
assert.equal(TOPOLOGY.edges.some(([from, to]) => from === 7 || to === 7), false, 'candidate must stay outside the DAG');

assert.equal(field.stageForWave(.1), 0);  // at most roots 1 + 2
assert.equal(field.stageForWave(.3), 1);  // root 3 alone
assert.equal(field.stageForWave(.5), 2);  // wire
assert.equal(field.stageForWave(.7), 3);  // assembly
assert.equal(field.stageForWave(.9), 4);  // verification
assert.equal(field.stageForWave(1), -1);  // progress stops
assert(field.nodeResolve(1, .3) > field.nodeResolve(4, .3), 'roots resolve before wiring');
assert(field.routeResolve(0, .5) > field.routeResolve(7, .5), 'upstream routes resolve first');

assert.deepEqual(field.debugFrame('rest'), { resolve: 0, wave: -1, candidate: 0 });
assert.equal(field.debugFrame('resolve').candidate, 0);
assert.deepEqual(field.debugFrame('verified'), { resolve: 1, wave: -1, candidate: 1 });
assert(field.debugFrame('release').resolve < 1);
assert.equal(field.debugFrame('missing'), null);

assert.equal(field.idleFrame(0).resolve, 0);
assert(field.idleFrame(800).resolve > 0 && field.idleFrame(800).resolve < 1);
assert(field.idleFrame(CONFIG.idleWaveAtMs + 20).wave >= 0);
assert.equal(field.idleFrame(CONFIG.idleWaveAtMs + CONFIG.waveMs - 1).candidate, 0,
  'candidate appears only after verification');
assert(field.idleFrame(CONFIG.idleWaveAtMs + CONFIG.waveMs + 200).candidate > 0);
assert.equal(field.idleFrame(CONFIG.idleStopMs).running, false, 'onboarding must stop inside 4.5s');
assert(field.idleFrame(CONFIG.idleStopMs).resolve < .5, 'onboarding settles to a quiet latent route');

const source = fs.readFileSync(fieldPath, 'utf8');
assert(source.includes("hero.addEventListener('pointermove'"));
assert(source.includes("canvas.closest('.hero')"));
assert(!source.includes("canvas.addEventListener('pointermove'"));
assert(!source.includes('Math.random'));
assert(source.includes("frozenName = 'verified'"));
assert(source.includes("motion.mode !== 'release' && ptr.inside"), 'fresh pointer samples must not cancel a release');

console.log('all pass: Governance Lens input, timing, topology, lifecycle, and static states');
