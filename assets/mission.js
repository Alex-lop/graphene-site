/* The current Taskmaster mission, projected as a read-only web explanation.
   The HTML already contains the truthful final state; this file only switches
   stages and inspects the same six task nodes. No autoplay, no dependencies. */
(function () {
  'use strict';

  var FIXTURE = {
    grapheneSha: 'cc50a62a9a3f6b521d5a157b0942ca4e722fbe57',
    scenario: 'demo/taskmaster/scenario.json',
    scenarioSha256: 'a04092b1839e1b63d7b51d810b86b5d26dae117c2f6e0057108926da2920b593',
    missionId: 'mission_start_5541d5c504fa7f8409087233',
    baseSha: 'e5995606e3cdcf37737dc613e2f391e229726358',
    revision: 1,
    digest: 'cddcda3f19194df275e7be75c9fe2ba9b087fa4ebfd69ed7893b97754040bf8c',
    maxConcurrency: 2,
    missionState: 'awaiting_result',
    resultState: 'awaiting_decision',
    bundleId: 'final_result_be3df9ce374fa025d93f452e088d5803'
  };

  var IDS = [
    'redact_notes', 'render_json', 'render_markdown',
    'wire_cli', 'assemble_candidate', 'verify_candidate'
  ];
  var DEPS = {
    redact_notes: [],
    render_json: [],
    render_markdown: [],
    wire_cli: ['redact_notes', 'render_json', 'render_markdown'],
    assemble_candidate: ['redact_notes', 'render_json', 'render_markdown', 'wire_cli'],
    verify_candidate: ['assemble_candidate']
  };
  var META = {
    redact_notes: { kind: 'work', contract: 'Redact secret-bearing notes', writes: 'status_report/redact.py · tests/test_redact.py' },
    render_json: { kind: 'work', contract: 'Render canonical JSON', writes: 'status_report/render_json.py · tests/test_render_json.py' },
    render_markdown: { kind: 'work', contract: 'Render escaped Markdown', writes: 'status_report/render_markdown.py · tests/test_render_markdown.py' },
    wire_cli: { kind: 'work', contract: 'Wire the renderers into the CLI', writes: 'status_report/cli.py · tests/test_cli.py' },
    assemble_candidate: { kind: 'assembly', contract: 'Assemble accepted task publications', writes: 'exact candidate tree' },
    verify_candidate: { kind: 'verification', contract: 'Run the bound fixture test suite', writes: 'verification receipt' }
  };
  var GLYPH = { queued: '○', ready: '◐', running: '●', retrying: '↻', verifying: '◇', done: '✓' };
  var Q = 'queued';
  var STAGES = [
    {
      id: 'plan', label: 'Plan', signed: false, candidate: false, lineage: false,
      note: 'A goal becomes six bounded tasks. PLAN v1 is UNSIGNED, every task is queued, and nothing can run.',
      states: { redact_notes: Q, render_json: Q, render_markdown: Q, wire_cli: Q, assemble_candidate: Q, verify_candidate: Q }
    },
    {
      id: 'sign', label: 'Sign', signed: true, candidate: false, lineage: false,
      note: 'The exact mission, base commit, revision and SHA-256 digest are approved. The three root tasks become ready.',
      states: { redact_notes: 'ready', render_json: 'ready', render_markdown: 'ready', wire_cli: Q, assemble_candidate: Q, verify_candidate: Q }
    },
    {
      id: 'run', label: 'Run', signed: true, candidate: false, lineage: false,
      note: 'At most two root tasks run together. Downstream work waits for declared dependencies, while the terminal follows read-only.',
      states: { redact_notes: 'running', render_json: 'running', render_markdown: 'ready', wire_cli: Q, assemble_candidate: Q, verify_candidate: Q }
    },
    {
      id: 'recover', label: 'Recover', signed: true, candidate: false, lineage: false,
      note: 'render_markdown fails its fixture check and stays on the same node. Finished siblings remain done; the next lease becomes attempt 2 at fence 2 without changing the signed plan.',
      states: { redact_notes: 'done', render_json: 'done', render_markdown: 'retrying', wire_cli: Q, assemble_candidate: Q, verify_candidate: Q }
    },
    {
      id: 'prove', label: 'Prove', signed: true, candidate: true, lineage: true,
      note: 'Every task is done. Summary and why expose outcomes, receipts, files and known unknowns. The exact registered candidate waits outside the DAG for a separate approve/reject decision.',
      states: { redact_notes: 'done', render_json: 'done', render_markdown: 'done', wire_cli: 'done', assemble_candidate: 'done', verify_candidate: 'done' }
    }
  ];
  var WHY = [
    ['target', 'established'],
    ['producer attempt', 'wire_cli · attempt 1 · fence 1'],
    ['accepted inputs', 'established'],
    ['assembly candidate', 'established'],
    ['verification', 'established'],
    ['approval', 'unknown · awaiting exact result decision']
  ];

  var API = { FIXTURE: FIXTURE, IDS: IDS, DEPS: DEPS, META: META, STAGES: STAGES, WHY: WHY };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document === 'undefined') return;
  window.GrapheneMission = API;

  function create(tag, text, className) {
    var el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var root = document.querySelector('[data-mission]');
    if (!root) return;
    var nodes = {};
    Array.prototype.forEach.call(root.querySelectorAll('[data-node]'), function (node) {
      node.disabled = false;
      nodes[node.dataset.node] = node;
    });
    var edges = Array.prototype.slice.call(root.querySelectorAll('.plan-edges [data-from]'));
    var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-stages] button'));
    var note = root.querySelector('[data-stage-note]');
    var live = root.querySelector('[data-stage-live]');
    var signed = root.querySelector('[data-signed]');
    var candidate = root.querySelector('[data-candidate]');
    var lineage = root.querySelector('[data-lineage]');
    var mapTitle = root.querySelector('[data-map-title]');
    var mapDesc = root.querySelector('[data-map-desc]');
    var inspector = root.querySelector('[data-inspector]');
    var current = STAGES.length - 1;
    var selected = 'wire_cli';
    var pinned = true;

    function ancestors(id, seen) {
      seen = seen || {};
      (DEPS[id] || []).forEach(function (parent) {
        if (!seen[parent]) { seen[parent] = true; ancestors(parent, seen); }
      });
      return seen;
    }

    function descendants(id, seen) {
      seen = seen || {};
      IDS.forEach(function (child) {
        if (DEPS[child].indexOf(id) >= 0 && !seen[child]) {
          seen[child] = true; descendants(child, seen);
        }
      });
      return seen;
    }

    function attemptText(id, stage) {
      if (stage.id === 'plan' || stage.id === 'sign') return 'none yet';
      if (stage.id === 'run') {
        return stage.states[id] === 'running' ? 'attempt 1 · fence 1' : 'none yet';
      }
      if (stage.id === 'recover') {
        if (id === 'render_markdown') return 'attempt 1 · fence 1 · acceptance_check_failed';
        if (stage.states[id] === 'done') return 'attempt 1 · fence 1 · passed';
        return 'none yet';
      }
      if (id === 'render_markdown') return 'attempt 2 · fence 2 · passed; attempt 1 failed';
      return 'attempt 1 · fence 1 · passed';
    }

    function showInspector(id) {
      selected = id;
      IDS.forEach(function (taskId) {
        nodes[taskId].classList.remove('is-selected', 'is-muted');
        nodes[taskId].setAttribute('aria-expanded', taskId === id ? 'true' : 'false');
      });
      edges.forEach(function (edge) { edge.classList.remove('is-lit', 'is-muted'); });
      if (!id) {
        inspector.replaceChildren(create('p', 'Focus or select a task to inspect its contract.', 'inspector-title'));
        return;
      }

      var up = ancestors(id), down = descendants(id);
      up[id] = true; down[id] = true;
      IDS.forEach(function (taskId) {
        nodes[taskId].classList.toggle('is-muted', !up[taskId] && !down[taskId]);
      });
      nodes[id].classList.add('is-selected');
      edges.forEach(function (edge) {
        var from = edge.dataset.from, to = edge.dataset.to;
        var lit = (up[from] && up[to]) || (down[from] && down[to]);
        edge.classList.toggle('is-lit', !!lit);
        edge.classList.toggle('is-muted', !lit);
      });

      inspector.replaceChildren();
      if (STAGES[current].id === 'prove' && id === 'wire_cli') {
        var whyTitle = create('p', '', 'inspector-title');
        whyTitle.append('WHY ', create('code', 'status_report/cli.py'));
        inspector.append(whyTitle);
        var whyList = create('dl');
        WHY.forEach(function (row) { whyList.append(create('dt', row[0]), create('dd', row[1])); });
        inspector.append(whyList);
        return;
      }

      var stage = STAGES[current], meta = META[id];
      inspector.append(create('p', id, 'inspector-title'));
      var rows = [
        ['kind', meta.kind],
        ['contract', meta.contract],
        ['depends on', DEPS[id].length ? DEPS[id].join(', ') : 'nothing'],
        ['writes / proves', meta.writes],
        ['state', stage.states[id]],
        ['attempt', attemptText(id, stage)]
      ];
      var list = create('dl');
      rows.forEach(function (row) { list.append(create('dt', row[0]), create('dd', row[1])); });
      inspector.append(list);
    }

    function render(index, announce) {
      current = index;
      var stage = STAGES[index];
      root.dataset.stage = stage.id;
      IDS.forEach(function (id) {
        var state = stage.states[id], node = nodes[id];
        node.dataset.status = state;
        node.querySelector('[data-state]').textContent = GLYPH[state] + ' ' + state;
        node.setAttribute('aria-label', id + ', ' + state + ', ' + attemptText(id, stage));
      });
      buttons.forEach(function (button, i) {
        var on = i === index;
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      signed.textContent = stage.signed ? 'SIGNED — exact revision approved' : 'UNSIGNED — nothing runs until this revision is approved';
      candidate.hidden = !stage.candidate;
      lineage.toggleAttribute('hidden', !stage.lineage);
      mapTitle.textContent = stage.label + ': ' + stage.note.split('.')[0];
      mapDesc.textContent = stage.note;
      note.textContent = stage.note;
      if (announce) live.textContent = stage.label + '. ' + stage.note;
      if (selected) showInspector(selected);
    }

    buttons.forEach(function (button, index) {
      button.addEventListener('click', function () { render(index, true); });
    });
    root.querySelector('[data-stages]').addEventListener('keydown', function (event) {
      var index = buttons.indexOf(document.activeElement);
      if (index < 0) return;
      var next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = buttons.length - 1;
      else return;
      event.preventDefault(); buttons[next].focus(); render(next, true);
    });

    IDS.forEach(function (id) {
      var node = nodes[id];
      node.addEventListener('pointerenter', function () { if (!pinned) showInspector(id); });
      node.addEventListener('pointerleave', function () { if (!pinned) showInspector(null); });
      node.addEventListener('focus', function () { if (!pinned) showInspector(id); });
      node.addEventListener('click', function () {
        if (pinned && selected === id) { pinned = false; showInspector(null); }
        else { pinned = true; showInspector(id); }
      });
    });
    root.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && pinned) { pinned = false; showInspector(null); }
    });

    render(current, false);
  });
}());
