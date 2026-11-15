#!/usr/bin/env python3
"""LoadMargin outreach helper: drafts emails from a prospect CSV and tracks status.

It never sends anything. It writes drafts you read, then open in Gmail and send yourself.
Lead data stays outside the public repo (default: /mnt/project-files/outreach/).

Usage (see README.md):
  python3 outreach.py init
  python3 outreach.py drafts
  python3 outreach.py mark P001 sent
  python3 outreach.py due
  python3 outreach.py report
  python3 outreach.py check
"""
import argparse
import configparser
import csv
import datetime as dt
import html
import os
import re
import sys
import tempfile
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from templates import DEFAULT_FOR_TYPE, TEMPLATES  # noqa: E402

DEFAULT_DIR = os.environ.get("LM_OUTREACH_DIR", "/mnt/project-files/outreach")
COLUMNS = ["id", "company", "contact", "email", "type", "lane", "source", "status",
           "template", "last_subject", "last_contacted", "touches", "next_follow_up", "notes"]
STATUSES = ["new", "drafted", "sent", "replied", "call", "won", "lost", "do-not-contact"]
CLOSED = {"won", "lost", "do-not-contact"}
EMAIL_RE = re.compile(r"^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$", re.I)
OPT_OUT = 'If you\'d rather not hear from me, reply "stop" and I won\'t email again.'
CONFIG_TEMPLATE = """[sender]
# Your name as it should appear under each email.
name = Aleksandar Novakovic
# A real postal address is required in every commercial email (CAN-SPAM). Drafts are refused until it is set.
postal_address =

[limits]
# New first-touch drafts per run. Keep cold email from Gmail low to stay out of spam.
daily_cap = 20
# Days after a send before the follow-up is due.
follow_up_days = 5
# Total emails per prospect, first touch included. 2 = one follow-up, then stop.
max_touches = 2
"""


class OutreachError(Exception):
    pass


# ---------- files ----------

def paths(data_dir):
    return {
        "csv": os.path.join(data_dir, "prospects.csv"),
        "config": os.path.join(data_dir, "outreach.ini"),
        "dnc": os.path.join(data_dir, "do-not-contact.txt"),
        "drafts": os.path.join(data_dir, "drafts"),
    }


def load_config(p):
    cfg = configparser.ConfigParser()
    cfg.read_string(CONFIG_TEMPLATE)
    if os.path.exists(p["config"]):
        cfg.read(p["config"], encoding="utf-8")
    return {
        "name": cfg.get("sender", "name").strip(),
        "address": cfg.get("sender", "postal_address").strip(),
        "cap": cfg.getint("limits", "daily_cap"),
        "follow_up_days": cfg.getint("limits", "follow_up_days"),
        "max_touches": cfg.getint("limits", "max_touches"),
    }


def load_dnc(p):
    """Emails or @domains that must never get a draft. One per line, # for comments."""
    out = set()
    if os.path.exists(p["dnc"]):
        with open(p["dnc"], encoding="utf-8") as f:
            for line in f:
                line = line.split("#", 1)[0].strip().lower()
                if line:
                    out.add(line)
    return out


def blocked(email, dnc):
    email = (email or "").strip().lower()
    if not email:
        return False
    return email in dnc or ("@" + email.split("@", 1)[-1]) in dnc


def add_dnc(p, email):
    email = (email or "").strip().lower()
    if not email or email in load_dnc(p):
        return
    with open(p["dnc"], "a", encoding="utf-8") as f:
        f.write(email + "\n")


