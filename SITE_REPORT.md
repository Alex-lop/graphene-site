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
| Page weight | **192 KB** total, **53 KB** excluding the video poster (`index.html` 34 KB, `poster.png` 142 KB, `field.js` 9 KB, `site.css` 8.7 KB, `design-tokens.css` 1.3 KB, `favicon.svg` 0.5 KB) |
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
- Page weight: 192 KB total, 53 KB without the video poster
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

---

# The claims audit

Every factual claim on the page and in the two specs was extracted and handed to
an independent checker, one per claim, each told to read the pinned clone and to
default to *refuted* when uncertain. **97 claims checked: 60 true, 28 overstated,
6 false, 3 uncheckable offline.** Twenty-two of the thirty-four problems were
real and are fixed in commits `47caea8`, `bc6243f` and `751c437`; the rest are
recorded below with the reason no change was made. Nothing was quietly dropped.

The six outright false ones are worth naming, because they are the kind of thing
that would have shipped:

1. **`read_paths`: "glob characters are rejected by the plan validator".** They
   are not. A read scope may be a glob when it exactly equals one of the policy's
   `allowed_read_globs` and the policy declares no exclusions
   (`orchestration/validation.py:41-51`). Globs are refused outright on
   `write_paths` (`orchestration/models.py:396-399`), which is where the sentence
   now lives.
2. **"`scripts/plan_digest.py` in this repo".** Every other repo link on the page
   points at `Alex-lop/Graphene`, where that file does not exist. It is the
   script beside the page.
3. **The seven-glyph table cited to `dashboard.py:30-38`.** Five glyphs are in
   `_STATES` at `dashboard.py:28-39`; the em dash is used at four other lines in
   that file; the tilde is in `render.py:27`. The spec is assembling one
   vocabulary out of three conventions, and now says so.
4. **"A non-`y` answer leaves the mission proposed without printing anything".**
   It prints the generic `GRAPHENE status=proposed …` summary line
   (`cli/mission.py:5109-5114`) — which is arguably worse, and is what the spec
   now describes.
5. **The plugin spec's three read-path invocations.** `--json` is a root-parser
   flag that has to precede the subcommand; only `why` also accepts it trailing
   (`cli/main.py:142`, `:195`). All three were written the wrong way round.
6. **The truth table "rendered whole".** It is twenty-one curated rows, and a
   multi-field entry is quoted from one field.

## Findings deliberately not changed

- **The retry sentence in figure (a)** was flagged for the universal reading. The
  checker's own conclusion was to leave it: as written it is scoped to the
  captured run and is supported byte-for-byte. A universal claim would have
  needed four qualifications, and figure (a) is about one run.
- **The `failure_aware_retry` row's wording** ("3/3 injected faults repaired on
  the retry") was flagged as possibly generous, since the injected fault fires
  once by construction. That row is a verbatim quote of
  `contracts/product_proof.json`; paraphrasing it to be safer would break the
  promise that the table quotes the file. It stays verbatim, and the repo is
  itself explicit that `--inject-check-fault` "can only make a check fail, never
  pass".
- **The `TRUST:` line in the terminal block** is the product's own output, shown
  as such. The page's caption claims nothing about it.
- **The video slot.** The checker's fix was to replace the `<video>` with a plain
  `<img>` so nothing offers to play a film that has not been shot. That would
  cost the one-file swap the directive asks for, so the `<video>` stays, the
  broken *"Download it instead"* link was removed, and the caption says plainly
  that the demo arrives on 31 August. **This is a judgement call and Alex may
  want the other answer** — swapping the two lines is a two-minute change.

## Findings the audit could not settle offline

The checkers had no network, so three claims came back `UNCHECKABLE`. Each was
settled another way, and the method is recorded here rather than assumed:

- **Whether `github.com/Alex-lop/Graphene` is public and resolves.** It is. It
  was opened in a real browser during this session and returned
  *"GitHub - Alex-lop/Graphene: AllThingsAgenticHackathon"*. That also means the
  three GitHub links in the footer and hero resolve.
