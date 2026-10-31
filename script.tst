/**
 * ==============================================================================================
 * AMAZON UNGATING TRACKER — Google Apps Script (Code.gs)
 * ==============================================================================================
 * Description:
 *   Full automation for 2 data-entry sheets (Brenttons, Efix & Eden) + 4 report sheets.
 *   - Smart column detection, dropdown management, conditional formatting.
 *   - Report Dashboard, Company Matrix, Supplier Breakdown, Category Breakdown.
 *   - Date filter (From / To) on Row 3 of all 4 report sheets with calendar picker.
 *   - Automatic Status Time (Col N) & Case Activity Time (Col O) timestamps via onEdit.
 *   - Shift tracking: 5:00 PM – 1:00 AM = one shift. 12:00 AM – 1:00 AM rolls to previous day.
 *   - Columns tracked: ASINS, Date, Company Name, Brand Name, Quantity, Account Status,
 *     Category, Popular Supplier Name, Case Log, Case ID, Case re-open, More/Less.
 *   - Brand Name, 835 Record, End Work, Health Status, Reliability Rating & Section 5 removed.
 * ==============================================================================================
 */

// ==============================================================================================
// 1. SYSTEM CONFIGURATION
// ==============================================================================================

const SYSTEM_CONFIG = {
  SHEETS: {
    DATA_ENTRY: ['Brenttons', 'Efix & Eden'],
    DASHBOARD: 'Report Dashboard',             // Top KPI Summary + Lifecycle Breakdown ONLY
    COMPANY_MATRIX: 'Company Matrix',          // 🏢 Separate Sheet for Company Matrix
    SUPPLIER_BREAKDOWN: 'Supplier Breakdown',  // 📦 Separate Sheet for Popular Suppliers
    CATEGORY_BREAKDOWN: 'Category Breakdown',  // 🏷️ Separate Sheet for Categories
    MASTER: 'Master Lists'                     // Master reference data for dropdowns
  },

  // Default column mappings (smart header detection overrides these dynamically if header names match)
  DEFAULT_COLS: {
    ASIN: 1,           // Col A: ASINS
    DATE: 2,           // Col B: Date
    COMPANY: 3,        // Col C: Company Name
    QUANTITY: 4,       // Col D: Quantity
    ACCOUNT_STATUS: 5, // Col E: Account Status (Gated, Ungate, Copylist)
    CATEGORY: 6,       // Col F: Category
    SUPPLIER: 7,       // Col G: Popular Supplier Name
    CASE_LOG: 8,       // Col H: Case Log (Review, Invoice Submission, Ungate, Rejected)
    CASE_ID: 9,        // Col I: Case ID
    CASE_REOPEN: 10,   // Col J: Case re-open (0 case re-open, Case Open, Case re-open 1-5, etc.)
    MORE_LESS: 11,     // Col K: More Than a Week / Less Than 7 Days (More / Less)
    STATUS_TIME: 14,   // Col N: Status Time (Updated on New ASIN / Account Status / Case Log change)
    CASE_TIME: 15      // Col O: Case Activity Time (Updated on Case re-open change)
  },

  THEME: {
    NAVY_DARK: '#1B365D',
    NAVY_MID: '#2A52BE',
    BLUE_ACCENT: '#0D47A1',
    WHITE: '#FFFFFF',
    LIGHT_BG: '#F4F7FB',
    SECTION_HEADER_BG: '#E9EEF4',
    TABLE_HEADER_BG: '#E2E8F0',
    BORDER: '#D0D7DE',

    // EXACT HIGH-CONTRAST SOLID COLORS (MATCHING SCREENSHOT):
    GATED: { bg: '#B30101', text: '#FFFFFF' },        // Col F Gated: Deep Dark Red
    UNGATED: { bg: '#10754B', text: '#FFFFFF' },      // Ungate: Forest Green
    COPYLIST: { bg: '#F57F17', text: '#FFFFFF' },     // Copylist: Amber / Gold

    // Case Log (Col I)
    REVIEW: { bg: '#986AD6', text: '#FFFFFF' },       // Col I Review: Vibrant Purple
    SUBMISSION: { bg: '#0288D1', text: '#FFFFFF' },   // Submission: Sky / Royal Blue
    REJECTED: { bg: '#FF0000', text: '#FFFFFF' },     // Rejected: Bright Red

    // Case re-open (Col K)
    ZERO_REOPEN: { bg: '#000000', text: '#FFFFFF' },  // 0 case re-open: Solid Black
    CASE_OPEN: { bg: '#10754B', text: '#FFFFFF' },    // Case Open: Forest Green
    REOPEN_1: { bg: '#1058AA', text: '#FFFFFF' },     // Case re-open 1: Royal Blue
    REOPEN_2: { bg: '#F97B14', text: '#FFFFFF' },     // Case re-open 2: Bright Orange
    REOPEN_3: { bg: '#0799A8', text: '#FFFFFF' },     // Case re-open 3: Teal / Cyan
    REOPEN_4: { bg: '#9575CD', text: '#FFFFFF' },     // Case re-open 4: Lavender / Purple
    REOPEN_5: { bg: '#795548', text: '#FFFFFF' },     // Case re-open 5: Chocolate Brown
    UNDER_REVIEW: { bg: '#643B59', text: '#FFFFFF' }, // Under review: Dark Burgundy / Plum
    RE_APPLY: { bg: '#FF0000', text: '#FFFFFF' }      // Re-apply: Bright Red
  }
};

// ==============================================================================================
// 2. MASTER REFERENCE DATA (Matching extra.tst)
// ==============================================================================================

const INITIAL_MASTER_DATA = {
  COMPANIES: [
    'Ravav',
    'Prime Nova Store LLC',
    '9teen Trades Inc',
    'Cornercart Inc',
    'OceanPath LLC',
    'Polar Horizon Store Inc',
    'IT Services LLC',
    'Trade Fussion Inc',
    'BoldBuy Hub Inc',
    'IR Tech',
    'PrimeShops',
    'Kdot Store',
    'EBlitz Enterprises Inc',
    'Good Choice USA',
    'Good Choice AUS',
    'Urban Bazaar Pty Ltd',
    'OaksMax Inc',
    'Amer Canada Inc',
    'BUBH Trading Corp',
    'Bzable Corporation Inc',
    'VALUE VAULT INC.',
    'Meccos Corporation Inc.',
    'High Standard Goods',
    'Amari International Inc.',
    'House of Trade',
    'ClickToTheCart Global Inc.',
    'Verox Store LLC',
    'IrhaAndAmmar LLC',
    'Datamatics Technologies Ltd.',
    'Dernier Km Depose',
    'HB Innovate Inc.',
    'GoodHome USA Inc',
    'Ecomsphere LLC'
  ],

  POPULAR_SUPPLIERS: [
    'Adndale',
    'Aloha',
    'American Flagpole and Flag Co.',
    'Barnett',
    'BIG LU',
    'Bioma',
    'BOLD BUNS',
    'BreathableBaby',
    'CamelCamelCamel',
    'Carhartt Company Gear',
    'chewy',
    'COLOR WOW',
    'Cord Brick',
    'DEBROX',
    'Dental Brands',
    'Dermatool',
    'Eco Strong',
    'Explore Scientific',
    'Eyez on',
    'Fishpond',
    'Florastor',
    'GOSUPPS.COM',
    'Guardian tech',
    'GUN STORAGE SOLUTIONS',
    'Hatch',
    'HSN',
    'HUNT',
    'iHealth Labs Inc',
    'Improvia INCONTINENCE SOLUTIONS',
    'Intake',
    'IQBAR',
    'Johnson Woolen Mills',
    'Joy Spring',
    'KERANIQUE',
    'KERATIN SALON DIRECT',
    "l'ange",
    'Latinafy',
    'LAZY ACRES',
    "Macy's",
    'Mighty Paw',
    'Mila MiAmor',
    'Naoki',
    'Naturonel',
    'Naveh Pharma',
    'OMNI BIOTIC',
    'ONE STOP EQUINE SHOP',
    'PBS animal health',
    'Plexaderm Skin care',
    'PLUSH DELUXE',
    'PURE protein',
    'Refresh Lubricant Eye Drops',
    'RoC CLINICALLY PROVEN',
    'Roku',
    'RUSSO',
    'SIMPLEHUMAN',
    'SNAP',
    'snow peak',
    'Target',
    'TEND SKIN',
    'TESSAN',
    'TheraPet',
    'Tractor Supply Co.',
    'TRP Relief Products',
    'UberLube',
    'Ultima Replenisher',
    'UltraGlass',
    'Verb',
    'VIBRIANCE',
    'Vinnies',
    'WellSpring',
    'WILDE',
    'Wilson',
    'Z roborock'
  ],

  ACCOUNT_STATUS: [
    'Gated',
    'Ungate',
    'Copylist'
  ],

  CASE_LOG: [
    'Review',
    'Invoice Submission',
    'Ungate',
    'Rejected'
  ],

  CASE_REOPEN: [
    'Case re-open 1',
    'Case re-open 2',
    'Case re-open 3',
    'Case re-open 4',
    'Case re-open 5',
    'Under review',
    '0 case re-open',
    'Case Open',
    'Re-apply',
    'Rejected'
  ],

  PRODUCT_CATEGORIES: [
    'Amazon Devices & Accessories',
    'Amazon Renewed',
    'Appliances',
    'Apps & Games',
    'Arts, Crafts & Sewing',
    'Audible Books & Originals',
    'Automotive',
    'Baby',
    'Beauty & Personal Care',
    'Books',
    'Camera & Photo Products',
    'CDs & Vinyl',
    'Cell Phones & Accessories',
    'Clothing, Shoes & Jewelry',
    'Collectible Coins',
    'Computers & Accessories',
    'Digital Educational Resources',
    'Digital Music',
    'Electronics',
    'Entertainment Collectibles',
    'Gift Cards',
    'Grocery & Gourmet Food',
    'Handmade Products',
    'Health & Household',
    'Home & Kitchen',
    'Industrial & Scientific',
    'Kindle Store',
    'Kitchen & Dining',
    'Movies & TV',
    'Musical Instruments',
    'Office Products',
    'Patio, Lawn & Garden',
    'Pet Supplies',
    'Software',
    'Sports & Outdoors',
    'Sports Collectibles',
    'Tools & Home Improvement',
    'Toys & Games',
    'Unique Finds',
    'Video Games',
    'Grocery & Gourmet Foods',
    'Small Appliance Parts & Accessories',
    'baby products',
    'Safety & Security',
    'Power tools parts and accesories',
    'Medical Supplies & Equipment',
    'Lighting Assemblies & Accessories',
    'Power & Hand Tools'
  ],

  MORE_LESS: [
    'More Than a Week',
    'Less Than 7 Days'
  ]
};

// ==============================================================================================
// 3. SPREADSHEET MENU (onOpen)
// ==============================================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚀 Ungating Tools')
    .addItem('📊 Refresh All Reports', 'refreshAllReports')
    .addItem('🗂️ Setup / Fix All Sheets', 'setupAllSheets')
    .addSeparator()
    .addItem('📋 Sync Master Dropdown Lists', 'syncMasterLists')
    .addItem('🎨 Apply Conditional Formatting', 'applyConditionalFormattingAll')
    .addSeparator()
    .addItem('🏷️ Setup Status Time & Case Time Headers (Col N & O)', 'setupTimestampHeaders')
    .addItem('📅 Sync Dashboard Date Filter (B3/D3) to All Reports', 'syncDashboardDatesToAllReports')
    .addSeparator()
    .addItem('⚡ Install Auto-Sync onEdit Trigger', 'installTriggers')
    .addItem('🗑️ Remove All Triggers', 'removeTriggers')
    .addToUi();
}

/**
 * Setup / Fix All Sheets — initializes master lists, dropdowns, formatting, and date filter rows.
 */
function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initMasterListsSheet();
  refreshAllDropdowns();
  applyConditionalFormattingToEntrySheets();
  refreshAllReports();
  ss.toast('All sheets setup complete! Dropdowns, formatting and reports refreshed.', '✅ Setup Done', 5);
}

/**
 * Sync Master Dropdown Lists — scans entry sheets and updates master lists + dropdowns.
 */
function syncMasterLists() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  cleanMasterListsSheet();
  scanAndAutoUpdateMasterLists();
  ss.toast('Master Lists synced and dropdowns updated!', '✅ Lists Synced', 4);
}

/**
 * Apply Conditional Formatting to all entry sheets.
 */
function applyConditionalFormattingAll() {
  applyConditionalFormattingToEntrySheets();
  SpreadsheetApp.getActiveSpreadsheet().toast('Conditional formatting applied to all entry sheets!', '✅ Formatting Applied', 4);
}

/**
 * Remove all installable triggers (alias for uninstallTriggers).
 */
function removeTriggers() {
  uninstallTriggers();
}

// ==============================================================================================
// 4. UTILITY HELPERS
// ==============================================================================================

/**
 * Normalize text: trim, collapse whitespace, clean special chars.
 */
function normalizeText(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().replace(/\s+/g, ' ');
}

/**
 * Normalize to lowercase key for matching.
 */
