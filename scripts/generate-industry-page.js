#!/usr/bin/env node
/**
 * generate-industry-page.js
 *
 * NAICS-parameterized SBA industry page generator.
 * Reads data/industry-data.json, builds HTML for the target NAICS, writes
 * it to sba-loans/<slug>/index.html.
 *
 * Usage:
 *   node scripts/generate-industry-page.js 722511
 *
 * Template structure:
 *   - Stats block (renderStatsBlock)   → programmatic, pulls from stats
 *   - Top-lenders section              → programmatic, top_lenders_by_count
 *   - State-concentration section      → programmatic, top_states_by_count
 *   - Narrative sections (underwriting / indep-vs-franchise / failure-rate)
 *                                      → manually configured per NAICS
 *   - Quiz + profiles                  → manually configured per NAICS
 *   - FAQs                             → manually configured per NAICS
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA = require('../data/industry-data.json');
const LINKS = require('./sba-internal-links.js');

// ─── Formatting helpers ─────────────────────────────────────────────────
const fmt = {
    num: n => Math.round(n).toLocaleString('en-US'),
    usdShort: n => n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${Math.round(n).toLocaleString('en-US')}`,
    usdK: n => `$${Math.round(n/1000)}K`,
    usdExact: n => `$${Math.round(n).toLocaleString('en-US')}`,
    pct: n => `${n.toFixed(2)}%`,
    pct1: n => `${n.toFixed(1)}%`,
    signedPct: n => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`,
};

function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Per-NAICS configs ──────────────────────────────────────────────────
const CONFIGS = {

'811111': {
    slug: 'auto-repair',
    programsContext: {
        fits: {
            standard: "shop acquisitions, fleet expansion, real estate combined with the operating business.",
            '504': "buying the shop real estate. Fixed long-term rates on the real-estate portion; paired with 7(a) companion loan for the business.",
            small: "lift replacement, diagnostic tool upgrades, working capital under $500K.",
            equipment: "lifts, alignment racks, diagnostic equipment. 3-10 day funding vs. 45-75 for SBA &mdash; speed often matters more than rate on single-piece equipment.",
        },
    },
    industryNoun: 'auto repair',
    industryNounPossessive: "auto repair shop's",
    heroPhoto: {
        src: 'https://images.pexels.com/photos/8985514/pexels-photo-8985514.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Vehicle elevated on a lift in an auto repair shop floor, representative of equipment-heavy auto repair businesses funded by SBA loans',
        width: 1200,
        height: 675,
        photographer: 'Artem Podrez',
        photographerUrl: 'https://www.pexels.com/@artempodrez/',
        sourceUrl: 'https://www.pexels.com/photo/8985514/',
        sourceName: 'Pexels',
    },
    highlightLenderNames: [],
    h1: 'SBA Loans for Auto Repair Shops',
    title: 'SBA Loan for Auto Repair Shop 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) and 504 loans for auto repair shop acquisitions, equipment, and buildouts. 5,413 auto repair SBA loans approved FY2020-2025, +27% YoY growth. Take the 2-minute quiz.',
    breadcrumbName: 'SBA Loans for Auto Repair Shops',
    campaignSlug: 'sba-auto-repair-quiz',
    heroSub: 'SBA 7(a) is the dominant financing path for auto repair shop acquisitions, equipment upgrades, and real estate. The sector&rsquo;s +27% YoY SBA lending growth reflects a real consolidation and reinvestment cycle. Here&rsquo;s how lenders actually evaluate these files.',
    heroValue: 'Answer 6 questions. Get matched with auto-repair-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps auto repair shop owners compare SBA 7(a), 504, and equipment financing options and get matched with SBA-preferred lenders experienced in automotive repair underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate auto repair shops',
        underwriting: `
            <p>Auto repair SBA underwriting looks more favorable than most equipment-heavy service industries because the assets are collateral-strong and the demand is non-discretionary. Unlike restaurants, auto repair shops don&rsquo;t live or die by concept &mdash; repeat customers, insurance-paid collision work, and steady maintenance cycles create predictable revenue streams. The charge-off rate on SBA auto repair loans reflects that underlying stability.</p>
            <h3>Equipment-heavy deal structure</h3>
            <p>Auto repair acquisitions routinely include <strong>$150K to $400K in specialized equipment</strong> &mdash; two-post and four-post lifts ($4K-$15K each), alignment racks ($20K-$60K), diagnostic equipment including OEM scan tools ($5K-$50K each for dealer-level capability), tire machines, A/C recovery systems, brake lathes, and welding equipment. Lenders get an itemized equipment list with model year and condition because equipment value backs the loan directly.</p>
            <h3>Revenue visibility and customer mix</h3>
            <p>Lenders want to see the split across <strong>general repair, insurance / collision work, fleet contracts, and state-inspection revenue</strong>. A shop with a diversified revenue stack and documented recurring fleet accounts underwrites meaningfully better than a shop leaning heavily on one channel. Insurance-paid collision revenue in particular is a stability signal because claim flow correlates with accident rates rather than consumer discretionary spend.</p>
            <h3>Real estate often included</h3>
            <p>A meaningful share of auto repair SBA deals include the real estate. That shifts the deal structure toward <strong>SBA 504 for the property plus 7(a) companion for the operating business</strong>, or a combined 7(a) covering both. Real estate ownership stabilizes the long-term economics &mdash; auto repair is zoning-sensitive and municipalities increasingly restrict where shops can operate, so owning the site materially protects against forced relocation.</p>
            <h3>Operator experience</h3>
            <p>Lenders weight shop management experience heavily. An ASE-certified master tech with GM experience buying an existing shop underwrites better than a non-technical operator buying the same shop and hiring a manager. Not disqualifying, but inexperienced operators typically see higher equity injection expectations or a requirement for a documented management agreement with an experienced shop lead.</p>
        `,
        indepTitle: 'Independent vs. franchise auto repair SBA',
        indep: `
            <p>Franchise-operator loans account for roughly <strong>{franchise_pct}% of auto repair SBA volume</strong> &mdash; meaningfully less franchise-heavy than restaurants. The industry leans independent. Common franchise brands in the SBA data are tire-and-service chains, quick-lube operators, and collision-repair franchises. When the franchise is listed in the SBA Franchise Directory, most brand-level underwriting is already complete and lenders focus on the operator and site.</p>
            <p>Independent shops take the full underwriting path: operator experience, existing shop financials if acquisition, equipment appraisal, location and real estate (if included). Independent auto repair files close routinely because the equipment and operator pattern is well-understood by specialist lenders.</p>
        `,
        failureTitle: 'Why auto repair outperforms on SBA charge-off',
        failure: `
            <p>Auto repair charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the all-industry SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio. The better-than-average performance reflects three structural features of the industry: <strong>non-discretionary demand</strong> (cars need to run), <strong>collateral-strong equipment</strong> (lifts, diagnostic tools, compressors retain recoverable value if the loan fails), and <strong>multi-channel revenue</strong> (retail customers, insurance claims, fleet, inspection) that cushions any single-channel downturn.</p>
            <p>The +27% YoY growth in SBA lending to auto repair shops reflects real market dynamics, not just SBA-specific expansion. An aging baby-boomer operator cohort is selling practices to younger operators who need financing for the transition. Corporate consolidators &mdash; both PE-backed and strategic &mdash; are competing with individual buyers, which both pushes valuations up and creates more SBA-financed alternatives for sellers who want a non-corporate exit.</p>
            <p>What this means for a borrower: lenders experienced with auto repair deals recognize the favorable underwriting profile and move quickly. Generalist banks sometimes miss the equipment-collateral mechanics entirely and price or structure these deals sub-optimally. Specialist lender match is the biggest practical variable.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?", opts:[
                {v:"acquisition", l:"Acquiring an existing shop"},
                {v:"new", l:"Starting a new shop"},
                {v:"expansion", l:"Expanding or adding a location"},
                {v:"equipment-only", l:"Established shop, equipment upgrade only"},
                {v:"real-estate", l:"Buying the real estate for my shop"},
            ]},
            {q:"Primary use of the loan?", opts:[
                {v:"acquisition-use", l:"Acquisition purchase price"},
                {v:"equipment", l:"Lifts, alignment, diagnostic equipment"},
                {v:"buildout", l:"Bay expansion, buildout, tenant improvements"},
                {v:"real-estate-use", l:"Commercial real estate purchase"},
                {v:"working-capital", l:"Working capital"},
                {v:"multiple", l:"Multiple uses combined"},
            ]},
            {q:"Your operator experience?", opts:[
                {v:"ase-manager", l:"ASE-certified, 5+ years as shop manager/owner"},
                {v:"ase-tech", l:"ASE-certified technician"},
                {v:"non-tech", l:"Non-technical operator with business background"},
                {v:"partner-tech", l:"Non-tech with experienced technical partner"},
                {v:"limited", l:"Limited industry experience"},
            ]},
            {q:"Personal credit score?", opts:[
                {v:"below-640", l:"Below 640"},
                {v:"640-679", l:"640-679"},
                {v:"680-719", l:"680-719"},
                {v:"720-plus", l:"720+"},
            ]},
            {q:"Loan amount needed?", opts:[
                {v:"under-250k", l:"Under $250K"},
                {v:"250k-500k", l:"$250K - $500K"},
                {v:"500k-1m", l:"$500K - $1M"},
                {v:"1m-plus", l:"$1M+"},
            ]},
            {q:"Does the deal include real estate?", opts:[
                {v:"yes", l:"Yes, buying the building"},
                {v:"lease", l:"No, lease the space"},
                {v:"unsure", l:"Not decided"},
            ]},
        ],
        profiles: {
            A: {badge:"Strong acquisition candidate",headline:"You're in the 7(a) acquisition sweet spot",body:"ASE-certified operator acquiring an established shop with clean equipment — exactly what auto-repair-experienced SBA lenders underwrite routinely. Expect 60-90 days to close. Specialist lenders recognize the equipment-collateral mechanics and favorable charge-off profile that generalists often miss.",ctaLabel:"Match with auto-repair-experienced SBA lenders",utmContent:"profile-a-acquisition"},
            B: {badge:"Real estate + operating business",headline:"504 for the real estate, 7(a) for the business",body:"When the deal includes buying the building, SBA 504 handles the real estate portion at fixed long-term rates while 7(a) covers the operating business. This combined structure is common on larger auto repair deals and the economics beat conventional financing on both pieces. Plan 75-120 days for combined closings.",ctaLabel:"Match with 504 + 7(a) auto repair lenders",utmContent:"profile-b-real-estate"},
            C: {badge:"Equipment financing path",headline:"Equipment financing may beat SBA on speed",body:"For established shops needing equipment only, SBA 7(a) Small Loan works but equipment financing (non-SBA) often funds in 3-10 days vs. 45-75 days for SBA. Higher rate than SBA but the equipment is the collateral, and for a single lift or alignment rack the speed difference often justifies the cost premium.",ctaLabel:"Compare equipment financing vs. SBA",utmContent:"profile-c-equipment"},
            D: {badge:"Experience gap",headline:"Strengthen the operator profile before applying",body:"Limited industry experience on a larger deal is the hardest auto repair file to fund. Lenders typically want either a documented management agreement with an experienced shop lead, a partnership with an ASE-certified technical operator, or meaningfully higher equity injection than the 10% minimum. Have this conversation upfront rather than getting declined mid-underwriting.",ctaLabel:"Get honest feedback from an auto repair SBA specialist",utmContent:"profile-d-experience"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],exp=a[2],credit=a[3],amount=a[4],re=a[5];if(exp==='limited'&&(amount==='500k-1m'||amount==='1m-plus'))return 'D';if(re==='yes'||use==='real-estate-use'||sit==='real-estate')return 'B';if(use==='equipment'||sit==='equipment-only')return 'C';if(sit==='acquisition'&&(exp==='ase-manager'||exp==='ase-tech'||exp==='partner-tech')&&(credit==='680-719'||credit==='720-plus'))return 'A';if(sit==='acquisition'&&(amount==='500k-1m'||amount==='1m-plus'))return 'A';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan to buy an auto repair shop?",a:"Yes. Auto repair shop acquisitions are a common SBA 7(a) use case. The loan can cover the purchase price of the business, equipment replacement or additions, real estate if included in the deal, and working capital for operations under new ownership. Minimum 10% equity injection required, with up to 5% available via seller financing on full standby. Typical close in 60-90 days with an auto-repair-experienced lender."},
        {q:"How much can I borrow with an SBA loan for an auto repair shop?",a:"SBA 7(a) Standard goes up to $5 million; SBA 504 goes up to $5.5 million for the SBA portion (typical combined project up to $25M with bank participation). Average auto repair SBA 7(a) loan FY2020-2025 was approximately $477,000. Most shop acquisitions with real estate fall in the $750K to $2.5M range; equipment-only loans run $50K to $400K."},
        {q:"Do I need to be ASE-certified to get an SBA loan for an auto repair shop?",a:"No, but technical experience materially affects underwriting. ASE certification signals industry knowledge to lenders. Non-technical operators can still qualify with one of: an ASE-certified operating partner with equity in the deal, a documented management agreement with an experienced shop lead, or meaningfully higher equity injection to compensate for the experience gap. Pure first-time non-technical operators face the hardest files."},
        {q:"Can SBA financing cover shop equipment like lifts and alignment racks?",a:"Yes. SBA 7(a) can finance specialized auto repair equipment either as part of a larger acquisition package or as a standalone equipment loan. SBA 7(a) Small Loan (up to $500K) is the typical path for equipment-only financing. Non-SBA equipment financing is also worth comparing — it funds in 3-10 days vs. 45-75 days for SBA but at a higher rate. For time-sensitive equipment replacement, the speed premium often matters more than the rate."},
        {q:"What's the SBA charge-off rate for auto repair shops?",a:"Auto repair SBA 7(a) charge-offs run at 1.00%, meaningfully better than the all-industry SBA average of 1.36%. The favorable performance reflects non-discretionary demand, collateral-strong equipment that retains recovery value if loans fail, and diversified revenue across retail customers, insurance claims, fleet accounts, and state inspections."},
        {q:"Should I buy the real estate for my auto repair shop?",a:"When possible, yes — and SBA 504 was built for exactly that use case. Auto repair is zoning-sensitive; municipalities increasingly restrict where shops can operate, so owning the site protects against forced relocation. SBA 504 offers fixed long-term rates on the real-estate portion with 10% down; a 7(a) companion loan typically covers the operating-business portion of the deal. Combined structure often beats conventional financing on both pieces."},
        {q:"How long has auto repair SBA lending been growing?",a:"SBA 7(a) lending to auto repair shops is up 26.93% year-over-year. The growth reflects a real market cycle: aging operator cohort selling practices to younger operators, corporate consolidators (PE-backed and strategic) competing for the same deals, and ongoing equipment upgrade cycles for shops handling modern vehicles. Expect continued lender appetite for well-structured auto repair files."},
    ],
},

'621210': {
    slug: 'dentists',
    programsContext: {
        fits: {
            standard: "practice acquisitions (the dominant use), buildouts, associate buyout of retiring dentist.",
            '504': "buying the office building alongside the practice. Fixed long-term rates.",
            small: "equipment upgrades, imaging or CAD/CAM investments, working capital under $500K.",
            equipment: "chairs, digital imaging, CAD/CAM mills. Equipment financing beats SBA on speed for single-piece dental equipment purchases.",
        },
    },
    industryNoun: 'dental practice',
    industryNounPossessive: "dental practice's",
    heroPhoto: {
        src: 'https://images.pexels.com/photos/6473194/pexels-photo-6473194.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Modern dental operatory with dental chair and equipment, representative of contemporary dental practices financed through SBA 7(a) loans',
        width: 1200,
        height: 801,
        photographer: 'Gene Wide',
        photographerUrl: 'https://www.pexels.com/@gene-wide-3750088/',
        sourceUrl: 'https://www.pexels.com/photo/6473194/',
        sourceName: 'Pexels',
    },
    highlightLenderNames: ['Live Oak Banking Company'],
    h1: 'SBA Loans for Dental Practices',
    title: 'SBA Loan for Dental Practice 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) and 504 loans for dental practice acquisitions, buildouts, and equipment. 4,070 dental SBA loans approved FY2020-2025 with one of the lowest charge-off rates in any SBA industry category.',
    breadcrumbName: 'SBA Loans for Dental Practices',
    campaignSlug: 'sba-dentists-quiz',
    heroSub: 'Dental practice SBA loans have one of the strongest underwriting profiles of any industry category &mdash; a <strong>0.27% charge-off rate</strong>, roughly one-fifth the SBA average. Practice acquisition dominates the use cases, with Live Oak Banking leading the specialist-lender landscape.',
    heroValue: 'Answer 6 questions. Get matched with dental-practice-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps dentists and dental-practice buyers compare SBA 7(a) and 504 options and get matched with specialist lenders experienced in dental practice acquisition underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate dental practice files',
        underwriting: `
            <p>Dental practice SBA underwriting is among the most favorable in the SBA portfolio. The combination of recurring-care patient bases, strong collections, insurance-paid procedure revenue, and limited supply-side expansion creates predictable cash flow that lenders can underwrite with confidence. The 0.27% charge-off rate &mdash; roughly one-fifth the SBA average &mdash; reflects this structural stability.</p>
            <h3>Practice acquisition dominates</h3>
            <p>The large majority of dental SBA deals fund practice acquisitions, not new practice startups. A typical deal: <strong>associate dentist buying the practice they&rsquo;ve been working at</strong>, or buying a retiring dentist&rsquo;s practice in the same geographic area. The associate-to-owner transition is a well-worn path that specialist lenders close routinely. Average SBA 7(a) loan to a dental practice is approximately $910,000 &mdash; the highest of any major SBA industry category, reflecting the capital cost of acquiring an established practice with equipment, lease, and goodwill.</p>
            <h3>Collections and payer mix</h3>
            <p>Lenders want to see <strong>12-month collections history</strong>, the split between fee-for-service and insurance-paid revenue, and any meaningful concentration with specific payers. A practice with balanced insurance participation and strong fee-for-service underwrites better than a practice heavily dependent on one or two insurance contracts. Receivables aging, write-off rates, and the adjustment pattern on insurance claims all get lender scrutiny.</p>
            <h3>Professional entity structure</h3>
            <p>Dental practices usually operate as professional corporations (PC) or professional LLCs (PLLC), with state-specific rules about who can own shares. All 20%+ owners still provide personal guarantees on SBA loans regardless of entity type. If the buyer isn&rsquo;t a licensed dentist in the state, ownership structure has to comply with state practice-of-dentistry rules, which some lenders handle routinely and others don&rsquo;t.</p>
            <h3>Buildout and equipment financing</h3>
            <p>New practice buildouts run <strong>$300K to $800K</strong> depending on chair count, imaging equipment (digital X-ray, pan, CBCT), and finishes. Lenders expect itemized vendor quotes and typically require the buildout budget plus operating reserves for the first 6-12 months of patient ramp. Existing practice acquisitions often include a smaller equipment-refresh budget for replacing aging chairs or upgrading imaging.</p>
        `,
        indepTitle: 'The associate-to-owner transition',
        indep: `
            <p>Dental franchising is negligible at <strong>{franchise_pct}% of dental SBA loans</strong> &mdash; the industry is overwhelmingly independent. What dominates instead is the <strong>associate-to-owner transition pattern</strong>: a younger dentist buying the practice from the senior dentist they&rsquo;ve been working alongside. Lenders love these files because the buyer knows the patient base, the staff, the systems, and the practice economics before the loan closes. Transition risk is materially lower than in arm&rsquo;s-length acquisitions.</p>
            <p>The structural transaction typically combines three sources: SBA 7(a) for the bulk of the purchase price, seller financing (often 5-15% on standby terms) to bridge the equity and align incentives, and the buyer&rsquo;s cash equity injection. The seller typically stays on for a transition period (6-24 months) to hand off patient relationships, which lenders view as a positive signal.</p>
            <p>Specialist lenders &mdash; Live Oak Banking leads the count &mdash; build their entire dental practice lending program around this pattern. Generalist banks sometimes miss the nuance and either over-scrutinize the file or under-price the risk. Match to a specialist.</p>
        `,
        failureTitle: 'Why dental practices outperform on SBA charge-off',
        failure: `
            <p>Dental practice charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio. Only veterinary practices outperform this number. Three reasons drive the structural advantage:</p>
            <p><strong>Recurring-care patient base.</strong> Dental care is a multi-decade recurring relationship. Patient acquisition is expensive but retention is remarkably sticky &mdash; well-run practices see 80%+ annual retention, and collections on returning patients underwrite like an annuity. Lenders can forecast post-acquisition cash flow with unusual confidence.</p>
            <p><strong>Limited supply side.</strong> Dental school graduations are capped by accreditation capacity. Competitive pressure on existing practices is modest compared to most service industries, and practices in established areas tend to hold patient volume through economic cycles.</p>
            <p><strong>Insurance-paid procedure revenue.</strong> A meaningful share of practice revenue comes through insurance (preventive care, major procedures), which cushions against discretionary spending downturns that affect pure cash-pay businesses.</p>
            <p>The implication for borrowers: lenders experienced with dental practice files aren&rsquo;t doing borrowers a favor when they approve a loan &mdash; they&rsquo;re underwriting a structurally favorable asset. Specialist lenders compete for dental deals and that compensation usually shows up as better pricing and faster closing, not as a harder underwriting review.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?", opts:[
                {v:"associate-buying", l:"Associate buying my current practice"},
                {v:"acquisition", l:"Buying an established practice (not currently at)"},
                {v:"new-practice", l:"Starting a new practice from scratch"},
                {v:"expansion", l:"Expanding my existing practice"},
                {v:"equipment", l:"Equipment or technology upgrade"},
            ]},
            {q:"Primary use?", opts:[
                {v:"purchase-price", l:"Practice purchase price"},
                {v:"buildout", l:"Buildout / tenant improvements"},
                {v:"equipment-use", l:"Equipment (chairs, imaging, CAD/CAM)"},
                {v:"real-estate", l:"Commercial real estate purchase"},
                {v:"multiple", l:"Multiple combined uses"},
            ]},
            {q:"Licensure and experience?", opts:[
                {v:"licensed-experienced", l:"Licensed dentist, 5+ years practicing"},
                {v:"licensed-new", l:"Licensed dentist, under 5 years"},
                {v:"licensed-specialist", l:"Specialist (ortho, OMFS, pediatric, etc.)"},
                {v:"non-dentist", l:"Non-dentist buyer (structure requires licensed operator)"},
            ]},
            {q:"Personal credit score?", opts:[
                {v:"below-680", l:"Below 680"},
                {v:"680-719", l:"680-719"},
                {v:"720-759", l:"720-759"},
                {v:"760-plus", l:"760+"},
            ]},
            {q:"Loan amount needed?", opts:[
                {v:"under-500k", l:"Under $500K"},
                {v:"500k-1m", l:"$500K - $1M"},
                {v:"1m-2m", l:"$1M - $2M"},
                {v:"2m-plus", l:"$2M+"},
            ]},
            {q:"Real estate included in deal?", opts:[
                {v:"yes", l:"Yes"},
                {v:"lease", l:"No, lease arrangement"},
                {v:"unsure", l:"Not decided"},
            ]},
        ],
        profiles: {
            A: {badge:"Associate-to-owner sweet spot",headline:"This is the file dental SBA lenders compete for",body:"Licensed dentist buying the practice you've been working at — the lowest-risk dental SBA file type and the one specialist lenders like Live Oak, Bank of America, and Huntington build their entire dental practice programs around. Expect favorable pricing and 45-75 days to close. The key variable is choosing the dental-specialist lender that matches your specialty and deal size.",ctaLabel:"Match with dental-practice-experienced SBA lenders",utmContent:"profile-a-associate"},
            B: {badge:"Practice acquisition path",headline:"Strong SBA candidate with specialist lender",body:"Buying an established practice you're not currently associated with is a standard dental SBA deal. The file is fundable but lender choice matters — dental SBA is a specialist segment and specialist lenders price and close materially better than generalist banks. Plan 60-90 days and budget for a transition period with the selling dentist.",ctaLabel:"Match with dental practice SBA specialists",utmContent:"profile-b-acquisition"},
            C: {badge:"New practice / buildout path",headline:"New practice startup needs unusually strong file",body:"Starting a new practice from scratch is the hardest dental SBA file. Specialist lenders do fund new-practice buildouts, but they want itemized vendor quotes, detailed patient-ramp projections, and 6-12 months of operating reserves on top of the buildout budget. Expect higher equity injection (15-25%) than an acquisition would require.",ctaLabel:"Match with new-practice SBA specialists",utmContent:"profile-c-new-practice"},
            D: {badge:"Real estate + practice",headline:"504 for the building, 7(a) for the practice",body:"When the deal includes buying the building, SBA 504 on the real estate portion at fixed long-term rates plus 7(a) on the practice is the dominant structure. 504 handles the real estate underwriting; 7(a) handles the practice cash flow. Combined closings run 75-120 days but often beat conventional financing on both pieces.",ctaLabel:"Match with 504 + 7(a) dental practice lenders",utmContent:"profile-d-real-estate"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],lic=a[2],credit=a[3],amount=a[4],re=a[5];if(re==='yes'||use==='real-estate')return 'D';if(sit==='new-practice'||use==='buildout')return 'C';if(sit==='associate-buying'&&(lic==='licensed-experienced'||lic==='licensed-specialist'))return 'A';if(sit==='acquisition'&&(credit==='720-759'||credit==='760-plus'))return 'B';return 'B';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan to buy a dental practice?",a:"Yes. Practice acquisitions are the dominant SBA 7(a) use case for dentists. Loans can cover the practice purchase price (goodwill, patient list, equipment), real estate if included, and working capital for the transition period. Minimum 10% equity injection required; specialist dental SBA lenders typically want 10-15% with up to 5% of that from seller financing on full standby. Average dental SBA loan FY2020-2025 was approximately $910,000."},
        {q:"How much can I borrow with an SBA loan for a dental practice?",a:"SBA 7(a) Standard goes up to $5 million. With SBA 504 for real estate, combined project size can reach $15M+ on larger deals with bank participation. Most single-practice acquisitions without real estate fall in the $600K to $2M range; acquisitions with real estate or multi-location practices commonly run $1.5M to $5M. Specialty practices (orthodontics, oral surgery) tend toward the higher end given equipment intensity."},
        {q:"Do I need to be a licensed dentist to buy a practice with an SBA loan?",a:"In most states yes, due to state practice-of-dentistry rules that restrict practice ownership to licensed professionals. Some states allow non-dentist ownership through specific corporate structures (DSO models). The SBA itself doesn't impose a licensure requirement, but lenders underwrite to the state rules that will apply to the practice. If the buyer isn't licensed in the state, the deal needs a licensed operating dentist and a structure that complies with state practice-of-dentistry law."},
        {q:"What credit score do I need for a dental practice SBA loan?",a:"Dental specialist lenders typically want 680 or higher, with 720+ getting the best pricing. The bar is slightly softer than restaurant 7(a) because the underlying industry performance is so strong — dental charge-offs run at 0.27%, roughly one-fifth the SBA average. That said, dental practices are high-dollar acquisitions ($910K average) and lenders are appropriately careful on credit and cash flow."},
        {q:"What's the SBA charge-off rate for dental practices?",a:"Dental practice SBA 7(a) charge-offs run at 0.27%, compared to the all-industry SBA average of 1.36% — roughly one-fifth the average. Only veterinary practices outperform this number. The favorable charge-off profile reflects recurring-care patient retention, limited supply-side expansion, insurance-paid revenue stability, and the prevalence of associate-to-owner transitions that reduce acquisition risk."},
        {q:"How does seller financing work on a dental practice SBA deal?",a:"Sellers frequently carry 5% to 15% of the purchase price on a seller note. Up to 5% of that seller note, on full-standby terms (no principal or interest payments for two years), counts toward the buyer's 10% SBA equity injection. This allows a buyer with 5% cash to effectively close the deal when the seller is cooperative. Selling dentists often accept this structure because it aligns incentives during the transition period and keeps them motivated to help the buyer succeed."},
        {q:"Can I finance dental equipment (CAD/CAM, imaging) through an SBA loan?",a:"Yes. SBA 7(a) covers specialized dental equipment either as part of a larger acquisition package or as a standalone equipment loan via SBA 7(a) Small Loan (up to $500K). Equipment with rapid obsolescence like CAD/CAM mills or digital imaging sometimes makes more sense on equipment financing rather than SBA because the equipment itself serves as collateral and closes faster. For single-piece upgrades on established practices, equipment financing often beats SBA on speed."},
    ],
},

'621111': {
    slug: 'physicians',
    heroPhoto: {
        src: 'https://images.pexels.com/photos/8459996/pexels-photo-8459996.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Modern medical clinic waiting room with contemporary seating and clean professional decor, representative of physician practice interiors funded through SBA 7(a) loans',
        width: 1200,
        height: 800,
        photographer: 'Los Muertos Crew',
        photographerUrl: 'https://www.pexels.com/@cristian-rojas/',
        sourceUrl: 'https://www.pexels.com/photo/8459996/',
        sourceName: 'Pexels',
    },
    programsContext: {
        fits: {
            standard: "practice acquisitions (the dominant use), buildouts, partnership buy-in under the May 2023 partial-purchase rule.",
            '504': "buying the practice real estate. Fixed long-term rates.",
            small: "equipment upgrades, technology investments, working capital under $500K.",
            equipment: "medical equipment with shorter lifecycle. Faster than SBA and often better rate/term match to equipment lifecycle.",
        },
    },
    industryNoun: 'physician practice',
    industryNounPossessive: "physician practice's",
    // heroPhoto: null — no hero photo; available Pexels options were all patient-clinical cliches or MRI-specialty specific; skipping rather than settling
    highlightLenderNames: [],
    h1: 'SBA Loans for Physician Practices',
    title: 'SBA Loan for Physician Practice 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) and 504 loans for physician practice acquisitions, buildouts, and equipment. 3,986 physician practice SBA loans approved FY2020-2025, 0.68% charge-off rate — half the SBA average.',
    breadcrumbName: 'SBA Loans for Physician Practices',
    campaignSlug: 'sba-physicians-quiz',
    heroSub: 'Physician practice SBA loans have a <strong>0.68% charge-off rate</strong>, half the SBA average. Practice acquisition dominates the use cases, with specialty type and hospital-affiliation status materially affecting underwriting.',
    heroValue: 'Answer 6 questions. Get matched with physician-practice-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps physicians and physician-practice buyers compare SBA 7(a) and 504 options and get matched with specialist lenders experienced in medical practice acquisition underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate physician practice files',
        underwriting: `
            <p>Physician practice SBA underwriting sits between general medical and dental practice profiles. The 0.68% charge-off rate is half the SBA average but meaningfully higher than dental (0.27%) or veterinary (0.18%) &mdash; reflecting more specialty variance, greater reimbursement complexity, and more hospital-affiliation dynamics than the pure-independent professional practice categories.</p>
            <h3>Specialty type shifts underwriting</h3>
            <p>Primary care, specialty practices (cardiology, orthopedics, dermatology, etc.), and surgical practices underwrite differently. <strong>Primary care</strong> practices have predictable visit volumes and steady cash flow but thinner margins. <strong>Procedural specialties</strong> (dermatology with cosmetic, orthopedics with surgery) have higher margins but more revenue concentration in specific procedures and insurance contracts. Lenders want to see at least three years of financials and a clear picture of the revenue mix.</p>
            <h3>Payer mix and reimbursement</h3>
            <p>Commercial insurance, Medicare, Medicaid, and self-pay each have different collection economics. <strong>Medicare-heavy practices</strong> have predictable rates but narrow margins. <strong>Commercial-heavy practices</strong> have stronger margins but are exposed to payer contract renegotiations. Lenders look at payer concentration &mdash; a practice with 40%+ of revenue from one insurance carrier faces meaningful contract risk that underwriting has to address.</p>
            <h3>Hospital-affiliated vs. independent</h3>
            <p>Physicians affiliated with a hospital system through admitting privileges or employed-physician arrangements underwrite differently than pure independents. Hospital affiliation can stabilize referral patterns but also creates non-compete exposure if the physician leaves the system. Independent practices take on all patient acquisition but keep full revenue control. Both paths close with the right SBA lender &mdash; it&rsquo;s a conversation about the specific transition, not a gate.</p>
            <h3>Non-compete clauses in acquisition deals</h3>
            <p>Physician practice acquisitions almost always include a non-compete agreement with the selling physician to prevent the seller from re-entering the local market. SBA lenders want to see non-competes with reasonable geographic and duration scope &mdash; state rules vary, and overly broad non-competes can be unenforceable, which degrades the transition value the lender is funding.</p>
        `,
        indepTitle: 'Practice acquisition, specialty differences, and transition structure',
        indep: `
            <p>Franchise arrangements are rare in physician practices &mdash; the <strong>{franchise_pct}% franchise rate</strong> reflects a handful of retail-health and urgent-care franchise concepts. The vast majority of physician practice SBA loans fund independent practice acquisitions or partnership buy-ins. Typical structure: younger physician buying into or fully acquiring the practice from a retiring or transitioning senior physician.</p>
            <p>Partnership buy-ins (buying into a multi-physician practice) are common and handled through SBA 7(a) when the buy-in amount is sufficient. The SBA&rsquo;s May 2023 rule update clarified that partial business purchases &mdash; buying into rather than fully acquiring an existing business &mdash; qualify for 7(a) financing. This meaningfully expanded the available structures for physician practice transitions.</p>
            <p>Specialty type affects lender enthusiasm. <strong>High-margin procedural specialties</strong> (dermatology with cosmetic, ophthalmology with refractive surgery, orthopedics) tend to attract more lender competition and better pricing. <strong>Primary care and pediatrics</strong> are more rate-sensitive and lender choice matters more given thinner margins.</p>
        `,
        failureTitle: 'Why physician practices outperform on SBA charge-off',
        failure: `
            <p>Physician practice charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio. The favorable performance reflects the same structural features as dental: <strong>recurring patient relationships</strong>, <strong>licensed-professional barriers to entry</strong>, and <strong>insurance-paid revenue stability</strong>. Physicians see slightly more variance than dentists because of specialty mix and reimbursement complexity, but the industry category still outperforms the SBA portfolio average meaningfully.</p>
            <p>What predicts the failure cases: <strong>payer concentration</strong> (one carrier representing 40%+ of revenue), <strong>misjudged post-acquisition physician departures</strong> (key associate leaves, taking patient base), and <strong>misjudged non-competes</strong> (seller physician re-enters the market). Lenders who specialize in physician practice deals underwrite specifically around these risks, which is why specialist lender match matters even in an industry with favorable aggregate performance.</p>
            <p>The +11% YoY growth in SBA lending to physician practices reflects the same transition cycle as dentistry: older physicians selling to younger physicians, with corporate consolidators (PE-backed medical groups, health-system acquirers) competing for the same deals and pushing valuations up. SBA 7(a) is the dominant path for individual physician buyers competing against corporate bidders.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?", opts:[
                {v:"associate-buying", l:"Associate buying my current practice"},
                {v:"acquisition", l:"Buying an established practice"},
                {v:"partnership", l:"Partnership buy-in"},
                {v:"new-practice", l:"Starting a new practice"},
                {v:"expansion", l:"Expanding existing practice"},
            ]},
            {q:"Primary use?", opts:[
                {v:"purchase-price", l:"Practice purchase price"},
                {v:"buildout", l:"Buildout / tenant improvements"},
                {v:"equipment-use", l:"Medical equipment and imaging"},
                {v:"real-estate", l:"Commercial real estate purchase"},
                {v:"multiple", l:"Multiple combined uses"},
            ]},
            {q:"Specialty type?", opts:[
                {v:"primary-care", l:"Primary care / family medicine / internal medicine"},
                {v:"procedural-specialty", l:"Procedural specialty (derm, ortho, ophth, etc.)"},
                {v:"surgical", l:"Surgical specialty"},
                {v:"pediatrics", l:"Pediatrics"},
                {v:"other", l:"Other specialty"},
            ]},
            {q:"Personal credit score?", opts:[
                {v:"below-680", l:"Below 680"},
                {v:"680-719", l:"680-719"},
                {v:"720-759", l:"720-759"},
                {v:"760-plus", l:"760+"},
            ]},
            {q:"Loan amount needed?", opts:[
                {v:"under-500k", l:"Under $500K"},
                {v:"500k-1m", l:"$500K - $1M"},
                {v:"1m-2m", l:"$1M - $2M"},
                {v:"2m-plus", l:"$2M+"},
            ]},
            {q:"Hospital affiliation?", opts:[
                {v:"affiliated", l:"Hospital-affiliated with admitting privileges"},
                {v:"independent", l:"Pure independent practice"},
                {v:"employed-transitioning", l:"Currently employed, transitioning to ownership"},
            ]},
        ],
        profiles: {
            A: {badge:"Associate-to-owner acquisition",headline:"Buying the practice you work at is the strongest file",body:"Associate physician buying the practice you're already part of is the lowest-risk physician SBA file. Specialist lenders compete for these deals. You know the payer mix, patient base, staff, and local dynamics before the loan closes — transition risk is materially lower than arm's-length acquisitions. Expect 60-90 days to close with a physician-practice-experienced lender.",ctaLabel:"Match with physician-practice-experienced SBA lenders",utmContent:"profile-a-associate"},
            B: {badge:"Specialty practice acquisition",headline:"Procedural specialty practices attract competitive pricing",body:"High-margin procedural specialties — dermatology, orthopedics, ophthalmology — attract more lender competition because the underlying economics are strong. The key variable is matching with a lender experienced with your specific specialty; an orthopedic file underwrites differently than a dermatology file. Plan 60-90 days for acquisition closings.",ctaLabel:"Match with specialty-practice SBA lenders",utmContent:"profile-b-specialty"},
            C: {badge:"Partnership buy-in",headline:"Partial-purchase SBA 7(a) is the path",body:"The SBA's May 2023 rule update clarified that partnership buy-ins qualify for 7(a) financing. The mechanics differ from full acquisitions — lender underwrites the practice's ongoing cash flow plus the specific partner's pro-rata share — but the program is well-established. Specialist lenders handle these routinely. Expect 60-90 days to close.",ctaLabel:"Match with partnership buy-in SBA specialists",utmContent:"profile-c-buy-in"},
            D: {badge:"New practice / buildout",headline:"New independent practice needs strong file",body:"Starting a new physician practice from scratch is the hardest physician SBA file — ramp to steady-state patient volume can take 18-36 months and lenders want reserves sized for that runway. Not impossible, but expect higher equity injection (15-25%), itemized vendor quotes, and a defensible patient-acquisition plan. Partnership with an existing practice often beats pure startup on SBA economics.",ctaLabel:"Get honest feedback from a physician SBA specialist",utmContent:"profile-d-new-practice"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],spec=a[2],credit=a[3],amount=a[4],hosp=a[5];if(sit==='new-practice')return 'D';if(sit==='partnership')return 'C';if((spec==='procedural-specialty'||spec==='surgical')&&(credit==='720-759'||credit==='760-plus'))return 'B';if(sit==='associate-buying')return 'A';return 'B';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan to buy a physician practice?",a:"Yes. Physician practice acquisitions are a primary SBA 7(a) use case. The loan can cover the practice purchase price, real estate if included, buildout or renovation, medical equipment, and working capital for the transition period. Since the SBA's May 2023 rule update, partial business purchases (partnership buy-ins) also qualify for 7(a) financing."},
        {q:"How much can I borrow with an SBA loan for a physician practice?",a:"SBA 7(a) Standard goes up to $5 million. With SBA 504 for real estate, combined project size can reach higher. Average physician practice SBA 7(a) loan FY2020-2025 was approximately $602,000. Primary care practices often fall in the $400K to $1M range; procedural and surgical specialties commonly run $1M to $3M."},
        {q:"How does specialty type affect SBA underwriting?",a:"Specialty type materially shifts lender approach. High-margin procedural specialties (dermatology, orthopedics, ophthalmology with refractive) attract more lender competition and better pricing because the underlying margins support stronger debt service coverage. Primary care and pediatrics are more rate-sensitive; lender choice matters more given thinner margins. Surgical specialties require lenders comfortable with equipment-heavy balance sheets and often hospital-affiliation dynamics."},
        {q:"Do I need to be hospital-affiliated to qualify?",a:"No. Pure independent practices qualify for SBA financing on the same terms as hospital-affiliated practices. Hospital affiliation can stabilize referral patterns and patient acquisition, which lenders view positively, but it also creates non-compete exposure if the physician leaves the system. Independent practices take full control of revenue but take all the patient acquisition risk. Both paths close with an experienced physician SBA lender."},
        {q:"What credit score do I need for a physician practice SBA loan?",a:"Specialist physician lenders typically want 680 or higher, with 720+ getting better pricing. The underlying industry charge-off rate (0.68%) is half the SBA average, so the credit bar is slightly more flexible than restaurant 7(a). High-income physicians with clean credit can often negotiate rate competitively given the industry's favorable risk profile."},
        {q:"Can I finance a partnership buy-in with SBA?",a:"Yes, since the SBA's May 2023 rule update clarified that partial business purchases qualify for 7(a) financing. The underwriting differs from full acquisitions — the lender evaluates both the practice's ongoing cash flow and the specific partner's pro-rata share — but the program is well-established. Buy-in amounts are typically structured as 10-49% equity purchases with the existing partners retaining controlling interest."},
        {q:"What's the SBA charge-off rate for physician practices?",a:"Physician practice SBA 7(a) charge-offs run at 0.68%, half the all-industry SBA average of 1.36%. The favorable performance reflects recurring patient relationships, insurance-paid revenue stability, and licensed-professional barriers to entry. Physician practices perform less well than dental (0.27%) or veterinary (0.18%) because of greater specialty variance, reimbursement complexity, and occasional key-physician-departure risk post-acquisition."},
    ],
},

'541940': {
    slug: 'veterinarians',
    programsContext: {
        fits: {
            standard: "practice acquisitions (the dominant use), clinic buildouts, multi-location expansion.",
            '504': "buying the clinic building. Fixed long-term rates. Particularly valuable in veterinary given recession-resistant demand.",
            small: "equipment upgrades, mobile vet unit buildout, working capital under $500K.",
            equipment: "imaging, surgical equipment, diagnostic tools. Faster than SBA when equipment lifecycle is shorter than SBA amortization.",
        },
    },
    industryNoun: 'veterinary practice',
    industryNounPossessive: "veterinary practice's",
    heroPhoto: {
        src: 'https://images.pexels.com/photos/6235232/pexels-photo-6235232.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Veterinarian using diagnostic medical equipment on a patient — representative of the clinical veterinary practices that make up SBA\u2019s best-performing lending category',
        width: 1200,
        height: 800,
        photographer: 'Tima Miroshnichenko',
        photographerUrl: 'https://www.pexels.com/@tima-miroshnichenko/',
        sourceUrl: 'https://www.pexels.com/photo/6235232/',
        sourceName: 'Pexels',
    },
    highlightLenderNames: ['Live Oak Banking Company'],
    h1: 'SBA Loans for Veterinary Practices',
    title: 'SBA Loan for Veterinary Practice 2026 | My Money Marketplace',
    metaDesc: 'SBA loans for veterinary practices have the LOWEST charge-off rate of any SBA industry category: 0.18%, one-seventh the SBA average. 1,636 veterinary SBA loans approved FY2020-2025. Take the 2-minute quiz.',
    breadcrumbName: 'SBA Loans for Veterinary Practices',
    campaignSlug: 'sba-veterinarians-quiz',
    heroSub: 'Veterinary practice SBA loans are the <strong>best-performing industry category in the SBA portfolio</strong> &mdash; a 0.18% charge-off rate (one-seventh the SBA average), a +40% YoY growth rate, and the highest average loan size of any major category at $1.2M. Practice acquisition dominates the use cases.',
    heroValue: 'Answer 6 questions. Get matched with veterinary-practice-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps veterinarians and veterinary-practice buyers compare SBA 7(a) and 504 options and get matched with specialist lenders experienced in veterinary practice acquisition underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'Why veterinary practices are SBA\u2019s best-performing category',
        underwriting: `
            <p>Veterinary practice SBA lending has the <strong>lowest charge-off rate of any major industry category</strong> in the SBA 7(a) portfolio: 0.18%, compared to 1.36% across all industries. One failed loan per 550 funded. The underlying dynamics explain why lenders treat veterinary files as among the most attractive SBA deals they can write.</p>
            <h3>Recession-resistant demand</h3>
            <p>Pet ownership and spending on pet health have grown through every recession of the past three decades. <strong>The human-animal bond is non-discretionary</strong> in a way that few consumer categories are. Pet parents defer their own medical care before they defer their dog&rsquo;s. Lenders see this in the data: veterinary practice revenue held up through the 2008 recession, the 2020 pandemic, and the 2022-2023 inflation spike with remarkable stability.</p>
            <h3>Constrained supply side</h3>
            <p>Veterinary school graduations are capped by accreditation &mdash; there are roughly 30 accredited U.S. veterinary colleges graduating approximately 3,500 new veterinarians annually. Demand for veterinary services has grown faster than supply for over a decade, leaving existing practices with strong patient bases, limited competition, and pricing power. New practice formation doesn&rsquo;t materially threaten incumbent practices the way it does in more crowded professional categories.</p>
            <h3>Corporate consolidation competing for practices</h3>
            <p>The +40% YoY growth in veterinary SBA lending reflects a real market dynamic: <strong>corporate veterinary consolidators</strong> &mdash; Mars-owned VCA and Banfield, IVC Evidensia, NVA, and several PE-backed buyers &mdash; are actively acquiring independent practices at elevated multiples. This has two effects on SBA lending. First, valuations have climbed, pushing typical deal sizes higher (average veterinary SBA loan is $1.2M, highest of any major category). Second, individual veterinarians buying practices from retiring owners compete with corporate bidders, and SBA 7(a) is the dominant individual-buyer financing path.</p>
        `,
        indepTitle: 'Animal hospital vs. mobile vet vs. specialty practice',
        indep: `
            <p>Franchise arrangements are rare in veterinary medicine at <strong>{franchise_pct}% of veterinary SBA loans</strong> &mdash; this is an overwhelmingly independent industry with strong corporate-consolidator activity. The dominant SBA loan types differ by practice format:</p>
            <p><strong>Small-animal general practices</strong> make up the bulk of SBA deals. Standard acquisition structure: buyer-veterinarian purchases the practice from a retiring owner, often with a 6-24 month transition period where the seller stays on to hand off patient relationships. SBA 7(a) funds the purchase price, buildout or equipment refresh, and working capital.</p>
            <p><strong>Specialty practices</strong> (emergency, internal medicine, oncology, surgery, ophthalmology) have higher capital intensity &mdash; CT, MRI, advanced surgical suites &mdash; and commonly require the highest-dollar SBA veterinary loans. Specialty referral practices also have more concentrated referral relationships with general-practice veterinarians, which lenders evaluate carefully.</p>
            <p><strong>Mobile and housecall practices</strong> have lower capital intensity and typically need smaller SBA loans for vehicle-mounted equipment and mobile-unit buildout. SBA 7(a) Small Loan (up to $500K) is often the right fit. <strong>Equine and large-animal practices</strong> are rarer in the data but underwrite similarly to small-animal specialty practices with additional vehicle and equipment considerations.</p>
        `,
        failureTitle: 'The 0.18% charge-off rate and what it means for borrowers',
        failure: `
            <p>Veterinary practice charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio. This is the <em>lowest charge-off rate of any major industry category in the SBA 7(a) portfolio</em>. Combined with the +40% YoY growth and the highest-in-category average loan size, veterinary practices represent one of the most attractive lending opportunities in the SBA universe.</p>
            <p>The practical implication for borrowers: specialist veterinary lenders actively compete for deals. Live Oak Banking leads the category by loan count, with several other banks (including bank-of-america-scale institutions) running dedicated veterinary practice lending programs. Matching to a specialist lender is less about gatekeeping and more about getting competitive pricing and fast closing. Generalist banks sometimes under-price these deals because they don&rsquo;t recognize the category&rsquo;s performance, but they also sometimes add unnecessary friction that a specialist wouldn&rsquo;t.</p>
            <p>What predicts the rare failures: <strong>inexperienced operators buying solo without a practice handoff</strong>, <strong>practices with heavy client concentration around the departing owner</strong> (clients leave when the selling vet does), and <strong>geographic markets where corporate consolidators have built reputational competitive advantages</strong>. Specialist lenders underwrite specifically around these risks.</p>
            <p>For adjacent businesses: see our <a class="inline" href="/sba-loans/pet-care">SBA pet care guide</a> for boarding, grooming, daycare, and training operations &mdash; related to veterinary but with distinct underwriting (no veterinary licensure required, different facility patterns, higher franchise concentration).</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?", opts:[
                {v:"associate-buying", l:"Associate buying my current practice"},
                {v:"acquisition", l:"Buying an established practice"},
                {v:"partnership", l:"Partnership buy-in"},
                {v:"new-practice", l:"Starting a new practice"},
                {v:"mobile-expansion", l:"Mobile practice or expansion"},
            ]},
            {q:"Primary use?", opts:[
                {v:"purchase-price", l:"Practice purchase price"},
                {v:"buildout", l:"Buildout / expansion"},
                {v:"equipment-use", l:"Equipment (imaging, surgical, lab)"},
                {v:"real-estate", l:"Commercial real estate purchase"},
                {v:"multiple", l:"Multiple combined uses"},
            ]},
            {q:"Practice type?", opts:[
                {v:"small-animal-general", l:"Small-animal general practice"},
                {v:"specialty", l:"Specialty practice (emergency, surgery, internal med, etc.)"},
                {v:"mobile", l:"Mobile or housecall practice"},
                {v:"equine-large", l:"Equine or large-animal practice"},
                {v:"mixed", l:"Mixed animal practice"},
            ]},
            {q:"Personal credit score?", opts:[
                {v:"below-680", l:"Below 680"},
                {v:"680-719", l:"680-719"},
                {v:"720-759", l:"720-759"},
                {v:"760-plus", l:"760+"},
            ]},
            {q:"Loan amount needed?", opts:[
                {v:"under-500k", l:"Under $500K"},
                {v:"500k-1m", l:"$500K - $1M"},
                {v:"1m-2m", l:"$1M - $2M"},
                {v:"2m-plus", l:"$2M+"},
            ]},
            {q:"Real estate included?", opts:[
                {v:"yes", l:"Yes"},
                {v:"lease", l:"No, lease arrangement"},
                {v:"unsure", l:"Not decided"},
            ]},
        ],
        profiles: {
            A: {badge:"Associate-to-owner sweet spot",headline:"Associate buying the practice you work at — the strongest file in veterinary SBA",body:"Licensed veterinarian buying the practice you're already part of. Veterinary SBA is the best-performing industry category in the SBA portfolio (0.18% charge-off rate), and associate-to-owner deals are the lowest-risk sub-category. Specialist lenders compete for these deals with competitive pricing and 45-75 day closes.",ctaLabel:"Match with veterinary-experienced SBA lenders",utmContent:"profile-a-associate"},
            B: {badge:"Specialty practice acquisition",headline:"Specialty practice deals attract the most lender interest",body:"Specialty veterinary practices — emergency, surgery, internal medicine, oncology — have the highest capital intensity and the strongest underwriting profiles. Specialist lenders treat these deals as prime files. Plan 60-90 days to close; equipment appraisals and referral-relationship review can add a few weeks.",ctaLabel:"Match with specialty-vet SBA lenders",utmContent:"profile-b-specialty"},
            C: {badge:"Real estate + practice",headline:"504 for the building, 7(a) for the practice",body:"Combined real estate + practice acquisition uses SBA 504 on the real estate portion at fixed long-term rates plus 7(a) on the operating business. Given the veterinary industry's recession-resistant demand, owning the site is particularly valuable — practices don't move well. Combined closings run 75-120 days.",ctaLabel:"Match with 504 + 7(a) veterinary lenders",utmContent:"profile-c-real-estate"},
            D: {badge:"New practice path",headline:"New veterinary practice: possible, with the right file",body:"New practice startups are the hardest veterinary SBA file even in a strong industry. Lenders want a licensed operating veterinarian, itemized vendor quotes, a defensible patient-acquisition plan, and reserves sized for 12-18 months of ramp. Partnership with an existing practice often beats pure startup on SBA economics. Expect 15-25% equity injection rather than the 10% minimum.",ctaLabel:"Get honest feedback from a veterinary SBA specialist",utmContent:"profile-d-new-practice"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],type=a[2],credit=a[3],amount=a[4],re=a[5];if(sit==='new-practice')return 'D';if(re==='yes'||use==='real-estate')return 'C';if(type==='specialty')return 'B';if(sit==='associate-buying')return 'A';return 'B';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan to buy a veterinary practice?",a:"Yes. Veterinary practice acquisitions are a primary SBA 7(a) use case, and veterinary practices have the lowest charge-off rate of any major industry category in the SBA portfolio (0.18%). Specialist lenders actively compete for these deals. The loan can cover practice purchase price, real estate if included, equipment upgrades, and working capital. Average veterinary SBA loan FY2020-2025 was approximately $1.2 million."},
        {q:"Why are veterinary practice SBA loans performing so well?",a:"Three structural features drive the performance. Pet ownership and spending are recession-resistant — revenue holds up through economic cycles because the human-animal bond is non-discretionary. Veterinary school graduations are supply-constrained by accreditation capacity, limiting competitive pressure on existing practices. And corporate consolidators (Mars-owned VCA and Banfield, IVC, NVA, PE-backed buyers) are actively acquiring practices at elevated valuations, which supports strong exit markets for SBA-funded operators."},
        {q:"How much can I borrow with an SBA loan for a veterinary practice?",a:"SBA 7(a) Standard goes up to $5 million. With SBA 504 for real estate, combined project size can reach higher. Average veterinary SBA 7(a) loan is approximately $1.2 million — the highest average of any major SBA industry category. Specialty practices (emergency, surgery) commonly run $1.5M to $4M; general practices typically fall in the $500K to $2M range. Mobile and housecall practices are usually smaller, often under $500K."},
        {q:"What's the SBA charge-off rate for veterinary practices?",a:"Veterinary practice SBA 7(a) charge-offs run at 0.18%, compared to the all-industry SBA average of 1.36%. This is the lowest rate of any major industry category in the SBA portfolio — one failed loan per 550 funded. The favorable profile reflects recession-resistant demand, constrained supply side through accreditation, and strong exit markets from corporate consolidator activity."},
        {q:"Do I need to be a licensed veterinarian to buy a practice?",a:"In most states yes, due to state veterinary-practice-act rules that restrict practice ownership to licensed veterinarians. State rules vary, with some states allowing non-veterinarian ownership through specific corporate structures. The SBA itself doesn't impose a licensure requirement, but lenders underwrite to applicable state rules. If the buyer isn't licensed in the state, the deal needs a licensed operating veterinarian and a compliant ownership structure."},
        {q:"Are corporate veterinary buyers good or bad for individual practice buyers?",a:"Both. Corporate buyers (Mars, IVC, NVA, PE-backed groups) compete with individual veterinarians for the same practices, pushing valuations up — meaning individual buyers pay more but selling practices sell faster. SBA 7(a) is the dominant individual-buyer financing path, and specialist SBA lenders actively structure deals to compete with corporate all-cash bids. Individual owners often offer sellers a legacy-preservation value that corporates can't, which sellers sometimes weigh against the all-cash corporate bid."},
        {q:"Can I finance veterinary equipment (digital X-ray, ultrasound, surgical) through SBA?",a:"Yes. SBA 7(a) covers specialized veterinary equipment either as part of a larger acquisition package or as a standalone equipment loan via SBA 7(a) Small Loan (up to $500K). For standalone equipment purchases on established practices, equipment financing (non-SBA) sometimes beats SBA on speed (3-10 days vs. 45-75 days for SBA) at a higher rate. The right choice depends on deal size and timeline pressure."},
    ],
},

'524210': {
    slug: 'insurance-agencies',
    programsContext: {
        fits: {
            standard: "book-of-business acquisitions (the dominant use), partner buyouts, multi-agency consolidation.",
            '504': "buying the office real estate. Fixed long-term rates &mdash; less common in this category given agencies are capital-light.",
            small: "technology investments, office buildout, smaller book acquisitions under $500K.",
            equipment: "rarely used; insurance agencies are intangible-asset businesses with minimal equipment needs.",
        },
    },
    industryNoun: 'insurance agency',
    industryNounPossessive: "insurance agency's",
    heroPhoto: {
        src: 'https://images.pexels.com/photos/8441774/pexels-photo-8441774.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Senior couple discussing contract with insurance consultant in a professional office — representative of the relationship-based book-of-business acquisitions funded through SBA financing',
        width: 1200,
        height: 800,
        photographer: 'Kampus Production',
        photographerUrl: 'https://www.pexels.com/@kampus/',
        sourceUrl: 'https://www.pexels.com/photo/8441774/',
        sourceName: 'Pexels',
    },
    highlightLenderNames: ['Live Oak Banking Company'],
    h1: 'SBA Loans for Insurance Agencies',
    title: 'SBA Loan for Insurance Agency 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for insurance agency book-of-business acquisitions. 4,249 insurance agency SBA loans approved FY2020-2025, +20% YoY growth. Residual-revenue underwriting. Take the 2-minute quiz.',
    breadcrumbName: 'SBA Loans for Insurance Agencies',
    campaignSlug: 'sba-insurance-agencies-quiz',
    heroSub: 'Insurance agency SBA loans are overwhelmingly <strong>book-of-business acquisitions</strong> &mdash; buying an established agency&rsquo;s existing customer list and renewing premiums. Underwriting runs on residual-revenue math, not traditional business cash flow. Here&rsquo;s how lenders actually structure these deals.',
    heroValue: 'Answer 6 questions. Get matched with insurance-agency-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps insurance agency buyers compare SBA 7(a) options and get matched with specialist lenders experienced in book-of-business acquisition underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate insurance agency book-of-business deals',
        underwriting: `
            <p>Insurance agency SBA lending is almost entirely <strong>acquisition financing</strong> &mdash; specifically, book-of-business acquisitions. An independent insurance agent or agency buys the customer list (the &ldquo;book&rdquo;), plus often goodwill, office assets, and an agreement from the seller not to compete. The underwriting looks almost nothing like general SBA 7(a) files because the asset being purchased is renewing commission revenue, not a traditional operating business.</p>
            <h3>Residual revenue as underwriting anchor</h3>
            <p>Insurance policies renew annually. A book of business generates <strong>renewal commissions</strong> in the 10% to 20% range on P&amp;C lines and higher on life/health renewals. Lenders underwrite to the projected renewal revenue stream, discounted for expected attrition (typically 5-15% annual client loss). The book valuation typically runs <strong>1.5x to 3x annual commissions</strong> depending on line mix, retention history, and carrier relationships. Larger books with stickier commercial lines command higher multiples.</p>
            <h3>Carrier relationships and appointments</h3>
            <p>Insurance agencies operate through <strong>carrier appointments</strong> &mdash; formal relationships with insurance companies that allow the agency to sell those carriers&rsquo; products. Not all appointments transfer automatically on a book sale. Lenders want to see which carrier appointments will transfer, which require carrier consent, and whether any key carriers might terminate the relationship post-sale. Non-transferring appointments can materially reduce the book&rsquo;s value.</p>
            <h3>Non-compete and non-solicit clauses</h3>
            <p>Insurance agency acquisitions live or die on non-compete and non-solicit enforcement. The buyer is paying for the seller&rsquo;s book, and the seller has every ability to call their old clients and rebuild elsewhere if not legally constrained. Lenders want non-competes with <strong>reasonable geographic scope, 3-5 year duration, and explicit non-solicit language</strong>. Overly broad non-competes that won&rsquo;t survive court review degrade the transition value the lender is funding.</p>
            <h3>Buyer agency experience</h3>
            <p>Lenders heavily weight the buyer&rsquo;s insurance agency experience. A 10-year agent buying their former agency&rsquo;s book underwrites better than a first-time operator buying the same book. Carrier appointments in the buyer&rsquo;s own name, an established producer track record, and demonstrated customer-service operations all reduce the perceived transition risk.</p>
        `,
        indepTitle: 'Book-of-business deal structure and pricing',
        indep: `
            <p>Franchise structures represent <strong>{franchise_pct}% of insurance agency SBA loans</strong> &mdash; a meaningful but minority share. Large franchised insurance models (Allstate captive agencies, State Farm, some independent franchise concepts) represent some of this volume, but most insurance SBA deals are independent-agency book-of-business purchases.</p>
            <p>Typical deal structure: buyer pays <strong>50-80% cash at close</strong> (SBA 7(a) funded) with the balance as <strong>earnout or seller note</strong> tied to retained revenue over 1-3 years. The earnout structure protects the buyer against worse-than-projected attrition; the seller stays motivated to help the buyer retain the book during the transition period. SBA lenders are comfortable with earnout structures when properly documented and subordinate to the SBA loan.</p>
            <p>Live Oak Banking leads the insurance agency SBA lending category by loan count, followed by several other lenders with dedicated book-of-business programs. Specialist lenders understand the residual-revenue underwriting, the carrier-appointment transfer mechanics, and the typical earnout structures. Generalist banks often decline insurance agency files entirely because the underwriting is unfamiliar, or price them punitively because they can&rsquo;t get comfortable with the renewal-revenue math. Specialist match is the biggest practical variable.</p>
        `,
        failureTitle: 'Residual revenue, +20% YoY growth, and charge-off performance',
        failure: `
            <p>Insurance agency SBA 7(a) charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio. Meaningfully better than average, driven by the underlying economics: renewing policies generate recurring commission revenue that&rsquo;s more predictable than most small-business cash flow. When loans do fail, it&rsquo;s usually because projected book retention materially underperformed &mdash; key customers left, a carrier pulled its appointment, or the seller violated the non-compete and recruited clients away.</p>
            <p>The +20% YoY growth in insurance agency SBA lending reflects a multi-year consolidation cycle. An aging independent-agent demographic is selling books to younger agents and to consolidating agencies. PE-backed and strategic-buyer consolidators (Hub International, Alera Group, Brown &amp; Brown, many others) are competing with individual-agent buyers for the same books, which pushes valuations up but also creates competitive alternatives for sellers. SBA 7(a) is the dominant financing path for individual-agent buyers competing against corporate bidders.</p>
            <p>For buyers evaluating a specific book: the standard diligence includes reviewing 3-5 years of commission reports, client retention history, any existing claims-related issues on the book, and the carrier appointment structure. SBA lenders use this information to model post-acquisition cash flow and size the loan against projected debt service coverage. A book that looks strong on a single year of commission data but shows declining retention over three years underwrites very differently than a steady or growing book. See our <a class="inline" href="/sba-loans/business-acquisition">SBA business acquisition mechanics</a> guide for broader acquisition structuring.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?", opts:[
                {v:"book-acquisition", l:"Buying a book of business"},
                {v:"full-agency", l:"Buying a full agency (book + operations)"},
                {v:"partner-buyout", l:"Buying out a partner"},
                {v:"new-agency", l:"Starting a new agency"},
                {v:"producer-to-owner", l:"Producer buying current agency's book"},
            ]},
            {q:"Primary use?", opts:[
                {v:"purchase-price", l:"Book / agency purchase price"},
                {v:"earnout-buyout", l:"Earnout or deferred payment buyout"},
                {v:"real-estate", l:"Office real estate"},
                {v:"tech-systems", l:"Agency management system / technology"},
                {v:"multiple", l:"Multiple combined uses"},
            ]},
            {q:"Your insurance experience?", opts:[
                {v:"15-plus-agent", l:"15+ years as licensed agent"},
                {v:"5-15-agent", l:"5-15 years as licensed agent"},
                {v:"under-5-agent", l:"Under 5 years as licensed agent"},
                {v:"csr-transitioning", l:"CSR or support staff transitioning to owner"},
                {v:"industry-outside", l:"Insurance industry background, not agent"},
            ]},
            {q:"Personal credit score?", opts:[
                {v:"below-680", l:"Below 680"},
                {v:"680-719", l:"680-719"},
                {v:"720-759", l:"720-759"},
                {v:"760-plus", l:"760+"},
            ]},
            {q:"Loan amount needed?", opts:[
                {v:"under-500k", l:"Under $500K"},
                {v:"500k-1m", l:"$500K - $1M"},
                {v:"1m-2m", l:"$1M - $2M"},
                {v:"2m-plus", l:"$2M+"},
            ]},
            {q:"Book line-of-business mix?", opts:[
                {v:"commercial-heavy", l:"Commercial P&C heavy"},
                {v:"personal-heavy", l:"Personal P&C heavy"},
                {v:"life-health", l:"Life and health heavy"},
                {v:"mixed", l:"Balanced mix"},
            ]},
        ],
        profiles: {
            A: {badge:"Strong book acquisition file",headline:"You're in the book-of-business sweet spot",body:"Experienced licensed agent acquiring an established book is exactly what insurance agency SBA lenders build their programs around. Specialist lenders (Live Oak and a handful of others) underwrite these files routinely — residual-revenue math, carrier appointment transfers, earnout structures. Expect 60-90 days to close with competitive pricing.",ctaLabel:"Match with insurance-agency-experienced SBA lenders",utmContent:"profile-a-book"},
            B: {badge:"Full agency acquisition",headline:"Full agency deals with real estate use combined 7(a) + 504",body:"Acquiring a full agency that includes real estate plus the book uses SBA 7(a) for the book and operating-business portion and SBA 504 for the real estate. Combined structure typically beats conventional financing on both pieces. Plan 75-120 days for coordinated closings.",ctaLabel:"Match with 7(a) + 504 agency SBA lenders",utmContent:"profile-b-full-agency"},
            C: {badge:"Partner buyout",headline:"Partial-purchase SBA 7(a) is the path",body:"Buying out a partner or partial-interest acquisition qualifies for SBA 7(a) since the May 2023 partial-purchase rule clarification. Lender underwrites the agency's total cash flow plus the specific partner interest being purchased. Specialist lenders handle these routinely. Plan 60-90 days.",ctaLabel:"Match with partnership buyout SBA specialists",utmContent:"profile-c-partner"},
            D: {badge:"Experience gap / new agency",headline:"Strengthen the file before applying",body:"Limited insurance agency experience or a new-agency startup is the hardest insurance SBA file. Lenders want extensive documentation of carrier appointments, retention plans, and — for new agencies — meaningfully higher equity injection than the 10% minimum. A partnership with an experienced agent or a structured mentorship arrangement often makes a thin file fundable.",ctaLabel:"Get honest feedback from an insurance SBA specialist",utmContent:"profile-d-experience"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],exp=a[2],credit=a[3],amount=a[4],mix=a[5];if(sit==='new-agency'||exp==='industry-outside'||exp==='csr-transitioning')return 'D';if(sit==='partner-buyout')return 'C';if(sit==='full-agency'&&(amount==='1m-2m'||amount==='2m-plus'))return 'B';if((exp==='15-plus-agent'||exp==='5-15-agent')&&(credit==='720-759'||credit==='760-plus'))return 'A';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan to buy an insurance agency?",a:"Yes. Insurance agency book-of-business acquisitions are the dominant SBA 7(a) use case in this category. Loans cover the purchase price of the book, real estate if included, agency-management-system technology, and working capital. Book valuations typically run 1.5x to 3x annual commissions depending on line mix, retention, and carrier relationships. Specialist lenders are comfortable with the residual-revenue underwriting that generalist banks often struggle with."},
        {q:"How do lenders value an insurance book of business?",a:"Typical valuation is 1.5x to 3x annual commissions, with variation driven by line mix (commercial P&C commands higher multiples than personal P&C), client retention history (85%+ retention commands premiums), carrier appointment quality, and policy count concentration. Lenders discount projected revenue for expected attrition (typically 5-15% annually) and size the loan against the post-acquisition debt service coverage ratio (typically 1.25x+)."},
        {q:"What's the typical SBA loan size for an insurance agency?",a:"Average insurance agency SBA 7(a) loan FY2020-2025 was approximately $478,000. Individual book acquisitions commonly run $250K to $1.5M; larger full-agency acquisitions with real estate can reach $3M+. SBA 7(a) Standard goes up to $5 million, which covers the large majority of independent agency acquisitions in the market."},
        {q:"Do I need to be a licensed insurance agent to buy an agency?",a:"In most states yes, due to state insurance licensing rules that restrict agency ownership to licensed persons. Some states allow ownership through corporate structures where the operating agent is licensed. The SBA itself doesn't impose a licensure requirement, but lenders will underwrite to applicable state rules. If the buyer isn't licensed, the deal needs a licensed operating agent and a compliant ownership structure. Many insurance SBA lenders will not underwrite buyers without direct agent experience regardless of structure."},
        {q:"What happens to carrier appointments when an agency changes hands?",a:"Carrier appointments don't automatically transfer. Most appointments require carrier consent for a change of ownership, and some carriers will terminate rather than re-issue. Lenders want to see which appointments will transfer, which require consent, and whether any key appointments may be at risk. Loss of a major carrier appointment post-sale can materially reduce book value and trigger loan covenant issues. Agency due diligence always includes a carrier-appointment review."},
        {q:"How important is the non-compete clause in an insurance agency acquisition?",a:"Critical. The buyer is paying for the seller's book, and the seller has every ability to call old clients and rebuild if not legally constrained. Lenders want non-competes with reasonable geographic scope (usually the market area), 3-5 year duration, and explicit non-solicit language covering both clients and employees. Non-competes that are overly broad (won't survive court review) or too narrow (don't protect the book) both create lender concerns. State rules vary significantly — California effectively prohibits most non-competes, which requires creative structuring around non-solicit language."},
        {q:"What's the SBA charge-off rate for insurance agencies?",a:"Insurance agency SBA 7(a) charge-offs run at 1.06%, meaningfully better than the all-industry SBA average of 1.36%. The favorable performance reflects the recurring-commission economics that make insurance agencies more cash-flow-predictable than most small businesses. When loans do fail, it's usually because projected book retention materially underperformed, a carrier pulled its appointment, or the seller violated the non-compete and recruited clients away."},
    ],
},

'238220': {
    slug: 'plumbing-hvac',
    industryNoun: "plumbing and HVAC",
    programsContext: {
        fits: {
            standard: "shop acquisitions, fleet expansion, real estate combined with the operating business.",
            '504': "buying the yard or shop real estate. Fixed long-term rates on the real-estate portion.",
            small: "fleet additions, diagnostic tool upgrades, working capital under $500K.",
            equipment: "service vehicles, diagnostic equipment, HVAC recovery units. Faster than SBA for fleet replacement.",
        },
    },
    h1: 'SBA Loans for Plumbing & HVAC Businesses',
    title: 'SBA Loan for Plumbing & HVAC Contractors 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) and 504 loans for plumbing and HVAC contractors. 6,128 loans approved FY2020-2025 covering equipment, service vehicles, acquisitions, and facilities. Take the 2-minute quiz.',
    breadcrumbName: 'SBA Loans for Plumbing & HVAC',
    campaignSlug: 'sba-plumbing-hvac-quiz',
    heroSub: 'SBA 7(a) is the dominant financing path for plumbing and HVAC contractors &mdash; equipment, service vehicles, acquisitions, and facilities. The sector benefits from aging infrastructure demand and a licensed-trade supply constraint. Here&rsquo;s how lenders evaluate these files.',
    heroValue: 'Answer 6 questions. Get matched with plumbing- and HVAC-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps plumbing and HVAC contractors compare SBA 7(a), 504, and equipment financing options and match with SBA-preferred lenders experienced in trade-contractor underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate plumbing and HVAC files',
        underwriting: `
            <p>Plumbing and HVAC SBA lending is the largest single-trade category in the SBA portfolio &mdash; the sector benefits from non-discretionary demand, equipment-backed collateral, and a licensed-trade barrier to entry. Charge-off performance sits close to the SBA average at <strong>1.32%</strong>, with solid recovery economics when loans do fail because service trucks and equipment retain resale value.</p>
            <h3>Licensing and certification are hard gates</h3>
            <p>Lenders verify that the operator (or an operating partner) holds the state-required trade license. <strong>Master plumber licenses</strong>, <strong>HVAC contractor licenses</strong>, EPA Section 608 refrigerant certification, and state-specific plumbing and mechanical licenses all matter. A non-licensed buyer acquiring a plumbing or HVAC business typically needs a documented management agreement with a licensed operator or a qualifying partner on the ownership team. Underwriting moves materially faster when the licensing picture is clean upfront.</p>
            <h3>Service vehicles and equipment as collateral</h3>
            <p>A mid-size plumbing or HVAC operation runs <strong>4 to 20 service trucks</strong> at $40K to $80K each fully equipped, plus inventory, diagnostic equipment, and specialty tools. Fleet and equipment value commonly represents 30-60% of total business assets and serves as collateral-strong security on the loan. Lenders value this profile; recovery on defaulted plumbing and HVAC loans is consistently stronger than on comparable service businesses without physical-asset backing.</p>
            <h3>Emergency vs. scheduled-service revenue mix</h3>
            <p>Lenders want to see the split across <strong>emergency service calls</strong> (higher margin, unpredictable timing), <strong>scheduled service contracts</strong> (maintenance agreements, commercial contracts &mdash; predictable recurring revenue), and <strong>new construction / installation</strong> (larger tickets, longer sales cycles). A contractor with a meaningful base of maintenance contracts underwrites better than a pure emergency-service shop because revenue visibility is better.</p>
            <h3>Aging infrastructure as tailwind</h3>
            <p>Residential HVAC equipment sold in 2005-2015 is reaching end-of-life now; the same is true for plumbing fixtures, water heaters, and commercial systems installed during earlier building cycles. Lenders aware of this replacement-cycle tailwind take a constructive view of contractor deals even in categories with otherwise flat top-line growth.</p>
        `,
        indepTitle: 'Independent shops and the franchise minority',
        indep: `
            <p>Franchise operators account for <strong>{franchise_pct}% of plumbing and HVAC SBA loans</strong> &mdash; a real but minority share. Common franchise brands include the national Benjamin Franklin Plumbing / One Hour Heating &amp; Air / Mister Sparky family and other trade-franchise concepts. When the franchise is in the SBA Franchise Directory, brand-level underwriting is already complete and lenders focus on the operator and market.</p>
            <p>The industry leans heavily independent. Multi-generation family-owned shops are a meaningful share of the acquisition target universe, with senior owners transitioning to younger family members or to experienced technicians who worked for them. These transition-driven acquisitions are favorable SBA files because the buyer knows the customer base, the staff, and the market before the loan closes.</p>
        `,
        failureTitle: 'Charge-off performance and the recent trend',
        failure: `
            <p>Plumbing and HVAC SBA 7(a) charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the all-industry SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio, roughly in line with the SBA average. The collateral-strong equipment profile keeps recovery strong when loans do fail, and when failures happen the average months-to-charge-off runs longer than most industries &mdash; operators typically cover debt service for 30+ months before the business fully collapses.</p>
            <p>The recent trend deserves honest note: trailing 12-month loan volume is down meaningfully from the prior 12 months, reflecting a broader commercial-construction slowdown and residential-replacement deferral as consumers stretch equipment life during higher-rate periods. The longer-term trajectory remains supported by aging infrastructure; the near-term variance is real. Lenders remain engaged on these deals but are asking more questions about forward pipeline than they did 18 months ago.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?",opts:[{v:"acquisition",l:"Acquiring an existing shop"},{v:"new",l:"Starting a new business"},{v:"expansion",l:"Expanding current business"},{v:"equipment-only",l:"Equipment / fleet only"},{v:"real-estate",l:"Buying facility real estate"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"fleet",l:"Service vehicles / fleet"},{v:"equipment",l:"Diagnostic equipment / tools"},{v:"real-estate-use",l:"Commercial real estate"},{v:"working-capital",l:"Working capital"},{v:"multiple",l:"Multiple uses"}]},
            {q:"Your trade licensing?",opts:[{v:"master-licensed",l:"Master plumber or HVAC contractor licensed"},{v:"journeyman",l:"Journeyman-level, working toward master"},{v:"partner-licensed",l:"Non-licensed with licensed operating partner"},{v:"limited",l:"Limited trade background"}]},
            {q:"Personal credit score?",opts:[{v:"below-640",l:"Below 640"},{v:"640-679",l:"640-679"},{v:"680-719",l:"680-719"},{v:"720-plus",l:"720+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-250k",l:"Under $250K"},{v:"250k-500k",l:"$250K - $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-plus",l:"$1M+"}]},
            {q:"Real estate included?",opts:[{v:"yes",l:"Yes"},{v:"lease",l:"No, lease facility"},{v:"unsure",l:"Not decided"}]},
        ],
        profiles: {
            A: {badge:"Strong acquisition file",headline:"Licensed operator acquiring an established shop",body:"Master-licensed operator acquiring an existing plumbing or HVAC shop with established customer base and service contracts is a favorable SBA file. Specialist trade lenders recognize the equipment collateral and licensed-trade supply constraint. Expect 60-90 days to close with a trade-contractor-experienced SBA lender.",ctaLabel:"Match with plumbing/HVAC-experienced SBA lenders",utmContent:"profile-a-acquisition"},
            B: {badge:"Real estate + business",headline:"504 for the facility, 7(a) for the operating business",body:"When the deal includes the shop or yard, SBA 504 on the real estate at fixed long-term rates plus 7(a) on the operating business is the efficient structure. Owning the facility stabilizes long-term economics and protects against forced relocation. Combined closings run 75-120 days.",ctaLabel:"Match with 504 + 7(a) trade lenders",utmContent:"profile-b-real-estate"},
            C: {badge:"Fleet / equipment path",headline:"Equipment financing often beats SBA on fleet",body:"For fleet-only expansions, equipment financing (non-SBA) funds in 3-10 days vs. 45-75 days for SBA. Higher rate than SBA but the vehicles serve as collateral and the speed matters for operators responding to seasonal demand. SBA 7(a) Small Loan is the SBA-side option when timeline allows.",ctaLabel:"Compare fleet financing vs. SBA",utmContent:"profile-c-fleet"},
            D: {badge:"Licensing gap",headline:"Strengthen the licensing picture before applying",body:"Without a master-licensed operator, most SBA trade lenders require a documented management agreement with a licensed operator or a qualifying partner on the ownership team. Have this conversation upfront. Many deals that stall mid-underwriting get declined specifically because licensing wasn't structured cleanly at file submission.",ctaLabel:"Get honest feedback from a trade SBA specialist",utmContent:"profile-d-licensing"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],lic=a[2],credit=a[3],amount=a[4],re=a[5];if(lic==='limited')return 'D';if(re==='yes'||use==='real-estate-use'||sit==='real-estate')return 'B';if(use==='fleet'||sit==='equipment-only')return 'C';if(sit==='acquisition'&&(lic==='master-licensed'||lic==='partner-licensed'))return 'A';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan to buy a plumbing or HVAC business?",a:"Yes. Plumbing and HVAC contractor acquisitions are a common SBA 7(a) use case. Loans cover the purchase price, service vehicle fleet, diagnostic equipment, facility real estate if included, and working capital. Average plumbing/HVAC SBA loan FY2020-2025 was approximately $438,000."},
        {q:"Do I need to be a licensed master plumber or HVAC contractor to get an SBA loan?",a:"Not required, but critical. Lenders verify that the operator holds the state-required trade license. Non-licensed buyers typically need a documented management agreement with a licensed operator or a licensed partner on the ownership team. Licensing structure in place upfront materially speeds underwriting."},
        {q:"Can SBA loans finance service vehicles and fleet for a plumbing or HVAC business?",a:"Yes. SBA 7(a) covers service vehicles either as part of a larger acquisition package or as standalone fleet financing. For fleet-only deals, equipment financing (non-SBA) often beats SBA on speed — 3-10 day funding vs. 45-75 days — at a higher rate. Operators replacing fleet routinely choose equipment financing; operators combining fleet with other uses stay on SBA."},
        {q:"How much can I borrow with an SBA loan for a plumbing or HVAC company?",a:"SBA 7(a) Standard goes up to $5 million; SBA 504 adds additional capacity for real estate. Most single-shop acquisitions fall in the $250K to $1.5M range; multi-location or real-estate-inclusive deals commonly run $1M to $3M. Fleet-only and equipment-only loans run $50K to $500K and typically fit SBA 7(a) Small Loan."},
        {q:"What's the SBA charge-off rate for plumbing and HVAC businesses?",a:"Plumbing and HVAC SBA 7(a) charge-offs run at 1.32%, roughly in line with the all-industry SBA average of 1.36%. The collateral-strong equipment profile keeps recovery strong when loans do fail. Average months-to-charge-off runs longer than most industries, reflecting the non-discretionary demand that lets struggling operators cover debt service longer than service businesses without physical-asset backing."},
        {q:"Is now a good time to buy a plumbing or HVAC business?",a:"The long-term trajectory is supported by aging residential and commercial infrastructure driving replacement demand. Near-term SBA lending volume is softer than 2023-2024 peaks as consumers defer equipment replacement during higher-rate periods. Lenders remain engaged but ask more questions about forward pipeline than they did 18 months ago. Seller expectations on valuation have adjusted modestly, which can favor buyers with clean files."},
        {q:"Should I buy the facility real estate along with the business?",a:"When possible, yes — SBA 504 was built for exactly that use case. Owning the shop or yard stabilizes long-term economics and protects against forced relocation. SBA 504 provides fixed long-term rates on the real estate; a 7(a) companion loan covers the operating business. Combined structure typically beats conventional financing on both pieces."},
    ],
},

'624410': {
    slug: 'child-care',
    industryNoun: "child care",
    programsContext: {
        fits: {
            standard: "center acquisitions, facility buildouts, multi-location expansion.",
            '504': "buying the center facility. Fixed long-term rates on the real-estate portion.",
            small: "equipment upgrades, playground improvements, working capital for staff ramp under $500K.",
            equipment: "classroom equipment, playground buildouts. Faster than SBA when timeline matters for enrollment cycles.",
        },
    },
    h1: 'SBA Loans for Child Care Centers',
    title: 'SBA Loan for Child Care & Daycare 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) and 504 loans for child care centers and daycare facilities. 5,081 child care SBA loans approved FY2020-2025 with 0.51% charge-off (0.38x SBA average). Take the 2-minute quiz.',
    breadcrumbName: 'SBA Loans for Child Care',
    campaignSlug: 'sba-child-care-quiz',
    heroSub: 'Child care and daycare SBA lending has a <strong>0.51% charge-off rate</strong>, roughly one-third the SBA average. Licensing, facility financing, and enrollment-forward revenue underwriting make these files more technical than most, but the performance profile is favorable.',
    heroValue: 'Answer 6 questions. Get matched with child-care-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps child care and daycare operators compare SBA 7(a) and 504 options and match with lenders experienced in child care facility underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate child care center files',
        underwriting: `
            <p>Child care SBA underwriting is specialized because the business sits at the intersection of heavily regulated licensing, facility-driven capital requirements, and enrollment-based revenue economics. The 0.51% charge-off rate &mdash; roughly 0.38x the SBA average &mdash; reflects favorable underlying economics despite the regulatory complexity.</p>
            <h3>State licensing drives deal structure</h3>
            <p>Every state regulates child care facilities differently: staff-to-child ratios, square footage per child, physical facility requirements (fenced outdoor space, dedicated classrooms by age band), background check and training requirements for staff. Lenders review the <strong>current licensure status, capacity under license, and any pending regulatory issues</strong> as part of underwriting. A change of ownership sometimes triggers license re-inspection, which can delay the closing by weeks &mdash; structure the deal to anticipate this.</p>
            <h3>Facility financing dominates</h3>
            <p>Child care is facility-heavy. Typical centers require <strong>3,000 to 15,000 square feet</strong> of dedicated space with age-specific classrooms, outdoor play area, kitchen facilities if meals are served, and state-mandated safety features. Acquisition of an existing center often includes the real estate or a long-term lease, and new-center buildouts commonly run $500K to $2M in tenant-improvement cost on top of any real estate acquisition. <strong>SBA 504 handles the real estate portion; SBA 7(a) handles the operating business</strong> — combined structure is the norm on deals including the building.</p>
            <h3>Enrollment-forward revenue underwriting</h3>
            <p>Unlike most businesses, child care revenue is <strong>forward-bookable</strong>: parents enroll children for 9-12 month programs, paying tuition weekly or monthly. Lenders want to see <strong>current enrollment vs. capacity</strong>, the waiting-list depth, and historical enrollment retention. A center at 90% of licensed capacity with a waiting list underwrites very differently from a center at 60% capacity with enrollment gaps across multiple age bands.</p>
            <h3>Subsidy program interactions</h3>
            <p>Many centers participate in state Child Care Development Fund programs, Head Start, or state-specific subsidy systems. These add revenue stability but also administrative complexity and reimbursement timing considerations. Lenders with child care experience navigate this routinely; generalist lenders sometimes stumble on the subsidy-revenue analysis.</p>
        `,
        indepTitle: 'Franchise vs. independent centers',
        indep: `
            <p>Franchise operators represent <strong>{franchise_pct}% of child care SBA loans</strong> &mdash; meaningfully higher than most professional-services industries. Major franchise brands in the SBA data include the Primrose / KinderCare / Goddard / Kiddie Academy category and multiple regional concepts. Franchise centers get a brand-level underwriting shortcut if the franchise is listed in the SBA Franchise Directory, and they benefit from established curriculum, marketing, and operational systems. See our <a class="inline" href="/sba-loans/franchise">SBA franchise guide</a> for franchise-specific mechanics.</p>
            <p>Independent centers take the full underwriting path: licensing verification, facility diligence, enrollment and retention review, and operator experience evaluation. Experienced independent operators with a proven track record at prior centers underwrite well. First-time operators face a harder path without a franchise curriculum backbone or without a state-recognized certification in early childhood education on the ownership team.</p>
        `,
        failureTitle: 'Why child care outperforms on SBA charge-off',
        failure: `
            <p>Child care charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio. The favorable performance reflects three structural features: <strong>enrollment-based revenue</strong> (parents commit to 9-12 month cycles, reducing month-to-month volatility), <strong>licensing barriers to entry</strong> (new competition can&rsquo;t open quickly), and <strong>subsidy program stability</strong> (participating centers have a cushion against local economic downturns).</p>
            <p>When loans do fail, the causes cluster around <strong>enrollment collapse</strong> (a major local employer leaves, a new competing franchise opens nearby, reputation damage from a licensing violation), <strong>facility issues</strong> (unexpected structural problems or code requirements drain reserves), or <strong>staff crisis</strong> (inability to hire qualified staff at required ratios forces capacity reduction). Lenders with child care experience underwrite specifically around these risks, which is why specialist lender match affects outcome quality.</p>
            <p>The +17% YoY growth in SBA lending to child care centers reflects a real market expansion: persistent demand exceeding supply in most markets, post-pandemic re-opening investments, and consolidation as independent centers sell to larger operators or franchise groups.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?",opts:[{v:"acquisition",l:"Acquiring an existing center"},{v:"new",l:"Opening a new independent center"},{v:"franchise",l:"Opening or buying a franchise center"},{v:"expansion",l:"Expanding to additional location"},{v:"established",l:"Established center needing capital"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Center purchase price"},{v:"facility-buildout",l:"Facility buildout / expansion"},{v:"real-estate",l:"Facility real estate purchase"},{v:"working-capital",l:"Working capital"},{v:"multiple",l:"Multiple uses combined"}]},
            {q:"Your experience?",opts:[{v:"experienced-operator",l:"5+ years operating child care centers"},{v:"ece-certified",l:"Early childhood education credentialed"},{v:"management-background",l:"Management background, hiring a licensed director"},{v:"first-time",l:"First-time operator"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-759",l:"720-759"},{v:"760-plus",l:"760+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-500k",l:"Under $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-2m",l:"$1M - $2M"},{v:"2m-plus",l:"$2M+"}]},
            {q:"Facility included?",opts:[{v:"yes",l:"Yes, buying the building"},{v:"lease",l:"No, lease arrangement"},{v:"unsure",l:"Not decided"}]},
        ],
        profiles: {
            A: {badge:"Strong acquisition candidate",headline:"Experienced operator acquiring established center",body:"Experienced child care operator acquiring an established center with healthy enrollment is a favorable SBA file. Specialist lenders underwrite the enrollment-forward revenue efficiently. Plan 60-90 days with license re-inspection potentially adding a few weeks.",ctaLabel:"Match with child-care-experienced SBA lenders",utmContent:"profile-a-acquisition"},
            B: {badge:"Facility + business",headline:"504 for the facility, 7(a) for the operations",body:"Deals including the facility real estate use SBA 504 on the building at fixed long-term rates plus 7(a) for operations. Owning the facility stabilizes long-term economics in a capacity-constrained industry. Combined closings run 75-120 days.",ctaLabel:"Match with 504 + 7(a) child care lenders",utmContent:"profile-b-facility"},
            C: {badge:"Franchise path",headline:"Franchise route streamlines underwriting",body:"Franchise child care — Primrose, KinderCare, Goddard, Kiddie Academy and others — benefits from brand-level underwriting shortcut if listed in the SBA Franchise Directory. See our SBA franchise guide for franchise-specific mechanics.",ctaLabel:"See SBA franchise details",utmContent:"profile-c-franchise",ctaUrl:"/sba-loans/franchise/"},
            D: {badge:"New-center path",headline:"New independent center needs strong file",body:"Starting a new independent center is the hardest child care SBA file. Lenders want a licensed director on the team, detailed enrollment-ramp projections, and meaningfully higher equity injection (15-25%). Partnership with an experienced operator or a franchise alternative often beats pure independent startup.",ctaLabel:"Get honest feedback from a child care SBA specialist",utmContent:"profile-d-new-center"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],exp=a[2],credit=a[3],amount=a[4],re=a[5];if(sit==='franchise')return 'C';if(sit==='new'&&exp==='first-time')return 'D';if(re==='yes'||use==='real-estate')return 'B';if(sit==='acquisition'&&(exp==='experienced-operator'||exp==='ece-certified'))return 'A';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan to buy or start a child care center?",a:"Yes. Child care centers are an active SBA 7(a) use case — 5,081 loans approved FY2020-2025 with strong underlying performance. Loans cover acquisition purchase price, facility buildout, real estate if included, and working capital. Average child care SBA loan was approximately $807,000 — higher than most SBA categories because of the facility-heavy capital requirements."},
        {q:"Do I need a license to operate a child care center?",a:"Yes. Every state licenses child care centers with specific staff-to-child ratios, square-footage-per-child requirements, facility safety standards, and background-check and training requirements for staff. A change of ownership can trigger license re-inspection. Lenders verify current licensure status and flag any pending regulatory issues during underwriting."},
        {q:"What's the SBA charge-off rate for child care centers?",a:"Child care SBA 7(a) charge-offs run at 0.51%, roughly one-third the all-industry SBA average of 1.36%. The favorable performance reflects enrollment-based revenue (parents commit to 9-12 month cycles), licensing barriers to entry, and subsidy program stability for participating centers."},
        {q:"How much can I borrow with an SBA loan for a child care center?",a:"SBA 7(a) Standard goes up to $5 million; SBA 504 adds additional capacity for real estate. Single-center acquisitions with real estate commonly run $1M to $3M; without real estate, $500K to $1.5M is typical. Multi-location or franchise concepts can reach $5M+ through combined 7(a) and 504 structures."},
        {q:"Does my existing center need to be profitable to qualify?",a:"Not absolute — the loan application underwrites to projected post-close cash flow, not just historical profit. Centers operating at 70%+ of licensed capacity with stable enrollment usually clear debt service coverage even when historical profit is modest. Centers at lower capacity with enrollment trends that don't support the projected ramp face a harder underwriting path."},
        {q:"Can I finance the facility and the operating business together?",a:"Yes, through a combined SBA 504 + 7(a) structure. SBA 504 handles the real estate at fixed long-term rates with 10% down; SBA 7(a) covers the operating business, buildout, and working capital. Combined closings run 75-120 days but typically beat conventional financing meaningfully on both pieces, particularly for facility-heavy industries like child care."},
        {q:"Is child care SBA lending still growing?",a:"Yes. SBA 7(a) lending to child care centers is up 17% year-over-year, reflecting persistent demand exceeding supply in most local markets, post-pandemic re-opening investment, and consolidation as independent centers sell to larger operators or franchise groups. Trailing 12-month volume has softened modestly but the multi-year trajectory remains favorable."},
    ],
},

'561730': {
    slug: 'landscaping',
    industryNoun: "landscaping",
    programsContext: {
        fits: {
            standard: "business acquisitions, fleet builds, multi-crew expansion.",
            '504': "buying the yard or facility real estate. Fixed long-term rates.",
            small: "equipment upgrades, trucks and trailers, seasonal working capital under $500K.",
            equipment: "mowers, trimmers, specialty equipment. Faster than SBA for seasonal replacement cycles.",
        },
    },
    h1: 'SBA Loans for Landscaping Businesses',
    title: 'SBA Loan for Landscaping Business 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for landscaping businesses. 5,962 landscaping SBA loans approved FY2020-2025 covering equipment, acquisitions, and seasonal working capital. Take the 2-minute quiz.',
    breadcrumbName: 'SBA Loans for Landscaping',
    campaignSlug: 'sba-landscaping-quiz',
    heroSub: 'SBA 7(a) is the primary financing path for landscaping business acquisitions, equipment, and seasonal working capital. The sector is equipment-heavy and seasonal &mdash; both factors shape how lenders underwrite these files.',
    heroValue: 'Answer 6 questions. Get matched with landscaping-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps landscaping operators compare SBA 7(a), equipment financing, and working capital options and match with lenders experienced in landscaping business underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate landscaping business files',
        underwriting: `
            <p>Landscaping SBA lending is a volume category &mdash; 5,962 loans approved FY2020-2025 &mdash; with average loan size of $303,000, the smallest average of any major Angle 1 industry we cover. Most landscaping SBA deals fund equipment acquisitions, truck-and-trailer fleet builds, or single-site operator acquisitions. The underwriting leans heavily on <strong>equipment collateral</strong> and <strong>recurring commercial contracts</strong>.</p>
            <h3>Equipment-heavy and seasonally variable</h3>
            <p>A mid-size landscaping operation carries <strong>$200K to $800K in equipment</strong> &mdash; mowers, trimmers, trucks, trailers, skid steers, specialty equipment for hardscaping or irrigation work. Fleet value underwrites like a strong secondary source of collateral. Seasonality varies by market &mdash; northern operators experience meaningful revenue drop in winter (unless snow removal bridges the gap), southern operators run closer to year-round.</p>
            <h3>Commercial vs. residential revenue mix</h3>
            <p>Lenders want to see the split. <strong>Commercial accounts</strong> &mdash; HOAs, office parks, apartment complexes, municipal contracts &mdash; provide recurring multi-year revenue with predictable cash flow. <strong>Residential services</strong> offer higher per-job margins but more customer churn and seasonality. A landscaping operation with 60%+ commercial contract revenue underwrites better than a pure residential operator of comparable revenue.</p>
            <h3>Snow removal as seasonal bridge</h3>
            <p>Northern-market operators often run snow removal as a companion service &mdash; it uses adjacent equipment (plow-mounted trucks, spreaders), keeps staff employed in winter, and smooths the cash flow pattern. Lenders value this diversification. Southern operators without a winter revenue channel face more seasonal working-capital needs, which affects the loan structure.</p>
            <h3>Recent decline in SBA volume</h3>
            <p>Landscaping is the one Angle 1 industry showing a negative trajectory in recent SBA lending. Trailing 12-month volume is down 21% from the prior 12 months, with year-over-year growth at -4%. This reflects softer residential landscaping demand during higher-rate periods and a broader construction-adjacent slowdown. The industry remains fundable but lenders are asking sharper questions about forward pipeline.</p>
        `,
        indepTitle: 'Independent operators and franchise concepts',
        indep: `
            <p>Franchise arrangements represent <strong>{franchise_pct}% of landscaping SBA loans</strong> &mdash; moderate, including concepts like U.S. Lawns, The Grounds Guys, Lawn Doctor, and regional brands. Franchise operations benefit from brand-level underwriting efficiency if listed in the SBA Franchise Directory.</p>
            <p>The industry is heavily independent. Common acquisition patterns: employee buying out the owner who trained them, family member continuing a generational operation, or an outside operator with small-business management background buying an established operator&rsquo;s account book and equipment. SBA 7(a) funds the purchase price plus fleet transition costs and often covers 12-24 months of seasonal working capital on top.</p>
        `,
        failureTitle: 'Charge-off performance and the working-capital reality',
        failure: `
            <p>Landscaping charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio, modestly better than average. Equipment collateral supports recovery when loans fail. What predicts the failures: <strong>cash-flow miscalculation across the seasonal cycle</strong> (operator runs out of reserves during winter lull) and <strong>customer concentration</strong> (loss of one major commercial account triggers a revenue collapse the business can&rsquo;t absorb).</p>
            <p>The practical implication: landscaping files that close cleanly build working capital into the loan structure to bridge the seasonal pattern rather than relying on operator reserves alone. 12 to 24 months of working capital layered alongside the acquisition or equipment loan is standard and recognized by specialist lenders as best practice rather than over-borrowing.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?",opts:[{v:"acquisition",l:"Acquiring an existing business"},{v:"new",l:"Starting a new business"},{v:"expansion",l:"Expanding current business"},{v:"equipment-only",l:"Equipment purchase only"},{v:"fleet",l:"Truck and trailer fleet build"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"equipment",l:"Mowers, trimmers, specialty equipment"},{v:"fleet",l:"Trucks and trailers"},{v:"working-capital",l:"Seasonal working capital"},{v:"multiple",l:"Multiple combined uses"}]},
            {q:"Your revenue mix?",opts:[{v:"commercial-heavy",l:"60%+ commercial contracts"},{v:"residential-heavy",l:"60%+ residential services"},{v:"mixed",l:"Balanced mix"},{v:"new",l:"New business / no mix yet"}]},
            {q:"Your experience?",opts:[{v:"5-plus",l:"5+ years operating landscaping business"},{v:"under-5",l:"Under 5 years operating"},{v:"employed",l:"Currently employed in landscaping, moving to owner"},{v:"outside",l:"Outside industry, acquiring"}]},
            {q:"Personal credit score?",opts:[{v:"below-640",l:"Below 640"},{v:"640-679",l:"640-679"},{v:"680-719",l:"680-719"},{v:"720-plus",l:"720+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-150k",l:"Under $150K"},{v:"150k-500k",l:"$150K - $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-plus",l:"$1M+"}]},
        ],
        profiles: {
            A: {badge:"Strong acquisition file",headline:"Experienced operator acquiring established book",body:"Experienced landscaping operator acquiring an established operation with recurring commercial contracts. Equipment collateral and contract revenue make this a favorable SBA file. Plan 60-90 days with a landscaping-experienced SBA lender.",ctaLabel:"Match with landscaping-experienced SBA lenders",utmContent:"profile-a-acquisition"},
            B: {badge:"Equipment-only path",headline:"Equipment financing often beats SBA on speed",body:"For equipment-only deals, non-SBA equipment financing funds in 3-10 days vs. 45-75 for SBA. Higher rate but the equipment is the collateral and the speed matters for seasonal acquisitions. SBA 7(a) Small Loan works when timeline allows.",ctaLabel:"Compare equipment financing vs. SBA",utmContent:"profile-b-equipment"},
            C: {badge:"Working capital + equipment",headline:"Layer working capital into the loan",body:"Seasonal landscaping operations benefit from layering 12-24 months of working capital into the acquisition or equipment loan rather than relying on operator reserves alone. Specialist SBA lenders structure this as standard practice on northern-market deals particularly.",ctaLabel:"Match with seasonal-business SBA lenders",utmContent:"profile-c-seasonal"},
            D: {badge:"Experience gap",headline:"Strengthen the operator file before applying",body:"Outside-industry buyers on landscaping deals face additional scrutiny because lenders want to see operator familiarity with equipment, seasonality, and customer-acquisition dynamics. A documented management agreement with an experienced operator or a partnership often bridges the gap.",ctaLabel:"Get honest feedback from a landscaping SBA specialist",utmContent:"profile-d-experience"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],mix=a[2],exp=a[3],credit=a[4],amount=a[5];if(exp==='outside'&&(amount==='500k-1m'||amount==='1m-plus'))return 'D';if(use==='equipment'||use==='fleet'||sit==='equipment-only'||sit==='fleet')return 'B';if(use==='working-capital')return 'C';if(sit==='acquisition'&&(exp==='5-plus'||exp==='employed'))return 'A';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan to buy or start a landscaping business?",a:"Yes. Landscaping is a volume SBA category — 5,962 loans approved FY2020-2025. SBA 7(a) covers acquisitions, equipment, fleet, and seasonal working capital. Average landscaping SBA loan was approximately $303,000, the smallest average of the major industry categories — reflecting mostly equipment and single-operator deals."},
        {q:"How do lenders handle landscaping seasonality?",a:"Seasonal revenue patterns are standard in the industry and specialist lenders structure around them. Northern-market operators often bridge winter with snow removal services; southern operators run closer to year-round. Loans typically include 12-24 months of working capital layered alongside the acquisition or equipment portion to smooth the seasonal cash cycle."},
        {q:"Can SBA finance landscaping equipment and trucks?",a:"Yes. SBA 7(a) covers specialized landscaping equipment and trucks either as part of a larger acquisition package or as standalone equipment financing via SBA 7(a) Small Loan (up to $500K). For equipment-only deals, non-SBA equipment financing often beats SBA on speed — 3-10 day funding vs. 45-75 days for SBA — at a higher rate but with the equipment serving as direct collateral."},
        {q:"What's better: residential or commercial revenue for SBA underwriting?",a:"Commercial contracts are preferred by lenders because they provide recurring multi-year revenue with predictable cash flow — HOAs, office parks, apartment complexes, municipal contracts. A landscaping operation with 60%+ commercial revenue underwrites better than a pure residential operator of comparable revenue. Residential services offer higher per-job margins but more customer churn and seasonality."},
        {q:"What's the SBA charge-off rate for landscaping?",a:"Landscaping SBA 7(a) charge-offs run at 1.22%, modestly better than the all-industry SBA average of 1.36%. Equipment collateral supports recovery when loans fail. The main risk factors: cash-flow miscalculation across the seasonal cycle and customer concentration where losing one major commercial account triggers a revenue collapse."},
        {q:"Is landscaping SBA lending growing?",a:"No, not currently. Landscaping is one of the few Angle 1 categories showing a negative trajectory in recent SBA lending: year-over-year down 4%, trailing 12-month volume down 21% from prior 12 months. The decline reflects softer residential landscaping demand during higher-rate periods. Loans remain fundable but lenders ask sharper questions about forward pipeline than they did 18 months ago."},
        {q:"How much working capital should I include in a landscaping SBA loan?",a:"For northern-market operations with meaningful winter slowdown, include 12-24 months of operating costs as working capital layered alongside the acquisition or equipment portion. For southern-market year-round operations, 6-12 months is often sufficient. Lenders experienced with landscaping treat this as standard structure rather than over-borrowing."},
    ],
},

'238990': {
    slug: 'specialty-trades',
    industryNoun: "specialty trade",
    programsContext: {
        fits: {
            standard: "business acquisitions, equipment expansion to support larger bonded contracts.",
            '504': "buying the yard or facility real estate. Fixed long-term rates.",
            small: "vehicles, tools, bonding-capacity working capital under $500K.",
            equipment: "trade-specific equipment (welding rigs, paint sprayers, site-prep gear). Faster than SBA.",
        },
    },
    h1: 'SBA Loans for Specialty Trade Contractors',
    title: 'SBA Loan for Specialty Trade Contractor 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for specialty trade contractors — welding, painting, site prep, demolition, and other specialty subs. 5,857 loans approved FY2020-2025 with 0.87% charge-off (0.64x SBA avg).',
    breadcrumbName: 'SBA Loans for Specialty Trade Contractors',
    campaignSlug: 'sba-specialty-trades-quiz',
    heroSub: 'SBA 7(a) covers the full range of specialty trade contractors &mdash; welding, painting, site preparation, demolition, specialty subcontractors. The category has <strong>0.87% charge-offs</strong>, meaningfully better than the SBA average. Equipment-heavy collateral and bonding capacity are the main underwriting themes.',
    heroValue: 'Answer 6 questions. Get matched with trade-contractor-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps specialty trade contractors compare SBA 7(a), equipment financing, and bond-supporting options and match with lenders experienced in trade-contractor underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate specialty trade contractor files',
        underwriting: `
            <p>The &ldquo;All Other Specialty Trade Contractors&rdquo; NAICS category is genuinely broad &mdash; welding, structural steel erection, painting, specialty site preparation, demolition, flooring, tile/stone, glass, and a long tail of specialty construction subcontractors. Despite the breadth, SBA underwriting shares common patterns: <strong>equipment and vehicle collateral</strong>, <strong>bonding capacity</strong>, and <strong>customer contract backlog</strong>.</p>
            <h3>Equipment and vehicle collateral</h3>
            <p>Specialty trades are equipment-heavy. A welding operator runs welders, trucks, rigging equipment. A painting contractor carries sprayers, lifts, vehicles, and specialty equipment for commercial or industrial coatings. A demolition contractor needs excavators, loaders, haul trucks. Lenders evaluate the <strong>equipment schedule with model year, estimated current value, and any existing liens</strong>. Clean collateral drives more favorable loan terms.</p>
            <h3>Bonding capacity matters</h3>
            <p>Many commercial and public-works specialty trade contracts require <strong>performance and payment bonds</strong>. Bonding capacity is driven by the contractor&rsquo;s balance sheet, working capital, and track record. Lenders want to understand the current bonding capacity and whether the SBA loan proceeds will support higher bond limits (larger jobs) or refinance existing indemnification arrangements. Specialist lenders coordinate with surety underwriters when the contractor is scaling into larger work.</p>
            <h3>Contract backlog and customer concentration</h3>
            <p>The best specialty trade files show <strong>12 to 24 months of committed backlog</strong> at the time of application, with diversified customers. Customer concentration &mdash; 40%+ of revenue from a single general contractor or building owner &mdash; is a flag the lender addresses, not a disqualifier, but it shifts the underwriting conversation toward concentration risk and customer-payment history.</p>
            <h3>Operator licensing varies by trade</h3>
            <p>Welders need AWS certifications for certain structural work. Painting contractors working on lead-paint projects need EPA RRP certification. Demolition contractors often need state-specific contractor licenses. Each sub-trade has its own licensing picture &mdash; lenders verify that the operator has (or has hired) the required credentials for the work actually being performed.</p>
        `,
        indepTitle: 'Independent operators and franchise concepts',
        indep: `
            <p>Franchise arrangements account for <strong>{franchise_pct}% of specialty trade SBA loans</strong> &mdash; moderate, including painting (CertaPro, Five Star Painting), flooring (Empire), and specialty trade franchises. Franchise operations benefit from brand-level underwriting shortcut and established marketing systems.</p>
            <p>The industry is overwhelmingly independent. Common acquisition patterns: foreman or key employee buying out the owner, multi-generational family transition, or an outside operator with general-contracting background acquiring an established specialty book. SBA 7(a) funds the purchase price, equipment transition, and often working capital for the bond-supporting balance sheet build.</p>
        `,
        failureTitle: 'Charge-off performance and what predicts failure',
        failure: `
            <p>Specialty trade SBA charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio, meaningfully better than average. Equipment collateral and the licensed-trade supply constraint support recovery when loans fail. What predicts the failures: <strong>customer concentration collapse</strong> (major general contractor relationship ends), <strong>bonding capacity mismanagement</strong> (overextending into jobs the balance sheet can&rsquo;t support), and <strong>mid-project cash-flow squeezes</strong> on progress-billing jobs where material and labor costs run ahead of contracted payment milestones.</p>
            <p>The +5% YoY growth in SBA lending to specialty trades reflects steady demand from construction activity, with the recent trailing 12-month softening reflecting broader construction cycle dynamics. Specialty lenders remain engaged; the industry&rsquo;s fundamental economics stay favorable even through construction cycle variance.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your specialty trade?",opts:[{v:"welding",l:"Welding / steel fabrication"},{v:"painting",l:"Painting / coatings"},{v:"site-prep",l:"Site preparation / excavation"},{v:"demolition",l:"Demolition"},{v:"flooring-tile",l:"Flooring / tile / stone"},{v:"other",l:"Other specialty trade"}]},
            {q:"What's your situation?",opts:[{v:"acquisition",l:"Acquiring an existing business"},{v:"new",l:"Starting a new business"},{v:"expansion",l:"Expanding current business"},{v:"equipment",l:"Equipment purchase only"},{v:"bonding",l:"Building bonding capacity"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Acquisition purchase price"},{v:"equipment-use",l:"Equipment / fleet"},{v:"real-estate",l:"Facility / yard real estate"},{v:"working-capital",l:"Working capital / bonding support"},{v:"multiple",l:"Multiple combined uses"}]},
            {q:"Personal credit score?",opts:[{v:"below-640",l:"Below 640"},{v:"640-679",l:"640-679"},{v:"680-719",l:"680-719"},{v:"720-plus",l:"720+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-250k",l:"Under $250K"},{v:"250k-500k",l:"$250K - $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-plus",l:"$1M+"}]},
            {q:"Current bonding capacity?",opts:[{v:"bonded-strong",l:"Bonded, strong capacity"},{v:"bonded-limited",l:"Bonded, limited capacity"},{v:"not-bonded",l:"Not currently bonded"},{v:"na",l:"Not applicable / residential work"}]},
        ],
        profiles: {
            A: {badge:"Strong acquisition file",headline:"Specialty trade acquisition — equipment + backlog",body:"Experienced trade contractor acquiring an established book with equipment, backlog, and customer relationships. Equipment collateral and contract backlog make these files favorable. Specialist lenders handle the bonding conversation as part of underwriting.",ctaLabel:"Match with trade-contractor-experienced SBA lenders",utmContent:"profile-a-acquisition"},
            B: {badge:"Equipment path",headline:"Equipment financing often beats SBA on speed",body:"For equipment-only purchases, non-SBA equipment financing funds in 3-10 days vs. 45-75 for SBA. Higher rate but the equipment is collateral and the speed matters when winning contracts requires immediate mobilization capacity.",ctaLabel:"Compare equipment financing vs. SBA",utmContent:"profile-b-equipment"},
            C: {badge:"Bonding capacity + working capital",headline:"SBA 7(a) supports bonding and working capital build",body:"Specialty contractors scaling into larger bonded work often use SBA 7(a) to strengthen the balance sheet and increase surety-supported bonding capacity. Coordinated underwriting with a specialist trade SBA lender and surety broker is the efficient path.",ctaLabel:"Match with trade + bonding-aware SBA lenders",utmContent:"profile-c-bonding"},
            D: {badge:"Credit / experience path",headline:"Strengthen the file before applying",body:"Below-680 credit on a specialty trade acquisition faces a harder underwriting path. Compensating factors — strong equipment collateral, experienced operating partner, documented backlog, meaningfully higher equity injection — make the file fundable. Have this conversation upfront.",ctaLabel:"Get honest feedback from a trade SBA specialist",utmContent:"profile-d-credit"},
        },
        scoringBody: `function score(a){var trade=a[0],sit=a[1],use=a[2],credit=a[3],amount=a[4],bond=a[5];if(credit==='below-640')return 'D';if(use==='equipment-use'||sit==='equipment')return 'B';if(sit==='bonding'||use==='working-capital'||bond==='bonded-limited')return 'C';if(sit==='acquisition')return 'A';return 'A';}`,
    },
    faqs: [
        {q:"What trades does the specialty trade contractor category cover?",a:"The NAICS 238990 category covers 'All Other Specialty Trade Contractors' — welding and structural steel erection, painting and coatings, specialty site preparation, demolition, flooring, tile and stone, glass, and a long tail of specialty construction subcontractors. Specific trades covered elsewhere include plumbing and HVAC (under NAICS 238220), landscaping (NAICS 561730), and others."},
        {q:"Can I get an SBA loan to buy a specialty trade contractor business?",a:"Yes. Specialty trade SBA lending is a volume category — 5,857 loans approved FY2020-2025. SBA 7(a) covers acquisitions, equipment, vehicles, facility real estate, and working capital that supports bonding capacity. Average specialty trade SBA loan was approximately $479,000."},
        {q:"How does bonding capacity affect SBA underwriting?",a:"Many commercial and public-works specialty trade contracts require performance and payment bonds. Bonding capacity is driven by balance sheet and working capital. SBA 7(a) proceeds can strengthen the balance sheet, which supports higher bonding limits — larger jobs, more competitive bidding. Specialist lenders coordinate with surety brokers when the contractor is scaling. Generalist banks sometimes miss this coordination entirely."},
        {q:"What's the SBA charge-off rate for specialty trades?",a:"Specialty trade contractor SBA 7(a) charge-offs run at 0.87%, meaningfully better than the all-industry SBA average of 1.36%. Equipment collateral and licensed-trade supply constraints support recovery when loans fail. What predicts failures: customer concentration collapse, bonding capacity mismanagement, and mid-project cash-flow squeezes on progress-billing jobs."},
        {q:"What licensing matters for specialty trade SBA loans?",a:"Licensing varies by trade. Welders need AWS certifications for certain structural work. Painting contractors on lead-paint projects need EPA RRP certification. Demolition contractors often need state-specific contractor licenses. Flooring and tile work in some states requires state licensing. Lenders verify that the operator has (or has hired) the required credentials for the work actually being performed."},
        {q:"Can I finance equipment and vehicles through an SBA loan?",a:"Yes. SBA 7(a) covers specialty trade equipment, vehicles, and fleet either as part of a larger acquisition or as standalone equipment financing. For equipment-only deals, non-SBA equipment financing often beats SBA on speed. For combined acquisitions with multiple uses (purchase price + equipment + working capital), SBA 7(a) is the efficient single structure."},
        {q:"Is specialty trade SBA lending growing or declining?",a:"Year-over-year SBA lending to specialty trades is up about 5%, with trailing 12-month volume slightly softer than the prior 12 months reflecting broader construction-cycle dynamics. Specialist lenders remain engaged; the industry's fundamental economics stay favorable even through construction cycle variance. Fundable files continue to close at competitive terms."},
    ],
},

'812910': {
    slug: 'pet-care',
    industryNoun: "pet care",
    programsContext: {
        fits: {
            standard: "facility buildouts for boarding and daycare, acquisitions, multi-location expansion.",
            '504': "buying the facility real estate. Particularly valuable in pet care given zoning sensitivity around noise and animal housing.",
            small: "grooming equipment, minor buildouts, working capital under $500K.",
            equipment: "grooming tables, mobile unit outfitting. Faster than SBA.",
        },
    },
    h1: 'SBA Loans for Pet Care Businesses',
    title: 'SBA Loan for Pet Boarding, Grooming & Daycare 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) and 504 loans for pet care businesses — boarding, grooming, and training services. 2,865 SBA loans approved FY2020-2025 with strong performance and +11% YoY growth.',
    breadcrumbName: 'SBA Loans for Pet Care',
    campaignSlug: 'sba-pet-care-quiz',
    heroSub: 'Pet care businesses &mdash; boarding, grooming, daycare, and training &mdash; benefit from the same <strong>recession-resistant pet spending</strong> dynamic that makes <a class="inline" href="/sba-loans/veterinarians">veterinary SBA lending</a> the strongest industry category in the portfolio. Charge-offs run at 0.70%, roughly half the SBA average.',
    heroValue: 'Answer 6 questions. Get matched with pet-care-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps pet care business owners compare SBA 7(a) and 504 options and match with specialist lenders experienced in pet care facility underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate pet care business files',
        underwriting: `
            <p>Pet care SBA lending &mdash; boarding, grooming, daycare, training, and related services &mdash; sits in the same favorable structural territory as veterinary medicine (covered in our <a class="inline" href="/sba-loans/veterinarians">veterinary SBA guide</a>). Pet spending is non-discretionary in ways most consumer categories are not, and the franchise-heavy industry structure creates clearer underwriting patterns than many small-business categories.</p>
            <h3>Facility-heavy capital requirements</h3>
            <p>A boarding or daycare facility requires <strong>3,000 to 15,000 square feet</strong> depending on capacity, plus outdoor run space, dedicated bathing and grooming areas, climate control for animal welfare, and noise containment for neighbors. New facility buildouts run $400K to $1.5M in tenant improvements on top of any real estate acquisition. SBA 504 frequently handles the real estate portion while SBA 7(a) covers the operating business.</p>
            <h3>Franchise-heavy industry structure</h3>
            <p>Pet care is one of the most franchise-concentrated SBA categories at <strong>27.5% franchise participation</strong>. Established franchise concepts &mdash; Camp Bow Wow, Dogtopia, Pet Supplies Plus grooming, and multiple regional brands &mdash; provide brand-level underwriting shortcuts when listed in the SBA Franchise Directory. Franchise operations close faster and at higher approval rates than independent startups at comparable operator profiles.</p>
            <h3>Revenue mix and recurring service patterns</h3>
            <p>Lenders evaluate the mix across <strong>boarding</strong> (high margin, seasonal peaks around holidays), <strong>daycare</strong> (recurring weekly revenue, stable cash flow), <strong>grooming</strong> (recurring 4-8 week cycles, strong retention), and <strong>training</strong> (package-based, higher margin, variable cash flow). Daycare-heavy operations with recurring weekly clients underwrite with unusually predictable cash flow; pure boarding operations show more seasonal variance.</p>
            <h3>Distinct from veterinary medicine</h3>
            <p>Pet care businesses don&rsquo;t require veterinary licensure, which differentiates underwriting from veterinary practices. Some overlap exists &mdash; many boarding and daycare operations maintain veterinary relationships for emergency care or medicated boarding &mdash; but the businesses are economically distinct. See our <a class="inline" href="/sba-loans/veterinarians">SBA veterinary practice guide</a> for the veterinary-side mechanics.</p>
        `,
        indepTitle: 'Franchise dominance and independent alternatives',
        indep: `
            <p>Pet care is one of the most franchise-friendly SBA categories &mdash; <strong>{franchise_pct}% of pet care SBA loans are to franchise operators</strong>. Franchise brands provide operational playbooks (staff training, safety protocols, marketing systems) that new operators find valuable in a business where mistakes can have animal-welfare and liability consequences. Franchise-brand recognition also helps with local customer acquisition in a category where trust matters enormously.</p>
            <p>Independent pet care businesses also qualify for SBA financing and close routinely, but typically require stronger operator experience, clearer facility diligence, and a documented operational playbook to compensate for the lack of franchise infrastructure. First-time operators without pet care experience typically find franchise concepts easier to fund on SBA than independent startups.</p>
        `,
        failureTitle: 'Charge-off performance and +11% YoY growth',
        failure: `
            <p>Pet care charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio, roughly half the SBA average. The favorable performance reflects the same pet-spending-is-non-discretionary dynamics that drive veterinary performance, plus the stabilizing effect of franchise-industry structure on operational quality.</p>
            <p>The +11% YoY growth in SBA lending to pet care reflects the broader pet-industry expansion: pet ownership increased meaningfully through the pandemic, pet-spending grew even as general consumer spending weakened, and consolidation activity has created exit markets for independent operators. Corporate pet-care consolidators (PE-backed rollups in boarding/daycare) actively acquire independent operations at competitive valuations, which both pushes prices up and creates SBA-financed individual-buyer alternatives.</p>
            <p>For cross-reference: <a class="inline" href="/sba-loans/veterinarians">veterinary practices</a> show even stronger performance (0.18% charge-off, +40% YoY) with higher-dollar average deals. Pet care and veterinary are complementary categories with different underwriting but shared industry tailwinds.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your pet care service?",opts:[{v:"boarding",l:"Boarding / kennel"},{v:"daycare",l:"Daycare"},{v:"grooming",l:"Grooming"},{v:"training",l:"Training / behavior"},{v:"multi-service",l:"Multi-service facility"}]},
            {q:"What's your situation?",opts:[{v:"acquisition",l:"Acquiring an existing business"},{v:"franchise",l:"Opening or buying a franchise"},{v:"new-independent",l:"Opening new independent facility"},{v:"expansion",l:"Expanding current business"},{v:"established",l:"Established business needing capital"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Business purchase price"},{v:"buildout",l:"Facility buildout"},{v:"real-estate",l:"Facility real estate"},{v:"equipment",l:"Grooming equipment / tech"},{v:"multiple",l:"Multiple combined uses"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-759",l:"720-759"},{v:"760-plus",l:"760+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-250k",l:"Under $250K"},{v:"250k-750k",l:"$250K - $750K"},{v:"750k-1-5m",l:"$750K - $1.5M"},{v:"1-5m-plus",l:"$1.5M+"}]},
            {q:"Facility included in deal?",opts:[{v:"yes",l:"Yes, buying the facility"},{v:"lease",l:"No, lease arrangement"},{v:"unsure",l:"Not decided"}]},
        ],
        profiles: {
            A: {badge:"Strong acquisition candidate",headline:"Experienced operator acquiring established facility",body:"Experienced pet care operator acquiring an established business with stable client base is a favorable SBA file. The industry's favorable charge-off profile (0.70%, half the SBA average) and growing market dynamics make specialist lenders competitive on pricing. Plan 60-90 days to close.",ctaLabel:"Match with pet-care-experienced SBA lenders",utmContent:"profile-a-acquisition"},
            B: {badge:"Facility + business",headline:"504 for the facility, 7(a) for the business",body:"Deals including facility real estate use SBA 504 on the building at fixed long-term rates plus 7(a) for the operating business. Owning the facility is particularly valuable in pet care where zoning restrictions on noise and animal housing make relocations difficult. Combined closings 75-120 days.",ctaLabel:"Match with 504 + 7(a) pet care lenders",utmContent:"profile-b-facility"},
            C: {badge:"Franchise path",headline:"Franchise route streamlines underwriting",body:"Pet care is one of the most franchise-concentrated SBA categories. Brands like Camp Bow Wow, Dogtopia, and others provide operational playbooks and brand recognition that materially streamline SBA underwriting. See our SBA franchise guide for franchise-specific mechanics.",ctaLabel:"See SBA franchise details",utmContent:"profile-c-franchise",ctaUrl:"/sba-loans/franchise/"},
            D: {badge:"New independent facility",headline:"New independent facility — tighter file",body:"Starting a new independent pet care facility is the hardest SBA file in this category. Lenders want meaningful pet care experience on the team, detailed facility diligence, a ramp-period operating plan, and higher equity injection (15-25%). Franchise alternative often beats pure independent startup on SBA economics.",ctaLabel:"Get honest feedback from a pet care SBA specialist",utmContent:"profile-d-new-independent"},
        },
        scoringBody: `function score(a){var svc=a[0],sit=a[1],use=a[2],credit=a[3],amount=a[4],re=a[5];if(sit==='franchise')return 'C';if(sit==='new-independent')return 'D';if(re==='yes'||use==='real-estate')return 'B';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a pet boarding, daycare, or grooming business?",a:"Yes. Pet care is an active SBA 7(a) category — 2,865 loans approved FY2020-2025 covering boarding, grooming, daycare, and training businesses. Average pet care SBA loan was approximately $492,000. The industry's favorable charge-off profile (0.70%, roughly half the SBA average) makes specialist lenders competitive on pricing."},
        {q:"Is a franchise pet care business easier to finance with SBA?",a:"Typically yes. Pet care is one of the most franchise-concentrated SBA categories at 27.5% franchise participation. Established franchise concepts listed in the SBA Franchise Directory benefit from brand-level underwriting shortcuts and close faster than independent startups. Franchise operations are particularly favored for first-time operators who benefit from the brand's operational playbook."},
        {q:"What's the SBA charge-off rate for pet care businesses?",a:"Pet care SBA 7(a) charge-offs run at 0.70%, roughly half the all-industry SBA average of 1.36%. The favorable performance reflects non-discretionary pet spending patterns, franchise-industry structure that stabilizes operational quality, and recurring-service revenue patterns (daycare, grooming) that smooth cash flow."},
        {q:"How much can I borrow with an SBA loan for a pet care business?",a:"SBA 7(a) Standard goes up to $5 million; SBA 504 adds real estate capacity. Single-facility pet care acquisitions commonly run $400K to $1.5M without real estate and $1M to $3M with real estate. Grooming-only operations and mobile services typically run smaller ($100K to $500K) and often fit SBA 7(a) Small Loan."},
        {q:"What's the difference between pet care SBA loans and veterinary SBA loans?",a:"Pet care businesses (boarding, grooming, daycare, training) don't require veterinary licensure and operate economically distinct from veterinary practices. Veterinary practices have even stronger SBA performance (0.18% charge-off, +40% YoY) with higher-dollar deals averaging $1.2M. Some operations combine both — boarding facilities with medicated-boarding capability often maintain veterinary relationships. See our SBA veterinary practice guide for veterinary-side mechanics."},
        {q:"Should I buy the facility real estate for a pet care business?",a:"When possible, yes — SBA 504 was built for facility-heavy industries. Pet care is particularly zoning-sensitive: noise ordinances, animal-housing regulations, and outdoor-run setbacks make pet care facilities hard to relocate. Owning the facility protects against zoning changes or landlord conflicts. SBA 504 provides fixed long-term rates on the real estate; 7(a) covers the business."},
        {q:"Is pet care SBA lending growing?",a:"Yes. SBA 7(a) lending to pet care is up 11% year-over-year, reflecting broader pet-industry expansion: pet ownership grew through the pandemic, pet spending outpaced general consumer spending, and PE-backed consolidators actively acquire independent operations. Growth has been steadier than most consumer-services categories through the recent higher-rate cycle."},
    ],
},

'812199': {
    slug: 'personal-care',
    industryNoun: "personal care",
    programsContext: {
        fits: {
            standard: "medspa buildouts, salon acquisitions, multi-location expansion.",
            '504': "buying the facility real estate. Fixed long-term rates.",
            small: "equipment upgrades, smaller acquisitions, working capital under $500K.",
            equipment: "laser, body contouring, injection equipment. Often better match than SBA because equipment lifecycle (3-5 years) is shorter than SBA amortization.",
        },
    },
    h1: 'SBA Loans for Personal Care Businesses',
    title: 'SBA Loan for Medspa, Salon & Personal Care Business 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for personal care businesses — medspas, nail salons, skincare, wellness, and spa services. 3,617 SBA loans approved FY2020-2025 with 28% franchise participation.',
    breadcrumbName: 'SBA Loans for Personal Care',
    campaignSlug: 'sba-personal-care-quiz',
    heroSub: 'Personal care SBA lending covers medspas, salons, skincare, nail services, wellness, and adjacent personal services. The category is <strong>franchise-heavy (28%)</strong> and equipment-intensive in the high-growth medspa sub-vertical. Here&rsquo;s how lenders evaluate these files.',
    heroValue: 'Answer 6 questions. Get matched with personal-care-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps personal care business operators compare SBA 7(a) and 504 options and match with lenders experienced in medspa, salon, and wellness business underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate personal care business files',
        underwriting: `
            <p>The &ldquo;Other Personal Care Services&rdquo; NAICS category is broad &mdash; medspas, nail salons, skincare studios, tanning facilities, electrolysis, permanent makeup, massage (non-therapeutic), and adjacent personal care. The breadth means underwriting varies meaningfully by sub-vertical. A medspa with $500K in laser and injection equipment underwrites very differently from a 6-chair nail salon.</p>
            <h3>Sub-vertical matters more than NAICS</h3>
            <p>The dominant SBA personal care sub-verticals behave differently:</p>
            <ul style="margin:8px 0 14px 22px;font-size:15px;color:var(--text-secondary);line-height:1.75;">
                <li><strong>Medspas</strong> &mdash; high-ticket equipment (laser hair removal, body contouring, injection services), licensing complexity (medical director oversight often required), strongest growth signal in the category. Average deal size commonly $500K-$2M.</li>
                <li><strong>Nail and hair salons</strong> &mdash; lower ticket, recurring service revenue, cosmetology licensing for operator and staff, equipment replacement every 5-8 years. Average deal size $150K-$500K.</li>
                <li><strong>Skincare / facial studios</strong> &mdash; mid-ticket, esthetician licensing, retention-driven economics. Average deal size $100K-$400K.</li>
                <li><strong>Wellness / spa</strong> &mdash; varies widely from day spas to wellness centers, equipment complexity scales with service menu.</li>
            </ul>
            <p>Lenders evaluate the specific sub-vertical and adjust both collateral weighting and cash-flow underwriting accordingly.</p>
            <h3>Licensing picture varies by state and service</h3>
            <p>Most personal care services require cosmetology, esthetician, or nail-technician licensing for individual service providers. Medspas add a medical-oversight layer &mdash; most states require a licensed physician or mid-level practitioner as medical director for injection or laser services, with varying scope-of-practice rules. Lenders verify the licensing structure is compliant with state requirements before closing.</p>
            <h3>Equipment intensity in medspas specifically</h3>
            <p>Medspas are equipment-heavy. A well-equipped medspa runs <strong>$300K to $1M in laser, body-contouring, and injection equipment</strong>. Equipment serves as direct collateral on SBA loans and often as secondary collateral supporting balance-sheet strength for bonding or lease-term support. Equipment with rapid obsolescence (certain laser technologies refresh every 3-5 years) sometimes makes more sense on equipment financing than on SBA terms &mdash; a conversation worth having upfront with a specialist lender.</p>
        `,
        indepTitle: 'Franchise-heavy category with strong brand concepts',
        indep: `
            <p>Personal care is one of the most franchise-concentrated SBA categories at <strong>{franchise_pct}% franchise participation</strong>. Major brands in the SBA data span medspa concepts, salon franchises, wellness chains, and skincare brands. Franchises provide brand recognition, operational systems, and training that materially reduce operator risk for first-time entrants.</p>
            <p>Independent personal care businesses close on SBA routinely as well, but typically require stronger operator experience, clearer equipment documentation, and a defensible customer-acquisition plan. The franchise path is particularly attractive for operators moving into personal care from outside industries, while experienced cosmetologists and estheticians opening independent operations lean toward the independent path with strong operator-experience credit.</p>
        `,
        failureTitle: 'Charge-off performance and sub-vertical variance',
        failure: `
            <p>Personal care charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio, modestly better than average. The aggregate number masks meaningful sub-vertical variance: medspas with strong recurring-client bases perform well above average, while some lower-end salon concepts perform closer to average. Lenders specializing in personal care build sub-vertical-specific underwriting rather than applying a single template to the whole NAICS.</p>
            <p>What predicts the failures: <strong>location-dependent traffic assumptions that don&rsquo;t materialize</strong> (personal care is heavily foot-traffic-driven and a bad location choice is hard to recover from), <strong>key-stylist or key-practitioner departure</strong> (taking client book with them), and <strong>equipment obsolescence cycles</strong> that force refinancing at inopportune times. Specialist lenders address these risks in underwriting through lease-term review, non-compete structure, and equipment-replacement reserves.</p>
            <p>The +5% YoY growth in SBA lending to personal care is below the top-growth categories but reflects steady underlying demand. Medspa specifically is growing meaningfully faster than the category average, with injection-services demand and body-contouring interest driving both independent and franchise expansion.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your personal care business type?",opts:[{v:"medspa",l:"Medspa / injectables / laser"},{v:"salon-hair",l:"Hair salon"},{v:"salon-nail",l:"Nail salon"},{v:"skincare",l:"Skincare / facial studio"},{v:"wellness",l:"Wellness / spa / massage"},{v:"other",l:"Other personal care"}]},
            {q:"What's your situation?",opts:[{v:"acquisition",l:"Acquiring an existing business"},{v:"franchise",l:"Opening or buying a franchise"},{v:"new-independent",l:"Opening new independent business"},{v:"expansion",l:"Expanding current business"},{v:"equipment",l:"Equipment purchase for existing business"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Business purchase price"},{v:"buildout",l:"Space buildout"},{v:"equipment-use",l:"Equipment (laser, injection, salon)"},{v:"real-estate",l:"Real estate purchase"},{v:"multiple",l:"Multiple combined uses"}]},
            {q:"Your licensing / experience?",opts:[{v:"licensed-experienced",l:"Licensed practitioner, 5+ years"},{v:"licensed-new",l:"Licensed practitioner, under 5 years"},{v:"non-licensed-partner",l:"Non-practitioner with licensed operating partner"},{v:"non-licensed-new",l:"Non-practitioner entering the space"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-759",l:"720-759"},{v:"760-plus",l:"760+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-250k",l:"Under $250K"},{v:"250k-500k",l:"$250K - $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-plus",l:"$1M+"}]},
        ],
        profiles: {
            A: {badge:"Medspa / equipment-intensive path",headline:"Medspa deals attract competitive specialist pricing",body:"Medspa and equipment-intensive personal care deals have the strongest SBA underwriting in the category — equipment collateral, recurring-client revenue, and high per-service margins. Specialist lenders experienced with medspa licensing structures close these files routinely. Plan 60-90 days.",ctaLabel:"Match with medspa-experienced SBA lenders",utmContent:"profile-a-medspa"},
            B: {badge:"Salon / skincare acquisition",headline:"Standard salon and skincare SBA path",body:"Salon, skincare, and wellness acquisitions are standard SBA 7(a) files. The key variable is matching with a lender experienced with the specific sub-vertical — salon files and medspa files don't underwrite the same way. Plan 45-75 days for smaller deals, 60-90 for larger acquisitions.",ctaLabel:"Match with salon / skincare SBA lenders",utmContent:"profile-b-salon"},
            C: {badge:"Franchise path",headline:"Franchise route streamlines underwriting",body:"Personal care is one of the most franchise-concentrated SBA categories at 28% franchise participation. Brands provide operational systems and training that materially streamline underwriting. See our SBA franchise guide.",ctaLabel:"See SBA franchise details",utmContent:"profile-c-franchise",ctaUrl:"/sba-loans/franchise/"},
            D: {badge:"Experience / licensing gap",headline:"Strengthen the team structure before applying",body:"Non-practitioner operators entering personal care typically need a licensed operating partner on the ownership team, particularly for medspa and skincare sub-verticals where state licensing requirements are specific. Structure this upfront rather than getting declined mid-underwriting.",ctaLabel:"Get honest feedback from a personal care SBA specialist",utmContent:"profile-d-experience"},
        },
        scoringBody: `function score(a){var type=a[0],sit=a[1],use=a[2],lic=a[3],credit=a[4],amount=a[5];if(sit==='franchise')return 'C';if(lic==='non-licensed-new')return 'D';if(type==='medspa'||use==='equipment-use')return 'A';if(sit==='acquisition')return 'B';return 'B';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a medspa, salon, or personal care business?",a:"Yes. Personal care is an active SBA 7(a) category — 3,617 loans approved FY2020-2025 covering medspas, salons, skincare, wellness, and adjacent services. Average personal care SBA loan was approximately $355,000. The category is 28% franchise-participation, one of the most franchise-concentrated in SBA."},
        {q:"How do medspa SBA loans differ from salon SBA loans?",a:"Meaningfully. Medspas are equipment-heavy ($300K-$1M in laser and injection equipment), require medical-director oversight in most states, and have higher per-service margins. Average medspa SBA deal runs $500K-$2M. Salons (hair, nail) are lower-ticket, cosmetology-licensed, with deal sizes commonly $150K-$500K. Specialist lenders underwrite these sub-verticals differently rather than applying one template."},
        {q:"Do I need to be a licensed cosmetologist or esthetician to get an SBA loan?",a:"Not absolutely, but licensing is central to the business. Most personal care services require licensed practitioners for the actual service delivery. A non-practitioner owner typically needs a licensed operating partner or licensed managers on the team. Medspas specifically require a medical director (physician or mid-level practitioner) in most states. Lenders verify the licensing structure is compliant before closing."},
        {q:"What's the SBA charge-off rate for personal care businesses?",a:"Personal care SBA 7(a) charge-offs run at 1.22%, modestly better than the all-industry SBA average of 1.36%. The aggregate masks sub-vertical variance: medspas perform meaningfully above average, while some lower-end salon concepts run closer to the SBA aggregate. Specialist lenders build sub-vertical-specific underwriting."},
        {q:"Can I finance medspa equipment (laser, body contouring, injection) through SBA?",a:"Yes. SBA 7(a) covers medspa equipment as part of acquisitions or as standalone equipment loans via SBA 7(a) Small Loan (up to $500K). For equipment with rapid obsolescence (certain laser technologies refresh every 3-5 years), equipment financing (non-SBA) sometimes makes more sense than long-term SBA because the equipment lifecycle is shorter than the loan amortization. Worth discussing with a specialist lender upfront."},
        {q:"Is personal care SBA lending growing?",a:"Year-over-year personal care SBA lending is up about 5%, below the top-growth Angle 1 categories but reflecting steady underlying demand. Medspa specifically is growing faster than the aggregate — injection-services demand and body-contouring interest continue to drive both independent and franchise expansion. Salon categories are more mature with slower growth."},
        {q:"Should I buy the real estate for my personal care business?",a:"Depends on the sub-vertical. Medspas benefit meaningfully from facility ownership because buildout investment is substantial and relocations are expensive. Salon and skincare businesses are more location-flexible and frequently lease. SBA 504 supports the real estate path when it's the right call; SBA 7(a) funds the business operations in either case."},
    ],
},

'541211': {
    slug: 'cpas',
    industryNoun: "CPA firm",
    programsContext: {
        fits: {
            standard: "firm acquisitions (the dominant use), partner buyouts, multi-office consolidation.",
            '504': "buying the office real estate. Fixed long-term rates &mdash; less common given CPA firms are capital-light.",
            small: "technology investments, smaller book acquisitions, working capital under $500K.",
            equipment: "rarely used; CPA firm capital is almost entirely intangible (book of business, staff, technology subscriptions).",
        },
    },
    h1: 'SBA Loans for CPA Firms',
    title: 'SBA Loan for CPA Firm 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for CPA firm acquisitions and partner buyouts. 2,072 CPA firm SBA loans approved FY2020-2025 with 0.48% charge-off (0.35x SBA average). Take the 2-minute quiz.',
    breadcrumbName: 'SBA Loans for CPA Firms',
    campaignSlug: 'sba-cpas-quiz',
    heroSub: 'CPA firm SBA loans have one of the strongest underwriting profiles in the portfolio &mdash; a <strong>0.48% charge-off rate</strong>, roughly one-third the SBA average. The underlying economics mirror <a class="inline" href="/sba-loans/insurance-agencies">insurance agency lending</a>: recurring-client revenue, book-of-business valuation mechanics, partner-buyout structures.',
    heroValue: 'Answer 6 questions. Get matched with CPA-firm-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps CPA firm owners and buyers compare SBA 7(a) options and match with lenders experienced in professional-services practice acquisition underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate CPA firm files',
        underwriting: `
            <p>CPA firm SBA lending sits among the strongest-performing professional services categories in the SBA portfolio. Underwriting runs on <strong>recurring-client revenue math</strong> similar to <a class="inline" href="/sba-loans/insurance-agencies">insurance agency book-of-business valuation</a>: the asset being purchased is a client list with predictable renewal billings, not a traditional operating business. The 0.48% charge-off rate reflects how favorably lenders view this structure.</p>
            <h3>Book-of-business valuation</h3>
            <p>CPA firms are typically valued at <strong>0.9x to 1.4x annual revenue</strong> on the acquisition market, with variation driven by client mix (higher-margin tax and advisory vs. lower-margin bookkeeping), retention history, and partner dependency. Lenders underwrite the projected client retention curve (typically 85-95% annual retention on well-run firms) against the debt service coverage requirement. A firm with diversified client base and strong retention history underwrites meaningfully better than a firm with concentrated revenue from a few clients or heavy dependence on the selling partner.</p>
            <h3>Partner-buyout structures</h3>
            <p>Multi-partner firms commonly finance transitions through partial purchases &mdash; a partner buys out a retiring senior partner&rsquo;s interest through an SBA 7(a) loan, with the firm continuing under multi-partner ownership. The SBA&rsquo;s May 2023 partial-purchase rule update clarified these transactions qualify for 7(a) financing. Specialist lenders handle these routinely; see our <a class="inline" href="/sba-loans/business-acquisition">SBA acquisition mechanics guide</a> for the broader deal-structuring framework.</p>
            <h3>Q1 seasonal revenue concentration</h3>
            <p>CPA firms run concentrated revenue in Q1 tax season. Lenders recognize the pattern and structure loans with appropriate working capital for the remaining three quarters. Firms with advisory practice revenue (CFO services, wealth management, consulting) smooth the seasonal pattern meaningfully; pure tax-return-focused firms show more Q1 concentration that requires more explicit cash-flow planning in the loan structure.</p>
        `,
        indepTitle: 'Acquisition patterns and specialist lenders',
        indep: `
            <p>Franchise arrangements are essentially absent in CPA firms &mdash; <strong>{franchise_pct}% franchise participation</strong>. Dominant acquisition patterns: senior partner selling to a junior partner or senior associate, multi-partner firm transitioning a retiring partner&rsquo;s interest, or acquisition by a consolidating firm (CPA rollup activity is active). Live Oak Banking leads the CPA firm SBA lending category, with several other specialist lenders running dedicated professional-services lending programs.</p>
            <p>Generalist banks sometimes miss CPA firm underwriting entirely &mdash; the book-of-business mechanics don&rsquo;t resemble general SBA files, and lenders unfamiliar with the pattern either decline or price punitively. Specialist match is the biggest practical variable.</p>
        `,
        failureTitle: 'Why CPA firms outperform on charge-off',
        failure: `
            <p>CPA firm charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio. The favorable performance reflects <strong>recurring-client revenue</strong> (clients renew annually for tax, compliance, and advisory services), <strong>professional-licensing supply constraint</strong> (CPA licensure limits competitive pressure), and <strong>high switching costs</strong> (clients don&rsquo;t move CPAs casually). When loans do fail, causes cluster around <strong>client concentration collapse</strong> (major client leaves or reduces scope), <strong>partner-dependency risk</strong> (key partner exits and takes clients), or <strong>overpayment on acquisition multiples</strong> in the active consolidation market.</p>
            <p>The +25% YoY growth in SBA lending to CPA firms reflects ongoing partner-transition activity &mdash; an aging CPA partner demographic generates consistent acquisition deal flow, with individual-buyer CPAs competing against consolidator bids. SBA 7(a) is the dominant individual-buyer financing path.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?",opts:[{v:"associate-buying",l:"Associate CPA buying the firm"},{v:"partner-buyout",l:"Partner buying out a retiring partner"},{v:"acquisition",l:"Acquiring an outside firm"},{v:"expansion",l:"Expanding existing firm"},{v:"new-firm",l:"Starting a new firm"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Firm / book purchase price"},{v:"partner-interest",l:"Partner interest buyout"},{v:"real-estate",l:"Office real estate"},{v:"technology",l:"Technology / practice management"},{v:"multiple",l:"Multiple combined uses"}]},
            {q:"Your licensing and experience?",opts:[{v:"cpa-experienced",l:"Licensed CPA, 5+ years in public practice"},{v:"cpa-new",l:"Licensed CPA, under 5 years"},{v:"non-cpa-partner",l:"Non-CPA with licensed partner"},{v:"non-cpa-new",l:"Non-CPA / accountant entering space"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-759",l:"720-759"},{v:"760-plus",l:"760+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-250k",l:"Under $250K"},{v:"250k-500k",l:"$250K - $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-plus",l:"$1M+"}]},
            {q:"Firm client revenue mix?",opts:[{v:"diversified",l:"Diversified (tax + advisory + bookkeeping)"},{v:"tax-heavy",l:"Tax-prep heavy"},{v:"advisory-heavy",l:"Advisory / CFO services heavy"},{v:"na",l:"Not applicable / new firm"}]},
        ],
        profiles: {
            A: {badge:"Associate-to-owner path",headline:"Buying the firm you work at is the strongest file",body:"Licensed CPA buying the firm you're already part of is the lowest-risk professional-services SBA file type. Specialist lenders — Live Oak Banking leads the category — compete for these deals with competitive pricing and 45-75 day closes. Client retention during transition is the key variable and the file you know best.",ctaLabel:"Match with CPA-firm-experienced SBA lenders",utmContent:"profile-a-associate"},
            B: {badge:"Partner buyout",headline:"Partial-purchase SBA 7(a) is the path",body:"Partner buyouts qualify for SBA 7(a) since the May 2023 rule clarification. The underwriting differs from full acquisitions — lender evaluates both the firm's ongoing cash flow and the specific partner interest being purchased. See our SBA acquisition guide for broader mechanics.",ctaLabel:"Match with partner-buyout SBA specialists",utmContent:"profile-b-partner"},
            C: {badge:"Outside firm acquisition",headline:"Standard SBA 7(a) with specialist lender",body:"Acquiring a firm you're not currently part of requires more extensive client-retention diligence and typically includes a transition period with the selling partner. Specialist CPA SBA lenders handle the book-of-business valuation and partner-dependency analysis. Plan 60-90 days.",ctaLabel:"Match with CPA acquisition SBA lenders",utmContent:"profile-c-acquisition"},
            D: {badge:"New firm / non-CPA path",headline:"Strengthen the file structure before applying",body:"Starting a new CPA firm or acquiring without a licensed-CPA operating partner faces a harder SBA path. Lenders want licensed operator on the team and a defensible client-acquisition plan. Consider partnership with an experienced CPA or a structured mentorship arrangement.",ctaLabel:"Get honest feedback from a CPA-firm SBA specialist",utmContent:"profile-d-new-firm"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],lic=a[2],credit=a[3],amount=a[4],mix=a[5];if(lic==='non-cpa-new')return 'D';if(sit==='new-firm')return 'D';if(sit==='partner-buyout')return 'B';if(sit==='associate-buying')return 'A';if(sit==='acquisition')return 'C';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan to buy a CPA firm?",a:"Yes. CPA firm acquisitions are a primary SBA 7(a) use case — 2,072 loans approved FY2020-2025 with a 0.48% charge-off rate, roughly one-third the SBA average. Loans cover firm purchase price (book of business and goodwill), office buildout, practice management technology, and working capital. Since May 2023, partial purchases (partner buyouts) also qualify."},
        {q:"How are CPA firms typically valued?",a:"CPA firms commonly value at 0.9x to 1.4x annual revenue, with variation driven by client mix (tax and advisory revenue commands higher multiples than bookkeeping), retention history, and partner dependency. Lenders underwrite to projected client retention post-acquisition, typically 85-95% on well-run firms. A firm with diversified client base and strong retention underwrites better than a firm with concentrated revenue or heavy partner dependency."},
        {q:"Do I need to be a licensed CPA to buy a CPA firm?",a:"In most states yes, due to state accountancy board rules that restrict firm ownership to licensed CPAs or require a licensed-CPA majority. Non-CPA ownership in some states is allowed through specific structures with a licensed managing CPA. Lenders verify state-compliance of the ownership structure before closing."},
        {q:"What's the SBA charge-off rate for CPA firms?",a:"CPA firm SBA 7(a) charge-offs run at 0.48%, compared to the all-industry SBA average of 1.36% — roughly one-third the average. Favorable performance reflects recurring-client revenue, CPA licensure supply constraints, and high client switching costs."},
        {q:"How do partner buyouts work under SBA 7(a)?",a:"The SBA's May 2023 partial-purchase rule clarified that partner buyouts qualify for 7(a) financing. The transaction structures as: SBA 7(a) funds the purchase of the retiring partner's interest at closing; remaining partners continue ownership; buyer partner assumes the debt service. Lender underwrites against the firm's ongoing cash flow rather than just the buyer's individual income."},
        {q:"How does Q1 tax-season revenue concentration affect underwriting?",a:"Lenders recognize the seasonal pattern and structure working capital appropriately. CPA firms with advisory practice revenue (CFO services, wealth management, consulting) smooth the pattern meaningfully. Pure tax-return-focused firms show more Q1 concentration that requires more explicit cash-flow planning in the loan structure — typically 9-12 months of operating reserves on top of other working capital."},
        {q:"Is CPA firm SBA lending growing?",a:"Yes. Year-over-year CPA firm SBA lending is up 25%, reflecting ongoing partner-transition activity from an aging CPA partner demographic. Individual-buyer CPAs compete with consolidator bids for retiring-partner firms, and SBA 7(a) is the dominant individual-buyer financing path."},
    ],
},

'541219': {
    slug: 'accounting',
    industryNoun: "accounting services",
    programsContext: {
        fits: {
            standard: "book acquisitions, franchise tax-prep openings, multi-location expansion.",
            '504': "less commonly used &mdash; accounting services firms are capital-light.",
            small: "technology investments, small book acquisitions, working capital under $500K. The most common path in this category.",
            equipment: "rarely used; software subscriptions and computers dominate rather than physical equipment.",
        },
    },
    h1: 'SBA Loans for Accounting & Bookkeeping Firms',
    title: 'SBA Loan for Accounting, Bookkeeping & Tax Prep 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for accounting, bookkeeping, tax prep, and payroll firms. 1,722 SBA loans approved FY2020-2025 with +49% YoY growth — fastest-growing industry in the SBA dataset.',
    breadcrumbName: 'SBA Loans for Accounting & Bookkeeping',
    campaignSlug: 'sba-accounting-quiz',
    heroSub: 'Non-CPA accounting services &mdash; bookkeeping, payroll, tax preparation, accounting support &mdash; are the <strong>fastest-growing industry in the SBA dataset at +49% YoY</strong>. Smaller deals than CPA firms (median $110K vs. $270K), but the growth signal is real. Distinct from <a class="inline" href="/sba-loans/cpas">CPA firms</a>.',
    heroValue: 'Answer 6 questions. Get matched with accounting-services-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps accounting, bookkeeping, and tax-prep service operators compare SBA 7(a) options and match with lenders experienced in small professional-services underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate accounting services files',
        underwriting: `
            <p>The &ldquo;Other Accounting Services&rdquo; NAICS category covers bookkeeping, payroll services, tax preparation (non-CPA), and accounting support services &mdash; distinct from the <a class="inline" href="/sba-loans/cpas">CPA firm category (NAICS 541211)</a>. The audience tends to be small-business operators rather than licensed-professional firms, with smaller deal sizes and different underwriting patterns.</p>
            <h3>Smaller deals, different audience</h3>
            <p>Average accounting services SBA loan runs <strong>$301,000 with a median of $110,000</strong> &mdash; meaningfully smaller than CPA firm deals (median $270K) and reflective of the smaller-operator audience. Typical use cases: bookkeeper or tax preparer acquiring an established small book of clients, franchise tax-prep opening (Liberty Tax, Jackson Hewitt, H&amp;R Block franchise), or small accounting support service expansion.</p>
            <h3>The distinction from CPA firms matters</h3>
            <p>CPA firms require licensed CPA ownership in most states and operate under state accountancy board regulation. Non-CPA accounting services (this category) don&rsquo;t have the licensing barrier &mdash; the operator provides bookkeeping, payroll processing, or non-CPA tax preparation that doesn&rsquo;t require CPA licensure. Revenue per client is lower, client count is typically higher, and the economics lean toward <strong>recurring-billing patterns on bookkeeping accounts</strong> or <strong>seasonal volume patterns on tax prep</strong>.</p>
            <h3>Equipment and capital needs are minimal</h3>
            <p>Accounting services businesses are capital-light: office space, computers, software subscriptions (QuickBooks, Xero, tax software). SBA loans primarily fund client-book acquisitions and working capital rather than equipment. The small average loan size reflects this; SBA 7(a) Small Loan (up to $500K) covers the bulk of deals in this category.</p>
        `,
        indepTitle: 'Independent operators and the growth signal',
        indep: `
            <p>Franchise participation is low at <strong>{franchise_pct}% of accounting services SBA loans</strong>. Major franchise concepts exist (Liberty Tax, Jackson Hewitt, H&amp;R Block franchising) but much of the franchise-tax category is owner-operator rather than SBA-financed. The independent operator segment dominates SBA lending in this NAICS.</p>
            <p>The +49% YoY growth in SBA lending to this category is <strong>the fastest growth in the entire SBA industry dataset we track</strong>. The trajectory is also accelerating: trailing 12-month volume is up 6% from the prior 12 months, suggesting the growth isn&rsquo;t just a one-year anomaly. The dynamic reflects small-business services consolidation &mdash; bookkeepers and tax preparers building client books through acquisition of retiring operators.</p>
        `,
        failureTitle: 'Growth signal + moderate charge-off performance',
        failure: `
            <p>Accounting services charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio, about half the SBA average. Meaningfully better than the cross-industry baseline, though not as strong as the CPA firm category (0.35x ratio). The difference reflects the less-licensed audience and the higher prevalence of smaller single-operator businesses in this category.</p>
            <p>What predicts failure: <strong>client concentration</strong> (one or two large accounting clients leaving triggers a revenue collapse the small business can&rsquo;t absorb), <strong>seasonal tax-prep operations misjudging cash flow</strong> through the off-season, and <strong>overpayment on client-book acquisitions</strong> in competitive small-market deals. Specialist lenders address these risks in underwriting through client-diversification review and working-capital sizing.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your service type?",opts:[{v:"bookkeeping",l:"Bookkeeping services"},{v:"payroll",l:"Payroll services"},{v:"tax-prep",l:"Tax preparation"},{v:"accounting-support",l:"Accounting / advisory support"},{v:"mixed",l:"Multi-service practice"}]},
            {q:"What's your situation?",opts:[{v:"acquisition",l:"Acquiring an existing book"},{v:"franchise",l:"Opening a franchise (tax prep)"},{v:"expansion",l:"Expanding current business"},{v:"new",l:"Starting a new business"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Book / business purchase price"},{v:"technology",l:"Technology / software investment"},{v:"working-capital",l:"Working capital / seasonal bridging"},{v:"office",l:"Office buildout"},{v:"multiple",l:"Multiple combined uses"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-759",l:"720-759"},{v:"760-plus",l:"760+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-100k",l:"Under $100K"},{v:"100k-250k",l:"$100K - $250K"},{v:"250k-500k",l:"$250K - $500K"},{v:"500k-plus",l:"$500K+"}]},
            {q:"Your experience?",opts:[{v:"5-plus",l:"5+ years in accounting / bookkeeping"},{v:"under-5",l:"Under 5 years experience"},{v:"cpa",l:"Licensed CPA (consider CPA firm page)"},{v:"new-industry",l:"New to accounting services"}]},
        ],
        profiles: {
            A: {badge:"Book acquisition sweet spot",headline:"Experienced operator acquiring established client book",body:"Experienced bookkeeper, payroll operator, or tax preparer acquiring a book from a retiring operator is the strongest accounting-services SBA file. SBA 7(a) Small Loan handles most deals in this category efficiently. Plan 45-75 days to close.",ctaLabel:"Match with accounting-services-experienced SBA lenders",utmContent:"profile-a-book"},
            B: {badge:"Franchise tax-prep path",headline:"Franchise tax-prep benefits from brand underwriting",body:"Franchise tax-prep operators (Liberty Tax, Jackson Hewitt, H&R Block franchising) benefit from brand-level underwriting shortcut if listed in SBA Franchise Directory. See SBA franchise details for specific mechanics.",ctaLabel:"See SBA franchise details",utmContent:"profile-b-franchise",ctaUrl:"/sba-loans/franchise/"},
            C: {badge:"Consider CPA firm path",headline:"Licensed CPA? Different SBA category applies",body:"Licensed CPAs acquiring CPA firms should see our SBA CPA firm guide — NAICS 541211 has meaningfully different underwriting dynamics, larger average deal size, and stronger charge-off performance than this category. The dominant SBA lenders also differ.",ctaLabel:"See SBA CPA firm details",utmContent:"profile-c-cpa",ctaUrl:"/sba-loans/cpas/"},
            D: {badge:"New business / experience gap",headline:"Starting new or entering the industry",body:"Starting a new accounting services business or entering the industry without direct experience faces a harder SBA path. Working capital sizing and client-acquisition plan are the critical file components. Consider acquisition of a small existing book as an alternative entry point.",ctaLabel:"Get honest feedback from an accounting-services SBA specialist",utmContent:"profile-d-new"},
        },
        scoringBody: `function score(a){var svc=a[0],sit=a[1],use=a[2],credit=a[3],amount=a[4],exp=a[5];if(exp==='cpa')return 'C';if(sit==='franchise')return 'B';if(sit==='new'||exp==='new-industry')return 'D';return 'A';}`,
    },
    faqs: [
        {q:"What's the difference between the SBA CPA firm and accounting services categories?",a:"The SBA CPA firm category (NAICS 541211) covers licensed-CPA firms regulated by state accountancy boards. The accounting services category (NAICS 541219) covers non-CPA services — bookkeeping, payroll, tax preparation without CPA credentials, accounting support. Average CPA firm SBA loan is $490K; average accounting services loan is $301K. Charge-off performance and lender dynamics differ meaningfully. See our separate CPA firm guide."},
        {q:"Can I get an SBA loan for a bookkeeping or tax prep business?",a:"Yes. Accounting services is one of the fastest-growing SBA categories at +49% YoY. SBA 7(a) covers acquisitions of client books, franchise tax-prep openings, and working capital for seasonal tax operations. Average loan size is smaller than CPA firm deals — median $110K — reflecting the smaller-operator audience."},
        {q:"How much can I borrow for a bookkeeping or tax prep business?",a:"Most accounting services SBA deals fall in the $100K to $500K range, handled by SBA 7(a) Small Loan. Larger multi-location operations or established payroll services can reach $1M+. Average loan across the category FY2020-2025 was $301,000."},
        {q:"Do I need to be certified for an SBA loan for accounting services?",a:"No certification is required for most bookkeeping, payroll, and non-CPA tax-prep services. Operators typically hold professional experience credentials (years in the industry, QuickBooks certification, Enrolled Agent status for tax preparers) that lenders weigh in underwriting. For CPA firm ownership, state accountancy board licensing applies — see our CPA firm guide."},
        {q:"What's the SBA charge-off rate for accounting services?",a:"Accounting services SBA 7(a) charge-offs run at 0.70%, roughly half the all-industry SBA average of 1.36%. Meaningfully better than cross-industry baseline, though not as strong as the CPA firm category (0.48%). The difference reflects less-licensed audience and higher prevalence of smaller single-operator businesses."},
        {q:"Is this SBA lending category really growing that fast?",a:"Yes. +49% year-over-year growth is the fastest in the SBA industry dataset we track. Trailing 12-month volume is also up 6% from the prior 12 months, suggesting the growth is sustained rather than a one-year anomaly. Dynamic reflects small-business services consolidation as established bookkeepers and tax preparers sell books to younger operators."},
        {q:"How do seasonal tax-prep operations handle cash flow?",a:"Tax preparation concentrates revenue in Q1 (January through April), with volume falling meaningfully through the rest of the year. Specialist lenders size working capital into the loan structure to cover 6-9 months of off-season operating costs. Tax-prep operators that maintain year-round bookkeeping or payroll service revenue smooth the seasonal pattern, which lenders view favorably."},
    ],
},

'811121': {
    slug: 'auto-body',
    industryNoun: "auto body",
    programsContext: {
        fits: {
            standard: "shop acquisitions, spray-booth or frame-machine upgrades, DRP capacity builds.",
            '504': "buying the shop real estate. Fixed long-term rates &mdash; important in auto body where facility infrastructure (ventilation, filtration) is built in.",
            small: "equipment upgrades, ADAS calibration tooling, working capital under $500K.",
            equipment: "spray booths, frame machines, ADAS recalibration equipment. Faster than SBA when DRP certification timelines require new equipment quickly.",
        },
    },
    h1: 'SBA Loans for Auto Body Shops',
    title: 'SBA Loan for Auto Body & Collision Repair 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) and 504 loans for auto body and collision repair shops. 1,767 SBA loans approved FY2020-2025 with +23% YoY growth. DRP relationships with insurance carriers drive the revenue foundation.',
    breadcrumbName: 'SBA Loans for Auto Body',
    campaignSlug: 'sba-auto-body-quiz',
    heroSub: 'Auto body and collision repair SBA lending is distinct from <a class="inline" href="/sba-loans/auto-repair">general mechanical auto repair</a>: higher capital intensity, DRP (Direct Repair Program) relationships with insurance carriers as the revenue foundation, and <strong>+23% YoY growth</strong> with trailing-12 still accelerating.',
    heroValue: 'Answer 6 questions. Get matched with collision-repair-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps auto body and collision repair shop owners compare SBA 7(a) and 504 options and match with lenders experienced in body-shop underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate auto body shop files',
        underwriting: `
            <p>Auto body SBA underwriting differs meaningfully from <a class="inline" href="/sba-loans/auto-repair">general auto repair</a>. Collision shops carry more specialized equipment, operate on insurance-paid revenue rather than consumer cash-pay, and rely heavily on insurance-carrier relationships for deal flow. The 0.85% charge-off rate reflects favorable underlying economics that lenders recognize.</p>
            <h3>Equipment-heavy and high-capital</h3>
            <p>A modern auto body shop requires <strong>$500K to $1.5M in specialized equipment</strong>: spray booths with proper ventilation and paint filtration, frame machines, paint mixing systems, welding equipment rated for modern unibody construction, aluminum repair equipment (separate from steel for many newer vehicles), and diagnostic tools for ADAS (advanced driver assistance systems) recalibration. Equipment value underwrites as strong collateral; recovery on defaulted body shop loans is typically stronger than mechanical repair because the equipment is more specialized and less resellable piecemeal.</p>
            <h3>DRP relationships are the revenue foundation</h3>
            <p>Direct Repair Program relationships with insurance carriers (State Farm, Progressive, GEICO, Allstate, and others) drive <strong>50-80% of revenue</strong> at most SBA-scale body shops. DRP certification is carrier-specific and involves passing equipment audits, technician certification requirements (I-CAR training), and performance metrics (cycle time, customer satisfaction). Lenders evaluate which DRP relationships will transfer through an acquisition and what carrier-certification work will be needed post-close.</p>
            <h3>Technician certification requirements</h3>
            <p>I-CAR certification for technicians is effectively required for DRP participation at most carriers. OEM-specific certifications (aluminum Ford F-150 repair, Tesla body certification, etc.) open higher-margin work. Lenders want to understand the current certification mix and any certification work needed for the business plan post-acquisition.</p>
            <h3>Growing faster than general auto repair</h3>
            <p>Auto body is growing faster than general auto repair &mdash; <strong>+23% YoY vs. general auto repair&rsquo;s +27%</strong>, and trailing-12 volume is still <em>accelerating</em> (+5.8%) unlike general auto repair which is softening. The dynamic reflects increased collision complexity (ADAS adds work per claim) and the aging vehicle fleet driving more repair activity.</p>
        `,
        indepTitle: 'Independent shops and franchise concepts',
        indep: `
            <p>Franchise operators represent <strong>{franchise_pct}% of auto body SBA loans</strong> &mdash; moderate. Common franchise brands include Maaco, CARSTAR, Fix Auto, and several regional concepts. Franchise operations benefit from brand-level underwriting efficiency and established insurance-carrier relationships. Most auto body deals are independent.</p>
            <p>Typical acquisition patterns: shop manager buying out owner, multi-generation family transition, or consolidator acquisition (collision-repair consolidation is active, with Caliber Collision, Service King, Gerber and others rolling up independents). SBA 7(a) is the dominant individual-buyer financing path, frequently structured with SBA 504 when real estate is included.</p>
        `,
        failureTitle: 'Charge-off performance and the collision-specific risk pattern',
        failure: `
            <p>Auto body charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio, meaningfully better than average. Equipment collateral and insurance-paid revenue keep recovery strong when loans fail. What predicts the failures: <strong>DRP relationship loss</strong> (carrier pulls direct-repair certification), <strong>equipment obsolescence</strong> in rapidly evolving repair technologies (aluminum, EV, ADAS), and <strong>facility-constrained cycle time</strong> that can&rsquo;t keep up with volume growth.</p>
            <p>The practical implication: specialist lenders with body-shop experience recognize the DRP dynamics that generalist lenders often miss. Live Oak and other specialist banks structure deals that account for carrier-certification risk and equipment-refresh cycles; generalist banks sometimes under-weight these factors entirely.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?",opts:[{v:"acquisition",l:"Acquiring an existing shop"},{v:"new",l:"Starting a new shop"},{v:"expansion",l:"Expanding current business"},{v:"equipment",l:"Equipment upgrade / replacement"},{v:"drp-expansion",l:"Building DRP capacity"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Shop purchase price"},{v:"equipment-use",l:"Spray booth / frame / paint systems"},{v:"real-estate",l:"Facility real estate"},{v:"certification",l:"I-CAR / OEM certification expansion"},{v:"multiple",l:"Multiple combined uses"}]},
            {q:"Your experience?",opts:[{v:"experienced-owner",l:"5+ years owning / managing body shops"},{v:"i-car-tech",l:"I-CAR certified technician"},{v:"non-tech-partner",l:"Non-technical with certified partner"},{v:"limited",l:"Limited collision-repair experience"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-759",l:"720-759"},{v:"760-plus",l:"760+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-500k",l:"Under $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-2m",l:"$1M - $2M"},{v:"2m-plus",l:"$2M+"}]},
            {q:"DRP relationships?",opts:[{v:"multiple-drp",l:"Multiple carrier DRP relationships"},{v:"single-drp",l:"Single carrier DRP"},{v:"no-drp",l:"No current DRP / building"},{v:"na",l:"Not applicable / new shop"}]},
        ],
        profiles: {
            A: {badge:"Strong acquisition candidate",headline:"Experienced operator acquiring DRP-certified shop",body:"Experienced body shop operator acquiring an established shop with multiple DRP relationships is a favorable SBA file. Equipment collateral, insurance-paid revenue, and established carrier relationships stack well. Plan 60-90 days with a body-shop-experienced SBA lender.",ctaLabel:"Match with body-shop-experienced SBA lenders",utmContent:"profile-a-acquisition"},
            B: {badge:"Facility + shop",headline:"504 for the facility, 7(a) for the business",body:"Deals including facility real estate use SBA 504 for the building at fixed long-term rates plus 7(a) for the operating business. Body shops are facility-intensive (spray booths require specific ventilation infrastructure) — owning the facility stabilizes long-term economics.",ctaLabel:"Match with 504 + 7(a) body shop lenders",utmContent:"profile-b-facility"},
            C: {badge:"Equipment / certification build",headline:"SBA 7(a) for equipment and DRP expansion",body:"Equipment upgrades (ADAS calibration, aluminum repair, EV certification) and DRP-expansion investments qualify for SBA 7(a). For equipment-only deals, non-SBA equipment financing often beats SBA on speed. Specialist lenders structure combined equipment + working capital efficiently.",ctaLabel:"Compare equipment financing vs. SBA",utmContent:"profile-c-equipment"},
            D: {badge:"Experience gap",headline:"Strengthen operator profile before applying",body:"Limited collision-repair experience on larger deals is the hardest body shop SBA file. Lenders want I-CAR certified operator on the team or documented management agreement with a certified shop lead. Have this conversation upfront.",ctaLabel:"Get honest feedback from a body shop SBA specialist",utmContent:"profile-d-experience"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],exp=a[2],credit=a[3],amount=a[4],drp=a[5];if(exp==='limited'&&(amount==='1m-2m'||amount==='2m-plus'))return 'D';if(use==='real-estate'||use==='multiple'&&amount==='2m-plus')return 'B';if(sit==='equipment'||use==='equipment-use'||use==='certification')return 'C';if(sit==='acquisition'&&(exp==='experienced-owner'||exp==='i-car-tech'))return 'A';return 'A';}`,
    },
    faqs: [
        {q:"What's different about auto body SBA loans vs. general auto repair?",a:"Auto body shops are more equipment-intensive ($500K-$1.5M in specialized equipment vs. $200K-$800K for general auto repair), operate on insurance-paid revenue through DRP relationships rather than consumer cash-pay, and have higher average loan size. Charge-off performance is similar (0.85% vs. 1.00% for general auto repair) but the underwriting focuses on different risk factors: DRP relationship quality, technician certifications, and equipment-refresh cycles. See our general auto repair SBA guide for mechanical-repair underwriting."},
        {q:"How important are DRP relationships in SBA underwriting?",a:"Very important. Direct Repair Program relationships with insurance carriers drive 50-80% of revenue at most SBA-scale body shops. Lenders evaluate which DRP certifications the shop currently holds, which will transfer through an acquisition, and what certification work is planned post-close. Loss of a major DRP relationship can trigger meaningful revenue impact, which lenders size into the underwriting."},
        {q:"Do I need I-CAR certification to get an SBA loan for a body shop?",a:"Not strictly for the loan, but effectively required to maintain DRP participation at most carriers. Lenders want to see I-CAR certified technicians on the team — either the owner-operator directly or documented management/staff certifications. Non-certified owners typically need a documented management agreement with a certified shop lead."},
        {q:"How much can I borrow with an SBA loan for an auto body shop?",a:"SBA 7(a) Standard goes up to $5 million; SBA 504 adds capacity for real estate. Average auto body SBA loan FY2020-2025 was $565,000. Most single-shop acquisitions with real estate run $1M to $3M; without real estate, $500K to $1.5M is typical. Equipment-focused upgrades commonly run $100K to $500K."},
        {q:"What's the SBA charge-off rate for auto body shops?",a:"Auto body SBA 7(a) charge-offs run at 0.85%, meaningfully better than the all-industry SBA average of 1.36%. Equipment collateral and insurance-paid revenue keep recovery strong when loans fail. Main risk factors: DRP relationship loss, equipment obsolescence in rapidly evolving repair technologies (aluminum, EV, ADAS), and facility-constrained cycle time."},
        {q:"Is auto body SBA lending growing?",a:"Yes. Year-over-year SBA lending to auto body is up about 23%, with trailing 12-month volume still accelerating unlike general auto repair which has softened. Dynamics include increased collision complexity (ADAS adds work per claim), aging vehicle fleet driving more repair activity, and active consolidator activity creating exit markets for independent operators."},
        {q:"Should I buy the real estate for my body shop?",a:"When possible, yes — SBA 504 was built for exactly that use case. Body shops are facility-intensive because spray booths require specific ventilation, filtration, and environmental controls built into the facility. Relocating is expensive and disruptive. Owning the facility stabilizes long-term economics."},
    ],
},

'621310': {
    slug: 'chiropractors',
    industryNoun: "chiropractic practice",
    programsContext: {
        fits: {
            standard: "practice acquisitions (the dominant use), clinic buildouts, multi-location expansion.",
            '504': "buying the clinic real estate. Fixed long-term rates.",
            small: "equipment upgrades, therapy equipment, working capital under $500K. Most chiropractic deals fit this category given smaller average size.",
            equipment: "adjusting tables, X-ray, therapy equipment. Faster than SBA.",
        },
    },
    h1: 'SBA Loans for Chiropractic Practices',
    title: 'SBA Loan for Chiropractic Practice 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for chiropractic practice acquisitions, buildouts, and equipment. 2,994 chiropractic SBA loans approved FY2020-2025 with 1.00% charge-off (0.74x SBA average).',
    breadcrumbName: 'SBA Loans for Chiropractors',
    campaignSlug: 'sba-chiropractors-quiz',
    heroSub: 'Chiropractic practice SBA lending shares acquisition dynamics with <a class="inline" href="/sba-loans/physicians">physician</a> and <a class="inline" href="/sba-loans/dentists">dental</a> practices &mdash; three categories form the core &ldquo;healthcare practice&rdquo; SBA cluster. Chiropractic deal sizes run smaller (median $150K vs. $270K+ for dental and physician) with distinct practice-acquisition patterns.',
    heroValue: 'Answer 6 questions. Get matched with chiropractic-practice-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps chiropractors compare SBA 7(a) options and match with lenders experienced in chiropractic practice acquisition underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate chiropractic practice files',
        underwriting: `
            <p>Chiropractic practice SBA underwriting sits between <a class="inline" href="/sba-loans/dentists">dental</a> and <a class="inline" href="/sba-loans/physicians">physician</a> practice profiles. The three categories share core dynamics &mdash; recurring-patient revenue, licensed-professional barrier to entry, practice-acquisition as the dominant use case &mdash; but chiropractic has meaningfully smaller average deal sizes and a different payer-mix dynamic.</p>
            <h3>Smaller deal sizes than other healthcare practices</h3>
            <p>Average chiropractic SBA loan is <strong>$267,000 with a median of $150,000</strong> &mdash; roughly one-third the average dental practice deal ($910K) and half the average physician practice deal ($602K). The smaller scale reflects lower equipment intensity (chiropractic tables, X-ray equipment, and activator instruments are meaningfully cheaper than dental imaging or physician practice equipment) and typically smaller staff counts.</p>
            <h3>Practice acquisition dominates</h3>
            <p>Like dental and physician practices, chiropractic SBA deals are overwhelmingly acquisitions: associate chiropractor buying the practice they work at, or acquiring an established practice from a retiring chiropractor. The associate-to-owner transition is the favorable-risk pattern lenders prefer because the buyer knows the patient base, staff, and local market before closing.</p>
            <h3>Payer mix differs meaningfully</h3>
            <p>Chiropractic practices typically see <strong>more cash-pay and more workers&rsquo; compensation / personal injury (PI) revenue</strong> than other healthcare practices. Commercial insurance participation varies by state and by insurance plan. Lenders evaluate the payer mix carefully &mdash; high PI concentration can be strong revenue but volatile, while strong workers&rsquo; comp relationships provide stability.</p>
            <h3>Professional corporation requirements</h3>
            <p>Chiropractic practices operate as professional corporations (PC) or professional LLCs in most states, with restrictions on non-chiropractor ownership. State rules vary; lenders verify state-compliant ownership structure before closing.</p>
        `,
        indepTitle: 'Acquisition patterns and franchise activity',
        indep: `
            <p>Franchise arrangements represent <strong>{franchise_pct}% of chiropractic SBA loans</strong> &mdash; meaningful but minority. The Joint Chiropractic and several regional franchise concepts drive this share; The Joint specifically has grown rapidly as a membership-based chiropractic model. Franchise operations close SBA deals routinely when listed in the SBA Franchise Directory.</p>
            <p>Independent chiropractic practices are the bulk of SBA deals. Typical pattern: associate chiropractor buys the practice of the senior chiropractor they&rsquo;ve been working with, with SBA 7(a) funding the purchase price plus transition working capital. See our <a class="inline" href="/sba-loans/physicians">physician practice</a> and <a class="inline" href="/sba-loans/dentists">dental practice</a> guides for comparable transition-pattern mechanics.</p>
        `,
        failureTitle: 'Charge-off performance in context',
        failure: `
            <p>Chiropractic practice charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio, modestly better than average. Not as strong as dental (0.20x) or physician (0.50x) practice categories but still meaningfully better than the SBA baseline. The difference reflects the smaller-scale businesses in this category and the more variable payer mix.</p>
            <p>What predicts the failures: <strong>PI payer concentration collapse</strong> (changes in state workers&rsquo; comp or auto insurance laws reduce PI referral flow), <strong>solo-practitioner dependence</strong> (practices tightly tied to one chiropractor face transition risk), and <strong>local-market competition</strong> (chiropractic is less supply-constrained than dental or physician, allowing faster new-entrant competition). The +13% YoY growth reflects steady partner-transition activity across both independent and franchise models.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?",opts:[{v:"associate-buying",l:"Associate buying current practice"},{v:"acquisition",l:"Acquiring an established practice"},{v:"new-practice",l:"Starting a new practice"},{v:"expansion",l:"Expanding current practice"},{v:"franchise",l:"Opening or buying a franchise"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Practice purchase price"},{v:"equipment-use",l:"Tables, X-ray, therapy equipment"},{v:"buildout",l:"Office buildout"},{v:"real-estate",l:"Real estate purchase"},{v:"multiple",l:"Multiple combined uses"}]},
            {q:"Your licensing?",opts:[{v:"licensed-experienced",l:"Licensed DC, 5+ years practicing"},{v:"licensed-new",l:"Licensed DC, under 5 years"},{v:"non-dc-partner",l:"Non-DC with licensed operating partner"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-759",l:"720-759"},{v:"760-plus",l:"760+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-150k",l:"Under $150K"},{v:"150k-350k",l:"$150K - $350K"},{v:"350k-750k",l:"$350K - $750K"},{v:"750k-plus",l:"$750K+"}]},
            {q:"Payer mix?",opts:[{v:"diversified",l:"Diversified (cash + insurance + PI + WC)"},{v:"pi-heavy",l:"Personal injury / workers comp heavy"},{v:"cash-heavy",l:"Cash-pay / membership heavy"},{v:"na",l:"Not applicable / new practice"}]},
        ],
        profiles: {
            A: {badge:"Associate-to-owner sweet spot",headline:"Associate buying current practice — favorable file",body:"Licensed chiropractor buying the practice you're already part of is the lowest-risk chiropractic SBA file. Plan 45-75 days with a chiropractic-practice-experienced SBA lender. Smaller deal sizes relative to dental or physician practices often mean faster underwriting and closing.",ctaLabel:"Match with chiropractic-practice-experienced SBA lenders",utmContent:"profile-a-associate"},
            B: {badge:"Practice acquisition",headline:"Acquiring an outside practice",body:"Acquiring an established practice you're not currently part of is a standard chiropractic SBA deal. Plan 60-90 days with attention to payer-mix review and transition-period structure with the selling chiropractor.",ctaLabel:"Match with chiropractic acquisition SBA lenders",utmContent:"profile-b-acquisition"},
            C: {badge:"Franchise path",headline:"The Joint and other franchise concepts",body:"Franchise chiropractic models like The Joint Chiropractic benefit from brand-level underwriting shortcut if listed in SBA Franchise Directory. See our SBA franchise guide.",ctaLabel:"See SBA franchise details",utmContent:"profile-c-franchise",ctaUrl:"/sba-loans/franchise/"},
            D: {badge:"New practice path",headline:"New chiropractic practice — plan for ramp",body:"Starting a new chiropractic practice faces a harder SBA path than acquisition. Lenders want itemized equipment list, patient-acquisition plan, and working capital for 6-12 months of patient-ramp. Partnership with an existing practice often beats pure startup.",ctaLabel:"Get honest feedback from a chiropractic SBA specialist",utmContent:"profile-d-new-practice"},
        },
        scoringBody: `function score(a){var sit=a[0],use=a[1],lic=a[2],credit=a[3],amount=a[4],payer=a[5];if(sit==='franchise')return 'C';if(sit==='new-practice')return 'D';if(sit==='associate-buying')return 'A';if(sit==='acquisition')return 'B';return 'A';}`,
    },
    faqs: [
        {q:"Can I get an SBA loan for a chiropractic practice?",a:"Yes. Chiropractic is an active SBA 7(a) category — 2,994 loans approved FY2020-2025. SBA 7(a) covers practice acquisitions, office buildout, equipment (tables, X-ray, therapy equipment), and working capital. Average chiropractic SBA loan was $267,000 with a median of $150,000."},
        {q:"How does chiropractic SBA underwriting differ from dental or physician practices?",a:"Chiropractic deals are meaningfully smaller — average $267K vs. $910K for dental and $602K for physician practices — reflecting lower equipment intensity and typically smaller staff. Payer mix differs: chiropractic sees more cash-pay, workers' comp, and personal injury revenue than dental or physician. Charge-off performance is modestly worse (1.00% vs. 0.27% dental, 0.68% physician) but still better than the SBA average of 1.36%. See our SBA dental practice and physician practice guides for those specific underwriting patterns."},
        {q:"Do I need to be a licensed chiropractor to buy a chiropractic practice?",a:"In most states yes, due to state chiropractic practice acts that restrict practice ownership to licensed chiropractors. Some states allow ownership through specific corporate structures with licensed managing chiropractors. Lenders verify state-compliant ownership structure before closing."},
        {q:"How does payer mix affect chiropractic SBA underwriting?",a:"Lenders evaluate the split across cash-pay / membership, commercial insurance, workers' compensation, and personal injury (PI). High PI concentration can be strong revenue but volatile — state law changes affecting auto insurance or workers' comp can meaningfully reduce PI referral flow. Diversified payer mix underwrites better than heavily concentrated PI or commercial-only revenue."},
        {q:"What's the SBA charge-off rate for chiropractic practices?",a:"Chiropractic SBA 7(a) charge-offs run at 1.00%, modestly better than the all-industry SBA average of 1.36%. Not as favorable as dental (0.27%) or physician (0.68%) practices but still better than the broader SBA baseline. Difference reflects smaller-scale businesses, more variable payer mix, and less supply-side constraint than dental or physician categories."},
        {q:"Can I finance chiropractic equipment through SBA?",a:"Yes. SBA 7(a) covers chiropractic equipment either as part of a larger acquisition package or as a standalone equipment loan via SBA 7(a) Small Loan (up to $500K). Equipment intensity in chiropractic is lower than dental or physician practices — typical equipment investment runs $50K to $150K."},
        {q:"Is chiropractic SBA lending growing?",a:"Yes. Year-over-year SBA lending to chiropractic practices is up about 13%, though trailing 12-month volume is modestly softer than the prior 12 months. Both independent practice transitions and franchise models (The Joint Chiropractic particularly) contribute to steady deal flow."},
    ],
},

'812112': {
    slug: 'beauty-salons',
    industryNoun: "beauty salon",
    programsContext: {
        fits: {
            standard: "salon acquisitions, multi-location expansion, larger buildouts.",
            '504': "buying the salon real estate. Fixed long-term rates.",
            small: "buildout, chairs and stations, working capital under $500K. Most salon deals fit this category given smaller average size.",
            equipment: "chairs, stations, specialty styling equipment. Faster than SBA.",
        },
    },
    h1: 'SBA Loans for Beauty Salons',
    title: 'SBA Loan for Beauty Salon 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for beauty salon acquisitions, buildouts, and equipment. 5,033 beauty salon SBA loans approved FY2020-2025 covering hair and styling salons.',
    breadcrumbName: 'SBA Loans for Beauty Salons',
    campaignSlug: 'sba-beauty-salons-quiz',
    heroSub: 'Beauty salon SBA loans cover hair and styling salons specifically &mdash; NAICS 812112 is distinct from <a class="inline" href="/sba-loans/personal-care">medspa and broader personal care</a> (NAICS 812199). Smaller average deal sizes (median $80K), booth-rental vs. owner-operator revenue models, and performance that runs modestly above the SBA average on charge-offs.',
    heroValue: 'Answer 6 questions. Get matched with salon-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps beauty salon owners compare SBA 7(a) options and match with lenders experienced in salon underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate beauty salon files',
        underwriting: `
            <p>Beauty salon SBA underwriting differs from the <a class="inline" href="/sba-loans/personal-care">broader personal care category</a> (NAICS 812199) and from medspa lending specifically. This NAICS (812112) captures hair and styling salons &mdash; cut, color, styling, some barbering &mdash; where the economics run on recurring-client appointment volume rather than equipment-intensive procedure revenue. Deal sizes are materially smaller (average $208K, median $80K) and the audience tilts toward working stylists becoming owners.</p>
            <h3>Booth-rental vs. owner-operator revenue</h3>
            <p>Two revenue models dominate, and they underwrite differently. <strong>Booth-rental salons</strong> lease chairs to independent stylists who operate their own businesses &mdash; the salon owner collects booth rent (typically $200-$400/week per chair) and manages the facility. <strong>Owner-operator salons</strong> employ or contract stylists directly, collecting service revenue and paying wages or commissions. Booth-rental is more facility-revenue-like and underwrites on chair-utilization and lease-term economics; owner-operator is more service-business-like and underwrites on stylist retention and service pricing.</p>
            <h3>Cosmetology licensing requirements</h3>
            <p>Every state licenses cosmetologists and hairstylists. Salon ownership usually doesn&rsquo;t require the owner to be licensed, but the operating practitioners must be. Lenders verify the staffing structure complies with state cosmetology rules.</p>
            <h3>Smaller deals, tighter underwriting</h3>
            <p>With median loan size at $80K, most beauty salon SBA deals fit SBA 7(a) Small Loan. The tight deal size combined with a higher franchise share (10%+) and more variable performance than professional-services categories means lenders pay more attention to cash-flow sensitivity, customer concentration in the stylist team, and lease-term alignment with the loan amortization.</p>
        `,
        indepTitle: 'Franchise concepts and independent operators',
        indep: `
            <p>Franchise operators account for <strong>{franchise_pct}% of beauty salon SBA loans</strong>. Major concepts include Great Clips, Sport Clips, Supercuts, and Cost Cutters — high-volume, low-service-ticket models that franchise well. Franchise operations benefit from brand recognition and operational playbooks particularly valuable at the entry-level price points these concepts target.</p>
            <p>Independent salons range widely in scale and positioning &mdash; from small owner-operator shops to larger styling salons with 10+ chairs and developed service menus. Independent SBA files close routinely when the operator has cosmetology background and the salon shows stable client base.</p>
        `,
        failureTitle: 'Honest framing: the one industry running above SBA average',
        failure: `
            <p>Beauty salon charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio. This is the <em>one industry in the Angle 1 cluster where performance runs modestly above the SBA cross-industry average</em>. It doesn&rsquo;t mean salon SBA lending is a bad bet; it means the category has real underwriting risk factors that deserve honest framing.</p>
            <p>What predicts the failures: <strong>stylist-team departures</strong> (stylists take clients with them when they leave; a departing key stylist can take 10-40% of client revenue), <strong>overpayment on acquisition multiples</strong> (active salon acquisition market pushes valuations up in some regions), and <strong>lease-term mismatches</strong> (a 7-year loan on a salon with 3 years remaining on the lease creates real refinancing risk). Specialist lenders experienced with salon underwriting look specifically at non-compete structure with key stylists, realistic client-retention assumptions, and lease-term alignment.</p>
            <p>The +9% YoY growth in SBA lending to salons reflects ongoing acquisition activity in a fragmented industry. Trailing 12-month volume is down 11% from the prior 12 months &mdash; the category has softened recently even as long-term demand holds up.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your situation?",opts:[{v:"acquisition",l:"Acquiring an existing salon"},{v:"new-independent",l:"Starting a new independent salon"},{v:"franchise",l:"Opening or buying a franchise"},{v:"expansion",l:"Expanding current salon"},{v:"equipment",l:"Equipment / renovation only"}]},
            {q:"Revenue model?",opts:[{v:"booth-rental",l:"Booth rental"},{v:"owner-operator",l:"Owner-operator with staff"},{v:"mixed",l:"Mixed model"},{v:"new",l:"New salon / undecided"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Salon purchase price"},{v:"buildout",l:"Buildout / renovation"},{v:"equipment-use",l:"Chairs, stations, equipment"},{v:"working-capital",l:"Working capital"},{v:"multiple",l:"Multiple combined uses"}]},
            {q:"Your experience?",opts:[{v:"licensed-stylist",l:"Licensed cosmetologist, 5+ years"},{v:"licensed-new",l:"Licensed cosmetologist, under 5 years"},{v:"non-licensed-partner",l:"Non-licensed with licensed partner"},{v:"first-time",l:"First-time operator"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-759",l:"720-759"},{v:"760-plus",l:"760+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-100k",l:"Under $100K"},{v:"100k-250k",l:"$100K - $250K"},{v:"250k-500k",l:"$250K - $500K"},{v:"500k-plus",l:"$500K+"}]},
        ],
        profiles: {
            A: {badge:"Standard acquisition",headline:"Licensed stylist acquiring established salon",body:"Experienced licensed cosmetologist acquiring an established salon is the standard SBA file in this category. Key variables: stylist-team retention, lease-term alignment, and realistic client-retention assumptions. Plan 45-75 days with a salon-experienced SBA lender.",ctaLabel:"Match with salon-experienced SBA lenders",utmContent:"profile-a-acquisition"},
            B: {badge:"Franchise path",headline:"Franchise route streamlines underwriting",body:"Franchise salon concepts — Great Clips, Sport Clips, Supercuts — benefit from brand-level underwriting shortcut if listed in SBA Franchise Directory. Franchise operations close more quickly than independent deals.",ctaLabel:"See SBA franchise details",utmContent:"profile-b-franchise",ctaUrl:"/sba-loans/franchise/"},
            C: {badge:"Small deal / Small Loan path",headline:"SBA 7(a) Small Loan fits most salon deals",body:"With median salon SBA loan at $80K, most deals fit SBA 7(a) Small Loan. Faster underwriting and closing than Standard 7(a). Key variable: matching with a lender that runs salon Small Loan deals at volume rather than one-off.",ctaLabel:"Match with salon Small Loan lenders",utmContent:"profile-c-small-loan"},
            D: {badge:"New salon / experience gap",headline:"Strengthen file before applying",body:"First-time salon operators or non-licensed owners face a harder SBA path in a category with modestly above-average charge-off performance. Lenders want licensed operator on the team, realistic ramp-period projections, and stylist recruitment plan. Franchise alternative often beats independent startup.",ctaLabel:"Get honest feedback from a salon SBA specialist",utmContent:"profile-d-new-salon"},
        },
        scoringBody: `function score(a){var sit=a[0],model=a[1],use=a[2],exp=a[3],credit=a[4],amount=a[5];if(sit==='franchise')return 'B';if(sit==='new-independent'&&exp==='first-time')return 'D';if(amount==='under-100k'||amount==='100k-250k')return 'C';if(sit==='acquisition')return 'A';return 'A';}`,
    },
    faqs: [
        {q:"What's the difference between beauty salons and personal care SBA loans?",a:"Beauty salons (NAICS 812112) cover hair and styling salons specifically — cut, color, styling, some barbering. Personal care (NAICS 812199) covers medspas, nail salons, skincare, tanning, wellness, and broader personal services. The two NAICS categories have different average deal sizes, different charge-off performance, different franchise concentration, and different underwriting patterns. See our SBA personal care guide for medspa and related service underwriting."},
        {q:"Can I get an SBA loan for a hair salon?",a:"Yes. Beauty salon is a high-volume SBA category — 5,033 loans approved FY2020-2025. SBA 7(a) covers acquisitions, buildouts, equipment, and working capital. Most deals fit SBA 7(a) Small Loan (up to $500K) given the smaller average deal size — $208K average, $80K median."},
        {q:"Do I need to be a licensed cosmetologist to own a salon?",a:"Usually no. Most states don't require salon owners to hold cosmetology licenses, but operating stylists do. Some states require a licensed cosmetologist to serve as salon manager. Lenders verify the staffing structure complies with state cosmetology rules before closing."},
        {q:"What's the SBA charge-off rate for beauty salons?",a:"Beauty salon SBA 7(a) charge-offs run at 1.55%, modestly above the all-industry SBA average of 1.36%. This is the one Angle 1 industry category where performance runs above the SBA baseline. Main risk factors: stylist-team departures (taking clients), overpayment on acquisition multiples in active local markets, and lease-term mismatches with loan amortization. Specialist lenders underwrite specifically around these risks."},
        {q:"How does booth-rental vs. owner-operator affect underwriting?",a:"Different revenue structures that underwrite differently. Booth-rental salons collect lease revenue from stylists operating their own businesses — underwrites on chair-utilization and lease-term economics. Owner-operator salons collect service revenue and pay wages or commissions — underwrites on stylist retention, service pricing, and client-acquisition economics. Lenders want to see the specific revenue structure and model underwriting appropriately."},
        {q:"What's the typical SBA loan size for a beauty salon?",a:"Average beauty salon SBA 7(a) loan is $208,000 with a median of $80,000 — meaningfully smaller than most industry categories we cover. Most deals fit SBA 7(a) Small Loan (up to $500K). Larger multi-location or franchise-chain acquisitions can reach $1M+ but are less common in this category."},
        {q:"Is franchise salon easier to finance through SBA?",a:"Franchise operations (Great Clips, Sport Clips, Supercuts) benefit from brand-level underwriting shortcut when listed in the SBA Franchise Directory. Operational playbook, brand recognition, and established concept reduce ramp-period risk that lenders otherwise weight heavily. Franchise routes are particularly useful for first-time salon operators who benefit from the brand infrastructure."},
    ],
},

'561790': {
    slug: 'building-services',
    industryNoun: "building services",
    programsContext: {
        fits: {
            standard: "business acquisitions, fleet expansion, equipment-heavy scaling for larger contracts.",
            '504': "buying the facility real estate. Fixed long-term rates.",
            small: "equipment, vehicles, working capital for contract ramp under $500K.",
            equipment: "commercial cleaning equipment, pest control vehicles, specialized tools. Faster than SBA for fleet expansion.",
        },
    },
    h1: 'SBA Loans for Commercial Cleaning & Building Services',
    title: 'SBA Loan for Commercial Cleaning & Building Services 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) loans for commercial cleaning and building services — pest control, window cleaning, carpet cleaning, pool maintenance. 1,416 SBA loans approved FY2020-2025 with +33% YoY growth.',
    breadcrumbName: 'SBA Loans for Building Services',
    campaignSlug: 'sba-building-services-quiz',
    heroSub: 'Commercial cleaning and adjacent building services &mdash; pest control, window cleaning, carpet cleaning, pool maintenance &mdash; are among the <strong>fastest-growing SBA lending categories at +33% YoY</strong> with trailing-12 still accelerating (+11%). B2B contract revenue models drive the favorable underwriting.',
    heroValue: 'Answer 6 questions. Get matched with building-services-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps commercial cleaning and building services operators compare SBA 7(a) options and match with lenders experienced in B2B service contractor underwriting. We do not originate SBA loans.',
    narrative: {
        underwritingTitle: 'How lenders evaluate building services files',
        underwriting: `
            <p>The &ldquo;Other Services to Buildings and Dwellings&rdquo; NAICS category is broad but centers on <strong>commercial cleaning</strong> with adjacent services: pest control, window cleaning, carpet cleaning, chimney sweeping, swimming pool maintenance, janitorial services, and other small building-related service businesses. The unifying economic pattern &mdash; B2B contract revenue at scale &mdash; makes the category meaningfully stronger than consumer-facing service businesses on underwriting terms.</p>
            <h3>B2B contract revenue foundation</h3>
            <p>The strongest building services SBA files run on <strong>multi-year commercial contracts</strong> with office buildings, retail properties, HOAs, medical facilities, and industrial sites. Recurring monthly contract revenue smooths cash flow in ways that consumer-facing service businesses rarely match. Lenders evaluate the contract portfolio closely: current contracts, remaining term, pricing structure, and renewal history all drive the underwriting conversation.</p>
            <h3>Equipment and vehicle intensity</h3>
            <p>Building services are moderately equipment-heavy. A commercial cleaning operation runs commercial-grade equipment (scrubbers, buffers, extractors) and a fleet of service vehicles. Pest control adds specialized equipment and EPA-regulated chemicals. Window cleaning and carpet cleaning have specialized equipment. Fleet and equipment serve as meaningful collateral on SBA loans, supporting recovery economics.</p>
            <h3>Franchise-heavy category structure</h3>
            <p>Building services have <strong>{franchise_pct}% franchise participation</strong> &mdash; meaningful share. Major brands include Jan-Pro, JAN-PRO Systems International, Jani-King, Orkin franchise, Mosquito Joe, Chem-Dry, Stanley Steemer franchising, and many others. Franchise operations benefit from brand-level underwriting shortcut, established B2B sales systems, and recognizable customer-facing branding.</p>
            <h3>The +33% YoY growth is real</h3>
            <p>Growth in SBA lending to this category is accelerating. +33% year-over-year with trailing-12 volume up 11% over the prior 12 months. The dynamic reflects post-pandemic commercial cleaning investment (buildings upgraded cleaning protocols, creating sustained recurring demand), ongoing pest control expansion (climate change is pushing pest pressure northward in the US), and consolidator activity in commercial cleaning (regional rollups acquiring independents).</p>
        `,
        indepTitle: 'Franchise dominance and independent alternatives',
        indep: `
            <p>Building services is one of the more franchise-concentrated service categories in SBA. Major franchise operations provide operational playbooks and B2B sales systems that make the category more accessible to first-time operators than many service industries. Commercial cleaning particularly benefits from franchise operational models because the work is repetitive, training is standardized, and customer acquisition runs through established sales pipelines.</p>
            <p>Independent operators also close SBA deals routinely, typically requiring more documented B2B sales capability and a clearer customer-acquisition plan to compensate for the lack of franchise infrastructure. Experienced operators acquiring established commercial cleaning books with long-term contracts underwrite particularly well.</p>
        `,
        failureTitle: 'Charge-off performance and the B2B contract advantage',
        failure: `
            <p>Building services charge-offs run at <strong>{cost_off_pct}%</strong>, compared to the SBA average of <strong>{sba_avg_chgoff}%</strong> &mdash; a <strong>{chgoff_ratio_label}</strong> ratio, meaningfully better than average. The favorable performance reflects the B2B contract revenue foundation: commercial contracts don&rsquo;t churn the way consumer accounts do, and contract revenue is insulated from consumer discretionary spending swings that affect many service industries.</p>
            <p>What predicts the failures: <strong>contract-portfolio concentration</strong> (one large commercial account leaving triggers a revenue collapse the business can&rsquo;t absorb), <strong>labor-cost inflation outpacing contract pricing</strong> (fixed-rate contracts don&rsquo;t adjust to rising wage pressure), and <strong>expansion-related over-leverage</strong> (operator scales too fast on multi-location expansion without supporting working capital). Specialist lenders size working capital and contract-diversification review into the underwriting.</p>
        `,
    },
    quiz: {
        questions: [
            {q:"What's your service?",opts:[{v:"commercial-cleaning",l:"Commercial cleaning / janitorial"},{v:"pest-control",l:"Pest control"},{v:"window-cleaning",l:"Window cleaning"},{v:"carpet-cleaning",l:"Carpet cleaning"},{v:"pool-maintenance",l:"Pool maintenance"},{v:"other",l:"Other building service"}]},
            {q:"What's your situation?",opts:[{v:"acquisition",l:"Acquiring an existing business"},{v:"franchise",l:"Opening or buying a franchise"},{v:"new-independent",l:"Starting a new independent business"},{v:"expansion",l:"Expanding current business"},{v:"equipment",l:"Equipment / fleet only"}]},
            {q:"Primary loan use?",opts:[{v:"purchase-price",l:"Business purchase price"},{v:"fleet-equipment",l:"Fleet / equipment"},{v:"real-estate",l:"Facility real estate"},{v:"working-capital",l:"Working capital"},{v:"multiple",l:"Multiple combined uses"}]},
            {q:"Revenue mix?",opts:[{v:"b2b-contract",l:"B2B contracts (recurring)"},{v:"b2b-project",l:"B2B project-based"},{v:"consumer",l:"Residential consumer"},{v:"mixed",l:"Mixed B2B and consumer"},{v:"new",l:"New business / no mix yet"}]},
            {q:"Personal credit score?",opts:[{v:"below-680",l:"Below 680"},{v:"680-719",l:"680-719"},{v:"720-759",l:"720-759"},{v:"760-plus",l:"760+"}]},
            {q:"Loan amount needed?",opts:[{v:"under-250k",l:"Under $250K"},{v:"250k-500k",l:"$250K - $500K"},{v:"500k-1m",l:"$500K - $1M"},{v:"1m-plus",l:"$1M+"}]},
        ],
        profiles: {
            A: {badge:"Contract-book acquisition",headline:"B2B contract book with recurring revenue",body:"Acquiring a commercial cleaning or building services operation with a strong B2B contract portfolio is the strongest SBA file in this category. Recurring contract revenue underwrites well and equipment collateral supports the loan. Plan 60-90 days with a B2B-service-experienced SBA lender.",ctaLabel:"Match with B2B-service-experienced SBA lenders",utmContent:"profile-a-contract-book"},
            B: {badge:"Franchise path",headline:"Franchise brands streamline B2B sales",body:"Franchise operations — Jan-Pro, Jani-King, Orkin franchise, Mosquito Joe, Chem-Dry, and others — benefit from brand-level underwriting shortcut and established B2B sales systems. Particularly valuable for first-time operators building customer acquisition. See SBA franchise details.",ctaLabel:"See SBA franchise details",utmContent:"profile-b-franchise",ctaUrl:"/sba-loans/franchise/"},
            C: {badge:"Equipment / fleet path",headline:"Equipment financing often beats SBA on speed",body:"For equipment and fleet-focused deals, non-SBA equipment financing funds in 3-10 days vs. 45-75 for SBA. Higher rate but the equipment is collateral. SBA 7(a) Small Loan works when timeline allows and the deal combines equipment with other uses.",ctaLabel:"Compare equipment financing vs. SBA",utmContent:"profile-c-equipment"},
            D: {badge:"New business / consumer-focus",headline:"New business or consumer-only focus",body:"Starting a new building services business or operating consumer-only (residential) rather than B2B contract-based faces a harder SBA path in this category. Lenders strongly prefer B2B contract revenue. Franchise alternative often beats pure independent startup.",ctaLabel:"Get honest feedback from a building-services SBA specialist",utmContent:"profile-d-new-business"},
        },
        scoringBody: `function score(a){var svc=a[0],sit=a[1],use=a[2],mix=a[3],credit=a[4],amount=a[5];if(sit==='franchise')return 'B';if(sit==='new-independent'||mix==='consumer')return 'D';if(sit==='equipment'||use==='fleet-equipment')return 'C';if(sit==='acquisition'&&(mix==='b2b-contract'||mix==='mixed'))return 'A';return 'A';}`,
    },
    faqs: [
        {q:"What's covered in the building services SBA category?",a:"The NAICS 561790 category covers commercial cleaning and janitorial services plus pest control, window cleaning, carpet cleaning, chimney sweeping, swimming pool maintenance, and other building-related services. Commercial cleaning is the dominant sub-category, with pest control as the second-largest. 1,416 loans approved in this category FY2020-2025."},
        {q:"Can I get an SBA loan for a commercial cleaning business?",a:"Yes. Commercial cleaning is the largest sub-category in building services SBA lending, with the category growing at +33% year-over-year — among the fastest-growing SBA industries we track. SBA 7(a) covers acquisitions, equipment, fleet, and working capital. Franchise operations (Jan-Pro, Jani-King, and others) are particularly active in SBA."},
        {q:"How do B2B contracts affect SBA underwriting?",a:"Meaningfully favorably. B2B contract revenue is more predictable than consumer-facing service revenue, contracts don't churn the way consumer accounts do, and the recurring-monthly pattern smooths cash flow. A building services business with a strong commercial contract portfolio underwrites meaningfully better than a residential-consumer-focused operation of comparable revenue."},
        {q:"What's the SBA charge-off rate for building services?",a:"Building services SBA 7(a) charge-offs run at 1.06%, meaningfully better than the all-industry SBA average of 1.36%. The favorable performance reflects B2B contract revenue stability, equipment collateral, and the franchise-industry structure that stabilizes operational quality."},
        {q:"Is pest control SBA lending different from commercial cleaning?",a:"They share the same NAICS (561790) and similar underwriting patterns, but pest control has some distinct factors: EPA-regulated chemicals and state licensing for applicators, specialty equipment and vehicles, and B2C residential revenue mix alongside B2B commercial work. Major pest control franchises (Orkin, Terminix franchise, Mosquito Joe) are active in SBA. The category overall underwrites similarly to commercial cleaning with adjustments for the regulatory and equipment specifics."},
        {q:"How much can I borrow for a building services business?",a:"SBA 7(a) Standard goes up to $5 million. Average building services SBA loan was $324,000 with a median of $150,000. Most single-location commercial cleaning or pest control acquisitions run $250K to $1M; larger multi-location operations and franchise chains can reach $2M+."},
        {q:"Is building services SBA lending really growing that fast?",a:"Yes. +33% year-over-year, with trailing 12-month volume up 11% over the prior 12 months — meaning the growth is accelerating. Dynamics include post-pandemic commercial cleaning investment creating sustained recurring demand, pest control expansion (climate change pushing pest pressure northward), and consolidator activity in commercial cleaning acquiring independents."},
    ],
},

'722511': {
    slug: 'restaurants',
    programsContext: {
        fits: {
            standard: "restaurant acquisitions, buildouts, expansion. Most common restaurant SBA path.",
            '504': "buying the building alongside the restaurant. Fixed long-term rates on the real-estate portion.",
            small: "equipment upgrades, small acquisitions, working capital under $500K. Faster close than Standard 7(a).",
            equipment: "replacing specific destroyed or out-of-service equipment when SBA timeline won&rsquo;t work. Higher rate than SBA but much faster.",
        },
    },
    industryNoun: 'restaurant',
    industryNounPossessive: "restaurant's",
    heroPhoto: {
        src: 'https://images.pexels.com/photos/5490976/pexels-photo-5490976.jpeg?auto=compress&cs=tinysrgb&w=1200',
        alt: 'Busy restaurant kitchen during service — chefs working under hanging lamps, representative of the working restaurant scenes funded by SBA 7(a) loans',
        width: 1200,
        height: 800,
        photographer: 'Rachel Claire',
        photographerUrl: 'https://www.pexels.com/@rachel-claire/',
        sourceUrl: 'https://www.pexels.com/photo/5490976/',
        sourceName: 'Pexels',
    },
    highlightLenderNames: [],
    h1: 'SBA Loans for Restaurants',
    title: 'SBA Loan for Restaurant 2026 | My Money Marketplace',
    metaDesc: 'SBA 7(a) and 504 loans for restaurant acquisitions, buildouts, and equipment. Proprietary stats on 16,355 restaurant SBA loans approved FY2020-2025. Take the 2-minute quiz.',
    breadcrumbName: 'SBA Loans for Restaurants',
    campaignSlug: 'sba-restaurants-quiz',
    heroSub: 'SBA 7(a) and 504 are the dominant financing paths for restaurant acquisitions, buildouts, and equipment. Here&rsquo;s what the data shows about restaurant SBA lending &mdash; and how lenders actually underwrite concepts.',
    heroValue: 'Answer 6 questions. Get matched with restaurant-experienced SBA lenders.',
    serviceDescription: 'My Money Marketplace helps restaurant owners compare SBA 7(a), 504, and Express options and get matched with SBA-preferred lenders experienced in restaurant underwriting. We do not originate SBA loans; applications are processed through SBA-authorized lenders.',

    // Narrative sections (industry-specific, manually written per NAICS)
    narrative: {
        underwritingTitle: 'How lenders actually evaluate restaurant concepts',
        underwriting: `
            <p>Restaurant SBA underwriting looks different from most other industry files because lenders know the economics are unforgiving. Concept failure in year one or two is common enough that experienced restaurant lenders have explicit checklists for what makes a file fundable. The good news: on the portfolio data that exists, <strong>SBA-funded restaurants actually perform better than the SBA average on charge-offs</strong>. More on that below. What lenders are looking for:</p>
            <h3>Buildout cost realism</h3>
            <p>A first-time restaurateur usually estimates buildout at 40&ndash;60% of what an experienced lender expects to see. Kitchen equipment alone (hoods, walk-ins, line equipment, dishwashing) runs $150K to $400K on a mid-size full-service concept, before any dining-room finish or exterior signage. Lenders ask for <strong>itemized bids from two or three contractors</strong> and compare them against industry cost benchmarks. A buildout budget that doesn&rsquo;t match those benchmarks signals either inexperience or a plan that will run out of money before opening.</p>
            <h3>Unit economics at the concept level</h3>
            <p>Lenders want to see the <strong>target check average, expected covers per day, COGS as a percentage of revenue, and labor as a percentage of revenue</strong> &mdash; each tied to comparable restaurants in the same market. Industry benchmarks are roughly 28&ndash;35% COGS, 28&ndash;35% labor, 25&ndash;35% other operating costs, leaving 5&ndash;15% EBITDA margin. A concept that projects 25% EBITDA without unusual structural advantages is telling the lender the projections aren&rsquo;t grounded.</p>
            <h3>Location signals</h3>
            <p>Traffic counts, demographics, comparable-venue performance, and lease economics (rent-to-sales ratio typically 6&ndash;10%) are the four location factors lenders weight most. A location with strong demographics but a rent-to-sales ratio above 10% often gets the same decline as a cheap location with weak demographics &mdash; the unit economics don&rsquo;t work either way.</p>
            <h3>Operator experience</h3>
            <p>The single strongest underwriting factor after cash flow projections is <strong>operator experience in the specific restaurant category</strong>. A first-time owner buying an Italian concept with no Italian-restaurant experience faces longer odds than a 10-year pizza-shop GM opening their own place &mdash; even with identical financials. Lenders handle this either by requiring an experienced partner, a concept-proven franchise, or meaningfully higher equity injection from the inexperienced operator.</p>
            <h3>Equity injection and post-opening reserves</h3>
            <p>The 10% minimum SBA equity injection is a statutory floor, not a practical target for restaurant deals. Experienced restaurant SBA lenders typically want <strong>15% to 20% equity for acquisitions and 20% to 25% for new-concept buildouts</strong>. The higher number for new concepts exists because buildout cost overruns are common, and the lender doesn&rsquo;t want the owner to run out of equity cushion before the restaurant is even open.</p>
            <p>Separate from equity injection, lenders frequently require the borrower to show <strong>three to six months of operating costs in reserve</strong> at opening, set aside and not deployed into buildout. On a $1.5 million deal with projected monthly operating costs around $80K, that reserve expectation translates to $240K to $480K sitting in the account alongside the equity injection. Most first-time restaurant borrowers underestimate this requirement &mdash; it&rsquo;s often the gap that shifts a clean approval into a requested equity bump or decline.</p>
            <h3>Projections with sensitivity analysis</h3>
            <p>Static projections get a skeptical review. Lenders increasingly want <strong>sensitivity analysis</strong> &mdash; what happens to debt service coverage if revenue comes in 15% below plan, if food costs run 3 points higher than budgeted, or if the ramp to steady-state covers takes 12 months instead of 6. Projections that collapse under modest adverse scenarios flag the deal as under-reserved; projections that hold up under stress with a DSCR floor above 1.10x tell the lender the concept has margin for real-world variance.</p>
        `,

        indepTitle: 'Independent vs. franchise restaurant SBA',
        indep: `
            <p>Franchise restaurants made up <strong>{franchise_pct}% of restaurant SBA loans</strong> FY2020-2025. Independent concepts are the bulk of the market, but franchises underwrite meaningfully differently. When the franchise is listed in the SBA Franchise Directory, most of the brand-level underwriting is already done &mdash; lenders evaluate the specific operator, unit economics for that brand, and site selection rather than proving out the concept itself.</p>
            <p>The top franchise brands in the SBA restaurant data are a mix of fast-casual QSR and emerging full-service concepts. Subway leads by count; Eggs Up Grill and other regional chains appear further down the list. This distribution reflects buyer demand more than lender preference &mdash; franchisees tend to choose SBA 7(a) because it stretches the equity farther than conventional restaurant financing does.</p>
            <p>Independent concepts don&rsquo;t get the franchise shortcut. They take the full underwriting path: concept proof, location validation, operator experience, and conservative projections with sensitivity analysis. Independent restaurant files close, they just take longer and require deeper editorial on every lender question. Lenders who specialize in independent restaurant lending are different from lenders who specialize in franchise 7(a) &mdash; matching matters. See our <a class="inline" href="/sba-loans/franchise">SBA franchise loan guide</a> for the franchise-specific path.</p>
        `,

        failureTitle: 'The restaurant failure-rate reality',
        failure: `
            <p>Popular restaurant-failure statistics (&ldquo;60% close in the first year&rdquo;) overstate the rate. Actual data from academic and industry sources puts first-year closure around 17&ndash;30% and five-year closure around 60% &mdash; still high, but not the cartoon version. More importantly, SBA-funded restaurants underperform that general-restaurant failure rate because SBA underwriting filters out weaker concepts before they get funded.</p>
            <p>The proprietary data above tells a clearer story: <strong>restaurant SBA charge-offs run at {cost_off_pct}%</strong>, compared to the SBA average of {sba_avg_chgoff}%. That&rsquo;s a <strong>{chgoff_ratio_label}</strong> ratio &mdash; restaurants actually perform modestly <em>better</em> than the all-industry SBA portfolio on charge-offs. The mechanism is selection: SBA-restaurant files have to clear buildout cost realism, unit economics, location, and operator experience before they fund. The concepts that pass are disproportionately the ones that survive.</p>
            <p>What this means for a borrower: the lender&rsquo;s tough questions aren&rsquo;t arbitrary. Equity injection expectations, required cash reserves post-opening (typically 3&ndash;6 months of operating costs set aside), and the demand for itemized buildout bids all exist because lenders who run restaurant files at scale have learned exactly which inputs predict charge-off. Treat the file requirements as free risk management, not bureaucracy.</p>
            <h3>What predicts a restaurant SBA charge-off</h3>
            <p>The average months-to-charge-off on failed restaurant SBA loans is roughly 34 months &mdash; meaning most failures happen in year 2 or early year 3, not year 1. That timing matters because it reflects when cash reserves run out, not when the concept failed. The restaurants that end up in the charge-off cohort tend to share a pattern: <strong>opened on the exact budget</strong> with no meaningful contingency; <strong>hit a slower-than-projected ramp</strong> to steady-state revenue; then <strong>ran down cash reserves</strong> over 18 to 30 months while trying to course-correct. By month 34, the cash is gone and the debt service stops.</p>
            <p>The restaurants that survive the same slow-ramp scenario had <strong>real reserves, flexible labor models, or a secondary revenue channel</strong> (catering, delivery, private events) that cushioned the ramp. Lenders can&rsquo;t underwrite for ramp speed with certainty, so they underwrite for the ability to survive a slow ramp &mdash; which is where equity injection, reserve requirements, and flexible-cost discussion come from.</p>
        `,
    },

    // Quiz config
    quiz: {
        questions: [
            {q:"What's your restaurant situation?", opts:[
                {v:"acquisition", l:"Acquiring an existing restaurant"},
                {v:"new-independent", l:"Opening a new independent concept"},
                {v:"franchise", l:"Opening or buying a franchise"},
                {v:"expansion", l:"Expanding or second location"},
                {v:"established", l:"Established restaurant needing capital"},
            ]},
            {q:"Primary use of the loan?", opts:[
                {v:"buildout", l:"Buildout / tenant improvements"},
                {v:"equipment", l:"Kitchen or FOH equipment"},
                {v:"acquisition-use", l:"Purchase price of the business"},
                {v:"working-capital", l:"Working capital for operations"},
                {v:"real-estate", l:"Real estate purchase"},
                {v:"multiple", l:"Multiple uses combined"},
            ]},
            {q:"Concept stage?", opts:[
                {v:"not-open", l:"Not yet open"},
                {v:"under-1y", l:"Under 1 year operating"},
                {v:"1-3y", l:"1-3 years operating"},
                {v:"3-plus", l:"3+ years established"},
            ]},
            {q:"Your personal credit score?", opts:[
                {v:"below-620", l:"Below 620"},
                {v:"620-679", l:"620-679"},
                {v:"680-719", l:"680-719"},
                {v:"720-plus", l:"720+"},
            ]},
            {q:"Loan amount needed?", opts:[
                {v:"under-250k", l:"Under $250K"},
                {v:"250k-500k", l:"$250K - $500K"},
                {v:"500k-1m", l:"$500K - $1M"},
                {v:"1m-3m", l:"$1M - $3M"},
                {v:"3m-plus", l:"$3M+"},
            ]},
            {q:"Collateral available?", opts:[
                {v:"real-estate", l:"Real estate"},
                {v:"equipment", l:"Equipment and FF&E"},
                {v:"none", l:"None significant"},
            ]},
        ],
        profiles: {
            A: {
                badge: "Strong 7(a) acquisition candidate",
                headline: "You're in the 7(a) acquisition sweet spot",
                body: "Your profile — acquiring a profitable existing restaurant, meaningful equity, established operator profile — is exactly what restaurant-experienced SBA lenders underwrite at scale. Expect 60-90 days to close. The key variable is matching with a lender that runs restaurant deals routinely; a generalist branch will cost you weeks and sometimes the deal itself.",
                ctaLabel: "Match with acquisition-experienced restaurant SBA lenders",
                utmContent: "profile-a-acquisition",
            },
            B: {
                badge: "Buildout / expansion path",
                headline: "SBA 7(a) Standard with restaurant-experienced lender",
                body: "Buildout, expansion, or established-restaurant working capital. SBA 7(a) is the path — the file is fundable but lender choice matters enormously. Restaurants are a narrow specialty; the top 10 restaurant SBA lenders do about a third of all restaurant 7(a) volume. Matching there vs. a random bank branch is the difference between a 60-day close and 120-day grind.",
                ctaLabel: "Match with restaurant-experienced 7(a) lenders",
                utmContent: "profile-b-buildout",
            },
            C: {
                badge: "New concept — tight path",
                headline: "New independent concept is the hardest file to fund",
                body: "New independent concept with limited capital or limited operator experience is the hardest restaurant SBA file. Not impossible, but the concept proof work has to be unusually strong: itemized buildout bids, comparable-venue unit economics, documented operator experience, and meaningful cash reserves post-opening. Consider a proof-of-concept phase, a franchise alternative, or partnering with an experienced operator before applying.",
                ctaLabel: "Get honest feedback from a restaurant SBA specialist",
                utmContent: "profile-c-new-concept",
            },
            D: {
                badge: "Franchise path",
                headline: "Franchise route — different rules apply",
                body: "Franchise restaurant SBA files underwrite differently from independent concepts. If the brand is in the SBA Franchise Directory, most of the concept risk is already evaluated and lenders focus on the operator. See our dedicated SBA franchise loan guide for the franchise-specific path, fee waivers, and lender mechanics.",
                ctaLabel: "See SBA franchise loan details",
                utmContent: "profile-d-franchise",
                ctaUrl: "/sba-loans/franchise/",
            },
        },
        scoringBody: `
            function score(a) {
                var situation=a[0], use=a[1], stage=a[2], credit=a[3], amount=a[4], collat=a[5];
                if (situation==='franchise') return 'D';
                if (situation==='new-independent' && (amount==='under-250k' || credit==='below-620' || collat==='none')) return 'C';
                if (situation==='acquisition' && (credit==='680-719' || credit==='720-plus') && (stage==='1-3y' || stage==='3-plus')) return 'A';
                if (situation==='acquisition' && (amount==='500k-1m' || amount==='1m-3m' || amount==='3m-plus')) return 'A';
                if (situation==='new-independent' && credit==='below-620') return 'C';
                return 'B';
            }
        `,
    },

    faqs: [
        {q:"Can I get an SBA loan to buy a restaurant?", a:"Yes. Restaurant acquisitions are one of the most common uses of SBA 7(a) financing. The loan can cover the purchase price (up to $5 million for 7(a) Standard), buildout or renovation of the acquired space, equipment replacement, and working capital to operate under new ownership. Minimum 10% equity injection required, with up to 5% available via seller financing on full standby. Plan 60-90 days to close with an SBA Preferred Lender experienced in restaurant deals."},
        {q:"How much can I borrow with an SBA loan for a restaurant?", a:"SBA 7(a) Standard goes up to $5 million; SBA 504 goes up to $5 million for the SBA portion (higher total project with the bank portion). Average restaurant SBA 7(a) loan FY2020-2025 was approximately $528,000, with the median at $255,000. Most full-service restaurant deals fall in the $500K to $2M range when acquisition or buildout is involved; equipment-only loans commonly run $100K to $400K."},
        {q:"What credit score do I need for a restaurant SBA loan?", a:"Most restaurant SBA lenders want personal credit of 680 or higher for conventional 7(a). Scores of 640-679 can qualify with strong compensating factors (meaningful equity, real estate collateral, relevant operator experience). Below 640, SBA Microloan or Community Advantage paths are more realistic than conventional 7(a). Restaurant underwriting also weighs operator industry experience heavily alongside credit."},
        {q:"How much down payment do I need for a restaurant SBA loan?", a:"SBA rules set a 10% minimum equity injection for acquisition loans, but restaurant lenders typically want 15%-20% in practice — particularly for new independent concepts or first-time operators. Up to 5% of the equity requirement can come from seller financing on full-standby terms. For new buildouts, many lenders want 20-25% equity because buildout-cost overruns are a common post-closing risk. Buildout-cost contingency reserves usually come from operator cash, not loan proceeds."},
        {q:"Is SBA 7(a) or SBA 504 better for a restaurant?", a:"Depends on the deal. SBA 7(a) is the dominant path for acquisitions, buildouts, equipment, and working capital — it's flexible and handles the operating-business side of a restaurant deal. SBA 504 is purpose-built for real estate and heavy fixed-asset purchases with fixed long-term rates, often used when a restaurateur is buying the building alongside the business. Common structure on larger deals: 504 for the real estate, 7(a) companion loan for the operating-business portion."},
        {q:"Do I need restaurant experience to get an SBA loan?", a:"Not strictly required, but it's one of the most heavily weighted underwriting factors after financial projections. First-time restaurateurs with no industry experience typically need to compensate with one of: an experienced partner with equity in the deal, a proven franchise concept listed in the SBA Franchise Directory, or meaningfully higher equity injection (often 25%+) than a standard 10% minimum. Pure first-time operators with thin capital on independent concepts face the hardest underwriting."},
        {q:"What's the SBA charge-off rate for restaurants?", a:"For SBA 7(a) restaurant loans FY2020-2025, the charge-off rate is 1.21%, modestly better than the all-industry SBA average of 1.36%. The selection effect is real: SBA underwriting filters out weaker restaurant concepts before funding, and the concepts that clear underwriting perform better than the broader restaurant population. Expected time to charge-off when loans do fail runs about 34 months after funding."},
    ],
},

};

// ─── Rendering helpers (programmatic, work for any NAICS) ───────────────

function renderStatsBlock(stats, overall, industryNoun, naicsCode, naicsDescription) {
    const chgoffRatio = (stats.charge_off_pct / overall.charge_off_pct);
    const chgoffVsSba = chgoffRatio < 1 ? 'better than' : 'above';
    const chgoffArrow = chgoffRatio < 1 ? '&darr;' : '&uarr;';
    const yoy = stats.yoy_growth;
    const yoyArrow = yoy >= 0 ? '&uarr;' : '&darr;';
    const topState = stats.top_states_by_count[0];
    const secondState = stats.top_states_by_count[1];
    const thirdState = stats.top_states_by_count[2];

    // Capitalize industry noun for the heading
    const noun = industryNoun || 'SBA';
    const nounCap = noun.charAt(0).toUpperCase() + noun.slice(1);
    // NAICS descriptor line — use naicsDescription if available, else synthesize
    const naicsLine = naicsCode && naicsDescription
        ? `SBA 7(a) loans to ${naicsDescription.toLowerCase()} (NAICS ${naicsCode}), fiscal years 2020 through December 2025. Pulled from SBA FOIA 7(a) dataset.`
        : `SBA 7(a) loans to ${noun} businesses, fiscal years 2020 through December 2025. Pulled from SBA FOIA 7(a) dataset.`;

    return `
    <section class="by-numbers">
        <div class="container">
            <h2>${nounCap} SBA lending &mdash; by the numbers</h2>
            <p class="bn-sub">${naicsLine}</p>
            <div class="bn-grid">
                <div class="bn-card">
                    <div class="bn-label">Loans approved</div>
                    <div class="bn-value">${fmt.num(stats.loan_count)}</div>
                    <div class="bn-footnote">FY2020-2025</div>
                </div>
                <div class="bn-card">
                    <div class="bn-label">Total approved</div>
                    <div class="bn-value">${fmt.usdShort(stats.total_approval)}</div>
                    <div class="bn-footnote">Combined 7(a) volume</div>
                </div>
                <div class="bn-card">
                    <div class="bn-label">Average loan size</div>
                    <div class="bn-value">${fmt.usdK(stats.avg_loan)}</div>
                    <div class="bn-footnote">Median ${fmt.usdK(stats.median_loan)}</div>
                </div>
                <div class="bn-card bn-highlight">
                    <div class="bn-label">Charge-off rate ${chgoffArrow}</div>
                    <div class="bn-value">${fmt.pct(stats.charge_off_pct)}</div>
                    <div class="bn-footnote">vs ${fmt.pct(overall.charge_off_pct)} SBA avg &mdash; ${chgoffVsSba} average</div>
                </div>
                <div class="bn-card">
                    <div class="bn-label">YoY growth ${yoyArrow}</div>
                    <div class="bn-value">${yoy >= 0 ? '+' : ''}${yoy.toFixed(2)}%</div>
                    <div class="bn-footnote">Year-over-year loan volume</div>
                </div>
                <div class="bn-card">
                    <div class="bn-label">Top lending state</div>
                    <div class="bn-value">${topState.state} ${fmt.pct1(topState.pct_of_industry_loans)}</div>
                    <div class="bn-footnote">Then ${secondState.state} ${fmt.pct1(secondState.pct_of_industry_loans)}, ${thirdState.state} ${fmt.pct1(thirdState.pct_of_industry_loans)}</div>
                </div>
            </div>
        </div>
    </section>`;
}

function renderHeroPhoto(heroPhoto) {
    if (!heroPhoto) return '';
    return `
<section class="hero-photo-banner" aria-label="Hero image">
    <img src="${esc(heroPhoto.src)}" alt="${esc(heroPhoto.alt)}" width="${heroPhoto.width}" height="${heroPhoto.height}" class="hero-photo-img" loading="eager" fetchpriority="high">
    <div class="hero-photo-overlay"></div>
    <p class="hero-photo-credit">Photo: <a href="${esc(heroPhoto.photographerUrl)}" rel="noopener" target="_blank">${esc(heroPhoto.photographer)}</a> via <a href="${esc(heroPhoto.sourceUrl)}" rel="noopener" target="_blank">${esc(heroPhoto.sourceName)}</a></p>
</section>`;
}

function renderLenderChartSvg(lenders, highlightNames, industryNoun) {
    const top10 = lenders.slice(0, 10);
    const max = top10[0].loan_count;
    const width = 640;
    const topPad = 28;
    const rowHeight = 36;
    const labelColEnd = 210;
    const barStart = 220;
    const barMaxWidth = 320;
    const valueGap = 8;
    const botPad = 16;
    const totalHeight = topPad + rowHeight * top10.length + botPad;

    const highlight = new Set(highlightNames || []);
    const shortLabel = name => name
        .replace(', National Association', ', N.A.')
        .replace(' Corporation', '')
        .replace(/\s+/g, ' ').trim();

    const rows = top10.map((l, i) => {
        const rowY = topPad + rowHeight * i + rowHeight / 2;
        const barW = (l.loan_count / max) * barMaxWidth;
        const isHighlight = highlight.has(l.bankname);
        const barColor = isHighlight ? '#B8741C' : '#2F6BB3';
        const label = shortLabel(l.bankname);
        const valueX = barStart + barW + valueGap;
        return `    <g>
      <text x="${labelColEnd}" y="${rowY + 4}" text-anchor="end" font-size="13" fill="#444">${esc(label)}</text>
      <rect x="${barStart}" y="${rowY - 10}" width="${barW.toFixed(1)}" height="20" rx="3" fill="${barColor}"/>
      <text x="${valueX.toFixed(1)}" y="${rowY + 4}" text-anchor="start" font-size="13" font-weight="600" fill="#111">${l.loan_count}</text>
    </g>`;
    }).join('\n');

    const descText = top10.map(l => `${l.bankname} ${l.loan_count} loans`).join('; ');
    const highlightNote = highlight.size > 0 ? ` Specialist lenders (${Array.from(highlight).join(', ')}) highlighted in amber; other lenders in blue.` : '';

    return `<svg viewBox="0 0 ${width} ${totalHeight}" role="img" aria-labelledby="viz-lenders-title viz-lenders-desc" class="data-viz-svg" preserveAspectRatio="xMidYMid meet">
    <title id="viz-lenders-title">Top 10 SBA ${industryNoun} lenders by loan count</title>
    <desc id="viz-lenders-desc">Horizontal bar chart: ${descText}.${highlightNote}</desc>
${rows}
  </svg>`;
}

function renderLendersSection(lenders, industryNoun, industryNounPossessive, highlightNames, concentrationPct) {
    const chartSvg = renderLenderChartSvg(lenders, highlightNames, industryNoun);
    const highlightCallout = highlightNames && highlightNames.length > 0 ? `
            <p class="ls-footnote"><strong>Specialist lender signal:</strong> ${highlightNames.join(', ')} ${highlightNames.length > 1 ? 'are' : 'is a'} recognized ${industryNoun} SBA specialist${highlightNames.length > 1 ? 's' : ''}, highlighted in amber above. Specialist lenders close ${industryNoun} files faster and at better terms than generalist banks.</p>` : '';
    return `
    <section class="lenders-section">
        <div class="container-narrow">
            <h2>Top SBA lenders for ${industryNoun} deals</h2>
            <p class="ls-sub">The ten banks that have approved the most SBA 7(a) ${industryNoun} loans FY2020-2025. Pulled directly from SBA FOIA data. Loan count alone doesn&rsquo;t capture lender fit for your specific deal &mdash; volume leaders and specialist fit can differ.</p>
            <div class="viz-container">${chartSvg}</div>
            <p class="ls-footnote">Top 10 lenders account for approximately ${fmt.pct1(concentrationPct)} of all ${industryNoun} SBA 7(a) volume.</p>${highlightCallout}
        </div>
    </section>`;
}

function renderStateChartSvg(states, industryNoun) {
    const top8 = states.slice(0, 8);
    const max = top8[0].loan_count;
    const width = 640;
    const topPad = 28;
    const rowHeight = 36;
    const labelColEnd = 80;
    const barStart = 92;
    const barMaxWidth = 420;
    const valueGap = 8;
    const botPad = 16;
    const totalHeight = topPad + rowHeight * top8.length + botPad;

    const rows = top8.map((s, i) => {
        const rowY = topPad + rowHeight * i + rowHeight / 2;
        const barW = (s.loan_count / max) * barMaxWidth;
        const isTop = i === 0;
        const barColor = isTop ? '#008254' : '#c9d0d8';
        const textColor = isTop ? '#111' : '#444';
        const valueX = barStart + barW + valueGap;
        return `    <g>
      <text x="${labelColEnd}" y="${rowY + 4}" text-anchor="end" font-size="13" font-weight="${isTop ? '700' : '500'}" fill="${textColor}">${s.state}</text>
      <rect x="${barStart}" y="${rowY - 10}" width="${barW.toFixed(1)}" height="20" rx="3" fill="${barColor}"/>
      <text x="${valueX.toFixed(1)}" y="${rowY + 4}" text-anchor="start" font-size="13" font-weight="${isTop ? '700' : '500'}" fill="${textColor}">${fmt.num(s.loan_count)} &#8226; ${fmt.pct1(s.pct_of_industry_loans)}</text>
    </g>`;
    }).join('\n');

    const descText = top8.map(s => `${s.state} ${fmt.num(s.loan_count)} loans (${fmt.pct1(s.pct_of_industry_loans)})`).join('; ');

    return `<svg viewBox="0 0 ${width} ${totalHeight}" role="img" aria-labelledby="viz-states-title viz-states-desc" class="data-viz-svg" preserveAspectRatio="xMidYMid meet">
    <title id="viz-states-title">Top 8 states for SBA ${industryNoun} lending</title>
    <desc id="viz-states-desc">Horizontal bar chart of the top 8 states by SBA ${industryNoun} loan count: ${descText}. Leading state highlighted in green.</desc>
${rows}
  </svg>`;
}

function renderStatesSection(states, industryNoun) {
    const chartSvg = renderStateChartSvg(states, industryNoun);
    const leader = states[0];
    const second = states[1];
    const leadFactor = leader && second ? (leader.loan_count / second.loan_count).toFixed(2) : '';
    return `
    <section class="states-section">
        <div class="container-narrow">
            <h2>Where ${industryNoun} SBA lending concentrates</h2>
            <p class="ls-sub">The eight states leading in ${industryNoun} SBA 7(a) approvals FY2020-2025. ${leader.state} leads the next-largest state (${second ? second.state : ''}) by roughly ${leadFactor}&times; on loan count; top 8 states account for roughly half of all national ${industryNoun} SBA volume.</p>
            <div class="viz-container">${chartSvg}</div>
        </div>
    </section>`;
}

function renderStateIndustriesSection(cfg) {
    const states = LINKS.stateIndustriesFor(cfg.slug);
    if (!states || states.length === 0) return '';
    const industryNoun = cfg.industryNoun || cfg.slug.replace(/-/g, ' ');
    const nounCap = industryNoun[0].toUpperCase() + industryNoun.slice(1);
    const lead = states[0];
    const items = states.map(s =>
        `<li><a href="${esc(s.href)}"><strong>${esc(s.label)}</strong></a> &mdash; state-specific ${esc(industryNoun)} SBA loan guide.</li>`
    ).join('\n                ');
    return `
    <section class="ed alt" aria-label="${esc(industryNoun)} SBA lending by state">
        <div class="ed-inner">
            <h2 style="text-align:left;">${nounCap} SBA lending by state</h2>
            <p>${esc(lead.label)} is ${esc(lead.rationale)}. More state-specific ${esc(industryNoun)} SBA guides will appear here as volume justifies the depth.</p>
            <ul class="related-list">
                ${items}
            </ul>
        </div>
    </section>`;
}

function renderRelatedGuidesSection(cfg) {
    const rel = LINKS.relatedForIndustry(cfg.slug);
    const industries = (rel.industries || []).filter(slug => slug !== cfg.slug);
    const scenarios = rel.scenarios || [];
    if (industries.length === 0 && scenarios.length === 0) return '';

    const industryItems = industries.map(slug => {
        const label = LINKS.industryLabel(slug);
        return `<li><a href="${esc(LINKS.industryHref(slug))}"><strong>SBA Loans for ${esc(label)}</strong></a> &mdash; adjacent vertical with overlapping underwriting profile.</li>`;
    });

    const scenarioItems = scenarios.map(slug => {
        const label = LINKS.scenarioLabel(slug);
        return `<li><a href="${esc(LINKS.scenarioHref(slug))}"><strong>${esc(label)}</strong></a> &mdash; scenario-specific SBA guidance that applies here.</li>`;
    });

    const items = industryItems.concat(scenarioItems).join('\n                ');

    return `
    <section class="ed" aria-label="Related SBA guides">
        <div class="ed-inner">
            <h2 style="text-align:left;">Related SBA guides</h2>
            <p>Adjacent SBA lending pages with shared underwriting mechanics or audience overlap for ${esc(cfg.industryNoun || cfg.slug.replace(/-/g, ' '))} borrowers.</p>
            <ul class="related-list">
                ${items}
            </ul>
        </div>
    </section>`;
}

function renderProgramsSection(cfg) {
    const pc = cfg.programsContext;
    if (!pc || !pc.fits) {
        return `<section class="programs" id="programs"><div class="container"><h2 style="color:#c0392b">[Missing programsContext for ${esc(cfg.slug || 'unknown')}]</h2></div></section>`;
    }
    const industryNoun = cfg.industryNoun || cfg.slug.replace(/-/g, ' ');
    const heading = pc.heading || `Four financing paths for ${industryNoun} deals`;
    const sub = pc.sub || `SBA 7(a) handles most ${industryNoun} acquisitions and expansion needs. SBA 504 adds long-term fixed rates when real estate is part of the deal. Equipment financing is the non-SBA alternative for speed.`;
    const lbl = (k, def) => (pc.labels && pc.labels[k]) || def;
    return `
<section class="programs" id="programs">
    <div class="container">
        <h2>${esc(heading)}</h2>
        <p class="programs-sub">${sub}</p>
        <div class="programs-grid">
            <div class="program-card" style="border-top:4px solid #2F6BB3;">
                <div class="program-head"><div class="program-icon-wrap" style="color:#2F6BB3"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg></div><div class="program-label">${esc(lbl('standard','Acquisition + buildout'))}</div></div>
                <h3>SBA 7(a) Standard</h3>
                <div class="program-stats"><div><span class="program-stat-value">$5M</span><div class="program-stat-label">max</div></div><div><span class="program-stat-value">10%</span><div class="program-stat-label">min equity</div></div><div><span class="program-stat-value">60-90d</span><div class="program-stat-label">to close</div></div></div>
                <p class="program-fit"><strong>Right for:</strong> ${pc.fits.standard}</p>
            </div>
            <div class="program-card" style="border-top:4px solid #B8741C;">
                <div class="program-head"><div class="program-icon-wrap" style="color:#B8741C"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 12 3l9 6v12H3z"/><path d="M9 21v-6h6v6"/></svg></div><div class="program-label">${esc(lbl('504','Real estate + heavy equipment'))}</div></div>
                <h3>SBA 504</h3>
                <div class="program-stats"><div><span class="program-stat-value">$5.5M</span><div class="program-stat-label">max (SBA)</div></div><div><span class="program-stat-value">10%</span><div class="program-stat-label">min equity</div></div><div><span class="program-stat-value">75-120d</span><div class="program-stat-label">to close</div></div></div>
                <p class="program-fit"><strong>Right for:</strong> ${pc.fits['504']}</p>
            </div>
            <div class="program-card" style="border-top:4px solid #2D8659;">
                <div class="program-head"><div class="program-icon-wrap" style="color:#2D8659"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/><path d="M12 8v8"/></svg></div><div class="program-label">${esc(lbl('small','Under $500K deals'))}</div></div>
                <h3>SBA 7(a) Small Loan</h3>
                <div class="program-stats"><div><span class="program-stat-value">$500K</span><div class="program-stat-label">max</div></div><div><span class="program-stat-value">10%</span><div class="program-stat-label">min equity</div></div><div><span class="program-stat-value">45-75d</span><div class="program-stat-label">to close</div></div></div>
                <p class="program-fit"><strong>Right for:</strong> ${pc.fits.small}</p>
            </div>
            <div class="program-card" style="border-top:4px solid #717171;">
                <div class="program-head"><div class="program-icon-wrap" style="color:#717171"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg></div><div class="program-label">${esc(lbl('equipment','Non-SBA alternative'))}</div></div>
                <h3>Equipment Financing</h3>
                <div class="program-stats"><div><span class="program-stat-value">Full</span><div class="program-stat-label">replacement</div></div><div><span class="program-stat-value">Equip</span><div class="program-stat-label">as collateral</div></div><div><span class="program-stat-value">3-10d</span><div class="program-stat-label">to close</div></div></div>
                <p class="program-fit"><strong>Right for:</strong> ${pc.fits.equipment}</p>
            </div>
        </div>
    </div>
</section>`;
}

function renderComparisonTiles(stats, overall, industryNoun, totalSbaCount) {
    const avgDelta = ((stats.avg_loan / overall.avg_loan) - 1) * 100;
    const chgoffDeltaPP = stats.charge_off_pct - overall.charge_off_pct;
    const chgoffDeltaLabel = `${chgoffDeltaPP >= 0 ? '+' : ''}${chgoffDeltaPP.toFixed(2)}pp`;
    const industryShareOfSba = (stats.loan_count / totalSbaCount) * 100;

    const chgoffClass = chgoffDeltaPP <= -0.2 ? 'ct-down' : chgoffDeltaPP >= 0.2 ? 'ct-up' : 'ct-neutral';
    const chgoffNarrative = chgoffDeltaPP <= -0.5
        ? `Materially below SBA average &mdash; one of the stronger performers in the portfolio.`
        : chgoffDeltaPP <= -0.2
            ? `Better than SBA average &mdash; reflects favorable ${industryNoun} economics.`
            : chgoffDeltaPP <= 0.2
                ? `In line with SBA cross-industry average.`
                : `Modestly above SBA average; reflects ${industryNoun}-specific cost structure.`;

    const avgNarrative = avgDelta >= 20
        ? `Meaningfully higher than SBA average &mdash; ${industryNoun} deals tend to be capital-intensive.`
        : avgDelta <= -20
            ? `Smaller deals than SBA average &mdash; ${industryNoun} is less capital-intensive than many industries.`
            : `Close to SBA average loan size across all industries.`;

    return `
    <section class="comparison-tiles">
        <div class="container">
            <h2>${industryNoun[0].toUpperCase() + industryNoun.slice(1)} SBA vs. SBA overall &mdash; at a glance</h2>
            <div class="ct-grid">
                <div class="ct-tile">
                    <div class="ct-delta ${avgDelta >= 0 ? 'ct-up' : 'ct-down'}">${fmt.signedPct(avgDelta)}</div>
                    <div class="ct-label">Average loan size</div>
                    <div class="ct-values"><strong>${fmt.usdK(stats.avg_loan)}</strong> ${industryNoun} &nbsp;vs&nbsp; <span>${fmt.usdK(overall.avg_loan)} SBA avg</span></div>
                    <div class="ct-context">${avgNarrative}</div>
                </div>
                <div class="ct-tile">
                    <div class="ct-delta ${chgoffClass}">${chgoffDeltaLabel}</div>
                    <div class="ct-label">Charge-off rate</div>
                    <div class="ct-values"><strong>${fmt.pct(stats.charge_off_pct)}</strong> ${industryNoun} &nbsp;vs&nbsp; <span>${fmt.pct(overall.charge_off_pct)} SBA avg</span></div>
                    <div class="ct-context">${chgoffNarrative}</div>
                </div>
                <div class="ct-tile ct-highlight">
                    <div class="ct-big">${fmt.num(stats.loan_count)}</div>
                    <div class="ct-label">${industryNoun[0].toUpperCase() + industryNoun.slice(1)} SBA loans (FY2020-2025)</div>
                    <div class="ct-context">${fmt.pct1(industryShareOfSba)} of all SBA 7(a) loans nationally across ${fmt.usdShort(stats.total_approval)} in approvals.</div>
                </div>
            </div>
        </div>
    </section>`;
}

function renderQuiz(cfg) {
    const questions = cfg.quiz.questions.map((q, i) => `
                        <div class="quiz-question" data-q="${i}"${i === 0 ? '' : ' style="display:none"'}>
                            <h3>${esc(q.q)}</h3>
                            <div class="quiz-options">${q.opts.map(o => `
                                <button type="button" class="quiz-option" data-value="${esc(o.v)}">${esc(o.l)}</button>`).join('')}
                            </div>
                        </div>`).join('');

    const profilesJson = JSON.stringify(cfg.quiz.profiles);
    return { questionsHtml: questions, profilesJson, scoringBody: cfg.quiz.scoringBody, total: cfg.quiz.questions.length };
}

function renderFaqs(faqs) {
    const items = faqs.map(f => `
            <details class="faq-item">
                <summary><span class="faq-icon-wrap"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 17h.01"/><path d="M12 13.5V13a3 3 0 1 0-3-3"/></svg></span><span class="faq-q">${esc(f.q)}</span><span class="faq-marker" aria-hidden="true"></span></summary>
                <div class="faq-answer">${f.a}</div>
            </details>`).join('');
    return items;
}

function renderFaqSchema(faqs) {
    return JSON.stringify(faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": {"@type": "Answer", "text": f.a},
    })), null, 0);
}

// ─── Page template ──────────────────────────────────────────────────────

function renderPage(naicsCode) {
    const cfg = CONFIGS[naicsCode];
    if (!cfg) throw new Error(`No config for NAICS ${naicsCode}`);
    const industry = DATA.industries[naicsCode];
    if (!industry) throw new Error(`No industry data for NAICS ${naicsCode}`);
    const stats = industry.stats;
    const overall = DATA.metadata.overall_sba_stats;

    const canonicalUrl = `https://mymoneymarketplace.com/sba-loans/${cfg.slug}`;

    // Compute narrative substitutions — apply UNIFORMLY across all narrative
    // sections so any {token} placeholder resolves regardless of which section
    // a config authored it in. This fixes the {franchise_pct} leak previously
    // constrained to cfg.narrative.indep only.
    const chgoffRatio = stats.charge_off_vs_sba_avg_ratio || (stats.charge_off_pct / overall.charge_off_pct);
    const chgoffRatioLabel = chgoffRatio < 1 ? `${chgoffRatio.toFixed(2)}x` : `${chgoffRatio.toFixed(2)}x`;
    const substitute = (s) => (s || '')
        .replace(/\{cost_off_pct\}/g, fmt.pct(stats.charge_off_pct))
        .replace(/\{sba_avg_chgoff\}/g, fmt.pct(overall.charge_off_pct))
        .replace(/\{chgoff_ratio_label\}/g, chgoffRatioLabel)
        .replace(/\{franchise_pct\}/g, (stats.franchise_loan_pct || 0).toFixed(2))
        .replace(/\{yoy_growth\}/g, (stats.yoy_growth || 0).toFixed(2))
        .replace(/\{loan_count\}/g, fmt.num(stats.loan_count || 0));
    const failureSection = substitute(cfg.narrative.failure);
    const indepSection = substitute(cfg.narrative.indep);
    const underwritingSection = substitute(cfg.narrative.underwriting);

    const { questionsHtml, profilesJson, scoringBody, total } = renderQuiz(cfg);

    const faqSchema = renderFaqSchema(cfg.faqs);
    const faqsHtml = renderFaqs(cfg.faqs);

    // JSON-LD
    const ldGraph = [
        {"@type":"Organization","name":"My Money Marketplace","url":"https://mymoneymarketplace.com","logo":"https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png"},
        {"@type":"BreadcrumbList","itemListElement":[
            {"@type":"ListItem","position":1,"name":"Home","item":"https://mymoneymarketplace.com"},
            {"@type":"ListItem","position":2,"name":"SBA Loans","item":"https://mymoneymarketplace.com/sba-loans"},
            {"@type":"ListItem","position":3,"name":cfg.breadcrumbName,"item":canonicalUrl},
        ]},
        {"@type":"Article","headline":cfg.title.replace(/ \| My Money Marketplace$/,''),"description":cfg.metaDesc,"author":{"@type":"Organization","name":"My Money Marketplace"},"publisher":{"@type":"Organization","name":"My Money Marketplace","logo":{"@type":"ImageObject","url":"https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png"}},"datePublished":"2026-04-22","dateModified":"2026-04-22","mainEntityOfPage":canonicalUrl},
        {"@type":"FinancialService","name":`SBA Loan Matching for ${industry.naics_description}`,"serviceType":`SBA loan guidance and lender matching for ${industry.naics_description.toLowerCase()}`,"description":cfg.serviceDescription,"areaServed":{"@type":"Country","name":"United States"},"provider":{"@type":"Organization","name":"My Money Marketplace","url":"https://mymoneymarketplace.com"}},
        {"@type":"FAQPage","mainEntity":JSON.parse(faqSchema)},
    ];
    const ldJson = JSON.stringify({"@context":"https://schema.org","@graph":ldGraph});

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(cfg.title)}</title>
    <meta name="description" content="${esc(cfg.metaDesc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonicalUrl}">
    <meta property="og:title" content="${esc(cfg.title)}">
    <meta property="og:description" content="${esc(cfg.metaDesc)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonicalUrl}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','GA_MEASUREMENT_ID');</script>
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root { --green: #008254; --green-dark: #006b45; --green-bg: #f0faf5; --text: #111111; --text-secondary: #444444; --text-muted: #717171; --border: #e2e2e2; --bg-light: #f7f7f7; --white: #ffffff; --navy: #1a3a5c; --accent-blue: #2F6BB3; --accent-green: #2D8659; --accent-amber: #B8741C; --accent-red: #b84a2f; --quote-accent: #2F6BB3; }
        html { scroll-behavior: smooth; scroll-padding-top: 80px; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: var(--text); background: var(--white); line-height: 1.7; -webkit-font-smoothing: antialiased; }
        a { color: inherit; }
        .header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: var(--white); border-bottom: 1px solid var(--border); height: 64px; }
        .header-inner { max-width: 1120px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .header-logo img { height: 32px; }
        .header-nav { display: flex; align-items: center; gap: 32px; }
        .header-link { font-size: 14px; font-weight: 500; color: var(--text-secondary); text-decoration: none; }
        .header-link:hover { color: var(--green); }
        .mobile-toggle { display: none; background: none; border: none; cursor: pointer; padding: 4px; }
        .mobile-toggle span { display: block; width: 22px; height: 2px; background: var(--text); margin: 5px 0; }
        @media (max-width: 768px) { .header-link { display: none; } .mobile-toggle { display: block; } }
        .container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .container-narrow { max-width: 820px; margin: 0 auto; padding: 0 24px; }
        .breadcrumb { padding: 16px 0; margin-top: 64px; background: var(--bg-light); border-bottom: 1px solid var(--border); }
        .breadcrumb-list { display: flex; align-items: center; gap: 8px; list-style: none; font-size: 13px; flex-wrap: wrap; }
        .breadcrumb-list a { color: var(--text-muted); text-decoration: none; }
        .breadcrumb-list a:hover { color: var(--green); }
        .breadcrumb-list .sep { color: var(--text-muted); }
        .breadcrumb-list .current { color: var(--text-secondary); font-weight: 500; }
        .hero { padding: 56px 0 56px; background: linear-gradient(180deg, var(--bg-light) 0%, var(--white) 100%); }
        .hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px; align-items: start; }
        .hero-left h1 { font-size: clamp(30px, 4vw, 44px); font-weight: 700; color: var(--text); line-height: 1.15; margin-bottom: 18px; }
        .hero-left .sub { font-size: 17px; color: var(--text-secondary); line-height: 1.65; margin-bottom: 22px; }
        .hero-value { display: inline-flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; color: var(--navy); background: var(--green-bg); border-left: 3px solid var(--green); padding: 12px 18px; border-radius: 4px; margin-bottom: 22px; line-height: 1.5; }
        .hero-skip { font-size: 14px; color: var(--text-muted); text-decoration: none; border-bottom: 1px dotted var(--text-muted); padding-bottom: 1px; }
        .hero-skip:hover { color: var(--green); border-bottom-color: var(--green); }
        .basics-link { font-size: 13px; color: var(--text-muted); margin-top: 16px; }
        .basics-link a { color: var(--accent-blue); text-decoration: underline; }
        @media (max-width: 900px) { .hero { padding: 40px 0 48px; } .hero-grid { grid-template-columns: 1fr; gap: 32px; } }
        .quiz-card { background: var(--white); border: 1px solid var(--border); border-radius: 12px; padding: 28px; box-shadow: 0 6px 24px rgba(20, 40, 70, 0.06); }
        .quiz-progress { margin-bottom: 22px; }
        .quiz-step-label { display: block; font-size: 12px; color: var(--text-muted); font-weight: 500; margin-bottom: 8px; letter-spacing: 0.4px; text-transform: uppercase; }
        .quiz-bar { height: 6px; background: var(--bg-light); border-radius: 3px; overflow: hidden; }
        .quiz-bar-fill { height: 100%; background: var(--green); transition: width 0.35s ease; }
        .quiz-question h3 { font-size: 18px; font-weight: 600; color: var(--text); margin-bottom: 18px; line-height: 1.35; }
        .quiz-options { display: flex; flex-direction: column; gap: 8px; }
        .quiz-option { text-align: left; font-family: inherit; font-size: 15px; padding: 13px 16px; border: 1px solid var(--border); border-radius: 8px; background: var(--white); color: var(--text); cursor: pointer; transition: border-color 0.15s, background 0.15s; }
        .quiz-option:hover { border-color: var(--green); background: var(--green-bg); }
        .quiz-option:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
        .quiz-result-badge { display: inline-block; padding: 4px 12px; background: var(--green-bg); color: var(--green); font-size: 11px; font-weight: 700; border-radius: 12px; letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 14px; }
        #resultHeadline { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 12px; line-height: 1.3; }
        #resultBody { font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 22px; }
        .quiz-cta-btn { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 14px 26px; border-radius: 8px; text-decoration: none; }
        .quiz-cta-btn:hover { background: var(--green-dark); color: var(--white); }
        .quiz-retake { display: block; margin-top: 14px; background: none; border: none; color: var(--text-muted); font-size: 13px; font-family: inherit; cursor: pointer; text-decoration: underline; padding: 4px 0; }
        /* By-the-numbers stat block */
        .by-numbers { padding: 56px 0; background: var(--white); }
        .by-numbers h2 { font-size: 26px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 8px; }
        .bn-sub { text-align: center; color: var(--text-secondary); font-size: 14px; max-width: 680px; margin: 0 auto 32px; line-height: 1.6; }
        .bn-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 1040px; margin: 0 auto; }
        .bn-card { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 20px 22px; }
        .bn-card.bn-highlight { border-left: 3px solid var(--green); background: var(--green-bg); }
        .bn-label { font-size: 12px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px; }
        .bn-value { font-size: 28px; font-weight: 700; color: var(--text); line-height: 1.1; margin-bottom: 4px; }
        .bn-footnote { font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }
        @media (max-width: 760px) { .bn-grid { grid-template-columns: 1fr; } }
        /* Programs */
        .programs { padding: 64px 0; background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .programs h2 { font-size: 28px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 10px; }
        .programs-sub { text-align: center; color: var(--text-secondary); font-size: 15px; max-width: 680px; margin: 0 auto 36px; line-height: 1.6; }
        .programs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .program-card { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 22px; display: flex; flex-direction: column; }
        .program-head { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .program-icon-wrap { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; border-radius: 8px; background: var(--bg-light); }
        .program-label { font-size: 10.5px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--text-muted); }
        .program-card h3 { font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 14px; line-height: 1.3; }
        .program-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 14px; padding: 12px 0; border-top: 1px solid var(--bg-light); border-bottom: 1px solid var(--bg-light); }
        .program-stat-value { font-size: 16px; font-weight: 700; color: var(--text); line-height: 1.15; }
        .program-stat-label { font-size: 10.5px; color: var(--text-muted); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.4px; }
        .program-fit { font-size: 13.5px; color: var(--text-secondary); line-height: 1.55; margin-top: auto; }
        .program-fit strong { color: var(--text); font-weight: 600; }
        @media (max-width: 1000px) { .programs-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .programs-grid { grid-template-columns: 1fr; } }
        /* Editorial sections */
        .ed { padding: 64px 0; background: var(--white); }
        .ed.alt { background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .ed h2 { font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 14px; text-align: center; }
        .ed .ed-inner { max-width: 820px; margin: 0 auto; padding: 0 24px; }
        .ed h3 { font-size: 19px; font-weight: 600; color: var(--text); margin: 26px 0 10px; }
        .ed p { font-size: 15px; color: var(--text-secondary); line-height: 1.8; margin-bottom: 14px; }
        .ed strong { color: var(--text); }
        .ed a.inline { color: var(--green); font-weight: 500; text-decoration: underline; }
        /* Lender / state tables */
        .lenders-section, .states-section { padding: 56px 0; }
        .lenders-section { background: var(--bg-light); border-top: 1px solid var(--border); }
        .states-section { background: var(--white); border-top: 1px solid var(--border); }
        .lenders-section h2, .states-section h2 { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 10px; text-align: center; }
        .ls-sub { text-align: center; color: var(--text-secondary); font-size: 14px; max-width: 720px; margin: 0 auto 24px; line-height: 1.65; }
        .ls-footnote { font-size: 13px; color: var(--text-muted); max-width: 720px; margin: 16px auto 0; text-align: center; line-height: 1.6; }
        .lender-table-wrap { max-width: 780px; margin: 0 auto; overflow-x: auto; border: 1px solid var(--border); border-radius: 8px; background: var(--white); }
        .lender-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .lender-table thead { background: var(--navy); color: var(--white); }
        .lender-table th { text-align: left; padding: 12px 14px; font-weight: 600; font-size: 13px; }
        .lender-table td { padding: 11px 14px; color: var(--text-secondary); border-top: 1px solid var(--bg-light); }
        .lender-table tr:first-child td { border-top: 0; }
        .lender-table .rank { font-weight: 700; color: var(--text-muted); width: 50px; }
        .lender-table .lender-name, .lender-table .state-name { color: var(--text); font-weight: 500; }
        .lender-table .lender-count, .lender-table .state-count { font-variant-numeric: tabular-nums; }
        /* FAQ */
        .faq-section { padding: 64px 0; background: var(--bg-light); border-top: 1px solid var(--border); }
        .faq-section h2 { font-size: 26px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 32px; }
        .faq-list { max-width: 780px; margin: 0 auto; }
        .faq-item { background: var(--white); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 10px; overflow: hidden; }
        .faq-item[open] { box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05); }
        .faq-item summary { display: flex; align-items: center; gap: 14px; padding: 16px 20px; font-size: 15px; font-weight: 600; color: var(--text); cursor: pointer; list-style: none; }
        .faq-item summary:hover { background: var(--bg-light); }
        .faq-item summary::-webkit-details-marker { display: none; }
        .faq-icon-wrap { flex-shrink: 0; color: var(--green); display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: var(--green-bg); border-radius: 6px; }
        .faq-q { flex: 1; }
        .faq-marker { flex-shrink: 0; width: 16px; height: 16px; position: relative; }
        .faq-marker::before, .faq-marker::after { content: ''; position: absolute; background: var(--text-muted); top: 7px; left: 1px; right: 1px; height: 2px; border-radius: 1px; transition: transform 0.25s ease; }
        .faq-marker::after { transform: rotate(90deg); }
        .faq-item[open] .faq-marker::after { transform: rotate(0deg); }
        .faq-answer { overflow: hidden; max-height: 0; padding: 0 20px; font-size: 14.5px; color: var(--text-secondary); line-height: 1.75; transition: max-height 0.3s ease, padding 0.3s ease; }
        .faq-item[open] .faq-answer { max-height: 800px; padding: 0 20px 18px 62px; }
        /* Hero photo banner */
        .hero-photo-banner { position: relative; margin-top: 64px; background: #1a3a5c; overflow: hidden; height: 320px; }
        .hero-photo-img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .hero-photo-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(247,247,247,0.2) 75%, rgba(247,247,247,1) 100%); pointer-events: none; }
        .hero-photo-credit { position: absolute; bottom: 8px; right: 14px; font-size: 11px; color: rgba(255,255,255,0.9); text-shadow: 0 1px 3px rgba(0,0,0,0.5); margin: 0; z-index: 2; }
        .hero-photo-credit a { color: inherit; text-decoration: underline; }
        .hero-photo-credit a:hover { color: var(--white); }
        .hero-photo-banner + .breadcrumb { margin-top: 0; }
        @media (max-width: 640px) { .hero-photo-banner { height: 220px; } }
        /* Inline SVG data viz container */
        .viz-container { max-width: 780px; margin: 0 auto; padding: 16px 0; }
        .data-viz-svg { width: 100%; height: auto; display: block; font-family: 'Inter', sans-serif; }
        /* Comparison tiles */
        .comparison-tiles { padding: 48px 0; background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
        .comparison-tiles h2 { font-size: 22px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 28px; }
        .ct-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 1040px; margin: 0 auto; }
        .ct-tile { background: var(--white); border: 1px solid var(--border); border-radius: 10px; padding: 22px 24px; display: flex; flex-direction: column; }
        .ct-tile.ct-highlight { border-left: 3px solid var(--green); background: var(--green-bg); }
        .ct-delta { display: inline-block; align-self: flex-start; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 700; margin-bottom: 10px; font-variant-numeric: tabular-nums; }
        .ct-delta.ct-up { background: #fff4e5; color: var(--accent-amber); }
        .ct-delta.ct-down { background: #e8f5ef; color: var(--green); }
        .ct-delta.ct-neutral { background: #eef0f4; color: #555; }
        .ct-big { font-size: 40px; font-weight: 700; color: var(--green); line-height: 1; margin-bottom: 8px; font-variant-numeric: tabular-nums; }
        .ct-label { font-size: 13px; font-weight: 600; color: var(--text-muted); letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 8px; }
        .ct-values { font-size: 15px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 10px; }
        .ct-values strong { color: var(--text); font-weight: 700; }
        .ct-values span { color: var(--text-muted); font-size: 13px; }
        .ct-context { font-size: 13px; color: var(--text-muted); line-height: 1.55; margin-top: auto; }
        @media (max-width: 760px) { .ct-grid { grid-template-columns: 1fr; } }
        /* Closing CTA */
        .closing-cta { padding: 64px 0; background: var(--navy); text-align: center; }
        .closing-cta h2 { font-size: 26px; font-weight: 700; color: var(--white); margin-bottom: 12px; }
        .closing-cta p { font-size: 15px; color: rgba(255,255,255,0.78); max-width: 620px; margin: 0 auto 26px; line-height: 1.65; }
        .closing-cta p a { color: #7ee0b1; text-decoration: underline; }
        .closing-cta-btn { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 15px 32px; border-radius: 8px; text-decoration: none; }
        .closing-cta-btn:hover { background: var(--green-dark); }
        .closing-fine { font-size: 12px; color: rgba(255,255,255,0.55); max-width: 600px; margin: 16px auto 0; line-height: 1.55; }
        .footer { background: #1a1a1a; color: #cccccc; padding: 48px 0 0; }
        .footer-grid { display: grid; grid-template-columns: 1fr 2fr; gap: 48px; margin-bottom: 32px; }
        .footer-col h4 { color: var(--white); font-size: 13px; font-weight: 600; margin-bottom: 16px; letter-spacing: 0.4px; text-transform: uppercase; }
        .footer-col a { display: block; font-size: 13px; color: #999999; text-decoration: none; margin-bottom: 10px; }
        .footer-col a:hover { color: var(--white); }
        .footer-col p { font-size: 13px; color: #999999; line-height: 1.7; }
        .footer-bottom { border-top: 1px solid #333333; padding: 20px 0; text-align: center; font-size: 12px; color: #666666; }
        @media (max-width: 640px) { .footer-grid { grid-template-columns: 1fr; gap: 28px; } }
    </style>
    <script type="application/ld+json">${ldJson}</script>
</head>
<body>

<header class="header">
    <div class="header-inner">
        <a href="/" class="header-logo"><img src="https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png" alt="My Money Marketplace" width="180" height="32"></a>
        <nav class="header-nav">
            <a href="/credit-cards" class="header-link">Credit Cards</a>
            <a href="/personal-loans" class="header-link">Personal Loans</a>
            <a href="/business-loans" class="header-link">Business Loans</a>
            <a href="/savings" class="header-link">Savings</a>
            <button class="mobile-toggle" aria-label="Menu"><span></span><span></span><span></span></button>
        </nav>
    </div>
</header>
${renderHeroPhoto(cfg.heroPhoto)}

<nav class="breadcrumb" aria-label="Breadcrumb">
    <div class="container">
        <ol class="breadcrumb-list"><li><a href="/">Home</a></li><li class="sep">/</li><li><a href="/sba-loans">SBA Loans</a></li><li class="sep">/</li><li class="current">${cfg.breadcrumbName}</li></ol>
    </div>
</nav>

<section class="hero">
    <div class="container">
        <div class="hero-grid">
            <div class="hero-left">
                <h1>${cfg.h1}</h1>
                <p class="sub">${cfg.heroSub}</p>
                <p class="hero-value">${cfg.heroValue}</p>
                <a href="#programs" class="hero-skip">Skip to program details &rarr;</a>
                <p class="basics-link">New to SBA? Start with <a href="/sba-loans/requirements">SBA loan requirements</a>.</p>
            </div>
            <div class="hero-right" id="quiz">
                <div class="quiz-card" id="quizCard">
                    <div class="quiz-progress" id="quizProgress">
                        <span class="quiz-step-label">Question <span id="quizCurrent">1</span> of ${total}</span>
                        <div class="quiz-bar"><div class="quiz-bar-fill" id="quizBar" style="width:${(100/total).toFixed(1)}%"></div></div>
                    </div>
                    <div id="quizQuestions">${questionsHtml}
                    </div>
                    <div id="quizResult" class="quiz-result" style="display:none" aria-live="polite">
                        <div class="quiz-result-badge" id="resultBadge"></div>
                        <h3 id="resultHeadline"></h3>
                        <p id="resultBody"></p>
                        <a id="resultCta" class="quiz-cta-btn" href="#" rel="nofollow sponsored">Continue &rarr;</a>
                        <button type="button" class="quiz-retake" id="quizRetake">Start over</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>

${renderStatsBlock(stats, overall, cfg.industryNoun || cfg.slug.replace(/-/g, ' '), naicsCode, industry.naics_description)}

${renderComparisonTiles(stats, overall, cfg.industryNoun || cfg.slug.replace(/-/g, ' '), DATA.metadata.overall_sba_stats.loan_count)}

${renderProgramsSection(cfg)}

<section class="ed">
    <div class="ed-inner">
        <h2 style="text-align:left;">${cfg.narrative.underwritingTitle}</h2>
        ${underwritingSection}
    </div>
</section>

<section class="ed alt">
    <div class="ed-inner">
        <h2 style="text-align:left;">${cfg.narrative.indepTitle}</h2>
        ${indepSection}
    </div>
</section>

<section class="ed">
    <div class="ed-inner">
        <h2 style="text-align:left;">${cfg.narrative.failureTitle}</h2>
        ${failureSection}
    </div>
</section>

${renderLendersSection(stats.top_lenders_by_count, cfg.industryNoun || cfg.slug.replace(/-/g, ' '), cfg.industryNounPossessive || '', cfg.highlightLenderNames || [], stats.lender_concentration_top10_pct)}

${renderStatesSection(stats.top_states_by_count, cfg.industryNoun || cfg.slug.replace(/-/g, ' '))}

${renderStateIndustriesSection(cfg)}

${renderRelatedGuidesSection(cfg)}

<section class="faq-section" id="faq">
    <div class="container">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-list">${faqsHtml}
        </div>
    </div>
</section>

<section class="closing-cta">
    <div class="container">
        <h2>Get matched with ${cfg.industryNoun || cfg.slug.replace(/-/g, ' ')}-experienced SBA lenders</h2>
        <p>${cfg.industryNoun ? cfg.industryNoun.charAt(0).toUpperCase() + cfg.industryNoun.slice(1) : 'This'} SBA is a narrow specialty. The top ten lenders above handle a meaningful share of all ${cfg.industryNoun || 'industry'} 7(a) volume &mdash; matching there vs. a generalist branch is the difference between a clean 60-day close and a stalled file. See the broader <a href="/sba-loans">SBA loans hub</a> or <a href="/sba-loans/business-acquisition">SBA acquisition mechanics</a>.</p>
        <a href="https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=${cfg.campaignSlug}&utm_content=closing-cta" class="closing-cta-btn" rel="nofollow sponsored">Match with ${cfg.industryNoun || cfg.slug.replace(/-/g, ' ')} SBA lenders &rarr;</a>
        <p class="closing-fine">MMM does not originate SBA loans. Applications are processed through SBA-authorized lenders. Statistics above are sourced from the SBA FOIA 7(a) dataset, fiscal years 2020 through December 2025.</p>
    </div>
</section>

<footer class="footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-col"><h4>Products</h4><a href="/personal-loans">Personal Loans</a><a href="/business-loans">Business Loans</a><a href="/sba-loans">SBA Loans</a><a href="/credit-cards">Credit Cards</a><a href="/savings">Savings</a></div>
            <div class="footer-col"><h4>About</h4><p>My Money Marketplace helps consumers and small business owners compare financial products and get matched with lenders. We may receive compensation from partners when you click links on our site. We do not originate SBA loans; applications are processed through SBA-authorized lenders. We do not provide financial, legal, or tax advice.</p></div>
        </div>
    </div>
    <div class="footer-bottom"><div class="container">&copy; 2026 My Money Marketplace. All rights reserved.</div></div>
</footer>

<script>
(function(){'use strict';
var PROFILES=${profilesJson};
var BASE_UTM="https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=${cfg.campaignSlug}";
var TOTAL=${total};var answers=new Array(TOTAL).fill(null);
${scoringBody}
var questionEls=document.querySelectorAll('.quiz-question');var progressCurrent=document.getElementById('quizCurrent');var progressBar=document.getElementById('quizBar');var progressWrap=document.getElementById('quizProgress');var questionsWrap=document.getElementById('quizQuestions');var resultWrap=document.getElementById('quizResult');
function showQuestion(idx){for(var i=0;i<questionEls.length;i++){questionEls[i].style.display=(i===idx)?'block':'none';}if(progressCurrent)progressCurrent.textContent=(idx+1);if(progressBar)progressBar.style.width=(((idx+1)/TOTAL)*100).toFixed(1)+'%';}
function showResult(){var key=score(answers);var p=PROFILES[key]||PROFILES.B;document.getElementById('resultBadge').textContent=p.badge;document.getElementById('resultHeadline').textContent=p.headline;document.getElementById('resultBody').textContent=p.body;var cta=document.getElementById('resultCta');var url=p.ctaUrl||(BASE_UTM+'&utm_content='+encodeURIComponent(p.utmContent));cta.href=url;cta.innerHTML=p.ctaLabel+' &rarr;';if(progressWrap)progressWrap.style.display='none';if(questionsWrap)questionsWrap.style.display='none';resultWrap.style.display='block';try{resultWrap.scrollIntoView({behavior:'smooth',block:'nearest'});}catch(e){}}
function reset(){answers=new Array(TOTAL).fill(null);if(resultWrap)resultWrap.style.display='none';if(progressWrap)progressWrap.style.display='block';if(questionsWrap)questionsWrap.style.display='block';showQuestion(0);}
if(questionsWrap){questionsWrap.addEventListener('click',function(ev){var t=ev.target;if(!t||!t.classList||!t.classList.contains('quiz-option'))return;ev.preventDefault();var q=t.closest('.quiz-question');if(!q)return;var qi=parseInt(q.getAttribute('data-q'),10);answers[qi]=t.getAttribute('data-value');if(qi+1>=TOTAL)showResult();else showQuestion(qi+1);});}
var rb=document.getElementById('quizRetake');if(rb)rb.addEventListener('click',reset);showQuestion(0);})();
</script>

</body>
</html>
`;
}

// ─── Pre-publish guardrail (shared integration) ─────────────────────────
// Runs the per-page audit against freshly-generated HTML BEFORE writing it
// to disk. CRITICAL and HIGH severity findings BLOCK the write; MEDIUM and
// LOW findings are printed as warnings but do not block. Findings already
// present in data/audit-baseline.json are grandfathered so regenerating an
// existing page with pre-existing issues does not fail.
//
// Bypass: set SKIP_AUDIT=1 to skip the guardrail (development only, do not
// use for commits that will land on main).
//
// Preview mode: pass --preview as a third CLI arg to run the audit and print
// findings without writing the file (useful for CI-style checks).

const audit = require('./audit-module.js');

function runPrePublishGuardrail({ html, urlPath, label }) {
    if (process.env.SKIP_AUDIT === '1') {
        console.warn(`  [audit] SKIP_AUDIT=1 — guardrail bypassed for ${label}.`);
        return { blocked: false, findings: [] };
    }
    const baselinePath = path.join(__dirname, '..', 'data', 'audit-baseline.json');
    const baseline = audit.loadBaseline(baselinePath);
    const findings = audit.runChecks(html, {
        urlPath,
        checkNames: audit.PRE_PUBLISH_CHECKS,
    });
    const newFindings = audit.filterNewFindings(findings, baseline);
    const blockers = newFindings.filter(f => audit.BLOCKING_SEVERITIES.includes(f.severity));
    const warnings = newFindings.filter(f => !audit.BLOCKING_SEVERITIES.includes(f.severity));

    if (warnings.length > 0) {
        console.warn(`  [audit] ${warnings.length} non-blocking finding(s) for ${label}:`);
        for (const w of warnings) console.warn(`    - ${audit.formatFinding(w).replace(/\n/g, '\n      ')}`);
    }
    if (blockers.length > 0) {
        console.error(`\n  [audit] BLOCKED: ${blockers.length} CRITICAL/HIGH finding(s) for ${label}:`);
        for (const b of blockers) console.error(`    - ${audit.formatFinding(b).replace(/\n/g, '\n      ')}`);
        console.error(`\n  File NOT written. Fix the above issues or set SKIP_AUDIT=1 to bypass (not for production).`);
        return { blocked: true, findings: blockers };
    }
    return { blocked: false, findings: newFindings };
}

// ─── CLI entrypoint ─────────────────────────────────────────────────────

function main() {
    const naicsCode = process.argv[2];
    const preview = process.argv.includes('--preview');
    if (!naicsCode) {
        console.error('Usage: node scripts/generate-industry-page.js <NAICS_CODE> [--preview]');
        console.error('Configured NAICS codes: ' + Object.keys(CONFIGS).join(', '));
        process.exit(1);
    }
    const cfg = CONFIGS[naicsCode];
    if (!cfg) {
        console.error(`No config for NAICS ${naicsCode}. Configured: ${Object.keys(CONFIGS).join(', ')}`);
        process.exit(1);
    }
    const html = renderPage(naicsCode);
    const urlPath = `/sba-loans/${cfg.slug}`;
    const outPath = path.join(__dirname, '..', 'sba-loans', cfg.slug, 'index.html');

    // Pre-publish guardrail
    const { blocked } = runPrePublishGuardrail({ html, urlPath, label: urlPath });
    if (blocked) process.exit(1);

    if (preview) {
        console.log(`[preview] Would write ${outPath} (${html.length.toLocaleString()} chars). No file written.`);
        return;
    }

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`Wrote ${outPath} (${html.length.toLocaleString()} chars)`);
}

if (require.main === module) main();

module.exports = { renderPage, CONFIGS, runPrePublishGuardrail };
