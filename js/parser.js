/**
 * parser.js
 * Intelligent Excel & Tabular Data Parser for Amazon Ungating Analytics.
 * Handles tab-delimited paste, CSV, quotes, multi-line cells, and dynamic column inference.
 */

var DataParser = (function () {
  "use strict";

  // Master Reference Data from extra.tst
  const MASTER_DATA = {
    suppliers: [
      "Adndale",
      "Aloha",
      "American Flagpole and Flag Co.",
      "Barnett",
      "BIG LU",
      "Bioma",
      "BOLD BUNS",
      "BreathableBaby",
      "CamelCamelCamel",
      "Carhartt Company Gear",
      "chewy",
      "COLOR WOW",
      "Cord Brick",
      "DEBROX",
      "Dental Brands",
      "Dermatool",
      "Eco Strong",
      "Explore Scientific",
      "Eyez on",
      "Fishpond",
      "Florastor",
      "GOSUPPS.COM",
      "Guardian tech",
      "GUN STORAGE SOLUTIONS",
      "Hatch",
      "HSN",
      "HUNT",
      "iHealth Labs Inc",
      "Improvia INCONTINENCE SOLUTIONS",
      "Intake",
      "IQBAR",
      "Johnson Woolen Mills",
      "Joy Spring",
      "KERANIQUE",
      "KERATIN SALON DIRECT",
      "l'ange",
      "Latinafy",
      "LAZY ACRES",
      "Macy's",
      "Mighty Paw",
      "Mila MiAmor",
      "Naoki",
      "Naturonel",
      "Naveh Pharma",
      "OMNI BIOTIC",
      "ONE STOP EQUINE SHOP",
      "PBS animal health",
      "Plexaderm Skin care",
      "PLUSH DELUXE",
      "PURE protein",
      "Refresh Lubricant Eye Drops",
      "RoC CLINICALLY PROVEN",
      "Roku",
      "RUSSO",
      "SIMPLEHUMAN",
      "SNAP",
      "snow peak",
      "Target",
      "TEND SKIN",
      "TESSAN",
      "TheraPet",
      "Tractor Supply co.",
      "TRP relief products",
      "UberLube",
      "Ultima Replinisher",
      "UltraGlass",
      "Verb",
      "VIBRIANCE",
      "Vinnies",
      "WellSpring",
      "WILDE",
      "Wilson",
      "Z roborock",
    ],
    companies: [
      "Ravav",
      "Prime Nova Store LLC",
      "9teen Trades Inc",
      "Cornercart Inc",
      "OceanPath LLC",
      "Polar Horizon Store Inc",
      "IT Services LLC",
      "Trade Fussion Inc",
      "BoldBuy Hub Inc",
      "IR Tech",
      "PrimeShops",
      "Kdot Store",
      "EBlitz Enterprises Inc",
      "Good Choice USA",
      "Good Choice AUS",
      "Urban Bazaar Pty Ltd",
      "OaksMax Inc",
      "Amer Canada Inc",
      "BUBH Trading Corp",
      "Bzable Corporation Inc",
      "VALUE VAULT INC.",
      "Meccos Corporation Inc.",
      "High Standard Goods",
      "Amari International Inc.",
      "House of Trade",
      "ClickToTheCart Global Inc.",
      "Verox Store LLC",
      "IrhaAndAmmar LLC",
      "Datamatics Technologies Ltd.",
      "Dernier Km Depose",
      "HB Innovate Inc.",
      "GoodHome USA Inc",
      "Ecomsphere LLC",
    ],
    categories: [
      "Amazon Devices & Accessories",
      "Amazon Renewed",
      "Appliances",
      "Apps & Games",
      "Arts, Crafts & Sewing",
      "Audible Books & Originals",
      "Automotive",
      "Baby",
      "Beauty & Personal Care",
      "Books",
      "Camera & Photo Products",
      "CDs & Vinyl",
      "Cell Phones & Accessories",
      "Clothing, Shoes & Jewelry",
      "Collectible Coins",
      "Computers & Accessories",
      "Digital Educational Resources",
      "Digital Music",
      "Electronics",
      "Entertainment Collectibles",
      "Gift Cards",
      "Grocery & Gourmet Food",
      "Handmade Products",
      "Health & Household",
      "Home & Kitchen",
      "Industrial & Scientific",
      "Kindle Store",
      "Kitchen & Dining",
      "Movies & TV",
      "Musical Instruments",
      "Office Products",
      "Patio, Lawn & Garden",
      "Pet Supplies",
      "Software",
      "Sports & Outdoors",
      "Sports Collectibles",
      "Tools & Home Improvement",
      "Toys & Games",
      "Unique Finds",
      "Video Games",
      "Grocery & Gourmet Foods",
      "Small Appliance Parts & Accessories",
      "baby products",
      "Safety & Security",
      "Power tools parts and accesories",
      "Medical Supplies & Equipment",
      "Lighting Assemblies & Accessories",
      "Power & Hand Tools",
    ],
    brands: [
      "Adndale",
      "Aloha",
      "American Flagpole and Flag Co.",
      "Barnett",
      "BIG LU",
      "Bioma",
      "BOLD BUNS",
      "BreathableBaby",
      "CamelCamelCamel",
      "Carhartt Company Gear",
      "chewy",
      "COLOR WOW",
      "Cord Brick",
      "DEBROX",
      "Dental Brands",
      "Dermatool",
      "Eco Strong",
      "Explore Scientific",
      "Eyez on",
      "Fishpond",
      "Florastor",
      "GOSUPPS.COM",
      "Guardian tech",
      "GUN STORAGE SOLUTIONS",
      "Hatch",
      "HSN",
      "HUNT",
      "iHealth Labs Inc",
      "Improvia INCONTINENCE SOLUTIONS",
      "Intake",
      "IQBAR",
      "Johnson Woolen Mills",
      "Joy Spring",
      "KERANIQUE",
      "KERATIN SALON DIRECT",
      "l'ange",
      "Latinafy",
      "LAZY ACRES",
      "Macy's",
      "Mighty Paw",
      "Mila MiAmor",
      "Naoki",
      "Naturonel",
      "Naveh Pharma",
      "OMNI BIOTIC",
      "ONE STOP EQUINE SHOP",
      "PBS animal health",
      "Plexaderm Skin care",
      "PLUSH DELUXE",
      "PURE protein",
      "Refresh Lubricant Eye Drops",
      "RoC CLINICALLY PROVEN",
      "Roku",
      "RUSSO",
      "SIMPLEHUMAN",
      "SNAP",
      "snow peak",
      "Target",
      "TEND SKIN",
      "TESSAN",
      "TheraPet",
      "Tractor Supply co.",
      "TRP relief products",
      "UberLube",
      "Ultima Replinisher",
      "UltraGlass",
      "Verb",
      "VIBRIANCE",
      "Vinnies",
      "WellSpring",
      "WILDE",
      "Wilson",
      "Z roborock",
    ],
    accountStatuses: ["Gated", "Ungate", "Copylist"],
    caseLogs: ["Review", "Invoice Submission", "Ungate", "Rejected"],
    caseReopens: [
      "Case re-open 1",
      "Case re-open 2",
      "Case re-open 3",
      "Case re-open 4",
      "Case re-open 5",
      "Under review",
      "0 case re-open",
      "Case Open",
      "Re-apply",
      "Rejected",
    ],
  };

  // Standard status normalizer keywords
  const STATUS_CANONICAL_MAP = {
    approved: "Approved",
    approve: "Approved",
    ungate: "Ungate",
    ungated: "Ungate",
    "auto ungate": "Auto Ungate",
    "auto-ungate": "Auto Ungate",
    "auto ungated": "Auto Ungate",
    gated: "Gated",
    review: "Review",
    "under review": "Under Review",
    rejected: "Rejected",
    reject: "Rejected",
    declined: "Rejected",
    copylist: "Copy Listed",
    "copy listed": "Copy Listed",
    "copy-listed": "Copy Listed",
    "invoice submission": "Invoice Submitted",
    "invoice submitted": "Invoice Submitted",
    "invoice pending": "Invoice Pending",
    "pending invoice": "Invoice Pending",
    pending: "Invoice Pending",
    "case open": "Case Open",
    "case opened": "Case Open",
    "case re-open 1": "Case Re-open 1",
    "case reopen 1": "Case Re-open 1",
    "case re-open 2": "Case Re-open 2",
    "case reopen 2": "Case Re-open 2",
    "case re-open 3": "Case Re-open 3",
    "case reopen 3": "Case Re-open 3",
    "case re-open 4": "Case Re-open 4",
    "case reopen 4": "Case Re-open 4",
    "case re-open 5": "Case Re-open 5",
    "case reopen 5": "Case Re-open 5",
    "0 case re-open": "0 Case Re-open",
    "0 case reopen": "0 Case Re-open",
    "case reopened": "Case Re-open 1",
    "re-apply": "Re-Apply",
    reapply: "Re-Apply",
    "re apply": "Re-Apply",
  };

  /**
   * Normalize date string to standard YYYY-MM-DD format
   * Correctly handles DD-MM-YYYY, MM-DD-YYYY, and YYYY-MM-DD without month/day confusion
   */
  function normalizeDateStr(str) {
    if (!str || typeof str !== "string") return "";
    const s = str.trim();
    if (!s) return "";

    // 1. Match YYYY-MM-DD or YYYY/MM/DD
    const ymd = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (ymd) {
      return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
    }

    // 2. Match DD-MM-YYYY or MM-DD-YYYY
    const dmy = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (dmy) {
      const p1 = parseInt(dmy[1], 10);
      const p2 = parseInt(dmy[2], 10);
      const year = dmy[3];

      // If p1 > 12, p1 MUST be day: DD-MM-YYYY (e.g. 28-09-2026 -> 2026-09-28)
      if (p1 > 12) {
        return `${year}-${p2.toString().padStart(2, "0")}-${p1.toString().padStart(2, "0")}`;
      }
      // If p2 > 12, p2 MUST be day: MM-DD-YYYY (e.g. 10-26-2026 -> 2026-10-26)
      if (p2 > 12) {
        return `${year}-${p1.toString().padStart(2, "0")}-${p2.toString().padStart(2, "0")}`;
      }
      // Ambiguous (both <= 12, e.g. 10-01-2026): in Amazon sheets default to DD-MM-YYYY
      return `${year}-${p2.toString().padStart(2, "0")}-${p1.toString().padStart(2, "0")}`;
    }

    // 3. Fallback: JS Date
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
    return s;
  }

  /**
   * Determine whether the first row of parsed matrix is a header row or data
   */
  function detectIfHeaderRow(firstRow) {
    if (!firstRow || firstRow.length === 0) return false;

    // If any cell looks like an ASIN (B0...), it is definitely a data row
    if (firstRow.some((cell) => /^B0[A-Z0-9]{8}$/i.test((cell || "").trim()))) {
      return false;
    }

    // If any cell matches a date, it is definitely a data row
    if (
      firstRow.some((cell) =>
        /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/.test((cell || "").trim()),
      )
    ) {
      return false;
    }

    // If first cell is pure numeric, it is data
    if (/^\d+$/.test((firstRow[0] || "").trim())) {
      return false;
    }

    // Check if row contains standard header keywords
    const kw = [
      "asin",
      "date",
      "company",
      "brand",
      "supplier",
      "category",
      "status",
      "sku",
      "unit",
      "cost",
      "note",
      "account",
      "case",
      "log",
      "software",
      "tool",
      "more",
      "less"
    ];
    const matches = firstRow.filter((cell) => {
      const l = (cell || "").toLowerCase().trim();
      return kw.some((k) => l === k || l.includes(k));
    });

    return matches.length >= 2;
  }

  /**
   * Automatically detect and assign column names for headerless data
   * Matches the exact 11-column Google Sheets / Excel layout used for Amazon Ungating
   */
  function classifyColumns(dataRows) {
    if (!dataRows || dataRows.length === 0) return [];
    const numCols = dataRows[0].length;
    const assigned = new Array(numCols).fill(null);
    const sampleSize = Math.min(dataRows.length, 35);

    // Fast path: if exactly 11 columns and first column is an ASIN (B0...), use the exact Google Sheet headers
    if (numCols === 11 && /^B0/i.test((dataRows[0][0] || "").trim())) {
      return [
        "ASINS",
        "Date",
        "Company Name",
        "Brand Name",
        "Quantity",
        "Account Status",
        "Category",
        "Popular Supplier Name",
        "Case Log",
        "Case ID",
        "Case re-open",
      ];
    }

    // Fast path: if exactly 12 columns and first column is an ASIN (B0...), use the exact Google Sheet headers with Software
    if (numCols === 12 && /^B0/i.test((dataRows[0][0] || "").trim())) {
      return [
        "ASINS",
        "Date",
        "Company Name",
        "Brand Name",
        "Quantity",
        "Account Status",
        "Category",
        "Popular Supplier Name",
        "Case Log",
        "Case ID",
        "Case re-open",
        "Software",
      ];
    }

    // Fast path: if exactly 13 columns (exact user schema with More/Less and Software)
    if (numCols === 13 && /^B0/i.test((dataRows[0][0] || "").trim())) {
      return [
        "ASINS",
        "Date",
        "Company Name",
        "Brand Name",
        "Quantity",
        "Account Status",
        "Category",
        "Popular Supplier Name",
        "Case Log",
        "Case ID",
        "Case re-open",
        "More/Less",
        "Software",
      ];
    }

    // Fast path: if 14 or more columns (Google Sheets A through N where Col N is Software)
    if (numCols >= 14 && /^B0/i.test((dataRows[0][0] || "").trim())) {
      const h = [
        "ASINS",
        "Date",
        "Company Name",
        "Brand Name",
        "Quantity",
        "Account Status",
        "Category",
        "Popular Supplier Name",
        "Case Log",
        "Case ID",
        "Case re-open",
        "More/Less",
      ];
      for (let k = 12; k < numCols - 1; k++) {
        h.push(`Column_${k + 1}`);
      }
      h.push("Software");
      return h;
    }

    // 1. Detect ASINS (starts with B0...)
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let m = 0;
      for (let i = 0; i < sampleSize; i++) {
        if (/^B0[A-Z0-9]{8}$/i.test((dataRows[i][j] || "").trim())) m++;
      }
      if (m >= sampleSize * 0.4) {
        assigned[j] = "ASINS";
        break;
      }
    }

    // 2. Detect Date (DD-MM-YYYY, YYYY-MM-DD, etc.)
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let m = 0;
      for (let i = 0; i < sampleSize; i++) {
        if (
          /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(
            (dataRows[i][j] || "").trim(),
          )
        )
          m++;
      }
      if (m >= sampleSize * 0.4) {
        assigned[j] = "Date";
        break;
      }
    }

    // 3. Detect Case ID (pure numbers >= 6 digits)
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let m = 0;
      for (let i = 0; i < sampleSize; i++) {
        const v = (dataRows[i][j] || "").trim();
        if (v && /^\d{6,}$/.test(v)) m++;
      }
      if (m >= sampleSize * 0.4) {
        assigned[j] = "Case ID";
        break;
      }
    }

    // 4. Detect Quantity / Units (pure numbers <= 5 digits)
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let m = 0;
      for (let i = 0; i < sampleSize; i++) {
        const v = (dataRows[i][j] || "").trim();
        if (v && /^\d{1,5}$/.test(v)) m++;
      }
      if (m >= sampleSize * 0.5) {
        assigned[j] = "Quantity";
        break;
      }
    }

    // 5. Detect Account Status (gated, ungate, copylist)
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let m = 0;
      for (let i = 0; i < sampleSize; i++) {
        const v = (dataRows[i][j] || "").toLowerCase().trim();
        if (v === "gated" || v === "ungate" || v === "copylist") m++;
      }
      if (m >= sampleSize * 0.5) {
        assigned[j] = "Account Status";
        break;
      }
    }

    // 6. Detect Case Log (review, rejected, ungate, invoice submission, approved)
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let m = 0;
      for (let i = 0; i < sampleSize; i++) {
        const v = (dataRows[i][j] || "").toLowerCase().trim();
        if (
          v === "review" ||
          v === "rejected" ||
          v === "ungate" ||
          v.includes("invoice") ||
          v === "approved"
        )
          m++;
      }
      if (m >= sampleSize * 0.4) {
        assigned[j] = "Case Log";
        break;
      }
    }

    // 7. Detect Case re-open (case open, case re-open, re-apply, under review)
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let m = 0;
      for (let i = 0; i < sampleSize; i++) {
        const v = (dataRows[i][j] || "").toLowerCase().trim();
        if (
          v.includes("case") ||
          v.includes("re-apply") ||
          v.includes("reapply") ||
          v.includes("under review")
        )
          m++;
      }
      if (m >= sampleSize * 0.3) {
        assigned[j] = "Case re-open";
        break;
      }
    }

    // 8. Detect Category (matching categories or category words)
    const catWords =
      /grocery|beauty|health|toy|garden|automotive|baby|office|industrial|clothing|tool|kitchen|sports|electronics|pet|home/i;
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let m = 0;
      for (let i = 0; i < sampleSize; i++) {
        const v = (dataRows[i][j] || "").trim();
        if (catWords.test(v)) m++;
      }
      if (m >= sampleSize * 0.3) {
        assigned[j] = "Category";
        break;
      }
    }

    // 9. Detect Company Name (contains Inc, LLC, Corp, Store, Hub, Trades, etc.)
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let m = 0;
      for (let i = 0; i < sampleSize; i++) {
        const v = (dataRows[i][j] || "").trim();
        if (
          /inc|llc|corp|ltd|store|hub|trades|goods|global|services|boutique/i.test(
            v,
          )
        )
          m++;
      }
      if (m >= sampleSize * 0.4) {
        assigned[j] = "Company Name";
        break;
      }
    }

    // 10. Detect Software (Orbit-B, Orbit-N, Orbit-A, Aura, Shipment, etc.)
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let foundSoftware = false;
      for (let i = 0; i < dataRows.length; i++) {
        const v = (dataRows[i][j] || "").toLowerCase().trim();
        if (/orbit|aura|shipment/i.test(v)) {
          foundSoftware = true;
          break;
        }
      }
      if (foundSoftware) {
        assigned[j] = "Software";
        break;
      }
    }

    // 10b. Detect More/Less
    for (let j = 0; j < numCols; j++) {
      if (assigned[j]) continue;
      let m = 0;
      for (let i = 0; i < sampleSize; i++) {
        const v = (dataRows[i][j] || "").toLowerCase().trim();
        if (v === "more" || v === "less" || /more|less/i.test(v)) m++;
      }
      if (m >= 1) {
        assigned[j] = "More/Less";
        break;
      }
    }

    // 11. Remaining unassigned columns: Assign Brand Name & Popular Supplier Name smartly
    for (let j = 0; j < numCols; j++) {
      if (!assigned[j]) {
        if (
          !assigned.includes("Popular Supplier Name") &&
          assigned.includes("Category") &&
          j > assigned.indexOf("Category")
        ) {
          assigned[j] = "Popular Supplier Name";
        } else if (!assigned.includes("Brand Name")) {
          assigned[j] = "Brand Name";
        } else if (!assigned.includes("Popular Supplier Name")) {
          assigned[j] = "Popular Supplier Name";
        } else {
          assigned[j] = `Column_${j + 1}`;
        }
      }
    }

    return assigned;
  }

  /**
   * Parse raw text copied from Excel or CSV
   * Automatically handles data with headers OR headerless data copied from Excel
   * @param {string} rawText
   * @returns {Object} { headers, rows, detectedColumns, totalRows, totalColumns }
   */
  function parseText(rawText) {
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      throw new Error("No data found to parse.");
    }

    // Determine delimiter: Excel copies are Tab-delimited ('\t')
    const firstFewLines = rawText.slice(0, 4000);
    const tabCount = (firstFewLines.match(/\t/g) || []).length;
    const commaCount = (firstFewLines.match(/,/g) || []).length;
    const semicolonCount = (firstFewLines.match(/;/g) || []).length;

    let delimiter = "\t";
    if (tabCount < 2 && commaCount > tabCount && commaCount > semicolonCount) {
      delimiter = ",";
    } else if (
      tabCount < 2 &&
      semicolonCount > tabCount &&
      semicolonCount > commaCount
    ) {
      delimiter = ";";
    }

    const parsedMatrix = parseDelimitedMatrix(rawText, delimiter);
    if (!parsedMatrix || parsedMatrix.length < 1) {
      throw new Error("Could not parse any rows from the provided text.");
    }

    // Check if first row contains headers or if it's already a data row
    const hasHeaders = detectIfHeaderRow(parsedMatrix[0]);

    let rawHeaders = [];
    let dataRows = [];

    if (hasHeaders) {
      rawHeaders = parsedMatrix[0];
      dataRows = parsedMatrix.slice(1);
    } else {
      // Headerless paste: automatically classify columns based on content
      rawHeaders = classifyColumns(parsedMatrix);
      dataRows = parsedMatrix;
    }

    // Prune trailing empty columns if all data rows in that column are blank
    let maxValidCol = rawHeaders.length - 1;
    while (maxValidCol > 10) {
      const isHeaderEmpty = !rawHeaders[maxValidCol] || /^column_\d+$/i.test(rawHeaders[maxValidCol].trim());
      const allCellsEmpty = dataRows.every(r => !r[maxValidCol] || r[maxValidCol].trim() === "");
      if (isHeaderEmpty && allCellsEmpty) {
        maxValidCol--;
      } else {
        break;
      }
    }
    rawHeaders = rawHeaders.slice(0, maxValidCol + 1);

    // Identify if any column contains Orbit/Aura/Shipment values and force it to be Software
    for (let c = 0; c < rawHeaders.length; c++) {
      const hLower = (rawHeaders[c] || "").toLowerCase().trim();
      if (!hLower.includes("softw") && !hLower.includes("tool")) {
        let hasSwValue = false;
        for (let r = 0; r < dataRows.length; r++) {
          const cell = (dataRows[r][c] || "").trim();
          if (/^(orbit[\s_-]?[nba]|aura|shipment)$/i.test(cell)) {
            hasSwValue = true;
            break;
          }
        }
        if (hasSwValue) {
          rawHeaders[c] = "Software";
        }
      }
    }

    // Canonicalize header names to standard ungating schema
    function canonicalizeHeader(name) {
      const lower = (name || "").toLowerCase().trim();
      if (/^asin[s]?$/i.test(lower)) return "ASINS";
      if (/^date$/i.test(lower)) return "Date";
      if (/^(company|company\s*name|account|store)$/i.test(lower)) return "Company Name";
      if (/^(brand|brand\s*name)$/i.test(lower)) return "Brand Name";
      if (/^(quantity|qty|units)$/i.test(lower)) return "Quantity";
      if (/^(account\s*status|gate\s*status|gating\s*status)$/i.test(lower)) return "Account Status";
      if (/^category(s)?$/i.test(lower)) return "Category";
      if (/^(popular\s*supplier\s*name|supplier|supplier\s*name)$/i.test(lower)) return "Popular Supplier Name";
      if (/^(case\s*log|log)$/i.test(lower)) return "Case Log";
      if (/^(case\s*id|case\s*number)$/i.test(lower)) return "Case ID";
      if (/^(case\s*re-?open|case\s*status)$/i.test(lower)) return "Case re-open";
      if (/^(more[\s/_-]*less|more|less)$/i.test(lower)) return "More/Less";
      if (/^(software|software[\s_-]?name|tool|tool[\s_-]?name|system)$/i.test(lower) || lower.includes("softw")) return "Software";
      return name;
    }

    // Sanitize and deduplicate headers
    const headers = [];
    const headerMap = {};
    const seenNames = {};

    rawHeaders.forEach((col, idx) => {
      let clean = canonicalizeHeader((col || "").toString().trim());
      if (!clean) clean = `Column_${idx + 1}`;

      let uniqueName = clean;
      let counter = 1;
      while (seenNames[uniqueName.toLowerCase()]) {
        counter++;
        uniqueName = `${clean}_${counter}`;
      }
      seenNames[uniqueName.toLowerCase()] = true;
      headers.push(uniqueName);
      headerMap[uniqueName] = clean;
    });

    // Build array of objects and normalize dates
    const rows = [];
    for (let i = 0; i < dataRows.length; i++) {
      const rowArr = dataRows[i];
      if (rowArr.every((cell) => !cell || cell.trim() === "")) continue;

      const rowObj = { _id: i + 1 };
      headers.forEach((h, colIdx) => {
        let val = rowArr[colIdx] !== undefined ? rowArr[colIdx].trim() : "";
        // Normalize date fields
        if (/date/i.test(h) || /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(val)) {
          val = normalizeDateStr(val);
        }
        rowObj[h] = val;
      });
      rows.push(rowObj);
    }

    if (rows.length === 0) {
      throw new Error("No valid data rows found in pasted content.");
    }

    // Infer column semantic roles
    const detectedColumns = inferColumnRoles(headers, rows);

    // Normalize canonical status fields on each row for high-accuracy dashboard metrics
    normalizeRowStatuses(rows, detectedColumns);

    return {
      headers,
      headerMap,
      rows,
      detectedColumns,
      totalRows: rows.length,
      totalColumns: headers.length,
    };
  }

  /**
   * Robust parser handling quotes and delimiters
   */
  function parseDelimitedMatrix(text, delimiter) {
    const matrix = [];
    let currentRow = [];
    let currentCell = "";
    let inQuotes = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            // Escaped quote
            currentCell += '"';
            i += 2;
            continue;
          } else {
            // End of quotes
            inQuotes = false;
            i++;
            continue;
          }
        } else {
          currentCell += char;
          i++;
          continue;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
          i++;
          continue;
        } else if (char === delimiter) {
          currentRow.push(currentCell);
          currentCell = "";
          i++;
          continue;
        } else if (char === "\r") {
          if (nextChar === "\n") i++;
          currentRow.push(currentCell);
          matrix.push(currentRow);
          currentRow = [];
          currentCell = "";
          i++;
          continue;
        } else if (char === "\n") {
          currentRow.push(currentCell);
          matrix.push(currentRow);
          currentRow = [];
          currentCell = "";
          i++;
          continue;
        } else {
          currentCell += char;
          i++;
          continue;
        }
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell);
      matrix.push(currentRow);
    }

    return matrix;
  }

  /**
   * Automatically classify columns based on header name and sample values
   */
  function inferColumnRoles(headers, rows) {
    const roles = {
      statusCol: null,
      accountStatusCol: null,
      caseLogCol: null,
      caseStatusCol: null,
      companyCol: null,
      categoryCol: null,
      supplierCol: null,
      brandCol: null,
      dateCol: null,
      asinCol: null,
      skuCol: null,
      unitsCol: null,
      caseIdCol: null,
      softwareCol: null,
      moreLessCol: null,
    };

    // Candidate scores
    const sampleSize = Math.min(rows.length, 100);

    headers.forEach((h) => {
      const lowerH = h.toLowerCase().trim();

      // Check Software
      if (!roles.softwareCol) {
        if (/^(software|software[\s_-]?name|software[\s_-]?type|tool|tool[\s_-]?name|system)$/i.test(lowerH) || lowerH.includes("softw")) {
          roles.softwareCol = h;
        }
      }

      // Check More/Less
      if (!roles.moreLessCol) {
        if (/^(more[\s/_-]*less|more|less)$/i.test(lowerH)) {
          roles.moreLessCol = h;
        }
      }

      // Check Account Status
      if (!roles.accountStatusCol) {
        if (/^(account status|gate status|gating status)$/i.test(lowerH)) {
          roles.accountStatusCol = h;
        }
      }

      // Check Case Log
      if (!roles.caseLogCol) {
        if (/^(case log|application status|case outcome|log)$/i.test(lowerH)) {
          roles.caseLogCol = h;
        }
      }

      // Check Case Status / Case Re-open
      if (!roles.caseStatusCol) {
        if (
          /^(case status|case re-?open|ticket status|case state|amazon case)$/i.test(
            lowerH,
          )
        ) {
          roles.caseStatusCol = h;
        }
      }

      // Check General Status
      if (!roles.statusCol) {
        if (/^(status|approval status|ungate status)$/i.test(lowerH)) {
          roles.statusCol = h;
        }
      }

      // Check Company / Store / Account
      if (!roles.companyCol) {
        if (
          /^(company|company name|account|store|store name|seller|client)$/i.test(
            lowerH,
          )
        ) {
          roles.companyCol = h;
        }
      }

      // Check Category
      if (!roles.categoryCol) {
        if (
          /^(category|product category|department|dept|sub-category)$/i.test(
            lowerH,
          )
        ) {
          roles.categoryCol = h;
        }
      }

      // Check Supplier / Distributor / Wholesaler
      if (!roles.supplierCol) {
        if (
          /^(supplier|distributor|vendor|wholesaler|source|supplier name)$/i.test(
            lowerH,
          )
        ) {
          roles.supplierCol = h;
        }
      }

      // Check Brand / Manufacturer
      if (!roles.brandCol) {
        if (
          /^(brand|brand name|manufacturer|make|product title|product)$/i.test(
            lowerH,
          )
        ) {
          roles.brandCol = h;
        }
      }

      // Check Date
      if (!roles.dateCol) {
        if (
          /^(date|applied date|submitted date|created date|application date|timestamp|date applied)$/i.test(
            lowerH,
          )
        ) {
          roles.dateCol = h;
        }
      }

      // Check ASIN
      if (!roles.asinCol) {
        if (/^(asin|product asin|amazon asin|asin id)$/i.test(lowerH)) {
          roles.asinCol = h;
        }
      }

      // Check SKU
      if (!roles.skuCol) {
        if (/^(sku|product sku|item sku|msku)$/i.test(lowerH)) {
          roles.skuCol = h;
        }
      }

      // Check Units
      if (!roles.unitsCol) {
        if (/^(units|quantity|qty|invoice units|items)$/i.test(lowerH)) {
          roles.unitsCol = h;
        }
      }

      // Check Case ID
      if (!roles.caseIdCol) {
        if (/^(case id|case number|ticket id|ticket number)$/i.test(lowerH)) {
          roles.caseIdCol = h;
        }
      }
    });

    // Content-based heuristic fallbacks if not matched strictly by header name
    if (!roles.asinCol) {
      headers.forEach((h) => {
        let asinMatches = 0;
        for (let i = 0; i < sampleSize; i++) {
          const val = (rows[i][h] || "").trim();
          if (/^B0[A-Z0-9]{8}$/i.test(val)) asinMatches++;
        }
        if (asinMatches > Math.ceil(sampleSize * 0.4)) roles.asinCol = h;
      });
    }

    if (!roles.dateCol) {
      headers.forEach((h) => {
        let dateMatches = 0;
        for (let i = 0; i < sampleSize; i++) {
          const val = (rows[i][h] || "").trim();
          if (
            val &&
            (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(val) ||
              !isNaN(Date.parse(val)))
          ) {
            dateMatches++;
          }
        }
        if (dateMatches > Math.ceil(sampleSize * 0.5)) roles.dateCol = h;
      });
    }

    if (!roles.caseLogCol) {
      headers.forEach((h) => {
        let matches = 0;
        for (let i = 0; i < sampleSize; i++) {
          const val = (rows[i][h] || "").toLowerCase().trim();
          if (/review|rejected|ungate|invoice/i.test(val)) matches++;
        }
        if (matches >= Math.ceil(sampleSize * 0.4)) roles.caseLogCol = h;
      });
    }

    if (!roles.caseStatusCol) {
      headers.forEach((h) => {
        if (h === roles.caseLogCol) return;
        let matches = 0;
        for (let i = 0; i < sampleSize; i++) {
          const val = (rows[i][h] || "").toLowerCase().trim();
          if (/case|re-?apply|under review/i.test(val)) matches++;
        }
        if (matches >= Math.ceil(sampleSize * 0.3)) roles.caseStatusCol = h;
      });
    }

    if (!roles.accountStatusCol) {
      headers.forEach((h) => {
        if (h === roles.caseLogCol || h === roles.caseStatusCol) return;
        let matches = 0;
        for (let i = 0; i < sampleSize; i++) {
          const val = (rows[i][h] || "").toLowerCase().trim();
          if (/gated|ungate|copylist/i.test(val)) matches++;
        }
        if (matches >= Math.ceil(sampleSize * 0.4)) roles.accountStatusCol = h;
      });
    }

    // Default primary status column: prefer Case Log if available (Review, Rejected, Ungate), else Account Status or generic status
    if (!roles.statusCol) {
      roles.statusCol =
        roles.caseLogCol ||
        roles.accountStatusCol ||
        headers.find((h) => /status/i.test(h)) ||
        null;
    }

    // Fallback: Company, Category, Supplier, Brand
    if (!roles.companyCol) {
      roles.companyCol =
        headers.find((h) => /comp|acc|store|hub/i.test(h)) || null;
    }
    if (!roles.categoryCol) {
      roles.categoryCol = headers.find((h) => /cat|dept/i.test(h)) || null;
    }
    if (!roles.supplierCol) {
      roles.supplierCol =
        headers.find((h) => /suppl|distrib|vend/i.test(h)) || null;
    }
    if (!roles.brandCol) {
      roles.brandCol = headers.find((h) => /brand|prod/i.test(h)) || null;
    }

    if (!roles.softwareCol) {
      headers.forEach((h) => {
        let hasMatch = false;
        for (let i = 0; i < rows.length; i++) {
          const val = (rows[i][h] || "").toLowerCase().trim();
          if (/^(orbit[\s_-]?[nba]|aura|shipment)$/i.test(val) || /orbit|aura|shipment/i.test(val)) {
            hasMatch = true;
            break;
          }
        }
        if (hasMatch) roles.softwareCol = h;
      });
      if (!roles.softwareCol) {
        roles.softwareCol = headers.find((h) => /softw|tool/i.test(h)) || null;
      }
    }

    return roles;
  }

  /**
   * Helper to normalize Software names
   */
  function normalizeSoftwareName(str) {
    if (!str) return "";
    const lower = str.toLowerCase().replace(/[\s_]+/g, "-").trim();
    if (/orbit-?n/i.test(lower)) return "Orbit-N";
    if (/orbit-?b/i.test(lower)) return "Orbit-B";
    if (/orbit-?a/i.test(lower)) return "Orbit-A";
    if (/aura/i.test(lower)) return "Aura";
    if (/shipment/i.test(lower)) return "Shipment";
    return str.trim();
  }

  /**
   * Standardize the status values in row objects for uniform dashboard aggregation
   */
  function normalizeRowStatuses(rows, detectedColumns) {
    const statusKey = detectedColumns.statusCol;
    const accStatusKey = detectedColumns.accountStatusCol;
    const caseLogKey = detectedColumns.caseLogCol;
    const caseStatusKey = detectedColumns.caseStatusCol;
    const softwareKey = detectedColumns.softwareCol;
    const dateKey = detectedColumns.dateCol;

    rows.forEach((r) => {
      let rawStatus = statusKey ? (r[statusKey] || "").toString().trim() : "";
      let rawAcc = accStatusKey
        ? (r[accStatusKey] || "").toString().trim()
        : "";
      let rawLog = caseLogKey ? (r[caseLogKey] || "").toString().trim() : "";
      let rawCase = caseStatusKey
        ? (r[caseStatusKey] || "").toString().trim()
        : "";
      let rawSoftware = softwareKey
        ? (r[softwareKey] || "").toString().trim()
        : "";

      // Fallback: If rawSoftware is blank, scan all non-internal columns of this row
      if (!rawSoftware) {
        for (const k of Object.keys(r)) {
          if (k.startsWith('_')) continue;
          const val = (r[k] || '').toString().trim();
          if (/^(orbit[\s_-]?[nba]|aura|shipment)$/i.test(val)) {
            rawSoftware = val;
            if (!detectedColumns.softwareCol) {
              detectedColumns.softwareCol = k;
            }
            break;
          }
        }
      }

      // Canonical helper
      function canonicalize(str) {
        if (!str) return "";
        const lower = str.toLowerCase().trim();
        if (STATUS_CANONICAL_MAP[lower]) return STATUS_CANONICAL_MAP[lower];
        if (/approved/i.test(lower)) return "Approved";
        if (/auto.*ungate/i.test(lower)) return "Auto Ungate";
        if (/^ungate[d]?$/i.test(lower)) return "Ungate";
        if (/gated/i.test(lower)) return "Gated";
        if (/reject|declined/i.test(lower)) return "Rejected";
        if (/under\s*review/i.test(lower)) return "Under Review";
        if (/review/i.test(lower)) return "Review";
        if (/copy.*list|copylist/i.test(lower)) return "Copy Listed";
        if (/invoice.*sub/i.test(lower)) return "Invoice Submitted";
        if (/invoice.*pend/i.test(lower)) return "Invoice Pending";
        if (/0\s*case\s*re.?open/i.test(lower)) return "0 Case Re-open";
        if (/re.*open.*5|reopen.*5/i.test(lower)) return "Case Re-open 5";
        if (/re.*open.*4|reopen.*4/i.test(lower)) return "Case Re-open 4";
        if (/re.*open.*3|reopen.*3/i.test(lower)) return "Case Re-open 3";
        if (/re.*open.*2|reopen.*2/i.test(lower)) return "Case Re-open 2";
        if (/re.*open.*1|reopen/i.test(lower)) return "Case Re-open 1";
        if (/case.*open/i.test(lower)) return "Case Open";
        if (/re.*apply/i.test(lower)) return "Re-Apply";
        return str.charAt(0).toUpperCase() + str.slice(1);
      }

      const accCan = canonicalize(rawAcc);
      const logCan = canonicalize(rawLog);
      const caseCan = canonicalize(rawCase);
      const statCan = canonicalize(rawStatus);

      const rawDate = dateKey ? (r[dateKey] || "").toString().trim() : "";
      r._normalizedDate = normalizeDateStr(rawDate);
      r._canonicalAccountStatus = accCan;
      r._canonicalCaseLog = logCan;
      r._canonicalCaseStatus = caseCan;
      r._software = normalizeSoftwareName(rawSoftware);
      // Primary status: prefer Case Log outcome (Review, Rejected, Ungate), then status, then Account Status
      r._canonicalStatus = logCan || statCan || accCan || "Unknown";
    });
  }

  /**
   * Generates rich, realistic sample Amazon Gating/Ungating data
   * Uses real company/brand/supplier/category data from extra.tst
   */
  function generateSampleData() {
    const companies = MASTER_DATA.companies;
    const categories = MASTER_DATA.categories;
    const suppliers = MASTER_DATA.suppliers;
    const brands = MASTER_DATA.brands;
    const caseReopens = MASTER_DATA.caseReopens;

    const rows = [];
    const count = 220; // 220 rows covering all 33 real companies & 73 suppliers

    const now = new Date("2026-10-30");

    for (let i = 1; i <= count; i++) {
      // Rotate so every company and supplier is represented
      const company = companies[(i - 1) % companies.length];
      const supplier = suppliers[(i * 3) % suppliers.length];
      const brand = brands[(i * 5) % brands.length];
      const category = categories[(i * 7) % categories.length];

      // Account Status (from extra.tst: Gated / Ungate / Copylist + workflow statuses)
      let accountStatus;
      const randS = Math.random();
      if (randS < 0.32) accountStatus = "Ungate";
      else if (randS < 0.52) accountStatus = "Auto Ungate";
      else if (randS < 0.65) accountStatus = "Approved";
      else if (randS < 0.8) accountStatus = "Gated";
      else accountStatus = "Copylist";

      // Case Log (from extra.tst: Review / Invoice Submission / Ungate / Rejected)
      let caseLog;
      if (
        accountStatus === "Ungate" ||
        accountStatus === "Auto Ungate" ||
        accountStatus === "Approved"
      ) {
        caseLog = Math.random() < 0.65 ? "Ungate" : "Approved";
      } else if (accountStatus === "Gated") {
        const r2 = Math.random();
        if (r2 < 0.38) caseLog = "Rejected";
        else if (r2 < 0.72) caseLog = "Review";
        else caseLog = "Invoice Submission";
      } else {
        caseLog = "Invoice Submission";
      }

      // Case Re-open (from extra.tst: 0–5 reopens / Under review / Case Open / Re-apply / Rejected)
      let caseReopen = "0 case re-open";
      if (
        caseLog === "Review" ||
        caseLog === "Invoice Submission" ||
        accountStatus === "Gated"
      ) {
        const r3 = Math.random();
        if (r3 < 0.22) caseReopen = "Case Open";
        else if (r3 < 0.38) caseReopen = "Case re-open 1";
        else if (r3 < 0.52) caseReopen = "Case re-open 2";
        else if (r3 < 0.62) caseReopen = "Case re-open 3";
        else if (r3 < 0.69) caseReopen = "Case re-open 4";
        else if (r3 < 0.74) caseReopen = "Case re-open 5";
        else if (r3 < 0.82) caseReopen = "Under review";
        else if (r3 < 0.9) caseReopen = "Re-apply";
        else caseReopen = "0 case re-open";
      }

      // ASIN generation
      const asinHex = Math.random()
        .toString(36)
        .substring(2, 10)
        .toUpperCase()
        .padEnd(8, "7");
      const asin = `B0${asinHex}`;
      const safeBrand =
        brand
          .replace(/[^A-Za-z]/g, "")
          .slice(0, 3)
          .toUpperCase() || "BRD";
      const safeCat =
        category
          .replace(/[^A-Za-z]/g, "")
          .slice(0, 3)
          .toUpperCase() || "CAT";
      const sku = `${safeBrand}-${safeCat}-${1000 + i}`;

      // Date within past 90 days
      const pastDays = Math.floor(Math.random() * 90);
      const d = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split("T")[0];

      const caseId = `223${Math.floor(10000000 + Math.random() * 90000000)}`;
      const units = [50, 100, 200, 50, 100][i % 5];

      // Software assignment (Orbit-N, Orbit-B, Orbit-A, Aura, Shipment, or Unassigned)
      let softwareVal = "";
      const softMod = i % 8;
      if (softMod === 0 || softMod === 1) softwareVal = "Orbit-N";
      else if (softMod === 2 || softMod === 3) softwareVal = "Orbit-B";
      else if (softMod === 4) softwareVal = "Orbit-A";
      else if (softMod === 5) softwareVal = "Aura";
      else if (softMod === 6) softwareVal = "Shipment";
      else softwareVal = "";

      const moreLessVal = i % 3 === 0 ? "More" : (i % 3 === 1 ? "Less" : "");

      rows.push({
        ASINS: asin,
        Date: dateStr,
        "Company Name": company,
        "Brand Name": brand,
        Quantity: units,
        "Account Status": accountStatus,
        Category: category,
        "Popular Supplier Name": supplier,
        "Case Log": caseLog,
        "Case ID": caseId,
        "Case re-open": caseReopen,
        "More/Less": moreLessVal,
        Software: softwareVal,
      });
    }

    // Convert to TSV string as if copied from Excel
    const headers = Object.keys(rows[0]);
    const lines = [headers.join("\t")];
    rows.forEach((r) => {
      lines.push(headers.map((h) => r[h]).join("\t"));
    });

    return lines.join("\r\n");
  }

  return {
    parseText,
    inferColumnRoles,
    normalizeRowStatuses,
    normalizeDateStr,
    normalizeSoftwareName,
    generateSampleData,
    STATUS_CANONICAL_MAP,
  };
})();

if (typeof window !== "undefined") {
  window.DataParser = DataParser;
}
