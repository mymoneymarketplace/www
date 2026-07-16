---
name: mmm-page-building
description: The complete operating system for building, editing, or generating ANY page on mymoneymarketplace.com (this mmm-site repo). ALWAYS consult this skill before touching HTML output, page generators, configs, sitemap, metadata, internal links, JSON-LD, CTAs, or the indexer — even for small one-off edits, quick fixes, or "just change one line" requests, because most past defects were introduced by small edits that skipped the workflow. Covers the build workflow, hard SEO rules, the content-audit gates, data-integrity checks, and where everything lives in the repo.
---

# MMM Page Building

My Money Marketplace (mymoneymarketplace.com) is a programmatically generated
financial comparison site, hosted on **GitHub Pages** (repo `mymoneymarketplace/www`).
Every ranking it holds was earned with zero domain authority, which means content
and technical signals are doing all the work — there is no authority cushion to
absorb mistakes. The rules below exist because each one was violated once and cost
something. Understand the reason and the rule becomes obvious.

Two ideas run through everything: **fix at the source, never patch generated HTML**,
and **the audit is the backstop, not the method** — author correctly and the gates
stay quiet.

## Source of truth hierarchy

1. **The repo** (code, configs, data files, `docs/`, git log) — always wins.
2. **Data files** (`data/industry-data.json`, `data/phase2-datapack.json`,
   `data/tier1-cities.json`, and the vendored parasite content files) — the ONLY
   permitted source for any factual claim on a page.
3. Conversation memory — never a source for facts, numbers, or names. If it's not
   in the repo or a data file, it does not go on a page.

Why rule 3 is absolute: lender narratives written "from memory of typical patterns"
once produced fabricated bank counts on pages whose entire value proposition is
"pulled directly from SBA FOIA data." `scripts/verify-lender-facts.js` now blocks
this at pre-commit for state × industry pages, but the gate is the backstop, not
the method. Author from data files, always.

## The content audit — what actually gates commits

All page-quality enforcement lives in `scripts/audit-module.js` (severity scale
`CRITICAL | HIGH | MEDIUM | LOW`; `BLOCKING_SEVERITIES = ['CRITICAL','HIGH']`). It
runs at **two layers**:

- **Layer 1 — generator guardrail.** `generate-industry-page.js` and
  `generate-state-industry-page.js` run the audit against freshly-rendered HTML
  **before writing the file**. A new CRITICAL/HIGH → file NOT written, exit 1. New
  MEDIUM/LOW → written with a warning. It runs the single-page subset
  `PRE_PUBLISH_CHECKS`: cross-page-leakage, state-leakage, structural,
  content-quality, cta-correctness.
- **Layer 2 — pre-commit hook.** `scripts/pre-commit-audit.js` (installed via
  `sh scripts/install-hooks.sh`) reads the **staged** blob of every `.html` file and
  runs ALL 7 checks (adds `internal-link-validity` + `data-traceability`, which need
  site-wide context). Same block/warn rules. This is the backstop for hand edits.

Pre-existing findings are grandfathered via `data/audit-baseline.json`. Refresh it
ONLY after an intentional cleanup: `node scripts/content-audit.js --write-baseline`
— otherwise you are hiding regressions, not fixing them.

The 7 checks and what each blocks (read `references/scripts.md` for exact behavior):

1. **cross-page-leakage** (CRITICAL/HIGH) — an industry's terms (from `INDUSTRY_TERMS`)
   must not appear in another SBA page's title/meta/H1/headings/program cards. Each
   leaf page targets exactly one industry; bleed-through splits topical signal.
2. **state-leakage** (CRITICAL/HIGH) — state names must not appear in title/meta/
   headings on a page whose URL is not state-scoped. Geo belongs on state-scoped URLs.
3. **structural** (HIGH/MEDIUM) — canonical present and trailing-slash-correct;
   og:url present and matching canonical; SBA pages carry all of
   `Organization, BreadcrumbList, Article, FinancialService, FAQPage` JSON-LD and a
   non-origination disclosure; word count 800–4000; no JSON-LD parse errors.
4. **internal-link-validity** (HIGH) — every internal `<a href>` must resolve to a
   real page AND end in a trailing slash (except real file assets).
5. **content-quality** (CRITICAL/MEDIUM) — no unreplaced `{tokens}`, no Lorem Ipsum
   (CRITICAL); no TODO/FIXME/XXX; title and H1 must share a non-stopword.
6. **cta-correctness** (HIGH/MEDIUM/LOW) — Lendmate CTA `utm_campaign` must start
   `sba-<pageSlug>`; each Lendmate URL needs a `utm_content`; quiz profiles distinct.
7. **data-traceability** (LOW) — `loan_count` and `charge_off_pct` shown on an
   industry page must match `data/industry-data.json`.