function normalizeKey(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Deduplicate list preserving case of first occurrence.
 */
function deduplicatePreserveCase(list) {
  const seen = {};
  return list.filter(function(item) {
    const k = item.toLowerCase();
    if (seen[k]) return false;
    seen[k] = true;
    return true;
  });
}

/**
 * Flexible & Robust Date Parser:
 * Correctly parses Date objects, DD/MM/YYYY, DD-MM-YYYY, MM-DD-YYYY, and YYYY-MM-DD.
 * Handles timestamps with times attached (e.g. "10/31/2026 05:32 PM" or "28-09-2026 18:30").
 */
function parseDateFlexible(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val;
  }
  const str = String(val).trim();
  if (!str) return null;

  // Extract date portion if time is attached
  const dateMatch = str.match(/^(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})/);
  if (dateMatch) {
    const p1 = parseInt(dateMatch[1], 10);
    const p2 = parseInt(dateMatch[2], 10);
    const p3 = parseInt(dateMatch[3], 10);

    // Case 1: YYYY-MM-DD
    if (p1 > 1000) {
      const dt = new Date(p1, p2 - 1, p3);
      if (!isNaN(dt.getTime())) return dt;
    }

    // Case 2: Year is p3 (e.g. DD-MM-YYYY or MM-DD-YYYY)
    let y = p3;
    if (y < 100) y += 2000;

    // If p1 > 12, p1 MUST be day: DD-MM-YYYY (e.g. 28-09-2026)
    if (p1 > 12) {
      const dt = new Date(y, p2 - 1, p1);
      if (!isNaN(dt.getTime())) return dt;
    }
    // If p2 > 12, p2 MUST be day: MM-DD-YYYY (e.g. 10-26-2026)
    if (p2 > 12) {
      const dt = new Date(y, p1 - 1, p2);
      if (!isNaN(dt.getTime())) return dt;
    }
    // Ambiguous (both <= 12, e.g. 10-01-2026): Default to DD-MM-YYYY for UK/Amazon sheet formats
    const dt = new Date(y, p2 - 1, p1);
    if (!isNaN(dt.getTime())) return dt;
  }

  const ts = Date.parse(str);
  if (!isNaN(ts)) return new Date(ts);
  return null;
}

/**
 * Timezone-invariant day integer: YYYYMMDD
 */
function getDayNumber(dateObj) {
  if (!dateObj) return null;
  return dateObj.getFullYear() * 10000 + (dateObj.getMonth() + 1) * 100 + dateObj.getDate();
}

/**
 * Checks whether recordDate falls between fromDate and toDate (inclusive).
 */
function isDateInRange(recordDate, fromDate, toDate) {
  if (!fromDate && !toDate) return true;
  if (!recordDate) return true;

  const rDate = parseDateFlexible(recordDate);
  if (!rDate) return true;
  const rDay = getDayNumber(rDate);

  if (fromDate) {
    const fDate = (fromDate instanceof Date) ? fromDate : parseDateFlexible(fromDate);
    if (fDate && rDay < getDayNumber(fDate)) return false;
  }

  if (toDate) {
    const tDate = (toDate instanceof Date) ? toDate : parseDateFlexible(toDate);
    if (tDate && rDay > getDayNumber(tDate)) return false;
  }

  return true;
}

/**
 * Fuzzy Canonical Matcher
 */
function findCanonicalMatch(rawName, masterList) {
  if (!rawName) return '';
  const clean = normalizeText(rawName);
  const cleanKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!cleanKey) return '';

  const cleanLower = clean.toLowerCase();
  for (let i = 0; i < masterList.length; i++) {
    if (masterList[i].toLowerCase() === cleanLower) return masterList[i];
  }

  for (let i = 0; i < masterList.length; i++) {
    const m = masterList[i];
    const mKey = m.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (mKey === cleanKey) return m;
  }

  if (cleanKey.length >= 4) {
    let bestMatch = null;
    let minDiff = Infinity;
    for (let i = 0; i < masterList.length; i++) {
      const m = masterList[i];
      const mKey = m.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (mKey.startsWith(cleanKey) || (mKey.length >= 4 && cleanKey.startsWith(mKey))) {
        const diff = Math.abs(mKey.length - cleanKey.length);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = m;
        }
      }
    }
    if (bestMatch) return bestMatch;
  }

  if (cleanKey.length >= 5) {
    let bestMatch = null;
    let minDiff = Infinity;
    for (let i = 0; i < masterList.length; i++) {
      const m = masterList[i];
      const mKey = m.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (mKey.includes(cleanKey) || (mKey.length >= 5 && cleanKey.includes(mKey))) {
        const diff = Math.abs(mKey.length - cleanKey.length);
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = m;
        }
      }
    }
    if (bestMatch) return bestMatch;
  }

  return clean;
}

function getMasterList(typeKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.MASTER);
  if (!sheet) return INITIAL_MASTER_DATA[typeKey] || [];

  let colIdx = 1;
  if (typeKey === 'COMPANIES') colIdx = 1;
  else if (typeKey === 'POPULAR_SUPPLIERS') colIdx = 2;
  else if (typeKey === 'ACCOUNT_STATUS') colIdx = 3;
  else if (typeKey === 'CASE_LOG') colIdx = 4;
  else if (typeKey === 'CASE_REOPEN') colIdx = 5;
  else if (typeKey === 'PRODUCT_CATEGORIES') colIdx = 6;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return INITIAL_MASTER_DATA[typeKey] || [];

  const raw = sheet.getRange(2, colIdx, lastRow - 1, 1).getValues();
  const list = raw.map(r => normalizeText(r[0])).filter(Boolean);
  return deduplicatePreserveCase(list.concat(INITIAL_MASTER_DATA[typeKey] || []));
}

/**
 * Detect column positions dynamically from header row 1 if possible.
 * (Brand Name is intentionally ignored).
 */
function detectColumnMapping(sheet) {
  const mapping = Object.assign({}, SYSTEM_CONFIG.DEFAULT_COLS);
  if (sheet.getLastRow() < 1) return mapping;

  const numCols = Math.min(sheet.getLastColumn(), 25);
  if (numCols < 1) return mapping;

  const headers = sheet.getRange(1, 1, 1, numCols).getValues()[0];

  for (let c = 0; c < headers.length; c++) {
    const h = normalizeKey(headers[c]);
    const colNum = c + 1;

    if (h.includes('brand')) continue; // Ignore Brand column

    if (h.includes('asin')) mapping.ASIN = colNum;
    else if (h.includes('date')) mapping.DATE = colNum;
    else if (h.includes('company')) mapping.COMPANY = colNum;
    else if (h.includes('qty') || h.includes('quantity')) mapping.QUANTITY = colNum;
    else if (h.includes('account status') || (h.includes('account') && !h.includes('name'))) mapping.ACCOUNT_STATUS = colNum;
    else if (h.includes('category')) mapping.CATEGORY = colNum;
    else if (h.includes('supplier')) mapping.SUPPLIER = colNum;
    else if (h.includes('case log') || (h.includes('log') && !h.includes('id'))) mapping.CASE_LOG = colNum;
    else if (h.includes('case id')) mapping.CASE_ID = colNum;
    else if (h.includes('reopen') || h.includes('re-open')) mapping.CASE_REOPEN = colNum;
    else if (h.includes('more') || h.includes('less') || h.includes('week') || h.includes('duration')) mapping.MORE_LESS = colNum;
    else if (h.includes('status time') || (h.includes('status') && h.includes('time'))) mapping.STATUS_TIME = colNum;
    else if (h.includes('case activity time') || (h.includes('case') && h.includes('time')) || (h.includes('reopen') && h.includes('time'))) mapping.CASE_TIME = colNum;
  }

  if (!mapping.STATUS_TIME) mapping.STATUS_TIME = 14;
  if (!mapping.CASE_TIME) mapping.CASE_TIME = 15;

  return mapping;
}

/**
 * Extracts all invoice entries from 'Brenttons' & 'Efix & Eden'.
 */
function extractAllSourceData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allRecords = [];

  const masterComps = getMasterList('COMPANIES');
  const masterSups = getMasterList('POPULAR_SUPPLIERS');
  const masterCats = getMasterList('PRODUCT_CATEGORIES');
  const masterAcc = getMasterList('ACCOUNT_STATUS');
  const masterCaseLogs = getMasterList('CASE_LOG');
  const masterCaseReopens = getMasterList('CASE_REOPEN');

  SYSTEM_CONFIG.SHEETS.DATA_ENTRY.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const cols = detectColumnMapping(sheet);
    const maxColNeeded = Math.max(
      cols.ASIN, cols.DATE, cols.COMPANY, cols.QUANTITY,
      cols.ACCOUNT_STATUS, cols.CATEGORY, cols.SUPPLIER, cols.CASE_LOG,
      cols.CASE_ID, cols.CASE_REOPEN, cols.MORE_LESS
    );

    const actualCols = Math.min(sheet.getLastColumn(), maxColNeeded);
    const rawData = sheet.getRange(2, 1, lastRow - 1, actualCols).getValues();

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];

      const getVal = (colNum) => (colNum <= row.length ? row[colNum - 1] : '');

      const asin = normalizeText(getVal(cols.ASIN));
      const dateVal = getVal(cols.DATE);
      const rawCompany = normalizeText(getVal(cols.COMPANY));
      const qty = Number(getVal(cols.QUANTITY)) || 0;
      const rawAccountStatus = normalizeText(getVal(cols.ACCOUNT_STATUS));
      const rawCategory = normalizeText(getVal(cols.CATEGORY));
      const rawSupplier = normalizeText(getVal(cols.SUPPLIER));
      const rawCaseLog = normalizeText(getVal(cols.CASE_LOG));
      const caseId = normalizeText(getVal(cols.CASE_ID));
      const rawCaseReopen = normalizeText(getVal(cols.CASE_REOPEN));
      const rawMoreLess = normalizeText(getVal(cols.MORE_LESS));

      // Skip blank rows
      if (!rawCompany && !rawSupplier && !rawAccountStatus && !rawCaseLog && !asin) {
        continue;
      }

      const company = findCanonicalMatch(rawCompany, masterComps);
      const supplier = findCanonicalMatch(rawSupplier, masterSups);
      const category = findCanonicalMatch(rawCategory, masterCats);
      const accountStatus = findCanonicalMatch(rawAccountStatus, masterAcc);
      const caseLog = findCanonicalMatch(rawCaseLog, masterCaseLogs);
      const caseReopen = findCanonicalMatch(rawCaseReopen, masterCaseReopens);

      let moreLess = rawMoreLess;
      const mlLower = rawMoreLess.toLowerCase();
      if (mlLower.includes('more') || mlLower.includes('week')) moreLess = 'More Than a Week';
      else if (mlLower.includes('less') || mlLower.includes('7') || mlLower.includes('day')) moreLess = 'Less Than 7 Days';

      const roKey = normalizeKey(caseReopen);
      const isUng = (
        normalizeKey(caseLog) === 'ungate' ||
        normalizeKey(accountStatus) === 'ungate' ||
        normalizeKey(caseLog) === 'ungated' ||
        normalizeKey(accountStatus) === 'ungated' ||
        roKey === '0 case re-open' ||
        roKey === '0 case reopen' ||
        roKey === '0'
      );

      allRecords.push({
        sourceSheet: sheetName,
        rowNumber: i + 2,
        asin: asin,
        date: dateVal,
        company: company,
        quantity: qty,
        accountStatus: accountStatus,
        category: category,
        supplier: supplier,
        caseLog: caseLog,
        caseId: caseId,
        caseReopen: caseReopen,
        moreLess: moreLess,
        ungated: isUng
      });
    }
  });

  return allRecords;
}

// ==============================================================================================
// 5. DASHBOARD & MULTI-SHEET REPORTING ENGINE (NON-DESTRUCTIVE & SEPARATE SHEETS)
// ==============================================================================================

/**
 * Universal Refresh:
 * Reads live data from Brenttons & Efix & Eden and refreshes all 4 report sheets:
 * 1. 'Report Dashboard' (KPI Cards & Review Lifecycle ONLY)
 * 2. 'Company Matrix' (🏢 COMPANY-WISE PERFORMANCE MATRIX - Separate Sheet)
 * 3. 'Supplier Breakdown' (📦 POPULAR SUPPLIER BREAKDOWN - Separate Sheet)
 * 4. 'Category Breakdown' (🏷️ PRODUCT CATEGORY BREAKDOWN - Separate Sheet)
 */
function refreshAllReports() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast('Reading live data and updating all 4 report sheets...', 'Syncing', 4);

  const allRecords = extractAllSourceData();

  // 1. Refresh 'Report Dashboard'
  refreshDashboardSheet(ss, allRecords);

  // 2. Refresh 'Company Matrix' (Separate Sheet)
  refreshCompanyMatrixSheet(ss, allRecords);

  // 3. Refresh 'Supplier Breakdown' (Separate Sheet)
  refreshSupplierBreakdownSheet(ss, allRecords);

  // 4. Refresh 'Category Breakdown' (Separate Sheet)
  refreshCategoryBreakdownSheet(ss, allRecords);

  ss.toast(`All 4 sheets updated successfully! (${allRecords.length} invoices analyzed)`, 'Complete', 4);
}

// ----------------------------------------------------------------------------------------------
// 5.1 SHEET 1: 'Report Dashboard' (KPI Cards & Lifecycle Breakdown ONLY)
// ----------------------------------------------------------------------------------------------

/**
 * Ensures Row 3 Date Filter Controls (📅 From Date / 📅 To Date) exist,
 * are properly formatted with dd/MM/yyyy, have calendar picker validation, and clean borders.
 */
