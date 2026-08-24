# SITE_REPORT — graphene-site

Working log and handoff for the Graphene marketing site. Written by the surface
agent; Alex publishes. Nothing here is pushed by the agent.

| | |
|---|---|
| `AUTHORITY_DIGEST` | `52f05703d1686fc1e3b3110d3eb3ed9065f899f41fea1ed027b0625a4180b00c` (SHA-256 of `local/GRAPHENE_SURFACE_DIRECTIVE.md`, gitignored, never committed) |
| Reference clone | `Alex-lop/Graphene` pinned at `b7b174a02a8eabaad6443348dce75cbed77a78ea` (`docs(report): final change-table rows and the ALL PASS on the handoff commit`, 2026-08-23 23:13:53 -0400), cloned read-only into `reference/`, gitignored |
| Writes to the main repo | **zero** — see "Non-interference" below |
| Model spend | **$0** — no model API was called for copy, images, or anything else |
| Stack | static; `index.html`, `assets/site.css`, `assets/field.js`, `assets/design-tokens.css`; no framework, no build, no package.json, no CDN, no third-party request |

## Non-interference

The contract agent's working checkout at `~/Desktop/AllThingsAgenticHackathon`
was read exactly once, to read the directive that was handed over in it, and
never again. The site is built in `~/graphene-site`, a separate tree and a
separate git repository. The reference clone was fetched from GitHub over SSH
(`git clone git@github.com:Alex-lop/Graphene.git`), not copied out of the
working checkout, so the other agent's tree, index, and locks were never
touched. No process the surface agent did not start was signalled, killed, or
waited on. `tmux` is not installed on this machine, so the "separate tmux
session" rail was met by the separate directory tree and separate repository
instead; recorded here rather than silently skipped.

One item for Alex: `GRAPHENE_SURFACE_DIRECTIVE.md` is currently sitting
untracked at the root of the *main* repo's working tree. It belongs in the site
repo (a copy is at `local/`, gitignored). Deleting it would have been a write to
the main repo, so it was left exactly where it was.

---

# Pass 1 — design plan

Written before the build, per the two-pass rail. The one exception is the hero
field, which was prototyped first because its parameters can only be judged by
looking at rendered frames; the tuning log is in "Field tuning" below.

## Token table

| Token | Value | Where it is allowed |
|---|---|---|
| `--bg` | `#121316` | page ground, canvas ground |
| `--bg-raised` | `#1a1c20` | terminal block, truth table stripes, video slot — opaque, never blurred |
| `--ink` | `#eae7de` | body and display text, field strokes, diagram strokes, focus ring |
| `--ink-muted` | `#8e9088` | captions, eyebrows, table labels, dimmer field strokes |
| `--hairline` | `rgba(234,231,222,.09)` | every border and rule on the page. The page's main structural device |
| `--accent` | `#e08a3c` | **three places only**: the digest motif in diagram (c), link/button hover, the terminal `verified` node |

Measured contrast (WCAG 2.1 relative luminance, computed not eyeballed):

| pair | on `--bg` `#121316` | on `--bg-raised` `#1a1c20` |
|---|---|---|
| `--ink` `#eae7de` | 15.02:1 | 13.80:1 |
| `--ink-muted` `#8e9088` | 5.75:1 | 5.28:1 |
| `--accent` `#e08a3c` | 6.96:1 | 6.39:1 |

Every pair clears AA for normal text (4.5:1) on both surfaces, so `--ink-muted`
is safe at caption size. Nothing on the page relies on a pair not in this table.

## Layout — wireframe