## Hard rules (each with its reason)

**1. Every URL in trailing-slash form** — canonicals, og:url, JSON-LD, sitemap
entries, and every internal `<a href>`. GitHub Pages 301s non-slash → slash (verified
by live curl, `scripts/audit-url-consistency.js`), so the served URL is always
`/path/`. Before this was enforced, Google indexed URLs in both forms and split
their ranking signals. The audit enforces this as HIGH on canonicals and body links;
if it blocks, fix the URL — never work around the check. `scripts/fix-trailing-slashes.js`
bulk-fixes hrefs, JSON-LD URL fields, and sitemap `<loc>`s.

**2. Never use SKIP_AUDIT to ship.** `SKIP_AUDIT=1` and `git commit --no-verify` are
real bypasses (they exist for dev/rescue work), but a block means the page is wrong,
not that the check is inconvenient. The only historical exception is the grandfathered
baseline; nothing new joins it except through `--write-baseline` after a real cleanup.

**3. Honest framing on unflattering data.** When a page's charge-off rate, risk metric,
or trend is worse than the relevant average, the page says so plainly, explains the
structural drivers, and closes with the nuance (aggregate ≠ per-file verdict). This is
strategy, not compliance — honest data analysis is the site's differentiation; every
competitor writes optimistic spin.