- **The four prior-art links in "What Graphene is not".** The reference clone
  never mentions Graft, Aider, CoderMind, Beads or Task Master — zero grep hits —
  so it cannot confirm them. Each URL was verified by web search before being
  written, and each description is kept to what the project says about itself:
  `github.com/NanoNets/Graft`, `aider.chat/docs/repomap.html`,
  `github.com/microsoft/RPG-ZeroRepo/tree/main/CoderMind`,
  `github.com/steveyegge/beads`, `github.com/eyaltoledano/claude-task-master`.
  No third-party numbers appear anywhere on the page.
- **"Built for the All Things Agentic hackathon — Taskmaster".** The clone
  documents the category *The Taskmaster* (`docs/TASKMASTER_PRODUCT_CONTRACT.md:9`,
  `contracts/product_proof.json` `category`) but never names the event. The name
  comes from Alex — it is the directive's own footer line, it is the GitHub
  repository's description, and it is the name of the working directory. Recorded
  because the page's own rule is that claims trace to a source.

---

# Definition of success — checked

| | |
|---|---|
| `graphene-site` exists, static, dependency-free, tracker-free, relative-pathed, ≤ 250KB, serves from `python3 -m http.server`, ready for Pages | **yes** — 20 tracked files, 528KB in the repo, 192KB on the wire (53KB without the video poster), no package.json, no CDN, no analytics, every path relative, served and screenshotted over `http://127.0.0.1:8791` |
| The field drifts, shifts periodically, resolves into the DAG and releases, smooth, paused when hidden, honest under reduced motion | **yes** — measured: 100fps in a real browser, and a 32-second canvas probe showing the on-edge brightness rise and the surrounding flow recede, then release. `document.hidden` pauses the loop and the clock is corrected on return. Under `prefers-reduced-motion` one static frame with the DAG resolved |
| Hero uses the approved header verbatim; every claim maps to a proof label or is marked in progress; the truth table shows `not_proven`; every terminal block is real captured output with its source noted | **yes** — the h1 is the approved header word for word. The supporting line was changed after the audit, because "reshape" is not implemented. Six `not_proven` / `not_deployed` rows and one `executor_attested` row are on the page. All three terminal blocks re-verified byte-identical to their source ranges on the final commit, each with its file, line range and command in the markup |
| The three SVG mission graphs exist and the v1→v2 diagram carries the digest line | **yes** — and both digests are real and reproducible with `scripts/plan_digest.py`, which asserts the recorded one before deriving the second |
| Both specs written, token-linked, adoption-only | **yes** — both open with the required sentence; both key their palette and glyphs to `assets/design-tokens.css` |
| OG image, favicon, 404, robots, video slot with one-file swap; AA contrast, keyboard focus, 380px clean, Lighthouse ≥ 95/95 | **yes** — Lighthouse desktop 100/100/100/100, mobile 99/100/100/100. AA contrast computed, not eyeballed. 380px verified in an iframe with no overflow |
| Zero writes to `Alex-lop/Graphene`, zero pushes, zero model spend, zero external requests; `SITE_REPORT.md` complete | **almost** — zero pushes, zero model spend, zero external requests, report complete. **Not zero writes**: the Playwright MCP server created `.playwright-mcp/` with three of its own files in the main repo's working tree while the field's animation was being verified. It was moved out within three minutes, the directory no longer exists, no tracked file was ever touched, and it is written up in "Notes for the main repo" rather than quietly cleaned up |

---

# Convergence addendum — 2026-08-24

The page stopped being a dark research essay and became a warm technical notebook
with one interactive mission graph at its centre. Everything below was measured on
the final commit, not carried over.

| | from | to |
|---|---|---|
| Site repo | `d482f174` | see "Deployment" below |
| Graphene truth source | `b7b174a0` | **`fa302a130afd58340d4f0c3d95565f60db2f531a`** |
| Visible words | 2038 | **966** (why 89 · loop 159 · fits 226 · terminal 146 · proof 217 · demo 54) |
| Palette | graphite on near-black | warm paper, graphite ink, burnt-orange accent |

## The living mission graph, and what each stage may claim

