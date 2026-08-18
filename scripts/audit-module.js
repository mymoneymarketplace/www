#!/usr/bin/env node
/**
 * audit-module.js — importable per-page content-audit checks.
 *
 * Exports pure check functions that take (html, context) and return findings.
 * Used by:
 *   - scripts/content-audit.js (full site-wide audit; CLI)
 *   - scripts/generate-industry-page.js (pre-publish guardrail)
 *   - scripts/generate-state-industry-page.js (pre-publish guardrail)
 *   - scripts/pre-commit-audit.js (git pre-commit hook)
 *
 * Severity scale: CRITICAL | HIGH | MEDIUM | LOW
 * BLOCKING_SEVERITIES = ['CRITICAL', 'HIGH'] — these halt generators/hooks.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Constants ─────────────────────────────────────────────────────────
const BLOCKING_SEVERITIES = ['CRITICAL', 'HIGH'];
const ALL_CHECK_NAMES = [
    'cross-page-leakage', 'state-leakage', 'structural',
    'internal-link-validity', 'content-quality', 'cta-correctness',
    'data-traceability', 'placeholder-literal', 'stale-date', 'affiliate-rel',
];
// Checks suitable to run as a pre-publish guardrail on a single page
const PRE_PUBLISH_CHECKS = [
    'cross-page-leakage', 'state-leakage', 'structural',
    'content-quality', 'cta-correctness',
    'placeholder-literal', 'stale-date', 'affiliate-rel',
];

// Hosts whose outbound links are monetized/affiliate and MUST carry
// rel="nofollow sponsored" (see checkAffiliateRel). Keep in sync with the
// generators' CTA templates and the monetization rule in the skill.
const AFFILIATE_HOSTS = ['lendmatecapital.com', 'cardratings.com'];

const INDUSTRY_TERMS = {
    'restaurants':        ['restaurant',  'dining',     'chef',         'menu pricing'],
    'dentists':           ['dental',      'dentist'],
    'physicians':         ['physician',   'medical practice'],
    'veterinarians':      ['veterinary',  'veterinarian'],
    'chiropractors':      ['chiropractic','chiropractor'],
    'auto-repair':        ['auto repair', 'mechanical repair'],
    'auto-body':          ['auto body',   'collision repair'],
    'landscaping':        ['landscaping', 'landscaper'],
    'plumbing-hvac':      ['plumbing',    'hvac'],
    'child-care':         ['child care',  'daycare',    'child-care center'],
    'beauty-salons':      ['beauty salon','hair salon'],
    'pet-care':           ['pet care',    'pet boarding','dog daycare','pet grooming'],
    'personal-care':      ['medspa',      'med spa',    'nail salon'],
    'cpas':               ['cpa firm',    'cpa practice'],
    'accounting':         ['bookkeeping service','tax prep'],
    'insurance-agencies': ['insurance agency','book of business'],
    'specialty-trades':   ['specialty trade contractor','welding contractor'],
    'building-services':  ['commercial cleaning'],
    'startups':           ['pre-revenue startup'],
    'franchise':          ['sba franchise directory'],
};

const SLUG_TO_NAICS = {
    'restaurants': '722511', 'auto-repair': '811111', 'dentists': '621210',
    'physicians': '621111', 'veterinarians': '541940', 'insurance-agencies': '524210',
    'plumbing-hvac': '238220', 'child-care': '624410', 'landscaping': '561730',
    'specialty-trades': '238990', 'pet-care': '812910', 'personal-care': '812199',
    'cpas': '541211', 'accounting': '541219', 'auto-body': '811121',
    'chiropractors': '621310', 'beauty-salons': '812112', 'building-services': '561790',
};

const STATE_NAMES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];

const STATE_ABBRS = new Set(['al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia','ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj','nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt','va','wa','wv','wi','wy','dc']);
const STATE_SLUGS = new Set(['california','texas','florida','new-york','illinois','ohio','georgia','michigan','pennsylvania','north-carolina','new-jersey','virginia','washington','arizona','massachusetts','tennessee','indiana','missouri','maryland','wisconsin','colorado','minnesota','south-carolina','alabama','louisiana','kentucky','oregon','oklahoma','connecticut','utah','iowa','nevada','arkansas','mississippi','kansas','new-mexico','nebraska','idaho','west-virginia','hawaii','new-hampshire','maine','montana','rhode-island','delaware','south-dakota','north-dakota','alaska','vermont','wyoming','puerto-rico']);

const STOPWORDS = new Set(['the','a','an','and','or','for','to','of','in','on','with','at','by','from','as','is','are','be','this','that','these','those','sba','loans','loan','2026','2025','my','money','marketplace','|','&','&ndash;','mdash','ndash','your']);

const REQUIRED_LD_TYPES_SBA = ['Organization', 'BreadcrumbList', 'Article', 'FinancialService', 'FAQPage'];

// ─── Parsing helpers ───────────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function stripTags(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&[a-z#0-9]+;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function wordCount(html) { return stripTags(html).split(/\s+/).filter(Boolean).length; }

function extractTitle(html) { const m = html.match(/<title>([\s\S]*?)<\/title>/i); return m ? m[1].trim() : ''; }
function extractMetaDescription(html) { const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i); return m ? m[1].trim() : ''; }
function extractH1(html) { const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i); return m ? stripTags(m[1]) : ''; }
function extractAllHeadings(html) { const out = []; const re = /<(h[1-4])[^>]*>([\s\S]*?)<\/\1>/gi; let m; while ((m = re.exec(html)) !== null) out.push({ tag: m[1].toLowerCase(), text: stripTags(m[2]) }); return out; }
function extractProgramLabels(html) { const out = []; const re = /<div class="program-label">([\s\S]*?)<\/div>/g; let m; while ((m = re.exec(html)) !== null) out.push(stripTags(m[1])); return out; }
function extractProgramFits(html) { const out = []; const re = /<p class="program-fit">([\s\S]*?)<\/p>/g; let m; while ((m = re.exec(html)) !== null) out.push(stripTags(m[1])); return out; }
function extractCanonical(html) { const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i); return m ? m[1] : ''; }
function extractOgUrl(html) { const m = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i); return m ? m[1] : ''; }

function extractJsonLd(html) {
    const blocks = [];
    const re = /<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        try { blocks.push(JSON.parse(m[1])); } catch (e) { blocks.push({ _parseError: e.message }); }
    }
    return blocks;
}

function collectSchemaTypes(ldBlocks) {
    const types = new Set();
    for (const b of ldBlocks) {
        if (b._parseError) continue;
        const graph = b['@graph'] || [b];
        for (const item of graph) if (item && item['@type']) types.add(item['@type']);
    }
    return types;
}

function extractAllHrefs(html) {
    const out = [];
    const re = /href=["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) out.push(m[1]);
    return out;
}

function bodyTextWithoutLinksAndHeadings(html) {
    return stripTags(html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' '));
}

function isStateScoped(urlPath) {
    const segments = urlPath.split('/').filter(Boolean);
    if (segments.length === 0) return false;
    const last = segments[segments.length - 1];
    if (STATE_SLUGS.has(last)) return true;
    const m = last.match(/-([a-z]{2})$/);
    return !!(m && STATE_ABBRS.has(m[1]));
}

// ─── Per-page check functions ──────────────────────────────────────────

function checkCrossPageLeakage(html, { urlPath }) {
    const findings = [];
    const sbaMatch = urlPath.match(/^\/sba-loans\/([^/]+)(?:\/|$)/);
    if (!sbaMatch) return findings;
    const ownSlug = sbaMatch[1];
    if (!ownSlug) return findings;

    const scenarioSlugs = new Set(['startups','bad-credit','no-collateral','franchise','business-acquisition','disaster','veterans','women','self-employed','minority','after-bankruptcy','requirements']);
    const isScenario = scenarioSlugs.has(ownSlug);

    const title = extractTitle(html);
    const metaDesc = extractMetaDescription(html);
    const h1 = extractH1(html);
    const headings = extractAllHeadings(html);
    const programLabels = extractProgramLabels(html);
    const programFits = extractProgramFits(html);
    const proseText = bodyTextWithoutLinksAndHeadings(html).toLowerCase();

    for (const [otherSlug, terms] of Object.entries(INDUSTRY_TERMS)) {
        if (otherSlug === ownSlug) continue;
        if (isScenario && otherSlug === 'franchise' && ownSlug !== 'franchise') continue;
        for (const term of terms) {
            const termLower = term.toLowerCase();
            const termRe = new RegExp(`\\b${termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

            if (termRe.test(title.toLowerCase())) findings.push({ check: 'cross-page-leakage', page: urlPath, severity: 'CRITICAL', finding: `Industry term "${term}" (from /${otherSlug}/) appears in <title>: "${title}"`, fix: `Rewrite <title> to remove "${term}"` });
            if (termRe.test(metaDesc.toLowerCase())) findings.push({ check: 'cross-page-leakage', page: urlPath, severity: 'CRITICAL', finding: `Industry term "${term}" (from /${otherSlug}/) appears in <meta description>`, fix: `Rewrite meta description to remove "${term}"` });
            if (termRe.test(h1.toLowerCase())) findings.push({ check: 'cross-page-leakage', page: urlPath, severity: 'HIGH', finding: `Industry term "${term}" (from /${otherSlug}/) appears in <h1>: "${h1}"`, fix: `Rewrite H1 to remove "${term}"` });
            for (const lbl of programLabels) if (termRe.test(lbl.toLowerCase())) findings.push({ check: 'cross-page-leakage', page: urlPath, severity: 'HIGH', finding: `Industry term "${term}" (from /${otherSlug}/) in program-label: "${lbl}"`, fix: 'Update programsContext.labels in config' });
            for (const fit of programFits) if (termRe.test(fit.toLowerCase())) findings.push({ check: 'cross-page-leakage', page: urlPath, severity: 'HIGH', finding: `Industry term "${term}" (from /${otherSlug}/) in program-card text: "${fit.substring(0, 120)}..."`, fix: 'Update programsContext.fits in config' });
            for (const { tag, text } of headings) {
                if (tag === 'h1') continue;
                if (termRe.test(text.toLowerCase())) findings.push({ check: 'cross-page-leakage', page: urlPath, severity: 'HIGH', finding: `Industry term "${term}" (from /${otherSlug}/) in <${tag}>: "${text.substring(0, 120)}"`, fix: `Rewrite ${tag} to remove "${term}"` });
            }
            if (!isScenario && termRe.test(proseText)) {
                findings.push({ check: 'cross-page-leakage', page: urlPath, severity: 'MEDIUM', finding: `Industry term "${term}" (from /${otherSlug}/) appears in body prose (outside links and headings)`, fix: 'Review context — may be legitimate reference or may need rewording' });
            }
        }
    }
    return findings;
}

function checkStateLeakage(html, { urlPath }) {
    const findings = [];
    if (isStateScoped(urlPath)) return findings;

    const title = extractTitle(html);
    const metaDesc = extractMetaDescription(html);
    const h1 = extractH1(html);
    const headings = extractAllHeadings(html);

    for (const state of STATE_NAMES) {
        const re = new RegExp(`\\b${state}\\b`);
        if (re.test(title)) findings.push({ check: 'state-leakage', page: urlPath, severity: 'CRITICAL', finding: `State name "${state}" in <title>: "${title}"`, fix: 'Rewrite title to be state-neutral or move to a state-scoped URL' });
        if (re.test(metaDesc)) findings.push({ check: 'state-leakage', page: urlPath, severity: 'CRITICAL', finding: `State name "${state}" in meta description`, fix: 'Rewrite meta description to be state-neutral' });
        if (re.test(h1)) findings.push({ check: 'state-leakage', page: urlPath, severity: 'HIGH', finding: `State name "${state}" in <h1>: "${h1}"`, fix: 'Rewrite H1 to be state-neutral' });
        for (const { tag, text } of headings) {
            if (tag === 'h1') continue;
            if (re.test(text)) findings.push({ check: 'state-leakage', page: urlPath, severity: 'HIGH', finding: `State name "${state}" in <${tag}>: "${text.substring(0, 120)}"`, fix: `Rewrite ${tag} to be state-neutral (or move to state-scoped URL)` });
        }
    }
    return findings;
}

function checkStructural(html, { urlPath }) {
    const findings = [];
    const canonical = extractCanonical(html);
    const ogUrl = extractOgUrl(html);
    // Trailing-slash canonical form. GitHub Pages 301s /path -> /path/, so the
    // served URL is always /path/ (and root is /). Match that in canonicals.
    const expectedCanon = urlPath === '/'
        ? 'https://mymoneymarketplace.com/'
        : `https://mymoneymarketplace.com${urlPath}${urlPath.endsWith('/') ? '' : '/'}`;

    if (!canonical) findings.push({ check: 'structural', page: urlPath, severity: 'HIGH', finding: 'Missing canonical link', fix: 'Add <link rel="canonical" href="..."> to <head>' });
    else if (canonical !== expectedCanon) findings.push({ check: 'structural', page: urlPath, severity: 'HIGH', finding: `Canonical mismatch: "${canonical}" but expected "${expectedCanon}"`, fix: 'Correct the canonical URL to match the file path' });

    if (!ogUrl) findings.push({ check: 'structural', page: urlPath, severity: 'MEDIUM', finding: 'Missing og:url', fix: 'Add <meta property="og:url" content="...">' });
    else if (canonical && ogUrl !== canonical) findings.push({ check: 'structural', page: urlPath, severity: 'MEDIUM', finding: `og:url doesn't match canonical`, fix: 'Make og:url match canonical' });

    const isSba = /^\/sba-loans\//.test(urlPath);
    const ldBlocks = extractJsonLd(html);
    for (const err of ldBlocks.filter(b => b._parseError)) findings.push({ check: 'structural', page: urlPath, severity: 'HIGH', finding: `JSON-LD parse error: ${err._parseError}`, fix: 'Fix JSON-LD syntax' });
    if (isSba) {
        const types = collectSchemaTypes(ldBlocks);
        for (const req of REQUIRED_LD_TYPES_SBA) {
            if (!types.has(req)) findings.push({ check: 'structural', page: urlPath, severity: 'HIGH', finding: `Missing required JSON-LD @type "${req}" on SBA page`, fix: `Add ${req} block to the JSON-LD @graph` });
        }
        if (!/does not originate SBA|not originate SBA loans|do not originate SBA/i.test(html)) findings.push({ check: 'structural', page: urlPath, severity: 'MEDIUM', finding: 'Missing non-origination disclosure on SBA page', fix: 'Add "MMM does not originate SBA loans..." text somewhere on the page' });
    }

    const emptyAnchors = (html.match(/href=["']#["']/g) || []).length + (html.match(/href=["']["']/g) || []).length;
    if (emptyAnchors > 0) {
        const quizPlaceholder = /id=["']resultCta["'][^>]*href=["']#["']/.test(html) ? 1 : 0;
        const realEmpty = emptyAnchors - quizPlaceholder;
        if (realEmpty > 0) findings.push({ check: 'structural', page: urlPath, severity: 'LOW', finding: `${realEmpty} empty or "#" anchor(s) present (excluding quiz-result placeholder)`, fix: 'Replace with real URLs or remove' });
    }

    const wc = wordCount(html);
    if (wc < 800) findings.push({ check: 'structural', page: urlPath, severity: 'MEDIUM', finding: `Low word count: ${wc} words (<800)`, fix: 'Expand editorial content or evaluate whether page has enough substance' });
    else if (wc > 4000) findings.push({ check: 'structural', page: urlPath, severity: 'LOW', finding: `High word count: ${wc} words (>4000)`, fix: 'Consider splitting content or tightening editorial' });

    return findings;
}

function checkInternalLinkValidity(html, { urlPath, urlSet }) {
    const findings = [];
    if (!urlSet) return findings;
    const hrefs = extractAllHrefs(html);
    const seen = new Set();
    const seenSlash = new Set();
    // Assets that legitimately end in an extension — skip slash check.
    const EXT_RE = /\.(?:html|pdf|png|jpe?g|gif|svg|ico|css|js|xml|txt|webp)$/i;
    for (const raw of hrefs) {
        let href = raw.trim();
        if (!href || href === '#' || href.startsWith('#')) continue;
        if (/^mailto:|^tel:|^javascript:/i.test(href)) continue;
        const absUrl = href.match(/^https?:\/\/([^/]+)(\/.*)?$/i);
        if (absUrl) {
            if (!/mymoneymarketplace\.com/i.test(absUrl[1])) continue;
            href = absUrl[2] || '/';
        }
        if (!href.startsWith('/')) continue;
        const bare = href.split('#')[0].split('?')[0];
        if (!bare) continue;

        // Trailing-slash body-link check: canonical form for on-site paths
        // is /path/ (except when the path targets a file with an extension).
        // Fires once per unique bare URL per page.
        if (!seenSlash.has(bare)) {
            seenSlash.add(bare);
            if (bare !== '/' && !bare.endsWith('/') && !EXT_RE.test(bare)) {
                findings.push({
                    check: 'internal-link-validity',
                    page: urlPath,
                    severity: 'HIGH',
                    finding: `Internal link missing trailing slash: "${bare}"`,
                    fix: 'Change to "' + bare + '/" — GitHub Pages 301s the non-slash form; the served URL is trailing-slash.'
                });
            }
        }

        if (seen.has(bare)) continue;
        seen.add(bare);
        if (!urlSet.has(bare)) findings.push({ check: 'internal-link-validity', page: urlPath, severity: 'HIGH', finding: `Dead internal link: "${bare}"`, fix: 'Fix the link target or remove' });
    }
    return findings;
}

function checkContentQuality(html, { urlPath }) {
    const findings = [];
    const text = stripTags(html);

    const tokens = text.match(/\{[a-z_]+\}/g);
    if (tokens) {
        for (const t of [...new Set(tokens)]) findings.push({ check: 'content-quality', page: urlPath, severity: 'CRITICAL', finding: `Unreplaced placeholder token "${t}" in body`, fix: 'Replace with real content or remove' });
    }
    if (/\b(TODO|FIXME|XXX)\b/.test(text)) {
        const m = text.match(/\b(TODO|FIXME|XXX)\b[^.]{0,80}/);
        findings.push({ check: 'content-quality', page: urlPath, severity: 'MEDIUM', finding: `Development marker in body: "${m[0].substring(0, 100)}"`, fix: 'Resolve the marker' });
    }
    if (/\blorem ipsum\b/i.test(text) || /\bdolor sit amet\b/i.test(text)) findings.push({ check: 'content-quality', page: urlPath, severity: 'CRITICAL', finding: 'Lorem Ipsum placeholder text in body', fix: 'Replace with real copy' });

    const stem = w => w.replace(/s$/, '');
    const title = extractTitle(html);
    const h1 = extractH1(html);
    if (title && h1) {
        const titleWords = new Set([...title.toLowerCase().split(/[^a-z0-9]+/)].filter(w => w && !STOPWORDS.has(w)).map(stem));
        const h1Words = new Set([...h1.toLowerCase().split(/[^a-z0-9]+/)].filter(w => w && !STOPWORDS.has(w)).map(stem));
        let common = 0;
        for (const w of titleWords) if (h1Words.has(w)) common++;
        if (common === 0 && titleWords.size >= 2 && h1Words.size >= 2) findings.push({ check: 'content-quality', page: urlPath, severity: 'MEDIUM', finding: `Title and H1 have no non-stopword overlap. Title: "${title}" | H1: "${h1}"`, fix: 'Align title and H1 themes' });
    }
    return findings;
}

function checkCtaCorrectness(html, { urlPath }) {
    const findings = [];
    const sbaMatch = urlPath.match(/^\/sba-loans\/([^/]+)(?:\/|$)/);
    if (!sbaMatch) return findings;
    const pageSlug = sbaMatch[1];

    const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    const re = /https:\/\/lendmatecapital\.com\/\?[^"'\s<>]+/g;
    const urls = stripped.match(re) || [];
    const utmContentSeen = new Map();
    for (const url of urls) {
        const campaignMatch = url.match(/utm_campaign=([^&"']+)/);
        const contentMatch = url.match(/utm_content=([^&"']+)/);
        const campaign = campaignMatch ? campaignMatch[1] : '';
        const content = contentMatch ? contentMatch[1] : '';
        const expectedPrefix = `sba-${pageSlug}`;
        if (campaign && !campaign.startsWith(expectedPrefix)) findings.push({ check: 'cta-correctness', page: urlPath, severity: 'HIGH', finding: `utm_campaign "${campaign}" doesn't match page slug "${pageSlug}" (expected prefix "${expectedPrefix}")`, fix: 'Correct the utm_campaign to match the page' });
        if (!content) findings.push({ check: 'cta-correctness', page: urlPath, severity: 'LOW', finding: `Lendmate URL missing utm_content: ${url.substring(0, 100)}`, fix: 'Add utm_content for attribution' });
        else utmContentSeen.set(content, (utmContentSeen.get(content) || 0) + 1);
    }
    for (const [content, count] of utmContentSeen.entries()) {
        if (count > 1 && /profile-/.test(content)) findings.push({ check: 'cta-correctness', page: urlPath, severity: 'MEDIUM', finding: `utm_content "${content}" appears ${count} times (quiz profiles should be distinct)`, fix: 'Ensure each quiz profile has a unique utm_content' });
    }
    return findings;
}

function checkDataTraceability(html, { urlPath, industryData }) {
    const findings = [];
    if (!industryData) return findings;
    const sbaMatch = urlPath.match(/^\/sba-loans\/([^/]+)\/?$/);
    if (!sbaMatch) return findings;
    const slug = sbaMatch[1];
    const naics = SLUG_TO_NAICS[slug];
    if (!naics) return findings;
    const indData = industryData.industries[naics];
    if (!indData) return findings;
    const stats = indData.stats;
    const text = stripTags(html);

    const checks = [
        { pattern: new RegExp(`\\b${stats.loan_count.toLocaleString('en-US')}\\s+loans\\b`), required: true, label: `loan_count=${stats.loan_count}` },
        { pattern: new RegExp(`\\b${stats.charge_off_pct.toFixed(2)}\\s*%`), required: true, label: `charge_off_pct=${stats.charge_off_pct}%` },
    ];
    for (const c of checks) {
        if (!c.pattern.test(text) && c.required) findings.push({ check: 'data-traceability', page: urlPath, severity: 'LOW', finding: `Expected data point not found on page: ${c.label}`, fix: 'Verify page stats match data source or update copy' });
    }
    return findings;
}

// Unreplaced integration/config placeholders that shipped to production —
// the ALLCAPS cousins of the {curly} tokens content-quality already catches.
// Curated shapes (not a blanket ALLCAPS_UNDERSCORE match) so legitimate inline
// JS constants like BASE_UTM / PROFILES are never flagged.
const PLACEHOLDER_PATTERNS = [
    /\b(?:[A-Z0-9]+_)?(?:MEASUREMENT_ID|API_KEY|APIKEY|CLIENT_ID|CLIENT_SECRET|ACCESS_TOKEN|AUTH_TOKEN|TRACKING_ID|CONTAINER_ID|PIXEL_ID|SITE_KEY|SECRET_KEY|PRIVATE_KEY|PUBLIC_KEY|APP_ID|PROJECT_ID|PROPERTY_ID)\b/g,
    /\bYOUR_[A-Z0-9_]{2,}\b/g,
    /\bINSERT[_-][A-Z0-9_]{2,}\b/g,
    /\bREPLACE[_-][A-Z0-9_]{2,}\b/g,
    /\b[A-Z0-9]{2,}_HERE\b/g,
    /\b(?:UA|G|GT|AW|GTM|FB)-[X0O#]{4,}\b/g,
    /\bX{6,}\b/g,
    /\bPLACEHOLDER\b/g,
];

function checkPlaceholderLiteral(html, { urlPath }) {
    // Collect every match across patterns with its span, then keep only
    // non-overlapping hits so a token matched by two patterns (e.g.
    // "G-XXXXXXX" also matching the X-run rule) is reported once.
    const hits = [];
    for (const re of PLACEHOLDER_PATTERNS) {
        let m;
        re.lastIndex = 0;
        while ((m = re.exec(html)) !== null) {
            hits.push({ tok: m[0], start: m.index, end: m.index + m[0].length });
            if (m.index === re.lastIndex) re.lastIndex++;
        }
    }
    hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const findings = [];
    const seenTok = new Set();
    let coveredTo = -1;
    for (const h of hits) {
        if (h.start < coveredTo) continue;       // overlaps an already-reported span
        coveredTo = h.end;
        if (seenTok.has(h.tok)) continue;         // same literal elsewhere on page
        seenTok.add(h.tok);
        findings.push({ check: 'placeholder-literal', page: urlPath, severity: 'HIGH', finding: `Unreplaced literal placeholder "${h.tok}" shipped on page (dead/mis-wired integration)`, fix: 'Replace with the real value or remove the snippet' });
    }
    return findings;
}

const MONTH_INDEX = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6,
    august: 7, september: 8, october: 9, november: 10, december: 11,
    jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8,
    oct: 9, nov: 10, dec: 11,
};
const STALE_DATE_DAYS = 90;

// Flag decaying "as of <Month> <Year>" stamps older than STALE_DATE_DAYS.
// context.now (ISO string) overrides the clock for deterministic tests.
function checkStaleDate(html, context) {
    const findings = [];
    const urlPath = context.urlPath;
    const now = context && context.now ? new Date(context.now) : new Date();
    const text = stripTags(html).replace(/\s+/g, ' ');
    const re = /\b(?:as of|updated|last updated|current as of|accurate as of|rates as of|data as of|effective)\s+([A-Za-z]{3,9})\.?\s+(\d{4})\b/gi;
    let m;
    const seen = new Set();
    while ((m = re.exec(text)) !== null) {
        const monthIdx = MONTH_INDEX[m[1].toLowerCase()];
        if (monthIdx === undefined) continue;
        const year = parseInt(m[2], 10);
        // End of the referenced month — the most recent instant the phrase can mean.
        const asOf = new Date(year, monthIdx + 1, 0);
        const ageDays = Math.floor((now - asOf) / 86400000);
        if (ageDays > STALE_DATE_DAYS) {
            const phrase = m[0];
            if (seen.has(phrase)) continue;
            seen.add(phrase);
            findings.push({ check: 'stale-date', page: urlPath, severity: 'MEDIUM', finding: `Stale dated claim "${phrase}" is ~${ageDays} days old (>${STALE_DATE_DAYS})`, fix: 'Re-verify and refresh the date, or phrase structurally without a decaying date' });
        }
    }
    return findings;
}

// Every outbound affiliate anchor must carry rel="nofollow sponsored"
// (undisclosed affiliate links are a manual-action + FTC-disclosure risk).
function checkAffiliateRel(html, { urlPath }) {
    const findings = [];
    const tags = html.match(/<a\b[^>]*>/gi) || [];
    const seen = new Set();
    for (const tag of tags) {
        const hrefM = tag.match(/href=["']([^"']+)["']/i);
        if (!hrefM) continue;
        const href = hrefM[1];
        if (!AFFILIATE_HOSTS.some(h => href.includes(h))) continue;
        const relM = tag.match(/\brel=["']([^"']*)["']/i);
        const rel = (relM ? relM[1] : '').toLowerCase();
        const hasNofollow = /\bnofollow\b/.test(rel);
        const hasSponsored = /\bsponsored\b/.test(rel);
        if (hasNofollow && hasSponsored) continue;
        if (seen.has(href)) continue;
        seen.add(href);
        const missing = [!hasNofollow ? 'nofollow' : null, !hasSponsored ? 'sponsored' : null].filter(Boolean).join(' + ');
        findings.push({ check: 'affiliate-rel', page: urlPath, severity: 'HIGH', finding: `Affiliate link missing rel ${missing}: ${href.substring(0, 90)}`, fix: 'Add rel="nofollow sponsored" (preserve any existing noopener)' });
    }
    return findings;
}

// ─── Aggregate runner + signature/baseline helpers ─────────────────────

const CHECKS = {
    'cross-page-leakage': checkCrossPageLeakage,
    'state-leakage': checkStateLeakage,
    'structural': checkStructural,
    'internal-link-validity': checkInternalLinkValidity,
    'content-quality': checkContentQuality,
    'cta-correctness': checkCtaCorrectness,
    'data-traceability': checkDataTraceability,
    'placeholder-literal': checkPlaceholderLiteral,
    'stale-date': checkStaleDate,
    'affiliate-rel': checkAffiliateRel,
};

/**
 * Run a named subset of checks against one page's HTML.
 * @param {string} html
 * @param {object} context - { urlPath, urlSet?, industryData?, checkNames? }
 *   checkNames defaults to PRE_PUBLISH_CHECKS.
 * @returns {Array<{check,page,severity,finding,fix}>}
 */
