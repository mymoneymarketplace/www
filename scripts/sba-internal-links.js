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
        { slug: 'california', label: 'California', href: '/sba-loans/restaurants/california/',
          rationale: 'the largest restaurant SBA market in the US by volume (12.6% national share)' },
        { slug: 'texas',      label: 'Texas',      href: '/sba-loans/restaurants/texas/',
          rationale: 'the fastest-growing restaurant SBA market (+42.6% YoY) and second-largest state by volume' },
        { slug: 'florida',    label: 'Florida',    href: '/sba-loans/restaurants/florida/',
          rationale: 'the fourth-largest restaurant SBA state with distinctive hurricane, seasonality, and insurance underwriting factors' },
        { slug: 'new-york',   label: 'New York',   href: '/sba-loans/restaurants/new-york/',
          rationale: 'the third-largest restaurant SBA market by volume, with honest framing on above-average charge-off and NYC cost pressures' },
        { slug: 'illinois',   label: 'Illinois',   href: '/sba-loans/restaurants/illinois/',
          rationale: 'the sixth-largest restaurant SBA state with +33% YoY growth and honest framing on 1.59x SBA charge-off average' },
        { slug: 'georgia',    label: 'Georgia',    href: '/sba-loans/restaurants/georgia/',
          rationale: 'the eighth-largest restaurant SBA state with clean performance (0.84x SBA charge-off) and $738K average deal size' },
        { slug: 'new-jersey', label: 'New Jersey', href: '/sba-loans/restaurants/new-jersey/',
          rationale: 'the ninth-largest restaurant SBA state with the cleanest Northeast performance (0.74x SBA average charge-off)' },
    ],
    'auto-repair': [
        { slug: 'texas',      label: 'Texas',      href: '/sba-loans/auto-repair/texas/',
          rationale: 'the fastest-growing auto repair SBA state (+52% YoY, nearly 2x the national auto-repair rate) and #2 by volume' },
    ],
    'dentists': [
        { slug: 'california', label: 'California', href: '/sba-loans/dentists/california/',
          rationale: 'the largest dental SBA market in the US (18% national share) and the lowest-risk high-volume combination in the SBA dataset' },
        { slug: 'texas',      label: 'Texas',      href: '/sba-loans/dentists/texas/',
          rationale: 'the second-largest dental SBA state with zero charge-offs across all 399 loans FY2020-2025' },
        { slug: 'florida',    label: 'Florida',    href: '/sba-loans/dentists/florida/',
          rationale: 'the third-largest dental SBA state (7.5% national share) with $949K average deal size and 0.24x SBA charge-off performance' },
    ],
    'physicians': [
        { slug: 'california', label: 'California', href: '/sba-loans/physicians/california/',
          rationale: 'the largest physician SBA market in the US (13.8% national share) with 0.26x SBA charge-off performance and +32.6% YoY growth' },
        { slug: 'texas',      label: 'Texas',      href: '/sba-loans/physicians/texas/',
          rationale: 'the second-largest physician SBA state (11.1% national share) with strong specialist lender coverage and no state income tax on operator personal-side underwriting' },
        { slug: 'florida',    label: 'Florida',    href: '/sba-loans/physicians/florida/',
          rationale: 'the third-largest physician SBA state (10.4% national share) with honest framing on 1.24x SBA charge-off average and Florida-specific payer-mix and insurance-cost underwriting' },
    ],
    'plumbing-hvac': [
        { slug: 'california', label: 'California', href: '/sba-loans/plumbing-hvac/california/',
          rationale: 'the largest plumbing/HVAC SBA state (10.6% national share) with U.S. Bank dominant (25% of state volume) and California-specific CSLB, labor, and workers-comp underwriting' },
    ],
    'veterinarians': [
        { slug: 'california', label: 'California', href: '/sba-loans/veterinarians/california/',
          rationale: 'the largest state for the best-performing SBA category (zero charge-offs across all 183 CA vet loans, $1.7M average deal size)' },
    ],
    'insurance-agencies': [
        { slug: 'texas',      label: 'Texas',      href: '/sba-loans/insurance-agencies/texas/',
          rationale: "the #1 state for insurance agency SBA -- the only industry category where Texas beats California on volume" },
    ],
};

// ─── Helpers ───────────────────────────────────────────────────────────

function industryHref(slug) { return `/sba-loans/${slug}/`; }
function scenarioHref(slug) { return `/sba-loans/${slug}/`; }

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
