#!/usr/bin/env node
/**
 * build-industry-data.js
 *
 * Parses the SBA FOIA 7(a) loan dataset and emits a per-NAICS industry data
 * asset used to power Angle 1 (industry-specific) SBA pages on mmm-site.
 *
 * Inputs:
 *   CSV_PATH env var (default: C:\\Users\\LendMate\\Desktop\\foia-7a-fy2020-present-as-of-251231.csv)
 *
 * Outputs (written relative to this script's ../data/ directory):
 *   industry-data.json           — primary asset (keyed by NAICS code)
 *   industry-data-summary.csv    — one-row-per-industry snapshot for humans
 *   industry-prioritization.md   — top 40 ranked + recommended build queue
 *
 * The CSV itself is NOT committed (357K+ rows, too large for git).
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const CSV_PATH =
  process.env.CSV_PATH ||
  "C:\\Users\\LendMate\\Desktop\\foia-7a-fy2020-present-as-of-251231.csv";

const OUT_DIR = path.resolve(__dirname, "..", "data");
const OUT_JSON = path.join(OUT_DIR, "industry-data.json");
const OUT_CSV = path.join(OUT_DIR, "industry-data-summary.csv");
const OUT_MD = path.join(OUT_DIR, "industry-prioritization.md");

const MIN_LOANS = 500;

// Fallback descriptions for NAICS codes that appear with a blank
// naicsdescription in the FOIA extract. Keys are 2022 NAICS codes that
// the dataset sometimes leaves unlabeled.
const NAICS_DESC_FALLBACK = {
  "445132": "Vending Machine Operators",
  "459120": "Hobby, Toy, and Game Stores",
  "459110": "Sporting Goods Stores",
  "459140": "Musical Instrument and Supplies Stores",
  "459130": "Sewing, Needlework, and Piece Goods Stores",
  "456110": "Pharmacies and Drug Stores",
  "456120": "Cosmetics, Beauty Supplies, and Perfume Stores",
  "456130": "Optical Goods Stores",
  "456191": "Food (Health) Supplement Stores",
  "456199": "All Other Health and Personal Care Retailers",
  "455110": "Department Stores",
  "455211": "Warehouse Clubs and Supercenters",
  "455219": "All Other General Merchandise Retailers",
  "449110": "Furniture Stores",
  "449121": "Floor Covering Stores",
  "449122": "Window Treatment Stores",
  "449129": "All Other Home Furnishings Retailers",
  "449210": "Electronics and Appliance Retailers",
  "458110": "Clothing and Clothing Accessories Retailers",
  "458210": "Shoe Retailers",
  "458310": "Jewelry Retailers",
  "458320": "Luggage and Leather Goods Retailers",
  "459410": "Office Supplies and Stationery Stores",
  "459420": "Gift, Novelty, and Souvenir Stores",
  "459510": "Used Merchandise Retailers",
  "459910": "Pet and Pet Supplies Retailers",
  "459920": "Art Dealers",
  "459930": "Manufactured (Mobile) Home Dealers",
  "459991": "Tobacco, Electronic Cigarette, and Other Smoking Supplies Retailers",
  "459999": "All Other Miscellaneous Retailers",
  "516110": "Radio Broadcasting Stations",
  "516120": "Television Broadcasting Stations",
  "516210": "Media Streaming Distribution Services, Social Networks, and Other Media Networks and Content Providers",
  "513210": "Software Publishers",
};

// ─────────────────────────────────────────────────────────────────────────────
// CSV line parser (RFC 4180 — handles quoted fields w/ embedded commas / "")
// ─────────────────────────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQ = true;
      } else if (c === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
  }
  out.push(cur);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────
const num = (v) => {
  if (v === undefined || v === null) return NaN;
  const s = String(v).trim();
  if (s === "" || s.toLowerCase() === "none" || s.toLowerCase() === "null")
    return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

const trim = (v) => (v == null ? "" : String(v).trim());

// Parse M/D/YYYY → epoch ms (UTC) or NaN
function parseDate(s) {
  const t = trim(s);
  if (!t) return NaN;
  const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return NaN;
  const mo = Number(m[1]),
    d = Number(m[2]),
    y = Number(m[3]);
  const ms = Date.UTC(y, mo - 1, d);
  return Number.isFinite(ms) ? ms : NaN;
}

function monthsBetween(laterMs, earlierMs) {
  if (!Number.isFinite(laterMs) || !Number.isFinite(earlierMs)) return NaN;
  return (laterMs - earlierMs) / (1000 * 60 * 60 * 24 * 30.4375);
}

function median(arr) {
  if (!arr.length) return 0;
  const a = Array.from(arr).sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function mean(arr) {
  if (!arr.length) return 0;
  let s = 0;
  for (const v of arr) s += v;
  return s / arr.length;
}

function topN(map, n, valueFn, mapper) {
  return [...map.entries()]
    .sort((a, b) => valueFn(b[1]) - valueFn(a[1]))
    .slice(0, n)
    .map(([k, v]) => mapper(k, v));
}

function round2(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100) / 100;
}
function round4(v) {
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 10000) / 10000;
}

// ─────────────────────────────────────────────────────────────────────────────
// Aggregation state
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Per-NAICS accumulator
 */
