#!/usr/bin/env python3
"""Reproduce the two plan digests shown in the v1 -> v2 diagram on the site.

Graphene binds an approved plan by plan_sha256 = SHA-256 of the canonical JSON
of the whole Plan (sorted keys, compact separators) -- see
backend/graphene/hashing.py canonical_json_sha256 in Alex-lop/Graphene.

This script (1) recomputes that digest from a captured plan and checks it
against the digest the product recorded, then (2) applies one operator edit --
add a docs task, make `assemble` depend on it, bump the revision -- and
recomputes. Nothing here is invented: both hex strings printed are SHA-256 of
JSON bytes you can regenerate.

usage: python3 scripts/plan_digest.py [path/to/plan_show.json]
default: ../reference/evidence/north_star/2026-08-23-mission1/plan_show.json
"""
import copy
import hashlib
import json
import pathlib
import sys

DEFAULT = (pathlib.Path(__file__).resolve().parent.parent / "reference"
           / "evidence/north_star/2026-08-23-mission1/plan_show.json")


def canonical_json_sha256(value):
    blob = json.dumps(value, ensure_ascii=False, separators=(",", ":"),
                      sort_keys=True, allow_nan=False).encode()
    return hashlib.sha256(blob).hexdigest()


def main():
    path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT
    captured = json.loads(path.read_text())
    plan = captured["plan"]

    v1 = canonical_json_sha256(plan)
    assert v1 == captured["plan_sha256"], (
        f"recomputed {v1} != recorded {captured['plan_sha256']}")
    print(f"revision {plan['revision']}  plan_sha256 {v1}   (matches the recorded digest)")

    # One operator edit: a docs task the plan did not have, wired into assemble.
    template = next(t for t in plan["tasks"] if t["task_id"] == "task-markdown-renderer")
    docs = copy.deepcopy(template)
    docs.update({
        "task_id": "task-docs",
        "title": "Document the report formats in README.md",
        "contract": "Document the JSON and Markdown report formats in README.md.",
        "read_paths": ["README.md", "ledger_service/report_base.py"],
        "write_paths": ["README.md"],
        "expected_outputs": [{"kind": "patch", "name": "work-docs", "paths": ["README.md"]}],
        "priority": 0,
    })

    v2plan = copy.deepcopy(plan)
    v2plan["tasks"] = sorted(v2plan["tasks"] + [docs], key=lambda t: t["task_id"])
    assemble = next(t for t in v2plan["tasks"] if t["task_id"] == "assemble")
    assemble["dependencies"] = sorted(assemble["dependencies"] + ["task-docs"])
    assemble["inputs"] = sorted(
        assemble["inputs"] + [{"kind": "patch", "name": "work-docs", "producer_task_id": "task-docs"}],
        key=lambda i: (i["producer_task_id"], i["name"]))
    v2plan["previous_revision"] = v2plan["revision"]
    v2plan["revision"] = v2plan["revision"] + 1

    v2 = canonical_json_sha256(v2plan)
    print(f"revision {v2plan['revision']}  plan_sha256 {v2}   (one task added, one edge rewired)")
    print(f"\nsame first byte: {v1[:2] == v2[:2]}   digests equal: {v1 == v2}")


if __name__ == "__main__":
    main()
