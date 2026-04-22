#!/usr/bin/env node
/**
 * pre-commit-audit.js — git pre-commit hook runner for content audit.
 *
 * Invoked by .git/hooks/pre-commit (installed via scripts/install-hooks.sh).
 * Runs the per-page audit checks from audit-module.js against any staged
 * .html file. Baseline at data/audit-baseline.json grandfathers pre-existing
 * findings. Exits 1 if any new CRITICAL/HIGH finding appears on a staged
 * page; otherwise exits 0.
 *
 * Bypass: SKIP_AUDIT=1 in the environment, or `git commit --no-verify`.
 *
 * Unlike the generator guardrail (which uses PRE_PUBLISH_CHECKS), this hook
 * runs ALL_CHECK_NAMES because staged files have been committed-to-tree and
 * the URL set (for internal-link-validity) reflects the actual site state.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const audit = require('./audit-module.js');

const ROOT = path.resolve(__dirname, '..');
const BASELINE_PATH = path.join(ROOT, 'data', 'audit-baseline.json');

function stagedHtmlFiles() {
    let raw;
    try {
        raw = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8', cwd: ROOT });
    } catch (e) {
        return [];
    }
    return raw
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(s => s.endsWith('.html'))
        .map(rel => path.join(ROOT, rel))
        .filter(abs => fs.existsSync(abs));
}

function readStagedBlob(absPath) {
    // Staged content may differ from working tree; read the staged version.
    const rel = path.relative(ROOT, absPath).split(path.sep).join('/');
    try {
        return execSync(`git show :${rel}`, { encoding: 'utf8', cwd: ROOT, maxBuffer: 50 * 1024 * 1024 });
    } catch (e) {
        return fs.readFileSync(absPath, 'utf8');
    }
}

function main() {
    if (process.env.SKIP_AUDIT === '1') {
        console.warn('[pre-commit-audit] SKIP_AUDIT=1 — hook bypassed.');
        return 0;
    }

    const files = stagedHtmlFiles();
    if (files.length === 0) return 0;

    const baseline = audit.loadBaseline(BASELINE_PATH);
    const urlSet = audit.buildUrlSetFromSiteRoot(ROOT);
    const industryDataPath = path.join(ROOT, 'data', 'industry-data.json');
    const industryData = fs.existsSync(industryDataPath) ? JSON.parse(fs.readFileSync(industryDataPath, 'utf8')) : null;

    let totalBlockers = 0;
    let totalWarnings = 0;

    for (const abs of files) {
        const urlPath = audit.fileToUrlPath(abs, ROOT);
        const html = readStagedBlob(abs);
        const findings = audit.runChecks(html, {
            urlPath,
            urlSet,
            industryData,
            checkNames: audit.ALL_CHECK_NAMES,
        });
        const newFindings = audit.filterNewFindings(findings, baseline);
        const blockers = newFindings.filter(f => audit.BLOCKING_SEVERITIES.includes(f.severity));
        const warnings = newFindings.filter(f => !audit.BLOCKING_SEVERITIES.includes(f.severity));

        if (warnings.length > 0) {
            console.warn(`[pre-commit-audit] ${warnings.length} non-blocking finding(s) on ${urlPath}:`);
            for (const w of warnings) console.warn(`  - ${audit.formatFinding(w).replace(/\n/g, '\n    ')}`);
            totalWarnings += warnings.length;
        }
        if (blockers.length > 0) {
            console.error(`\n[pre-commit-audit] BLOCKED: ${blockers.length} CRITICAL/HIGH finding(s) on ${urlPath}:`);
            for (const b of blockers) console.error(`  - ${audit.formatFinding(b).replace(/\n/g, '\n    ')}`);
            totalBlockers += blockers.length;
        }
    }

    if (totalBlockers > 0) {
        console.error(`\n[pre-commit-audit] Commit rejected. ${totalBlockers} blocking finding(s) across ${files.length} staged HTML file(s).`);
        console.error('Fix the issues above, re-stage, and commit again.');
        console.error('To bypass (dev only): SKIP_AUDIT=1 git commit ..., or git commit --no-verify.');
        return 1;
    }

    if (totalWarnings > 0) {
        console.warn(`[pre-commit-audit] ${totalWarnings} non-blocking finding(s). Commit permitted.`);
    }
    return 0;
}

if (require.main === module) process.exit(main());
