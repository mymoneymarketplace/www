#!/usr/bin/env node
/**
 * audit-internal-links.js — diagnostic internal-linking audit for SBA cluster + trust pages.
 *
 * For each target page in the audit set, counts how many OTHER pages on the
 * site contain a link to it. Two counts per target:
 *
 *   total    = links anywhere in the HTML (includes nav/footer/header boilerplate)
 *   in-body  = links outside <nav>, <header>, <footer> — the signal that matters
 *              for topic flow, because nav/footer links are uniform across the
 *              site and don't differentiate one page from another.
 *
 * Self-references (a page linking to its own canonical URL) are excluded.
 *
 * Writes data/internal-linking-audit.md. Read-only — no HTML is modified.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'data', 'internal-linking-audit.md');
const SITE_BASE = 'https://mymoneymarketplace.com';

const SKIP_DIRS = new Set(['node_modules', 'data', 'scripts', 'docs', 'worker']);

// ─── discovery ─────────────────────────────────────────────────────────
function walk(dir, out = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
    for (const e of entries) {
        if (e.isDirectory()) {
            if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
            walk(path.join(dir, e.name), out);
        } else if (e.isFile() && e.name === 'index.html') {
            out.push(path.join(dir, e.name));
        }
    }
    return out;
}

function fileToPath(abs) {
    const rel = path.relative(ROOT, abs).split(path.sep).join('/');
    const stripped = rel.replace(/\/?index\.html$/, '');
    return stripped === '' ? '/' : `/${stripped}`;
}

// ─── targets ───────────────────────────────────────────────────────────
// SBA industries + scenarios are the child dirs under /sba-loans/ that have an index.html.
function collectTargets(allPaths) {
    const industries = [];
    const scenarios = [];
    const stateIndustry = [];
    const trust = [];

    const SCENARIO_SLUGS = new Set([
        'after-bankruptcy','bad-credit','business-acquisition','disaster',
        'minority','no-collateral','requirements','self-employed','veterans','women',
    ]);

    for (const p of allPaths) {
        const m1 = p.match(/^\/sba-loans\/([^/]+)$/);
        const m2 = p.match(/^\/sba-loans\/[^/]+\/[^/]+$/);
        if (m1) {
            if (SCENARIO_SLUGS.has(m1[1])) scenarios.push(p);
            else industries.push(p);
        } else if (m2) {
            stateIndustry.push(p);
        } else if (/^\/(privacy|terms|contact|disclosures)$/.test(p)) {
            trust.push(p);
        }
    }
    return {
        industries: industries.sort(),
        scenarios: scenarios.sort(),
        stateIndustry: stateIndustry.sort(),
        trust: trust.sort(),
    };
}

// ─── link-match variants ───────────────────────────────────────────────
/**
 * Build the set of href values that should be treated as pointing to `targetPath`.
 * Generous to match real-world link patterns:
 *   - absolute: https://mymoneymarketplace.com/path and /path/
 *   - relative: /path and /path/
 *   - absolute github.io: already canonicalized at the apex, but old links may persist
 */
function targetHrefs(targetPath) {
    const v = new Set();
    const noSlash = targetPath;
    const withSlash = targetPath.endsWith('/') ? targetPath : targetPath + '/';
    v.add(noSlash);
    v.add(withSlash);
    v.add(SITE_BASE + noSlash);
    v.add(SITE_BASE + withSlash);
    return v;
}

function stripBoilerplate(html) {
    return html
        .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
        .replace(/<header[\s\S]*?<\/header>/gi, ' ')
        .replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
}

// Extract every href from an HTML chunk.
function extractHrefs(html) {
    const out = [];
    const re = /<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
    let m;
    while ((m = re.exec(html)) !== null) out.push(m[1]);
    return out;
}

// Normalize an href for comparison: strip #fragment and ?query, decode nothing.
function normalizeHref(href) {
    return href.split('#')[0].split('?')[0];
}