function ensureDateFilterRow(sheet) {
  sheet.getRange(3, 1).setValue('📅 From Date:')
       .setFontWeight('bold')
       .setFontColor(SYSTEM_CONFIG.THEME.NAVY_DARK)
       .setHorizontalAlignment('right');

  const b3 = sheet.getRange(3, 2);
  b3.setNumberFormat('@')
    .setHorizontalAlignment('center')
    .setBackground('#FFFFFF');

  sheet.getRange(3, 3).setValue('📅 To Date:')
       .setFontWeight('bold')
       .setFontColor(SYSTEM_CONFIG.THEME.NAVY_DARK)
       .setHorizontalAlignment('right');

  const d3 = sheet.getRange(3, 4);
  d3.setNumberFormat('@')
    .setHorizontalAlignment('center')
    .setBackground('#FFFFFF');

  try {
    b3.setBorder(true, true, true, true, null, null, '#2A52BE', SpreadsheetApp.BorderStyle.SOLID);
    d3.setBorder(true, true, true, true, null, null, '#2A52BE', SpreadsheetApp.BorderStyle.SOLID);
    // Clear any restrictive date validation to avoid 'Please select a valid date' error.
    // Users can type dates freely in dd/MM/yyyy format.
    try { b3.clearDataValidations(); } catch(e2) {}
    try { d3.clearDataValidations(); } catch(e2) {}
  } catch (e) {}

  sheet.getRange(3, 5).setValue('(Leave blank for all records — Double-click B3/D3 for calendar picker)')
       .setFontStyle('italic')
       .setFontColor('#777777')
       .setHorizontalAlignment('left');

  sheet.setRowHeight(3, 28);
}

function refreshDashboardSheet(ss, allRecords) {
  let sheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.DASHBOARD);
  if (!sheet) sheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.DASHBOARD, 0);

  ensureDashboardLayout(sheet);
  ensureDateFilterRow(sheet);

  // Read B3 and D3
  const rawFrom = sheet.getRange(3, 2).getDisplayValue();
  const rawTo = sheet.getRange(3, 4).getDisplayValue();
  const fromDate = parseDateFlexible(rawFrom);
  const toDate = parseDateFlexible(rawTo);

  const filteredRecords = allRecords.filter(r => isDateInRange(r.date, fromDate, toDate));
  updateDashboardValuesOnly(sheet, filteredRecords, allRecords.length, fromDate, toDate);
}

function ensureDashboardLayout(sheet, forceReset = false) {
  const isUninitialized = sheet.getLastRow() < 8 || sheet.getLastColumn() < 5;
  if (!isUninitialized && !forceReset) {
    // If old sections (like old Company table or Section 5) exist below row 22, clean them out
    if (sheet.getLastRow() > 22) {
      sheet.getRange(23, 1, sheet.getLastRow() - 22, sheet.getMaxColumns()).clear();
    }
    return;
  }

  if (forceReset) sheet.clear();

  const NEEDED_ROWS = 35;
  if (sheet.getMaxRows() < NEEDED_ROWS) sheet.insertRowsAfter(sheet.getMaxRows(), NEEDED_ROWS - sheet.getMaxRows());
  const NEEDED_COLS = 6;
  if (sheet.getMaxColumns() < NEEDED_COLS) sheet.insertColumnsAfter(sheet.getMaxColumns(), NEEDED_COLS - sheet.getMaxColumns());

  // Row 1: Header Banner
  sheet.getRange(1, 1, 1, 5).merge()
       .setValue('🚀 AMAZON UNGATING & INVOICE SUBMISSION — EXECUTIVE REPORT DASHBOARD')
       .setBackground(SYSTEM_CONFIG.THEME.NAVY_DARK)
       .setFontColor(SYSTEM_CONFIG.THEME.WHITE)
       .setFontWeight('bold')
       .setFontSize(13)
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);

  // Row 2: Sub-banner
  sheet.getRange(2, 1, 1, 5).merge()
       .setValue('Live Consolidated Sync from Brenttons & Efix & Eden')
       .setFontStyle('italic')
       .setFontColor('#555555')
       .setHorizontalAlignment('center');
  sheet.setRowHeight(2, 22);

  // Row 3: DATE FILTER CONTROLS
  sheet.getRange(3, 1).setValue('📅 From Date:').setFontWeight('bold').setFontColor(SYSTEM_CONFIG.THEME.NAVY_DARK).setHorizontalAlignment('right');
  sheet.getRange(3, 2).setNumberFormat('@').setHorizontalAlignment('center').setBackground('#FFFFFF');
  sheet.getRange(3, 3).setValue('📅 To Date:').setFontWeight('bold').setFontColor(SYSTEM_CONFIG.THEME.NAVY_DARK).setHorizontalAlignment('right');
  sheet.getRange(3, 4).setNumberFormat('@').setHorizontalAlignment('center').setBackground('#FFFFFF');
  sheet.getRange(3, 5).setValue('(Leave blank for all records — Edit B3 or D3 to filter live)').setFontStyle('italic').setFontColor('#777777').setHorizontalAlignment('left');
  sheet.setRowHeight(3, 26);

  // Rows 4 to 6: Top KPI Cards
  const kpiHeaders = ['TOTAL UNGATED', 'TOTAL INVOICES', 'OVERALL SUCCESS RATE', 'ACTIVE IN REVIEW', 'TOTAL REJECTED'];
  sheet.getRange(4, 1, 1, 5).setValues([kpiHeaders])
       .setBackground(SYSTEM_CONFIG.THEME.NAVY_MID)
       .setFontColor(SYSTEM_CONFIG.THEME.WHITE)
       .setFontWeight('bold')
       .setHorizontalAlignment('center');
  sheet.setRowHeight(4, 25);

  sheet.getRange(5, 1, 1, 5).setFontSize(16).setFontWeight('bold').setHorizontalAlignment('center').setBackground(SYSTEM_CONFIG.THEME.LIGHT_BG);
  sheet.getRange(5, 1).setFontColor(SYSTEM_CONFIG.THEME.UNGATED.bg);
  sheet.getRange(5, 3).setFormula('=IFERROR(A5/B5, 0)').setNumberFormat('0.0%').setFontColor(SYSTEM_CONFIG.THEME.BLUE_ACCENT);
  sheet.getRange(5, 4).setFontColor(SYSTEM_CONFIG.THEME.REVIEW.bg);
  sheet.getRange(5, 5).setFontColor(SYSTEM_CONFIG.THEME.REJECTED.bg);
  sheet.setRowHeight(5, 35);

  const kpiFooters = ['Approved & Active', 'Consolidated entries', 'Ungated / Total Invoices', 'Active in Amazon Review', 'Needs Re-application'];
  sheet.getRange(6, 1, 1, 5).setValues([kpiFooters])
       .setFontSize(9).setFontStyle('italic').setFontColor('#666666').setHorizontalAlignment('center').setBackground(SYSTEM_CONFIG.THEME.LIGHT_BG);
  sheet.setRowHeight(6, 20);

  // Row 8: Section 1 Header
  sheet.getRange(8, 1, 1, 5).merge()
       .setValue('📑 1. CASE STATUS & REVIEW DURATION LIFECYCLE')
       .setBackground(SYSTEM_CONFIG.THEME.NAVY_DARK)
       .setFontColor(SYSTEM_CONFIG.THEME.WHITE)
       .setFontWeight('bold');
  sheet.setRowHeight(8, 28);

  const statusHeaders = ['Case Metric / Lifecycle Stage', 'Count', '% of Submissions', 'Category', 'Notes'];
  sheet.getRange(9, 1, 1, 5).setValues([statusHeaders])
       .setBackground(SYSTEM_CONFIG.THEME.TABLE_HEADER_BG)
       .setFontWeight('bold');
  sheet.setRowHeight(9, 24);

  const lifecycleLabels = [
    ['Ungatted (Approved)', 0, '=IFERROR(B10/$B$5, 0)', 'Approved', 'Total approved & ungated cases'],
    ['After Submission (0 case re-open)', 0, '=IFERROR(B11/$B$5, 0)', 'Direct Ungate', 'Ungated directly on submission without case open'],
    ['1st Try (case open)', 0, '=IFERROR(B12/$B$5, 0)', 'Attempt 1', 'Cases opened on 1st attempt'],
    ['2nd Try (Case re-open 1)', 0, '=IFERROR(B13/$B$5, 0)', 'Attempt 2', 'Re-opened once'],
    ['3rd Try (Case re-open 2)', 0, '=IFERROR(B14/$B$5, 0)', 'Attempt 3', 'Re-opened twice'],
    ['4th Try (Case re-open 3)', 0, '=IFERROR(B15/$B$5, 0)', 'Attempt 4', 'Re-opened 3 times'],
    ['5th Try (Case re-open 4)', 0, '=IFERROR(B16/$B$5, 0)', 'Attempt 5', 'Re-opened 4 times'],
    ['6th Try (Case re-open 5)', 0, '=IFERROR(B17/$B$5, 0)', 'Attempt 6', 'Re-opened 5 times'],
    ['Total Review (Under Review)', 0, '=IFERROR(B18/$B$5, 0)', 'Review', 'Active in review by Amazon'],
    ['  └─ More Than a Week (> 7 Days)', 0, '=IFERROR(B19/$B$18, 0)', 'Review: More', 'Pending review > 7 days (Col K = More)'],
    ['  └─ Less Than 7 Days (<= 7 Days)', 0, '=IFERROR(B20/$B$18, 0)', 'Review: Less', 'Pending review <= 7 days (Col K = Less)'],
    ['Rejected', 0, '=IFERROR(B21/$B$5, 0)', 'Rejected', 'Cases rejected by Amazon'],
    ['Not an option of reopen (Re-apply)', 0, '=IFERROR(B22/$B$5, 0)', 'Re-apply', 'Reapplication needed or closed']
  ];

  sheet.getRange(10, 1, lifecycleLabels.length, 5).setValues(lifecycleLabels);
  sheet.getRange(10, 2, lifecycleLabels.length, 1).setNumberFormat('#,##0').setHorizontalAlignment('right');
  sheet.getRange(10, 3, lifecycleLabels.length, 1).setNumberFormat('0.0%').setHorizontalAlignment('right');

  // Styling Section 1 rows
  sheet.getRange(10, 1, 1, 5).setBackground('#E8F5E9');
  sheet.getRange(10, 1, 1, 2).setFontColor(SYSTEM_CONFIG.THEME.UNGATED.bg).setFontWeight('bold');

  sheet.getRange(11, 1, 1, 5).setBackground('#E8F5E9');
  sheet.getRange(11, 1, 1, 2).setFontColor(SYSTEM_CONFIG.THEME.UNGATED.bg).setFontWeight('bold');

  sheet.getRange(18, 1, 1, 5).setBackground('#F3E5F5');
  sheet.getRange(18, 1, 1, 2).setFontColor(SYSTEM_CONFIG.THEME.REVIEW.bg).setFontWeight('bold');

  sheet.getRange(21, 1, 1, 5).setBackground('#FFEBEE');
  sheet.getRange(21, 1, 1, 2).setFontColor(SYSTEM_CONFIG.THEME.REJECTED.bg).setFontWeight('bold');

  sheet.getRange(22, 1, 1, 5).setBackground('#FFEBEE');
  sheet.getRange(22, 1, 1, 2).setFontColor(SYSTEM_CONFIG.THEME.RE_APPLY.bg).setFontWeight('bold');

  sheet.setColumnWidth(1, 260); // Names
  sheet.setColumnWidth(2, 120); // Counts
  sheet.setColumnWidth(3, 130); // % of Submissions
  sheet.setColumnWidth(4, 140); // Category
  sheet.setColumnWidth(5, 260); // Notes
}

