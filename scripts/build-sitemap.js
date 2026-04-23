#!/usr/bin/env node
/**
 * build-sitemap.js — regenerate mmm-site/sitemap.xml from the file tree.
 *
 * Walks mmm-site/ for every index.html (skipping node_modules, data, scripts,
 * docs, worker, and any dotfile directory), maps each to its canonical URL
 * under https://mymoneymarketplace.com, and emits a sitemaps.org v0.9 XML
 * file with lastmod/changefreq/priority for every page.
 *
 * Usage:
 *   node scripts/build-sitemap.js              # write sitemap.xml
 *   node scripts/build-sitemap.js --dry-run    # print URL + metadata table only
 *
 * Output: mmm-site/sitemap.xml (overwritten).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE_BASE = 'https://mymoneymarketplace.com';
const OUT_PATH = path.join(ROOT, 'sitemap.xml');

// Directories skipped when walking for index.html.
const SKIP_DIRS = new Set([
    'node_modules', 'data', 'scripts', 'docs', 'worker',
]);

// Hub pages (weekly + high priority).
const HUB_PATHS = new Set([
    '/',
    '/sba-loans',
    '/credit-cards',
    '/business-loans',
    '/personal-loans',
    '/savings',
]);

// Trust pages (yearly + lower priority).
const TRUST_PATHS = new Set([
    '/privacy', '/terms', '/contact', '/disclosures',
]);

// ─────────── walk ───────────

function walkForIndexFiles(dir, out = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (entry.name.startsWith('.')) continue;
            if (SKIP_DIRS.has(entry.name)) continue;
            walkForIndexFiles(path.join(dir, entry.name), out);
        } else if (entry.isFile() && entry.name === 'index.html') {
            out.push(path.join(dir, entry.name));
        }
    }
    return out;
}

function fileToPath(absPath) {
    const rel = path.relative(ROOT, absPath).split(path.sep).join('/');
    const stripped = rel.replace(/\/?index\.html$/, '');
    return stripped === '' ? '/' : `/${stripped}`;
}

function fileToUrl(absPath) {
    const p = fileToPath(absPath);
    return p === '/' ? `${SITE_BASE}/` : `${SITE_BASE}${p}`;
}

// ─────────── classification ───────────

function classify(urlPath) {
    // urlPath is like "/" or "/sba-loans" or "/sba-loans/restaurants" etc.
    if (HUB_PATHS.has(urlPath)) {
        return {
            changefreq: 'weekly',
            priority: urlPath === '/' ? '1.0' : '0.9',
            kind: urlPath === '/' ? 'homepage' : 'hub',
        };
    }
    if (TRUST_PATHS.has(urlPath)) {
        return { changefreq: 'yearly', priority: '0.4', kind: 'trust' };
    }

    // /sba-loans/<industry or scenario>/<state> → 0.7
    if (/^\/sba-loans\/[^/]+\/[^/]+$/.test(urlPath)) {
        return { changefreq: 'monthly', priority: '0.7', kind: 'state-x-industry' };
    }

    // /sba-loans/<slug> — industry or scenario landing.
    if (/^\/sba-loans\/[^/]+$/.test(urlPath)) {
        return { changefreq: 'monthly', priority: '0.8', kind: 'sba-landing' };
    }

    // /credit-cards/<slug> — profession or category.
    if (/^\/credit-cards\/[^/]+$/.test(urlPath)) {
        return { changefreq: 'monthly', priority: '0.6', kind: 'cc-slug' };
    }

    // /business-loans/<city-state> — city landing pages.
    if (/^\/business-loans\/[^/]+$/.test(urlPath)) {
        return { changefreq: 'monthly', priority: '0.6', kind: 'bl-city' };
    }

    // /personal-loans/<slug>
    if (/^\/personal-loans\/[^/]+$/.test(urlPath)) {
        return { changefreq: 'monthly', priority: '0.6', kind: 'pl-slug' };
    }

    // Any other top-level single-segment page (e.g. /equipment-financing, /line-of-credit,
    // /working-capital, /savings already caught above).
    if (/^\/[^/]+$/.test(urlPath)) {
        return { changefreq: 'weekly', priority: '0.8', kind: 'root-hub' };
    }

    // Fallback — should be rare.
    return { changefreq: 'monthly', priority: '0.5', kind: 'other' };
}

// ─────────── lastmod ───────────

function lastmodForFile(absPath) {
    const stat = fs.statSync(absPath);
    const d = stat.mtime;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// ─────────── XML emit ───────────

function xmlEscape(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildSitemap(entries) {
    const lines = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    for (const e of entries) {
        lines.push('  <url>');
        lines.push(`    <loc>${xmlEscape(e.url)}</loc>`);
        lines.push(`    <lastmod>${e.lastmod}</lastmod>`);
        lines.push(`    <changefreq>${e.changefreq}</changefreq>`);
        lines.push(`    <priority>${e.priority}</priority>`);
        lines.push('  </url>');
    }
    lines.push('</urlset>');
    lines.push('');
    return lines.join('\n');
}

/**
 * Minimal well-formedness check: every <url> must have exactly one <loc>,
 * <lastmod>, <changefreq>, <priority>, and the urlset must open and close.
 */
