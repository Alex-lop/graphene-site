#!/usr/bin/env python3
"""Refresh the two data-bearing regions of index.html from the Graphene repo.

Everything else on the page is hand-written and this script does not touch it.
It rewrites, in place, the regions between the marker comments:

  <!--TERMINAL-->  three verbatim excerpts of captured CLI output
  <!--PROOF-->     the "what's proven, what isn't" table
  <!--DEMOSLOT-->  the video slot

and copies contracts/product_proof.json to assets/product_proof.snapshot.json.

It reads from a checkout of Alex-lop/Graphene. Default: ../reference (the pinned
read-only clone). After the contract run lands, re-clone that at the new SHA and
run this again -- nothing else on the page needs to move.

usage: python3 scripts/refresh.py [path/to/Graphene]
"""
import html
import json
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
REPO = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "reference"

# (source file, first line, last line, the command that produced it, caption)
EXCERPTS = [
    ("evidence/convergence/2026-08-23-demo-live/run-1.txt", 29, 36,
     "graphene demo --live",
     "The bounded plan, printed for review before anything runs. Each task states what it "
     "needs and exactly what it may write. Wrapped at 80 columns by the program itself."),
    ("evidence/convergence/2026-08-23-demo-live/run-1.txt", 67, 101,
     "graphene demo --live",
     "The same mission on the dashboard, five frames apart. A check on "
     "<code>implement_report_json</code> fails on purpose; the retry comes back at "
     "attempt 2, fence 2, and is accepted. <code>○</code> queued, <code>●</code> running, "
     "<code>↻</code> retrying, <code>✓</code> accepted."),
    ("evidence/north_star/2026-08-23-mission1/why_ledger_service_cli.py.txt", 27, 32,
     "graphene why ledger_service/cli.py --mission mission_start_5291caad50a8ee7a222a9221",
     "The last six lines of a lineage answer, from a different mission: "
     "<code>mission_start_5291caad50a8ee7a222a9221</code>. Note the "
     "<code>UNKNOWN</code> line. Graphene lists what it cannot derive instead of "
     "filling it in."),
]

CAPTIONS = [
    ("graphene plan", "design it"),
    ("graphene mission approve-plan", "approve it"),
    ("graphene why", "ask it why"),
]

# capability -> where its label lives in contracts/product_proof.json
ROWS = [  # (label shown, path into the JSON, optional key to prefer for the detail line)
    ("Credential-free core test matrix", ["delivery_gates", "credential_free_core"]),
    ("Live Gemini planning and two workers", ["delivery_gates", "live_gemini"]),
    ("Failure-aware retry", ["failure_aware_retry"]),
    ("North Star claim", ["north_star"]),
    ("Mission capsule export and cold verification", ["mission_capsule"]),
    ("Final bundle verification receipt", ["final_bundle_authority"]),
    ("Planner reads the commit workers clone", ["planning_source_binding"]),
    ("Working-tree integrity (v2 store, tree hashing)", ["working_tree_integrity"], "trusted_checks"),
    ("Mission path: live Gemini ADK planner", ["mission_paths", "gemini-adk-planner"]),
    ("Mission path: ADK runner, deterministic fake planner", ["mission_paths", "adk-fake-planner"]),
    ("Mission path: scripted local fixture", ["mission_paths", "scripted-local"]),
    ("Mission path: verified mission replay", ["mission_paths", "verified-mission-replay"]),
    ("Watcher (inbox and GitHub issue triggers)", ["watch"]),
    ("Cloud check authority", ["cloud_check_authority"]),
    ("Cloud abandon and second-executor transitions", ["cloud_unsupported_transitions"], "multi_executor"),
    ("Docker isolated executor", ["mission_paths", "docker-executor"]),
    ("Cloud Run and Firestore deployment", ["mission_paths", "cloud-run-firestore"]),
    ("Live cloud delivery gate", ["delivery_gates", "live_cloud"]),
    ("Graph economics benchmark", ["graph_economics"]),
    ("Shadow agent (Claude Code ingest)", ["shadow_agent"]),
    ("Product media and submission video", ["product_media"], "blocker"),
]

GOOD = {"verified_live", "verified_live_cold", "verified_local",
        "credential_free_release_matrix_verified", "fails_closed"}
BAD = {"not_proven", "not_deployed", "not_proven_capture_pending"}


def dig(doc, path):
    for key in path:
        doc = doc[key]
    return doc


def detail(obj, prefer=None):
    """The most specific honest sentence this object carries."""
    keys = ([prefer] if prefer else []) + ["truth_label", "truth", "limit", "sentence", "evidence"]
    for key in keys:
        value = obj.get(key)
        if isinstance(value, str) and value:
            return value
    # last resort: the longest string field that is not the status label
    strings = [v for k, v in sorted(obj.items()) if k != "status" and isinstance(v, str)]
    return max(strings, key=len) if strings else ""


