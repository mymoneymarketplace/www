#!/usr/bin/env node
/**
 * content-audit.js — diagnostic audit of all mmm-site pages.
 *
 * Runs 8 checks and writes a markdown report to data/content-audit-report.md.
 * Does not modify any page. Designed to complete in under 2 minutes for the
 * current page inventory (~316 pages).
 *
 * Usage:  node scripts/content-audit.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'data', 'content-audit-report.md');

// ─── Industry → forbidden-terms mapping for Check 1 ─────────────────────
// Terms listed here are industry-specific vocabulary that should NOT appear
// in structural elements (H1/H2/H3/title/meta/program cards) of OTHER
// industry pages. Legitimate cross-industry mentions in prose or inside
// <a> tags are ignored.
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
    // Everything else: no industry-specific vocab to flag
};

// NAICS mapping for data-claim traceability
const SLUG_TO_NAICS = {
    'restaurants': '722511', 'auto-repair': '811111', 'dentists': '621210',
    'physicians': '621111', 'veterinarians': '541940', 'insurance-agencies': '524210',
    'plumbing-hvac': '238220', 'child-care': '624410', 'landscaping': '561730',
    'specialty-trades': '238990', 'pet-care': '812910', 'personal-care': '812199',
    'cpas': '541211', 'accounting': '541219', 'auto-body': '811121',
    'chiropractors': '621310', 'beauty-salons': '812112', 'building-services': '561790',
};

// State names for Check 2 (state-name leakage)
const STATE_NAMES = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];

// Common English words for title/H1 comparison
const STOPWORDS = new Set(['the','a','an','and','or','for','to','of','in','on','with','at','by','from','as','is','are','be','this','that','these','those','sba','loans','loan','2026','2025','my','money','marketplace','|','&','&ndash;','mdash','ndash','your']);

// ─── File walking ───────────────────────────────────────────────────────
function findPages() {
    const skipDirs = new Set(['node_modules', 'data', 'scripts', '.git', 'worker', 'guides']);
    const pages = [];
    (function walk(dir) {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (skipDirs.has(entry.name)) continue;
                walk(path.join(dir, entry.name));
            } else if (entry.isFile() && entry.name.endsWith('.html')) {
                pages.push(path.join(dir, entry.name));
            }
        }
    })(ROOT);
    return pages.sort();
}

// ─── URL helpers ────────────────────────────────────────────────────────
function fileToUrlPath(absPath) {
    const rel = path.relative(ROOT, absPath).replace(/\\/g, '/');
    if (rel === 'index.html') return '/';
    if (rel.endsWith('/index.html')) return '/' + rel.slice(0, -'/index.html'.length);
    return '/' + rel.replace(/\.html$/, '');
}

function buildUrlIndex(pages) {
    const urlSet = new Set();
    for (const p of pages) {
        const u = fileToUrlPath(p);
        urlSet.add(u);
        urlSet.add(u + '/');
        if (u !== '/') urlSet.add(u + '/index.html');
    }
    return urlSet;
}

// ─── Text extraction helpers ────────────────────────────────────────────
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

function extractTitle(html) {
    const m = html.match(/<title>([\s\S]*?)<\/title>/i);
    return m ? m[1].trim() : '';
}

function extractMetaDescription(html) {
    const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i);
    return m ? m[1].trim() : '';
}

function extractH1(html) {
    const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    return m ? stripTags(m[1]) : '';
}

function extractAllHeadings(html) {
    const out = [];
    const re = /<(h[1-4])[^>]*>([\s\S]*?)<\/\1>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        out.push({ tag: m[1].toLowerCase(), text: stripTags(m[2]) });
    }
    return out;
}

function extractProgramLabels(html) {
    const out = [];
    const re = /<div class="program-label">([\s\S]*?)<\/div>/g;
    let m;
    while ((m = re.exec(html)) !== null) out.push(stripTags(m[1]));
    return out;
}

function extractProgramFits(html) {
    const out = [];
    const re = /<p class="program-fit">([\s\S]*?)<\/p>/g;
    let m;
    while ((m = re.exec(html)) !== null) out.push(stripTags(m[1]));
    return out;
}

function extractCanonical(html) {
    const m = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    return m ? m[1] : '';
}

function extractOgUrl(html) {
    const m = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
    return m ? m[1] : '';
}

function extractJsonLd(html) {
    const blocks = [];
    const re = /<script\s+type=["']application\/ld\+json["']\s*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        try {
            const parsed = JSON.parse(m[1]);
            blocks.push(parsed);
        } catch (e) {
            blocks.push({ _parseError: e.message });
        }
    }
    return blocks;
}

function collectSchemaTypes(ldBlocks) {
    const types = new Set();
    for (const b of ldBlocks) {
        if (b._parseError) continue;
        const graph = b['@graph'] || [b];
        for (const item of graph) {
            if (item && item['@type']) types.add(item['@type']);
        }
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

// Get body text stripped of <a>...</a> content AND structural elements,
// for cross-industry leakage check that tolerates legitimate cross-links.
function bodyTextWithoutLinksAndHeadings(html) {
    let s = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' '); // drop anchors
    return stripTags(s);
}

// ─── Issue collection ──────────────────────────────────────────────────
class Issues {
    constructor() { this.list = []; }
    add(issue) { this.list.push(issue); }
    byPage() {
        const m = new Map();
        for (const i of this.list) {
            if (!m.has(i.page)) m.set(i.page, []);
            m.get(i.page).push(i);
        }
        return m;
    }
    byCheck() {
        const m = new Map();
        for (const i of this.list) {
            if (!m.has(i.check)) m.set(i.check, []);
            m.get(i.check).push(i);
        }
        return m;
    }
    bySeverity() {
        const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
        for (const i of this.list) counts[i.severity] = (counts[i.severity] || 0) + 1;
        return counts;
    }
}

// ─── CHECK 1: Cross-page industry leakage ──────────────────────────────
function checkCrossPageLeakage(pages, issues) {
    for (const absPath of pages) {
        const urlPath = fileToUrlPath(absPath);
        const html = fs.readFileSync(absPath, 'utf8');

        // Determine the current page's industry slug (if it's an SBA industry page)
        const sbaMatch = urlPath.match(/^\/sba-loans\/([^/]+)(?:\/|$)/);
        if (!sbaMatch) continue;
        const ownSlug = sbaMatch[1];
        if (ownSlug === '') continue;

        // Pages we don't want to scan for leakage (hub, scenario pages have broader scope)
        const scenarioSlugs = new Set(['startups','bad-credit','no-collateral','franchise','business-acquisition','disaster','veterans','women','self-employed','minority','after-bankruptcy','requirements']);
        const isScenario = scenarioSlugs.has(ownSlug);

        // Elements by location severity
        const title = extractTitle(html);
        const metaDesc = extractMetaDescription(html);
        const h1 = extractH1(html);
        const headings = extractAllHeadings(html);
        const programLabels = extractProgramLabels(html);
        const programFits = extractProgramFits(html);
        const proseText = bodyTextWithoutLinksAndHeadings(html).toLowerCase();

        for (const [otherSlug, terms] of Object.entries(INDUSTRY_TERMS)) {
            if (otherSlug === ownSlug) continue;
            if (isScenario && otherSlug === 'franchise' && ownSlug !== 'franchise') continue; // scenario pages legitimately link to franchise
            for (const term of terms) {
                const termLower = term.toLowerCase();
                const termRe = new RegExp(`\\b${termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

                // CRITICAL: in title, meta description
                if (termRe.test(title.toLowerCase())) {
                    issues.add({ check: 'cross-page-leakage', page: urlPath, severity: 'CRITICAL', finding: `Industry term "${term}" (from /${otherSlug}/) appears in <title>: "${title}"`, fix: `Rewrite <title> to remove "${term}"` });
                }
                if (termRe.test(metaDesc.toLowerCase())) {
                    issues.add({ check: 'cross-page-leakage', page: urlPath, severity: 'CRITICAL', finding: `Industry term "${term}" (from /${otherSlug}/) appears in <meta description>`, fix: `Rewrite meta description to remove "${term}"` });
                }

                // HIGH: in H1
                if (termRe.test(h1.toLowerCase())) {
                    issues.add({ check: 'cross-page-leakage', page: urlPath, severity: 'HIGH', finding: `Industry term "${term}" (from /${otherSlug}/) appears in <h1>: "${h1}"`, fix: `Rewrite H1 to remove "${term}"` });
                }

                // HIGH: in program-card labels
                for (const lbl of programLabels) {
                    if (termRe.test(lbl.toLowerCase())) {
                        issues.add({ check: 'cross-page-leakage', page: urlPath, severity: 'HIGH', finding: `Industry term "${term}" (from /${otherSlug}/) in program-label: "${lbl}"`, fix: 'Update programsContext.labels in config' });
                    }
                }

                // HIGH: in program-card "Right for:" descriptions
                for (const fit of programFits) {
                    if (termRe.test(fit.toLowerCase())) {
                        issues.add({ check: 'cross-page-leakage', page: urlPath, severity: 'HIGH', finding: `Industry term "${term}" (from /${otherSlug}/) in program-card text: "${fit.substring(0, 120)}..."`, fix: 'Update programsContext.fits in config' });
                    }
                }

                // HIGH: in H2/H3
                for (const { tag, text } of headings) {
                    if (tag === 'h1') continue;
                    if (termRe.test(text.toLowerCase())) {
                        issues.add({ check: 'cross-page-leakage', page: urlPath, severity: 'HIGH', finding: `Industry term "${term}" (from /${otherSlug}/) in <${tag}>: "${text.substring(0, 120)}"`, fix: `Rewrite ${tag} to remove "${term}"` });
                    }
                }

                // MEDIUM: in prose (excluding links and headings) - only report once per term/page combo
                // Skip MEDIUM on scenario pages since they legitimately discuss multiple industries
                if (!isScenario && termRe.test(proseText)) {
                    // Only emit one MEDIUM issue per term per page to avoid noise
                    issues.add({ check: 'cross-page-leakage', page: urlPath, severity: 'MEDIUM', finding: `Industry term "${term}" (from /${otherSlug}/) appears in body prose (outside links and headings)`, fix: 'Review context — may be legitimate reference or may need rewording' });
                }
            }
        }
    }
}

// ─── CHECK 2: State-name leakage on non-state-scoped pages ──────────────
function checkStateLeakage(pages, issues) {
    // State-scoped URLs: either a full-state slug (e.g. /sba-loans/restaurants/california)
    // or a city slug ending in -XX where XX is a 2-letter state abbreviation (handles
    // multi-hyphen city slugs like /business-loans/colorado-springs-co).
    const STATE_ABBRS = new Set(['al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in','ia','ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv','nh','nj','nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn','tx','ut','vt','va','wa','wv','wi','wy','dc']);
    const STATE_SLUGS = new Set(['california','texas','florida','new-york','illinois','ohio','georgia','michigan','pennsylvania','north-carolina','new-jersey','virginia','washington','arizona','massachusetts','tennessee','indiana','missouri','maryland','wisconsin','colorado','minnesota','south-carolina','alabama','louisiana','kentucky','oregon','oklahoma','connecticut','utah','iowa','nevada','arkansas','mississippi','kansas','new-mexico','nebraska','idaho','west-virginia','hawaii','new-hampshire','maine','montana','rhode-island','delaware','south-dakota','north-dakota','alaska','vermont','wyoming','puerto-rico']);
    const isStateScoped = (urlPath) => {
        const segments = urlPath.split('/').filter(Boolean);
        if (segments.length === 0) return false;
        const last = segments[segments.length - 1];
        if (STATE_SLUGS.has(last)) return true;
        // City-state pattern: ends with -XX where XX is 2-letter state
        const m = last.match(/-([a-z]{2})$/);
        if (m && STATE_ABBRS.has(m[1])) return true;
        return false;
    };

    for (const absPath of pages) {
        const urlPath = fileToUrlPath(absPath);
        if (isStateScoped(urlPath)) continue;
        const html = fs.readFileSync(absPath, 'utf8');
        const title = extractTitle(html);
        const metaDesc = extractMetaDescription(html);
        const h1 = extractH1(html);
        const headings = extractAllHeadings(html);

        for (const state of STATE_NAMES) {
            const re = new RegExp(`\\b${state}\\b`);
            if (re.test(title)) {
                issues.add({ check: 'state-leakage', page: urlPath, severity: 'CRITICAL', finding: `State name "${state}" in <title>: "${title}"`, fix: 'Rewrite title to be state-neutral or move to a state-scoped URL' });
            }
            if (re.test(metaDesc)) {
                issues.add({ check: 'state-leakage', page: urlPath, severity: 'CRITICAL', finding: `State name "${state}" in meta description`, fix: 'Rewrite meta description to be state-neutral' });
            }
            if (re.test(h1)) {
                issues.add({ check: 'state-leakage', page: urlPath, severity: 'HIGH', finding: `State name "${state}" in <h1>: "${h1}"`, fix: 'Rewrite H1 to be state-neutral' });
            }
            for (const { tag, text } of headings) {
                if (tag === 'h1') continue;
                if (re.test(text)) {
                    issues.add({ check: 'state-leakage', page: urlPath, severity: 'HIGH', finding: `State name "${state}" in <${tag}>: "${text.substring(0, 120)}"`, fix: `Rewrite ${tag} to be state-neutral (or move to state-scoped URL)` });
                }
            }
        }
    }
}

// ─── CHECK 3: Structural integrity ──────────────────────────────────────
const REQUIRED_LD_TYPES_SBA = ['Organization', 'BreadcrumbList', 'Article', 'FinancialService', 'FAQPage'];

function checkStructural(pages, issues) {
    for (const absPath of pages) {
        const urlPath = fileToUrlPath(absPath);
        const html = fs.readFileSync(absPath, 'utf8');

        // Canonical presence and path match
        const canonical = extractCanonical(html);
        const ogUrl = extractOgUrl(html);
        const expectedCanonPath = urlPath === '/' ? '' : urlPath;
        const expectedCanon = `https://mymoneymarketplace.com${expectedCanonPath}`;

        if (!canonical) {
            issues.add({ check: 'structural', page: urlPath, severity: 'HIGH', finding: 'Missing canonical link', fix: 'Add <link rel="canonical" href="..."> to <head>' });
        } else if (canonical !== expectedCanon) {
            issues.add({ check: 'structural', page: urlPath, severity: 'HIGH', finding: `Canonical mismatch: "${canonical}" but expected "${expectedCanon}"`, fix: 'Correct the canonical URL to match the file path' });
        }

        if (!ogUrl) {
            issues.add({ check: 'structural', page: urlPath, severity: 'MEDIUM', finding: 'Missing og:url', fix: 'Add <meta property="og:url" content="...">' });
        } else if (canonical && ogUrl !== canonical) {
            issues.add({ check: 'structural', page: urlPath, severity: 'MEDIUM', finding: `og:url doesn't match canonical: og="${ogUrl}" canonical="${canonical}"`, fix: 'Make og:url match canonical' });
        }

        // JSON-LD schema check (only on SBA pages which are supposed to have 5 types)
        const isSba = /^\/sba-loans\//.test(urlPath);
        const ldBlocks = extractJsonLd(html);
        const parseErrors = ldBlocks.filter(b => b._parseError);
        for (const err of parseErrors) {
            issues.add({ check: 'structural', page: urlPath, severity: 'HIGH', finding: `JSON-LD parse error: ${err._parseError}`, fix: 'Fix JSON-LD syntax' });
        }
        if (isSba) {
            const types = collectSchemaTypes(ldBlocks);
            for (const req of REQUIRED_LD_TYPES_SBA) {
                if (!types.has(req)) {
                    issues.add({ check: 'structural', page: urlPath, severity: 'HIGH', finding: `Missing required JSON-LD @type "${req}" on SBA page`, fix: `Add ${req} block to the JSON-LD @graph` });
                }
            }
        }

        // Non-origination disclosure (required on SBA pages)
        if (isSba) {
            const hasDisclosure = /does not originate SBA|not originate SBA loans|do not originate SBA/i.test(html);
            if (!hasDisclosure) {
                issues.add({ check: 'structural', page: urlPath, severity: 'MEDIUM', finding: 'Missing non-origination disclosure on SBA page', fix: 'Add "MMM does not originate SBA loans..." text somewhere on the page' });
            }
        }

        // href="#" or href=""
        const emptyAnchors = (html.match(/href=["']#["']/g) || []).length + (html.match(/href=["']["']/g) || []).length;
        if (emptyAnchors > 0) {
            // Subtract quiz CTA href="#" placeholder (1 per quiz page) — that's intentional and replaced by JS on interaction
            const quizPlaceholder = /id=["']resultCta["'][^>]*href=["']#["']/.test(html) ? 1 : 0;
            const realEmpty = emptyAnchors - quizPlaceholder;
            if (realEmpty > 0) {
                issues.add({ check: 'structural', page: urlPath, severity: 'LOW', finding: `${realEmpty} empty or "#" anchor(s) present (excluding quiz-result placeholder)`, fix: 'Replace with real URLs or remove' });
            }
        }

        // Word count
        const wc = wordCount(html);
        if (wc < 800) {
            issues.add({ check: 'structural', page: urlPath, severity: 'MEDIUM', finding: `Low word count: ${wc} words (<800)`, fix: 'Expand editorial content or evaluate whether page has enough substance' });
        } else if (wc > 4000) {
            issues.add({ check: 'structural', page: urlPath, severity: 'LOW', finding: `High word count: ${wc} words (>4000)`, fix: 'Consider splitting content or tightening editorial' });
        }
    }
}

// ─── CHECK 4: Internal link validity ───────────────────────────────────
function checkInternalLinks(pages, urlSet, issues) {
    for (const absPath of pages) {
        const urlPath = fileToUrlPath(absPath);
        const html = fs.readFileSync(absPath, 'utf8');
        const hrefs = extractAllHrefs(html);
        const seen = new Set();
        for (const raw of hrefs) {
            let href = raw.trim();
            if (!href || href === '#' || href.startsWith('#')) continue;
            if (/^mailto:|^tel:|^javascript:/i.test(href)) continue;
            // Convert absolute URLs to relative paths for internal check
            const absUrl = href.match(/^https?:\/\/([^/]+)(\/.*)?$/i);
            if (absUrl) {
                if (!/mymoneymarketplace\.com/i.test(absUrl[1])) continue; // external
                href = absUrl[2] || '/';
            }
            // Must start with / for internal
            if (!href.startsWith('/')) continue;
            // Strip query and fragment
            href = href.split('#')[0].split('?')[0];
            if (!href) continue;
            if (seen.has(href)) continue;
            seen.add(href);
            // Check existence
            if (!urlSet.has(href)) {
                issues.add({ check: 'internal-link-validity', page: urlPath, severity: 'HIGH', finding: `Dead internal link: "${href}"`, fix: 'Fix the link target or remove' });
            }
        }
    }
}

// ─── CHECK 5: Content quality ──────────────────────────────────────────
function checkContentQuality(pages, issues) {
    for (const absPath of pages) {
        const urlPath = fileToUrlPath(absPath);
        const html = fs.readFileSync(absPath, 'utf8');
        const text = stripTags(html);

        // Unreplaced placeholder tokens {foo_bar}
        const tokens = text.match(/\{[a-z_]+\}/g);
        if (tokens && tokens.length > 0) {
            const unique = [...new Set(tokens)];
            for (const t of unique) {
                issues.add({ check: 'content-quality', page: urlPath, severity: 'CRITICAL', finding: `Unreplaced placeholder token "${t}" in body`, fix: 'Replace with real content or remove' });
            }
        }

        // TODO / FIXME / XXX
        if (/\b(TODO|FIXME|XXX)\b/.test(text)) {
            const m = text.match(/\b(TODO|FIXME|XXX)\b[^.]{0,80}/);
            issues.add({ check: 'content-quality', page: urlPath, severity: 'MEDIUM', finding: `Development marker in body: "${m[0].substring(0, 100)}"`, fix: 'Resolve the marker' });
        }

        // Lorem Ipsum
        if (/\blorem ipsum\b/i.test(text) || /\bdolor sit amet\b/i.test(text)) {
            issues.add({ check: 'content-quality', page: urlPath, severity: 'CRITICAL', finding: 'Lorem Ipsum placeholder text in body', fix: 'Replace with real copy' });
        }

        // Title vs H1 disconnection — simple stem (strip trailing 's') to tolerate singular/plural
        const stem = w => w.replace(/s$/, '');
        const title = extractTitle(html);
        const h1 = extractH1(html);
        if (title && h1) {
            const titleWords = new Set([...title.toLowerCase().split(/[^a-z0-9]+/)].filter(w => w && !STOPWORDS.has(w)).map(stem));
            const h1Words = new Set([...h1.toLowerCase().split(/[^a-z0-9]+/)].filter(w => w && !STOPWORDS.has(w)).map(stem));
            let common = 0;
            for (const w of titleWords) if (h1Words.has(w)) common++;
            // Flag only if ZERO overlap and both have at least 2 non-stopword stems
            if (common === 0 && titleWords.size >= 2 && h1Words.size >= 2) {
                issues.add({ check: 'content-quality', page: urlPath, severity: 'MEDIUM', finding: `Title and H1 have no non-stopword overlap. Title: "${title}" | H1: "${h1}"`, fix: 'Align title and H1 themes' });
            }
        }
    }
}

// ─── CHECK 6: Quiz CTA correctness ─────────────────────────────────────
function checkCtaCorrectness(pages, issues) {
    for (const absPath of pages) {
        const urlPath = fileToUrlPath(absPath);
        const html = fs.readFileSync(absPath, 'utf8');
        const sbaMatch = urlPath.match(/^\/sba-loans\/([^/]+)(?:\/|$)/);
        if (!sbaMatch) continue;
        const pageSlug = sbaMatch[1];

        // Strip script blocks — quiz JS contains a BASE_UTM that legitimately has no
        // utm_content (appended dynamically at click-time). Only scan hrefs in rendered HTML.
        const stripped = html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
        const re = /https:\/\/lendmatecapital\.com\/\?[^"'\s<>]+/g;
        const urls = stripped.match(re) || [];
        const utmContentSeen = new Map();
        for (const url of urls) {
            const campaignMatch = url.match(/utm_campaign=([^&"']+)/);
            const contentMatch = url.match(/utm_content=([^&"']+)/);
            const campaign = campaignMatch ? campaignMatch[1] : '';
            const content = contentMatch ? contentMatch[1] : '';

            // Expected campaign pattern: sba-<slug>-* (quiz, closing-cta, bridge, hub, etc.)
            const expectedPrefix = `sba-${pageSlug}`;
            if (campaign && !campaign.startsWith(expectedPrefix)) {
                issues.add({ check: 'cta-correctness', page: urlPath, severity: 'HIGH', finding: `utm_campaign "${campaign}" doesn't match page slug "${pageSlug}" (expected prefix "${expectedPrefix}")`, fix: 'Correct the utm_campaign to match the page' });
            }
            if (!content) {
                issues.add({ check: 'cta-correctness', page: urlPath, severity: 'LOW', finding: `Lendmate URL missing utm_content: ${url.substring(0, 100)}`, fix: 'Add utm_content for attribution' });
            } else {
                utmContentSeen.set(content, (utmContentSeen.get(content) || 0) + 1);
            }
        }
        // Flag duplicate utm_content on profile CTAs (quiz profiles should be distinct)
        for (const [content, count] of utmContentSeen.entries()) {
            if (count > 1 && /profile-/.test(content)) {
                issues.add({ check: 'cta-correctness', page: urlPath, severity: 'MEDIUM', finding: `utm_content "${content}" appears ${count} times (quiz profiles should be distinct)`, fix: 'Ensure each quiz profile has a unique utm_content' });
            }
        }
    }
}

// ─── CHECK 7: Data claims traceability ─────────────────────────────────
function checkDataClaims(pages, issues, industryData) {
    const overall = industryData.metadata.overall_sba_stats;
    for (const absPath of pages) {
        const urlPath = fileToUrlPath(absPath);
        // Only check SBA industry pages (not scenario pages, which use general numbers)
        const sbaMatch = urlPath.match(/^\/sba-loans\/([^/]+)\/?$/);
        if (!sbaMatch) continue;
        const slug = sbaMatch[1];
        const naics = SLUG_TO_NAICS[slug];
        if (!naics) continue;
        const indData = industryData.industries[naics];
        if (!indData) continue;
        const stats = indData.stats;

        const html = fs.readFileSync(absPath, 'utf8');
        const text = stripTags(html);

        // Extract the hero value "16,355" "8.6B" "$528K" etc. and check against stats
        // We look for specific patterns where page asserts a stat:
        // "X,XXX loans approved" etc.
        const checks = [
            // loan count
            { pattern: new RegExp(`\\b${stats.loan_count.toLocaleString('en-US')}\\s+loans\\b`), required: true, label: `loan_count=${stats.loan_count}` },
            // charge-off rate (e.g. "1.21%" anywhere in text)
            { pattern: new RegExp(`\\b${stats.charge_off_pct.toFixed(2)}\\s*%`), required: true, label: `charge_off_pct=${stats.charge_off_pct}%` },
            // YoY growth (e.g. "+26.93%" or "26.93%")
            { pattern: new RegExp(`\\+?${stats.yoy_growth.toFixed(2)}\\s*%`), required: false, label: `yoy_growth=${stats.yoy_growth}%` },
        ];
        for (const c of checks) {
            if (!c.pattern.test(text) && c.required) {
                issues.add({ check: 'data-traceability', page: urlPath, severity: 'LOW', finding: `Expected data point not found on page: ${c.label}`, fix: 'Verify page stats match data source or update copy' });
            }
        }
    }
}

// ─── CHECK 8: Duplicate content detection (within same category) ───────
function shingleSet(text, k = 5) {
    const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const shingles = new Set();
    for (let i = 0; i + k <= tokens.length; i++) {
        shingles.add(tokens.slice(i, i + k).join(' '));
    }
    return shingles;
}

function jaccard(a, b) {
    if (a.size === 0 || b.size === 0) return 0;
    let inter = 0;
    const [smaller, larger] = a.size < b.size ? [a, b] : [b, a];
    for (const x of smaller) if (larger.has(x)) inter++;
    return inter / (a.size + b.size - inter);
}

function pageCategory(urlPath) {
    const m = urlPath.match(/^\/([^/]+)/);
    return m ? m[1] : '/';
}

function checkDuplicates(pages, issues) {
    // Bucket pages by top-level category
    const buckets = new Map();
    const shingles = new Map();
    for (const absPath of pages) {
        const urlPath = fileToUrlPath(absPath);
        const cat = pageCategory(urlPath);
        if (!buckets.has(cat)) buckets.set(cat, []);
        buckets.get(cat).push(absPath);
        const html = fs.readFileSync(absPath, 'utf8');
        // Extract main body (skip header/footer via crude heuristic)
        const body = html
            .replace(/<header[\s\S]*?<\/header>/gi, ' ')
            .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
            .replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
        shingles.set(absPath, shingleSet(stripTags(body)));
    }

    // Compare within buckets only
    for (const [cat, pathsInCat] of buckets.entries()) {
        for (let i = 0; i < pathsInCat.length; i++) {
            for (let j = i + 1; j < pathsInCat.length; j++) {
                const a = shingles.get(pathsInCat[i]);
                const b = shingles.get(pathsInCat[j]);
                const sim = jaccard(a, b);
                if (sim >= 0.85) {
                    const urlA = fileToUrlPath(pathsInCat[i]);
                    const urlB = fileToUrlPath(pathsInCat[j]);
                    issues.add({ check: 'duplicate-content', page: urlA, severity: 'HIGH', finding: `${(sim * 100).toFixed(1)}% content similarity with ${urlB}`, fix: 'Differentiate the two pages with unique content or consolidate' });
                }
            }
        }
    }
}

// ─── Report generator ──────────────────────────────────────────────────
function buildReport(pages, issues, elapsedMs) {
    const sev = issues.bySeverity();
    const byCheck = issues.byCheck();
    const byPage = issues.byPage();
    const totalIssues = issues.list.length;
    const pagesWithIssues = byPage.size;

    const lines = [];
    lines.push(`# Content Audit Report`);
    lines.push('');
    lines.push(`_Generated: ${new Date().toISOString()} · Duration: ${(elapsedMs / 1000).toFixed(1)}s · Pages scanned: ${pages.length}_`);
    lines.push('');
    lines.push(`## Summary`);
    lines.push('');
    lines.push(`| Metric | Count |`);
    lines.push(`| --- | ---: |`);
    lines.push(`| Pages scanned | ${pages.length} |`);
    lines.push(`| Pages with at least one issue | ${pagesWithIssues} |`);
    lines.push(`| Total issues | ${totalIssues} |`);
    lines.push(`| CRITICAL | ${sev.CRITICAL || 0} |`);
    lines.push(`| HIGH | ${sev.HIGH || 0} |`);
    lines.push(`| MEDIUM | ${sev.MEDIUM || 0} |`);
    lines.push(`| LOW | ${sev.LOW || 0} |`);
    lines.push('');

    // Check-level summary
    lines.push(`### Issues per check`);
    lines.push('');
    lines.push(`| Check | Issue count |`);
    lines.push(`| --- | ---: |`);
    for (const [name, arr] of byCheck.entries()) {
        lines.push(`| ${name} | ${arr.length} |`);
    }
    lines.push('');

    // Detailed issues by check
    const checkOrder = ['cross-page-leakage', 'state-leakage', 'structural', 'internal-link-validity', 'content-quality', 'cta-correctness', 'data-traceability', 'duplicate-content'];
    for (const ck of checkOrder) {
        const arr = byCheck.get(ck) || [];
        if (arr.length === 0) continue;
        lines.push(`## Check: ${ck}`);
        lines.push('');
        lines.push(`${arr.length} issue${arr.length === 1 ? '' : 's'}.`);
        lines.push('');
        // Sort by severity then page
        const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        arr.sort((a, b) => (sevOrder[a.severity] - sevOrder[b.severity]) || a.page.localeCompare(b.page));
        for (const i of arr) {
            lines.push(`- **[${i.severity}]** \`${i.page}\` — ${i.finding}`);
            lines.push(`  - _Fix:_ ${i.fix}`);
        }
        lines.push('');
    }

    // Prioritized action list
    lines.push(`## Prioritized action list`);
    lines.push('');
    const priority = [...issues.list]
        .sort((a, b) => {
            const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
            return order[a.severity] - order[b.severity];
        })
        .slice(0, 25);
    lines.push(`Top ${priority.length} issues to fix first (by severity):`);
    lines.push('');
    priority.forEach((i, idx) => {
        lines.push(`${idx + 1}. **[${i.severity}]** \`${i.page}\` _(${i.check})_ — ${i.finding}`);
    });
    lines.push('');

    // Observations
    lines.push(`## Observations`);
    lines.push('');
    // Compute a few aggregate stats
    const checkDistribution = [...byCheck.entries()]
        .map(([name, arr]) => `${name}: ${arr.length}`)
        .join(', ');
    lines.push(`- Issue distribution across checks: ${checkDistribution}`);
    lines.push(`- ${pagesWithIssues} of ${pages.length} pages (${(pagesWithIssues / pages.length * 100).toFixed(1)}%) flagged at least one issue.`);

    // Pages with highest issue counts
    const topProblematic = [...byPage.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
    if (topProblematic.length > 0) {
        lines.push(`- Pages with the most issues:`);
        for (const [p, arr] of topProblematic) {
            lines.push(`  - \`${p}\`: ${arr.length} issue${arr.length === 1 ? '' : 's'}`);
        }
    }
    lines.push('');

    return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────
function main() {
    const start = Date.now();
    console.log('Finding pages...');
    const pages = findPages();
    console.log(`Found ${pages.length} pages.`);

    const urlSet = buildUrlIndex(pages);
    const issues = new Issues();
    const industryDataPath = path.join(ROOT, 'data', 'industry-data.json');
    const industryData = fs.existsSync(industryDataPath) ? JSON.parse(fs.readFileSync(industryDataPath, 'utf8')) : null;

    console.log('Running Check 1 (cross-page leakage)...');
    checkCrossPageLeakage(pages, issues);
    console.log('Running Check 2 (state leakage)...');
    checkStateLeakage(pages, issues);
    console.log('Running Check 3 (structural integrity)...');
    checkStructural(pages, issues);
    console.log('Running Check 4 (internal link validity)...');
    checkInternalLinks(pages, urlSet, issues);
    console.log('Running Check 5 (content quality)...');
    checkContentQuality(pages, issues);
    console.log('Running Check 6 (CTA correctness)...');
    checkCtaCorrectness(pages, issues);
    if (industryData) {
        console.log('Running Check 7 (data claims traceability)...');
        checkDataClaims(pages, issues, industryData);
    } else {
        console.log('Skipping Check 7 (no industry-data.json found).');
    }
    console.log('Running Check 8 (duplicate content)...');
    checkDuplicates(pages, issues);

    const elapsed = Date.now() - start;
    console.log(`Audit complete in ${(elapsed / 1000).toFixed(1)}s. Generated ${issues.list.length} issues across ${issues.byPage().size} pages.`);

    const report = buildReport(pages, issues, elapsed);
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, report, 'utf8');
    console.log(`Report written to ${path.relative(ROOT, REPORT_PATH)}`);
}

if (require.main === module) main();
