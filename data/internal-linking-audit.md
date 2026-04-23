# Internal-linking audit — SBA cluster + trust pages

_Generated: 2026-04-23T17:20:36.727Z · Pages scanned: 320_

Inbound-link counts for each audit target, from OTHER pages on the same site. Two counts per target:

- **total** — any `<a href>` anywhere in the HTML, including nav/header/footer boilerplate.
- **in-body** — links outside `<nav>`, `<header>`, `<footer>`. This is the signal that matters for topic flow.

Self-references excluded. An in-body count **< 3** flags the page as a de-facto orphan — even with sitemap inclusion, Google's crawl prioritization depends on the internal-linking graph.

## Industry landing pages

| Page | Total inbound | In-body inbound | Sample sources (in-body, up to 10) |
| --- | ---: | ---: | --- |
| `/sba-loans/accounting` ⚠️ | 1 | 1 | `/sba-loans` |
| `/sba-loans/auto-body` ⚠️ | 1 | 1 | `/sba-loans` |
| `/sba-loans/beauty-salons` ⚠️ | 1 | 1 | `/sba-loans` |
| `/sba-loans/building-services` ⚠️ | 1 | 1 | `/sba-loans` |
| `/sba-loans/child-care` ⚠️ | 1 | 1 | `/sba-loans` |
| `/sba-loans/chiropractors` ⚠️ | 1 | 1 | `/sba-loans` |
| `/sba-loans/landscaping` ⚠️ | 1 | 1 | `/sba-loans` |
| `/sba-loans/plumbing-hvac` ⚠️ | 1 | 1 | `/sba-loans` |
| `/sba-loans/specialty-trades` ⚠️ | 1 | 1 | `/sba-loans` |
| `/sba-loans/auto-repair` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/auto-body` |
| `/sba-loans/cpas` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/accounting` |
| `/sba-loans/dentists` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/chiropractors` |
| `/sba-loans/insurance-agencies` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/cpas` |
| `/sba-loans/personal-care` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/beauty-salons` |
| `/sba-loans/pet-care` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/veterinarians` |
| `/sba-loans/physicians` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/chiropractors` |
| `/sba-loans/restaurants` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/restaurants/california` |
| `/sba-loans/startups` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/requirements` |
| `/sba-loans/veterinarians` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/pet-care` |
| `/sba-loans/franchise` | 4 | 4 | `/sba-loans`, `/sba-loans/child-care`, `/sba-loans/requirements`, `/sba-loans/restaurants` |

## Scenario landing pages

| Page | Total inbound | In-body inbound | Sample sources (in-body, up to 10) |
| --- | ---: | ---: | --- |
| `/sba-loans/after-bankruptcy` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/requirements` |
| `/sba-loans/bad-credit` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/requirements` |
| `/sba-loans/disaster` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/requirements` |
| `/sba-loans/minority` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/requirements` |
| `/sba-loans/no-collateral` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/requirements` |
| `/sba-loans/self-employed` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/requirements` |
| `/sba-loans/veterans` ⚠️ | 2 | 2 | `/sba-loans`, `/sba-loans/requirements` |
| `/sba-loans/women` | 3 | 3 | `/sba-loans`, `/sba-loans/minority`, `/sba-loans/requirements` |
| `/sba-loans/business-acquisition` | 20 | 20 | `/sba-loans`, `/sba-loans/accounting`, `/sba-loans/auto-body`, `/sba-loans/auto-repair`, `/sba-loans/beauty-salons`, `/sba-loans/building-services`, `/sba-loans/child-care`, `/sba-loans/chiropractors`, `/sba-loans/cpas`, `/sba-loans/dentists` |
| `/sba-loans/requirements` | 22 | 22 | `/sba-loans`, `/sba-loans/accounting`, `/sba-loans/after-bankruptcy`, `/sba-loans/auto-body`, `/sba-loans/auto-repair`, `/sba-loans/beauty-salons`, `/sba-loans/building-services`, `/sba-loans/child-care`, `/sba-loans/chiropractors`, `/sba-loans/cpas` |

## State × industry

| Page | Total inbound | In-body inbound | Sample sources (in-body, up to 10) |
| --- | ---: | ---: | --- |
| `/sba-loans/restaurants/california` ⚠️ | 0 | 0 | — |

## Trust pages

| Page | Total inbound | In-body inbound | Sample sources (in-body, up to 10) |
| --- | ---: | ---: | --- |
| `/terms` ⚠️ | 286 | 0 | — |
| `/privacy` ⚠️ | 286 | 2 | `/contact`, `/terms` |
| `/contact` | 286 | 3 | `/disclosures`, `/privacy`, `/terms` |
| `/disclosures` | 286 | 3 | `/contact`, `/privacy`, `/terms` |

## Summary

- Targets audited: **35** (20 industry landing pages; 10 scenario landing pages; 1 state × industry; 4 trust pages).
- Pages with **fewer than 3 in-body inbound links** (orphans for topic-flow purposes): **29**.
- Worst-linked target: `/sba-loans/restaurants/california` with 0 in-body inbound links (0 total).
- Best-linked target: `/sba-loans/requirements` with 22 in-body inbound links (22 total).

### Orphans to address in a future internal-linking pass

- `/sba-loans/restaurants/california` — in-body inbound: 0
- `/terms` — in-body inbound: 0 (286 total incl. nav/footer)
- `/sba-loans/accounting` — in-body inbound: 1
- `/sba-loans/auto-body` — in-body inbound: 1
- `/sba-loans/beauty-salons` — in-body inbound: 1
- `/sba-loans/building-services` — in-body inbound: 1
- `/sba-loans/child-care` — in-body inbound: 1
- `/sba-loans/chiropractors` — in-body inbound: 1
- `/sba-loans/landscaping` — in-body inbound: 1
- `/sba-loans/plumbing-hvac` — in-body inbound: 1
- `/sba-loans/specialty-trades` — in-body inbound: 1
- `/sba-loans/auto-repair` — in-body inbound: 2
- `/sba-loans/cpas` — in-body inbound: 2
- `/sba-loans/dentists` — in-body inbound: 2
- `/sba-loans/insurance-agencies` — in-body inbound: 2
- `/sba-loans/personal-care` — in-body inbound: 2
- `/sba-loans/pet-care` — in-body inbound: 2
- `/sba-loans/physicians` — in-body inbound: 2
- `/sba-loans/restaurants` — in-body inbound: 2
- `/sba-loans/startups` — in-body inbound: 2
- `/sba-loans/veterinarians` — in-body inbound: 2
- `/sba-loans/after-bankruptcy` — in-body inbound: 2
- `/sba-loans/bad-credit` — in-body inbound: 2
- `/sba-loans/disaster` — in-body inbound: 2
- `/sba-loans/minority` — in-body inbound: 2
- `/sba-loans/no-collateral` — in-body inbound: 2
- `/sba-loans/self-employed` — in-body inbound: 2
- `/sba-loans/veterans` — in-body inbound: 2
- `/privacy` — in-body inbound: 2 (286 total incl. nav/footer)

## Methodology notes

- Scans every `index.html` under the site root (excluding `node_modules`, `data`, `scripts`, `docs`, `worker`).
- Link matching is generous: absolute apex URL, relative path, with/without trailing slash.
- Nav/header/footer detection uses simple tag-pair stripping; if the actual markup uses different containers (e.g. `<div class="site-header">`), those links will be counted as in-body. Worth revisiting if the site ever moves off `<nav>/<header>/<footer>` semantics.
- This is diagnostic only. No pages are modified.