function updateDashboardValuesOnly(sheet, records, totalSourceCount, fromDate, toDate) {
  // Update Sub-header in Row 2
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy hh:mm a');
  let filterLabel = 'All Dates';
  if (fromDate || toDate) {
    const f = fromDate ? (fromDate instanceof Date && !isNaN(fromDate.getTime()) ? Utilities.formatDate(fromDate, Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy') : '') : 'Start';
    const t = toDate ? (toDate instanceof Date && !isNaN(toDate.getTime()) ? Utilities.formatDate(toDate, Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy') : '') : 'End';
    filterLabel = `${f} to ${t}`;
  }
  sheet.getRange(2, 1).setValue(`Live Sync from Brenttons & Efix & Eden  |  Filter: ${filterLabel}  |  Last Synced: ${nowStr}  |  Invoices Analyzed: ${records.length} of ${totalSourceCount}`);

  let totalUngated = 0;
  let totalInvoices = records.length;
  let totalReview = 0;
  let moreThanWeek = 0;
  let lessThan7Days = 0;
  let afterSubmission = 0;
  let try1CaseOpen = 0;
  let try2 = 0;
  let try3 = 0;
  let try4 = 0;
  let try5 = 0;
  let try6 = 0;
  let totalRejected = 0;
  let notOptionReopen = 0;

  records.forEach(r => {
    const isUng = r.ungated;
    const logK = normalizeKey(r.caseLog);
    const reopenK = normalizeKey(r.caseReopen);
    const mlK = normalizeKey(r.moreLess);

    if (isUng) totalUngated++;

    const isZero = (reopenK === '0 case re-open' || reopenK === '0 case reopen' || reopenK === '0');
    const isOpen = (reopenK === 'case open' || reopenK === 'open');

    if (isZero) {
      afterSubmission++;
    } else if (isOpen) {
      try1CaseOpen++;
    } else if (reopenK === 'case re-open 1' || reopenK === 'case reopen 1') {
      try2++;
    } else if (reopenK === 'case re-open 2' || reopenK === 'case reopen 2') {
      try3++;
    } else if (reopenK === 'case re-open 3' || reopenK === 'case reopen 3') {
      try4++;
    } else if (reopenK === 'case re-open 4' || reopenK === 'case reopen 4') {
      try5++;
    } else if (reopenK === 'case re-open 5' || reopenK === 'case reopen 5') {
      try6++;
    }

    if (logK === 'review' || logK === 'under review') {
      totalReview++;
      if (mlK === 'more' || mlK.includes('more') || mlK.includes('week')) {
        moreThanWeek++;
      } else if (mlK === 'less' || mlK.includes('less') || mlK.includes('7')) {
        lessThan7Days++;
      }
    }

    if (logK === 'rejected' || reopenK === 'rejected') totalRejected++;
    if (reopenK === 're-apply' || reopenK.includes('not an option')) notOptionReopen++;
  });

  // KPI Card Values
  sheet.getRange(5, 1).setValue(totalUngated);
  sheet.getRange(5, 2).setValue(totalInvoices);
  if (!String(sheet.getRange(5, 3).getFormula()).includes('A5/B5')) {
    sheet.getRange(5, 3).setFormula('=IFERROR(A5/B5, 0)');
  }
  sheet.getRange(5, 4).setValue(totalReview);
  sheet.getRange(5, 5).setValue(totalRejected);

  // Footers
  sheet.getRange(6, 4).setValue(`More: ${moreThanWeek} | Less: ${lessThan7Days}`);

  // Section 1: Lifecycle Table Counts
  const lifecycleCounts = [
    [totalUngated],
    [afterSubmission],
    [try1CaseOpen],
    [try2],
    [try3],
    [try4],
    [try5],
    [try6],
    [totalReview],
    [moreThanWeek],
    [lessThan7Days],
    [totalRejected],
    [notOptionReopen]
  ];
  sheet.getRange(10, 2, lifecycleCounts.length, 1).setValues(lifecycleCounts);

  // Clear any leftover rows below row 22 so Dashboard is clean
  if (sheet.getLastRow() > 22) {
    sheet.getRange(23, 1, sheet.getLastRow() - 22, sheet.getMaxColumns()).clear();
  }
}

// ----------------------------------------------------------------------------------------------
// 5.2 SHEET 2: 'Company Matrix' (🏢 COMPANY-WISE DETAILED PERFORMANCE MATRIX)
// ----------------------------------------------------------------------------------------------

function refreshCompanyMatrixSheet(ss, allRecords) {
  let sheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.COMPANY_MATRIX);
  if (!sheet) sheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.COMPANY_MATRIX);

  ensureCompanyMatrixLayout(sheet);
  ensureDateFilterRow(sheet);

  const rawFrom = sheet.getRange(3, 2).getDisplayValue();
  const rawTo = sheet.getRange(3, 4).getDisplayValue();
  const fromDate = parseDateFlexible(rawFrom);
  const toDate = parseDateFlexible(rawTo);

  const filteredRecords = allRecords.filter(r => isDateInRange(r.date, fromDate, toDate));
  updateCompanyMatrixValues(sheet, filteredRecords, allRecords.length, fromDate, toDate);
}

function ensureCompanyMatrixLayout(sheet) {
  if (sheet.getLastRow() >= 5 && sheet.getLastColumn() >= 11) return;

  const NEEDED_ROWS = 60;
  if (sheet.getMaxRows() < NEEDED_ROWS) sheet.insertRowsAfter(sheet.getMaxRows(), NEEDED_ROWS - sheet.getMaxRows());
  if (sheet.getMaxColumns() < 12) sheet.insertColumnsAfter(sheet.getMaxColumns(), 12 - sheet.getMaxColumns());

  // Row 1: Banner
  sheet.getRange(1, 1, 1, 11).merge()
       .setValue('🏢 COMPANY-WISE DETAILED PERFORMANCE & METRICS MATRIX')
       .setBackground(SYSTEM_CONFIG.THEME.NAVY_DARK)
       .setFontColor(SYSTEM_CONFIG.THEME.WHITE)
       .setFontWeight('bold')
       .setFontSize(13)
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);

  // Row 2: Sub-banner
  sheet.getRange(2, 1, 1, 11).merge()
       .setValue('Live Consolidated Company Metrics from Brenttons & Efix & Eden')
       .setFontStyle('italic').setFontColor('#555555').setHorizontalAlignment('center');
  sheet.setRowHeight(2, 22);

  // Row 3: Date Filter
  sheet.getRange(3, 1).setValue('📅 From Date:').setFontWeight('bold').setFontColor(SYSTEM_CONFIG.THEME.NAVY_DARK).setHorizontalAlignment('right');
  sheet.getRange(3, 2).setNumberFormat('@').setHorizontalAlignment('center').setBackground('#FFFFFF');
  sheet.getRange(3, 3).setValue('📅 To Date:').setFontWeight('bold').setFontColor(SYSTEM_CONFIG.THEME.NAVY_DARK).setHorizontalAlignment('right');
  sheet.getRange(3, 4).setNumberFormat('@').setHorizontalAlignment('center').setBackground('#FFFFFF');
  sheet.getRange(3, 5, 1, 3).merge().setValue('(Leave blank for all records — Edit B3 or D3 to filter)').setFontStyle('italic').setFontColor('#777777');
  sheet.setRowHeight(3, 26);

  // Row 5: Headers (11 columns - No Health Status)
  const compHeaders = [
    'Company Name', 'Total Items', 'Gated', 'Copylist', 'Invoices Submitted',
    'In Review', 'Successfully Ungated', 'Rejected', '% Ungated (of Submissions)',
    'Under Review', 'Re-apply Cases'
  ];
  sheet.getRange(5, 1, 1, compHeaders.length).setValues([compHeaders])
       .setBackground(SYSTEM_CONFIG.THEME.TABLE_HEADER_BG).setFontWeight('bold').setHorizontalAlignment('center');
  
  sheet.getRange(5, 3).setBackground(SYSTEM_CONFIG.THEME.GATED.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.getRange(5, 4).setBackground(SYSTEM_CONFIG.THEME.COPYLIST.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.getRange(5, 6).setBackground(SYSTEM_CONFIG.THEME.REVIEW.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.getRange(5, 7).setBackground(SYSTEM_CONFIG.THEME.UNGATED.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.getRange(5, 8).setBackground(SYSTEM_CONFIG.THEME.REJECTED.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.setRowHeight(5, 26);

  // Proper Column Widths & Alignments
  sheet.setColumnWidth(1, 220); // Company Name
  sheet.setColumnWidth(2, 110); // Total Items
  sheet.setColumnWidth(3, 95);  // Gated
  sheet.setColumnWidth(4, 95);  // Copylist
  sheet.setColumnWidth(5, 135); // Invoices Submitted
  sheet.setColumnWidth(6, 100); // In Review
  sheet.setColumnWidth(7, 145); // Successfully Ungated
  sheet.setColumnWidth(8, 95);  // Rejected
  sheet.setColumnWidth(9, 170); // % Ungated
  sheet.setColumnWidth(10, 115);// Under Review
  sheet.setColumnWidth(11, 120);// Re-apply Cases
}

function updateCompanyMatrixValues(sheet, records, totalSourceCount, fromDate, toDate) {
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy hh:mm a');
  let filterLabel = 'All Dates';
  if (fromDate || toDate) {
    const f = fromDate ? (fromDate instanceof Date && !isNaN(fromDate.getTime()) ? Utilities.formatDate(fromDate, Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy') : '') : 'Start';
    const t = toDate ? (toDate instanceof Date && !isNaN(toDate.getTime()) ? Utilities.formatDate(toDate, Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy') : '') : 'End';
    filterLabel = `${f} to ${t}`;
  }
  sheet.getRange(2, 1).setValue(`Live Sync from Brenttons & Efix & Eden  |  Filter: ${filterLabel}  |  Last Synced: ${nowStr}  |  Invoices Analyzed: ${records.length} of ${totalSourceCount}`);

  const compStats = {};
  const masterComps = getMasterList('COMPANIES');
  masterComps.forEach(c => {
    compStats[c.toLowerCase()] = {
      name: c, total: 0, gated: 0, copylist: 0, submitted: 0,
      inReview: 0, ungated: 0, rejected: 0, underReview: 0, reapply: 0
    };
  });

  records.forEach(r => {
    if (!r.company) return;
    const ck = r.company.toLowerCase();
    if (!compStats[ck]) {
      compStats[ck] = {
        name: r.company, total: 0, gated: 0, copylist: 0, submitted: 0,
        inReview: 0, ungated: 0, rejected: 0, underReview: 0, reapply: 0
      };
    }
    const cs = compStats[ck];
    cs.total++;

    const accK = normalizeKey(r.accountStatus);
    const logK = normalizeKey(r.caseLog);
    const reopenK = normalizeKey(r.caseReopen);

    if (accK === 'gated') cs.gated++;
    else if (accK === 'copylist') cs.copylist++;

    if (logK === 'invoice submission' || logK === 'submission' || r.caseId) cs.submitted++;
    if (logK === 'review' || logK === 'under review') cs.inReview++;
    if (r.ungated) cs.ungated++;
    if (logK === 'rejected' || reopenK === 'rejected') cs.rejected++;
    if (reopenK === 'under review' || logK === 'under review') cs.underReview++;
    if (reopenK === 're-apply' || reopenK.includes('not an option')) cs.reapply++;
  });

  const compTable = [];
  const startRow = 6;
  const compHeadersCount = 11;
  const allCompKeys = deduplicatePreserveCase(masterComps.concat(Object.keys(compStats).map(k => compStats[k].name)));

  allCompKeys.forEach((compName, idx) => {
    const s = compStats[compName.toLowerCase()] || {
      name: compName, total: 0, gated: 0, copylist: 0, submitted: 0,
      inReview: 0, ungated: 0, rejected: 0, underReview: 0, reapply: 0
    };
    const rowNum = startRow + idx;
    compTable.push([
      s.name,
      s.total || 0,
      s.gated || 0,
      s.copylist || 0,
      s.submitted || 0,
      s.inReview || 0,
      s.ungated || 0,
      s.rejected || 0,
      `=IFERROR(G${rowNum}/E${rowNum}, 0)`, // Live Formula for % Ungated
      s.underReview || 0,
      s.reapply || 0
    ]);
  });

  if (compTable.length > 0) {
    sheet.getRange(startRow, 1, compTable.length, compHeadersCount).setValues(compTable);
    sheet.getRange(startRow, 1, compTable.length, 1).setHorizontalAlignment('left');
    sheet.getRange(startRow, 2, compTable.length, compHeadersCount - 1).setHorizontalAlignment('right');

    // Number formats & colors
    sheet.getRange(startRow, 9, compTable.length, 1).setNumberFormat('0.0%').setFontWeight('bold').setFontColor(SYSTEM_CONFIG.THEME.BLUE_ACCENT);
    sheet.getRange(startRow, 3, compTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.GATED.bg).setFontWeight('bold');
    sheet.getRange(startRow, 4, compTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.COPYLIST.bg).setFontWeight('bold');
    sheet.getRange(startRow, 6, compTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.REVIEW.bg).setFontWeight('bold');
    sheet.getRange(startRow, 7, compTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.UNGATED.bg).setFontWeight('bold');
    sheet.getRange(startRow, 8, compTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.REJECTED.bg).setFontWeight('bold');
    sheet.getRange(startRow, 10, compTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.UNDER_REVIEW.bg).setFontWeight('bold');
    sheet.getRange(startRow, 11, compTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.RE_APPLY.bg).setFontWeight('bold');

    const endRow = startRow + compTable.length - 1;
    const totRow = endRow + 1;

    const totalRow = [
      'TOTAL / CONSOLIDATED',
      `=SUM(B${startRow}:B${endRow})`,
      `=SUM(C${startRow}:C${endRow})`,
      `=SUM(D${startRow}:D${endRow})`,
      `=SUM(E${startRow}:E${endRow})`,
      `=SUM(F${startRow}:F${endRow})`,
      `=SUM(G${startRow}:G${endRow})`,
      `=SUM(H${startRow}:H${endRow})`,
      `=IFERROR(G${totRow}/E${totRow}, 0)`,
      `=SUM(J${startRow}:J${endRow})`,
      `=SUM(K${startRow}:K${endRow})`
    ];
    sheet.getRange(totRow, 1, 1, compHeadersCount).setValues([totalRow])
         .setFontWeight('bold')
         .setBackground(SYSTEM_CONFIG.THEME.SECTION_HEADER_BG);
    sheet.getRange(totRow, 1).setHorizontalAlignment('left');
    sheet.getRange(totRow, 2, 1, compHeadersCount - 1).setHorizontalAlignment('right');
    sheet.getRange(totRow, 9).setNumberFormat('0.0%').setFontColor(SYSTEM_CONFIG.THEME.BLUE_ACCENT);
    sheet.setRowHeight(totRow, 25);

    // Clean any old leftover rows below total row
    if (sheet.getLastRow() > totRow) {
      sheet.getRange(totRow + 1, 1, sheet.getLastRow() - totRow, sheet.getMaxColumns()).clear();
    }
  }
}

// ----------------------------------------------------------------------------------------------
// 5.3 SHEET 3: 'Supplier Breakdown' (📦 POPULAR SUPPLIER UNGATTING BREAKDOWN)
// ----------------------------------------------------------------------------------------------

function refreshSupplierBreakdownSheet(ss, allRecords) {
  let sheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.SUPPLIER_BREAKDOWN);
  if (!sheet) sheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.SUPPLIER_BREAKDOWN);

  ensureSupplierBreakdownLayout(sheet);
  ensureDateFilterRow(sheet);

  const rawFrom = sheet.getRange(3, 2).getDisplayValue();
  const rawTo = sheet.getRange(3, 4).getDisplayValue();
  const fromDate = parseDateFlexible(rawFrom);
  const toDate = parseDateFlexible(rawTo);

  const filteredRecords = allRecords.filter(r => isDateInRange(r.date, fromDate, toDate));
  updateSupplierBreakdownValues(sheet, filteredRecords, allRecords.length, fromDate, toDate);
}

function ensureSupplierBreakdownLayout(sheet) {
  if (sheet.getLastRow() >= 5 && sheet.getLastColumn() >= 6) return;

  const NEEDED_ROWS = 90;
  if (sheet.getMaxRows() < NEEDED_ROWS) sheet.insertRowsAfter(sheet.getMaxRows(), NEEDED_ROWS - sheet.getMaxRows());
  if (sheet.getMaxColumns() < 7) sheet.insertColumnsAfter(sheet.getMaxColumns(), 7 - sheet.getMaxColumns());

  // Row 1: Banner
  sheet.getRange(1, 1, 1, 6).merge()
       .setValue('📦 POPULAR SUPPLIER UNGATTING BREAKDOWN (ALL 73 SUPPLIERS)')
       .setBackground(SYSTEM_CONFIG.THEME.NAVY_DARK)
       .setFontColor(SYSTEM_CONFIG.THEME.WHITE)
       .setFontWeight('bold')
       .setFontSize(13)
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);

  // Row 2: Sub-banner
  sheet.getRange(2, 1, 1, 6).merge()
       .setValue('Live Consolidated Popular Supplier Metrics from Brenttons & Efix & Eden')
       .setFontStyle('italic').setFontColor('#555555').setHorizontalAlignment('center');
  sheet.setRowHeight(2, 22);

  // Row 3: Date Filter
  sheet.getRange(3, 1).setValue('📅 From Date:').setFontWeight('bold').setFontColor(SYSTEM_CONFIG.THEME.NAVY_DARK).setHorizontalAlignment('right');
  sheet.getRange(3, 2).setNumberFormat('@').setHorizontalAlignment('center').setBackground('#FFFFFF');
  sheet.getRange(3, 3).setValue('📅 To Date:').setFontWeight('bold').setFontColor(SYSTEM_CONFIG.THEME.NAVY_DARK).setHorizontalAlignment('right');
  sheet.getRange(3, 4).setNumberFormat('@').setHorizontalAlignment('center').setBackground('#FFFFFF');
  sheet.getRange(3, 5, 1, 2).merge().setValue('(Leave blank for all records — Edit B3 or D3 to filter)').setFontStyle('italic').setFontColor('#777777');
  sheet.setRowHeight(3, 26);

  // Row 5: Headers (6 columns - No Reliability Rating)
  const supHeaders = ['Popular Supplier Name', 'Total Invoices', 'Ungated Count', 'In Review', 'Rejected', 'Ungating Success %'];
  sheet.getRange(5, 1, 1, supHeaders.length).setValues([supHeaders])
       .setBackground(SYSTEM_CONFIG.THEME.TABLE_HEADER_BG).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(5, 3).setBackground(SYSTEM_CONFIG.THEME.UNGATED.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.getRange(5, 4).setBackground(SYSTEM_CONFIG.THEME.REVIEW.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.getRange(5, 5).setBackground(SYSTEM_CONFIG.THEME.REJECTED.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.setRowHeight(5, 26);

  // Proper Column Widths & Alignments
  sheet.setColumnWidth(1, 270); // Supplier Name
  sheet.setColumnWidth(2, 120); // Total Invoices
  sheet.setColumnWidth(3, 130); // Ungated Count
  sheet.setColumnWidth(4, 120); // In Review
  sheet.setColumnWidth(5, 110); // Rejected
  sheet.setColumnWidth(6, 160); // Ungating Success %
}

function updateSupplierBreakdownValues(sheet, records, totalSourceCount, fromDate, toDate) {
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy hh:mm a');
  let filterLabel = 'All Dates';
  if (fromDate || toDate) {
    const f = fromDate ? (fromDate instanceof Date && !isNaN(fromDate.getTime()) ? Utilities.formatDate(fromDate, Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy') : '') : 'Start';
    const t = toDate ? (toDate instanceof Date && !isNaN(toDate.getTime()) ? Utilities.formatDate(toDate, Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy') : '') : 'End';
    filterLabel = `${f} to ${t}`;
  }
  sheet.getRange(2, 1).setValue(`Live Sync from Brenttons & Efix & Eden  |  Filter: ${filterLabel}  |  Last Synced: ${nowStr}  |  Invoices Analyzed: ${records.length} of ${totalSourceCount}`);

  const supStats = {};
  const masterSups = getMasterList('POPULAR_SUPPLIERS');
  masterSups.forEach(s => {
    supStats[s.toLowerCase()] = { name: s, total: 0, ungated: 0, review: 0, rejected: 0 };
  });

  records.forEach(r => {
    if (!r.supplier) return;
    const sk = r.supplier.toLowerCase();
    if (!supStats[sk]) supStats[sk] = { name: r.supplier, total: 0, ungated: 0, review: 0, rejected: 0 };
    const ss_item = supStats[sk];
    ss_item.total++;
    if (r.ungated) ss_item.ungated++;
    const logK = normalizeKey(r.caseLog);
    const reopenK = normalizeKey(r.caseReopen);
    if (logK === 'review' || logK === 'under review') ss_item.review++;
    if (logK === 'rejected' || reopenK === 'rejected') ss_item.rejected++;
  });

  const allSupKeys = deduplicatePreserveCase(masterSups.concat(Object.keys(supStats).map(k => supStats[k].name)));
  const supTable = [];
  const startRow = 6;
  const supHeadersCount = 6;

  allSupKeys.forEach((supName, idx) => {
    const s = supStats[supName.toLowerCase()] || { name: supName, total: 0, ungated: 0, review: 0, rejected: 0 };
    const rowNum = startRow + idx;
    supTable.push([
      s.name,
      s.total || 0,
      s.ungated || 0,
      s.review || 0,
      s.rejected || 0,
      `=IFERROR(C${rowNum}/B${rowNum}, 0)` // Live Formula
    ]);
  });

  if (supTable.length > 0) {
    sheet.getRange(startRow, 1, supTable.length, supHeadersCount).setValues(supTable);
    sheet.getRange(startRow, 1, supTable.length, 1).setHorizontalAlignment('left');
    sheet.getRange(startRow, 2, supTable.length, 4).setHorizontalAlignment('right');
    sheet.getRange(startRow, 6, supTable.length, 1).setNumberFormat('0.0%').setHorizontalAlignment('right').setFontColor(SYSTEM_CONFIG.THEME.BLUE_ACCENT).setFontWeight('bold');
    sheet.getRange(startRow, 3, supTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.UNGATED.bg).setFontWeight('bold');
    sheet.getRange(startRow, 4, supTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.REVIEW.bg).setFontWeight('bold');
    sheet.getRange(startRow, 5, supTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.REJECTED.bg).setFontWeight('bold');

    const endRow = startRow + supTable.length - 1;
    const totRow = endRow + 1;

    const totalRow = [
      'TOTAL / CONSOLIDATED',
      `=SUM(B${startRow}:B${endRow})`,
      `=SUM(C${startRow}:C${endRow})`,
      `=SUM(D${startRow}:D${endRow})`,
      `=SUM(E${startRow}:E${endRow})`,
      `=IFERROR(C${totRow}/B${totRow}, 0)`
    ];
    sheet.getRange(totRow, 1, 1, supHeadersCount).setValues([totalRow])
         .setFontWeight('bold')
         .setBackground(SYSTEM_CONFIG.THEME.SECTION_HEADER_BG);
    sheet.getRange(totRow, 1).setHorizontalAlignment('left');
    sheet.getRange(totRow, 2, 1, 4).setHorizontalAlignment('right');
    sheet.getRange(totRow, 6).setNumberFormat('0.0%').setHorizontalAlignment('right').setFontColor(SYSTEM_CONFIG.THEME.BLUE_ACCENT);
    sheet.setRowHeight(totRow, 25);

    // Clean any old leftover rows below total row
    if (sheet.getLastRow() > totRow) {
      sheet.getRange(totRow + 1, 1, sheet.getLastRow() - totRow, sheet.getMaxColumns()).clear();
    }
  }
}

// ----------------------------------------------------------------------------------------------
// 5.4 SHEET 4: 'Category Breakdown' (🏷️ PRODUCT CATEGORY UNGATTING BREAKDOWN)
// ----------------------------------------------------------------------------------------------

function refreshCategoryBreakdownSheet(ss, allRecords) {
  let sheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.CATEGORY_BREAKDOWN);
  if (!sheet) sheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.CATEGORY_BREAKDOWN);

  ensureCategoryBreakdownLayout(sheet);
  ensureDateFilterRow(sheet);

  const rawFrom = sheet.getRange(3, 2).getDisplayValue();
  const rawTo = sheet.getRange(3, 4).getDisplayValue();
  const fromDate = parseDateFlexible(rawFrom);
  const toDate = parseDateFlexible(rawTo);

  const filteredRecords = allRecords.filter(r => isDateInRange(r.date, fromDate, toDate));
  updateCategoryBreakdownValues(sheet, filteredRecords, allRecords.length, fromDate, toDate);
}

function ensureCategoryBreakdownLayout(sheet) {
  if (sheet.getLastRow() >= 5 && sheet.getLastColumn() >= 6) return;

  const NEEDED_ROWS = 65;
  if (sheet.getMaxRows() < NEEDED_ROWS) sheet.insertRowsAfter(sheet.getMaxRows(), NEEDED_ROWS - sheet.getMaxRows());
  if (sheet.getMaxColumns() < 7) sheet.insertColumnsAfter(sheet.getMaxColumns(), 7 - sheet.getMaxColumns());

  // Row 1: Banner
  sheet.getRange(1, 1, 1, 6).merge()
       .setValue('🏷️ PRODUCT CATEGORY UNGATTING BREAKDOWN')
       .setBackground(SYSTEM_CONFIG.THEME.NAVY_DARK)
       .setFontColor(SYSTEM_CONFIG.THEME.WHITE)
       .setFontWeight('bold')
       .setFontSize(13)
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);

  // Row 2: Sub-banner
  sheet.getRange(2, 1, 1, 6).merge()
       .setValue('Live Consolidated Category Metrics from Brenttons & Efix & Eden')
       .setFontStyle('italic').setFontColor('#555555').setHorizontalAlignment('center');
  sheet.setRowHeight(2, 22);

  // Row 3: Date Filter
  sheet.getRange(3, 1).setValue('📅 From Date:').setFontWeight('bold').setFontColor(SYSTEM_CONFIG.THEME.NAVY_DARK).setHorizontalAlignment('right');
  sheet.getRange(3, 2).setNumberFormat('@').setHorizontalAlignment('center').setBackground('#FFFFFF');
  sheet.getRange(3, 3).setValue('📅 To Date:').setFontWeight('bold').setFontColor(SYSTEM_CONFIG.THEME.NAVY_DARK).setHorizontalAlignment('right');
  sheet.getRange(3, 4).setNumberFormat('@').setHorizontalAlignment('center').setBackground('#FFFFFF');
  sheet.getRange(3, 5, 1, 2).merge().setValue('(Leave blank for all records — Edit B3 or D3 to filter)').setFontStyle('italic').setFontColor('#777777');
  sheet.setRowHeight(3, 26);

  // Row 5: Headers (6 columns)
  const catHeaders = ['Product Category', 'Total Invoices', 'Ungated Count', 'In Review', 'Rejected', 'Ungating Success %'];
  sheet.getRange(5, 1, 1, catHeaders.length).setValues([catHeaders])
       .setBackground(SYSTEM_CONFIG.THEME.TABLE_HEADER_BG).setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(5, 3).setBackground(SYSTEM_CONFIG.THEME.UNGATED.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.getRange(5, 4).setBackground(SYSTEM_CONFIG.THEME.REVIEW.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.getRange(5, 5).setBackground(SYSTEM_CONFIG.THEME.REJECTED.bg).setFontColor(SYSTEM_CONFIG.THEME.WHITE);
  sheet.setRowHeight(5, 26);

  // Proper Column Widths & Alignments
  sheet.setColumnWidth(1, 280); // Category Name
  sheet.setColumnWidth(2, 120); // Total Invoices
  sheet.setColumnWidth(3, 130); // Ungated Count
  sheet.setColumnWidth(4, 120); // In Review
  sheet.setColumnWidth(5, 110); // Rejected
  sheet.setColumnWidth(6, 160); // Ungating Success %
}

function updateCategoryBreakdownValues(sheet, records, totalSourceCount, fromDate, toDate) {
  const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy hh:mm a');
  let filterLabel = 'All Dates';
  if (fromDate || toDate) {
    const f = fromDate ? (fromDate instanceof Date && !isNaN(fromDate.getTime()) ? Utilities.formatDate(fromDate, Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy') : '') : 'Start';
    const t = toDate ? (toDate instanceof Date && !isNaN(toDate.getTime()) ? Utilities.formatDate(toDate, Session.getScriptTimeZone() || 'GMT+5', 'dd/MM/yyyy') : '') : 'End';
    filterLabel = `${f} to ${t}`;
  }
  sheet.getRange(2, 1).setValue(`Live Sync from Brenttons & Efix & Eden  |  Filter: ${filterLabel}  |  Last Synced: ${nowStr}  |  Invoices Analyzed: ${records.length} of ${totalSourceCount}`);

  const catStats = {};
  const masterCats = getMasterList('PRODUCT_CATEGORIES');
  masterCats.forEach(c => {
    catStats[c.toLowerCase()] = { name: c, total: 0, ungated: 0, review: 0, rejected: 0 };
  });

  records.forEach(r => {
    if (!r.category) return;
    const catK = r.category.toLowerCase();
    if (!catStats[catK]) catStats[catK] = { name: r.category, total: 0, ungated: 0, review: 0, rejected: 0 };
    const cat_item = catStats[catK];
    cat_item.total++;
    if (r.ungated) cat_item.ungated++;
    const logK = normalizeKey(r.caseLog);
    const reopenK = normalizeKey(r.caseReopen);
    if (logK === 'review' || logK === 'under review') cat_item.review++;
    if (logK === 'rejected' || reopenK === 'rejected') cat_item.rejected++;
  });

  const allCatKeys = deduplicatePreserveCase(masterCats.concat(Object.keys(catStats).map(k => catStats[k].name)));
  const catTable = [];
  const startRow = 6;
  const catHeadersCount = 6;

  allCatKeys.forEach((catName, idx) => {
    const s = catStats[catName.toLowerCase()] || { name: catName, total: 0, ungated: 0, review: 0, rejected: 0 };
    const rowNum = startRow + idx;
    catTable.push([
      s.name,
      s.total || 0,
      s.ungated || 0,
      s.review || 0,
      s.rejected || 0,
      `=IFERROR(C${rowNum}/B${rowNum}, 0)` // Live Formula
    ]);
  });

  if (catTable.length > 0) {
    sheet.getRange(startRow, 1, catTable.length, catHeadersCount).setValues(catTable);
    sheet.getRange(startRow, 1, catTable.length, 1).setHorizontalAlignment('left');
    sheet.getRange(startRow, 2, catTable.length, 4).setHorizontalAlignment('right');
    sheet.getRange(startRow, 6, catTable.length, 1).setNumberFormat('0.0%').setHorizontalAlignment('right').setFontColor(SYSTEM_CONFIG.THEME.BLUE_ACCENT).setFontWeight('bold');
    sheet.getRange(startRow, 3, catTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.UNGATED.bg).setFontWeight('bold');
    sheet.getRange(startRow, 4, catTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.REVIEW.bg).setFontWeight('bold');
    sheet.getRange(startRow, 5, catTable.length, 1).setFontColor(SYSTEM_CONFIG.THEME.REJECTED.bg).setFontWeight('bold');

    const endRow = startRow + catTable.length - 1;
    const totRow = endRow + 1;

    const totalRow = [
      'TOTAL / CONSOLIDATED',
      `=SUM(B${startRow}:B${endRow})`,
      `=SUM(C${startRow}:C${endRow})`,
      `=SUM(D${startRow}:D${endRow})`,
      `=SUM(E${startRow}:E${endRow})`,
      `=IFERROR(C${totRow}/B${totRow}, 0)`
    ];
    sheet.getRange(totRow, 1, 1, catHeadersCount).setValues([totalRow])
         .setFontWeight('bold')
         .setBackground(SYSTEM_CONFIG.THEME.SECTION_HEADER_BG);
    sheet.getRange(totRow, 1).setHorizontalAlignment('left');
    sheet.getRange(totRow, 2, 1, 4).setHorizontalAlignment('right');
    sheet.getRange(totRow, 6).setNumberFormat('0.0%').setHorizontalAlignment('right').setFontColor(SYSTEM_CONFIG.THEME.BLUE_ACCENT);
    sheet.setRowHeight(totRow, 25);

    // Clean any old leftover rows below total row
    if (sheet.getLastRow() > totRow) {
      sheet.getRange(totRow + 1, 1, sheet.getLastRow() - totRow, sheet.getMaxColumns()).clear();
    }
  }
}

// ==============================================================================================
// 6. CONDITIONAL FORMATTING & EXACT STATUS COLORS FOR DATA ENTRY SHEETS
// ==============================================================================================

/**
 * Applies exact conditional formatting rules matching the user's screenshot:
 * 
 * Account Status:
 * - Gated -> Solid Deep Red (#B30101) with White bold text
 * - Ungate -> Solid Forest Green (#10754B) with White bold text
 * - Copylist -> Solid Amber / Gold (#F57F17) with White bold text
 * 
 * Case Log:
 * - Review -> Solid Vibrant Purple (#986AD6) with White bold text
 * - Ungate -> Solid Forest Green (#10754B) with White bold text
 * - Invoice Submission -> Solid Sky Blue (#0288D1) with White bold text
 * - Rejected -> Solid Bright Red (#FF0000) with White bold text
 * 
 * Case re-open:
 * - 0 case re-open -> Solid Black (#000000) with White bold text
 * - Case Open -> Solid Forest Green (#10754B) with White bold text
 * - Case re-open 1 -> Solid Royal Blue (#1058AA) with White bold text
 * - Case re-open 2 -> Solid Bright Orange (#F97B14) with White bold text
 * - Case re-open 3 -> Solid Teal / Cyan (#0799A8) with White bold text
 * - Case re-open 4 -> Solid Lavender / Purple (#9575CD) with White bold text
 * - Case re-open 5 -> Solid Chocolate Brown (#795548) with White bold text
 * - Under review -> Solid Dark Burgundy / Plum (#643B59) with White bold text
 * - Re-apply -> Solid Bright Red (#FF0000) with White bold text
 * - Rejected -> Solid Bright Red (#FF0000) with White bold text
 */
function applyConditionalFormattingToEntrySheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  SYSTEM_CONFIG.SHEETS.DATA_ENTRY.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const cols = detectColumnMapping(sheet);
    const maxRows = Math.max(sheet.getMaxRows(), 3000);
    const numRows = maxRows - 1;

    const newRules = [];

    const createRule = (colIdx, matchText, bgColor, fontColor = '#FFFFFF', isBold = true) => {
      if (!colIdx || colIdx > sheet.getMaxColumns()) return null;
      const targetRange = sheet.getRange(2, colIdx, numRows, 1);
      return SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(matchText)
        .setBackground(bgColor)
        .setFontColor(fontColor)
        .setBold(isBold)
        .setRanges([targetRange])
        .build();
    };

    // 1. Account Status Column Colors
    if (cols.ACCOUNT_STATUS) {
      newRules.push(createRule(cols.ACCOUNT_STATUS, 'Gated', SYSTEM_CONFIG.THEME.GATED.bg, SYSTEM_CONFIG.THEME.GATED.text, true));
      newRules.push(createRule(cols.ACCOUNT_STATUS, 'Ungate', SYSTEM_CONFIG.THEME.UNGATED.bg, SYSTEM_CONFIG.THEME.UNGATED.text, true));
      newRules.push(createRule(cols.ACCOUNT_STATUS, 'Copylist', SYSTEM_CONFIG.THEME.COPYLIST.bg, SYSTEM_CONFIG.THEME.COPYLIST.text, true));
    }

    // 2. Case Log Column Colors
    if (cols.CASE_LOG) {
      newRules.push(createRule(cols.CASE_LOG, 'Review', SYSTEM_CONFIG.THEME.REVIEW.bg, SYSTEM_CONFIG.THEME.REVIEW.text, true));
      newRules.push(createRule(cols.CASE_LOG, 'Ungate', SYSTEM_CONFIG.THEME.UNGATED.bg, SYSTEM_CONFIG.THEME.UNGATED.text, true));
      newRules.push(createRule(cols.CASE_LOG, 'Invoice Submission', SYSTEM_CONFIG.THEME.SUBMISSION.bg, SYSTEM_CONFIG.THEME.SUBMISSION.text, true));
      newRules.push(createRule(cols.CASE_LOG, 'Rejected', SYSTEM_CONFIG.THEME.REJECTED.bg, SYSTEM_CONFIG.THEME.REJECTED.text, true));
    }

    // 3. Case Re-open Column Colors
    if (cols.CASE_REOPEN) {
      newRules.push(createRule(cols.CASE_REOPEN, '0 case re-open', SYSTEM_CONFIG.THEME.ZERO_REOPEN.bg, SYSTEM_CONFIG.THEME.ZERO_REOPEN.text, true));
      newRules.push(createRule(cols.CASE_REOPEN, 'Case Open', SYSTEM_CONFIG.THEME.CASE_OPEN.bg, SYSTEM_CONFIG.THEME.CASE_OPEN.text, true));
      newRules.push(createRule(cols.CASE_REOPEN, 'Case re-open 1', SYSTEM_CONFIG.THEME.REOPEN_1.bg, SYSTEM_CONFIG.THEME.REOPEN_1.text, true));
      newRules.push(createRule(cols.CASE_REOPEN, 'Case re-open 2', SYSTEM_CONFIG.THEME.REOPEN_2.bg, SYSTEM_CONFIG.THEME.REOPEN_2.text, true));
      newRules.push(createRule(cols.CASE_REOPEN, 'Case re-open 3', SYSTEM_CONFIG.THEME.REOPEN_3.bg, SYSTEM_CONFIG.THEME.REOPEN_3.text, true));
      newRules.push(createRule(cols.CASE_REOPEN, 'Case re-open 4', SYSTEM_CONFIG.THEME.REOPEN_4.bg, SYSTEM_CONFIG.THEME.REOPEN_4.text, true));
      newRules.push(createRule(cols.CASE_REOPEN, 'Case re-open 5', SYSTEM_CONFIG.THEME.REOPEN_5.bg, SYSTEM_CONFIG.THEME.REOPEN_5.text, true));
      newRules.push(createRule(cols.CASE_REOPEN, 'Under review', SYSTEM_CONFIG.THEME.UNDER_REVIEW.bg, SYSTEM_CONFIG.THEME.UNDER_REVIEW.text, true));
      newRules.push(createRule(cols.CASE_REOPEN, 'Re-apply', SYSTEM_CONFIG.THEME.RE_APPLY.bg, SYSTEM_CONFIG.THEME.RE_APPLY.text, true));
      newRules.push(createRule(cols.CASE_REOPEN, 'Rejected', SYSTEM_CONFIG.THEME.REJECTED.bg, SYSTEM_CONFIG.THEME.REJECTED.text, true));
    }

    const validRules = newRules.filter(Boolean);
    sheet.setConditionalFormatRules(validRules);
  });

  SpreadsheetApp.getActiveSpreadsheet().toast('Applied exact status colors (Gated=Red, Review=Purple, 0 re-open=Black, etc.) to entry sheets!', 'Colors Active', 4);
}

// ==============================================================================================
// 7. DROPDOWN VALIDATIONS
// ==============================================================================================

function refreshAllDropdowns() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let masterSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.MASTER);
  if (!masterSheet) {
    masterSheet = initMasterListsSheet();
  }

  const lastRowMaster = masterSheet.getLastRow();
  const getMasterColRange = (colIdx) => {
    if (lastRowMaster < 2) return null;
    const colVals = masterSheet.getRange(2, colIdx, lastRowMaster - 1, 1).getValues();
    let lastNonEmpty = 0;
    for (let i = colVals.length - 1; i >= 0; i--) {
      if (normalizeText(colVals[i][0])) {
        lastNonEmpty = i + 1;
        break;
      }
    }
    if (lastNonEmpty <= 0) return null;
    return masterSheet.getRange(2, colIdx, lastNonEmpty, 1);
  };

  const compRange = getMasterColRange(1);   // Col 1: Company Name
  const supRange = getMasterColRange(2);    // Col 2: Popular Supplier Name
  const accRange = getMasterColRange(3);    // Col 3: Account Status
  const logRange = getMasterColRange(4);    // Col 4: Case Log
  const reopenRange = getMasterColRange(5); // Col 5: Case Re-open
  const catRange = getMasterColRange(6);    // Col 6: Product Category

  const companies = getMasterList('COMPANIES');
  const suppliers = getMasterList('POPULAR_SUPPLIERS');
  const accountStatuses = getMasterList('ACCOUNT_STATUS');
  const caseLogs = getMasterList('CASE_LOG');
  const caseReopens = getMasterList('CASE_REOPEN');
  const categories = getMasterList('PRODUCT_CATEGORIES');

  SYSTEM_CONFIG.SHEETS.DATA_ENTRY.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const TARGET_ROWS = 3000;
    if (sheet.getMaxRows() < TARGET_ROWS) {
      sheet.insertRowsAfter(sheet.getMaxRows(), TARGET_ROWS - sheet.getMaxRows());
    }
    const numRows = sheet.getMaxRows() - 1;
    const cols = detectColumnMapping(sheet);

    applyValidation(sheet, 2, cols.COMPANY, numRows, compRange, companies);
    applyValidation(sheet, 2, cols.ACCOUNT_STATUS, numRows, accRange, accountStatuses);
    applyValidation(sheet, 2, cols.CATEGORY, numRows, catRange, categories);
    applyValidation(sheet, 2, cols.SUPPLIER, numRows, supRange, suppliers);
    applyValidation(sheet, 2, cols.CASE_LOG, numRows, logRange, caseLogs);
    applyValidation(sheet, 2, cols.CASE_REOPEN, numRows, reopenRange, caseReopens);
  });

  applyConditionalFormattingToEntrySheets();

  SpreadsheetApp.getActiveSpreadsheet().toast('Dropdown validations and status colors updated!', 'Dropdowns & Colors', 4);
}

function applyValidation(sheet, startRow, colIndex, numRows, targetRange, fallbackList) {
  if (!colIndex || colIndex > sheet.getMaxColumns()) return;
  const safeRows = Math.min(numRows, sheet.getMaxRows() - startRow + 1);
  if (safeRows <= 0) return;

  let builder = SpreadsheetApp.newDataValidation().setAllowInvalid(true);

  if (targetRange) {
    builder = builder.requireValueInRange(targetRange, true);
  } else if (fallbackList && fallbackList.length > 0) {
    const safeList = fallbackList.length > 500 ? fallbackList.slice(0, 500) : fallbackList;
    builder = builder.requireValueInList(safeList, true);
  } else {
    return;
  }

  const rule = builder.build();
  sheet.getRange(startRow, colIndex, safeRows, 1).setDataValidation(rule);
}

// ==============================================================================================
// 8. MASTER LISTS SETUP
// ==============================================================================================

function initMasterListsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.MASTER);
  if (!sheet) {
    sheet = ss.insertSheet(SYSTEM_CONFIG.SHEETS.MASTER);
  }

  const cols = [
    { title: 'Company Name', col: 1, data: INITIAL_MASTER_DATA.COMPANIES },
    { title: 'Popular Supplier Name', col: 2, data: INITIAL_MASTER_DATA.POPULAR_SUPPLIERS },
    { title: 'Account Status', col: 3, data: INITIAL_MASTER_DATA.ACCOUNT_STATUS },
    { title: 'Case Log', col: 4, data: INITIAL_MASTER_DATA.CASE_LOG },
    { title: 'Case Re-open', col: 5, data: INITIAL_MASTER_DATA.CASE_REOPEN },
    { title: 'Product Category', col: 6, data: INITIAL_MASTER_DATA.PRODUCT_CATEGORIES }
  ];

  const headers = cols.map(c => c.title);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
       .setBackground('#1B365D')
       .setFontColor('#FFFFFF')
       .setFontWeight('bold');
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);

  if (sheet.getMaxColumns() >= 7) {
    sheet.getRange(1, 7, sheet.getMaxRows(), sheet.getMaxColumns() - 6).clear();
  }

  cols.forEach(colObj => {
    let existing = [];
    if (sheet.getLastRow() > 1) {
      const raw = sheet.getRange(2, colObj.col, sheet.getLastRow() - 1, 1).getValues();
      existing = raw.map(r => normalizeText(r[0])).filter(Boolean);
    }
    const merged = deduplicatePreserveCase(colObj.data.concat(existing));
    if (merged.length > 0) {
      if (sheet.getMaxRows() < merged.length + 10) {
        sheet.insertRowsAfter(sheet.getMaxRows(), merged.length + 10 - sheet.getMaxRows());
      }
      sheet.getRange(2, colObj.col, sheet.getMaxRows() - 1, 1).clearContent();
      const writeData = merged.map(item => [item]);
      sheet.getRange(2, colObj.col, writeData.length, 1).setValues(writeData);
    }
    sheet.setColumnWidth(colObj.col, 230);
  });

  return sheet;
}

// ==============================================================================================
// 9. AUTO-DISCOVERY: Scan Entry Sheets & Auto-Add New Items to Master Lists
// ==============================================================================================

function scanAndAutoUpdateMasterLists() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.getActiveSpreadsheet().toast('Scanning entry sheets for new items...', 'Auto-Discover', 3);

  let masterSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.MASTER);
  if (!masterSheet) {
    masterSheet = initMasterListsSheet();
  }

  const currentCompanies = getMasterList('COMPANIES');
  const currentSuppliers = getMasterList('POPULAR_SUPPLIERS');
  const currentCategories = getMasterList('PRODUCT_CATEGORIES');

  const compSet = new Set(currentCompanies.map(v => v.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const supSet = new Set(currentSuppliers.map(v => v.toLowerCase().replace(/[^a-z0-9]/g, '')));
  const catSet = new Set(currentCategories.map(v => v.toLowerCase().replace(/[^a-z0-9]/g, '')));

  const newCompanies = [];
  const newSuppliers = [];
  const newCategories = [];

  SYSTEM_CONFIG.SHEETS.DATA_ENTRY.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const cols = detectColumnMapping(sheet);
    const actualCols = Math.min(sheet.getLastColumn(), 15);
    const rawData = sheet.getRange(2, 1, lastRow - 1, actualCols).getValues();

    rawData.forEach(row => {
      const getVal = (colNum) => (colNum <= row.length ? row[colNum - 1] : '');
      const company = normalizeText(getVal(cols.COMPANY));
      const category = normalizeText(getVal(cols.CATEGORY));
      const supplier = normalizeText(getVal(cols.SUPPLIER));

      if (company) {
        const canonical = findCanonicalMatch(company, currentCompanies);
        if (canonical === company) {
          const ck = company.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (ck && !compSet.has(ck)) {
            compSet.add(ck);
            newCompanies.push(company);
          }
        }
      }

      if (supplier) {
        const canonical = findCanonicalMatch(supplier, currentSuppliers);
        if (canonical === supplier) {
          const sk = supplier.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (sk && !supSet.has(sk)) {
            supSet.add(sk);
            newSuppliers.push(supplier);
          }
        }
      }

      if (category) {
        const canonical = findCanonicalMatch(category, currentCategories);
        if (canonical === category) {
          const catk = category.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (catk && !catSet.has(catk)) {
            catSet.add(catk);
            newCategories.push(category);
          }
        }
      }
    });
  });

  let totalAdded = 0;
  function appendToMasterCol(colIdx, newItems) {
    if (newItems.length === 0) return;
    const lastRow = masterSheet.getLastRow();
    let colLastRow = 1;
    if (lastRow >= 2) {
      const colData = masterSheet.getRange(2, colIdx, lastRow - 1, 1).getValues();
      colData.forEach((r, i) => { if (normalizeText(r[0])) colLastRow = i + 2; });
    }
    const writeStartRow = colLastRow + 1;
    if (masterSheet.getMaxRows() < writeStartRow + newItems.length) {
      masterSheet.insertRowsAfter(masterSheet.getMaxRows(), newItems.length + 10);
    }
    const writeData = newItems.map(v => [v]);
    masterSheet.getRange(writeStartRow, colIdx, writeData.length, 1).setValues(writeData);
    totalAdded += newItems.length;
  }

  appendToMasterCol(1, newCompanies);
  appendToMasterCol(2, newSuppliers);
  appendToMasterCol(6, newCategories);

  refreshAllDropdowns();
  refreshAllReports();

  if (totalAdded > 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Auto-Discovery Complete! Added ${totalAdded} new item(s) to Master Lists. Dropdowns & Dashboard updated!`,
      'New Items Found',
      6
    );
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'Scan complete. No new items found — Master Lists is already up to date!',
      'Up to Date',
      4
    );
  }
}

// ==============================================================================================
// 10. NORMALIZE & FIX ALL DATA (Matching extra.tst)
// ==============================================================================================

function cleanMasterListsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.MASTER);
  if (!sheet) {
    sheet = initMasterListsSheet();
    return;
  }

  const columnsConfig = [
    { col: 1, initial: INITIAL_MASTER_DATA.COMPANIES, title: 'Company Name' },
    { col: 2, initial: INITIAL_MASTER_DATA.POPULAR_SUPPLIERS, title: 'Popular Supplier Name' },
    { col: 3, initial: INITIAL_MASTER_DATA.ACCOUNT_STATUS, title: 'Account Status' },
    { col: 4, initial: INITIAL_MASTER_DATA.CASE_LOG, title: 'Case Log' },
    { col: 5, initial: INITIAL_MASTER_DATA.CASE_REOPEN, title: 'Case Re-open' },
    { col: 6, initial: INITIAL_MASTER_DATA.PRODUCT_CATEGORIES, title: 'Product Category' }
  ];

  columnsConfig.forEach(cfg => {
    sheet.getRange(1, cfg.col).setValue(cfg.title)
         .setBackground('#1B365D')
         .setFontColor('#FFFFFF')
         .setFontWeight('bold');
    sheet.setColumnWidth(cfg.col, 230);
  });

  if (sheet.getMaxColumns() >= 7) {
    sheet.getRange(1, 7, sheet.getMaxRows(), sheet.getMaxColumns() - 6).clear();
  }

  const lastRow = sheet.getLastRow();
  columnsConfig.forEach(cfg => {
    let existingItems = [];
    if (lastRow >= 2) {
      const raw = sheet.getRange(2, cfg.col, lastRow - 1, 1).getValues();
      existingItems = raw.map(r => normalizeText(r[0])).filter(Boolean);
    }

    const canonicalSet = new Set();
    const finalItems = [];

    cfg.initial.forEach(item => {
      const key = item.toLowerCase().replace(/[^a-z0-9]/g, '');
      canonicalSet.add(key);
      finalItems.push(item);
    });

    existingItems.forEach(item => {
      const match = findCanonicalMatch(item, cfg.initial);
      if (match === item) {
        const key = item.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!canonicalSet.has(key)) {
          canonicalSet.add(key);
          finalItems.push(item);
        }
      }
    });

    if (sheet.getMaxRows() < finalItems.length + 10) {
      sheet.insertRowsAfter(sheet.getMaxRows(), finalItems.length + 10 - sheet.getMaxRows());
    }
    sheet.getRange(2, cfg.col, sheet.getMaxRows() - 1, 1).clearContent();
    const writeData = finalItems.map(item => [item]);
    sheet.getRange(2, cfg.col, writeData.length, 1).setValues(writeData);
  });
}

function normalizeAllEntryData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  SpreadsheetApp.getActiveSpreadsheet().toast('Normalizing and correcting all entry data to match extra.tst...', 'Cleaning', 6);

  cleanMasterListsSheet();

  const masterComps = getMasterList('COMPANIES');
  const masterSups = getMasterList('POPULAR_SUPPLIERS');
  const masterCats = getMasterList('PRODUCT_CATEGORIES');
  const masterAcc = getMasterList('ACCOUNT_STATUS');
  const masterCaseLog = getMasterList('CASE_LOG');
  const masterReopen = getMasterList('CASE_REOPEN');

  let totalCorrections = 0;
  const changesSummary = [];

  SYSTEM_CONFIG.SHEETS.DATA_ENTRY.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return;

    const cols = detectColumnMapping(sheet);
    const maxCol = Math.max(
      cols.COMPANY, cols.ACCOUNT_STATUS, cols.CATEGORY,
      cols.SUPPLIER, cols.CASE_LOG, cols.CASE_REOPEN, cols.MORE_LESS
    );
    const actualCols = Math.min(sheet.getLastColumn(), maxCol);
    const numRows = lastRow - 1;
    const range = sheet.getRange(2, 1, numRows, actualCols);
    const values = range.getValues();

    let sheetCorrections = 0;

    for (let r = 0; r < numRows; r++) {
      const row = values[r];

      const checkAndFix = (colIndex, referenceList, isMoreLess) => {
        if (!colIndex || colIndex > actualCols) return;
        const currentVal = normalizeText(row[colIndex - 1]);
        if (!currentVal) return;

        let canonical = '';
        if (isMoreLess) {
          const l = currentVal.toLowerCase();
          if (l.includes('more') || l.includes('week')) canonical = 'More Than a Week';
          else if (l.includes('less') || l.includes('7') || l.includes('day')) canonical = 'Less Than 7 Days';
          else canonical = currentVal;
        } else {
          canonical = findCanonicalMatch(currentVal, referenceList);
        }

        if (canonical && canonical !== currentVal) {
          row[colIndex - 1] = canonical;
          sheetCorrections++;
          totalCorrections++;
        }
      };

      checkAndFix(cols.COMPANY, masterComps);
      checkAndFix(cols.SUPPLIER, masterSups);
      checkAndFix(cols.CATEGORY, masterCats);
      checkAndFix(cols.ACCOUNT_STATUS, masterAcc);
      checkAndFix(cols.CASE_LOG, masterCaseLog);
      checkAndFix(cols.CASE_REOPEN, masterReopen);
      checkAndFix(cols.MORE_LESS, [], true);
    }

    if (sheetCorrections > 0) {
      range.setValues(values);
      changesSummary.push(`${sheetName}: ${sheetCorrections} cell(s) fixed`);
    }
  });

  refreshAllDropdowns();
  refreshAllReports();

  if (totalCorrections > 0) {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Done! Normalized ${totalCorrections} cell(s) (${changesSummary.join(', ')}). All dots and spellings now match extra.tst!`,
      'Correction Complete',
      6
    );
  } else {
    SpreadsheetApp.getActiveSpreadsheet().toast(
      'All entry data already matches extra.tst perfectly! No changes needed.',
      'Perfect Match',
      4
    );
  }
}

// ==============================================================================================
// 11. ROBUST AUTOMATION TRIGGER (onEdit)
// ==============================================================================================

function onEdit(e) {
  if (!e || !e.range) return;

  const targetSheet = e.range.getSheet();
  const currentSheetName = targetSheet.getName();
  const editedRow = e.range.getRow();
  const editedCol = e.range.getColumn();

  // ----------------------------------------------------------------------------
  // CASE 1: Date Filter edited on any report sheet (Cell B3 or D3)
  // ----------------------------------------------------------------------------
  const reportSheets = [
    SYSTEM_CONFIG.SHEETS.DASHBOARD,
    SYSTEM_CONFIG.SHEETS.COMPANY_MATRIX,
    SYSTEM_CONFIG.SHEETS.SUPPLIER_BREAKDOWN,
    SYSTEM_CONFIG.SHEETS.CATEGORY_BREAKDOWN
  ];

  if (reportSheets.includes(currentSheetName)) {
    if (editedRow === 3 && (editedCol === 2 || editedCol === 4)) {
      const lock = LockService.getScriptLock();
      if (!lock.tryLock(2000)) return;
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const allRecords = extractAllSourceData();
        if (currentSheetName === SYSTEM_CONFIG.SHEETS.DASHBOARD) refreshDashboardSheet(ss, allRecords);
        else if (currentSheetName === SYSTEM_CONFIG.SHEETS.COMPANY_MATRIX) refreshCompanyMatrixSheet(ss, allRecords);
        else if (currentSheetName === SYSTEM_CONFIG.SHEETS.SUPPLIER_BREAKDOWN) refreshSupplierBreakdownSheet(ss, allRecords);
        else if (currentSheetName === SYSTEM_CONFIG.SHEETS.CATEGORY_BREAKDOWN) refreshCategoryBreakdownSheet(ss, allRecords);
      } catch (err) {
        Logger.log('Report sheet date filter error: ' + err.message);
      } finally {
        lock.releaseLock();
      }
    }
    return;
  }

  // ----------------------------------------------------------------------------
  // CASE 2: User edits Master Lists
  // ----------------------------------------------------------------------------
  if (currentSheetName === SYSTEM_CONFIG.SHEETS.MASTER) {
    if (editedRow < 2) return;
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(2000)) return;
    try {
      refreshAllDropdowns();
      refreshAllReports();
    } catch (err) {
      Logger.log('Master Lists onEdit error: ' + err.message);
    } finally {
      lock.releaseLock();
    }
    return;
  }

  // ----------------------------------------------------------------------------
  // CASE 3: User edits Brenttons or Efix & Eden
  // ----------------------------------------------------------------------------
  if (SYSTEM_CONFIG.SHEETS.DATA_ENTRY.includes(currentSheetName)) {
    if (editedRow < 2) return;

    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return;

    try {
      const cols = detectColumnMapping(targetSheet);
      const tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'GMT+5';
      const now = new Date();
      const formattedTimestamp = Utilities.formatDate(now, tz, 'MM/dd/yyyy hh:mm a');

      const numRowsEdited = e.range.getNumRows();
      const startRow = editedRow;
      const endRow = startRow + numRowsEdited - 1;
      const startCol = editedCol;
      const endCol = startCol + e.range.getNumColumns() - 1;

      // Check which columns were touched
      const touchedCols = [];
      for (let c = startCol; c <= endCol; c++) touchedCols.push(c);

      const touchesAsin          = touchedCols.includes(cols.ASIN);
      const touchesAccountStatus = touchedCols.includes(cols.ACCOUNT_STATUS);
      const touchesCaseLog       = touchedCols.includes(cols.CASE_LOG);
      const touchesCaseReopen    = touchedCols.includes(cols.CASE_REOPEN);

      // A. AUTOMATIC STATUS TIME — COLUMN N
      // New ASIN: first timestamp
      // Existing ASIN: update timestamp only when a tracked field changes
      updateStatusTimestampOnEdit(e, targetSheet, cols);
      const rawVal = normalizeText(e.range.getValue());
      let isNewItemCandidate = false;

      // Real-time single cell auto-correction
      if (editedCol === cols.COMPANY) {
        const masterComps = getMasterList('COMPANIES');
        const canonical = findCanonicalMatch(rawVal, masterComps);
        if (canonical && canonical !== rawVal) {
          e.range.setValue(canonical);
        } else if (canonical === rawVal) {
          const key = rawVal.toLowerCase().replace(/[^a-z0-9]/g, '');
          const exists = masterComps.some(c => c.toLowerCase().replace(/[^a-z0-9]/g, '') === key);
          if (!exists) isNewItemCandidate = true;
        }
      } else if (editedCol === cols.SUPPLIER) {
        const masterSups = getMasterList('POPULAR_SUPPLIERS');
        const canonical = findCanonicalMatch(rawVal, masterSups);
        if (canonical && canonical !== rawVal) {
          e.range.setValue(canonical);
        } else if (canonical === rawVal) {
          const key = rawVal.toLowerCase().replace(/[^a-z0-9]/g, '');
          const exists = masterSups.some(s => s.toLowerCase().replace(/[^a-z0-9]/g, '') === key);
          if (!exists) isNewItemCandidate = true;
        }
      } else if (editedCol === cols.CATEGORY) {
        const masterCats = getMasterList('PRODUCT_CATEGORIES');
        const canonical = findCanonicalMatch(rawVal, masterCats);
        if (canonical && canonical !== rawVal) {
          e.range.setValue(canonical);
        } else if (canonical === rawVal) {
          const key = rawVal.toLowerCase().replace(/[^a-z0-9]/g, '');
          const exists = masterCats.some(c => c.toLowerCase().replace(/[^a-z0-9]/g, '') === key);
          if (!exists) isNewItemCandidate = true;
        }
      } else if (editedCol === cols.ACCOUNT_STATUS) {
        const masterAcc = getMasterList('ACCOUNT_STATUS');
        const canonical = findCanonicalMatch(rawVal, masterAcc);
        if (canonical && canonical !== rawVal) {
          e.range.setValue(canonical);
        }
      } else if (editedCol === cols.CASE_LOG) {
        const masterCaseLog = getMasterList('CASE_LOG');
        const canonical = findCanonicalMatch(rawVal, masterCaseLog);
        if (canonical && canonical !== rawVal) {
          e.range.setValue(canonical);
        }
      } else if (editedCol === cols.CASE_REOPEN) {
        const masterReopen = getMasterList('CASE_REOPEN');
        const canonical = findCanonicalMatch(rawVal, masterReopen);
        if (canonical && canonical !== rawVal) {
          e.range.setValue(canonical);
        }
      } else if (editedCol === cols.MORE_LESS) {
        const l = rawVal.toLowerCase();
        let canonical = '';
        if (l.includes('more') || l.includes('week')) canonical = 'More Than a Week';
        else if (l.includes('less') || l.includes('7') || l.includes('day')) canonical = 'Less Than 7 Days';
        if (canonical && canonical !== rawVal) {
          e.range.setValue(canonical);
        }
      }

      if (isNewItemCandidate) {
        scanAndAutoUpdateMasterLists();
      } else {
        refreshAllReports();
      }
    } catch (err) {
      Logger.log('Data entry onEdit error: ' + err.message);
    } finally {
      lock.releaseLock();
    }
  }
}

