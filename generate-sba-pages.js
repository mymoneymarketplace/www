// Flagship SBA-scenario page generator.
//
// Reuses the rendering shell (header/footer/breadcrumb/CSS tokens) from the
// existing apex generators so layout and branding stay byte-identical to the
// 257 pages already shipped. Adds three new sections beyond the existing
// template:
//   1. Interactive client-side qualification quiz with 4 result profiles
//   2. "SBA programs that fit this scenario" 3-card block
//   3. Numbered step-by-step process block
// And one additional schema block: FinancialService.
//
// Driven by a SCENARIOS array so scaling to 12+ sibling pages is adding
// entries, not touching the renderer. Only scenario #1 (startups) is
// defined here; siblings land in follow-up commits.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LOGO = 'https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png';
const TODAY = new Date().toISOString().slice(0, 10);

// ─────────── shared helpers (same as other apex generators) ───────────

function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildBreadcrumbSchema(bc) {
    return bc.map((b, i) => ({
        '@type': 'ListItem', position: i + 1, name: b.name,
        item: b.url === '/' ? 'https://mymoneymarketplace.com' : 'https://mymoneymarketplace.com' + b.url
    }));
}

function buildFaqSchema(faqs) {
    return faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } }));
}

function renderBreadcrumb(bc) {
    return bc.map((b, i) => {
        const isLast = i === bc.length - 1;
        const sep = i > 0 ? '<li class="sep">/</li>' : '';
        return sep + (isLast ? `<li class="current">${esc(b.name)}</li>` : `<li><a href="${b.url}">${esc(b.name)}</a></li>`);
    }).join('');
}

function renderFaqs(faqs) {
    return faqs.map(f => `
            <details>
                <summary>${esc(f.q)}</summary>
                <div class="faq-answer">${esc(f.a)}</div>
            </details>`).join('');
}

// ─────────── SBA-specific render helpers ───────────

function renderQuizHtml(quiz) {
    const questions = quiz.questions.map((q, qi) => `
                <div class="quiz-question" data-q="${qi}"${qi === 0 ? '' : ' style="display:none"'}>
                    <h3>${esc(q.prompt)}</h3>
                    <div class="quiz-options">
${q.options.map(o => `                        <button type="button" class="quiz-option" data-value="${esc(o.value)}">${esc(o.label)}</button>`).join('\n')}
                    </div>
                </div>`).join('');

    return `
        <div class="quiz-card" id="quizCard">
            <div class="quiz-progress" id="quizProgress">
                <span class="quiz-step-label">Question <span id="quizCurrent">1</span> of ${quiz.questions.length}</span>
                <div class="quiz-bar"><div class="quiz-bar-fill" id="quizBar" style="width:${(100 / quiz.questions.length).toFixed(1)}%"></div></div>
            </div>
            <div id="quizQuestions">${questions}
            </div>
            <div id="quizResult" style="display:none" aria-live="polite">
                <div class="quiz-result-badge" id="resultBadge"></div>
                <h3 id="resultHeadline"></h3>
                <p id="resultBody"></p>
                <ul id="resultBullets" class="quiz-result-bullets"></ul>
                <a id="resultCta" class="quiz-cta-btn" href="#" rel="nofollow sponsored">Get matched with lenders in 2 minutes at Lendmate &rarr;</a>
                <button type="button" class="quiz-retake" id="quizRetake">Start over</button>
            </div>
        </div>`;
}

function renderProgramCards(cards) {
    return cards.map(c => `
            <div class="program-card">
                <div class="program-badge">${esc(c.badge)}</div>
                <h3>${esc(c.name)}</h3>
                <dl class="program-specs">
                    <div><dt>Max amount</dt><dd>${esc(c.amount)}</dd></div>
                    <div><dt>Typical timeline</dt><dd>${esc(c.timeline)}</dd></div>
                    <div><dt>Minimum credit</dt><dd>${esc(c.minCredit)}</dd></div>
                </dl>
                <p class="program-fit"><strong>Right for you if:</strong> ${esc(c.fit)}</p>
            </div>`).join('');
}

function renderLongForm(sections) {
    return sections.map(s => `
        <h3>${esc(s.h3)}</h3>
${s.p.map(p => `        <p>${esc(p)}</p>`).join('\n')}`).join('');
}

function renderSteps(steps) {
    return steps.map((s, i) => `
            <li class="process-step">
                <span class="process-num">${i + 1}</span>
                <div class="process-copy">
                    <h4>${esc(s.title)}</h4>
                    <p>${esc(s.text)}</p>
                </div>
            </li>`).join('');
}

// ─────────── page shell ───────────

