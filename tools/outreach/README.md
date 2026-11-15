# Outreach drafts and tracking

A small command-line helper for emailing carriers and brokers about LoadMargin.
It writes a personal draft for each prospect and keeps track of who is at which
step. **It never sends email.** You read each draft, open it in Gmail and press
send yourself.

Needs Python 3.8 or newer. Nothing to install.

## Where the data lives

The repo is public, so the lead list is **not** kept here. By default everything
is in `/mnt/project-files/outreach/` (the private project folder). Use `--dir` or
the `LM_OUTREACH_DIR` variable for another folder, for example on your own
computer.

| File | What it is |
|---|---|
| `prospects.csv` | The list: one row per prospect |
| `outreach.ini` | Your name, postal address, daily cap, follow-up days |
| `do-not-contact.txt` | Emails or `@domains` that never get a draft |
| `drafts/YYYY-MM-DD/drafts.html` | Today's drafts with "Open in Gmail" buttons |
| `drafts/YYYY-MM-DD/drafts.txt` | The same drafts as plain text |

`.gitignore` blocks these files inside `tools/outreach/`, so they can't be
committed here by accident.

## The list (prospects.csv)

Columns: `id, company, contact, email, type, lane, source, status, template,
last_subject, last_contacted, touches, next_follow_up, notes`.

You fill in `company`, `contact`, `email`, `type` (`carrier` or `broker`),
`lane` and `source`. Leave `id` empty and the tool numbers the row (P001, P002…).
Only put a lane you actually saw (on their site, a load board, a post), because
the email says "I saw you run {lane}". See `sample-prospects.csv` (made-up rows).

Statuses: `new`, `drafted`, `sent`, `replied`, `call`, `won`, `lost`,
`do-not-contact`.

## Daily use

```sh
cd tools/outreach
python3 outreach.py init          # once: creates the three files
# put your postal address in outreach.ini (required in every email by CAN-SPAM)
python3 outreach.py check         # finds bad emails, duplicates, wrong statuses
python3 outreach.py drafts        # first emails up to the daily cap + due follow-ups
python3 outreach.py drafts --dry-run   # just print them, change nothing
```

Open `drafts.html`, read each email, fix anything that isn't true for that
person, press **Open in Gmail**, send. Then record it:

```sh
python3 outreach.py mark P001 sent             # follow-up date set 5 days out
python3 outreach.py mark P002 P003 sent        # several at once
python3 outreach.py mark P004 replied --note "wants a load check Friday"
python3 outreach.py mark P004 call --next 2026-11-20
python3 outreach.py mark P005 won
python3 outreach.py mark P006 do-not-contact   # also added to do-not-contact.txt
python3 outreach.py due                        # what needs attention today
python3 outreach.py report                     # counts by status
```

## Rules built in

- Every draft ends with a "reply stop" opt-out line and your postal address.
  Drafts are refused until the address is set.
- Anyone on `do-not-contact.txt` or marked `do-not-contact` never gets another
  draft, even if they show up again in a new import.
- One follow-up at most (`max_touches = 2`), then the tool stops.
- `replied` and `call` never get an automatic draft: answer those by hand.
- No more than `daily_cap` first emails per run (default 20).
- Templates (`templates.py`) use only what is on the site: the free tools and
  the prices on work.html. No client counts, results, testimonials or
  fuel-price claims. The tests check this.

## Tests

From the repo root:

```sh
python3 -m unittest tools/outreach/test_outreach.py
```
