#!/usr/bin/env node
/**
 * sba-internal-links.js — single source of truth for cross-linking across the
 * SBA cluster (industry pages ↔ scenario pages ↔ state-industry pages).
 *
 * Used by:
 *   - scripts/generate-industry-page.js — renders the "Related SBA guides"
 *     section on each generated industry page.
 *   - scripts/audit-internal-links.js — reads these mappings for diagnostic
 *     checks (not currently, but trivially attachable).
 *   - Hand-edited scenario pages (business-acquisition, franchise, no-
 *     collateral, startups, disaster) — cross-linking blocks on those pages
 *     are kept consistent with SCENARIO_RELATED below.
 *
 * Update this file when the site gains a new industry, scenario, or state-
 * industry page. The generator pulls from here on every regeneration.
 */

'use strict';

// ─── Human-readable labels ─────────────────────────────────────────────

const INDUSTRY_LABELS = {
    'accounting':         'Accounting Firms',
    'auto-body':          'Auto Body Shops',
    'auto-repair':        'Auto Repair Shops',
    'beauty-salons':      'Beauty Salons',
    'building-services':  'Building Services',
    'child-care':         'Child Care Centers',
    'chiropractors':      'Chiropractic Practices',
    'cpas':               'CPA Firms',
    'dentists':           'Dental Practices',
    'insurance-agencies': 'Insurance Agencies',
    'landscaping':        'Landscaping Companies',
    'personal-care':      'Personal Care / Medspa',
    'pet-care':           'Pet Care',
    'physicians':         'Physicians',
    'plumbing-hvac':      'Plumbing & HVAC',
    'restaurants':        'Restaurants',
    'specialty-trades':   'Specialty Trades',
    'veterinarians':      'Veterinary Practices',
};

const SCENARIO_LABELS = {
    'after-bankruptcy':    'SBA Loans After Bankruptcy',
    'bad-credit':          'SBA Loans with Bad Credit',
    'business-acquisition':'SBA Business Acquisition Loans',
    'disaster':            'SBA Disaster Loans',
    'franchise':           'SBA Franchise Loans',
    'minority':            'SBA Loans for Minority Owners',
    'no-collateral':       'SBA Loans with No Collateral',
    'requirements':        'SBA Loan Requirements',
    'self-employed':       'SBA Loans for Self-Employed',
    'startups':            'SBA Startup Loans',
    'veterans':            'SBA Loans for Veterans',
    'women':               'SBA Loans for Women-Owned Businesses',
};

// ─── Per-industry related content ──────────────────────────────────────
/**
 * For each industry slug:
 *   industries: related industry slugs (2-3 typical)
 *   scenarios:  related scenario slugs (0-2 typical)
 *
 * Selection rules (documented in the original task spec):
 *   - Medical cluster (dentists/physicians/veterinarians/chiropractors)
 *     links symmetrically within itself.
 *   - Professional services (cpas/accounting/insurance-agencies) link
 *     symmetrically, and all three surface no-collateral as asset-light.
 *   - Trades (plumbing-hvac/landscaping/specialty-trades/building-services)
 *     link symmetrically.
 *   - Auto (auto-repair/auto-body) is a two-way pair.
 *   - Pet-care <-> veterinarians (adjacency + Tier B).
 *   - Personal-care <-> beauty-salons (both on the beauty/personal cluster).
 *   - Medical cluster + cpas + insurance-agencies surface business-acquisition.
 *   - Franchise-heavy industries (restaurants/personal-care/pet-care/
 *     child-care/building-services) surface franchise.
 */
