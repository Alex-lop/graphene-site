/* Graphene mission replay.
   Node positions are fixed in the HTML so the page is complete without this
   file; here we only change state, highlight lineage, and fill the inspector.
   No dependencies. */
(function () {
  'use strict';

  var V1 = '83762ff17f47726d8fd22d53f1865b52926101eb6aea094a3d1a8c643f42da48';
  var V2 = '4657377bb718c385427be0ddda84a4f62f9b679a8ebb0b93b859b626086059f2';

  /* status per node, per stage: [glyph, word, detail] */
  var Q = ['○', 'queued', ''];
  var STAGES = [
    { id: 'plan', label: 'Plan', rev: '1', digest: V1, hidden: ['task-docs'],
      approval: 'none yet — a proposal is not a decision',
      note: 'Graphene proposes one route bound to an exact commit, and stops.',
      state: { 'task-json-renderer': Q, 'task-markdown-renderer': Q, 'task-cli-integration': Q,
               'assemble': Q, 'verify': Q, 'result': Q } },

    { id: 'edit', label: 'Edit', rev: '2 (draft)', digest: null, hidden: [],
      approval: 'the revision 1 approval is void',
      note: 'You export the plan as canonical YAML, add a docs task, rewire it into assembly, and revise. Revision 2 is a new immutable revision — revision 1 is not edited, and its approval is void.',
      state: { 'task-json-renderer': Q, 'task-markdown-renderer': Q, 'task-docs': Q,
               'task-cli-integration': Q, 'assemble': Q, 'verify': Q, 'result': Q } },

    { id: 'approve', label: 'Approve', rev: '2', digest: V2, hidden: [],
      approval: 'event records revision 2, plan_sha256 and base_sha',
      note: 'The recorded approval names four things at once. Name a superseded revision, or the wrong digest, and the store refuses it — and nothing can be dispatched under a revision nobody approved.',
      state: { 'task-json-renderer': Q, 'task-markdown-renderer': Q, 'task-docs': Q,
               'task-cli-integration': Q, 'assemble': Q, 'verify': Q, 'result': Q } },

    { id: 'run', label: 'Run', rev: '2', digest: V2, hidden: [],
      approval: 'bound to revision 2',
      note: 'Only tasks whose dependencies are satisfied become ready. The three roots run in parallel, each fenced to its own write scope.',
      state: { 'task-json-renderer': ['●', 'running', 'attempt 1 · fence 1'],
               'task-markdown-renderer': ['●', 'running', 'attempt 1 · fence 1'],
               'task-docs': ['●', 'running', 'attempt 1 · fence 1'],
               'task-cli-integration': Q, 'assemble': Q, 'verify': Q, 'result': Q } },

    { id: 'retry', label: 'Retry', rev: '2', digest: V2, hidden: [],
      approval: 'bound to revision 2',
      note: 'A trusted check fails. The retry is authorised at a strictly higher fence carrying the failure diagnostic — the accepted sibling stays accepted.',
      state: { 'task-json-renderer': ['↻', 'retrying', 'check failed — attempt 2 · fence 2'],
               'task-markdown-renderer': ['✓', 'accepted', 'attempt 1 · fence 1'],
               'task-docs': ['✓', 'accepted', 'attempt 1 · fence 1'],
               'task-cli-integration': Q, 'assemble': Q, 'verify': Q, 'result': Q } },

    { id: 'verify', label: 'Verify', rev: '2', digest: V2, hidden: [],
      approval: 'bound to revision 2',
      note: 'Assembly consumes only accepted work, verification runs the one allowed check, and the result is an isolated commit — nothing is pushed. A file published against a task&apos;s declared write paths can then name the attempt, worker and fence behind it.',
      state: { 'task-json-renderer': ['✓', 'accepted', 'attempt 2 · fence 2'],
               'task-markdown-renderer': ['✓', 'accepted', 'attempt 1 · fence 1'],
               'task-docs': ['✓', 'accepted', 'attempt 1 · fence 1'],
               'task-cli-integration': ['✓', 'accepted', 'attempt 1 · fence 1'],
               'assemble': ['✓', 'accepted', 'attempt 1 · fence 1'],
               'verify': ['✓', 'accepted', 'attempt 1 · fence 1'],
               'result': ['✓', 'committed', 'isolated — nothing pushed'] } }
  ];

  /* Contracts as captured in evidence/north_star/2026-08-23-mission1/plan_show.json,
     except task-docs, which is the edit scripts/plan_digest.py applies to that plan. */
  var CONTRACT = {
    'task-json-renderer': { role: 'worker', kind: 'work', writes: ['ledger_service/report_json.py', 'tests/test_report_json.py'] },
    'task-markdown-renderer': { role: 'worker', kind: 'work', writes: ['ledger_service/report_markdown.py', 'tests/test_report_markdown.py'] },
    'task-docs': { role: 'worker', kind: 'work', writes: ['README.md'], added: true },
    'task-cli-integration': { role: 'worker', kind: 'work', writes: ['ledger_service/cli.py', 'tests/test_cli_reports.py'] },
    'assemble': { role: 'assembler', kind: 'assembly', writes: [] },
    'verify': { role: 'verifier', kind: 'verification', writes: [] },
    'result': { role: '—', kind: 'result', writes: [] }
  };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {
    var root = document.querySelector('[data-mission]');
    if (!root) return;
    var svg = root.querySelector('.mgraph');
    var stageBar = root.querySelector('[data-stages]');
    var readout = root.querySelector('[data-readout]');
    var inspector = root.querySelector('[data-inspector]');
    var noteEl = root.querySelector('[data-note]');
    if (!svg || !stageBar || !readout || !inspector) return;

    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var nodes = {}, order = [], up = {}, down = {};
    Array.prototype.forEach.call(svg.querySelectorAll('[data-node]'), function (g) {
      var id = g.dataset.node; nodes[id] = g; order.push(id); up[id] = []; down[id] = [];
    });
    var edges = Array.prototype.slice.call(svg.querySelectorAll('.mg-edge'));
    edges.forEach(function (e) {
      var f = e.dataset.from, t = e.dataset.to;
      if (up[t]) up[t].push(f);
      if (down[f]) down[f].push(t);
    });

    function walk(id, map, seen) {
      seen = seen || {};
      (map[id] || []).forEach(function (n) { if (!seen[n]) { seen[n] = 1; walk(n, map, seen); } });
      return seen;
    }

    var current = 0, pinned = null;

    /* ---- stage rendering ------------------------------------------- */

    function renderStage(i) {
      current = i;
      var s = STAGES[i];
      order.forEach(function (id) {
        var g = nodes[id];
        var hidden = s.hidden.indexOf(id) >= 0 || !s.state[id];
        g.classList.toggle('is-out', hidden);
        var st = s.state[id] || Q;
        g.dataset.state = st[1];
        g.querySelector('.mg-state').textContent = hidden ? '' : st[0] + ' ' + st[1];
        g.setAttribute('aria-label', id + ', ' + (hidden ? 'not in this revision' : st[1] + (st[2] ? ', ' + st[2] : '')));
      });
      edges.forEach(function (e) {
        var f = e.dataset.from, t = e.dataset.to;
        e.classList.toggle('is-out', s.hidden.indexOf(f) >= 0 || s.hidden.indexOf(t) >= 0 || !s.state[t]);
      });
      root.dataset.stage = s.id;
      Array.prototype.forEach.call(stageBar.querySelectorAll('button'), function (b, n) {
        b.setAttribute('aria-current', n === i ? 'step' : 'false');
        b.classList.toggle('is-on', n === i);
      });
      readout.querySelector('[data-rev]').textContent = s.rev;
      var dg = readout.querySelector('[data-digest]');
      dg.textContent = s.digest || 'recomputed when the revision compiles';
      dg.classList.toggle('is-pending', !s.digest);
      dg.classList.toggle('is-v2', s.digest === V2);
      readout.querySelector('[data-approval]').textContent = s.approval;
      if (noteEl) noteEl.textContent = s.note;
      if (pinned) showNode(pinned); else showNode(null);
    }

    /* ---- node inspection ------------------------------------------- */

    function showNode(id) {
      var s = STAGES[current];
      if (id && (s.hidden.indexOf(id) >= 0 || !s.state[id])) id = null;
      svg.classList.toggle('is-focused', !!id);
      order.forEach(function (n) { nodes[n].classList.remove('is-lit', 'is-self'); });
      edges.forEach(function (e) { e.classList.remove('is-lit'); });

      if (!id) {
        inspector.innerHTML = '<p class="mg-hint">Hover, tap or focus a task to see its contract.</p>';
        return;
      }
      var anc = walk(id, up), des = walk(id, down);
      anc[id] = 1; des[id] = 1;
      order.forEach(function (n) { if (anc[n] || des[n]) nodes[n].classList.add('is-lit'); });
      nodes[id].classList.add('is-self');
      edges.forEach(function (e) {
        var f = e.dataset.from, t = e.dataset.to;
        if ((anc[f] && anc[t]) || (des[f] && des[t])) e.classList.add('is-lit');
      });

      var c = CONTRACT[id] || {}, st = s.state[id] || Q;
      var rows = [
        ['task', id],
        ['kind', c.kind || '—'],
        ['depends on', (up[id] && up[id].length) ? up[id].join(', ') : 'nothing'],
        ['writes', (c.writes && c.writes.length) ? c.writes.join('<br>') : 'nothing'],
        ['check', id === 'result' ? '—' : 'fixture-tests'],
        ['status', st[0] + ' ' + st[1] + (st[2] ? ' · ' + st[2] : '')],
        ['bound to', 'revision ' + s.rev + (s.digest ? ' · ' + s.digest.slice(0, 12) + '…' : '')]
      ];
      inspector.innerHTML = '<dl class="mg-fields">' + rows.map(function (r) {
        return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>';
      }).join('') + '</dl>' + (c.added ? '<p class="mg-added-note">Your edit &mdash; it is not in the captured plan; it is what scripts/plan_digest.py adds to it.</p>' : '');
    }

    /* ---- wiring ----------------------------------------------------- */

    stageBar.innerHTML = STAGES.map(function (s, i) {
      return '<button type="button" data-i="' + i + '">' + s.label + '</button>';
    }).join('');
    stageBar.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (b) { stop(); renderStage(+b.dataset.i); }
    });
    stageBar.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault(); stop();
      var i = Math.max(0, Math.min(STAGES.length - 1, current + d));
      renderStage(i);
      stageBar.querySelectorAll('button')[i].focus();
    });

    order.forEach(function (id) {
      var g = nodes[id];
      g.addEventListener('pointerenter', function () { if (!pinned) showNode(id); });
      g.addEventListener('pointerleave', function () { if (!pinned) showNode(null); });
      g.addEventListener('focus', function () { if (!pinned) showNode(id); });
      g.addEventListener('blur', function () { if (!pinned) showNode(null); });
      g.addEventListener('click', function () { pinned = pinned === id ? null : id; showNode(pinned || null); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pinned = pinned === id ? null : id; showNode(pinned || null); }
      });
    });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && pinned) { pinned = null; showNode(null); }
    });

    /* ---- autoplay once, then stop ----------------------------------- */

    var timer = 0;
    function stop() { clearTimeout(timer); timer = 0; root.dataset.playing = 'false'; }
    function play(from) {
      stop(); root.dataset.playing = 'true';
      var i = from || 0;
      renderStage(i);
      (function step() {
        if (i >= STAGES.length - 1) { stop(); return; }
        timer = setTimeout(function () { renderStage(++i); step(); }, 1500);
      }());
    }

    var replay = root.querySelector('[data-replay]');
    if (replay) replay.addEventListener('click', function () { pinned = null; play(0); });

    renderStage(STAGES.length - 1);           /* the honest resting state */
    if (!still && window.IntersectionObserver) {
      var io = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { io.disconnect(); play(0); }
      }, { threshold: 0.35 });
      io.observe(root);
    }
  });
}());
