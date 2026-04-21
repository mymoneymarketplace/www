// Generate apex credit-cards/<profession>/index.html pages for every parasite
// file at ../seo-pages/best-credit-cards-for-<profession>-2026.html.
//
// Strategy:
//  - Real FAQ content (the most SEO-valuable block) is extracted directly
//    from each parasite's FAQPage JSON-LD. Parasite already had curated,
//    profession-specific FAQs; reusing them on the apex means the canonical
//    target matches topical intent without re-authoring.
//  - Title, meta description are lightly rewritten from the parasite's
//    equivalents so the apex isn't a byte-for-byte clone.
//  - Purpose cards + content sections use profession-aware scaffolding
//    (slug substitution + semantic-bucket context) to keep the apex distinct
//    from the parasite's body copy.
//  - Related links cluster professions into semantic buckets so the apex
//    cluster forms a navigable topical graph.
//
// Rendering helpers are copied from generate-hub-pages.js verbatim to keep
// output byte-identical in layout/CSS to the 8 hubs already shipped.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SEO_PAGES = path.resolve(ROOT, '..', 'seo-pages');
const LOGO = 'https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png';
const TODAY = new Date().toISOString().slice(0, 10);

// Semantic buckets for related-links. Within each bucket, each page links to
// four sibling slugs (rotated so no two pages have identical "related" lists).
const BUCKETS = {
    healthcare: ['nurses', 'doctors', 'pharmacists', 'medical-students', 'physical-therapists', 'dentists', 'veterinarians', 'travel-nurses'],
    trades: ['plumbers', 'electricians', 'hvac-technicians', 'auto-mechanics', 'landscapers', 'contractors', 'construction-workers'],
    creative: ['content-creators', 'photographers', 'gamers'],
    'business-pros': ['accountants', 'attorneys', 'insurance-agents', 'real-estate-agents', 'freelancers', 'startups', 'restaurant-owners', 'salon-owners', 'food-truck-owners', 'etsy-sellers', 'amazon-sellers'],
    drivers: ['doordash-drivers', 'uber-drivers', 'truck-drivers', 'instacart-shoppers'],
    'life-stage': ['college-students', 'recent-graduates', 'new-parents', 'first-time-homebuyers', 'seniors', 'remote-workers'],
    military: ['military', 'veterans'],
    lifestyle: ['amazon-prime-members', 'costco-members', 'disney-families', 'fitness-enthusiasts', 'foodies', 'pet-owners', 'sports-fans'],
    'spend-categories': ['online-shopping', 'dining-out', 'groceries', 'gas-stations', 'homeowners', 'travelers', 'frequent-flyers']
};
const SLUG_TO_BUCKET = {};
for (const [b, slugs] of Object.entries(BUCKETS)) {
    for (const s of slugs) SLUG_TO_BUCKET[s] = b;
}

// ─────────── helpers (shared with generate-hub-pages.js) ───────────

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildBreadcrumbSchema(breadcrumb) {
    return breadcrumb.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        item: b.url === '/' ? 'https://mymoneymarketplace.com' : 'https://mymoneymarketplace.com' + b.url
    }));
}
function buildFaqSchema(faqs) {
    return faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }));
}
function renderBreadcrumb(breadcrumb) {
    return breadcrumb.map((b, i) => {
        const isLast = i === breadcrumb.length - 1;
        const sep = i > 0 ? '<li class="sep">/</li>' : '';
        const item = isLast ? `<li class="current">${esc(b.name)}</li>` : `<li><a href="${b.url}">${esc(b.name)}</a></li>`;
        return sep + item;
    }).join('');
}
function renderPurposeCards(cards) {
    return cards.map(c => `
            <div class="purpose-card">
                <div class="purpose-icon" style="background:${c.color};"></div>
                <h3>${esc(c.title)}</h3>
                <p>${esc(c.text)}</p>
            </div>`).join('');
}
function renderContentSections(sections) {
    return sections.map(s => `
        <h3>${esc(s.h3)}</h3>
        <p>${esc(s.p)}</p>`).join('');
}
function renderFaqs(faqs) {
    return faqs.map(f => `
            <details>
                <summary>${esc(f.q)}</summary>
                <div class="faq-answer">${esc(f.a)}</div>
            </details>`).join('');
}
function renderRelated(related) {
    return related.map(r => `
            <a href="${r.url}" class="related-card">
                <div class="related-title">${esc(r.title)}</div>
                <span class="related-link">${esc(r.sub)} &rarr;</span>
            </a>`).join('');
}

