// Node smoke test for the environment-neutral core (no browser needed).
// Run: node tests/smoke.mjs   → exits non-zero on failure.
import { mockExtractor } from "../src/extractors/mockExtractor.js";
import { normalizeExtraction } from "../src/normalize.js";
import { validateQuote, makeStandardizedQuote } from "../src/schema.js";
import { scoreCase } from "../src/evaluate.js";
import { applyMarkup } from "../src/template.js";
import { toCrmBuyQuote } from "../src/crmAdapter.js";
import { handleExtract } from "../proxy/handler.js";
import { SAMPLES } from "../src/samples.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error("✗", msg); } };

// 1) Mock extractor on a reconstructed table doc (Ingram sample).
const ingramDoc = {
  fileName: "ingram-Q88231.csv", mimeType: "text/csv",
  text: SAMPLES[0].content, pages: 1,
  tables: [{ name: "CSV", rows: [
    ["Part Number", "Description", "Qty", "Unit Price", "Extended"],
    ["UCSX-210C-M7", "Cisco UCS X210c M7 Compute Node", "2", "4200.00", "8400.00"],
    ["MSWS-2022-STD", "Windows Server 2022 Standard License (16-core)", "4", "780.00", "3120.00"],
    ["FREIGHT", "Shipping & Handling", "1", "145.00", "145.00"],
  ]}],
};
const q = await mockExtractor.extract(ingramDoc);
ok(q.lineItems.length === 3, `mock should find 3 lines, got ${q.lineItems.length}`);
ok(q.lineItems[0].category === "hw", `line1 category should be hw, got ${q.lineItems[0].category}`);
ok(q.lineItems[1].category === "sw", `line2 category should be sw, got ${q.lineItems[1].category}`);
ok(q.lineItems[2].category === "other", `line3 category should be other, got ${q.lineItems[2].category}`);
ok(Math.abs(q.totals.subtotalCost - 11665) < 0.01, `subtotal should be 11665, got ${q.totals.subtotalCost}`);

// 2) Validation passes on the extracted quote.
ok(validateQuote(q).ok, "validation should pass on extracted quote");

// 3) Scoring against golden gives a perfect-ish line F1 for this clean case.
const golden = makeStandardizedQuote(SAMPLES[0].expected);
const sc = scoreCase(q, golden);
ok(sc.lineF1 >= 0.99, `line F1 should be ~1 for clean table, got ${sc.lineF1}`);
ok(sc.categoryAccuracy >= 0.99, `category accuracy should be ~1, got ${sc.categoryAccuracy}`);

// 4) Markup produces sell prices and a grand total price.
const priced = applyMarkup(golden, 20);
ok(Math.abs(priced.totals.grandTotalPrice - 11665 * 1.2) < 0.5,
  `grand total price ≈ ${11665 * 1.2}, got ${priced.totals.grandTotalPrice}`);

// 5) CRM mapping folds 'other' into hw and produces categories[].
const crm = toCrmBuyQuote(golden, { name: "ingram.csv", type: "text/csv" });
ok(crm.amount === 11665, `crm amount should be 11665, got ${crm.amount}`);
const hw = crm.categories.find(c => c.type === "hw");
ok(hw && Math.abs(hw.amount - (8400 + 145)) < 0.01, `hw should fold freight → 8545, got ${hw?.amount}`);

// 6) normalize repairs a missing extendedCost from unitCost*qty.
const norm = normalizeExtraction({ lineItems: [{ description: "Switch", quantity: 3, unitCost: 100 }] }, { extractor: "test" });
ok(norm.lineItems[0].extendedCost === 300, `extendedCost should be repaired to 300, got ${norm.lineItems[0].extendedCost}`);

// 7) Proxy handler loads + fails gracefully without a key (imports/prompt build OK).
const noKey = await handleExtract({ provider: "anthropic", documentText: "x", tables: [] });
ok(noKey.status === 500 && /ANTHROPIC_API_KEY/.test(noKey.json.error),
  `proxy should report missing key, got ${JSON.stringify(noKey.json)}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
