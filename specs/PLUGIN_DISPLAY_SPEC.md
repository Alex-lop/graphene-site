# Plugin / web viewer display spec

This is guidance for post-freeze adoption; it changes no product behavior by itself.

A browser extension or hosted viewer for Graphene is a **read-only projection of
the same revision schema** the CLI reads. It shows a mission; it never changes
one. This is not a design preference — the product contract already draws the
line: `mission_capture_boundary.browser_authority` reads *"Authenticated
read-only public projection; operator changes use the idempotent CLI/store
path."* The viewer inherits that sentence.

Everything cited here from `Alex-lop/Graphene` was read at
`b7b174a02a8eabaad6443348dce75cbed77a78ea`; source paths below are relative to
`backend/graphene/`. `assets/design-tokens.css` and
`specs/TERMINAL_DISPLAY_SPEC.md` are files of this website, not of that
repository.

## Out of scope, explicitly

Editing a plan. Approving or rejecting one. Starting, pausing, cancelling or
retrying anything. Supplying task input. Any mutation at all. A repository
already contains an optional browser command adapter behind a command token,
CSRF session, typed confirmation and expected head
(`mission_capture_boundary.working_tree_command_plane`); it is not what this
spec describes, its live end-to-end operator capture is still pending, and the
viewer this spec covers must work with it disabled.

The approval moment stays in the terminal, where the operator can see the digest
and the process is attributable. A browser tab is not an approval device.

## What it shows

The approved DAG, with an execution overlay on it — three layers, in this order
of visual weight:

1. **The planned route.** Every task in the approved revision, laid out
   left-to-right by dependency, edges as 1px hairlines. This layer never moves
   during a run; the plan is fixed once approved.
2. **The actual path.** Task states drawn on the same nodes: accepted, running,
   retrying, blocked, failed. A retry shows its attempt and fence, because
   "attempt 2, fence 2" is the difference between a repeat and a repair.
3. **The frontier.** The tasks that are ready right now. This is the only
   element allowed to draw the eye, and it is the only thing on screen that
   changes position as the run proceeds.

Selecting a node shows its contract — `dependencies`, `read_paths`,
`write_paths`, `allowed_commands`, `acceptance_checks`, `attempt_limit` — and
its evidence references by digest. Selecting nothing shows the mission header:
mission id, revision, `plan_sha256` in full, base commit, status, spend.

## Language

Same tokens as the website, from `assets/design-tokens.css`: `--bg` `#121316`,
`--bg-raised` `#1a1c20`, `--ink` `#eae7de`, `--ink-muted` `#8e9088`,
`--hairline` `rgba(234,231,222,.09)`, `--accent` `#e08a3c`.

Same glyphs as `specs/TERMINAL_DISPLAY_SPEC.md` §2 — `✓ ● ↻ ○ ✗ — ~` — with the
same meanings, so a person moving between the dashboard and the viewer is not
learning a second vocabulary.

Same accent discipline: `--accent` marks the approval and the digest, and
nothing else. Not the frontier, not errors, not the selected node. This is a
real change from what exists today, where Mission Control colours nodes by kind
from a seven-entry map (`orchestration/static/mission_control.mjs:21`) on a light
palette — seven colours that a reader has to learn before the picture means
anything. Shape, position and glyph carry kind; colour carries one thing.

Node kind is drawn, not coloured: `work` a circle, `assembly` a square,
`verification` a diamond. Three shapes, learnable at a glance.

## Where the data comes from

Existing surfaces only. No new endpoint is required for the read path:

- `graphene --json status MISSION_ID` for the mission and plan snapshot.
- `graphene --json watch RUN_ID`, which already streams canonical event
  envelopes as NDJSON (`cli/main.py:441-442`), for the overlay.
- `graphene why PATH --mission MISSION_ID --json` for a file's lineage.

`--json` is a global flag declared on the root parser (`cli/main.py:142`) and has
to precede the subcommand; `why` is the only subcommand that also accepts it in
trailing position (`cli/main.py:195`).

The viewer renders what those return and derives nothing of its own. If a value
is not in the projection, it is not on screen.

One honest note about live data: cloud streaming today is *"per-client
two-second Firestore polling; no shared listener or fan-out"*, and the proof
contract labels it `NOT PROVEN` (`mission_control_limits.cloud_streaming`). A
viewer built on it should say "updated 2s ago", not imply a live socket.

## Labelling what it cannot verify

The viewer adopts the website's rule: anything it cannot verify, it labels.

- A value the projection does not carry renders as `—`, never as `0` and never
  as a blank cell.
- An `UNKNOWN` from a lineage answer is shown as a row, not swallowed. The
  standard to meet is the CLI's own closing line, in full: *"TRUST: every line
  above is derived from hash-chained mission events and resolvable evidence
  references; unknowns are listed, never guessed."*
- Digests are shown in full or not at all. A truncated digest cannot be compared,
  and a viewer that shows `8376…da48` invites a reader to believe they checked
  something they did not.
- Evidence the viewer cannot resolve is marked unresolvable rather than omitted.
  `resolvable=True` already travels in the `why` output; when it is false, say so.
- Nothing in the private set is ever displayed, because it is never in the
  projection: raw prompts, context and reasoning; credentials and unrestricted
  environment variables; and raw command arguments, stdout, stderr, source, diffs
  and private artifacts (`mission_capture_boundary.private_or_excluded`).

## Quality floor

Dark by default and legible at WCAG AA on both surfaces. Keyboard navigable —
the graph is a list before it is a picture, and tab order follows the plan order.
Every node has an accessible name that reads as text: `implement_report_json,
accepted, attempt 2, fence 2`. `prefers-reduced-motion` removes the state
transitions and keeps the graph. The whole viewer works offline against a
captured mission capsule, because a projection that needs a network to render a
finished mission is a worse artifact than the capsule it was built from.
