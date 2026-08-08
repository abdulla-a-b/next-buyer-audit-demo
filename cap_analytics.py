#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
cap_analytics.py — analytics and reporting over the corrective action plan.

The board develops the CAP; this reads a board export and answers the questions
management and the auditor actually ask:

  Are the zero-tolerance findings closed?
  Are we fixing instances or fixing systems?
  Which department is carrying the load, and which is slipping?
  When a CAP was closed, did the fix hold?

Usage:
    python3 engine/cap_analytics.py summary       board.json
    python3 engine/cap_analytics.py quality       board.json
    python3 engine/cap_analytics.py rootcause     board.json
    python3 engine/cap_analytics.py ageing        board.json
    python3 engine/cap_analytics.py effectiveness board.json
    python3 engine/cap_analytics.py forecast      board.json
    python3 engine/cap_analytics.py report        board.json --out build/cap-report.md
    python3 engine/cap_analytics.py export        board.json --out build/cap.csv

`gate` exits 2 while any zero-tolerance CAP is open, so it can fail a job.

Credit partner    : Industry Compliance & Sustainability Platform
Technology partner: guulba — technology for better performance
"""

import json, sys, csv, argparse, datetime, signal, statistics
from collections import Counter, defaultdict

GRADE_WEIGHT = {"MINOR": 1, "MAJOR": 3, "CAT 4": 5, "CAT 5": 8, "CAT 6": 13}
GRADE_ORDER = ["CAT 6", "CAT 5", "CAT 4", "MAJOR", "MINOR"]
ZERO_TOLERANCE = ("CAT 5", "CAT 6")
CLOSED = "Closed"


# --------------------------------------------------------------------- io --
def load(path):
    with open(path, encoding="utf-8") as f:
        board = json.load(f)
    board.setdefault("caps", [])
    return board


def today():
    return datetime.date.today()


def parse(s):
    try:
        return datetime.date.fromisoformat(s) if s else None
    except ValueError:
        return None


def target(c):
    return c.get("revisedTargetDate") or c.get("targetDate") or ""


def is_closed(c):
    return c.get("status") == CLOSED


def weight(c):
    return GRADE_WEIGHT.get(c.get("grade"), 1)


def blank(c, field):
    return not str(c.get(field) or "").strip()


def slip_days(c):
    """Days late. Against completion once closed, against today while open."""
    t = parse(target(c))
    if not t:
        return None
    if is_closed(c):
        done = parse(c.get("completedDate"))
        return None if not done else max(0, (done - t).days)
    return max(0, (today() - t).days)


# ---------------------------------------------------------------- summary --
def summary(board):
    caps = board["caps"]
    if not caps:
        return {"caps": 0, "note": "No CAPs raised yet."}
    w_all = sum(weight(c) for c in caps)
    w_closed = sum(weight(c) for c in caps if is_closed(c))
    closed_dated = [c for c in caps if is_closed(c) and c.get("completedDate") and target(c)]
    on_time = [c for c in closed_dated if (slip_days(c) or 0) == 0]
    late = [s for s in (slip_days(c) for c in closed_dated) if s]
    assessed = [c for c in caps if is_closed(c)
                and c.get("effectiveness") not in (None, "", "Not assessed")]
    return {
        "caps": len(caps),
        "open": sum(1 for c in caps if not is_closed(c)),
        "closed": sum(1 for c in caps if is_closed(c)),
        "completion": round(w_closed / w_all * 100, 1) if w_all else 0.0,
        "weight_total": w_all,
        "by_grade": {g: sum(1 for c in caps if c.get("grade") == g) for g in GRADE_ORDER},
        "open_by_grade": {g: sum(1 for c in caps
                                 if c.get("grade") == g and not is_closed(c)) for g in GRADE_ORDER},
        "zero_tolerance_open": sum(1 for c in caps
                                   if c.get("grade") in ZERO_TOLERANCE and not is_closed(c)),
        "overdue": sum(1 for c in caps if not is_closed(c) and (slip_days(c) or 0) > 0),
        "awaiting_verification": sum(1 for c in caps if c.get("status") == "Awaiting verification"),
        "draft": sum(1 for c in caps if c.get("status") == "Draft"),
        "on_time_pct": round(len(on_time) / len(closed_dated) * 100, 1) if closed_dated else None,
        "avg_slip_days": round(statistics.mean(late), 1) if late else 0.0,
        "rescheduled": sum(1 for c in caps if c.get("revisedTargetDate")),
        "effectiveness_reviewed": len(assessed),
        "effective": sum(1 for c in assessed if c.get("effectiveness") == "Effective"),
        "not_effective": sum(1 for c in assessed if c.get("effectiveness") == "Not effective"),
        "cost_total": sum(float(c.get("cost") or 0) for c in caps),
    }


# ---------------------------------------------------------------- quality --
def quality(board):
    """A CAP that names no root cause and no preventive action is a promise,
    not a plan. NEXT grades a repeat finding harder than a first one."""
    caps = board["caps"]
    defects = []
    for c in caps:
        issues = []
        if blank(c, "finding"):
            issues.append("no finding written")
        if blank(c, "rootCause"):
            issues.append("no root cause")
        elif blank(c, "rootCauseCategory"):
            issues.append("root cause not categorised")
        if blank(c, "correctiveAction"):
            issues.append("no corrective action")
        if blank(c, "preventiveAction"):
            issues.append("no preventive action — fixes the instance, not the recurrence")
        if not target(c):
            issues.append("no target date")
        if is_closed(c):
            if blank(c, "evidenceFiled"):
                issues.append("closed with no evidence filed")
            if blank(c, "verifiedBy"):
                issues.append("closed with no verifier named")
            if blank(c, "verificationMethod"):
                issues.append("closed with no verification method")
        if c.get("grade") in ZERO_TOLERANCE and blank(c, "approve"):
            issues.append("zero-tolerance CAP with no approver")
        if issues:
            defects.append({"id": c.get("id"), "clause": c.get("clauseId"),
                            "grade": c.get("grade"), "issues": issues})
    counts = Counter(i for d in defects for i in d["issues"])
    return {"total": len(caps), "with_defects": len(defects),
            "defects": defects, "by_issue": counts.most_common()}


# -------------------------------------------------------------- rootcause --
def rootcause(board):
    """Where the failures actually come from. A category carrying many CAPs is a
    systemic weakness, not a run of bad luck."""
    caps = board["caps"]
    agg = defaultdict(lambda: {"caps": 0, "weight": 0, "open": 0, "zero_tol": 0, "examples": []})
    for c in caps:
        k = c.get("rootCauseCategory") or "Not analysed"
        a = agg[k]
        a["caps"] += 1
        a["weight"] += weight(c)
        if not is_closed(c):
            a["open"] += 1
        if c.get("grade") in ZERO_TOLERANCE:
            a["zero_tol"] += 1
        if len(a["examples"]) < 3 and c.get("finding"):
            a["examples"].append(f'{c.get("id")}: {c["finding"][:70]}')
    rows = [{"category": k, **v} for k, v in agg.items()]
    rows.sort(key=lambda r: -r["weight"])
    return rows


# ----------------------------------------------------------------- ageing --
def ageing(board):
    buckets = [("Not yet due", None), ("1–14 days", 14), ("15–30 days", 30),
               ("31–60 days", 60), ("61–90 days", 90), ("over 90 days", 10 ** 6)]
    out = {b[0]: 0 for b in buckets}
    undated = 0
    for c in board["caps"]:
        if is_closed(c):
            continue
        s = slip_days(c)
        if s is None:
            undated += 1
            continue
        if s == 0:
            out["Not yet due"] += 1
            continue
        for label, cap in buckets[1:]:
            if s <= cap:
                out[label] += 1
                break
    out["No target date"] = undated
    return out


# ---------------------------------------------------------- effectiveness --
def effectiveness(board):
    caps = [c for c in board["caps"] if is_closed(c)]
    reviewed = [c for c in caps if c.get("effectiveness") not in (None, "", "Not assessed")]
    by_cat = Counter(c.get("rootCauseCategory") or "Not analysed"
                     for c in reviewed if c.get("effectiveness") == "Not effective")
    return {
        "closed": len(caps),
        "reviewed": len(reviewed),
        "unreviewed": len(caps) - len(reviewed),
        "breakdown": dict(Counter(c.get("effectiveness") for c in reviewed)),
        "failed_by_cause": by_cat.most_common(),
        "failures": [{"id": c.get("id"), "clause": c.get("clauseId"), "grade": c.get("grade"),
                      "finding": c.get("finding", ""), "note": c.get("effectivenessNote", "")}
                     for c in reviewed if c.get("effectiveness") == "Not effective"],
    }


# --------------------------------------------------------------- forecast --
def forecast(board):
    """Closure rate over the last 8 weeks, projected onto the open weight.
    A projection, not a promise — it assumes the current rate holds."""
    caps = board["caps"]
    closed = [(parse(c.get("completedDate")), weight(c)) for c in caps
              if is_closed(c) and parse(c.get("completedDate"))]
    cutoff = today() - datetime.timedelta(weeks=8)
    recent = [w for dt, w in closed if dt >= cutoff]
    w_open = sum(weight(c) for c in caps if not is_closed(c))
    rate = sum(recent) / 8 if recent else 0
    weeks = round(w_open / rate, 1) if rate else None
    return {
        "open_weight": w_open,
        "weight_closed_8w": sum(recent),
        "weekly_rate": round(rate, 1),
        "weeks_to_clear": weeks,
        "projected_clear_date": (today() + datetime.timedelta(weeks=weeks)).isoformat()
                                if weeks else None,
        "zero_tolerance_open": sum(1 for c in caps
                                   if c.get("grade") in ZERO_TOLERANCE and not is_closed(c)),
    }


# ------------------------------------------------------------- department --
def by_department(board):
    agg = defaultdict(lambda: {"caps": 0, "closed": 0, "overdue": 0, "zero_tol": 0,
                               "w": 0, "wc": 0, "no_preventive": 0})
    for c in board["caps"]:
        k = c.get("responsible") or "Unassigned"
        a = agg[k]
        a["caps"] += 1
        a["w"] += weight(c)
        if is_closed(c):
            a["closed"] += 1
            a["wc"] += weight(c)
        else:
            if (slip_days(c) or 0) > 0:
                a["overdue"] += 1
            if blank(c, "preventiveAction"):
                a["no_preventive"] += 1
            if c.get("grade") in ZERO_TOLERANCE:
                a["zero_tol"] += 1
    rows = []
    for k, a in agg.items():
        closure = a["wc"] / a["w"] * 100 if a["w"] else 0
        rows.append({"responsible": k, **a, "closure": round(closure, 1),
                     "score": round(max(0.0, closure - a["overdue"] * 4 - a["zero_tol"] * 7), 1)})
    return sorted(rows, key=lambda r: -r["score"])


# ------------------------------------------------------------------ gate ---
def gate(board):
    blockers = [c for c in board["caps"]
                if c.get("grade") in ZERO_TOLERANCE and not is_closed(c)]
    blockers.sort(key=lambda c: (-GRADE_WEIGHT.get(c.get("grade"), 0),
                                 -(slip_days(c) or 0), c.get("id", "")))
    return {"clear": not blockers, "count": len(blockers), "blockers": blockers}


# ---------------------------------------------------------------- report ---
def report_md(board):
    s = summary(board)
    L, A = [], None
    A = L.append
    A("# Corrective Action Plan — status report")
    A("")
    A(f"**Standard** {board['meta']['standard']}, {board['meta']['issued']}  ")
    A(f"**Report date** {today().isoformat()}")
    A("")
    if not board["caps"]:
        A("No corrective action plans have been raised yet. Raise one per open finding "
          "from the CAP view on the board, starting with the zero-tolerance clauses.")
        return "\n".join(L)

    g = gate(board)
    A("## Headline")
    A("")
    A(f"**{s['completion']}% of the plan is closed** by severity weight — "
      f"{s['closed']} of {s['caps']} CAPs verified and shut.")
    A("")
    if g["clear"]:
        A("**Zero-tolerance gate: CLEAR.** Every Category 5 and 6 finding has a closed, "
          "verified corrective action.")
    else:
        A(f"**Zero-tolerance gate: BLOCKED.** {g['count']} Category 5 and 6 CAPs are still open. "
          "These are the only findings that stop the order.")
    A("")
    A("| Measure | Value |")
    A("|---|---|")
    A(f"| CAP completion (weighted) | {s['completion']}% |")
    A(f"| Open / closed | {s['open']} / {s['closed']} |")
    A(f"| Zero-tolerance open | {s['zero_tolerance_open']} |")
    A(f"| Overdue | {s['overdue']} |")
    A(f"| Awaiting verification | {s['awaiting_verification']} |")
    A(f"| Still in draft | {s['draft']} |")
    A(f"| On-time closure | {s['on_time_pct'] if s['on_time_pct'] is not None else '—'}% |")
    A(f"| Average slip | {s['avg_slip_days']} days |")
    A(f"| Rescheduled at least once | {s['rescheduled']} |")
    A(f"| Effectiveness reviewed | {s['effectiveness_reviewed']} "
      f"({s['effective']} effective, {s['not_effective']} not) |")
    A(f"| Recorded cost | {s['cost_total']:,.0f} |")
    A("")

    q = quality(board)
    A("## Plan quality")
    A("")
    if q["with_defects"]:
        A(f"{q['with_defects']} of {q['total']} CAPs have a gap that would not survive a "
          "follow-up audit.")
        A("")
        A("| Defect | CAPs |")
        A("|---|---|")
        for issue, n in q["by_issue"]:
            A(f"| {issue} | {n} |")
        A("")
        A("A corrective action closes the instance. A preventive action stops the recurrence. "
          "NEXT grades a repeat finding harder than a first one, so a CAP without a preventive "
          "action is a deferred cost, not a saving.")
    else:
        A("Every CAP names a finding, a root cause, a corrective action, a preventive action "
          "and a target date. Closed CAPs carry evidence, a verifier and a method.")
    A("")

    rc = rootcause(board)
    A("## Where the failures come from")
    A("")
    A("| Root cause category | CAPs | Open | Zero-tolerance | Weight |")
    A("|---|---:|---:|---:|---:|")
    for r in rc:
        A(f"| {r['category']} | {r['caps']} | {r['open']} | {r['zero_tol']} | {r['weight']} |")
    A("")
    top = next((r for r in rc if r["category"] != "Not analysed"), None)
    if top:
        A(f"The heaviest category is **{top['category']}** at {top['weight']} weight across "
          f"{top['caps']} CAPs. A category carrying that much is a systemic weakness — closing "
          "its CAPs one at a time will keep producing new ones.")
    A("")

    A("## Ageing of open CAPs")
    A("")
    A("| Days past target | CAPs |")
    A("|---|---:|")
    for k, v in ageing(board).items():
        A(f"| {k} | {v} |")
    A("")

    e = effectiveness(board)
    A("## Did the fixes hold")
    A("")
    if e["reviewed"]:
        A(f"{e['reviewed']} of {e['closed']} closed CAPs have had an effectiveness review.")
        A("")
        for k, v in e["breakdown"].items():
            A(f"- {k}: {v}")
        A("")
        if e["failures"]:
            A("Failed to hold:")
            A("")
            A("| CAP | Clause | Grade | Finding |")
            A("|---|---|---|---|")
            for f in e["failures"]:
                A(f"| {f['id']} | {f['clause']} | {f['grade']} | {f['finding'][:70]} |")
            A("")
            A("Raise a fresh CAP for each of these rather than reopening the old one — the "
              "audit trail of a failed fix is itself evidence that the system needs changing.")
    else:
        A(f"None of the {e['closed']} closed CAPs has been reviewed for effectiveness. "
          "A closure that has not been re-checked is a claim, not a result.")
    A("")

    A("## Department scorecard")
    A("")
    A("Score = weighted closure, less 4 points per overdue CAP and 7 per open zero-tolerance CAP.")
    A("")
    A("| Responsible | CAPs | Closed | Overdue | Zero-tol open | No preventive | Score |")
    A("|---|---:|---:|---:|---:|---:|---:|")
    for r in by_department(board):
        A(f"| {r['responsible']} | {r['caps']} | {r['closed']} | {r['overdue']} | "
          f"{r['zero_tol']} | {r['no_preventive']} | {r['score']} |")
    A("")

    f = forecast(board)
    A("## Forecast")
    A("")
    if f["weekly_rate"]:
        A(f"Over the last eight weeks the site has closed **{f['weekly_rate']} weight per week**. "
          f"At that rate the remaining {f['open_weight']} weight clears in about "
          f"**{f['weeks_to_clear']} weeks**, around **{f['projected_clear_date']}**.")
        A("")
        A("That assumes the current rate holds and that no new findings are raised. Both "
          "assumptions usually fail, so treat it as the optimistic bound.")
    else:
        A("No CAP has been closed in the last eight weeks, so there is no rate to project from.")
    A("")
    A("---")
    A("")
    A(f"Credit partner: {board['meta'].get('creditPartner','Industry Compliance & Sustainability Platform')}  ")
    A(f"Technology partner: {board['meta'].get('technologyPartner','guulba — technology for better performance')}")
    return "\n".join(L)


CSV_COLS = ["id", "clauseId", "grade", "source", "raisedOn", "finding", "instances",
            "rootCauseCategory", "rootCause", "containment", "correctiveAction",
            "preventiveAction", "owner", "responsible", "approve", "targetDate",
            "revisedTargetDate", "completedDate", "status", "progress", "cost",
            "verifiedBy", "verificationMethod", "verifiedOn", "evidenceFiled",
            "effectiveness", "effectivenessDate", "effectivenessNote", "lastUpdated"]


def main():
    ap = argparse.ArgumentParser(description="NEXT COP corrective action plan analytics")
    ap.add_argument("command", choices=["summary", "quality", "rootcause", "ageing",
                                        "effectiveness", "forecast", "departments",
                                        "gate", "report", "export"])
    ap.add_argument("path")
    ap.add_argument("--out")
    a = ap.parse_args()
    board = load(a.path)
    dump = lambda o: print(json.dumps(o, indent=2, ensure_ascii=False, default=str))

    if a.command == "summary":
        dump(summary(board))
    elif a.command == "rootcause":
        dump(rootcause(board))
    elif a.command == "ageing":
        dump(ageing(board))
    elif a.command == "effectiveness":
        dump(effectiveness(board))
    elif a.command == "forecast":
        dump(forecast(board))
    elif a.command == "departments":
        dump(by_department(board))
    elif a.command == "quality":
        q = quality(board)
        print(f"{q['with_defects']} of {q['total']} CAPs have plan defects\n")
        for issue, n in q["by_issue"]:
            print(f"  {n:>4}  {issue}")
        if q["defects"]:
            print("\nFirst 20:")
            for dfc in q["defects"][:20]:
                print(f"  {dfc['id']}  {dfc['grade']:<6} {'; '.join(dfc['issues'])}")
    elif a.command == "gate":
        g = gate(board)
        print("CAP GATE CLEAR" if g["clear"]
              else f"CAP GATE BLOCKED — {g['count']} zero-tolerance CAPs open")
        for c in g["blockers"][:50]:
            s = slip_days(c)
            print(f"  {c.get('grade'):<6} {c.get('id')}  {str(c.get('finding',''))[:60]:<62}"
                  f" {c.get('responsible','unassigned')}"
                  + (f"  ({s}d late)" if s else ""))
        sys.exit(0 if g["clear"] else 2)
    elif a.command == "report":
        md = report_md(board)
        if a.out:
            with open(a.out, "w", encoding="utf-8") as f:
                f.write(md)
            print(f"report written to {a.out}")
        else:
            print(md)
    elif a.command == "export":
        out = a.out or "cap.csv"
        with open(out, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=CSV_COLS, extrasaction="ignore")
            w.writeheader()
            for c in board["caps"]:
                w.writerow({k: str(c.get(k, "")).replace("\n", " / ") for k in CSV_COLS})
        print(f"{len(board['caps'])} CAPs written to {out}")


if __name__ == "__main__":
    try:
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    except (AttributeError, ValueError):
        pass
    main()