```
┌──────────────────────────────────────────────────────────────┐
│  Graphene                                    GitHub   Demo   │  hairline nav
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Draw the route. Sign the map.            ← h1, left, 4.2rem│
│   Watch your agents keep to it.                              │  70vh canvas
│   A goal becomes a DAG you can reshape…    ← 70ch lede       │  field behind,
│   [View on GitHub]  [Watch the demo]                         │  quiet at top
│                     ~ ~ o—o—o—o ~ ~                          │  DAG resolves
├──────────────────────────────────────────────────────────────┤  in lower third
│  WHY A CONTRACT   prose, one 70ch column, no cards           │
│  THE LOOP         (a) demo mission SVG, full-bleed           │
│                   (b) rate-limit mission SVG + contract table│
│                   (c) v1 → v2 edit SVG + the digest line     │
│  THE TERMINAL     one <pre>, real captured output            │
│  WHAT'S PROVEN    two-column table, not_proven rows included │
│  THE DEMO         16:9 video slot, poster, no autoplay       │
│  WHAT IT IS NOT   three sentences, plain links               │
├──────────────────────────────────────────────────────────────┤
│  hairline · hackathon line · GitHub · licence                │
└──────────────────────────────────────────────────────────────┘
```

## Signature element

One full-bleed canvas behind the hero: a fixed grid of short segments whose
angle is the level-set tangent of a slow 3D value-noise field, so the flow has
real vortices instead of a combed gradient. Brightness is 60% current strength,
40% a second slow noise channel. Every 30s the segments within 26px of a hidden
six-node mission DAG swing onto its edges, brighten, hold three seconds, and
release. Order emerging from flow, then letting go.

## Copy outline

Hero header verbatim from the directive → why a contract (uncoordinated fleets
fail in known ways; the answer is a contract, not more prompting) → the loop in
three diagrams → the terminal as it really looks → what's proven and what isn't,
including the `not_proven` rows → the demo → what Graphene is not → footer.

## Critique against the banned-defaults list

Ran the page outline against the ban list before building. Three things were
what a template would have produced, and were changed:

1. **A three-card "Scopes / Checks / Lineage" feature row** under the hero. That
   is the icon-grid skeleton the ban list exists to prevent. Replaced with §2 as
   running prose in the single text column — the argument is a paragraph, not
   three boxes.
2. **A centred hero.** Every generated landing page centres its hero. This one
   is left-aligned on the same 70ch axis as the body text, so the hero reads as
   the first paragraph of an essay rather than a billboard.
3. **A "Trusted by / metrics" strip.** There is nothing to put in it that would
   be true. It was replaced by the truth table, which is the opposite move: the
   page's most prominent block is the one listing what is *not* proven.

Two more, held to deliberately: the accent appears exactly three times, and only
one thing on the page animates at a time (the field pauses being the only
ambient motion; the SVG draw-in is a one-shot on scroll, not a loop).

---

# Pass 2 — what was built, and what was measured

## Field tuning log

The field was the only part built before the written plan, because its
parameters can only be judged from rendered frames. Four rounds, each judged
from a headless render at 1200×630:

1. **Plain noise angle** (`angle = valueNoise(x·s, y·s, t) · 2π`). Rendered as a
   near-uniform comb of parallel ticks. Broad, but no curl — the thing the
   reference actually has.
2. **Angle from the noise gradient** (the level-set tangent, so the field is
   divergence-free). Real vortices appeared immediately, and brightness could
   now come from gradient magnitude, which is literally "brighter where the
   current is strong". But two octaves plus a gradient operator amplified the
   high frequency into a fingerprint. Dropped to one octave.
3. **Lattice artefacts.** Value noise on an integer lattice puts its level sets
   on the axes, so the field combed into horizontal and vertical rows. Sampling
   coordinates are now rotated 0.55 rad before the lookup; the combing is gone.
   Spatial scale widened to `s = 0.0017`, which gives two to three swirl centres
   across a desktop viewport.
4. **The resolve was too quiet.** Aligned segments brightening to 0.95 against an
   ambient field of 0.30–0.80 is not enough contrast to read as structure. The
   fix is the honest one: while the graph holds, *everything not on an edge
   recedes* (`alpha *= 1 - 0.62·g·(1 - w)`). The flow resolves into the graph
   rather than the graph being painted over the flow.

Deliberate deviations from §4 of the directive, each because a render said so:

| §4 says | Built | Why |
|---|---|---|
| `angle = valueNoise(…)·2π` | angle is the level-set tangent of the same noise | the literal formula draws a comb, not a current; the tangent draws vortices |
| second noise channel drives alpha | 60% gradient magnitude, 40% a second noise channel | keeps the depth, and makes "brighter where the current is strong" true rather than decorative |
| recruit within ~28px | 26px, with the weight falling to exactly 0 at the boundary | the original falloff left a 0.15 halo, so the graph had a fuzzy edge instead of a dashed line |
| segment length 10–13px | 10–13px drifting, up to 16px when aligned | at 24px spacing a 13px dash leaves an 11px gap; 16px reads as a line |
| pointer influence (optional) | not built | one ambient motion at a time; a cursor effect is the kind of thing this page's ban list exists to prevent |

The DAG also moved down the canvas, to y 0.70–0.93, and the hero copy is now
top-aligned rather than centred, so the resolved graph lands under the buttons
instead of through the headline.

## Measurements

All taken on the final commit, against `python3 -m http.server` on localhost.

| | |
|---|---|
| Lighthouse desktop | **performance 100, accessibility 100, best practices 100, SEO 100** (Lighthouse 13.4.1) |
| Lighthouse mobile | **performance 99, accessibility 100, best practices 100, SEO 100** — FCP 1.1s, LCP 2.0s, TBT 0ms, CLS 0 |
| Page weight | **191 KB** total, **52 KB** excluding the video poster (`index.html` 34 KB, `poster.png` 142 KB, `field.js` 9 KB, `site.css` 8.7 KB, `design-tokens.css` 1.3 KB, `favicon.svg` 0.5 KB) |
| External requests | **none.** The six `data:` URIs in the network log are Chrome's own inline video-control icons, zero bytes, not a network fetch |
| Console | zero errors, zero warnings from the page |
| Frame rate | 100 fps measured over 2s in a real browser at 1440×900 (the display's rate, not a cap the field imposes) |
| The resolve, measured | a 32-second canvas pixel probe on the `assemble → verify` edge: the on-edge box rises 20.7 → 25.6 mean luminance while an off-edge box falls 19.9 → 18.4, then both return. The graph brightens, the flow recedes, it releases |
| Contrast | `--ink` 15.02:1, `--ink-muted` 5.75:1, `--accent` 6.96:1 on `--bg`; all clear AA |
| 380px | nothing overflows; `scrollWidth` equals the viewport |
| Reduced motion | one static frame with the DAG resolved and the accent node visible; the SVG draw-in is skipped |
| No JavaScript | the three mission graphs render complete. They are only hidden once a script has confirmed it can bring them back |

Two things about the tooling, recorded because they cost time and will cost it
again. Headless Chrome's `--virtual-time-budget` does not advance
`performance.now()` for `requestAnimationFrame`, so a headless screenshot can
only ever catch the field's first frame — the animation had to be verified in a
real browser and by pixel probe. And Chrome on macOS clamps a real window to
about 500 CSS px, so `--window-size=380` silently lays out at 485; narrow widths
are checked in an iframe instead (`scripts/viewports.html`).

## The remove-one-accessory pass

The hero repeated the wordmark: `Graphene` in the nav, then `Graphene` again
150px below it as a hero eyebrow, same weight, same size. Deleted the hero one.
The nav still carries the name, the headline gets the whole stage, and the page
now opens the way a research post does rather than the way a landing page does.

## Deviations from the directive, and why

- **The field**, five items, in the table above.
- **Three terminal blocks, not one.** §5.4 asks for one `<pre>` with three
  captions beneath it: design it, approve it, ask it why. Those are three
  different commands with three different real captures, and eliding between
  them inside one block would have meant inventing a join. Each block is a
  separate verbatim excerpt with its file and line range printed under it.
- **The spec length.** §7 asks for ≤ 2 pages each. `PLUGIN_DISPLAY_SPEC.md` is
  one page. `TERMINAL_DISPLAY_SPEC.md` is about two pages of prose plus roughly
  a hundred lines of fenced before/after mockups, which the same section
  requires. The prose was cut to fit; the mockups were kept.
- **A scrim on the OG image.** The page has no gradients beyond the hero
  vignette. `scripts/og.html`, which renders the two image assets only, paints a
  soft dark radial behind the lower-left so the wordmark stays legible over the
  field. It is in the image, not on the page.
- **The digest line in diagram (c)** is HTML under the SVG rather than SVG text.
  In the SVG it was clipped by the viewBox at the sixteenth hex group, and a
  truncated digest on this page of all pages would be the wrong error to ship.
  It is also selectable this way.
- **No tmux.** `tmux` is not installed on this machine. Isolation from the
  contract agent was met by a separate directory tree and a separate repository.

## Notes for the main repo

Recorded, not fixed. Nothing in `Alex-lop/Graphene` was modified.

1. **Six documents still label live Gemini as `NOT PROVEN` or `NOT RUN`.** They
   predate the 2026-08-23 live run and contradict `contracts/product_proof.json`
   (`delivery_gates.live_gemini` and `north_star` are both `verified_live`) and
   the root README's own proof table:
   `docs/README.md:12`, `docs/PRODUCT.md:23` and `:31`, `docs/AGENT_RUNTIME.md:7`
   (repeated at 23, 49, 68), `docs/DEVELOPMENT.md:62`, `docs/DEMO_GUIDE.md:43`,
   `simplreadme.md:12`. In each case the *other* items in the same list —
   Docker, Cloud Run, benchmark, video — are still accurate; only the
   live-Gemini item is stale.
2. **`plan_sha256` is bound at different events in the two stores.** In the
   Firestore path the `PLAN_APPROVED` payload carries `plan_sha256` directly
   (`orchestration/firestore.py:892-905`). In the SQLite path the operator
   approval payload carries `plan_revision` but not `plan_sha256`; the digest is
   bound earlier, at `PLAN_VALIDATED` (`orchestration/store.py:1186`), and only
   the fixture auto-approve draft embeds it in `PLAN_APPROVED`. Downstream
   enforcement re-derives and matches it either way
   (`orchestration/completion.py:379`), so the guarantee holds — but the two
   paths do not bind it at the same point, which is worth a line in the docs.
3. **The `NO_COLOR` / TTY check is dead code.** `cli/main.py:396` computes
   `no_color` and passes it to `render_human`, which discards it with
   `del no_color` (`cli/render.py:96`).
4. **`WORKFLOW_ERROR` discards its reason.** Seven distinct exception types
   collapse to the fixed string `"WORKFLOW_ERROR: operation rejected"`
   (`cli/main.py:1723`), so the operator never learns which one fired.
5. **Human mode silently drops nested values.** The generic fallback at
   `cli/main.py:1491` (duplicated at `cli/mission.py:5109`) flattens scalars into
   `GRAPHENE key=value` and omits every nested dict and list without saying so.
6. **`render_human` hard-caps at 80 columns** (`cli/render.py:97`) regardless of
   the real terminal width, so wide terminals get needless `~` truncation.
7. **`GRAPHENE_SURFACE_DIRECTIVE.md` is sitting untracked at the root of the
   main repo's working tree.** It belongs in this repo (a gitignored copy is at
   `local/`). Removing it would have been a write to the main repo, so it was
   left where it was — Alex should delete it there.