function validateXml(xml, expectedCount) {
    const errs = [];
    if (!/^<\?xml /.test(xml)) errs.push('missing XML declaration');
    if (!/<urlset [^>]+>/.test(xml)) errs.push('missing <urlset> opening');
    if (!/<\/urlset>\s*$/.test(xml)) errs.push('missing <urlset> closing');
    const urlOpenCount = (xml.match(/<url>/g) || []).length;
    const urlCloseCount = (xml.match(/<\/url>/g) || []).length;
    const locCount = (xml.match(/<loc>/g) || []).length;
    const lastmodCount = (xml.match(/<lastmod>/g) || []).length;
    const cfCount = (xml.match(/<changefreq>/g) || []).length;
    const prCount = (xml.match(/<priority>/g) || []).length;
    if (urlOpenCount !== urlCloseCount) errs.push(`<url> open/close mismatch: ${urlOpenCount} vs ${urlCloseCount}`);
    if (locCount !== urlOpenCount) errs.push(`<loc> count mismatch: ${locCount} vs ${urlOpenCount} <url>s`);
    if (lastmodCount !== urlOpenCount) errs.push(`<lastmod> count mismatch`);
    if (cfCount !== urlOpenCount) errs.push(`<changefreq> count mismatch`);
    if (prCount !== urlOpenCount) errs.push(`<priority> count mismatch`);
    if (expectedCount != null && urlOpenCount !== expectedCount) errs.push(`expected ${expectedCount} entries, got ${urlOpenCount}`);
    return errs;
}

// ─────────── main ───────────

function main() {
    const dryRun = process.argv.includes('--dry-run');

    const absFiles = walkForIndexFiles(ROOT);
    const entries = [];
    const kindCounts = new Map();

    for (const abs of absFiles) {
        const urlPath = fileToPath(abs);
        const url = fileToUrl(abs);
        const cls = classify(urlPath);
        const lastmod = lastmodForFile(abs);
        entries.push({ url, urlPath, lastmod, ...cls });
        kindCounts.set(cls.kind, (kindCounts.get(cls.kind) || 0) + 1);
    }

    // De-dup (paranoia) by url.
    const seen = new Set();
    const unique = [];
    for (const e of entries) {
        if (seen.has(e.url)) continue;
        seen.add(e.url);
        unique.push(e);
    }

    // Stable order: priority desc, then URL asc, for readable output.
    unique.sort((a, b) => {
        const pa = parseFloat(a.priority);
        const pb = parseFloat(b.priority);
        if (pa !== pb) return pb - pa;
        return a.url.localeCompare(b.url);
    });

    const xml = buildSitemap(unique);
    const errs = validateXml(xml, unique.length);

    console.log(`index.html files found: ${absFiles.length}`);
    console.log(`Unique URLs:            ${unique.length}`);
    console.log('Kind breakdown:');
    for (const [k, n] of [...kindCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        console.log(`  ${k.padEnd(20)} ${String(n).padStart(4)}`);
    }

    if (errs.length > 0) {
        console.error('\nXML validation errors:');
        for (const e of errs) console.error(`  - ${e}`);
        process.exit(1);
    }
    console.log('XML validates: OK');

    if (dryRun) {
        console.log('\nDRY RUN — first 10 URL entries:');
        for (const e of unique.slice(0, 10)) {
            console.log(`  ${e.priority}  ${e.changefreq.padEnd(8)}  ${e.lastmod}  ${e.url}`);
        }
        return;
    }

    fs.writeFileSync(OUT_PATH, xml, 'utf8');
    console.log(`\nWrote ${path.relative(ROOT, OUT_PATH)} (${unique.length} URLs, ${Buffer.byteLength(xml, 'utf8').toLocaleString()} bytes)`);
}

if (require.main === module) main();

module.exports = {
    walkForIndexFiles, fileToPath, fileToUrl, classify, lastmodForFile,
    buildSitemap, validateXml, SITE_BASE, SKIP_DIRS, HUB_PATHS, TRUST_PATHS,
};
