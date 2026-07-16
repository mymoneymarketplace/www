#!/usr/bin/env node
/**
 * vendor-parasite-content.js — one-time provenance tool.
 *
 * The apex city generator (generate-city-pages.js) and profession generator
 * (generate-profession-pages.js) originally read FAQ + meta-description content
 * out of the parasite HTML files in the sibling ../seo-pages repo. That network
 * was retired on 2026-07-15 (seo-pages commit eb8c083) — every parasite file is
 * now a ~550-byte redirect stub with no FAQPage JSON-LD. Re-running either
 * generator against the stubs drops every parasite-sourced page ("no FAQs
 * extracted"), which would blow away ~200 city + ~57 profession pages.
 *
 * This script reconstructs the exact inputs the generators need from the LAST
 * pre-retirement revision of each parasite (seo-pages ref 2224f01, the parent
 * of the retirement commit) and vendors them into mmm-site/data/ so the
 * generators no longer depend on ../seo-pages at all.
 *
 * Run once (already run; output committed):
 *   node scripts/vendor-parasite-content.js
 *
 * Requires the sibling ../seo-pages git repo to still contain ref 2224f01.
 * Env overrides: SEO_PAGES_REPO (default ../seo-pages), PARASITE_REF (default 2224f01).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SEO_REPO = process.env.SEO_PAGES_REPO || path.resolve(ROOT, '..', 'seo-pages');
const REF = process.env.PARASITE_REF || '2224f01';
const DATA_DIR = path.join(ROOT, 'data');

function gitShow(relPath) {
    return execSync(`git show ${REF}:${relPath}`, { cwd: SEO_REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function listFilesAtRef(regex) {
    const raw = execSync(`git ls-tree --name-only ${REF}`, { cwd: SEO_REPO, encoding: 'utf8' });
    return raw.split(/\r?\n/).map(s => s.trim()).filter(f => regex.test(f));
}

function decodeEntities(s) {
    if (!s) return s;
    return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
        .replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ');
}

function extractMeta(html, name) {
    const m = html.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, 'i'));
    return m ? decodeEntities(m[1]) : '';
}

function extractFaqs(html) {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const b of blocks) {
        try {
            const data = JSON.parse(b[1]);
            const nodes = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
            for (const n of nodes) {
                if (n['@type'] === 'FAQPage' && Array.isArray(n.mainEntity)) {
                    return n.mainEntity
                        .filter(q => q['@type'] === 'Question' && q.acceptedAnswer && q.acceptedAnswer.text)
                        .map(q => ({ q: q.name, a: q.acceptedAnswer.text }));
                }
            }
        } catch (_) { /* skip */ }
    }
    return [];
}

function extractCanonicalSlug(html) {
    const m = html.match(/<link\s+rel="canonical"\s+href="https?:\/\/[^\/]+\/credit-cards\/([^"\/]+)"/i);
    return m ? m[1] : null;
}

function vendorCities() {
    const files = listFilesAtRef(/^business-loans-[a-z-]+-[a-z]{2}\.html$/);
    const out = {};
    let noFaq = 0;
    for (const f of files) {
        const html = gitShow(f);
        const faqs = extractFaqs(html);
        if (faqs.length === 0) { noFaq++; continue; }
        out[f] = { metaDesc: extractMeta(html, 'description'), faqs };
    }
    const dest = path.join(DATA_DIR, 'city-parasite-content.json');
    fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
    console.log(`cities: ${Object.keys(out).length} vendored, ${noFaq} skipped (no FAQs) -> ${path.relative(ROOT, dest)}`);
}

function vendorProfessions() {
    const files = listFilesAtRef(/^best-credit-cards-for-.+-20\d{2}\.html$/);
    const out = {};
    let noFaq = 0;
    for (const f of files) {
        const html = gitShow(f);
        const faqs = extractFaqs(html);
        if (faqs.length === 0) { noFaq++; continue; }
        out[f] = {
            canonicalSlug: extractCanonicalSlug(html),
            metaDesc: extractMeta(html, 'description'),
            faqs,
        };
    }
    const dest = path.join(DATA_DIR, 'profession-parasite-content.json');
    fs.writeFileSync(dest, JSON.stringify(out, null, 2) + '\n');
    console.log(`professions: ${Object.keys(out).length} vendored, ${noFaq} skipped (no FAQs) -> ${path.relative(ROOT, dest)}`);
}

vendorCities();
vendorProfessions();
