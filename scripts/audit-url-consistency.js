#!/usr/bin/env node
/**
 * audit-url-consistency.js — one-off diagnostic for the trailing-slash split.
 *
 * Scans every HTML page + sitemap.xml for URL forms and reports:
 *   - canonicals with/without trailing slash
 *   - internal <a href> links to on-site pages with/without trailing slash
 *   - og:url values
 *   - structured-data URL fields (@id, url, mainEntityOfPage, itemListElement.item, image)
 *   - sitemap <loc> entries
 *
 * Canonical rule for this site (per live curl test 2026-07-15):
 *   root:      https://mymoneymarketplace.com/
 *   subpages:  https://mymoneymarketplace.com/<path>/
 * (server 301s /path -> /path/, so trailing slash IS the canonical form.)
 *
 * Read-only. No fixes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://mymoneymarketplace.com';
const SKIP_DIRS = new Set(['node_modules', 'data', 'scripts', 'docs', 'worker', '.git']);

function walkHtml(dir, out = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
    for (const entry of entries) {
        if (entry.isDirectory()) {
            if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
            walkHtml(path.join(dir, entry.name), out);
        } else if (entry.isFile() && entry.name.endsWith('.html')) {
            out.push(path.join(dir, entry.name));
        }
    }
    return out;
}

function fileToCanonicalUrl(absPath) {
    const rel = path.relative(ROOT, absPath).split(path.sep).join('/');
    const stripped = rel.replace(/\/?index\.html$/, '');
    return stripped === '' ? `${SITE}/` : `${SITE}/${stripped}/`;
}

// Extract URL-like strings from a chunk. Returns array of {url, kind, hasSlash}.
function collectUrls(html, filePath) {
    const rows = [];
    const pushIfSiteInternal = (raw, kind) => {
        if (!raw) return;
        // Skip anchors, mailto, tel
        if (raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) return;
        // Normalize: absolute or relative to on-site path
        let u;
        if (/^https?:\/\//i.test(raw)) {
            if (!raw.startsWith(SITE)) return;   // external
            u = raw;
        } else if (raw.startsWith('/')) {
            u = SITE + raw;
        } else {
            return; // skip protocol-relative or truly relative
        }
        // Strip query + fragment for slash analysis
        const bare = u.split('#')[0].split('?')[0];
        // Skip .html / .pdf / static asset URLs
        if (/\.(html|pdf|png|jpe?g|gif|svg|ico|css|js|xml|txt|webp)$/i.test(bare)) return;
        // If it's exactly the site root, treat as canonical (has slash)
        const hasSlash = bare.endsWith('/');
        rows.push({ url: bare, kind, hasSlash });
    };

    // canonical
    const canonicalM = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (canonicalM) pushIfSiteInternal(canonicalM[1], 'canonical');

    // og:url
    const ogM = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']+)["']/i);
    if (ogM) pushIfSiteInternal(ogM[1], 'og:url');

    // <a href>
    const aRe = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = aRe.exec(html)) !== null) {
        pushIfSiteInternal(m[1], 'a-href');
    }

    // JSON-LD @id / url / item / mainEntityOfPage / image (strings)
    const ldRe = /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;
    while ((m = ldRe.exec(html)) !== null) {
        const jsonStr = m[1].trim();
        const urlLikeRe = /"(?:@id|url|item|mainEntityOfPage|image|logo)"\s*:\s*"([^"]+)"/g;
        let u;
        while ((u = urlLikeRe.exec(jsonStr)) !== null) {
            pushIfSiteInternal(u[1], 'json-ld');
        }
    }

    return rows;
}

function analyzeSitemap() {
    const sitemapPath = path.join(ROOT, 'sitemap.xml');
    if (!fs.existsSync(sitemapPath)) return { count: 0, withSlash: 0, withoutSlash: 0, examples: [] };
    const xml = fs.readFileSync(sitemapPath, 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x => x[1]);
    let withSlash = 0, withoutSlash = 0;
    const badExamples = [];
    for (const loc of locs) {
        const bare = loc.split('#')[0].split('?')[0];
        if (bare.endsWith('/')) withSlash++;
        else { withoutSlash++; if (badExamples.length < 5) badExamples.push(loc); }
    }
    return { count: locs.length, withSlash, withoutSlash, badExamples };
}

function main() {
    const files = walkHtml(ROOT);
    const perPage = [];
    const totals = {
        canonicalWithSlash: 0, canonicalWithoutSlash: 0,
        ogWithSlash: 0, ogWithoutSlash: 0,
        aHrefWithSlash: 0, aHrefWithoutSlash: 0,
        jsonLdWithSlash: 0, jsonLdWithoutSlash: 0,
    };

    for (const f of files) {
        const rel = path.relative(ROOT, f).split(path.sep).join('/');
        const html = fs.readFileSync(f, 'utf8');
        const rows = collectUrls(html, rel);
        const summary = {
            path: rel,
            expectedCanonical: fileToCanonicalUrl(f),
            actualCanonical: null,
            canonicalMatch: null,
            counts: { canonical: 0, 'og:url': 0, 'a-href': 0, 'json-ld': 0 },
            slashCounts: { canonical: [0, 0], 'og:url': [0, 0], 'a-href': [0, 0], 'json-ld': [0, 0] }, // [withSlash, withoutSlash]
        };
        for (const r of rows) {
            const bucket = summary.slashCounts[r.kind];
            if (r.hasSlash) bucket[0]++; else bucket[1]++;
            summary.counts[r.kind]++;
            const key = r.kind === 'canonical' ? 'canonicalWithSlash' :
                        r.kind === 'og:url' ? 'ogWithSlash' :
                        r.kind === 'a-href' ? 'aHrefWithSlash' : 'jsonLdWithSlash';
            const keyNo = r.kind === 'canonical' ? 'canonicalWithoutSlash' :
                          r.kind === 'og:url' ? 'ogWithoutSlash' :
                          r.kind === 'a-href' ? 'aHrefWithoutSlash' : 'jsonLdWithoutSlash';
            if (r.hasSlash) totals[key]++; else totals[keyNo]++;
            if (r.kind === 'canonical') summary.actualCanonical = r.url;
        }
        if (summary.actualCanonical) {
            summary.canonicalMatch = (summary.actualCanonical === summary.expectedCanonical);
        }
        perPage.push(summary);
    }

    const sitemap = analyzeSitemap();

    // Mismatches: pages whose canonical does not match expected (i.e., missing trailing slash)
    const canonicalMismatches = perPage.filter(p => p.actualCanonical && !p.canonicalMatch);
    const pagesMissingCanonical = perPage.filter(p => !p.actualCanonical);

    console.log('== URL Consistency Audit ==');
    console.log(`Pages scanned: ${files.length}`);
    console.log('');
    console.log('Canonical tags:');
    console.log(`  with slash    : ${totals.canonicalWithSlash}`);
    console.log(`  without slash : ${totals.canonicalWithoutSlash}`);
    console.log(`  missing entirely: ${pagesMissingCanonical.length}`);
    console.log(`  wrong form (mismatch expected): ${canonicalMismatches.length}`);
    console.log('');
    console.log('og:url:');
    console.log(`  with slash    : ${totals.ogWithSlash}`);
    console.log(`  without slash : ${totals.ogWithoutSlash}`);
    console.log('');
    console.log('Internal <a href> links (site-internal only):');
    console.log(`  with slash    : ${totals.aHrefWithSlash}`);
    console.log(`  without slash : ${totals.aHrefWithoutSlash}`);
    console.log('');
    console.log('JSON-LD URL fields (@id, url, item, image, logo, mainEntityOfPage):');
    console.log(`  with slash    : ${totals.jsonLdWithSlash}`);
    console.log(`  without slash : ${totals.jsonLdWithoutSlash}`);
    console.log('');
    console.log(`Sitemap: ${sitemap.count} entries, ${sitemap.withSlash} with slash, ${sitemap.withoutSlash} without slash`);
    if (sitemap.badExamples && sitemap.badExamples.length > 0) {
        console.log(`  Examples without slash: ${sitemap.badExamples.slice(0, 3).join(', ')}`);
    }
    console.log('');
    if (canonicalMismatches.length > 0) {
        console.log(`Top 10 canonical mismatches (actual vs expected):`);
        for (const p of canonicalMismatches.slice(0, 10)) {
            console.log(`  ${p.path}`);
            console.log(`     actual  : ${p.actualCanonical}`);
            console.log(`     expected: ${p.expectedCanonical}`);
        }
    }

    // Write JSON detail for follow-up scripts.
    const jsonPath = path.join(ROOT, 'data', 'url-consistency-audit.json');
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
    fs.writeFileSync(jsonPath, JSON.stringify({
        generated: new Date().toISOString(),
        totals, sitemap, canonicalMismatches, pagesMissingCanonical,
        perPage: perPage.map(p => ({
            path: p.path, expectedCanonical: p.expectedCanonical, actualCanonical: p.actualCanonical,
            canonicalMatch: p.canonicalMatch, counts: p.counts, slashCounts: p.slashCounts,
        })),
    }, null, 2), 'utf8');
    console.log(`\nDetail written to ${path.relative(ROOT, jsonPath)}`);
}

if (require.main === module) main();