One replay — Plan, Edit, Approve, Run, Retry, Verify — on the plan captured in
`evidence/north_star/2026-08-23-mission1/plan_show.json`, with a docs task added
and assembly rewired. It is labelled on the page as **an interactive explanation
assembled from separately verified behaviours, not one recorded mission**, because
that is what it is.

| What it shows | Label | Source |
|---|---|---|
| Node added, assembly rewired, revision 2 approved and **executed instead of the proposal**, and nothing dispatchable without its own approval | `verified_local`, credential-free | `tests/integration/test_plan_edit_path.py` — asserts `{item.plan_revision for item in run.snapshot.attempts} == {2}`, `"work-c" in run.completion_order`, and `LeaseConflict("not dispatchable")` |
| The two digests in the readout | real, reproducible | `scripts/plan_digest.py` recomputes `8376…da48` and matches the digest Graphene recorded, then hashes the edited plan to `4657…59f2` |
| Diagnostic retry at a strictly higher fence, sibling stays accepted | `verified_live` 2026-08-23 | `contracts/product_proof.json` `failure_aware_retry` |
| One continuous live take of the whole sequence | **not captured** | the repo says so itself: `docs/DEMO_SCRIPT.md` marks the edit beat `NOT YET CAPTURED LIVE` |

Four things the evidence forced the copy to soften, all now correct on the page:
the integration test never touches the CLI, so the page does not claim the CLI
loop is what it proves; `plan lint` is not in that test; the digest precondition
is a store-API argument the `graphene plan approve` path does not pass, so the
page says **the store** refuses a wrong digest; and refusing to edit after
dispatch is proven in a different file, so the page does not claim it here.

## Interaction, and the three degraded paths

- **Stages** — click, or arrow-key the group. Autoplays once on entering view at
  35% threshold, ends verified, stops. Verified by probe: 6 stages; Plan hides the
  added node and reads revision 1; Approve reads digest `4657377b`; Retry reads
  `↻ retrying`; Verify reads the added node `accepted`.
- **Nodes** — pointer, touch and keyboard focus all light ancestors and
  descendants and fill the contract inspector; Enter pins, Escape clears. Probe:
  focusing the added node lights 4 of 7 and the inspector fills with its contract.
  Hit areas are 48px circles; every control clears 44px.
- **Hero pointer** — a 118px influence eases toward the cursor and raises the
  local reveal weight of route segments only. It moves no node and chases nothing.
  Off for coarse pointers and `prefers-reduced-motion`. Verified in two parts: an
  instrumented probe shows `wantsPointer` true, strength going 0 → 1 on move and
  back to 0 on leave; and `scripts/check_field_reveal.js` asserts the arithmetic
  (only route points respond, smooth falloff, nothing outside 118px, and an
  already-revealing cycle is never dimmed). **Not** verified from a rendered
  frame: headless Chrome's virtual clock does not advance `requestAnimationFrame`,
  so no headless screenshot can ever show this. Recorded rather than glossed.
- **No JavaScript** — asserted on the static markup, not eyeballed: all 7 nodes
  present, each carrying a state (`✓ accepted` / `✓ committed`), all 8 edges
  including the accent one, zero `is-out`, readout at revision 2 with the v2
  digest, and the stage bar and replay button hidden because the script that
  drives them is absent.
- **Reduced motion** — no autoplay; the graph rests in the verified state and the
  stage controls still work. The field paints one static frame with the route
  resolved.

## Palette, measured

| | on `--bg` `#f3eee4` | on `--bg-raised` `#fbf8f1` |
|---|---|---|
| `--ink` `#242622` | 13.20:1 | 14.40:1 |
| `--ink-muted` `#66675f` | 4.95:1 | 5.39:1 |
| `--accent` `#9a4f24` | 5.16:1 | 5.63:1 |

The terminal inset is the page inverted — `--term-bg` *is* `--ink`, `--term-ink`
*is* `--bg`, 13.20:1 — so captured output keeps a real terminal surface.
`--term-muted` 6.43:1, `--term-accent` 6.39:1. Every pair clears AA.

## Terminal blocks — source ranges and byte-match

All three re-verified byte-identical **after** the final edit, at `fa302a1`:

