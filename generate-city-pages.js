// Generate apex business-loans/<city>-<state>/index.html pages for every
// parasite at ../seo-pages/business-loans-<city>-<state>.html.
//
// Same strategy as generate-profession-pages.js: extract real FAQ content
// from the parasite's FAQPage JSON-LD, template the rest with city/state
// substitution. Related links cluster by state.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SEO_PAGES = path.resolve(ROOT, '..', 'seo-pages');
const LOGO = 'https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png';
const TODAY = new Date().toISOString().slice(0, 10);

const STATE_NAMES = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
    MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
    NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
    ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
    RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
    TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
    WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming'
};

// ─────────── helpers (same as profession generator) ───────────

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function buildBreadcrumbSchema(breadcrumb) {
    return breadcrumb.map((b, i) => ({
        '@type': 'ListItem', position: i + 1, name: b.name,
        item: b.url === '/' ? 'https://mymoneymarketplace.com' : 'https://mymoneymarketplace.com' + b.url
    }));
}
function buildFaqSchema(faqs) {
    return faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }));
}
function renderBreadcrumb(b) { return b.map((x, i) => (i > 0 ? '<li class="sep">/</li>' : '') + (i === b.length - 1 ? `<li class="current">${esc(x.name)}</li>` : `<li><a href="${x.url}">${esc(x.name)}</a></li>`)).join(''); }
function renderPurposeCards(c) { return c.map(x => `\n            <div class="purpose-card"><div class="purpose-icon" style="background:${x.color};"></div><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></div>`).join(''); }
function renderContentSections(s) { return s.map(x => `\n        <h3>${esc(x.h3)}</h3>\n        <p>${esc(x.p)}</p>`).join(''); }
function renderFaqs(f) { return f.map(x => `\n            <details><summary>${esc(x.q)}</summary><div class="faq-answer">${esc(x.a)}</div></details>`).join(''); }
function renderRelated(r) { return r.map(x => `\n            <a href="${x.url}" class="related-card"><div class="related-title">${esc(x.title)}</div><span class="related-link">${esc(x.sub)} &rarr;</span></a>`).join(''); }

