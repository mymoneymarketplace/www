// Generate 8 missing hub pages using the design of personal-loans/index.html.
// Adds a Lendmate CTA section, related products, and full FAQPage schema.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const LOGO = 'https://assets.cdn.filesafe.space/ViERfxWPyzGokVuzinGu/media/69ded38080b446d0fb84f50e.png';
const TODAY = '2026-04-16';

// ─────────── Page data ───────────

const PAGES = [
    {
        slug: 'personal-loans/bad-credit',
        title: 'Personal Loans for Bad Credit 2026 | My Money Marketplace',
        metaDesc: 'Compare personal loans for bad credit. See lenders that accept scores from 550, with prequalification that does not affect your credit score.',
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Personal Loans', url: '/personal-loans' },
            { name: 'Bad Credit', url: '/personal-loans/bad-credit' }
        ],
        h1: 'Personal Loans for Bad Credit',
        heroSub: 'Compare lenders that work with credit scores from 550. Check your rate without affecting your credit.',
        articleHeadline: 'Personal Loans for Bad Credit 2026',
        ctaUtm: 'personal-loans-bad-credit',
        ctaHeadline: 'Rate Checks Start at 550',
        ctaSub: 'Lendmate Capital accepts applicants with scores as low as 550 and checks your rate with a soft pull -- no impact to your credit.',
        purposeHeading: 'Why Borrowers With Bad Credit Choose Us',
        purposeCards: [
            { color: '#008254', title: 'Scores From 550', text: 'Soft-pull prequalification for lower credit profiles.' },
            { color: '#1a6bb0', title: 'Funding in 1-3 Days', text: 'Most approved loans fund in one to three business days.' },
            { color: '#c93a3a', title: 'Fixed Rates', text: 'Predictable monthly payments for the life of the loan.' },
            { color: '#e6850a', title: 'No Hidden Fees', text: 'Upfront pricing on origination, APR, and total cost.' }
        ],
        contentSections: [
            { h3: 'What Counts as Bad Credit?', p: 'FICO scores below 580 are considered poor, and scores between 580 and 669 are fair. Lenders set their own cutoffs, so a score that feels "bad" to one lender may qualify with another. What matters more than the label is the combination of your score, income, debt-to-income ratio, and employment history. Many specialty lenders approve borrowers in the 550 to 650 range if the other factors are strong.' },
            { h3: 'What to Expect on Rates and Terms', p: 'Rates for bad-credit personal loans typically range from 18% to 36% APR, with terms between two and five years. Loan amounts usually fall between $1,000 and $15,000 for lower credit profiles. Always compare APR rather than rate alone, since APR includes origination fees. Paying a loan off early is often penalty-free but confirm in writing before signing.' },
            { h3: 'How to Improve Your Odds of Approval', p: 'Apply with stable employment, keep debt-to-income below 45%, and avoid multiple hard inquiries in a short window. Pre-qualifying with a soft check first lets you rule out lenders who would deny you before you formally apply. Adding a co-signer with stronger credit can unlock lower rates if your individual profile falls short.' }
        ],
        faqs: [
            { q: 'Can I get a personal loan with a 550 credit score?', a: 'Yes. Several lenders specialize in credit scores in the 550 to 620 range. Your income, employment stability, and existing debt load will weigh more heavily than for borrowers with excellent credit, and you should expect higher rates. Prequalifying with a soft credit pull is the fastest way to see real options without affecting your score.' },
            { q: 'Will checking my rate hurt my credit score?', a: 'Pre-qualification uses a soft credit inquiry, which does not appear on your credit report and does not affect your score. Only a formal application triggers a hard inquiry, which may temporarily reduce your score by a few points.' },
            { q: 'How much can I borrow with bad credit?', a: 'Bad-credit personal loans typically range from $1,000 to $15,000, though some lenders go higher for borrowers with strong income. The amount you qualify for depends on your debt-to-income ratio, employment stability, and the lender\'s own guidelines.' },
            { q: 'How fast can I get funded?', a: 'Most online bad-credit lenders fund approved loans within one to three business days once documents are verified. Same-day funding is available from some lenders. Traditional banks and credit unions are generally slower.' },
            { q: 'Do bad-credit personal loans have prepayment penalties?', a: 'Most do not, but it varies by lender. Always review the loan agreement for prepayment terms before signing. Paying off a high-rate loan early can save a substantial amount of interest.' },
            { q: 'Should I use a co-signer?', a: 'A co-signer with stronger credit can help you qualify for lower rates and larger amounts, but they are legally responsible for the debt if you miss payments. Use a co-signer only if both parties fully understand the risk.' }
        ],
        related: [
            { title: 'Debt Consolidation', url: '/personal-loans/debt-consolidation', sub: 'Compare Loans' },
            { title: 'Same-Day Loans', url: '/personal-loans/same-day', sub: 'See Fast Options' },
            { title: 'All Personal Loans', url: '/personal-loans', sub: 'Browse All' }
        ]
    },
    {
        slug: 'personal-loans/debt-consolidation',
        title: 'Debt Consolidation Loans 2026 | My Money Marketplace',
        metaDesc: 'Consolidate credit card debt into one lower fixed payment. Compare debt consolidation loans from top lenders with soft-pull rate checks.',
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Personal Loans', url: '/personal-loans' },
            { name: 'Debt Consolidation', url: '/personal-loans/debt-consolidation' }
        ],
        h1: 'Debt Consolidation Loans',
        heroSub: 'Roll multiple high-rate balances into one fixed monthly payment. Check your rate in minutes.',
        articleHeadline: 'Debt Consolidation Loans 2026',
        ctaUtm: 'personal-loans-debt-consolidation',
        ctaHeadline: 'See Your Consolidation Rate',
        ctaSub: 'Lendmate Capital offers fixed-rate consolidation loans up to $50,000 with a soft-pull rate check.',
        purposeHeading: 'Why Consolidate',
        purposeCards: [
            { color: '#008254', title: 'One Payment', text: 'Replace multiple statements with a single fixed monthly bill.' },
            { color: '#1a6bb0', title: 'Fixed APR', text: 'Lock in a rate for 2-7 years vs. variable credit card rates.' },
            { color: '#7b2d8b', title: 'Clear Payoff Date', text: 'Know exactly when you will be debt free.' },
            { color: '#e6850a', title: 'May Improve Score', text: 'Paying down revolving balances often lifts your credit score.' }
        ],
        contentSections: [
            { h3: 'How a Consolidation Loan Works', p: 'A debt consolidation loan is a fixed-rate personal loan you use to pay off higher-interest debts, typically credit cards. Your new loan replaces several balances with one predictable monthly payment over 24 to 84 months. Because installment debt is treated differently than revolving debt by the credit bureaus, paying down credit cards with a consolidation loan often improves your utilization ratio and can lift your score within a few billing cycles.' },
            { h3: 'When Consolidation Makes Sense', p: 'Consolidation works best when the loan APR is meaningfully lower than the weighted average APR of the debts you are consolidating, and when you have the discipline to stop running new balances on the paid-off cards. Run the math: multiply your current balances by their APRs, divide by total balance, and compare that number to the loan offer APR. If the loan rate is lower and the term is reasonable, you will save on total interest.' },
            { h3: 'What to Watch For', p: 'Origination fees, which reduce the amount you receive at funding, and prepayment penalties, which limit your ability to pay off the loan early. Look for lenders with no prepayment penalty and transparent origination fees built into the APR. Also, make sure the new monthly payment fits your budget with margin, not just your current income.' }
        ],
        faqs: [
            { q: 'Does a debt consolidation loan hurt my credit?', a: 'Prequalification uses a soft pull with no credit impact. The hard inquiry and new account at funding may drop your score by a few points temporarily, but paying down revolving balances often more than offsets that within one to two months.' },
            { q: 'How much can I save?', a: 'Savings depend on the spread between your current debt APR and the consolidation loan APR, the term, and how disciplined you are with not adding new revolving debt. Borrowers moving from 22-29% credit card APRs to a 12-18% fixed loan often save several thousand dollars over the life of the loan.' },
            { q: 'What credit score do I need?', a: 'Most consolidation lenders look for scores of 600 and above, with the best rates for 720+. Lenders that work with lower credit scores are available but carry higher APRs, so be sure the consolidation math still works before taking the offer.' },
            { q: 'Will consolidation close my credit cards?', a: 'No. Paying off a credit card does not close it; the account stays open with a zero balance. Keeping those accounts open helps your credit utilization and average account age. Just avoid running balances back up.' },
            { q: 'Can I consolidate medical debt and personal debt together?', a: 'Yes. A personal loan can be used for any unsecured debt -- credit cards, medical bills, payday loans, or collections. Many borrowers consolidate a mix.' },
            { q: 'How long does it take?', a: 'Most online lenders fund consolidation loans within one to three business days of final approval. Some pay lenders directly on your behalf if you choose that option.' }
        ],
        related: [
            { title: 'Bad Credit Loans', url: '/personal-loans/bad-credit', sub: 'See Options' },
            { title: 'Same-Day Loans', url: '/personal-loans/same-day', sub: 'Fast Funding' },
            { title: 'All Personal Loans', url: '/personal-loans', sub: 'Browse All' }
        ]
    },
    {
        slug: 'personal-loans/home-improvement',
        title: 'Home Improvement Loans 2026 | My Money Marketplace',
        metaDesc: 'Finance renovations with a fixed-rate home improvement loan. Compare options up to $100,000 with soft-pull rate checks.',
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Personal Loans', url: '/personal-loans' },
            { name: 'Home Improvement', url: '/personal-loans/home-improvement' }
        ],
        h1: 'Home Improvement Loans',
        heroSub: 'Fund kitchen, bath, roof, or full remodel projects with predictable fixed monthly payments.',
        articleHeadline: 'Home Improvement Loans 2026',
        ctaUtm: 'personal-loans-home-improvement',
        ctaHeadline: 'Fund Your Renovation',
        ctaSub: 'Lendmate Capital offers home improvement loans up to $50,000 with no equity required and fixed rates.',
        purposeHeading: 'Why an Unsecured Loan Beats a HELOC',
        purposeCards: [
            { color: '#008254', title: 'No Home Appraisal', text: 'Skip the home equity underwriting process.' },
            { color: '#1a6bb0', title: 'No Lien on Your Home', text: 'Your home is not used as collateral.' },
            { color: '#7b2d8b', title: 'Fixed Payments', text: 'Locked rate vs. variable HELOC rates.' },
            { color: '#e6850a', title: 'Fast Funding', text: 'Days instead of weeks to close.' }
        ],
        contentSections: [
            { h3: 'When to Use a Personal Loan for Renovations', p: 'A home improvement personal loan is best when you have a clear project scope, need funds fast, and want predictability. Because it is unsecured, you are not pledging your home, the approval process is faster, and there is no risk of foreclosure if the project goes sideways. The trade-off is a slightly higher rate than a HELOC for the same credit profile.' },
            { h3: 'Typical Loan Amounts and Terms', p: 'Home improvement loans range from $1,000 to $100,000 with terms of two to seven years. For a $20,000 kitchen remodel at 12% APR over five years, you are looking at roughly $445 per month. Always match the term to the useful life of the improvement -- a seven-year loan for a three-year-life project means you are still paying after the improvement is obsolete.' },
            { h3: 'HELOC vs. Personal Loan', p: 'A HELOC offers lower rates but variable payments, a lien on your home, and multi-week underwriting. A personal loan has a higher rate but no collateral, faster funding, and a fixed payment. Homeowners with substantial equity and a long project timeline often prefer HELOCs; those with clear, time-bound projects usually favor personal loans.' }
        ],
        faqs: [
            { q: 'How much can I borrow?', a: 'Unsecured home improvement loans typically top out at $50,000 to $100,000 depending on the lender and your credit profile. For larger projects, a home equity loan or HELOC may offer more capacity at a lower rate.' },
            { q: 'Is the interest tax deductible?', a: 'Interest on an unsecured personal loan used for home improvements is generally not tax deductible. Interest on a home equity loan or HELOC used to buy, build, or substantially improve the home may be deductible, subject to IRS rules. Consult a tax professional for your specific situation.' },
            { q: 'Can I use the loan for any home project?', a: 'Yes. Personal loans for home improvements are flexible -- kitchens, bathrooms, roofs, HVAC, landscaping, pools, additions, or any combination. There is no requirement to submit project receipts in most cases.' },
            { q: 'What credit score is required?', a: 'Most home improvement lenders want 620+, with the best rates for 720+. Some lenders work with scores as low as 550, though rates will be higher.' },
            { q: 'How long to close?', a: 'Most online lenders fund within one to three business days. Traditional banks may take one to two weeks.' },
            { q: 'Should I use a credit card instead?', a: 'Only for small projects you can pay off within a few months. Credit card APRs of 22-29% far exceed personal loan rates for any project lasting beyond a billing cycle or two.' }
        ],
        related: [
            { title: 'Debt Consolidation', url: '/personal-loans/debt-consolidation', sub: 'Compare Loans' },
            { title: 'Medical Loans', url: '/personal-loans/medical', sub: 'See Options' },
            { title: 'All Personal Loans', url: '/personal-loans', sub: 'Browse All' }
        ]
    },
    {
        slug: 'personal-loans/same-day',
        title: 'Same-Day Personal Loans 2026 | My Money Marketplace',
        metaDesc: 'Get a personal loan funded the same day. Compare lenders offering same-day or next-day deposits with soft-pull rate checks.',
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Personal Loans', url: '/personal-loans' },
            { name: 'Same Day', url: '/personal-loans/same-day' }
        ],
        h1: 'Same-Day Personal Loans',
        heroSub: 'Compare lenders that can fund approved loans the same business day.',
        articleHeadline: 'Same-Day Personal Loans 2026',
        ctaUtm: 'personal-loans-same-day',
        ctaHeadline: 'Need Funds Today?',
        ctaSub: 'Lendmate Capital offers same-day decisions and next-business-day funding once documents are verified.',
        purposeHeading: 'How Same-Day Funding Works',
        purposeCards: [
            { color: '#e6850a', title: 'Apply Early', text: 'Submitting before the cutoff time improves same-day odds.' },
            { color: '#008254', title: 'Verify Quickly', text: 'Bank statements and pay stubs ready speeds approval.' },
            { color: '#1a6bb0', title: 'Same-Bank Transfer', text: 'ACH to the same bank often clears faster.' },
            { color: '#7b2d8b', title: 'Clean Application', text: 'Matching income, address, and ID details avoid delays.' }
        ],
        contentSections: [
            { h3: 'What "Same Day" Actually Means', p: 'Same-day funding means the lender initiates the wire or ACH transfer the same business day your loan is finally approved. When the money hits your account depends on your bank and the cutoff time at the lender -- most cutoffs are between 2pm and 5pm local time. Applications submitted in the morning with all documents ready have the best odds of true same-day deposit.' },
            { h3: 'When Same-Day Is Realistic', p: 'Expect same-day if you apply early, your employment and income documents are already uploaded, your credit profile is clean, and the loan amount is modest. Larger loans, self-employed income, or documentation gaps usually push funding to the next business day. Weekends and federal holidays never count for same-day ACH.' },
            { h3: 'What to Watch For', p: 'Some same-day offers come with higher APRs or origination fees -- speed is a feature you pay for. Always compare APRs across two or three lenders even when time is tight, and avoid any lender that demands an upfront fee before funding (that is a hallmark of advance-fee loan scams).' }
        ],
        faqs: [
            { q: 'Can I really get a loan the same day?', a: 'Yes, with the right lender. Apply before the morning cutoff, have documents ready, and opt for same-bank ACH when offered. Most same-day funding arrives within a few hours of final approval.' },
            { q: 'What is the minimum credit score for same-day funding?', a: 'Most same-day lenders want 580+. A few work with lower scores but with higher APRs. Prequalify first to see realistic options without affecting your score.' },
            { q: 'How much can I get same-day?', a: 'Typical same-day loans range from $1,000 to $25,000. Larger amounts may require additional verification that delays funding to the next business day.' },
            { q: 'Do same-day loans cost more?', a: 'Sometimes. Compare APR -- not just rate -- and check for origination fees. Paying a premium for speed can be worth it for true emergencies, but not for discretionary spending.' },
            { q: 'Are weekends and holidays included?', a: 'No. Bank ACH transfers only clear on business days. A Friday afternoon approval often means Monday funding.' },
            { q: 'What slows down funding?', a: 'Missing or mismatched documents, hard-to-verify income (new jobs, 1099s), large loan amounts, and applying after the daily cutoff time are the most common delays.' }
        ],
        related: [
            { title: 'Bad Credit Loans', url: '/personal-loans/bad-credit', sub: 'See Options' },
            { title: 'Debt Consolidation', url: '/personal-loans/debt-consolidation', sub: 'Compare Loans' },
            { title: 'All Personal Loans', url: '/personal-loans', sub: 'Browse All' }
        ]
    },
    {
        slug: 'personal-loans/medical',
        title: 'Medical Loans 2026 | My Money Marketplace',
        metaDesc: 'Finance medical, dental, or surgery bills with a fixed-rate personal loan. Compare medical loan options with soft-pull rate checks.',
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Personal Loans', url: '/personal-loans' },
            { name: 'Medical', url: '/personal-loans/medical' }
        ],
        h1: 'Medical Loans',
        heroSub: 'Cover medical, dental, surgery, or fertility bills with a fixed-rate personal loan.',
        articleHeadline: 'Medical Loans 2026',
        ctaUtm: 'personal-loans-medical',
        ctaHeadline: 'Cover Medical Bills',
        ctaSub: 'Lendmate Capital offers medical loans up to $50,000 with soft-pull prequalification and next-day funding.',
        purposeHeading: 'Common Uses',
        purposeCards: [
            { color: '#c93a3a', title: 'Surgery', text: 'Cover elective or urgent surgery bills and facility fees.' },
            { color: '#008254', title: 'Dental', text: 'Implants, orthodontics, and major restorative work.' },
            { color: '#1a6bb0', title: 'Fertility', text: 'IVF, IUI, and related fertility treatments.' },
            { color: '#7b2d8b', title: 'Out-of-Pocket', text: 'Bridge high-deductible and out-of-network costs.' }
        ],
        contentSections: [
            { h3: 'When a Medical Loan Beats Provider Financing', p: 'Hospitals and clinics often offer in-house financing or a medical credit card like CareCredit. Those offers frequently advertise 0% APR for a promotional period -- but if you do not pay off the full balance by the end of the window, they apply deferred interest retroactively from day one. A fixed-rate personal loan avoids that trap with a single rate for the life of the loan and no balloon surprise.' },
            { h3: 'Negotiate First, Then Borrow', p: 'Before taking any loan, ask the provider for a cash-pay discount or a no-interest payment plan. Many providers reduce bills by 20-40% for self-pay patients or offer 6-24 month interest-free arrangements. Use borrowed funds only for the portion you cannot negotiate or stretch into a payment plan.' },
            { h3: 'Rates, Terms, and Amounts', p: 'Medical personal loans typically range from $1,000 to $50,000 with terms of two to seven years and APRs of 7-36% depending on credit. Larger procedures with clear cost estimates prequalify most easily. For emergency care after-the-fact, lenders can often fund within one to three business days.' }
        ],
        faqs: [
            { q: 'Should I use a medical loan or a credit card?', a: 'For bills you can pay off in one to three months, a 0% intro APR card can be cheaper -- if you are certain you will clear the balance before the promo ends. For anything longer, a fixed-rate medical loan almost always beats credit card interest.' },
            { q: 'What about CareCredit and deferred-interest offers?', a: 'Deferred-interest offers charge back-interest from the original purchase date if you do not pay in full by the end of the promo window. They can work but only for borrowers with a rock-solid payoff plan.' },
            { q: 'Can I use a medical loan for cosmetic procedures?', a: 'Yes. Personal loans are unsecured and can be used for any purpose, including elective cosmetic procedures, dental aesthetics, and fertility treatments.' },
            { q: 'What credit score do I need?', a: 'Most medical loan lenders want 580+, with the best rates for 720+. Prequalify with a soft pull to see realistic offers.' },
            { q: 'Can my provider get paid directly?', a: 'Some lenders offer to pay providers directly; others deposit funds to your bank account and let you pay the provider. Ask during application if direct pay matters to you.' },
            { q: 'How fast can I get the money?', a: 'Most medical loans fund within one to three business days. Same-day is possible from select lenders if documents are ready early.' }
        ],
        related: [
            { title: 'Debt Consolidation', url: '/personal-loans/debt-consolidation', sub: 'Compare Loans' },
            { title: 'Same-Day Loans', url: '/personal-loans/same-day', sub: 'Fast Funding' },
            { title: 'All Personal Loans', url: '/personal-loans', sub: 'Browse All' }
        ]
    },
    {
        slug: 'equipment-financing',
        title: 'Equipment Financing 2026 | My Money Marketplace',
        metaDesc: 'Finance business equipment with rates from 6%. Compare equipment loans and leases -- the equipment itself serves as collateral.',
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Equipment Financing', url: '/equipment-financing' }
        ],
        h1: 'Equipment Financing',
        heroSub: 'Finance trucks, machinery, tech, and gear -- the equipment secures the loan so approval is easier.',
        articleHeadline: 'Equipment Financing 2026',
        ctaUtm: 'equipment-financing',
        ctaHeadline: 'Finance Your Equipment',
        ctaSub: 'Lendmate Capital finances new and used business equipment with fast approvals and fixed monthly payments.',
        purposeHeading: 'What You Can Finance',
        purposeCards: [
            { color: '#1a6bb0', title: 'Vehicles & Trucks', text: 'Box trucks, vans, trailers, and commercial vehicles.' },
            { color: '#008254', title: 'Heavy Equipment', text: 'Construction, agriculture, and industrial machinery.' },
            { color: '#e6850a', title: 'Restaurant & Retail', text: 'POS, ovens, refrigeration, and tenant improvements.' },
            { color: '#7b2d8b', title: 'Tech & Medical', text: 'Computers, servers, imaging equipment, and exam tools.' }
        ],
        contentSections: [
            { h3: 'How Equipment Financing Works', p: 'Equipment financing is a secured loan where the equipment itself serves as collateral. Because the lender can recover the asset if you default, approval standards are more flexible than unsecured business loans and you often qualify with less time in business or lower credit. Loan terms usually mirror the useful life of the equipment -- three to seven years for most gear, up to ten for heavy machinery.' },
            { h3: 'Loan vs. Lease', p: 'A loan means you own the equipment and pay it off over time. A lease means you use the equipment for a set period with lower monthly payments and an option to buy, return, or upgrade at the end. Loans make sense for long-life equipment you plan to keep; leases work well for fast-depreciating tech and items you will replace every few years.' },
            { h3: 'What Lenders Look At', p: 'Business revenue, time in business, personal credit of the owner, and the type and value of the equipment. Most lenders want at least 6-12 months of operating history and $10,000+ in monthly revenue, though startups can sometimes qualify if the equipment has strong resale value.' }
        ],
        faqs: [
            { q: 'How much can I finance?', a: 'Equipment financing typically runs $10,000 to $5,000,000 per asset. Some lenders finance up to 100% of the equipment cost, while others require a 10-20% down payment depending on credit and equipment type.' },
            { q: 'What credit score do I need?', a: 'Most equipment lenders accept personal credit scores of 600+, with the best rates for 700+. Because the equipment serves as collateral, lower scores can qualify with a larger down payment.' },
            { q: 'How fast is funding?', a: 'Equipment financing can fund within 1-5 business days. Simple transactions on standard equipment with clean documentation move fastest.' },
            { q: 'Can I finance used equipment?', a: 'Yes. Most lenders finance used equipment, often up to 5-10 years old depending on the asset type. Useful life and resale value matter more than age alone.' },
            { q: 'Is interest tax deductible?', a: 'Equipment financing interest is generally deductible as a business expense. Section 179 may also allow you to deduct a portion of the equipment cost in the year purchased. Consult a tax professional.' },
            { q: 'Do I need a down payment?', a: 'Many lenders offer $0-down equipment financing for qualified borrowers. Lower credit or specialty equipment may require 10-25% down.' }
        ],
        related: [
            { title: 'Working Capital', url: '/working-capital', sub: 'See Options' },
            { title: 'Line of Credit', url: '/line-of-credit', sub: 'Compare' },
            { title: 'All Business Loans', url: '/business-loans', sub: 'Browse All' }
        ]
    },
    {
        slug: 'line-of-credit',
        title: 'Business Line of Credit 2026 | My Money Marketplace',
        metaDesc: 'Get a revolving business line of credit for cash flow, inventory, or unexpected expenses. Draw what you need, pay interest only on what you use.',
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Line of Credit', url: '/line-of-credit' }
        ],
        h1: 'Business Line of Credit',
        heroSub: 'Revolving capital for cash flow, inventory, or unexpected costs. Pay interest only on what you draw.',
        articleHeadline: 'Business Line of Credit 2026',
        ctaUtm: 'line-of-credit',
        ctaHeadline: 'Open a Line of Credit',
        ctaSub: 'Lendmate Capital offers revolving lines from $10,000 to $250,000 with same-day approval and draws in minutes.',
        purposeHeading: 'When a Line of Credit Fits Best',
        purposeCards: [
            { color: '#008254', title: 'Cash Flow Gaps', text: 'Cover payroll and rent between receivables.' },
            { color: '#1a6bb0', title: 'Inventory Buys', text: 'Stock up ahead of seasonal demand spikes.' },
            { color: '#e6850a', title: 'Emergency Reserve', text: 'Keep capital on standby without paying for idle funds.' },
            { color: '#7b2d8b', title: 'Opportunity Capital', text: 'Move fast on bulk discounts and vendor terms.' }
        ],
        contentSections: [
            { h3: 'Line of Credit vs. Term Loan', p: 'A term loan gives you a lump sum upfront with a fixed repayment schedule -- good for one-time projects with known costs. A line of credit is revolving: you get approved for a maximum, draw only what you need, pay it back, and redraw without reapplying. You only pay interest on the outstanding balance. That makes lines ideal for variable or unpredictable costs.' },
            { h3: 'Secured vs. Unsecured', p: 'Unsecured lines typically go up to $250,000 and rely on business revenue and personal credit. Secured lines, backed by accounts receivable or inventory, can reach $500,000+ with lower rates but require more underwriting. Most small businesses start with an unsecured line and graduate to secured as they grow.' },
            { h3: 'What It Costs', p: 'Expect APRs of 8-30% on unsecured business lines, with draw fees of 1-3% on some products and no annual fee for qualified borrowers. Interest accrues daily on the outstanding balance and is calculated on the drawn amount, not the full credit limit.' }
        ],
        faqs: [
            { q: 'What is the difference between a credit card and a line of credit?', a: 'Lines of credit typically offer higher limits, lower APRs, and cash access (wire or ACH) rather than just card swipes. Credit cards are optimized for rewards and purchases; lines are optimized for cash flow and working capital.' },
            { q: 'How much can I get?', a: 'Unsecured business lines commonly range from $10,000 to $250,000. Secured lines can go higher. Your approved limit depends on revenue, time in business, and credit.' },
            { q: 'What credit score do I need?', a: 'Most lenders want personal credit of 600+ with 6+ months in business and $10,000+ monthly revenue. Higher limits and lower rates require 700+ and stronger financials.' },
            { q: 'Does drawing affect my credit?', a: 'Drawing from a business line of credit is generally reported to business credit bureaus, not personal. Some small-business lenders do report to personal bureaus -- ask before signing.' },
            { q: 'Is there an annual fee?', a: 'Many unsecured business lines have no annual fee for qualified borrowers. Some products charge $0 but apply a draw fee of 1-3% each time you pull funds.' },
            { q: 'Can I pay off a draw early?', a: 'Yes. Lines of credit typically have no prepayment penalty. Paying down the balance immediately frees up that portion of the limit for future draws.' }
        ],
        related: [
            { title: 'Working Capital', url: '/working-capital', sub: 'See Options' },
            { title: 'Equipment Financing', url: '/equipment-financing', sub: 'Compare' },
            { title: 'All Business Loans', url: '/business-loans', sub: 'Browse All' }
        ]
    },
    {
        slug: 'working-capital',
        title: 'Working Capital Loans 2026 | My Money Marketplace',
        metaDesc: 'Fund payroll, inventory, and day-to-day operations with working capital loans. Compare term loans, lines, and advances with same-day approval.',
        breadcrumb: [
            { name: 'Home', url: '/' },
            { name: 'Working Capital', url: '/working-capital' }
        ],
        h1: 'Working Capital Loans',
        heroSub: 'Fund payroll, inventory, and operations. Fast term loans, lines of credit, and revenue-based advances.',
        articleHeadline: 'Working Capital Loans 2026',
        ctaUtm: 'working-capital',
        ctaHeadline: 'Get Working Capital',
        ctaSub: 'Lendmate Capital offers working capital up to $500,000 with same-day decisions and funding in 24 hours.',
        purposeHeading: 'Common Working Capital Needs',
        purposeCards: [
            { color: '#008254', title: 'Payroll', text: 'Make payroll during slow months or before receivables clear.' },
            { color: '#1a6bb0', title: 'Inventory', text: 'Pre-order inventory for seasonal peaks.' },
            { color: '#e6850a', title: 'Marketing', text: 'Fund ad campaigns when ROI is proven.' },
            { color: '#7b2d8b', title: 'Emergencies', text: 'Cover repairs, replacements, or unexpected costs.' }
        ],
        contentSections: [
            { h3: 'What Counts as Working Capital', p: 'Working capital is the cash a business needs to cover its day-to-day operating costs -- payroll, rent, inventory, utilities, and supplier payments -- as distinct from long-term investments like equipment or real estate. A working capital loan bridges temporary gaps between revenue and expenses so operations continue uninterrupted.' },
            { h3: 'Product Options', p: 'Term loans deliver a lump sum with a fixed repayment schedule, typically 3-24 months. Lines of credit offer revolving access with interest only on drawn funds. Merchant cash advances provide fast funding repaid as a percentage of daily card sales. Invoice financing advances funds against outstanding receivables. The right product depends on your revenue pattern and use case.' },
            { h3: 'Cost and Approval', p: 'Working capital rates range from 8% APR for prime bank products to 1.1-1.4 factor rates on merchant cash advances. Most lenders want 6+ months in business and $10,000+ monthly revenue; some short-term lenders approve with 3 months and $5,000 revenue. Funding speed ranges from same-day to one week.' }
        ],
        faqs: [
            { q: 'What is the best type of working capital loan?', a: 'It depends on the use case. A line of credit is most flexible for recurring gaps. A term loan is simplest for a known one-time need. A merchant cash advance offers speed but the highest cost -- use only when other options are not available.' },
            { q: 'How fast can I get funded?', a: 'Short-term working capital products fund in as little as 24 hours. Lines of credit and term loans typically fund in 1-5 business days. Bank products take longer -- often 1-3 weeks.' },
            { q: 'What documents do I need?', a: 'Most online lenders want 3-6 months of business bank statements, a voided check, and a photo ID. Larger loans may require tax returns and financial statements.' },
            { q: 'What credit score is required?', a: 'Most working capital lenders approve personal credit of 550+, with the best rates for 680+. Revenue and cash flow matter as much as credit for short-term products.' },
            { q: 'Can I have multiple working capital loans?', a: 'Yes, but stacking multiple advances on the same revenue creates daily payment pressure that can strangle cash flow. Consolidating into a single line of credit is usually healthier than layering products.' },
            { q: 'Are payments daily, weekly, or monthly?', a: 'Varies by product. Merchant cash advances and some short-term loans take daily ACH. Lines of credit and term loans are usually weekly or monthly. Match the payment cadence to your revenue cycle.' }
        ],
        related: [
            { title: 'Line of Credit', url: '/line-of-credit', sub: 'Compare' },
            { title: 'Equipment Financing', url: '/equipment-financing', sub: 'See Options' },
            { title: 'All Business Loans', url: '/business-loans', sub: 'Browse All' }
        ]
    }
];

