#!/usr/bin/env node
/**
 * fix-trailing-slashes.js — add trailing slash to on-site URLs in target files.
 *
 * Handles:
 *   href="/path"                     -> href="/path/"
 *   href="https://mymoneymarketplace.com/path" -> ".../path/"
 *   "item":"https://.../path"        -> ".../path/"
 *   "url":"https://.../path"         -> ".../path/"
 *   "@id":"https://.../path"         -> ".../path/"
 *   "mainEntityOfPage":"https://..." -> ".../path/"
 *   <loc>https://.../path</loc>      -> ".../path/</loc>"
 *
 * Skips:
 *   - Paths that already end in "/"
 *   - Paths with a file extension (.html, .pdf, .png, .jpg, .svg, .ico, .css, .js, .xml, .txt, .webp)
 *   - External URLs (any non-mymoneymarketplace.com absolute)
 *   - Anchors (#foo), mailto:, tel:
 *
 * Handles query + fragment on paths: /foo?x=1 -> /foo/?x=1, /foo#bar -> /foo/#bar
 *
 * Usage:
 *   node scripts/fix-trailing-slashes.js <file> [<file> ...]
 *   node scripts/fix-trailing-slashes.js --html    # patch every generated HTML file
 *   node scripts/fix-trailing-slashes.js --sources # patch generator source files
 *
 * Idempotent — re-running on already-slash-corrected files makes zero changes.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://mymoneymarketplace.com';

const SKIP_EXT = /\.(?:html|pdf|png|jpe?g|gif|svg|ico|css|js|xml|txt|webp|json)$/i;

// Given a raw URL/href string, return the slash-corrected version (or the same string if not applicable).
function addSlashToUrl(raw) {
    if (!raw) return raw;
    const trimmed = raw.trim();
    // Skip anchors, mailto, tel, protocol-relative, purely relative
    if (trimmed.startsWith('#') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:')) return raw;
    if (trimmed.startsWith('//')) return raw;
    let pathPart, queryFragment, prefix;
    if (trimmed.startsWith(SITE)) {
        prefix = SITE;
        const rest = trimmed.slice(SITE.length);
        // Split path from query/fragment
        const m = rest.match(/^([^?#]*)(.*)$/);
        pathPart = m ? m[1] : rest;
        queryFragment = m ? m[2] : '';
    } else if (trimmed.startsWith('/')) {
        prefix = '';
        const m = trimmed.match(/^([^?#]*)(.*)$/);
        pathPart = m ? m[1] : trimmed;
        queryFragment = m ? m[2] : '';
    } else {
        return raw; // external absolute or unrecognized form
    }
    if (pathPart === '/') return raw; // root already correct
    if (!pathPart) {
        // Bare "https://mymoneymarketplace.com" with no path — add trailing slash.
        return prefix + '/' + queryFragment;
    }
    if (pathPart.endsWith('/')) return raw; // already slash
    if (SKIP_EXT.test(pathPart)) return raw; // file extension
    return prefix + pathPart + '/' + queryFragment;
}

// Apply the URL fixup to every match of one of the target attribute patterns in the file text.
function patchText(text) {
    let changed = 0;

    // Attribute patterns: href="...", content="..." (og:url meta), "@id":"...", "url":"...", "item":"...", "mainEntityOfPage":"...", <loc>...</loc>
    // These are all string-quoted values we can substitute.
    const patterns = [
        // href="..."  (matches any quote style)
        { re: /(\shref\s*=\s*)(["'])([^"']+)\2/g },
        // og:url meta:  <meta property="og:url" content="...">
        { re: /(og:url["']\s+content\s*=\s*)(["'])([^"']+)\2/g },
        // JSON-LD-ish fields as bare "key":"value" — only match when value looks like our site URL or an on-site path
        { re: /("(?:@id|url|item|mainEntityOfPage|href)"\s*:\s*)(")([^"]+)(")/g },
        // Sitemap <loc>...</loc>
        { re: /(<loc>)([^<]+)(<\/loc>)/g },
    ];

    let out = text;
    for (const { re } of patterns) {
        out = out.replace(re, (match, ...groups) => {
            // For patterns with quotes: captures are [pre, quote, url, quote] and optionally [tail]
            // For <loc>: captures are [openTag, url, closeTag]
            // Distinguish by number of capture groups.
            const g = groups.slice(0, -2); // last two are (offset, string)
            let raw, newUrl, replacement;
            if (g.length === 3 && match.startsWith('<loc>')) {
                // <loc>URL</loc>
                raw = g[1];
                newUrl = addSlashToUrl(raw);
                if (newUrl === raw) return match;
                replacement = g[0] + newUrl + g[2];
            } else if (g.length === 4) {
                // "key": "value"
                raw = g[2];
                newUrl = addSlashToUrl(raw);
                if (newUrl === raw) return match;
                replacement = g[0] + g[1] + newUrl + g[3];
            } else if (g.length === 3) {
                // (pre)(quote)(value)  — attribute form
                raw = g[2];
                newUrl = addSlashToUrl(raw);
                if (newUrl === raw) return match;
                replacement = g[0] + g[1] + newUrl + g[1];
            } else {
                return match;
            }
            changed++;
            return replacement;
        });
    }
    return { out, changed };
}

function walkHtml(dir, out = []) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return out; }
    const skip = new Set(['node_modules', 'data', 'scripts', 'docs', 'worker', '.git']);
    for (const e of entries) {
        if (e.isDirectory()) {
            if (e.name.startsWith('.') || skip.has(e.name)) continue;
            walkHtml(path.join(dir, e.name), out);
        } else if (e.isFile() && e.name.endsWith('.html')) {
            out.push(path.join(dir, e.name));
        }
    }
    return out;
}

function main() {
    const argv = process.argv.slice(2);
    let targets = [];
    if (argv.includes('--html')) {
        targets = walkHtml(ROOT);
    } else if (argv.includes('--sources')) {
        targets = [
            'scripts/generate-industry-page.js',
            'scripts/generate-state-industry-page.js',
            'generate-city-pages.js',
            'generate-profession-pages.js',
            'generate-hub-pages.js',
        ].map(p => path.join(ROOT, p)).filter(fs.existsSync);
    } else {
        targets = argv.map(a => path.resolve(a));
    }
    if (targets.length === 0) {
        console.error('No targets. Pass files or --html / --sources.');
        process.exit(1);
    }

    let filesChanged = 0, totalReplacements = 0;
    for (const f of targets) {
        const text = fs.readFileSync(f, 'utf8');
        const { out, changed } = patchText(text);
        if (changed > 0) {
            fs.writeFileSync(f, out, 'utf8');
            filesChanged++;
            totalReplacements += changed;
            const rel = path.relative(ROOT, f).split(path.sep).join('/');
            console.log(`patched ${rel} (${changed} replacements)`);
        }
    }
    console.log(`\nTotal: ${filesChanged} files patched, ${totalReplacements} URL replacements.`);
}

if (require.main === module) main();

module.exports = { addSlashToUrl, patchText };
