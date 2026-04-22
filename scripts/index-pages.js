#!/usr/bin/env node
/**
 * index-pages.js — submit apex mmm-site URLs to the Google Indexing API.
 *
 * Walks mmm-site/ for every index.html, maps it to its canonical URL under
 * https://mymoneymarketplace.com, applies a priority ordering, and submits
 * URLs to Google's Indexing API (URL_UPDATED notifications) up to a daily
 * quota cap (195/day, leaving 5 under the 200/day Google limit).
 *
 * Dedup log at mmm-site/data/submitted-urls.json records every successful
 * submission with an ISO timestamp; stale submissions (>30 days) are eligible
 * for re-submission.
 *
 * Credentials resolution (first match wins):
 *   1. $GOOGLE_CREDENTIALS_PATH
 *   2. mmm-site/google-credentials.json          (gitignored; default)
 *   3. ../seo-pages/google-credentials.json      (repo-adjacent fallback)
 *
 * Usage:
 *   node scripts/index-pages.js              # submit up to QUOTA_CAP URLs
 *   node scripts/index-pages.js --dry-run    # print the priority queue only
 *   node scripts/index-pages.js --limit 20   # cap this run at 20 URLs
 *
 * Sister script: seo-pages/index-pages.js (github.io subdomain variant).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const ROOT = path.resolve(__dirname, '..');
const SITE_BASE = 'https://mymoneymarketplace.com';
const LOG_PATH = path.join(ROOT, 'data', 'submitted-urls.json');
const SCOPES = ['https://www.googleapis.com/auth/indexing'];

const QUOTA_CAP = 195;
const STALE_AFTER_DAYS = 30;
const STALE_MS = STALE_AFTER_DAYS * 24 * 60 * 60 * 1000;
const INTER_REQUEST_DELAY_MS = 200;

// Directories to skip when walking for index.html files.
const SKIP_DIRS = new Set([
    'node_modules', '.git', 'data', 'scripts', 'docs', 'worker', 'guides', 'api',
]);

// SBA scenario slugs (non-industry pages under /sba-loans/<slug>/).
const SBA_SCENARIOS = new Set([
    'after-bankruptcy', 'bad-credit', 'business-acquisition', 'disaster',
    'minority', 'no-collateral', 'requirements', 'self-employed',
    'veterans', 'women',
]);

// Credit-cards category slugs (hub-level categories rather than profession pages).
const CC_CATEGORIES = new Set([
    '0-apr', 'airline-miles', 'bad-credit', 'balance-transfer', 'business',
    'cash-back', 'college-students', 'dining', 'gas', 'groceries', 'hotels',
    'no-annual-fee', 'rewards', 'secured', 'travel',
]);

// Business-loans product slugs (hub-level products rather than city pages).
const BL_PRODUCTS = new Set([
    'equipment', 'line-of-credit', 'merchant-cash-advance', 'sba', 'startup',
    'term', 'working-capital', 'invoice-factoring', 'revenue-based',
]);

// ─────────── credentials ───────────

function resolveCredentialsPath() {
    const candidates = [
        process.env.GOOGLE_CREDENTIALS_PATH,
        path.join(ROOT, 'google-credentials.json'),
        path.resolve(ROOT, '..', 'seo-pages', 'google-credentials.json'),
    ].filter(Boolean);
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    throw new Error(
        'No Google credentials found. Tried:\n' +
        candidates.map(p => `  - ${p}`).join('\n') +
        '\nSet GOOGLE_CREDENTIALS_PATH or copy the service-account JSON to mmm-site/google-credentials.json.'
    );
}

async function getAuthClient() {
    const credsPath = resolveCredentialsPath();
    const credentials = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    const auth = new google.auth.GoogleAuth({ credentials, scopes: SCOPES });
    console.log(`Auth: loaded service account from ${path.relative(ROOT, credsPath) || credsPath}`);
    return auth.getClient();
}

// ─────────── discovery ───────────

function walkForIndexFiles(dir, out = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name)) continue;
            walkForIndexFiles(path.join(dir, entry.name), out);
        } else if (entry.isFile() && entry.name === 'index.html') {
            out.push(path.join(dir, entry.name));
        }
    }
    return out;
}

function fileToUrl(absPath) {
    const rel = path.relative(ROOT, absPath).split(path.sep).join('/');
    // rel is either "index.html" or "<dir>/.../index.html"
    const stripped = rel.replace(/\/?index\.html$/, '');
    if (stripped === '' || stripped === 'index.html') return `${SITE_BASE}/`;
    return `${SITE_BASE}/${stripped}`;
}

// ─────────── priority ordering ───────────

/**
 * Tier number (lower = submit first). Matches the 11-tier spec from the task.
 * Any URL not otherwise classified lands in tier 99 (last).
 */
