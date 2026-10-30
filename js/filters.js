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

    // Collect distinct values for key dimensions
    const distinctValues = {};
    headers.forEach(h => {
      distinctValues[h] = new Set();
    });

    rows.forEach(r => {
      headers.forEach(h => {
        const val = (r[h] || '').trim();
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

    // 1. Status Filter - aggregate all status dimensions (Account Status, Case Log, Case Re-open)
    const allStatusesSet = new Set();
    rows.forEach(r => {
      [r._canonicalStatus, r._canonicalAccountStatus, r._canonicalCaseLog, r._canonicalCaseStatus].forEach(s => {
        if (s && s !== 'Unknown' && s !== 'None') allStatusesSet.add(s);
      });
    });
    const statusOptions = Array.from(allStatusesSet).sort();

    html += `
      <div class="filter-group">
        <label class="filter-label">Status</label>
        <select class="filter-select" id="filterStatus" data-filter="status">
          <option value="">All Statuses (${rows.length})</option>
          ${statusOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.status === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
        </select>
      </div>
    `;

    // 2. Company Filter
    const compCol = detectedColumns.companyCol;
    if (compCol && distinctValues[compCol]) {
      const compOptions = Array.from(distinctValues[compCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label">${escapeHtml(compCol)}</label>
          <select class="filter-select" id="filterCompany" data-filter="company">
            <option value="">All Companies</option>
            ${compOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.company === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 3. Category Filter
    const catCol = detectedColumns.categoryCol;
    if (catCol && distinctValues[catCol]) {
      const catOptions = Array.from(distinctValues[catCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label">${escapeHtml(catCol)}</label>
          <select class="filter-select" id="filterCategory" data-filter="category">
            <option value="">All Categories</option>
            ${catOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.category === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 4. Supplier Filter
    const supCol = detectedColumns.supplierCol;
    if (supCol && distinctValues[supCol]) {
      const supOptions = Array.from(distinctValues[supCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label">${escapeHtml(supCol)}</label>
          <select class="filter-select" id="filterSupplier" data-filter="supplier">
            <option value="">All Suppliers</option>
            ${supOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.supplier === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 5. Brand Filter
    const brandCol = detectedColumns.brandCol;
    if (brandCol && distinctValues[brandCol]) {
      const brandOptions = Array.from(distinctValues[brandCol]).sort();
      html += `
        <div class="filter-group">
          <label class="filter-label">${escapeHtml(brandCol)}</label>
          <select class="filter-select" id="filterBrand" data-filter="brand">
            <option value="">All Brands</option>
            ${brandOptions.map(opt => `<option value="${escapeHtml(opt)}" ${currentFilters.brand === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>
      `;
    }

    // 6. Date Range Filters (if date column exists)
    const dateCol = detectedColumns.dateCol;
    if (dateCol) {
      html += `
        <div class="filter-group">
          <label class="filter-label">From Date</label>
          <input type="date" class="filter-input" id="filterDateFrom" data-filter="dateFrom" value="${currentFilters.dateFrom || ''}">
        </div>
        <div class="filter-group">
          <label class="filter-label">To Date</label>
          <input type="date" class="filter-input" id="filterDateTo" data-filter="dateTo" value="${currentFilters.dateTo || ''}">
        </div>
      `;
    }

    // 7. Dynamic Filters for any other detected columns with manageable cardinality (e.g. 2 to 40 unique values)
    const standardCols = new Set([statusCol, compCol, catCol, supCol, brandCol, dateCol, detectedColumns.asinCol, detectedColumns.skuCol]);
    
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
        const selectElem = document.querySelector(`[data-filter="${CSS.escape(key)}"]`);
        if (selectElem) selectElem.value = '';
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

    const searchLower = (currentFilters.search || '').toLowerCase().trim();
    const statusVal = currentFilters.status;
    const compVal = currentFilters.company;
    const catVal = currentFilters.category;
    const supVal = currentFilters.supplier;
    const brandVal = currentFilters.brand;
    const dateFrom = currentFilters.dateFrom ? new Date(currentFilters.dateFrom) : null;
    const dateTo = currentFilters.dateTo ? new Date(currentFilters.dateTo + 'T23:59:59') : null;

    const statusCol = detectedColumns.statusCol;
    const compCol = detectedColumns.companyCol;
    const catCol = detectedColumns.categoryCol;
    const supCol = detectedColumns.supplierCol;
    const brandCol = detectedColumns.brandCol;
    const dateCol = detectedColumns.dateCol;

    return rows.filter(r => {
      // 1. Status Filter - checks across all status dimensions (Account Status, Case Log, Case Re-open, etc.)
      if (statusVal) {
        const rowStatuses = [
          r._canonicalStatus,
          r._canonicalAccountStatus,
          r._canonicalCaseLog,
          r._canonicalCaseStatus,
          statusCol ? r[statusCol] : null,
          detectedColumns.accountStatusCol ? r[detectedColumns.accountStatusCol] : null,
          detectedColumns.caseLogCol ? r[detectedColumns.caseLogCol] : null,
          detectedColumns.caseStatusCol ? r[detectedColumns.caseStatusCol] : null
        ].filter(Boolean).map(s => s.toString().toLowerCase().trim());

        if (!rowStatuses.includes(statusVal.toLowerCase().trim())) {
          return false;
        }
      }

      // 2. Company Filter
      if (compVal && compCol) {
        if ((r[compCol] || '').trim() !== compVal) return false;
      }

      // 3. Category Filter
      if (catVal && catCol) {
        if ((r[catCol] || '').trim() !== catVal) return false;
      }

      // 4. Supplier Filter
      if (supVal && supCol) {
        if ((r[supCol] || '').trim() !== supVal) return false;
      }

      // 5. Brand Filter
      if (brandVal && brandCol) {
        if ((r[brandCol] || '').trim() !== brandVal) return false;
      }

      // 6. Dynamic Filters
      for (const [colName, requiredVal] of Object.entries(currentFilters.dynamic)) {
        if ((r[colName] || '').trim() !== requiredVal) return false;
      }

      // 7. Date Range Filter
      if ((dateFrom || dateTo) && dateCol) {
        const rowDateVal = r[dateCol];
        if (rowDateVal) {
          const rowDate = new Date(rowDateVal);
          if (!isNaN(rowDate)) {
            if (dateFrom && rowDate < dateFrom) return false;
            if (dateTo && rowDate > dateTo) return false;
          }
        }
      }

      // 8. Global Search Query across all fields
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