def read_rows(p):
    if not os.path.exists(p["csv"]):
        raise OutreachError("No prospect list at %s. Run: python3 outreach.py init" % p["csv"])
    with open(p["csv"], newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fields = [h.strip() for h in (reader.fieldnames or [])]
        rows = []
        for r in reader:
            row = {(k or "").strip(): (v or "").strip() for k, v in r.items() if k is not None}
            if any(row.values()):
                rows.append(row)
    extra = [h for h in fields if h and h not in COLUMNS]
    for r in rows:
        for c in COLUMNS:
            r.setdefault(c, "")
        r["status"] = (r["status"] or "new").lower()
        r["type"] = (r["type"] or "carrier").lower()
        r["email"] = r["email"].lower()
    assign_ids(rows)
    return rows, COLUMNS + extra


def assign_ids(rows):
    used = {r["id"] for r in rows if r["id"]}
    n = 1
    for r in rows:
        if r["id"]:
            continue
        while "P%03d" % n in used:
            n += 1
        r["id"] = "P%03d" % n
        used.add(r["id"])


def write_rows(p, rows, fields):
    """Write atomically so a crash never leaves a half-written list."""
    d = os.path.dirname(p["csv"]) or "."
    fd, tmp = tempfile.mkstemp(prefix=".prospects-", suffix=".csv", dir=d)
    with os.fdopen(fd, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    os.replace(tmp, p["csv"])


# ---------- composing ----------

def first_name(contact):
    parts = re.split(r"[\s,]+", (contact or "").strip())
    name = parts[0] if parts and parts[0] else ""
    return name[:1].upper() + name[1:].lower() if name else "there"


def fill(text, values):
    """Fill placeholders; drop any line whose placeholder has no value."""
    out = []
    for line in text.split("\n"):
        keys = re.findall(r"\{(\w+)\}", line)
        if any(k not in values for k in keys):
            raise OutreachError("Unknown placeholder in template: %s" % line)
        if any(not values[k] for k in keys if k != "lane_suffix"):
            continue
        for k in keys:
            line = line.replace("{%s}" % k, values[k])
        out.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip()


def pick_template(row, followup):
    if followup:
        return "followup"
    key = row["template"] or DEFAULT_FOR_TYPE.get(row["type"], "carrier_load")
    if key not in TEMPLATES or key == "followup":
        raise OutreachError("%s: unknown template '%s'. Choose one of: %s"
                            % (row["id"], key, ", ".join(k for k in TEMPLATES if k != "followup")))
    return key


def compose(row, cfg, followup=False):
    key = pick_template(row, followup)
    t = TEMPLATES[key]
    lane = row["lane"]
    values = {
        "first": first_name(row["contact"]),
        "company": row["company"] or "your company",
        "lane": lane,
        "lane_suffix": (" on " + lane) if lane else "",
        "sender": cfg["name"],
        "last_subject": row["last_subject"] or "the free load calculator",
    }
    subject = fill(t["subject"], values) or "LoadMargin"
    body = fill(t["body"], values)
    body += "\n\n--\n" + OPT_OUT + "\n" + cfg["address"]
    return key, subject, body


def gmail_link(to, subject, body):
    q = urllib.parse.urlencode({"view": "cm", "fs": "1", "to": to, "su": subject, "body": body},
                               quote_via=urllib.parse.quote)
    return "https://mail.google.com/mail/?" + q


def mailto_link(to, subject, body):
    return "mailto:%s?%s" % (urllib.parse.quote(to, safe="@"),
                             urllib.parse.urlencode({"subject": subject, "body": body},
                                                    quote_via=urllib.parse.quote))


# ---------- commands ----------

def today_from(args):
    return dt.date.fromisoformat(args.today) if args.today else dt.date.today()


def parse_date(s):
    try:
        return dt.date.fromisoformat(s) if s else None
    except ValueError:
        return None


def cmd_init(args, p):
    os.makedirs(args.dir, exist_ok=True)
    made = []
    if not os.path.exists(p["csv"]):
        with open(p["csv"], "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerow(COLUMNS)
        made.append(p["csv"])
    if not os.path.exists(p["config"]):
        with open(p["config"], "w", encoding="utf-8") as f:
            f.write(CONFIG_TEMPLATE)
        made.append(p["config"])
    if not os.path.exists(p["dnc"]):
        with open(p["dnc"], "w", encoding="utf-8") as f:
            f.write("# Never email these. One address or @domain per line.\n")
        made.append(p["dnc"])
    for m in made:
        print("created", m)
    if not made:
        print("Already set up in", args.dir)
    print("Next: put your postal address in", p["config"])


def problems(rows, dnc):
    out, seen = [], {}
    for r in rows:
        rid = r["id"]
        if r["status"] not in STATUSES:
            out.append("%s: unknown status '%s' (use: %s)" % (rid, r["status"], ", ".join(STATUSES)))
        if r["type"] not in ("carrier", "broker"):
            out.append("%s: type should be carrier or broker, not '%s'" % (rid, r["type"]))
        if r["email"] and not EMAIL_RE.match(r["email"]):
            out.append("%s: email looks wrong: %s" % (rid, r["email"]))
        if not r["email"] and r["status"] not in CLOSED:
            out.append("%s: no email, no draft possible (call instead?)" % rid)
        if r["email"]:
            if r["email"] in seen:
                out.append("%s: same email as %s: %s" % (rid, seen[r["email"]], r["email"]))
            seen.setdefault(r["email"], rid)
        if r["template"] and (r["template"] not in TEMPLATES or r["template"] == "followup"):
            out.append("%s: unknown template '%s'" % (rid, r["template"]))
        if r["next_follow_up"] and not parse_date(r["next_follow_up"]):
            out.append("%s: next_follow_up must be YYYY-MM-DD, got '%s'" % (rid, r["next_follow_up"]))
        if blocked(r["email"], dnc) and r["status"] != "do-not-contact":
            out.append("%s: on the do-not-contact list but status is '%s'" % (rid, r["status"]))
    return out


def cmd_check(args, p):
    rows, _ = read_rows(p)
    cfg = load_config(p)
    issues = problems(rows, load_dnc(p))
    if not cfg["address"]:
        issues.insert(0, "outreach.ini: postal_address is empty (required in every email)")
    for i in issues:
        print("-", i)
    print("OK: no problems found." if not issues else "%d problem(s)." % len(issues))
    return 1 if issues else 0


def cmd_drafts(args, p):
    rows, fields = read_rows(p)
    cfg = load_config(p)
    if not cfg["address"]:
        raise OutreachError("Set postal_address in %s first. CAN-SPAM requires it in every email." % p["config"])
    dnc = load_dnc(p)
    today = today_from(args)
    cap = args.cap if args.cap is not None else cfg["cap"]
    drafts, skipped, first_touch = [], [], 0
    for r in rows:
        if r["status"] in CLOSED or r["status"] in ("replied", "call"):
            continue
        if blocked(r["email"], dnc):
            r["status"] = "do-not-contact"
            r["next_follow_up"] = ""
            skipped.append("%s: on do-not-contact list, status set" % r["id"])
            continue
        if not r["email"] or not EMAIL_RE.match(r["email"]):
            skipped.append("%s: no valid email" % r["id"])
            continue
        touches = int(r["touches"] or 0)
        if r["status"] == "sent":
            due = parse_date(r["next_follow_up"])
            if not due or due > today or touches >= cfg["max_touches"]:
                continue
            followup = True
        else:  # new or drafted
            if first_touch >= cap:
                skipped.append("%s: over today's cap of %d" % (r["id"], cap))
                continue
            first_touch += 1
            followup = False
        key, subject, body = compose(r, cfg, followup)
        drafts.append((r, key, subject, body, followup))
        if not followup:
            r["status"] = "drafted"
            r["template"] = r["template"] or key
        if not args.dry_run:
            r["last_subject"] = r["last_subject"] if followup else subject
    if not args.dry_run:
        write_rows(p, rows, fields)
    out_dir = os.path.join(p["drafts"], today.isoformat())
    if drafts and not args.dry_run:
        os.makedirs(out_dir, exist_ok=True)
        write_draft_files(out_dir, drafts, today)
    for s in skipped:
        print("skip", s)
    print("%d draft(s): %d first email(s), %d follow-up(s)." % (
        len(drafts), sum(1 for d in drafts if not d[4]), sum(1 for d in drafts if d[4])))
    if drafts and not args.dry_run:
        print("Open %s, read each one, send it from Gmail, then mark it:" % os.path.join(out_dir, "drafts.html"))
        print("  python3 outreach.py mark <id> sent")
    if args.dry_run:
        for r, key, subject, body, fu in drafts:
            print("\n=== %s  To: %s  Subject: %s\n%s" % (r["id"], r["email"], subject, body))
    return 0


def write_draft_files(out_dir, drafts, today):
    txt, cards = [], []
    for r, key, subject, body, fu in drafts:
        txt.append("=" * 60 + "\nID: %s   %s\nTo: %s\nSubject: %s\n\n%s\n" % (
            r["id"], "FOLLOW-UP" if fu else "first email", r["email"], subject, body))
        e = html.escape
        cards.append(
            '<section><h2>%s · %s%s</h2><p class="meta">To: %s · template: %s · lane: %s · source: %s</p>'
            '<p><b>Subject:</b> %s</p><pre>%s</pre><p class="acts">'
            '<a class="btn" href="%s" target="_blank" rel="noopener">Open in Gmail</a> '
            '<a class="btn ghost" href="%s">Open in mail app</a></p>'
            '<p class="meta">After you send it: <code>python3 outreach.py mark %s sent</code></p></section>'
            % (e(r["id"]), e(r["company"] or r["contact"] or r["email"]), " · follow-up" if fu else "",
               e(r["email"]), e(key), e(r["lane"] or "-"), e(r["source"] or "-"), e(subject), e(body),
               e(gmail_link(r["email"], subject, body)), e(mailto_link(r["email"], subject, body)), e(r["id"])))
    with open(os.path.join(out_dir, "drafts.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(txt))
    page = """<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Outreach drafts %s</title><style>
body{margin:0;background:#f6f6f4;color:#1b1b1d;font:15px/1.5 system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:20px 16px 60px}
section{background:#fff;border:1px solid #ddd;border-radius:10px;padding:14px 16px;margin:14px 0}
h1{font-size:22px}h2{font-size:17px;margin:0 0 4px}.meta{color:#666;font-size:13px;margin:4px 0}
pre{white-space:pre-wrap;font:14px/1.5 system-ui,sans-serif;background:#fafafa;border:1px solid #eee;border-radius:7px;padding:10px}
.btn{display:inline-block;background:#1b1b1d;color:#fff;border-radius:7px;padding:8px 12px;text-decoration:none;font-weight:600}
.btn.ghost{background:#fff;color:#1b1b1d;border:1px solid #ccc}
</style></head><body><main><h1>Outreach drafts, %s</h1>
<p>Nothing here is sent automatically. Read each email, fix anything that is not true for this person, then send it yourself.</p>
%s</main></body></html>""" % (today, today, "\n".join(cards))
    with open(os.path.join(out_dir, "drafts.html"), "w", encoding="utf-8") as f:
        f.write(page)


def cmd_mark(args, p):
    rows, fields = read_rows(p)
    cfg = load_config(p)
    status = args.status.lower()
    if status not in STATUSES:
        raise OutreachError("Unknown status '%s'. Use one of: %s" % (status, ", ".join(STATUSES)))
    if args.next and not parse_date(args.next):
        raise OutreachError("--next must be a date like 2026-11-20")
    today = today_from(args)
    wanted = {i.upper() for i in args.ids}
    found = [r for r in rows if r["id"].upper() in wanted]
    missing = wanted - {r["id"].upper() for r in found}
    if missing:
        raise OutreachError("No prospect with id: %s" % ", ".join(sorted(missing)))
    for r in found:
        r["status"] = status
        if status == "sent":
            touches = int(r["touches"] or 0) + 1
            r["touches"] = str(touches)
            r["last_contacted"] = today.isoformat()
            r["next_follow_up"] = (today + dt.timedelta(days=cfg["follow_up_days"])).isoformat() \
                if touches < cfg["max_touches"] else ""
        elif status in CLOSED:
            r["next_follow_up"] = ""
        if status in ("replied", "call"):
            r["last_contacted"] = today.isoformat()
            r["next_follow_up"] = ""
        if args.next:
            if status in CLOSED:
                raise OutreachError("A %s prospect has no follow-up date." % status)
            r["next_follow_up"] = args.next
        if args.note:
            r["notes"] = (r["notes"] + " | " if r["notes"] else "") + "%s: %s" % (today, args.note)
        if status == "do-not-contact":
            add_dnc(p, r["email"])
        print("%s %s -> %s%s" % (r["id"], r["company"] or r["email"], status,
                                 ", follow up " + r["next_follow_up"] if r["next_follow_up"] else ""))
    write_rows(p, rows, fields)
    return 0


def cmd_due(args, p):
    rows, _ = read_rows(p)
    today = today_from(args)
    due = [r for r in rows if r["status"] not in CLOSED and parse_date(r["next_follow_up"])
           and parse_date(r["next_follow_up"]) <= today]
    due.sort(key=lambda r: r["next_follow_up"])
    if not due:
        print("Nothing due on or before", today)
    for r in due:
        how = "follow-up draft (run: drafts)" if r["status"] == "sent" else "reply or call by hand"
        print("%s  %s  %-8s %s <%s>  %s" % (r["next_follow_up"], r["id"], r["status"],
                                            r["company"], r["email"], how))
    return 0


def cmd_report(args, p):
    rows, _ = read_rows(p)
    counts = {s: 0 for s in STATUSES}
    for r in rows:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print("%d prospects" % len(rows))
    for s, n in counts.items():
        print("  %-15s %d" % (s, n))
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(description="LoadMargin outreach drafts and tracking. Never sends email.")
    ap.add_argument("--dir", default=DEFAULT_DIR, help="folder with prospects.csv (default %(default)s)")
    ap.add_argument("--today", help=argparse.SUPPRESS)  # fixed date for tests
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init", help="create prospects.csv, outreach.ini and do-not-contact.txt")
    sub.add_parser("check", help="find problems in the list")
    d = sub.add_parser("drafts", help="write today's drafts (first emails up to the cap, plus due follow-ups)")
    d.add_argument("--cap", type=int, help="override daily_cap for this run")
    d.add_argument("--dry-run", action="store_true", help="print drafts, change nothing")
    m = sub.add_parser("mark", help="set status: " + ", ".join(STATUSES))
    m.add_argument("ids", nargs="+", metavar="ID")
    m.add_argument("status")
    m.add_argument("--next", help="next follow-up date, YYYY-MM-DD")
    m.add_argument("--note", help="add a dated note")
    sub.add_parser("due", help="list follow-ups due today or earlier")
    sub.add_parser("report", help="count prospects by status")
    args = ap.parse_args(argv)
    p = paths(args.dir)
    try:
        return {"init": cmd_init, "check": cmd_check, "drafts": cmd_drafts, "mark": cmd_mark,
                "due": cmd_due, "report": cmd_report}[args.cmd](args, p) or 0
    except OutreachError as e:
        print("error:", e, file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
