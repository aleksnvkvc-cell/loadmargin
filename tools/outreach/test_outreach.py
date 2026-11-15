"""Run: python3 -m unittest tools/outreach/test_outreach.py  (from the repo root)"""
import contextlib
import csv
import io
import os
import re
import shutil
import sys
import tempfile
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import outreach  # noqa: E402
from templates import TEMPLATES  # noqa: E402

TODAY = "2026-11-15"


class OutreachTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.mkdtemp()
        self.run_cmd("init")
        shutil.copy(os.path.join(HERE, "sample-prospects.csv"), os.path.join(self.dir, "prospects.csv"))
        ini = os.path.join(self.dir, "outreach.ini")
        with open(ini, encoding="utf-8") as f:
            text = f.read()
        with open(ini, "w", encoding="utf-8") as f:
            f.write(text.replace("postal_address =", "postal_address = 1 Example St, Testville"))
        with open(os.path.join(self.dir, "do-not-contact.txt"), "a", encoding="utf-8") as f:
            f.write("lee@example.com\n")

    def tearDown(self):
        shutil.rmtree(self.dir)

    def run_cmd(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = outreach.main(["--dir", self.dir, "--today", TODAY] + list(argv))
        return code, out.getvalue() + err.getvalue()

    def rows(self):
        with open(os.path.join(self.dir, "prospects.csv"), newline="", encoding="utf-8") as f:
            return {r["id"]: r for r in csv.DictReader(f)}

    def drafts_text(self):
        with open(os.path.join(self.dir, "drafts", TODAY, "drafts.txt"), encoding="utf-8") as f:
            return f.read()

    def test_drafts_written_and_status_tracked(self):
        code, out = self.run_cmd("drafts")
        self.assertEqual(code, 0, out)
        rows = self.rows()
        self.assertEqual(rows["P001"]["status"], "drafted")
        self.assertEqual(rows["P003"]["template"], "broker_tools")
        self.assertEqual(rows["P005"]["status"], "do-not-contact")   # suppressed, no draft
        self.assertEqual(rows["P006"]["status"], "new")              # no email
        text = self.drafts_text()
        self.assertIn("To: maria@example.com", text)
        self.assertNotIn("lee@example.com", text)
        self.assertIn("FOLLOW-UP", text)                             # P004 was due 2026-11-06
        self.assertIn("Following up: Quick question", text)
        self.assertTrue(os.path.exists(os.path.join(self.dir, "drafts", TODAY, "drafts.html")))

    def test_every_draft_has_opt_out_and_address(self):
        self.run_cmd("drafts")
        for block in self.drafts_text().split("=" * 60)[1:]:
            self.assertIn('reply "stop"', block)
            self.assertIn("1 Example St, Testville", block)

    def test_personalization_and_missing_lane(self):
        self.run_cmd("drafts")
        text = self.drafts_text()
        self.assertIn("Hi Maria,", text)
        self.assertIn("Hi John,", text)                              # JOHN SMITH -> John
        self.assertIn("Example Hauling LLC", text)
        self.assertNotIn("{", text)
        # P002 has no lane: the "I saw you run" line is dropped, not left half-filled
        p002 = [b for b in text.split("=" * 60) if "dispatch@example.net" in b][0]
        self.assertNotIn("I saw you run", p002)

    def test_no_address_refuses(self):
        os.remove(os.path.join(self.dir, "outreach.ini"))
        code, out = self.run_cmd("drafts")
        self.assertEqual(code, 2)
        self.assertIn("postal_address", out)

    def test_cap(self):
        self.run_cmd("drafts", "--cap", "1")
        rows = self.rows()
        drafted = [r for r in rows.values() if r["status"] == "drafted"]
        self.assertEqual(len(drafted), 1)

    def test_mark_sent_then_one_follow_up_only(self):
        self.run_cmd("drafts")
        code, out = self.run_cmd("mark", "P001", "P002", "sent")
        self.assertEqual(code, 0, out)
        r = self.rows()["P001"]
        self.assertEqual((r["status"], r["touches"], r["last_contacted"], r["next_follow_up"]),
                         ("sent", "1", TODAY, "2026-11-20"))
        self.run_cmd("mark", "P001", "sent")                         # follow-up sent: touch 2 of 2
        self.assertEqual(self.rows()["P001"]["next_follow_up"], "")

    def test_mark_do_not_contact_adds_to_list(self):
        self.run_cmd("mark", "P002", "do-not-contact", "--note", "asked to stop")
        with open(os.path.join(self.dir, "do-not-contact.txt"), encoding="utf-8") as f:
            self.assertIn("dispatch@example.net", f.read())
        r = self.rows()["P002"]
        self.assertIn("asked to stop", r["notes"])
        code, _ = self.run_cmd("mark", "P002", "replied", "--next", "bad")
        self.assertEqual(code, 2)

    def test_due_and_report(self):
        self.run_cmd("mark", "P003", "call", "--next", "2026-11-14")
        _, out = self.run_cmd("due")
        self.assertIn("P004", out)
        self.assertIn("P003", out)
        self.assertIn("by hand", out)
        _, out = self.run_cmd("report")
        self.assertIn("6 prospects", out)

    def test_check_flags_problems(self):
        code, out = self.run_cmd("check")
        self.assertEqual(code, 1)
        self.assertIn("P006: no email", out)
        self.assertIn("P005: on the do-not-contact list", out)

    def test_dry_run_changes_nothing(self):
        before = self.rows()
        self.run_cmd("drafts", "--dry-run")
        self.assertEqual(before, self.rows())

    def test_templates_have_no_banned_claims(self):
        banned = re.compile(r"money back|guarantee|clients|customers|testimonial|saved \$|\$\d+ diesel|diesel (is |at |over )",
                            re.I)
        allowed_prices = {"$49", "$99", "$199", "$249", "$349"}
        for key, t in TEMPLATES.items():
            text = t["subject"] + "\n" + t["body"]
            self.assertIsNone(banned.search(text), key)
            for price in re.findall(r"\$\d+", text):
                self.assertIn(price, allowed_prices, key)


if __name__ == "__main__":
    unittest.main()
