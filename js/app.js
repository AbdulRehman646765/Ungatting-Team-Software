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
    theme: localStorage.getItem('ungate_theme') || 'light',
    softwarePillActive: 'All'
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
    initSoftwareHubListeners();

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

    // Try restoring data from localStorage first (survives page refresh)
    if (!tryRestoreFromLocalStorage()) {
      // App starts clean — user pastes their own data.
      clearData(true);
    }
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
      software: 'Software Hub & ASIN Tracker',
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
    // If switching to software hub, render it
    if (viewName === 'software') {
      renderSoftwareHub();
    }

    // Hide filter panel on paste view; show it elsewhere only if dataset is loaded
    const filterCard = document.getElementById('filterCardContainer');
    if (filterCard) {
      if (viewName === 'paste') {
        filterCard.style.display = 'none';
      } else if (state.dataset) {
        filterCard.style.display = 'block';
      }
    }
  }

  function getViewIcon(view) {
    switch (view) {
      case 'dashboard': return 'chart-pie';
      case 'software': return 'laptop-code';
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
        const chkAppend = document.getElementById('chkAppendData');
        const forceReplace = chkAppend ? !chkAppend.checked : false;
        processRawText(text, forceReplace);
        closePasteModal();
      });
    }

    // Dedicated Paste View Controls
    const btnProcessViewPaste = document.getElementById('btnProcessViewPaste');
    const viewPasteTextarea = document.getElementById('viewPasteTextarea');
    if (btnProcessViewPaste && viewPasteTextarea) {
      btnProcessViewPaste.addEventListener('click', () => {
        const text = viewPasteTextarea.value;
        if (!text.trim()) {
          showToast('Please paste some Excel data first.', 'warning');
          return;
        }
        processRawText(text, false);
      });
    }

    const btnClearViewPaste = document.getElementById('btnClearViewPaste');
    if (btnClearViewPaste && viewPasteTextarea) {
      btnClearViewPaste.addEventListener('click', () => {
        viewPasteTextarea.value = '';
        viewPasteTextarea.focus();
      });
    }

    const btnLoadSampleDedicated = document.getElementById('btnLoadSampleDedicated');
    if (btnLoadSampleDedicated) {
      btnLoadSampleDedicated.addEventListener('click', () => {
        loadSampleData();
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
    const dropZone = document.getElementById('viewPasteTextarea') || document.getElementById('view-paste');
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
   * Helper to create a unique fingerprint for a row to detect duplicates across sheets
   */
  function getRowFingerprint(row, detectedColumns) {
    const d = detectedColumns || {};
    const asin = (d.asinCol && row[d.asinCol] ? row[d.asinCol].toString().trim().toUpperCase() : '');
    const caseId = (d.caseIdCol && row[d.caseIdCol] ? row[d.caseIdCol].toString().trim() : '');
    const company = (d.companyCol && row[d.companyCol] ? row[d.companyCol].toString().trim().toLowerCase() : '');
    const brand = (d.brandCol && row[d.brandCol] ? row[d.brandCol].toString().trim().toLowerCase() : '');
    const cat = (d.categoryCol && row[d.categoryCol] ? row[d.categoryCol].toString().trim().toLowerCase() : '');
    const sup = (d.supplierCol && row[d.supplierCol] ? row[d.supplierCol].toString().trim().toLowerCase() : '');
    const date = (d.dateCol && row[d.dateCol] ? row[d.dateCol].toString().trim() : '');
    const qty = (d.unitsCol && row[d.unitsCol] !== undefined ? row[d.unitsCol].toString().trim() : '');
    const accStat = (row._canonicalAccountStatus || (d.accountStatusCol && row[d.accountStatusCol]) || '').toString().trim().toLowerCase();
    const caseLog = (row._canonicalCaseLog || (d.caseLogCol && row[d.caseLogCol]) || '').toString().trim().toLowerCase();
    const caseStat = (row._canonicalCaseStatus || (d.caseStatusCol && row[d.caseStatusCol]) || '').toString().trim().toLowerCase();

    if (asin) {
      if (caseId) {
        return `asin:${asin}|case:${caseId}|acc:${accStat}|log:${caseLog}|reopen:${caseStat}`;
      }
      return `asin:${asin}|comp:${company}|brand:${brand}|cat:${cat}|sup:${sup}|qty:${qty}|date:${date}|acc:${accStat}|log:${caseLog}|reopen:${caseStat}`;
    }

    // Fallback: concatenate all non-internal keys
    return Object.keys(row)
      .filter(k => !k.startsWith('_'))
      .sort()
      .map(k => `${k}:${(row[k] !== undefined && row[k] !== null ? row[k].toString().trim().toLowerCase() : '')}`)
      .join('|');
  }

  /**
   * Parse and ingest raw copied/uploaded text with Multi-Sheet Append and Duplicate Protection
   */
  function processRawText(rawText, forceReplace = false) {
    try {
      const parsed = DataParser.parseText(rawText);
      if (!parsed || !parsed.rows || parsed.rows.length === 0) {
        showToast('No tabular rows found in pasted data.', 'warning');
        return;
      }

      // Check if we already have an active dataset and are NOT replacing
      if (state.dataset && state.dataset.rows && state.dataset.rows.length > 0 && !forceReplace) {
        const existingFingerprints = new Set();
        state.dataset.rows.forEach(r => {
          existingFingerprints.add(getRowFingerprint(r, state.dataset.detectedColumns));
        });

        const newUniqueRows = [];
        let duplicateCount = 0;

        parsed.rows.forEach(incomingRow => {
          const fp = getRowFingerprint(incomingRow, parsed.detectedColumns || state.dataset.detectedColumns);
          if (existingFingerprints.has(fp)) {
            duplicateCount++;
          } else {
            existingFingerprints.add(fp);
            incomingRow._id = `row_${state.dataset.rows.length + newUniqueRows.length + 1}`;
            newUniqueRows.push(incomingRow);
          }
        });

        // Case 1: All incoming rows are duplicates
        if (newUniqueRows.length === 0 && duplicateCount > 0) {
          showToast(`❌ Duplicate Error: All ${duplicateCount} records already exist in dataset! No duplicates were added.`, 'error');
          return;
        }

        // Merge headers and fill missing detected column roles
        const mergedHeaders = Array.from(new Set([...state.dataset.headers, ...parsed.headers]));
        state.dataset.headers = mergedHeaders;

        if (parsed.detectedColumns) {
          Object.keys(parsed.detectedColumns).forEach(k => {
            if (!state.dataset.detectedColumns[k] && parsed.detectedColumns[k]) {
              state.dataset.detectedColumns[k] = parsed.detectedColumns[k];
            }
          });
        }

        // Append new unique rows
        state.dataset.rows.push(...newUniqueRows);
        state.dataset.totalRows = state.dataset.rows.length;
        state.dataset.totalColumns = mergedHeaders.length;

        // Reset to page 1 and apply filters
        state.filteredRows = FilterManager.filterRows(state.dataset.rows, state.dataset.detectedColumns);
        state.currentPage = 1;

        // Rebuild filter UI with combined dataset
        const filterContainer = document.getElementById('filterCardContainer');
        FilterManager.buildFilterUI(state.dataset, state.dataset.detectedColumns, filterContainer);

        // Update badge, quick stats, views, charts, and table
        updateDatasetBadge(state.dataset.totalRows, state.dataset.totalColumns);
        refreshDashboardViews();
        renderTable();
        setupReportDimensionDropdown();
        renderReportBreakdown();

        if (duplicateCount > 0) {
          showToast(`➕ Added ${newUniqueRows.length} new records! ⚠️ ${duplicateCount} duplicate records were detected and skipped.`, 'warning');
        } else {
          showToast(`➕ Added ${newUniqueRows.length} new records from sheet! Total records: ${formatNumber(state.dataset.totalRows)}`, 'success');
        }
        // Persist merged dataset to localStorage
        saveToLocalStorage();
      } else {
        // Initial load / First sheet or forced replace
        state.dataset = parsed;
        state.filteredRows = [...parsed.rows];
        state.currentPage = 1;

        updateDatasetBadge(parsed.totalRows, parsed.totalColumns);

        const filterContainer = document.getElementById('filterCardContainer');
        FilterManager.buildFilterUI(parsed, parsed.detectedColumns, filterContainer);

        refreshDashboardViews();
        renderTable();
        setupReportDimensionDropdown();
        renderReportBreakdown();

        showToast(`✅ Successfully loaded ${formatNumber(parsed.totalRows)} records across ${parsed.totalColumns} columns!`, 'success');
        // Persist dataset to localStorage so it survives page refresh
        saveToLocalStorage();
      }

      // Switch to dashboard view
      switchView('dashboard');
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to parse clipboard data. Ensure it is tabular.', 'error');
    }
  }

  function loadSampleData(silent = false) {
    const sampleTsv = DataParser.generateSampleData();
    processRawText(sampleTsv, true);
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

    // Reset Software Hub
    state.softwarePillActive = 'All';
    const swPills = document.getElementById('softwarePillsBar');
    if (swPills) swPills.innerHTML = '';
    const swKpi = document.getElementById('softwareKpiGrid');
    if (swKpi) swKpi.innerHTML = '<div class="kpi-empty">No data available. Load a dataset to see Software KPIs.</div>';
    const swTbody = document.getElementById('softwareTableBody');
    if (swTbody) swTbody.innerHTML = '<tr><td colspan="11" style="text-align:center;padding:3rem;color:var(--text-muted);">Paste or load data to view Software ASIN records.</td></tr>';
    const swBadge = document.getElementById('softwareTableCountBadge');
    if (swBadge) swBadge.textContent = 'Showing 0 ASINs';

    if (!silent) {
      showToast('All data cleared. Paste your Excel data to begin.', 'info');
    }
    // Also clear localStorage so it doesn't reload on next refresh
    try { localStorage.removeItem('ungate_dataset'); } catch (e) { /* ignore */ }
    switchView('dashboard');
  }

  /* ==========================================================================
     localStorage Persistence — Save / Restore Dataset Across Page Refreshes
     ========================================================================== */

  /**
   * Serialize current dataset to localStorage for persistence across refreshes.
   * Skips internal _* fields when saving — they are recomputed on re-parse.
   */
  function saveToLocalStorage() {
    if (!state.dataset || !state.dataset.rows || state.dataset.rows.length === 0) return;
    try {
      const payload = {
        headers: state.dataset.headers,
        rows: state.dataset.rows,
        detectedColumns: state.dataset.detectedColumns
      };
      localStorage.setItem('ungate_dataset', JSON.stringify(payload));
    } catch (e) {
      // Quota exceeded or private mode — silently ignore
      console.warn('[LocalStorage] Could not save dataset:', e.message);
    }
  }

  /**
   * On page load, attempt to restore dataset from localStorage.
   * Re-processes the raw TSV so all _canonical fields and detection logic re-run.
   * Returns true if data was restored, false otherwise.
   */
  function tryRestoreFromLocalStorage() {
    try {
      const saved = localStorage.getItem('ungate_dataset');
      if (!saved) return false;
      const obj = JSON.parse(saved);
      if (!obj || !obj.rows || obj.rows.length === 0 || !obj.headers || obj.headers.length === 0) return false;

      // Reconstruct a TSV string from saved headers + rows so DataParser can re-run detection
      const lines = [obj.headers.join('\t')];
      obj.rows.forEach(r => {
        lines.push(obj.headers.map(h => (r[h] !== undefined && r[h] !== null ? r[h] : '')).join('\t'));
      });
      const tsv = lines.join('\r\n');

      // processRawText will re-parse, rebuild state, render everything
      processRawText(tsv, true);
      return true;
    } catch (e) {
      console.warn('[LocalStorage] Could not restore dataset:', e.message);
      try { localStorage.removeItem('ungate_dataset'); } catch (_) { /* ignore */ }
      return false;
    }
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

    // If currently on software view, refresh it
    if (state.currentView === 'software') {
      renderSoftwareHub();
    }
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
          const sw = r._software || '';
          const swCls = getSoftwareCssClass(sw);
          if (swCls === 'unassigned') {
            tbodyHtml += `<td><span style="font-weight:700;font-family:'JetBrains Mono',monospace;font-size:0.82rem;">${escapeHtml(val)}</span></td>`;
          } else {
            tbodyHtml += `<td><span class="asin-cell-badge asin-software-${swCls}">${escapeHtml(val)}</span></td>`;
          }
        } else if (/software/i.test(lowerH) || h === (state.dataset && state.dataset.detectedColumns ? state.dataset.detectedColumns.softwareCol : '')) {
          const swVal = val || r._software || '';
          const swCls = getSoftwareCssClass(swVal);
          const icon = swCls === 'unassigned' ? '' : `<i class="fa-solid fa-circle" style="font-size:6px;margin-right:4px;"></i>`;
          tbodyHtml += `<td><span class="badge-software software-${swCls}">${icon}${escapeHtml(swVal || '—')}</span></td>`;
        } else if (/more[\s/_-]*less|more|less/i.test(lowerH)) {
          tbodyHtml += `<td style="font-weight: 500; color: var(--text-muted);">${escapeHtml(val || '—')}</td>`;
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
   * Render the comprehensive report breakdown table.
   * Columns are DYNAMIC — only status columns with at least 1 matching row are shown.
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
    else if (targetDim === 'Software' && detected.softwareCol) actualCol = detected.softwareCol;

    // Check if column exists
    if (!state.dataset.headers.includes(actualCol)) {
      actualCol = state.dataset.headers[0];
    }

    if (dimTitle) {
      dimTitle.innerText = `Grouped Breakdown by: ${actualCol}`;
    }

    const rows = state.filteredRows;

    // ── Step 1: Define ALL possible status columns with metadata ──────────────
    const ALL_STATUS_COLS = [
      { key: 'approved',        label: 'Approved',          cssVar: '--status-approved-text',    match: s => s === 'approved' },
      { key: 'ungate',          label: 'Ungate',            cssVar: '--status-ungate-text',      match: s => s === 'ungate' || s === 'ungated' },
      { key: 'autoUngate',      label: 'Auto Ungate',       cssVar: '--status-auto-ungate-text', match: s => s === 'auto ungate' },
      { key: 'review',          label: 'Review',            cssVar: '--status-review-text',      match: s => s === 'review' },
      { key: 'underReview',     label: 'Under Review',      cssVar: '--status-review-text',      match: s => s === 'under review' },
      { key: 'gated',           label: 'Gated',             cssVar: '--status-gated-text',       match: s => s === 'gated' },
      { key: 'rejected',        label: 'Rejected',          cssVar: '--status-rejected-text',    match: s => s === 'rejected' },
      { key: 'copyListed',      label: 'Copy Listed',       cssVar: '--status-copy-listed-text', match: s => s === 'copy listed' },
      { key: 'invSubmitted',    label: 'Invoice Submitted', cssVar: '--status-pending-text',     match: s => s === 'invoice submitted' },
      { key: 'invPending',      label: 'Invoice Pending',   cssVar: '--status-pending-text',     match: s => s === 'invoice pending' },
      { key: 'caseOpen',        label: 'Case Open',         cssVar: '--status-gated-text',       match: s => s === 'case open' },
      { key: 'caseReopen1',     label: 'Re-open 1',         cssVar: '--status-review-text',      match: s => s === 'case re-open 1' },
      { key: 'caseReopen2',     label: 'Re-open 2',         cssVar: '--status-review-text',      match: s => s === 'case re-open 2' },
      { key: 'caseReopen3',     label: 'Re-open 3',         cssVar: '--status-review-text',      match: s => s === 'case re-open 3' },
      { key: 'caseReopen4',     label: 'Re-open 4',         cssVar: '--status-review-text',      match: s => s === 'case re-open 4' },
      { key: 'caseReopen5',     label: 'Re-open 5',         cssVar: '--status-review-text',      match: s => s === 'case re-open 5' },
      { key: 'zeroReopen',      label: '0 Case Re-open',    cssVar: '--status-review-text',      match: s => s === '0 case re-open' },
      { key: 'reApply',         label: 'Re-Apply',          cssVar: '--status-review-text',      match: s => s === 're-apply' },
    ];

    // ── Step 2: Group rows and accumulate counts ───────────────────────────────
    const groups = {};

    rows.forEach(r => {
      let key = (r[actualCol] || 'Unassigned').toString().trim();
      if (!groups[key]) {
        const entry = { dimension: key, total: 0 };
        ALL_STATUS_COLS.forEach(col => { entry[col.key] = 0; });
        groups[key] = entry;
      }

      const g = groups[key];
      g.total++;

      const s = (r._canonicalStatus || '').toLowerCase();
      ALL_STATUS_COLS.forEach(col => {
        if (col.match(s)) g[col.key]++;
      });
    });

    // ── Step 3: Determine which status columns actually have data ──────────────
    const activeCols = ALL_STATUS_COLS.filter(col => {
      return Object.values(groups).some(g => g[col.key] > 0);
    });

    const sortedGroups = Object.values(groups).sort((a, b) => b.total - a.total);

    if (sortedGroups.length === 0) {
      const span = activeCols.length + 3; // dimension + total + active cols + success rate
      tbody.innerHTML = `<tr><td colspan="${span}" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No records available.</td></tr>`;
      thead.innerHTML = '';
      return;
    }

    // ── Step 4: Build header row with only active columns ─────────────────────
    let theadHtml = `<tr>
      <th>${escapeHtml(actualCol)}</th>
      <th style="text-align: center;">Total</th>`;
    activeCols.forEach(col => {
      theadHtml += `<th style="text-align: center; color: var(${col.cssVar});">${col.label}</th>`;
    });
    theadHtml += `<th style="text-align: center;">Success Rate</th></tr>`;
    thead.innerHTML = theadHtml;

    // ── Step 5: Build body rows ────────────────────────────────────────────────
    let tbodyHtml = '';
    const sums = { total: 0 };
    activeCols.forEach(col => { sums[col.key] = 0; });
    let sumSuccess = 0;

    sortedGroups.forEach(g => {
      sums.total += g.total;
      const successKeys = ['approved', 'ungate', 'autoUngate'];
      let rowSuccess = 0;
      activeCols.forEach(col => {
        sums[col.key] += g[col.key];
        if (successKeys.includes(col.key)) rowSuccess += g[col.key];
      });
      // Also count success from keys not currently active but in group
      successKeys.forEach(k => {
        if (!activeCols.find(c => c.key === k)) rowSuccess += (g[k] || 0);
      });
      sumSuccess += rowSuccess;

      const rate = g.total > 0 ? ((rowSuccess / g.total) * 100).toFixed(1) : '0';
      const rateColor = parseFloat(rate) >= 50 ? 'var(--status-approved-text, #10b981)' : 'var(--status-review-text, #f59e0b)';

      tbodyHtml += `<tr>
        <td style="font-weight: 600;">${escapeHtml(g.dimension)}</td>
        <td style="text-align: center; font-weight: 700;">${formatNumber(g.total)}</td>`;
      activeCols.forEach(col => {
        const v = g[col.key];
        tbodyHtml += `<td style="text-align: center; color: ${v > 0 ? `var(${col.cssVar})` : 'var(--text-dim)'};">${formatNumber(v)}</td>`;
      });
      tbodyHtml += `<td style="text-align: center;"><span style="font-weight: 700; color: ${rateColor};">${rate}%</span></td>
      </tr>`;
    });

    // ── Step 6: Totals footer ─────────────────────────────────────────────────
    const overallRate = sums.total > 0 ? ((sumSuccess / sums.total) * 100).toFixed(1) : '0';
    tbodyHtml += `<tr style="background: var(--bg-tertiary); font-weight: 700; border-top: 2px solid var(--border-color);">
      <td>TOTAL OVERVIEW</td>
      <td style="text-align: center;">${formatNumber(sums.total)}</td>`;
    activeCols.forEach(col => {
      tbodyHtml += `<td style="text-align: center;">${formatNumber(sums[col.key])}</td>`;
    });
    tbodyHtml += `<td style="text-align: center; color: var(--primary);">${overallRate}%</td></tr>`;

    tbody.innerHTML = tbodyHtml;

    // Expose active columns for export
    renderReportBreakdown._activeCols = activeCols;
    renderReportBreakdown._actualCol = actualCol;
  }

  function exportCurrentReportMatrix() {
    if (!state.dataset) return;

    // Use the active columns recorded by the last renderReportBreakdown call
    const activeCols = renderReportBreakdown._activeCols || [];
    const actualCol  = renderReportBreakdown._actualCol || state.reportDimension || 'Group';

    const colLabels = [actualCol, 'Total', ...activeCols.map(c => c.label), 'Success Rate'];
    const rows = [];

    const trs = document.querySelectorAll('#reportTableBody tr');
    trs.forEach(tr => {
      const tds = tr.querySelectorAll('td');
      if (tds.length === colLabels.length) {
        const obj = {};
        colLabels.forEach((label, i) => {
          obj[label] = tds[i].innerText.trim();
        });
        rows.push(obj);
      }
    });

    DataExporter.exportReportMatrixToExcel(rows, colLabels, `Amazon_Ungating_${actualCol}_Breakdown.xlsx`);
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

    // Export JSON Backup
    const btnExportJSON = document.getElementById('btnExportJSON');
    if (btnExportJSON) {
      btnExportJSON.addEventListener('click', () => {
        if (!state.dataset || state.filteredRows.length === 0) {
          showToast('No data available to export.', 'warning');
          return;
        }
        DataExporter.exportToJSON(state.filteredRows, state.dataset.headers);
        showToast('JSON dataset exported successfully!', 'success');
      });
    }

    // Export Ungated Records Only
    const btnExportUngated = document.getElementById('btnExportUngatedExcel');
    if (btnExportUngated) {
      btnExportUngated.addEventListener('click', () => {
        if (!state.dataset || state.filteredRows.length === 0) {
          showToast('No data available to export.', 'warning');
          return;
        }
        DataExporter.exportUngatedOnly(state.filteredRows, state.dataset.headers);
      });
    }

    // Export Gated Records Only
    const btnExportGated = document.getElementById('btnExportGatedExcel');
    if (btnExportGated) {
      btnExportGated.addEventListener('click', () => {
        if (!state.dataset || state.filteredRows.length === 0) {
          showToast('No data available to export.', 'warning');
          return;
        }
        DataExporter.exportGatedOnly(state.filteredRows, state.dataset.headers);
      });
    }

    // Import JSON File
    const btnImportJSON = document.getElementById('btnImportJSON');
    const jsonFileInput = document.getElementById('jsonFileInput');
    if (btnImportJSON && jsonFileInput) {
      btnImportJSON.addEventListener('click', () => {
        jsonFileInput.value = '';
        jsonFileInput.click();
      });

      jsonFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const rawJson = evt.target.result;
            const parsedArray = JSON.parse(rawJson);
            let rows = Array.isArray(parsedArray) ? parsedArray : (parsedArray.rows || []);
            if (!rows || rows.length === 0) {
              showToast('No valid records found in JSON file.', 'warning');
              return;
            }

            const headers = Object.keys(rows[0]).filter(k => !k.startsWith('_'));
            const tsvLines = [headers.join('\t')];
            rows.forEach(r => {
              tsvLines.push(headers.map(h => r[h] !== undefined ? r[h] : '').join('\t'));
            });
            const tsvText = tsvLines.join('\r\n');
            processRawText(tsvText, true);
            showToast(`Loaded ${rows.length} records from JSON backup!`, 'success');
          } catch (err) {
            console.error(err);
            showToast('Failed to parse JSON file. Ensure it is valid JSON.', 'error');
          }
        };
        reader.readAsText(file);
      });
    }

    const btnExportClickUp = document.getElementById('btnExportClickUp');
    if (btnExportClickUp) {
      btnExportClickUp.addEventListener('click', () => {
        if (!state.dataset || state.filteredRows.length === 0) {
          showToast('No data available to generate ClickUp report.', 'warning');
          return;
        }
        const reportText = DataExporter.generateClickUpReport(
          state.filteredRows,
          state.dataset.detectedColumns,
          state.statusStats
        );
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(reportText).then(() => {
            showToast('ClickUp summary report copied to clipboard!', 'success');
          }).catch(() => {
            copyFallback(reportText);
          });
        } else {
          copyFallback(reportText);
        }
      });
    }

    function copyFallback(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showToast('ClickUp summary report copied to clipboard!', 'success');
      } catch (e) {
        showToast('Unable to auto-copy. Please export via CSV/Excel.', 'error');
      }
      document.body.removeChild(ta);
    }
  }

  /* ==========================================================================
     Software CSS Helper
     ========================================================================== */
  /**
   * Returns a CSS class suffix for a given software name.
   * Used to apply color badges in the table and Software Hub.
   */
  function getSoftwareCssClass(name) {
    const n = (name || '').toLowerCase().trim();
    if (/orbit-?n/i.test(n)) return 'orbit-n';
    if (/orbit-?b/i.test(n)) return 'orbit-b';
    if (/orbit-?a/i.test(n)) return 'orbit-a';
    if (/aura/i.test(n)) return 'aura';
    if (/shipment/i.test(n)) return 'shipment';
    if (n) return 'other';
    return 'unassigned';
  }

  /* ==========================================================================
     Software Hub — Render & Listeners
     ========================================================================== */
  /**
   * Render the entire Software Hub view: pills, KPIs, charts, ASIN table.
   */
  function renderSoftwareHub() {
    if (!state.dataset) return;

    const rows = state.filteredRows;
    const softwareCol = state.dataset.detectedColumns.softwareCol;
    const asinCol = state.dataset.detectedColumns.asinCol;
    const statusCol2 = state.dataset.detectedColumns.statusCol;

    // --- Build software counts map ---
    const swMap = {}; // { softwareName: { total, approved, rows[] } }
    rows.forEach(r => {
      const sw = r._software || (softwareCol ? (r[softwareCol] || '') : '') || '';
      const label = sw.trim() || 'Unassigned';
      if (!swMap[label]) swMap[label] = { total: 0, approved: 0, rows: [] };
      swMap[label].total++;
      swMap[label].rows.push(r);
      const s = (r._canonicalStatus || '').toLowerCase();
      if (s === 'approved' || s === 'ungate' || s === 'auto ungate') swMap[label].approved++;
    });

    const swNames = Object.keys(swMap).sort((a, b) => swMap[b].total - swMap[a].total);

    // --- Pills Bar ---
    const pillsBar = document.getElementById('softwarePillsBar');
    if (pillsBar) {
      const active = state.softwarePillActive || 'All';
      let pillsHtml = `<button class="software-pill-btn ${active === 'All' ? 'active' : ''}" data-sw="All">
        <i class="fa-solid fa-layer-group"></i> All <span class="pill-count">${rows.length}</span>
      </button>`;
      swNames.forEach(sw => {
        const cls = getSoftwareCssClass(sw);
        const isActive = active === sw;
        pillsHtml += `<button class="software-pill-btn software-pill-${cls} ${isActive ? 'active' : ''}" data-sw="${escapeHtml(sw)}">
          <i class="fa-solid fa-circle" style="font-size:7px;"></i> ${escapeHtml(sw)} <span class="pill-count">${swMap[sw].total}</span>
        </button>`;
      });
      pillsBar.innerHTML = pillsHtml;

      // Re-attach pill click events
      pillsBar.querySelectorAll('.software-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.softwarePillActive = btn.getAttribute('data-sw');
          renderSoftwareHub();
        });
      });
    }

    // --- Determine active rows for selected pill ---
    const activePill = state.softwarePillActive || 'All';
    let activeRows = rows;
    if (activePill !== 'All') {
      activeRows = (swMap[activePill] || { rows: [] }).rows;
    }

    // --- KPI Grid ---
    const kpiGrid = document.getElementById('softwareKpiGrid');
    if (kpiGrid) {
      const displayNames = activePill === 'All' ? swNames : [activePill];
      let kpiHtml = '';
      displayNames.forEach(sw => {
        const d = swMap[sw] || { total: 0, approved: 0 };
        const rate = d.total > 0 ? ((d.approved / d.total) * 100).toFixed(1) : '0.0';
        const cls = getSoftwareCssClass(sw);
        kpiHtml += `
          <div class="software-kpi-card software-kpi-${cls}">
            <div class="kpi-sw-label"><span class="badge-software software-${cls}"><i class="fa-solid fa-circle" style="font-size:6px;margin-right:4px;"></i>${escapeHtml(sw)}</span></div>
            <div class="kpi-sw-total">${formatNumber(d.total)}</div>
            <div class="kpi-sw-sub">ASINs &bull; <strong>${rate}%</strong> Success</div>
            <div class="kpi-sw-bar-wrap"><div class="kpi-sw-bar" style="width:${rate}%"></div></div>
          </div>`;
      });
      if (!kpiHtml) kpiHtml = `<div class="kpi-empty">No data available. Load a dataset to see Software KPIs.</div>`;
      kpiGrid.innerHTML = kpiHtml;
    }

    // --- Charts ---
    if (typeof ChartManager !== 'undefined') {
      ChartManager.renderSoftwareShareChart(rows, swMap);
      ChartManager.renderSoftwarePerformanceChart(rows, swMap);
    }

    // --- ASIN Table ---
    renderSoftwareTable(activeRows, state.dataset.detectedColumns);

    // --- Count badge ---
    const countBadge = document.getElementById('softwareTableCountBadge');
    if (countBadge) countBadge.textContent = `${activeRows.length} ASINs`;
  }

  /**
   * Render the filtered ASIN table inside Software Hub.
   */
  function renderSoftwareTable(rows, detectedColumns, searchTerm) {
    const tbody = document.getElementById('softwareTableBody');
    if (!tbody) return;

    const d = detectedColumns || (state.dataset ? state.dataset.detectedColumns : {});
    const search = (searchTerm || '').toLowerCase().trim();
    let filtered = rows;
    if (search) {
      filtered = rows.filter(r => {
        const asin = d.asinCol ? (r[d.asinCol] || '') : '';
        const sw = r._software || (d.softwareCol ? (r[d.softwareCol] || '') : '') || '';
        const comp = d.companyCol ? (r[d.companyCol] || '') : '';
        const brand = d.brandCol ? (r[d.brandCol] || '') : '';
        const status = r._canonicalStatus || '';
        return asin.toLowerCase().includes(search) ||
               sw.toLowerCase().includes(search) ||
               comp.toLowerCase().includes(search) ||
               brand.toLowerCase().includes(search) ||
               status.toLowerCase().includes(search);
      });
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:var(--text-dim);padding:2rem;">No ASINs found for current software filter.</td></tr>`;
      return;
    }

    let html = '';
    filtered.forEach((r, i) => {
      const asin = d.asinCol ? (r[d.asinCol] || '—') : '—';
      const sw = r._software || (d.softwareCol ? (r[d.softwareCol] || '') : '') || 'Unassigned';
      const swCls = getSoftwareCssClass(sw);
      const date = d.dateCol ? (r[d.dateCol] || '') : '';
      const comp = d.companyCol ? (r[d.companyCol] || '—') : '—';
      const brand = d.brandCol ? (r[d.brandCol] || '—') : '—';
      const qty = d.unitsCol && r[d.unitsCol] !== undefined ? r[d.unitsCol] : '—';
      const accStat = r._canonicalAccountStatus || (d.accountStatusCol ? (r[d.accountStatusCol] || '—') : '—');
      const caseLog = r._canonicalCaseLog || (d.caseLogCol ? (r[d.caseLogCol] || '—') : '—');
      const caseReopen = r._canonicalCaseStatus || (d.caseStatusCol ? (r[d.caseStatusCol] || '—') : '—');
      const caseId = d.caseIdCol ? (r[d.caseIdCol] || '—') : '—';

      html += `<tr>
        <td style="color:var(--text-dim);font-size:0.75rem;">${i + 1}</td>
        <td><span class="asin-cell-badge asin-software-${swCls}">${escapeHtml(asin)}</span></td>
        <td><span class="badge-software software-${swCls}"><i class="fa-solid fa-circle" style="font-size:6px;margin-right:4px;"></i>${escapeHtml(sw)}</span></td>
        <td style="font-family:monospace;font-size:0.8rem;color:var(--text-dim);">${escapeHtml(date)}</td>
        <td title="${escapeHtml(comp)}">${escapeHtml(comp)}</td>
        <td title="${escapeHtml(brand)}">${escapeHtml(brand)}</td>
        <td style="font-weight:600;text-align:right;">${escapeHtml(qty)}</td>
        <td><span class="badge-status ${getStatusBadgeClass(accStat)}"><i class="fa-solid fa-circle" style="font-size:6px;"></i> ${escapeHtml(accStat)}</span></td>
        <td><span class="badge-status ${getStatusBadgeClass(caseLog)}"><i class="fa-solid fa-circle" style="font-size:6px;"></i> ${escapeHtml(caseLog)}</span></td>
        <td><span class="badge-status ${getStatusBadgeClass(caseReopen)}"><i class="fa-solid fa-circle" style="font-size:6px;"></i> ${escapeHtml(caseReopen)}</span></td>
        <td style="font-family:monospace;color:var(--text-dim);">${escapeHtml(caseId)}</td>
      </tr>`;
    });
    tbody.innerHTML = html;
  }

  /**
   * Initialize Software Hub event listeners (called once on init).
   */
  function initSoftwareHubListeners() {
    // Search input for software ASIN table
    const searchInput = document.getElementById('softwareTableSearch');
    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          if (!state.dataset) return;
          const d = state.dataset.detectedColumns;
          const rowsToFilter = state.softwarePillActive === 'All'
            ? state.filteredRows
            : state.filteredRows.filter(r => (r._software || (d.softwareCol ? (r[d.softwareCol] || '') : '') || '') === state.softwarePillActive || ((r._software || '') === '' && state.softwarePillActive === 'Unassigned'));
          renderSoftwareTable(rowsToFilter, d, searchInput.value);
        }, 250);
      });
    }

    // Copy ASINs for current software selection
    const btnCopy = document.getElementById('btnCopySoftwareAsins');
    if (btnCopy) {
      btnCopy.addEventListener('click', () => {
        if (!state.dataset) { showToast('No data loaded.', 'warning'); return; }
        const d = state.dataset.detectedColumns;
        const active = state.softwarePillActive || 'All';
        const rows = active === 'All' ? state.filteredRows : state.filteredRows.filter(r => {
          const sw = r._software || (d.softwareCol ? (r[d.softwareCol] || '') : '') || 'Unassigned';
          return sw === active;
        });
        const asins = rows.map(r => d.asinCol ? (r[d.asinCol] || '') : '').filter(Boolean);
        if (!asins.length) { showToast('No ASINs to copy.', 'warning'); return; }
        const text = asins.join('\n');
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showToast(`${asins.length} ASINs copied!`, 'success'); }
        catch (e) { showToast('Copy failed. Please copy manually.', 'error'); }
        document.body.removeChild(ta);
      });
    }

    // Export Excel for current software selection
    const btnExport = document.getElementById('btnExportSoftwareExcel');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        if (!state.dataset) { showToast('No data loaded.', 'warning'); return; }
        const d = state.dataset.detectedColumns;
        const active = state.softwarePillActive || 'All';
        const rows = active === 'All' ? state.filteredRows : state.filteredRows.filter(r => {
          const sw = r._software || (d.softwareCol ? (r[d.softwareCol] || '') : '') || 'Unassigned';
          return sw === active;
        });
        if (!rows.length) { showToast('No data to export.', 'warning'); return; }
        if (typeof DataExporter !== 'undefined') {
          DataExporter.exportToExcel(rows, state.dataset.headers, `Software_${active.replace(/\s+/g, '_')}.xlsx`);
        }
      });
    }

    // Export PDF for current software selection
    const btnExportPDF = document.getElementById('btnExportSoftwarePDF');
    if (btnExportPDF) {
      btnExportPDF.addEventListener('click', () => {
        if (!state.dataset) { showToast('No data loaded.', 'warning'); return; }
        const d = state.dataset.detectedColumns;
        const active = state.softwarePillActive || 'All';
        const rows = active === 'All' ? state.filteredRows : state.filteredRows.filter(r => {
          const sw = r._software || (d.softwareCol ? (r[d.softwareCol] || '') : '') || 'Unassigned';
          return sw === active;
        });
        if (!rows.length) { showToast('No data to export.', 'warning'); return; }
        if (typeof DataExporter !== 'undefined') {
          DataExporter.exportToPDF(rows, state.dataset.headers, `Amazon Ungating - Software Report (${active})`);
        }
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
    showToast,
    getState: () => state
  };
})();

if (typeof window !== 'undefined') {
  window.App = App;
}
