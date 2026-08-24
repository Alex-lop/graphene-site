#!/usr/bin/env node
/* Checks the hero field's pointer-reveal arithmetic without a browser.
   Headless Chrome's virtual clock does not advance requestAnimationFrame, so the
   reveal can never be caught in a headless screenshot; this asserts the maths the
   draw loop runs instead. usage: node scripts/check_field_reveal.js */
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'field.js'), 'utf8');
const fade = eval('(' + src.match(/function fade\(t\)[^}]+}/)[0].replace('function fade', 'function') + ')');
const PR = Number(src.match(/PR = (\d+)/)[1]);

/* the reveal branch, transcribed from the draw loop */
function reveal(cycle, onRoute, pointerStrength, dist) {
  let g = cycle;
  if (pointerStrength > 0.002 && onRoute > 0 && dist * dist < PR * PR) {
    const local = (1 - fade(dist / PR)) * pointerStrength;
    if (local > g) g = local;
  }
  return g;
}

const cases = [
  ['no pointer, mid-drift',                    reveal(0, 1, 0, 10),  0],
  ['pointer on a route point',                 reveal(0, 1, 1, 0),   1],
  ['pointer 60px from a route point',          reveal(0, 1, 1, 60),  null],
  ['pointer just outside the radius',          reveal(0, 1, 1, 130), 0],
  ['point not on any route edge',              reveal(0, 0, 1, 0),   0],
  ['cycle already revealing beats the pointer', reveal(1, 1, 1, 60), 1],
];

let bad = 0;
for (const [name, got, want] of cases) {
  const ok = want === null ? (got > 0.05 && got < 0.95) : Math.abs(got - want) < 1e-9;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name} -> ${got.toFixed(3)}`);
}
console.log(bad ? `FAILED (${bad})` : `all pass, reveal radius ${PR}px`);
process.exit(bad ? 1 : 0);
