# LoadMargin

Smart tools for smarter freight decisions.

Static site — no build step, no dependencies, no server. Served by GitHub Pages at
<https://loadmargin.com/>

Every calculation runs in the visitor's browser. Nothing is uploaded, and there is
no analytics and no tracking script.

---

## Files

| File | What it is |
|---|---|
| `index.html` | Home: the $49 Load Check offer, example load, sample report. Self-contained styles (does not load `assets/site.css`) |
| `work.html` | Services and prices: $49 Load Check, $249 Cost & Lane Audit, $99 Authority Checklist Review, $349 New Authority Setup, $199 Compliance Tune-up, $99/month Load Check Plan, Ongoing Support from $249/month |
| `load-calculator.html` | The free load calculator |
| `calculators.html` | Index of the free calculators |
| `calc-*.html` | 8 calculators, one per page: ETA & hours, fuel surcharge, deadhead & backhaul, owner-operator take-home, detention, IFTA, factoring APR, maintenance reserve |
| `audit-check.html` | Free DOT audit self-check |
| `app.html` | The fleet console (noindex, not in the sitemap) |
| `demo-track-trace.html` | Track & trace demo |
| `how-it-works.html` `news.html` | How the load scoring works; freight news |
| `guides.html` | Guide index, grouped by subject |
| `guide-*.html` | 66 written guides |
| `glossary.html` | Freight terms |
| `support.html` `about.html` | Help, methodology, what we do not claim |
| `workbooks.html` | Notice that the spreadsheet files are no longer sold (noindex) |
| `privacy.html` `terms.html` `refunds.html` `cookies.html` `legal.html` | Legal pages |
| `404.html` | Custom not-found page |
| `sample-load-check-report.pdf` | The sample report linked from the homepage |
| `assets/site.css` | The design system for every page except the homepage |
| `assets/app.css` | The console shell |
| `assets/assistant.js` `assets/assistant.css` | The floating assistant on every page |
| `assets/theme-auto-switch.js` | Light/dark theme switching |
| `assets/fonts/` | Self-hosted fonts, with their licenses |
| `images/` | Logo, founder photo, hero image, demo video, social preview |
| `CNAME` | Custom domain: loadmargin.com |
| `.nojekyll` | Tells GitHub Pages to serve files as-is — **required** |
| `robots.txt` `sitemap.xml` | Search engine basics |

When you add or remove a page, update `sitemap.xml` and, for a calculator, the
Tools menu on every page (including the homepage's own menu).

---

## Deploying

GitHub Pages serves the `main` branch from the repository root:
**Settings → Pages → Deploy from a branch → main → / (root)**.
Anything merged to `main` is live a minute or two later.

`.nojekyll` is hidden on Windows. Make sure it is never deleted — without it
GitHub Pages silently ignores some files.

---

## Orders and contact

There is no checkout and no contact form. Every "buy" and "contact" button is a
`mailto:` link to aleksnvkvc@gmail.com with the order details pre-filled in the
email body. To change the address, search the HTML files for `mailto:`.

---

## Configuration

Load scoring thresholds, in `load-calculator.html`:

```js
const TARGET_MARGIN = 0.15;   // at or above this = accept
const THIN_MARGIN   = 0.05;   // below this = reject
const MILES_PER_DAY = 500;    // used for profit per truck-day
```

The same constants are printed in `how-it-works.html` and `news.html`; keep them
in step if you change them.

---

## Last checked (2026-10-18)

- 94 pages, 0 broken internal links, 0 dead anchors
- 0 JavaScript errors and no horizontal scroll at 320px, 390px and 1280px

---

## The model

Printed in full on `about.html#method`:

```
net         = rate − (fuel + driver + maintenance + fixed + fees + detention_idle)
fuel        = (loaded + deadhead) ÷ mpg × diesel_price
fixed_cpm   = monthly_overhead ÷ monthly_miles
target_rate = total_cost ÷ (1 − target_margin)
```

The arithmetic runs in JavaScript in the visitor's browser.
