# Content Audit Report

_Generated: 2026-04-23T18:55:22.411Z · Duration: 1.9s · Pages scanned: 326_

## Summary

| Metric | Count |
| --- | ---: |
| Pages scanned | 326 |
| Pages with at least one issue | 40 |
| Total issues | 73 |
| CRITICAL | 1 |
| HIGH | 5 |
| MEDIUM | 51 |
| LOW | 16 |

### Issues per check

| Check | Issue count |
| --- | ---: |
| structural | 22 |
| cross-page-leakage | 37 |
| data-traceability | 9 |
| cta-correctness | 5 |

## Check: cross-page-leakage

37 issues.

- **[CRITICAL]** `/sba-loans/pet-care` — Industry term "daycare" (from /child-care/) appears in <title>: "SBA Loan for Pet Boarding, Grooming &amp; Daycare 2026 | My Money Marketplace"
  - _Fix:_ Rewrite <title> to remove "daycare"
- **[HIGH]** `/sba-loans/auto-body` — Industry term "auto repair" (from /auto-repair/) in <h3>: "Growing faster than general auto repair"
  - _Fix:_ Rewrite h3 to remove "auto repair"
- **[HIGH]** `/sba-loans/cpas` — Industry term "book of business" (from /insurance-agencies/) in program-card text: "Right for: rarely used; CPA firm capital is almost entirely intangible (book of business, staff, technology subscription..."
  - _Fix:_ Update programsContext.fits in config
- **[HIGH]** `/sba-loans/pet-care` — Industry term "veterinary" (from /veterinarians/) in <h3>: "Distinct from veterinary medicine"
  - _Fix:_ Rewrite h3 to remove "veterinary"
- **[HIGH]** `/sba-loans/pet-care` — Industry term "daycare" (from /child-care/) in program-card text: "Right for: facility buildouts for boarding and daycare, acquisitions, multi-location expansion...."
  - _Fix:_ Update programsContext.fits in config