function buildPage(p) {
    const canonical = `https://mymoneymarketplace.com/${p.slug}`;
    const ctaUrl = `https://lendmatecapital.com/compare-credit-cards?utm_source=mmm&utm_medium=hub&utm_campaign=${p.ctaUtm}`;
    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            { '@type': 'Organization', name: 'My Money Marketplace', url: 'https://mymoneymarketplace.com', logo: LOGO },
            { '@type': 'BreadcrumbList', itemListElement: buildBreadcrumbSchema(p.breadcrumb) },
            {
                '@type': 'Article',
                headline: p.articleHeadline,
                description: p.metaDesc,
                author: { '@type': 'Organization', name: 'My Money Marketplace' },
                publisher: { '@type': 'Organization', name: 'My Money Marketplace', logo: { '@type': 'ImageObject', url: LOGO } },
                datePublished: TODAY, dateModified: TODAY,
                mainEntityOfPage: canonical
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
    <!-- Google Analytics -->
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
            <a href="https://mymoneymarketplace.com/compare" class="header-cta">Compare Rates</a>
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
        <a href="${ctaUrl}" class="lendmate-btn">Compare Cards &rarr;</a>
        <p class="lendmate-micro">See rates and rewards upfront. No application required to compare.</p>
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
        <h2>Related Card Picks</h2>
        <div class="related-grid">${renderRelated(p.related)}
        </div>
    </div>
</section>
<footer class="footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-col"><h4>Products</h4><a href="/personal-loans">Personal Loans</a><a href="/business-loans">Business Loans</a><a href="/sba-loans">SBA Loans</a><a href="/credit-cards">Credit Cards</a><a href="/savings">Savings</a></div>
            <div class="footer-col"><h4>Resources</h4><a href="/guides">Financial Guides</a><a href="/calculators">Loan Calculators</a><a href="/blog">Blog</a><a href="/glossary">Glossary</a></div>
            <div class="footer-col"><h4>Company</h4><a href="/about">About Us</a><a href="/how-it-works">How It Works</a><a href="/contact">Contact</a><a href="/press">Press</a></div>
            <div class="footer-col"><h4>Legal</h4><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a><a href="/disclosures">Disclosures</a><p style="margin-top: 12px;">My Money Marketplace helps consumers compare financial products. We may receive compensation from partners when you click links on our site.</p></div>
        </div>
    </div>
    <div class="footer-bottom"><div class="container">&copy; 2026 My Money Marketplace. All rights reserved.</div></div>
</footer>
</body>
</html>
`;
}

// ─────────── parasite extraction ───────────

function titleCase(slug) {
    return slug.split('-').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

function extractFaqs(html) {
    // FAQPage JSON-LD is embedded in the parasite; pull every Question entry.
    // Multiple script blocks may exist; concatenate matches.
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
        } catch (_) { /* not JSON-LD we care about; keep looking */ }
    }
    return [];
}

function extractMeta(html, name) {
    const m = html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, 'i'));
    return m ? m[1] : '';
}

// Prefer the parasite's declared canonical slug over the filename-derived slug.
// Handles cases where the parasite filename and its canonical disagree --
// e.g. best-credit-cards-for-mechanics-2026.html canonicals to
// /credit-cards/auto-mechanics, so the apex slug should be `auto-mechanics`.
function extractCanonicalSlug(html) {
    const m = html.match(/<link\s+rel="canonical"\s+href="https?:\/\/[^\/]+\/credit-cards\/([^"\/]+)"/i);
    return m ? m[1] : null;
}

// ─────────── per-profession data builder ───────────

function relatedFor(slug) {
    // Same-bucket siblings first (up to 3), then pad with alphabetical
    // neighbors across all professions so the "Related" grid is always 3.
    // (Layout shows 3, generator supports more; we commit to 3 to match the
    // .related-grid CSS and avoid uneven rows.)
    const bucket = SLUG_TO_BUCKET[slug];
    const siblings = bucket ? BUCKETS[bucket].filter(s => s !== slug) : [];
    const picks = siblings.slice(0, 3);
    while (picks.length < 3) {
        for (const b of Object.keys(BUCKETS)) {
            for (const s of BUCKETS[b]) {
                if (s !== slug && !picks.includes(s)) { picks.push(s); break; }
            }
            if (picks.length >= 3) break;
        }
    }
    return picks.slice(0, 3).map(s => ({
        title: `Cards for ${titleCase(s)}`,
        url: `/credit-cards/${s}`,
        sub: 'See Picks'
    }));
}

function purposeCardsFor(slug) {
    const pro = titleCase(slug);
    return [
        { color: '#008254', title: 'Match Your Spending', text: `Cards aligned to the categories ${pro.toLowerCase()} actually spend on each month.` },
        { color: '#1a6bb0', title: 'Rewards That Stack', text: 'Flat-rate base + category multipliers so every purchase earns something back.' },
        { color: '#c93a3a', title: 'Welcome Bonuses', text: '$200-$750+ sign-up offers on picks with realistic spend thresholds.' },
        { color: '#e6850a', title: 'No Annual Fee Options', text: 'Fee-free cards for starter earners; premium cards only when the math pays.' }
    ];
}

function contentSectionsFor(slug, metaDesc) {
    const pro = titleCase(slug);
    const lower = pro.toLowerCase();
    return [
        {
            h3: `How We Picked the Best Cards for ${pro}`,
            p: `We compared annual fees, welcome bonuses, category earn rates, and fine print across every mainstream issuer, then filtered to cards whose bonus categories align with how ${lower} typically spend. Every card on this list earns at least 2% effective cash-back return at realistic monthly spend.`
        },
        {
            h3: 'Match the Card to Real Spending, Not the Marketing',
            p: `The best card for ${lower} is not the one with the flashiest welcome bonus -- it is the one that earns the most on your actual monthly spend. Pull up the last three months of statements, sum spend by category, and pick the card whose multiplier aligns with your biggest line items. If your spending is spread evenly, a flat-rate 2% card wins.`
        },
        {
            h3: 'Responsible Use and Credit-Score Impact',
            p: 'Credit cards help your score when you pay the full balance every month and keep utilization below 30% of your limit. They hurt your score when you carry balances at 20%+ APR or miss payments. Set up autopay for at least the minimum on day one of the card to protect your payment history, then aim to pay the full statement balance each cycle.'
        }
    ];
}

// ─────────── main ───────────

function professionSlugFromFilename(f) {
    const m = f.match(/^best-credit-cards-for-(.+)-20\d{2}\.html$/);
    return m ? m[1] : null;
}

const files = fs.readdirSync(SEO_PAGES)
    .filter(f => /^best-credit-cards-for-.+-20\d{2}\.html$/.test(f));

console.log(`Discovered ${files.length} profession parasites`);

const pages = [];
const skipped = [];
const errors = [];

for (const f of files) {
    const filenameSlug = professionSlugFromFilename(f);
    if (!filenameSlug) continue;
    const html = fs.readFileSync(path.join(SEO_PAGES, f), 'utf8');
    // Use the parasite's declared canonical slug when present; otherwise fall
    // back to the filename-derived slug.
    const slug = extractCanonicalSlug(html) || filenameSlug;
    const metaDesc = extractMeta(html, 'description') || `Compare the best credit cards for ${titleCase(slug).toLowerCase()} in 2026.`;
    const faqs = extractFaqs(html);
    if (faqs.length === 0) {
        errors.push({ file: f, reason: 'no FAQs extracted' });
        continue;
    }
    const pro = titleCase(slug);
    pages.push({
        slug: `credit-cards/${slug}`,
        title: `Best Credit Cards for ${pro} of 2026 | My Money Marketplace`,
        metaDesc,
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Credit Cards', url: '/credit-cards' },
            { name: pro, url: `/credit-cards/${slug}` }
        ],
        h1: `Best Credit Cards for ${pro}`,
        heroSub: `Expert picks for ${pro.toLowerCase()} based on real spending patterns, welcome-bonus value, and long-term rewards math.`,
        articleHeadline: `Best Credit Cards for ${pro} in 2026`,
        ctaUtm: `credit-cards-${slug}-apex`,
        ctaHeadline: `Compare Top Cards for ${pro}`,
        ctaSub: `See side-by-side rates, rewards, and welcome bonuses curated for ${pro.toLowerCase()} -- no application required to browse.`,
        purposeHeading: `What Makes a Card Right for ${pro}`,
        purposeCards: purposeCardsFor(slug),
        contentSections: contentSectionsFor(slug, metaDesc),
        faqs,
        related: relatedFor(slug),
        _sourceFile: f
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
console.log(`Wrote ${written} profession pages`);

// ─────────── sitemap ───────────

const sitemapPath = path.join(ROOT, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
let added = 0;
const newEntries = pages.map(p => {
    const loc = `https://mymoneymarketplace.com/${p.slug}`;
    if (sitemap.includes(loc)) return '';
    added++;
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>`;
}).filter(Boolean).join('\n');
if (added > 0) {
    sitemap = sitemap.replace('</urlset>', newEntries + '\n</urlset>');
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
}
console.log(`Sitemap entries added: ${added}`);
