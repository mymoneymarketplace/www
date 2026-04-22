# Content Audit Report

_Generated: 2026-04-22T21:13:03.571Z · Duration: 2.4s · Pages scanned: 320_

## Summary

| Metric | Count |
| --- | ---: |
| Pages scanned | 320 |
| Pages with at least one issue | 38 |
| Total issues | 89 |
| CRITICAL | 1 |
| HIGH | 25 |
| MEDIUM | 47 |
| LOW | 16 |

### Issues per check

| Check | Issue count |
| --- | ---: |
| cross-page-leakage | 33 |
| structural | 22 |
| internal-link-validity | 20 |
| cta-correctness | 5 |
| data-traceability | 9 |

## Check: cross-page-leakage

33 issues.

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

## Check: internal-link-validity

20 issues.

- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/miami-fl"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/dallas-tx"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/atlanta-ga"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/chicago-il"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/houston-tx"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/phoenix-az"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/philadelphia-pa"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/san-antonio-tx"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/san-diego-ca"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/denver-co"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/seattle-wa"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/nashville-tn"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/austin-tx"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/charlotte-nc"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/las-vegas-nv"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/portland-or"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/columbus-oh"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/indianapolis-in"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/san-jose-ca"
  - _Fix:_ Fix the link target or remove
- **[HIGH]** `/sba-loans` — Dead internal link: "/sba-loans/jacksonville-fl"
  - _Fix:_ Fix the link target or remove

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
2. **[HIGH]** `/sba-loans/auto-body` _(cross-page-leakage)_ — Industry term "auto repair" (from /auto-repair/) in <h3>: "Growing faster than general auto repair"
3. **[HIGH]** `/sba-loans/cpas` _(cross-page-leakage)_ — Industry term "book of business" (from /insurance-agencies/) in program-card text: "Right for: rarely used; CPA firm capital is almost entirely intangible (book of business, staff, technology subscription..."
4. **[HIGH]** `/sba-loans/pet-care` _(cross-page-leakage)_ — Industry term "veterinary" (from /veterinarians/) in <h3>: "Distinct from veterinary medicine"
5. **[HIGH]** `/sba-loans/pet-care` _(cross-page-leakage)_ — Industry term "daycare" (from /child-care/) in program-card text: "Right for: facility buildouts for boarding and daycare, acquisitions, multi-location expansion...."
6. **[HIGH]** `/` _(structural)_ — Canonical mismatch: "https://mymoneymarketplace.com/" but expected "https://mymoneymarketplace.com"
7. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/miami-fl"
8. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/dallas-tx"
9. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/atlanta-ga"
10. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/chicago-il"
11. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/houston-tx"
12. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/phoenix-az"
13. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/philadelphia-pa"
14. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/san-antonio-tx"
15. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/san-diego-ca"
16. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/denver-co"
17. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/seattle-wa"
18. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/nashville-tn"
19. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/austin-tx"
20. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/charlotte-nc"
21. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/las-vegas-nv"
22. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/portland-or"
23. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/columbus-oh"
24. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/indianapolis-in"
25. **[HIGH]** `/sba-loans` _(internal-link-validity)_ — Dead internal link: "/sba-loans/san-jose-ca"

## Observations

- Issue distribution across checks: cross-page-leakage: 33, structural: 22, internal-link-validity: 20, cta-correctness: 5, data-traceability: 9
- 38 of 320 pages (11.9%) flagged at least one issue.
- Pages with the most issues:
  - `/sba-loans`: 21 issues
  - `/sba-loans/pet-care`: 6 issues
  - `/sba-loans/auto-body`: 4 issues
  - `/sba-loans/physicians`: 4 issues
  - `/sba-loans/chiropractors`: 3 issues
  - `/sba-loans/dentists`: 3 issues
  - `/sba-loans/specialty-trades`: 3 issues
  - `/sba-loans/accounting`: 2 issues
  - `/sba-loans/auto-repair`: 2 issues
  - `/sba-loans/beauty-salons`: 2 issues