- **[MEDIUM]** `/sba-loans/accounting` — Industry term "cpa firm" (from /cpas/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/auto-body` — Industry term "auto repair" (from /auto-repair/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/auto-body` — Industry term "mechanical repair" (from /auto-repair/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/auto-repair` — Industry term "sba franchise directory" (from /franchise/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/auto-repair/texas` — Industry term "restaurant" (from /restaurants/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/beauty-salons` — Industry term "medspa" (from /personal-care/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/beauty-salons` — Industry term "sba franchise directory" (from /franchise/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/child-care` — Industry term "sba franchise directory" (from /franchise/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/chiropractors` — Industry term "dental" (from /dentists/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/chiropractors` — Industry term "physician" (from /physicians/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/chiropractors` — Industry term "sba franchise directory" (from /franchise/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/cpas` — Industry term "book of business" (from /insurance-agencies/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/dentists` — Industry term "restaurant" (from /restaurants/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/dentists` — Industry term "veterinary" (from /veterinarians/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/landscaping` — Industry term "sba franchise directory" (from /franchise/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/personal-care` — Industry term "physician" (from /physicians/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/personal-care` — Industry term "hair salon" (from /beauty-salons/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/pet-care` — Industry term "veterinary" (from /veterinarians/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/pet-care` — Industry term "daycare" (from /child-care/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/pet-care` — Industry term "sba franchise directory" (from /franchise/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/physicians` — Industry term "restaurant" (from /restaurants/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/physicians` — Industry term "dental" (from /dentists/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/physicians` — Industry term "veterinary" (from /veterinarians/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/plumbing-hvac` — Industry term "sba franchise directory" (from /franchise/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/restaurants` — Industry term "sba franchise directory" (from /franchise/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/specialty-trades` — Industry term "landscaping" (from /landscaping/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/specialty-trades` — Industry term "plumbing" (from /plumbing-hvac/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/specialty-trades` — Industry term "hvac" (from /plumbing-hvac/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/veterinarians` — Industry term "daycare" (from /child-care/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/veterinarians/california` — Industry term "dental" (from /dentists/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/veterinarians/california` — Industry term "auto repair" (from /auto-repair/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording
- **[MEDIUM]** `/sba-loans/veterinarians/california` — Industry term "pet care" (from /pet-care/) appears in body prose (outside links and headings)
  - _Fix:_ Review context — may be legitimate reference or may need rewording

## Check: structural

22 issues.

- **[HIGH]** `/` — Canonical mismatch: "https://mymoneymarketplace.com/" but expected "https://mymoneymarketplace.com"
  - _Fix:_ Correct the canonical URL to match the file path
- **[MEDIUM]** `/` — Low word count: 379 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/business-loans/chesapeake-va` — Low word count: 799 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/business-loans/miami-fl` — Low word count: 797 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/business-loans/raleigh-nc` — Low word count: 798 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/contact` — Low word count: 409 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/disclosures` — Low word count: 775 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/equipment-financing` — Low word count: 575 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/line-of-credit` — Low word count: 590 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/personal-loans/bad-credit` — Low word count: 708 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/personal-loans/debt-consolidation` — Low word count: 693 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/personal-loans/home-improvement` — Low word count: 630 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/personal-loans/medical` — Low word count: 588 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/personal-loans/same-day` — Low word count: 569 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[MEDIUM]** `/sba-loans/bad-credit` — Missing non-origination disclosure on SBA page
  - _Fix:_ Add "MMM does not originate SBA loans..." text somewhere on the page
- **[MEDIUM]** `/sba-loans/business-acquisition` — Missing non-origination disclosure on SBA page
  - _Fix:_ Add "MMM does not originate SBA loans..." text somewhere on the page
- **[MEDIUM]** `/sba-loans/franchise` — Missing non-origination disclosure on SBA page
  - _Fix:_ Add "MMM does not originate SBA loans..." text somewhere on the page
- **[MEDIUM]** `/sba-loans/no-collateral` — Missing non-origination disclosure on SBA page
  - _Fix:_ Add "MMM does not originate SBA loans..." text somewhere on the page
- **[MEDIUM]** `/sba-loans/startups` — Missing non-origination disclosure on SBA page
  - _Fix:_ Add "MMM does not originate SBA loans..." text somewhere on the page
- **[MEDIUM]** `/working-capital` — Low word count: 594 words (<800)
  - _Fix:_ Expand editorial content or evaluate whether page has enough substance
- **[LOW]** `/business-loans` — 3 empty or "#" anchor(s) present (excluding quiz-result placeholder)
  - _Fix:_ Replace with real URLs or remove
- **[LOW]** `/sba-loans` — 4 empty or "#" anchor(s) present (excluding quiz-result placeholder)
  - _Fix:_ Replace with real URLs or remove

## Check: cta-correctness

5 issues.

- **[LOW]** `/sba-loans/bad-credit` — Lendmate URL missing utm_content: https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=sba-bad-credit-closing-
  - _Fix:_ Add utm_content for attribution
- **[LOW]** `/sba-loans/business-acquisition` — Lendmate URL missing utm_content: https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=sba-business-acquisitio
  - _Fix:_ Add utm_content for attribution
- **[LOW]** `/sba-loans/franchise` — Lendmate URL missing utm_content: https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=sba-franchise-closing-c
  - _Fix:_ Add utm_content for attribution
- **[LOW]** `/sba-loans/no-collateral` — Lendmate URL missing utm_content: https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=sba-no-collateral-closi
  - _Fix:_ Add utm_content for attribution
- **[LOW]** `/sba-loans/startups` — Lendmate URL missing utm_content: https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=sba-startups-closing-ct
  - _Fix:_ Add utm_content for attribution

## Check: data-traceability

9 issues.

- **[LOW]** `/sba-loans/accounting` — Expected data point not found on page: loan_count=1722
  - _Fix:_ Verify page stats match data source or update copy
- **[LOW]** `/sba-loans/auto-body` — Expected data point not found on page: loan_count=1767
  - _Fix:_ Verify page stats match data source or update copy
- **[LOW]** `/sba-loans/auto-repair` — Expected data point not found on page: loan_count=5413
  - _Fix:_ Verify page stats match data source or update copy
- **[LOW]** `/sba-loans/dentists` — Expected data point not found on page: loan_count=4070
  - _Fix:_ Verify page stats match data source or update copy
- **[LOW]** `/sba-loans/insurance-agencies` — Expected data point not found on page: loan_count=4249
  - _Fix:_ Verify page stats match data source or update copy
- **[LOW]** `/sba-loans/physicians` — Expected data point not found on page: loan_count=3986
  - _Fix:_ Verify page stats match data source or update copy
- **[LOW]** `/sba-loans/plumbing-hvac` — Expected data point not found on page: loan_count=6128
  - _Fix:_ Verify page stats match data source or update copy
- **[LOW]** `/sba-loans/restaurants` — Expected data point not found on page: loan_count=16355
  - _Fix:_ Verify page stats match data source or update copy
- **[LOW]** `/sba-loans/veterinarians` — Expected data point not found on page: loan_count=1636
  - _Fix:_ Verify page stats match data source or update copy

## Prioritized action list

Top 25 issues to fix first (by severity):

1. **[CRITICAL]** `/sba-loans/pet-care` _(cross-page-leakage)_ — Industry term "daycare" (from /child-care/) appears in <title>: "SBA Loan for Pet Boarding, Grooming &amp; Daycare 2026 | My Money Marketplace"
2. **[HIGH]** `/` _(structural)_ — Canonical mismatch: "https://mymoneymarketplace.com/" but expected "https://mymoneymarketplace.com"
3. **[HIGH]** `/sba-loans/auto-body` _(cross-page-leakage)_ — Industry term "auto repair" (from /auto-repair/) in <h3>: "Growing faster than general auto repair"
4. **[HIGH]** `/sba-loans/cpas` _(cross-page-leakage)_ — Industry term "book of business" (from /insurance-agencies/) in program-card text: "Right for: rarely used; CPA firm capital is almost entirely intangible (book of business, staff, technology subscription..."
5. **[HIGH]** `/sba-loans/pet-care` _(cross-page-leakage)_ — Industry term "veterinary" (from /veterinarians/) in <h3>: "Distinct from veterinary medicine"
6. **[HIGH]** `/sba-loans/pet-care` _(cross-page-leakage)_ — Industry term "daycare" (from /child-care/) in program-card text: "Right for: facility buildouts for boarding and daycare, acquisitions, multi-location expansion...."
7. **[MEDIUM]** `/business-loans/chesapeake-va` _(structural)_ — Low word count: 799 words (<800)
8. **[MEDIUM]** `/business-loans/miami-fl` _(structural)_ — Low word count: 797 words (<800)
9. **[MEDIUM]** `/business-loans/raleigh-nc` _(structural)_ — Low word count: 798 words (<800)
10. **[MEDIUM]** `/contact` _(structural)_ — Low word count: 409 words (<800)
11. **[MEDIUM]** `/disclosures` _(structural)_ — Low word count: 775 words (<800)
12. **[MEDIUM]** `/equipment-financing` _(structural)_ — Low word count: 575 words (<800)
13. **[MEDIUM]** `/` _(structural)_ — Low word count: 379 words (<800)
14. **[MEDIUM]** `/line-of-credit` _(structural)_ — Low word count: 590 words (<800)
15. **[MEDIUM]** `/personal-loans/bad-credit` _(structural)_ — Low word count: 708 words (<800)
16. **[MEDIUM]** `/personal-loans/debt-consolidation` _(structural)_ — Low word count: 693 words (<800)
17. **[MEDIUM]** `/personal-loans/home-improvement` _(structural)_ — Low word count: 630 words (<800)
18. **[MEDIUM]** `/personal-loans/medical` _(structural)_ — Low word count: 588 words (<800)
19. **[MEDIUM]** `/personal-loans/same-day` _(structural)_ — Low word count: 569 words (<800)
20. **[MEDIUM]** `/sba-loans/accounting` _(cross-page-leakage)_ — Industry term "cpa firm" (from /cpas/) appears in body prose (outside links and headings)
21. **[MEDIUM]** `/sba-loans/auto-body` _(cross-page-leakage)_ — Industry term "auto repair" (from /auto-repair/) appears in body prose (outside links and headings)
22. **[MEDIUM]** `/sba-loans/auto-body` _(cross-page-leakage)_ — Industry term "mechanical repair" (from /auto-repair/) appears in body prose (outside links and headings)
23. **[MEDIUM]** `/sba-loans/auto-repair` _(cross-page-leakage)_ — Industry term "sba franchise directory" (from /franchise/) appears in body prose (outside links and headings)
24. **[MEDIUM]** `/sba-loans/auto-repair/texas` _(cross-page-leakage)_ — Industry term "restaurant" (from /restaurants/) appears in body prose (outside links and headings)
25. **[MEDIUM]** `/sba-loans/bad-credit` _(structural)_ — Missing non-origination disclosure on SBA page

## Observations

- Issue distribution: structural: 22, cross-page-leakage: 37, data-traceability: 9, cta-correctness: 5
- 40 of 326 pages (12.3%) flagged at least one issue.
- Pages with the most issues:
  - `/sba-loans/pet-care`: 6 issues
  - `/sba-loans/auto-body`: 4 issues
  - `/sba-loans/physicians`: 4 issues
  - `/sba-loans/chiropractors`: 3 issues
  - `/sba-loans/dentists`: 3 issues
  - `/sba-loans/specialty-trades`: 3 issues
  - `/sba-loans/veterinarians/california`: 3 issues
  - `/`: 2 issues
  - `/sba-loans/accounting`: 2 issues
  - `/sba-loans/auto-repair`: 2 issues
