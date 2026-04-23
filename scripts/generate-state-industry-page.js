#!/usr/bin/env node
/**
 * generate-state-industry-page.js
 *
 * NAICS × STATE-parameterized SBA page generator. Sibling of
 * generate-industry-page.js. Reads state-specific stats from
 * industries[NAICS].state_breakouts[STATE_ABBR] plus state metadata
 * from state_reference[STATE_ABBR].
 *
 * Writes to sba-loans/<industrySlug>/<stateSlug>/index.html.
 *
 * Usage:
 *   node scripts/generate-state-industry-page.js 722511 CA
 *
 * Template sections:
 *   - Hero + simplified 4-question quiz (3 profiles, not 4)
 *   - State-specific "by the numbers" block with national comparison
 *   - State top-lenders table with any narrative lender callout
 *   - State market context narrative (industry-specific, configured per combo)
 *   - State city cross-links (only to pages that actually exist)
 *   - Short industry mechanics + pointer to parent industry page
 *   - FAQ
 *   - Closing CTA
 *
 * Per the prompt, sections whose source data is null in
 * state_reference (e.g. SBA district office, SBDC) are omitted
 * entirely rather than rendered with placeholders.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA = require('../data/industry-data.json');

const fmt = {
    num: n => Math.round(n).toLocaleString('en-US'),
    usdShort: n => n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${Math.round(n).toLocaleString('en-US')}`,
    usdK: n => `$${Math.round(n/1000)}K`,
    pct: n => `${n.toFixed(2)}%`,
    pct1: n => `${n.toFixed(1)}%`,
    signedPct: n => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`,
};

function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Per (NAICS, STATE) configs ─────────────────────────────────────────
const CONFIGS = {

'722511_CA': {
    naicsCode: '722511',
    state: 'CA',
    industryParentSlug: 'restaurants',
    industryLabel: 'restaurants',
    industryLabelCap: 'Restaurants',
    industryLabelCapSingular: 'Restaurant',
    stateSlug: 'california',
    stateName: 'California',
    campaignSlug: 'sba-restaurants-california-quiz',

    heroPhoto: {
        src: 'https://images.pexels.com/photos/32884007/pexels-photo-32884007.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Coastal California restaurant dining patio — Malibu Farm Pier Cafe with ocean view, representative of California restaurants that use SBA financing',
        width: 1200,
        height: 800,
        photographer: 'Abhishek Navlakha',
        photographerUrl: 'https://www.pexels.com/@navlakha/',
        sourceUrl: 'https://www.pexels.com/photo/32884007/',
        sourceName: 'Pexels',
    },
    communityBankNames: ['Bank of Hope', 'Hanmi Bank', 'PCB Bank'],

    title: 'SBA Loans for Restaurants in California 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for California restaurants. 2,062 CA restaurant SBA loans approved FY2020-2025 ($1.24B). Take the 2-minute quiz to match with California-restaurant-experienced SBA lenders.',
    heroSub: 'California is the largest restaurant SBA lending market in the United States &mdash; <strong>12.6% of all restaurant SBA loans nationally</strong>. Deal sizes run larger than the national average, the lender mix has unique California characteristics, and regulatory context meaningfully affects underwriting.',

    serviceDescription: 'My Money Marketplace helps California restaurant operators compare SBA 7(a) and 504 options and get matched with lenders experienced in California restaurant underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',

    // California-specific editorial content
    marketContextHtml: `
        <p>California is the largest restaurant market in the United States by almost any measure &mdash; population, restaurant count, dining-out spend, tourism-driven demand. That scale shows up in the SBA data: <strong>California accounts for 12.6% of all restaurant SBA loans nationally</strong>, with 2,062 loans approved FY2020-2025 and $1.24 billion in total approved volume. The second-largest restaurant SBA state (Texas) trails California at 7.3% share.</p>
        <p>California&rsquo;s restaurant SBA deals also run larger than the national average: <strong>$603,000 average loan vs. $528,000 nationally</strong> (+14%), with the median loan at $315,000 vs. $255,000 nationally (+24%). The higher deal sizes reflect California&rsquo;s commercial real estate costs, labor cost structure, and tendency toward more capital-intensive concepts compared to lower-cost states.</p>
        <h3>Major metros drive the concentration</h3>
        <p>Los Angeles, San Francisco / Bay Area, and San Diego are the three dominant metros for California restaurant SBA lending. Orange County, Sacramento, and the Inland Empire each add meaningful volume. San Jose and the broader Silicon Valley area skew toward higher-ticket full-service concepts, while LA and SF carry the full range from neighborhood independents to high-capital acquisitions.</p>
        <h3>California regulatory context for SBA underwriting</h3>
        <p>Several California-specific factors meaningfully affect how lenders underwrite restaurant deals in the state:</p>
        <ul>
            <li><strong>Minimum wage and labor cost structure.</strong> California&rsquo;s minimum wage (currently $16.50 statewide, higher in many cities) and the 2024 fast-food minimum wage ($20) drive higher labor as a percentage of revenue than national averages. Lenders model the California labor cost baseline explicitly in DSCR projections rather than applying national benchmarks.</li>
            <li><strong>California-specific wage and hour compliance.</strong> Overtime rules, meal-and-rest-break requirements, and PAGA (Private Attorneys General Act) exposure create meaningful compliance cost that underwriters factor into projections. A restaurant operation with clean PAGA history underwrites materially better than one with unresolved wage-and-hour claims.</li>
            <li><strong>Liquor license complexity.</strong> California ABC liquor license transfers can add 60-120 days to deal timelines depending on license type and county. On acquisition deals where the liquor license is a material asset, lenders coordinate with the ABC transfer process explicitly &mdash; generalist banks unfamiliar with California ABC often miss this timeline entirely.</li>
            <li><strong>Rent-to-sales ratios.</strong> California commercial rent pressures push rent-to-sales above the 6-10% national benchmark in most major metros. Lenders evaluate rent-to-sales closely; a concept with rent above 12% of projected revenue in a California major metro faces a harder underwriting path regardless of other factors.</li>
        </ul>
        <p>None of this is disqualifying &mdash; specialist California restaurant lenders underwrite to these conditions every day. What it does mean is that lender match matters even more in California than in lower-cost states.</p>
    `,

    lenderCalloutHtml: `
        <p>California&rsquo;s restaurant SBA lender mix has a distinctive feature: <strong>three Korean-American community banks appear in the top ten</strong> &mdash; Bank of Hope (the #1 lender by count), Hanmi Bank (#5), and PCB Bank (#7). Combined, these three institutions account for roughly 16% of all California restaurant SBA lending in the dataset.</p>
        <p>The pattern reflects genuine market dynamics. Korean-American restaurant ownership is a significant segment of California&rsquo;s independent restaurant industry, particularly in Los Angeles, Orange County, and the Bay Area. These community banks were built to serve that customer base and carry deep lending relationships with Korean-American restaurant operators across multiple generations. For buyers outside that network, the lender landscape still includes strong non-community-bank options &mdash; U.S. Bank (#2 in CA), Northeast Bank, Readycap, Newtek, and Bank of America all appear in the top ten. For buyers who are part of the Korean-American restaurant operator network, Bank of Hope, Hanmi, and PCB are well worth direct approach alongside a broader lender-matching search.</p>
    `,

    // Cross-links to existing CA city pages (verified present)
    cityLinks: [
        { name: 'San Diego', href: '/business-loans/san-diego-ca' },
        { name: 'San Jose', href: '/business-loans/san-jose-ca' },
        { name: 'Sacramento', href: '/business-loans/sacramento-ca' },
        { name: 'Long Beach', href: '/business-loans/long-beach-ca' },
        { name: 'Anaheim', href: '/business-loans/anaheim-ca' },
        { name: 'Fresno', href: '/business-loans/fresno-ca' },
        { name: 'Riverside', href: '/business-loans/riverside-ca' },
    ],

    quiz: {
        questions: [
            {q:"What's your California restaurant situation?",opts:[
                {v:"acquisition",l:"Acquiring an existing CA restaurant"},
                {v:"new-independent",l:"Opening a new independent concept"},
                {v:"franchise",l:"Franchise concept (CA location)"},
                {v:"expansion",l:"Expansion or additional CA location"},
            ]},
            {q:"Primary loan use?",opts:[
                {v:"purchase-price",l:"Acquisition purchase price"},
                {v:"buildout",l:"Buildout / tenant improvements"},
                {v:"equipment",l:"Kitchen or FOH equipment"},
                {v:"working-capital",l:"Working capital"},
                {v:"multiple",l:"Multiple uses combined"},
            ]},
            {q:"Loan amount needed?",opts:[
                {v:"under-500k",l:"Under $500K"},
                {v:"500k-1m",l:"$500K - $1M"},
                {v:"1m-3m",l:"$1M - $3M"},
                {v:"3m-plus",l:"$3M+"},
            ]},
            {q:"Personal credit score?",opts:[
                {v:"below-680",l:"Below 680"},
                {v:"680-719",l:"680-719"},
                {v:"720-plus",l:"720+"},
            ]},
        ],
        profiles: {
            A: {
                badge: "Strong CA acquisition candidate",
                headline: "You're in the California restaurant SBA sweet spot",
                body: "Acquiring an established California restaurant with strong credit and meaningful equity is exactly what specialist California restaurant SBA lenders — Bank of Hope, U.S. Bank, Readycap, Newtek — underwrite at scale. California deal sizes run larger than national averages, which matches the capital these lenders routinely deploy. Plan 60-90 days to close with a California-experienced SBA lender.",
                ctaLabel: "Match with California restaurant SBA lenders",
                utmContent: "profile-a-ca-acquisition",
            },
            B: {
                badge: "CA buildout / expansion",
                headline: "SBA 7(a) with a California-experienced lender",
                body: "California buildout costs run meaningfully above national averages and the regulatory context (labor, ABC licensing, wage-and-hour compliance) affects underwriting. Matching to a lender that closes California restaurant deals at volume is the difference between a clean 60-day close and a grind. Specialist lenders build the California cost baseline into projections rather than applying national benchmarks that miss the reality.",
                ctaLabel: "Match with CA-restaurant-experienced SBA lenders",
                utmContent: "profile-b-ca-buildout",
            },
            C: {
                badge: "Franchise path",
                headline: "Franchise route — see the franchise-specific guide",
                body: "Franchise restaurant SBA files underwrite differently from independent concepts. California franchise operators benefit from brand-level underwriting shortcut if listed in the SBA Franchise Directory. The lender mix and deal mechanics for franchise restaurant SBA are distinct enough to warrant dedicated coverage — see our SBA franchise loan guide.",
                ctaLabel: "See SBA franchise details",
                utmContent: "profile-c-ca-franchise",
                ctaUrl: "/sba-loans/franchise/",
            },
        },
        scoringBody: `
            function score(a) {
                var sit=a[0], use=a[1], amount=a[2], credit=a[3];
                if (sit==='franchise') return 'C';
                if (sit==='acquisition' && (credit==='680-719' || credit==='720-plus')) return 'A';
                if (sit==='acquisition') return 'A';
                return 'B';
            }
        `,
    },

    faqs: [
        {q:"Can I get an SBA loan for a restaurant in California?",a:"Yes. California is the largest single-state restaurant SBA lending market in the US — 2,062 loans approved FY2020-2025 representing 12.6% of all national restaurant SBA volume. SBA 7(a) covers acquisitions, buildouts, equipment, and working capital. Minimum 10% equity injection applies, with specialist lenders typically wanting 15-20% on California deals given the higher cost structure."},
        {q:"What's the typical SBA restaurant loan size in California?",a:"Average SBA restaurant loan in California is approximately $603,000 — roughly 14% above the national restaurant average of $528,000. Median is $315,000 vs. $255,000 nationally. The higher deal sizes reflect California commercial real estate costs, buildout costs, and the tendency toward more capital-intensive concepts particularly in major metros."},
        {q:"Do California restaurants have a higher charge-off rate than national averages?",a:"Modestly, yes. California restaurant SBA 7(a) charge-offs run at 1.45%, compared to the national restaurant average of 1.21% and the all-industry SBA average of 1.36%. The difference reflects California's higher operating cost baseline (labor, rent, compliance) which compresses margins compared to lower-cost states. California restaurants with strong unit economics and experienced operators still underwrite favorably; the state-level average is not a per-file verdict."},
        {q:"Which SBA lenders are most active in California restaurant lending?",a:"Bank of Hope leads by loan count (211 CA restaurant loans), followed by U.S. Bank (198), Northeast Bank (91), Readycap Lending (74), Hanmi Bank (62), Newtek Bank (56), and PCB Bank (55). The top 10 is meaningfully different from the national top 10 — three Korean-American community banks (Bank of Hope, Hanmi, PCB) appear in the California top 10 and collectively represent a significant share of CA restaurant SBA volume."},
        {q:"How does California's minimum wage affect SBA restaurant underwriting?",a:"Lenders model California's labor cost baseline explicitly in post-close cash flow projections rather than applying national benchmarks. California minimum wage ($16.50 statewide, $20 for fast food, higher in many cities) drives labor as a percentage of revenue above national averages. Specialist California restaurant lenders account for this automatically; generalist banks unfamiliar with California labor economics sometimes over-project margins and under-structure working capital."},
        {q:"How long does an SBA loan take to close for a California restaurant?",a:"60-90 days is typical for a SBA 7(a) acquisition or buildout deal with a Preferred Lender experienced in California restaurants. Deals involving California ABC liquor license transfers can add 60-120 days depending on license type and county — lenders experienced with California deals coordinate with the ABC process explicitly. Generalist banks unfamiliar with California ABC liquor license complexity routinely extend timelines meaningfully."},
        {q:"What California-specific issues should I expect in SBA underwriting?",a:"Four factors routinely come up: labor cost modeling (California wage structure), PAGA and wage-and-hour compliance history (clean history underwrites better), liquor license transfer timing and complexity, and rent-to-sales ratios (California commercial rent pressures push rents above national benchmarks). Specialist California restaurant lenders handle these as standard practice; matching to an experienced lender materially affects both timeline and pricing."},
    ],
},

'722511_TX': {
    naicsCode: '722511',
    state: 'TX',
    industryParentSlug: 'restaurants',
    industryLabel: 'restaurants',
    industryLabelCap: 'Restaurants',
    industryLabelCapSingular: 'Restaurant',
    stateSlug: 'texas',
    stateName: 'Texas',
    campaignSlug: 'sba-restaurants-texas-quiz',

    heroPhoto: {
        src: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Texas restaurant interior with modern dining room, representative of full-service restaurants that use SBA financing in Texas',
        width: 1200,
        height: 800,
        photographer: 'Life Of Pix',
        photographerUrl: 'https://www.pexels.com/@life-of-pix/',
        sourceUrl: 'https://www.pexels.com/photo/1267320/',
        sourceName: 'Pexels',
    },
    communityBankNames: ['Frost Bank', 'Cadence Bank', 'PCB Bank', 'Bank of Hope', 'Hanmi Bank'],

    title: 'SBA Loans for Restaurants in Texas 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for Texas restaurants. 1,192 TX restaurant SBA loans approved FY2020-2025 ($879.6M), +42.6% YoY growth. Take the 2-minute quiz to match with Texas-restaurant-experienced SBA lenders.',
    heroSub: 'Texas restaurant SBA lending is the standout growth story in the national data &mdash; <strong>+42.6% YoY growth</strong>, roughly five times the national restaurant rate. Texas is the second-largest restaurant SBA market in the US and deals run notably larger than even California, reflecting the state&rsquo;s major-metro buildout and acquisition pipeline.',

    serviceDescription: 'My Money Marketplace helps Texas restaurant operators compare SBA 7(a) and 504 options and get matched with lenders experienced in Texas restaurant underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',

    // Texas-specific editorial content
    marketContextHtml: `
        <p>Texas is the single fastest-growing restaurant SBA market in the United States. <strong>TX restaurant SBA lending grew +42.6% year-over-year</strong>, compared to the national restaurant rate of +8.7%. The growth is broad-based rather than concentrated in one metro &mdash; Houston, Dallas-Fort Worth, Austin, and San Antonio each carry meaningful independent volume, and the state&rsquo;s population growth and commercial real estate expansion continue to pull both independent and franchise restaurant capital into the SBA channel.</p>
        <p>Texas is now the <strong>second-largest single-state restaurant SBA market</strong> at 7.3% of national volume &mdash; 1,192 loans approved FY2020-2025 representing $879.6 million in total approved capital. Only California is larger. And Texas deals run meaningfully bigger than even California&rsquo;s: <strong>$738,000 average vs. $603,000 in California and $528,000 nationally</strong>. Median loan in Texas is $461,000, roughly 81% above the national median of $255,000, reflecting both the scale of DFW and Houston acquisitions and a tilt toward full-service concepts over small quick-service operators.</p>
        <h3>Metro distribution: DFW, Houston, Austin, San Antonio</h3>
        <p>Four major metros dominate Texas restaurant SBA volume: <strong>Dallas-Fort Worth, Houston, Austin, and San Antonio</strong>. DFW and Houston carry the highest absolute volume reflecting population and dining-out scale. Austin punches above its population weight driven by both the tech-employment-driven demand base and a dense independent-restaurant culture. San Antonio runs a more franchise-heavy mix than the other three metros. Secondary markets including El Paso, Corpus Christi, and the Rio Grande Valley add meaningful volume, and Texas&rsquo;s mid-sized metros (Plano, Arlington, Waco, Lubbock) have active SBA restaurant lending relative to their size.</p>
        <h3>Texas charge-off rate: better than SBA average</h3>
        <p>Texas restaurant SBA 7(a) loans charge off at <strong>1.26% &mdash; a 0.93&times; ratio against the all-industry SBA average of 1.36%</strong>. That&rsquo;s modestly above the national restaurant rate of 1.21% but still materially better than the cross-industry SBA baseline, which is unusual for a restaurant cohort. The favorable performance reflects Texas&rsquo;s lower structural cost baseline (no state income tax, federal minimum wage of $7.25 applies statewide, commercial rent pressures lower than California) combined with a borrower base that leans toward experienced operators on larger-ticket deals.</p>
        <h3>Texas regulatory context for SBA underwriting</h3>
        <p>Texas is a meaningfully friendlier regulatory environment than California for restaurant SBA underwriting. The items that routinely come up:</p>
        <ul>
            <li><strong>Labor cost structure.</strong> Federal minimum wage ($7.25) applies. Tipped wage is $2.13 federal minimum plus tips. No state overtime beyond federal FLSA. Labor as a percentage of revenue runs materially lower than California baselines, which makes DSCR projections more forgiving and often supports larger leverage on the same unit economics.</li>
            <li><strong>Liquor licensing (TABC).</strong> The Texas Alcoholic Beverage Commission issues licenses statewide rather than county-by-county, and license transfers on restaurant acquisitions typically run 30-60 days &mdash; faster than California ABC. Lenders coordinate with TABC transfer timing on deals where the liquor license is a material revenue source.</li>
            <li><strong>No state income tax.</strong> Texas&rsquo;s absence of state income tax affects personal financial modeling on owner-operators &mdash; personal cash flow available to support the loan looks stronger than equivalent income in a high-tax state, which underwriters factor into the personal-side analysis on guarantor strength.</li>
            <li><strong>Commercial rent and buildout costs.</strong> Texas major-metro rent runs meaningfully below California but above national averages. DFW and Houston CBD buildout costs can approach California levels; suburban and secondary markets are substantially cheaper. Rent-to-sales underwriting remains the standard test; Texas deals hit the 6-10% national benchmark more routinely than California.</li>
        </ul>
        <p>The regulatory friendliness is real but not a substitute for deal quality &mdash; lenders still underwrite the operator, the concept, the unit economics, and the location. What Texas provides is a cost baseline that makes marginal files more underwritable than equivalent California files.</p>
    `,

    lenderCalloutHtml: `
        <p>Texas&rsquo;s restaurant SBA lender mix is distinctive in two ways. First, <strong>The Huntington National Bank dominates at the top</strong> with 102 Texas restaurant SBA loans &mdash; nearly 2.3x the next lender. Huntington is the national restaurant SBA volume leader, and its Texas presence reflects a deliberate specialty-lending strategy more than a traditional branch footprint. Second, <strong>three Korean-American community banks (PCB Bank, Bank of Hope, Hanmi Bank) each appear in the top five</strong>, collectively accounting for roughly 10% of Texas restaurant SBA volume. The pattern mirrors California&rsquo;s lender mix and reflects the Korean-American restaurant operator network in Houston and DFW.</p>
        <p>Two Texas-headquartered regional banks complete the picture: <strong>Cadence Bank (Dallas-based, 30 loans) and Frost Bank (San Antonio-based, 26 loans)</strong>. Cadence and Frost both carry strong in-market restaurant SBA relationships particularly for larger acquisition and real-estate-combined deals in the $500K&#8211;$2M range. PNC Bank and Newtek round out the top ten alongside Northeast Bank and Readycap. The takeaway: Texas has more viable lender paths than most single-state markets &mdash; specialist national platforms (Huntington, Newtek, Readycap), Korean-American community banks (PCB, Hope, Hanmi), and Texas regionals (Cadence, Frost). Matching to the right one for your specific deal profile is the practical variable that matters most.</p>
    `,

    // Cross-links to existing TX city business-loans pages (verified present)
    cityLinks: [
        { name: 'Houston', href: '/business-loans/houston-tx' },
        { name: 'Dallas', href: '/business-loans/dallas-tx' },
        { name: 'Austin', href: '/business-loans/austin-tx' },
        { name: 'San Antonio', href: '/business-loans/san-antonio-tx' },
        { name: 'Plano', href: '/business-loans/plano-tx' },
        { name: 'Arlington', href: '/business-loans/arlington-tx' },
        { name: 'Corpus Christi', href: '/business-loans/corpus-christi-tx' },
    ],

    quiz: {
        questions: [
            {q:"What's your Texas restaurant situation?",opts:[
                {v:"acquisition",l:"Acquiring an existing TX restaurant"},
                {v:"new-independent",l:"Opening a new independent concept"},
                {v:"franchise",l:"Franchise concept (TX location)"},
                {v:"expansion",l:"Expansion or additional TX location"},
            ]},
            {q:"Primary loan use?",opts:[
                {v:"purchase-price",l:"Acquisition purchase price"},
                {v:"real-estate",l:"Real estate purchase (building)"},
                {v:"buildout",l:"Buildout / tenant improvements"},
                {v:"equipment",l:"Kitchen or FOH equipment"},
                {v:"multiple",l:"Multiple uses combined"},
            ]},
            {q:"Loan amount needed?",opts:[
                {v:"under-500k",l:"Under $500K"},
                {v:"500k-1m",l:"$500K - $1M"},
                {v:"1m-3m",l:"$1M - $3M"},
                {v:"3m-plus",l:"$3M+"},
            ]},
            {q:"Personal credit score?",opts:[
                {v:"below-680",l:"Below 680"},
                {v:"680-719",l:"680-719"},
                {v:"720-plus",l:"720+"},
            ]},
        ],
        profiles: {
            A: {
                badge: "Strong TX acquisition candidate",
                headline: "You're riding the +42.6% Texas growth curve",
                body: "Acquiring an established Texas restaurant with strong credit and meaningful equity is exactly what the Texas restaurant SBA market is doing at scale right now &mdash; volume is up 42.6% year-over-year and specialist lenders (Huntington, Cadence, Frost, PCB, Bank of Hope, Hanmi, Newtek, Readycap) are actively deploying capital into these deals. Texas deals run larger than even California on average ($738K vs. $603K), which matches the capital these lenders routinely deploy. Plan 60-90 days to close with a Texas-experienced SBA lender.",
                ctaLabel: "Match with Texas restaurant SBA lenders",
                utmContent: "profile-a-tx-acquisition",
            },
            B: {
                badge: "TX buildout or real estate",
                headline: "SBA 7(a) or 504 with a Texas-experienced lender",
                body: "Texas restaurant buildout and real-estate-combined deals benefit from the state's lower cost baseline and faster TABC licensing timelines than higher-regulation states. SBA 504 is the right call when the real estate is part of the deal; 7(a) handles buildouts and equipment-focused files. Texas-headquartered regional lenders (Cadence, Frost) are particularly strong on larger real-estate-combined deals; national specialists (Huntington, Newtek, Readycap) handle buildout and working-capital-heavy files well. Matching to the lender profile that fits your deal shape is the variable that drives close time and pricing.",
                ctaLabel: "Match with TX-restaurant-experienced SBA lenders",
                utmContent: "profile-b-tx-buildout",
            },
            C: {
                badge: "Franchise path",
                headline: "Franchise route &mdash; see the franchise-specific guide",
                body: "Franchise restaurant SBA files underwrite differently from independent concepts. Texas franchise operators benefit from brand-level underwriting shortcut if the concept is listed in the SBA Franchise Directory, and Texas&rsquo;s franchise-heavy metros (particularly San Antonio and secondary markets) make this a meaningful share of Texas restaurant SBA volume. The lender mix and deal mechanics for franchise restaurant SBA are distinct enough to warrant dedicated coverage &mdash; see our SBA franchise loan guide.",
                ctaLabel: "See SBA franchise details",
                utmContent: "profile-c-tx-franchise",
                ctaUrl: "/sba-loans/franchise/",
            },
        },
        scoringBody: `
            function score(a) {
                var sit=a[0], use=a[1], amount=a[2], credit=a[3];
                if (sit==='franchise') return 'C';
                if (use==='real-estate' || use==='buildout') return 'B';
                if (sit==='acquisition' && (credit==='680-719' || credit==='720-plus')) return 'A';
                if (sit==='acquisition') return 'A';
                return 'B';
            }
        `,
    },

    faqs: [
        {q:"Can I get an SBA loan for a restaurant in Texas?",a:"Yes. Texas is the second-largest single-state restaurant SBA market in the US — 1,192 loans approved FY2020-2025 representing 7.3% of all national restaurant SBA volume, and the state is growing at +42.6% year-over-year. SBA 7(a) covers acquisitions, buildouts, equipment, and working capital; SBA 504 handles real estate when the property is part of the deal. Minimum 10% equity injection applies; specialist Texas lenders typically want 15% on larger deals."},
        {q:"What's the typical SBA restaurant loan size in Texas?",a:"Average SBA restaurant loan in Texas is approximately $738,000 — roughly 40% above the national restaurant average of $528,000 and 22% above California's $603,000. Median is $461,000 vs. $255,000 nationally (+81%). Texas deals run larger because of the scale of DFW and Houston acquisitions, the tilt toward full-service concepts over small quick-service operators, and the larger footprints typical in Texas suburban markets compared to denser California metros."},
        {q:"How does Texas restaurant SBA charge-off compare to national?",a:"Texas restaurant SBA 7(a) charges off at 1.26% — a 0.93× ratio against the all-industry SBA average of 1.36%. That's modestly above the national restaurant average of 1.21%, but still materially better than the cross-industry SBA baseline. The favorable performance reflects Texas's lower structural cost baseline and a borrower base that leans toward experienced operators on larger deals."},
        {q:"Which SBA lenders are most active in Texas restaurant lending?",a:"The Huntington National Bank leads by loan count with 102 Texas restaurant SBA loans — roughly 2.3× the next lender. PCB Bank (44), Bank of Hope (36), and Hanmi Bank (36) — three Korean-American community banks — each appear in the top five and collectively hold about 10% of Texas restaurant SBA volume. Two Texas-headquartered regionals are active: Cadence Bank (30 loans, Dallas-based) and Frost Bank (26, San Antonio). PNC, Newtek, Northeast Bank, and Readycap round out the top ten."},
        {q:"Why is Texas restaurant SBA lending growing so fast?",a:"Texas restaurant SBA volume is up +42.6% year-over-year vs. the national restaurant rate of +8.7%. Three drivers: population growth (Texas continues to gain net domestic migration, expanding the restaurant customer base), major-metro acquisition pipeline (aging operator cohorts in DFW and Houston are selling to younger operators who need financing), and commercial real estate expansion making new restaurant buildouts economically viable. The growth is broad-based across Houston, Dallas-Fort Worth, Austin, and San Antonio rather than concentrated in one metro."},
        {q:"How does Texas's regulatory environment affect SBA underwriting?",a:"Texas is meaningfully friendlier than California for restaurant SBA underwriting. Federal minimum wage ($7.25) applies with no state overtime beyond FLSA, which makes labor cost modeling more forgiving. TABC liquor license transfers typically run 30-60 days vs. 60-120 in California. No state income tax improves personal financial modeling on guarantors. Commercial rent runs below California baselines so rent-to-sales underwriting is more routine. None of this substitutes for deal quality, but the cost baseline makes marginal files more underwritable than equivalent California files."},
        {q:"How long does an SBA loan take to close for a Texas restaurant?",a:"60-90 days is typical for an SBA 7(a) acquisition or buildout deal with a Preferred Lender experienced in Texas restaurants. Deals including TABC liquor license transfers add roughly 30-60 days depending on license type. Deals including commercial real estate via SBA 504 plus a 7(a) companion loan typically run 75-120 days for combined closings. Generalist banks unfamiliar with Texas-specific deal mechanics routinely extend these timelines; specialist lenders close on schedule."},
    ],
},

'722511_FL': {
    naicsCode: '722511',
    state: 'FL',
    industryParentSlug: 'restaurants',
    industryLabel: 'restaurants',
    industryLabelCap: 'Restaurants',
    industryLabelCapSingular: 'Restaurant',
    stateSlug: 'florida',
    stateName: 'Florida',
    campaignSlug: 'sba-restaurants-florida-quiz',

    heroPhoto: {
        src: 'https://images.pexels.com/photos/2253643/pexels-photo-2253643.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Florida coastal restaurant with ocean-facing seating representative of tourism-driven restaurant concepts that use SBA financing',
        width: 1200,
        height: 800,
        photographer: 'Pixabay',
        photographerUrl: 'https://www.pexels.com/@pixabay/',
        sourceUrl: 'https://www.pexels.com/photo/2253643/',
        sourceName: 'Pexels',
    },
    communityBankNames: ['BayFirst National Bank', 'SouthState Bank, National Association'],

    title: 'SBA Loans for Restaurants in Florida 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for Florida restaurants. 975 FL restaurant SBA loans approved FY2020-2025 ($748M). Historical charge-off rate below SBA average, but hurricane, tourism-seasonality, and insurance costs shape underwriting. Take the 2-minute quiz.',
    heroSub: 'Florida restaurant SBA performance sits below the cross-industry average on charge-offs (<strong>1.13% vs. 1.36% SBA avg &mdash; a 0.83&times; ratio</strong>), but that headline obscures real structural risks lenders actually underwrite to: hurricane exposure, tourism-season revenue swings, and Florida&rsquo;s historically elevated commercial property insurance costs. The honest framing: Florida is a decent aggregate market with meaningfully non-aggregate risk distribution.',

    serviceDescription: 'My Money Marketplace helps Florida restaurant operators compare SBA 7(a) and 504 options and get matched with lenders experienced in Florida restaurant underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',

    marketContextHtml: `
        <p>Florida is the fourth-largest restaurant SBA market in the US behind California, Texas, and New York. <strong>975 loans approved FY2020-2025 representing $748 million in total approved capital</strong>, at 5.96% of national volume. Average loan is the highest in the top-4 states at <strong>$767,000 (46% above the national restaurant average of $528K)</strong>, reflecting Florida&rsquo;s coastal real estate baseline and the scale of major Orlando, Miami, Tampa, and Fort Lauderdale restaurant acquisitions.</p>
        <p>The aggregate charge-off number looks healthy on paper &mdash; <strong>1.13% charge-off rate, a 0.83&times; ratio to the SBA cross-industry average of 1.36%, and modestly below the national restaurant rate of 1.21%</strong>. This is the first thing an uncritical reader will see. It&rsquo;s also the number that hides the most.</p>
        <h3>Why the headline number can mislead</h3>
        <p>Aggregate charge-off percentages average across all Florida restaurants &mdash; tourism-driven coastal concepts, year-round urban independents, franchise-heavy inland operations, seasonal snowbird-dependent restaurants, and everything in between. The distribution across those sub-segments is not uniform. A prospective buyer looking at a single deal benefits far more from understanding which risk factors actually drive charge-off dispersion within Florida than from the state-level average.</p>
        <h3>The three Florida risk factors lenders underwrite to</h3>
        <p>Regardless of the favorable headline, specialist Florida restaurant lenders stress-test files against three structural factors that don&rsquo;t exist (or exist meaningfully less) in most other states:</p>
        <ul>
            <li><strong>Hurricane exposure.</strong> Coastal Florida is subject to recurring hurricane risk, and the 2024&ndash;2025 insurance-market dislocation has pushed commercial property insurance premiums materially above national baselines. Lenders explicitly model business-interruption insurance adequacy, building-code compliance, and hurricane deductible exposure when underwriting coastal restaurant files. An inland Florida restaurant underwrites differently than an oceanfront Miami Beach concept.</li>
            <li><strong>Tourism and seasonality.</strong> Restaurants in tourism-dependent metros (Miami Beach, Orlando hospitality corridor, Destin, Key West, Naples) can carry 30-50% revenue swings between peak and off-season. Projections that use flat annual revenue assumptions fail underwriting; lenders want monthly breakdowns showing the operator plans for the shoulder-season working capital gap. Year-round urban independents in Jacksonville, Tampa, Orlando-residential, and the inland metros don&rsquo;t carry this seasonality as sharply.</li>
            <li><strong>Property insurance cost trajectory.</strong> Florida commercial property insurance has seen double-digit annual premium increases in multiple recent years, and some carriers have exited the market. Lenders now model insurance as a growing rather than flat cost line on multi-year projections. Restaurants in high-exposure zones (coastal, older buildings, wood-frame construction) see insurance costs of 4-6% of revenue in some cases &mdash; materially above the 2-3% national baseline.</li>
        </ul>
        <p>None of this makes Florida a bad SBA restaurant market &mdash; the aggregate numbers are favorable and lenders deploy capital at meaningful scale. It does mean that a Florida restaurant deal underwrites differently than an equivalent inland deal, and matching to a lender experienced with Florida-specific risk factors affects both close time and pricing.</p>
        <h3>Metro distribution</h3>
        <p>Four Florida metros carry the bulk of restaurant SBA volume: <strong>Miami / Fort Lauderdale, Orlando, Tampa Bay, and Jacksonville</strong>. Miami and Orlando lean toward tourism-dependent concepts; Tampa and Jacksonville are more year-round urban markets. Secondary markets including Naples, Sarasota, West Palm Beach, and the Space Coast add meaningful volume. Florida's mid-sized inland metros (Gainesville, Tallahassee, Lakeland) have active SBA lending relative to their size.</p>
    `,

    lenderCalloutHtml: `
        <p>Florida&rsquo;s restaurant SBA lender mix is notably more concentrated in national-platform specialists than California&rsquo;s. <strong>The Huntington National Bank leads with 87 loans</strong> and <strong>Newtek (Bank + Small Business Finance) combined sits at 107 across two entities &mdash; the largest single-bank block in Florida</strong>. National platforms fit Florida well because their underwriting processes are uniform across states and they can redeploy capital into Florida opportunistically when insurance-market dislocations flush less-sophisticated local capital.</p>
        <p>Two Florida-connected banks appear in the top ten: <strong>BayFirst National Bank (27 loans, Florida-headquartered)</strong> and <strong>SouthState Bank (37 loans, Southeast regional HQ&rsquo;d in Winter Haven, FL)</strong>. TD Bank (46) carries the northeast-tourist snowbird thread. Readycap (35), Northeast Bank (34), Wells Fargo (23), and Bank of America (22) round out the top ten. The takeaway: Florida restaurant SBA has strong lender coverage; matching to a lender that explicitly handles Florida hurricane and insurance exposure models, not one that applies national-baseline underwriting, is the practical variable.</p>
    `,

    cityLinks: [
        { name: 'Miami', href: '/business-loans/miami-fl' },
        { name: 'Tampa', href: '/business-loans/tampa-fl' },
        { name: 'Jacksonville', href: '/business-loans/jacksonville-fl' },
        { name: 'Orlando', href: '/business-loans/orlando-fl' },
        { name: 'St. Petersburg', href: '/business-loans/st-petersburg-fl' },
        { name: 'Hialeah', href: '/business-loans/hialeah-fl' },
        { name: 'Cape Coral', href: '/business-loans/cape-coral-fl' },
    ],

    quiz: {
        questions: [
            {q:"What's your Florida restaurant situation?",opts:[
                {v:"acquisition",l:"Acquiring an existing FL restaurant"},
                {v:"new-independent",l:"Opening a new independent concept"},
                {v:"franchise",l:"Franchise concept (FL location)"},
                {v:"expansion",l:"Expansion or additional FL location"},
            ]},
            {q:"Location profile?",opts:[
                {v:"coastal-tourism",l:"Coastal / tourism-driven location"},
                {v:"urban-year-round",l:"Year-round urban (Miami, Tampa, Orlando, Jax)"},
                {v:"suburban-inland",l:"Suburban or inland Florida"},
                {v:"seasonal",l:"Heavily seasonal / snowbird-dependent"},
            ]},
            {q:"Loan amount needed?",opts:[
                {v:"under-500k",l:"Under $500K"},
                {v:"500k-1m",l:"$500K - $1M"},
                {v:"1m-3m",l:"$1M - $3M"},
                {v:"3m-plus",l:"$3M+"},
            ]},
            {q:"Personal credit score?",opts:[
                {v:"below-680",l:"Below 680"},
                {v:"680-719",l:"680-719"},
                {v:"720-plus",l:"720+"},
            ]},
        ],
        profiles: {
            A: {
                badge: "Strong FL acquisition candidate",
                headline: "Standard Florida SBA restaurant file",
                body: "Acquiring a year-round urban Florida restaurant with strong credit is a standard specialist-SBA-lender file. Huntington, Newtek, Readycap, and Florida-focused lenders (BayFirst, SouthState) underwrite these routinely. Expect 60-90 days to close. The main variable is whether the lender is explicitly modeling Florida-specific insurance cost trajectory and hurricane exposure rather than applying national-baseline underwriting.",
                ctaLabel: "Match with Florida restaurant SBA lenders",
                utmContent: "profile-a-fl-acquisition",
            },
            B: {
                badge: "Coastal / seasonal file &mdash; extra underwriting detail",
                headline: "Match to a Florida-experienced lender who models seasonality explicitly",
                body: "Coastal, tourism-driven, or heavily seasonal Florida restaurant files carry real underwriting complexity: hurricane exposure modeling, property insurance cost trajectory, shoulder-season working-capital needs, and business-interruption insurance adequacy. Specialist Florida lenders model these explicitly; generalist national banks often apply flat-annual revenue assumptions that underestimate working-capital needs and miss off-season cash flow risk. Expect 75-105 days to close with the extra diligence on insurance and seasonality modeling.",
                ctaLabel: "Match with FL-coastal-experienced SBA lenders",
                utmContent: "profile-b-fl-seasonal",
            },
            C: {
                badge: "Franchise path",
                headline: "Franchise route &mdash; see the franchise-specific guide",
                body: "Florida franchise restaurant SBA files underwrite differently from independent concepts and benefit from brand-level underwriting shortcut when the concept is in the SBA Franchise Directory. Florida&rsquo;s franchise-restaurant density (particularly in Orlando, Tampa, and secondary metros) makes this a meaningful share of FL restaurant SBA volume. The lender mix and mechanics for franchise files are distinct &mdash; see our SBA franchise loan guide for full treatment.",
                ctaLabel: "See SBA franchise details",
                utmContent: "profile-c-fl-franchise",
                ctaUrl: "/sba-loans/franchise/",
            },
        },
        scoringBody: `
            function score(a) {
                var sit=a[0], loc=a[1], amount=a[2], credit=a[3];
                if (sit==='franchise') return 'C';
                if (loc==='coastal-tourism' || loc==='seasonal') return 'B';
                if (sit==='acquisition') return 'A';
                return 'A';
            }
        `,
    },

    faqs: [
        {q:"How does Florida restaurant SBA performance compare to national averages?",a:"Florida restaurant SBA loans charge off at 1.13% — below both the national restaurant average of 1.21% and the SBA cross-industry average of 1.36% (a 0.83× ratio). That's a favorable aggregate performance. The caveat: aggregate averages mask real sub-segment risk dispersion. Coastal tourism-driven concepts, seasonal snowbird-dependent restaurants, and year-round urban independents have meaningfully different risk profiles that lenders underwrite to individually, and the structural Florida factors (hurricane exposure, tourism seasonality, property insurance cost trajectory) still matter even on files that look favorable on headline metrics."},
        {q:"What's the typical SBA restaurant loan size in Florida?",a:"Average SBA restaurant loan in Florida is approximately $767,000 — the highest of any top-4 restaurant SBA state (46% above the national average of $528K, 27% above California's $603K, and modestly above Texas's $738K). Median is $434,000 vs. $255K nationally (+70%). The higher deal sizes reflect Florida commercial real estate costs in coastal markets and the scale of major-metro restaurant acquisitions in Miami, Orlando, Tampa, and Jacksonville."},
        {q:"How does hurricane risk affect SBA restaurant underwriting in Florida?",a:"Coastal Florida restaurant files receive explicit hurricane-exposure underwriting. Lenders model business-interruption insurance adequacy, building-code compliance year of the structure, hurricane deductible exposure on property insurance, and post-storm working-capital reserves. Specialist Florida lenders treat this as standard practice; generalist banks unfamiliar with Florida insurance markets routinely miss the deductible-exposure issue and the property-insurance premium trajectory, which compresses projected DSCR. Inland Florida restaurants don't carry the same exposure, but the property-insurance cost trajectory still affects files statewide."},
        {q:"How does Florida's insurance cost trajectory affect SBA underwriting?",a:"Florida commercial property insurance has seen double-digit annual premium increases in several recent years, and some carriers have exited the market. Specialist lenders now model insurance as a growing cost line on multi-year projections rather than assuming flat costs. Restaurants in high-exposure zones (coastal, older buildings, wood-frame construction) can see insurance costs of 4-6% of revenue, materially above the 2-3% national baseline. A restaurant with clean insurance history and a multi-year renewal track record underwrites better than one without; files relying on projected insurance-cost assumptions face harder scrutiny."},
        {q:"Which SBA lenders are most active in Florida restaurant lending?",a:"The Huntington National Bank leads by loan count (87 FL restaurant loans). Newtek (Bank + Small Business Finance combined) sits at 107, the largest single-bank block in Florida. TD Bank (46 loans) carries the snowbird-markets demographic thread. Two Florida-connected regionals appear: BayFirst National Bank (27 loans, Florida-headquartered) and SouthState Bank (37, Southeastern regional headquartered in Winter Haven FL). Readycap (35), Northeast (34), Wells Fargo (23), and Bank of America (22) round out the top ten."},
        {q:"How does seasonality affect working-capital underwriting for Florida restaurants?",a:"Tourism-dependent Florida restaurants can carry 30-50% revenue swings between peak and off-season. Lenders want monthly revenue projections rather than annualized averages, and they want to see the operator plan for the shoulder-season working-capital gap — reserves, a working-capital draw line, or seasonal staffing flexibility. Files that submit flat annual revenue assumptions get structured with larger working-capital components or face higher equity injection requirements. Year-round urban markets (Jacksonville, Tampa, Orlando residential corridors, inland metros) don't carry the same seasonality sharpness."},
        {q:"How long does an SBA loan take to close for a Florida restaurant?",a:"60-90 days is typical for a year-round urban Florida restaurant file with a Preferred Lender experienced in Florida. Coastal, tourism-driven, or heavily seasonal files often run 75-105 days because of the extra underwriting detail around insurance, hurricane exposure, and seasonality. Deals with a Florida commercial real estate component via SBA 504 plus a 7(a) companion loan typically run 90-130 days. Lenders unfamiliar with Florida-specific insurance markets routinely extend these timelines further."},
    ],
},

'811111_TX': {
    naicsCode: '811111',
    state: 'TX',
    industryParentSlug: 'auto-repair',
    industryLabel: 'auto repair',
    industryLabelCap: 'Auto Repair',
    industryLabelCapSingular: 'Auto Repair Shop',
    stateSlug: 'texas',
    stateName: 'Texas',
    campaignSlug: 'sba-auto-repair-texas-quiz',

    heroPhoto: {
        src: 'https://images.pexels.com/photos/4480505/pexels-photo-4480505.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Mechanic working on a vehicle in an auto repair shop bay, representative of Texas auto repair shops financed through SBA 7(a) loans',
        width: 1200,
        height: 800,
        photographer: 'Andrea Piacquadio',
        photographerUrl: 'https://www.pexels.com/@olly/',
        sourceUrl: 'https://www.pexels.com/photo/4480505/',
        sourceName: 'Pexels',
    },
    communityBankNames: [],

    title: 'SBA Loans for Auto Repair Shops in Texas 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for Texas auto repair shops. 427 TX auto repair SBA loans approved FY2020-2025 ($307M), +52% YoY growth. Take the 2-minute quiz to match with Texas-auto-repair-experienced SBA lenders.',
    heroSub: 'Texas auto repair SBA lending compounds the Texas growth story with the auto repair SBA acceleration &mdash; <strong>+52% YoY growth, nearly twice the national auto-repair growth rate of +27%</strong>. Deal sizes run 50% above national average. Second-largest state by auto repair SBA volume behind California.',

    serviceDescription: 'My Money Marketplace helps Texas auto repair shop owners compare SBA 7(a) and 504 options and get matched with lenders experienced in Texas auto repair underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',

    marketContextHtml: `
        <p>Texas is the <strong>second-largest state for auto repair SBA lending</strong> behind California (7.89% of national volume, 427 loans approved FY2020-2025, $307 million in total approved capital) &mdash; and it&rsquo;s compounding two distinct growth trends at once. The national auto repair SBA category is up +26.93% year-over-year as the industry undergoes real operator turnover and consolidation. On top of that, <strong>Texas is growing at +52%</strong> &mdash; nearly twice the national auto-repair rate. This mirrors the Texas restaurant SBA pattern where the state compounds industry-level growth with state-level acceleration. See our <a href="/sba-loans/restaurants/texas">Texas restaurants SBA page</a> for the parallel story.</p>
        <p>Texas auto repair deals run meaningfully larger than national: <strong>$719,000 average vs. $477,000 nationally (+51%)</strong>, with the median loan at $425,000 vs. $225,500 nationally (+88%). The larger deal sizes reflect the combination of Texas commercial real estate costs, the prevalence of larger multi-bay shops in DFW and Houston, and the tendency toward real-estate-combined deals where the operator owns the building.</p>
        <h3>Charge-off rate: better than SBA average</h3>
        <p>Texas auto repair SBA charges off at <strong>1.17% &mdash; a 0.86&times; ratio against the SBA cross-industry average of 1.36%</strong>. Modestly above the national auto repair rate of 1.00%, but still favorable versus the cross-industry baseline. The slight state-level elevation reflects the larger average deal sizes in Texas (more dollars at risk per file) and a sector mix that leans toward full-service shops rather than quick-lube or tire-and-service chains.</p>
        <h3>Metro distribution: DFW, Houston, Austin, San Antonio</h3>
        <p>The same four major metros driving Texas restaurant SBA volume drive auto repair: <strong>Dallas-Fort Worth, Houston, Austin, and San Antonio</strong>. DFW and Houston carry the highest absolute volume; Austin punches above population weight driven by the tech-employment influx pushing vehicle fleet growth; San Antonio leans more toward franchise-operator files. Secondary Texas markets (Plano, Arlington, Corpus Christi, El Paso, Lubbock, Waco) all have active SBA auto repair lending.</p>
        <h3>Texas regulatory context for auto repair SBA underwriting</h3>
        <p>The same Texas business-climate factors that benefit restaurants benefit auto repair, with a few shop-specific notes:</p>
        <ul>
            <li><strong>Labor cost structure.</strong> Federal minimum wage applies. Auto repair wages in Texas sit meaningfully below California equivalents, which affects the DSCR projection baseline. Specialist Texas lenders use state-specific wage benchmarks rather than national averages.</li>
            <li><strong>Zoning and environmental compliance.</strong> Texas auto repair zoning is less restrictive than California; municipalities increasingly regulate where shops can operate but not as aggressively. Environmental compliance around used oil, refrigerant handling, and waste disposal still applies federally regardless of state &mdash; underwriting reviews compliance history on acquisition files.</li>
            <li><strong>No state income tax on operators.</strong> Personal financial strength of guarantors reads stronger in Texas because of the absence of state income tax compared to California or New York operators, which matters on larger-leverage files.</li>
            <li><strong>Commercial real estate costs.</strong> Texas real estate runs below California but above national averages in major metros. This shows up in the real-estate-combined deal flow &mdash; a meaningful share of Texas auto repair SBA includes SBA 504 plus a 7(a) companion for the operating business, reflecting operator preference for owning the shop.</li>
        </ul>
    `,

    lenderCalloutHtml: `
        <p>Texas auto repair SBA lending is led by specialist national platforms rather than Texas-native regional banks. <strong>Newtek Bank (36 loans) and Live Oak Banking (28)</strong> &mdash; both specialist SBA platforms rather than traditional branch banks &mdash; lead the Texas auto repair market. Huntington National Bank (20) rounds out the top four. This is distinct from the Texas restaurants pattern where Huntington dominates alone.</p>
        <p>Five large banks appear in positions 3&ndash;10: PNC Bank (22), JPMorgan Chase (14), Bank of America (12), Wells Fargo (11), and SouthState Bank (11). <strong>BayFirst National Bank (14)</strong> rounds out the top 10 as the small-business-specialist Florida-headquartered bank that runs programs into Texas. Notably absent from the Texas auto repair top 10: Frost Bank and Cadence Bank, the two Texas-headquartered regionals that matter in Texas restaurants. The auto repair file profile (equipment-heavy, collateral-strong, technical-operator reliant) fits specialist platforms better than generalist Texas regionals.</p>
    `,

    cityLinks: [
        { name: 'Houston', href: '/business-loans/houston-tx' },
        { name: 'Dallas', href: '/business-loans/dallas-tx' },
        { name: 'Austin', href: '/business-loans/austin-tx' },
        { name: 'San Antonio', href: '/business-loans/san-antonio-tx' },
        { name: 'Plano', href: '/business-loans/plano-tx' },
        { name: 'Arlington', href: '/business-loans/arlington-tx' },
        { name: 'Corpus Christi', href: '/business-loans/corpus-christi-tx' },
    ],

    quiz: {
        questions: [
            {q:"What's your Texas auto repair situation?",opts:[
                {v:"acquisition",l:"Acquiring an existing TX shop"},
                {v:"new",l:"Opening a new shop"},
                {v:"expansion",l:"Expansion or additional TX location"},
                {v:"equipment-only",l:"Equipment upgrade, established shop"},
            ]},
            {q:"Primary loan use?",opts:[
                {v:"purchase-price",l:"Acquisition purchase price"},
                {v:"real-estate",l:"Real estate purchase (shop building)"},
                {v:"equipment",l:"Lifts, alignment, diagnostic equipment"},
                {v:"buildout",l:"Bay expansion / buildout"},
                {v:"multiple",l:"Multiple uses combined"},
            ]},
            {q:"Operator experience?",opts:[
                {v:"ase-manager",l:"ASE-certified, 5+ years managing/owning a shop"},
                {v:"ase-tech",l:"ASE-certified technician"},
                {v:"partner-tech",l:"Non-tech, with experienced technical partner"},
                {v:"non-tech",l:"Non-technical operator"},
            ]},
            {q:"Loan amount needed?",opts:[
                {v:"under-500k",l:"Under $500K"},
                {v:"500k-1m",l:"$500K - $1M"},
                {v:"1m-3m",l:"$1M - $3M"},
                {v:"3m-plus",l:"$3M+"},
            ]},
        ],
        profiles: {
            A: {
                badge: "Strong TX acquisition candidate",
                headline: "You're riding the +52% Texas auto repair growth curve",
                body: "Texas auto repair SBA volume is up 52% year-over-year, nearly twice the national auto-repair rate. Specialist SBA platforms (Newtek, Live Oak, Huntington) are actively deploying capital into Texas auto repair acquisitions. ASE-certified operator acquiring an established Texas shop with meaningful equity is exactly the file these lenders underwrite at scale. Texas deal sizes run 51% above national averages ($719K vs. $477K), which matches the capital these specialist lenders routinely deploy. Plan 60-90 days to close.",
                ctaLabel: "Match with Texas auto repair SBA lenders",
                utmContent: "profile-a-tx-auto-acquisition",
            },
            B: {
                badge: "TX real estate + shop",
                headline: "SBA 504 for the building, 7(a) companion for the business",
                body: "Texas auto repair deals including the commercial real estate benefit from SBA 504's fixed long-term rates on the real-estate portion. 7(a) companion covers the operating business, equipment, and working capital. Combined structure typically runs 75-120 days to close. Texas real estate ownership is particularly valuable for auto repair because zoning restrictions on shop locations are increasing nationally; owning the site protects against forced relocation.",
                ctaLabel: "Match with 504 + 7(a) TX auto repair lenders",
                utmContent: "profile-b-tx-auto-real-estate",
            },
            C: {
                badge: "Experience gap",
                headline: "Strengthen the operator profile before applying",
                body: "Non-technical operators on larger Texas auto repair deals face the hardest files. Options that work: a documented management agreement with an experienced shop lead, a partnership with an ASE-certified technical operator holding equity, or meaningfully higher equity injection than the 10% minimum. Have this conversation upfront with a specialist lender rather than getting declined mid-underwriting.",
                ctaLabel: "Get honest feedback from a TX auto repair SBA specialist",
                utmContent: "profile-c-tx-auto-experience",
            },
        },
        scoringBody: `
            function score(a) {
                var sit=a[0], use=a[1], exp=a[2], amount=a[3];
                if (exp==='non-tech' && (amount==='1m-3m' || amount==='3m-plus')) return 'C';
                if (use==='real-estate') return 'B';
                if (sit==='acquisition') return 'A';
                return 'A';
            }
        `,
    },

    faqs: [
        {q:"Why is Texas auto repair SBA lending growing so fast?",a:"Texas auto repair SBA volume is up +52% year-over-year, vs. the national auto-repair rate of +27%. The growth reflects two compounding trends: national operator turnover driven by an aging technician cohort selling shops to younger operators (+27% industry tailwind), plus Texas-specific population and commercial real estate expansion pulling more auto repair capital into SBA financing (+25pp additional Texas-state acceleration). The same pattern drives Texas restaurants at +42.6% YoY."},
        {q:"Can I get an SBA loan for an auto repair shop in Texas?",a:"Yes. Texas is the second-largest single-state auto repair SBA market in the US — 427 loans approved FY2020-2025 representing 7.9% of all national auto-repair SBA volume. SBA 7(a) covers acquisitions, equipment, buildouts, and working capital; SBA 504 handles real estate when the shop building is part of the deal. Minimum 10% equity injection applies."},
        {q:"What's the typical SBA auto repair loan size in Texas?",a:"Average SBA auto repair loan in Texas is approximately $719,000 — 51% above the national auto-repair average of $477,000. Median is $425,000 vs. $225,500 nationally (+88%). The larger deal sizes reflect Texas commercial real estate costs, the prevalence of larger multi-bay shops in DFW and Houston, and a tendency toward real-estate-combined deals where the operator owns the shop building."},
        {q:"Which SBA lenders are most active in Texas auto repair lending?",a:"Specialist SBA platforms lead: Newtek Bank (36 loans) and Live Oak Banking Company (28) top the Texas auto repair lender list. The Huntington National Bank (20) rounds out the top three. Five large banks appear in positions 3-10: PNC Bank (22), JPMorgan Chase (14), Bank of America (12), Wells Fargo (11), and SouthState Bank (11). BayFirst National Bank (14) is the Florida-headquartered small-business-specialist that runs strong programs into Texas."},
        {q:"How does Texas auto repair charge-off compare to national?",a:"Texas auto repair SBA 7(a) charges off at 1.17% — a 0.86× ratio against the all-industry SBA average of 1.36%. That's modestly above the national auto-repair rate of 1.00%, but materially better than the cross-industry SBA baseline. The state-level elevation versus the industry average reflects the larger deal sizes in Texas (more dollars at risk per file) and a sector mix leaning toward full-service shops over quick-service concepts."},
        {q:"Does Texas zoning affect SBA auto repair underwriting?",a:"Texas zoning is less restrictive than California for auto repair shops, but municipalities are increasingly regulating where shops can operate. Lenders evaluate site-level zoning stability on acquisition files; sites with long operational history under existing zoning underwrite cleaner than sites in rezoning-exposed areas. Environmental compliance around used oil, refrigerant handling, and waste disposal applies federally regardless of state — underwriting reviews compliance history on acquisition files."},
        {q:"How long does an SBA loan take to close for a Texas auto repair shop?",a:"60-90 days is typical for a Texas auto repair SBA 7(a) acquisition or equipment-combined deal with a Preferred Lender experienced in auto repair. Deals including commercial real estate via SBA 504 plus a 7(a) companion typically run 75-120 days. The main variable is operator experience profile; files with a non-technical operator and no experienced technical partner require extra underwriting detail and typically extend timelines."},
    ],
},

};

// ─── Rendering helpers ──────────────────────────────────────────────────

function renderStatsBlock(stateStats, nationalStats, overall, stateName, industryLabel) {
    const stateNatLoanPct = stateStats.share_of_industry_loans_pct;
    const avgVsNatPct = ((stateStats.avg_loan / nationalStats.avg_loan) - 1) * 100;
    const medVsNatPct = ((stateStats.median_loan / nationalStats.median_loan) - 1) * 100;
    const chgoffVsNatRest = stateStats.charge_off_pct / nationalStats.charge_off_pct;
    const yoyDelta = stateStats.yoy_growth - nationalStats.yoy_growth;

    return `
    <section class="by-numbers">
        <div class="container">
            <h2>${stateName} ${industryLabel} SBA lending &mdash; by the numbers</h2>
            <p class="bn-sub">SBA 7(a) loans to ${industryLabel} operators in ${stateName}, fiscal years 2020 through December 2025. Pulled from SBA FOIA 7(a) dataset.</p>
            <div class="bn-grid">
                <div class="bn-card bn-highlight">
                    <div class="bn-label">Share of national ${industryLabel} SBA</div>
                    <div class="bn-value">${fmt.pct1(stateNatLoanPct)}</div>
                    <div class="bn-footnote">Largest single-state ${industryLabel} SBA market</div>
                </div>
                <div class="bn-card">
                    <div class="bn-label">Loans approved</div>
                    <div class="bn-value">${fmt.num(stateStats.loan_count)}</div>
                    <div class="bn-footnote">FY2020-2025 in ${stateName}</div>
                </div>
                <div class="bn-card">
                    <div class="bn-label">Total approved</div>
                    <div class="bn-value">${fmt.usdShort(stateStats.total_approval)}</div>
                    <div class="bn-footnote">Combined ${stateName} volume</div>
                </div>
                <div class="bn-card">
                    <div class="bn-label">Average loan size</div>
                    <div class="bn-value">${fmt.usdK(stateStats.avg_loan)}</div>
                    <div class="bn-footnote">${fmt.signedPct(avgVsNatPct)} vs national avg ${fmt.usdK(nationalStats.avg_loan)}</div>
                </div>
                <div class="bn-card">
                    <div class="bn-label">${stateName} charge-off rate</div>
                    <div class="bn-value">${fmt.pct(stateStats.charge_off_pct)}</div>
                    <div class="bn-footnote">vs ${fmt.pct(nationalStats.charge_off_pct)} national ${industryLabel} / ${fmt.pct(overall.charge_off_pct)} SBA avg</div>
                </div>
                <div class="bn-card">
                    <div class="bn-label">YoY growth in ${stateName}</div>
                    <div class="bn-value">${fmt.signedPct(stateStats.yoy_growth)}</div>
                    <div class="bn-footnote">vs ${fmt.signedPct(nationalStats.yoy_growth)} national ${industryLabel}</div>
                </div>
            </div>
        </div>
    </section>`;
}

function renderLenderChartSvg(stateLenders, communityBankNames, stateName) {
    const top10 = stateLenders.slice(0, 10);
    const max = top10[0].loan_count;
    const width = 640;
    const topPad = 28;
    const rowHeight = 36;
    const labelColEnd = 190;
    const barStart = 200;
    const barMaxWidth = 340;
    const valueGap = 8;
    const botPad = 16;
    const totalHeight = topPad + rowHeight * top10.length + botPad;

    const community = new Set(communityBankNames || []);
    const shortLabel = name => name
        .replace(', National Association', ', N.A.')
        .replace(' Corporation', '')
        .replace(/\s+/g, ' ').trim();

    const rows = top10.map((l, i) => {
        const rowY = topPad + rowHeight * i + rowHeight / 2;
        const barW = (l.loan_count / max) * barMaxWidth;
        const isCommunity = community.has(l.bankname);
        const barColor = isCommunity ? '#B8741C' : '#2F6BB3';
        const label = shortLabel(l.bankname);
        const valueX = barStart + barW + valueGap;
        return `    <g>
      <text x="${labelColEnd}" y="${rowY + 4}" text-anchor="end" font-size="13" fill="#444">${esc(label)}</text>
      <rect x="${barStart}" y="${rowY - 10}" width="${barW.toFixed(1)}" height="20" rx="3" fill="${barColor}"/>
      <text x="${valueX.toFixed(1)}" y="${rowY + 4}" text-anchor="start" font-size="13" font-weight="600" fill="#111">${l.loan_count}</text>
    </g>`;
    }).join('\n');

    const descText = top10.map(l => `${l.bankname} ${l.loan_count} loans`).join('; ');
    const highlightNote = community.size > 0
        ? ` Korean-American community banks (${Array.from(community).join(', ')}) highlighted in amber; all other lenders in blue.`
        : '';

    return `<svg viewBox="0 0 ${width} ${totalHeight}" role="img" aria-labelledby="viz-lenders-title viz-lenders-desc" class="data-viz-svg" preserveAspectRatio="xMidYMid meet">
    <title id="viz-lenders-title">Top 10 SBA restaurant lenders in ${stateName} by loan count</title>
    <desc id="viz-lenders-desc">Horizontal bar chart: ${descText}.${highlightNote}</desc>
${rows}
  </svg>`;
}

function renderLendersSection(stateLenders, stateName, industryLabel, communityBankNames) {
    const chartSvg = renderLenderChartSvg(stateLenders, communityBankNames, stateName);
    return `
    <section class="lenders-section">
        <div class="container-narrow">
            <h2>Top SBA lenders for ${stateName} ${industryLabel}</h2>
            <p class="ls-sub">The ten banks that have approved the most SBA 7(a) loans to ${industryLabel} operators in ${stateName} FY2020-2025. Pulled directly from SBA FOIA data. Loan count alone doesn&rsquo;t capture fit for your specific deal &mdash; volume leaders and specialist fit can differ.</p>
            <div class="viz-container">${chartSvg}</div>
        </div>
    </section>`;
}

function renderStateComparisonSvg(topStates, highlightStateAbbr, industryLabel) {
    const top8 = topStates.slice(0, 8);
    const max = top8[0].loan_count;
    const width = 640;
    const topPad = 28;
    const rowHeight = 36;
    const labelColEnd = 80;
    const barStart = 92;
    const barMaxWidth = 420;
    const valueGap = 8;
    const botPad = 16;
    const totalHeight = topPad + rowHeight * top8.length + botPad;

    const rows = top8.map((s, i) => {
        const rowY = topPad + rowHeight * i + rowHeight / 2;
        const barW = (s.loan_count / max) * barMaxWidth;
        const isHighlight = s.state === highlightStateAbbr;
        const barColor = isHighlight ? '#008254' : '#c9d0d8';
        const textColor = isHighlight ? '#111' : '#444';
        const valueX = barStart + barW + valueGap;
        return `    <g>
      <text x="${labelColEnd}" y="${rowY + 4}" text-anchor="end" font-size="13" font-weight="${isHighlight ? '700' : '500'}" fill="${textColor}">${s.state}</text>
      <rect x="${barStart}" y="${rowY - 10}" width="${barW.toFixed(1)}" height="20" rx="3" fill="${barColor}"/>
      <text x="${valueX.toFixed(1)}" y="${rowY + 4}" text-anchor="start" font-size="13" font-weight="${isHighlight ? '700' : '500'}" fill="${textColor}">${fmt.num(s.loan_count)} &#8226; ${fmt.pct1(s.pct_of_industry_loans)}</text>
    </g>`;
    }).join('\n');

    const descText = top8.map(s => `${s.state} ${fmt.num(s.loan_count)} loans (${fmt.pct1(s.pct_of_industry_loans)})`).join('; ');

    return `<svg viewBox="0 0 ${width} ${totalHeight}" role="img" aria-labelledby="viz-states-title viz-states-desc" class="data-viz-svg" preserveAspectRatio="xMidYMid meet">
    <title id="viz-states-title">Top 8 states for SBA ${industryLabel} loans, ${highlightStateAbbr} highlighted</title>
    <desc id="viz-states-desc">Horizontal bar chart of the top 8 states by SBA ${industryLabel} loan count: ${descText}. ${highlightStateAbbr} highlighted in green; other states in gray.</desc>
${rows}
  </svg>`;
}

function renderComparisonTiles(stateStats, nationalStats, overall, stateName, industryLabel) {
    const avgDelta = ((stateStats.avg_loan / nationalStats.avg_loan) - 1) * 100;
    const chgoffDeltaPP = (stateStats.charge_off_pct - nationalStats.charge_off_pct);
    const chgoffDeltaLabel = `${chgoffDeltaPP >= 0 ? '+' : ''}${chgoffDeltaPP.toFixed(2)}pp`;

    return `
    <section class="comparison-tiles">
        <div class="container">
            <h2>${stateName} vs national &mdash; at a glance</h2>
            <div class="ct-grid">
                <div class="ct-tile">
                    <div class="ct-delta ${avgDelta >= 0 ? 'ct-up' : 'ct-down'}">${fmt.signedPct(avgDelta)}</div>
                    <div class="ct-label">Average loan size</div>
                    <div class="ct-values"><strong>${fmt.usdK(stateStats.avg_loan)}</strong> ${stateName} &nbsp;vs&nbsp; <span>${fmt.usdK(nationalStats.avg_loan)} national</span></div>
                    <div class="ct-context">Higher average reflects ${stateName} real estate and buildout costs relative to national baseline.</div>
                </div>
                <div class="ct-tile">
                    <div class="ct-delta ct-neutral">${chgoffDeltaLabel}</div>
                    <div class="ct-label">Charge-off rate</div>
                    <div class="ct-values"><strong>${fmt.pct(stateStats.charge_off_pct)}</strong> ${stateName} &nbsp;vs&nbsp; <span>${fmt.pct(nationalStats.charge_off_pct)} national ${industryLabel}</span></div>
                    <div class="ct-context">${chgoffDeltaPP >= 0 ? 'Modestly above' : 'Modestly below'} national ${industryLabel}; ${stateName} cost structure pressures margins.</div>
                </div>
                <div class="ct-tile ct-highlight">
                    <div class="ct-big">${fmt.pct1(stateStats.share_of_industry_loans_pct)}</div>
                    <div class="ct-label">Of all US ${industryLabel} SBA loans</div>
                    <div class="ct-context">${stateName} is the largest single-state ${industryLabel} SBA market in the US.</div>
                </div>
            </div>
        </div>
    </section>`;
}

function renderStateComparisonSection(topStates, highlightStateAbbr, stateName, industryLabel) {
    const chartSvg = renderStateComparisonSvg(topStates, highlightStateAbbr, industryLabel);
    const highlighted = topStates.find(s => s.state === highlightStateAbbr);
    const second = topStates.find(s => s.state !== highlightStateAbbr);
    const leadFactor = highlighted && second ? (highlighted.loan_count / second.loan_count).toFixed(2) : '';
    return `
    <section class="state-comparison-section">
        <div class="container-narrow">
            <h2>How ${stateName} compares to other top ${industryLabel} states</h2>
            <p class="ls-sub">${stateName} leads the next-largest state (${second ? second.state : ''}) by roughly ${leadFactor}&times; on SBA ${industryLabel} loan count &mdash; the concentration is real, not noise. Top 8 states account for about half of all national ${industryLabel} SBA volume.</p>
            <div class="viz-container">${chartSvg}</div>
        </div>
    </section>`;
}

function renderHeroPhoto(heroPhoto, stateName, industryLabel) {
    if (!heroPhoto) return '';
    return `
<section class="hero-photo-banner" aria-label="Hero image">
    <img src="${esc(heroPhoto.src)}" alt="${esc(heroPhoto.alt)}" width="${heroPhoto.width}" height="${heroPhoto.height}" class="hero-photo-img" loading="eager" fetchpriority="high">
    <div class="hero-photo-overlay"></div>
    <p class="hero-photo-credit">Photo: <a href="${esc(heroPhoto.photographerUrl)}" rel="noopener" target="_blank">${esc(heroPhoto.photographer)}</a> via <a href="${esc(heroPhoto.sourceUrl)}" rel="noopener" target="_blank">${esc(heroPhoto.sourceName)}</a></p>
</section>`;
}

function renderCityLinks(cityLinks, stateName) {
    if (!cityLinks || cityLinks.length === 0) return '';
    const items = cityLinks.map(c => `<a class="city-link" href="${c.href}">${esc(c.name)}</a>`).join('');
    return `
    <section class="city-links-section">
        <div class="container">
            <h2>${stateName} cities with active SBA lending</h2>
            <p class="ls-sub">Major ${stateName} metros where our partner lenders actively run SBA deals. These pages cover broader small-business lending context for each market.</p>
            <div class="city-links-grid">${items}</div>
        </div>
    </section>`;
}

function renderFaqs(faqs) {
    return faqs.map(f => `
            <details class="faq-item">
                <summary><span class="faq-icon-wrap"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 17h.01"/><path d="M12 13.5V13a3 3 0 1 0-3-3"/></svg></span><span class="faq-q">${esc(f.q)}</span><span class="faq-marker" aria-hidden="true"></span></summary>
                <div class="faq-answer">${f.a}</div>
            </details>`).join('');
}

function renderFaqSchema(faqs) {
    return faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {"@type": "Answer", "text": f.a},
    }));
}

function renderQuiz(cfg) {
    const questions = cfg.quiz.questions.map((q, i) => `
                        <div class="quiz-question" data-q="${i}"${i === 0 ? '' : ' style="display:none"'}>
                            <h3>${esc(q.q)}</h3>
                            <div class="quiz-options">${q.opts.map(o => `
                                <button type="button" class="quiz-option" data-value="${esc(o.v)}">${esc(o.l)}</button>`).join('')}
                            </div>
                        </div>`).join('');
    return {
        questionsHtml: questions,
        profilesJson: JSON.stringify(cfg.quiz.profiles),
        scoringBody: cfg.quiz.scoringBody,
        total: cfg.quiz.questions.length,
    };
}

// ─── Page template ──────────────────────────────────────────────────────

function renderPage(naicsCode, stateAbbr) {
    const key = `${naicsCode}_${stateAbbr}`;
    const cfg = CONFIGS[key];
    if (!cfg) throw new Error(`No config for ${key}`);

    const industry = DATA.industries[naicsCode];
    if (!industry) throw new Error(`No industry data for NAICS ${naicsCode}`);

    const stateStats = industry.state_breakouts && industry.state_breakouts[stateAbbr];
    if (!stateStats) throw new Error(`No state breakout for ${naicsCode} x ${stateAbbr}`);

    const nationalStats = industry.stats;
    const overall = DATA.metadata.overall_sba_stats;
    const stateRef = DATA.state_reference && DATA.state_reference[stateAbbr];

    const canonicalUrl = `https://mymoneymarketplace.com/sba-loans/${cfg.industryParentSlug}/${cfg.stateSlug}`;

    const { questionsHtml, profilesJson, scoringBody, total } = renderQuiz(cfg);
    const faqSchema = renderFaqSchema(cfg.faqs);
    const faqsHtml = renderFaqs(cfg.faqs);

    // JSON-LD
    const ldGraph = [
        {"@type":"Organization","name":"My Money Marketplace","url":"https://mymoneymarketplace.com","logo":"https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png"},
        {"@type":"BreadcrumbList","itemListElement":[
            {"@type":"ListItem","position":1,"name":"SBA Loans","item":"https://mymoneymarketplace.com/sba-loans"},
            {"@type":"ListItem","position":2,"name":cfg.industryLabelCap,"item":`https://mymoneymarketplace.com/sba-loans/${cfg.industryParentSlug}`},
            {"@type":"ListItem","position":3,"name":cfg.stateName,"item":canonicalUrl},
        ]},
        {"@type":"Article","headline":cfg.title.replace(/ \| My Money Marketplace$/,''),"description":cfg.metaDesc,"author":{"@type":"Organization","name":"My Money Marketplace"},"publisher":{"@type":"Organization","name":"My Money Marketplace","logo":{"@type":"ImageObject","url":"https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png"}},"datePublished":"2026-04-22","dateModified":"2026-04-22","mainEntityOfPage":canonicalUrl},
        {"@type":"FinancialService","name":`SBA Loan Matching for ${cfg.stateName} ${cfg.industryLabelCap}`,"serviceType":`SBA loan guidance and lender matching for ${cfg.industryLabel} operators in ${cfg.stateName}`,"description":cfg.serviceDescription,"areaServed":{"@type":"State","name":cfg.stateName},"provider":{"@type":"Organization","name":"My Money Marketplace","url":"https://mymoneymarketplace.com"}},
        {"@type":"FAQPage","mainEntity":faqSchema},
    ];
    const ldJson = JSON.stringify({"@context":"https://schema.org","@graph":ldGraph});

    // Short industry mechanics section pointing to parent page
    const shortMechanics = `
    <section class="ed">
        <div class="ed-inner">
            <h2 style="text-align:left;">${cfg.industryLabelCapSingular} SBA mechanics &mdash; the short version</h2>
            <p>SBA 7(a) is the dominant path for ${cfg.industryLabel} acquisitions, buildouts, equipment, and working capital. Standard 7(a) goes up to $5 million; 7(a) Small Loan streamlines deals under $500K. SBA 504 handles real estate and heavy fixed-asset purchases when the deal includes the property. Minimum 10% equity injection applies; specialist lenders typically want 15-20% on ${cfg.stateName} ${cfg.industryLabel} deals given the higher cost structure. Up to 5% of equity can come from seller financing on full-standby terms.</p>
            <p>For the full SBA ${cfg.industryLabel} lending guide &mdash; including program details, independent vs. franchise dynamics, the ${cfg.industryLabel} charge-off context, and the complete national picture &mdash; see our <a class="inline" href="/sba-loans/${cfg.industryParentSlug}">SBA ${cfg.industryLabel} loan guide</a>. This state page focuses on the ${cfg.stateName}-specific data and market context on top of that national foundation.</p>
        </div>
    </section>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(cfg.title)}</title>
    <meta name="description" content="${esc(cfg.metaDesc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:title" content="${esc(cfg.title)}">
    <meta property="og:description" content="${esc(cfg.metaDesc)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonicalUrl}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','GA_MEASUREMENT_ID');</script>
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --green: #008254; --green-dark: #006b45; --green-bg: #f0faf5; --text: #111111; --text-secondary: #444444; --text-muted: #717171; --border: #e2e2e2; --bg-light: #f7f7f7; --white: #ffffff; --navy: #1a3a5c; --accent-blue: #2F6BB3; --accent-green: #2D8659; --accent-amber: #B8741C; }
        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: var(--text); background: var(--white); line-height: 1.7; -webkit-font-smoothing: antialiased; }
        a { color: inherit; }
        .header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: var(--white); border-bottom: 1px solid var(--border); height: 64px; }
        .header-inner { max-width: 1120px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .header-logo img { height: 32px; }
        .header-nav { display: flex; align-items: center; gap: 32px; }
        .header-link { font-size: 14px; font-weight: 500; color: var(--text-secondary); text-decoration: none; }
        .header-link:hover { color: var(--green); }
        .mobile-toggle { display: none; background: none; border: none; cursor: pointer; padding: 4px; }
        .mobile-toggle span { display: block; width: 22px; height: 2px; background: var(--text); margin: 5px 0; }
        @media (max-width: 768px) { .header-link { display: none; } .mobile-toggle { display: block; } }
        .container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .container-narrow { max-width: 820px; margin: 0 auto; padding: 0 24px; }
        .breadcrumb { padding: 16px 0; margin-top: 64px; background: var(--bg-light); border-bottom: 1px solid var(--border); }
        .breadcrumb-list { display: flex; align-items: center; gap: 8px; list-style: none; font-size: 13px; flex-wrap: wrap; }
        .breadcrumb-list a { color: var(--text-muted); text-decoration: none; }
        .breadcrumb-list a:hover { color: var(--green); }
        .breadcrumb-list .sep { color: var(--text-muted); }
        .breadcrumb-list .current { color: var(--text-secondary); font-weight: 500; }
        .hero { padding: 56px 0 56px; background: linear-gradient(180deg, var(--bg-light) 0%, var(--white) 100%); }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
        .hero-left h1 { font-size: clamp(30px, 4vw, 42px); font-weight: 700; color: var(--text); line-height: 1.15; margin-bottom: 18px; }
        .hero-left .sub { font-size: 17px; color: var(--text-secondary); line-height: 1.65; margin-bottom: 22px; }
        .hero-value { display: inline-flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; color: var(--navy); background: var(--green-bg); border-left: 3px solid var(--green); padding: 12px 18px; border-radius: 4px; margin-bottom: 22px; line-height: 1.5; }
        .hero-skip { font-size: 14px; color: var(--text-muted); text-decoration: none; border-bottom: 1px dotted var(--text-muted); padding-bottom: 1px; }
        .hero-skip:hover { color: var(--green); border-bottom-color: var(--green); }
        .basics-link { font-size: 13px; color: var(--text-muted); margin-top: 16px; }
        .basics-link a { color: var(--accent-blue); text-decoration: underline; }
        @media (max-width: 900px) { .hero { padding: 40px 0 48px; } .hero-grid { grid-template-columns: 1fr; gap: 32px; } }
        .quiz-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 28px; box-shadow: 0 6px 24px rgba(20, 40, 70, 0.06); }
        .quiz-progress { margin-bottom: 22px; }
        .quiz-step-label { display: block; font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 8px; letter-spacing: 0.4px; text-transform: uppercase; }
        .quiz-bar { height: 6px; background: var(--bg-light); border-radius: 3px; overflow: hidden; }
        .quiz-bar-fill { height: 100%; background: var(--green); transition: width 0.35s ease; }
        .quiz-question h3 { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 18px; line-height: 1.35; }
        .quiz-options { display: flex; flex-direction: column; gap: 8px; }
        .quiz-option { text-align: left; font-family: inherit; font-size: 15px; padding: 13px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--white); color: var(--text); cursor: pointer; transition: border-color 0.15s, background 0.15s; }
        .quiz-option:hover { border-color: var(--green); background: var(--green-bg); }
        .quiz-option:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
        .quiz-result-badge { display: inline-block; padding: 4px 12px; background: var(--green-bg); color: var(--green); font-size: 11px; font-weight: 700; border-radius: 12px; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 14px; }
        #resultHeadline { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 12px; line-height: 1.3; }
        #resultBody { font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 22px; }
        .quiz-cta-btn { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 14px 26px; border-radius: 8px; text-decoration: none; }
        .quiz-cta-btn:hover { background: var(--green-dark); color: var(--white); }
        .quiz-retake { display: block; margin-top: 14px; background: none; border: none; color: var(--text-muted); font-size: 13px; font-family: inherit; cursor: pointer; text-decoration: underline; padding: 4px 0; }
        /* By-the-numbers */
        .by-numbers { padding: 56px 0; background: var(--white); }
        .by-numbers h2 { font-size: 26px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 8px; }
        .bn-sub { text-align: center; color: var(--text-secondary); font-size: 14px; max-width: 680px; margin: 0 auto 32px; line-height: 1.6; }
        .bn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 1040px; margin: 0 auto; }
        .bn-card { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 20px 22px; }
        .bn-card.bn-highlight { border-left: 3px solid var(--green); background: var(--green-bg); }
        .bn-label { font-size: 12px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; }
        .bn-value { font-size: 28px; font-weight: 700; color: var(--text); line-height: 1.1; margin-bottom: 4px; }
        .bn-footnote { font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }
        @media (max-width: 760px) { .bn-grid { grid-template-columns: 1fr; } }
        /* Editorial */
        .ed { padding: 56px 0; background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .ed.alt { background: var(--white); border-top: 0; border-bottom: 1px solid var(--border); }
        .ed h2 { font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 14px; text-align: center; }
        .ed .ed-inner { max-width: 820px; margin: 0 auto; padding: 0 24px; }
        .ed h3 { font-size: 18px; font-weight: 600; color: var(--text); margin: 24px 0 10px; }
        .ed p { font-size: 15px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 14px; }
        .ed ul { margin: 8px 0 14px 22px; }
        .ed li { font-size: 15px; color: var(--text-secondary); line-height: 1.75; margin-bottom: 6px; }
        .ed strong { color: var(--text); }
        .ed a.inline { color: var(--green); font-weight: 500; text-decoration: underline; }
        /* Lenders */
        .lenders-section { padding: 56px 0; background: var(--white); }
        .lenders-section h2 { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 10px; text-align: center; }
        .ls-sub { text-align: center; color: var(--text-secondary); font-size: 14px; max-width: 720px; margin: 0 auto 24px; line-height: 1.65; }
        .lender-table-wrap { max-width: 780px; margin: 0 auto; overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--white); }
        .lender-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .lender-table thead { background: var(--navy); color: var(--white); }
        .lender-table th { text-align: left; padding: 12px 14px; font-weight: 600; font-size: 13px; }
        .lender-table td { padding: 11px 14px; color: var(--text-secondary); border-top: 1px solid var(--bg-light); }
        .lender-table tr:first-child td { border-top: 0; }
        .lender-table .rank { font-weight: 700; color: var(--text-muted); width: 50px; }
        .lender-table .lender-name { color: var(--text); font-weight: 500; }
        .lender-callout { max-width: 780px; margin: 22px auto 0; padding: 20px 24px; background: var(--bg-light); border-left: 3px solid var(--accent-amber); border-radius: 0 8px 8px 0; }
        .lender-callout p { font-size: 14.5px; color: var(--text-secondary); line-height: 1.7; margin: 0 0 10px; }
        .lender-callout p:last-child { margin: 0; }
        .lender-callout strong { color: var(--text); }
        /* City links */
        .city-links-section { padding: 48px 0; background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .city-links-section h2 { font-size: 22px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 8px; }
        .city-links-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; max-width: 900px; margin: 20px auto 0; }
        .city-link { display: block; padding: 12px 16px; background: var(--white); border: 1px solid var(--border); border-radius: 6px; font-size: 14px; font-weight: 500; color: var(--text-secondary); text-decoration: none; text-align: center; transition: all 0.2s; }
        .city-link:hover { border-color: var(--green); color: var(--green); background: #f7fbf9; }
        @media (max-width: 768px) { .city-links-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .city-links-grid { grid-template-columns: 1fr; } }
        /* FAQ */
        .faq-section { padding: 56px 0; background: var(--white); border-top: 1px solid var(--border); }
        .faq-section h2 { font-size: 26px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 28px; }
        .faq-list { max-width: 780px; margin: 0 auto; }
        .faq-item { background: var(--white); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
        .faq-item[open] { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05); }
        .faq-item summary { display: flex; align-items: center; gap: 14px; padding: 16px 20px; font-size: 15px; font-weight: 600; color: var(--text); cursor: pointer; list-style: none; }
        .faq-item summary:hover { background: var(--bg-light); }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-icon-wrap { flex-shrink: 0; color: var(--green); display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: var(--green-bg); border-radius: 6px; }
        .faq-q { flex: 1; }
        .faq-marker { flex-shrink: 0; width: 16px; height: 16px; position: relative; }
        .faq-marker::before, .faq-marker::after { content: ''; position: absolute; background: var(--text-muted); top: 7px; left: 1px; right: 1px; height: 2px; border-radius: 1px; transition: transform 0.25s ease; }
        .faq-marker::after { transform: rotate(90deg); }
        .faq-item[open] .faq-marker::after { transform: rotate(0deg); }
        .faq-answer { overflow: hidden; max-height: 0; padding: 0 20px; font-size: 14.5px; color: var(--text-secondary); line-height: 1.75; transition: max-height 0.3s ease, padding 0.3s ease; }
        .faq-item[open] .faq-answer { max-height: 800px; padding: 0 20px 18px 62px; }
        /* Hero photo banner */
        .hero-photo-banner { position: relative; margin-top: 64px; background: #1a3a5c; overflow: hidden; height: 320px; }
        .hero-photo-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hero-photo-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(247,247,247,0.2) 75%, rgba(247,247,247,1) 100%); pointer-events: none; }
        .hero-photo-credit { position: absolute; bottom: 8px; right: 14px; font-size: 11px; color: rgba(255,255,255,0.9); text-shadow: 0 1px 3px rgba(0,0,0,0.5); margin: 0; z-index: 2; }
        .hero-photo-credit a { color: inherit; text-decoration: underline; }
        .hero-photo-credit a:hover { color: var(--white); }
        /* When hero-photo-banner is present, the breadcrumb loses its margin-top (photo has it instead) */
        .hero-photo-banner + .breadcrumb { margin-top: 0; }
        @media (max-width: 640px) { .hero-photo-banner { height: 220px; } }
        /* Inline SVG data viz */
        .viz-container { max-width: 780px; margin: 0 auto; padding: 16px 0; }
        .data-viz-svg { width: 100%; height: auto; display: block; font-family: 'Inter', sans-serif; }
        /* Comparison tiles */
        .comparison-tiles { padding: 48px 0; background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .comparison-tiles h2 { font-size: 22px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 28px; }
        .ct-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 1040px; margin: 0 auto; }
        .ct-tile { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 22px 24px; display: flex; flex-direction: column; }
        .ct-tile.ct-highlight { border-left: 3px solid var(--green); background: var(--green-bg); }
        .ct-delta { display: inline-block; align-self: flex-start; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 700; margin-bottom: 10px; font-variant-numeric: tabular-nums; }
        .ct-delta.ct-up { background: #fff4e5; color: var(--accent-amber); }
        .ct-delta.ct-down { background: #e8f5ef; color: var(--green); }
        .ct-delta.ct-neutral { background: #eef0f4; color: #555; }
        .ct-big { font-size: 40px; font-weight: 700; color: var(--green); line-height: 1; margin-bottom: 8px; font-variant-numeric: tabular-nums; }
        .ct-label { font-size: 13px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 8px; }
        .ct-values { font-size: 15px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 10px; }
        .ct-values strong { color: var(--text); font-weight: 700; }
        .ct-values span { color: var(--text-muted); font-size: 13px; }
        .ct-context { font-size: 13px; color: var(--text-muted); line-height: 1.55; margin-top: auto; }
        @media (max-width: 760px) { .ct-grid { grid-template-columns: 1fr; } }
        /* State comparison section */
        .state-comparison-section { padding: 56px 0; background: var(--white); }
        .state-comparison-section h2 { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 10px; text-align: center; }
        /* Closing */
        .closing-cta { padding: 64px 0; background: var(--navy); text-align: center; }
        .closing-cta h2 { font-size: 26px; font-weight: 700; color: var(--white); margin-bottom: 12px; }
        .closing-cta p { font-size: 15px; color: rgba(255,255,255,0.78); max-width: 620px; margin: 0 auto 26px; line-height: 1.65; }
        .closing-cta p a { color: #7ee0b1; text-decoration: underline; }
        .closing-cta-btn { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 15px 32px; border-radius: 8px; text-decoration: none; }
        .closing-cta-btn:hover { background: var(--green-dark); }
        .closing-fine { font-size: 12px; color: rgba(255,255,255,0.55); max-width: 600px; margin: 16px auto 0; line-height: 1.55; }
        .footer { background: #1a1a1a; color: #cccccc; padding: 48px 0 0; }
        .footer-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 48px; margin-bottom: 32px; }
        .footer-col h4 { color: var(--white); font-size: 13px; font-weight: 600; margin-bottom: 16px; letter-spacing: 0.4px; text-transform: uppercase; }
        .footer-col a { display: block; font-size: 13px; color: #999999; text-decoration: none; margin-bottom: 10px; }
        .footer-col a:hover { color: var(--white); }
        .footer-col p { font-size: 13px; color: #999999; line-height: 1.7; }
        .footer-bottom { border-top: 1px solid #333333; padding: 20px 0; text-align: center; font-size: 12px; color: #666666; }
        @media (max-width: 640px) { .footer-grid { grid-template-columns: 1fr; gap: 28px; } }
    </style>
    <script type="application/ld+json">${ldJson}</script>
</head>
<body>

<header class="header">
    <div class="header-inner">
        <a href="/" class="header-logo"><img src="https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png" alt="My Money Marketplace" width="180" height="32"></a>
        <nav class="header-nav">
            <a href="/credit-cards" class="header-link">Credit Cards</a>
            <a href="/personal-loans" class="header-link">Personal Loans</a>
            <a href="/business-loans" class="header-link">Business Loans</a>
            <a href="/savings" class="header-link">Savings</a>
            <button class="mobile-toggle" aria-label="Menu"><span></span><span></span><span></span></button>
        </nav>
    </div>
</header>
${renderHeroPhoto(cfg.heroPhoto, cfg.stateName, cfg.industryLabel)}

<nav class="breadcrumb" aria-label="Breadcrumb">
    <div class="container">
        <ol class="breadcrumb-list"><li><a href="/">Home</a></li><li class="sep">/</li><li><a href="/sba-loans">SBA Loans</a></li><li class="sep">/</li><li><a href="/sba-loans/${cfg.industryParentSlug}">${cfg.industryLabelCap}</a></li><li class="sep">/</li><li class="current">${cfg.stateName}</li></ol>
    </div>
</nav>

<section class="hero">
    <div class="container">
        <div class="hero-grid">
            <div class="hero-left">
                <h1>SBA Loans for ${cfg.industryLabelCap} in ${cfg.stateName}</h1>
                <p class="sub">${cfg.heroSub}</p>
                <p class="hero-value">Answer 4 questions. Get matched with ${cfg.stateName}-${cfg.industryLabel.replace(/s$/, '')}-experienced SBA lenders.</p>
                <a href="#ca-stats" class="hero-skip">Skip to ${cfg.stateName} stats &rarr;</a>
                <p class="basics-link">See the national picture at the <a href="/sba-loans/${cfg.industryParentSlug}">SBA ${cfg.industryLabel} guide</a>.</p>
            </div>
            <div class="hero-right" id="quiz">
                <div class="quiz-card" id="quizCard">
                    <div class="quiz-progress" id="quizProgress">
                        <span class="quiz-step-label">Question <span id="quizCurrent">1</span> of ${total}</span>
                        <div class="quiz-bar"><div class="quiz-bar-fill" id="quizBar" style="width:${(100/total).toFixed(1)}%"></div></div>
                    </div>
                    <div id="quizQuestions">${questionsHtml}
                    </div>
                    <div id="quizResult" class="quiz-result" style="display:none" aria-live="polite">
                        <div class="quiz-result-badge" id="resultBadge"></div>
                        <h3 id="resultHeadline"></h3>
                        <p id="resultBody"></p>
                        <a id="resultCta" class="quiz-cta-btn" href="#" rel="nofollow sponsored">Continue &rarr;</a>
                        <button type="button" class="quiz-retake" id="quizRetake">Start over</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

<div id="ca-stats"></div>
${renderStatsBlock(stateStats, nationalStats, overall, cfg.stateName, cfg.industryLabel)}

${renderComparisonTiles(stateStats, nationalStats, overall, cfg.stateName, cfg.industryLabel)}

${renderStateComparisonSection(nationalStats.top_states_by_count, cfg.state, cfg.stateName, cfg.industryLabel)}

${renderLendersSection(stateStats.top_lenders, cfg.stateName, cfg.industryLabel, cfg.communityBankNames)}
<div class="container-narrow" style="margin-top:-24px;">
    <div class="lender-callout">${cfg.lenderCalloutHtml}</div>
</div>

<section class="ed">
    <div class="ed-inner">
        <h2 style="text-align:left;">${cfg.stateName} ${cfg.industryLabel} market context</h2>
        ${cfg.marketContextHtml}
    </div>
</section>

${renderCityLinks(cfg.cityLinks, cfg.stateName)}

${shortMechanics}

<section class="faq-section" id="faq">
    <div class="container">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-list">${faqsHtml}
        </div>
    </div>
</section>

<section class="closing-cta">
    <div class="container">
        <h2>Get matched with ${cfg.stateName} ${cfg.industryLabel.replace(/s$/, '')} SBA lenders</h2>
        <p>${cfg.stateName} ${cfg.industryLabel} SBA is a specialist segment. The top ${cfg.stateName} lenders understand the state's cost structure, labor economics, and (for restaurants specifically) California ABC liquor license mechanics that generalist banks routinely miss. See the broader <a href="/sba-loans/${cfg.industryParentSlug}">SBA ${cfg.industryLabel} guide</a> or <a href="/sba-loans">SBA loans hub</a>.</p>
        <a href="https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=${cfg.campaignSlug}&utm_content=closing-cta" class="closing-cta-btn" rel="nofollow sponsored">Match with ${cfg.stateName} SBA lenders &rarr;</a>
        <p class="closing-fine">MMM does not originate SBA loans. Applications are processed through SBA-authorized lenders. Statistics above are sourced from the SBA FOIA 7(a) dataset, fiscal years 2020 through December 2025.</p>
    </div>
</section>

<footer class="footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-col"><h4>Products</h4><a href="/personal-loans">Personal Loans</a><a href="/business-loans">Business Loans</a><a href="/sba-loans">SBA Loans</a><a href="/credit-cards">Credit Cards</a><a href="/savings">Savings</a></div>
            <div class="footer-col"><h4>About</h4><p>My Money Marketplace helps consumers and small business owners compare financial products and get matched with lenders. We may receive compensation from partners when you click links on our site. We do not originate SBA loans; applications are processed through SBA-authorized lenders. We do not provide financial, legal, or tax advice.</p></div>
        </div>
    </div>
    <div class="footer-bottom"><div class="container">&copy; 2026 My Money Marketplace. All rights reserved.</div></div>
</footer>

<script>
(function(){'use strict';
var PROFILES=${profilesJson};
var BASE_UTM="https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=${cfg.campaignSlug}";
var TOTAL=${total};var answers=new Array(TOTAL).fill(null);
${scoringBody}
var questionEls=document.querySelectorAll('.quiz-question');var progressCurrent=document.getElementById('quizCurrent');var progressBar=document.getElementById('quizBar');var progressWrap=document.getElementById('quizProgress');var questionsWrap=document.getElementById('quizQuestions');var resultWrap=document.getElementById('quizResult');
function showQuestion(idx){for(var i=0;i<questionEls.length;i++){questionEls[i].style.display=(i===idx)?'block':'none';}if(progressCurrent)progressCurrent.textContent=(idx+1);if(progressBar)progressBar.style.width=(((idx+1)/TOTAL)*100).toFixed(1)+'%';}
function showResult(){var key=score(answers);var p=PROFILES[key]||PROFILES.B;document.getElementById('resultBadge').textContent=p.badge;document.getElementById('resultHeadline').textContent=p.headline;document.getElementById('resultBody').textContent=p.body;var cta=document.getElementById('resultCta');var url=p.ctaUrl||(BASE_UTM+'&utm_content='+encodeURIComponent(p.utmContent));cta.href=url;cta.innerHTML=p.ctaLabel+' &rarr;';if(progressWrap)progressWrap.style.display='none';if(questionsWrap)questionsWrap.style.display='none';resultWrap.style.display='block';try{resultWrap.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){}}
function reset(){answers=new Array(TOTAL).fill(null);if(resultWrap)resultWrap.style.display='none';if(progressWrap)progressWrap.style.display='block';if(questionsWrap)questionsWrap.style.display='block';showQuestion(0);}
if(questionsWrap){questionsWrap.addEventListener('click',function(ev){var t=ev.target;if(!t||!t.classList||!t.classList.contains('quiz-option'))return;ev.preventDefault();var q=t.closest('.quiz-question');if(!q)return;var qi=parseInt(q.getAttribute('data-q'),10);answers[qi]=t.getAttribute('data-value');if(qi+1>=TOTAL)showResult();else showQuestion(qi+1);});}
var rb=document.getElementById('quizRetake');if(rb)rb.addEventListener('click',reset);showQuestion(0);})();
</script>

</body>
</html>
`;
}

function main() {
    const naicsCode = process.argv[2];
    const stateAbbr = process.argv[3];
    if (!naicsCode || !stateAbbr) {
        console.error('Usage: node scripts/generate-state-industry-page.js <NAICS> <STATE_ABBR>');
        console.error('Configured: ' + Object.keys(CONFIGS).join(', '));
        process.exit(1);
    }
    const key = `${naicsCode}_${stateAbbr}`;
    const cfg = CONFIGS[key];
    if (!cfg) {
        console.error(`No config for ${key}. Configured: ${Object.keys(CONFIGS).join(', ')}`);
        process.exit(1);
    }
    const html = renderPage(naicsCode, stateAbbr);
    const urlPath = `/sba-loans/${cfg.industryParentSlug}/${cfg.stateSlug}`;
    const outPath = path.join(__dirname, '..', 'sba-loans', cfg.industryParentSlug, cfg.stateSlug, 'index.html');

    // Pre-publish guardrail
    const { blocked } = runPrePublishGuardrail({ html, urlPath, label: urlPath });
    if (blocked) process.exit(1);

    if (process.argv.includes('--preview')) {
        console.log(`[preview] Would write ${outPath} (${html.length.toLocaleString()} chars). No file written.`);
        return;
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`Wrote ${outPath} (${html.length.toLocaleString()} chars)`);
}

// ─── Pre-publish guardrail (shared with generate-industry-page.js) ──────
// CRITICAL and HIGH findings block the write. MEDIUM/LOW warn only.
// Set SKIP_AUDIT=1 to bypass (dev only).
// Pass --preview as a CLI flag to run the audit without writing the file.
const audit = require('./audit-module.js');

function runPrePublishGuardrail({ html, urlPath, label }) {
    if (process.env.SKIP_AUDIT === '1') {
        console.warn(`  [audit] SKIP_AUDIT=1 — guardrail bypassed for ${label}.`);
        return { blocked: false, findings: [] };
    }
    const baselinePath = path.join(__dirname, '..', 'data', 'audit-baseline.json');
    const baseline = audit.loadBaseline(baselinePath);
    const findings = audit.runChecks(html, { urlPath, checkNames: audit.PRE_PUBLISH_CHECKS });
    const newFindings = audit.filterNewFindings(findings, baseline);
    const blockers = newFindings.filter(f => audit.BLOCKING_SEVERITIES.includes(f.severity));
    const warnings = newFindings.filter(f => !audit.BLOCKING_SEVERITIES.includes(f.severity));

    if (warnings.length > 0) {
        console.warn(`  [audit] ${warnings.length} non-blocking finding(s) for ${label}:`);
        for (const w of warnings) console.warn(`    - ${audit.formatFinding(w).replace(/\n/g, '\n      ')}`);
    }
    if (blockers.length > 0) {
        console.error(`\n  [audit] BLOCKED: ${blockers.length} CRITICAL/HIGH finding(s) for ${label}:`);
        for (const b of blockers) console.error(`    - ${audit.formatFinding(b).replace(/\n/g, '\n      ')}`);
        console.error(`\n  File NOT written. Fix the above issues or set SKIP_AUDIT=1 to bypass (not for production).`);
        return { blocked: true, findings: blockers };
    }
    return { blocked: false, findings: newFindings };
}

if (require.main === module) main();

module.exports = { renderPage, CONFIGS, runPrePublishGuardrail };