function runChecks(html, context) {
    const names = context.checkNames || PRE_PUBLISH_CHECKS;
    const findings = [];
    for (const name of names) {
        const fn = CHECKS[name];
        if (!fn) continue;
        try { findings.push(...fn(html, context)); }
        catch (e) { findings.push({ check: name, page: context.urlPath || '?', severity: 'LOW', finding: `Check crashed: ${e.message}`, fix: 'Report to audit-module maintainer' }); }
    }
    return findings;
}

/**
 * Stable signature used for matching findings against a baseline of grandfathered issues.
 * Normalizes the variable/quoted portion of the finding text.
 */
function findingSignature(f) {
    // Use page + check + severity + a loose normalization of the finding text's fixed portion
    const core = (f.finding || '')
        .replace(/"[^"]*"/g, '""')          // drop quoted literals (often vary)
        .replace(/\s+/g, ' ')
        .trim();
    return `${f.page}|${f.check}|${f.severity}|${core}`;
}

/**
 * Load a baseline file (JSON array of signatures) into a Set.
 * Returns an empty Set if the file is missing.
 */
function loadBaseline(baselinePath) {
    try {
        const data = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
        return new Set(Array.isArray(data) ? data : data.signatures || []);
    } catch (e) { return new Set(); }
}

/** Filter findings to only those NOT already present in the baseline. */
function filterNewFindings(findings, baselineSet) {
    if (!baselineSet || baselineSet.size === 0) return findings;
    return findings.filter(f => !baselineSet.has(findingSignature(f)));
}