def pre_block(repo, src, first, last, command, caption, sha):
    text = (repo / src).read_text().splitlines()[first - 1:last]
    body = html.escape("\n".join(text))
    return (f'    <figure>\n'
            f'      <!-- {html.escape(command)}\n'
            f'           captured in Alex-lop/Graphene at {sha}\n'
            f'           {src} lines {first}-{last}, verbatim -->\n'
            f'      <pre><code>{body}</code></pre>\n'
            f'      <figcaption>{caption} '
            f'<span class="muted">&mdash; <code>{html.escape(src)}</code> '
            f'lines&nbsp;{first}&ndash;{last}.</span></figcaption>\n'
            f'    </figure>')


def build_terminal(repo, sha):
    parts = [pre_block(repo, *e, sha) for e in EXCERPTS]
    caps = "\n".join(
        f'      <div><code>{html.escape(c)}</code><span>{w}</span></div>'
        for c, w in CAPTIONS)
    parts.append(f'    <div class="term-cap">\n{caps}\n    </div>')
    return "\n".join(parts)


def build_proof(proof, sha, date):
    out = ['    <table class="proof">',
           '      <thead><tr><th scope="col">Capability</th>'
           '<th scope="col">Label, and what it is limited to</th></tr></thead>',
           '      <tbody>']
    for row in ROWS:
        name, path, prefer = (row + (None,))[:3]
        obj = dig(proof, path)
        status = obj.get("status", "")
        cls = "yes" if status in GOOD else "no" if status in BAD else "part"
        out.append(
            f'        <tr><td>{html.escape(name)}</td><td>'
            f'<span class="label {cls}">{html.escape(status)}</span><br>'
            f'{html.escape(detail(obj, prefer))}</td></tr>')
    out.append('      </tbody>')
    out.append('    </table>')
    deferred = "".join(f'<li>{html.escape(d)}</li>' for d in proof.get("deferred", []))
    out.append(
        f'    <p class="small muted">Deferred, and not claimed anywhere:</p>\n'
        f'    <ul class="deferred small muted">{deferred}</ul>\n'
        f'    <div>\n'
        f'      <p class="small muted">Snapshot of <code>contracts/product_proof.json</code> '
        f'taken {date} at <code>{sha[:12]}</code> &mdash; '
        f'<a href="https://github.com/Alex-lop/Graphene/blob/main/contracts/product_proof.json">'
        f'read the live file</a>, or the copy vendored beside this page at '
        f'<a href="assets/product_proof.snapshot.json">assets/product_proof.snapshot.json</a>. '
        f'Labels here only flip with machine evidence in the same commit.</p>\n'
        f'    </div>')
    return "\n".join(out)


DEMO = """    <div class="slot">
      <video controls preload="none" poster="assets/poster.png"
             width="1280" height="720">
        <source src="assets/demo.mp4" type="video/mp4">
        <p>Your browser cannot play this video. <a href="assets/demo.mp4">Download it instead.</a></p>
      </video>
    </div>
    <p class="small muted" style="margin-top:14px">Demo arriving 31&nbsp;August&nbsp;2026 &mdash;
      one terminal, one continuous run, no splicing. Until then this is a still of the field.</p>"""


def replace(doc, marker, body):
    pattern = re.compile(
        rf"(<!--{marker}-->\n).*?(\n\s*<!--/{marker}-->)", re.S)
    if pattern.search(doc):
        return pattern.sub(lambda m: m.group(1) + body + m.group(2), doc)
    return doc.replace(f"<!--{marker}-->", f"<!--{marker}-->\n{body}\n<!--/{marker}-->")


def main():
    sha = subprocess.run(["git", "-C", str(REPO), "rev-parse", "HEAD"],
                         capture_output=True, text=True, check=True).stdout.strip()
    date = subprocess.run(["git", "-C", str(REPO), "log", "-1", "--format=%cs"],
                          capture_output=True, text=True, check=True).stdout.strip()
    proof = json.loads((REPO / "contracts/product_proof.json").read_text())
    shutil.copy(REPO / "contracts/product_proof.json",
                ROOT / "assets/product_proof.snapshot.json")

    page = (ROOT / "index.html").read_text()
    page = replace(page, "TERMINAL", build_terminal(REPO, sha))
    page = replace(page, "PROOF", build_proof(proof, sha, date))
    page = replace(page, "DEMOSLOT", DEMO)
    (ROOT / "index.html").write_text(page)
    print(f"index.html refreshed from {REPO} at {sha}")


if __name__ == "__main__":
    main()
