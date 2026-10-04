# LoadMargin

Smart tools for smarter freight decisions.

Static site — no build step, no dependencies, no server. Served by GitHub Pages at
<https://aleksnvkvc-cell.github.io/loadmargin/>

Every calculation runs in the visitor's browser. Nothing is uploaded, and there is
no analytics and no tracking script.

---

## Files

| File | What it is |
|---|---|
| `index.html` | Home: live load calculator, cost-per-mile builder, 8 modules, 7 tool cards, 6 guide cards, workbooks, assistant |
| `app.html` | The fleet console — 8 working modules, dashboard, fleet & data |
| `calculators.html` | 7 free calculators: fuel surcharge, deadhead & backhaul, owner-operator take-home, detention, IFTA, factoring APR, maintenance reserve |
| `workbooks.html` | The 7 Excel products in detail, with the buy links |
| `guides.html` | Guide index, grouped by subject |
| `guide-*.html` | 66 written guides |
| `glossary.html` | 36 freight terms |
| `support.html` | Where LoadMargin fits, getting started, your data, browsers, troubleshooting, accessibility |
| `about.html` | Why it exists, methodology, what we do not claim, security, roadmap |
| `privacy.html` `terms.html` `refunds.html` `cookies.html` `legal.html` | Legal pages |
| `404.html` | Custom not-found page |
| `assets/site.css` | The design system for every marketing page |
| `assets/app.css` | The console shell |
| `images/` | Logo assets, demo video, poster, social preview |
| `.nojekyll` | Tells GitHub Pages to serve files as-is — **required** |
| `robots.txt` `sitemap.xml` | Search engine basics |
| `_generators/` | Python scripts that produce most pages. Kept under version control; not part of the served site — see the README inside it |

---

## Deploying

The **contents** of this folder go in the repository root — `index.html` sits at
the top level, next to `assets/` and `images/`.

Then: **Settings → Pages → Deploy from a branch → main → / (root)**.

`.nojekyll` is hidden on Windows. Make sure it is copied — without it GitHub Pages
silently ignores some files.

---

## Before it is really live

Two things are deliberately left for you:

1. **The contact form** posts to FormSubmit and delivers nothing until you send
   one message through it and click the confirmation email.
2. **The Gumroad links.** Six of the eight products are not published yet, so
   the page marks them "Not yet on sale" and the button opens an email instead
   of a dead shop link. Paste each real product URL into `BUY_LINKS` — in
   `workbooks.html` and in `index.html` — and the badge disappears by itself.

---

## Configuration

The contact form endpoint, in `index.html`:

```js
const FORM_ENDPOINT = 'https://formsubmit.co/ajax/aleksnvkvc@gmail.com';
```

The first submission activates it. After activating, replace the address with the
hashed endpoint FormSubmit gives you, so your email is not exposed in the page
source.

Scoring thresholds, in the same block:

```js
const TARGET_MARGIN = 0.15;   // at or above this = accept
const THIN_MARGIN   = 0.05;   // below this = reject
const MILES_PER_DAY = 500;    // used for profit per truck-day
```

Purchase links for the workbooks live in one place, in `workbooks.html`:

```js
var BUY_LINKS = { fuel:'', cpm:'', driver:'', hos:'', pro:'', dispatch:'', route:'', bundle:'' };
```

Any link left empty falls back to an email enquiry rather than breaking, so you can
publish products one at a time.

---

## Verified before release

- 36 pages, 0 broken links, 0 dead anchors, 0 JavaScript errors
- No horizontal scroll at any width from 320px to 2560px
- No heading-level skips; identical nav and footer on every page
- Every page has a unique title and meta description
- Tested with `structuredClone` and `IntersectionObserver` removed and
  `scrollIntoView` downgraded — the way a 2019 Android or iOS 12 phone behaves
- All 9 calculators checked against an independent Python implementation of the
  published model, agreeing to four decimal places

---

## The model

Printed in full on `about.html#method`:

```
net         = rate − (fuel + driver + maintenance + fixed + fees + detention_idle)
fuel        = (loaded + deadhead) ÷ mpg × diesel_price
fixed_cpm   = monthly_overhead ÷ monthly_miles
target_rate = total_cost ÷ (1 − target_margin)
```

The same arithmetic is implemented four times — here in JavaScript, in the Excel
workbooks, in `backend/engine.py`, and as a SQL view — and the implementations are
checked against each other.
