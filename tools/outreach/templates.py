"""Email templates for LoadMargin outreach.

Rules for anything written here:
- Only true facts: the services and prices on work.html, and the free tools on the site.
- No client counts, testimonials, results or "carriers like you saved X" claims.
- No claims about current fuel prices, rates or the market: they go out of date.
- Say "refund available", not "money back".
- The opt-out line and postal address are added by outreach.py, never by hand.

Placeholders: {first} {company} {lane} {lane_suffix} {sender} {last_subject}.
{lane_suffix} is " on <lane>" or empty, and never drops its line.
A line that uses a placeholder with no value for this prospect is dropped,
so "I saw you run {lane}." only appears when the lane is known.
"""

SITE = "https://loadmargin.com"

TEMPLATES = {
    "carrier_load": {
        "name": "Carrier: free load calculator + $49 Load Check",
        "for": "carrier",
        "subject": "Checking a load before you book it",
        "body": """Hi {first},

I saw you run {lane}.

A load can look fine on rate per mile and still lose money once the empty miles, fuel and fixed costs are counted.

I built a free calculator that shows what a load leaves you after those costs. No sign-up:
""" + SITE + """/load-calculator.html

If you want a second pair of eyes on a specific load, I do a one-page Load Check for $49 by email. Refund available if it doesn't help you decide on that load.

{sender}
LoadMargin, loadmargin.com""",
    },
    "carrier_authority": {
        "name": "Carrier, new authority: free audit check + $99 review",
        "for": "carrier",
        "subject": "Your new authority and the safety audit",
        "body": """Hi {first},

Congrats on the authority for {company}. In the first 12 months FMCSA does a new entrant safety audit, and most problems are paperwork: driver files, the drug and alcohol program, Clearinghouse queries and records.

This free check takes about 2 minutes and shows what's missing:
""" + SITE + """/audit-check.html

If you want me to go through it with you, I do a $99 Authority Checklist Review by email and send back a list in the order to fix it.

{sender}
LoadMargin, loadmargin.com""",
    },
    "carrier_cpm": {
        "name": "Carrier: cost per mile question",
        "for": "carrier",
        "subject": "Quick question, {first}",
        "body": """Hi {first},

Do you know your all-in cost per mile? Truck payment, insurance, fuel, maintenance and what you pay yourself, divided by every mile, empty ones too.

That number decides which loads are worth taking{lane_suffix}.

This free calculator works it out in a few minutes:
""" + SITE + """/calc-cost-per-mile.html

If you want it done for you with your real numbers and up to 3 lanes checked, that's the $249 Full Cost & Lane Audit.

{sender}
LoadMargin, loadmargin.com""",
    },
    "broker_tools": {
        "name": "Broker: free tools for your carriers",
        "for": "broker",
        "subject": "Free calculators for the carriers you work with",
        "body": """Hi {first},

I run LoadMargin, a small site with free calculators for owner-operators: load profit, cost per mile, deadhead, detention and fuel surcharge.

If your carriers ever ask how to tell whether a rate works for them, these may save you a phone call:
""" + SITE + """/calculators.html

They're free, with no sign-up, and I'm not asking for anything in return.
I thought they might help with the carriers you use on {lane}.

{sender}
LoadMargin, loadmargin.com""",
    },
    "followup": {
        "name": "Follow-up (one only)",
        "for": "any",
        "subject": "Following up: {last_subject}",
        "body": """Hi {first},

One short follow-up and then I'll leave you alone. Here's the free calculator again in case it helps with the next load:
""" + SITE + """/load-calculator.html

{sender}""",
    },
}

DEFAULT_FOR_TYPE = {"carrier": "carrier_load", "broker": "broker_tools"}
