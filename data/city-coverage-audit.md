# City page coverage audit — business-loans cluster

_Generated: 2026-04-23_

## Summary

The apex site has **200 business-loans city pages** at `/business-loans/<city>-<state>/`, each mirroring a parasite page at `seo-pages/business-loans-<city>-<state>.html`. The apex generator (`generate-city-pages.js`) builds pages 1:1 from the parasite set — no reference list, no filter, no population threshold. Whatever exists as a parasite gets an apex page; whatever doesn't, doesn't.

**The source of the gap is the seo-pages parasite set itself.** There is no city-list JSON/CSV governing the batch — it's just the set of HTML files that exist in the seo-pages directory, which appears to have been assembled ad-hoc rather than by pulling from a canonical top-N-cities reference.

### Coverage quality

| Benchmark | Pages present | Coverage |
| --- | ---: | ---: |
| Top 100 US cities by ZCTA-sum population (uszips.csv, St-normalized) | 75 | **75%** |
| Top 42 by popular reputation (Census + business-prominence composite) | 30 | **71%** |
| Top 20 | 15 | **75%** |
| Top 10 | 7 | **70%** |

At the **top of the funnel — the most important, highest-search-volume pages — the gap is 25-30%.** That's not a long-tail coverage issue; it's a gap at the head term.

## The missing metros

### Tier 1 — major US metros that should unambiguously have apex pages

| Rank | Slug | Notes |
| ---: | --- | --- |
| #1 | `new-york-ny` | Largest US market by any measure. Apex has `yonkers-ny`, `rochester-ny`, `buffalo-ny`, `syracuse-ny` — but no NYC. |
| #2 | `los-angeles-ca` | Apex covers **46 CA cities** including every LA-metro suburb (Anaheim, Long Beach, Santa Ana, Burbank, Glendale, Torrance, Inglewood, Pasadena-equivalents) but **not LA proper**. |
| #13 | `fort-worth-tx` | Apex has `dallas-tx`, `arlington-tx`, `plano-tx`, `frisco-tx`, `irving-tx` — every DFW suburb — but not Fort Worth itself. |
| #17 | `san-francisco-ca` | Apex has `san-jose-ca`, `oakland`-adjacent cities — but no SF. |
| #20 | `washington-dc` | DC is a district, not a state. Possible slug-convention concern, but naming `washington-dc` follows the established pattern (e.g. `kansas-city-ks` / `kansas-city-mo` use two-letter codes). |
| #21 | `boston-ma` | Apex has `worcester-ma`, `springfield-ma`, `cambridge`-adjacent — but no Boston. |
| #22 | `el-paso-tx` | Apex has 24 TX cities but not El Paso. |
| #24 | `detroit-mi` | Apex has `warren-mi`, `sterling-heights-mi`, `ann-arbor-mi` — but not Detroit. |
| #25 | `oklahoma-city-ok` | Apex has zero OK pages at all. |
| #31 | `oakland-ca` | Apex has Bay Area suburbs (Fremont, Hayward, Sunnyvale) but not Oakland. |
| #41 | `cleveland-oh` | Apex has `columbus-oh`, `cincinnati-oh`, `toledo-oh`, `akron-oh`, `dayton-oh` — but not Cleveland. |
| #44 | `tulsa-ok` | Same as OKC — apex has no OK pages. |

**12 tier-1 missing metros.** The pattern "suburbs present, primary city missing" repeats across LA, NYC, DFW, SF Bay, Boston, Detroit, Cleveland. This strongly suggests **an error or systematic omission at the original parasite-generation time**, not an intentional strategy.

### Tier 2 — secondary markets below #100 but arguably worth adding

