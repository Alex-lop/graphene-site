#!/usr/bin/env node
/* Fixture and interaction invariants for the signed-mission explanation. */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const missionPath = path.join(root, 'assets', 'mission.js');
const mission = require(missionPath);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const source = fs.readFileSync(missionPath, 'utf8');

assert.equal(mission.FIXTURE.grapheneSha, 'cc50a62a9a3f6b521d5a157b0942ca4e722fbe57');
assert.equal(mission.FIXTURE.scenario, 'demo/taskmaster/scenario.json');
assert.equal(mission.FIXTURE.maxConcurrency, 2);
assert.equal(mission.FIXTURE.digest, 'cddcda3f19194df275e7be75c9fe2ba9b087fa4ebfd69ed7893b97754040bf8c');
assert.equal(mission.FIXTURE.missionState, 'awaiting_result');
assert.equal(mission.FIXTURE.resultState, 'awaiting_decision');

assert.deepEqual(mission.IDS, [
  'redact_notes', 'render_json', 'render_markdown',
  'wire_cli', 'assemble_candidate', 'verify_candidate',
]);
assert.deepEqual(mission.DEPS, {
  redact_notes: [],
  render_json: [],
  render_markdown: [],
  wire_cli: ['redact_notes', 'render_json', 'render_markdown'],
  assemble_candidate: ['redact_notes', 'render_json', 'render_markdown', 'wire_cli'],
  verify_candidate: ['assemble_candidate'],
});
assert.equal(mission.IDS.includes('candidate'), false, 'candidate is not a plan task');

assert.deepEqual(mission.STAGES.map(({ id }) => id), ['plan', 'sign', 'run', 'recover', 'prove']);
for (const stage of mission.STAGES) {
  assert.deepEqual(Object.keys(stage.states).sort(), [...mission.IDS].sort());
  const active = Object.values(stage.states).filter((state) => state === 'running' || state === 'verifying');
  assert(active.length <= mission.FIXTURE.maxConcurrency, `${stage.id} exceeds max concurrency`);
  assert(!Object.values(stage.states).includes('accepted'), '`accepted` is not a task state');
}
assert.equal(mission.STAGES[3].states.render_markdown, 'retrying');
assert.equal(mission.IDS.filter((id) => id === 'render_markdown').length, 1, 'retry stays on one task node');
assert(Object.values(mission.STAGES.at(-1).states).every((state) => state === 'done'));
assert.deepEqual(mission.WHY.at(-1), ['approval', 'unknown · awaiting exact result decision']);

assert.equal((html.match(/data-node="/g) || []).length, 6);
assert.equal((html.match(/data-state>✓ done/g) || []).length, 6, 'no-JS state must be the truthful final state');
assert(html.includes('<details class="mission-text">'));
assert(html.includes('data-map-title'));
assert(html.includes('data-map-desc'));
assert(html.includes('final_result_be3df9ce374fa025d93f452e088d5803'));
assert(html.includes('a different fixture from the MCP mission above'));
assert(!html.includes('result committed'));
assert(!html.includes('data-state="accepted"'));

assert(!source.includes('setTimeout('), 'mission narrative must not autoplay');
assert(!source.includes('IntersectionObserver'));
assert(source.includes("event.key === 'Home'"));
assert(source.includes("event.key === 'End'"));
assert(source.includes("lineage.toggleAttribute('hidden'"));
assert(!source.includes('&apos;'));

console.log('all pass: fixture pin, topology, concurrency, retry, final gate, keyboard, and no-JS state');