**4. No invented specificity on YMYL/regulatory facts.** (YMYL = Your Money or Your
Life — Google's higher bar for finance/health content.) Hardcoded regulatory numbers
(minimum wages, fee amounts, processing timelines) rot and create liability. Either
verify current before writing, or phrase structurally ("among the highest state
minimum wages") without a decaying number. A page once shipped with a stale NYC
minimum wage; this rule is the fix.

**5. DataForSEO keyword validation before every new content batch.** This is a
required discipline, not an automated gate — no script enforces it, so it is on you.
Before generating a batch, validate real search demand for the target query patterns
(DataForSEO MCP is available). Kill rule: a candidate needs demand on the
INDUSTRY/topic side specifically, not just broad state/geo volume — geo-only volume
belongs to hub pages the leaf will never outrank. Long-tail exact phrases often show
zero Google Ads volume — that's a data-visibility floor, not proof of zero demand;
use the nearest broader patterns as proxies and say so.

**6. Metadata.** Title and meta-description *length* limits (≤60 / ≤155 chars) are
**editorial convention, NOT audit-gated** — the audit does not check length, so it is
on you to hold the line. Lead titles with the primary query phrasing. The
"| My Money Marketplace" brand suffix is dropped on ranking-targeted SBA pages (the
industry generator does this for the 60-char cap); note that `generate-profession-pages.js`
still keeps the suffix as a *fallback* title unless `CTR_OVERRIDES` supplies a custom
one — prefer a `CTR_OVERRIDES` entry for any profession page you care about. Meta
descriptions need a concrete differentiator and a number that matches what the page
ACTUALLY displays (never an invented count). Years come from a `YEAR` constant +
`{YEAR}` substitution (per generator), never hardcoded per page. Internal editorial
vocabulary ("honest framing", "parasite", "apex") never appears in user-facing text.

**7. Internal linking: ≥ 4 inbound links per page.** New pages link up to their parent
and across to siblings; parents regenerate to link down. Orphans are defects. The SBA
cluster's cross-linking is driven by `scripts/sba-internal-links.js` (the single source
of truth: `INDUSTRY_RELATED`, `SCENARIO_RELATED`, `STATE_INDUSTRIES`). `audit-internal-links.js`
reports inbound counts (diagnostic; the ≥4 threshold is not itself commit-gated).

**8. Indexer discipline.** New/changed URLs submit via `scripts/index-pages.js`,
which caps at **195/day** (`QUOTA_CAP`, leaving 5 under Google's 200 limit) and dedups
against a 30-day log at `data/submitted-urls.json`. Changed-page submissions are the
right use of quota; bulk resubmission for canonical reconciliation is not (Google
reconciles via crawl). If a batch exceeds remaining quota, queue the remainder and
say so. Use `--dry-run` to preview the priority queue; `--limit N` to cap a run.
Requires OWNER-level GSC access (see `docs/development.md`).

**9. Apex-only, parasites dead.** All pages build on mymoneymarketplace.com. The
github.io parasite network was retired to redirect stubs (2026-07-15) — never author
content there, never link to it, never resurrect the pattern (github.io is on the
Public Suffix List → zero inherited authority, plus disclosure-compliance risk). The
service account still holds github.io GSC ownership (intentional, for the redirects).
NOTE: the city + profession generators previously *read* FAQ/meta content from the
`../seo-pages` parasite files; that content is now vendored into
`data/city-parasite-content.json` and `data/profession-parasite-content.json`, and the
generators no longer touch `../seo-pages`. Do not re-introduce that dependency.

**10. Monetization routing.** Business/SBA/personal-loan CTAs → Lendmate Capital at
`https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=<page-specific>`
with `rel="nofollow sponsored"`; the audit requires `utm_campaign` to start
`sba-<slug>` plus a `utm_content`. Never `utm_medium=parasite` (manual-action risk).
Credit-card pages: CardRatings affiliate `src=705663` — **live** and already in the
credit-cards pages (e.g. `cardratings.com/...?src=705663`). Any page recommending an
affiliated company carries a compensation/affiliation disclosure.

## Build workflow for content batches

Run as phases with hard gates. Do not collapse phases.

1. **Candidate selection + DataForSEO validation** (rule 5). STOP: present a scored
   candidate table (data strength × keyword demand) for human approval before
   generating anything.
2. **Author configs from data files only** (source hierarchy rule 3). Batch by shared
   research context. Keep batches ≤ 5 pages per turn for context + commit granularity.
3. **Generate → guardrail → fact-verifier.** Every page passes the Layer-1 guardrail
   with zero new CRITICAL/HIGH and passes `verify-lender-facts.js` where applicable.
4. **Wire the graph:** update `sba-internal-links.js` mappings, regenerate affected
   parents, rebuild the sitemap (`scripts/build-sitemap.js`).
5. **Commit per batch** — the pre-commit hook (Layer 2) is the enforcement point.
   Run the full-site audit (`content-audit.js`) once per batch, not between configs.
   Push, verify deploy.
6. **Submit changed/new URLs** to the indexer per rule 8.
7. **Report:** what shipped, what's queued, verification counts.

For metadata-only or single-page edits: rules 1, 2, 4, 6 still apply in full, and the
Layer-2 hook still runs the full audit on your staged HTML. Present old → new for human
review when the pages involved hold page-1 rankings.

## Fix-at-the-source principle

When a defect appears in generated output, fix the generator/template/shared module,
then regenerate — never patch individual HTML files (the next regeneration erases hand
patches). When a rule is worth keeping, encode it in `audit-module.js` or a verifier so
it's enforced at commit time; a rule that lives only in conversation will eventually be
violated (this has happened for slash-form links, a dead `/compare` CTA, and fabricated
lender data).

## Repo map

Full detail lives in two reference files — read them before doing the corresponding work:

- **`references/generators.md`** — every page generator: what it emits, its config
  schema, how to invoke it, and its quirks. Read before generating or editing any page
  template. Generators at repo root: `generate-city-pages.js`, `generate-hub-pages.js`,
  `generate-profession-pages.js`, `generate-sba-pages.js` (flagship SBA-scenario). In
  `scripts/`: `generate-industry-page.js`, `generate-state-industry-page.js` (the two
  audited generators).
- **`references/scripts.md`** — every tool in `scripts/`: audit/enforcement, ops
  (sitemap, indexer, trailing-slash, internal-links), data build, and one-offs. Read
  before running any script or changing the audit rules.

Key data + config locations:
- Data: `data/industry-data.json` (per-NAICS FOIA stats), `data/phase2-datapack.json`,
  `data/tier1-cities.json`, `data/city-parasite-content.json` +
  `data/profession-parasite-content.json` (vendored FAQ/meta), `data/audit-baseline.json`
  (grandfathered findings), `data/submitted-urls.json` (indexer dedup log).
- Policy constants: `INDUSTRY_TERMS`, `SLUG_TO_NAICS`, `REQUIRED_LD_TYPES_SBA`,
  `BLOCKING_SEVERITIES` (audit-module.js); `CTR_OVERRIDES`, `YEAR`
  (generate-profession-pages.js); `STATE_INDUSTRIES`, `INDUSTRY_RELATED`,
  `SCENARIO_RELATED` (sba-internal-links.js); `QUOTA_CAP`, `STALE_AFTER_DAYS`
  (index-pages.js).
- Docs: `docs/development.md` — audit two-layer model, baseline refresh, and the GSC
  Owner-vs-User ownership trap for the Indexing API.

## Environment notes

- Windows. Set Cloudflare secrets via the dashboard (Wrangler's interactive secret
  prompts corrupt input). PowerShell needs
  `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` for Wrangler.
- Google Indexing API requires OWNER-level GSC access (Ownership Verification → Add
  Owner, NOT Users and Permissions — the latter's "Full user" does not satisfy the
  API's ownership check). Full walkthrough in `docs/development.md`.
- Lead pipeline (Cloudflare Worker → Zapier → GoHighLevel tag `mmm-lead` + Resend)
  lives in the sibling `seo-pages` repo, NOT here — this repo has no worker. Verify
  worker URL/state there if needed.