// ─────────── Template ───────────

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildBreadcrumbSchema(breadcrumb) {
    return breadcrumb.map((b, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: b.name,
        item: b.url === '/' ? 'https://mymoneymarketplace.com' : 'https://mymoneymarketplace.com' + b.url
    }));
}

function buildFaqSchema(faqs) {
    return faqs.map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a }
    }));
}

function renderBreadcrumb(breadcrumb) {
    return breadcrumb.map((b, i) => {
        const isLast = i === breadcrumb.length - 1;
        const sep = i > 0 ? '<li class="sep">/</li>' : '';
        const item = isLast
            ? `<li class="current">${esc(b.name)}</li>`
            : `<li><a href="${b.url}">${esc(b.name)}</a></li>`;
        return sep + item;
    }).join('');
}

function renderPurposeCards(cards) {
    return cards.map(c => `
            <div class="purpose-card">
                <div class="purpose-icon" style="background:${c.color};"></div>
                <h3>${esc(c.title)}</h3>
                <p>${esc(c.text)}</p>
            </div>`).join('');
}

function renderContentSections(sections) {
    return sections.map(s => `
        <h3>${esc(s.h3)}</h3>
        <p>${esc(s.p)}</p>`).join('');
}

function renderFaqs(faqs) {
    return faqs.map(f => `
            <details>
                <summary>${esc(f.q)}</summary>
                <div class="faq-answer">${esc(f.a)}</div>
            </details>`).join('');
}

