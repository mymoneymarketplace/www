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

function renderLendersSection(stateLenders, stateName, industryLabel) {
    const rows = stateLenders.slice(0, 10).map((l, i) => `
                <tr>
                    <td class="rank">${i + 1}</td>
                    <td class="lender-name">${esc(l.bankname)}</td>
                    <td class="lender-count">${fmt.num(l.loan_count)}</td>
                    <td class="lender-avg">${fmt.usdK(l.avg_loan_in_state_industry)}</td>
                </tr>`).join('');
    return `
    <section class="lenders-section">
        <div class="container-narrow">
            <h2>Top SBA lenders for ${stateName} ${industryLabel}</h2>
            <p class="ls-sub">The ten banks that have approved the most SBA 7(a) loans to ${industryLabel} operators in ${stateName} FY2020-2025. Pulled directly from SBA FOIA data. Loan count alone doesn&rsquo;t capture fit for your specific deal &mdash; volume leaders and specialist fit can differ.</p>
            <div class="lender-table-wrap">
                <table class="lender-table">
                    <thead>
                        <tr><th>Rank</th><th>Lender</th><th>Loans in ${stateName}</th><th>Avg loan</th></tr>
                    </thead>
                    <tbody>${rows}
                    </tbody>
                </table>
            </div>
        </div>
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

${renderLendersSection(stateStats.top_lenders, cfg.stateName, cfg.industryLabel)}
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
    const outPath = path.join(__dirname, '..', 'sba-loans', cfg.industryParentSlug, cfg.stateSlug, 'index.html');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`Wrote ${outPath} (${html.length.toLocaleString()} chars)`);
}

if (require.main === module) main();

module.exports = { renderPage, CONFIGS };