function buildPage(p) {
    const canonical = `https://mymoneymarketplace.com/${p.slug}`;
    const heroCtaAnchor = '#quiz';

    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                name: 'My Money Marketplace',
                url: 'https://mymoneymarketplace.com',
                logo: LOGO
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: buildBreadcrumbSchema(p.breadcrumb)
            },
            {
                '@type': 'Article',
                headline: p.articleHeadline,
                description: p.metaDesc,
                author: { '@type': 'Organization', name: 'My Money Marketplace' },
                publisher: { '@type': 'Organization', name: 'My Money Marketplace', logo: { '@type': 'ImageObject', url: LOGO } },
                datePublished: TODAY,
                dateModified: TODAY,
                mainEntityOfPage: canonical
            },
            {
                '@type': 'FinancialService',
                name: p.financialService.name,
                serviceType: p.financialService.serviceType,
                description: p.financialService.description,
                areaServed: { '@type': 'Country', name: 'United States' },
                provider: { '@type': 'Organization', name: 'My Money Marketplace', url: 'https://mymoneymarketplace.com' }
            },
            {
                '@type': 'FAQPage',
                mainEntity: buildFaqSchema(p.faqs)
            }
        ]
    };

    // Quiz result profiles are serialized into the inline JS so scoring +
    // content + UTM all live in one place and are scenario-specific.
    const profilesJs = JSON.stringify(p.quiz.resultProfiles);
    const scoringJs = p.quiz.scoringFn; // serialized function body as string

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
        :root { --green: #008254; --green-dark: #006b45; --green-bg: #f0faf5; --text: #111111; --text-secondary: #444444; --text-muted: #717171; --border: #e2e2e2; --bg-light: #f7f7f7; --white: #ffffff; --amber: #f5a623; --red: #d94141; --navy: #1a3a5c; }
        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: var(--text); background: var(--white); line-height: 1.7; -webkit-font-smoothing: antialiased; }

        /* Header */
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

        /* Breadcrumb */
        .breadcrumb { padding: 16px 0; margin-top: 64px; background: var(--bg-light); border-bottom: 1px solid var(--border); }
        .breadcrumb-list { display: flex; align-items: center; gap: 8px; list-style: none; font-size: 13px; flex-wrap: wrap; }
        .breadcrumb-list a { color: var(--text-muted); text-decoration: none; }
        .breadcrumb-list a:hover { color: var(--green); }
        .breadcrumb-list .sep { color: var(--text-muted); }
        .breadcrumb-list .current { color: var(--text-secondary); font-weight: 500; }

        /* Hero */
        .hero { padding: 56px 0 48px; text-align: center; background: var(--white); }
        .hero h1 { font-size: clamp(30px, 4.2vw, 42px); font-weight: 700; color: var(--text); line-height: 1.2; margin-bottom: 14px; }
        .hero .sub { font-size: 17px; color: var(--text-secondary); max-width: 640px; margin: 0 auto 28px; line-height: 1.6; }
        .hero-cta { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; transition: background 0.2s, transform 0.2s; }
        .hero-cta:hover { background: var(--green-dark); transform: translateY(-1px); }

        /* Quiz */
        .quiz { padding: 48px 0 64px; background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .quiz h2 { font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 8px; text-align: center; }
        .quiz-intro { text-align: center; color: var(--text-secondary); font-size: 15px; margin-bottom: 28px; }
        .quiz-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 32px; max-width: 680px; margin: 0 auto; }
        .quiz-progress { margin-bottom: 24px; }
        .quiz-step-label { display: block; font-size: 13px; color: var(--text-muted); font-weight: 500; margin-bottom: 8px; }
        .quiz-bar { height: 6px; background: var(--bg-light); border-radius: 3px; overflow: hidden; }
        .quiz-bar-fill { height: 100%; background: var(--green); transition: width 0.3s ease; }
        .quiz-question h3 { font-size: 19px; font-weight: 600; color: var(--text); margin-bottom: 20px; line-height: 1.35; }
        .quiz-options { display: flex; flex-direction: column; gap: 10px; }
        .quiz-option { text-align: left; font-family: inherit; font-size: 15px; padding: 14px 18px; border: 1px solid var(--border); border-radius: 8px; background: var(--white); color: var(--text); cursor: pointer; transition: border-color 0.15s, background 0.15s; }
        .quiz-option:hover { border-color: var(--green); background: var(--green-bg); }
        .quiz-option:focus { outline: 2px solid var(--green); outline-offset: 2px; }
        .quiz-result-badge { display: inline-block; padding: 4px 12px; background: var(--green-bg); color: var(--green); font-size: 12px; font-weight: 600; border-radius: 12px; letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 12px; }
        #resultHeadline { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
        #resultBody { font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 18px; }
        .quiz-result-bullets { list-style: none; padding: 0; margin: 0 0 24px; }
        .quiz-result-bullets li { font-size: 14px; color: var(--text-secondary); padding: 6px 0 6px 22px; position: relative; line-height: 1.55; }
        .quiz-result-bullets li::before { content: '\u2713'; color: var(--green); position: absolute; left: 0; top: 6px; font-weight: 700; }
        .quiz-cta-btn { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 14px 28px; border-radius: 8px; text-decoration: none; transition: background 0.2s; }
        .quiz-cta-btn:hover { background: var(--green-dark); }
        .quiz-retake { display: block; margin-top: 14px; background: none; border: none; color: var(--text-muted); font-size: 13px; font-family: inherit; cursor: pointer; text-decoration: underline; }
        .quiz-retake:hover { color: var(--text); }

        /* Programs 3-card block */
        .programs { padding: 64px 0; }
        .programs h2 { font-size: 26px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 12px; }
        .programs-sub { text-align: center; color: var(--text-secondary); font-size: 15px; max-width: 640px; margin: 0 auto 36px; }
        .programs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .program-card { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 24px; }
        .program-badge { display: inline-block; padding: 3px 10px; background: var(--navy); color: var(--white); font-size: 11px; font-weight: 600; border-radius: 4px; letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 14px; }
        .program-card h3 { font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 14px; line-height: 1.3; }
        .program-specs { margin: 0 0 14px; }
        .program-specs > div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--bg-light); font-size: 13px; }
        .program-specs > div:last-child { border-bottom: 0; }
        .program-specs dt { color: var(--text-muted); }
        .program-specs dd { color: var(--text); font-weight: 600; text-align: right; }
        .program-fit { font-size: 13px; color: var(--text-secondary); line-height: 1.55; }
        .program-fit strong { color: var(--text); }
        @media (max-width: 900px) { .programs-grid { grid-template-columns: 1fr; } }

        /* Long-form eligibility */
        .eligibility { padding: 64px 0; background: var(--bg-light); border-top: 1px solid var(--border); }
        .eligibility h2 { font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 24px; text-align: center; }
        .eligibility h3 { font-size: 19px; font-weight: 600; color: var(--text); margin: 28px 0 10px; }
        .eligibility p { font-size: 15px; color: var(--text-secondary); line-height: 1.75; margin-bottom: 14px; }
        .eligibility a { color: var(--green); font-weight: 500; text-decoration: underline; }

        /* Process steps */
        .process { padding: 64px 0; }
        .process h2 { font-size: 26px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 10px; }
        .process-intro { text-align: center; color: var(--text-secondary); font-size: 15px; margin-bottom: 32px; }
        .process-list { list-style: none; padding: 0; max-width: 760px; margin: 0 auto; }
        .process-step { display: flex; gap: 18px; padding: 16px 0; border-bottom: 1px solid var(--border); }
        .process-step:last-child { border-bottom: 0; }
        .process-num { flex-shrink: 0; width: 36px; height: 36px; background: var(--green); color: var(--white); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; }
        .process-copy h4 { font-size: 16px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
        .process-copy p { font-size: 14px; color: var(--text-secondary); line-height: 1.6; }

        /* FAQ */
        .faq-section { padding: 56px 0; background: var(--bg-light); border-top: 1px solid var(--border); }
        .faq-section h2 { font-size: 26px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 32px; }
        .faq-list { max-width: 760px; margin: 0 auto; }
        details { border: 1px solid var(--border); border-radius: 8px; background: var(--white); margin-bottom: 10px; overflow: hidden; }
        details summary { padding: 16px 20px; font-size: 15px; font-weight: 600; color: var(--text); cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; }
        details summary::-webkit-details-marker { display: none; }
        details summary::after { content: '+'; font-size: 20px; font-weight: 400; color: var(--text-muted); flex-shrink: 0; margin-left: 12px; }
        details[open] summary::after { content: '-'; }
        details .faq-answer { padding: 0 20px 18px; font-size: 14px; color: var(--text-secondary); line-height: 1.75; }

        /* Closing CTA */
        .closing-cta { padding: 64px 0; background: var(--navy); text-align: center; }
        .closing-cta h2 { font-size: 28px; font-weight: 700; color: var(--white); margin-bottom: 14px; }
        .closing-cta p { font-size: 16px; color: rgba(255,255,255,0.75); max-width: 600px; margin: 0 auto 28px; line-height: 1.6; }
        .closing-cta-btn { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 16px 36px; border-radius: 8px; text-decoration: none; transition: background 0.2s, transform 0.2s; }
        .closing-cta-btn:hover { background: var(--green-dark); transform: translateY(-1px); }
        .closing-cta-micro { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 14px; }

        /* Footer */
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
        <a href="${heroCtaAnchor}" class="hero-cta">${esc(p.heroCtaLabel)}</a>
    </div>
</section>

<section class="quiz" id="quiz">
    <div class="container-narrow">
        <h2>${esc(p.quiz.heading)}</h2>
        <p class="quiz-intro">${esc(p.quiz.intro)}</p>
        ${renderQuizHtml(p.quiz)}
    </div>
</section>

<section class="programs">
    <div class="container">
        <h2>${esc(p.programs.heading)}</h2>
        <p class="programs-sub">${esc(p.programs.intro)}</p>
        <div class="programs-grid">${renderProgramCards(p.programs.cards)}
        </div>
    </div>
</section>

<section class="eligibility">
    <div class="container-narrow">
        <h2>${esc(p.eligibility.heading)}</h2>${renderLongForm(p.eligibility.sections)}
    </div>
</section>

<section class="process">
    <div class="container">
        <h2>${esc(p.process.heading)}</h2>
        <p class="process-intro">${esc(p.process.intro)}</p>
        <ol class="process-list">${renderSteps(p.process.steps)}
        </ol>
    </div>
</section>

<section class="faq-section" id="faq">
    <div class="container">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-list">${renderFaqs(p.faqs)}
        </div>
    </div>
</section>

<!--
    TODO: once Angle 2 sibling pages ship
    (/sba-loans/women-owned, /sba-loans/veterans, /sba-loans/minority-owned,
     etc.), populate a related-products grid here with 3 scenarios + the
    /sba-loans hub. Left empty deliberately for scenario #1.
-->

<section class="closing-cta">
    <div class="container">
        <h2>${esc(p.closingCta.heading)}</h2>
        <p>${p.closingCta.bodyHtml}</p>
        <a href="https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=${p.closingCta.utmCampaign}" class="closing-cta-btn" rel="nofollow sponsored">${esc(p.closingCta.buttonLabel)} &rarr;</a>
        <p class="closing-cta-micro">Soft credit check. Won't affect your credit score.</p>
    </div>
</section>

<footer class="footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-col">
                <h4>Products</h4>
                <a href="/personal-loans">Personal Loans</a>
                <a href="/business-loans">Business Loans</a>
                <a href="/sba-loans">SBA Loans</a>
                <a href="/credit-cards">Credit Cards</a>
                <a href="/savings">Savings</a>
            </div>
            <div class="footer-col">
                <h4>Resources</h4>
                <a href="/guides">Financial Guides</a>
                <a href="/calculators">Loan Calculators</a>
                <a href="/blog">Blog</a>
                <a href="/glossary">Glossary</a>
            </div>
            <div class="footer-col">
                <h4>Company</h4>
                <a href="/about">About Us</a>
                <a href="/how-it-works">How It Works</a>
                <a href="/contact">Contact</a>
                <a href="/press">Press</a>
            </div>
            <div class="footer-col">
                <h4>Legal</h4>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
                <a href="/disclosures">Disclosures</a>
                <p style="margin-top: 12px;">My Money Marketplace helps consumers compare financial products. We may receive compensation from partners when you click links on our site.</p>
            </div>
        </div>
    </div>
    <div class="footer-bottom">
        <div class="container">&copy; 2026 My Money Marketplace. All rights reserved.</div>
    </div>
</footer>

<script>
(function(){
    // Quiz state + config (scenario-specific data serialized from the generator)
    var profiles = ${profilesJs};
    var scoringFn = ${scoringJs};
    var baseUtm = ${JSON.stringify(p.quiz.baseUtm)};

    var answers = [];
    var questions = document.querySelectorAll('.quiz-question');
    var totalQuestions = questions.length;
    var currentEl = document.getElementById('quizCurrent');
    var barEl = document.getElementById('quizBar');
    var questionsWrap = document.getElementById('quizQuestions');
    var resultWrap = document.getElementById('quizResult');
    var progressWrap = document.getElementById('quizProgress');

    function showQuestion(idx) {
        questions.forEach(function(el, i) {
            el.style.display = i === idx ? 'block' : 'none';
        });
        currentEl.textContent = (idx + 1);
        barEl.style.width = ((idx + 1) / totalQuestions * 100).toFixed(1) + '%';
    }

    function showResult() {
        var key = scoringFn(answers);
        var p = profiles[key] || profiles['B'];
        document.getElementById('resultBadge').textContent = p.badge;
        document.getElementById('resultHeadline').textContent = p.headline;
        document.getElementById('resultBody').textContent = p.body;
        var bulletsEl = document.getElementById('resultBullets');
        bulletsEl.innerHTML = '';
        (p.bullets || []).forEach(function(b) {
            var li = document.createElement('li');
            li.textContent = b;
            bulletsEl.appendChild(li);
        });
        var ctaEl = document.getElementById('resultCta');
        ctaEl.href = baseUtm + '&utm_content=' + encodeURIComponent(p.utmContent);
        questionsWrap.style.display = 'none';
        progressWrap.style.display = 'none';
        resultWrap.style.display = 'block';
        // Gentle scroll-into-view so the result is centered after click
        setTimeout(function() { resultWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 50);
    }

    function reset() {
        answers = [];
        questions.forEach(function(el) { el.style.display = 'none'; });
        resultWrap.style.display = 'none';
        progressWrap.style.display = 'block';
        questionsWrap.style.display = 'block';
        showQuestion(0);
    }

    document.querySelectorAll('.quiz-option').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var qEl = btn.closest('.quiz-question');
            var qIdx = parseInt(qEl.getAttribute('data-q'), 10);
            answers[qIdx] = btn.getAttribute('data-value');
            if (qIdx + 1 >= totalQuestions) {
                showResult();
            } else {
                showQuestion(qIdx + 1);
            }
        });
    });

    var retakeBtn = document.getElementById('quizRetake');
    if (retakeBtn) retakeBtn.addEventListener('click', reset);

    showQuestion(0);
})();
</script>