function buildPage(p) {
    const canonical = `https://mymoneymarketplace.com/${p.slug}`;
    const ctaUrl = `https://lendmatecapital.com?utm_source=mmm&utm_medium=hub&utm_campaign=${p.ctaUtm}`;
    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            { '@type': 'Organization', name: 'My Money Marketplace', url: 'https://mymoneymarketplace.com', logo: LOGO },
            { '@type': 'BreadcrumbList', itemListElement: buildBreadcrumbSchema(p.breadcrumb) },
            {
                '@type': 'LocalBusiness',
                name: `Lendmate Capital -- ${p.cityDisplay} Business Loans`,
                areaServed: { '@type': 'City', name: p.cityDisplay, containedInPlace: { '@type': 'State', name: p.stateName } },
                url: 'https://lendmatecapital.com',
                description: p.metaDesc
            },
            {
                '@type': 'Article',
                headline: p.articleHeadline, description: p.metaDesc,
                author: { '@type': 'Organization', name: 'My Money Marketplace' },
                publisher: { '@type': 'Organization', name: 'My Money Marketplace', logo: { '@type': 'ImageObject', url: LOGO } },
                datePublished: TODAY, dateModified: TODAY, mainEntityOfPage: canonical
            },
            { '@type': 'FAQPage', mainEntity: buildFaqSchema(p.faqs) }
        ]
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(p.title)}</title>
    <meta name="description" content="${esc(p.metaDesc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonical}">
    <meta property="og:title" content="${esc(p.title)}">
    <meta property="og:description" content="${esc(p.metaDesc)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','GA_MEASUREMENT_ID');</script>
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --green: #008254; --green-dark: #006b45; --text: #111111; --text-secondary: #444444; --text-muted: #717171; --border: #e2e2e2; --bg-light: #f7f7f7; --white: #ffffff; }
        html { scroll-behavior: smooth; scroll-padding-top: 64px; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: var(--text); background: var(--white); line-height: 1.7; -webkit-font-smoothing: antialiased; }
        .header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: var(--white); border-bottom: 1px solid var(--border); height: 64px; }
        .header-inner { max-width: 1120px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .header-logo img { height: 32px; display: block; }
        .header-nav { display: flex; align-items: center; gap: 32px; }
        .header-link { font-size: 14px; font-weight: 500; color: var(--text-secondary); text-decoration: none; transition: color 0.2s; }
        .header-link:hover { color: var(--green); }
        .header-cta { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 14px; font-weight: 600; padding: 10px 22px; border-radius: 6px; text-decoration: none; transition: background 0.2s; }
        .header-cta:hover { background: var(--green-dark); }
        .mobile-toggle { display: none; background: none; border: none; cursor: pointer; padding: 4px; }
        .mobile-toggle span { display: block; width: 22px; height: 2px; background: var(--text); margin: 5px 0; transition: 0.3s; }
        @media (max-width: 768px) { .header-link { display: none; } .mobile-toggle { display: block; } }
        .container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .container-narrow { max-width: 800px; margin: 0 auto; padding: 0 24px; }
        .breadcrumb { padding: 16px 0; margin-top: 64px; background: var(--bg-light); border-bottom: 1px solid var(--border); }
        .breadcrumb-list { display: flex; align-items: center; gap: 8px; list-style: none; font-size: 13px; }
        .breadcrumb-list a { color: var(--text-muted); text-decoration: none; }
        .breadcrumb-list a:hover { color: var(--green); }
        .breadcrumb-list .sep { color: var(--text-muted); }
        .breadcrumb-list .current { color: var(--text-secondary); font-weight: 500; }
        .hero { padding: 48px 0 40px; text-align: center; background: var(--white); }
        .hero h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 700; color: var(--text); line-height: 1.2; margin-bottom: 12px; }
        .hero .sub { font-size: 17px; color: var(--text-secondary); max-width: 600px; margin: 0 auto; line-height: 1.6; }
        .purpose-section { padding: 0 0 56px; }
        .purpose-section h2 { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 24px; text-align: center; }
        .purpose-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .purpose-card { background: var(--white); border: 1px solid var(--border); border-radius: 8px; padding: 20px; transition: box-shadow 0.2s; }
        .purpose-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .purpose-icon { width: 40px; height: 40px; border-radius: 8px; margin-bottom: 12px; }
        .purpose-card h3 { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .purpose-card p { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
        @media (max-width: 900px) { .purpose-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .purpose-grid { grid-template-columns: 1fr; } }
        .lendmate-cta { padding: 48px 0; background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); text-align: center; }
        .lendmate-cta h2 { font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
        .lendmate-cta p { font-size: 15px; color: var(--text-secondary); max-width: 620px; margin: 0 auto 24px; line-height: 1.6; }
        .lendmate-btn { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; transition: background 0.2s, transform 0.2s; }
        .lendmate-btn:hover { background: var(--green-dark); transform: translateY(-1px); }
        .lendmate-micro { font-size: 12px; color: var(--text-muted); margin-top: 12px; }
        .content-section { padding: 56px 0; }
        .content-section h2 { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 20px; }
        .content-section h3 { font-size: 18px; font-weight: 600; color: var(--text); margin: 28px 0 10px; }
        .content-section p { font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 14px; }
        .faq-section { padding: 56px 0; background: var(--bg-light); border-top: 1px solid var(--border); }
        .faq-section h2 { font-size: 24px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 32px; }
        .faq-list { max-width: 720px; margin: 0 auto; }
        details { border: 1px solid var(--border); border-radius: 8px; background: var(--white); margin-bottom: 10px; overflow: hidden; }
        details summary { padding: 16px 20px; font-size: 15px; font-weight: 600; color: var(--text); cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; }
        details summary::-webkit-details-marker { display: none; }
        details summary::after { content: '+'; font-size: 20px; font-weight: 400; color: var(--text-muted); flex-shrink: 0; margin-left: 12px; }
        details[open] summary::after { content: '-'; }
        details .faq-answer { padding: 0 20px 16px; font-size: 14px; color: var(--text-secondary); line-height: 1.7; }
        .related-section { padding: 48px 0; border-top: 1px solid var(--border); }
        .related-section h2 { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 20px; text-align: center; }
        .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 720px; margin: 0 auto; }
        .related-card { display: block; padding: 20px; border: 1px solid var(--border); border-radius: 8px; text-decoration: none; text-align: center; transition: box-shadow 0.2s; }
        .related-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .related-card .related-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
        .related-card .related-link { font-size: 13px; color: var(--green); font-weight: 500; }
        @media (max-width: 640px) { .related-grid { grid-template-columns: 1fr; } }
        .footer { background: #1a1a1a; color: #cccccc; padding: 56px 0 0; }
        .footer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; margin-bottom: 40px; }
        .footer-col h4 { color: var(--white); font-size: 14px; font-weight: 600; margin-bottom: 16px; letter-spacing: 0.3px; }
        .footer-col a { display: block; font-size: 13px; color: #999999; text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
        .footer-col a:hover { color: var(--white); }
        .footer-col p { font-size: 13px; color: #999999; line-height: 1.6; }
        .footer-bottom { border-top: 1px solid #333333; padding: 20px 0; text-align: center; font-size: 12px; color: #666666; }
        @media (max-width: 768px) { .footer-grid { grid-template-columns: repeat(2, 1fr); gap: 32px; } }
        @media (max-width: 480px) { .footer-grid { grid-template-columns: 1fr; } }
    </style>
    <script type="application/ld+json">
${JSON.stringify(schema, null, 4)}
    </script>
</head>
<body>
<header class="header">
    <div class="header-inner">
        <a href="/" class="header-logo"><img src="${LOGO}" alt="My Money Marketplace" width="180" height="32"></a>
        <nav class="header-nav">
            <a href="/credit-cards" class="header-link">Credit Cards</a>
            <a href="/personal-loans" class="header-link">Personal Loans</a>
            <a href="/business-loans" class="header-link">Business Loans</a>
            <a href="/savings" class="header-link">Savings</a>
            <a href="/business-loans" class="header-cta">Compare Rates</a>
            <button class="mobile-toggle" aria-label="Menu"><span></span><span></span><span></span></button>
        </nav>
    </div>
</header>
<nav class="breadcrumb" aria-label="Breadcrumb">
    <div class="container">
        <ol class="breadcrumb-list">${renderBreadcrumb(p.breadcrumb)}</ol>
    </div>
</nav>
<section class="hero">
    <div class="container">
        <h1>${esc(p.h1)}</h1>
        <p class="sub">${esc(p.heroSub)}</p>
    </div>
</section>
<section class="purpose-section">
    <div class="container">
        <h2>${esc(p.purposeHeading)}</h2>
        <div class="purpose-grid">${renderPurposeCards(p.purposeCards)}
        </div>
    </div>
</section>
<section class="lendmate-cta">
    <div class="container">
        <h2>${esc(p.ctaHeadline)}</h2>
        <p>${esc(p.ctaSub)}</p>
        <a href="${ctaUrl}" class="lendmate-btn">Check My Rate &rarr;</a>
        <p class="lendmate-micro">Soft credit check. Won't affect your credit score.</p>
    </div>
</section>
<section class="content-section">
    <div class="container-narrow">
        <h2>What to Know</h2>${renderContentSections(p.contentSections)}
    </div>
</section>
<section class="faq-section">
    <div class="container">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-list">${renderFaqs(p.faqs)}
        </div>
    </div>
</section>
<section class="related-section">
    <div class="container">
        <h2>Nearby Cities</h2>
        <div class="related-grid">${renderRelated(p.related)}
        </div>
    </div>
</section>
<footer class="footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-col"><h4>Products</h4><a href="/personal-loans">Personal Loans</a><a href="/business-loans">Business Loans</a><a href="/sba-loans">SBA Loans</a><a href="/credit-cards">Credit Cards</a><a href="/savings">Savings</a></div>
            <div class="footer-col"><h4>About</h4><p>My Money Marketplace helps consumers and small business owners compare financial products and get matched with lenders. We may receive compensation from partners when you click links on our site. We do not provide financial, legal, or tax advice.</p></div>
        </div>
    </div>
    <div class="footer-bottom"><div class="container">&copy; 2026 My Money Marketplace. All rights reserved.</div></div>
</footer>
</body>
</html>
`;
}

// ─────────── parasite extraction ───────────

function titleCaseSlug(slug) {
    return slug.split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

function extractFaqs(html) {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const b of blocks) {
        try {
            const data = JSON.parse(b[1]);
            const nodes = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
            for (const n of nodes) {
                if (n['@type'] === 'FAQPage' && Array.isArray(n.mainEntity)) {
                    return n.mainEntity
                        .filter(q => q['@type'] === 'Question' && q.acceptedAnswer && q.acceptedAnswer.text)
                        .map(q => ({ q: q.name, a: q.acceptedAnswer.text }));
                }
            }
        } catch (_) { /* skip */ }
    }
    return [];
}

// Decode HTML entities ONCE on extracted values so our own esc() in the
// renderer doesn't double-encode ("&amp;" -> "&amp;amp;"). See comment in
// generate-profession-pages.js.
function decodeEntities(s) {
    if (!s) return s;
    return s
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

function extractMeta(html, name) {
    const m = html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, 'i'));
    return m ? decodeEntities(m[1]) : '';
}

// ─────────── per-city templated content ───────────

function purposeCardsFor(cityDisplay, stateName) {
    return [
        { color: '#008254', title: 'Same-Day Decisions', text: `Pre-qualify in minutes and get funding for your ${cityDisplay} business as fast as 24 hours.` },
        { color: '#1a6bb0', title: 'SBA + Conventional', text: `${stateName} businesses can access SBA 7(a), 504, and microloans plus direct bank and online lender options.` },
        { color: '#c93a3a', title: 'No Hard Pull to Check', text: 'Soft-pull prequalification lets you see real rates without impacting your credit score.' },
        { color: '#e6850a', title: '$5K to $5M', text: `Loan sizes scale with your business revenue, from working-capital lines to term loans for ${cityDisplay} expansion.` }
    ];
}

function contentSectionsFor(cityDisplay, stateName) {
    return [
        {
            h3: `How ${cityDisplay} Businesses Access Capital`,
            p: `Small businesses in ${cityDisplay}, ${stateName} have multiple funding pathways. Traditional bank loans work for established businesses with 2+ years of financials and 680+ credit. SBA loans offer lower rates and longer terms but take 30-90 days. Online and alternative lenders approve in 24-72 hours with more flexible credit requirements, trading speed for slightly higher APR. The right fit depends on your time-in-business, revenue, and how fast you need the money.`
        },
        {
            h3: 'Documents to Have Ready Before You Apply',
            p: 'Most lenders want: 3-6 months of business bank statements, the two most recent business tax returns, a current profit-and-loss statement, proof of business registration or articles of incorporation, a voided business check, and a photo ID for the signer. Having these uploaded before the application starts cuts the time-to-funding by several business days.'
        },
        {
            h3: 'What to Look For Beyond the Headline Rate',
            p: 'Advertised APRs are only part of the cost. Always check: origination fees (typically 1-5% of the loan amount, built into APR on a true-APR quote), prepayment penalties (can trap you if you want to pay off early), daily or weekly repayment schedules (which compress cash flow), and personal guarantee requirements (standard for most small-business loans under $250K). A higher APR with no prepayment penalty is often cheaper than a lower APR with a 2% prepayment fee.'
        }
    ];
}

// ─────────── parse filename + state grouping ───────────

function parseFilename(f) {
    const m = f.match(/^business-loans-(.+)-([a-z]{2})\.html$/);
    if (!m) return null;
    return { citySlug: m[1], stateAbbr: m[2].toUpperCase() };
}

function relatedFor(slug, stateAbbr, allByState) {
    // 3 nearest siblings in same state; fall back to neighbors in adjacent
    // states alphabetically if the state has fewer than 4 pages.
    const sameState = (allByState[stateAbbr] || []).filter(s => s !== slug);
    const picks = sameState.slice(0, 3);
    if (picks.length < 3) {
        // flat list of every other city across states, alphabetical
        const fallback = Object.keys(allByState)
            .filter(st => st !== stateAbbr)
            .flatMap(st => allByState[st])
            .filter(s => !picks.includes(s) && s !== slug);
        while (picks.length < 3 && fallback.length) picks.push(fallback.shift());
    }
    return picks.slice(0, 3).map(s => {
        // s is the full "city-state" slug like "austin-tx"
        const m = s.match(/^(.+)-([a-z]{2})$/);
        if (!m) return null;
        const cityDisplay = titleCaseSlug(m[1]);
        const stAbbr = m[2].toUpperCase();
        return {
            title: `${cityDisplay}, ${stAbbr}`,
            url: `/business-loans/${s}`,
            sub: 'Get Funding'
        };
    }).filter(Boolean);
}

// ─────────── main ───────────

const files = fs.readdirSync(SEO_PAGES)
    .filter(f => /^business-loans-[a-z-]+-[a-z]{2}\.html$/.test(f));

console.log(`Discovered ${files.length} city parasites`);

// Load inline Tier-1 cities (cities missing from the parasite set — LA, NYC, SF,
// Fort Worth, DC, Boston, Detroit, OKC, Oakland, Cleveland, Tulsa, El Paso). These
// supply the same (citySlug, stateAbbr, metaDesc, faqs) shape as parasite
// extraction, sourced from data/tier1-cities.json so the generator doesn't need
// a parasite HTML file for each one. See data/city-coverage-audit.md for the
// discovery context.
const TIER1_PATH = path.join(ROOT, 'data', 'tier1-cities.json');
const inlineCities = fs.existsSync(TIER1_PATH)
    ? JSON.parse(fs.readFileSync(TIER1_PATH, 'utf8')).cities || []
    : [];
console.log(`Inline Tier-1 cities: ${inlineCities.length}`);

// Build state grouping first for the related-links resolver
const byState = {};
const parsedFiles = [];
for (const f of files) {
    const parsed = parseFilename(f);
    if (!parsed) continue;
    const slug = `${parsed.citySlug}-${parsed.stateAbbr.toLowerCase()}`;
    parsedFiles.push({ file: f, slug, ...parsed });
    byState[parsed.stateAbbr] = byState[parsed.stateAbbr] || [];
    byState[parsed.stateAbbr].push(slug);
}
// Add inline Tier-1 cities to byState so the related-links resolver picks them up
// (both directions: existing cities link to new ones and vice versa).
for (const c of inlineCities) {
    const slug = `${c.citySlug}-${c.stateAbbr.toLowerCase()}`;
    byState[c.stateAbbr] = byState[c.stateAbbr] || [];
    if (!byState[c.stateAbbr].includes(slug)) byState[c.stateAbbr].push(slug);
}
for (const st of Object.keys(byState)) byState[st].sort();

const pages = [];
const errors = [];
for (const p of parsedFiles) {
    const html = fs.readFileSync(path.join(SEO_PAGES, p.file), 'utf8');
    const metaDescRaw = extractMeta(html, 'description');
    const faqs = extractFaqs(html);
    if (faqs.length === 0) {
        errors.push({ file: p.file, reason: 'no FAQs extracted' });
        continue;
    }
    const cityDisplay = titleCaseSlug(p.citySlug);
    const stateName = STATE_NAMES[p.stateAbbr] || p.stateAbbr;
    const metaDesc = metaDescRaw || `Compare business loans in ${cityDisplay}, ${p.stateAbbr}. $5K-$5M funding with same-day approval and soft-pull rate checks.`;

    pages.push({
        slug: `business-loans/${p.slug}`,
        title: `Business Loans in ${cityDisplay}, ${p.stateAbbr} 2026 | My Money Marketplace`,
        metaDesc,
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Business Loans', url: '/business-loans' },
            { name: `${cityDisplay}, ${p.stateAbbr}`, url: `/business-loans/${p.slug}` }
        ],
        h1: `Business Loans in ${cityDisplay}, ${p.stateAbbr}`,
        heroSub: `Funding options for small businesses across ${cityDisplay} and ${stateName}, from SBA loans to same-day working capital.`,
        articleHeadline: `Business Loans in ${cityDisplay}, ${p.stateAbbr} 2026`,
        ctaUtm: `business-loans-${p.slug}-apex`,
        ctaHeadline: `Need Funding for Your ${cityDisplay} Business?`,
        ctaSub: `Lendmate Capital offers same-day decisions and funding in 24 hours for businesses across ${stateName}. Soft-pull rate check.`,
        purposeHeading: `Why ${cityDisplay} Business Owners Compare Here`,
        purposeCards: purposeCardsFor(cityDisplay, stateName),
        contentSections: contentSectionsFor(cityDisplay, stateName),
        faqs,
        related: relatedFor(p.slug, p.stateAbbr, byState),
        cityDisplay,
        stateName,
        _sourceFile: p.file
    });
}
// Process inline Tier-1 cities with the same template pipeline as parasite-sourced cities.
for (const c of inlineCities) {
    const citySlug = c.citySlug;
    const stateAbbr = c.stateAbbr.toUpperCase();
    const slug = `${citySlug}-${stateAbbr.toLowerCase()}`;
    const cityDisplay = titleCaseSlug(citySlug);
    const stateName = STATE_NAMES[stateAbbr] || stateAbbr;
    const metaDesc = c.metaDesc || `Compare business loans in ${cityDisplay}, ${stateAbbr}. $5K-$5M funding with same-day approval and soft-pull rate checks.`;
    const faqs = c.faqs || [];
    if (faqs.length === 0) {
        errors.push({ file: `tier1-cities.json[${slug}]`, reason: 'no FAQs in inline data' });
        continue;
    }
    pages.push({
        slug: `business-loans/${slug}`,
        title: `Business Loans in ${cityDisplay}, ${stateAbbr} 2026 | My Money Marketplace`,
        metaDesc,
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Business Loans', url: '/business-loans' },
            { name: `${cityDisplay}, ${stateAbbr}`, url: `/business-loans/${slug}` }
        ],
        h1: `Business Loans in ${cityDisplay}, ${stateAbbr}`,
        heroSub: `Funding options for small businesses across ${cityDisplay} and ${stateName}, from SBA loans to same-day working capital.`,
        articleHeadline: `Business Loans in ${cityDisplay}, ${stateAbbr} 2026`,
        ctaUtm: `business-loans-${slug}-apex`,
        ctaHeadline: `Need Funding for Your ${cityDisplay} Business?`,
        ctaSub: `Lendmate Capital offers same-day decisions and funding in 24 hours for businesses across ${stateName}. Soft-pull rate check.`,
        purposeHeading: `Why ${cityDisplay} Business Owners Compare Here`,
        purposeCards: purposeCardsFor(cityDisplay, stateName),
        contentSections: contentSectionsFor(cityDisplay, stateName),
        faqs,
        related: relatedFor(slug, stateAbbr, byState),
        cityDisplay,
        stateName,
        _sourceFile: `tier1-cities.json[${slug}]`
    });
}

console.log(`Built page data for ${pages.length}, ${errors.length} error(s)`);
if (errors.length) for (const e of errors) console.log(`  SKIP: ${e.file} (${e.reason})`);

// ─────────── write ───────────

let written = 0;
for (const p of pages) {
    const dir = path.join(ROOT, p.slug);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'index.html');
    fs.writeFileSync(file, buildPage(p), 'utf8');
    written++;
}
console.log(`Wrote ${written} city pages`);

// ─────────── sitemap ───────────

const sitemapPath = path.join(ROOT, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
let added = 0;
const newEntries = pages.map(p => {
    const loc = `https://mymoneymarketplace.com/${p.slug}`;
    if (sitemap.includes(loc)) return '';
    added++;
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>`;
}).filter(Boolean).join('\n');
if (added > 0) {
    sitemap = sitemap.replace('</urlset>', newEntries + '\n</urlset>');
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
}
console.log(`Sitemap entries added: ${added}`);
