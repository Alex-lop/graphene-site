# Terminal display spec

This is guidance for post-freeze adoption; it changes no product behavior by itself.

It describes how Graphene's logic should read in a terminal, using the same
language as the website and the plugin spec: `assets/design-tokens.css` is the
source of the palette — the `--term-*` tokens, which are the dark inset the site
reserves for real product output — and the glyph vocabulary below is the one
already in `backend/graphene/cli/dashboard.py`. Nothing here asks for a new
dependency.

Everything said about Graphene's current behaviour was read in
`Alex-lop/Graphene` at `b7b174a02a8eabaad6443348dce75cbed77a78ea`. The palette in
§1 comes from this site's `assets/design-tokens.css`, not from that repository. Quotes are marked as captured output
or as source with a file and line — a source string is not the same evidence as
a captured run. Nothing here asks for spinners, progress bars for work of unknown
duration, emoji, or a second colour for "warning".

---

## 1. Colour

Today the CLI emits **no colour at all**: `main.py:396` computes
`no_color = "NO_COLOR" in os.environ or not sys.stdout.isatty()` and hands it to
`render_human`, which discards it (`del no_color`, `cli/render.py:96`), and the
`--follow` dashboard builds `rich` objects with no `style=` anywhere
(`cli/dashboard.py:169`). The discipline below costs one small renderer.

Three colours. Not four.

| Token | Truecolor | 256-colour | Used for |
|---|---|---|---|
| `--term-ink` `#f3eee4` | `38;2;243;238;228` | `38;5;255` | default text — **prefer emitting nothing** and letting the terminal's own foreground win |
| `--term-muted` `#a8a99f` | `38;2;168;169;159` | `38;5;248` | column labels, units, elapsed, anything the eye should skip |
| `--term-accent` `#e08a3c` | `38;2;224;138;60` | `38;5;173` | approval moments and digests, and nothing else |

The website is warm paper and graphite; a terminal is not. These are the site's
`--term-*` tokens — the palette of the dark inset the site uses whenever it shows
real product output — so the two surfaces still agree without the CLI pretending
to be a web page.

Rules that make it survive contact with real terminals:

- **Never set a background.** The user chose their background; `--bg` exists so
  the website and the plugin agree, not so the CLI can repaint someone's shell.
- **Default foreground beats an ink colour.** Emitting `38;5;254` on a light
  terminal is how a tool becomes unreadable. No SGR for ordinary text, `2` (dim)
  or `38;5;245` for muted, the accent only where §4 says.
- Honour `NO_COLOR`, a non-TTY stdout, and `TERM=dumb`. Two of the three already
  exist, inline at `main.py:396` rather than as a shared helper; `TERM=dumb` is
  checked nowhere in the codebase. All three need a renderer that reads them.
- Colour is never the only carrier of meaning: every coloured state also has a
  glyph and a word.
- One accent per screen. Two accents means one of them is wrong.

## 2. Glyphs

Every glyph below is already in the codebase, but assembled from three places:
`✓ ● ↻ ○ ✗` are the `_STATES` dict at `cli/dashboard.py:28-39`, `—` is the
absent-value placeholder used elsewhere in the same file (`150`, `164-165`, `176`,
`188`), and `~` is the clip marker in `cli/render.py:27` and `:33`. The spec is
that this becomes **one vocabulary used identically everywhere** — `status`,
`plan`, `why`, the dashboard, and any surface added later — rather than three
conventions that happen to agree.

| Glyph | State | Colour |
|---|---|---|
| `✓` | accepted / done | default |
| `●` | running, verifying | default |
| `↻` | retrying | default |
| `○` | queued, ready, blocked, needs_input, and any state the renderer does not know | muted |
| `✗` | failed, cancelled | default |
| `—` | unknown or absent value | muted |
| `~` | text clipped to fit | muted |

`○` is also the fallback for an unrecognised state (`dashboard.py:119-120`), so
it must always be printed beside the state's own word — the glyph alone cannot
tell "queued" from "a state this build has never heard of".

