/* Graphene Governance Lens.
   A deterministic graphite current reveals the approved Taskmaster route.
   Pointer contact is exact; only its short sampled wake trails. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var CONFIG = {
    resolveMs: 220, idleDelayMs: 225,
    contactHoldMs: 34, contactReleaseMs: 95,
    wakeHalfLifeMs: 230, wakeFadeAtMs: 600, wakeStopMs: 760,
    wakeSpacing: 10, wakeRadius: 126, wakeSamples: 64, radius: 168,
    latentRoute: .16, settledRoute: .78,
    latentNode: .2, settledNode: .86, candidateOpacity: .28,
    desktopCap: 1600, narrowCap: 900, dprCap: 2
  };

  /* goal/candidate are boundary markers, not task nodes. */
  var TOPOLOGY = {
    nodes: [
      { id: 'goal', kind: 'boundary' },
      { id: 'redact_notes', kind: 'work' },
      { id: 'render_json', kind: 'work' },
      { id: 'render_markdown', kind: 'work' },
      { id: 'wire_cli', kind: 'work' },
      { id: 'assemble_candidate', kind: 'assembly' },
      { id: 'verify_candidate', kind: 'verification' },
      { id: 'candidate', kind: 'candidate' }
    ],
    edges: [[1, 4], [2, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 6]]
  };

  function clamp(value, lo, hi) { return Math.max(lo, Math.min(hi, value)); }
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function influence(distance, radius) { return distance >= radius ? 0 : 1 - fade(distance / radius); }

  /* Production input mapping: client CSS pixels -> canvas CSS pixels. */
  function mapPointer(clientX, clientY, rect, cssWidth, cssHeight) {
    return {
      x: (clientX - rect.left) * (cssWidth / rect.width),
      y: (clientY - rect.top) * (cssHeight / rect.height)
    };
  }

  function canvasSize(cssWidth, cssHeight, devicePixelRatio) {
    var requested = Number(devicePixelRatio);
    var dpr = requested > 0 ? Math.min(requested, CONFIG.dprCap) : 1;
    return { width: Math.round(cssWidth * dpr), height: Math.round(cssHeight * dpr), dpr: dpr };
  }

  function topologyLayout(width, height, heroRect, narrow) {
    var left = heroRect.left || 0, heroWidth = heroRect.width || width;
    var heroTop = heroRect.top || 0, heroHeight = heroRect.height || height;
    var x0 = narrow ? left : left + heroWidth * .43;
    var stageWidth = narrow ? heroWidth : heroWidth * .57;
    var centerY = heroTop + heroHeight * (narrow ? .82 : .52);
    var spread = heroHeight * (narrow ? .11 : .22);
    return [
      [x0 + stageWidth * .03, centerY],
      [x0 + stageWidth * .2, centerY - spread],
      [x0 + stageWidth * .2, centerY],
      [x0 + stageWidth * .2, centerY + spread],
      [x0 + stageWidth * .46, centerY],
      [x0 + stageWidth * .68, centerY],
      [x0 + stageWidth * .83, centerY],
      [x0 + stageWidth * .975, centerY]
    ];
  }

  function createState(mountedAt) {
    var wake = [];
    for (var i = 0; i < CONFIG.wakeSamples; i++) wake.push({ x: 0, y: 0, time: -Infinity, vx: 0, vy: 0 });
    return {
      mountedAt: mountedAt || 0, revealAt: null, real: false,
      seeded: false, x: 0, y: 0, vx: 0, vy: 0,
      sampleAt: 0, lastSampleAt: -Infinity, receivedAt: 0, eventTimestamp: 0,
      clientX: 0, clientY: 0, sequence: 0,
      wake: wake, wakeHead: 0, wakeCount: 0
    };
  }

  function pushWake(state, x, y, time, vx, vy) {
    var item = state.wake[state.wakeHead];
    item.x = x; item.y = y; item.time = time; item.vx = vx; item.vy = vy;
    state.wakeHead = (state.wakeHead + 1) % state.wake.length;
    state.wakeCount = Math.min(state.wakeCount + 1, state.wake.length);
  }

  function recordSample(state, sample) {
    var previousX = state.x, previousY = state.y, previousAt = state.sampleAt;
    var dx = sample.x - previousX, dy = sample.y - previousY;
    var dt = state.seeded ? Math.max(1, sample.time - previousAt) : 1;
    var vx = state.seeded ? clamp(dx / dt, -3, 3) : 0;
    var vy = state.seeded ? clamp(dy / dt, -3, 3) : 0;

    if (!state.real) {
      state.real = true;
      state.revealAt = Math.min(sample.time, state.mountedAt + CONFIG.idleDelayMs);
    }

    if (state.seeded) {
      var distance = Math.sqrt(dx * dx + dy * dy);
      var steps = Math.max(1, Math.ceil(distance / CONFIG.wakeSpacing));
      var firstStep = Math.max(1, steps - state.wake.length + 1);
      for (var step = firstStep; step <= steps; step++) {
        var unit = step / steps;
        pushWake(state, previousX + dx * unit, previousY + dy * unit,
          previousAt + (sample.time - previousAt) * unit, vx, vy);
      }
    } else pushWake(state, sample.x, sample.y, sample.time, 0, 0);

    state.x = sample.x; state.y = sample.y; state.vx = vx; state.vy = vy;
    state.sampleAt = sample.time; state.lastSampleAt = sample.time;
    state.receivedAt = sample.receivedAt == null ? sample.time : sample.receivedAt;
    state.eventTimestamp = sample.eventTimestamp == null ? sample.time : sample.eventTimestamp;
    state.clientX = sample.clientX == null ? sample.x : sample.clientX;
    state.clientY = sample.clientY == null ? sample.y : sample.clientY;
    state.seeded = true; state.sequence++;
    return state;
  }

  function resetContact(state) {
    state.seeded = false; state.vx = 0; state.vy = 0;
  }

  function clearWake(state) {
    resetContact(state);
    state.wakeHead = 0; state.wakeCount = 0; state.lastSampleAt = -Infinity;
  }

  function wakeDecay(age) {
    if (age < 0 || age >= CONFIG.wakeStopMs) return 0;
    var energy = Math.pow(.5, age / CONFIG.wakeHalfLifeMs);
    if (age > CONFIG.wakeFadeAtMs) {
      energy *= (CONFIG.wakeStopMs - age) / (CONFIG.wakeStopMs - CONFIG.wakeFadeAtMs);
    }
    return energy;
  }

  function wakeEnergy(state, now) {
    var energy = 0;
    for (var i = 0; i < state.wakeCount; i++) {
      energy = Math.max(energy, wakeDecay(now - state.wake[i].time));
    }
    return energy;
  }

  function createFrame() {
    return {
      reveal: 0, pressure: 0, wakeEnergy: 0, running: false,
      routeOpacity: CONFIG.latentRoute, nodeOpacity: CONFIG.latentNode,
      candidateOpacity: CONFIG.candidateOpacity,
      routeOpacities: new Array(TOPOLOGY.edges.length),
      nodeOpacities: new Array(TOPOLOGY.nodes.length)
    };
  }

  function fillFrame(frame, reveal, pressure, wake, running) {
    frame.reveal = reveal; frame.pressure = pressure; frame.wakeEnergy = wake; frame.running = running;
    frame.routeOpacity = CONFIG.latentRoute + (CONFIG.settledRoute - CONFIG.latentRoute) * reveal;
    frame.nodeOpacity = CONFIG.latentNode + (CONFIG.settledNode - CONFIG.latentNode) * reveal;
    frame.candidateOpacity = CONFIG.candidateOpacity;
    var i;
    for (i = 0; i < frame.routeOpacities.length; i++) frame.routeOpacities[i] = frame.routeOpacity;
    for (i = 0; i < frame.nodeOpacities.length - 1; i++) frame.nodeOpacities[i] = frame.nodeOpacity;
    frame.nodeOpacities[frame.nodeOpacities.length - 1] = frame.candidateOpacity;
    return frame;
  }

  function frameState(state, now, resolved, frame) {
    frame = frame || createFrame();
    if (resolved) return fillFrame(frame, 1, 0, 0, false);
    var revealStart = state.revealAt == null ? state.mountedAt + CONFIG.idleDelayMs : state.revealAt;
    var reveal = easeOut((now - revealStart) / CONFIG.resolveMs);
    var age = now - state.lastSampleAt;
    var pressure = state.seeded
      ? (age <= CONFIG.contactHoldMs ? 1 : Math.exp(-(age - CONFIG.contactHoldMs) / CONFIG.contactReleaseMs))
      : 0;
    var wake = wakeEnergy(state, now);
    return fillFrame(frame, reveal, pressure, wake, reveal < 1 || wake > 0);
  }

  function debugFrame(name, frame) {
    var reveal = { rest: 0, resolve: .72, verified: 1, release: .28 }[name];
    return reveal == null ? null : fillFrame(frame || createFrame(), reveal, 0, 0, false);
  }

  var API = {
    CONFIG: CONFIG, TOPOLOGY: TOPOLOGY,
    clamp: clamp, fade: fade, easeOut: easeOut, influence: influence,
    mapPointer: mapPointer, canvasSize: canvasSize, topologyLayout: topologyLayout,
    createState: createState, recordSample: recordSample, resetContact: resetContact,
    wakeDecay: wakeDecay, wakeEnergy: wakeEnergy,
    createFrame: createFrame, frameState: frameState, debugFrame: debugFrame
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof document === 'undefined') return;
  window.GrapheneField = API;

  function hash3(i, j, k) {
    var h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function noise3(x, y, z) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    var xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    var c000 = hash3(xi, yi, zi), c100 = hash3(xi + 1, yi, zi);
    var c010 = hash3(xi, yi + 1, zi), c110 = hash3(xi + 1, yi + 1, zi);
    var c001 = hash3(xi, yi, zi + 1), c101 = hash3(xi + 1, yi, zi + 1);
    var c011 = hash3(xi, yi + 1, zi + 1), c111 = hash3(xi + 1, yi + 1, zi + 1);
    var x00 = c000 + (c100 - c000) * xf, x10 = c010 + (c110 - c010) * xf;
    var x01 = c001 + (c101 - c001) * xf, x11 = c011 + (c111 - c011) * xf;
    var y0 = x00 + (x10 - x00) * yf, y1 = x01 + (x11 - x01) * yf;
    return y0 + (y1 - y0) * zf;
  }

  var EPS = .02, COS_R = Math.cos(.55), SIN_R = Math.sin(.55);
  function flow(x, y) { return noise3(x, y, .41) * .78 + noise3(x * 1.9, y * 1.9, .73) * .22; }
  function axisTurn(from, to) {
    var delta = (to - from) * 2;
    return Math.atan2(Math.sin(delta), Math.cos(delta)) / 2;
  }

  function closestOnSegment(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, length2 = dx * dx + dy * dy;
    var t = length2 ? clamp(((px - ax) * dx + (py - ay) * dy) / length2, 0, 1) : 0;
    var qx = ax + t * dx, qy = ay + t * dy, ox = px - qx, oy = py - qy;
    return { distance: Math.sqrt(ox * ox + oy * oy), angle: Math.atan2(dy, dx), t: t };
  }

  function cubic(a, b, c, d, t) {
    var u = 1 - t, u2 = u * u, t2 = t * t;
    return [u2 * u * a[0] + 3 * u2 * t * b[0] + 3 * u * t2 * c[0] + t2 * t * d[0],
      u2 * u * a[1] + 3 * u2 * t * b[1] + 3 * u * t2 * c[1] + t2 * t * d[1]];
  }

  function mount(canvas) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var hero = document.querySelector('.hero');
    if (!ctx || !hero) return;

    var css = getComputedStyle(document.documentElement);
    var bg = (css.getPropertyValue('--bg') || '#202020').trim();
    var idleInk = (css.getPropertyValue('--field-idle') || 'rgba(154,154,154,.25)').trim();
    var activeInk = (css.getPropertyValue('--field-active') || 'rgba(218,218,218,.1)').trim();
    var routeInk = (css.getPropertyValue('--field-route') || '#dedede').trim();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    var frozenName = canvas.dataset.frozen || '';
    if (frozenName && !debugFrame(frozenName)) frozenName = parseFloat(frozenName) > .5 ? 'verified' : 'rest';

    var state = createState(performance.now()), frame = createFrame();
    var W = 0, H = 0, dpr = 1, canvasRect = null, nodes = [], routes = [], points = [];
    var layoutDirty = true, raf = 0, drawing = false, pointerBound = false;
    var BUCKETS = 18, ambientBuckets = [], activeBuckets = [], routeBuckets = [];
    for (var bi = 0; bi < BUCKETS; bi++) {
      ambientBuckets.push([]); activeBuckets.push([]); routeBuckets.push([]);
    }

    var debugEnabled = false, diagnostics = null;
    try {
      var params = new URLSearchParams(window.location.search);
      debugEnabled = params.has('fieldDebug') || params.has('field-debug');
    } catch (ignore) {}
    if (debugEnabled) {
      diagnostics = {
        raw: null, canvasPoint: null, injection: null, contact: null,
        consumedSequence: 0, paintedSequence: 0, drawStart: 0, drawEnd: 0,
        responsePeak: null, rect: null, cssWidth: 0, cssHeight: 0,
        backingWidth: 0, backingHeight: 0, dpr: 1, reveal: 0,
        routeOpacities: new Array(TOPOLOGY.edges.length),
        nodeOpacities: new Array(TOPOLOGY.nodes.length),
        nodeAnchors: [], routeEndpoints: [], samples: []
      };
      window.GrapheneFieldDiagnostics = {
        read: function () {
          var snapshot = JSON.parse(JSON.stringify(diagnostics));
          snapshot.activeRafCount = raf || drawing ? 1 : 0;
          return snapshot;
        }
      };
    }

    function routeControls(edgeIndex, a, d, heroHeight, narrow) {
      var dx = d[0] - a[0];
      if (edgeIndex >= 3 && edgeIndex <= 5) {
        var bend = edgeIndex === 4 ? -heroHeight * (narrow ? .08 : .14) : 0;
        return [[a[0] + dx * .34, a[1] + bend], [a[0] + dx * .72, d[1] + bend]];
      }
      return [[a[0] + dx * .42, a[1]], [a[0] + dx * .68, d[1]]];
    }

    function buildRoutes(heroHeight, narrow) {
      routes = [];
      TOPOLOGY.edges.forEach(function (edge, edgeIndex) {
        var a = nodes[edge[0]], d = nodes[edge[1]];
        var controls = routeControls(edgeIndex, a, d, heroHeight, narrow);
        var samples = [], steps = 18;
        for (var s = 0; s <= steps; s++) samples.push(cubic(a, controls[0], controls[1], d, s / steps));
        routes.push({ from: edge[0], to: edge[1], samples: samples });
      });
    }

    function nearestRoute(x, y) {
      var best = { distance: Infinity, angle: 0, edge: -1, t: 0 };
      for (var edge = 0; edge < routes.length; edge++) {
        var samples = routes[edge].samples;
        for (var sample = 1; sample < samples.length; sample++) {
          var hit = closestOnSegment(x, y, samples[sample - 1][0], samples[sample - 1][1],
            samples[sample][0], samples[sample][1]);
          if (hit.distance < best.distance) {
            best.distance = hit.distance; best.angle = hit.angle; best.edge = edge;
            best.t = (sample - 1 + hit.t) / (samples.length - 1);
          }
        }
      }
      return best;
    }

    function layout() {
      layoutDirty = false;
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvasRect = canvas.getBoundingClientRect();
      if (!W || !H || !canvasRect.width || !canvasRect.height) return;
      var size = canvasSize(W, H, window.devicePixelRatio);
      dpr = size.dpr;
      if (canvas.width !== size.width) canvas.width = size.width;
      if (canvas.height !== size.height) canvas.height = size.height;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var rawHero = hero.getBoundingClientRect();
      var scaleX = W / canvasRect.width, scaleY = H / canvasRect.height;
      var heroRect = {
        left: (rawHero.left - canvasRect.left) * scaleX,
        top: (rawHero.top - canvasRect.top) * scaleY,
        width: rawHero.width * scaleX,
        height: rawHero.height * scaleY
      };
      var narrow = W < 720;
      nodes = topologyLayout(W, H, heroRect, narrow);
      buildRoutes(heroRect.height, narrow);

      var step = narrow ? 29 : 25, cap = narrow ? CONFIG.narrowCap : CONFIG.desktopCap;
      var estimate = Math.ceil(W / step) * Math.ceil(H / step);
      if (estimate > cap) step *= Math.sqrt(estimate / cap);
      points = [];
      var ox = (W % step + step) / 2, oy = (H % step + step) / 2;
      for (var y = oy; y < H; y += step) {
        for (var x = ox; x < W; x += step) {
          var route = nearestRoute(x, y);
          var weight = route.distance >= 31 ? 0 : 1 - fade(route.distance / 31);
          points.push({ x: x, y: y, w: weight, a: route.angle, edge: route.edge });
        }
      }

      if (diagnostics) {
        diagnostics.rect = { left: canvasRect.left, top: canvasRect.top,
          width: canvasRect.width, height: canvasRect.height };
        diagnostics.cssWidth = W; diagnostics.cssHeight = H;
        diagnostics.backingWidth = canvas.width; diagnostics.backingHeight = canvas.height;
        diagnostics.dpr = dpr; diagnostics.markSpacing = step;
        diagnostics.nodeAnchors = nodes.map(function (node) { return { x: node[0], y: node[1] }; });
        diagnostics.routeEndpoints = routes.map(function (route) {
          var first = route.samples[0], last = route.samples[route.samples.length - 1];
          return { from: { x: first[0], y: first[1] }, to: { x: last[0], y: last[1] } };
        });
      }
    }

    function drawBuckets(buckets, color, lineWidth) {
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth;
      for (var bucketIndex = 0; bucketIndex < buckets.length; bucketIndex++) {
        var lines = buckets[bucketIndex];
        if (!lines.length) continue;
        ctx.globalAlpha = (bucketIndex + .5) / buckets.length;
        ctx.beginPath();
        for (var line = 0; line < lines.length; line += 4) {
          ctx.moveTo(lines[line], lines[line + 1]);
          ctx.lineTo(lines[line + 2], lines[line + 3]);
        }
        ctx.stroke();
      }
    }

    function drawNode(nodeIndex, alpha) {
      if (alpha <= .01) return;
      var n = nodes[nodeIndex];
      if (!n || n[0] < -20 || n[0] > W + 20 || n[1] < -20 || n[1] > H + 20) return;
      ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = routeInk; ctx.fillStyle = routeInk; ctx.lineWidth = 1.4;
      if (nodeIndex === 0) {
        ctx.beginPath(); ctx.arc(n[0], n[1], 6, .35, TAU - .35); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(n[0] + 9, n[1]); ctx.lineTo(n[0] + 13, n[1]); ctx.stroke();
      } else if (nodeIndex >= 1 && nodeIndex <= 4) {
        ctx.beginPath(); ctx.arc(n[0], n[1], nodeIndex === 4 ? 6 : 5, 0, TAU); ctx.fill();
      } else if (nodeIndex === 5) {
        var left = n[0] - 7, top = n[1] - 7, right = n[0] + 7, bottom = n[1] + 7, radius = 3;
        ctx.beginPath(); ctx.moveTo(left + radius, top); ctx.lineTo(right - radius, top);
        ctx.quadraticCurveTo(right, top, right, top + radius); ctx.lineTo(right, bottom - radius);
        ctx.quadraticCurveTo(right, bottom, right - radius, bottom); ctx.lineTo(left + radius, bottom);
        ctx.quadraticCurveTo(left, bottom, left, bottom - radius); ctx.lineTo(left, top + radius);
        ctx.quadraticCurveTo(left, top, left + radius, top); ctx.fill();
      } else {
        var r = nodeIndex === 7 ? 7 : 8;
        ctx.beginPath(); ctx.moveTo(n[0], n[1] - r); ctx.lineTo(n[0] + r, n[1]);
        ctx.lineTo(n[0], n[1] + r); ctx.lineTo(n[0] - r, n[1]); ctx.closePath();
        if (nodeIndex === 7) {
          ctx.stroke(); ctx.globalAlpha *= .5; ctx.strokeRect(n[0] - 2, n[1] - 2, 4, 4);
        } else ctx.fill();
      }
      ctx.restore();
    }

    function drawArrowlets(currentFrame) {
      ctx.save(); ctx.strokeStyle = routeInk; ctx.lineWidth = 1;
      for (var edge = 0; edge < routes.length; edge++) {
        var samples = routes[edge].samples, at = Math.floor(samples.length * .78);
        var a = samples[at - 1], b = samples[at];
        if (b[0] < -10 || b[0] > W + 10 || b[1] < -10 || b[1] > H + 10) continue;
        var angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
        ctx.globalAlpha = currentFrame.routeOpacities[edge] * .58;
        ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(angle); ctx.beginPath();
        ctx.moveTo(-4, -2.5); ctx.lineTo(0, 0); ctx.lineTo(-4, 2.5); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }

    var lastDrawNow = 0;
    function paint(currentFrame) {
      ctx.fillStyle = bg; ctx.globalAlpha = 1; ctx.fillRect(0, 0, W, H); ctx.lineCap = 'round';
      for (var bucket = 0; bucket < BUCKETS; bucket++) {
        ambientBuckets[bucket].length = 0; activeBuckets[bucket].length = 0; routeBuckets[bucket].length = 0;
      }
      var scale = .00165, contactPeak = 0, peakX = null, peakY = null;
      var speed = Math.sqrt(state.vx * state.vx + state.vy * state.vy);

      for (var index = 0; index < points.length; index++) {
        var p = points[index], rx = p.x * COS_R - p.y * SIN_R, ry = p.x * SIN_R + p.y * COS_R;
        var nx = rx * scale, ny = ry * scale, n0 = flow(nx, ny);
        var gx = flow(nx + EPS, ny) - n0, gy = flow(nx, ny + EPS) - n0;
        var angle = Math.atan2(gx, -gy), mag = clamp(Math.sqrt(gx * gx + gy * gy) / EPS, 0, 1);
        var ambientAlpha = .22 + mag * .36, length = 9.5 + mag * 3;
        var best = 0, desiredAngle = angle, contactResponse = 0;

        if (currentFrame.pressure > 0) {
          var contactDx = p.x - state.x, contactDy = p.y - state.y;
          contactResponse = influence(Math.sqrt(contactDx * contactDx + contactDy * contactDy), CONFIG.radius) * currentFrame.pressure;
          if (contactResponse > contactPeak) { contactPeak = contactResponse; peakX = p.x; peakY = p.y; }
          if (contactResponse > best) {
            best = contactResponse;
            desiredAngle = speed > .02 ? Math.atan2(state.vy, state.vx) : Math.atan2(contactDy, contactDx) + Math.PI / 2;
          }
        }

        for (var wakeIndex = 0; wakeIndex < state.wakeCount; wakeIndex++) {
          var wake = state.wake[wakeIndex], energy = wakeDecay(lastDrawNow - wake.time);
          if (!energy) continue;
          var wakeDx = p.x - wake.x, wakeDy = p.y - wake.y;
          var wakeResponse = influence(Math.sqrt(wakeDx * wakeDx + wakeDy * wakeDy), CONFIG.wakeRadius) * energy;
          if (wakeResponse > best) {
            best = wakeResponse;
            desiredAngle = Math.abs(wake.vx) + Math.abs(wake.vy) > .02
              ? Math.atan2(wake.vy, wake.vx) : Math.atan2(wakeDy, wakeDx) + Math.PI / 2;
          }
        }

        if (best > 0) {
          angle += axisTurn(angle, desiredAngle) * best * .72;
          length += best * 5;
        }

        var routePull = p.w && p.edge >= 0 ? p.w * currentFrame.routeOpacities[p.edge] : 0;
        if (routePull > 0) {
          angle += axisTurn(angle, p.a) * routePull;
          length += (16 - length) * routePull;
        }

        var cx = Math.cos(angle) * length / 2, sy = Math.sin(angle) * length / 2;
        var ambientBucket = ambientBuckets[Math.min(BUCKETS - 1, (ambientAlpha * BUCKETS) | 0)];
        ambientBucket.push(p.x - cx, p.y - sy, p.x + cx, p.y + sy);
        if (best > .01) {
          var activeBucket = activeBuckets[Math.min(BUCKETS - 1, (best * BUCKETS) | 0)];
          activeBucket.push(p.x - cx, p.y - sy, p.x + cx, p.y + sy);
        }
        if (routePull > .01) {
          var routeBucket = routeBuckets[Math.min(BUCKETS - 1, (routePull * BUCKETS) | 0)];
          routeBucket.push(p.x - cx, p.y - sy, p.x + cx, p.y + sy);
        }
      }

      drawBuckets(ambientBuckets, idleInk, 1.05);
      drawBuckets(activeBuckets, activeInk, 1.15);
      drawBuckets(routeBuckets, routeInk, 1.15);
      ctx.globalAlpha = 1;
      drawArrowlets(currentFrame);
      for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
        drawNode(nodeIndex, currentFrame.nodeOpacities[nodeIndex]);
      }
      if (diagnostics) diagnostics.responsePeak = { x: peakX, y: peakY, strength: contactPeak };
    }

    function isStatic() { return !!frozenName || reduce.matches || !fine.matches; }

    function draw(now) {
      raf = 0; drawing = true; lastDrawNow = now;
      if (document.hidden) { drawing = false; return; }
      var drawStart = performance.now();
      if (layoutDirty) layout();
      if (!W || !H) { drawing = false; return; }

      var staticFrame = isStatic();
      var currentFrame = frozenName ? debugFrame(frozenName, frame) : frameState(state, now, staticFrame, frame);
      var consumedSequence = state.sequence;
      paint(currentFrame);
      var drawEnd = performance.now();

      if (diagnostics) {
        diagnostics.drawStart = drawStart; diagnostics.drawEnd = drawEnd;
        diagnostics.consumedSequence = consumedSequence; diagnostics.paintedSequence = consumedSequence;
        diagnostics.contact = { x: state.x, y: state.y };
        diagnostics.reveal = currentFrame.reveal;
        for (var edge = 0; edge < currentFrame.routeOpacities.length; edge++) {
          diagnostics.routeOpacities[edge] = currentFrame.routeOpacities[edge];
        }
        for (var node = 0; node < currentFrame.nodeOpacities.length; node++) {
          diagnostics.nodeOpacities[node] = currentFrame.nodeOpacities[node];
        }
        if (consumedSequence && (!diagnostics.samples.length ||
          diagnostics.samples[diagnostics.samples.length - 1].sequence !== consumedSequence)) {
          diagnostics.samples.push({ sequence: consumedSequence, receivedAt: state.receivedAt,
            paintedAt: drawEnd, latency: drawEnd - state.receivedAt });
          if (diagnostics.samples.length > 240) diagnostics.samples.shift();
        }
      }

      drawing = false;
      if (!staticFrame && currentFrame.running) start();
    }

    function start() {
      if (!raf && !document.hidden) raf = requestAnimationFrame(draw);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function normalEventTime(event, receivedAt) {
      return event.timeStamp > 0 && Math.abs(event.timeStamp - receivedAt) < 60000
        ? event.timeStamp : receivedAt;
    }

    function onPointerMove(event) {
      if (isStatic() || event.pointerType === 'touch') return;
      var receivedAt = performance.now();
      if (layoutDirty) layout();
      if (!canvasRect || !canvasRect.width || !canvasRect.height) return;
      var samples = event.getCoalescedEvents ? event.getCoalescedEvents() : null;
      if (!samples || !samples.length) samples = [event];
      var mapped = null, latest = event;
      for (var index = 0; index < samples.length; index++) {
        latest = samples[index];
        mapped = mapPointer(latest.clientX, latest.clientY, canvasRect, W, H);
        recordSample(state, { x: mapped.x, y: mapped.y,
          time: normalEventTime(latest, receivedAt), receivedAt: receivedAt,
          eventTimestamp: latest.timeStamp, clientX: latest.clientX, clientY: latest.clientY });
      }
      if (diagnostics) {
        diagnostics.raw = { clientX: latest.clientX, clientY: latest.clientY,
          eventTimestamp: latest.timeStamp, sequence: state.sequence };
        diagnostics.canvasPoint = { x: mapped.x, y: mapped.y };
        diagnostics.injection = { x: state.x, y: state.y };
      }
      start();
    }

    function onPointerReset() { resetContact(state); start(); }
    function onPointerOut(event) { if (!event.relatedTarget) onPointerReset(); }

    var passive = { passive: true };
    function bindPointer() {
      if (pointerBound || isStatic()) return;
      window.addEventListener('pointermove', onPointerMove, passive);
      window.addEventListener('pointercancel', onPointerReset, passive);
      window.addEventListener('pointerout', onPointerOut, passive);
      window.addEventListener('blur', onPointerReset);
      pointerBound = true;
    }

    function unbindPointer() {
      if (!pointerBound) return;
      window.removeEventListener('pointermove', onPointerMove, passive);
      window.removeEventListener('pointercancel', onPointerReset, passive);
      window.removeEventListener('pointerout', onPointerOut, passive);
      window.removeEventListener('blur', onPointerReset);
      pointerBound = false;
    }

    function invalidateLayout() { layoutDirty = true; start(); }
    function onPageHide() { unbindPointer(); clearWake(state); stop(); }
    function onPageShow() { bindPointer(); invalidateLayout(); }
    function onVisibilityChange() {
      if (document.hidden) { resetContact(state); stop(); }
      else { bindPointer(); invalidateLayout(); }
    }
    function onModeChange() {
      stop(); resetContact(state);
      if (isStatic()) { unbindPointer(); clearWake(state); }
      else bindPointer();
      invalidateLayout();
    }

    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('scroll', invalidateLayout, passive);
    window.addEventListener('resize', invalidateLayout, passive);
    window.addEventListener('orientationchange', invalidateLayout, passive);
    document.addEventListener('visibilitychange', onVisibilityChange);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', invalidateLayout, passive);
      window.visualViewport.addEventListener('scroll', invalidateLayout, passive);
    }
    if (reduce.addEventListener) reduce.addEventListener('change', onModeChange);
    if (fine.addEventListener) fine.addEventListener('change', onModeChange);

    bindPointer();
    start();
  }

  function mountAll() {
    var canvases = document.querySelectorAll('canvas[data-field]');
    for (var i = 0; i < canvases.length; i++) mount(canvases[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
}());
