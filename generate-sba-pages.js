// Flagship SBA-scenario page generator.
// v2: split-screen hero with embedded quiz, point-based scoring, visual
// program cards, inline pull-quote + comparison table + denial cards,
// horizontal process timeline, closed FAQ with icons, cleaned footer.
//
// One output per SCENARIOS entry. Scaling to 12+ sibling pages is adding
// entries to the array, not touching the renderer.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LOGO = 'https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png';
const TODAY = new Date().toISOString().slice(0, 10);

// ─────────── shared helpers ───────────

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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

// ─────────── inline SVG icons ───────────
// Kept minimal + consistent stroke weight (1.75) so icons read as a set.

const ICONS = {
    seedling: '<svg class="card-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22V11"/><path d="M12 11c0-3.5 3-6 7-6-1 3-3 6-7 6z"/><path d="M12 11c0-3.5-3-6-7-6 1 3 3 6 7 6z"/><path d="M8 22h8"/></svg>',
    community: '<svg class="card-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M14 20c0-2.2 1.8-4 4-4s4 1.8 4 4"/></svg>',
    building: '<svg class="card-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="1"/><line x1="9" y1="9" x2="9" y2="9"/><line x1="15" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="9" y2="13"/><line x1="15" y1="13" x2="15" y2="13"/><line x1="10" y1="21" x2="10" y2="17"/><line x1="14" y1="21" x2="14" y2="17"/></svg>',
    // FAQ icons — same stroke weight / size
    coins:    '<svg class="faq-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="5"/><path d="M16 21a5 5 0 1 0-4.9-6"/><path d="M8 5v6"/><path d="M5.5 7.5h5"/></svg>',
    bank:     '<svg class="faq-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10 12 4l9 6"/><path d="M5 10v9"/><path d="M19 10v9"/><path d="M9 10v9"/><path d="M15 10v9"/><path d="M3 20h18"/></svg>',
    calendar: '<svg class="faq-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 10h18"/></svg>',
    link:     '<svg class="faq-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
    chart:    '<svg class="faq-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="4" y2="10"/><line x1="10" y1="20" x2="10" y2="4"/><line x1="16" y1="20" x2="16" y2="13"/><line x1="22" y1="20" x2="2" y2="20"/></svg>',
    clock:    '<svg class="faq-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>',
    refresh:  '<svg class="faq-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><polyline points="21 3 21 8 16 8"/></svg>'
};

// ─────────── render helpers ───────────

