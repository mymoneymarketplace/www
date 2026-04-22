#!/usr/bin/env node
/**
 * content-audit.js — site-wide content-audit driver.
 *
 * Walks all pages under mmm-site/, runs the full set of checks defined in
 * audit-module.js, and writes a markdown report to data/content-audit-report.md.
 *
 * Per-page check logic lives in audit-module.js and is shared with:
 *   - scripts/generate-industry-page.js (pre-publish guardrail)
 *   - scripts/generate-state-industry-page.js (pre-publish guardrail)
 *   - scripts/pre-commit-audit.js (git pre-commit hook)
 *
 * Usage:  node scripts/content-audit.js
 *
 * Also accepts: --write-baseline to emit data/audit-baseline.json
 *               (snapshot of current findings for grandfathering).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const audit = require('./audit-module.js');

const ROOT = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT, 'data', 'content-audit-report.md');
const BASELINE_PATH = path.join(ROOT, 'data', 'audit-baseline.json');

function findPages() {
    const skipDirs = new Set(['node_modules', 'data', 'scripts', '.git', 'worker', 'guides']);
    const pages = [];
    (function walk(dir) {
        let entries;
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
        for (const entry of entries) {
            if (entry.isDirectory()) { if (skipDirs.has(entry.name)) continue; walk(path.join(dir, entry.name)); }
            else if (entry.isFile() && entry.name.endsWith('.html')) pages.push(path.join(dir, entry.name));
        }
    })(ROOT);
    return pages.sort();
}

// ─── Duplicate-content check — pairwise, not amenable to per-page API ──
function shingleSet(text, k = 5) {
    const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
    const shingles = new Set();
    for (let i = 0; i + k <= tokens.length; i++) shingles.add(tokens.slice(i, i + k).join(' '));
    return shingles;
}

function jaccard(a, b) {
    if (a.size === 0 || b.size === 0) return 0;
    let inter = 0;
    const [smaller, larger] = a.size < b.size ? [a, b] : [b, a];
    for (const x of smaller) if (larger.has(x)) inter++;
    return inter / (a.size + b.size - inter);
}

function pageCategory(urlPath) { const m = urlPath.match(/^\/([^/]+)/); return m ? m[1] : '/'; }

function runDuplicateCheck(pages) {
    const findings = [];
    const buckets = new Map();
    const shingles = new Map();
    for (const absPath of pages) {
        const urlPath = audit.fileToUrlPath(absPath, ROOT);
        const cat = pageCategory(urlPath);
        if (!buckets.has(cat)) buckets.set(cat, []);
        buckets.get(cat).push(absPath);
        const html = fs.readFileSync(absPath, 'utf8');
        const body = html
            .replace(/<header[\s\S]*?<\/header>/gi, ' ')
            .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
            .replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
        shingles.set(absPath, shingleSet(audit.stripTags(body)));
    }
    for (const [, pathsInCat] of buckets.entries()) {
        for (let i = 0; i < pathsInCat.length; i++) {
            for (let j = i + 1; j < pathsInCat.length; j++) {
                const sim = jaccard(shingles.get(pathsInCat[i]), shingles.get(pathsInCat[j]));
                if (sim >= 0.85) {
                    const urlA = audit.fileToUrlPath(pathsInCat[i], ROOT);
                    const urlB = audit.fileToUrlPath(pathsInCat[j], ROOT);
                    findings.push({ check: 'duplicate-content', page: urlA, severity: 'HIGH', finding: `${(sim * 100).toFixed(1)}% content similarity with ${urlB}`, fix: 'Differentiate the two pages with unique content or consolidate' });
                }
            }
        }
    }
    return findings;
}

// ─── Report generator ──────────────────────────────────────────────────
function buildReport(pages, allFindings, elapsedMs) {
    const bySev = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const byCheck = new Map();
    const byPage = new Map();
    for (const f of allFindings) {
        bySev[f.severity] = (bySev[f.severity] || 0) + 1;
        if (!byCheck.has(f.check)) byCheck.set(f.check, []);
        byCheck.get(f.check).push(f);
        if (!byPage.has(f.page)) byPage.set(f.page, []);
        byPage.get(f.page).push(f);
    }
    const totalIssues = allFindings.length;
    const pagesWithIssues = byPage.size;

    const lines = [];
    lines.push('# Content Audit Report');
    lines.push('');
    lines.push(`_Generated: ${new Date().toISOString()} · Duration: ${(elapsedMs / 1000).toFixed(1)}s · Pages scanned: ${pages.length}_`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('| --- | ---: |');
    lines.push(`| Pages scanned | ${pages.length} |`);
    lines.push(`| Pages with at least one issue | ${pagesWithIssues} |`);
    lines.push(`| Total issues | ${totalIssues} |`);
    lines.push(`| CRITICAL | ${bySev.CRITICAL || 0} |`);
    lines.push(`| HIGH | ${bySev.HIGH || 0} |`);
    lines.push(`| MEDIUM | ${bySev.MEDIUM || 0} |`);
    lines.push(`| LOW | ${bySev.LOW || 0} |`);
    lines.push('');
    lines.push('### Issues per check');
    lines.push('');
    lines.push('| Check | Issue count |');
    lines.push('| --- | ---: |');
    for (const [name, arr] of byCheck.entries()) lines.push(`| ${name} | ${arr.length} |`);
    lines.push('');

    const checkOrder = [...audit.ALL_CHECK_NAMES, 'duplicate-content'];
    for (const ck of checkOrder) {
        const arr = byCheck.get(ck) || [];
        if (arr.length === 0) continue;
        lines.push(`## Check: ${ck}`);
        lines.push('');
        lines.push(`${arr.length} issue${arr.length === 1 ? '' : 's'}.`);
        lines.push('');
        const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        arr.sort((a, b) => (sevOrder[a.severity] - sevOrder[b.severity]) || a.page.localeCompare(b.page));
        for (const i of arr) {
            lines.push(`- **[${i.severity}]** \`${i.page}\` — ${i.finding}`);
            lines.push(`  - _Fix:_ ${i.fix}`);
        }
        lines.push('');
    }

    lines.push('## Prioritized action list');
    lines.push('');
    const priority = [...allFindings].sort((a, b) => {
        const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return order[a.severity] - order[b.severity];
    }).slice(0, 25);
    lines.push(`Top ${priority.length} issues to fix first (by severity):`);
    lines.push('');
    priority.forEach((i, idx) => lines.push(`${idx + 1}. **[${i.severity}]** \`${i.page}\` _(${i.check})_ — ${i.finding}`));
    lines.push('');

    lines.push('## Observations');
    lines.push('');
    const checkDistribution = [...byCheck.entries()].map(([name, arr]) => `${name}: ${arr.length}`).join(', ');
    lines.push(`- Issue distribution: ${checkDistribution}`);
    lines.push(`- ${pagesWithIssues} of ${pages.length} pages (${(pagesWithIssues / pages.length * 100).toFixed(1)}%) flagged at least one issue.`);
    const topProblematic = [...byPage.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 10);
    if (topProblematic.length > 0) {
        lines.push('- Pages with the most issues:');
        for (const [p, arr] of topProblematic) lines.push(`  - \`${p}\`: ${arr.length} issue${arr.length === 1 ? '' : 's'}`);
    }
    lines.push('');
    return lines.join('\n');
}

// ─── Main ───────────────────────────────────────────────────────────────
function main() {
    const start = Date.now();
    const writeBaseline = process.argv.includes('--write-baseline');

    console.log('Finding pages...');
    const pages = findPages();
    console.log(`Found ${pages.length} pages.`);

    const urlSet = audit.buildUrlSetFromSiteRoot(ROOT);
    const industryDataPath = path.join(ROOT, 'data', 'industry-data.json');
    const industryData = fs.existsSync(industryDataPath) ? JSON.parse(fs.readFileSync(industryDataPath, 'utf8')) : null;

    const allFindings = [];
    console.log('Running per-page checks...');
    for (const absPath of pages) {
        const urlPath = audit.fileToUrlPath(absPath, ROOT);
        const html = fs.readFileSync(absPath, 'utf8');
        const context = {
            urlPath,
            urlSet,
            industryData,
            checkNames: audit.ALL_CHECK_NAMES,
        };
        allFindings.push(...audit.runChecks(html, context));
    }
    console.log('Running pairwise duplicate-content check...');
    allFindings.push(...runDuplicateCheck(pages));

    const elapsed = Date.now() - start;
    console.log(`Audit complete in ${(elapsed / 1000).toFixed(1)}s. ${allFindings.length} findings across ${new Set(allFindings.map(f => f.page)).size} pages.`);

    if (writeBaseline) {
        const signatures = [...new Set(allFindings.map(f => audit.findingSignature(f)))];
        fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
        fs.writeFileSync(BASELINE_PATH, JSON.stringify({ generated_at: new Date().toISOString(), signatures }, null, 2), 'utf8');
        console.log(`Baseline written to ${path.relative(ROOT, BASELINE_PATH)} with ${signatures.length} signatures.`);
    }

    const report = buildReport(pages, allFindings, elapsed);
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, report, 'utf8');
    console.log(`Report written to ${path.relative(ROOT, REPORT_PATH)}`);
}

if (require.main === module) main();
