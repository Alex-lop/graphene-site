/* Graphene hero field.
   A grid of short segments oriented by a slow value-noise flow. Every cycle the
   segments near a hidden mission DAG swing onto its edges, hold, and release.
   No dependencies. Reads --ink and --accent from the page. */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* ---- value noise (3D: x, y, time) ---------------------------------- */

  function hash3(i, j, k) {
    var h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(k, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }

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

  /* Two octaves: broad current, faint curl on top. */
  var EPS = 0.02;
  var COS_R = Math.cos(0.55), SIN_R = Math.sin(0.55);

  function flow(x, y, z) { return noise3(x, y, z) * 0.74 + noise3(x * 2.1, y * 2.1, z * 1.7) * 0.26; }

  /* ---- the hidden mission DAG, in normalised hero coordinates --------- */

  var NODES = [
    [0.10, 0.775], [0.28, 0.715], [0.47, 0.615],
    [0.47, 0.845], [0.66, 0.715], [0.86, 0.715]
  ];
  var EDGES = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 4], [4, 5]];
  var VERIFIED = 5;               /* the one node that gets the accent */
  var PULL = 26;                  /* px: how close a segment must be to be recruited */

  function distToSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
    var qx = ax + t * dx - px, qy = ay + t * dy - py;
    return Math.sqrt(qx * qx + qy * qy);
  }

  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function mount(canvas) {
    var ctx = canvas.getContext('2d', { alpha: false });
    var css = getComputedStyle(document.documentElement);
    var ink = (css.getPropertyValue('--ink') || '#eae7de').trim();
    var accent = (css.getPropertyValue('--accent') || '#e08a3c').trim();
    var bg = (css.getPropertyValue('--bg') || '#121316').trim();
    var frozen = canvas.dataset.frozen ? parseFloat(canvas.dataset.frozen) : null;
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (still && frozen === null) frozen = 1;   /* motionless users still get the thesis */

    var W = 0, H = 0, pts = [], nodes = [], edges = [], step = 24;
    var t0 = performance.now(), raf = 0, hid = 0;
    var seed = { x: 0, y: 0, fx: 0, fy: 0, at: 0, dur: 3000, next: 0 };
    var BUCKETS = 24, bucket = [];
    for (var b0 = 0; b0 < BUCKETS; b0++) bucket.push([]);

    function layout() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      step = W < 720 ? 28 : 24;
      nodes = NODES.map(function (n) { return [n[0] * W, n[1] * H]; });
      edges = EDGES.map(function (e) { return [nodes[e[0]], nodes[e[1]]] });

      pts = [];
      var ox = ((W % step) + step) / 2, oy = ((H % step) + step) / 2;
      for (var y = oy; y < H; y += step) {
        for (var x = ox; x < W; x += step) {
          var best = PULL + 1, bang = 0;
          for (var i = 0; i < edges.length; i++) {
            var a = edges[i][0], b = edges[i][1];
            var d = distToSeg(x, y, a[0], a[1], b[0], b[1]);
            if (d < best) { best = d; bang = Math.atan2(b[1] - a[1], b[0] - a[0]); }
          }
          /* smooth falloff so the graph has no hard edge */
          var w = best > PULL ? 0 : 1 - fade(best / PULL);
          var q = 0.34 + 0.66 * fade(Math.max(0, Math.min(1, (y / H - 0.06) / 0.5)));
          pts.push({ x: x, y: y, w: w, a: bang, q: q });
        }
      }
    }

    /* one full cycle: drift, align 1.5s, hold 3s, release 2s */
    function dagPhase(ms) {
      if (frozen !== null) return frozen;
      var first = 2000, period = 30000, at = ms - first;
      if (at < 0) return 0;
      var p = at % period;
      if (p < 1500) return ease(p / 1500);
      if (p < 4500) return 1;
      if (p < 6500) return 1 - ease((p - 4500) / 2000);
      return 0;
    }

    function draw(now) {
      var ms = frozen !== null ? 0 : now - t0;
      var z = ms * 0.0001;                      /* ~10s per full reconfiguration */

      if (frozen === null) {
        if (!seed.next) seed.next = 26000;
        if (ms > seed.next && !seed.at) {
          seed.at = ms;
          seed.fx = seed.x + (Math.random() * 2 - 1) * 3;
          seed.fy = seed.y + (Math.random() * 2 - 1) * 3;
        }
        if (seed.at) {
          var k = Math.min(1, (ms - seed.at) / seed.dur), e = ease(k);
          var sx = seed.x + (seed.fx - seed.x) * e, sy = seed.y + (seed.fy - seed.y) * e;
          if (k === 1) { seed.x = seed.fx; seed.y = seed.fy; seed.at = 0; seed.next = ms + 25000 + Math.random() * 15000; }
          seed.cx = sx; seed.cy = sy;
        } else { seed.cx = seed.x; seed.cy = seed.y; }
      } else { seed.cx = 0; seed.cy = 0; }

      var g = dagPhase(ms);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.strokeStyle = ink;

      var s = 0.0017;
      for (var b = 0; b < BUCKETS; b++) bucket[b].length = 0;

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var rx = p.x * COS_R - p.y * SIN_R, ry = p.x * SIN_R + p.y * COS_R;
        var nx = rx * s + seed.cx, ny = ry * s + seed.cy;
        var n0 = flow(nx, ny, z);
        var gx = flow(nx + EPS, ny, z) - n0, gy = flow(nx, ny + EPS, z) - n0;
        var ang = Math.atan2(gx, -gy);
        var mag = Math.sqrt(gx * gx + gy * gy) / EPS;
        var m = mag * 1.15; if (m > 1) m = 1;
        m = m * 0.6 + noise3(nx * 0.7 + 31.4, ny * 0.7 + 17.7, z * 0.6) * 0.4;
        var alpha = (0.28 + m * 0.47) * p.q;
        var len = 10 + m * 3;

        var pull = p.w * g;
        if (pull > 0) {
          /* segments are undirected: turn the short way, mod pi */
          var d = ((p.a - ang) % Math.PI + Math.PI * 1.5) % Math.PI - Math.PI / 2;
          ang += d * pull;
          alpha += (0.95 - alpha) * pull;
          len += (16 - len) * pull;
        }

        var c = Math.cos(ang) * len / 2, sn = Math.sin(ang) * len / 2;
        var q = bucket[(alpha * BUCKETS) | 0] || bucket[BUCKETS - 1];
        q.push(p.x - c, p.y - sn, p.x + c, p.y + sn);
      }

      ctx.lineWidth = 1.15;
      for (var b = 0; b < BUCKETS; b++) {
        var q = bucket[b];
        if (!q.length) continue;
        ctx.globalAlpha = (b + 0.5) / BUCKETS;
        ctx.beginPath();
        for (var k = 0; k < q.length; k += 4) { ctx.moveTo(q[k], q[k + 1]); ctx.lineTo(q[k + 2], q[k + 3]); }
        ctx.stroke();
      }

      if (g > 0.01) {
        for (var n = 0; n < nodes.length; n++) {
          ctx.globalAlpha = g;
          ctx.fillStyle = n === VERIFIED ? accent : ink;
          ctx.beginPath();
          ctx.arc(nodes[n][0], nodes[n][1], 3, 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      if (frozen === null) raf = requestAnimationFrame(draw);
    }

    function start() { if (!raf && frozen === null) { raf = requestAnimationFrame(draw); } }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    var rt = 0;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () { layout(); if (frozen !== null) draw(0); }, 150);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { hid = performance.now(); stop(); }
      else { if (hid) { t0 += performance.now() - hid; hid = 0; } start(); }
    });

    layout();
    if (frozen !== null) draw(0); else start();
  }

  window.GrapheneField = { mount: mount };
  document.addEventListener('DOMContentLoaded', function () {
    var c = document.querySelectorAll('canvas[data-field]');
    for (var i = 0; i < c.length; i++) mount(c[i]);
  });
}());