function hasBlockingFindings(findings) {
    return findings.some(f => BLOCKING_SEVERITIES.includes(f.severity));
}

function formatFinding(f) {
    return `[${f.severity}] (${f.check}) ${f.page}\n    ${f.finding}\n    fix: ${f.fix}`;
}

// ─── File-tree helpers (for generator + hook consumers) ────────────────
function fileToUrlPath(absPath, siteRoot) {
    const rel = path.relative(siteRoot, absPath).replace(/\\/g, '/');
    if (rel === 'index.html') return '/';
    if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'/index.html'.length);
    return '/' + rel.replace(/\.html$/, '');
}

function buildUrlSetFromSiteRoot(siteRoot) {
    const urlSet = new Set();
    const skip = new Set(['node_modules', 'data', 'scripts', '.git', 'worker', 'guides']);
    (function walk(d) {
        let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
        for (const e of es) {
            if (e.isDirectory()) { if (skip.has(e.name)) continue; walk(path.join(d, e.name)); }
            else if (e.isFile() && e.name === 'index.html') {
                const u = fileToUrlPath(path.join(d, e.name), siteRoot);
                urlSet.add(u);
                urlSet.add(u + '/');
                if (u !== '/') urlSet.add(u + '/index.html');
            }
        }
    })(siteRoot);
    return urlSet;
}

module.exports = {
    // Check functions by name
    CHECKS,
    runChecks,

    // Individual checks (for power users)
    checkCrossPageLeakage,
    checkStateLeakage,
    checkStructural,
    checkInternalLinkValidity,
    checkContentQuality,
    checkCtaCorrectness,
    checkDataTraceability,
    checkPlaceholderLiteral,
    checkStaleDate,
    checkAffiliateRel,

    // Baseline & signature helpers
    findingSignature,
    loadBaseline,
    filterNewFindings,
    hasBlockingFindings,
    formatFinding,

    // Constants
    BLOCKING_SEVERITIES,
    ALL_CHECK_NAMES,
    PRE_PUBLISH_CHECKS,
    AFFILIATE_HOSTS,

    // File-tree helpers
    fileToUrlPath,
    buildUrlSetFromSiteRoot,

    // Text extraction (for tests / other consumers)
    stripTags, wordCount, extractTitle, extractH1, extractMetaDescription,
};
