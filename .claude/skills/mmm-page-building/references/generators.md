# Page generators

Six generators produce the site's HTML. Two (`generate-industry-page.js`,
`generate-state-industry-page.js`) run the content-audit guardrail before writing;
the other four do not — they predate the audit and emit whole batches from an
in-file config array. **Fix defects in the generator/config and regenerate; never
hand-patch the emitted HTML.**

Shared conventions: all use `const LOGO = '<filesafe CDN url>'`, a `TODAY`/`YEAR`
freshness stamp, `esc()` for HTML-escaping, and trailing-slash URLs everywhere.

---

## scripts/generate-industry-page.js  (AUDITED)

- **Emits:** `sba-loans/<industry-slug>/index.html` — one SBA industry page.
- **Data source:** `data/industry-data.json`, keyed by NAICS. Programmatic sections
  (stats block, top-lenders, state-concentration) pull straight from the data;
  narrative sections (underwriting / independent-vs-franchise / failure-rate), quiz,
  profiles, and FAQs are **manually configured per NAICS** in an in-file config object.
- **Config schema (per NAICS):** `h1`, `title` (uses `${YEAR}`, brand suffix dropped
  for 60-char cap), `metaDesc`, `breadcrumbName`, `campaignSlug`, `heroSub`, `heroValue`,
  `serviceDescription` (must include the non-origination disclosure), `heroImage`
  (`{url, alt, width, height, photographer, sourceUrl, sourceName}`), `highlightLenderNames`,
  `narrative.{underwritingTitle,underwriting, indepTitle,indep, failureTitle,failure}`
  (HTML strings; may use `{franchise_pct}`, `{cost_off_pct}`, `{sba_avg_chgoff}`,
  `{chgoff_ratio_label}` tokens filled from data), a quiz config, and FAQs.
- **Related links:** pulled from `sba-internal-links.js` (`INDUSTRY_RELATED`).
- **Invoke:** `node scripts/generate-industry-page.js <NAICS> [--preview]`.
  `--preview` renders + audits but writes nothing. `SKIP_AUDIT=1` bypasses the
  guardrail (dev only — never to ship).
- **Guardrail:** runs `PRE_PUBLISH_CHECKS` (cross-page-leakage, state-leakage,
  structural, content-quality, cta-correctness, placeholder-literal, stale-date,
  affiliate-rel). New CRITICAL/HIGH → not written, exit 1. `SLUG_TO_NAICS` in
  audit-module maps the slug back to its NAICS for the `data-traceability` check at
  commit time.
- **Quirk:** `YEAR` is a one-line constant at the top — update each January.

## scripts/generate-state-industry-page.js  (AUDITED)

- **Emits:** `sba-loans/<industry-slug>/<state-slug>/index.html` — NAICS × STATE page.
- **Data source:** `industries[NAICS].state_breakouts[STATE_ABBR]` for stats plus
  `state_reference[STATE_ABBR]` for state metadata (SBA district office, SBDC, etc.),
  both in `data/industry-data.json`. Sibling of the industry generator.
- **Invoke:** `node scripts/generate-state-industry-page.js <NAICS> <STATE_ABBR> [--preview]`.
- **Guardrail:** same as the industry generator PLUS, at pre-commit, every state ×
  industry page runs `verify-lender-facts.js` — each bank name + loan count in the
  narrative must resolve against the FOIA `top_lenders` roster for the combo or the
  commit is rejected.
- **Quirk:** combos with missing `state_breakouts`/`state_reference` entries are
  skipped rather than rendered with holes.

## generate-sba-pages.js  (root; flagship SBA-scenario generator)

- **Emits:** one `sba-loans/<scenario-slug>/index.html` per entry in the in-file
  `SCENARIOS` array (bad-credit, no-collateral, startups, disaster, veterans, women,
  minority, business-acquisition, after-bankruptcy, requirements, franchise, …).
- **Not audit-gated at generation** — relies on the Layer-2 pre-commit hook. Scaling
  to more sibling pages = adding `SCENARIOS` entries, not touching the renderer.
- **Signature feature:** split-screen hero with an embedded point-scored quiz.
  `quiz.utmCampaign` drives the Lendmate CTA URL
  (`https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=<utmCampaign>`);
  `quiz.resultProfiles` are serialized to JSON and each should carry a distinct
  `utm_content` (the audit's cta-correctness check flags duplicate `profile-` values).
  All CTAs are `rel="nofollow sponsored"`.
- **Quirk:** the quiz result CTA renders as `href="#"` placeholder (filled by JS);
  the audit's empty-anchor check explicitly excludes `id="resultCta"`.

## generate-city-pages.js  (root)

- **Emits:** `business-loans/<city>-<state>/index.html` for 200 vendored parasite
  cities + 12 inline Tier-1 cities (212 total).
- **Data source:** `data/city-parasite-content.json` — a map of
  `<parasite-filename> → { metaDesc, faqs:[{q,a}] }`, vendored from the retired
  seo-pages parasites (see `scripts/vendor-parasite-content.js`). Tier-1 cities come
  from `data/tier1-cities.json` (`{cities:[{citySlug, stateAbbr, metaDesc, faqs}]}`).
  **Does NOT read `../seo-pages` anymore** — do not reintroduce that dependency.
- **Content:** real FAQs from the vendored JSON + templated purpose cards and content
  sections (per city/state substitution). Related links = 3 nearest same-state siblings.
- **Invoke:** `node generate-city-pages.js` (regenerates the whole set; also touches
  the sitemap). No audit guardrail; the pre-commit hook covers staged output.
- **Quirk:** a city entry with zero FAQs is skipped with an error — with the vendored
  data all 200 resolve.

## generate-profession-pages.js  (root)

- **Emits:** `credit-cards/<profession>/index.html` for 57 vendored professions.
- **Data source:** `data/profession-parasite-content.json` — a map of
  `<parasite-filename> → { canonicalSlug, metaDesc, faqs }`. `canonicalSlug` matters:
  some filenames differ from the target slug (e.g. `mechanics` → `auto-mechanics`).
  **Does NOT read `../seo-pages` anymore.**
- **Config:** `CTR_OVERRIDES[slug] = { title, metaDesc }` — per-profession CTR-tuned
  overrides (title may use `{YEAR}`). When no override exists the title falls back to
  `Best Credit Cards for <Pro> of <YEAR> | My Money Marketplace` (brand suffix KEPT
  here — prefer a `CTR_OVERRIDES` entry to drop it on pages you care about). Meta falls
  back to the vendored parasite meta, then a generic string.
- **Affiliate:** credit-card pages route to CardRatings `src=705663` (live).
- **Invoke:** `node generate-profession-pages.js`. No audit guardrail.
- **Quirk:** related grid commits to exactly 3 cards (bucket siblings first, then
  alphabetical padding) to match the CSS.

## generate-hub-pages.js  (root)

- **Emits:** 8 hub/category pages patterned on `personal-loans/index.html` (e.g.
  `personal-loans/bad-credit/`).
- **Data source:** fully self-contained in-file `PAGES` array — no external data file.
- **Config schema (per page):** `slug`, `title`, `metaDesc`, `breadcrumb[]`, `h1`,
  `heroSub`, `articleHeadline`, `ctaUtm`, `ctaHeadline`, `ctaSub`, `purposeHeading`,
  `purposeCards[]`, `contentSections[{h3,p}]`, `faqs[{q,a}]`, related products.
- **Invoke:** `node generate-hub-pages.js`. No audit guardrail.
- **Quirk:** `TODAY` is hardcoded (`'2026-04-16'`) rather than `new Date()` — update
  it if regenerating and you want a fresh `dateModified`.
