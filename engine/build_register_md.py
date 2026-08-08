#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_register_md.py — generates the clause register as markdown.

Reads data/seed_data.json and writes docs/clause-register.md, which renders
directly on GitHub so the register is readable without downloading anything.

Usage:  python3 engine/build_register_md.py
        make register

Credit partner    : Industry Compliance & Sustainability Platform
Technology partner: guulba — technology for better performance
"""

import json, os
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEED = os.path.join(ROOT, "data", "seed_data.json")
OUT  = os.path.join(ROOT, "docs", "clause-register.md")

ORDER = ["CAT 6", "CAT 5", "CAT 4", "MAJOR", "MINOR"]
WEIGHT = {"CAT 6": 13, "CAT 5": 8, "CAT 4": 5, "MAJOR": 3, "MINOR": 1}
MEANING = {
    "CAT 6": "Zero tolerance. Stops the order.",
    "CAT 5": "Zero tolerance. Stops the order.",
    "CAT 4": "Immediate corrective action required.",
    "MAJOR": "Corrective action plan, verified at follow-up.",
    "MINOR": "Continuous improvement.",
}
BADGE = {"CAT 6": "**CAT 6**", "CAT 5": "**CAT 5**", "CAT 4": "**CAT 4**",
         "MAJOR": "MAJOR", "MINOR": "MINOR"}


def esc(s):
    """Escape pipes so long requirement text cannot break a markdown table."""
    return str(s).replace("|", "\\|").replace("\n", " ")


def slug(section_no):
    return "section-" + section_no.replace(".", "-")


def build(board):
    items = board["items"]
    total = len(items)
    all_c = Counter(x["grade"] for x in items)
    total_w = sum(WEIGHT[x["grade"]] for x in items)
    zero_tol = all_c["CAT 6"] + all_c["CAT 5"]

    L = []
    A = L.append

    # ---------------------------------------------------------------- head --
    A("# NEXT Code of Practice — Clause Register")
    A("")
    A("Twenty section groups · %d auditable clauses · five-level severity ladder" % total)
    A("")
    A("| | |")
    A("|---|---|")
    A("| **Standard** | NEXT plc Supplier Auditing Standards, issued June 2025 |")
    A("| **Register** | %d clauses · %d total severity weight · %d zero-tolerance controls |"
      % (total, total_w, zero_tol))
    A("| **Source** | `data/seed_data.json` — rebuild with `make register` |")
    A("")
    A("> NEXT does not publish a short code of conduct. It publishes an auditing standards")
    A("> booklet, and that booklet is the operational code. This register breaks every")
    A("> requirement in it into a single auditable control, states the evidence an auditor")
    A("> will ask for, and records the grade NEXT would raise if that control fails.")
    A("")
    A("---")
    A("")

    # ------------------------------------------------------ severity ladder --
    A("## 1. The severity ladder")
    A("")
    A("Every clause carries one grade: the category NEXT would raise if that control were")
    A("found to have failed. The grade is not a measure of how hard the work is. It is a")
    A("statement of what happens commercially if the work is not done.")
    A("")
    A("| Grade | Weight | What it means at audit | Clauses | Share of clauses | Share of weight |")
    A("|---|---:|---|---:|---:|---:|")
    for g in ORDER:
        n = all_c[g]
        w = n * WEIGHT[g]
        A("| %s | %d | %s | %d | %.1f%% | %.1f%% |"
          % (BADGE[g], WEIGHT[g], MEANING[g], n, n / total * 100, w / total_w * 100))
    A("| | | **Total** | **%d** | **100%%** | **%d weight** |" % (total, total_w))
    A("")
    A("**Why the weights matter.** Closing one Category 6 clause removes as much exposure as")
    A("closing thirteen Minor ones. A readiness figure that counts clauses instead of weight")
    A("lets a team report steady progress while the fire alarm is still unfinished. Every")
    A("score in this system is weighted for exactly that reason — Category 6 alone is %.1f%%"
      % (all_c["CAT 6"] * 13 / total_w * 100))
    A("of the total weight while being only %.1f%% of the clauses." % (all_c["CAT 6"] / total * 100))
    A("")
    A("**The zero-tolerance gate.** Category 5 and Category 6 differ in kind, not degree.")
    A("%d of the %d clauses sit in those two bands. While any one of them is open, the site" % (zero_tol, total))
    A("is not audit ready — no amount of Major and Minor closure compensates.")
    A("")
    A("**A caution on grading.** The booklet states in every section that its non-conformity")
    A("lists are not exhaustive and that auditor discretion applies. Treat the grade here as a")
    A("planning priority, not a guarantee of how a specific finding will be raised on the day.")
    A("")

    # ------------------------------------------------------ how to read a row --
    A("## 2. How to read a clause")
    A("")
    A("| Field | What it holds | How to use it |")
    A("|---|---|---|")
    for a, b, c in [
        ("Ref", "A stable identifier, `NX-001` to `NX-%03d`." % total,
         "Quote it in corrective action plans, purchase orders and audit correspondence. It never changes."),
        ("Clause", "A short name for the control.",
         "This is what appears on the dashboard and in task titles."),
        ("Requirement", "What the standard asks for, in plain terms.",
         "Read this before deciding whether the control is in place. Ambiguity here is the most common cause of a failed clause."),
        ("Evidence", "What the auditor will ask to see.",
         "This is the acceptance test. A control is not closed until this evidence exists, is dated, and can be produced on request."),
        ("If failed", "The grade NEXT would raise.",
         "Drives sequencing. Clear Category 6, then 5, then 4, then Major."),
        ("Workstream", "Policy, Records, Practice, Facility, Engineering, Training or Licence.",
         "Groups clauses by the kind of work involved, which is how budget and contractors get allocated."),
    ]:
        A("| **%s** | %s | %s |" % (a, b, c))
    A("")
    A("**ORSVAI routing.** Every section group carries a default accountability set — Owner,")
    A("Responsible, Support, Verify, Approve, Inform — shown in the heading block of each")
    A("section below. Verify is never the same party as Responsible; a control checked by the")
    A("person who performed it is not verified.")
    A("")

    # ----------------------------------------------------------- section map --
    A("## 3. The twenty section groups")
    A("")
    A("Sections 1 to 10 of the standard, with Health & Safety expanded into its eleven")
    A("sub-sections. The split is deliberate: 3.2 Fire Safety and 3.11 Environmental")
    A("Protection are different departments, different budgets and different failure modes,")
    A("and rolling them into one line hides where the exposure actually sits.")
    A("")
    A("| § | Section group | Clauses | Cat 6 | Cat 5 | Cat 4 | Major | Minor | Weight |")
    A("|---|---|---:|---:|---:|---:|---:|---:|---:|")
    for s in board["sections"]:
        sec = [x for x in items if x["sectionKey"] == s["key"]]
        c = Counter(x["grade"] for x in sec)
        w = sum(WEIGHT[x["grade"]] for x in sec)
        cells = ["%d" % c[g] if c[g] else "·" for g in ORDER]
        A("| %s | [%s](#%s) | %d | %s | %s | %s | %s | %s | %d |"
          % (s["no"], s["title"], slug(s["no"]), len(sec), *cells, w))
    A("| | **Total** | **%d** | **%d** | **%d** | **%d** | **%d** | **%d** | **%d** |"
      % (total, all_c["CAT 6"], all_c["CAT 5"], all_c["CAT 4"],
         all_c["MAJOR"], all_c["MINOR"], total_w))
    A("")
    A("**Where the weight sits.** Section 1 is the shortest group and the most dangerous —")
    A("eight of its eleven clauses are Category 6, because forced labour findings are almost")
    A("all zero-tolerance by nature. Section 3.2 Fire Safety is the largest single group at 24")
    A("clauses and carries the heaviest engineering spend. Section 10 Management Systems is")
    A("where an otherwise compliant site most often fails, because it tests whether the other")
    A("nineteen groups can be *evidenced* rather than merely done.")
    A("")

    # ------------------------------------------------------ zero-tolerance ---
    A("## 4. Zero-tolerance index")
    A("")
    A("All %d Category 6 and Category 5 clauses in one place. While any row here is open, the" % zero_tol)
    A("site is not audit ready. This is the list to work first, and the list to check before")
    A("requesting an audit date.")
    A("")
    A("| Grade | Ref | § | Clause | Evidence required |")
    A("|---|---|---|---|---|")
    zt = sorted([x for x in items if x["grade"] in ("CAT 6", "CAT 5")],
                key=lambda x: (ORDER.index(x["grade"]), x["id"]))
    for x in zt:
        A("| %s | `%s` | %s | %s | %s |"
          % (BADGE[x["grade"]], x["id"], x["sectionNo"], esc(x["clause"]), esc(x["evidence"])))
    A("")

    # ---------------------------------------------------------- the register --
    A("## 5. The register")
    A("")
    A("All %d clauses in section order." % total)
    A("")
    for s in board["sections"]:
        sec = [x for x in items if x["sectionKey"] == s["key"]]
        c = Counter(x["grade"] for x in sec)
        ex = sec[0]
        profile = " · ".join("%d × %s" % (c[g], g) for g in ORDER if c[g])
        A("### Section %s — %s" % (s["no"], s["title"]))
        A("")
        A("`%d clauses`  %s" % (len(sec), profile))
        A("")
        A("**O** %s · **R** %s · **S** %s · **V** %s · **A** %s · **I** %s"
          % (ex["owner"], ex["responsible"], ex["support"],
             ex["verify"], ex["approve"], ex["inform"]))
        A("")
        A("| Ref | Clause | Requirement | Evidence required | If failed | Workstream |")
        A("|---|---|---|---|---|---|")
        for x in sec:
            A("| `%s` | **%s** | %s | %s | %s | %s |"
              % (x["id"], esc(x["clause"]), esc(x["requirement"]),
                 esc(x["evidence"]), BADGE[x["grade"]], x["workstream"]))
        A("")

    # ------------------------------------------------------------- closing ---
    A("## 6. Scope and limits")
    A("")
    A("**Grading is a planning judgement.** Each grade here is this register's reading of the")
    A("Minor, Major, Category 4, 5 and 6 tables in the June 2025 booklet. Those tables are")
    A("explicitly non-exhaustive and subject to auditor discretion. Use the grade to sequence")
    A("work, not to predict an outcome.")
    A("")
    A("**Policies issued separately.** Several clauses reference NEXT policies that sit outside")
    A("the auditing standards: the Child Remediation Programme, Migrant Labour Policy, Agency")
    A("Labour Policy, Shared Premises Policy, Chemical Management Manual and the Effective")
    A("Grievance Mechanism Policy. These are on the NEXT supplier extranet. Section 10 covers")
    A("their adoption, but the documents themselves are needed before a mock audit.")
    A("")
    A("**Local law still governs.** Where the Bangladesh Labour Act 2006, its 2015 Rules, or a")
    A("collective agreement affords greater protection than this register states, the local")
    A("instrument applies. Several clauses are written as \"where required by law\" precisely")
    A("because the threshold is set locally, not by NEXT.")
    A("")
    A("**This is a preparation tool.** It does not replace a NEXT audit, an accredited")
    A("third-party audit, or professional legal advice on labour compliance.")
    A("")
    A("---")
    A("")
    A("Source: NEXT plc Supplier Auditing Standards, June 2025 · nextplc.co.uk  ")
    A("Generated from `data/seed_data.json` by `engine/build_register_md.py`  ")
    A("")
    A("Credit partner: **Industry Compliance & Sustainability Platform**  ")
    A("Technology partner: **guulba — technology for better performance**")
    A("")
    return "\n".join(L)


if __name__ == "__main__":
    with open(SEED, encoding="utf-8") as f:
        board = json.load(f)
    md = build(board)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(md)
    print("written : %s" % OUT)
    print("clauses : %d" % len(board["items"]))
    print("size    : %.1f KB" % (len(md.encode("utf-8")) / 1024))