function installTriggers() {
  uninstallTriggers();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onEdit').forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getUi().alert('Auto-sync onEdit trigger installed successfully!\n\nAb:\n- B3 ya D3 mein Date badalne par Dashboard khud live update hoga!\n- Entry sheets mein Status select karte hi exact colors lag jayein ge!\n- Koi bhi employee spelling ya dot miss kare ga tu system foran auto-correct karega!\n- Manual design aur formatting bilkul mehfooz rahe gi!');
}

function uninstallTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => ScriptApp.deleteTrigger(t));
}


// ==============================================================================================
// 12. AUTOMATIC TIMESTAMPS & SHIFT TRACKING HELPERS (promt msg.tst)
// ==============================================================================================

/**
 * Setup header labels for Column N (Status Time) & Column O (Case Activity Time)
 */
function setupTimestampHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  SYSTEM_CONFIG.SHEETS.DATA_ENTRY.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const cols = detectColumnMapping(sheet);

    sheet.getRange(1, cols.STATUS_TIME)
      .setValue('Status Time')
      .setFontWeight('bold');

    sheet.getRange(
      2,
      cols.STATUS_TIME,
      Math.max(sheet.getMaxRows() - 1, 1),
      1
    ).setNumberFormat('hh:mm:ss AM/PM');
  });

  ss.toast(
    'Column N Status Time header and time format are ready!',
    'Timestamp Setup',
    5
  );
}