function priorityTier(url) {
    const p = url.replace(SITE_BASE, '');

    // Tier 1: /sba-loans/ hub
    if (p === '/sba-loans/' || p === '/sba-loans') return 1;

    // Tier 2/3: /sba-loans/<slug>/ — industry vs scenario split
    const sbaMatch = p.match(/^\/sba-loans\/([^/]+)\/?$/);
    if (sbaMatch) {
        const slug = sbaMatch[1];
        return SBA_SCENARIOS.has(slug) ? 3 : 2;
    }

    // Tier 4: /sba-loans/<industry>/<state>/ (and deeper)
    if (/^\/sba-loans\/[^/]+\/[^/]+/.test(p)) return 4;

    // Tier 5: /credit-cards/ hub + category pages
    if (p === '/credit-cards/' || p === '/credit-cards') return 5;
    const ccMatch = p.match(/^\/credit-cards\/([^/]+)\/?$/);
    if (ccMatch && CC_CATEGORIES.has(ccMatch[1])) return 5;

    // Tier 6: /credit-cards/<profession>/ — everything under /credit-cards/ not in CC_CATEGORIES
    if (/^\/credit-cards\/[^/]+/.test(p)) return 6;

    // Tier 7: /business-loans/ hub + product pages
    if (p === '/business-loans/' || p === '/business-loans') return 7;
    const blMatch = p.match(/^\/business-loans\/([^/]+)\/?$/);
    if (blMatch && BL_PRODUCTS.has(blMatch[1])) return 7;

    // Tier 8: /business-loans/<city>-<state>/ (two-letter state suffix heuristic)
    if (blMatch && /-[a-z]{2}$/.test(blMatch[1])) return 8;

    // Fallback for anything else under /business-loans/
    if (/^\/business-loans\//.test(p)) return 8;

    // Tier 9: /personal-loans/ pages (hub + subpages)
    if (/^\/personal-loans(\/|$)/.test(p)) return 9;

    // Tier 10: legal / contact pages
    if (/^\/(privacy|terms|contact|disclosures)(\/|$)/.test(p)) return 10;

    // Tier 11: homepage + any other single-segment root page
    if (p === '/' || p === '') return 11;
    if (/^\/[^/]+\/?$/.test(p)) return 11;

    return 99;
}

function sortByPriority(urls) {
    return [...urls].sort((a, b) => {
        const ta = priorityTier(a);
        const tb = priorityTier(b);
        if (ta !== tb) return ta - tb;
        return a.localeCompare(b);
    });
}

function tierLabel(t) {
    return ({
        1: '1. /sba-loans/ hub',
        2: '2. /sba-loans/<industry>/',
        3: '3. /sba-loans/<scenario>/',
        4: '4. /sba-loans/<industry>/<state>/',
        5: '5. /credit-cards/ hub + categories',
        6: '6. /credit-cards/<profession>/',
        7: '7. /business-loans/ hub + products',
        8: '8. /business-loans/<city>-<state>/',
        9: '9. /personal-loans/',
        10: '10. legal (privacy/terms/contact/disclosures)',
        11: '11. homepage + root',
        99: '99. unclassified',
    })[t] || `tier ${t}`;
}

// ─────────── dedup log ───────────

function loadLog() {
    if (!fs.existsSync(LOG_PATH)) {
        fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
        fs.writeFileSync(LOG_PATH, '{}\n', 'utf8');
        return {};
    }
    try {
        const raw = fs.readFileSync(LOG_PATH, 'utf8').trim();
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.warn(`Log at ${LOG_PATH} was corrupt (${err.message}); starting fresh.`);
        return {};
    }
}

function saveLog(log) {
    const sorted = {};
    for (const k of Object.keys(log).sort()) sorted[k] = log[k];
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.writeFileSync(LOG_PATH, JSON.stringify(sorted, null, 2) + '\n', 'utf8');
}

function recordSubmission(log, url) {
    log[url] = new Date().toISOString();
    saveLog(log);
}

function partitionUrls(sortedUrls, log) {
    const now = Date.now();
    const netNew = [];
    const stale = [];
    const skipped = [];
    for (const url of sortedUrls) {
        const last = log[url];
        if (!last) { netNew.push(url); continue; }
        const t = Date.parse(last);
        if (Number.isNaN(t) || now - t >= STALE_MS) {
            stale.push({ url, lastMs: Number.isNaN(t) ? 0 : t });
        } else {
            skipped.push(url);
        }
    }
    stale.sort((a, b) => a.lastMs - b.lastMs);
    return { netNew, stale: stale.map(s => s.url), skipped };
}

// ─────────── indexing API ───────────

async function submitUrl(client, url) {
    const res = await client.request({
        url: 'https://indexing.googleapis.com/v3/urlNotifications:publish',
        method: 'POST',
        data: { url, type: 'URL_UPDATED' },
    });
    return res.data;
}

// ─────────── main ───────────

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const limitFlag = args.indexOf('--limit');
    const limit = limitFlag >= 0 ? Math.max(0, parseInt(args[limitFlag + 1], 10) || 0) : QUOTA_CAP;
    const cap = Math.min(limit, QUOTA_CAP);

    const absFiles = walkForIndexFiles(ROOT);
    const allUrls = sortByPriority([...new Set(absFiles.map(fileToUrl))]);
    const log = loadLog();
    const { netNew, stale, skipped } = partitionUrls(allUrls, log);

    // Queue: net-new first (already priority-sorted), then stale (oldest first), capped.
    const queue = [...netNew, ...stale].slice(0, cap);
    const beyondCap = (netNew.length + stale.length) - queue.length;

    // Tier breakdown over all URLs.
    const tierCounts = new Map();
    for (const u of allUrls) {
        const t = priorityTier(u);
        tierCounts.set(t, (tierCounts.get(t) || 0) + 1);
    }

    console.log(`Site:                 ${SITE_BASE}`);
    console.log(`index.html found:     ${absFiles.length}`);
    console.log(`Unique URLs:          ${allUrls.length}`);
    console.log(`Net-new eligible:     ${netNew.length}`);
    console.log(`Stale eligible:       ${stale.length} (last submit > ${STALE_AFTER_DAYS}d)`);
    console.log(`Skipped (recent):     ${skipped.length}`);
    console.log(`Quota this run:       ${queue.length} (cap ${cap}${beyondCap > 0 ? `, ${beyondCap} deferred` : ''})`);
    console.log('\nTier breakdown (full site):');
    for (const t of [...tierCounts.keys()].sort((a, b) => a - b)) {
        console.log(`  ${tierLabel(t).padEnd(46)} ${String(tierCounts.get(t)).padStart(4)}`);
    }
    console.log('');

    if (queue.length === 0) {
        console.log('Nothing to submit. Exiting.');
        return;
    }

    if (dryRun) {
        console.log('DRY RUN — first 20 URLs of the submit queue:');
        for (const u of queue.slice(0, 20)) console.log(`  ${u}`);
        if (queue.length > 20) console.log(`  ... and ${queue.length - 20} more`);
        return;
    }

    let authClient;
    try {
        authClient = await getAuthClient();
    } catch (err) {
        console.error('Auth failed:', err.message);
        process.exit(1);
    }

    const netNewSet = new Set(netNew);
    let submittedNew = 0;
    let resubmittedStale = 0;
    const errors = [];
    const submittedSample = [];

    for (const url of queue) {
        const isStale = !netNewSet.has(url);
        try {
            const result = await submitUrl(authClient, url);
            const notify = result.urlNotificationMetadata?.latestUpdate?.notifyTime || 'submitted';
            const tag = isStale ? 'STALE' : 'NEW  ';
            console.log(`OK ${tag} ${url}  [${notify}]`);
            recordSubmission(log, url);
            if (isStale) resubmittedStale++; else submittedNew++;
            if (submittedSample.length < 10) submittedSample.push(url);
        } catch (err) {
            const status = err.response?.status || err.code || 'unknown';
            const msg = err.response?.data?.error?.message || err.message;
            console.error(`FAIL      ${url}  [${status}: ${msg}]`);
            errors.push({ url, status, message: msg });
            if (status === 429 || /quota/i.test(msg)) {
                console.error('Quota exhausted. Stopping early.');
                break;
            }
        }
        await new Promise(r => setTimeout(r, INTER_REQUEST_DELAY_MS));
    }

    const submittedThisRun = submittedNew + resubmittedStale;
    const quotaRemaining = Math.max(0, cap - submittedThisRun - errors.length);

    console.log('\n──── Summary ────');
    console.log(`Total URLs on site:    ${allUrls.length}`);
    console.log(`Net-new submitted:     ${submittedNew}`);
    console.log(`Stale re-submitted:    ${resubmittedStale}`);
    console.log(`Skipped (<${STALE_AFTER_DAYS}d):      ${skipped.length}`);
    console.log(`Quota remaining:       ${quotaRemaining} of ${cap}`);
    console.log(`Errors:                ${errors.length}`);
    if (submittedSample.length > 0) {
        console.log('\nSample submissions:');
        for (const u of submittedSample) console.log(`  - ${u}`);
    }
    if (errors.length) {
        console.log('\nErrors:');
        for (const e of errors) {
            console.log(`  - ${e.url}`);
            console.log(`      [${e.status}] ${e.message}`);
        }
    }

    // Expose for callers/tests.
    return { allUrls, submittedNew, resubmittedStale, quotaRemaining, errors, submittedSample };
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = {
    walkForIndexFiles, fileToUrl, priorityTier, sortByPriority, tierLabel,
    loadLog, saveLog, partitionUrls, resolveCredentialsPath, main,
    SITE_BASE, QUOTA_CAP, STALE_AFTER_DAYS,
};
