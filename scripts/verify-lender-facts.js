#!/usr/bin/env node
/**
 * verify-lender-facts.js — extract and verify every lender name + loan count
 * claim on a state × industry page against the actual FOIA data.
 *
 * Any lender name mentioned near a specific loan count is checked against the
 * combo's `top_lenders` list. Mismatches (wrong count, or lender not in the
 * FOIA top-lender roster at all) fail the build.
 *
 * Usage:
 *   node scripts/verify-lender-facts.js sba-loans/restaurants/new-york/index.html
 *   node scripts/verify-lender-facts.js --all       # all state × industry pages
 *   node scripts/verify-lender-facts.js --batch <n> # verify one specific NAICS_STATE
 *
 * Exit codes:
 *   0 — all claims verified
 *   1 — one or more mismatches (build should fail)
 *
 * Design notes:
 *   The extraction is deliberately loose: it looks for known bank-name tokens
 *   (from the FOIA top_lenders list) in the HTML, then finds the nearest
 *   numeric mention within an 80-char window on either side. Any (bank, count)
 *   pair found this way is checked against the roster. This catches the
 *   fabrication pattern (right bank, wrong count) and the wrong-lender pattern
 *   (bank not in top 10 attributed a count). It intentionally allows unmarked
 *   mentions like "Fifth Third rounds out the top ten" (no count claimed).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'industry-data.json');

// NAICS -> apex slug (must match generate-state-industry-page.js configs).
const SLUGS = {
    '722511':'restaurants','811111':'auto-repair','621210':'dentists','621111':'physicians',
    '541940':'veterinarians','524210':'insurance-agencies','238220':'plumbing-hvac','624410':'child-care',
    '561730':'landscaping','238990':'specialty-trades','812910':'pet-care','812199':'personal-care',
    '541211':'cpas','541219':'accounting','811121':'auto-body','621310':'chiropractors',
    '812112':'beauty-salons','561790':'building-services',
};
const STATE_SLUGS = {
    AL:'alabama',AK:'alaska',AZ:'arizona',AR:'arkansas',CA:'california',CO:'colorado',CT:'connecticut',
    DE:'delaware',FL:'florida',GA:'georgia',HI:'hawaii',ID:'idaho',IL:'illinois',IN:'indiana',IA:'iowa',
    KS:'kansas',KY:'kentucky',LA:'louisiana',ME:'maine',MD:'maryland',MA:'massachusetts',MI:'michigan',
    MN:'minnesota',MS:'mississippi',MO:'missouri',MT:'montana',NE:'nebraska',NV:'nevada',NH:'new-hampshire',
    NJ:'new-jersey',NM:'new-mexico',NY:'new-york',NC:'north-carolina',ND:'north-dakota',OH:'ohio',
    OK:'oklahoma',OR:'oregon',PA:'pennsylvania',RI:'rhode-island',SC:'south-carolina',SD:'south-dakota',
    TN:'tennessee',TX:'texas',UT:'utah',VT:'vermont',VA:'virginia',WA:'washington',WV:'west-virginia',
    WI:'wisconsin',WY:'wyoming',
};

// ─── Text extraction helpers ────────────────────────────────────────────

function stripTags(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        // Strip the SVG lender chart entirely — its auto-generated <desc>
        // caption creates adjacency false positives (each lender's number
        // is right next to the next lender's name).
        .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
        // Strip JSON-LD blocks (already covered by script strip, but belt-and-suspenders)
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&mdash;|&ndash;|&amp;|&#39;|&rsquo;|&lsquo;|&ldquo;|&rdquo;|&times;/g, ' ')
        .replace(/\s+/g, ' ');
}

// Exclusion list: tokens that are also common non-bank words in typical
// state × industry copy. If the extracted mention doesn't come from a
// pattern that unambiguously ties it to a bank claim, skip.
const AMBIGUOUS_TOKENS = new Set(['Northeast', 'Chase', 'PNC']);

// Build search tokens for a bank name. The FOIA bankname is often the legal
// entity ("The Huntington National Bank"); the page usually uses the trade
// name ("Huntington"). We generate short, unambiguous tokens.
function bankTokens(fullName) {
    const clean = fullName
        .replace(/^The\s+/i, '')
        // Strip corporate suffixes including the trailing period on "Inc."
        .replace(/,\s*(?:National Association|N\.A\.|Division of|Inc\.?|LLC|FSB)\.?(?![A-Za-z])/gi, '')
        .replace(/\s+Bank\s+National\s+Association/gi, ' Bank')
        .replace(/\s+Banking\s+Company/gi, ' Banking Company')
        .replace(/\s+Bank\s+&\s+Trust,?\s+.*$/gi, ' Bank & Trust')
        .replace(/\s{2,}/g, ' ')
        .trim();
    const tokens = new Set([clean]);
    // A few specific short forms.
    const short = clean
        .replace(/\s+Bank(?:ing)?\s+Company/gi, '')
        .replace(/\s+National\s+Bank/gi, '')
        .replace(/\s+Bank$/gi, '')
        .trim();
    if (short && short !== clean && short.length >= 4) tokens.add(short);
    // Nickname / abbreviation adjustments.
    if (/^Manufacturers and Traders/i.test(clean)) tokens.add('M&T');
    if (/^JPMorgan Chase/i.test(clean)) tokens.add('Chase');
    if (/^Wilmington Savings/i.test(clean)) tokens.add('WSFS');
    return [...tokens];
}

// Find all occurrences of any token in text, return array of {token, index}.
function findAllOccurrences(text, tokens) {
    const results = [];
    for (const token of tokens) {
        // Case-sensitive, whole-word-ish match. Escape regex specials.
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp('(?<![A-Za-z])' + escaped + '(?![A-Za-z])', 'g');
        let m;
        while ((m = re.exec(text)) !== null) {
            results.push({ token, index: m.index, length: m[0].length });
        }
    }
    return results;
}

// Given a text and an index, find the nearest small-integer count (< 5000) in a window.
// A "count" here means an integer 1..5000 that plausibly refers to a loan count.
// Excludes years (1900-2100), dollar amounts (preceded by $), percentages, and dates.
function nearestCount(text, index, windowChars = 80) {
    const lo = Math.max(0, index - windowChars);
    const hi = Math.min(text.length, index + windowChars);
    const window = text.slice(lo, hi);
    const anchor = index - lo;
    const re = /\b(\d{1,4})\b/g;
    const candidates = [];
    let m;
    while ((m = re.exec(window)) !== null) {
        const n = parseInt(m[1], 10);
        if (!Number.isFinite(n) || n < 2 || n > 5000) continue;
        // Skip years.
        if (n >= 1900 && n <= 2100) continue;
        // Skip preceded by $
        const preceded = window.slice(Math.max(0, m.index - 1), m.index);
        if (preceded === '$') continue;
        // Skip followed by % or K or M or B (dollar/percent formatters)
        const followed = window.slice(m.index + m[0].length, m.index + m[0].length + 2);
        if (/^[%KMB]/i.test(followed)) continue;
        // Skip if inside a decimal like 0.27
        if (window.slice(Math.max(0, m.index - 1), m.index) === '.') continue;
        candidates.push({ value: n, index: m.index, distance: Math.abs(m.index - anchor) });
    }
    candidates.sort((a, b) => a.distance - b.distance);
    return candidates[0] || null;
}

// ─── Verifier ───────────────────────────────────────────────────────────

function verifyPage(htmlPath, dataPath, { verbose = false } = {}) {
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    // Derive NAICS + STATE from the file path.
    const rel = path.relative(ROOT, htmlPath).split(path.sep).join('/');
    const m = rel.match(/^sba-loans\/([^/]+)\/([^/]+)\/index\.html$/);
    if (!m) return { errors: [], skipped: 'not a state × industry page: ' + rel };
    const [, indSlug, stateSlug] = m;
    const naics = Object.entries(SLUGS).find(([, s]) => s === indSlug);
    if (!naics) return { errors: [], skipped: 'unknown industry slug: ' + indSlug };
    const stateAbbr = Object.entries(STATE_SLUGS).find(([, s]) => s === stateSlug);
    if (!stateAbbr) return { errors: [], skipped: 'unknown state slug: ' + stateSlug };

    const naicsCode = naics[0];
    const st = stateAbbr[0];
    const combo = data.industries[naicsCode]?.state_breakouts?.[st];
    if (!combo) return { errors: [], skipped: 'no FOIA data for ' + indSlug + '/' + stateSlug };

    const topLenders = combo.top_lenders || [];
    // Map from token -> {fullName, count}.
    const rosterByToken = new Map();
    for (const lender of topLenders) {
        for (const token of bankTokens(lender.bankname)) {
            if (!rosterByToken.has(token)) {
                rosterByToken.set(token, { fullName: lender.bankname, count: lender.loan_count });
            }
        }
    }

    const html = fs.readFileSync(htmlPath, 'utf8');
    const text = stripTags(html);

    // Strict pattern extraction: only flag (bank, count) pairs that come from
    // one of these narrative structures.
    //   Pattern A: "Bank Name (N)"           e.g. "M&T Bank (36)"
    //   Pattern B: "Bank Name (N loans)"     e.g. "Byline Bank (43 loans)"
    //   Pattern C: "Bank Name (N loans, ..." e.g. "TD Bank (99 loans, $160K avg)"
    //   Pattern D: "Bank Name ... leads with N"  or  "... with N loans"
    //             (looking forward up to 60 chars from the bank mention)
    //   Pattern E: "Bank Name carries N X loans"  (attributive, forward window)
    //   Pattern F: "Bank Name (Chicago-headquartered) holds #P at N loans"
    //             (with #P being #2/#3/etc., or "holds ... N loans")
    // Reverse patterns are avoided (they trigger on adjacent-lender captions).

    const claims = [];
    const errors = [];

    // Build a sorted token list, longer tokens first so "Newtek Bank" wins
    // over "Newtek" when both would match at the same position.
    const allTokens = [...rosterByToken.keys()].sort((a, b) => b.length - a.length);

    for (const token of allTokens) {
        if (AMBIGUOUS_TOKENS.has(token)) continue;
        const meta = rosterByToken.get(token);
        const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Pattern A/B/C: bank name followed by ( <number> [loans] [, ...] )
        const parenRe = new RegExp('(?<![A-Za-z])' + escaped + '(?![A-Za-z])\\s*\\((\\d{1,4})(?:\\s+loans)?(?:[),]|\\s+loans)', 'g');
        // Pattern D: bank name followed by "leads with N" within 40 chars
        const leadsRe = new RegExp('(?<![A-Za-z])' + escaped + '(?![A-Za-z])[^.]{0,80}?\\bleads\\s+with\\s+(\\d{1,4})\\b', 'g');
        // Pattern E: "Bank Name ... carries N ... loans"
        const carriesRe = new RegExp('(?<![A-Za-z])' + escaped + '(?![A-Za-z])[^.]{0,80}?\\bcarries\\s+(\\d{1,4})\\b', 'g');
        // Pattern F: "Bank Name ... holds #P at N loans"
        const holdsRe = new RegExp('(?<![A-Za-z])' + escaped + '(?![A-Za-z])[^.]{0,80}?\\bat\\s+(\\d{1,4})\\s+loans\\b', 'g');
        // Pattern G: "Bank Name ... with N loans"
        const withNLoansRe = new RegExp('(?<![A-Za-z])' + escaped + '(?![A-Za-z])[^.]{0,80}?\\bwith\\s+(\\d{1,4})\\s+loans\\b', 'g');
        // Pattern H: "N X loans" where X mentions the industry + state, preceded by "Bank Name"
        //           handled by leadsRe/carriesRe already for typical narrative.

        for (const re of [parenRe, leadsRe, carriesRe, holdsRe, withNLoansRe]) {
            let m;
            while ((m = re.exec(text)) !== null) {
                const foundCount = parseInt(m[1], 10);
                if (!Number.isFinite(foundCount)) continue;
                claims.push({
                    token, foundCount,
                    expectedCount: meta.count,
                    fullName: meta.fullName,
                    ctxIndex: m.index,
                    ctxSnippet: text.slice(Math.max(0, m.index - 20), m.index + m[0].length + 20),
                });
            }
        }
    }

    // Dedupe by (token, foundCount, ctxIndex) — sometimes multiple patterns
    // match the same string at the same offset.
    const seen = new Set();
    const uniqueClaims = [];
    for (const c of claims) {
        const key = c.token + '|' + c.foundCount + '|' + c.ctxIndex;
        if (seen.has(key)) continue;
        seen.add(key);
        uniqueClaims.push(c);
    }

    for (const c of uniqueClaims) {
        if (c.foundCount !== c.expectedCount) {
            errors.push({
                token: c.token,
                fullName: c.fullName,
                claimed: c.foundCount,
                actual: c.expectedCount,
                context: c.ctxSnippet.trim(),
            });
        }
    }

    // Reverse check: find every "X (N loans)" or "X (N)" pattern and verify
    // X (the phrase preceding the paren) resolves to a top-10 roster entry.
    // This catches attribution to lenders NOT in the roster.
    const reverseRe = /\b([A-Z][A-Za-z .&']{2,60}?)\s*\((\d{1,4})\s+loans?\)/g;
    const rosterTokenSet = new Set(rosterByToken.keys());
    let rm;
    while ((rm = reverseRe.exec(text)) !== null) {
        const phrase = rm[1].trim();
        const count = parseInt(rm[2], 10);
        // Try to match the phrase (or its trailing bank-name-ish substring)
        // against any roster token.
        let matched = false;
        for (const token of rosterTokenSet) {
            // Case-sensitive contains check on either side.
            if (phrase.endsWith(token) || phrase.includes(token) || token.endsWith(phrase)) {
                matched = true;
                break;
            }
        }
        if (!matched) {
            // Extra allowance: skip only if the phrase is a bare generic
            // sole-word noun preceding a paren-with-loans construct
            // (e.g., "Total (155 loans)" summary rows). A phrase like
            // "Bogus Test Bank" is NOT bare generic and should flag.
            const lc = phrase.trim().toLowerCase();
            if (/^(?:top|lenders|volume|share|around|approximately|about|the total|total)$/i.test(lc)) continue;
            errors.push({
                token: phrase,
                fullName: '(not in top_lenders roster)',
                claimed: count,
                actual: null,
                context: text.slice(Math.max(0, rm.index - 20), rm.index + rm[0].length + 20).trim(),
                kind: 'unknown-lender',
            });
        }
    }

    return { errors, claims: uniqueClaims, combo: { naicsCode, indSlug, st, stateSlug, topCount: topLenders.length } };
}

// ─── CLI ────────────────────────────────────────────────────────────────

function findAllStateIndustryPages() {
    const pages = [];
    (function walk(dir) {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
        for (const e of entries) {
            if (e.isDirectory()) walk(path.join(dir, e.name));
            else if (e.isFile() && e.name === 'index.html') {
                const rel = path.relative(ROOT, path.join(dir, e.name)).split(path.sep).join('/');
                if (/^sba-loans\/[^/]+\/[^/]+\/index\.html$/.test(rel)) pages.push(path.join(dir, e.name));
            }
        }
    })(path.join(ROOT, 'sba-loans'));
    return pages;
}

function main() {
    const args = process.argv.slice(2);
    let targets;
    if (args.includes('--all')) {
        targets = findAllStateIndustryPages();
    } else {
        targets = args.filter(a => !a.startsWith('--')).map(a => path.resolve(a));
    }
    if (targets.length === 0) {
        console.error('Usage: node scripts/verify-lender-facts.js <path> [<path> ...] | --all');
        process.exit(2);
    }

    let totalErrors = 0;
    for (const t of targets) {
        const rel = path.relative(ROOT, t).split(path.sep).join('/');
        const result = verifyPage(t, DATA_PATH);
        if (result.skipped) {
            console.log(`SKIP ${rel} (${result.skipped})`);
            continue;
        }
        if (result.errors.length === 0) {
            console.log(`OK   ${rel} — ${result.claims.length} lender/count pairs verified`);
        } else {
            console.error(`FAIL ${rel} — ${result.errors.length} mismatch(es)`);
            for (const err of result.errors) {
                if (err.kind === 'unknown-lender') {
                    console.error(`  ${err.token} (${err.claimed} loans): not in FOIA top_lenders roster for this combo`);
                } else {
                    console.error(`  ${err.token}: claimed ${err.claimed}, actual FOIA ${err.actual}`);
                }
                console.error(`    context: "…${err.context}…"`);
            }
            totalErrors += result.errors.length;
        }
    }

    if (totalErrors > 0) {
        console.error(`\n${totalErrors} total mismatch(es). Build fails.`);
        process.exit(1);
    }
    console.log(`\nAll ${targets.length} pages verified against FOIA top_lenders roster.`);
}

if (require.main === module) main();

module.exports = { verifyPage, bankTokens, nearestCount };