8. **One accidental write to the main repo, made and undone.** The Playwright MCP
   server writes its snapshots into the current working directory, which was the
   main repo, so verifying the field's animation created
   `.playwright-mcp/` with three files (two page snapshots and one console log)
   at 06:12–06:15. They were moved out to a scratch directory the moment it was
   noticed, the directory no longer exists, and `git status` in the main repo no
   longer shows it. No tracked file was touched at any point. Recorded here
   rather than quietly cleaned up.

---

# Handoff — Alex's checklist, in order

Nothing below was done by the agent. The agent committed locally and stopped.

**1. Create the repository and push.**

```sh
cd ~/graphene-site
git remote add origin git@github.com:Alex-lop/graphene-site.git
git push -u origin main
```

Create `Alex-lop/graphene-site` as **public** first (empty, no README — this repo
already has its own history). `local/` and `reference/` are gitignored and will
not go up; check `git status` is clean before pushing if you want to be sure.

**2. Turn on Pages.** Settings → Pages → Build and deployment → Deploy from a
branch → Branch `main`, folder `/ (root)` → Save. First build takes a minute or
two. The URL will be `https://alex-lop.github.io/graphene-site/`.

**3. Open it on a phone and on a laptop.** Specifically: the field should drift
and, about every thirty seconds, gather into a six-node graph with one amber dot
at its end and let go. Every asset path on the page is relative, so the subpath
URL works unchanged, as does a custom domain later.

