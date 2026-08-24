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

