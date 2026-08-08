#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tests for cap_analytics.

Run from the repository root:
    python3 -m unittest discover -s engine/tests -t . -v
"""

import unittest, datetime, sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import cap_analytics as ca


def iso(delta_days):
    return (datetime.date.today() + datetime.timedelta(days=delta_days)).isoformat()


def cap(**kw):
    base = dict(
        id="CAP-001", clauseId="NX-001", grade="MAJOR", source="Internal gap assessment",
        raisedOn=iso(-60), finding="Control not evidenced", instances=1,
        rootCause="A system gap", rootCauseCategory="Management system",
        containment="", correctiveAction="Fixed on site",
        preventiveAction="Added to the PM checklist",
        owner="Head", responsible="Manager", approve="MD",
        targetDate=iso(30), revisedTargetDate="", completedDate="",
        status="Open", progress=0, cost=0,
        verifiedBy="", verificationMethod="", verifiedOn="", evidenceFiled="",
        effectiveness="Not assessed", effectivenessDate="", effectivenessNote="",
        lastUpdated=iso(0), updateNote="",
    )
    base.update(kw)
    return base


def board(caps):
    return {"meta": {"standard": "test", "issued": "June 2025",
                     "creditPartner": "ICSP", "technologyPartner": "guulba"},
            "sections": [], "items": [], "tasks": [], "caps": caps}


class TestSummary(unittest.TestCase):
    def test_empty_board_is_reported_not_crashed(self):
        self.assertEqual(ca.summary(board([]))["caps"], 0)

    def test_completion_is_severity_weighted(self):
        """Closing one Cat 6 must move the number more than closing one Minor."""
        heavy = board([cap(id="A", grade="CAT 6", status="Closed", completedDate=iso(-1)),
                       cap(id="B", grade="MINOR")])
        light = board([cap(id="A", grade="CAT 6"),
                       cap(id="B", grade="MINOR", status="Closed", completedDate=iso(-1))])
        self.assertAlmostEqual(ca.summary(heavy)["completion"], 92.9, places=1)
        self.assertAlmostEqual(ca.summary(light)["completion"], 7.1, places=1)

    def test_revised_target_overrides_the_original(self):
        b = board([cap(targetDate=iso(-30), revisedTargetDate=iso(30))])
        self.assertEqual(ca.summary(b)["overdue"], 0)
        b["caps"][0]["revisedTargetDate"] = iso(-1)
        self.assertEqual(ca.summary(b)["overdue"], 1)

    def test_closed_caps_are_never_overdue(self):
        b = board([cap(targetDate=iso(-90), status="Closed", completedDate=iso(-1))])
        self.assertEqual(ca.summary(b)["overdue"], 0)

    def test_slip_measures_completion_against_target_once_closed(self):
        c = cap(targetDate="2026-01-10", status="Closed", completedDate="2026-01-20")
        self.assertEqual(ca.slip_days(c), 10)
        c["completedDate"] = "2026-01-05"
        self.assertEqual(ca.slip_days(c), 0)

    def test_on_time_is_none_with_nothing_closed(self):
        self.assertIsNone(ca.summary(board([cap()]))["on_time_pct"])


class TestQuality(unittest.TestCase):
    def test_complete_cap_has_no_defects(self):
        self.assertEqual(ca.quality(board([cap()]))["with_defects"], 0)

    def test_missing_preventive_action_is_flagged(self):
        q = ca.quality(board([cap(preventiveAction="")]))
        self.assertEqual(q["with_defects"], 1)
        self.assertTrue(any("preventive" in i for i in q["defects"][0]["issues"]))

    def test_closure_without_evidence_or_verifier_is_flagged(self):
        q = ca.quality(board([cap(status="Closed", completedDate=iso(-1))]))
        issues = q["defects"][0]["issues"]
        self.assertIn("closed with no evidence filed", issues)
        self.assertIn("closed with no verifier named", issues)

    def test_zero_tolerance_cap_needs_an_approver(self):
        q = ca.quality(board([cap(grade="CAT 6", approve="")]))
        self.assertTrue(any("no approver" in i for i in q["defects"][0]["issues"]))

    def test_uncategorised_root_cause_is_flagged_separately(self):
        q = ca.quality(board([cap(rootCauseCategory="")]))
        self.assertIn("root cause not categorised", q["defects"][0]["issues"])


class TestGate(unittest.TestCase):
    def test_only_cat5_and_cat6_block(self):
        for grade, blocked in [("CAT 6", True), ("CAT 5", True),
                               ("CAT 4", False), ("MAJOR", False), ("MINOR", False)]:
            self.assertEqual(ca.gate(board([cap(grade=grade)]))["clear"], not blocked, grade)

    def test_gate_clears_when_zero_tolerance_caps_close(self):
        b = board([cap(grade="CAT 6")])
        self.assertFalse(ca.gate(b)["clear"])
        b["caps"][0]["status"] = "Closed"
        self.assertTrue(ca.gate(b)["clear"])

    def test_blockers_lead_with_cat6(self):
        b = board([cap(id="A", grade="CAT 5"), cap(id="B", grade="CAT 6")])
        self.assertEqual([c["id"] for c in ca.gate(b)["blockers"]], ["B", "A"])


class TestAnalysis(unittest.TestCase):
    def test_rootcause_groups_and_ranks_by_weight(self):
        rows = ca.rootcause(board([
            cap(id="A", grade="CAT 6", rootCauseCategory="Management system"),
            cap(id="B", grade="MINOR", rootCauseCategory="Method / procedure"),
            cap(id="C", grade="CAT 5", rootCauseCategory="Management system"),
        ]))
        self.assertEqual(rows[0]["category"], "Management system")
        self.assertEqual(rows[0]["weight"], 21)
        self.assertEqual(rows[0]["caps"], 2)

    def test_uncategorised_caps_land_in_not_analysed(self):
        rows = ca.rootcause(board([cap(rootCauseCategory="")]))
        self.assertEqual(rows[0]["category"], "Not analysed")

    def test_ageing_buckets_by_days_past_target(self):
        a = ca.ageing(board([cap(id="A", targetDate=iso(-5)),
                             cap(id="B", targetDate=iso(-45)),
                             cap(id="C", targetDate=iso(10)),
                             cap(id="D", targetDate="")]))
        self.assertEqual(a["1–14 days"], 1)
        self.assertEqual(a["31–60 days"], 1)
        self.assertEqual(a["Not yet due"], 1)
        self.assertEqual(a["No target date"], 1)

    def test_effectiveness_separates_reviewed_from_closed(self):
        e = ca.effectiveness(board([
            cap(id="A", status="Closed", completedDate=iso(-1), effectiveness="Effective"),
            cap(id="B", status="Closed", completedDate=iso(-1), effectiveness="Not assessed"),
            cap(id="C", status="Closed", completedDate=iso(-1), effectiveness="Not effective"),
        ]))
        self.assertEqual(e["closed"], 3)
        self.assertEqual(e["reviewed"], 2)
        self.assertEqual(e["unreviewed"], 1)
        self.assertEqual(len(e["failures"]), 1)

    def test_forecast_is_none_when_nothing_closed_recently(self):
        f = ca.forecast(board([cap(grade="CAT 6")]))
        self.assertEqual(f["weekly_rate"], 0)
        self.assertIsNone(f["weeks_to_clear"])

    def test_forecast_projects_from_the_last_eight_weeks(self):
        b = board([cap(id="A", grade="CAT 6", status="Closed", completedDate=iso(-7)),
                   cap(id="B", grade="CAT 6")])
        f = ca.forecast(b)
        self.assertEqual(f["open_weight"], 13)
        self.assertGreater(f["weekly_rate"], 0)
        self.assertIsNotNone(f["projected_clear_date"])

    def test_department_score_penalises_overdue_and_zero_tolerance(self):
        clean = board([cap(responsible="X", status="Closed", completedDate=iso(-1))])
        dirty = board([cap(id="A", responsible="X", status="Closed", completedDate=iso(-1)),
                       cap(id="B", responsible="X", grade="CAT 6", targetDate=iso(-9))])
        self.assertEqual(ca.by_department(clean)[0]["score"], 100.0)
        self.assertLess(ca.by_department(dirty)[0]["score"], 40.0)


class TestReport(unittest.TestCase):
    def test_report_handles_an_empty_plan(self):
        md = ca.report_md(board([]))
        self.assertIn("No corrective action plans have been raised", md)

    def test_report_names_the_gate_and_echoes_the_boards_partners(self):
        b = board([cap(grade="CAT 6"), cap(id="B", grade="MAJOR")])
        md = ca.report_md(b)
        self.assertIn("Zero-tolerance gate: BLOCKED", md)
        self.assertIn(b["meta"]["creditPartner"], md)
        self.assertIn(b["meta"]["technologyPartner"], md)

    def test_report_falls_back_to_the_default_partners(self):
        b = board([cap(grade="MAJOR")])
        b["meta"].pop("creditPartner")
        b["meta"].pop("technologyPartner")
        md = ca.report_md(b)
        self.assertIn("Industry Compliance & Sustainability Platform", md)
        self.assertIn("guulba", md)

    def test_report_reports_a_clear_gate(self):
        md = ca.report_md(board([cap(grade="MAJOR")]))
        self.assertIn("Zero-tolerance gate: CLEAR", md)


if __name__ == "__main__":
    unittest.main(verbosity=2)