function renderQuizHtml(quiz) {
    const questions = quiz.questions.map((q, qi) => `
                    <div class="quiz-question" data-q="${qi}"${qi === 0 ? '' : ' style="display:none"'}>
                        <h3>${esc(q.prompt)}</h3>
                        <div class="quiz-options">
${q.options.map(o => `                            <button type="button" class="quiz-option" data-value="${esc(o.value)}">${esc(o.label)}</button>`).join('\n')}
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
                <div id="quizResult" class="quiz-result" style="display:none" aria-live="polite">
                    <div class="quiz-result-badge" id="resultBadge"></div>
                    <h3 id="resultHeadline"></h3>
                    <p id="resultBody"></p>
                    <a id="resultCta" class="quiz-cta-btn" href="#" rel="nofollow sponsored">Continue &rarr;</a>
                    <button type="button" class="quiz-retake" id="quizRetake">Start over</button>
                </div>
            </div>`;
}

function renderProgramCards(cards) {
    return cards.map(c => `
            <div class="program-card" style="border-top:4px solid ${c.accent};">
                <div class="program-head">
                    <div class="program-icon-wrap" style="color:${c.accent}">${ICONS[c.icon] || ''}</div>
                    <div class="program-label">${esc(c.label)}</div>
                </div>
                <h3>${esc(c.name)}</h3>
                <div class="program-stats">
                    <div class="program-stat">
                        <span class="program-stat-value">${esc(c.amount)}</span>
                        <span class="program-stat-label">max amount</span>
                    </div>
                    <div class="program-stat">
                        <span class="program-stat-value">${esc(c.timeline)}</span>
                        <span class="program-stat-label">to close</span>
                    </div>
                    <div class="program-stat">
                        <span class="program-stat-value">${esc(c.minCredit)}</span>
                        <span class="program-stat-label">min credit</span>
                    </div>
                </div>
                <p class="program-fit"><strong>${esc(c.fitLead)}</strong> ${esc(c.fitRest)}</p>
            </div>`).join('');
}

function renderComparisonTable(tbl) {
    const rows = tbl.rows.map(r => `
                <tr>
                    <th scope="row">${esc(r.factor)}</th>
                    <td>${esc(r.conv7a)}</td>
                    <td>${esc(r.ca)}</td>
                    <td>${esc(r.micro)}</td>
                </tr>`).join('');
    return `
        <div class="compare-wrap">
            <h4 class="compare-title">${esc(tbl.title)}</h4>
            <div class="compare-scroll">
                <table class="compare-table">
                    <thead>
                        <tr>
                            <th scope="col">Factor</th>
                            <th scope="col">Conventional 7(a)</th>
                            <th scope="col">Community Advantage</th>
                            <th scope="col">Microloan</th>
                        </tr>
                    </thead>
                    <tbody>${rows}
                    </tbody>
                </table>
            </div>
        </div>`;
}

function renderDenialCards(cards) {
    return `
        <div class="denial-grid">${cards.map(c => `
            <div class="denial-card">
                <h4>${esc(c.headline)}</h4>
                <p>${esc(c.remediation)}</p>
            </div>`).join('')}
        </div>`;
}

function renderTimelineSteps(steps) {
    return steps.map((s, i) => `
                <li class="timeline-node">
                    <div class="timeline-dot"><span>${i + 1}</span></div>
                    <div class="timeline-copy">
                        <h4>${esc(s.title)}</h4>
                        <p>${esc(s.text)}</p>
                    </div>
                </li>`).join('');
}

function renderFaqs(faqs) {
    return faqs.map(f => `
            <details class="faq-item">
                <summary>
                    <span class="faq-icon-wrap">${ICONS[f.icon] || ''}</span>
                    <span class="faq-q">${esc(f.q)}</span>
                    <span class="faq-marker" aria-hidden="true"></span>
                </summary>
                <div class="faq-answer">${esc(f.a)}</div>
            </details>`).join('');
}

function renderEligibility(eligibility) {
    // Assemble the eligibility section: prose sections with inline visual
    // components interleaved at specific anchors.
    const parts = [];
    for (const s of eligibility.sections) {
        parts.push(`        <h3>${esc(s.h3)}</h3>`);
        for (const p of s.p) parts.push(`        <p>${esc(p)}</p>`);
        if (s.after === 'pullquote') {
            parts.push(`
        <blockquote class="pullquote">
            <p>${esc(eligibility.pullquote)}</p>
        </blockquote>`);
        } else if (s.after === 'comparison') {
            parts.push(renderComparisonTable(eligibility.comparison));
        } else if (s.after === 'denial-cards') {
            parts.push(renderDenialCards(eligibility.denialCards));
        }
    }
    return parts.join('\n');
}

// ─────────── page shell ───────────

function buildPage(p) {
    const canonical = `https://mymoneymarketplace.com/${p.slug}`;

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
                datePublished: p.datePublished || TODAY,
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
            { '@type': 'FAQPage', mainEntity: buildFaqSchema(p.faqs) }
        ]
    };

    const profilesJson = JSON.stringify(p.quiz.resultProfiles);
    const baseUtm = `https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=${p.quiz.utmCampaign}`;

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
        :root {
            --green: #008254; --green-dark: #006b45; --green-bg: #f0faf5;
            --text: #111111; --text-secondary: #444444; --text-muted: #717171;
            --border: #e2e2e2; --bg-light: #f7f7f7; --white: #ffffff;
            --navy: #1a3a5c; --navy-deep: #122a42;
            --accent-green: #2D8659; --accent-blue: #2F6BB3; --accent-amber: #B8741C;
            --quote-accent: #2F6BB3;
        }
        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: var(--text); background: var(--white); line-height: 1.7; -webkit-font-smoothing: antialiased; }
        a { color: inherit; }

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

        /* Hero — split screen */
        .hero { padding: 56px 0 72px; background: linear-gradient(180deg, var(--bg-light) 0%, var(--white) 100%); }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
        .hero-left h1 { font-size: clamp(32px, 4vw, 44px); font-weight: 700; color: var(--text); line-height: 1.15; margin-bottom: 18px; }
        .hero-left .sub { font-size: 17px; color: var(--text-secondary); line-height: 1.65; margin-bottom: 22px; }
        .hero-value { display: inline-flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; color: var(--navy); background: var(--green-bg); border-left: 3px solid var(--green); padding: 12px 18px; border-radius: 4px; margin-bottom: 22px; line-height: 1.5; }
        .hero-skip { font-size: 14px; color: var(--text-muted); text-decoration: none; border-bottom: 1px dotted var(--text-muted); padding-bottom: 1px; transition: color 0.2s, border-color 0.2s; }
        .hero-skip:hover { color: var(--green); border-bottom-color: var(--green); }
        @media (max-width: 900px) {
            .hero { padding: 40px 0 48px; }
            .hero-grid { grid-template-columns: 1fr; gap: 32px; }
        }

        /* Quiz card */
        .quiz-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 28px; box-shadow: 0 6px 24px rgba(20, 40, 70, 0.06); }
        .quiz-progress { margin-bottom: 22px; }
        .quiz-step-label { display: block; font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 8px; letter-spacing: 0.4px; text-transform: uppercase; }
        .quiz-bar { height: 6px; background: var(--bg-light); border-radius: 3px; overflow: hidden; }
        .quiz-bar-fill { height: 100%; background: var(--green); transition: width 0.35s ease; }
        .quiz-question h3 { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 18px; line-height: 1.35; }
        .quiz-options { display: flex; flex-direction: column; gap: 8px; }
        .quiz-option { text-align: left; font-family: inherit; font-size: 15px; padding: 13px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--white); color: var(--text); cursor: pointer; transition: border-color 0.15s, background 0.15s, transform 0.1s; }
        .quiz-option:hover { border-color: var(--green); background: var(--green-bg); }
        .quiz-option:active { transform: scale(0.99); }
        .quiz-option:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
        .quiz-result-badge { display: inline-block; padding: 4px 12px; background: var(--green-bg); color: var(--green); font-size: 11px; font-weight: 700; border-radius: 12px; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 14px; }
        #resultHeadline { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 12px; line-height: 1.3; }
        #resultBody { font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 22px; }
        .quiz-cta-btn { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 14px 26px; border-radius: 8px; text-decoration: none; transition: background 0.2s; }
        .quiz-cta-btn:hover { background: var(--green-dark); color: var(--white); }
        .quiz-retake { display: block; margin-top: 14px; background: none; border: none; color: var(--text-muted); font-size: 13px; font-family: inherit; cursor: pointer; text-decoration: underline; padding: 4px 0; }
        .quiz-retake:hover { color: var(--text); }

        /* Program cards */
        .programs { padding: 72px 0; background: var(--white); }
        .programs h2 { font-size: 28px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 10px; }
        .programs-sub { text-align: center; color: var(--text-secondary); font-size: 15px; max-width: 640px; margin: 0 auto 44px; }
        .programs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .program-card { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 32px; display: flex; flex-direction: column; }
        .program-head { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
        .program-icon-wrap { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 8px; background: var(--bg-light); }
        .program-label { font-size: 11px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-muted); }
        .program-card h3 { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 22px; line-height: 1.3; }
        .program-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 22px; padding: 16px 0; border-top: 1px solid var(--bg-light); border-bottom: 1px solid var(--bg-light); }
        .program-stat { display: flex; flex-direction: column; align-items: flex-start; }
        .program-stat-value { font-size: 22px; font-weight: 700; color: var(--text); line-height: 1.2; }
        .program-stat-label { font-size: 11px; color: var(--text-muted); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
        .program-fit { font-size: 14px; color: var(--text-secondary); line-height: 1.6; margin-top: auto; }
        .program-fit strong { color: var(--text); font-weight: 600; }
        @media (max-width: 900px) {
            .programs-grid { grid-template-columns: 1fr; gap: 20px; }
            .program-stat-value { font-size: 20px; }
        }

        /* Eligibility + pull-quote + comparison + denial cards */
        .eligibility { padding: 72px 0; background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .eligibility h2 { font-size: 28px; font-weight: 700; color: var(--text); margin-bottom: 28px; text-align: center; }
        .eligibility h3 { font-size: 20px; font-weight: 600; color: var(--text); margin: 36px 0 12px; }
        .eligibility p { font-size: 15px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 14px; }
        .eligibility a { color: var(--green); font-weight: 500; text-decoration: underline; }

        .pullquote { background: var(--white); border-left: 4px solid var(--quote-accent); padding: 24px 28px; margin: 28px 0 32px; border-radius: 0 6px 6px 0; }
        .pullquote p { font-size: 22px; line-height: 1.45; font-weight: 500; color: var(--navy); margin: 0; }

        .compare-wrap { margin: 28px 0 36px; }
        .compare-title { font-size: 14px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 12px; text-align: center; }
        .compare-scroll { overflow-x: auto; border-radius: 8px; border: 1px solid var(--border); background: var(--white); }
        .compare-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .compare-table thead { background: var(--navy); color: var(--white); }
        .compare-table th { text-align: left; padding: 12px 14px; font-weight: 600; font-size: 13px; }
        .compare-table tbody th { background: var(--bg-light); color: var(--text); font-weight: 600; white-space: nowrap; }
        .compare-table td { padding: 12px 14px; color: var(--text-secondary); border-top: 1px solid var(--bg-light); vertical-align: top; }
        .compare-table tbody tr:first-child th, .compare-table tbody tr:first-child td { border-top: 0; }

        .denial-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin: 20px 0 28px; }
        .denial-card { background: var(--white); border: 1px solid var(--border); border-left: 3px solid #c0392b; border-radius: 6px; padding: 18px 20px; }
        .denial-card h4 { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px; line-height: 1.3; }
        .denial-card p { font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; margin: 0; }
        @media (max-width: 640px) { .denial-grid { grid-template-columns: 1fr; } }

        /* Process timeline */
        .process { padding: 72px 0; background: var(--white); }
        .process h2 { font-size: 28px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 10px; }
        .process-intro { text-align: center; color: var(--text-secondary); font-size: 15px; margin-bottom: 48px; max-width: 640px; margin-left: auto; margin-right: auto; }
        .timeline { list-style: none; padding: 0; max-width: 1040px; margin: 0 auto; }
        /* Desktop: 4 columns x 2 rows */
        @media (min-width: 900px) {
            .timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 36px 24px; position: relative; }
            .timeline-node { position: relative; padding-top: 48px; }
            .timeline-node::before { content: ''; position: absolute; left: 50%; top: 20px; width: calc(100% - 40px); height: 2px; background: var(--border); transform: translateX(-50%); z-index: 0; }
            .timeline-node:nth-child(4n)::before { display: none; }
            .timeline-dot { position: absolute; top: 0; left: 50%; transform: translateX(-50%); z-index: 1; }
            .timeline-copy { text-align: center; }
        }
        /* Mobile: vertical stack with connector line */
        @media (max-width: 899px) {
            .timeline { padding-left: 48px; position: relative; }
            .timeline::before { content: ''; position: absolute; top: 20px; bottom: 20px; left: 19px; width: 2px; background: var(--border); }
            .timeline-node { position: relative; padding: 8px 0 24px; }
            .timeline-dot { position: absolute; left: -48px; top: 2px; }
        }
        .timeline-dot { width: 40px; height: 40px; border-radius: 50%; background: var(--green); color: var(--white); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 15px; box-shadow: 0 0 0 4px var(--white); }
        .timeline-copy h4 { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; line-height: 1.3; }
        .timeline-copy p { font-size: 13.5px; color: var(--text-secondary); line-height: 1.55; }

        /* FAQ — compressed, closed by default, icons */
        .faq-section { padding: 72px 0; background: var(--bg-light); border-top: 1px solid var(--border); }
        .faq-section h2 { font-size: 28px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 36px; }
        .faq-list { max-width: 780px; margin: 0 auto; }
        .faq-item { background: var(--white); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; overflow: hidden; transition: box-shadow 0.2s; }
        .faq-item[open] { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05); }
        .faq-item summary { display: flex; align-items: center; gap: 14px; padding: 16px 20px; font-size: 15px; font-weight: 600; color: var(--text); cursor: pointer; list-style: none; transition: background 0.15s; }
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

        /* Closing CTA */
        .closing-cta { padding: 72px 0; background: var(--navy); text-align: center; }
        .closing-cta h2 { font-size: 28px; font-weight: 700; color: var(--white); margin-bottom: 14px; }
        .closing-cta p { font-size: 16px; color: rgba(255,255,255,0.78); max-width: 640px; margin: 0 auto 30px; line-height: 1.65; }
        .closing-cta p a { color: #7ee0b1; text-decoration: underline; }
        .closing-cta-btn { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 16px 36px; border-radius: 8px; text-decoration: none; transition: background 0.2s, transform 0.2s; }
        .closing-cta-btn:hover { background: var(--green-dark); transform: translateY(-1px); }

        /* Footer (trimmed — only links that actually exist on apex + disclosure text) */
        .footer { background: #1a1a1a; color: #cccccc; padding: 48px 0 0; }
        .footer-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 48px; margin-bottom: 32px; }
        .footer-col h4 { color: var(--white); font-size: 13px; font-weight: 600; margin-bottom: 16px; letter-spacing: 0.4px; text-transform: uppercase; }
        .footer-col a { display: block; font-size: 13px; color: #999999; text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
        .footer-col a:hover { color: var(--white); }
        .footer-col p { font-size: 13px; color: #999999; line-height: 1.7; }
        .footer-bottom { border-top: 1px solid #333333; padding: 20px 0; text-align: center; font-size: 12px; color: #666666; }
        @media (max-width: 640px) { .footer-grid { grid-template-columns: 1fr; gap: 28px; } }
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
        <div class="hero-grid">
            <div class="hero-left">
                <h1>${esc(p.h1)}</h1>
                <p class="sub">${esc(p.heroSub)}</p>
                <p class="hero-value">${esc(p.heroValueProp)}</p>
                <a href="#programs" class="hero-skip">Skip ahead to program details &rarr;</a>
            </div>
            <div class="hero-right" id="quiz">
${renderQuizHtml(p.quiz)}
            </div>
        </div>
    </div>
</section>

<section class="programs" id="programs">
    <div class="container">
        <h2>${esc(p.programs.heading)}</h2>
        <p class="programs-sub">${esc(p.programs.intro)}</p>
        <div class="programs-grid">${renderProgramCards(p.programs.cards)}
        </div>
    </div>
</section>

<section class="eligibility">
    <div class="container-narrow">
        <h2>${esc(p.eligibility.heading)}</h2>
${renderEligibility(p.eligibility)}
    </div>
</section>

<section class="process">
    <div class="container">
        <h2>${esc(p.process.heading)}</h2>
        <p class="process-intro">${esc(p.process.intro)}</p>
        <ol class="timeline">${renderTimelineSteps(p.process.steps)}
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
    (/sba-loans/women-owned, /sba-loans/veterans, /sba-loans/minority-owned, etc.),
    populate a related-products grid here with 3 scenarios + the /sba-loans hub.
-->

<section class="closing-cta">
    <div class="container">
        <h2>${esc(p.closingCta.heading)}</h2>
        <p>${p.closingCta.bodyHtml}</p>
        <a href="https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=${p.closingCta.utmCampaign}" class="closing-cta-btn" rel="nofollow sponsored">${esc(p.closingCta.buttonLabel)} &rarr;</a>
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
                <h4>About</h4>
                <p>My Money Marketplace helps consumers and small business owners compare financial products and get matched with lenders. We may receive compensation from partners when you click links on our site. We do not provide financial, legal, or tax advice.</p>
            </div>
        </div>
    </div>
    <div class="footer-bottom">
        <div class="container">&copy; 2026 My Money Marketplace. All rights reserved.</div>
    </div>
</footer>

<script>
(function () {
    'use strict';

    var PROFILES = ${profilesJson};
    var BASE_UTM = ${JSON.stringify(baseUtm)};
    var TOTAL = 6;

    var answers = [null, null, null, null, null, null];

    // Point-based scoring with D/A/B/C cascade per spec.
    function scoreAnswers(ans) {
        var tib = ans[0], credit = ans[1], amount = ans[2];
        var collat = ans[4], franchise = ans[5];

        // Hard override: Microloan / Community Advantage path
        if (amount === 'under-50k' || tib === 'not-yet') return 'D';

        var pts = 0;

        // Q1 — time in business
        if (tib === 'under-6mo') pts += -1;
        else if (tib === '6-12mo') pts += 0;
        else if (tib === '1-2y')   pts += 1;
        else if (tib === '2-plus') pts += 2;

        // Q2 — credit
        if (credit === 'below-580') pts += -2;
        else if (credit === '580-639') pts += -1;
        else if (credit === '640-679') pts += 0;
        else if (credit === '680-719') pts += 1;
        else if (credit === '720-plus') pts += 2;

        // Q3 — amount (under-50k already routed above)
        if (amount === '150-500k' || amount === '500-1m') pts += 1;

        // Q5 — collateral
        if (collat === 'real-estate') pts += 2;
        else if (collat === 'other-assets') pts += 1;
        else if (collat === 'none') pts += -1;

        // Q6 — franchise
        if (franchise === 'yes') pts += 1;

        // Routing
        if (pts >= 4 && (tib === '1-2y' || tib === '2-plus')) return 'A';
        if (pts >= 0) return 'B';
        return 'C';
    }

    var questionEls = document.querySelectorAll('.quiz-question');
    var progressCurrent = document.getElementById('quizCurrent');
    var progressBar = document.getElementById('quizBar');
    var progressWrap = document.getElementById('quizProgress');
    var questionsWrap = document.getElementById('quizQuestions');
    var resultWrap = document.getElementById('quizResult');

    function showQuestion(idx) {
        for (var i = 0; i < questionEls.length; i++) {
            questionEls[i].style.display = (i === idx) ? 'block' : 'none';
        }
        if (progressCurrent) progressCurrent.textContent = (idx + 1);
        if (progressBar) progressBar.style.width = (((idx + 1) / TOTAL) * 100).toFixed(1) + '%';
    }

    function showResult() {
        var key = scoreAnswers(answers);
        var profile = PROFILES[key] || PROFILES.B;
        document.getElementById('resultBadge').textContent = profile.badge;
        document.getElementById('resultHeadline').textContent = profile.headline;
        document.getElementById('resultBody').textContent = profile.body;
        var cta = document.getElementById('resultCta');
        cta.href = BASE_UTM + '&utm_content=' + encodeURIComponent(profile.utmContent);
        cta.textContent = profile.ctaLabel + ' \\u2192';
        // Use innerHTML so the rightward arrow renders as a real character
        cta.innerHTML = profile.ctaLabel + ' &rarr;';

        if (progressWrap) progressWrap.style.display = 'none';
        if (questionsWrap) questionsWrap.style.display = 'none';
        resultWrap.style.display = 'block';
        try { resultWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch (e) {}
    }

    function reset() {
        answers = [null, null, null, null, null, null];
        if (resultWrap) resultWrap.style.display = 'none';
        if (progressWrap) progressWrap.style.display = 'block';
        if (questionsWrap) questionsWrap.style.display = 'block';
        showQuestion(0);
    }

    // Event delegation on the questions wrapper is more robust than per-button listeners
    if (questionsWrap) {
        questionsWrap.addEventListener('click', function (ev) {
            var tgt = ev.target;
            if (!tgt || !tgt.classList || !tgt.classList.contains('quiz-option')) return;
            ev.preventDefault();
            var qEl = tgt.closest('.quiz-question');
            if (!qEl) return;
            var qIdx = parseInt(qEl.getAttribute('data-q'), 10);
            answers[qIdx] = tgt.getAttribute('data-value');
            if (qIdx + 1 >= TOTAL) {
                showResult();
            } else {
                showQuestion(qIdx + 1);
            }
        });
    }

    var retakeBtn = document.getElementById('quizRetake');
    if (retakeBtn) retakeBtn.addEventListener('click', reset);

    // Initialize: show only Q1
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
        datePublished: '2026-04-21',
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'SBA Loans', url: '/sba-loans' },
            { name: 'SBA Loans for Startups', url: '/sba-loans/startups' }
        ],
        h1: 'SBA Loans for Startups',
        heroSub: 'SBA loans for new businesses under two years old, including programs designed specifically for startups and pre-revenue founders. See which one fits your situation in 60 seconds.',
        heroValueProp: 'Answer 6 questions. Get a real eligibility read in 60 seconds.',
        financialService: {
            name: 'SBA Startup Loan Matching',
            serviceType: 'SBA loan guidance and lender matching for early-stage businesses',
            description: 'My Money Marketplace helps startup founders compare SBA Microloan, 7(a) Small Loan, and Community Advantage options and get matched with preferred lenders experienced in startup underwriting.'
        },

        quiz: {
            utmCampaign: 'sba-startups-quiz',
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
            resultProfiles: {
                A: {
                    badge: 'Strong SBA candidate',
                    headline: "You're a strong SBA candidate",
                    body: 'Your profile fits the conventional SBA 7(a) or 504 path well. Expect 60-90 days to funding. Because that timeline can miss time-sensitive opportunities, many strong-profile borrowers pursue SBA while lining up bridge funding that can deploy in days.',
                    ctaLabel: 'Explore funding options at Lendmate',
                    utmContent: 'profile-a-strong'
                },
                B: {
                    badge: 'SBA-possible, alternative-preferred',
                    headline: 'SBA is possible — alternatives may fund faster',
                    body: "Your profile could qualify for SBA, but one or more factors (time in business, credit, or collateral) mean approval isn't guaranteed and may take time. Alternative lenders often fund similar amounts in 24-72 hours with more flexible underwriting.",
                    ctaLabel: 'See what Lendmate can match you with',
                    utmContent: 'profile-b-possible'
                },
                C: {
                    badge: 'Alternative-first',
                    headline: "SBA likely isn't the right fit yet",
                    body: 'Your current profile faces long odds on conventional SBA approval. Most borrowers in this position build the business and credit for 6-12 months with alternative financing, then revisit SBA once the profile strengthens. Lendmate can match you with funding that works today.',
                    ctaLabel: 'See what funding you can access now',
                    utmContent: 'profile-c-alternative'
                },
                D: {
                    badge: 'Microloan / CDC candidate',
                    headline: 'SBA Microloan or Community Advantage is your path',
                    body: 'Your situation (small amount, early stage, or franchise) fits programs designed specifically for startups — SBA Microloan (up to $50K via non-profit intermediaries) or Community Advantage (up to $350K in underserved markets). These have different criteria and faster timelines than conventional SBA.',
                    ctaLabel: 'Get matched with the right lender',
                    utmContent: 'profile-d-microloan'
                }
            }
        },

        programs: {
            heading: 'Three SBA programs realistic for startups',
            intro: 'Not every SBA program is realistic for early-stage businesses. These three are.',
            cards: [
                {
                    label: 'Fastest',
                    name: 'SBA Microloan',
                    icon: 'seedling',
                    accent: '#2D8659',
                    amount: '$50K',
                    timeline: '30-45d',
                    minCredit: '575+',
                    fitLead: 'Right for you if:',
                    fitRest: 'you need under $50K, the business is early-stage or pre-revenue, and you can work with a non-profit intermediary lender.'
                },
                {
                    label: 'Underserved markets',
                    name: 'SBA Community Advantage',
                    icon: 'community',
                    accent: '#2F6BB3',
                    amount: '$350K',
                    timeline: '45-75d',
                    minCredit: '620+',
                    fitLead: 'Right for you if:',
                    fitRest: 'you are in an underserved market or demographic and need more than Microloan can provide but less than full 7(a).'
                },
                {
                    label: 'Largest amount',
                    name: 'SBA 7(a) Small Loan',
                    icon: 'building',
                    accent: '#B8741C',
                    amount: '$500K',
                    timeline: '60-90d',
                    minCredit: '680+',
                    fitLead: 'Right for you if:',
                    fitRest: 'you have 12+ months operating, reasonable credit, and a lender who specifically works with startup 7(a) applicants.'
                }
            ]
        },

        eligibility: {
            heading: 'SBA eligibility for startups',
            pullquote: "There is no hard SBA rule requiring 2 years in business. That's a lender preference, not a statute.",
            comparison: {
                title: 'Eligibility expectations at a glance',
                rows: [
                    { factor: 'Time in business', conv7a: '12-24 months typical', ca: 'No minimum',        micro: 'No minimum' },
                    { factor: 'Credit score',    conv7a: 'Often 680+',           ca: 'Often 620+',         micro: 'Often 575+' },
                    { factor: 'Owner equity',    conv7a: '10-30% typical',       ca: '10-30% typical',     micro: '10-30% typical' },
                    { factor: 'Collateral',      conv7a: 'Required when available', ca: 'Required when available', micro: 'Often flexible' },
                    { factor: 'Business plan',   conv7a: 'Detailed + projections', ca: 'Required, format flexible', micro: 'Intermediary may help build' }
                ]
            },
            denialCards: [
                { headline: 'Insufficient owner equity', remediation: 'Document cash, home equity, or family gifts; borrowed money from credit cards or unsecured loans does not count as owner equity.' },
                { headline: 'Weak business plan',         remediation: 'Avoid boilerplate templates. Focus on unit economics, market specifics, and three-year projections a reviewer can follow.' },
                { headline: 'Ineligible industry',        remediation: 'Check the SBA\u2019s published list before applying. Gambling, multi-level marketing, speculative investments, and pyramid schemes are excluded.' },
                { headline: 'Unrealistic projections',    remediation: 'Tie every revenue number to a concrete customer-acquisition mechanism and cost, not wishful growth curves.' }
            ],
            sections: [
                {
                    h3: 'The under-2-years reality',
                    p: [
                        "There is no hard rule in SBA regulations that says a business must be two years old to qualify for an SBA loan. The two-year number is a lender preference, not a statute. It exists because two years of tax returns and financials give underwriters enough history to forecast repayment capacity. Startups without that history aren't disqualified, they are held to a higher bar on the other factors lenders evaluate.",
                        "That means the right question isn't \"can a startup get an SBA loan\" (the answer is yes) but \"what does a startup need to compensate for the missing history?\" The honest answer is: a detailed business plan, verifiable owner equity, meaningful collateral, and either direct industry experience or a franchise relationship the SBA already recognizes."
                    ],
                    after: 'pullquote'
                },
                {
                    h3: 'What lenders actually want to see',
                    p: [
                        "Expect a preferred SBA lender to evaluate four factors for a startup application. First, the business plan, not a 40-page document, but a concise operating plan with a clear market, realistic unit economics, and three-year financial projections backed by assumptions a reviewer can follow. Second, owner equity, usually 10% to 30% of total project cost. Borrowed money does not count; savings, home equity, or documented family gifts do.",
                        "Third, collateral. Even though SBA loans are partially government-guaranteed, lenders still require collateral when available. Commercial real estate is the strongest form; equipment and other business assets are accepted. A personal guarantee is standard on any SBA loan where a single owner holds more than 20% of the business. Fourth, the borrower's industry experience. A first-time restaurateur faces longer odds than a veteran line cook opening their own place, even with identical financials."
                    ],
                    after: 'comparison'
                },
                {
                    h3: 'Common reasons startups get denied',
                    p: [
                        "The four most frequent denial reasons for startup SBA applications tend to cluster. Each is fixable, but fixing it usually means revising the application rather than rushing a resubmission."
                    ],
                    after: 'denial-cards'
                },
                {
                    h3: 'Franchise considerations',
                    p: [
                        "Franchising is the one scenario where the SBA explicitly gives startups a smoother path. The SBA maintains an online Franchise Directory. If your franchise is listed, most of the brand-level underwriting is already complete, and the lender's review focuses almost entirely on you as the borrower. Listed franchises generally close faster and at higher approval rates than independent startups of comparable size.",
                        "If a franchise isn't in the directory, an SBA loan is still possible but each lender has to do its own brand review, which adds time and variability. Before signing a franchise agreement with SBA financing in mind, confirm the brand is listed at sba.gov/franchise-directory. It's a one-minute check that can save weeks."
                    ]
                },
                {
                    h3: "The SBA's informal two-year rule and its exceptions",
                    p: [
                        "Three SBA programs were designed with fewer time-in-business constraints. The SBA Microloan program, administered through non-profit intermediaries, makes loans up to $50,000 and often funds pre-revenue founders with strong plans and training hours completed at the intermediary's business development center. The Community Advantage program targets underserved markets and explicitly includes startups in its mandate, lending up to $350,000.",
                        "Within the standard 7(a) program, the 7(a) Small Loan (under $500K) has a streamlined process that some lenders run against startups when the other factors are strong. These aren't workarounds, they are programs the SBA built on purpose to serve new businesses. If a conventional lender says \"we need 2 years,\" the right response is to ask whether they participate in Microloan, Community Advantage, or startup-focused 7(a) Small Loan lending, or to find a lender that does."
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
                { title: 'Write plan and projections', text: 'Focus on realistic unit economics. A three-year P&L, monthly for year one and quarterly after, with assumptions a lender can evaluate. Templates from SCORE and SBDCs are fine starting points.' },
                { title: 'Identify collateral', text: 'List every collateral-eligible asset. Personal guarantee is standard from any owner with 20%+ stake. This is a lender requirement, not a negotiation point.' },
                { title: 'Submit to an SBA-preferred lender', text: 'Preferred Lender Program (PLP) members can approve loans without SBA central-office review, which shaves weeks off timelines. Ask upfront whether your lender is a PLP lender.' },
                { title: 'Underwriting and closing', text: 'Expect additional document requests. Respond within 24 hours to keep momentum. At closing, you sign the note, UCC-1 financing statements on collateral, and the personal guarantee.' },
                { title: 'Post-closing', text: 'Most SBA loans require annual financial statements and covenant compliance. Set calendar reminders on day one. Missing a reporting deadline is an unnecessary way to trigger a lender conversation.' }
            ]
        },

        // FAQs informed by Google People Also Ask + Related Searches for
        // "sba loans for startups". Questions marked PAA are the exact
        // surface-form questions Google shows in the PAA block.
        faqs: [
            { icon: 'coins',    q: 'Can I get an SBA loan for a startup?',                             a: 'Yes, but the right program depends on how early-stage you are. The SBA Microloan (up to $50,000 via non-profit intermediaries) and Community Advantage program (up to $350,000) were designed for startups and do not require a time-in-business minimum. The conventional SBA 7(a) loan typically wants 12 to 24 months of operating history, though some lenders specialize in startup 7(a) applications when the business plan, owner equity, and collateral are strong.' },
            { icon: 'refresh',  q: 'What disqualifies you from an SBA loan?',                          a: 'The most common disqualifiers are a personal credit score below the lender threshold (usually 640 to 680 for conventional 7(a); lower for Microloan and Community Advantage), insufficient owner equity (most lenders want 10-30% of project cost from personal funds), operating in an ineligible industry (gambling, multi-level marketing, speculative investments, and pyramid schemes are all excluded), and default on any prior government loan or unresolved federal debt. A weak or boilerplate business plan is a frequent softer denial reason.' },
            { icon: 'chart',    q: 'What credit score is needed for an SBA loan?',                     a: 'Most SBA-preferred lenders want personal credit of 680 or higher for conventional 7(a) applications. Scores of 640 to 679 can qualify with compensating strengths such as meaningful owner equity, strong collateral, or demonstrated industry experience. Below 640, conventional SBA becomes difficult. The SBA Microloan program (often 575+) and Community Advantage (often 620+) are designed to serve lower credit profiles and are often the realistic path for new businesses.' },
            { icon: 'bank',     q: 'How much personal equity do I need to invest?',                    a: 'Most SBA lenders want the owner to contribute 10% to 30% of total project cost from personal funds. This demonstrates commitment and reduces lender risk. Personal equity can include cash savings, a home equity line, or documented family gifts that do not need to be repaid. Borrowed money from credit cards or unsecured loans does not count as owner equity.' },
            { icon: 'link',     q: 'Will the SBA fund a franchise I am buying?',                       a: 'If the franchise is listed in the SBA Franchise Directory, yes, and the underwriting is significantly streamlined. Lenders treat listed franchises as pre-approved from a brand-risk perspective, leaving only the individual borrower qualifications to evaluate. Franchises not in the directory require a more detailed lender review. The full directory is at sba.gov/franchise-directory.' },
            { icon: 'clock',    q: 'How long does SBA approval take for a startup?',                   a: 'Budget 60 to 90 days from first application to funding for conventional 7(a) loans. SBA Microloans typically close in 30 to 45 days because the non-profit intermediaries have less bureaucratic overhead. Community Advantage loans fall in between. Startups often see longer timelines because lenders want more time to evaluate the business plan and financial projections.' },
            { icon: 'calendar', q: 'Is there a $10,000 SBA grant for startups?',                       a: 'The $10,000 figure typically refers to the Targeted EIDL Advance from the 2020-2021 COVID relief period, which is no longer accepting applications. The SBA itself does not currently offer general startup grants; SBA programs are loans, not grants. Startups looking for grant funding can explore Grants.gov, state economic-development agencies, and industry-specific programs, while the SBA Microloan and Community Advantage programs remain the closest thing to accessible SBA funding for pre-revenue businesses.' }
        ],

        closingCta: {
            heading: 'Ready to explore your funding options?',
            bodyHtml: 'Whether SBA is the right fit or alternative lending gets you there faster, a two-minute match at Lendmate Capital surfaces both in one conversation. See the broader <a href="/sba-loans">SBA loans hub</a> for other scenarios, or compare <a href="/business-loans">traditional business loans</a> as a faster-funding companion option.',
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

// Sitemap entry (idempotent)
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
