/**
 * filters.js
 * Universal Dynamic Filtering Engine for Amazon Ungating Dashboard.
 * Supports global text search, specific column dropdowns, date ranges, and custom column filters.
 */

var FilterManager = (function () {
  'use strict';

  // Active filter state
  let currentFilters = {
    search: '',
    accountStatus: '',
    caseLog: '',
    caseStatus: '',
    qty: '',
    software: '',
    status: '',
    company: '',
    category: '',
    supplier: '',
    brand: '',
    dateFrom: '',
    dateTo: '',
    dynamic: {} // Key-value for additional detected columns
  };

  let onFilterChangeCallback = null;

  /**
   * Set callback to notify when filters are updated
   */
  function onFilterChange(callback) {
    onFilterChangeCallback = callback;
  }

  function triggerChange() {
    if (typeof onFilterChangeCallback === 'function') {
      onFilterChangeCallback(getFilterState());
    }
  }

  function getFilterState() {
    return JSON.parse(JSON.stringify(currentFilters));
  }

  function setFilter(key, value) {
    if (key.startsWith('dynamic:')) {
      const col = key.replace('dynamic:', '');
      if (!value) {
        delete currentFilters.dynamic[col];
      } else {
        currentFilters.dynamic[col] = value;
      }
    } else {
      currentFilters[key] = value;
    }
    renderActiveFilterTags();
    triggerChange();
  }

  function resetFilters() {
    currentFilters = {
      search: '',
      accountStatus: '',
      caseLog: '',
      caseStatus: '',
      qty: '',
      software: '',
      status: '',
      company: '',
      category: '',
      supplier: '',
      brand: '',
      dateFrom: '',
      dateTo: '',
      dynamic: {}
    };

    // Reset DOM inputs
    const inputs = document.querySelectorAll('.filter-input, .filter-select, #globalSearchInput');
    inputs.forEach(input => {
      input.value = '';
    });

    renderActiveFilterTags();
    triggerChange();
  }

  /**
   * Dynamically build filter controls based on detected columns & values in dataset
   */
  function buildFilterUI(dataset, detectedColumns, containerElement) {
    if (!containerElement) return;
    if (!dataset || dataset.rows.length === 0) {
      containerElement.style.display = 'none';
      containerElement.innerHTML = '';
      return;
    }
    containerElement.style.display = 'block';

    const rows = dataset.rows;
    const headers = dataset.headers;
    const detected = detectedColumns || dataset.detectedColumns || {};

    // Collect distinct values for key dimensions
    const distinctValues = {};
    headers.forEach(h => {
      distinctValues[h] = new Set();
    });

    rows.forEach(r => {
      headers.forEach(h => {
        const val = (r[h] !== undefined && r[h] !== null) ? r[h].toString().trim() : '';
        if (val) distinctValues[h].add(val);
      });
    });

    let html = `
      <div class="filter-header">
        <div class="filter-title">
          <i class="fa-solid fa-sliders"></i>
          <span>Dynamic Filters & Slicers</span>
        </div>
        <button class="btn btn-sm btn-secondary" id="btnResetFilters">
          <i class="fa-solid fa-rotate-left"></i>
          <span>Reset All</span>
        </button>
      </div>

      <div class="filter-grid">
    `;

    // 1. Account Status Filter (e.g. Gated, Ungate, Copylist)
    const accCol = detected.accountStatusCol;
    if (accCol && distinctValues[accCol] && distinctValues[accCol].size > 0) {
      const accOptions = Array.from(distinctValues[accCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-shield-halved me-1"></i> ${escapeHtml(accCol)}</label>
          <select class="filter-select" id="filterAccountStatus" data-filter="accountStatus">
            <option value="">All Account Statuses</option>
            ${accOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.accountStatus === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 2. Case Log Filter (e.g. Review, Rejected, Ungate, Approved)
    const caseLogCol = detected.caseLogCol;
    if (caseLogCol && distinctValues[caseLogCol] && distinctValues[caseLogCol].size > 0) {
      const logOptions = Array.from(distinctValues[caseLogCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-clipboard-list me-1"></i> ${escapeHtml(caseLogCol)}</label>
          <select class="filter-select" id="filterCaseLog" data-filter="caseLog">
            <option value="">All Case Logs</option>
            ${logOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.caseLog === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 3. Case Re-open Filter (e.g. Case Open, Case re-open 1..5, Re-apply, Under review)
    const caseStatusCol = detected.caseStatusCol;
    if (caseStatusCol && distinctValues[caseStatusCol] && distinctValues[caseStatusCol].size > 0) {
      const reopenOptions = Array.from(distinctValues[caseStatusCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-rotate me-1"></i> ${escapeHtml(caseStatusCol)}</label>
          <select class="filter-select" id="filterCaseStatus" data-filter="caseStatus">
            <option value="">All Case Re-open Statuses</option>
            ${reopenOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.caseStatus === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 4. Quantity / Qty Filter (numerical values sorted ascending)
    const unitsCol = detected.unitsCol;
    if (unitsCol && distinctValues[unitsCol] && distinctValues[unitsCol].size > 0) {
      const qtyOptions = Array.from(distinctValues[unitsCol]).sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b, undefined, { numeric: true });
      });
      html += `
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-boxes-stacked me-1"></i> ${escapeHtml(unitsCol || 'Quantity')}</label>
          <select class="filter-select" id="filterQty" data-filter="qty">
            <option value="">All Quantities</option>
            ${qtyOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.qty === opt ? 'selected' : ''}>${escapeHtml(opt)} Units</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 5. Software Filter (e.g. Orbit-N, Orbit-B, Orbit-A, Aura, Shipment)
    const softCol = detected.softwareCol;
    if (softCol && distinctValues[softCol] && distinctValues[softCol].size > 0) {
      const softOptions = Array.from(distinctValues[softCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-laptop-code me-1"></i> ${escapeHtml(softCol || 'Software')}</label>
          <select class="filter-select" id="filterSoftware" data-filter="software">
            <option value="">All Softwares</option>
            ${softOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.software === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // Generic Status Filter (if none of the specific 3 status columns exist)
    if (!accCol && !caseLogCol && !caseStatusCol) {
      const allStatusesSet = new Set();
      rows.forEach(r => {
        [r._canonicalStatus, r._canonicalAccountStatus, r._canonicalCaseLog, r._canonicalCaseStatus].forEach(s => {
          if (s && s !== 'Unknown' && s !== 'None') allStatusesSet.add(s);
        });
      });
      if (allStatusesSet.size > 0) {
        const statusOptions = Array.from(allStatusesSet).sort();
        html += `
          <div class="filter-group">
            <label class="filter-label"><i class="fa-solid fa-tag me-1"></i> Status</label>
            <select class="filter-select" id="filterStatus" data-filter="status">
              <option value="">All Statuses (${rows.length})</option>
              ${statusOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.status === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
            </select>
          </div>
        `;
      }
    }

    // 5. Company Filter
    const compCol = detected.companyCol;
    if (compCol && distinctValues[compCol]) {
      const compOptions = Array.from(distinctValues[compCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-building me-1"></i> ${escapeHtml(compCol)}</label>
          <select class="filter-select" id="filterCompany" data-filter="company">
            <option value="">All Companies</option>
            ${compOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.company === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 6. Category Filter
    const catCol = detected.categoryCol;
    if (catCol && distinctValues[catCol]) {
      const catOptions = Array.from(distinctValues[catCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-shapes me-1"></i> ${escapeHtml(catCol)}</label>
          <select class="filter-select" id="filterCategory" data-filter="category">
            <option value="">All Categories</option>
            ${catOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.category === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 7. Supplier Filter
    const supCol = detected.supplierCol;
    if (supCol && distinctValues[supCol]) {
      const supOptions = Array.from(distinctValues[supCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-truck-ramp-box me-1"></i> ${escapeHtml(supCol)}</label>
          <select class="filter-select" id="filterSupplier" data-filter="supplier">
            <option value="">All Suppliers</option>
            ${supOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.supplier === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 8. Brand Filter
    const brandCol = detected.brandCol;
    if (brandCol && distinctValues[brandCol]) {
      const brandOptions = Array.from(distinctValues[brandCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-award me-1"></i> ${escapeHtml(brandCol)}</label>
          <select class="filter-select" id="filterBrand" data-filter="brand">
            <option value="">All Brands</option>
            ${brandOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.brand === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 9. Date Range Filters (if date column exists)
    const dateCol = detected.dateCol;
    if (dateCol) {
      html += `
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-calendar me-1"></i> From Date</label>
          <input type="date" class="filter-input" id="filterDateFrom" data-filter="dateFrom" value="${currentFilters.dateFrom || ''}">
        </div>
        <div class="filter-group">
          <label class="filter-label"><i class="fa-solid fa-calendar-check me-1"></i> To Date</label>
          <input type="date" class="filter-input" id="filterDateTo" data-filter="dateTo" value="${currentFilters.dateTo || ''}">
        </div>
      `;
    }

    // 10. Dynamic Filters for any other detected columns with manageable cardinality (e.g. 2 to 45 unique values)
    const statusCol = detected.statusCol;
    const standardCols = new Set([
      statusCol,
      accCol,
      caseLogCol,
      caseStatusCol,
      unitsCol,
      softCol,
      compCol,
      catCol,
      supCol,
      brandCol,
      dateCol,
      detected.asinCol,
      detected.skuCol,
      detected.caseIdCol,
      detected.moreLessCol
    ].filter(Boolean));
    
    headers.forEach(h => {
      if (!standardCols.has(h) && distinctValues[h] && distinctValues[h].size >= 2 && distinctValues[h].size <= 45) {
        const sortedVals = Array.from(distinctValues[h]).sort();
        const selectedVal = currentFilters.dynamic[h] || '';
        html += `
          <div class="filter-group">
            <label class="filter-label">${escapeHtml(h)}</label>
            <select class="filter-select" data-filter="dynamic:${escapeHtml(h)}">
              <option value="">All (${escapeHtml(h)})</option>
              ${sortedVals.map(v => `<option value="${escapeHtml(v)}" ${selectedVal === v ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('')}
            </select>
          </div>
        `;
      }
    });

    html += `
      </div>
      <div id="activeFilterTags" class="active-filter-tags" style="display: none;"></div>
    `;

    containerElement.innerHTML = html;

    // Attach event listeners
    containerElement.querySelectorAll('.filter-select, .filter-input').forEach(elem => {
      elem.addEventListener('change', (e) => {
        const key = e.target.getAttribute('data-filter');
        setFilter(key, e.target.value);
      });
    });

    const resetBtn = containerElement.querySelector('#btnResetFilters');
    if (resetBtn) {
      resetBtn.addEventListener('click', resetFilters);
    }

    renderActiveFilterTags();
  }

  /**
   * Render pill tags for any currently active filter
   */
  function renderActiveFilterTags() {
    const tagsContainer = document.getElementById('activeFilterTags');
    if (!tagsContainer) return;

    const tags = [];

    if (currentFilters.search) {
      tags.push({ key: 'search', label: `Search: "${currentFilters.search}"` });
    }
    if (currentFilters.accountStatus) {
      tags.push({ key: 'accountStatus', label: `Account: ${currentFilters.accountStatus}` });
    }
    if (currentFilters.caseLog) {
      tags.push({ key: 'caseLog', label: `Log: ${currentFilters.caseLog}` });
    }
    if (currentFilters.caseStatus) {
      tags.push({ key: 'caseStatus', label: `Case: ${currentFilters.caseStatus}` });
    }
    if (currentFilters.qty) {
      tags.push({ key: 'qty', label: `Qty: ${currentFilters.qty}` });
    }
    if (currentFilters.software) {
      tags.push({ key: 'software', label: `Software: ${currentFilters.software}` });
    }
    if (currentFilters.status) {
      tags.push({ key: 'status', label: `Status: ${currentFilters.status}` });
    }
    if (currentFilters.company) {
      tags.push({ key: 'company', label: `Company: ${currentFilters.company}` });
    }
    if (currentFilters.category) {
      tags.push({ key: 'category', label: `Category: ${currentFilters.category}` });
    }
    if (currentFilters.supplier) {
      tags.push({ key: 'supplier', label: `Supplier: ${currentFilters.supplier}` });
    }
    if (currentFilters.brand) {
      tags.push({ key: 'brand', label: `Brand: ${currentFilters.brand}` });
    }
    if (currentFilters.dateFrom) {
      tags.push({ key: 'dateFrom', label: `From: ${currentFilters.dateFrom}` });
    }
    if (currentFilters.dateTo) {
      tags.push({ key: 'dateTo', label: `To: ${currentFilters.dateTo}` });
    }

    Object.entries(currentFilters.dynamic).forEach(([col, val]) => {
      tags.push({ key: `dynamic:${col}`, label: `${col}: ${val}` });
    });

    if (tags.length === 0) {
      tagsContainer.style.display = 'none';
      tagsContainer.innerHTML = '';
      return;
    }

    tagsContainer.style.display = 'flex';
    tagsContainer.innerHTML = tags.map(tag => `
      <span class="filter-tag">
        <span>${escapeHtml(tag.label)}</span>
        <i class="fa-solid fa-xmark filter-tag-remove" data-remove-key="${escapeHtml(tag.key)}"></i>
      </span>
    `).join('') + `
      <button class="btn btn-sm btn-outline" id="btnClearAllTags" style="padding: 0.15rem 0.5rem; font-size: 0.72rem;">
        Clear All
      </button>
    `;

    // Hook up individual remove buttons
    tagsContainer.querySelectorAll('.filter-tag-remove').forEach(icon => {
      icon.addEventListener('click', () => {
        const key = icon.getAttribute('data-remove-key');
        setFilter(key, '');
        // also sync select element if exists
        try {
          const selectElem = document.querySelector(`[data-filter="${key}"]`);
          if (selectElem) selectElem.value = '';
        } catch (e) {}
      });
    });

    const clearAllBtn = tagsContainer.querySelector('#btnClearAllTags');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', resetFilters);
    }
  }

  /**
   * Apply all active filters to the dataset rows
   */
  function filterRows(rows, detectedColumns) {
    if (!rows || rows.length === 0) return [];

    const d = detectedColumns || {};
    const searchLower = (currentFilters.search || '').toLowerCase().trim();
    const accStatusVal = (currentFilters.accountStatus || '').toLowerCase().trim();
    const caseLogVal = (currentFilters.caseLog || '').toLowerCase().trim();
    const caseStatusVal = (currentFilters.caseStatus || '').toLowerCase().trim();
    const qtyVal = (currentFilters.qty !== undefined && currentFilters.qty !== '') ? currentFilters.qty.toString().trim() : '';
    const softVal = (currentFilters.software || '').toLowerCase().trim();
    const statusVal = currentFilters.status;
    const compVal = currentFilters.company;
    const catVal = currentFilters.category;
    const supVal = currentFilters.supplier;
    const brandVal = currentFilters.brand;
    const dateFromStr = currentFilters.dateFrom ? currentFilters.dateFrom.trim() : "";
    const dateToStr = currentFilters.dateTo ? currentFilters.dateTo.trim() : "";

    const accCol = d.accountStatusCol;
    const caseLogCol = d.caseLogCol;
    const caseStatusCol = d.caseStatusCol;
    const unitsCol = d.unitsCol;
    const softCol = d.softwareCol;
    const statusCol = d.statusCol;
    const compCol = d.companyCol;
    const catCol = d.categoryCol;
    const supCol = d.supplierCol;
    const brandCol = d.brandCol;
    const dateCol = d.dateCol;

    return rows.filter(r => {
      // 1. Account Status Filter
      if (accStatusVal) {
        const val = (accCol && r[accCol] !== undefined) ? r[accCol].toString().toLowerCase().trim() : '';
        const canon = (r._canonicalAccountStatus || '').toLowerCase().trim();
        if (val !== accStatusVal && canon !== accStatusVal) return false;
      }

      // 2. Case Log Filter
      if (caseLogVal) {
        const val = (caseLogCol && r[caseLogCol] !== undefined) ? r[caseLogCol].toString().toLowerCase().trim() : '';
        const canon = (r._canonicalCaseLog || '').toLowerCase().trim();
        if (val !== caseLogVal && canon !== caseLogVal) return false;
      }

      // 3. Case Re-open Filter
      if (caseStatusVal) {
        const val = (caseStatusCol && r[caseStatusCol] !== undefined) ? r[caseStatusCol].toString().toLowerCase().trim() : '';
        const canon = (r._canonicalCaseStatus || '').toLowerCase().trim();
        if (val !== caseStatusVal && canon !== caseStatusVal) return false;
      }

      // 4. Quantity (Qty) Filter
      if (qtyVal) {
        const val = (unitsCol && r[unitsCol] !== undefined) ? r[unitsCol].toString().trim() : '';
        if (val !== qtyVal) return false;
      }

      // 4b. Software Filter
      if (softVal) {
        const val = (softCol && r[softCol] !== undefined) ? r[softCol].toString().toLowerCase().trim() : '';
        const canon = (r._software || '').toLowerCase().trim();
        if (val !== softVal && canon !== softVal) return false;
      }

      // 5. General Status Filter (fallback if used)
      if (statusVal) {
        const rowStatuses = [
          r._canonicalStatus,
          r._canonicalAccountStatus,
          r._canonicalCaseLog,
          r._canonicalCaseStatus,
          statusCol ? r[statusCol] : null,
          accCol ? r[accCol] : null,
          caseLogCol ? r[caseLogCol] : null,
          caseStatusCol ? r[caseStatusCol] : null
        ].filter(Boolean).map(s => s.toString().toLowerCase().trim());

        if (!rowStatuses.includes(statusVal.toLowerCase().trim())) {
          return false;
        }
      }

      // 6. Company Filter
      if (compVal && compCol) {
        if ((r[compCol] || '').trim() !== compVal) return false;
      }

      // 7. Category Filter
      if (catVal && catCol) {
        if ((r[catCol] || '').trim() !== catVal) return false;
      }

      // 8. Supplier Filter
      if (supVal && supCol) {
        if ((r[supCol] || '').trim() !== supVal) return false;
      }

      // 9. Brand Filter
      if (brandVal && brandCol) {
        if ((r[brandCol] || '').trim() !== brandVal) return false;
      }

      // 10. Dynamic Filters
      for (const [colName, requiredVal] of Object.entries(currentFilters.dynamic)) {
        if ((r[colName] || '').trim() !== requiredVal) return false;
      }

      // 11. Date Range Filter
      if ((dateFromStr || dateToStr) && dateCol) {
        const rowDateVal = r[dateCol];
        if (rowDateVal) {
          const rowYmd = r._normalizedDate || (typeof DataParser !== 'undefined' ? DataParser.normalizeDateStr(rowDateVal) : rowDateVal);
          if (rowYmd) {
            if (dateFromStr && rowYmd < dateFromStr) return false;
            if (dateToStr && rowYmd > dateToStr) return false;
          }
        }
      }

      // 12. Global Search Query across all fields
      if (searchLower) {
        const match = Object.values(r).some(val => 
          val && val.toString().toLowerCase().includes(searchLower)
        );
        if (!match) return false;
      }

      return true;
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    getFilterState,
    setFilter,
    resetFilters,
    buildFilterUI,
    renderActiveFilterTags,
    filterRows,
    onFilterChange
  };
})();

if (typeof window !== 'undefined') {
  window.FilterManager = FilterManager;
}
