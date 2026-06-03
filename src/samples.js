// ─────────────────────────────────────────────────────────────────────────────
// samples.js — three synthetic reseller/distributor quotes in three different
// formats + shapes, each with a hand-labeled `expected` extraction (ground
// truth). They make the app demoable with no upload and give the eval harness a
// real golden set on first run. Content is embedded as strings so everything
// works offline (no fetch needed).
// ─────────────────────────────────────────────────────────────────────────────

export const SAMPLES = [
  {
    id: "ingram",
    name: "Ingram Micro — distributor CSV (HW + SW + freight)",
    fileName: "ingram-Q88231.csv",
    mime: "text/csv",
    content:
`Ingram Micro Distribution — Quote
Quote Number: Q-88231,Date: 2026-05-28,Valid Until: 2026-06-30,Currency: USD
Part Number,Description,Qty,Unit Price,Extended
UCSX-210C-M7,Cisco UCS X210c M7 Compute Node,2,4200.00,8400.00
MSWS-2022-STD,Windows Server 2022 Standard License (16-core),4,780.00,3120.00
FREIGHT,Shipping & Handling,1,145.00,145.00
,,,Grand Total,11665.00`,
    expected: {
      source: { vendor: "Ingram Micro", quoteNumber: "Q-88231", currency: "USD", validUntil: "2026-06-30" },
      totals: { grandTotalCost: 11665.00 },
      lineItems: [
        { sku: "UCSX-210C-M7", description: "Cisco UCS X210c M7 Compute Node", category: "hw", quantity: 2, unitCost: 4200, extendedCost: 8400 },
        { sku: "MSWS-2022-STD", description: "Windows Server 2022 Standard License (16-core)", category: "sw", quantity: 4, unitCost: 780, extendedCost: 3120 },
        { sku: "FREIGHT", description: "Shipping & Handling", category: "other", quantity: 1, unitCost: 145, extendedCost: 145 },
      ],
    },
  },
  {
    id: "cdw",
    name: "CDW — reseller PDF-style text (GBP, services)",
    fileName: "cdw-7741920.txt",
    mime: "text/plain",
    content:
`CDW Limited
Quotation  Quote No: 7741920   Valid until: 15/07/2026
Prepared for: Northwind Trading Ltd

Qty   Description                                   Unit       Line Total
1     Dell PowerEdge R760 Rack Server               £6,250.00  £6,250.00
10    Microsoft 365 Business Premium (annual)       £198.00    £1,980.00
3     Onsite Installation & Configuration (per day) £850.00    £2,550.00

                                          Total (ex VAT)  £10,780.00`,
    expected: {
      source: { vendor: "CDW", quoteNumber: "7741920", currency: "GBP", validUntil: "2026-07-15" },
      totals: { grandTotalCost: 10780.00 },
      lineItems: [
        { sku: "", description: "Dell PowerEdge R760 Rack Server", category: "hw", quantity: 1, unitCost: 6250, extendedCost: 6250 },
        { sku: "", description: "Microsoft 365 Business Premium (annual)", category: "sw", quantity: 10, unitCost: 198, extendedCost: 1980 },
        { sku: "", description: "Onsite Installation & Configuration (per day)", category: "ps", quantity: 3, unitCost: 850, extendedCost: 2550 },
      ],
    },
  },
  {
    id: "insight",
    name: "Insight — HTML email quote (HW + PS)",
    fileName: "insight-INS5567.html",
    mime: "text/html",
    content:
`<html><body>
<p>Hi — please find your quote below. Reference <b>INS-5567</b>, prices in USD, valid 30 days.</p>
<p>Regards,<br>Insight Enterprises</p>
<table border="1">
<tr><th>SKU</th><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr>
<tr><td>AP-635</td><td>Aruba AP-635 Wi-Fi 6E Access Point</td><td>6</td><td>520.00</td><td>3120.00</td></tr>
<tr><td>SVC-INSTALL</td><td>Network Installation Services</td><td>1</td><td>1800.00</td><td>1800.00</td></tr>
<tr><td></td><td>Grand Total</td><td></td><td></td><td>4920.00</td></tr>
</table>
</body></html>`,
    expected: {
      source: { vendor: "Insight", quoteNumber: "INS-5567", currency: "USD", validUntil: "" },
      totals: { grandTotalCost: 4920.00 },
      lineItems: [
        { sku: "AP-635", description: "Aruba AP-635 Wi-Fi 6E Access Point", category: "hw", quantity: 6, unitCost: 520, extendedCost: 3120 },
        { sku: "SVC-INSTALL", description: "Network Installation Services", category: "ps", quantity: 1, unitCost: 1800, extendedCost: 1800 },
      ],
    },
  },
  {
    id: "tdsynnex",
    name: "TD Synnex — distributor CSV (EUR, line discounts)",
    fileName: "tdsynnex-EU44120.csv",
    mime: "text/csv",
    content:
`TD SYNNEX Europe — Quote
Quote Number: EU-44120,Date: 2026-05-30,Valid Until: 2026-07-10,Currency: EUR
SKU,Description,Qty,List,Disc%,Unit Net,Ext
R740XD-CFG,Dell PowerEdge R740xd Server,2,5000.00,12%,4400.00,8800.00
VMW-VSP-8,VMware vSphere 8 Standard (1 CPU),4,1200.00,20%,960.00,3840.00
TDS-FREIGHT,Freight,1,60.00,0%,60.00,60.00
,,,,,Grand Total,12700.00`,
    expected: {
      source: { vendor: "TD SYNNEX", quoteNumber: "EU-44120", currency: "EUR", validUntil: "2026-07-10" },
      totals: { grandTotalCost: 12700.00 },
      lineItems: [
        // discount applied → unitCost is the NET (post-discount) price
        { sku: "R740XD-CFG", description: "Dell PowerEdge R740xd Server", category: "hw", quantity: 2, unitCost: 4400, extendedCost: 8800 },
        { sku: "VMW-VSP-8", description: "VMware vSphere 8 Standard (1 CPU)", category: "sw", quantity: 4, unitCost: 960, extendedCost: 3840 },
        { sku: "TDS-FREIGHT", description: "Freight", category: "other", quantity: 1, unitCost: 60, extendedCost: 60 },
      ],
    },
  },
  {
    id: "cdw-vat",
    name: "CDW — text (GBP, order discount + VAT + shipping)",
    fileName: "cdw-7782145.txt",
    mime: "text/plain",
    content:
`CDW Limited — Quotation
Quote No: 7782145   Valid until: 20/08/2026   Currency: GBP

Qty  Description                                   Unit       Line Total
1    Palo Alto PA-440 Firewall                     £3,200.00  £3,200.00
1    PAN-DB URL Filtering Subscription (1 yr)       £950.00    £950.00
2    Firewall Install & Configuration (per day)     £800.00    £1,600.00
     Customer discount (10%)                                   -£575.00
                                          Shipping             £25.00
                                          VAT (20%)            £1,040.00
                                          Grand Total          £6,240.00`,
    expected: {
      source: { vendor: "CDW", quoteNumber: "7782145", currency: "GBP", validUntil: "2026-08-20" },
      totals: { tax: 1040, shipping: 25, grandTotalCost: 6240.00 },
      lineItems: [
        { sku: "", description: "Palo Alto PA-440 Firewall", category: "hw", quantity: 1, unitCost: 3200, extendedCost: 3200 },
        { sku: "", description: "PAN-DB URL Filtering Subscription (1 yr)", category: "sw", quantity: 1, unitCost: 950, extendedCost: 950 },
        { sku: "", description: "Firewall Install & Configuration (per day)", category: "ps", quantity: 2, unitCost: 800, extendedCost: 1600 },
        // order-level discount captured as a negative "other" line so totals reconcile
        { sku: "", description: "Customer discount (10%)", category: "other", quantity: 1, unitCost: -575, extendedCost: -575 },
      ],
    },
  },
  {
    id: "dell-bundle",
    name: "Dell — CSV (USD, configured bundle + $0 child SKUs)",
    fileName: "dell-Q4471.csv",
    mime: "text/csv",
    content:
`Dell Technologies — Quote
Quote Number: DELL-Q-4471,Date: 2026-06-01,Valid Until: 2026-06-21,Currency: USD
SKU,Description,Qty,Unit,Ext
PE-R660-BUNDLE,PowerEdge R660 Configured Bundle,1,8500.00,8500.00
,Xeon Silver 4410Y Processor,2,0.00,0.00
,64GB RDIMM Memory,4,0.00,0.00
,480GB SATA SSD,2,0.00,0.00
PROSUPPORT-3YR,ProSupport Plus 3 Year,1,1200.00,1200.00
,,,Grand Total,9700.00`,
    expected: {
      source: { vendor: "Dell", quoteNumber: "DELL-Q-4471", currency: "USD", validUntil: "2026-06-21" },
      totals: { grandTotalCost: 9700.00 },
      lineItems: [
        { sku: "PE-R660-BUNDLE", description: "PowerEdge R660 Configured Bundle", category: "hw", quantity: 1, unitCost: 8500, extendedCost: 8500 },
        { sku: "", description: "Xeon Silver 4410Y Processor", category: "hw", quantity: 2, unitCost: 0, extendedCost: 0 },
        { sku: "", description: "64GB RDIMM Memory", category: "hw", quantity: 4, unitCost: 0, extendedCost: 0 },
        { sku: "", description: "480GB SATA SSD", category: "hw", quantity: 2, unitCost: 0, extendedCost: 0 },
        { sku: "PROSUPPORT-3YR", description: "ProSupport Plus 3 Year", category: "sw", quantity: 1, unitCost: 1200, extendedCost: 1200 },
      ],
    },
  },
];

/** Build a browser File from a sample so it flows through the normal ingest path. */
export function sampleToFile(sample) {
  return new File([sample.content], sample.fileName, { type: sample.mime });
}