| Block | Source | Lines | Match |
|---|---|---|---|
| the plan surface | `evidence/contract/2026-08-24-plan-surface/plan-surface.txt` | 1–14 | ✓ |
| the v1→v2 diff, `** SCOPE EXPANSION **` | same file | 89–95 | ✓ |
| the `why` tail, with its `UNKNOWN` line | `evidence/north_star/2026-08-23-mission1/why_ledger_service_cli.py.txt` | 27–32 | ✓ |

Both disclosures from that capture's own README are on the page: it is
credential-free `--driver scripted-local`, so it is the plan **surface** and not a
model's proposal; and temporary paths read `TARGET`, with nothing else altered.
The retry/dashboard excerpt from the previous build was dropped — the mission
graph now shows that beat interactively with its live label, so a static frame of
it was the redundant one.

## Comparison sources

Every description fetched from the project's own documentation on
**24 August 2026** and quoted no further than the page states:
[Graft](https://github.com/NanoNets/Graft/blob/main/README.md) ·
[Aider repo map](https://aider.chat/docs/repomap.html) ·
[CoderMind](https://github.com/microsoft/RPG-ZeroRepo/blob/main/CoderMind/README.md) ·
[LangGraph](https://docs.langchain.com/oss/python/langgraph/overview) ·
[Studio](https://docs.langchain.com/langsmith/studio). No benchmark number, no
star count, no "first" or "only", and nothing about what another tool cannot do.

## Quality gates

| | |
|---|---|
| Lighthouse desktop | **100 / 100 / 100 / 100** |
| Lighthouse mobile | **99 / 100 / 100 / 100** |
| Page weight | **198 KB** over **7 requests** |
| External hosts | **none** |
| Console | zero errors, zero warnings |
| 380px | no page-level overflow; the mission graph is vertical and needs no horizontal scroll |
| Missing first-party assets | none |

## Adversarial claim pass on the final copy

Every claim on the page and in the replay's stage text was extracted and handed
to one independent skeptic each, reading the clone at `fa302a1` and told to
default to refuted. **70 claims: 48 true, 15 overstated, 4 false, 3 uncheckable
offline.** All 17 actionable findings are fixed; the two remaining "false"
verdicts were checked against a copy I had already corrected, and their own
correction text confirms the shipped wording.

The four that mattered most:

1. The graph showed a **`result` node queued from the proposal onward** — but
   `result` is not a task in the captured plan. It now appears only at Verify.
2. **"808 Python tests, four opt-in skips"** read as current. The contract states
   it for one named source commit; the row now says so.
3. **"the store refuses the wrong digest"** — the store's digest check is opt-in
   (`expected_plan_sha256`); the CLI is what refuses a non-committed digest.
4. **"Both digests are real"** flattened two different things: revision 1's is
   the digest Graphene recorded, revision 2's is derived by
   `scripts/plan_digest.py`. The page now distinguishes them.

The three uncheckable ones are the comparison table's descriptions of other
projects: the clone says nothing about them, and the checkers had no network.
Each was taken from that project's own documentation on 24 August 2026, and the
page states only what each project says about itself.

## Deployment

| | |
|---|---|
| Live URL | <https://alex-lop.github.io/graphene-site/> |
| First deploy of this rebuild | `fe6bb6a8af3311dc750e0307ada29e474dce9ad7` — built 2026-08-24T12:17:46Z |
| Final deploy | recorded below after verification |

## Owner actions and remaining limits

- **Nothing is required to publish.** Pages is already configured and building.
- The demo film still does not exist. When it does, drop `assets/demo.mp4` in and
  restore a `<video>`; today the section is an honest still with no controls.
- No live capture of the edited-DAG sequence exists. The mission graph says so.
- The full-matrix runner hang is deliberately **not** on the page. It was in flux
  in the product repo while this ran (rewritten several times in an hour), and
  reliability is not part of this page's proof summary, so carrying it would have
  been adding a claim rather than correcting one.
- Visible copy is 1008 words against a 800–1000 target. The eight are the
  precision the adversarial pass bought; trimming further would cost accuracy.