function renderRelated(related) {
    return related.map(r => `
            <a href="${r.url}" class="related-card">
                <div class="related-title">${esc(r.title)}</div>
                <span class="related-link">${esc(r.sub)} &rarr;</span>
            </a>`).join('');
}

function buildPage(p) {
    const canonical = `https://mymoneymarketplace.com/${p.slug}`;
    const ctaUrl = `https://lendmatecapital.com?utm_source=mmm&utm_medium=hub&utm_campaign=${p.ctaUtm}`;
    const schema = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Organization',
                name: 'My Money Marketplace',
                url: 'https://mymoneymarketplace.com',
                logo: LOGO
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: buildBreadcrumbSchema(p.breadcrumb)
            },
            {
                '@type': 'Article',
                headline: p.articleHeadline,
                description: p.metaDesc,
                author: { '@type': 'Organization', name: 'My Money Marketplace' },
                publisher: {
                    '@type': 'Organization',
                    name: 'My Money Marketplace',
                    logo: { '@type': 'ImageObject', url: LOGO }
                },
                datePublished: TODAY,
                dateModified: TODAY,
                mainEntityOfPage: canonical
            },
            {
                '@type': 'FAQPage',
                mainEntity: buildFaqSchema(p.faqs)
            }
        ]
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${esc(p.title)}</title>
    <meta name="description" content="${esc(p.metaDesc)}">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="${canonical}">
    <meta property="og:title" content="${esc(p.title)}">
    <meta property="og:description" content="${esc(p.metaDesc)}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${canonical}">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','GA_MEASUREMENT_ID');</script>
    <style>
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
        :root {
            --green: #008254;
            --green-dark: #006b45;
            --text: #111111;
            --text-secondary: #444444;
            --text-muted: #717171;
            --border: #e2e2e2;
            --bg-light: #f7f7f7;
            --white: #ffffff;
        }
        html { scroll-behavior: smooth; scroll-padding-top: 64px; }
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: var(--text); background: var(--white); line-height: 1.7; -webkit-font-smoothing: antialiased; }

        /* Header */
        .header { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: var(--white); border-bottom: 1px solid var(--border); height: 64px; }
        .header-inner { max-width: 1120px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 64px; }
        .header-logo img { height: 32px; display: block; }
        .header-nav { display: flex; align-items: center; gap: 32px; }
        .header-link { font-size: 14px; font-weight: 500; color: var(--text-secondary); text-decoration: none; transition: color 0.2s; }
        .header-link:hover { color: var(--green); }
        .header-cta { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 14px; font-weight: 600; padding: 10px 22px; border-radius: 6px; text-decoration: none; transition: background 0.2s; }
        .header-cta:hover { background: var(--green-dark); }
        .mobile-toggle { display: none; background: none; border: none; cursor: pointer; padding: 4px; }
        .mobile-toggle span { display: block; width: 22px; height: 2px; background: var(--text); margin: 5px 0; transition: 0.3s; }
        @media (max-width: 768px) {
            .header-link { display: none; }
            .mobile-toggle { display: block; }
        }

        /* Layout */
        .container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .container-narrow { max-width: 800px; margin: 0 auto; padding: 0 24px; }

        /* Breadcrumb */
        .breadcrumb { padding: 16px 0; margin-top: 64px; background: var(--bg-light); border-bottom: 1px solid var(--border); }
        .breadcrumb-list { display: flex; align-items: center; gap: 8px; list-style: none; font-size: 13px; }
        .breadcrumb-list a { color: var(--text-muted); text-decoration: none; }
        .breadcrumb-list a:hover { color: var(--green); }
        .breadcrumb-list .sep { color: var(--text-muted); }
        .breadcrumb-list .current { color: var(--text-secondary); font-weight: 500; }

        /* Hero */
        .hero { padding: 48px 0 40px; text-align: center; background: var(--white); }
        .hero h1 { font-size: clamp(28px, 4vw, 40px); font-weight: 700; color: var(--text); line-height: 1.2; margin-bottom: 12px; }
        .hero .sub { font-size: 17px; color: var(--text-secondary); max-width: 600px; margin: 0 auto; line-height: 1.6; }

        /* Purpose Grid */
        .purpose-section { padding: 0 0 56px; }
        .purpose-section h2 { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 24px; text-align: center; }
        .purpose-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .purpose-card { background: var(--white); border: 1px solid var(--border); border-radius: 8px; padding: 20px; transition: box-shadow 0.2s; }
        .purpose-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .purpose-icon { width: 40px; height: 40px; border-radius: 8px; margin-bottom: 12px; }
        .purpose-card h3 { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .purpose-card p { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
        @media (max-width: 900px) { .purpose-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .purpose-grid { grid-template-columns: 1fr; } }

        /* Lendmate CTA */
        .lendmate-cta { padding: 48px 0; background: var(--bg-light); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); text-align: center; }
        .lendmate-cta h2 { font-size: 26px; font-weight: 700; color: var(--text); margin-bottom: 12px; }
        .lendmate-cta p { font-size: 15px; color: var(--text-secondary); max-width: 620px; margin: 0 auto 24px; line-height: 1.6; }
        .lendmate-btn { display: inline-flex; align-items: center; background: var(--green); color: var(--white); font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; transition: background 0.2s, transform 0.2s; }
        .lendmate-btn:hover { background: var(--green-dark); transform: translateY(-1px); }
        .lendmate-micro { font-size: 12px; color: var(--text-muted); margin-top: 12px; }

        /* Content */
        .content-section { padding: 56px 0; }
        .content-section h2 { font-size: 24px; font-weight: 700; color: var(--text); margin-bottom: 20px; }
        .content-section h3 { font-size: 18px; font-weight: 600; color: var(--text); margin: 28px 0 10px; }
        .content-section p { font-size: 15px; color: var(--text-secondary); line-height: 1.7; margin-bottom: 14px; }

        /* FAQ */
        .faq-section { padding: 56px 0; background: var(--bg-light); border-top: 1px solid var(--border); }
        .faq-section h2 { font-size: 24px; font-weight: 700; color: var(--text); text-align: center; margin-bottom: 32px; }
        .faq-list { max-width: 720px; margin: 0 auto; }
        details { border: 1px solid var(--border); border-radius: 8px; background: var(--white); margin-bottom: 10px; overflow: hidden; }
        details summary { padding: 16px 20px; font-size: 15px; font-weight: 600; color: var(--text); cursor: pointer; list-style: none; display: flex; align-items: center; justify-content: space-between; }
        details summary::-webkit-details-marker { display: none; }
        details summary::after { content: '+'; font-size: 20px; font-weight: 400; color: var(--text-muted); flex-shrink: 0; margin-left: 12px; }
        details[open] summary::after { content: '-'; }
        details .faq-answer { padding: 0 20px 16px; font-size: 14px; color: var(--text-secondary); line-height: 1.7; }

        /* Related */
        .related-section { padding: 48px 0; border-top: 1px solid var(--border); }
        .related-section h2 { font-size: 20px; font-weight: 700; color: var(--text); margin-bottom: 20px; text-align: center; }
        .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 720px; margin: 0 auto; }
        .related-card { display: block; padding: 20px; border: 1px solid var(--border); border-radius: 8px; text-decoration: none; text-align: center; transition: box-shadow 0.2s; }
        .related-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .related-card .related-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
        .related-card .related-link { font-size: 13px; color: var(--green); font-weight: 500; }
        @media (max-width: 640px) { .related-grid { grid-template-columns: 1fr; } }

        /* Footer */
        .footer { background: #1a1a1a; color: #cccccc; padding: 56px 0 0; }
        .footer-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; margin-bottom: 40px; }
        .footer-col h4 { color: var(--white); font-size: 14px; font-weight: 600; margin-bottom: 16px; letter-spacing: 0.3px; }
        .footer-col a { display: block; font-size: 13px; color: #999999; text-decoration: none; margin-bottom: 10px; transition: color 0.2s; }
        .footer-col a:hover { color: var(--white); }
        .footer-col p { font-size: 13px; color: #999999; line-height: 1.6; }
        .footer-bottom { border-top: 1px solid #333333; padding: 20px 0; text-align: center; font-size: 12px; color: #666666; }
        @media (max-width: 768px) { .footer-grid { grid-template-columns: repeat(2, 1fr); gap: 32px; } }
        @media (max-width: 480px) { .footer-grid { grid-template-columns: 1fr; } }
    </style>
    <script type="application/ld+json">
${JSON.stringify(schema, null, 4)}
    </script>
</head>
<body>

<!-- Header -->
<header class="header">
    <div class="header-inner">
        <a href="/" class="header-logo"><img src="${LOGO}" alt="My Money Marketplace" width="180" height="32"></a>
        <nav class="header-nav">
            <a href="/credit-cards" class="header-link">Credit Cards</a>
            <a href="/personal-loans" class="header-link">Personal Loans</a>
            <a href="/business-loans" class="header-link">Business Loans</a>
            <a href="/savings" class="header-link">Savings</a>
            <a href="https://mymoneymarketplace.com/compare" class="header-cta">Compare Rates</a>
            <button class="mobile-toggle" aria-label="Menu"><span></span><span></span><span></span></button>
        </nav>
    </div>
</header>

<!-- Breadcrumb -->
<nav class="breadcrumb" aria-label="Breadcrumb">
    <div class="container">
        <ol class="breadcrumb-list">${renderBreadcrumb(p.breadcrumb)}</ol>
    </div>
</nav>

<!-- Hero -->
<section class="hero">
    <div class="container">
        <h1>${esc(p.h1)}</h1>
        <p class="sub">${esc(p.heroSub)}</p>
    </div>
</section>

<!-- Purpose Grid -->
<section class="purpose-section">
    <div class="container">
        <h2>${esc(p.purposeHeading)}</h2>
        <div class="purpose-grid">${renderPurposeCards(p.purposeCards)}
        </div>
    </div>
</section>

<!-- Lendmate CTA -->
<section class="lendmate-cta">
    <div class="container">
        <h2>${esc(p.ctaHeadline)}</h2>
        <p>${esc(p.ctaSub)}</p>
        <a href="${ctaUrl}" class="lendmate-btn">Check My Rate &rarr;</a>
        <p class="lendmate-micro">Soft credit check. Won't affect your credit score.</p>
    </div>
</section>

<!-- Content -->
<section class="content-section">
    <div class="container-narrow">
        <h2>What to Know</h2>${renderContentSections(p.contentSections)}
    </div>
</section>

<!-- FAQ -->
<section class="faq-section">
    <div class="container">
        <h2>Frequently Asked Questions</h2>
        <div class="faq-list">${renderFaqs(p.faqs)}
        </div>
    </div>
</section>

<!-- Related -->
<section class="related-section">
    <div class="container">
        <h2>Explore Related Products</h2>
        <div class="related-grid">${renderRelated(p.related)}
        </div>
    </div>
</section>

<!-- Footer -->
<footer class="footer">
    <div class="container">
        <div class="footer-grid">
            <div class="footer-col">
                <h4>Products</h4>
                <a href="/personal-loans">Personal Loans</a>
                <a href="/business-loans">Business Loans</a>
                <a href="/sba-loans">SBA Loans</a>
                <a href="/credit-cards">Credit Cards</a>
                <a href="/savings">Savings</a>
            </div>
            <div class="footer-col">
                <h4>Resources</h4>
                <a href="/guides">Financial Guides</a>
                <a href="/calculators">Loan Calculators</a>
                <a href="/blog">Blog</a>
                <a href="/glossary">Glossary</a>
            </div>
            <div class="footer-col">
                <h4>Company</h4>
                <a href="/about">About Us</a>
                <a href="/how-it-works">How It Works</a>
                <a href="/contact">Contact</a>
                <a href="/press">Press</a>
            </div>
            <div class="footer-col">
                <h4>Legal</h4>
                <a href="/privacy">Privacy Policy</a>
                <a href="/terms">Terms of Service</a>
                <a href="/disclosures">Disclosures</a>
                <p style="margin-top: 12px;">My Money Marketplace helps consumers compare financial products. We may receive compensation from partners when you click links on our site.</p>
            </div>
        </div>
    </div>
    <div class="footer-bottom">
        <div class="container">&copy; 2026 My Money Marketplace. All rights reserved.</div>
    </div>
</footer>

</body>
</html>
`;
}

// ─────────── Write files ───────────

let written = 0;
for (const p of PAGES) {
    const dir = path.join(ROOT, p.slug);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, 'index.html');
    fs.writeFileSync(file, buildPage(p), 'utf8');
    written++;
    console.log(`wrote ${path.relative(ROOT, file)}`);
}

// ─────────── Update sitemap ───────────

const sitemapPath = path.join(ROOT, 'sitemap.xml');
let sitemap = fs.readFileSync(sitemapPath, 'utf8');
let added = 0;
const newEntries = PAGES.map(p => {
    const loc = `https://mymoneymarketplace.com/${p.slug}`;
    if (sitemap.includes(loc)) return '';
    added++;
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
}).filter(Boolean).join('\n');

if (added > 0) {
    sitemap = sitemap.replace('</urlset>', newEntries + '\n</urlset>');
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
}

console.log(`\nPages written: ${written}`);
console.log(`Sitemap entries added: ${added}`);