/**
 * Synchronize From Date (B3) & To Date (D3) from Report Dashboard to all other report sheets!
 */
function syncDashboardDatesToAllReports() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dashSheet = ss.getSheetByName(SYSTEM_CONFIG.SHEETS.DASHBOARD);
  if (!dashSheet) return;

  const fromVal = dashSheet.getRange(3, 2).getValue();
  const toVal = dashSheet.getRange(3, 4).getValue();

  const otherSheets = [
    SYSTEM_CONFIG.SHEETS.COMPANY_MATRIX,
    SYSTEM_CONFIG.SHEETS.SUPPLIER_BREAKDOWN,
    SYSTEM_CONFIG.SHEETS.CATEGORY_BREAKDOWN
  ];

  otherSheets.forEach(name => {
    const s = ss.getSheetByName(name);
    if (s) {
      s.getRange(3, 2).setValue(fromVal);
      s.getRange(3, 4).setValue(toVal);
    }
  });

  refreshAllReports();
  ss.toast('Date filters synchronized across all 4 report sheets!', 'Dates Synced', 4);
}

/**
 * ============================================================================
 * CUSTOM SPREADSHEET FORMULA: =GET_SHIFT_DATE(timestamp)
 * ============================================================================
 * Calculates the Shift Date according to the 5:00 PM to 1:00 AM rule:
 * - Activities between 5:00 PM and 11:59 PM belong to THAT day's shift.
 * - Activities between 12:00 AM and 1:00 AM belong to the PREVIOUS day's shift.
 * 
 * Usage in Google Sheets cell: =GET_SHIFT_DATE(N2)
 *
 * @param {Date|string} timestamp - Cell containing date or timestamp
 * @return {string} Formatted shift date (YYYY-MM-DD)
 * @customfunction
 */
