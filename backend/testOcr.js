// testOcr.js
// -----------------------------------------------------------------------
// A tiny test file for the receipt scanner. Run it with:
//
//     node testOcr.js
//
// WHY THIS EXISTS
// Scanning a real image takes ~10 seconds, which is far too slow to use
// while you are tweaking the parsing rules. But the slow part is the OCR
// (turning pixels into text) - the RULES that turn text into fields are
// instant.
//
// So this file skips the image entirely and feeds text straight into the
// parser, letting you check dozens of receipt wordings in a second.
//
// ADD YOUR OWN CASE whenever you hit a receipt the scanner gets wrong:
// paste its text (copy it from the "View raw text OCR extracted" box on
// the upload screen) into a new entry below, write what you expected,
// and then fix the rules until it passes.
// -----------------------------------------------------------------------

const ocr = require("./services/ocrService");

const CASES = [
  {
    name: "Simple slip: quintals + per-quintal rate",
    text: `SHREE KRISHNA TRADERS\nPune Mandi, Maharashtra\nDate: 12/08/2025\nCrop: Wheat\nQuantity: 25 Quintal\nRate: 2100 per quintal\nTotal Amount: 52500`,
    expect: { crop: "Wheat", quantityInQuintal: 25, pricePerQuintal: 2100, state: "Maharashtra" },
  },
  {
    name: "Kilograms + per-kg rate",
    text: `Nashik APMC\nState: Maharashtra\nDated 03-07-2025\nCommodity: Onion\nNet Weight: 1500 kg\nRate Rs 18 per kg\nAmount 27000`,
    expect: { crop: "Onion", quantityInQuintal: 15, pricePerQuintal: 1800 },
  },
  {
    name: "Bags (assumed 50kg)",
    text: `Indore Mandi Madhya Pradesh\nDate 05/06/2025\nSoyabean\nQty 40 bags\nTotal 96000`,
    expect: { crop: "Soyabean", quantityInQuintal: 20, pricePerQuintal: 4800 },
  },
  {
    name: "Tonnes",
    text: `Guntur Market Andhra Pradesh\n01/09/2025\nChilli\nWeight 2.5 MT\nTaxable Value 375000`,
    expect: { crop: "Chilli", quantityInQuintal: 25, pricePerQuintal: 15000 },
  },
  {
    name: "Hindi crop name + derived rate",
    text: `Krishi Upaj Mandi Samiti\nState Rajasthan\nDinank 15/03/2025\nMaal: DHANIYA\nNet Weight 800 KG\nAmount 72000`,
    expect: { crop: "Coriander", quantityInQuintal: 8, pricePerQuintal: 9000 },
  },
  {
    name: "Marathi crop name (KANDA = Onion)",
    text: `Kolhapur Mandi\nMaharashtra\n22/04/2025\nKANDA\n12 Qtl\n@ 1450/qtl`,
    expect: { crop: "Onion", quantityInQuintal: 12, pricePerQuintal: 1450 },
  },
  {
    name: "OCR-mangled crop and state",
    text: `CHANDPOLE ANAJ MANDEL\nState | Rapsthan\nDate 25/11/2023\n1 DHANIYA (CORIANDUR)\nTotal 350 13,400\nAmount 1,072,134.00`,
    expect: { crop: "Coriander", state: "Rajasthan", quantityInQuintal: 134, pricePerQuintal: 8001 },
  },
  {
    name: "Grand total must NOT become the rate",
    text: `Azadpur Mandi Delhi\n10/10/2025\nPotato\nWeight 2000 kg\nAmount 40000\nNet Amount 1142400`,
    expect: { crop: "Potato", quantityInQuintal: 20, pricePerQuintal: 2000 },
  },
];

(async () => {
  let pass = 0, fail = 0;
  for (const c of CASES) {
    const got = ocr.__parseTextForTests(c.text);
    const problems = [];
    for (const [key, want] of Object.entries(c.expect)) {
      const actual = got[key];
      const ok = typeof want === "number"
        ? Math.abs((actual ?? 0) - want) < 0.5
        : actual === want;
      if (!ok) problems.push(`${key}: expected ${want}, got ${JSON.stringify(actual)}`);
    }
    if (problems.length === 0) { pass++; console.log(`PASS  ${c.name}`); }
    else {
      fail++;
      console.log(`FAIL  ${c.name}`);
      problems.forEach(p => console.log(`        ${p}`));
      console.log(`        full: ${JSON.stringify({crop:got.crop,state:got.state,qty:got.quantityInQuintal,price:got.pricePerQuintal,unit:got.detectedUnit,total:got.totalAmount})}`);
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
})();
