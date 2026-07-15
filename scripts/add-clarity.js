#!/usr/bin/env node
/**
 * add-clarity.js — insert the Microsoft Clarity snippet into any HTML file
 * that doesn't already have it. Idempotent.
 *
 * Insertion point: right after `<meta name="viewport" ...>`.
 * If viewport meta is missing, falls back to right after `<head>`.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', 'data', 'scripts', 'docs', 'worker', '.git']);

const CLARITY_SNIPPET = `    <!-- Microsoft Clarity -->
    <script type="text/javascript">
        (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
        })(window, document, "clarity", "script", "xmyn125cca");
    </script>
`;

const CLARITY_MARKER = 'https://www.clarity.ms/tag/';

function walkHtml(dir, out = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
    for (const e of entries) {
        if (e.isDirectory()) {
            if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
            walkHtml(path.join(dir, e.name), out);
        } else if (e.isFile() && e.name.endsWith('.html')) {
            out.push(path.join(dir, e.name));
        }
    }
    return out;
}

function insertClarity(html) {
    if (html.includes(CLARITY_MARKER)) return { html, inserted: false };

    // Preferred anchor: viewport meta.
    const viewportRe = /(<meta\s+name=["']viewport["'][^>]*>\s*\n?)/i;
    if (viewportRe.test(html)) {
        return { html: html.replace(viewportRe, '$1' + CLARITY_SNIPPET), inserted: true };
    }
    // Fallback: just after <head>.
    const headRe = /(<head[^>]*>\s*\n?)/i;
    if (headRe.test(html)) {
        return { html: html.replace(headRe, '$1' + CLARITY_SNIPPET), inserted: true };
    }
    return { html, inserted: false };
}

function main() {
    const files = walkHtml(ROOT);
    let inserted = 0, skipped = 0, unchanged = 0;
    for (const f of files) {
        const text = fs.readFileSync(f, 'utf8');
        const { html, inserted: didInsert } = insertClarity(text);
        if (didInsert) {
            fs.writeFileSync(f, html, 'utf8');
            inserted++;
            const rel = path.relative(ROOT, f).split(path.sep).join('/');
            console.log(`+ ${rel}`);
        } else if (text.includes(CLARITY_MARKER)) {
            unchanged++;
        } else {
            skipped++;
            const rel = path.relative(ROOT, f).split(path.sep).join('/');
            console.warn(`SKIP (no anchor found): ${rel}`);
        }
    }
    console.log(`\n${inserted} inserted, ${unchanged} already had it, ${skipped} skipped (no anchor).`);
    console.log(`Total HTML with Clarity: ${inserted + unchanged}/${files.length}`);
}

if (require.main === module) main();
