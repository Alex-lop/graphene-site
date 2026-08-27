/* Graphene Governance Lens.
   A deterministic level-set-tangent current resolves into the approved
   Taskmaster route, illustrates bounded progress once, and stops. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var CONFIG = {
    dwellMs: 220, resolveMs: 320, waveMs: 1600, releaseHoldMs: 80,
    pointerTauMs: 85, strengthInMs: 140, strengthOutMs: 185,
    releaseMs: 185, releaseStopMs: 620, wakeMs: 500, radius: 168,
    idleDelayMs: 550, idleResolveMs: 400, idleWaveAtMs: 1450,
    idleReleaseAtMs: 3900, idleStopMs: 4450, desktopCap: 1600, narrowCap: 900
  };

  /* goal/candidate are boundary markers, not task nodes. Orange is progress only. */
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
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function progress(ms, start, duration) { return ease(clamp((ms - start) / duration, 0, 1)); }
  function expSmooth(value, target, dt, tau) { return target + (value - target) * Math.exp(-dt / tau); }
  function influence(distance, radius) { return distance >= radius ? 0 : 1 - fade(distance / radius); }
  function releaseValue(elapsed, from) {
    return from * Math.exp(-Math.max(0, elapsed - CONFIG.releaseHoldMs) / CONFIG.releaseMs);
  }
  function stagger(value, group) { return ease(clamp((value - group * .16) / (1 - group * .16), 0, 1)); }
  function routeResolve(edge, value) { return stagger(value, edge < 3 ? 1 : edge < 7 ? 2 : 3); }
  function nodeResolve(node, value) { return stagger(value, node <= 3 ? 0 : node === 4 ? 1 : node === 5 ? 2 : 3); }

  /* Map every hero coordinate into the visual stage; copy stays quiet, input never does. */
  function mapPointer(x, y, width, height, narrow) {
    if (narrow) {
      return { x: width * .05 + clamp(x / width, 0, 1) * width * .9,
        y: height * .64 + clamp(y / height, 0, 1) * height * .31 };
    }
    var left = width * .43;
    return { x: left + clamp(x / width, 0, 1) * (width - left), y: clamp(y, height * .12, height * .9) };
  }

  /* Progress never activates more than two roots at once. */
  function stageForWave(unit) {
    if (unit < 0 || unit >= 1) return -1;
    if (unit < .25) return 0;  /* redact_notes + render_json */
    if (unit < .43) return 1;  /* render_markdown */
    if (unit < .62) return 2;  /* wire_cli */
    if (unit < .82) return 3;  /* exact four-input assembly */
    return 4;                  /* verification, then stop */
  }

  function debugFrame(name) {
    return {
      rest: { resolve: 0, wave: -1, candidate: 0 },
      resolve: { resolve: .72, wave: -1, candidate: 0 },
      verified: { resolve: 1, wave: -1, candidate: 1 },
      release: { resolve: .28, wave: -1, candidate: .12 }
    }[name] || null;
  }

  function idleFrame(ms) {
    var resolve = progress(ms, CONFIG.idleDelayMs, CONFIG.idleResolveMs);
    var wave = clamp((ms - CONFIG.idleWaveAtMs) / CONFIG.waveMs, 0, 1);
    var settle = progress(ms, CONFIG.idleReleaseAtMs, CONFIG.idleStopMs - CONFIG.idleReleaseAtMs);
    return {
      resolve: resolve + (.42 - resolve) * settle,
      wave: ms >= CONFIG.idleWaveAtMs && wave < 1 ? stageForWave(wave) : -1,
      waveUnit: wave,
      candidate: progress(ms, CONFIG.idleWaveAtMs + CONFIG.waveMs, 360) * (1 - .66 * settle),
      running: ms < CONFIG.idleStopMs
    };
  }

  var API = {
    CONFIG: CONFIG, TOPOLOGY: TOPOLOGY, clamp: clamp, fade: fade,
    progress: progress, expSmooth: expSmooth, influence: influence, releaseValue: releaseValue,
    stagger: stagger, routeResolve: routeResolve, nodeResolve: nodeResolve,
    mapPointer: mapPointer, stageForWave: stageForWave,
    debugFrame: debugFrame, idleFrame: idleFrame
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
  function flow(x, y, z) { return noise3(x, y, z) * .78 + noise3(x * 1.9, y * 1.9, z * 1.5) * .22; }

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
    if (!ctx) return;
    var hero = canvas.closest('.hero');
    if (!hero) return;
    var css = getComputedStyle(document.documentElement);
    var ink = (css.getPropertyValue('--ink') || '#242622').trim();
    var accent = (css.getPropertyValue('--accent') || '#9a4f24').trim();
    var bg = (css.getPropertyValue('--bg') || '#f3eee4').trim();
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    var frozenName = canvas.dataset.frozen || '';
    if (frozenName && !debugFrame(frozenName)) frozenName = parseFloat(frozenName) > .5 ? 'verified' : 'rest';
    if (reduce.matches && !frozenName) frozenName = 'verified';

    var W = 0, H = 0, bounds = null, narrow = false, nodes = [], routes = [], points = [];
    var BUCKETS = 22, buckets = [], accentLines = [];
    for (var bi = 0; bi < BUCKETS; bi++) buckets.push([]);
    var raf = 0, onscreen = true, lastFrame = 0, activeMs = 0, scrollRaf = 0, resizeTimer = 0;
    var autonomousDone = false;
    var ptr = {
      x: 0, y: 0, tx: 0, ty: 0, vx: 0, vy: 0, rawVx: 0, rawVy: 0,
      strength: 0, wake: 0, inside: false, real: false,
      movedAt: 0, sampleAt: 0, sampleX: 0, sampleY: 0, sequence: 0
    };
    var motion = {
      mode: 'rest', seenSequence: 0, resolveAt: 0, waveAt: 0, verifiedAt: 0,
      releaseAt: 0, releaseFrom: 0, candidateFrom: 0, candidate: 0
    };

    function topologyLayout() {
      var x0 = narrow ? 0 : W * .43, sw = narrow ? W : W - x0;
      var centerY = narrow ? H * .82 : H * .52;
      var spread = narrow ? H * .11 : H * .22;
      nodes = [
        [x0 + sw * .03, centerY],
        [x0 + sw * .2, centerY - spread], [x0 + sw * .2, centerY], [x0 + sw * .2, centerY + spread],
        [x0 + sw * .46, centerY], [x0 + sw * .68, centerY], [x0 + sw * .83, centerY],
        [x0 + sw * .975, centerY]
      ];
    }

    function routeControls(edgeIndex, a, d) {
      var dx = d[0] - a[0];
      if (edgeIndex >= 3 && edgeIndex <= 5) {
        var bend = edgeIndex === 4 ? (narrow ? -H * .08 : -H * .14) : 0;
        return [[a[0] + dx * .34, a[1] + bend], [a[0] + dx * .72, d[1] + bend]];
      }
      return [[a[0] + dx * .42, a[1]], [a[0] + dx * .68, d[1]]];
    }

    function buildRoutes() {
      routes = [];
      TOPOLOGY.edges.forEach(function (edge, edgeIndex) {
        var a = nodes[edge[0]], d = nodes[edge[1]], controls = routeControls(edgeIndex, a, d);
        var samples = [], steps = 18;
        for (var s = 0; s <= steps; s++) samples.push(cubic(a, controls[0], controls[1], d, s / steps));
        routes.push({ from: edge[0], to: edge[1], samples: samples });
      });
    }

    function nearestRoute(x, y) {
      var best = { distance: Infinity, angle: 0, edge: -1, t: 0 };
      for (var e = 0; e < routes.length; e++) {
        var samples = routes[e].samples;
        for (var s = 1; s < samples.length; s++) {
          var hit = closestOnSegment(x, y, samples[s - 1][0], samples[s - 1][1], samples[s][0], samples[s][1]);
          if (hit.distance < best.distance) {
            best.distance = hit.distance; best.angle = hit.angle; best.edge = e;
            best.t = (s - 1 + hit.t) / (samples.length - 1);
          }
        }
      }
      return best;
    }

    function layout() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      bounds = hero.getBoundingClientRect();
      W = canvas.clientWidth; H = canvas.clientHeight; narrow = W < 720;
      if (!W || !H) return;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      topologyLayout(); buildRoutes();

      var step = narrow ? 29 : 25, cap = narrow ? CONFIG.narrowCap : CONFIG.desktopCap;
      var estimate = Math.ceil(W / step) * Math.ceil(H / step);
      if (estimate > cap) step *= Math.sqrt(estimate / cap);
      points = [];
      var ox = (W % step + step) / 2, oy = (H % step + step) / 2;
      for (var y = oy; y < H; y += step) {
        for (var x = ox; x < W; x += step) {
          var route = nearestRoute(x, y);
          var weight = route.distance >= 31 ? 0 : 1 - fade(route.distance / 31);
          var stageMask = narrow
            ? .1 + .9 * fade(clamp((y / H - .5) / .42, 0, 1))
            : .06 + .94 * fade(clamp((x / W - .28) / .36, 0, 1));
          points.push({ x: x, y: y, w: weight, a: route.angle, edge: route.edge, edgeT: route.t, q: stageMask });
        }
      }
    }

    function activeForNode(nodeIndex, waveStage) {
      return (waveStage === 0 && (nodeIndex === 1 || nodeIndex === 2)) ||
        (waveStage === 1 && nodeIndex === 3) || (waveStage === 2 && nodeIndex === 4) ||
        (waveStage === 3 && nodeIndex === 5) || (waveStage === 4 && nodeIndex === 6);
    }

    function activeForEdge(edgeIndex, waveStage) {
      return (waveStage === 2 && edgeIndex < 3) ||
        (waveStage === 3 && edgeIndex >= 3 && edgeIndex <= 6) ||
        (waveStage === 4 && edgeIndex === 7);
    }

    function drawNode(nodeIndex, resolve, candidateAlpha, waveStage) {
      if (nodeIndex === 7 && candidateAlpha <= .01) return;
      var n = nodes[nodeIndex], alpha = nodeIndex === 7 ? candidateAlpha : resolve;
      if (alpha <= .01) return;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.strokeStyle = activeForNode(nodeIndex, waveStage) ? accent : ink;
      ctx.fillStyle = activeForNode(nodeIndex, waveStage) ? accent : ink;
      ctx.lineWidth = 1.4;
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
        if (nodeIndex === 7) { ctx.stroke(); ctx.globalAlpha *= .5; ctx.strokeRect(n[0] - 2, n[1] - 2, 4, 4); }
        else ctx.fill();
      }
      ctx.restore();
    }

    function drawArrowlets(resolve) {
      if (resolve < .55) return;
      ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 1;
      for (var i = 0; i < routes.length; i++) {
        ctx.globalAlpha = routeResolve(i, resolve) * .58;
        var samples = routes[i].samples, at = Math.floor(samples.length * .78);
        var a = samples[at - 1], b = samples[at], angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
        ctx.save(); ctx.translate(b[0], b[1]); ctx.rotate(angle); ctx.beginPath();
        ctx.moveTo(-4, -2.5); ctx.lineTo(0, 0); ctx.lineTo(-4, 2.5); ctx.stroke(); ctx.restore();
      }
      ctx.restore();
    }

    function interactionFrame(now) {
      if (motion.seenSequence !== ptr.sequence) {
        motion.seenSequence = ptr.sequence;
        if (motion.mode === 'resolve' || motion.mode === 'wave' || motion.mode === 'verified') {
          motion.releaseFrom = motion.mode === 'resolve' ? progress(now, motion.resolveAt, CONFIG.resolveMs) : 1;
          motion.candidateFrom = motion.candidate;
          motion.releaseAt = now; motion.mode = 'release';
        } else if (motion.mode !== 'release' && ptr.inside) motion.mode = 'explore';
      }
      if (!ptr.inside && motion.mode !== 'rest' && motion.mode !== 'release') {
        motion.releaseFrom = motion.mode === 'resolve' ? progress(now, motion.resolveAt, CONFIG.resolveMs) :
          (motion.mode === 'explore' ? 0 : 1);
        motion.candidateFrom = motion.candidate;
        motion.releaseAt = now; motion.mode = 'release';
      }
      if ((motion.mode === 'rest' || motion.mode === 'explore') && ptr.inside && now - ptr.movedAt >= CONFIG.dwellMs) {
        motion.mode = 'resolve'; motion.resolveAt = now;
      }

      var frame = { resolve: 0, wave: -1, waveUnit: 0, candidate: 0,
        running: ptr.inside || motion.mode !== 'rest' };
      if (motion.mode === 'resolve') {
        frame.resolve = progress(now, motion.resolveAt, CONFIG.resolveMs);
        if (frame.resolve >= 1) { motion.mode = 'wave'; motion.waveAt = now; }
      } else if (motion.mode === 'wave') {
        frame.resolve = 1; frame.waveUnit = clamp((now - motion.waveAt) / CONFIG.waveMs, 0, 1);
        frame.wave = stageForWave(frame.waveUnit);
        if (frame.waveUnit >= 1) {
          motion.mode = 'verified'; motion.verifiedAt = now; frame.wave = -1; frame.candidate = 0;
        }
      } else if (motion.mode === 'verified') {
        frame.resolve = 1; frame.candidate = progress(now, motion.verifiedAt, 280);
        frame.running = frame.candidate < 1;
      } else if (motion.mode === 'release') {
        var releaseMs = Math.max(0, now - motion.releaseAt - CONFIG.releaseHoldMs);
        frame.resolve = releaseValue(now - motion.releaseAt, motion.releaseFrom);
        frame.candidate = releaseValue(now - motion.releaseAt, motion.candidateFrom);
        if (releaseMs >= CONFIG.releaseStopMs) { motion.mode = ptr.inside ? 'explore' : 'rest'; ptr.movedAt = now; frame.resolve = 0; frame.candidate = 0; }
      }
      motion.candidate = frame.candidate;
      return frame;
    }

    function paint(frame, z) {
      var dt = lastFrame ? Math.min(34, z.dt) : 16;
      var targetStrength = ptr.real && ptr.inside ? 1 : 0;
      ptr.strength = expSmooth(ptr.strength, targetStrength, dt,
        targetStrength > ptr.strength ? CONFIG.strengthInMs : CONFIG.strengthOutMs);
      ptr.x = expSmooth(ptr.x, ptr.tx, dt, CONFIG.pointerTauMs);
      ptr.y = expSmooth(ptr.y, ptr.ty, dt, CONFIG.pointerTauMs);
      ptr.vx = expSmooth(ptr.vx, ptr.rawVx, dt, 110);
      ptr.vy = expSmooth(ptr.vy, ptr.rawVy, dt, 110);
      ptr.rawVx = expSmooth(ptr.rawVx, 0, dt, CONFIG.wakeMs);
      ptr.rawVy = expSmooth(ptr.rawVy, 0, dt, CONFIG.wakeMs);
      ptr.wake = expSmooth(ptr.wake, 0, dt, CONFIG.wakeMs);

      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H); ctx.lineCap = 'round';
      for (var b = 0; b < BUCKETS; b++) buckets[b].length = 0;
      accentLines.length = 0;
      var scale = .00165, time = z.time * .000075;
      var velocityAngle = Math.atan2(ptr.vy, ptr.vx), speed = Math.sqrt(ptr.vx * ptr.vx + ptr.vy * ptr.vy);

      for (var i = 0; i < points.length; i++) {
        var p = points[i], rx = p.x * COS_R - p.y * SIN_R, ry = p.x * SIN_R + p.y * COS_R;
        var nx = rx * scale, ny = ry * scale, n0 = flow(nx, ny, time);
        var gx = flow(nx + EPS, ny, time) - n0, gy = flow(nx, ny + EPS, time) - n0;
        var angle = Math.atan2(gx, -gy), mag = clamp(Math.sqrt(gx * gx + gy * gy) / EPS, 0, 1);
        var alpha = (.075 + mag * .22) * p.q, length = 9.5 + mag * 3;
        var dx = p.x - ptr.x, dy = p.y - ptr.y, near = influence(Math.sqrt(dx * dx + dy * dy), CONFIG.radius) * ptr.strength;
        if (near > 0) {
          var attentionAngle = speed > .02 ? velocityAngle : Math.atan2(dy, dx) + Math.PI / 2;
          var turn = ((attentionAngle - angle + Math.PI * 1.5) % Math.PI) - Math.PI / 2;
          angle += turn * near * (.3 + ptr.wake * .22);
          alpha += near * .18; length += near * (3 + ptr.wake * 2);
        }

        var latent = p.w * .11, pull = p.w * routeResolve(p.edge, frame.resolve);
        alpha *= 1 - .54 * frame.resolve * (1 - p.w);
        if (latent + pull > 0) {
          var routePull = clamp(latent + pull, 0, 1);
          var routeTurn = ((p.a - angle + Math.PI * 1.5) % Math.PI) - Math.PI / 2;
          angle += routeTurn * routePull;
          alpha += (.69 - alpha) * pull;
          length += (16 - length) * pull;
        }
        var cx = Math.cos(angle) * length / 2, sy = Math.sin(angle) * length / 2;
        var bucket = buckets[Math.min(BUCKETS - 1, Math.max(0, (alpha * BUCKETS) | 0))];
        bucket.push(p.x - cx, p.y - sy, p.x + cx, p.y + sy);
        if (pull > .45 && activeForEdge(p.edge, frame.wave)) {
          accentLines.push(p.x - cx, p.y - sy, p.x + cx, p.y + sy);
        }
      }

      ctx.strokeStyle = ink; ctx.lineWidth = 1.1;
      for (var bucketIndex = 0; bucketIndex < BUCKETS; bucketIndex++) {
        var lines = buckets[bucketIndex];
        if (!lines.length) continue;
        ctx.globalAlpha = (bucketIndex + .5) / BUCKETS; ctx.beginPath();
        for (var k = 0; k < lines.length; k += 4) { ctx.moveTo(lines[k], lines[k + 1]); ctx.lineTo(lines[k + 2], lines[k + 3]); }
        ctx.stroke();
      }
      if (accentLines.length) {
        ctx.strokeStyle = accent; ctx.globalAlpha = .9; ctx.lineWidth = 1.35; ctx.beginPath();
        for (var a = 0; a < accentLines.length; a += 4) {
          ctx.moveTo(accentLines[a], accentLines[a + 1]); ctx.lineTo(accentLines[a + 2], accentLines[a + 3]);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      drawArrowlets(frame.resolve);
      for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex++) {
        drawNode(nodeIndex, nodeResolve(nodeIndex, frame.resolve), frame.candidate, frame.wave);
      }
    }

    function draw(now) {
      raf = 0;
      if (!onscreen || document.hidden || !W || !H) return;
      var dt = lastFrame ? Math.min(34, now - lastFrame) : 16;
      lastFrame = now; activeMs += dt;
      var frame;
      if (frozenName) frame = debugFrame(frozenName);
      else if (!ptr.real && !autonomousDone) {
        frame = idleFrame(activeMs);
        if (!frame.running) autonomousDone = true;
      } else frame = interactionFrame(now);
      paint(frame, { dt: dt, time: frozenName ? 2400 : activeMs });
      if (!frozenName && !autonomousDone && !ptr.real) start();
      else if (!frozenName && frame.running) start();
    }

    function start() {
      if (!raf && onscreen && !document.hidden && !frozenName) raf = requestAnimationFrame(draw);
    }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function paintOnce() { lastFrame = 0; if (frozenName) draw(performance.now()); else { start(); } }

    function recordPointer(event) {
      if (!fine.matches || reduce.matches || event.pointerType === 'touch' || !bounds) return;
      var now = performance.now(), x = clamp(event.clientX - bounds.left, 0, W), y = clamp(event.clientY - bounds.top, 0, H);
      var mapped = mapPointer(x, y, W, H, narrow), sampleDt = Math.max(8, now - ptr.sampleAt);
      ptr.rawVx = clamp((mapped.x - ptr.sampleX) / sampleDt, -1.8, 1.8);
      ptr.rawVy = clamp((mapped.y - ptr.sampleY) / sampleDt, -1.8, 1.8);
      ptr.wake = clamp(Math.sqrt(ptr.rawVx * ptr.rawVx + ptr.rawVy * ptr.rawVy) / .8, 0, 1);
      ptr.tx = mapped.x; ptr.ty = mapped.y; ptr.sampleX = mapped.x; ptr.sampleY = mapped.y; ptr.sampleAt = now;
      ptr.movedAt = now; ptr.inside = true; ptr.real = true; ptr.sequence++;
      autonomousDone = true;
      if (!ptr.strength) { ptr.x = mapped.x; ptr.y = mapped.y; }
      start();
    }

    function clearPointer() {
      ptr.inside = false; ptr.sequence++; ptr.rawVx = 0; ptr.rawVy = 0; start();
    }

    hero.addEventListener('pointerenter', recordPointer, { passive: true });
    hero.addEventListener('pointermove', recordPointer, { passive: true });
    hero.addEventListener('pointerleave', clearPointer, { passive: true });
    hero.addEventListener('pointercancel', clearPointer, { passive: true });
    window.addEventListener('blur', clearPointer);
    window.addEventListener('pagehide', function () { clearPointer(); stop(); });
    window.addEventListener('pageshow', function () { lastFrame = 0; layout(); paintOnce(); });
    window.addEventListener('scroll', function () {
      clearPointer();
      if (!scrollRaf) scrollRaf = requestAnimationFrame(function () { scrollRaf = 0; bounds = hero.getBoundingClientRect(); });
    }, { passive: true });
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { layout(); lastFrame = 0; paintOnce(); }, 100);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { clearPointer(); stop(); }
      else { lastFrame = 0; paintOnce(); }
    });
    if (reduce.addEventListener) reduce.addEventListener('change', function () {
      frozenName = reduce.matches ? 'verified' : '';
      stop(); layout(); lastFrame = 0;
      if (frozenName) draw(performance.now()); else start();
    });
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (entries) {
        onscreen = entries[0].isIntersecting;
        if (onscreen) { lastFrame = 0; paintOnce(); } else stop();
      }, { threshold: 0 }).observe(hero);
    }

    layout();
    if (frozenName) draw(performance.now()); else start();
  }

  function mountAll() {
    var canvases = document.querySelectorAll('canvas[data-field]');
    for (var i = 0; i < canvases.length; i++) mount(canvases[i]);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAll);
  else mountAll();
}());
