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

// ─── Formatting helpers ─────────────────────────────────────────────────
const fmt = {
    num: n => Math.round(n).toLocaleString('en-US'),
    usdShort: n => n >= 1e9 ? `$${(n/1e9).toFixed(2)}B` : n >= 1e6 ? `$${(n/1e6).toFixed(1)}M` : `$${Math.round(n).toLocaleString('en-US')}`,
    usdK: n => `$${Math.round(n/1000)}K`,
    usdExact: n => `$${Math.round(n).toLocaleString('en-US')}`,
    pct: n => `${n.toFixed(2)}%`,
    pct1: n => `${n.toFixed(1)}%`,
};

function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Per-NAICS configs ──────────────────────────────────────────────────
const CONFIGS = {

'811111': {
    slug: 'auto-repair',
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

'722511': {
    slug: 'restaurants',
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

function renderStatsBlock(stats, overall) {
    const chgoffRatio = (stats.charge_off_pct / overall.charge_off_pct);
    const chgoffVsSba = chgoffRatio < 1 ? 'better than' : 'above';
    const chgoffArrow = chgoffRatio < 1 ? '&darr;' : '&uarr;';
    const yoy = stats.yoy_growth;
    const yoyArrow = yoy >= 0 ? '&uarr;' : '&darr;';
    const topState = stats.top_states_by_count[0];
    const secondState = stats.top_states_by_count[1];
    const thirdState = stats.top_states_by_count[2];

    return `
    <section class="by-numbers">
        <div class="container">
            <h2>Restaurant SBA lending &mdash; by the numbers</h2>
            <p class="bn-sub">SBA 7(a) loans to full-service restaurants (NAICS 722511), fiscal years 2020 through December 2025. Pulled from SBA FOIA 7(a) dataset.</p>
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

function renderLendersSection(lenders) {
    const rows = lenders.slice(0, 10).map((l, i) => `
                <tr>
                    <td class="rank">${i + 1}</td>
                    <td class="lender-name">${esc(l.bankname)}</td>
                    <td class="lender-count">${fmt.num(l.loan_count)}</td>
                    <td class="lender-avg">${fmt.usdK(l.avg_loan_for_this_industry)}</td>
                </tr>`).join('');
    return `
    <section class="lenders-section">
        <div class="container-narrow">
            <h2>Top SBA lenders for restaurant deals</h2>
            <p class="ls-sub">The ten banks that have approved the most SBA 7(a) restaurant loans FY2020-2025. Pulled from SBA FOIA data. This is an editorial observation, not an endorsement &mdash; loan count doesn&rsquo;t capture lender fit for your specific deal.</p>
            <div class="lender-table-wrap">
                <table class="lender-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>Lender</th>
                            <th>Loans</th>
                            <th>Avg loan</th>
                        </tr>
                    </thead>
                    <tbody>${rows}
                    </tbody>
                </table>
            </div>
            <p class="ls-footnote">Top 10 lenders account for approximately one-third of all restaurant SBA 7(a) volume &mdash; restaurant lending concentrates more than the cross-industry average.</p>
        </div>
    </section>`;
}

function renderStatesSection(states) {
    const topSeven = states.slice(0, 7);
    const rows = topSeven.map((s, i) => `
                <tr>
                    <td class="rank">${i + 1}</td>
                    <td class="state-name">${esc(s.state)}</td>
                    <td class="state-count">${fmt.num(s.loan_count)}</td>
                    <td class="state-pct">${fmt.pct1(s.pct_of_industry_loans)}</td>
                    <td class="state-approved">${fmt.usdShort(s.total_approval)}</td>
                </tr>`).join('');
    return `
    <section class="states-section">
        <div class="container-narrow">
            <h2>Where restaurant SBA lending happens</h2>
            <p class="ls-sub">The seven states leading in restaurant SBA 7(a) approvals FY2020-2025. California alone accounts for more than 1 in 8 restaurant SBA loans nationally, reflecting a combination of population, tourism, and high restaurant density per capita.</p>
            <div class="lender-table-wrap">
                <table class="lender-table">
                    <thead>
                        <tr>
                            <th>Rank</th>
                            <th>State</th>
                            <th>Loans</th>
                            <th>Share</th>
                            <th>Total approved</th>
                        </tr>
                    </thead>
                    <tbody>${rows}
                    </tbody>
                </table>
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

    // Compute narrative substitutions (failure-rate section uses stats)
    const chgoffRatio = stats.charge_off_vs_sba_avg_ratio || (stats.charge_off_pct / overall.charge_off_pct);
    const chgoffRatioLabel = chgoffRatio < 1 ? `${chgoffRatio.toFixed(2)}x` : `${chgoffRatio.toFixed(2)}x`;
    const failureSection = cfg.narrative.failure
        .replace(/\{cost_off_pct\}/g, fmt.pct(stats.charge_off_pct))
        .replace(/\{sba_avg_chgoff\}/g, fmt.pct(overall.charge_off_pct))
        .replace(/\{chgoff_ratio_label\}/g, chgoffRatioLabel);
    const indepSection = cfg.narrative.indep
        .replace(/\{franchise_pct\}/g, stats.franchise_loan_pct.toFixed(2));

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

${renderStatsBlock(stats, overall)}

<section class="programs" id="programs">
    <div class="container">
        <h2>Four financing paths for restaurant deals</h2>
        <p class="programs-sub">SBA 7(a) handles most restaurant acquisitions and buildouts. 504 adds long-term fixed rates when real estate is part of the deal. Equipment financing is the non-SBA alternative for speed.</p>
        <div class="programs-grid">
            <div class="program-card" style="border-top:4px solid #2F6BB3;">
                <div class="program-head"><div class="program-icon-wrap" style="color:#2F6BB3"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V7l9-4 9 4v14"/><path d="M9 21V11h6v10"/></svg></div><div class="program-label">Acquisition + buildout</div></div>
                <h3>SBA 7(a) Standard</h3>
                <div class="program-stats"><div><span class="program-stat-value">$5M</span><div class="program-stat-label">max</div></div><div><span class="program-stat-value">10%</span><div class="program-stat-label">min equity</div></div><div><span class="program-stat-value">60-90d</span><div class="program-stat-label">to close</div></div></div>
                <p class="program-fit"><strong>Right for:</strong> restaurant acquisitions, buildouts, expansion. Most common restaurant SBA path.</p>
            </div>
            <div class="program-card" style="border-top:4px solid #B8741C;">
                <div class="program-head"><div class="program-icon-wrap" style="color:#B8741C"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9 12 3l9 6v12H3z"/><path d="M9 21v-6h6v6"/></svg></div><div class="program-label">Real estate + heavy equipment</div></div>
                <h3>SBA 504</h3>
                <div class="program-stats"><div><span class="program-stat-value">$5.5M</span><div class="program-stat-label">max (SBA)</div></div><div><span class="program-stat-value">10%</span><div class="program-stat-label">min equity</div></div><div><span class="program-stat-value">75-120d</span><div class="program-stat-label">to close</div></div></div>
                <p class="program-fit"><strong>Right for:</strong> buying the building alongside the restaurant. Fixed long-term rates on the real-estate portion.</p>
            </div>
            <div class="program-card" style="border-top:4px solid #2D8659;">
                <div class="program-head"><div class="program-icon-wrap" style="color:#2D8659"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/><path d="M12 8v8"/></svg></div><div class="program-label">Under $500K deals</div></div>
                <h3>SBA 7(a) Small Loan</h3>
                <div class="program-stats"><div><span class="program-stat-value">$500K</span><div class="program-stat-label">max</div></div><div><span class="program-stat-value">10%</span><div class="program-stat-label">min equity</div></div><div><span class="program-stat-value">45-75d</span><div class="program-stat-label">to close</div></div></div>
                <p class="program-fit"><strong>Right for:</strong> equipment upgrades, small acquisitions, working capital under $500K. Faster close than Standard 7(a).</p>
            </div>
            <div class="program-card" style="border-top:4px solid #717171;">
                <div class="program-head"><div class="program-icon-wrap" style="color:#717171"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7" width="18" height="12" rx="2"/><path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg></div><div class="program-label">Non-SBA alternative</div></div>
                <h3>Equipment Financing</h3>
                <div class="program-stats"><div><span class="program-stat-value">Full</span><div class="program-stat-label">replacement</div></div><div><span class="program-stat-value">Equip</span><div class="program-stat-label">as collateral</div></div><div><span class="program-stat-value">3-10d</span><div class="program-stat-label">to close</div></div></div>
                <p class="program-fit"><strong>Right for:</strong> replacing specific destroyed or out-of-service equipment when SBA timeline won&rsquo;t work. Higher rate than SBA but much faster.</p>
            </div>
        </div>
    </div>
</section>

<section class="ed">
    <div class="ed-inner">
        <h2 style="text-align:left;">${cfg.narrative.underwritingTitle}</h2>
        ${cfg.narrative.underwriting}
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

${renderLendersSection(stats.top_lenders_by_count)}

${renderStatesSection(stats.top_states_by_count)}

<section class="faq-section" id="faq">
    <div class="container">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-list">${faqsHtml}
        </div>
    </div>
</section>

<section class="closing-cta">
    <div class="container">
        <h2>Get matched with restaurant-experienced SBA lenders</h2>
        <p>Restaurant SBA is a narrow specialty. The top ten lenders above handle about a third of all restaurant 7(a) volume &mdash; matching there vs. a generalist branch is the difference between a clean 60-day close and a stalled file. See the broader <a href="/sba-loans">SBA loans hub</a> or <a href="/sba-loans/business-acquisition">SBA acquisition mechanics</a>.</p>
        <a href="https://lendmatecapital.com/?utm_source=mmm&utm_medium=referral&utm_campaign=${cfg.campaignSlug}&utm_content=closing-cta" class="closing-cta-btn" rel="nofollow sponsored">Match with restaurant SBA lenders &rarr;</a>
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

// ─── CLI entrypoint ─────────────────────────────────────────────────────

function main() {
    const naicsCode = process.argv[2];
    if (!naicsCode) {
        console.error('Usage: node scripts/generate-industry-page.js <NAICS_CODE>');
        console.error('Configured NAICS codes: ' + Object.keys(CONFIGS).join(', '));
        process.exit(1);
    }
    const cfg = CONFIGS[naicsCode];
    if (!cfg) {
        console.error(`No config for NAICS ${naicsCode}. Configured: ${Object.keys(CONFIGS).join(', ')}`);
        process.exit(1);
    }
    const html = renderPage(naicsCode);
    const outPath = path.join(__dirname, '..', 'sba-loans', cfg.slug, 'index.html');
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, html, 'utf8');
    console.log(`Wrote ${outPath} (${html.length.toLocaleString()} chars)`);
}

if (require.main === module) main();

module.exports = { renderPage, CONFIGS };