</body>
</html>
`;
}

// ─────────── scenario data ───────────

const SCENARIOS = [
    {
        slug: 'sba-loans/startups',
        title: 'SBA Loans for Startups 2026 | My Money Marketplace',
        metaDesc: 'Compare SBA loan options for startups and new businesses. See if you qualify for SBA Microloans, 7(a) Small Loans, or Community Advantage. Take our 2-minute quiz to get matched.',
        articleHeadline: 'SBA Loans for Startups: The 2026 Guide',
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'SBA Loans', url: '/sba-loans' },
            { name: 'SBA Loans for Startups', url: '/sba-loans/startups' }
        ],
        h1: 'SBA Loans for Startups',
        heroSub: 'SBA financing options for businesses under two years old with limited operating history — including programs designed specifically for startups and pre-revenue founders.',
        heroCtaLabel: 'Check if I qualify',
        financialService: {
            name: 'SBA Startup Loan Matching',
            serviceType: 'SBA loan guidance and lender matching for early-stage businesses',
            description: 'My Money Marketplace helps startup founders compare SBA Microloan, 7(a) Small Loan, and Community Advantage options and get matched with preferred lenders experienced in startup underwriting.'
        },
        quiz: {
            heading: 'Will SBA work for your startup?',
            intro: 'Answer six quick questions to see which SBA program fits your situation — or whether alternative funding is the smarter starting point.',
            baseUtm: 'https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=sba-startups-quiz',
            questions: [
                {
                    id: 'tib', prompt: 'How long have you been operating?',
                    options: [
                        { value: 'not-yet', label: 'Not yet launched' },
                        { value: 'under-6mo', label: 'Under 6 months' },
                        { value: '6-12mo', label: '6-12 months' },
                        { value: '1-2y', label: '1-2 years' },
                        { value: '2-plus', label: '2+ years' }
                    ]
                },
                {
                    id: 'score', prompt: "What's your personal credit score?",
                    options: [
                        { value: 'below-580', label: 'Below 580' },
                        { value: '580-639', label: '580-639' },
                        { value: '640-679', label: '640-679' },
                        { value: '680-719', label: '680-719' },
                        { value: '720-plus', label: '720+' }
                    ]
                },
                {
                    id: 'amount', prompt: 'How much funding do you need?',
                    options: [
                        { value: 'under-50k', label: 'Under $50K' },
                        { value: '50-150k', label: '$50K-$150K' },
                        { value: '150-500k', label: '$150K-$500K' },
                        { value: '500-1m', label: '$500K-$1M' },
                        { value: '1m-plus', label: '$1M+' }
                    ]
                },
                {
                    id: 'use', prompt: 'What will the funds be used for?',
                    options: [
                        { value: 'working-capital', label: 'Working capital' },
                        { value: 'equipment', label: 'Equipment' },
                        { value: 'inventory', label: 'Inventory' },
                        { value: 'real-estate', label: 'Commercial real estate' },
                        { value: 'acquisition', label: 'Business acquisition' },
                        { value: 'mixed', label: 'Multiple uses' }
                    ]
                },
                {
                    id: 'collateral', prompt: 'Do you have collateral available?',
                    options: [
                        { value: 'real-estate', label: 'Yes, real estate' },
                        { value: 'other-assets', label: 'Yes, equipment or other business assets' },
                        { value: 'none', label: 'No significant collateral' },
                        { value: 'unsure', label: 'Not sure' }
                    ]
                },
                {
                    id: 'franchise', prompt: 'Is this for a franchise?',
                    options: [
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' }
                    ]
                }
            ],
            // Scoring function is serialized into the page's inline JS.
            // Cascade priority: D beats A beats C beats B, so the order below
            // reflects that. Result keys map to `profiles` below.
            scoringFn: `function(ans) {
                var tib = ans[0], score = ans[1], amount = ans[2], franchise = ans[5];
                // D: Microloan / Community Advantage candidate
                if (franchise === 'yes' || amount === 'under-50k' || tib === 'not-yet') {
                    return 'D';
                }
                // A: Strong SBA candidate
                if (tib === '2-plus' && (score === '680-719' || score === '720-plus')) {
                    return 'A';
                }
                // C: Alternative-first (too early or credit too low)
                if (tib === 'under-6mo' || score === 'below-580' || score === '580-639') {
                    return 'C';
                }
                // B: SBA-possible, alternative-preferred (default)
                return 'B';
            }`,
            resultProfiles: {
                A: {
                    badge: 'Strong SBA candidate',
                    headline: "You're a strong fit for SBA 7(a) or 504",
                    body: 'Your combination of 2+ years operating and prime-range credit puts you squarely in conventional SBA territory. Expect 60-90 days from application to funding, so if your capital need is urgent, plan for bridge financing while SBA processes.',
                    bullets: [
                        'SBA 7(a) Small Loan up to $500K or full 7(a) up to $5M',
                        'SBA 504 if you need real estate or major equipment',
                        'Rates typically 2-3 points over prime, 10-25 year terms',
                        'Consider alternative bridge funding for the 60-90 day wait'
                    ],
                    utmContent: 'strong-candidate'
                },
                B: {
                    badge: 'SBA-possible',
                    headline: 'SBA is within reach, but alternatives may fund faster',
                    body: 'Your time-in-business or credit puts you in the borderline zone where SBA approval is possible but slower, and where alternative lending can match or exceed SBA terms on short-horizon capital needs. Worth comparing both tracks before committing.',
                    bullets: [
                        'SBA approval possible with strong business plan + owner equity',
                        '60-90 days to SBA funding vs. 24-72 hours for alternative',
                        'Alternative can serve immediate need, SBA can follow later',
                        'Match with a lender who can compare both in one conversation'
                    ],
                    utmContent: 'possible-alt-preferred'
                },
                C: {
                    badge: 'Alternative-first',
                    headline: 'Start with alternative funding, revisit SBA in 6-12 months',
                    body: 'Most conventional SBA lenders will struggle to approve a business under 12 months old or a borrower with credit below 640. The right move is to build operating history and credit with alternative capital now, then come back to SBA when you clear the bar.',
                    bullets: [
                        'Conventional SBA 7(a) unlikely at this stage',
                        'Alternative working capital or equipment financing bridges the gap',
                        'Build 12-18 months of revenue + payment history, then reapply',
                        'SBA Microloan still an option if funding need is small'
                    ],
                    utmContent: 'alternative-first'
                },
                D: {
                    badge: 'Microloan / Community Advantage',
                    headline: 'Look at the SBA Microloan and Community Advantage programs first',
                    body: 'Pre-launch, franchise, or smaller-dollar requests are exactly what the SBA Microloan program (up to $50K via non-profit intermediaries) and Community Advantage program (up to $350K, designed for underserved markets including startups) were built for. These programs have different underwriting and do not require 2 years in business.',
                    bullets: [
                        'SBA Microloan: up to $50K, 30-45 day close, non-profit intermediaries',
                        'Community Advantage: up to $350K, startup-friendly underwriting',
                        'Franchise Directory listing unlocks streamlined 7(a) path too',
                        'Match with a lender who works across all three programs'
                    ],
                    utmContent: 'microloan-ca'
                }
            }
        },
        programs: {
            heading: 'Which SBA programs fit startups',
            intro: 'Not every SBA program is realistic for early-stage businesses. These three are.',
            cards: [
                {
                    badge: 'Microloan',
                    name: 'SBA Microloan',
                    amount: 'Up to $50,000',
                    timeline: '30-45 days',
                    minCredit: 'Often 575+',
                    fit: 'You need under $50K, the business is early-stage or pre-revenue, and you can work with a non-profit intermediary lender.'
                },
                {
                    badge: 'Community Advantage',
                    name: 'SBA Community Advantage',
                    amount: 'Up to $350,000',
                    timeline: '45-75 days',
                    minCredit: 'Often 620+',
                    fit: 'You are in an underserved market or underserved demographic and need more than Microloan can provide but less than full 7(a).'
                },
                {
                    badge: '7(a) Small Loan',
                    name: 'SBA 7(a) Small Loan',
                    amount: 'Up to $500,000',
                    timeline: '60-90 days',
                    minCredit: 'Often 680+',
                    fit: 'You have 12+ months operating, reasonable credit, and a lender who specifically works with startup 7(a) applicants.'
                }
            ]
        },
        eligibility: {
            heading: 'SBA eligibility for startups',
            sections: [
                {
                    h3: 'The under-2-years reality',
                    p: [
                        "There is no hard rule in SBA regulations that says a business must be two years old to qualify for an SBA loan. The two-year number is a lender preference, not a statute. It exists because two years of tax returns and financials give underwriters enough history to forecast repayment capacity. Startups without that history aren't disqualified — they're held to a higher bar on the other factors lenders evaluate.",
                        "That means the right question isn't \"can a startup get an SBA loan\" (the answer is yes) but \"what does a startup need to compensate for the missing history?\" The honest answer is: a detailed business plan, verifiable owner equity, meaningful collateral, and either direct industry experience or a franchise relationship the SBA already recognizes."
                    ]
                },
                {
                    h3: 'What lenders actually want to see',
                    p: [
                        "Expect a preferred SBA lender to evaluate four factors for a startup application. First, the business plan — not a 40-page document, but a concise operating plan with a clear market, realistic unit economics, and three-year financial projections backed by assumptions a reviewer can follow. Second, owner equity, usually 10% to 30% of total project cost. Borrowed money does not count; savings, home equity, or documented family gifts do.",
                        "Third, collateral. Even though SBA loans are partially government-guaranteed, lenders still require collateral when available. Commercial real estate is the strongest form; equipment and other business assets are accepted. A personal guarantee is standard on any SBA loan where a single owner holds more than 20% of the business. Fourth, the borrower's industry experience. A first-time restaurateur faces longer odds than a veteran line cook opening their own place, even with identical financials."
                    ]
                },
                {
                    h3: 'Common reasons startups get denied',
                    p: [
                        "The most frequent denial reason for startup SBA applications is insufficient owner equity. An applicant who wants to borrow 95% of project cost is asking the lender to take most of the risk on a business with no revenue history. That rarely clears underwriting. Other common reasons: weak or boilerplate business plans, ineligible industries (the SBA has a published list — gambling, multi-level marketing, speculative investments, and pyramid schemes are out, among others), and applications with revenue projections that don't tie back to realistic customer-acquisition assumptions.",
                        "Credit is often blamed for startup denials, but by itself, credit in the 640-679 range is rarely the sole reason. It becomes fatal when combined with thin equity or a weak plan. When it is the limiting factor, the realistic path is building the business and credit for 12-18 months and reapplying — or going through an SBA Microloan intermediary that explicitly lends to lower-credit borrowers."
                    ]
                },
                {
                    h3: 'Franchise considerations',
                    p: [
                        "Franchising is the one scenario where the SBA explicitly gives startups a smoother path. The SBA maintains an online Franchise Directory — if your franchise is listed, most of the brand-level underwriting is already complete, and the lender's review focuses almost entirely on you as the borrower. Listed franchises generally close faster and at higher approval rates than independent startups of comparable size.",
                        "If a franchise isn't in the directory, an SBA loan is still possible but each lender has to do its own brand review, which adds time and variability. Before signing a franchise agreement with SBA financing in mind, confirm the brand is listed at sba.gov/franchise-directory — it's a one-minute check that can save weeks."
                    ]
                },
                {
                    h3: 'The SBA\'s informal two-year rule and its exceptions',
                    p: [
                        "Three SBA programs were designed with fewer time-in-business constraints. The SBA Microloan program, administered through non-profit intermediaries, makes loans up to $50,000 and often funds pre-revenue founders with strong plans and training hours completed at the intermediary's business development center. The Community Advantage program targets underserved markets and explicitly includes startups in its mandate, lending up to $350,000.",
                        "Within the standard 7(a) program, the 7(a) Small Loan (under $500K) has a streamlined process that some lenders run against startups when the other factors are strong. These aren't workarounds — they're programs the SBA built on purpose to serve new businesses. If a conventional lender says \"we need 2 years,\" the right response is to ask whether they participate in Microloan, Community Advantage, or startup-focused 7(a) Small Loan lending, or to find a lender that does."
                    ]
                }
            ]
        },
        process: {
            heading: 'The startup SBA process, step by step',
            intro: 'Plan for 60-90 days end-to-end on a conventional 7(a). Microloan timelines compress this meaningfully.',
            steps: [
                { title: 'Choose the right SBA program', text: 'Match your stage, amount, and timeline to Microloan, Community Advantage, or 7(a) Small Loan. Applying to the wrong program is the most common early mistake.' },
                { title: 'Build the application package', text: 'Three years of personal tax returns, any business tax returns you have, a personal financial statement (SBA Form 413), the SBA borrower form (SBA Form 1919), and a resume for each 20%+ owner.' },
                { title: 'Document owner equity', text: 'Bank statements, brokerage statements, or home-equity documentation proving the equity is yours and is not borrowed. This is the step applicants most often underestimate.' },
                { title: 'Write the business plan and projections', text: 'Focus on realistic unit economics. A three-year P&L, monthly for year one and quarterly after, with assumptions a lender can evaluate. Templates from SCORE and SBDCs are fine starting points.' },
                { title: 'Identify collateral and personal guarantee', text: 'List every collateral-eligible asset. Personal guarantee is standard from any owner with 20%+ stake — this is a lender requirement, not a negotiation point.' },
                { title: 'Submit to an SBA-preferred lender', text: 'Preferred Lender Program (PLP) members can approve loans without SBA central-office review, which shaves weeks off timelines. Ask upfront whether your lender is a PLP lender.' },
                { title: 'Underwriting and closing', text: 'Expect additional document requests — respond within 24 hours to keep momentum. At closing, you sign the note, UCC-1 financing statements on collateral, and the personal guarantee.' },
                { title: 'Post-closing', text: 'Most SBA loans require annual financial statements and covenant compliance. Set calendar reminders on day one. Missing a reporting deadline is an unnecessary way to trigger a lender conversation.' }
            ]
        },
        faqs: [
            { q: 'Can I get an SBA loan with no revenue yet?', a: 'Yes, but only through specific programs. The SBA Microloan (up to $50,000) and SBA Community Advantage program accept pre-revenue startups with strong business plans and founder equity. Conventional SBA 7(a) loans almost always require at least 12 months of revenue history, though some lenders within the 7(a) Small Loan program work with earlier-stage applicants when franchise status or industry experience is strong.' },
            { q: 'How much personal equity do I need to invest?', a: 'Most SBA lenders want to see the owner contribute 10% to 30% of total project cost from personal funds. This demonstrates commitment and reduces lender risk. Personal equity can include cash savings, a home equity line, or documented funds from family that do not need to be repaid. Borrowed money from credit cards or unsecured loans does not count as owner equity.' },
            { q: "What's the minimum time in business for SBA?", a: 'There is no formal SBA minimum. That is a common myth. Lenders set their own policies. Most 7(a) Small Loan programs want 12-24 months of operating history, though some specialize in startups with zero. The SBA Microloan and Community Advantage programs are explicitly designed for early-stage businesses and do not require a time-in-business minimum.' },
            { q: 'Will the SBA fund a franchise I am buying?', a: 'If the franchise is listed in the SBA Franchise Directory, yes, and the underwriting is significantly streamlined. Lenders treat listed franchises as pre-approved from a brand-risk perspective, leaving only the individual borrower qualifications to evaluate. Franchises not in the directory require a more detailed lender review. The full directory is at sba.gov/franchise-directory.' },
            { q: 'What credit score do I really need?', a: 'Most SBA-preferred lenders want personal credit of 680 or higher for the primary borrower. Scores of 640-679 can qualify with compensating strengths such as significant owner equity, strong collateral, or demonstrated industry experience. Below 640, most conventional SBA programs become very difficult, and SBA Microloan or Community Advantage programs become the realistic path.' },
            { q: 'How long does SBA approval take for startups?', a: 'Budget 60 to 90 days from first application to funding for conventional 7(a) loans. SBA Microloans typically close in 30 to 45 days because the non-profit intermediaries have less bureaucratic overhead. Community Advantage loans fall in between. Startups often see longer timelines because lenders want more time to evaluate the business plan and projections.' },
            { q: 'What happens if I am denied?', a: 'Ask for the specific reason in writing. Lenders are required to provide it. Common remediable issues include a thin business plan, insufficient owner equity, or weak collateral. You can reapply after addressing the issue, and in many cases a different SBA lender with different underwriting priorities will approve the same borrower. Alternative non-SBA financing such as equipment loans, revenue-based funding, or business credit cards can also bridge capital while you strengthen the SBA profile.' }
        ],
        closingCta: {
            heading: 'Ready to explore your funding options?',
            // bodyHtml is rendered raw (author-controlled, safe). Embeds the
            // required apex cross-links: /sba-loans (parent hub) and
            // /business-loans (faster alternative cross-sell).
            bodyHtml: 'Whether SBA is the right fit or alternative lending gets you there faster, a two-minute match at Lendmate Capital surfaces both in one conversation. See the broader <a href="/sba-loans" style="color:#4fd39f;text-decoration:underline;">SBA loans hub</a> for other scenarios, or compare <a href="/business-loans" style="color:#4fd39f;text-decoration:underline;">traditional business loans</a> as a faster-funding companion option.',
            buttonLabel: 'See what Lendmate can do in 2 minutes',
            utmCampaign: 'sba-startups-closing-cta'
        }
    }
];

// ─────────── main ───────────

let written = 0;
for (const s of SCENARIOS) {
    const outPath = path.join(ROOT, s.slug, 'index.html');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, buildPage(s), 'utf8');
    const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`wrote ${s.slug}/index.html (${kb} KB)`);
    written++;
}

// ─────────── sitemap ───────────

const sitemapPath = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf8');
    let added = 0;
    const newEntries = SCENARIOS.map(s => {
        const loc = `https://mymoneymarketplace.com/${s.slug}`;
        if (sitemap.includes(loc)) return '';
        added++;
        return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
    }).filter(Boolean).join('\n');
    if (added > 0) {
        sitemap = sitemap.replace('</urlset>', newEntries + '\n</urlset>');
        fs.writeFileSync(sitemapPath, sitemap, 'utf8');
    }
    console.log(`Sitemap entries added: ${added}`);
}

console.log(`\nTotal: ${written} page(s)`);