Cities that show up in the uszips.csv top-100 by ZCTA-sum and aren't covered:
- `west-palm-beach-fl` (#74) — strong FL market
- `oakland-ca` (listed above; also appears here)
- `pompano-beach-fl` (#77) — secondary FL market
- `vancouver-wa` (#82) — Portland-metro complement
- `kissimmee-fl` (#86) — Orlando-metro complement
- `columbia-sc` (#87) — state capital, only SC gap
- `naples-fl` (#89)

Tier 2 is largely optional / strategic — these are secondary metros that secondary-cluster sites typically include when pursuing long-tail coverage but aren't urgent like Tier 1.

### NYC borough oddity

The uszips.csv top-100 also lists `brooklyn-ny` (#3), `bronx-ny` (#11), and `staten-island-ny` (#56) as separate entries because NYC's ZIP codes resolve to borough-level city names in USPS data. A single `new-york-ny` page in this cluster's naming convention would serve all three. Recommend **not** generating borough-level pages — stick to the established `<city>-<state>` convention with one NYC entry.

## Why is it like this?

### The naming convention is fine

All 200 existing slugs follow `<hyphenated-city-lowercase>-<state-abbr>`. Multi-word cities work cleanly (`kansas-city-mo`, `salt-lake-city-ut`, `san-antonio-tx`, `new-orleans-la`, `st-paul-mn`). There's no technical reason Los Angeles or San Francisco couldn't be `los-angeles-ca` / `san-francisco-ca` under this convention.

### The generator is fine

`generate-city-pages.js` mirrors parasites 1:1 and has no exclusion logic. The gap isn't created here.

### The source parasite set is the issue

No clean list was used. The parasite set was assembled ad-hoc. The top-reputation missing list (LA, NYC, SF, Boston, Detroit, DC, Fort Worth, El Paso, OKC, Tulsa, Oakland, Cleveland) suggests either:
1. An original list-compilation error that dropped these specific entries, or
2. A partial-generation failure during the parasite batch build that never got backfilled.

No log or manifest exists to distinguish between these hypotheses. The practical distinction doesn't matter — the fix is the same regardless.

## Recommended fix scope

### Priority batch: 12 Tier-1 metros

Build parasites + apex mirrors for:

```
new-york-ny
los-angeles-ca
san-francisco-ca
fort-worth-tx
washington-dc        (confirm slug convention supports dc-as-state)
boston-ma
el-paso-tx
detroit-mi
oklahoma-city-ok
oakland-ca
cleveland-oh
tulsa-ok
```

**Why priority.** These are the pages that drive the vast majority of the "business loans <city>" search demand. Their absence creates:
- Broken internal links from the new CA state × industry pages (already caught `los-angeles-ca` / `san-francisco-ca` as dead links by the pre-commit audit when building `/sba-loans/dentists/california/`).
- Missing representation for every major US business market in the city-page cluster.
- A competitive blind spot — no apex page to compete for the head terms.

### Secondary batch: ~7 Tier-2 metros (optional, strategic)

`west-palm-beach-fl`, `pompano-beach-fl`, `vancouver-wa`, `kissimmee-fl`, `columbia-sc`, `naples-fl`, plus state-capital gaps (`honolulu-hi` if desired). Build only if chasing long-tail coverage.

### Do NOT auto-generate "top 500 US cities"

The apex's 200-city baseline is a deliberate scale choice. Adding Tier 1 (+12) and optionally Tier 2 (+7) brings the site to ~220 city pages — still in the "curated" range rather than the "programmatic long-tail" range. Going broader risks generating thin city pages with no underlying data differentiation.

### Work to do per missing page

Each Tier-1 add requires:
1. Parasite generation in `seo-pages/` (~1 HTML file per city)
2. Apex mirror via `generate-city-pages.js` (automated)
3. FAQ content (can pull from the parasite's JSON-LD like the existing 200)
4. Internal link updates — especially for the state × industry pages that should cross-link to the new city pages

Estimated effort: a morning for Tier 1 (12 pages via batch script), if there's a pattern from the existing 200 that generalizes. Longer if each page needs hand-tuned data.

## Decision recommendation

**Don't build in this session** — but the Tier 1 gap is a real priority. Schedule as a dedicated batch in the next content cycle. The LA/SF discovery from the dental cluster is just the tip — NYC, Boston, DC, Detroit, Fort Worth are the bigger omissions commercially.

## Appendix: NYC borough discussion

If NYC-level targeting is ever desired, consider:
- `new-york-ny` as the primary city page (covers all five boroughs generically)
- `brooklyn-ny`, `manhattan-ny`, `bronx-ny`, `queens-ny`, `staten-island-ny` as borough-specific pages for narrower intent

Most competitors settle for the city-level page. Borough pages are only valuable if the site is doing deep NYC-specific work, which isn't today's posture.
