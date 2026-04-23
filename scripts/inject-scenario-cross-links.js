#!/usr/bin/env node
/**
 * inject-scenario-cross-links.js — one-off patcher that inserts a
 * "Related SBA industry guides" section into each hand-written scenario
 * page, using SCENARIO_RELATED from scripts/sba-internal-links.js as the
 * source of truth.
 *
 * Idempotent: if the section already exists (identified by its
 * aria-label), re-runs skip that page.
 *
 * Kept under scripts/ rather than as a generator so the scenario HTML
 * files remain hand-owned; this runs on demand when SCENARIO_RELATED
 * changes.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const LINKS = require('./sba-internal-links.js');

const ROOT = path.resolve(__dirname, '..');
const ARIA = 'Related SBA industry guides';
const MARKER = '<section class="faq-section" id="faq">';

// Per-scenario lead line framing the block.
const LEAD = {
    'business-acquisition': 'Industries where SBA acquisition financing is the dominant use case.',
    'franchise':            'Industries with the highest franchise-branded SBA volume.',
    'no-collateral':        'Asset-light service industries where collateral shortfall is the usual borrower concern.',
    'startups':             'Industries where startup SBA financing is commonly sought.',
};

function buildSection(scenarioSlug) {
    const industries = LINKS.relatedForScenario(scenarioSlug);
    if (!industries.length) return null;
    const lead = LEAD[scenarioSlug] || 'Industry-specific SBA guides relevant to this scenario.';

    const items = industries.map(slug =>
        `            <li><a href="${LINKS.industryHref(slug)}"><strong>SBA Loans for ${LINKS.industryLabel(slug)}</strong></a></li>`
    ).join('\n');

    // Self-contained inline styling so the block doesn't depend on per-page CSS classes.
    return [
        `<section class="related-industries" aria-label="${ARIA}" style="padding:64px 0;border-top:1px solid var(--border,#e5e7eb);background:var(--white,#fff);">`,
        `    <div class="container" style="max-width:900px;margin:0 auto;padding:0 24px;">`,
        `        <h2 style="font-size:28px;font-weight:700;margin:0 0 12px;">Related SBA industry guides</h2>`,
        `        <p style="color:var(--muted,#6b7280);margin:0 0 20px;line-height:1.6;">${lead}</p>`,
        `        <ul style="list-style:disc;padding-left:24px;margin:0;line-height:2;">`,
        items,
        `        </ul>`,
        `    </div>`,
        `</section>`,
        '',
    ].join('\n');
}

function processFile(scenarioSlug) {
    const abs = path.join(ROOT, 'sba-loans', scenarioSlug, 'index.html');
    if (!fs.existsSync(abs)) { console.warn(`  skip ${scenarioSlug}: not found`); return 'missing'; }
    const html = fs.readFileSync(abs, 'utf8');
    if (html.includes(`aria-label="${ARIA}"`)) {
        console.log(`  skip ${scenarioSlug}: already present`);
        return 'idempotent';
    }
    if (!html.includes(MARKER)) {
        console.warn(`  skip ${scenarioSlug}: FAQ marker not found`);
        return 'no-marker';
    }
    const block = buildSection(scenarioSlug);
    if (!block) { console.warn(`  skip ${scenarioSlug}: no mapping`); return 'no-mapping'; }

    const updated = html.replace(MARKER, block + MARKER);
    fs.writeFileSync(abs, updated, 'utf8');
    const linkCount = (block.match(/<a href="\/sba-loans\//g) || []).length;
    console.log(`  wrote ${scenarioSlug}: +${linkCount} industry links`);
    return 'updated';
}

function main() {
    const scenarios = Object.keys(LINKS.SCENARIO_RELATED);
    console.log(`Patching ${scenarios.length} scenario pages with related-industry sections...`);
    const results = {};
    for (const s of scenarios) results[s] = processFile(s);
    const updated = Object.values(results).filter(r => r === 'updated').length;
    console.log(`Done. Updated ${updated} of ${scenarios.length}.`);
}

if (require.main === module) main();

module.exports = { buildSection, processFile };