// ─── main ──────────────────────────────────────────────────────────────
function main() {
    const files = walk(ROOT);
    const paths = files.map(fileToPath);
    const pathByFile = new Map(files.map(f => [f, fileToPath(f)]));

    // Load each page once; keep both full-HTML hrefs and in-body hrefs.
    const totalHrefs = new Map();   // file -> Set<normalizedHref>
    const bodyHrefs = new Map();
    for (const f of files) {
        const html = fs.readFileSync(f, 'utf8');
        totalHrefs.set(f, new Set(extractHrefs(html).map(normalizeHref)));
        bodyHrefs.set(f, new Set(extractHrefs(stripBoilerplate(html)).map(normalizeHref)));
    }

    const { industries, scenarios, stateIndustry, trust } = collectTargets(paths);

    function countInbound(targetPath) {
        const variants = targetHrefs(targetPath);
        const total = [];
        const body = [];
        for (const [f, hrefs] of totalHrefs.entries()) {
            const sourcePath = pathByFile.get(f);
            if (sourcePath === targetPath) continue;     // skip self
            for (const v of variants) {
                if (hrefs.has(v)) { total.push(sourcePath); break; }
            }
        }
        for (const [f, hrefs] of bodyHrefs.entries()) {
            const sourcePath = pathByFile.get(f);
            if (sourcePath === targetPath) continue;
            for (const v of variants) {
                if (hrefs.has(v)) { body.push(sourcePath); break; }
            }
        }
        total.sort();
        body.sort();
        return { total, body };
    }

    function bucket(name, targets) {
        const rows = targets.map(t => {
            const { total, body } = countInbound(t);
            return { target: t, totalCount: total.length, bodyCount: body.length, bodySources: body };
        });
        return { name, rows };
    }

    const buckets = [
        bucket('Industry landing pages', industries),
        bucket('Scenario landing pages', scenarios),
        bucket('State × industry', stateIndustry),
        bucket('Trust pages', trust),
    ];

    // ─── Report ────────────────────────────────────────────────────────
    const lines = [];
    lines.push('# Internal-linking audit — SBA cluster + trust pages');
    lines.push('');
    lines.push(`_Generated: ${new Date().toISOString()} · Pages scanned: ${files.length}_`);
    lines.push('');
    lines.push('Inbound-link counts for each audit target, from OTHER pages on the same site. Two counts per target:');
    lines.push('');
    lines.push('- **total** — any `<a href>` anywhere in the HTML, including nav/header/footer boilerplate.');
    lines.push('- **in-body** — links outside `<nav>`, `<header>`, `<footer>`. This is the signal that matters for topic flow.');
    lines.push('');
    lines.push('Self-references excluded. An in-body count **< 3** flags the page as a de-facto orphan — even with sitemap inclusion, Google\'s crawl prioritization depends on the internal-linking graph.');
    lines.push('');

    let worst = null, best = null;
    const flagged = [];

    for (const b of buckets) {
        lines.push(`## ${b.name}`);
        lines.push('');
        lines.push('| Page | Total inbound | In-body inbound | Sample sources (in-body, up to 10) |');
        lines.push('| --- | ---: | ---: | --- |');
        const sorted = [...b.rows].sort((a, b) => a.bodyCount - b.bodyCount);
        for (const r of sorted) {
            const sampleSrcs = r.bodySources.slice(0, 10).map(s => `\`${s}\``).join(', ');
            const flag = r.bodyCount < 3 ? ' ⚠️' : '';
            lines.push(`| \`${r.target}\`${flag} | ${r.totalCount} | ${r.bodyCount} | ${sampleSrcs || '—'} |`);
            if (r.bodyCount < 3) flagged.push(r);
            if (!worst || r.bodyCount < worst.bodyCount) worst = r;
            if (!best || r.bodyCount > best.bodyCount) best = r;
        }
        lines.push('');
    }

    lines.push('## Summary');
    lines.push('');
    const totalTargets = buckets.reduce((s, b) => s + b.rows.length, 0);
    lines.push(`- Targets audited: **${totalTargets}** (${buckets.map(b => `${b.rows.length} ${b.name.toLowerCase()}`).join('; ')}).`);
    lines.push(`- Pages with **fewer than 3 in-body inbound links** (orphans for topic-flow purposes): **${flagged.length}**.`);
    if (worst) lines.push(`- Worst-linked target: \`${worst.target}\` with ${worst.bodyCount} in-body inbound links (${worst.totalCount} total).`);
    if (best) lines.push(`- Best-linked target: \`${best.target}\` with ${best.bodyCount} in-body inbound links (${best.totalCount} total).`);
    lines.push('');
    if (flagged.length > 0) {
        lines.push('### Orphans to address in a future internal-linking pass');
        lines.push('');
        for (const r of flagged.sort((a, b) => a.bodyCount - b.bodyCount)) {
            lines.push(`- \`${r.target}\` — in-body inbound: ${r.bodyCount}${r.totalCount > r.bodyCount ? ` (${r.totalCount} total incl. nav/footer)` : ''}`);
        }
        lines.push('');
    }
    lines.push('## Methodology notes');
    lines.push('');
    lines.push('- Scans every `index.html` under the site root (excluding `node_modules`, `data`, `scripts`, `docs`, `worker`).');
    lines.push('- Link matching is generous: absolute apex URL, relative path, with/without trailing slash.');
    lines.push('- Nav/header/footer detection uses simple tag-pair stripping; if the actual markup uses different containers (e.g. `<div class="site-header">`), those links will be counted as in-body. Worth revisiting if the site ever moves off `<nav>/<header>/<footer>` semantics.');
    lines.push('- This is diagnostic only. No pages are modified.');
    lines.push('');

    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, lines.join('\n'), 'utf8');
    console.log(`Wrote ${path.relative(ROOT, OUT_PATH)}`);
    console.log(`Targets audited: ${totalTargets}. Flagged (<3 in-body inbound): ${flagged.length}.`);
    if (worst) console.log(`Worst: ${worst.target} (${worst.bodyCount} in-body).`);
    if (best) console.log(`Best: ${best.target} (${best.bodyCount} in-body).`);
}

if (require.main === module) main();
