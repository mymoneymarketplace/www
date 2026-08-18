# scripts/ inventory

Everything in `scripts/` except the page generators (those are in
`references/generators.md`). Grouped by role. Run all `node` scripts from the repo
root.

## Enforcement (the audit)

### audit-module.js  — the single source of truth for page quality
Importable pure check functions `(html, context) → findings`. Consumed by the two
audited generators (Layer 1), `pre-commit-audit.js` (Layer 2), and `content-audit.js`
(site-wide). Not run directly.
- **Severity:** `CRITICAL | HIGH | MEDIUM | LOW`; `BLOCKING_SEVERITIES = ['CRITICAL','HIGH']`.
- **Check name sets:** `ALL_CHECK_NAMES` (10) vs `PRE_PUBLISH_CHECKS` (8 — excludes
  `internal-link-validity` + `data-traceability`, which need site-wide context).
- **The 10 checks:** cross-page-leakage, state-leakage, structural,
  internal-link-validity, content-quality, cta-correctness, data-traceability,
  placeholder-literal, stale-date, affiliate-rel (see SKILL.md for what each blocks
  and why). The last three: `placeholder-literal` (HIGH) catches unreplaced ALLCAPS
  integration placeholders like `GA_MEASUREMENT_ID`; `stale-date` (MEDIUM) flags
  "as of <Month Year>" older than 90 days; `affiliate-rel` (HIGH) requires
  `rel="nofollow sponsored"` on `AFFILIATE_HOSTS` anchors.
- **Policy constants live here:** `INDUSTRY_TERMS`, `SLUG_TO_NAICS`,
  `REQUIRED_LD_TYPES_SBA` (`Organization, BreadcrumbList, Article, FinancialService,
  FAQPage`), `AFFILIATE_HOSTS`, state name/abbr/slug sets, `STOPWORDS`.
- **Baseline helpers:** `loadBaseline`, `filterNewFindings`, `findingSignature`
  (normalizes quoted literals so grandfathered findings match across minor text drift).
- **Note:** does NOT check title/meta *length* — those limits are editorial only.

### pre-commit-audit.js  — Layer 2 git hook
Installed by `install-hooks.sh` as `.git/hooks/pre-commit`. On every commit, reads the
**staged** blob (`git show :<path>`) of each staged `.html`, runs `ALL_CHECK_NAMES` +
`verify-lender-facts.js` on state × industry pages. New CRITICAL/HIGH or any lender-fact
mismatch → exit 1, commit rejected. Grandfathers via `data/audit-baseline.json`.
Bypass (dev/rescue only): `SKIP_AUDIT=1 git commit …` or `git commit --no-verify`.

### content-audit.js  — site-wide audit driver (CLI)
`node scripts/content-audit.js` walks every page, runs all checks, writes
`data/content-audit-report.md`. `--write-baseline` emits `data/audit-baseline.json`
(a snapshot of current findings for grandfathering) — run this ONLY after an
intentional cleanup, never to silence fresh regressions. Use as the once-per-batch
full-site check and on CI.

### verify-lender-facts.js  — FOIA fact gate
Extracts every lender-name + loan-count claim from a state × industry page and verifies
each against that combo's `top_lenders` roster in `data/industry-data.json`. Exit 1 on
any mismatch (wrong count, or a bank not in the roster). Exports `verifyPage` (used by
the pre-commit hook). CLI: `node scripts/verify-lender-facts.js <path>`, `--all`, or
`--batch <NAICS_STATE>`.

### install-hooks.sh
`sh scripts/install-hooks.sh` — installs the pre-commit shim (idempotent). Run once
per clone.

## Ops

### build-sitemap.js
`node scripts/build-sitemap.js` regenerates `sitemap.xml` from the file tree (skips
node_modules, data, scripts, docs, worker, dotdirs), mapping each `index.html` to its
trailing-slash canonical URL with lastmod/changefreq/priority. `--dry-run` prints the
table only. Run after any page add/remove.

### index-pages.js  — Google Indexing API submitter
`node scripts/index-pages.js` submits apex URLs (URL_UPDATED). **Cap 195/day**
(`QUOTA_CAP`, 5 under Google's 200 limit); dedups against `data/submitted-urls.json`
with a 30-day stale window (`STALE_AFTER_DAYS`). `--dry-run` prints the priority queue;
`--limit N` caps a run. Needs OWNER-level GSC access + service-account credentials
(resolved from `$GOOGLE_CREDENTIALS_PATH`, then `google-credentials.json`, then
`../seo-pages/google-credentials.json`). Submit changed/new URLs only — not bulk
resubmissions for canonical reconciliation.

### fix-trailing-slashes.js
Adds trailing slashes to on-site URLs in target files: `href`, JSON-LD `item/url/@id/
mainEntityOfPage`, sitemap `<loc>`. Skips paths with file extensions, external URLs,
anchors, mailto/tel. Preserves query + fragment. Use to bulk-fix a slash regression at
the source.

### sba-internal-links.js  — cross-link source of truth
Not executable on its own; exports `INDUSTRY_RELATED`, `SCENARIO_RELATED`,
`STATE_INDUSTRIES`. The industry generator renders its "Related SBA guides" from here;
`inject-scenario-cross-links.js` and hand-edited scenario pages stay consistent with it.
**Update this whenever the site gains a new industry, scenario, or state-industry page**,
then regenerate/re-inject.

### inject-scenario-cross-links.js
One-off patcher that inserts a "Related SBA industry guides" section into each
hand-written scenario page, using `SCENARIO_RELATED`. Idempotent (keyed by aria-label).
Run on demand when `SCENARIO_RELATED` changes — scenario HTML is hand-owned, so this is
a patcher, not a generator.

## Diagnostics (read-only)

### audit-internal-links.js
`node scripts/audit-internal-links.js` → `data/internal-linking-audit.md`. Counts
inbound links per target page (total vs in-body, excluding nav/header/footer and
self-links). Use to find orphans / thin internal linking (rule 7's ≥4 target).

### audit-url-consistency.js
One-off diagnostic for the trailing-slash split: scans pages + sitemap for canonical,
`<a href>`, og:url, structured-data URL fields, and sitemap `<loc>` forms. Read-only.
Documents the canonical rule (root `/`, subpages `/path/`) per live curl test.

## Data build

### build-industry-data.js
Parses the SBA FOIA 7(a) dataset (CSV, ~357K rows, NOT committed — path via `CSV_PATH`
env, default a local Desktop file) into `data/industry-data.json` (keyed by NAICS) plus
`industry-data-summary.csv` and `industry-prioritization.md`. Re-run when the FOIA data
refreshes. This is the upstream of every SBA page's factual claims.

### vendor-parasite-content.js  — one-time provenance tool
Reconstructs the FAQ/meta content the city + profession generators need from the last
pre-retirement revision of the seo-pages parasites (git ref `2224f01`) into
`data/city-parasite-content.json` + `data/profession-parasite-content.json`. Already run
and committed; kept for provenance. Env: `SEO_PAGES_REPO`, `PARASITE_REF`.

## Misc

### add-clarity.js
Idempotently inserts the Microsoft Clarity analytics snippet into any HTML file missing
it (after the viewport meta, or after `<head>`).
