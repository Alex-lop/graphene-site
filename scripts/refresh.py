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
    ("evidence/contract/2026-08-24-plan-surface/plan-surface.txt", 1, 14,
     'graphene plan "<goal>" --repo TARGET --driver scripted-local',
     "What you are asked to approve: the mission, the base commit, the plan digest, every task "
     "with its dependencies, role, read/write scope counts and check &mdash; then the critical "
     "path, what becomes ready on approval, and the fact that nothing has been approved yet."),
    ("evidence/contract/2026-08-24-plan-surface/plan-surface.txt", 89, 95,
     "graphene plan diff MISSION_ID 1 2",
     "You widened one worker&rsquo;s read scope. The digest changed, the diff names the field "
     "that moved, and it is flagged <code>** SCOPE EXPANSION **</code> &mdash; revision 2 now "
     "needs an approval of its own."),
    ("evidence/north_star/2026-08-23-mission1/why_ledger_service_cli.py.txt", 27, 32,
     "graphene why ledger_service/cli.py --mission mission_start_5291caad50a8ee7a222a9221",
     "Afterwards, from a live Gemini mission: the tail of a lineage answer. Note the "
     "<code>UNKNOWN</code> line &mdash; Graphene lists what it cannot derive instead of "
     "filling it in."),
]

CAPTIONS = []

# capability -> where its label lives in contracts/product_proof.json
# The compact proof summary. (name, path into the JSON, optional detail key).
# A path of None means the row is not in the proof contract and carries its own
# label and source -- used only where committed evidence exists outside it.
# The compact proof summary. (name, path into the JSON, short qualifier).
# The LABEL is always read live from the contract, so a label change here is
# caught; the qualifier is a short faithful compression of that entry's own
# limit text, because the full sentences belong in the linked contract.
# A path of None means the row is not in the contract and carries its own label.
ROWS = [
    ("Live Gemini planning and two bounded workers",
     ["delivery_gates", "live_gemini"], "on 2026-08-23, with evidence-bound provider receipts"),
    ("Diagnostic-aware retry at a strictly higher fence",
     ["failure_aware_retry"], "observed live in both directions on 2026-08-23"),
    ("Credential-free core test matrix",
     ["delivery_gates", "credential_free_core"], "808 Python tests, four explicit opt-in skips"),
    ("Terminal plan revision path — export, revise, diff, approve, execute", None,
     "verified_local|proven by the credential-free integration test "
     "tests/integration/test_plan_edit_path.py; no live run of the sequence yet, and this row "
     "is not in the proof contract"),
    ("Cloud Run and real Firestore deployment",
     ["mission_paths", "cloud-run-firestore"],
     "packaging, unit tests and the official emulator are not deployment proof"),
    ("Docker isolated executor",
     ["mission_paths", "docker-executor"], "needs a responsive daemon and a built immutable image"),
    ("Comparative graph benchmark",
     ["graph_economics"], "no run, no token, cost or latency result, no median, no P95 is claimed"),
    ("Product media, and a continuous live edited-DAG take",
     ["product_media"], "nothing has been filmed"),
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
    for name, path, prefer in ROWS:
        if path is None:                       # self-labelled, sourced in its own text
            status, _, text = prefer.partition("|")
        else:
            status = dig(proof, path).get("status", "")
            text = prefer
        cls = "yes" if status in GOOD else "no" if status in BAD else "part"
        out.append(
            f'        <tr><td>{html.escape(name)}</td><td>'
            f'<span class="label {cls}">{html.escape(status)}</span><br>'
            f'{html.escape(text)}</td></tr>')
    out.append('      </tbody>')
    out.append('    </table>')
    out.append(
        f'    <p class="small muted">This is the material summary. The complete '
        f'machine-readable contract at commit <code>{sha[:12]}</code>, committed {date}, is '
        f'<a href="https://github.com/Alex-lop/Graphene/blob/main/contracts/product_proof.json">'
        f'in the repository</a> and vendored beside this page at '
        f'<a href="assets/product_proof.snapshot.json">product_proof.snapshot.json</a> '
        f'(byte-identical). It carries {len(proof.get("deferred", []))} further deferred items. '
        f'Labels here only flip once the machine evidence is in the repository.</p>')
    return "\n".join(out)


DEMO = """    <div class="slot">
      <img src="assets/poster.png" width="1280" height="720"
           alt="A still of the hero field, resolved into a six-node mission graph.">
    </div>
    <p class="small muted" style="margin-top:14px">There is no demo film yet, so this is a
      still rather than a play button that would not play. The submission video is labelled
      <code>not_proven_capture_pending</code> in the proof contract above, and stays that way
      until something is filmed.</p>"""

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