function GET_SHIFT_DATE(timestamp) {
  if (!timestamp) return '';

  let dt;
  if (timestamp instanceof Date) {
    dt = timestamp;
  } else {
    dt = new Date(timestamp);
    if (isNaN(dt.getTime())) {
      const parts = timestamp.toString().match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\s*(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (parts) {
        let h = parseInt(parts[4], 10);
        const m = parseInt(parts[5], 10);
        const ampm = parts[6] ? parts[6].toUpperCase() : '';
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        dt = new Date(parseInt(parts[3], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), h, m);
      } else {
        return timestamp.toString();
      }
    }
  }

  const hours = dt.getHours();
  const minutes = dt.getMinutes();
  const shiftDate = new Date(dt.getTime());

  // 12:00 AM (00:00) to 1:00 AM (01:00) -> subtract 1 day
  if (hours === 0 || (hours === 1 && minutes === 0)) {
    shiftDate.setDate(shiftDate.getDate() - 1);
  }

  const y = shiftDate.getFullYear();
  const m = String(shiftDate.getMonth() + 1).padStart(2, '0');
  const d = String(shiftDate.getDate()).padStart(2, '0');

  return y + '-' + m + '-' + d;
}

/**
 * ============================================================
 * AUTOMATIC STATUS TIMESTAMP — COLUMN N
 * ============================================================
 *
 * Rules:
 * 1. New ASIN entered in a previously blank ASIN cell:
 *    Save current date + time in Column N.
 *
 * 2. Existing ASIN:
 *    Update Column N only when one of these fields changes:
 *    - Account Status
 *    - Case Log
 *    - Case re-open
 *    - Popular Supplier Name
 *
 * 3. Old records are never automatically backfilled.
 * 4. Unrelated column edits do not change Column N.
 * 5. Column N stores a real Date object, displayed as time only.
 * 6. Multi-cell paste is skipped because Google Sheets does not
 *    provide reliable old values for every pasted cell.
 */

function updateStatusTimestampOnEdit(e, sheet, cols) {
  if (!e || !e.range || !sheet || !cols) return;

  const range = e.range;

  const startRow = range.getRow();
  const startCol = range.getColumn();
  const numRows = range.getNumRows();
  const numCols = range.getNumColumns();

  // Header row is excluded.
  if (startRow < 2) return;

  // Only process a single-cell edit.
  // Google Sheets does not provide oldValue for multi-cell pastes.
  if (numRows !== 1 || numCols !== 1) {
    return;
  }

  const editedCol = startCol;
  const editedRow = startRow;

  const trackedColumns = [
    cols.ASIN,
    cols.ACCOUNT_STATUS,
    cols.CASE_LOG,
    cols.CASE_REOPEN,
    cols.SUPPLIER
  ];

  // Ignore edits outside tracked columns.
  if (!trackedColumns.includes(editedCol)) return;

  const newValue = range.getValue();
  const oldValue = e.oldValue;

  const newText = String(newValue == null ? '' : newValue).trim();
  const oldText = String(oldValue == null ? '' : oldValue).trim();

  // No actual value change.
  if (newText === oldText) return;

  const asinValue = sheet
    .getRange(editedRow, cols.ASIN)
    .getValue();

  // Do not timestamp a row without an ASIN.
  if (!asinValue || String(asinValue).trim() === '') return;

  const statusTimeCell = sheet.getRange(
    editedRow,
    cols.STATUS_TIME
  );

  const existingTimestamp = statusTimeCell.getValue();

  const now = new Date();

  // CASE 1: A genuinely new ASIN is entered into a blank ASIN cell.
  if (editedCol === cols.ASIN) {

    // Only stamp when the previous ASIN cell was blank.
    // Editing an existing ASIN does not count as a new entry.
    if (oldText === '' && newText !== '') {

      // Never overwrite an existing timestamp.
      if (existingTimestamp === '' || existingTimestamp === null) {
        statusTimeCell
          .setValue(now)
          .setNumberFormat('hh:mm:ss AM/PM');
      }
    }

    return;
  }

  // CASE 2: Existing ASIN — tracked field changed.
  const isTrackedChange = [
    cols.ACCOUNT_STATUS,
    cols.CASE_LOG,
    cols.CASE_REOPEN,
    cols.SUPPLIER
  ].includes(editedCol);

  if (isTrackedChange) {
    statusTimeCell
      .setValue(now)
      .setNumberFormat('hh:mm:ss AM/PM');
  }
}