**4. After the contract run lands, refresh the two data regions.**

```sh
cd ~/graphene-site
git -C reference fetch origin && git -C reference checkout origin/main   # or re-clone
python3 scripts/refresh.py                 # rewrites the terminal blocks + proof table
git diff                                   # read what changed before trusting it
git add -A && git commit -m "refresh the proof table and terminal capture at <new sha>"
```

`scripts/refresh.py` rewrites only the three marked regions of `index.html` and
re-vendors `assets/product_proof.snapshot.json`. If the new head has a better
`graphene plan` capture than the ones currently used, point `EXCERPTS` at the top
of that script at it — file, first line, last line, command, caption. **Read the
new block before committing it**; the excerpts are byte ranges, and line numbers
move.

There is a dated TODO here: at the pinned SHA there is no captured
human-readable `graphene plan` table — `plan show` writes canonical JSON, and the
closest real thing is the `Bounded plan, revision 1:` block that
`graphene demo --live` prints. That is what the page uses. **After the freeze
(from 2026-08-29), if a `graphene plan` human renderer has shipped, capture it
and swap it in.** Nothing else on the page depends on that block.

**5. After film day, drop the video in.**

```sh
cp ~/wherever/graphene-demo.mp4 ~/graphene-site/assets/demo.mp4
git add assets/demo.mp4 && git commit -m "the demo" && git push
```

One file. The `<video>` element already points at `assets/demo.mp4` and shows
`assets/poster.png` until it exists. Then edit the one caption line under it in
`scripts/refresh.py` (`DEMO`, the "Demo arriving 31 August 2026" sentence) and
re-run the script, or just edit `index.html` directly — it is the only sentence
that will be untrue once the film exists.

**6. If you want new field images** (after any change to `assets/field.js`):

```sh
python3 scripts/make_images.py     # rewrites assets/og.png and assets/poster.png
```

Needs Google Chrome and Pillow. Nothing else, and no network.

## Reference

- Pinned reference SHA: `b7b174a02a8eabaad6443348dce75cbed77a78ea`
- `AUTHORITY_DIGEST`: `52f05703d1686fc1e3b3110d3eb3ed9065f899f41fea1ed027b0625a4180b00c`
- Lighthouse: desktop 100/100/100/100, mobile 99/100/100/100
- Page weight: 191 KB total, 52 KB without the video poster
- Model spend this session: **$0**

## Things worth knowing before you edit

- `assets/design-tokens.css` is the only place a colour is defined. Both specs
  reference it. Change a token there and the page, the terminal spec and the
  plugin spec stay in agreement.
- The accent `#e08a3c` appears in exactly four places: the field's terminal node,
  the added node and its edge in diagram (c), the revision-2 digest, and link
  hover. If you find a fifth, one of them is wrong.
- `scripts/plan_digest.py` proves the digest claim on the page. It asserts that
  the recomputed digest equals the one Graphene recorded, so if the canonical
  JSON rule ever changes, that script fails loudly rather than the page going
  quietly wrong.
- The diagrams are hand-placed inline SVG in `index.html`. There is no build
  step; edit the coordinates directly.

## Nothing left running

The local preview server started for the screenshots was stopped. No background
process, no watcher, no cron. The reference clone is a plain read-only checkout
you can delete at any time; `scripts/refresh.py` takes a path to any checkout of
`Alex-lop/Graphene` as its first argument.
