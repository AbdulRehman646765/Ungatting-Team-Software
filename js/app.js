/**
 * app.js
 * Main Application Orchestrator for Amazon Ungating Analytics Dashboard.
 * Coordinates UI views, event handling, clipboard pasting, table pagination, and reporting.
 */

var App = (function () {
  'use strict';

  // Application State
  const state = {
    dataset: null,
    filteredRows: [],
    currentPage: 1,
    pageSize: 25,
    sortColumn: null,
    sortDirection: 'asc',
    currentView: 'dashboard',
    reportDimension: 'Company',
    theme: localStorage.getItem('ungate_theme') || 'light'
  };

  /**
   * Initialize Application
   */
  function init() {
    initTheme();
    initNavigation();
    initGlobalPasteListener();
    initPasteModal();
    initDragAndDrop();
    initTableListeners();
    initExportListeners();
    initReportControls();

    // Hook filter change
    FilterManager.onFilterChange(() => {
      applyCurrentFilters();
    });

    // Automatically load sample data if user wishes, or prompt
    const btnLoadSample = document.getElementById('btnLoadSample');
    if (btnLoadSample) {
      btnLoadSample.addEventListener('click', () => {
        loadSampleData();
      });
    }

    // Clear Data button
    const btnClearData = document.getElementById('btnClearData');
    if (btnClearData) {
      btnClearData.addEventListener('click', () => {
        clearData();
      });
    }

    const btnHeroSample = document.getElementById('btnHeroSample');
    if (btnHeroSample) {
      btnHeroSample.addEventListener('click', (e) => {
        e.stopPropagation();
        loadSampleData();
      });
    }

    const btnHeroPaste = document.getElementById('btnHeroPaste');
    if (btnHeroPaste) {
      btnHeroPaste.addEventListener('click', (e) => {
        e.stopPropagation();
        openPasteModal();
      });
    }

    // App starts clean — user pastes their own data.
    // Initialize empty state cleanly
    clearData(true);
  }

  /* ==========================================================================
     Theme Management (Dark / Light Mode)
     ========================================================================== */
  function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('ungate_theme', state.theme);
        updateThemeIcon();

        // Refresh charts with updated theme colors
        if (state.dataset) {
          ChartManager.updateCharts(state.filteredRows, state.dataset.detectedColumns);
        }
      });
    }
  }

  function updateThemeIcon() {
    const icon = document.querySelector('#themeToggleBtn i');
    if (!icon) return;
    if (state.theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
      icon.title = 'Switch to Light Mode';
    } else {
      icon.className = 'fa-solid fa-moon';
      icon.title = 'Switch to Dark Mode';
    }
  }

  /* ==========================================================================
     Sidebar & Navigation
     ========================================================================== */
  function initNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        switchView(targetView);
      });
    });

    // Sidebar collapse toggle
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('appSidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
      });
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
      });
    }

    // Global search in header
    const globalSearchInput = document.getElementById('globalSearchInput');
    if (globalSearchInput) {
      let debounceTimeout;
      globalSearchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          FilterManager.setFilter('search', e.target.value);
        }, 250);
      });
    }
  }

  function switchView(viewName) {
    state.currentView = viewName;

    // Update nav active states
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`view-${viewName}`);
    if (activeSec) {
      activeSec.classList.add('active');
    }

    // Update Header title
    const titles = {
      dashboard: 'Analytics Dashboard',
      reports: 'Detailed Reports & Matrix',
      table: 'Data Records Table',
      paste: 'Paste & Import Data'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) {
      titleEl.innerHTML = `<i class="fa-solid fa-${getViewIcon(viewName)} me-2"></i> ${titles[viewName] || 'Ungating Portal'}`;
    }

    // If switching to reports, refresh reports
    if (viewName === 'reports') {
      renderReportBreakdown();
    }
  }

  function getViewIcon(view) {
    switch (view) {
      case 'dashboard': return 'chart-pie';
      case 'reports': return 'chart-column';
      case 'table': return 'table-cells';
      case 'paste': return 'paste';
      default: return 'layer-group';
    }
  }

  /* ==========================================================================
     Clipboard & Paste Engine
     ========================================================================== */
  function initGlobalPasteListener() {
    window.addEventListener('paste', (e) => {
      // Don't intercept if user is typing into an input/textarea
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || (tag === 'textarea' && document.activeElement.id !== 'pasteModalTextarea')) {
        return;
      }

      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const pastedText = clipboardData.getData('text');
      if (pastedText && pastedText.trim().length > 0) {
        processRawText(pastedText);
      }
    });

    // Hero banner click opens paste modal
    const heroBanner = document.getElementById('pasteHeroBanner');
    if (heroBanner) {
      heroBanner.addEventListener('click', () => {
        openPasteModal();
      });
    }

    const btnOpenPasteModal = document.getElementById('btnOpenPasteModal');
    if (btnOpenPasteModal) {
      btnOpenPasteModal.addEventListener('click', openPasteModal);
    }
  }

  function initPasteModal() {
    const modal = document.getElementById('pasteModal');
    const closeBtn = document.getElementById('closePasteModalBtn');
    const cancelBtn = document.getElementById('cancelPasteModalBtn');
    const submitBtn = document.getElementById('submitPasteModalBtn');
    const clearBtn = document.getElementById('clearPasteModalBtn');
    const textarea = document.getElementById('pasteModalTextarea');

    if (!modal) return;

    if (closeBtn) closeBtn.addEventListener('click', closePasteModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closePasteModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePasteModal();
    });

    if (clearBtn && textarea) {
      clearBtn.addEventListener('click', () => {
        textarea.value = '';
        textarea.focus();
      });
    }

    if (submitBtn && textarea) {
      submitBtn.addEventListener('click', () => {
        const text = textarea.value;
        if (!text.trim()) {
          showToast('Please paste some Excel data first.', 'warning');
          return;
        }
        processRawText(text);
        closePasteModal();
      });
    }
  }

  function openPasteModal() {
    const modal = document.getElementById('pasteModal');
    const textarea = document.getElementById('pasteModalTextarea');
    if (modal) {
      modal.classList.add('active');
      if (textarea) {
        textarea.focus();
      }
    }
  }

  function closePasteModal() {
    const modal = document.getElementById('pasteModal');
    if (modal) modal.classList.remove('active');
  }

  function initDragAndDrop() {
    const dropZone = document.getElementById('pasteHeroBanner');
    const fileInput = document.getElementById('fileUploadInput');

    if (dropZone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropZone.classList.remove('dragover');
        });
      });

      dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          handleFile(files[0]);
        }
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFile(e.target.files[0]);
        }
      });
    }

    const btnUploadFile = document.getElementById('btnUploadFile');
    if (btnUploadFile && fileInput) {
      btnUploadFile.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
      });
    }
  }

  function handleFile(file) {
    const name = file.name.toLowerCase();
    showToast(`Reading ${file.name}...`, 'info');

    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      if (typeof XLSX === 'undefined') {
        showToast('SheetJS is required to parse Excel binary files.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = function (e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const csvText = XLSX.utils.sheet_to_csv(worksheet, { FS: '\t' });
          processRawText(csvText);
        } catch (err) {
          showToast(`Error parsing Excel workbook: ${err.message}`, 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV or plain text
      const reader = new FileReader();
      reader.onload = function (e) {
        processRawText(e.target.result);
      };
      reader.readAsText(file);
    }
  }

  /**
   * Parse and ingest raw copied/uploaded text
   */
  function processRawText(rawText) {
    try {
      const parsed = DataParser.parseText(rawText);
      state.dataset = parsed;
      state.filteredRows = [...parsed.rows];
      state.currentPage = 1;

      // Update Header badge & quick stats
      updateDatasetBadge(parsed.totalRows, parsed.totalColumns);

      // Build Dynamic Filters UI
      const filterContainer = document.getElementById('filterCardContainer');
      FilterManager.buildFilterUI(parsed, parsed.detectedColumns, filterContainer);

      // Render Dashboard Cards & Status Ribbon
      refreshDashboardViews();

      // Render Data Table
      renderTable();

      // Render Reports Matrix
      setupReportDimensionDropdown();
      renderReportBreakdown();

      // Switch to dashboard view
      switchView('dashboard');

      showToast(`Successfully parsed ${formatNumber(parsed.totalRows)} rows across ${parsed.totalColumns} columns!`, 'success');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to parse clipboard data. Ensure it is tabular.', 'error');
    }
  }

  function loadSampleData(silent = false) {
    const sampleTsv = DataParser.generateSampleData();
    processRawText(sampleTsv);
    if (!silent) {
      showToast('Loaded realistic Amazon Ungating sample dataset!', 'success');
    }
  }

  function updateDatasetBadge(rows, cols) {
    const badge = document.getElementById('datasetBadge');
    if (badge) {
      badge.className = 'dataset-badge';
      badge.innerHTML = `<i class="fa-solid fa-table"></i> ${formatNumber(rows)} Records (${cols} Cols)`;
    }

    const quickTotal = document.getElementById('quickTotalStats');
    if (quickTotal) {
      quickTotal.innerText = formatNumber(rows);
    }

    // Show / hide the Clear Data button
    const clearBtn = document.getElementById('btnClearData');
    if (clearBtn) {
      clearBtn.style.display = rows > 0 ? 'inline-flex' : 'none';
    }
  }

  /**
   * Clear all loaded data and reset the dashboard to a blank state
   */
  function clearData(silent = false) {
    // Reset state
    state.dataset = null;
    state.filteredRows = [];
    state.currentPage = 1;
    state.sortColumn = null;
    state.sortDirection = 'asc';

    // Reset filters
    FilterManager.resetFilters();

    // Clear filter UI
    const filterContainer = document.getElementById('filterCardContainer');
    if (filterContainer) {
      filterContainer.innerHTML = '';
      filterContainer.style.display = 'none';
    }

    // Clear dashboard cards
    const metricsContainer = document.getElementById('dashboardMetricsGrid');
    if (metricsContainer) {
      metricsContainer.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i class="fa-solid fa-paste"></i></div>
          <div class="empty-state-title">No Data Loaded</div>
          <div class="empty-state-desc">Press <kbd>Ctrl + V</kbd> anywhere or click <strong>"Paste Data"</strong> to import your Amazon Ungating Excel data.</div>
        </div>
      `;
    }

    // Hide status ribbon
    const ribbonContainer = document.getElementById('statusRibbonContainer');
    if (ribbonContainer) {
      ribbonContainer.style.display = 'none';
      ribbonContainer.innerHTML = '';
    }

    // Destroy all charts
    ChartManager.destroyAll();
    const chartsWrapper = document.getElementById('chartsVisualizationWrapper');
    if (chartsWrapper) {
      chartsWrapper.style.display = 'none';
    }

    // Clear table
    const tableHead = document.getElementById('dataTableHead');
    const tableBody = document.getElementById('dataTableBody');
    const paginationContainer = document.getElementById('tablePaginationContainer');
    if (tableHead) tableHead.innerHTML = '';
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
            <i class="fa-solid fa-paste" style="font-size: 2rem; display: block; margin-bottom: 0.75rem; opacity:0.4;"></i>
            Paste your Excel data to populate the table
          </td>
        </tr>
      `;
    }
    if (paginationContainer) paginationContainer.innerHTML = '';

    // Clear report table
    const reportHead = document.getElementById('reportTableHead');
    const reportBody = document.getElementById('reportTableBody');
    if (reportHead) reportHead.innerHTML = '';
    if (reportBody) {
      reportBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 3rem; color: var(--text-muted);">
            No data loaded. Paste your Excel data to generate reports.
          </td>
        </tr>
      `;
    }

    // Reset badge
    const badge = document.getElementById('datasetBadge');
    if (badge) {
      badge.className = 'dataset-badge empty';
      badge.innerHTML = `<i class="fa-solid fa-circle-info"></i> Ready to Analyze`;
    }

    const quickTotal = document.getElementById('quickTotalStats');
    if (quickTotal) quickTotal.innerText = '0';

    // Hide the clear button itself
    const clearBtn = document.getElementById('btnClearData');
    if (clearBtn) clearBtn.style.display = 'none';

    // Reset report dimension dropdown
    const reportSelect = document.getElementById('reportDimensionSelect');
    if (reportSelect) reportSelect.innerHTML = `<option value="">-- Choose Any Detected Column --</option>`;

    if (!silent) {
      showToast('All data cleared. Paste your Excel data to begin.', 'info');
    }
    switchView('dashboard');
  }

  function applyCurrentFilters() {
    if (!state.dataset) return;

    state.filteredRows = FilterManager.filterRows(state.dataset.rows, state.dataset.detectedColumns);
    state.currentPage = 1;

    refreshDashboardViews();
    renderTable();
    renderReportBreakdown();
  }

  function refreshDashboardViews() {
    if (!state.dataset) return;

    // Render Metric Cards
    const metricsContainer = document.getElementById('dashboardMetricsGrid');
    DashboardManager.renderMetrics(metricsContainer, state.filteredRows, state.dataset.detectedColumns);

    // Render Status Ribbon
    const ribbonContainer = document.getElementById('statusRibbonContainer');
    DashboardManager.renderStatusRibbon(ribbonContainer, state.filteredRows, state.dataset.detectedColumns);

    // Show/hide charts wrapper
    const chartsWrapper = document.getElementById('chartsVisualizationWrapper');
    if (chartsWrapper) {
      chartsWrapper.style.display = state.filteredRows.length > 0 ? 'block' : 'none';
    }

    // Update Charts
    ChartManager.updateCharts(state.filteredRows, state.dataset.detectedColumns);
  }

  /* ==========================================================================
     Data Table & Pagination Engine
     ========================================================================== */
  function initTableListeners() {
    // Rows per page dropdown
    const pageSizeSelect = document.getElementById('tablePageSizeSelect');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        state.pageSize = val === 'all' ? 1000000 : parseInt(val, 10);
        state.currentPage = 1;
        renderTable();
      });
    }

    // Table quick search
    const tableSearchInput = document.getElementById('tableSearchInput');
    if (tableSearchInput) {
      let debounceTimeout;
      tableSearchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          FilterManager.setFilter('search', e.target.value);
        }, 200);
      });
    }
  }

  function renderTable() {
    const tableHead = document.getElementById('dataTableHead');
    const tableBody = document.getElementById('dataTableBody');
    const paginationContainer = document.getElementById('tablePaginationContainer');

    if (!tableHead || !tableBody || !state.dataset) return;

    const headers = state.dataset.headers;
    const rows = state.filteredRows;

    // 1. Render Table Headers with sort indicators
    let theadHtml = '<tr><th style="width: 50px;">#</th>';
    headers.forEach(h => {
      let sortIcon = 'fa-solid fa-sort';
      if (state.sortColumn === h) {
        sortIcon = state.sortDirection === 'asc' ? 'fa-solid fa-sort-up text-primary' : 'fa-solid fa-sort-down text-primary';
      }
      theadHtml += `<th data-col="${escapeHtml(h)}">${escapeHtml(h)} <i class="${sortIcon}"></i></th>`;
    });
    theadHtml += '</tr>';
    tableHead.innerHTML = theadHtml;

    // Attach sort listeners
    tableHead.querySelectorAll('th[data-col]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-col');
        handleTableSort(col);
      });
    });

    if (rows.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="${headers.length + 1}" style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
            <i class="fa-solid fa-filter-circle-xmark" style="font-size: 2rem; margin-bottom: 0.5rem; display: block;"></i>
            No records match the current filter criteria.
          </td>
        </tr>
      `;
      if (paginationContainer) paginationContainer.innerHTML = '';
      return;
    }

    // 2. Sort rows if sort column active
    let sortedRows = [...rows];
    if (state.sortColumn) {
      const col = state.sortColumn;
      const dir = state.sortDirection === 'asc' ? 1 : -1;
      sortedRows.sort((a, b) => {
        const valA = (a[col] !== undefined && a[col] !== null) ? a[col].toString() : '';
        const valB = (b[col] !== undefined && b[col] !== null) ? b[col].toString() : '';
        
        // Numerical sort if both are valid numbers
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA.trim() !== '' && valB.trim() !== '') {
          return (numA - numB) * dir;
        }

        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' }) * dir;
      });
    }

    // 3. Paginate rows
    const totalRows = sortedRows.length;
    const totalPages = Math.ceil(totalRows / state.pageSize) || 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages;

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, totalRows);
    const pageRows = sortedRows.slice(startIndex, endIndex);

    // 4. Render Table Body Rows
    const statusCol = state.dataset.detectedColumns.statusCol;
    let tbodyHtml = '';

    pageRows.forEach((r, idx) => {
      const rowNum = startIndex + idx + 1;
      tbodyHtml += `<tr><td><span style="color: var(--text-dim); font-size: 0.75rem;">${rowNum}</span></td>`;
      headers.forEach(h => {
        const val = r[h] !== undefined ? r[h] : '';
        const lowerH = h.toLowerCase();

        if (h === statusCol || /status|log|case re-?open/i.test(lowerH)) {
          const badgeClass = getStatusBadgeClass(val);
          tbodyHtml += `<td><span class="badge-status ${badgeClass}"><i class="fa-solid fa-circle" style="font-size: 6px;"></i> ${escapeHtml(val)}</span></td>`;
        } else if (/date/i.test(lowerH)) {
          tbodyHtml += `<td style="font-family: monospace;">${escapeHtml(val)}</td>`;
        } else if (/asin/i.test(lowerH)) {
          tbodyHtml += `<td><span style="font-weight: 600; font-family: monospace; color: var(--primary);">${escapeHtml(val)}</span></td>`;
        } else if (/units|qty|quantity/i.test(lowerH)) {
          tbodyHtml += `<td style="font-weight: 600; text-align: right;">${escapeHtml(val)}</td>`;
        } else if (/case id|case number/i.test(lowerH)) {
          tbodyHtml += `<td style="font-family: monospace; color: var(--text-dim);">${escapeHtml(val)}</td>`;
        } else {
          tbodyHtml += `<td title="${escapeHtml(val)}">${escapeHtml(val)}</td>`;
        }
      });
      tbodyHtml += '</tr>';
    });
    tableBody.innerHTML = tbodyHtml;

    // 5. Render Pagination Controls
    renderPagination(totalRows, totalPages, startIndex, endIndex, paginationContainer);
  }

  function handleTableSort(col) {
    if (state.sortColumn === col) {
      state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      state.sortColumn = col;
      state.sortDirection = 'asc';
    }
    renderTable();
  }

  function renderPagination(totalRows, totalPages, startIndex, endIndex, container) {
    if (!container) return;

    let html = `
      <div class="pagination-info">
        Showing <strong>${totalRows === 0 ? 0 : startIndex + 1}</strong> to <strong>${endIndex}</strong> of <strong>${formatNumber(totalRows)}</strong> records
      </div>
      <div class="pagination-controls">
        <button class="page-btn" id="btnPageFirst" ${state.currentPage === 1 ? 'disabled' : ''} title="First Page">
          <i class="fa-solid fa-angles-left"></i>
        </button>
        <button class="page-btn" id="btnPagePrev" ${state.currentPage === 1 ? 'disabled' : ''} title="Previous Page">
          <i class="fa-solid fa-angle-left"></i>
        </button>
    `;

    // Window of pages
    const maxButtons = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      html += `
        <button class="page-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">
          ${p}
        </button>
      `;
    }

    html += `
        <button class="page-btn" id="btnPageNext" ${state.currentPage === totalPages ? 'disabled' : ''} title="Next Page">
          <i class="fa-solid fa-angle-right"></i>
        </button>
        <button class="page-btn" id="btnPageLast" ${state.currentPage === totalPages ? 'disabled' : ''} title="Last Page">
          <i class="fa-solid fa-angles-right"></i>
        </button>
      </div>
    `;

    container.innerHTML = html;

    // Attach listeners
    container.querySelectorAll('.page-btn[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentPage = parseInt(btn.getAttribute('data-page'), 10);
        renderTable();
      });
    });

    const btnFirst = container.querySelector('#btnPageFirst');
    const btnPrev = container.querySelector('#btnPagePrev');
    const btnNext = container.querySelector('#btnPageNext');
    const btnLast = container.querySelector('#btnPageLast');

    if (btnFirst) btnFirst.addEventListener('click', () => { state.currentPage = 1; renderTable(); });
    if (btnPrev) btnPrev.addEventListener('click', () => { state.currentPage--; renderTable(); });
    if (btnNext) btnNext.addEventListener('click', () => { state.currentPage++; renderTable(); });
    if (btnLast) btnLast.addEventListener('click', () => { state.currentPage = totalPages; renderTable(); });
  }

  function getStatusBadgeClass(status) {
    const s = (status || '').toLowerCase();
    if (s.includes('approved')) return 'approved';
    if (s.includes('auto ungate')) return 'auto-ungate';
    if (s === 'ungate' || s === 'ungated') return 'ungate';
    if (s.includes('under review')) return 'under-review';
    if (s.includes('review')) return 'review';
    if (s.includes('pending')) return 'pending';
    if (s.includes('invoice sub')) return 'pending';
    if (s.includes('rejected')) return 'rejected';
    if (s.includes('gated')) return 'gated';
    if (s.includes('copy') || s.includes('copylist')) return 'copy-listed';
    if (s.includes('0 case')) return 'zero-reopen';
    if (s.includes('case open')) return 'case-open';
    if (s.includes('re-open 5') || s.includes('reopen 5')) return 'case-re-open-5';
    if (s.includes('re-open 4') || s.includes('reopen 4')) return 'case-re-open-4';
    if (s.includes('re-open 3') || s.includes('reopen 3')) return 'case-re-open-3';
    if (s.includes('re-open 2') || s.includes('reopen 2')) return 'case-re-open-2';
    if (s.includes('re-open 1') || s.includes('reopen 1') || s.includes('reopen')) return 'case-re-open-1';
    if (s.includes('re-apply') || s.includes('reapply') || s.includes('re apply')) return 're-apply';
    return 'other';
  }

  /* ==========================================================================
     Reports Matrix Engine (Group By Dimension Breakdown)
     ========================================================================== */
  function initReportControls() {
    const pills = document.querySelectorAll('.report-pill-btn');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.reportDimension = pill.getAttribute('data-dim');
        renderReportBreakdown();
      });
    });

    const customSelect = document.getElementById('reportDimensionSelect');
    if (customSelect) {
      customSelect.addEventListener('change', (e) => {
        state.reportDimension = e.target.value;
        // deactivate pills
        pills.forEach(p => p.classList.remove('active'));
        renderReportBreakdown();
      });
    }

    const btnExportReport = document.getElementById('btnExportReportExcel');
    if (btnExportReport) {
      btnExportReport.addEventListener('click', exportCurrentReportMatrix);
    }
  }

  function setupReportDimensionDropdown() {
    const select = document.getElementById('reportDimensionSelect');
    if (!select || !state.dataset) return;

    let html = `<option value="">-- Choose Any Detected Column --</option>`;
    state.dataset.headers.forEach(h => {
      html += `<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`;
    });
    select.innerHTML = html;
  }

  /**
   * Render the comprehensive report breakdown table
   */
  function renderReportBreakdown() {
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    const dimTitle = document.getElementById('reportCurrentDimensionLabel');

    if (!thead || !tbody || !state.dataset) return;

    let targetDim = state.reportDimension;
    // Map dimension shortcut to actual column name in dataset
    const detected = state.dataset.detectedColumns;
    let actualCol = targetDim;

    if (targetDim === 'Company' && detected.companyCol) actualCol = detected.companyCol;
    else if (targetDim === 'Category' && detected.categoryCol) actualCol = detected.categoryCol;
    else if (targetDim === 'Supplier' && detected.supplierCol) actualCol = detected.supplierCol;
    else if (targetDim === 'Brand' && detected.brandCol) actualCol = detected.brandCol;
    else if (targetDim === 'Status' && detected.statusCol) actualCol = detected.statusCol;
    else if (targetDim === 'Case Status' && detected.caseStatusCol) actualCol = detected.caseStatusCol;
    else if (targetDim === 'Date' && detected.dateCol) actualCol = detected.dateCol;
    else if (targetDim === 'ASIN' && detected.asinCol) actualCol = detected.asinCol;

    // Check if column exists
    if (!state.dataset.headers.includes(actualCol)) {
      actualCol = state.dataset.headers[0];
    }

    if (dimTitle) {
      dimTitle.innerText = `Grouped Breakdown by: ${actualCol}`;
    }

    // Table Columns:
    // Dimension | Total Records | Approved | Review | Rejected | Ungate | Auto Ungate | Copy Listed | Pending | Success Rate
    thead.innerHTML = `
      <tr>
        <th>${escapeHtml(actualCol)}</th>
        <th style="text-align: right;">Total Records</th>
        <th style="text-align: right; color: var(--status-approved-text);">Approved</th>
        <th style="text-align: right; color: var(--status-ungate-text);">Ungate</th>
        <th style="text-align: right; color: var(--status-auto-ungate-text);">Auto Ungate</th>
        <th style="text-align: right; color: var(--status-review-text);">Review</th>
        <th style="text-align: right; color: var(--status-rejected-text);">Rejected</th>
        <th style="text-align: right; color: var(--status-copy-listed-text);">Copy Listed</th>
        <th style="text-align: right; color: var(--status-pending-text);">Pending</th>
        <th style="text-align: right;">Success Rate</th>
      </tr>
    `;

    // Grouping
    const groups = {};
    const rows = state.filteredRows;

    rows.forEach(r => {
      let key = (r[actualCol] || 'Unassigned').toString().trim();
      if (!groups[key]) {
        groups[key] = {
          dimension: key,
          total: 0,
          approved: 0,
          ungate: 0,
          autoUngate: 0,
          review: 0,
          rejected: 0,
          copyListed: 0,
          pending: 0
        };
      }

      const g = groups[key];
      g.total++;

      const s = (r._canonicalStatus || '').toLowerCase();
      if (s === 'approved') g.approved++;
      else if (s === 'ungate') g.ungate++;
      else if (s === 'auto ungate') g.autoUngate++;
      else if (s === 'review') g.review++;
      else if (s === 'rejected' || s === 'gated') g.rejected++;
      else if (s === 'copy listed') g.copyListed++;
      else if (s.includes('pending') || s.includes('invoice')) g.pending++;
    });

    const sortedGroups = Object.values(groups).sort((a, b) => b.total - a.total);

    if (sortedGroups.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No records available.</td></tr>`;
      return;
    }

    let tbodyHtml = '';
    let sumTotal = 0;
    let sumApproved = 0;
    let sumUngate = 0;
    let sumAutoUngate = 0;
    let sumReview = 0;
    let sumRejected = 0;
    let sumCopyListed = 0;
    let sumPending = 0;

    sortedGroups.forEach(g => {
      sumTotal += g.total;
      sumApproved += g.approved;
      sumUngate += g.ungate;
      sumAutoUngate += g.autoUngate;
      sumReview += g.review;
      sumRejected += g.rejected;
      sumCopyListed += g.copyListed;
      sumPending += g.pending;

      const successful = g.approved + g.ungate + g.autoUngate;
      const rate = g.total > 0 ? ((successful / g.total) * 100).toFixed(1) : '0';

      tbodyHtml += `
        <tr>
          <td style="font-weight: 600;">${escapeHtml(g.dimension)}</td>
          <td style="text-align: right; font-weight: 700;">${formatNumber(g.total)}</td>
          <td style="text-align: right; color: var(--status-approved-text);">${formatNumber(g.approved)}</td>
          <td style="text-align: right; color: var(--status-ungate-text);">${formatNumber(g.ungate)}</td>
          <td style="text-align: right; color: var(--status-auto-ungate-text);">${formatNumber(g.autoUngate)}</td>
          <td style="text-align: right; color: var(--status-review-text);">${formatNumber(g.review)}</td>
          <td style="text-align: right; color: var(--status-rejected-text);">${formatNumber(g.rejected)}</td>
          <td style="text-align: right; color: var(--status-copy-listed-text);">${formatNumber(g.copyListed)}</td>
          <td style="text-align: right; color: var(--status-pending-text);">${formatNumber(g.pending)}</td>
          <td style="text-align: right;">
            <span style="font-weight: 700; color: ${rate >= 50 ? 'var(--status-approved)' : 'var(--status-review)'};">
              ${rate}%
            </span>
          </td>
        </tr>
      `;
    });

    // Totals footer row
    const totalSuccess = sumApproved + sumUngate + sumAutoUngate;
    const overallRate = sumTotal > 0 ? ((totalSuccess / sumTotal) * 100).toFixed(1) : '0';

    tbodyHtml += `
      <tr style="background: var(--bg-tertiary); font-weight: 700; border-top: 2px solid var(--border-color);">
        <td>TOTAL OVERVIEW</td>
        <td style="text-align: right;">${formatNumber(sumTotal)}</td>
        <td style="text-align: right;">${formatNumber(sumApproved)}</td>
        <td style="text-align: right;">${formatNumber(sumUngate)}</td>
        <td style="text-align: right;">${formatNumber(sumAutoUngate)}</td>
        <td style="text-align: right;">${formatNumber(sumReview)}</td>
        <td style="text-align: right;">${formatNumber(sumRejected)}</td>
        <td style="text-align: right;">${formatNumber(sumCopyListed)}</td>
        <td style="text-align: right;">${formatNumber(sumPending)}</td>
        <td style="text-align: right; color: var(--primary);">${overallRate}%</td>
      </tr>
    `;

    tbody.innerHTML = tbodyHtml;
  }

  function exportCurrentReportMatrix() {
    if (!state.dataset) return;

    // Grab current data from table
    const targetDim = state.reportDimension || 'Group';
    const rows = [];
    const trs = document.querySelectorAll('#reportTableBody tr');

    trs.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length === 10) {
        rows.push({
          [targetDim]: tds[0].innerText,
          'Total Records': tds[1].innerText,
          'Approved': tds[2].innerText,
          'Ungate': tds[3].innerText,
          'Auto Ungate': tds[4].innerText,
          'Review': tds[5].innerText,
          'Rejected': tds[6].innerText,
          'Copy Listed': tds[7].innerText,
          'Pending': tds[8].innerText,
          'Success Rate': tds[9].innerText
        });
      }
    });

    const cols = [targetDim, 'Total Records', 'Approved', 'Ungate', 'Auto Ungate', 'Review', 'Rejected', 'Copy Listed', 'Pending', 'Success Rate'];
    DataExporter.exportReportMatrixToExcel(rows, cols, `Amazon_Ungating_${targetDim}_Breakdown.xlsx`);
  }

  /* ==========================================================================
     Export Handlers
     ========================================================================== */
  function initExportListeners() {
    const exportBtn = document.getElementById('exportDropdownBtn');
    const exportMenu = document.getElementById('exportDropdownMenu');

    if (exportBtn && exportMenu) {
      exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle('show');
      });

      document.addEventListener('click', () => {
        exportMenu.classList.remove('show');
      });
    }

    const btnExportExcel = document.getElementById('btnExportExcel');
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', () => {
        if (!state.dataset) return;
        DataExporter.exportToExcel(state.filteredRows, state.dataset.headers);
      });
    }

    const btnExportCSV = document.getElementById('btnExportCSV');
    if (btnExportCSV) {
      btnExportCSV.addEventListener('click', () => {
        if (!state.dataset) return;
        DataExporter.exportToCSV(state.filteredRows, state.dataset.headers);
      });
    }

    const btnExportPDF = document.getElementById('btnExportPDF');
    if (btnExportPDF) {
      btnExportPDF.addEventListener('click', () => {
        if (!state.dataset) return;
        DataExporter.exportToPDF(state.filteredRows, state.dataset.headers);
      });
    }
  }

  /* ==========================================================================
     Toast Notifications
     ========================================================================== */
  function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'fa-solid fa-circle-info';
    if (type === 'success') icon = 'fa-solid fa-circle-check';
    if (type === 'warning') icon = 'fa-solid fa-triangle-exclamation';
    if (type === 'error') icon = 'fa-solid fa-circle-exclamation';

    toast.innerHTML = `
      <i class="${icon}"></i>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(50px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 300);
    }, 3800);
  }

  function formatNumber(num) {
    return new Intl.NumberFormat().format(num || 0);
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

  // Self initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    init,
    loadSampleData,
    openPasteModal,
    processRawText,
    clearData,
    switchView,
    showToast
  };
})();

if (typeof window !== 'undefined') {
  window.App = App;
}