function newAccum(code, desc) {
  return {
    code,
    description: desc,
    count: 0,
    totalApproval: 0,
    grossApprovals: [], // for median
    termMonthsSum: 0,
    termMonthsN: 0,
    rateSum: 0,
    rateN: 0,
    fixedN: 0,
    fixedDenominator: 0, // rows where F or V is present
    revolverN: 0,
    collateralN: 0,
    jobsSum: 0,
    statusCounts: new Map(), // status -> count
    paidInFullN: 0,
    chargeOffN: 0,
    chargeOffAmountSum: 0,
    chargeOffMonthsSum: 0,
    chargeOffMonthsN: 0,
    lenderCount: new Map(), // bankname -> count
    lenderVolume: new Map(), // bankname -> volume
    lenderApprovals: new Map(), // bankname -> [approval sum, loan count]
    stateCount: new Map(), // state -> count
    stateVolume: new Map(),
    yearly: new Map(), // fy -> { count, total }
    trailing12Count: 0,
    prior12Count: 0,
    franchiseN: 0,
    franchiseByName: new Map(), // name -> { count, sumApproval }
    businessTypeCounts: new Map(),
    businessAgeCounts: new Map(), // for human reference
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  if (!fs.existsSync(CSV_PATH)) {
    console.error("CSV not found at", CSV_PATH);
    process.exit(1);
  }

  // Anchors (for trailing-12 math) — asofdate is 12/31/2025
  const ASOF_MS = Date.UTC(2025, 11, 31);
  const TRAILING12_FROM = Date.UTC(2024, 11, 31); // exclusive → ASOF
  const PRIOR12_FROM = Date.UTC(2023, 11, 31); // exclusive → TRAILING12_FROM

  const naics = new Map(); // code -> accum
  const overall = newAccum("ALL", "All 7(a) loans");
  // For over-indexed state detection, we also need per-state overall loan counts:
  const overallStateCount = new Map();

  let totalRows = 0;
  let skipped = 0;
  let headerParsed = false;
  let header = null;
  const idx = {};

  const stream = fs.createReadStream(CSV_PATH);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity,
  });

  for await (const rawLine of rl) {
    if (!rawLine) continue;
    if (!headerParsed) {
      header = parseCsvLine(rawLine).map((s) => s.trim().toLowerCase());
      header.forEach((name, i) => (idx[name] = i));
      headerParsed = true;
      continue;
    }

    const f = parseCsvLine(rawLine);
    if (f.length < header.length - 2) {
      // very malformed — skip
      skipped++;
      continue;
    }
    totalRows++;

    const code = trim(f[idx.naicscode]);
    const desc = trim(f[idx.naicsdescription]);
    const gross = num(f[idx.grossapproval]);
    const term = num(f[idx.terminmonths]);
    const rate = num(f[idx.initialinterestrate]);
    const fv = trim(f[idx.fixedorvariableinterestind]).toUpperCase();
    const revolver = trim(f[idx.revolverstatus]);
    const collateral = trim(f[idx.collateralind]).toUpperCase();
    const jobs = num(f[idx.jobssupported]);
    const status = trim(f[idx.loanstatus]).toUpperCase();
    const chgOffAmt = num(f[idx.grosschargeoffamount]);
    const approvalMs = parseDate(f[idx.approvaldate]);
    const chargeOffMs = parseDate(f[idx.chargeoffdate]);
    const fy = trim(f[idx.approvalfiscalyear]);
    const bank = trim(f[idx.bankname]) || "UNKNOWN";
    const state = trim(f[idx.projectstate]) || trim(f[idx.borrstate]) || "UNK";
    const franchiseCode = trim(f[idx.franchisecode]);
    const franchiseName = trim(f[idx.franchisename]);
    const businessType = trim(f[idx.businesstype]) || "Unknown";
    const businessAge = trim(f[idx.businessage]);

    // Track overall state distribution
    overallStateCount.set(state, (overallStateCount.get(state) || 0) + 1);

    if (!code) {
      skipped++;
      continue;
    }

    const accumulate = (a) => {
      a.count++;
      if (Number.isFinite(gross)) {
        a.totalApproval += gross;
        a.grossApprovals.push(gross);
      }
      if (Number.isFinite(term) && term > 0) {
        a.termMonthsSum += term;
        a.termMonthsN++;
      }
      if (Number.isFinite(rate) && rate > 0) {
        a.rateSum += rate;
        a.rateN++;
      }
      if (fv === "F" || fv === "V") {
        a.fixedDenominator++;
        if (fv === "F") a.fixedN++;
      }
      // revolverstatus is 0/1 in this dataset
      if (revolver === "1") a.revolverN++;
      if (collateral === "Y") a.collateralN++;
      if (Number.isFinite(jobs)) a.jobsSum += jobs;

      const sKey = status || "UNKNOWN";
      a.statusCounts.set(sKey, (a.statusCounts.get(sKey) || 0) + 1);
      if (sKey === "PIF") a.paidInFullN++;
      if (sKey === "CHGOFF") {
        a.chargeOffN++;
        if (Number.isFinite(chgOffAmt) && chgOffAmt > 0)
          a.chargeOffAmountSum += chgOffAmt;
        const mo = monthsBetween(chargeOffMs, approvalMs);
        if (Number.isFinite(mo) && mo >= 0) {
          a.chargeOffMonthsSum += mo;
          a.chargeOffMonthsN++;
        }
      }

      a.lenderCount.set(bank, (a.lenderCount.get(bank) || 0) + 1);
      a.lenderVolume.set(
        bank,
        (a.lenderVolume.get(bank) || 0) + (Number.isFinite(gross) ? gross : 0),
      );
      const lv = a.lenderApprovals.get(bank) || { sum: 0, n: 0 };
      if (Number.isFinite(gross)) lv.sum += gross;
      lv.n++;
      a.lenderApprovals.set(bank, lv);

      a.stateCount.set(state, (a.stateCount.get(state) || 0) + 1);
      a.stateVolume.set(
        state,
        (a.stateVolume.get(state) || 0) + (Number.isFinite(gross) ? gross : 0),
      );

      if (fy) {
        const y = a.yearly.get(fy) || { count: 0, total: 0 };
        y.count++;
        if (Number.isFinite(gross)) y.total += gross;
        a.yearly.set(fy, y);
      }

      if (Number.isFinite(approvalMs)) {
        if (approvalMs > TRAILING12_FROM && approvalMs <= ASOF_MS)
          a.trailing12Count++;
        else if (approvalMs > PRIOR12_FROM && approvalMs <= TRAILING12_FROM)
          a.prior12Count++;
      }

      if (franchiseCode && franchiseCode !== "0") {
        a.franchiseN++;
        if (franchiseName) {
          const fn = a.franchiseByName.get(franchiseName) || {
            count: 0,
            sumApproval: 0,
          };
          fn.count++;
          if (Number.isFinite(gross)) fn.sumApproval += gross;
          a.franchiseByName.set(franchiseName, fn);
        }
      }

      a.businessTypeCounts.set(
        businessType,
        (a.businessTypeCounts.get(businessType) || 0) + 1,
      );
      if (businessAge)
        a.businessAgeCounts.set(
          businessAge,
          (a.businessAgeCounts.get(businessAge) || 0) + 1,
        );
    };

    accumulate(overall);

    const effectiveDesc = desc || NAICS_DESC_FALLBACK[code] || "";
    let bucket = naics.get(code);
    if (!bucket) {
      bucket = newAccum(code, effectiveDesc);
      naics.set(code, bucket);
    } else if (!bucket.description && effectiveDesc) {
      bucket.description = effectiveDesc;
    }
    accumulate(bucket);

    if (totalRows % 50000 === 0) {
      process.stderr.write(`… ${totalRows.toLocaleString()} rows\n`);
    }
  }

  console.error(
    `Parsed ${totalRows.toLocaleString()} rows (skipped ${skipped}); ${naics.size} distinct NAICS codes`,
  );

  // ─── Finalize overall baseline ────────────────────────────────────────────
  const overallFinal = finalizeOverall(overall);

  // ─── Per-industry share (for over-indexing) ───────────────────────────────
  // Share of industry within a state = industryCountInState / totalIndustryCount
  // Share of industry nationally = totalIndustryCount / overall.count
  // Over-indexed state: industryShareInState > 2x industryShareNationally
  // Equivalent: industryCountInState / totalLoansInState > 2x (industry / overall)
  const nationalStateTotals = overallStateCount;

  const industries = {};
  const included = [];
  for (const [code, a] of naics.entries()) {
    if (a.count < MIN_LOANS) continue;
    const stats = finalizeIndustry(a, overallFinal, nationalStateTotals);
    industries[code] = {
      naics_code: code,
      naics_description: a.description,
      stats,
    };
    included.push(industries[code]);
  }

  const output = {
    metadata: {
      source: "SBA FOIA 7(a) dataset",
      coverage: "FY2020 through 12/31/2025",
      total_rows_processed: totalRows,
      rows_skipped: skipped,
      industries_included: included.length,
      inclusion_threshold: `>=${MIN_LOANS} loans`,
      generated_at: new Date().toISOString(),
      field_coding_notes: {
        fixedorvariableinterestind:
          "'F' = fixed, 'V' = variable; blanks excluded from fixed_pct denominator",
        revolverstatus: "'1' = revolving line; '0' = term loan",
        collateralind: "'Y' = collateral taken; 'N' = no collateral",
        loanstatus_values:
          "PIF = paid in full, CHGOFF = charged off, EXEMPT = exempt from FOIA disclosure (usually still-performing), CANCLD = cancelled, COMMIT = committed",
        date_format: "M/D/YYYY, parsed as UTC",
        trailing_12: "approvaldate in (2024-12-31, 2025-12-31]",
        prior_12: "approvaldate in (2023-12-31, 2024-12-31]",
      },
      overall_sba_stats: overallFinal,
    },
    industries,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(output, null, 2));
  console.error(`Wrote ${OUT_JSON}`);

  writeSummaryCsv(OUT_CSV, included);
  console.error(`Wrote ${OUT_CSV}`);

  writePrioritizationReport(OUT_MD, included, overallFinal);
  console.error(`Wrote ${OUT_MD}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Finalizers
// ─────────────────────────────────────────────────────────────────────────────
function finalizeOverall(a) {
  const avgLoan = a.count ? a.totalApproval / a.count : 0;
  const chargeOffPct = a.count ? (a.chargeOffN / a.count) * 100 : 0;
  return {
    loan_count: a.count,
    total_approval: round2(a.totalApproval),
    avg_loan: round2(avgLoan),
    median_loan: round2(median(a.grossApprovals)),
    avg_term_months: round2(a.termMonthsN ? a.termMonthsSum / a.termMonthsN : 0),
    avg_interest_rate: round4(a.rateN ? a.rateSum / a.rateN : 0),
    fixed_pct: round2(
      a.fixedDenominator ? (a.fixedN / a.fixedDenominator) * 100 : 0,
    ),
    revolver_pct: round2(a.count ? (a.revolverN / a.count) * 100 : 0),
    collateral_pct: round2(a.count ? (a.collateralN / a.count) * 100 : 0),
    total_jobs_supported: a.jobsSum,
    avg_jobs_per_loan: round2(a.count ? a.jobsSum / a.count : 0),
    paid_in_full_count: a.paidInFullN,
    paid_in_full_pct: round2(a.count ? (a.paidInFullN / a.count) * 100 : 0),
    charge_off_count: a.chargeOffN,
    charge_off_pct: round2(chargeOffPct),
    total_charge_off_amount: round2(a.chargeOffAmountSum),
    avg_charge_off_amount: round2(
      a.chargeOffN ? a.chargeOffAmountSum / a.chargeOffN : 0,
    ),
    avg_months_to_charge_off: round2(
      a.chargeOffMonthsN ? a.chargeOffMonthsSum / a.chargeOffMonthsN : 0,
    ),
    status_distribution: statusDist(a),
  };
}

function statusDist(a) {
  const out = {};
  for (const [k, v] of a.statusCounts.entries()) {
    out[k] = { count: v, pct: round2(a.count ? (v / a.count) * 100 : 0) };
  }
  return out;
}

function finalizeIndustry(a, overall, nationalStateTotals) {
  const avgLoan = a.count ? a.totalApproval / a.count : 0;
  const chargeOffPct = a.count ? (a.chargeOffN / a.count) * 100 : 0;

  // Top lenders
  const topLendersByCount = topN(
    a.lenderCount,
    10,
    (v) => v,
    (bank, count) => {
      const lv = a.lenderApprovals.get(bank) || { sum: 0, n: 0 };
      return {
        bankname: bank,
        loan_count: count,
        avg_loan_for_this_industry: round2(lv.n ? lv.sum / lv.n : 0),
      };
    },
  );
  const topLendersByVolume = topN(
    a.lenderVolume,
    10,
    (v) => v,
    (bank, vol) => {
      const lv = a.lenderApprovals.get(bank) || { sum: 0, n: 0 };
      return {
        bankname: bank,
        total_approval: round2(vol),
        avg_loan_for_this_industry: round2(lv.n ? lv.sum / lv.n : 0),
      };
    },
  );
  const top10Lenders = new Set(topLendersByCount.map((l) => l.bankname));
  let top10Count = 0;
  for (const b of top10Lenders) top10Count += a.lenderCount.get(b) || 0;
  const lenderConcTop10Pct = a.count ? (top10Count / a.count) * 100 : 0;

  // Top states
  const topStates = topN(
    a.stateCount,
    15,
    (v) => v,
    (state, count) => ({
      state,
      loan_count: count,
      total_approval: round2(a.stateVolume.get(state) || 0),
      pct_of_industry_loans: round2(a.count ? (count / a.count) * 100 : 0),
    }),
  );

  // Over-indexed states: industry's share within a state vs nationally
  const industryShareNational = overall.loan_count
    ? a.count / overall.loan_count
    : 0;
  const overIndexed = [];
  for (const [state, stateIndustryCount] of a.stateCount.entries()) {
    const nat = nationalStateTotals.get(state) || 0;
    if (nat < 200) continue; // ignore tiny states (PR/GU/VI, etc.)
    if (stateIndustryCount < 25) continue; // ignore thin cells
    const stateShare = stateIndustryCount / nat;
    if (industryShareNational > 0 && stateShare > 2 * industryShareNational) {
      overIndexed.push({
        state,
        industry_loans_in_state: stateIndustryCount,
        state_share_of_industry: round4(stateShare),
        national_share_of_industry: round4(industryShareNational),
        over_index_multiple: round2(stateShare / industryShareNational),
      });
    }
  }
  overIndexed.sort((x, y) => y.over_index_multiple - x.over_index_multiple);

  // Yearly
  const yearlyBreakdown = {};
  for (const [fy, v] of [...a.yearly.entries()].sort()) {
    yearlyBreakdown[fy] = {
      loan_count: v.count,
      total_approval: round2(v.total),
      avg_loan: round2(v.count ? v.total / v.count : 0),
    };
  }

  const trailingChange =
    a.prior12Count > 0
      ? ((a.trailing12Count - a.prior12Count) / a.prior12Count) * 100
      : null;

  // YoY: latest full FY vs prior. FY2025 is the last full FY (SBA FY ends 9/30, and asofdate covers Q1 of FY2026).
  const years = [...a.yearly.keys()].map(Number).filter(Number.isFinite).sort((x, y) => x - y);
  let yoy = null;
  if (years.length >= 2) {
    // Treat last full FY as the most recent FY that is <= 2025 (dataset covers thru 12/31/2025; FY2026 Q1 partial)
    const fullYears = years.filter((y) => y <= 2025);
    if (fullYears.length >= 2) {
      const last = fullYears[fullYears.length - 1];
      const prev = fullYears[fullYears.length - 2];
      const lc = a.yearly.get(String(last)).count;
      const pc = a.yearly.get(String(prev)).count;
      if (pc > 0) yoy = ((lc - pc) / pc) * 100;
    }
  }

  // Franchise
  const franchisePct = a.count ? (a.franchiseN / a.count) * 100 : 0;
  let topFranchises = null;
  if (franchisePct > 5) {
    topFranchises = topN(
      a.franchiseByName,
      10,
      (v) => v.count,
      (name, v) => ({
        franchisename: name,
        loan_count: v.count,
        avg_loan: round2(v.count ? v.sumApproval / v.count : 0),
      }),
    );
  }

  // Business types
  const btDist = {};
  for (const [k, v] of a.businessTypeCounts.entries()) {
    btDist[k] = { count: v, pct: round2(a.count ? (v / a.count) * 100 : 0) };
  }

  // Business age — the dataset uses categorical strings, not numeric years.
  // We expose the distribution plus a startup_pct convenience.
  const businessAgeDist = {};
  let startupCount = 0;
  for (const [k, v] of a.businessAgeCounts.entries()) {
    businessAgeDist[k] = {
      count: v,
      pct: round2(a.count ? (v / a.count) * 100 : 0),
    };
    if (/startup|new business|change of ownership/i.test(k)) startupCount += v;
  }

  return {
    loan_count: a.count,
    total_approval: round2(a.totalApproval),
    avg_loan: round2(avgLoan),
    median_loan: round2(median(a.grossApprovals)),
    avg_term_months: round2(a.termMonthsN ? a.termMonthsSum / a.termMonthsN : 0),
    avg_interest_rate: round4(a.rateN ? a.rateSum / a.rateN : 0),
    fixed_pct: round2(
      a.fixedDenominator ? (a.fixedN / a.fixedDenominator) * 100 : 0,
    ),
    revolver_pct: round2(a.count ? (a.revolverN / a.count) * 100 : 0),
    collateral_pct: round2(a.count ? (a.collateralN / a.count) * 100 : 0),
    total_jobs_supported: a.jobsSum,
    avg_jobs_per_loan: round2(a.count ? a.jobsSum / a.count : 0),

    status_distribution: statusDist(a),
    paid_in_full_count: a.paidInFullN,
    paid_in_full_pct: round2(a.count ? (a.paidInFullN / a.count) * 100 : 0),
    charge_off_count: a.chargeOffN,
    charge_off_pct: round2(chargeOffPct),
    total_charge_off_amount: round2(a.chargeOffAmountSum),
    avg_charge_off_amount: round2(
      a.chargeOffN ? a.chargeOffAmountSum / a.chargeOffN : 0,
    ),
    charge_off_vs_sba_avg_ratio: round2(
      overall.charge_off_pct > 0 ? chargeOffPct / overall.charge_off_pct : 0,
    ),
    avg_months_to_charge_off: round2(
      a.chargeOffMonthsN ? a.chargeOffMonthsSum / a.chargeOffMonthsN : 0,
    ),

    top_lenders_by_count: topLendersByCount,
    top_lenders_by_volume: topLendersByVolume,
    lender_concentration_top10_pct: round2(lenderConcTop10Pct),

    top_states_by_count: topStates,
    over_indexed_states: overIndexed.slice(0, 10),

    yearly_breakdown: yearlyBreakdown,
    trailing_12_count: a.trailing12Count,
    prior_12_count: a.prior12Count,
    trailing_12_vs_prior_12_pct_change:
      trailingChange == null ? null : round2(trailingChange),
    yoy_growth: yoy == null ? null : round2(yoy),

    franchise_loan_pct: round2(franchisePct),
    top_franchises: topFranchises,

    business_type_distribution: btDist,
    business_age_distribution: businessAgeDist,
    startup_pct: round2(a.count ? (startupCount / a.count) * 100 : 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary CSV
// ─────────────────────────────────────────────────────────────────────────────
function csvEscape(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeSummaryCsv(filePath, industries) {
  const rows = [
    [
      "naics_code",
      "description",
      "loan_count",
      "total_approval",
      "avg_loan",
      "charge_off_pct",
      "yoy_growth",
      "top_state",
      "top_lender",
    ],
  ];
  const sorted = [...industries].sort(
    (a, b) => b.stats.loan_count - a.stats.loan_count,
  );
  for (const ind of sorted) {
    const s = ind.stats;
    const topState =
      s.top_states_by_count[0] && s.top_states_by_count[0].state;
    const topLender =
      s.top_lenders_by_count[0] && s.top_lenders_by_count[0].bankname;
    rows.push([
      ind.naics_code,
      ind.naics_description,
      s.loan_count,
      s.total_approval,
      s.avg_loan,
      s.charge_off_pct,
      s.yoy_growth == null ? "" : s.yoy_growth,
      topState || "",
      topLender || "",
    ]);
  }
  fs.writeFileSync(filePath, rows.map((r) => r.map(csvEscape).join(",")).join("\n"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Prioritization report
// ─────────────────────────────────────────────────────────────────────────────
function writePrioritizationReport(filePath, industries, overall) {
  const sorted = [...industries].sort(
    (a, b) => b.stats.loan_count - a.stats.loan_count,
  );
  const top40 = sorted.slice(0, 40);

  // Existing Angle 2 SBA pages we've already shipped — avoid duplicating those.
  // Mirrors mmm-site/sba-loans/* subdirs.
  const existingAngle2 = new Set([
    "franchise",
    "startups",
    "veterans",
    "women",
    "minority",
    "bad-credit",
    "after-bankruptcy",
    "no-collateral",
    "self-employed",
    "business-acquisition",
    "disaster",
    "requirements",
  ]);

  // Composite score: normalized volume + growth + risk-adjusted + franchise penalty
  // volumeScore:      log-scaled count, rebased so a bare-threshold industry (500) = 0
  //                   and the largest industry = 40 pts
  // growthScore:      uses the WORSE of (yoy, trailing-12) so one-sided spikes don't
  //                   rescue a declining industry. Asymmetric cap: -20 to +15.
  // riskAdjust:       penalize if charge_off_pct > overall * 1.3, reward if below
  // franchisePenalty: if franchise_loan_pct > 35%, downrank (Angle 2 /sba-loans/franchise/ owns these)
  // specialtyBonus:   +5 for vertical-specialist lender concentration >35%
  const maxCount = Math.max(...industries.map((i) => i.stats.loan_count));
  const lnMin = Math.log(MIN_LOANS);
  const lnMax = Math.log(maxCount);
  const scored = industries.map((ind) => {
    const s = ind.stats;
    const volumeScore =
      lnMax > lnMin
        ? 40 * ((Math.log(s.loan_count) - lnMin) / (lnMax - lnMin))
        : 0;
    const yoy = s.yoy_growth == null ? 0 : s.yoy_growth;
    const t12 =
      s.trailing_12_vs_prior_12_pct_change == null
        ? 0
        : s.trailing_12_vs_prior_12_pct_change;
    // Growth uses the WORSE of (yoy, trailing-12) as the dominant signal so
    // a one-sided spike can't rescue a collapsing trend. Small bonus if both
    // signals agree (both clearly positive).
    const worstGrowth = Math.min(yoy, t12);
    const growthBase = Math.max(-20, Math.min(10, worstGrowth * 0.3));
    const bothPositiveBonus = yoy > 10 && t12 > 10 ? 5 : 0;
    const growthScore = growthBase + bothPositiveBonus;
    const risk =
      overall.charge_off_pct > 0
        ? s.charge_off_pct / overall.charge_off_pct
        : 1;
    let riskAdjust = 0;
    if (risk > 1.5) riskAdjust = -20;
    else if (risk > 1.3) riskAdjust = -12;
    else if (risk < 0.7) riskAdjust = 8;
    else if (risk < 0.9) riskAdjust = 4;

    const franchisePenalty = s.franchise_loan_pct > 35 ? -15 : 0;
    // Differentiation bonus: if top-state concentration is high → geo-specific angles exist, but still a valid Angle 1.
    // We give a small bonus to industries with unique lender patterns (top10 > 35% = vertical specialty).
    const specialtyBonus = s.lender_concentration_top10_pct > 35 ? 5 : 0;

    const score = round2(
      volumeScore + growthScore + riskAdjust + franchisePenalty + specialtyBonus,
    );
    return { ind, score, volumeScore, growthScore, riskAdjust, franchisePenalty, specialtyBonus, risk };
  });

  scored.sort((a, b) => b.score - a.score);

  const lines = [];
  lines.push("# SBA 7(a) Industry Prioritization Report");
  lines.push("");
  lines.push(
    `_Generated ${new Date().toISOString()} from ${overall.loan_count.toLocaleString()} loans across FY2020–12/31/2025._`,
  );
  lines.push("");
  lines.push("## Baseline (all 7(a))");
  lines.push("");
  lines.push(`- Total loans: **${overall.loan_count.toLocaleString()}**`);
  lines.push(
    `- Total approval: **$${overall.total_approval.toLocaleString()}**`,
  );
  lines.push(`- Avg loan: **$${overall.avg_loan.toLocaleString()}**`);
  lines.push(`- Median loan: **$${overall.median_loan.toLocaleString()}**`);
  lines.push(
    `- Overall charge-off rate: **${overall.charge_off_pct}%** (baseline for comparison)`,
  );
  lines.push(`- Paid-in-full rate: **${overall.paid_in_full_pct}%**`);
  lines.push(`- Avg term: **${overall.avg_term_months} months**`);
  lines.push(`- Avg interest rate: **${overall.avg_interest_rate}%**`);
  lines.push("");

  lines.push("## Top 40 industries by loan count");
  lines.push("");
  top40.forEach((ind, i) => {
    const s = ind.stats;
    const rank = i + 1;
    const share = round2((s.loan_count / overall.loan_count) * 100);
    const riskRatio = s.charge_off_vs_sba_avg_ratio;
    let riskFlag = "";
    if (riskRatio >= 1.5) riskFlag = " ⚠️ elevated risk";
    else if (riskRatio >= 1.3) riskFlag = " ⚠ slightly elevated";
    else if (riskRatio <= 0.7) riskFlag = " ✅ below avg risk";

    let arrow = "→";
    if (s.yoy_growth != null) {
      if (s.yoy_growth >= 15) arrow = "↑↑";
      else if (s.yoy_growth >= 5) arrow = "↑";
      else if (s.yoy_growth <= -15) arrow = "↓↓";
      else if (s.yoy_growth <= -5) arrow = "↓";
    }
    const topState = s.top_states_by_count[0]
      ? `${s.top_states_by_count[0].state} (${s.top_states_by_count[0].pct_of_industry_loans}%)`
      : "—";
    const topLender = s.top_lenders_by_count[0]
      ? s.top_lenders_by_count[0].bankname
      : "—";

    // Heuristic SEO note
    const notes = [];
    if (s.franchise_loan_pct > 35)
      notes.push(`franchise-dominant (${s.franchise_loan_pct}%)`);
    else if (s.franchise_loan_pct > 10)
      notes.push(`franchise-present (${s.franchise_loan_pct}%)`);
    if (s.collateral_pct > 85) notes.push("collateral-heavy");
    if (s.avg_loan > 800000) notes.push("large-ticket");
    else if (s.avg_loan < 100000) notes.push("small-ticket");
    if (s.revolver_pct > 25) notes.push(`line-of-credit heavy (${s.revolver_pct}%)`);
    if (s.avg_term_months > 180) notes.push("long-term");
    if (s.startup_pct > 20)
      notes.push(`startup-heavy (${s.startup_pct}%)`);
    if (s.yoy_growth != null && s.yoy_growth >= 20) notes.push("rising volume");
    if (s.yoy_growth != null && s.yoy_growth <= -20)
      notes.push("declining volume");
    if (riskRatio >= 1.3) notes.push("elevated risk");
    if (s.lender_concentration_top10_pct > 40)
      notes.push(
        `lender-concentrated (${s.lender_concentration_top10_pct}% top 10)`,
      );

    lines.push(
      `### ${rank}. NAICS ${ind.naics_code} — ${ind.naics_description}`,
    );
    lines.push("");
    lines.push(
      `- Loan count: **${s.loan_count.toLocaleString()}** (${share}% of all 7(a))`,
    );
    lines.push(`- Total approval: **$${s.total_approval.toLocaleString()}**`);
    lines.push(`- Avg loan: **$${s.avg_loan.toLocaleString()}**`);
    lines.push(
      `- Charge-off %: **${s.charge_off_pct}%** (${riskRatio}× SBA avg)${riskFlag}`,
    );
    lines.push(
      `- YoY growth: ${arrow} ${s.yoy_growth == null ? "n/a" : s.yoy_growth + "%"} | trailing-12 vs prior-12: ${s.trailing_12_vs_prior_12_pct_change == null ? "n/a" : s.trailing_12_vs_prior_12_pct_change + "%"}`,
    );
    lines.push(`- Top state: **${topState}** | Top lender: **${topLender}**`);
    lines.push(
      `- SEO notes: ${notes.length ? notes.join(", ") : "standard profile"}`,
    );
    lines.push("");
  });

  lines.push("## Recommended Angle 1 build queue (top 20)");
  lines.push("");
  lines.push(
    "**Scoring formula** (higher is better, rough 0–60 range):\n\n" +
      "- `volumeScore` = 0–40 pts, log-scaled between the 500-loan floor and the largest industry\n" +
      "- `growthScore` = 0.3 × min(yoy%, trailing-12%) clamped to [-20, +10], plus +5 if both signals are >+10% (confirmed uptrend). Using the *worse* signal prevents a one-sided post-pandemic spike from rescuing a collapsing vertical.\n" +
      "- `riskAdjust` = -20 if ≥1.5× SBA charge-off rate, -12 if ≥1.3×, +8 if ≤0.7×, +4 if ≤0.9×\n" +
      "- `franchisePenalty` = -15 if franchise share >35% (Angle 2 /sba-loans/franchise/ owns those queries)\n" +
      "- `specialtyBonus` = +5 if top-10 lender concentration >35% (clear vertical specialty → differentiated content)\n",
  );
  lines.push("");

  const recommended = scored.slice(0, 20);
  recommended.forEach((r, i) => {
    const s = r.ind.stats;
    const reasons = [];
    reasons.push(`volume ${s.loan_count.toLocaleString()}`);
    if (s.yoy_growth != null)
      reasons.push(`YoY ${s.yoy_growth >= 0 ? "+" : ""}${s.yoy_growth}%`);
    if (r.risk >= 1.3) reasons.push(`risk ${round2(r.risk)}× (downranked)`);
    else if (r.risk <= 0.9)
      reasons.push(`risk ${round2(r.risk)}× (safe, upranked)`);
    if (s.franchise_loan_pct > 35)
      reasons.push(`franchise ${s.franchise_loan_pct}% — partial overlap with /sba-loans/franchise/`);
    else if (s.franchise_loan_pct > 10)
      reasons.push(`franchise ${s.franchise_loan_pct}%`);
    if (s.lender_concentration_top10_pct > 35)
      reasons.push(
        `specialty lenders (top 10 = ${s.lender_concentration_top10_pct}%)`,
      );
    if (s.avg_loan > 800000) reasons.push("large-ticket buyer intent");
    if (s.collateral_pct > 85) reasons.push("collateral-heavy → content hook");
    if (s.startup_pct > 20)
      reasons.push(
        `startup share ${s.startup_pct}% — partial overlap with /sba-loans/startups/`,
      );

    lines.push(
      `### #${i + 1}. [${r.score}] NAICS ${r.ind.naics_code} — ${r.ind.naics_description}`,
    );
    lines.push("");
    lines.push(
      `- Score breakdown: vol ${round2(r.volumeScore)} + growth ${round2(r.growthScore)} + risk ${r.riskAdjust} + franchise ${r.franchisePenalty} + specialty ${r.specialtyBonus}`,
    );
    lines.push(`- Why: ${reasons.join("; ")}`);
    lines.push("");
  });

  lines.push("## Downranked / excluded notes");
  lines.push("");
  const pitfalls = scored
    .slice(0, 60)
    .filter(
      (r) =>
        r.riskAdjust <= -12 ||
        r.franchisePenalty < 0 ||
        (r.ind.stats.yoy_growth != null && r.ind.stats.yoy_growth <= -15),
    )
    .slice(0, 15);
  if (!pitfalls.length)
    lines.push("_No notable pitfalls in the top ranked set._");
  pitfalls.forEach((r) => {
    const s = r.ind.stats;
    const reasons = [];
    if (r.riskAdjust < 0)
      reasons.push(
        `charge-off ${s.charge_off_pct}% (${s.charge_off_vs_sba_avg_ratio}× SBA avg)`,
      );
    if (r.franchisePenalty < 0)
      reasons.push(`franchise-dominant (${s.franchise_loan_pct}%) → covered by Angle 2 /sba-loans/franchise/`);
    if (s.yoy_growth != null && s.yoy_growth <= -15)
      reasons.push(`YoY ${s.yoy_growth}%`);
    lines.push(
      `- NAICS ${r.ind.naics_code} — ${r.ind.naics_description}: ${reasons.join("; ")}`,
    );
  });
  lines.push("");

  fs.writeFileSync(filePath, lines.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