`—` means *not known*, never zero — and that one is a request, not a description.
Only the spend field tests for absence today (`spend_usd is None`,
`dashboard.py:150`); attempt and fence use `or '—'` on integers
(`dashboard.py:164-165`), so a genuine zero currently prints as `—`. A spend of
`$0.00` is a fact and should print as `$0.00`.
Terminals that cannot render these fall back to `[x] [>] [o] [ ] [!]`, decided
once at startup from the encoding, not per line.

## 3. Tables

- Columns left-aligned and ids padded to the longest id in the frame — the
  non-TTY dashboard already does this (`dashboard.py:183-187`). Numbers should be
  right-aligned, which is new: attempt and fence print today as unpadded
  `attempt N` / `fence N` strings (`dashboard.py:160-166`).
- **No box drawing.** A header line, one `─` rule under it if genuinely needed,
  nothing else. The website makes the same choice: one hairline, everywhere.
- Clip to the real terminal width. `render_human` is already handed
  `shutil.get_terminal_size()` by the CLI (`main.py:397`) and then clamps it away
  with `width = max(1, min(width, 80))` (`render.py:97`), so a 200-column terminal
  renders at 80 and leaves 60% of the screen unused. Remove the upper clamp
  rather than adding a second width source.
- Clip the *middle* of an identifier, never the end: `mission_start_5291…22a9221`
  is greppable, `mission_start_5291caad50a8e~` is not.

## 4. The approval prompt

This is the loudest moment in the product and it should be the loudest moment on
the screen. Today it is not: the interactive prompt is
`input("Approve this bounded scripted plan? [y/N] ")` (`cli/mission.py:4258`,
read from source — no captured run in the repository exercises it), it is
preceded only by `PLAN {mission_id} VALID tasks={n}` and one line per task
(`mission.py:4251`), and **no digest is shown at all** — not truncated, not in
full. The operator approves on a mission id and a list of task names.

That is the one thing this spec most wants changed. What the approval literally
binds is the mission id, the plan revision, and the event-log head
(`store.py:1410-1446`); `plan_sha256` is pinned through that head, because the
chain covers the proposal and validation events that carry the digest and the
store re-verifies the plan bytes against them. The operator is therefore
approving a digest — they just never see it. Requirements:

1. Print the full 64-character `plan_sha256` in the accent colour. Not
   truncated. A digest you cannot compare is decoration.
2. Print what else the approval pins: mission id, plan revision, base commit,
   and the event-log head the approval is bound to.
3. Print the plan itself: one line per task, its dependencies, and its write
   scope. The write scope is the part a human can actually audit.
4. Ask explicitly, defaulting to no, and say what each answer does.
5. On anything other than yes, **say what happened**. Today a non-`y` answer
   leaves the mission proposed and prints only the generic
   `GRAPHENE status=proposed mission_id=… review_required=True` summary
   (`mission.py:5109-5114`) — nothing that says the approval was declined.

### Before → after: the approval moment

Before — real captured output, `evidence/convergence/2026-08-23-demo-live/run-1.txt`
lines 29-36 followed by 51-52, verbatim, from `graphene demo --live`. The trailing
spaces and the wraps that split each plan entry across two lines are the program's
own, at 80 columns:

```text
Bounded plan, revision 1:
  assemble  assembly  needs implement_report_json, implement_report_markdown  
writes nothing
  implement_report_json  work  needs nothing  writes 
ledger_service/report_json.py, tests/test_report_json.py
  implement_report_markdown  work  needs nothing  writes 
ledger_service/report_markdown.py, tests/test_report_markdown.py
  verify  verification  needs assemble  writes nothing
This demo runs under a pre-authorized bounded policy; approving the plan and 
starting the mission now.
```

After — proposed. Same facts, wrapped by column rather than by accident, with
the digest present. Accent shown here as **bold**:

```text
PLAN  mission_start_93ff1980f18c9665f627e9fa  revision 1  4 tasks
      base 680f42fb6a5b   head seq 12   policy north-star/v1

  TASK                       KIND           NEEDS                     WRITES
  ○ implement_report_json    work           —                         ledger_service/report_json.py
                                                                      tests/test_report_json.py
  ○ implement_report_markdown work          —                         ledger_service/report_markdown.py
                                                                      tests/test_report_markdown.py
  ○ assemble                 assembly       implement_report_json     —
                                            implement_report_markdown
  ○ verify                   verification   assemble                  —

  checks  fixture-tests (python -m pytest -q -p no:cacheprovider)
  network denied      attempt limit 2 per task      budget 900s / 16 attempts

  plan_sha256  **83762ff17f47726d8fd22d53f1865b52926101eb6aea094a3d1a8c643f42da48**

Approving binds this mission, revision 1, that head, and that digest. Any
later result that does not present the same digest is refused.

Approve? [y/N] _
```

