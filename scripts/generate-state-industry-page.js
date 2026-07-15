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

    // Cross-links to existing CA city pages
    cityLinks: [
        { name: 'Los Angeles', href: '/business-loans/los-angeles-ca' },
        { name: 'San Francisco', href: '/business-loans/san-francisco-ca' },
        { name: 'San Diego', href: '/business-loans/san-diego-ca' },
        { name: 'San Jose', href: '/business-loans/san-jose-ca' },
        { name: 'Oakland', href: '/business-loans/oakland-ca' },
        { name: 'Sacramento', href: '/business-loans/sacramento-ca' },
        { name: 'Long Beach', href: '/business-loans/long-beach-ca' },
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

    // Cross-links to existing TX city business-loans pages
    cityLinks: [
        { name: 'Houston', href: '/business-loans/houston-tx' },
        { name: 'Dallas', href: '/business-loans/dallas-tx' },
        { name: 'Fort Worth', href: '/business-loans/fort-worth-tx' },
        { name: 'Austin', href: '/business-loans/austin-tx' },
        { name: 'San Antonio', href: '/business-loans/san-antonio-tx' },
        { name: 'Plano', href: '/business-loans/plano-tx' },
        { name: 'Arlington', href: '/business-loans/arlington-tx' },
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
        <p>Texas is the <strong>second-largest state for auto repair SBA lending</strong> behind California (7.89% of national volume, 427 loans approved FY2020-2025, $307 million in total approved capital) &mdash; and it&rsquo;s compounding two distinct growth trends at once. The national auto repair SBA category is up +26.93% year-over-year as the industry undergoes real operator turnover and consolidation. On top of that, <strong>Texas is growing at +52%</strong> &mdash; nearly twice the national auto-repair rate. This mirrors the Texas restaurant SBA pattern where the state compounds industry-level growth with state-level acceleration. See our <a href="/sba-loans/restaurants/texas/">Texas restaurants SBA page</a> for the parallel story.</p>
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
        { name: 'Fort Worth', href: '/business-loans/fort-worth-tx' },
        { name: 'Austin', href: '/business-loans/austin-tx' },
        { name: 'San Antonio', href: '/business-loans/san-antonio-tx' },
        { name: 'El Paso', href: '/business-loans/el-paso-tx' },
        { name: 'Arlington', href: '/business-loans/arlington-tx' },
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

'621210_CA': {
    naicsCode: '621210',
    state: 'CA',
    industryParentSlug: 'dentists',
    industryLabel: 'dental practices',
    industryLabelCap: 'Dental Practices',
    industryLabelCapSingular: 'Dental Practice',
    stateSlug: 'california',
    stateName: 'California',
    campaignSlug: 'sba-dentists-california-quiz',

    heroPhoto: {
        src: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Modern California dental operatory with chair and imaging equipment, representative of dental practices financed through SBA 7(a) loans',
        width: 1200,
        height: 800,
        photographer: 'Daniel Frank',
        photographerUrl: 'https://www.pexels.com/@fr3nks/',
        sourceUrl: 'https://www.pexels.com/photo/3845810/',
        sourceName: 'Pexels',
    },
    communityBankNames: ['Live Oak Banking Company'],

    title: 'SBA Loans for Dental Practices in California 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for California dental practices. 732 CA dental SBA loans approved FY2020-2025 ($767M), 18% of national dental volume, 0.27% charge-off (0.2x SBA avg). Take the 2-minute quiz.',
    heroSub: 'California dental practice SBA lending is the lowest-risk high-volume combination in the entire SBA dataset. <strong>732 loans approved FY2020-2025 representing 18% of all national dental SBA volume</strong>, with a <strong>0.27% charge-off rate &mdash; one-fifth the SBA cross-industry average</strong>. Deal sizes average over $1 million. Live Oak Banking dominates the specialist lender landscape.',

    serviceDescription: 'My Money Marketplace helps California dentists and dental-practice buyers compare SBA 7(a) and 504 options and get matched with specialist lenders experienced in California dental practice acquisition underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',

    marketContextHtml: `
        <p>California dental SBA lending occupies an unusual position in the SBA data: <strong>the largest state market for a category that has the lowest charge-off rate in the entire SBA dataset</strong>. 732 loans approved FY2020-2025 at $766.9 million in total approved capital, accounting for 17.99% of national dental SBA volume. Second-place Texas trails at 9.8%. On volume alone, California dental is roughly double the next state.</p>
        <p>Underwriting performance is the real story. National dental SBA charges off at 0.27% &mdash; the lowest of any SBA industry category we track. California dental matches that nationally-best performance at <strong>0.27% charge-off, a 0.20&times; ratio versus the SBA cross-industry average of 1.36%</strong>. In practical terms: California dental practice files are approximately five times less likely to charge off than the average SBA 7(a) loan, which directly affects lender pricing, file velocity, and equity-injection flexibility.</p>
        <h3>Why dental practice SBA performs this well</h3>
        <p>Three structural features drive the favorable charge-off profile. First, <strong>dental practice acquisitions are the dominant use case</strong> &mdash; roughly 75-85% of dental SBA 7(a) files are acquisitions of established practices with verified revenue history, not speculative startups. Second, <strong>dental revenue is recurring and demand is non-discretionary</strong> &mdash; insurance-backed procedures, preventive care cycles, and recall-driven appointment books create highly predictable cash flow. Third, <strong>dentists are licensed professionals with verified income history</strong> &mdash; underwriting has much more operator-side certainty than most small-business SBA categories.</p>
        <p>California amplifies each of these: the state&rsquo;s scale produces a larger pool of established practices available for acquisition, the demographic base supports strong patient recall volumes in metros across the state, and the licensing standards are well-understood by specialist lenders.</p>
        <h3>Deal sizes reflect the California-specific cost baseline</h3>
        <p><strong>Average California dental SBA loan is approximately $1.05 million &mdash; the second-highest state average for dental SBA (behind Colorado at $1.43M)</strong>. Median is $689,000 vs. $510,000 nationally (+35%). The higher deal sizes reflect California commercial real estate costs, the prevalence of practice-plus-real-estate-combined structures, and the scale of larger metropolitan practice acquisitions. +41.7% YoY growth in California dental SBA lending puts the state firmly in the growth acceleration pattern.</p>
        <h3>California regulatory context for dental SBA underwriting</h3>
        <p>California has state-specific dental practice ownership rules that lenders handle explicitly:</p>
        <ul>
            <li><strong>Licensed ownership requirement.</strong> Under California Business and Professions Code, only licensed California dentists (or professional dental corporations owned by licensed dentists) can own and operate a dental practice. Non-dentist operators and non-professional-corp ownership structures don't underwrite cleanly. Specialist lenders confirm licensing and corporate-entity structure upfront; generalist banks unfamiliar with California professional-practice ownership rules sometimes miss this and waste weeks of underwriting time.</li>
            <li><strong>Dental Board of California oversight.</strong> License history, disciplinary actions, and corporate entity registration are all reviewed on acquisition files. A clean license history underwrites cleanly; files with open disciplinary matters face extended diligence regardless of underlying practice economics.</li>
            <li><strong>Labor cost structure.</strong> California dental assistants, hygienists, and front-office staff are paid materially more than national averages. Specialist lenders model California-specific labor baselines in DSCR projections rather than applying national dental-practice cost benchmarks that understate payroll.</li>
            <li><strong>Real estate vs. lease structure.</strong> California commercial real estate in dental-appropriate locations (medical corridors, established suburban centers) carries premium pricing. A meaningful share of California dental SBA deals include real estate via SBA 504 plus a 7(a) companion. The real-estate-combined structure often pencils better than pure lease files long-term.</li>
        </ul>
        <h3>Metro distribution</h3>
        <p>California dental SBA volume is distributed across <strong>Los Angeles / Orange County, San Diego, San Francisco Bay Area, Sacramento, and the Inland Empire</strong>. The Bay Area and LA-OC carry the highest absolute volume; San Diego runs a higher share of practice-plus-real-estate combined deals. Sacramento has meaningful state-employee-adjacent practice volume. Secondary markets (Fresno, Bakersfield, Central Coast) all have active specialist-lender coverage.</p>
    `,

    lenderCalloutHtml: `
        <p>California dental SBA lending has a <strong>clear specialist-lender leader: Live Oak Banking Company</strong> dominates with 120 California dental loans &mdash; 16% of all California dental SBA volume by count and $231 million in total approved capital. Live Oak is the national dental-practice SBA specialist; their California volume reflects that national leadership applied to the largest single-state market. Average Live Oak California dental loan is $1.93 million, the highest of any top-10 lender and reflecting their focus on larger acquisition and real-estate-combined files.</p>
        <p>U.S. Bank (81 loans) holds a strong #2 position with a more generalist-branch profile. Wells Fargo (44) and Bank of America (39) carry meaningful volume particularly on existing-customer practice acquisition files. Specialist SBA platforms Readycap (26), BayFirst (19), and Newtek (14) appear in the top 10 at the smaller-deal tier. First-Citizens (23) and BMO (19) cover the mid-tier. Bank of Hope (12) appears in the dental top 10 reflecting some overlap with the California Korean-American practice ownership network. <strong>For a California dental practice buyer, Live Oak is the default first call; U.S. Bank is the strong generalist alternative; the specialist platforms handle everything under $500K well.</strong></p>
    `,

    cityLinks: [
        { name: 'Los Angeles', href: '/business-loans/los-angeles-ca' },
        { name: 'San Francisco', href: '/business-loans/san-francisco-ca' },
        { name: 'San Diego', href: '/business-loans/san-diego-ca' },
        { name: 'San Jose', href: '/business-loans/san-jose-ca' },
        { name: 'Sacramento', href: '/business-loans/sacramento-ca' },
        { name: 'Irvine', href: '/business-loans/irvine-ca' },
        { name: 'Long Beach', href: '/business-loans/long-beach-ca' },
    ],

    quiz: {
        questions: [
            {q:"What's your California dental situation?",opts:[
                {v:"acquisition",l:"Acquiring an existing CA practice"},
                {v:"startup",l:"Starting a new practice"},
                {v:"real-estate",l:"Buying the practice building"},
                {v:"expansion",l:"Expansion or additional location"},
            ]},
            {q:"Primary loan use?",opts:[
                {v:"purchase-price",l:"Acquisition purchase price"},
                {v:"real-estate-use",l:"Real estate purchase"},
                {v:"equipment",l:"Equipment / technology upgrade"},
                {v:"buildout",l:"Buildout / tenant improvements"},
                {v:"multiple",l:"Multiple uses combined"},
            ]},
            {q:"Loan amount needed?",opts:[
                {v:"under-500k",l:"Under $500K"},
                {v:"500k-1m",l:"$500K - $1M"},
                {v:"1m-3m",l:"$1M - $3M"},
                {v:"3m-plus",l:"$3M+"},
            ]},
            {q:"Years since dental school graduation?",opts:[
                {v:"0-2",l:"0-2 years"},
                {v:"3-5",l:"3-5 years"},
                {v:"6-plus",l:"6+ years"},
            ]},
        ],
        profiles: {
            A: {
                badge: "Classic CA dental acquisition",
                headline: "You're in the lowest-risk high-volume SBA category",
                body: "An experienced California dentist acquiring an established practice is exactly the file that Live Oak, U.S. Bank, Wells Fargo, and the specialist California dental lenders deploy capital into at scale. California dental SBA has the lowest charge-off rate in the entire SBA dataset (0.20x the cross-industry average) and the largest state volume. Expect 60-90 days to close with a specialist dental lender. Live Oak is the default first call; U.S. Bank and Wells Fargo are strong alternatives on existing-banking-relationship files.",
                ctaLabel: "Match with California dental SBA lenders",
                utmContent: "profile-a-ca-dental-acquisition",
            },
            B: {
                badge: "Real estate + practice",
                headline: "SBA 504 for the building, 7(a) companion for the practice",
                body: "California dental deals including the office real estate benefit from SBA 504's fixed long-term rates on the real-estate portion. 7(a) companion covers the practice purchase, equipment, and working capital. Combined structure typically runs 75-120 days to close. Live Oak handles the combined structure routinely on California dental files; specialist platforms (First-Citizens, BMO) also carry strong combined-deal competence. For long-term economics, real estate ownership in California dental-appropriate corridors often pencils better than pure lease files.",
                ctaLabel: "Match with 504 + 7(a) CA dental lenders",
                utmContent: "profile-b-ca-dental-real-estate",
            },
            C: {
                badge: "Startup / recent grad path",
                headline: "Startup files require more operator-profile support",
                body: "California dental startup files (new practice, 0-2 years since graduation) require more underwriting detail than established-practice acquisitions. Lenders want associate experience at an existing practice, a detailed patient acquisition plan, documented marketing channels, and typically a higher equity injection than the 10% minimum. Specialist dental lenders (Live Oak, U.S. Bank) handle these files; generalist banks routinely decline them. Plan 75-100 days to close with a specialist who understands dental-startup economics.",
                ctaLabel: "Match with CA dental startup SBA lenders",
                utmContent: "profile-c-ca-dental-startup",
            },
        },
        scoringBody: `
            function score(a) {
                var sit=a[0], use=a[1], amount=a[2], exp=a[3];
                if (sit==='real-estate' || use==='real-estate-use') return 'B';
                if (sit==='startup' || exp==='0-2') return 'C';
                return 'A';
            }
        `,
    },

    faqs: [
        {q:"Why is California dental SBA lending considered low risk?",a:"California dental SBA loans charge off at 0.27% — 0.20× the SBA cross-industry average of 1.36%, meaning California dental files are approximately five times less likely to charge off than the average SBA 7(a) loan. This matches the national dental SBA charge-off rate, which is itself the lowest of any SBA industry category. Three structural drivers: dental practice acquisitions (not startups) are the dominant use case with verified revenue history, dental revenue is recurring and non-discretionary, and dentists are licensed professionals with verified income history — all of which create more underwriting certainty than most SBA categories."},
        {q:"How large is the California dental SBA market?",a:"California is the largest single-state dental SBA market — 732 loans approved FY2020-2025 representing 18% of all national dental SBA volume and $767 million in total approved capital. That's roughly double the next state (Texas at 9.8% share). California dental SBA is growing at +41.7% year-over-year, putting it firmly in the growth-acceleration pattern."},
        {q:"What's the typical SBA dental loan size in California?",a:"Average California dental SBA loan is approximately $1.05 million — the second-highest state average (behind Colorado at $1.43M). Median is $689,000 vs. $510,000 nationally (+35%). The higher deal sizes reflect California commercial real estate costs, the prevalence of practice-plus-real-estate-combined structures, and the scale of larger metropolitan practice acquisitions particularly in Los Angeles, San Diego, and the Bay Area."},
        {q:"Who can own a dental practice in California?",a:"Under California Business and Professions Code, only licensed California dentists (or professional dental corporations owned by licensed dentists) can own and operate a dental practice. Non-dentist operators and non-professional-corporation ownership structures don't underwrite cleanly. Specialist California dental SBA lenders confirm licensing and corporate-entity structure upfront; generalist banks unfamiliar with California professional-practice ownership rules sometimes miss this and waste significant underwriting time. All California dental SBA files require current California Dental Board licensure."},
        {q:"Which SBA lenders are most active in California dental lending?",a:"Live Oak Banking Company dominates with 120 California dental loans — 16% of California dental SBA volume and $231 million in total approved capital. Live Oak is the national dental-practice SBA specialist. U.S. Bank (81 loans) holds #2. Wells Fargo (44) and Bank of America (39) carry strong existing-customer-relationship volume. Specialist SBA platforms Readycap (26), BayFirst (19), and Newtek (14) appear in the top 10 at the smaller-deal tier. First-Citizens (23) and BMO (19) cover the mid-tier."},
        {q:"How long does an SBA loan take to close for a California dental practice?",a:"60-90 days is typical for a California dental practice acquisition with Live Oak or another specialist dental lender. Deals including commercial real estate via SBA 504 plus a 7(a) companion loan typically run 75-120 days. Startup practice files (dentist in first 0-2 years post-graduation) typically run 75-100 days given the extra operator-profile underwriting. Generalist banks unfamiliar with California professional-practice ownership rules routinely extend these timelines."},
        {q:"What California dental-specific factors affect SBA underwriting?",a:"Four factors routinely come up: licensed-ownership requirement (California Business and Professions Code restricts dental practice ownership to licensed dentists or professional dental corporations), Dental Board of California license history review (disciplinary actions extend diligence), California labor cost modeling (dental assistants, hygienists, and front-office staff in California are paid meaningfully more than national averages), and commercial real estate pricing (dental-appropriate corridors carry California premium pricing, making real-estate-combined structures common). Specialist California dental lenders handle all four as standard practice."},
    ],
},

'541940_CA': {
    naicsCode: '541940',
    state: 'CA',
    industryParentSlug: 'veterinarians',
    industryLabel: 'veterinary practices',
    industryLabelCap: 'Veterinary Practices',
    industryLabelCapSingular: 'Veterinary Practice',
    stateSlug: 'california',
    stateName: 'California',
    campaignSlug: 'sba-veterinarians-california-quiz',

    heroPhoto: {
        src: 'https://images.pexels.com/photos/7469232/pexels-photo-7469232.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Veterinarian examining a dog on exam table in a modern clinic, representative of California veterinary practices financed through SBA 7(a) loans',
        width: 1200,
        height: 800,
        photographer: 'Mikhail Nilov',
        photographerUrl: 'https://www.pexels.com/@mikhail-nilov/',
        sourceUrl: 'https://www.pexels.com/photo/7469232/',
        sourceName: 'Pexels',
    },
    communityBankNames: ['Live Oak Banking Company'],

    title: 'SBA Loans for Veterinary Practices in California 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for California veterinary practices. 183 CA vet SBA loans approved FY2020-2025 ($312M), $1.7M avg loan, 0% charge-offs. Largest state for the best-performing SBA category. Take the 2-minute quiz.',
    heroSub: 'California veterinary practice SBA lending sits at the intersection of two superlatives: <strong>the best-performing SBA industry category anywhere in the dataset (0.18% national charge-off) and the largest state market for that category</strong>. California vet files average <strong>$1.7 million per loan &mdash; the highest state-industry average deal size we track</strong>. Zero charge-offs on 183 California vet loans FY2020-2025. Live Oak Banking owns the specialist lender position.',

    serviceDescription: 'My Money Marketplace helps California veterinarians and veterinary-practice buyers compare SBA 7(a) and 504 options and get matched with specialist lenders experienced in California veterinary practice acquisition underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',

    marketContextHtml: `
        <p>Veterinary practice SBA lending is the cleanest-performing category in our entire dataset. National veterinary charges off at <strong>0.18%</strong> across 1,636 loans FY2020-2025 &mdash; a <strong>0.13&times; ratio versus the SBA cross-industry average of 1.36%</strong>. In plain terms: veterinary SBA files are approximately eight times less likely to charge off than the average SBA 7(a) loan. California doubles down on this credibility story with <strong>zero charge-offs across 183 California veterinary SBA loans totaling $311.8 million in approved capital</strong>.</p>
        <p>California is the largest single-state veterinary SBA market, accounting for 11.19% of national volume. Florida and Texas follow at 10.64% and 7.58% share respectively. California growth is +15.4% YoY &mdash; healthy but not the state-acceleration story we see with Texas restaurants or auto repair; the national veterinary category is itself up +40.2% YoY, and California is growing below the national rate because its base is already large.</p>
        <h3>The $1.7M average: what drives it</h3>
        <p><strong>Average California veterinary SBA loan is approximately $1.7 million &mdash; the highest state-industry average deal size we track</strong>. Median is $1.15 million vs. $654,000 nationally (+75%). Four structural drivers push the number up:</p>
        <ul>
            <li><strong>Practice-plus-real-estate combined structure is the default.</strong> California veterinary practices typically own the building. A meaningful share of California vet SBA files are SBA 504 + 7(a) companion structures covering real estate plus the operating business. The combined deal size naturally runs higher than pure practice-acquisition files.</li>
            <li><strong>Multi-doctor practice prevalence.</strong> California veterinary practice acquisitions skew toward multi-doctor clinics with meaningful revenue scale. Single-doctor rural clinic acquisitions exist but are a smaller share of California vet SBA volume than in states with more rural-veterinary density.</li>
            <li><strong>Specialty and referral practice scale.</strong> California has a substantial base of specialty veterinary practices (emergency/critical care, oncology, ophthalmology, dermatology). These acquisitions routinely run $2M+ given the specialized equipment and revenue scale.</li>
            <li><strong>California commercial real estate baseline.</strong> Vet-appropriate commercial real estate in California metros (suburban medical corridors, stand-alone practice buildings) carries California-premium pricing that pushes the combined deal size higher.</li>
        </ul>
        <h3>Why veterinary SBA performs so well</h3>
        <p>Three structural features drive the industry-leading charge-off profile. First, <strong>veterinary services demand is recurring and non-discretionary</strong> &mdash; annual wellness exams, vaccinations, dental cleanings, and chronic condition management create highly predictable revenue. Pet ownership and spending continued to grow through economic cycles. Second, <strong>veterinary practice acquisitions are the dominant use case</strong> &mdash; with existing revenue history to underwrite against, not speculative startups. Third, <strong>veterinarians are licensed professionals with standardized income verification</strong>, which creates operator-side underwriting certainty.</p>
        <p>California compounds each of these: the state&rsquo;s population density and high per-capita pet spending create strong practice economics, the licensing standards are well-understood by specialist lenders, and the scale of established multi-doctor practices creates a deep pool of acquisition candidates.</p>
        <h3>Metro distribution</h3>
        <p>California veterinary SBA volume concentrates in <strong>Los Angeles / Orange County, San Francisco Bay Area, San Diego, Sacramento, and the Inland Empire</strong>. LA-OC carries the highest absolute volume; the Bay Area runs a higher share of specialty and emergency-medicine practice acquisitions. San Diego has meaningful multi-doctor general practice volume. Sacramento and the Central Valley have active lending particularly on practice-plus-real-estate combined deals.</p>
        <h3>California regulatory context for veterinary SBA underwriting</h3>
        <p>California has state-specific veterinary practice ownership and operational rules that lenders handle explicitly:</p>
        <ul>
            <li><strong>Licensed ownership requirement.</strong> Under California Business and Professions Code Section 4854, only licensed California veterinarians (or professional veterinary corporations owned by licensed veterinarians) can own and operate a veterinary practice. Non-veterinarian operators and non-professional-corp ownership structures don't underwrite cleanly. Specialist lenders confirm licensing and corporate-entity structure upfront.</li>
            <li><strong>Veterinary Medical Board oversight.</strong> License history, disciplinary actions, and corporate entity registration are reviewed on acquisition files. A clean license history underwrites cleanly; files with open disciplinary matters face extended diligence.</li>
            <li><strong>Labor cost structure.</strong> California veterinary technicians, assistants, and front-office staff are paid materially above national averages. Specialist lenders model California-specific labor baselines rather than applying national-practice benchmarks.</li>
            <li><strong>Controlled substance and DEA registration.</strong> Veterinary practices handle controlled substances (ketamine, opioids for surgery, etc.) and require active DEA registration. Underwriting reviews compliance history, particularly on acquisition files where transfer of DEA registration affects deal timing.</li>
        </ul>
    `,

    lenderCalloutHtml: `
        <p>California veterinary SBA lending has the most concentrated specialist-lender pattern in the entire dataset: <strong>Live Oak Banking Company dominates with 57 California vet loans &mdash; 31% of all California veterinary SBA volume by count and $151 million in approved capital</strong>. Live Oak is the national veterinary-practice SBA specialist; their California volume reflects that national leadership applied to the largest state market. Average Live Oak California veterinary loan is <strong>$2.65 million</strong>, the highest of any top-10 lender for any state-industry combination we track. Live Oak&rsquo;s model on veterinary files is well-matched to the category: specialized underwriting templates, industry-specific valuation expertise, and a team that speaks the veterinary language fluently.</p>
        <p>Wells Fargo (16 loans) holds #2, primarily on existing-customer practice acquisition files. Bank of America (10) and PNC Bank (9) carry additional major-bank volume. Two California-native banks appear in the top 10: <strong>Banc of California (8 loans) and United Community Bank (8)</strong> &mdash; both of which have dedicated veterinary practice banking programs. JPMorgan Chase (4), Colony Bank (4), Enterprise Bank &amp; Trust (4), and CalPrivate Bank (3) round out the list. <strong>For a California veterinary practice buyer, Live Oak is the default first call &mdash; no other lender concentrates this level of veterinary-specific expertise and capital in the California market</strong>; Wells Fargo and Banc of California are strong alternatives on existing-banking-relationship files.</p>
    `,

    cityLinks: [
        { name: 'Los Angeles', href: '/business-loans/los-angeles-ca' },
        { name: 'San Francisco', href: '/business-loans/san-francisco-ca' },
        { name: 'Oakland', href: '/business-loans/oakland-ca' },
        { name: 'San Diego', href: '/business-loans/san-diego-ca' },
        { name: 'San Jose', href: '/business-loans/san-jose-ca' },
        { name: 'Sacramento', href: '/business-loans/sacramento-ca' },
        { name: 'Irvine', href: '/business-loans/irvine-ca' },
    ],

    quiz: {
        questions: [
            {q:"What's your California veterinary situation?",opts:[
                {v:"acquisition",l:"Acquiring an existing CA practice"},
                {v:"specialty",l:"Acquiring a specialty / emergency practice"},
                {v:"real-estate",l:"Acquiring practice + real estate"},
                {v:"startup",l:"Starting a new practice"},
            ]},
            {q:"Primary loan use?",opts:[
                {v:"purchase-price",l:"Practice acquisition purchase price"},
                {v:"real-estate-use",l:"Real estate purchase (practice building)"},
                {v:"equipment",l:"Diagnostic / surgical equipment"},
                {v:"expansion",l:"Expansion / buildout"},
                {v:"multiple",l:"Multiple uses combined"},
            ]},
            {q:"Loan amount needed?",opts:[
                {v:"under-1m",l:"Under $1M"},
                {v:"1m-2m",l:"$1M - $2M"},
                {v:"2m-5m",l:"$2M - $5M"},
                {v:"5m-plus",l:"$5M+"},
            ]},
            {q:"Years in veterinary practice?",opts:[
                {v:"0-3",l:"0-3 years (associate or new grad)"},
                {v:"4-10",l:"4-10 years"},
                {v:"10-plus",l:"10+ years"},
            ]},
        ],
        profiles: {
            A: {
                badge: "Classic CA veterinary acquisition",
                headline: "You're in the best-performing SBA category, largest state market",
                body: "An experienced California veterinarian acquiring an established practice is the file Live Oak Banking underwrites at scale in California. Live Oak holds 31% of California veterinary SBA volume by count and $151M in approved capital with an average loan of $2.65M per file — the largest average loan size of any top-10 specialist lender we track. Expect 60-90 days to close. Wells Fargo and Banc of California are strong alternatives on existing-banking-relationship files.",
                ctaLabel: "Match with California veterinary SBA lenders",
                utmContent: "profile-a-ca-vet-acquisition",
            },
            B: {
                badge: "Specialty or real-estate combined",
                headline: "Specialty practice or 504 + 7(a) combined structure",
                body: "California specialty veterinary practices (emergency, critical care, specialty referral) and real-estate-combined files benefit from larger SBA structures: 7(a) Standard for the practice, SBA 504 for the real estate portion, or combined 7(a) up to $5M. Live Oak handles these routinely on California files; Wells Fargo carries strong large-deal volume. Specialty practice files often run $2M-$5M+. Plan 75-120 days to close given combined-structure coordination.",
                ctaLabel: "Match with CA specialty vet SBA lenders",
                utmContent: "profile-b-ca-vet-specialty",
            },
            C: {
                badge: "Early-career or startup",
                headline: "Early-career files require more operator-profile support",
                body: "California veterinary startup files (new practice, 0-3 years post-graduation) and early-career acquisitions require more underwriting detail than established-practice acquisitions by experienced veterinarians. Lenders want associate experience at an existing practice, a detailed business plan with documented patient-base assumptions, and typically a higher equity injection. Live Oak handles these files; generalist banks routinely decline them. Plan 75-100 days with a specialist who understands veterinary-startup economics.",
                ctaLabel: "Match with CA vet startup SBA lenders",
                utmContent: "profile-c-ca-vet-startup",
            },
        },
        scoringBody: `
            function score(a) {
                var sit=a[0], use=a[1], amount=a[2], exp=a[3];
                if (sit==='specialty' || use==='real-estate-use' || sit==='real-estate' || amount==='2m-5m' || amount==='5m-plus') return 'B';
                if (sit==='startup' || exp==='0-3') return 'C';
                return 'A';
            }
        `,
    },

    faqs: [
        {q:"Why is California veterinary SBA lending considered the best-performing category?",a:"National veterinary practice SBA charges off at 0.18% — a 0.13× ratio against the SBA cross-industry average of 1.36%, meaning veterinary SBA files are approximately eight times less likely to charge off than the average SBA 7(a) loan. That's the cleanest category performance in the entire dataset. California goes further: zero charge-offs across all 183 California veterinary SBA loans approved FY2020-2025 ($311.8M in total approved capital). Three structural drivers: recurring non-discretionary demand (pet care), acquisition-dominant use case (verified revenue history), and licensed-professional operator profile."},
        {q:"How large is the California veterinary SBA market?",a:"California is the largest single-state veterinary SBA market — 183 loans approved FY2020-2025 representing 11.19% of all national veterinary SBA volume and $311.8 million in total approved capital. Florida and Texas follow at 10.64% and 7.58% share. Growth is +15.4% year-over-year, below the national veterinary rate of +40% because California's base is already large."},
        {q:"Why is the average California vet SBA loan size so high ($1.7M)?",a:"Average California veterinary SBA loan is approximately $1.7 million — the highest state-industry average deal size we track, and median is $1.15 million vs. $654K nationally (+75%). Four drivers push the number up: practice-plus-real-estate combined structure is the default (CA vet practices typically own the building, creating SBA 504 + 7(a) companion files), multi-doctor practice prevalence (CA vet acquisitions skew toward multi-doctor clinics), specialty and referral practice scale (emergency, oncology, ophthalmology practices routinely $2M+), and California commercial real estate pricing."},
        {q:"Who can own a veterinary practice in California?",a:"Under California Business and Professions Code Section 4854, only licensed California veterinarians (or professional veterinary corporations owned by licensed veterinarians) can own and operate a veterinary practice. Non-veterinarian operators and non-professional-corporation ownership structures don't underwrite cleanly. Specialist California veterinary SBA lenders confirm licensing and corporate-entity structure upfront; generalist banks unfamiliar with California professional-practice ownership rules sometimes miss this and waste significant underwriting time."},
        {q:"Which SBA lenders are most active in California veterinary lending?",a:"Live Oak Banking Company dominates with 57 California veterinary loans — 31% of California veterinary SBA volume by count, $151 million in total approved capital, and an average loan size of $2.65 million (the highest of any top-10 lender for any state-industry combination). Live Oak is the national veterinary-practice SBA specialist. Wells Fargo (16 loans) holds #2, Bank of America (10) and PNC Bank (9) carry additional major-bank volume. Two California-native banks appear in the top 10: Banc of California (8 loans) and United Community Bank (8)."},
        {q:"How long does an SBA loan take to close for a California veterinary practice?",a:"60-90 days is typical for a California veterinary practice acquisition with Live Oak or another specialist veterinary lender. Deals including commercial real estate via SBA 504 plus a 7(a) companion loan typically run 75-120 days. Specialty practice files (emergency, critical care, specialty referral) often run on the longer end given the diligence on specialized equipment and operator profile. Early-career or startup files typically run 75-100 days given the extra operator-profile underwriting."},
        {q:"What California veterinary-specific factors affect SBA underwriting?",a:"Four factors routinely come up: licensed-ownership requirement (CA B&P Code 4854 restricts veterinary practice ownership to licensed veterinarians or professional veterinary corporations), Veterinary Medical Board license history review, California labor cost modeling (veterinary technicians, assistants, and front-office staff in California are paid meaningfully more than national averages), and DEA registration transfer timing on acquisition files (veterinary practices handle controlled substances — DEA registration transfer affects deal close timing). Specialist California veterinary lenders handle all four as standard practice."},
    ],
},

'524210_TX': {
    naicsCode: '524210',
    state: 'TX',
    industryParentSlug: 'insurance-agencies',
    industryLabel: 'insurance agencies',
    industryLabelCap: 'Insurance Agencies',
    industryLabelCapSingular: 'Insurance Agency',
    stateSlug: 'texas',
    stateName: 'Texas',
    campaignSlug: 'sba-insurance-agencies-texas-quiz',

    heroPhoto: {
        src: 'https://images.pexels.com/photos/6457568/pexels-photo-6457568.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Insurance agency office with agent reviewing paperwork with client, representative of Texas insurance agencies financed through SBA 7(a) acquisition loans',
        width: 1200,
        height: 800,
        photographer: 'Kampus Production',
        photographerUrl: 'https://www.pexels.com/@kampus/',
        sourceUrl: 'https://www.pexels.com/photo/6457568/',
        sourceName: 'Pexels',
    },
    communityBankNames: ['Live Oak Banking Company'],

    title: 'SBA Loans for Insurance Agencies in Texas 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for Texas insurance agencies. 469 TX agency SBA loans approved FY2020-2025 ($272M), +52% YoY growth. Texas is the #1 state for insurance agency SBA -- the only industry in our cluster where TX beats CA. Take the 2-minute quiz.',
    heroSub: 'Texas is the <strong>#1 state for insurance agency SBA lending &mdash; the only industry category in our cluster where Texas leads California on volume</strong>. 469 loans approved FY2020-2025 at $272M in total approved capital, and the state is accelerating at +52% YoY. Insurance agency SBA is fundamentally a book-of-business acquisition play; the Texas market dynamics give it a distinctive structure.',

    serviceDescription: 'My Money Marketplace helps Texas insurance agency operators and acquirers compare SBA 7(a) options and get matched with specialist lenders experienced in book-of-business acquisition underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',

    marketContextHtml: `
        <p>Texas holds an unusual position in the SBA data: <strong>it&rsquo;s the largest state market for insurance agencies &mdash; the only industry category in our cluster where Texas leads California on loan count</strong>. Texas agencies account for 11.04% of national insurance agency SBA volume (469 loans FY2020-2025, $272M approved), compared to Florida at 10.28% (437 loans) and California at 10.05% (427 loans). The state leadership isn't a rounding error &mdash; Texas consistently beats California year-over-year in this category, and the +52% YoY growth rate compounds the lead.</p>
        <p>The Texas insurance agency SBA lead has several plausible drivers. First, <strong>Texas has a larger independent-agency market share</strong> than many states &mdash; fewer captive-only markets (GEICO, State Farm direct) and more independent agencies representing multiple carriers. Independent agencies are the SBA-acquisition-ready profile. Second, <strong>Texas population and business growth</strong> drives insurance demand across personal lines (auto, home) and commercial lines (small business, contractor) that supports agency revenue at scale. Third, <strong>the state&rsquo;s insurance regulatory environment is relatively friendly</strong> with straightforward licensing under the Texas Department of Insurance and no state income tax affecting agent personal financial modeling.</p>
        <h3>Insurance agency SBA is fundamentally an acquisition play</h3>
        <p>Unlike most SBA categories where acquisitions and expansions split the use cases, insurance agency SBA is <strong>heavily weighted toward book-of-business acquisitions</strong>. When a producer or agency owner wants to retire, sell a book, or exit, a buyer acquiring that book of business via SBA 7(a) is the dominant structure. This is distinct from financing new agency formation (harder to underwrite without a book) or operational working capital (rarely the primary use).</p>
        <p>What lenders underwrite on these files:</p>
        <ul>
            <li><strong>Book retention risk.</strong> Insurance books lose roughly 10-20% of policies in year 1 post-acquisition as clients re-shop during the transition. Specialist lenders model retention curves explicitly into DSCR projections rather than assuming full revenue persistence. Files submitted with flat-revenue assumptions get restructured or repriced.</li>
            <li><strong>Commission split and revenue quality.</strong> Books heavy in renewal commissions (recurring) underwrite better than books heavy in new-business commissions (one-time). Specialist lenders break down revenue by carrier, by line (personal vs commercial), and by commission type to assess durability.</li>
            <li><strong>Carrier appointments.</strong> The acquiring agency needs active appointments with the carriers represented in the acquired book. Lenders verify appointment transfers or contingent-agency agreements before closing; non-transferable appointments on a significant carrier block can kill a deal late-stage.</li>
            <li><strong>Non-compete and transition agreement.</strong> Seller&rsquo;s non-compete (2-5 years typical), defined transition support period, and clear client-communication plan all affect book-retention risk. Lenders review the purchase agreement for these terms.</li>
        </ul>
        <h3>Texas agency SBA deal size and performance</h3>
        <p>Average Texas insurance agency SBA loan is <strong>$579,000 vs. $478,000 nationally (+21%)</strong>. Median is $331,000 vs. $225,000 nationally (+47%). The larger Texas deal sizes reflect the scale of independent agency books available for acquisition in DFW and Houston in particular.</p>
        <p>Charge-off rate is <strong>1.07% (0.79&times; SBA cross-industry average)</strong>, modestly better than the national insurance agency rate of 1.06% and materially better than the SBA cross-industry baseline. Texas agency SBA performs cleanly because the book-of-business acquisition structure is well-understood by specialist lenders and the recurring-commission revenue underwrites predictably once retention risk is modeled correctly.</p>
        <h3>Metro distribution</h3>
        <p>Houston and DFW carry the highest absolute volume of Texas insurance agency SBA. Austin and San Antonio add meaningful secondary volume. The interesting pattern: Texas insurance agency SBA has a broader geographic distribution than many industries &mdash; rural and mid-market Texas (Lubbock, Amarillo, Tyler, Corpus Christi) all carry meaningful volume because independent agencies are embedded across the state&rsquo;s geography rather than concentrated only in major metros.</p>
    `,

    lenderCalloutHtml: `
        <p>Texas insurance agency SBA lending has the clearest specialist-lender dominance of any state-industry combination we track in the insurance category: <strong>Live Oak Banking Company holds 89 Texas insurance agency loans &mdash; 19% of all Texas insurance agency SBA volume by count and $82.4 million in approved capital</strong>. Live Oak is the national insurance-agency SBA specialist; their Texas volume reflects that focus applied to the largest state market. Average Live Oak Texas agency loan is $926,000, meaningfully above the Texas average and consistent with their focus on larger book acquisitions.</p>
        <p>Small-deal specialist platforms hold the #2&ndash;5 positions: U.S. Bank (27 loans), United Midwest Savings (22, an SBA-only platform heavy in smaller-deal agency files), Readycap (21), and BayFirst National Bank (18). <strong>Comerica Bank (16 loans) is the only traditional Texas-connected bank in the top 10</strong> &mdash; Comerica has a Dallas footprint and runs agency SBA programs from that base. Northeast Bank (14), Newtek Bank (14), Byline Bank (13), and Pathward (10) round out the list. <strong>For a Texas insurance agency acquisition, Live Oak is the default first call &mdash; they concentrate book-of-business acquisition expertise at a level no other lender approaches</strong>; United Midwest and BayFirst handle smaller-book files well; Comerica is worth direct approach on deals with an existing Dallas banking relationship.</p>
    `,

    cityLinks: [
        { name: 'Houston', href: '/business-loans/houston-tx' },
        { name: 'Dallas', href: '/business-loans/dallas-tx' },
        { name: 'Fort Worth', href: '/business-loans/fort-worth-tx' },
        { name: 'Austin', href: '/business-loans/austin-tx' },
        { name: 'San Antonio', href: '/business-loans/san-antonio-tx' },
        { name: 'El Paso', href: '/business-loans/el-paso-tx' },
        { name: 'Plano', href: '/business-loans/plano-tx' },
    ],

    quiz: {
        questions: [
            {q:"What's your Texas insurance agency situation?",opts:[
                {v:"acquisition",l:"Acquiring an existing TX agency / book"},
                {v:"partial-book",l:"Acquiring a partial book from a retiring producer"},
                {v:"new-agency",l:"Starting a new agency"},
                {v:"expansion",l:"Adding a location to an existing TX agency"},
            ]},
            {q:"Book revenue profile?",opts:[
                {v:"personal-lines",l:"Primarily personal lines (auto, home)"},
                {v:"commercial-lines",l:"Primarily commercial lines"},
                {v:"mixed",l:"Mixed personal + commercial"},
                {v:"specialty",l:"Specialty / niche lines"},
            ]},
            {q:"Loan amount needed?",opts:[
                {v:"under-250k",l:"Under $250K"},
                {v:"250k-500k",l:"$250K - $500K"},
                {v:"500k-1m",l:"$500K - $1M"},
                {v:"1m-plus",l:"$1M+"},
            ]},
            {q:"Producer / operator experience?",opts:[
                {v:"experienced",l:"5+ years as a producer or agency operator"},
                {v:"mid",l:"2-5 years"},
                {v:"new",l:"New to insurance / first agency"},
            ]},
        ],
        profiles: {
            A: {
                badge: "Strong TX agency acquisition",
                headline: "You're in the #1 insurance-agency SBA state",
                body: "An experienced Texas producer or agency operator acquiring an established agency or book is exactly the file Live Oak Banking underwrites at scale in Texas. Live Oak holds 19% of Texas insurance-agency SBA by count and concentrates book-of-business acquisition expertise at a level no other lender approaches in this category. Average deal size $579K. Expect 60-90 days to close. Plan for explicit book-retention modeling in projections -- generalist banks often miss the 10-20% year-1 attrition and structure files without adequate working capital.",
                ctaLabel: "Match with Texas insurance agency SBA lenders",
                utmContent: "profile-a-tx-insurance-acquisition",
            },
            B: {
                badge: "Smaller book / partial acquisition",
                headline: "Small-deal specialist platforms fit this file",
                body: "Partial book acquisitions from a retiring producer and agencies under $500K benefit from small-deal specialist platforms. United Midwest Savings (22 TX agency loans), BayFirst (18), and Newtek Bank (14) handle these files routinely with SBA 7(a) Small Loan (up to $500K, streamlined process, 45-75 day close). Smaller-book files still require book-retention modeling and carrier-appointment verification, but the underwriting process is faster than Standard 7(a).",
                ctaLabel: "Match with small-deal TX agency SBA lenders",
                utmContent: "profile-b-tx-insurance-small",
            },
            C: {
                badge: "New agency / limited experience",
                headline: "New-agency files face the hardest underwriting",
                body: "Starting a new Texas insurance agency from scratch (no book to acquire) is the hardest insurance SBA file. Lenders typically want documented producer history, active carrier appointments, a detailed business plan with realistic customer acquisition cost assumptions, and meaningfully higher equity injection. Most specialist SBA lenders will push for a partial-book-acquisition structure instead. Have this conversation upfront with a specialist rather than getting declined mid-underwriting.",
                ctaLabel: "Get honest feedback from a TX insurance SBA specialist",
                utmContent: "profile-c-tx-insurance-new",
            },
        },
        scoringBody: `
            function score(a) {
                var sit=a[0], book=a[1], amount=a[2], exp=a[3];
                if (sit==='new-agency' || exp==='new') return 'C';
                if (sit==='partial-book' || amount==='under-250k' || amount==='250k-500k') return 'B';
                return 'A';
            }
        `,
    },

    faqs: [
        {q:"Why is Texas the #1 state for insurance agency SBA lending?",a:"Texas leads all states on insurance agency SBA volume at 11.04% national share (469 loans FY2020-2025), ahead of Florida at 10.28% and California at 10.05%. It's the only industry category in our cluster where Texas beats California on volume. Three likely drivers: larger independent-agency market share than many states (fewer captive-only markets), Texas population and business growth driving insurance demand, and a relatively friendly state insurance regulatory environment with straightforward Texas Department of Insurance licensing and no state income tax affecting personal financial modeling."},
        {q:"What's the typical SBA insurance agency loan size in Texas?",a:"Average Texas insurance agency SBA loan is approximately $579,000 — 21% above the national insurance agency average of $478,000. Median is $331,000 vs. $225,000 nationally (+47%). The larger Texas deal sizes reflect the scale of independent agency books available for acquisition in DFW and Houston particularly."},
        {q:"What's the primary use case for insurance agency SBA loans?",a:"Book-of-business acquisitions. Unlike most SBA categories where acquisitions and expansions split the use cases, insurance agency SBA is heavily weighted toward acquiring an existing producer's or agency's book of business. When a producer or agency owner wants to retire, sell, or exit, a buyer financing that book acquisition via SBA 7(a) is the dominant structure. New agency formation and operational working capital are rarely the primary use."},
        {q:"What do lenders underwrite on Texas insurance agency acquisition files?",a:"Four factors receive explicit underwriting: book retention risk (10-20% year-1 attrition is typical, modeled into DSCR), commission split and revenue quality (renewal-heavy books underwrite better than new-business-heavy), carrier appointment transferability (the acquiring agency needs active appointments with the carriers represented in the acquired book), and the non-compete / transition agreement structure with the seller. Files submitted with flat-revenue assumptions routinely get restructured or repriced."},
        {q:"Which SBA lenders are most active in Texas insurance agency lending?",a:"Live Oak Banking Company dominates with 89 Texas insurance agency loans — 19% of Texas insurance agency SBA volume by count, $82.4 million in approved capital, and a $926K average loan size. Live Oak is the national insurance-agency SBA specialist. U.S. Bank (27 loans) holds #2 with a more generalist-branch profile. Small-deal specialist platforms hold positions 3-5: United Midwest Savings (22), Readycap (21), BayFirst (18). Comerica Bank (16) is the only traditional Texas-connected bank in the top 10, with a Dallas-based agency SBA program."},
        {q:"How does Texas insurance agency SBA performance compare to national?",a:"Texas insurance agency SBA charges off at 1.07% — a 0.79× ratio against the SBA cross-industry average of 1.36%, and modestly better than the national insurance agency rate of 1.06%. The favorable performance reflects a book-of-business acquisition structure that specialist lenders understand well and recurring-commission revenue that underwrites predictably once retention risk is modeled correctly."},
        {q:"How long does an SBA loan take to close for a Texas insurance agency acquisition?",a:"60-90 days is typical for a Texas insurance agency acquisition with a specialist lender (Live Oak, U.S. Bank). Smaller book acquisitions under $500K via SBA 7(a) Small Loan typically run 45-75 days given the streamlined process. The main variables affecting timeline: carrier appointment verification (some carriers are slower than others on appointment transfers), non-compete and transition agreement negotiation with the seller, and book retention modeling in projections. Specialist lenders handle these as standard practice; generalist banks routinely extend timelines."},
    ],
},

// ═══════════════════════════════════════════════════════════════════════
// PHASE 2 EXPANSION — 20 additional state × industry pages
// DataForSEO-validated (industry signal ≥ 50 gate applied).
// Honesty framing applied where charge-off ratio > 1.0 vs SBA cross-industry average.
// ═══════════════════════════════════════════════════════════════════════

'722511_NY': {
    naicsCode: '722511', state: 'NY', industryParentSlug: 'restaurants',
    industryLabel: 'restaurants', industryLabelCap: 'Restaurants', industryLabelCapSingular: 'Restaurant',
    stateSlug: 'new-york', stateName: 'New York', campaignSlug: 'sba-restaurants-new-york-quiz',
    heroPhoto: { src: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Restaurant interior with modern dining room, representative of New York restaurants that use SBA financing', width: 1200, height: 800, photographer: 'Life Of Pix', photographerUrl: 'https://www.pexels.com/@life-of-pix/', sourceUrl: 'https://www.pexels.com/photo/1267320/', sourceName: 'Pexels' },
    communityBankNames: ['NewBank'],
    title: 'SBA Loans for Restaurants in New York 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for New York restaurants. 1,057 NY restaurant SBA loans FY2020-2025 ($433M). Charge-off runs 1.25x SBA average; NYC cost drivers explained. Match with NY-experienced lenders.',
    heroSub: 'New York is the third-largest restaurant SBA market in the US &mdash; 1,057 loans FY2020-2025 and $433M in approved capital. Deal sizes run smaller than California or Texas, and charge-off performance runs 1.25&times; the SBA cross-industry average -- driven by NYC-specific rent, labor, and regulatory costs the page walks through in detail.',
    serviceDescription: 'My Money Marketplace helps New York restaurant operators compare SBA 7(a) and 504 options and get matched with lenders experienced in NY restaurant underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',
    marketContextHtml: `
        <p>New York is the third-largest state for restaurant SBA lending behind California and Texas, with <strong>1,057 loans approved FY2020-2025 (6.5% national share) totaling $433 million</strong>. Deal sizes run notably smaller than other top states: <strong>$410,000 average vs. $528,000 nationally (-22%)</strong>, with a $150,000 median. The smaller deal profile reflects NYC's dense small-independent-operator base and a tilt toward buildout and equipment files rather than large-scale acquisitions.</p>
        <p>Growth is running at +10.2% YoY, roughly in line with the national restaurant SBA rate of +8.7%.</p>
        <h3>Metro distribution: NYC dominates, with meaningful upstate volume</h3>
        <p>NYC (all five boroughs), Long Island, and Westchester carry the bulk of NY restaurant SBA volume. Upstate markets (Buffalo, Rochester, Syracuse, Albany) add meaningful secondary volume — smaller deal sizes but faster close timelines than NYC files.</p>
        <h3>Honest framing: charge-off runs 1.25&times; SBA average</h3>
        <p>NY restaurant SBA charges off at <strong>1.70% -- 1.25&times; the SBA cross-industry average of 1.36% and materially above the national restaurant rate of 1.21%</strong>. The elevated rate reflects genuine NY-specific cost pressures rather than lender mispricing:</p>
        <ul>
            <li><strong>NYC commercial rent</strong> pushes rent-to-sales meaningfully above the 6-10% national benchmark, compressing margins on marginal files.</li>
            <li><strong>NY State labor cost structure</strong> ($16/hr NYC/Long Island/Westchester minimum wage in 2024, $15/hr rest of state, tiered wage-parity requirements) drives labor as a percentage of revenue above national baselines.</li>
            <li><strong>NY LLC publication requirement</strong> adds $1-2K + 6-10 weeks on newly-formed operating entities, affecting close timelines on acquisition deals.</li>
            <li><strong>SLA (State Liquor Authority) transfer timing</strong> on acquisition files where liquor licenses are material can extend timelines 60-120 days.</li>
        </ul>
        <p>NY restaurant SBA files with strong unit economics, experienced operators, and clean lease/labor documentation still underwrite favorably. The elevated aggregate rate is a state-level average, not a per-file verdict.</p>
    `,
    lenderCalloutHtml: `
        <p>New York restaurant SBA lending has a distinctive top-of-list pattern: <strong>Manufacturers and Traders Trust Company (M&T Bank) leads with 170 loans</strong> at a very small average size ($95K) -- SBA 7(a) Small Loan volume dominating a book of buildout, equipment, and working-capital files. TD Bank (99 loans, $160K avg) holds #2 with a similar small-loan focus. KeyBank (63 loans, $132K avg) rounds out the small-loan-specialist top three.</p>
        <p><strong>NewBank (55 loans, $796K avg)</strong> is the notable outlier — a Korean-American community bank concentrated in NYC's Korean-restaurant network, running the largest average deal size of any top-5 lender. Northeast Bank (53 loans, $162K avg) rounds out the top five. Takeaway: NY has strong lender coverage across the small-loan and larger-deal tiers, but the mix skews small-loan-heavy compared to CA/TX.</p>
    `,
    cityLinks: [
        { name: 'New York', href: '/business-loans/new-york-ny' },
        { name: 'Buffalo', href: '/business-loans/buffalo-ny' },
        { name: 'Rochester', href: '/business-loans/rochester-ny' },
        { name: 'Yonkers', href: '/business-loans/yonkers-ny' },
        { name: 'Syracuse', href: '/business-loans/syracuse-ny' },
    ],
    quiz: {
        questions: [
            {q:"What's your New York restaurant situation?",opts:[{v:"acquisition",l:"Acquiring an existing NY restaurant"},{v:"new-independent",l:"Opening a new independent concept"},{v:"franchise",l:"Franchise concept (NY location)"},{v:"expansion",l:"Expansion or additional NY location"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"buildout",l:"Buildout / tenant improvements"},{v:"equipment",l:"Kitchen or FOH equipment"},{v:"working-capital",l:"Working capital"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Loan amount needed?",opts:[{v:"under-250k",l:"Under $250K"},{v:"250k-500k",l:"$250K - $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-plus",l:"$1M+"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-plus",l:"720+"}]},
        ],
        profiles: {
            A: { badge: "NY small-loan specialist file", headline: "M&T, TD, KeyBank -- NY's small-loan specialist trio", body: "New York's dominant restaurant SBA lenders (M&T, TD, KeyBank) specialize in sub-$500K deals -- buildout, equipment, and working-capital files closed in 45-75 days via SBA 7(a) Small Loan. NY deal sizes run smaller than CA or TX, and this trio has the process dialed in. Standard 10% equity injection.", ctaLabel: "Match with NY restaurant SBA lenders", utmContent: "profile-a-ny-small" },
            B: { badge: "Larger NY acquisition or buildout", headline: "Match to a lender comfortable with NY cost baselines", body: "NY restaurant deals above $500K face the state's genuinely elevated cost baseline (rent, labor, compliance). Lenders like NewBank (Korean-American operator network, $796K average deal size), Northeast Bank, and Newtek handle larger NY files at scale. Files with strong unit economics and lease documentation underwrite around the aggregate 1.70% charge-off rate, but generalist lenders unfamiliar with NY market context sometimes miss cost modeling.", ctaLabel: "Match with NY-experienced SBA lenders", utmContent: "profile-b-ny-larger" },
            C: { badge: "Franchise path", headline: "Franchise route -- see the franchise-specific guide", body: "NY franchise restaurant SBA files underwrite differently from independents and benefit from brand-level shortcuts if the concept is in the SBA Franchise Directory. NY franchise volume is meaningful in suburban Long Island, Westchester, and upstate metros. See our SBA franchise loan guide for full treatment.", ctaLabel: "See SBA franchise details", utmContent: "profile-c-ny-franchise", ctaUrl: "/sba-loans/franchise/" },
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],amount=a[2],credit=a[3];if(sit==='franchise')return 'C';if(amount==='500k-1m'||amount==='1m-plus')return 'B';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a restaurant in New York?",a:"Yes. New York is the third-largest single-state restaurant SBA market -- 1,057 loans approved FY2020-2025 representing 6.5% of national restaurant SBA volume. Deal sizes skew smaller than CA/TX (average $410K vs. $528K nationally), and the top NY lenders specialize in the sub-$500K SBA 7(a) Small Loan process."},
        {q:"Why does New York restaurant SBA charge off above the average?",a:"NY restaurant SBA charges off at 1.70% -- 1.25x the SBA cross-industry average and above the national restaurant rate of 1.21%. Three drivers: NYC commercial rent compressing margins, NY state labor cost structure (higher minimum wage, wage-parity requirements), and NY-specific regulatory friction (LLC publication requirement, SLA license transfer timing). Individual files with strong unit economics still underwrite favorably; the aggregate reflects a state-level average across a broad borrower mix."},
        {q:"Which SBA lenders are most active in New York restaurant lending?",a:"M&T Bank leads with 170 loans (~$95K average -- small-loan specialist), TD Bank second at 99 loans, KeyBank third at 63. NewBank (55 loans, $796K avg) is the notable Korean-American community bank in the NYC market with much larger typical deal size. Northeast Bank rounds out the top five."},
        {q:"What NY-specific issues affect SBA restaurant underwriting?",a:"Four factors: rent-to-sales ratios (NYC market rents materially above the 6-10% national benchmark), NY state labor costs ($16/hr NYC/LI/Westchester, $15/hr rest of state, tiered wage-parity requirements), LLC formation timing (NY publication requirement adds 6-10 weeks + $1-2K on newly-formed operating entities), and SLA liquor license transfer timing on acquisition files (60-120 days depending on license class and county)."},
        {q:"How long does an SBA loan take to close for a NY restaurant?",a:"45-75 days is typical for smaller SBA 7(a) Small Loan files with M&T, TD, or KeyBank. Larger deals ($500K+) with NewBank (Korean-American community bank, $796K average deal size), Northeast Bank, or Newtek typically run 60-90 days. Files involving SLA liquor license transfers add 60-120 days to the licensing side (not lender-side). Generalist banks unfamiliar with NY-specific timing routinely extend timelines further."},
    ],
},

'722511_IL': {
    naicsCode: '722511', state: 'IL', industryParentSlug: 'restaurants',
    industryLabel: 'restaurants', industryLabelCap: 'Restaurants', industryLabelCapSingular: 'Restaurant',
    stateSlug: 'illinois', stateName: 'Illinois', campaignSlug: 'sba-restaurants-illinois-quiz',
    heroPhoto: { src: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Restaurant interior with modern dining room, representative of Illinois restaurants that use SBA financing', width: 1200, height: 800, photographer: 'Life Of Pix', photographerUrl: 'https://www.pexels.com/@life-of-pix/', sourceUrl: 'https://www.pexels.com/photo/1267320/', sourceName: 'Pexels' },
    communityBankNames: [],
    title: 'SBA Loans for Restaurants in Illinois 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for Illinois restaurants. 696 IL restaurant SBA loans FY2020-2025 ($387M), +32.8% YoY growth. Charge-off 1.59x SBA average; Chicago cost drivers explained. Match with IL-experienced lenders.',
    heroSub: 'Illinois restaurant SBA volume is up <strong>+32.8% year-over-year</strong> -- one of the strongest growth rates in the top-tier states. Deal sizes average $556K, above the national restaurant baseline. But charge-off performance runs meaningfully above SBA average, reflecting Chicago-specific cost structure. Honest framing on both.',
    serviceDescription: 'My Money Marketplace helps Illinois restaurant operators compare SBA 7(a) and 504 options and get matched with lenders experienced in Illinois restaurant underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',
    marketContextHtml: `
        <p>Illinois is the sixth-largest state for restaurant SBA lending. <strong>696 loans FY2020-2025 (4.3% national share), $387M in approved capital, and growing at +32.8% YoY</strong>. Deal sizes run above national at $556K average, reflecting Chicago's higher urban cost baseline plus the increasing share of full-service concept acquisitions.</p>
        <h3>Metro distribution: Chicago dominates, secondary markets add real volume</h3>
        <p>Chicago and the surrounding six-county metro carry most of IL restaurant SBA volume. Secondary markets (Rockford, Peoria, Springfield, Naperville, Aurora) add meaningful volume with smaller typical deal sizes and faster close timelines.</p>
        <h3>Honest framing: charge-off runs 1.59&times; SBA average</h3>
        <p>Illinois restaurant SBA charges off at <strong>2.16% -- 1.59&times; the SBA cross-industry average of 1.36% and meaningfully above the national restaurant rate of 1.21%</strong>. Illinois has one of the higher restaurant SBA charge-off rates among top states. Drivers:</p>
        <ul>
            <li><strong>Chicago commercial rent</strong> pushes rent-to-sales high across neighborhoods with strong dining density, compressing margins on marginal concepts.</li>
            <li><strong>Illinois state labor costs</strong> ($15/hr minimum wage phased in for Chicago employers of 21+, statewide $15 by 2025) drive labor as a percentage of revenue above national baselines.</li>
            <li><strong>Chicago and Cook County business taxes</strong> (personal property replacement tax, Cook County head tax historically, Chicago-specific alcohol taxes) create meaningful cost overhead vs. lower-tax neighboring states.</li>
            <li><strong>Alcohol licensing complexity in Chicago</strong> extends acquisition timelines when liquor licenses are material.</li>
        </ul>
        <p>Illinois restaurant files with strong unit economics and disciplined operators still underwrite favorably. The elevated aggregate reflects state-level averaging, not a per-file verdict -- but specialist lenders factor Illinois cost structure into projections rather than applying national baselines.</p>
    `,
    lenderCalloutHtml: `
        <p>Illinois restaurant SBA lending is <strong>dominated by a single lender</strong>: The Huntington National Bank with 209 loans -- roughly 5&times; the next-largest lender -- reflecting Huntington's national restaurant SBA specialty leadership applied at scale to Illinois. Byline Bank (43 loans) is the notable Chicago-headquartered player with dedicated Chicago restaurant SBA relationships. Northeast Bank (34), U.S. Bank (33), and Newtek Bank (32) round out the top five.</p>
        <p>Fifth Third Bank (15), Village Bank and Trust (15), FWBank (14), Harvest Small Business Finance (14), and First Mid Bank & Trust (12) round out the top ten. For Illinois restaurant buyers: Huntington is the default first call given their overwhelming volume and Illinois cost-modeling experience; Byline fits Chicago-metro relationship-driven files; specialist SBA platforms handle the smaller-deal tier well.</p>
    `,
    cityLinks: [
        { name: 'Chicago', href: '/business-loans/chicago-il' },
        { name: 'Aurora', href: '/business-loans/aurora-il' },
        { name: 'Naperville', href: '/business-loans/naperville-il' },
        { name: 'Rockford', href: '/business-loans/rockford-il' },
        { name: 'Springfield', href: '/business-loans/springfield-il' },
        { name: 'Peoria', href: '/business-loans/peoria-il' },
    ],
    quiz: {
        questions: [
            {q:"What's your Illinois restaurant situation?",opts:[{v:"acquisition",l:"Acquiring an existing IL restaurant"},{v:"new-independent",l:"Opening a new independent concept"},{v:"franchise",l:"Franchise concept (IL location)"},{v:"expansion",l:"Expansion or additional IL location"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"buildout",l:"Buildout / tenant improvements"},{v:"equipment",l:"Kitchen or FOH equipment"},{v:"working-capital",l:"Working capital"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Loan amount needed?",opts:[{v:"under-500k",l:"Under $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-3m",l:"$1M - $3M"},{v:"3m-plus",l:"$3M+"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-plus",l:"720+"}]},
        ],
        profiles: {
            A: { badge: "Strong IL acquisition candidate", headline: "You're in the IL restaurant SBA specialist sweet spot", body: "Acquiring an established Illinois restaurant with strong credit is a standard specialist-SBA-lender file. Huntington, Byline (Chicago-HQ'd), Chase, and Readycap all carry meaningful IL restaurant volume. Match to a lender that models Illinois cost structure explicitly rather than applying national baselines. Plan 60-90 days to close.", ctaLabel: "Match with Illinois restaurant SBA lenders", utmContent: "profile-a-il-acquisition" },
            B: { badge: "IL buildout or expansion", headline: "SBA 7(a) with an IL-experienced lender", body: "Illinois buildout costs, labor structure, and licensing timelines affect underwriting -- specialist lenders build Illinois baselines into pro formas. Byline Bank is particularly strong on Chicago-metro relationships; Huntington and Readycap handle the SBA-specialist process at scale statewide.", ctaLabel: "Match with IL-restaurant-experienced SBA lenders", utmContent: "profile-b-il-buildout" },
            C: { badge: "Franchise path", headline: "Franchise route -- see the franchise-specific guide", body: "Illinois franchise restaurant SBA files underwrite differently from independents and benefit from brand-level shortcuts if the concept is in the SBA Franchise Directory. Suburban IL and non-Chicago metros carry meaningful franchise volume. See our SBA franchise loan guide for full treatment.", ctaLabel: "See SBA franchise details", utmContent: "profile-c-il-franchise", ctaUrl: "/sba-loans/franchise/" },
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],amount=a[2],credit=a[3];if(sit==='franchise')return 'C';if(use==='buildout'||use==='multiple'||sit==='expansion')return 'B';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a restaurant in Illinois?",a:"Yes. Illinois is the sixth-largest single-state restaurant SBA market -- 696 loans FY2020-2025 representing 4.3% of national restaurant SBA volume, growing at +32.8% year-over-year. SBA 7(a) covers acquisitions, buildouts, equipment, and working capital. Average IL restaurant SBA loan is approximately $556K."},
        {q:"Why does Illinois restaurant SBA charge off above the average?",a:"IL restaurant SBA charges off at 2.16% -- 1.59x the SBA cross-industry average and meaningfully above the national restaurant rate of 1.21%. Drivers: Chicago commercial rent pressure, Illinois labor cost structure ($15/hr minimum wage), Cook County and Chicago-specific business taxes, and alcohol licensing complexity on acquisition files. Individual files with strong unit economics still underwrite favorably -- the aggregate reflects state-level averaging."},
        {q:"Which SBA lenders are most active in Illinois restaurant lending?",a:"The Huntington National Bank dominates with 209 IL restaurant loans -- roughly 5x the next-largest lender. Byline Bank (Chicago-headquartered) holds #2 at 43 loans. Northeast Bank (34), U.S. Bank (33), and Newtek Bank (32) round out the top five. Fifth Third, Village Bank and Trust, FWBank, Harvest Small Business Finance, and First Mid Bank & Trust fill positions 6-10."},
        {q:"How does Chicago's cost structure affect SBA restaurant underwriting?",a:"Three factors: rent-to-sales ratios in dense Chicago neighborhoods running well above the 6-10% national benchmark; labor costs including $15/hr minimum wage and Chicago-specific fair-workweek scheduling rules; and Cook County / Chicago tax overhead (personal property replacement tax, Chicago liquor tax on gross alcohol sales) that compress margins. Specialist IL lenders model these explicitly; generalist banks unfamiliar with Chicago market context sometimes over-project margins."},
        {q:"How long does an SBA loan take to close for an Illinois restaurant?",a:"60-90 days is typical for a Standard 7(a) acquisition or buildout with a Preferred Lender experienced in Illinois. Files including Chicago liquor license transfers can add 45-90 days depending on license type and Alderman review requirements in the ward. Byline Bank tends to close Chicago-metro deals on schedule given local relationships; generalist banks unfamiliar with Illinois timing routinely extend timelines."},
    ],
},

'722511_GA': {
    naicsCode: '722511', state: 'GA', industryParentSlug: 'restaurants',
    industryLabel: 'restaurants', industryLabelCap: 'Restaurants', industryLabelCapSingular: 'Restaurant',
    stateSlug: 'georgia', stateName: 'Georgia', campaignSlug: 'sba-restaurants-georgia-quiz',
    heroPhoto: { src: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Restaurant interior with modern dining room, representative of Georgia restaurants that use SBA financing', width: 1200, height: 800, photographer: 'Life Of Pix', photographerUrl: 'https://www.pexels.com/@life-of-pix/', sourceUrl: 'https://www.pexels.com/photo/1267320/', sourceName: 'Pexels' },
    communityBankNames: [],
    title: 'SBA Loans for Restaurants in Georgia 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for Georgia restaurants. 612 GA restaurant SBA loans FY2020-2025 ($452M), 0.84x SBA charge-off average. $738K avg deal size -- Atlanta-metro-heavy market.',
    heroSub: 'Georgia is the eighth-largest state for restaurant SBA lending, with a distinctive profile: <strong>average deal sizes of $738K</strong> (well above the $528K national average) and charge-off performance meaningfully <strong>below</strong> SBA average. Atlanta-metro concentration drives both.',
    serviceDescription: 'My Money Marketplace helps Georgia restaurant operators compare SBA 7(a) and 504 options and get matched with lenders experienced in Georgia restaurant underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',
    marketContextHtml: `
        <p>Georgia restaurant SBA lending shows an unusual profile among the top-tier states: <strong>612 loans FY2020-2025 (3.7% national share) at $738K average deal size -- 40% above the national restaurant baseline of $528K</strong>. The larger typical deal size reflects Atlanta-metro concentration on full-service concepts, higher-ticket acquisitions, and a share of real-estate-combined deals in metro Atlanta commercial corridors.</p>
        <p>Growth has softened -6.9% YoY from the FY2020-2024 base, but the underlying performance profile is strong.</p>
        <h3>Metro distribution: Atlanta dominates, secondary markets scale down cleanly</h3>
        <p>Atlanta and the surrounding metro carry roughly 70% of Georgia restaurant SBA volume. Savannah, Augusta, Columbus, Macon, and Athens add meaningful secondary volume with smaller typical deal sizes and shorter close timelines.</p>
        <h3>Charge-off runs 0.84&times; SBA average -- a clean-performance market</h3>
        <p>Georgia restaurant SBA charges off at <strong>1.14% -- 0.84&times; the SBA cross-industry average of 1.36% and slightly below the national restaurant rate of 1.21%</strong>. Drivers of favorable performance: Georgia's business-friendly regulatory environment (federal minimum wage applies, no state overtime beyond FLSA), lower commercial rent than higher-cost states outside downtown Atlanta, and a borrower mix skewing toward experienced operators on larger-ticket deals.</p>
        <h3>Georgia regulatory context</h3>
        <ul>
            <li><strong>Federal minimum wage applies</strong> statewide ($7.25/hr, tipped wage $2.13 minimum plus tips). Labor as a percentage of revenue runs meaningfully below Northeast and West Coast baselines.</li>
            <li><strong>Alcohol licensing at the local level</strong> (city or county) -- Atlanta license transfers are relatively fast (30-60 days) versus other major markets.</li>
            <li><strong>Georgia state corporate income tax</strong> at 5.75% on C-corp income; personal income tax on pass-throughs runs 1-5.75%. Reasonable operator personal cash flow modeling.</li>
            <li><strong>Commercial rent</strong> in downtown Atlanta and highly-desirable neighborhoods (Buckhead, Midtown) reaches high-cost-market levels; suburban Atlanta and secondary metros run substantially cheaper.</li>
        </ul>
    `,
    lenderCalloutHtml: `
        <p>Georgia's restaurant SBA lender mix has a distinctive Korean-American community bank presence. <strong>Metro City Bank leads with 31 loans</strong> -- a notable Atlanta-area Korean-American community bank pattern. Readycap Lending (27), Bank of Hope (26 -- Korean-American), Cadence Bank (25 -- Dallas-headquartered with strong SE coverage), and The Huntington National Bank (25) round out the top five. Two Korean-American community banks in the top three reflects the Korean-American restaurant operator network in metro Atlanta.</p>
        <p>Newtek Bank (22), SouthState Bank (21), Renasant Bank (21), Pinnacle Bank (17), and PromiseOne Bank (16) round out the top ten. For Georgia restaurant buyers: Metro City Bank and Bank of Hope for Korean-American operator files, Cadence Bank for larger deals with Southeastern relationships, and Huntington plus Newtek for national-specialist SBA platform process.</p>
    `,
    cityLinks: [
        { name: 'Atlanta', href: '/business-loans/atlanta-ga' },
        { name: 'Savannah', href: '/business-loans/savannah-ga' },
        { name: 'Columbus', href: '/business-loans/columbus-ga' },
        { name: 'Macon', href: '/business-loans/macon-ga' },
    ],
    quiz: {
        questions: [
            {q:"What's your Georgia restaurant situation?",opts:[{v:"acquisition",l:"Acquiring an existing GA restaurant"},{v:"new-independent",l:"Opening a new independent concept"},{v:"franchise",l:"Franchise concept (GA location)"},{v:"expansion",l:"Expansion or additional GA location"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"real-estate",l:"Real estate purchase"},{v:"buildout",l:"Buildout / tenant improvements"},{v:"equipment",l:"Kitchen or FOH equipment"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Loan amount needed?",opts:[{v:"under-500k",l:"Under $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-3m",l:"$1M - $3M"},{v:"3m-plus",l:"$3M+"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-plus",l:"720+"}]},
        ],
        profiles: {
            A: { badge: "Strong GA acquisition candidate", headline: "You're in the Georgia restaurant SBA sweet spot", body: "Georgia restaurant SBA has clean performance economics (1.14% charge-off, well below SBA average) and strong lender coverage. Acquiring an established GA restaurant with meaningful equity fits Huntington, Newtek, Live Oak, and Readycap's underwriting sweet spot. Atlanta metro deals run larger on average; secondary-metro files close faster. Plan 60-90 days.", ctaLabel: "Match with Georgia restaurant SBA lenders", utmContent: "profile-a-ga-acquisition" },
            B: { badge: "GA real estate + operating business", headline: "504 for the real estate, 7(a) for the business", body: "When the Georgia restaurant deal includes buying the building, SBA 504 handles the real estate portion at fixed long-term rates while 7(a) covers the operating business. Combined structure typical on larger Atlanta-metro deals and often more attractive than conventional financing on both pieces. Plan 75-120 days for combined closings.", ctaLabel: "Match with 504 + 7(a) GA restaurant lenders", utmContent: "profile-b-ga-real-estate" },
            C: { badge: "Franchise path", headline: "Franchise route -- see the franchise-specific guide", body: "Georgia franchise restaurant SBA files underwrite differently from independents. Atlanta suburbs and secondary-metro Georgia markets carry meaningful franchise volume. Brand-level shortcuts apply if the concept is in the SBA Franchise Directory. See our SBA franchise loan guide.", ctaLabel: "See SBA franchise details", utmContent: "profile-c-ga-franchise", ctaUrl: "/sba-loans/franchise/" },
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],amount=a[2],credit=a[3];if(sit==='franchise')return 'C';if(use==='real-estate')return 'B';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a restaurant in Georgia?",a:"Yes. Georgia is the eighth-largest single-state restaurant SBA market -- 612 loans FY2020-2025 representing 3.7% of national restaurant SBA volume. Deal sizes average $738K (well above the $528K national baseline), reflecting Atlanta-metro concentration on full-service and real-estate-combined concepts. Standard SBA 7(a) minimum 10% equity injection applies."},
        {q:"Why does Georgia restaurant SBA charge off below the average?",a:"GA restaurant SBA charges off at 1.14% -- 0.84x the SBA cross-industry average and slightly below the national restaurant rate of 1.21%. Drivers: Georgia's business-friendly regulatory environment (federal minimum wage applies, no state overtime beyond FLSA), lower commercial rent than high-cost states outside downtown Atlanta, and a borrower mix skewing toward experienced operators on larger-ticket deals."},
        {q:"Which SBA lenders are most active in Georgia restaurant lending?",a:"Metro City Bank leads with 31 GA restaurant loans -- a notable Atlanta-area Korean-American community bank. Readycap Lending (27), Bank of Hope (26), Cadence Bank (25), and The Huntington National Bank (25) round out the top five. Newtek Bank (22), SouthState Bank (21), Renasant Bank (21), Pinnacle Bank (17), and PromiseOne Bank (16) fill positions 6-10."},
        {q:"How does Atlanta commercial real estate affect SBA restaurant deals?",a:"Downtown Atlanta and highly-desirable neighborhoods (Buckhead, Midtown, Virginia-Highland) reach high-cost-market rent levels that push rent-to-sales toward the top of the 6-10% national benchmark. Suburban Atlanta and secondary Georgia metros run substantially cheaper, giving operators more margin room. SBA 504 real-estate-combined structures are relatively common on larger Atlanta-metro deals as operators pursue building ownership."},
        {q:"How long does an SBA loan take to close for a Georgia restaurant?",a:"60-90 days is typical for a standard SBA 7(a) acquisition or buildout with a Preferred Lender. Deals including commercial real estate via SBA 504 plus 7(a) companion typically run 75-120 days. Atlanta local-level liquor license transfers add 30-60 days; secondary Georgia markets often faster. Preferred Lenders experienced in Georgia close on schedule."},
    ],
},

'722511_NJ': {
    naicsCode: '722511', state: 'NJ', industryParentSlug: 'restaurants',
    industryLabel: 'restaurants', industryLabelCap: 'Restaurants', industryLabelCapSingular: 'Restaurant',
    stateSlug: 'new-jersey', stateName: 'New Jersey', campaignSlug: 'sba-restaurants-new-jersey-quiz',
    heroPhoto: { src: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Restaurant interior with modern dining room, representative of New Jersey restaurants that use SBA financing', width: 1200, height: 800, photographer: 'Life Of Pix', photographerUrl: 'https://www.pexels.com/@life-of-pix/', sourceUrl: 'https://www.pexels.com/photo/1267320/', sourceName: 'Pexels' },
    communityBankNames: [],
    title: 'SBA Loans for Restaurants in New Jersey 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for New Jersey restaurants. 602 NJ restaurant SBA loans FY2020-2025 ($410M), $681K avg deal size, 0.74x SBA charge-off average. NY-metro-adjacent market with clean performance.',
    heroSub: 'New Jersey is the ninth-largest state for restaurant SBA lending, with a distinctive profile: <strong>average deal sizes of $681K</strong> (well above national baseline) and charge-off performance <strong>meaningfully below</strong> SBA average. NY-metro-adjacent market with cleaner performance than NY itself.',
    serviceDescription: 'My Money Marketplace helps New Jersey restaurant operators compare SBA 7(a) and 504 options and get matched with lenders experienced in NJ restaurant underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',
    marketContextHtml: `
        <p>New Jersey restaurant SBA lending shows an unusually favorable profile among Northeast states: <strong>602 loans FY2020-2025 (3.7% national share), $410M in approved capital, and growing +19% YoY</strong>. Average deal size runs $681K, 29% above the national restaurant baseline of $528K, reflecting NJ's mix of NYC-suburb restaurants, Jersey Shore full-service concepts, and Philadelphia-metro South Jersey markets.</p>
        <h3>Metro distribution: NYC-metro, Jersey Shore, and Philadelphia-metro all contribute</h3>
        <p>Northern NJ (NYC-metro adjacent counties: Bergen, Essex, Hudson, Passaic) carries the largest share of NJ restaurant SBA volume, followed by Central NJ (Middlesex, Monmouth, Ocean) with meaningful Jersey Shore restaurant activity. Southern NJ (Camden, Burlington, Gloucester) rounds out the picture with Philadelphia-metro-adjacent operations.</p>
        <h3>Charge-off runs 0.74&times; SBA average -- clean performance</h3>
        <p>NJ restaurant SBA charges off at <strong>1.00% -- 0.74&times; the SBA cross-industry average of 1.36% and materially below the national restaurant rate of 1.21%</strong>. This is meaningfully cleaner than neighboring NY (1.70%). Drivers: NJ's more affordable-than-NYC cost structure combined with the same regional demand base, mature operator pool with intergenerational restaurant ownership patterns, and a Jersey Shore seasonal-tourism revenue stream that smooths overall portfolio performance.</p>
        <h3>New Jersey regulatory context</h3>
        <ul>
            <li><strong>NJ minimum wage</strong> at $15.13/hr (2024) drives labor above federal baseline but below NY/CA levels. Tipped wage $5.62 (up from $2.13 federal).</li>
            <li><strong>Alcohol licensing</strong> handled at the municipal level -- transfer timing 30-90 days depending on town, often faster than NYC.</li>
            <li><strong>NJ state corporate business tax</strong> at 9% (highest bracket) on C-corp income; pass-through owners pay NJ personal income tax up to 10.75% at high brackets. Meaningful state tax overhead.</li>
            <li><strong>Commercial rent</strong> in NYC-metro-adjacent counties runs substantially below NYC itself, giving restaurants meaningful margin room; Jersey Shore rents seasonal with peak summer premiums.</li>
        </ul>
    `,
    lenderCalloutHtml: `
        <p>New Jersey's restaurant SBA lender mix is distinctive: <strong>TD Bank leads with 75 loans</strong> (2&times; the next-largest), reflecting TD's dense Northeast branch footprint. Manufacturers and Traders Trust Company (M&T, 36 loans) holds #2. Wilmington Savings Fund Society (WSFS, 30 loans) and Northeast Bank (29) round out positions 3-4. Brookline Bank (28) rounds out the top five.</p>
        <p>Two Korean-American community banks appear in the top ten: <strong>NewBank (23 loans) and New Millennium Bank (20 loans)</strong>, reflecting the Korean-American restaurant operator network across northern NJ (Bergen County, Palisades Park corridor). Fulton Bank (27, PA-headquartered with NJ coverage), PNC (22), and Unity Bank (19, NJ-headquartered) round out the top ten. For NJ restaurant buyers: TD Bank handles the largest small-loan volume; NewBank and New Millennium fit Korean-American operator files; NJ regionals fit relationship-driven files.</p>
    `,
    cityLinks: [
        { name: 'Newark', href: '/business-loans/newark-nj' },
        { name: 'Jersey City', href: '/business-loans/jersey-city-nj' },
        { name: 'Paterson', href: '/business-loans/paterson-nj' },
        { name: 'Trenton', href: '/business-loans/trenton-nj' },
    ],
    quiz: {
        questions: [
            {q:"What's your New Jersey restaurant situation?",opts:[{v:"acquisition",l:"Acquiring an existing NJ restaurant"},{v:"new-independent",l:"Opening a new independent concept"},{v:"franchise",l:"Franchise concept (NJ location)"},{v:"expansion",l:"Expansion or additional NJ location"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"buildout",l:"Buildout / tenant improvements"},{v:"equipment",l:"Kitchen or FOH equipment"},{v:"working-capital",l:"Working capital"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Loan amount needed?",opts:[{v:"under-500k",l:"Under $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-3m",l:"$1M - $3M"},{v:"3m-plus",l:"$3M+"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-plus",l:"720+"}]},
        ],
        profiles: {
            A: { badge: "Strong NJ acquisition candidate", headline: "You're in the NJ restaurant SBA specialist sweet spot", body: "New Jersey restaurant SBA has clean performance economics (1.00% charge-off, well below SBA average) and strong specialist-platform coverage. M&T Bank, TD Bank, Northeast Bank, Huntington, and Readycap all carry meaningful NJ restaurant volume. Deal sizes run above national baselines. Plan 60-90 days to close.", ctaLabel: "Match with New Jersey restaurant SBA lenders", utmContent: "profile-a-nj-acquisition" },
            B: { badge: "Larger NJ deal or NJ regional relationship", headline: "Columbia Bank or Cross River for relationship-driven files", body: "Larger NJ restaurant SBA files ($1M+) or files with existing NJ regional banking relationships benefit from Columbia Bank or Cross River Bank -- both NJ-headquartered with restaurant SBA programs. National specialists (Huntington, Newtek, Readycap) still work well; the NJ regionals add local underwriting knowledge and often close on schedule.", ctaLabel: "Match with NJ-restaurant-experienced SBA lenders", utmContent: "profile-b-nj-larger" },
            C: { badge: "Franchise path", headline: "Franchise route -- see the franchise-specific guide", body: "NJ franchise restaurant SBA volume is meaningful across Northern, Central, and Southern NJ suburbs. Brand-level shortcuts apply if the concept is in the SBA Franchise Directory. See our SBA franchise loan guide for full treatment.", ctaLabel: "See SBA franchise details", utmContent: "profile-c-nj-franchise", ctaUrl: "/sba-loans/franchise/" },
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],amount=a[2],credit=a[3];if(sit==='franchise')return 'C';if(amount==='1m-3m'||amount==='3m-plus')return 'B';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a restaurant in New Jersey?",a:"Yes. New Jersey is the ninth-largest single-state restaurant SBA market -- 602 loans FY2020-2025 representing 3.7% of national restaurant SBA volume. Deal sizes average $681K (29% above national baseline). Standard SBA 7(a) minimum 10% equity injection applies. NJ's charge-off performance is meaningfully cleaner than neighboring NY."},
        {q:"Why does New Jersey restaurant SBA charge off below the average?",a:"NJ restaurant SBA charges off at 1.00% -- 0.74x the SBA cross-industry average and materially below the national restaurant rate of 1.21%. This is significantly cleaner than neighboring NY (1.70%). Drivers: more affordable-than-NYC cost structure combined with NY-metro demand, mature operator pool with intergenerational ownership, and Jersey Shore seasonal-tourism revenue that smooths portfolio performance."},
        {q:"Which SBA lenders are most active in New Jersey restaurant lending?",a:"TD Bank leads with 75 NJ restaurant loans -- 2x the next-largest. M&T (36) holds #2, WSFS (30) #3, Northeast Bank (29) #4, Brookline Bank (28) #5. Two Korean-American community banks appear meaningfully: NewBank (23) and New Millennium Bank (20). Fulton Bank (27), PNC (22), and Unity Bank (19, NJ-headquartered) round out the top ten."},
        {q:"What NJ-specific factors affect SBA restaurant underwriting?",a:"Three factors: NJ state corporate business tax at 9% (highest bracket) plus NJ personal income tax up to 10.75% on pass-through owners, requiring careful post-close cash flow modeling; NJ minimum wage at $15.13/hr; and municipal-level alcohol licensing where transfer timing varies widely by town (30-90 days). Commercial rent runs meaningfully below NYC in adjacent NJ counties, giving NJ files meaningful margin room."},
        {q:"How does the Jersey Shore seasonality affect SBA restaurant underwriting?",a:"Jersey Shore restaurants (Ocean, Monmouth, Cape May counties) run peak-summer revenue concentrations similar to Florida coastal patterns. Lenders model shoulder-season working-capital needs explicitly on shore files. Files that budget for the off-season gap underwrite cleanly; files assuming flat annual revenue face restructuring."},
    ],
},

'621210_TX': {
    naicsCode: '621210', state: 'TX', industryParentSlug: 'dentists',
    industryLabel: 'dental practices', industryLabelCap: 'Dental Practices', industryLabelCapSingular: 'Dental Practice',
    stateSlug: 'texas', stateName: 'Texas', campaignSlug: 'sba-dentists-texas-quiz',
    heroPhoto: { src: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Modern dental operatory with chair and imaging equipment, representative of Texas dental practices financed through SBA 7(a) loans', width: 1200, height: 800, photographer: 'Daniel Frank', photographerUrl: 'https://www.pexels.com/@fr3nks/', sourceUrl: 'https://www.pexels.com/photo/3845810/', sourceName: 'Pexels' },
    communityBankNames: ['Live Oak Banking Company'],
    title: 'SBA Loans for Dental Practices in Texas 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for Texas dental practices. 399 TX dental SBA loans approved FY2020-2025 ($413M), $1.04M avg loan, ZERO charge-offs across the entire portfolio.',
    heroSub: 'Texas dental practice SBA lending has one of the strongest performance profiles in the entire SBA dataset: <strong>zero charge-offs across 399 loans FY2020-2025</strong>, $1.04 million average loan size, and +16% YoY growth. Second-largest state for dental SBA behind California.',
    serviceDescription: 'My Money Marketplace helps Texas dentists and dental-practice buyers compare SBA 7(a) and 504 options and get matched with specialist lenders experienced in Texas dental practice acquisition underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',
    marketContextHtml: `
        <p>Texas dental practice SBA lending is the second-largest single-state dental market behind California, with a distinctive performance profile: <strong>399 loans approved FY2020-2025 representing 9.8% of national dental SBA volume, $413 million in total approved capital, and zero charge-offs</strong>. Average deal size is approximately $1.04 million, roughly in line with California's $1.05M and reflecting the acquisition-heavy nature of dental SBA lending.</p>
        <h3>Why Texas dental SBA performs so well</h3>
        <p>The zero-charge-off performance reflects three structural drivers: dental practice acquisitions (with verified revenue history) are the dominant use case, recurring insurance-backed revenue creates predictable cash flow, and licensed-professional operators with standardized income verification provide operator-side underwriting certainty. Texas amplifies each: population growth expanding patient base, no state income tax improving operator personal financial modeling, and business-friendly regulatory environment.</p>
        <h3>Metro distribution: DFW, Houston, Austin, San Antonio dominate</h3>
        <p>The same four major metros driving Texas SBA volume in other industries drive dental: Dallas-Fort Worth, Houston, Austin, and San Antonio. Austin punches above its population weight driven by tech-employment-fueled patient base growth. Secondary markets (El Paso, Corpus Christi, Rio Grande Valley, Lubbock) add meaningful volume with smaller typical deal sizes.</p>
        <h3>Texas regulatory context for dental practice SBA</h3>
        <ul>
            <li><strong>Texas State Board of Dental Examiners</strong> handles licensing statewide; license transfers on acquisition files are relatively fast. Only licensed Texas dentists (or professional dental corporations owned by licensed dentists) can own and operate Texas dental practices.</li>
            <li><strong>No state income tax</strong> improves personal financial modeling on operator-guarantors -- personal cash flow available to support the loan looks stronger than equivalent income in a high-tax state.</li>
            <li><strong>Texas Franchise Tax</strong> applies above $2.47M revenue at 0.375% (retail/wholesale) or 0.75% (most other industries) on taxable margin. Below threshold, no franchise tax due. Most dental practices under the threshold.</li>
            <li><strong>Commercial real estate</strong> for medical-corridor dental offices runs meaningfully below California; DFW and Houston medical-district rent is real but manageable.</li>
        </ul>
    `,
    lenderCalloutHtml: `
        <p>Texas dental SBA lending is led by <strong>Live Oak Banking Company</strong>, the national dental-practice SBA specialist: <strong>Live Oak carries 48 Texas dental loans</strong> -- 12% of state volume by count -- reflecting Live Oak's national leadership applied to the second-largest state dental market. United Community Bank (35 loans, GA-headquartered with strong dental practice-lending relationships) holds #2, and The Huntington National Bank (34) rounds out the specialist top three.</p>
        <p>BayFirst National Bank (18) and Newtek Bank (17) hold #4-5 as small-business-specialist platforms. Wells Fargo (16), PNC Bank (16), Bank of America (13), and United Midwest Savings (13) provide major-bank and specialist-platform coverage in positions 6-9. Zions Bank rounds out the top ten. For a Texas dental practice buyer, Live Oak is the default specialist first call given their national dental focus; United Community Bank is a strong alternative particularly on files with existing SE-region banking relationships.</p>
    `,
    cityLinks: [
        { name: 'Houston', href: '/business-loans/houston-tx' },
        { name: 'Dallas', href: '/business-loans/dallas-tx' },
        { name: 'Austin', href: '/business-loans/austin-tx' },
        { name: 'San Antonio', href: '/business-loans/san-antonio-tx' },
        { name: 'Fort Worth', href: '/business-loans/fort-worth-tx' },
        { name: 'Plano', href: '/business-loans/plano-tx' },
        { name: 'Arlington', href: '/business-loans/arlington-tx' },
    ],
    quiz: {
        questions: [
            {q:"What's your Texas dental situation?",opts:[{v:"acquisition",l:"Acquiring an existing TX practice"},{v:"startup",l:"Starting a new practice"},{v:"real-estate",l:"Buying the practice building"},{v:"expansion",l:"Expansion or additional location"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"real-estate-use",l:"Real estate purchase"},{v:"equipment",l:"Equipment / technology upgrade"},{v:"buildout",l:"Buildout / tenant improvements"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Loan amount needed?",opts:[{v:"under-500k",l:"Under $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-3m",l:"$1M - $3M"},{v:"3m-plus",l:"$3M+"}]},
            {q:"Years since dental school graduation?",opts:[{v:"0-2",l:"0-2 years"},{v:"3-5",l:"3-5 years"},{v:"6-plus",l:"6+ years"}]},
        ],
        profiles: {
            A: { badge: "Classic TX dental acquisition", headline: "Zero-charge-off market, strong lender coverage", body: "Texas dental SBA has zero charge-offs across the entire FY2020-2025 portfolio -- one of the cleanest markets in the SBA dataset. Live Oak Banking dominates as the national dental-specialty leader (89 TX loans, $1.79M average). U.S. Bank and Wells Fargo add strong major-bank alternatives. Plan 60-90 days to close.", ctaLabel: "Match with Texas dental SBA lenders", utmContent: "profile-a-tx-dental-acquisition" },
            B: { badge: "Real estate + practice", headline: "SBA 504 for the building, 7(a) for the practice", body: "Texas dental deals including the office real estate benefit from SBA 504's fixed long-term rates on the real-estate portion. 7(a) companion covers the practice purchase, equipment, and working capital. Combined structure typical on larger TX deals. Plan 75-120 days to close.", ctaLabel: "Match with 504 + 7(a) TX dental lenders", utmContent: "profile-b-tx-dental-real-estate" },
            C: { badge: "Startup / recent grad path", headline: "Startup files require more operator-profile support", body: "Texas dental startup files (new practice, 0-2 years post-graduation) require more underwriting detail than established-practice acquisitions. Lenders want associate experience at an existing practice, a detailed patient acquisition plan, and typically higher equity injection. Specialist dental lenders (Live Oak, U.S. Bank) handle these files.", ctaLabel: "Match with TX dental startup SBA lenders", utmContent: "profile-c-tx-dental-startup" },
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],amount=a[2],exp=a[3];if(sit==='real-estate'||use==='real-estate-use')return 'B';if(sit==='startup'||exp==='0-2')return 'C';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a dental practice in Texas?",a:"Yes. Texas is the second-largest single-state dental SBA market -- 399 loans FY2020-2025 representing 9.8% of national dental SBA volume and $413 million in total approved capital. Standard SBA 7(a) minimum 10% equity injection applies. Texas dental SBA has zero charge-offs across the entire portfolio -- one of the cleanest performance profiles in the SBA dataset."},
        {q:"Why does Texas dental SBA perform so well?",a:"National dental SBA charges off at 0.27% -- the lowest of any SBA industry category. Texas dental goes further with zero charge-offs across all 399 loans. Three structural drivers: dental practice acquisitions (verified revenue history, not speculative startups) dominate use cases, insurance-backed recurring revenue creates predictable cash flow, and licensed-professional operators provide underwriting certainty. Texas adds population growth expanding patient base and no state income tax improving operator financial modeling."},
        {q:"What's the typical SBA dental loan size in Texas?",a:"Average Texas dental SBA loan is approximately $1.04 million, roughly in line with California's $1.05M. Deal sizes reflect the acquisition-heavy nature of dental SBA lending and the prevalence of practice-plus-real-estate combined structures in Texas medical-corridor commercial real estate."},
        {q:"Which SBA lenders are most active in Texas dental lending?",a:"Live Oak Banking Company leads with 48 Texas dental loans -- 12% of state volume by count -- reflecting Live Oak's national dental-practice SBA specialty. United Community Bank (35) holds #2, The Huntington National Bank (34) #3. BayFirst National Bank (18) and Newtek Bank (17) round out the top five. Wells Fargo (16), PNC (16), Bank of America (13), United Midwest Savings (13), and Zions Bank (9) fill positions 6-10."},
        {q:"Who can own a dental practice in Texas?",a:"Under Texas dental licensing law, only licensed Texas dentists (or professional dental corporations owned by licensed dentists) can own and operate Texas dental practices. Non-dentist operators and non-professional-corp ownership structures don't underwrite cleanly. Specialist Texas dental lenders confirm licensing and corporate-entity structure upfront."},
        {q:"How long does an SBA loan take to close for a Texas dental practice?",a:"60-90 days is typical for a Texas dental practice acquisition with Live Oak or another specialist dental lender. Deals including commercial real estate via SBA 504 plus a 7(a) companion typically run 75-120 days. Startup practice files (recent grad, 0-2 years post-graduation) typically run 75-100 days given the extra operator-profile underwriting."},
    ],
},

'621210_FL': {
    naicsCode: '621210', state: 'FL', industryParentSlug: 'dentists',
    industryLabel: 'dental practices', industryLabelCap: 'Dental Practices', industryLabelCapSingular: 'Dental Practice',
    stateSlug: 'florida', stateName: 'Florida', campaignSlug: 'sba-dentists-florida-quiz',
    heroPhoto: { src: 'https://images.pexels.com/photos/3845810/pexels-photo-3845810.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Modern dental operatory with chair and imaging equipment, representative of Florida dental practices financed through SBA 7(a) loans', width: 1200, height: 800, photographer: 'Daniel Frank', photographerUrl: 'https://www.pexels.com/@fr3nks/', sourceUrl: 'https://www.pexels.com/photo/3845810/', sourceName: 'Pexels' },
    communityBankNames: ['BayFirst National Bank'],
    title: 'SBA Loans for Dental Practices in Florida 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for Florida dental practices. 304 FL dental SBA loans approved FY2020-2025 ($288M), $949K avg deal size, 0.33% charge-off (0.24x SBA avg). Third-largest state for dental SBA.',
    heroSub: 'Florida is the <strong>third-largest single-state dental SBA market</strong> behind California and Texas. 304 loans approved FY2020-2025 representing 7.5% of national dental SBA volume, $949K average deal size, and <strong>0.33% charge-off &mdash; 0.24&times; the SBA cross-industry average</strong>. Volume has softened -6.3% YoY but the underwriting performance is squarely in the clean-market tier.',
    serviceDescription: 'My Money Marketplace helps Florida dentists and dental-practice buyers compare SBA 7(a) and 504 options and get matched with specialist lenders experienced in Florida dental practice acquisition underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',
    marketContextHtml: `
        <p>Florida is the third-largest state for dental practice SBA lending, with a distinctive profile: <strong>304 loans FY2020-2025 (7.47% national share), $288.5 million in total approved capital, and $949K average deal size</strong>. Deal sizes run 4% above the national dental average of $910K, and median loan is $637,500 vs. $509,800 nationally (+25%). The larger-than-national deal sizes reflect a mix of Miami/Fort Lauderdale metro practice acquisitions, Orlando and Tampa growth-corridor deals, and a share of practice-plus-real-estate combined structures.</p>
        <h3>Metro distribution: Miami, Orlando, Tampa, and Jacksonville</h3>
        <p>Four Florida metros carry the bulk of dental SBA volume: <strong>Miami / Fort Lauderdale, Orlando, Tampa Bay, and Jacksonville</strong>. Miami-metro tends toward larger acquisition and real-estate-combined deals. Orlando and Tampa run active mid-market volume. Jacksonville and secondary metros (Naples, Sarasota, West Palm Beach) add meaningful volume with somewhat smaller typical deal sizes.</p>
        <h3>Charge-off runs 0.24&times; SBA average &mdash; clean-market performance</h3>
        <p>Florida dental SBA charges off at <strong>0.33% &mdash; a 0.24&times; ratio versus the SBA cross-industry average of 1.36%</strong>. That's modestly above the national dental average of 0.27% but still in the top tier of any industry-state combination in the SBA dataset. The structural drivers that make dental SBA clean at the national level (acquisitions with verified revenue, insurance-backed recurring cash flow, licensed-professional operator base) apply cleanly in Florida.</p>
        <h3>Florida regulatory context for dental SBA underwriting</h3>
        <ul>
            <li><strong>Licensed-ownership requirement.</strong> Under Florida Statutes Chapter 466, only Florida-licensed dentists (or professional service corporations owned by licensed dentists) can own and operate dental practices in Florida. Specialist dental SBA lenders confirm licensing and corporate-entity structure upfront.</li>
            <li><strong>Florida Board of Dentistry oversight.</strong> License history, disciplinary actions, and corporate entity registration are reviewed on acquisition files. Clean license history underwrites cleanly; files with open disciplinary matters extend diligence.</li>
            <li><strong>No state income tax.</strong> Florida's absence of state income tax improves personal financial modeling on operator-guarantors -- personal cash flow available to support the loan looks stronger than equivalent income in a high-tax state.</li>
            <li><strong>Commercial property insurance trajectory.</strong> Florida commercial property insurance has seen double-digit annual premium increases in several recent years. Dental practices in high-exposure coastal zones or older buildings face insurance costs meaningfully above national baselines. Specialist Florida lenders model insurance as a growing cost line on multi-year projections.</li>
            <li><strong>Hurricane exposure on real-estate-combined deals.</strong> When the deal includes owning the practice building via SBA 504, coastal Florida hurricane risk factors into the 504-lender's real-estate underwriting explicitly (building-code compliance year, wind-mitigation features, business-interruption coverage adequacy).</li>
        </ul>
    `,
    lenderCalloutHtml: `
        <p>Florida dental SBA lending has a distinctive lender mix. <strong>Live Oak Banking Company leads</strong> with 43 Florida dental loans, reflecting Live Oak's national dental-practice SBA specialty applied to the third-largest state market. Bank of America (40 loans) sits closely behind at #2 -- an unusual major-bank presence in dental SBA driven by BofA's existing-customer practice acquisition volume in Florida metros. The Huntington National Bank (31 loans) rounds out the top three.</p>
        <p>TD Bank (25 loans) carries the northeast-tourist snowbird thread that appears across Florida SBA categories. United Community Bank (20 loans, GA-headquartered with strong SE dental practice-lending relationships) holds #5. BayFirst National Bank (11 loans, Florida-headquartered) and Wells Fargo (11 loans) share #6. Northeast Bank (10), Newtek Bank (8), and Fifth Third Bank (8) round out the top ten. For a Florida dental practice buyer, Live Oak is the default specialist first call given their national dental focus; Bank of America is a strong existing-relationship alternative; United Community Bank fits Southeast-connected files well.</p>
    `,
    cityLinks: [
        { name: 'Miami', href: '/business-loans/miami-fl' },
        { name: 'Tampa', href: '/business-loans/tampa-fl' },
        { name: 'Jacksonville', href: '/business-loans/jacksonville-fl' },
        { name: 'Orlando', href: '/business-loans/orlando-fl' },
        { name: 'Fort Lauderdale', href: '/business-loans/fort-lauderdale-fl' },
        { name: 'St. Petersburg', href: '/business-loans/st-petersburg-fl' },
    ],
    quiz: {
        questions: [
            {q:"What's your Florida dental situation?",opts:[{v:"acquisition",l:"Acquiring an existing FL practice"},{v:"startup",l:"Starting a new practice"},{v:"real-estate",l:"Buying the practice building"},{v:"expansion",l:"Expansion or additional location"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"real-estate-use",l:"Real estate purchase"},{v:"equipment",l:"Equipment / technology upgrade"},{v:"buildout",l:"Buildout / tenant improvements"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Loan amount needed?",opts:[{v:"under-500k",l:"Under $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-3m",l:"$1M - $3M"},{v:"3m-plus",l:"$3M+"}]},
            {q:"Years since dental school graduation?",opts:[{v:"0-2",l:"0-2 years"},{v:"3-5",l:"3-5 years"},{v:"6-plus",l:"6+ years"}]},
        ],
        profiles: {
            A: { badge: "Classic FL dental acquisition", headline: "Third-largest dental SBA market, clean performance", body: "Florida dental SBA has 0.33% charge-off (0.24x SBA avg) and strong specialist lender coverage. Acquiring an established Florida practice with meaningful equity fits Live Oak Banking's national dental focus, Bank of America's existing-customer volume, and Huntington's SBA-specialist platform. Miami-metro deals run larger on average; secondary-metro files close faster. Plan 60-90 days.", ctaLabel: "Match with Florida dental SBA lenders", utmContent: "profile-a-fl-dental-acquisition" },
            B: { badge: "Real estate + practice", headline: "SBA 504 for the building, 7(a) for the practice", body: "Florida dental deals including the office real estate benefit from SBA 504's fixed long-term rates on the real-estate portion, with a 7(a) companion for the practice purchase. Coastal Florida real-estate-combined deals get explicit hurricane and property-insurance underwriting from specialist 504 lenders. Plan 75-120 days for combined closings.", ctaLabel: "Match with 504 + 7(a) FL dental lenders", utmContent: "profile-b-fl-dental-real-estate" },
            C: { badge: "Startup / recent grad path", headline: "Startup files require more operator-profile support", body: "Florida dental startup files (new practice, 0-2 years post-graduation) require more underwriting detail than acquisitions. Lenders want associate experience at an existing practice, a detailed patient acquisition plan, and typically higher equity injection. Specialist dental lenders (Live Oak, U.S. Bank) handle these files; generalist banks routinely decline.", ctaLabel: "Match with FL dental startup SBA lenders", utmContent: "profile-c-fl-dental-startup" },
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],amount=a[2],exp=a[3];if(sit==='real-estate'||use==='real-estate-use')return 'B';if(sit==='startup'||exp==='0-2')return 'C';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a dental practice in Florida?",a:"Yes. Florida is the third-largest single-state dental SBA market -- 304 loans FY2020-2025 representing 7.5% of national dental SBA volume and $288 million in total approved capital. Standard SBA 7(a) minimum 10% equity injection applies. Florida dental SBA charges off at 0.33% (0.24x the SBA cross-industry average) -- clean-market performance."},
        {q:"How does Florida dental SBA perform vs. national?",a:"Florida dental SBA charges off at 0.33% -- a 0.24x ratio to the SBA cross-industry average of 1.36%. That's modestly above the national dental average of 0.27% but still in the top tier of any industry-state combination in the dataset. Dental as a category has the lowest charge-off rate of any SBA industry, and Florida participates in that structural cleanness."},
        {q:"What's the typical SBA dental loan size in Florida?",a:"Average Florida dental SBA loan is approximately $949,000 -- 4% above the national dental average of $910K. Median is $637,500 vs. $509,800 nationally (+25%). Deal sizes reflect Miami and Fort Lauderdale metro practice acquisitions, Orlando and Tampa growth-corridor deals, and the share of practice-plus-real-estate combined structures in Florida commercial real estate."},
        {q:"Which SBA lenders are most active in Florida dental lending?",a:"Live Oak Banking Company leads with 43 Florida dental loans, reflecting Live Oak's national dental-practice SBA specialty. Bank of America (40) sits closely behind at #2 -- unusually strong major-bank presence in dental SBA driven by existing-customer practice acquisition volume. The Huntington National Bank (31) rounds out the top three. TD Bank (25), United Community Bank (20), BayFirst National Bank (11), Wells Fargo (11), Northeast Bank (10), Newtek Bank (8), and Fifth Third Bank (8) fill positions 4-10."},
        {q:"Who can own a dental practice in Florida?",a:"Under Florida Statutes Chapter 466, only Florida-licensed dentists (or professional service corporations owned by licensed dentists) can own and operate dental practices in Florida. Non-dentist operators and non-professional-corp ownership structures don't underwrite cleanly. Specialist Florida dental SBA lenders confirm licensing and corporate-entity structure upfront."},
        {q:"How does Florida property insurance affect dental SBA underwriting?",a:"Florida commercial property insurance has seen double-digit annual premium increases in several recent years, and some carriers have exited the market. Specialist Florida dental lenders model insurance as a growing cost line on multi-year projections rather than assuming flat costs. Practices in coastal high-exposure zones or older buildings face insurance costs meaningfully above national baselines. Real-estate-combined 504 deals get explicit hurricane and wind-mitigation underwriting."},
        {q:"How long does an SBA loan take to close for a Florida dental practice?",a:"60-90 days is typical for a Florida dental practice acquisition with Live Oak or another specialist dental lender. Deals including commercial real estate via SBA 504 plus a 7(a) companion typically run 75-120 days -- coastal Florida real-estate deals often longer given the added property-insurance and hurricane-exposure underwriting. Startup practice files typically run 75-100 days."},
    ],
},

'621111_CA': {
    naicsCode: '621111', state: 'CA', industryParentSlug: 'physicians',
    industryLabel: 'physician practices', industryLabelCap: 'Physician Practices', industryLabelCapSingular: 'Physician Practice',
    stateSlug: 'california', stateName: 'California', campaignSlug: 'sba-physicians-california-quiz',
    heroPhoto: { src: 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Physician examining a patient in a clinic setting, representative of California physician practices financed through SBA 7(a) loans', width: 1200, height: 800, photographer: 'Anna Shvets', photographerUrl: 'https://www.pexels.com/@shvetsa/', sourceUrl: 'https://www.pexels.com/photo/4173251/', sourceName: 'Pexels' },
    communityBankNames: [],
    title: 'SBA Loans for Physician Practices in California 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for California physician practices. 549 CA physician SBA loans approved FY2020-2025 ($471M), 14% of national volume, 0.36% charge-off (0.26x SBA avg). Largest state for physician SBA.',
    heroSub: 'California is the <strong>largest single-state market for physician-practice SBA lending</strong> -- 549 loans approved FY2020-2025 representing 13.8% of national physician SBA volume, $858K average deal size, and <strong>0.36% charge-off -- 0.26&times; the SBA cross-industry average</strong>. Volume is growing at +32.6% YoY, well above the national physician rate.',
    serviceDescription: 'My Money Marketplace helps California physicians and physician-practice buyers compare SBA 7(a) and 504 options and get matched with specialist lenders experienced in California physician practice acquisition underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',
    marketContextHtml: `
        <p>California is the largest state market for physician-practice SBA lending: <strong>549 loans FY2020-2025 (13.77% national share), $471 million in total approved capital, and $858K average deal size</strong>. Deal sizes run 43% above the national physician SBA baseline of $602K, with median loan at $500,000 vs. $300,000 nationally (+67%). The elevated deal sizes reflect California commercial real estate costs, the prevalence of multi-provider practice acquisitions, and a share of practice-plus-real-estate combined structures in California medical corridors.</p>
        <h3>Metro distribution</h3>
        <p>California physician SBA volume is distributed across <strong>Los Angeles / Orange County, San Diego, San Francisco Bay Area, Sacramento, and the Inland Empire</strong>. Bay Area and LA-OC carry the highest absolute volume; San Diego runs a higher share of practice-plus-real-estate combined deals. Sacramento has meaningful state-employee-adjacent practice volume driven by the region's insurer mix. Secondary markets (Fresno, Bakersfield, Central Coast) all have active specialist-lender coverage.</p>
        <h3>Charge-off runs 0.26&times; SBA average &mdash; top-tier performance</h3>
        <p>California physician SBA charges off at <strong>0.36% -- a 0.26&times; ratio versus the SBA cross-industry average of 1.36% and materially below the national physician SBA rate of 0.68%</strong>. Physician-practice SBA at the national level is the second-cleanest healthcare category behind dental; California participates in that cleanness while carrying the largest state volume. Drivers: physician-practice acquisitions dominate use cases (verified revenue history vs. speculative startups), insurance-backed recurring revenue creates predictable cash flow, and licensed-professional operators provide operator-side underwriting certainty.</p>
        <h3>California regulatory context for physician SBA underwriting</h3>
        <ul>
            <li><strong>Corporate Practice of Medicine doctrine.</strong> California is one of the stricter Corporate Practice of Medicine states -- only licensed California physicians (or professional medical corporations owned by licensed physicians) can own and operate physician practices. Specialist lenders confirm licensing and corporate-entity structure upfront; management service organization (MSO) arrangements have specific structural requirements that need to be underwritten explicitly.</li>
            <li><strong>Medical Board of California oversight.</strong> License history, disciplinary actions, and corporate entity registration are reviewed on acquisition files. Clean license history underwrites cleanly; open disciplinary matters extend diligence.</li>
            <li><strong>Payer mix modeling.</strong> California has a distinctive payer mix (Medi-Cal, Kaiser Permanente ecosystem, ACA marketplace plans, commercial insurance) that affects cash flow modeling. Specialist California lenders build California-specific payer-mix baselines into DSCR projections rather than applying national physician-practice benchmarks.</li>
            <li><strong>Labor cost structure.</strong> California medical assistants, RNs, front-office staff, and support providers are paid materially above national averages. Specialist lenders model California labor baselines explicitly.</li>
            <li><strong>Real estate vs. lease structure.</strong> California medical-corridor commercial real estate carries premium pricing. A meaningful share of California physician SBA deals include real estate via SBA 504 plus a 7(a) companion.</li>
        </ul>
    `,
    lenderCalloutHtml: `
        <p>California physician SBA lending is <strong>led by U.S. Bank</strong> with 69 California physician loans -- reflecting U.S. Bank's traditional strength in physician-practice acquisition lending applied to the largest state market. Wells Fargo (48 loans) holds #2 and JPMorgan Chase (39 loans) #3 -- an unusually strong major-bank presence in physician SBA driven by existing-customer practice acquisition volume across California metros. Newtek Bank (26 loans) leads the specialist SBA platform tier.</p>
        <p>Bank of America (24 loans) rounds out the top five. Readycap (19), Northeast Bank (16), BMO Bank (15), First-Citizens Bank &amp; Trust (15), and Enterprise Bank &amp; Trust (14) fill positions 6-10. The California physician SBA lender landscape is meaningfully more major-bank-heavy than most SBA industry categories, reflecting the historical banking relationships that established California physicians tend to have. For a California physician practice buyer: U.S. Bank is the strong default first call; Wells Fargo and Chase fit existing-relationship files well; Newtek and Readycap handle the specialist SBA platform process for buyers without pre-existing major-bank relationships.</p>
    `,
    cityLinks: [
        { name: 'Los Angeles', href: '/business-loans/los-angeles-ca' },
        { name: 'San Francisco', href: '/business-loans/san-francisco-ca' },
        { name: 'San Diego', href: '/business-loans/san-diego-ca' },
        { name: 'San Jose', href: '/business-loans/san-jose-ca' },
        { name: 'Sacramento', href: '/business-loans/sacramento-ca' },
        { name: 'Long Beach', href: '/business-loans/long-beach-ca' },
        { name: 'Oakland', href: '/business-loans/oakland-ca' },
    ],
    quiz: {
        questions: [
            {q:"What's your California physician practice situation?",opts:[{v:"acquisition",l:"Acquiring an existing CA practice"},{v:"startup",l:"Starting a new practice"},{v:"real-estate",l:"Buying the practice building"},{v:"expansion",l:"Expansion or additional location"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"real-estate-use",l:"Real estate purchase"},{v:"equipment",l:"Equipment / imaging technology"},{v:"buildout",l:"Buildout / tenant improvements"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Loan amount needed?",opts:[{v:"under-500k",l:"Under $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-3m",l:"$1M - $3M"},{v:"3m-plus",l:"$3M+"}]},
            {q:"Years in practice post-residency?",opts:[{v:"0-2",l:"0-2 years"},{v:"3-5",l:"3-5 years"},{v:"6-plus",l:"6+ years"}]},
        ],
        profiles: {
            A: { badge: "Classic CA physician acquisition", headline: "Largest state market, top-tier clean performance", body: "California physician SBA has 0.36% charge-off (0.26x SBA avg) and the largest state volume by far. Acquiring an established California physician practice with meaningful equity fits U.S. Bank's strong specialty lending, Wells Fargo and Chase's existing-customer volume, and Newtek's SBA-specialist platform. Bay Area and LA-OC deals run larger on average. Plan 60-90 days to close.", ctaLabel: "Match with California physician SBA lenders", utmContent: "profile-a-ca-physician-acquisition" },
            B: { badge: "Real estate + practice", headline: "SBA 504 for the building, 7(a) for the practice", body: "California physician deals including the medical-corridor real estate benefit from SBA 504's fixed long-term rates on the real-estate portion. 7(a) companion covers the practice purchase, imaging equipment, and working capital. Combined structure common on Bay Area and San Diego deals. Plan 75-120 days for combined closings.", ctaLabel: "Match with 504 + 7(a) CA physician lenders", utmContent: "profile-b-ca-physician-real-estate" },
            C: { badge: "New practice / early-career path", headline: "Early-career files need operator-profile support", body: "California physician practice startup or early-career files (0-2 years post-residency) require more underwriting detail than established-practice acquisitions. Lenders want associate experience at an existing practice, hospital-employed pattern documentation, patient acquisition plan, and typically higher equity injection. Specialist lenders (U.S. Bank, Newtek) handle these files.", ctaLabel: "Match with CA physician startup SBA lenders", utmContent: "profile-c-ca-physician-startup" },
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],amount=a[2],exp=a[3];if(sit==='real-estate'||use==='real-estate-use')return 'B';if(sit==='startup'||exp==='0-2')return 'C';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a physician practice in California?",a:"Yes. California is the largest single-state physician SBA market -- 549 loans FY2020-2025 representing 13.8% of national physician SBA volume and $471 million in total approved capital. Standard SBA 7(a) minimum 10% equity injection applies. California physician SBA charges off at 0.36% (0.26x the SBA cross-industry average) -- top-tier clean performance."},
        {q:"How does California physician SBA perform vs. national?",a:"California physician SBA charges off at 0.36% -- 0.26x the SBA cross-industry average of 1.36% and materially below the national physician SBA rate of 0.68%. Physician-practice SBA at the national level is the second-cleanest healthcare category behind dental; California participates in that cleanness while carrying the largest state volume. Drivers: practice acquisitions dominate use cases, insurance-backed recurring revenue, and licensed-professional operators."},
        {q:"What's the typical SBA physician loan size in California?",a:"Average California physician SBA loan is approximately $858,000 -- 43% above the national physician SBA average of $602K. Median is $500,000 vs. $300,000 nationally (+67%). The elevated deal sizes reflect California commercial real estate costs, multi-provider practice acquisitions, and a share of practice-plus-real-estate combined structures in California medical corridors."},
        {q:"Which SBA lenders are most active in California physician lending?",a:"U.S. Bank leads with 69 California physician loans, reflecting U.S. Bank's traditional strength in physician-practice acquisition lending. Wells Fargo (48) holds #2 and JPMorgan Chase (39) #3. Newtek Bank (26) leads the specialist SBA platform tier. Bank of America (24), Readycap (19), Northeast Bank (16), BMO Bank (15), First-Citizens Bank & Trust (15), and Enterprise Bank & Trust (14) round out positions 5-10. The California physician SBA lender landscape is meaningfully more major-bank-heavy than most SBA industry categories."},
        {q:"Who can own a physician practice in California?",a:"Under California's Corporate Practice of Medicine doctrine, only licensed California physicians (or professional medical corporations owned by licensed physicians) can own and operate physician practices. Non-physician operators and non-professional-corp structures don't underwrite cleanly. Management service organization (MSO) arrangements have specific structural requirements. Specialist California physician SBA lenders confirm licensing and corporate-entity structure upfront."},
        {q:"How does California's payer mix affect physician SBA underwriting?",a:"California's payer mix (Medi-Cal, Kaiser Permanente ecosystem, ACA marketplace plans, commercial insurance) affects practice cash flow modeling. Specialist California lenders build California-specific payer-mix baselines into DSCR projections rather than applying national physician-practice benchmarks. Practices with higher commercial payer mix underwrite differently than practices with higher Medi-Cal concentration; specialist lenders understand the difference."},
        {q:"How long does an SBA loan take to close for a California physician practice?",a:"60-90 days is typical for a California physician practice acquisition with U.S. Bank, Newtek, or another specialist lender. Deals including commercial real estate via SBA 504 plus a 7(a) companion typically run 75-120 days. Early-career physician files (0-2 years post-residency) typically run 75-100 days given the extra operator-profile underwriting. Corporate Practice of Medicine compliance verification adds process on non-standard entity structures."},
    ],
},

'621111_TX': {
    naicsCode: '621111', state: 'TX', industryParentSlug: 'physicians',
    industryLabel: 'physician practices', industryLabelCap: 'Physician Practices', industryLabelCapSingular: 'Physician Practice',
    stateSlug: 'texas', stateName: 'Texas', campaignSlug: 'sba-physicians-texas-quiz',
    heroPhoto: { src: 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Physician examining a patient in a clinic setting, representative of Texas physician practices financed through SBA 7(a) loans', width: 1200, height: 800, photographer: 'Anna Shvets', photographerUrl: 'https://www.pexels.com/@shvetsa/', sourceUrl: 'https://www.pexels.com/photo/4173251/', sourceName: 'Pexels' },
    communityBankNames: ['Frost Bank', 'Cadence Bank'],
    title: 'SBA Loans for Physician Practices in Texas 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for Texas physician practices. 444 TX physician SBA loans FY2020-2025 ($345M), 11% of national volume, $777K avg deal size. Growing +9.9% YoY. Second-largest state for physician SBA.',
    heroSub: 'Texas is the <strong>second-largest single-state market for physician-practice SBA lending</strong> -- 444 loans FY2020-2025 representing 11.1% of national volume, $777K average deal size, and +9.9% YoY growth. Charge-off performance runs modestly above the national physician rate but still at the SBA cross-industry average. Honest framing on both sides.',
    serviceDescription: 'My Money Marketplace helps Texas physicians and physician-practice buyers compare SBA 7(a) and 504 options and get matched with specialist lenders experienced in Texas physician practice acquisition underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',
    marketContextHtml: `
        <p>Texas is the second-largest state for physician-practice SBA lending: <strong>444 loans FY2020-2025 (11.14% national share), $345 million in total approved capital, and $777K average deal size</strong>. Deal sizes run 29% above the national physician SBA baseline of $602K, with median loan at $400,000 vs. $300,000 nationally (+33%). The elevated deal sizes reflect the scale of DFW, Houston, and Austin medical-corridor acquisitions and a tilt toward multi-provider practice files.</p>
        <h3>Metro distribution: DFW, Houston, Austin, San Antonio</h3>
        <p>Four major metros dominate Texas physician SBA volume: <strong>Dallas-Fort Worth, Houston, Austin, and San Antonio</strong>. Houston's Texas Medical Center anchors the largest medical-corridor practice concentration in the country; DFW carries strong specialty-practice volume; Austin has grown rapidly with tech-driven population growth expanding patient bases. San Antonio adds meaningful primary care and specialty volume, and secondary markets (El Paso, Corpus Christi, Rio Grande Valley, Lubbock) contribute smaller-ticket volume.</p>
        <h3>Honest framing: charge-off sits at 0.99&times; SBA average but 2&times; the national physician rate</h3>
        <p>Texas physician SBA charges off at <strong>1.35% -- a 0.99&times; ratio versus the SBA cross-industry average of 1.36%</strong>. That's right at the cross-industry SBA baseline, which is common for restaurant or retail files. For physician SBA it's meaningfully above the national physician rate of 0.68% -- roughly 2&times; the healthcare-category baseline. Drivers: Texas physician SBA carries a higher share of specialty and multi-provider files with more complex payer mixes, and the state's rapid population growth has drawn in some newer-market entries with less established referral patterns. Individual files with strong operator experience and clean payer mix still underwrite favorably; the state-level number reflects portfolio-mix effects rather than a per-file verdict.</p>
        <h3>Texas regulatory context for physician SBA underwriting</h3>
        <ul>
            <li><strong>Corporate Practice of Medicine doctrine.</strong> Texas prohibits non-physician ownership of physician practices. Only licensed Texas physicians (or professional associations owned by licensed physicians) can own and operate practices. Management service organization (MSO) arrangements have specific requirements. Specialist lenders confirm structure upfront.</li>
            <li><strong>Texas Medical Board oversight.</strong> License history, disciplinary actions, and corporate entity registration reviewed on acquisition files.</li>
            <li><strong>No state income tax.</strong> Texas's absence of state income tax improves personal financial modeling on physician-guarantors -- personal cash flow available to support the loan looks stronger than equivalent income in a high-tax state.</li>
            <li><strong>Payer mix modeling.</strong> Texas has a distinctive payer mix including a large uninsured share, a substantial Medicaid managed care presence, and strong commercial insurance across major metros. Specialist Texas lenders build Texas-specific payer-mix baselines into DSCR projections.</li>
            <li><strong>Medical-corridor commercial real estate.</strong> Houston Medical Center, DFW medical-corridor rents, and Austin medical office space run above national baselines but below California; SBA 504 real-estate-combined structures are common on larger Texas physician acquisitions.</li>
        </ul>
    `,
    lenderCalloutHtml: `
        <p>Texas physician SBA lending is <strong>led by The Huntington National Bank</strong> with 36 Texas physician loans, reflecting Huntington's SBA-specialist platform strength. Newtek Bank (33 loans) follows closely at #2 as the specialist SBA platform leader. Wells Fargo (29 loans), Bank of America (22 loans), and PNC Bank (21 loans) round out the top five, with the major banks driven by existing-customer practice acquisition volume across Texas metros.</p>
        <p>JPMorgan Chase (18 loans) and two Texas-headquartered regionals appear meaningfully: <strong>Frost Bank (17 loans, San Antonio-based) and Cadence Bank (16 loans, Dallas-based)</strong>. Frost and Cadence both carry strong Texas practice-lending relationships particularly for larger acquisition and real-estate-combined deals. BayFirst National Bank (17 loans) shares #6 with Frost. SouthState Bank (14 loans) rounds out the top ten. For a Texas physician practice buyer: Huntington and Newtek for the specialist SBA platform process, Frost and Cadence for Texas-regional-relationship files, and Wells Fargo or Chase or BofA for existing-major-bank customers.</p>
    `,
    cityLinks: [
        { name: 'Houston', href: '/business-loans/houston-tx' },
        { name: 'Dallas', href: '/business-loans/dallas-tx' },
        { name: 'Fort Worth', href: '/business-loans/fort-worth-tx' },
        { name: 'Austin', href: '/business-loans/austin-tx' },
        { name: 'San Antonio', href: '/business-loans/san-antonio-tx' },
        { name: 'Plano', href: '/business-loans/plano-tx' },
        { name: 'Arlington', href: '/business-loans/arlington-tx' },
    ],
    quiz: {
        questions: [
            {q:"What's your Texas physician practice situation?",opts:[{v:"acquisition",l:"Acquiring an existing TX practice"},{v:"startup",l:"Starting a new practice"},{v:"real-estate",l:"Buying the practice building"},{v:"expansion",l:"Expansion or additional location"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"real-estate-use",l:"Real estate purchase"},{v:"equipment",l:"Equipment / imaging technology"},{v:"buildout",l:"Buildout / tenant improvements"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Loan amount needed?",opts:[{v:"under-500k",l:"Under $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-3m",l:"$1M - $3M"},{v:"3m-plus",l:"$3M+"}]},
            {q:"Years in practice post-residency?",opts:[{v:"0-2",l:"0-2 years"},{v:"3-5",l:"3-5 years"},{v:"6-plus",l:"6+ years"}]},
        ],
        profiles: {
            A: { badge: "Classic TX physician acquisition", headline: "Second-largest physician SBA market, growing +9.9% YoY", body: "Texas physician SBA has strong specialist lender coverage: Huntington, Newtek, Frost Bank, and Cadence Bank all carry meaningful Texas physician volume. Deal sizes run 29% above national. Match to a lender that models Texas payer mix and no-state-income-tax personal-side underwriting explicitly. Plan 60-90 days to close.", ctaLabel: "Match with Texas physician SBA lenders", utmContent: "profile-a-tx-physician-acquisition" },
            B: { badge: "Real estate + practice", headline: "SBA 504 for the medical office, 7(a) for the practice", body: "Texas physician deals including the medical-corridor real estate benefit from SBA 504's fixed long-term rates. Houston Medical Center, DFW medical corridors, and Austin medical office deals commonly use combined 504 + 7(a) structures. Cadence and Frost Bank are particularly strong on larger Texas real-estate-combined deals; national specialists handle the smaller-tier files well.", ctaLabel: "Match with 504 + 7(a) TX physician lenders", utmContent: "profile-b-tx-physician-real-estate" },
            C: { badge: "New practice / early-career path", headline: "Early-career files need operator-profile support", body: "Texas physician startup or early-career files (0-2 years post-residency) require more underwriting detail than established-practice acquisitions. Lenders want associate experience, hospital-employed pattern documentation, and typically higher equity injection. Specialist lenders (Huntington, Newtek) handle these files.", ctaLabel: "Match with TX physician startup SBA lenders", utmContent: "profile-c-tx-physician-startup" },
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],amount=a[2],exp=a[3];if(sit==='real-estate'||use==='real-estate-use')return 'B';if(sit==='startup'||exp==='0-2')return 'C';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a physician practice in Texas?",a:"Yes. Texas is the second-largest single-state physician SBA market -- 444 loans FY2020-2025 representing 11.1% of national physician SBA volume and $345 million in total approved capital. Standard SBA 7(a) minimum 10% equity injection applies. Texas physician SBA volume is growing at +9.9% year-over-year."},
        {q:"How does Texas physician SBA perform vs. national?",a:"Texas physician SBA charges off at 1.35% -- right at the SBA cross-industry average of 1.36% (a 0.99x ratio). That's meaningfully above the national physician SBA rate of 0.68% (roughly 2x the healthcare-category baseline). Drivers include Texas's share of specialty and multi-provider files with more complex payer mixes and rapid-population-growth market entries. Individual files with strong operator experience and clean payer mix still underwrite favorably -- the state-level number reflects portfolio-mix effects."},
        {q:"What's the typical SBA physician loan size in Texas?",a:"Average Texas physician SBA loan is approximately $777,000 -- 29% above the national physician SBA average of $602K. Median is $400,000 vs. $300,000 nationally (+33%). The elevated deal sizes reflect DFW, Houston, and Austin medical-corridor acquisitions and a tilt toward multi-provider practice files."},
        {q:"Which SBA lenders are most active in Texas physician lending?",a:"The Huntington National Bank leads with 36 Texas physician loans, reflecting Huntington's SBA-specialist platform strength. Newtek Bank (33) holds #2. Wells Fargo (29), Bank of America (22), and PNC Bank (21) round out the top five. Two Texas-headquartered regionals appear meaningfully: Frost Bank (17, San Antonio-based) and Cadence Bank (16, Dallas-based). JPMorgan Chase (18), BayFirst National Bank (17), and SouthState Bank (14) fill remaining top-10 positions."},
        {q:"Who can own a physician practice in Texas?",a:"Under Texas's Corporate Practice of Medicine doctrine, only licensed Texas physicians (or professional associations owned by licensed physicians) can own and operate physician practices in Texas. Non-physician operators and non-professional-association structures don't underwrite cleanly. Management service organization (MSO) arrangements have specific requirements. Specialist Texas physician SBA lenders confirm licensing and corporate-entity structure upfront."},
        {q:"How does no state income tax affect physician SBA underwriting?",a:"Texas's absence of state income tax improves personal financial modeling on physician-guarantors -- personal cash flow available to support the loan looks stronger than equivalent physician income in a high-tax state like California or New York. Underwriters factor this into personal-side analysis on guarantor strength, which can affect leverage decisions on marginal files."},
        {q:"How long does an SBA loan take to close for a Texas physician practice?",a:"60-90 days is typical for a Texas physician practice acquisition with Huntington, Newtek, Frost, Cadence, or another specialist lender. Deals including commercial real estate via SBA 504 plus a 7(a) companion typically run 75-120 days. Early-career physician files typically run 75-100 days given the extra operator-profile underwriting."},
    ],
},

'621111_FL': {
    naicsCode: '621111', state: 'FL', industryParentSlug: 'physicians',
    industryLabel: 'physician practices', industryLabelCap: 'Physician Practices', industryLabelCapSingular: 'Physician Practice',
    stateSlug: 'florida', stateName: 'Florida', campaignSlug: 'sba-physicians-florida-quiz',
    heroPhoto: { src: 'https://images.pexels.com/photos/4173251/pexels-photo-4173251.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'Physician examining a patient in a clinic setting, representative of Florida physician practices financed through SBA 7(a) loans', width: 1200, height: 800, photographer: 'Anna Shvets', photographerUrl: 'https://www.pexels.com/@shvetsa/', sourceUrl: 'https://www.pexels.com/photo/4173251/', sourceName: 'Pexels' },
    communityBankNames: ['BayFirst National Bank'],
    title: 'SBA Loans for Physician Practices in Florida 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for Florida physician practices. 415 FL physician SBA loans FY2020-2025 ($313M), 10.4% of national volume, 1.69% charge-off (1.24x SBA avg). Honest framing on elevated charge-off and -11% YoY.',
    heroSub: 'Florida is the <strong>third-largest state for physician-practice SBA lending</strong> -- 415 loans FY2020-2025 representing 10.4% of national volume. But charge-off performance runs above the SBA cross-industry average (<strong>1.69% vs. 1.36% SBA avg -- 1.24&times;</strong>) and volume has declined -11.3% YoY. Honest framing: Florida physician SBA is a real market with real structural risks lenders explicitly underwrite to.',
    serviceDescription: 'My Money Marketplace helps Florida physicians and physician-practice buyers compare SBA 7(a) and 504 options and get matched with specialist lenders experienced in Florida physician practice acquisition underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',
    marketContextHtml: `
        <p>Florida is the third-largest state for physician-practice SBA lending: <strong>415 loans FY2020-2025 (10.41% national share), $313 million in total approved capital, and $754K average deal size</strong>. Deal sizes run 25% above the national physician SBA baseline of $602K, with median loan at $425,000 vs. $300,000 nationally (+42%). Volume has softened -- YoY growth ran -11.3%, compared to +11% at the national physician level.</p>
        <h3>Metro distribution: Miami, Orlando, Tampa, Jacksonville</h3>
        <p>Four Florida metros drive physician SBA volume: <strong>Miami / Fort Lauderdale, Orlando, Tampa Bay, and Jacksonville</strong>. Miami-metro carries the highest concentration on both primary care and specialty practices, driven by demographic factors (population age, insurance mix, retiree presence). Orlando and Tampa run active mid-market volume. Jacksonville, Naples, Sarasota, and West Palm Beach add secondary volume.</p>
        <h3>Honest framing: charge-off runs 1.24&times; SBA average and 2.5&times; the national physician rate</h3>
        <p>Florida physician SBA charges off at <strong>1.69% -- a 1.24&times; ratio versus the SBA cross-industry average of 1.36% and roughly 2.5&times; the national physician SBA rate of 0.68%</strong>. Florida is meaningfully above the SBA baseline on a category (physician practices) that is otherwise one of the cleanest in the dataset. Drivers of the elevated performance:</p>
        <ul>
            <li><strong>Payer-mix complexity.</strong> Florida carries a distinctive payer mix -- large Medicare Advantage penetration (retiree-heavy demographic), meaningful uninsured share in certain metros, and a fragmented commercial insurance market. Practices that project revenue on national payer-mix benchmarks routinely under-forecast the Florida cash-flow reality.</li>
            <li><strong>Insurance-cost trajectory on real-estate-combined deals.</strong> Florida commercial property insurance has seen double-digit annual premium increases in several recent years, compressing DSCR on files with meaningful real-estate cost lines.</li>
            <li><strong>Hurricane exposure on coastal deals.</strong> Coastal Florida physician real-estate-combined deals carry hurricane exposure that affects insurance costs, business-interruption coverage adequacy, and post-storm continuity of operations.</li>
            <li><strong>Newer-market entrants.</strong> Florida's rapid population growth has drawn some physicians into practice ownership without the referral-pattern depth that established markets provide. Files with less-established patient bases and referral networks charge off at above-average rates.</li>
        </ul>
        <p>Individual files with strong operator experience, established referral patterns, clean payer mix, and manageable insurance exposure still underwrite favorably. The state-level average reflects portfolio distribution, not a per-file verdict. Specialist Florida physician SBA lenders factor Florida-specific structural risks into projections rather than applying national physician-practice benchmarks that miss the state's reality.</p>
        <h3>Florida regulatory context for physician SBA underwriting</h3>
        <ul>
            <li><strong>Florida allows more flexible practice ownership</strong> than California or Texas -- Florida does not have a strict Corporate Practice of Medicine doctrine, so certain MSO and management arrangements have more flexibility. Structure still needs to be underwritten explicitly on each file.</li>
            <li><strong>Florida Board of Medicine oversight.</strong> License history, disciplinary actions, and corporate entity registration reviewed on acquisition files.</li>
            <li><strong>No state income tax</strong> improves personal financial modeling on physician-guarantors.</li>
            <li><strong>Malpractice insurance market.</strong> Florida is a historically hard malpractice market for certain specialties (obstetrics, neurosurgery). Specialist lenders understand the specialty-specific malpractice cost baselines that affect DSCR modeling.</li>
        </ul>
    `,
    lenderCalloutHtml: `
        <p>Florida physician SBA lending is <strong>led by TD Bank</strong> with 48 Florida physician loans, reflecting TD's Florida branch presence combined with existing-customer practice acquisition volume. Newtek Bank (41 loans) holds #2 as the specialist SBA platform leader. BayFirst National Bank (28 loans, Florida-headquartered) rounds out the top three, with strong small-and-mid-tier volume in the state.</p>
        <p>Wells Fargo (18 loans), JPMorgan Chase (16 loans), The Huntington National Bank (15 loans), and Bank of America (15 loans) fill positions 4-7. United Community Bank (14 loans, GA-headquartered), Regions Bank (14 loans), and SouthState Bank (12 loans, Winter Haven FL-headquartered) round out positions 8-10. The Florida physician SBA lender landscape has good coverage across major-bank, specialist SBA platform, and Florida/Southeast-regional tiers. For a Florida physician practice buyer: Newtek and Huntington for the specialist SBA platform process, BayFirst and SouthState for Florida-regional-relationship files, and TD Bank or Wells Fargo for existing-major-bank customers -- with lender selection weighted toward institutions that explicitly model Florida payer mix and insurance-cost trajectory.</p>
    `,
    cityLinks: [
        { name: 'Miami', href: '/business-loans/miami-fl' },
        { name: 'Tampa', href: '/business-loans/tampa-fl' },
        { name: 'Jacksonville', href: '/business-loans/jacksonville-fl' },
        { name: 'Orlando', href: '/business-loans/orlando-fl' },
        { name: 'Fort Lauderdale', href: '/business-loans/fort-lauderdale-fl' },
        { name: 'St. Petersburg', href: '/business-loans/st-petersburg-fl' },
    ],
    quiz: {
        questions: [
            {q:"What's your Florida physician practice situation?",opts:[{v:"acquisition",l:"Acquiring an existing FL practice"},{v:"startup",l:"Starting a new practice"},{v:"real-estate",l:"Buying the practice building"},{v:"expansion",l:"Expansion or additional location"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"real-estate-use",l:"Real estate purchase"},{v:"equipment",l:"Equipment / imaging technology"},{v:"buildout",l:"Buildout / tenant improvements"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Loan amount needed?",opts:[{v:"under-500k",l:"Under $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-3m",l:"$1M - $3M"},{v:"3m-plus",l:"$3M+"}]},
            {q:"Years in practice post-residency?",opts:[{v:"0-2",l:"0-2 years"},{v:"3-5",l:"3-5 years"},{v:"6-plus",l:"6+ years"}]},
        ],
        profiles: {
            A: { badge: "Standard FL physician acquisition", headline: "Match to a lender that models Florida payer mix explicitly", body: "Florida physician SBA charge-off runs 1.24x SBA average -- meaningfully above the national physician rate. Files that succeed do so with established referral patterns, clean payer mix, and lenders who model Florida-specific structural risks rather than applying national baselines. Newtek, Huntington, BayFirst, and TD Bank all carry meaningful FL physician volume. Plan 60-90 days.", ctaLabel: "Match with Florida physician SBA lenders", utmContent: "profile-a-fl-physician-acquisition" },
            B: { badge: "Real estate + practice", headline: "504 for the medical office, 7(a) for the practice", body: "Florida physician real-estate-combined deals get explicit hurricane and insurance-cost-trajectory underwriting from specialist 504 lenders. Coastal exposure factors into insurance costs, business-interruption coverage adequacy, and post-storm continuity modeling. SouthState Bank and BayFirst are strong on Florida real-estate-combined 504 deals; national specialists handle the smaller-tier files. Plan 75-120 days.", ctaLabel: "Match with 504 + 7(a) FL physician lenders", utmContent: "profile-b-fl-physician-real-estate" },
            C: { badge: "New practice / early-career path", headline: "Early-career files need operator-profile support", body: "Florida physician startup or early-career files (0-2 years post-residency) face harder underwriting than established-practice acquisitions given Florida's elevated charge-off rate. Lenders want established referral patterns, associate experience at an existing FL practice, and typically higher equity injection. Specialist lenders (Newtek, Huntington) handle these files.", ctaLabel: "Match with FL physician startup SBA lenders", utmContent: "profile-c-fl-physician-startup" },
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],amount=a[2],exp=a[3];if(sit==='real-estate'||use==='real-estate-use')return 'B';if(sit==='startup'||exp==='0-2')return 'C';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a physician practice in Florida?",a:"Yes. Florida is the third-largest single-state physician SBA market -- 415 loans FY2020-2025 representing 10.4% of national physician SBA volume and $313 million in total approved capital. Standard SBA 7(a) minimum 10% equity injection applies. Volume has softened -- YoY growth ran -11.3% -- but the market remains active with specialist lender coverage."},
        {q:"Why does Florida physician SBA charge off above the average?",a:"Florida physician SBA charges off at 1.69% -- 1.24x the SBA cross-industry average and roughly 2.5x the national physician SBA rate of 0.68%. Drivers include Florida's distinctive payer-mix complexity (large Medicare Advantage penetration, fragmented commercial market), commercial property insurance cost trajectory compressing DSCR on real-estate-heavy files, coastal hurricane exposure, and newer-market entrants without established referral-pattern depth. Individual files with strong operator experience and clean payer mix still underwrite favorably -- the aggregate reflects portfolio distribution."},
        {q:"What's the typical SBA physician loan size in Florida?",a:"Average Florida physician SBA loan is approximately $754,000 -- 25% above the national physician SBA average of $602K. Median is $425,000 vs. $300,000 nationally (+42%). Deal sizes reflect Miami and Fort Lauderdale metro concentration on both primary care and specialty practices."},
        {q:"Which SBA lenders are most active in Florida physician lending?",a:"TD Bank leads with 48 Florida physician loans, reflecting TD's Florida branch presence combined with existing-customer practice acquisition volume. Newtek Bank (41) holds #2 as the specialist SBA platform leader. BayFirst National Bank (28) rounds out the top three. Wells Fargo (18), JPMorgan Chase (16), The Huntington National Bank (15), Bank of America (15), United Community Bank (14), Regions Bank (14), and SouthState Bank (12) round out positions 4-10."},
        {q:"How does Florida's payer mix affect physician SBA underwriting?",a:"Florida's payer mix is distinctive -- large Medicare Advantage penetration reflecting the retiree-heavy demographic, meaningful uninsured share in certain metros, and a fragmented commercial insurance market. Practices that project revenue on national payer-mix benchmarks routinely under-forecast the Florida cash-flow reality. Specialist Florida lenders build Florida-specific payer-mix baselines into DSCR projections; generalist banks unfamiliar with Florida healthcare economics sometimes over-project margins."},
        {q:"How does Florida property insurance affect physician SBA underwriting?",a:"Florida commercial property insurance has seen double-digit annual premium increases in several recent years. Specialist lenders model insurance as a growing cost line on multi-year projections rather than assuming flat costs. Practices in coastal high-exposure zones face insurance costs meaningfully above national baselines. Real-estate-combined 504 deals get explicit hurricane and wind-mitigation underwriting."},
        {q:"How long does an SBA loan take to close for a Florida physician practice?",a:"60-90 days is typical for a Florida physician practice acquisition with Newtek, Huntington, BayFirst, or another specialist lender. Deals including commercial real estate via SBA 504 plus a 7(a) companion typically run 75-120 days -- coastal Florida deals often longer given the added property-insurance and hurricane-exposure underwriting. Early-career physician files typically run 75-100 days."},
    ],
},

'238220_CA': {
    naicsCode: '238220', state: 'CA', industryParentSlug: 'plumbing-hvac',
    industryLabel: 'plumbing and HVAC contractors', industryLabelCap: 'Plumbing and HVAC Contractors', industryLabelCapSingular: 'Plumbing / HVAC Contractor',
    stateSlug: 'california', stateName: 'California', campaignSlug: 'sba-plumbing-hvac-california-quiz',
    heroPhoto: { src: 'https://images.pexels.com/photos/8486951/pexels-photo-8486951.jpeg?auto=compress&cs=tinysrgb&w=1200', alt: 'HVAC technician working on air conditioning equipment, representative of California plumbing and HVAC contractors financed through SBA 7(a) loans', width: 1200, height: 800, photographer: 'Nataliya Vaitkevich', photographerUrl: 'https://www.pexels.com/@n-voitkevich/', sourceUrl: 'https://www.pexels.com/photo/8486951/', sourceName: 'Pexels' },
    communityBankNames: [],
    title: 'SBA Loans for Plumbing and HVAC Contractors in California 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for California plumbing and HVAC contractors. 652 CA plumbing-HVAC SBA loans approved FY2020-2025 ($322M), 10.6% of national volume, $493K avg deal size. Largest state market.',
    heroSub: 'California is the <strong>largest single-state market for plumbing and HVAC contractor SBA lending</strong> -- 652 loans FY2020-2025 representing 10.6% of national volume. Charge-off performance runs modestly above the SBA cross-industry average (<strong>1.53% vs. 1.36% -- 1.13&times;</strong>) and above the national plumbing/HVAC rate. Honest framing on the elevated performance combined with strong specialist-lender coverage.',
    serviceDescription: 'My Money Marketplace helps California plumbing and HVAC contractors compare SBA 7(a) and 504 options and get matched with lenders experienced in California contractor acquisition and equipment underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',
    marketContextHtml: `
        <p>California is the largest state market for plumbing and HVAC contractor SBA lending: <strong>652 loans FY2020-2025 (10.64% national share), $322 million in total approved capital, and $493K average deal size</strong>. Deal sizes run 13% above the national plumbing/HVAC baseline of $438K, with median loan at $200,000 vs. $150,000 nationally (+33%). YoY volume growth is flat, compared to +3.6% at the national plumbing/HVAC level.</p>
        <h3>Metro distribution</h3>
        <p>California plumbing and HVAC SBA volume is distributed across <strong>Los Angeles / Orange County, San Diego, San Francisco Bay Area, Sacramento, and the Inland Empire</strong>. LA-OC carries the highest absolute volume; the Bay Area runs a higher share of larger commercial-focused contractor acquisitions. Sacramento has meaningful state-employee-adjacent HVAC volume. Central Valley and Inland Empire add secondary market volume.</p>
        <h3>Honest framing: charge-off runs 1.13&times; SBA average</h3>
        <p>California plumbing/HVAC SBA charges off at <strong>1.53% -- a 1.13&times; ratio versus the SBA cross-industry average of 1.36% and modestly above the national plumbing/HVAC rate of 1.32%</strong>. That's not dramatically elevated but it does place California above the SBA baseline on a category that varies meaningfully by state. Drivers of the elevated performance:</p>
        <ul>
            <li><strong>California labor cost structure.</strong> California plumbing and HVAC technician wages, licensed-journeyman requirements, and prevailing-wage rules on public-adjacent work drive labor as a percentage of revenue above national baselines. Contractors that project margins on national labor benchmarks routinely under-forecast California payroll.</li>
            <li><strong>Licensing complexity (CSLB).</strong> California Contractors State License Board licensing is required for contracts over $500 (and $200 in some cases). C-36 (plumbing), C-20 (HVAC), and multi-classification licenses each have specific requirements. License-based bonding and workers' compensation compliance affect acquisition file underwriting.</li>
            <li><strong>Workers' compensation cost.</strong> California workers' compensation for plumbing/HVAC is meaningfully more expensive than national baselines, and experience-modifier volatility on contractor files affects DSCR projections.</li>
            <li><strong>Prevailing-wage compliance on public work.</strong> Contractors with meaningful public-work share (schools, municipal, state) face prevailing-wage compliance costs that compress margins vs. private-only contractors.</li>
        </ul>
        <p>Individual files with clean CSLB history, established private-market customer bases, and disciplined operators still underwrite favorably. Match to a lender that models California-specific labor structure and licensing context rather than applying national contractor benchmarks.</p>
        <h3>California regulatory context for plumbing/HVAC SBA underwriting</h3>
        <ul>
            <li><strong>CSLB licensing.</strong> Contracts over $500 require CSLB licensing in appropriate classification (C-36 plumbing, C-20 HVAC, or specialty classifications). Acquisition files require verified license transfer or new-owner qualification.</li>
            <li><strong>Bonding requirements.</strong> $25,000 contractor's bond is standard. Additional bonding on larger project files.</li>
            <li><strong>Refrigerant handling (Title 24).</strong> HVAC contractors handling refrigerants need EPA Section 608 certification. California Title 24 energy code compliance affects HVAC project scope and pricing.</li>
            <li><strong>SB 1383 organic waste rules</strong> affect certain plumbing (grease trap, sewer connection) categories.</li>
        </ul>
    `,
    lenderCalloutHtml: `
        <p>California plumbing/HVAC SBA lending is <strong>dominated by U.S. Bank</strong> with 166 California plumbing/HVAC loans -- 25% of state volume by count -- roughly 3&times; the next-largest lender. U.S. Bank's dominance reflects the bank's traditional strength in contractor and equipment-heavy small-business lending applied to the largest state market. JPMorgan Chase (53 loans) holds #2 with strong existing-customer contractor acquisition volume. Live Oak Banking Company (38 loans, $1.03M avg) leads on the larger-deal tier -- higher-ticket commercial contractor acquisitions.</p>
        <p>BayFirst National Bank (29 loans) and Wells Fargo (29 loans) share #4 with strong small-deal-tier volume. Northeast Bank (24 loans) rounds out the top six. Newtek Bank (18), Bank of America (18), CDC Small Business Finance Corp. (17 loans -- California-focused CDFI), and Lendistry SBLC (16 loans -- California-focused SBA specialist) fill positions 7-10. The California plumbing/HVAC SBA lender landscape has strong coverage across major-bank, national specialist, and California-focused CDFI tiers. For a California contractor buyer: U.S. Bank is the dominant default; Live Oak fits larger-ticket commercial contractor acquisitions; CDC Small Business Finance and Lendistry SBLC add California-focused options particularly relevant for smaller-deal or MDI-eligible files.</p>
    `,
    cityLinks: [
        { name: 'Los Angeles', href: '/business-loans/los-angeles-ca' },
        { name: 'San Francisco', href: '/business-loans/san-francisco-ca' },
        { name: 'San Diego', href: '/business-loans/san-diego-ca' },
        { name: 'San Jose', href: '/business-loans/san-jose-ca' },
        { name: 'Sacramento', href: '/business-loans/sacramento-ca' },
        { name: 'Long Beach', href: '/business-loans/long-beach-ca' },
        { name: 'Fresno', href: '/business-loans/fresno-ca' },
    ],
    quiz: {
        questions: [
            {q:"What's your California plumbing / HVAC situation?",opts:[{v:"acquisition",l:"Acquiring an existing CA contractor"},{v:"expansion",l:"Expansion or additional territory"},{v:"equipment",l:"Trucks, equipment, or working capital"},{v:"real-estate",l:"Buying the shop / yard"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"real-estate-use",l:"Real estate purchase"},{v:"equipment-use",l:"Trucks / equipment"},{v:"working-capital",l:"Working capital"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Loan amount needed?",opts:[{v:"under-250k",l:"Under $250K"},{v:"250k-750k",l:"$250K - $750K"},{v:"750k-2m",l:"$750K - $2M"},{v:"2m-plus",l:"$2M+"}]},
            {q:"CSLB license status?",opts:[{v:"licensed",l:"Currently licensed (C-36 or C-20)"},{v:"working-toward",l:"Working toward CSLB license"},{v:"buying-licensed-entity",l:"Buying an already-licensed entity"}]},
        ],
        profiles: {
            A: { badge: "Classic CA contractor acquisition", headline: "Largest state market, strong specialist lender coverage", body: "California plumbing/HVAC SBA has dominant U.S. Bank coverage (25% of state volume) plus strong Chase, Live Oak, and California-focused CDFI options. Acquiring an established California contractor with meaningful equity and clean CSLB history fits the specialist lender sweet spot. Match to a lender that models California labor structure, workers' comp cost, and CSLB context explicitly. Plan 60-90 days.", ctaLabel: "Match with California plumbing/HVAC SBA lenders", utmContent: "profile-a-ca-plumbing-hvac-acquisition" },
            B: { badge: "Real estate + shop / yard", headline: "SBA 504 for the property, 7(a) for the business", body: "California plumbing/HVAC deals including the shop or yard real estate benefit from SBA 504's fixed long-term rates on the real-estate portion. 7(a) companion covers the business acquisition, trucks, equipment, and working capital. Combined structure common on larger California contractor deals. Plan 75-120 days.", ctaLabel: "Match with 504 + 7(a) CA contractor lenders", utmContent: "profile-b-ca-plumbing-hvac-real-estate" },
            C: { badge: "Equipment / smaller-ticket path", headline: "SBA 7(a) working capital or equipment-focused", body: "California plumbing and HVAC contractors adding trucks, equipment, or working capital without a full acquisition benefit from smaller-tier specialist SBA platforms. BayFirst, Newtek, CDC Small Business Finance, and Lendistry SBLC all handle sub-$500K files well. Plan 45-70 days.", ctaLabel: "Match with CA contractor equipment SBA lenders", utmContent: "profile-c-ca-plumbing-hvac-equipment" },
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],amount=a[2],lic=a[3];if(sit==='real-estate'||use==='real-estate-use')return 'B';if(sit==='equipment'||use==='equipment-use'||amount==='under-250k')return 'C';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a plumbing or HVAC contractor in California?",a:"Yes. California is the largest single-state plumbing/HVAC SBA market -- 652 loans FY2020-2025 representing 10.6% of national volume and $322 million in total approved capital. Standard SBA 7(a) minimum 10% equity injection applies. Files require verified CSLB licensing (C-36 plumbing, C-20 HVAC, or specialty classifications) or a plan for new-owner qualification post-close on acquisition files."},
        {q:"How does California plumbing/HVAC SBA perform vs. national?",a:"California plumbing/HVAC SBA charges off at 1.53% -- 1.13x the SBA cross-industry average of 1.36% and modestly above the national plumbing/HVAC rate of 1.32%. Drivers include California labor cost structure, licensed-journeyman requirements, workers' comp cost baseline, and prevailing-wage compliance costs on public-adjacent work. Individual files with clean CSLB history and established customer bases still underwrite favorably."},
        {q:"What's the typical SBA plumbing/HVAC loan size in California?",a:"Average California plumbing/HVAC SBA loan is approximately $493,000 -- 13% above the national plumbing/HVAC baseline of $438K. Median is $200,000 vs. $150,000 nationally (+33%). Deal sizes reflect a mix of larger commercial-focused contractor acquisitions (Bay Area, LA-OC) alongside smaller-ticket residential contractor equipment and working-capital files."},
        {q:"Which SBA lenders are most active in California plumbing/HVAC lending?",a:"U.S. Bank dominates with 166 California plumbing/HVAC loans -- 25% of state volume and roughly 3x the next-largest lender. JPMorgan Chase (53) holds #2 with strong existing-customer volume. Live Oak Banking Company (38, $1.03M avg) leads on the larger-deal tier. BayFirst National Bank (29) and Wells Fargo (29) share #4. Northeast Bank (24), Newtek Bank (18), Bank of America (18), CDC Small Business Finance Corp. (17), and Lendistry SBLC (16) round out the top ten."},
        {q:"How does CSLB licensing affect SBA plumbing/HVAC underwriting?",a:"California Contractors State License Board licensing is required for contracts over $500. Acquisition files require either verified license transfer to the buyer or a documented plan for new-owner qualification (typically involves the qualifier remaining employed post-close or the buyer sitting for the qualifying exam). Files with clean CSLB history and no open disciplinary matters underwrite cleanly; files with license suspensions or disciplinary history extend diligence."},
        {q:"How does California workers' comp cost affect underwriting?",a:"California workers' compensation for plumbing and HVAC contractors is meaningfully more expensive than national baselines, and experience-modifier volatility on contractor files affects DSCR projections. Specialist California lenders model workers' comp as a specific line item rather than folding it into general overhead. Contractors with clean claim history and lower experience modifiers underwrite better than those with elevated claim histories."},
        {q:"How long does an SBA loan take to close for a California plumbing/HVAC contractor?",a:"60-90 days is typical for a California contractor acquisition with U.S. Bank, Chase, Live Oak, or another specialist lender. Deals including commercial real estate via SBA 504 plus a 7(a) companion typically run 75-120 days. Smaller-tier equipment and working-capital files with specialist SBA platforms (BayFirst, Newtek, CDC Small Business Finance, Lendistry SBLC) often close in 45-70 days."},
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

function renderLenderChartSvg(stateLenders, communityBankNames, stateName, industryLabel) {
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
    <title id="viz-lenders-title">Top 10 SBA ${industryLabel || 'industry'} lenders in ${stateName} by loan count</title>
    <desc id="viz-lenders-desc">Horizontal bar chart: ${descText}.${highlightNote}</desc>
${rows}
  </svg>`;
}

function renderLendersSection(stateLenders, stateName, industryLabel, communityBankNames) {
    const chartSvg = renderLenderChartSvg(stateLenders, communityBankNames, stateName, industryLabel);
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

// Ordinal helpers for rank-aware phrasing.
function ordinal(n) {
    const s = ["th","st","nd","rd"], v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
}
function stateRankIn(topStates, stateAbbr) {
    if (!Array.isArray(topStates)) return null;
    const idx = topStates.findIndex(s => s.state === stateAbbr);
    return idx >= 0 ? idx + 1 : null;
}

function renderComparisonTiles(stateStats, nationalStats, overall, stateName, industryLabel, stateAbbr, industryLabelSingular) {
    const avgDelta = ((stateStats.avg_loan / nationalStats.avg_loan) - 1) * 100;
    const chgoffDeltaPP = (stateStats.charge_off_pct - nationalStats.charge_off_pct);
    const chgoffDeltaLabel = `${chgoffDeltaPP >= 0 ? '+' : ''}${chgoffDeltaPP.toFixed(2)}pp`;
    // Singular form for attributive use ("restaurant SBA market", not "restaurants SBA market").
    const singular = industryLabelSingular || industryLabel;

    // Direction-conditional avg-loan context.
    const avgAbove = avgDelta >= 0;
    const avgContext = avgAbove
        ? `Higher average reflects ${stateName} real estate and buildout costs relative to national baseline.`
        : `Smaller average reflects a mix that skews toward smaller-deal files vs. the national ${singular} baseline.`;

    // Direction-conditional charge-off context.
    const chgoffContext = chgoffDeltaPP >= 0
        ? `Above national ${singular} rate. ${stateName}-specific cost structure and market factors compress margins on marginal files.`
        : `Below national ${singular} rate. ${stateName} cohort performs cleaner than the national baseline for this industry.`;

    // Rank-aware share tile: only claim "largest" when actually largest.
    const rank = stateAbbr ? stateRankIn(nationalStats.top_states_by_count, stateAbbr) : null;
    let shareContext;
    if (rank === 1) {
        shareContext = `${stateName} is the largest single-state ${singular} SBA market in the US.`;
    } else if (rank && rank <= 10) {
        shareContext = `${stateName} is the ${ordinal(rank)}-largest single-state ${singular} SBA market in the US.`;
    } else if (rank) {
        shareContext = `${stateName} ranks ${ordinal(rank)} nationally for ${industryLabel} SBA volume.`;
    } else {
        shareContext = `${stateName}'s share of national ${industryLabel} SBA volume.`;
    }

    return `
    <section class="comparison-tiles">
        <div class="container">
            <h2>${stateName} vs national &mdash; at a glance</h2>
            <div class="ct-grid">
                <div class="ct-tile">
                    <div class="ct-delta ${avgDelta >= 0 ? 'ct-up' : 'ct-down'}">${fmt.signedPct(avgDelta)}</div>
                    <div class="ct-label">Average loan size</div>
                    <div class="ct-values"><strong>${fmt.usdK(stateStats.avg_loan)}</strong> ${stateName} &nbsp;vs&nbsp; <span>${fmt.usdK(nationalStats.avg_loan)} national</span></div>
                    <div class="ct-context">${avgContext}</div>
                </div>
                <div class="ct-tile">
                    <div class="ct-delta ct-neutral">${chgoffDeltaLabel}</div>
                    <div class="ct-label">Charge-off rate</div>
                    <div class="ct-values"><strong>${fmt.pct(stateStats.charge_off_pct)}</strong> ${stateName} &nbsp;vs&nbsp; <span>${fmt.pct(nationalStats.charge_off_pct)} national ${industryLabel}</span></div>
                    <div class="ct-context">${chgoffContext}</div>
                </div>
                <div class="ct-tile ct-highlight">
                    <div class="ct-big">${fmt.pct1(stateStats.share_of_industry_loans_pct)}</div>
                    <div class="ct-label">Of all US ${industryLabel} SBA loans</div>
                    <div class="ct-context">${shareContext}</div>
                </div>
            </div>
        </div>
    </section>`;
}

function renderStateComparisonSection(topStates, highlightStateAbbr, stateName, industryLabel) {
    const chartSvg = renderStateComparisonSvg(topStates, highlightStateAbbr, industryLabel);
    const rank = stateRankIn(topStates, highlightStateAbbr);
    const highlighted = topStates.find(s => s.state === highlightStateAbbr);
    const leader = topStates[0];

    let subCopy;
    if (rank === 1) {
        const second = topStates[1];
        const leadFactor = highlighted && second ? (highlighted.loan_count / second.loan_count).toFixed(2) : '';
        subCopy = `${stateName} leads the next-largest state (${second ? second.state : ''}) by roughly ${leadFactor}&times; on SBA ${industryLabel} loan count &mdash; the concentration is real, not noise. Top 8 states account for about half of all national ${industryLabel} SBA volume.`;
    } else if (rank && rank <= 10 && highlighted && leader) {
        const ratioToLeader = (leader.loan_count / highlighted.loan_count).toFixed(2);
        subCopy = `${stateName} ranks ${ordinal(rank)} nationally for ${industryLabel} SBA volume. The leader (${leader.state}) carries roughly ${ratioToLeader}&times; ${stateName}'s loan count. Top 8 states account for about half of all national ${industryLabel} SBA volume.`;
    } else if (highlighted && leader) {
        subCopy = `${stateName} is one of the meaningful state markets for ${industryLabel} SBA lending. The leader (${leader.state}) carries ${leader.loan_count} loans; top 8 states account for about half of all national ${industryLabel} SBA volume.`;
    } else {
        subCopy = `Top 8 states account for about half of all national ${industryLabel} SBA volume.`;
    }

    return `
    <section class="state-comparison-section">
        <div class="container-narrow">
            <h2>How ${stateName} compares to other top ${industryLabel} states</h2>
            <p class="ls-sub">${subCopy}</p>
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

// Ensure a link href to an on-site path uses trailing-slash form (canonical URL rule).
function withTrailingSlash(href) {
    if (!href) return href;
    if (href.endsWith('/')) return href;
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return href;
    if (/\.(?:html|pdf|png|jpe?g|gif|svg|ico|css|js|xml|txt|webp)$/i.test(href.split(/[?#]/)[0])) return href;
    if (href.startsWith('/') || href.startsWith('https://mymoneymarketplace.com')) {
        const [path, ...rest] = href.split(/([?#])/);
        return path + '/' + rest.join('');
    }
    return href;
}

function renderCityLinks(cityLinks, stateName) {
    if (!cityLinks || cityLinks.length === 0) return '';
    const items = cityLinks.map(c => `<a class="city-link" href="${withTrailingSlash(c.href)}">${esc(c.name)}</a>`).join('');
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

    const canonicalUrl = `https://mymoneymarketplace.com/sba-loans/${cfg.industryParentSlug}/${cfg.stateSlug}/`;

    const { questionsHtml, profilesJson, scoringBody, total } = renderQuiz(cfg);
    const faqSchema = renderFaqSchema(cfg.faqs);
    const faqsHtml = renderFaqs(cfg.faqs);

    // JSON-LD
    const ldGraph = [
        {"@type":"Organization","name":"My Money Marketplace","url":"https://mymoneymarketplace.com/","logo":"https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png"},
        {"@type":"BreadcrumbList","itemListElement":[
            {"@type":"ListItem","position":1,"name":"SBA Loans","item":"https://mymoneymarketplace.com/sba-loans/"},
            {"@type":"ListItem","position":2,"name":cfg.industryLabelCap,"item":`https://mymoneymarketplace.com/sba-loans/${cfg.industryParentSlug}/`},
            {"@type":"ListItem","position":3,"name":cfg.stateName,"item":canonicalUrl},
        ]},
        {"@type":"Article","headline":cfg.title.replace(/ \| My Money Marketplace$/,''),"description":cfg.metaDesc,"author":{"@type":"Organization","name":"My Money Marketplace"},"publisher":{"@type":"Organization","name":"My Money Marketplace","logo":{"@type":"ImageObject","url":"https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png"}},"datePublished":"2026-04-22","dateModified":"2026-04-22","mainEntityOfPage":canonicalUrl},
        {"@type":"FinancialService","name":`SBA Loan Matching for ${cfg.stateName} ${cfg.industryLabelCap}`,"serviceType":`SBA loan guidance and lender matching for ${cfg.industryLabel} operators in ${cfg.stateName}`,"description":cfg.serviceDescription,"areaServed":{"@type":"State","name":cfg.stateName},"provider":{"@type":"Organization","name":"My Money Marketplace","url":"https://mymoneymarketplace.com/"}},
        {"@type":"FAQPage","mainEntity":faqSchema},
    ];
    const ldJson = JSON.stringify({"@context":"https://schema.org","@graph":ldGraph});

    // Short industry mechanics section pointing to parent page
    const shortMechanics = `
    <section class="ed">
        <div class="ed-inner">
            <h2 style="text-align:left;">${cfg.industryLabelCapSingular} SBA mechanics &mdash; the short version</h2>
            <p>SBA 7(a) is the dominant path for ${cfg.industryLabel} acquisitions, buildouts, equipment, and working capital. Standard 7(a) goes up to $5 million; 7(a) Small Loan streamlines deals under $500K. SBA 504 handles real estate and heavy fixed-asset purchases when the deal includes the property. Minimum 10% equity injection applies; specialist lenders typically want 15-20% on ${cfg.stateName} ${cfg.industryLabel} deals given the higher cost structure. Up to 5% of equity can come from seller financing on full-standby terms.</p>
            <p>For the full SBA ${cfg.industryLabel} lending guide &mdash; including program details, independent vs. franchise dynamics, the ${cfg.industryLabel} charge-off context, and the complete national picture &mdash; see our <a class="inline" href="/sba-loans/${cfg.industryParentSlug}/">SBA ${cfg.industryLabel} loan guide</a>. This state page focuses on the ${cfg.stateName}-specific data and market context on top of that national foundation.</p>
        </div>
    </section>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!-- Microsoft Clarity -->
    <script type="text/javascript">
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "xmyn125cca");
    </script>
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
            <a href="/credit-cards/" class="header-link">Credit Cards</a>
            <a href="/personal-loans/" class="header-link">Personal Loans</a>
            <a href="/business-loans/" class="header-link">Business Loans</a>
            <a href="/savings/" class="header-link">Savings</a>
            <button class="mobile-toggle" aria-label="Menu"><span></span><span></span><span></span></button>
        </nav>
    </div>
</header>
${renderHeroPhoto(cfg.heroPhoto, cfg.stateName, cfg.industryLabel)}

<nav class="breadcrumb" aria-label="Breadcrumb">
    <div class="container">
        <ol class="breadcrumb-list"><li><a href="/">Home</a></li><li class="sep">/</li><li><a href="/sba-loans/">SBA Loans</a></li><li class="sep">/</li><li><a href="/sba-loans/${cfg.industryParentSlug}/">${cfg.industryLabelCap}</a></li><li class="sep">/</li><li class="current">${cfg.stateName}</li></ol>
    </div>
</nav>

<section class="hero">
    <div class="container">
        <div class="hero-grid">
            <div class="hero-left">
                <h1>SBA Loans for ${cfg.industryLabelCap} in ${cfg.stateName}</h1>
                <p class="sub">${cfg.heroSub}</p>
                <p class="hero-value">Answer 4 questions. Get matched with ${cfg.stateName}-${cfg.industryLabel.replace(/s$/, '')}-experienced SBA lenders.</p>
                <a href="#state-stats" class="hero-skip">Skip to ${cfg.stateName} stats &rarr;</a>
                <p class="basics-link">See the national picture at the <a href="/sba-loans/${cfg.industryParentSlug}/">SBA ${cfg.industryLabel} guide</a>.</p>
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

<div id="state-stats"></div>
${renderStatsBlock(stateStats, nationalStats, overall, cfg.stateName, cfg.industryLabel)}

${renderComparisonTiles(stateStats, nationalStats, overall, cfg.stateName, cfg.industryLabel, cfg.state, (cfg.industryLabelCapSingular || '').toLowerCase())}

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
        <p>${cfg.stateName} ${cfg.industryLabel} SBA is a specialist segment. The top ${cfg.stateName} lenders understand the state's cost structure, labor economics, and regulatory context that generalist banks routinely miss. See the broader <a href="/sba-loans/${cfg.industryParentSlug}/">SBA ${cfg.industryLabel} guide</a> or <a href="/sba-loans/">SBA loans hub</a>.</p>
        <a href="https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=${cfg.campaignSlug}&utm_content=closing-cta" class="closing-cta-btn" rel="nofollow sponsored">Match with ${cfg.stateName} SBA lenders &rarr;</a>
        <p class="closing-fine">MMM does not originate SBA loans. Applications are processed through SBA-authorized lenders. Statistics above are sourced from the SBA FOIA 7(a) dataset, fiscal years 2020 through December 2025.</p>
    </div>
</section>

<footer class="footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-col"><h4>Products</h4><a href="/personal-loans/">Personal Loans</a><a href="/business-loans/">Business Loans</a><a href="/sba-loans/">SBA Loans</a><a href="/credit-cards/">Credit Cards</a><a href="/savings/">Savings</a></div>
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