const INDUSTRY_RELATED = {
    'accounting':         { industries: ['cpas', 'insurance-agencies'],                      scenarios: ['no-collateral'] },
    'auto-body':          { industries: ['auto-repair'],                                     scenarios: [] },
    'auto-repair':        { industries: ['auto-body'],                                       scenarios: [] },
    'beauty-salons':      { industries: ['personal-care'],                                   scenarios: [] },
    'building-services':  { industries: ['plumbing-hvac', 'landscaping', 'specialty-trades'],scenarios: ['franchise'] },
    'child-care':         { industries: [],                                                  scenarios: ['franchise'] },
    'chiropractors':      { industries: ['dentists', 'physicians', 'veterinarians'],         scenarios: [] },
    'cpas':               { industries: ['accounting', 'insurance-agencies'],                scenarios: ['business-acquisition', 'no-collateral'] },
    'dentists':           { industries: ['physicians', 'veterinarians', 'chiropractors'],    scenarios: ['business-acquisition'] },
    'insurance-agencies': { industries: ['cpas', 'accounting'],                              scenarios: ['business-acquisition', 'no-collateral'] },
    'landscaping':        { industries: ['plumbing-hvac', 'specialty-trades', 'building-services'], scenarios: [] },
    'personal-care':      { industries: ['beauty-salons'],                                   scenarios: ['franchise'] },
    'pet-care':           { industries: ['veterinarians'],                                   scenarios: ['franchise'] },
    'physicians':         { industries: ['dentists', 'veterinarians', 'chiropractors'],      scenarios: ['business-acquisition'] },
    'plumbing-hvac':      { industries: ['landscaping', 'specialty-trades', 'building-services'], scenarios: [] },
    'restaurants':        { industries: [],                                                  scenarios: ['franchise', 'business-acquisition'] },
    'specialty-trades':   { industries: ['plumbing-hvac', 'landscaping', 'building-services'], scenarios: [] },
    'veterinarians':      { industries: ['dentists', 'physicians', 'chiropractors', 'pet-care'], scenarios: ['business-acquisition'] },
};

// ─── Per-scenario related industries ───────────────────────────────────
/**
 * For each scenario slug that needs surfaced industries, list them in the
 * order they should appear. Unmapped scenarios don't render a cross-link
 * block (keep quality > quantity per the task spec).
 */
const SCENARIO_RELATED = {
    'business-acquisition': ['dentists', 'physicians', 'veterinarians', 'cpas', 'insurance-agencies', 'restaurants'],
    'franchise':            ['restaurants', 'personal-care', 'pet-care', 'child-care', 'building-services'],
    'no-collateral':        ['cpas', 'accounting', 'insurance-agencies'],
    'startups':             ['restaurants', 'personal-care'],
};

// ─── State-industry pages ──────────────────────────────────────────────
/**
 * For each industry slug, a list of state-industry children that currently
 * exist on the site. The generator surfaces these as a "lending by state"
 * callout on the parent industry page.
 */
const STATE_INDUSTRIES = {
    'restaurants': [
        { slug: 'california', label: 'California', href: '/sba-loans/restaurants/california',
          rationale: 'the largest restaurant SBA market in the US by volume (12.6% national share)' },
        { slug: 'texas',      label: 'Texas',      href: '/sba-loans/restaurants/texas',
          rationale: 'the fastest-growing restaurant SBA market (+42.6% YoY) and second-largest state by volume' },
    ],
};

// ─── Helpers ───────────────────────────────────────────────────────────

function industryHref(slug) { return `/sba-loans/${slug}`; }
function scenarioHref(slug) { return `/sba-loans/${slug}`; }

function industryLabel(slug) { return INDUSTRY_LABELS[slug] || slug; }
function scenarioLabel(slug) { return SCENARIO_LABELS[slug] || slug; }

function relatedForIndustry(slug) {
    return INDUSTRY_RELATED[slug] || { industries: [], scenarios: [] };
}

function relatedForScenario(slug) {
    return SCENARIO_RELATED[slug] || [];
}

function stateIndustriesFor(slug) {
    return STATE_INDUSTRIES[slug] || [];
}

module.exports = {
    INDUSTRY_LABELS, SCENARIO_LABELS,
    INDUSTRY_RELATED, SCENARIO_RELATED, STATE_INDUSTRIES,
    industryHref, scenarioHref, industryLabel, scenarioLabel,
    relatedForIndustry, relatedForScenario, stateIndustriesFor,
};