On `n`: `PLAN mission_start_93ff… NOT APPROVED — the mission stays proposed. Re-run graphene plan show MISSION_ID to look again.`

## 5. Errors

Today most call sites hand-write `sys.stderr.write("PREFIX: message\n")` and
return 1. The helpers that exist are narrow and disagree with each other —
`_evidence_invalid` covers one error type, `integrations/stdio.py:50` just
forwards preformatted text and its callers return 2. And seven distinct exception
types (`BootstrapError`, `ConsumerStartError`, `HandoffCompileError`,
`HumanWorkflowError`, `LocalCommitError`, `PromotionError`, `RuntimeBindingError`)
share one handler at `main.py:1723` that writes the single string
`WORKFLOW_ERROR: operation rejected` (`main.py:1732`). The specific reason is
discarded before it reaches the person who could act on it.

Every error gets exactly three lines, in this order:

```text
✗ WORKFLOW_ERROR  the local commit was refused
  why             the candidate tree hash does not match the verification receipt
  next            graphene bundle verify mission_start_93ff1980f18c9665f627e9fa
```

What happened, why, and a command the reader can paste — not a description of
one. If there is genuinely no next command, the third line says what would have
to become true instead. Errors stay on stderr and keep their machine-readable
prefix as the first token, so existing greps survive.

## 6. Human mode never prints raw JSON

Two places break this today. The generic human fallback flattens scalars into
`GRAPHENE key=value key=value` and **silently drops every nested dict and list**
(`main.py:1491`, duplicated at `mission.py:5109`), so a human asking for a
structured result gets a quietly incomplete answer. And `plan diff` / `plan show`
in human mode simply dump canonical JSON (`mission.py:5104`).

The rule: `--json` is the only thing that prints JSON. Without it a command
either has a renderer or it has no human mode — and where a nested value cannot
be put in prose, print a one-line summary plus the exact `--json` invocation that
would show it. `watch inbox` and `watch github` have no human mode at all
(`cli/watch.py:556`); documenting them as machine-only is fine. Pretending is not.

## 7. The `--follow` dashboard

One row per task, and the row never moves once the mission is running — a task
that changes state changes its glyph, not its position. Sort by the plan's
order, not by state, or the screen churns.

Before — real captured output, same file, lines 74-80, verbatim:

```text
GOAL Add a redacted JSON status ~ | STATUS running | ELAPSED 00:17 | SPEND $0.04
assemble                   ○ queued    attempt —  fence —
implement_report_json      ↻ retrying  attempt 1  fence 1
implement_report_markdown  ● running   attempt 1  fence 1
verify                     ○ queued    attempt —  fence —
Latest: check failed → retry authorized with diagnostic
Result: No final result decision has been committed.
```

After — proposed. The goal gets its own line instead of being clipped to make
room for three counters; the columns are labelled once; the latest event keeps
the arrow, which is the most informative character on the screen:

```text
mission_start_93ff1980f18c9665f627e9fa   running   00:17   $0.04
Add a redacted JSON status report and a Markdown status report to the ledger CLI

  TASK                        STATE      ATTEMPT  FENCE
  ○ assemble                  queued           —      —
  ↻ implement_report_json     retrying         1      1
  ● implement_report_markdown running          1      1
  ○ verify                    queued           —      —

  latest  check failed → retry authorized with diagnostic
  result  none committed yet
```

Density rules: one line per task and never two; the goal is truncated only if it
does not fit on its own full-width line; spend prints only once it is non-zero
and prints `$0.00`, not `—`, when it is genuinely zero; the latest-event line is
one event, the most recent, never a scrolling log. If the terminal is not a TTY,
print a frame only when something changed — `dashboard.py:245-253` already does
this and it is correct.

