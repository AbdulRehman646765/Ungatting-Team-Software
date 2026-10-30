/**
 * dashboard.js
 * Dashboard Metrics & Summary KPI Engine for Amazon Ungating Analytics.
 * Renders core stat cards, dynamic custom status cards, and status badge ribbon.
 */

var DashboardManager = (function () {
  'use strict';

  // Predefined cards configuration with icon, color theme, and sorting order
  const CORE_STATUS_CONFIG = [
    { key: 'Total Records',       label: 'Total Records',       icon: 'fa-solid fa-database',               color: '#4f46e5', light: 'rgba(79, 70, 229, 0.12)' },
    { key: 'Approved',            label: 'Approved',            icon: 'fa-solid fa-circle-check',           color: '#10b981', light: 'rgba(16, 185, 129, 0.12)' },
    { key: 'Ungate',              label: 'Ungate',              icon: 'fa-solid fa-lock-open',              color: '#059669', light: 'rgba(5, 150, 105, 0.12)' },
    { key: 'Auto Ungate',         label: 'Auto Ungate',         icon: 'fa-solid fa-bolt',                   color: '#8b5cf6', light: 'rgba(139, 92, 246, 0.12)' },
    { key: 'Gated',               label: 'Gated',               icon: 'fa-solid fa-lock',                   color: '#dc2626', light: 'rgba(220, 38, 38, 0.12)' },
    { key: 'Copy Listed',         label: 'Copy Listed',         icon: 'fa-solid fa-clone',                  color: '#06b6d4', light: 'rgba(6, 182, 212, 0.12)' },
    { key: 'Review',              label: 'Under Review',        icon: 'fa-solid fa-clock-rotate-left',      color: '#f59e0b', light: 'rgba(245, 158, 11, 0.12)' },
    { key: 'Under Review',        label: 'Under Review (Log)',  icon: 'fa-solid fa-magnifying-glass-clock', color: '#fb923c', light: 'rgba(251, 146, 60, 0.12)' },
    { key: 'Invoice Submitted',   label: 'Invoice Submitted',   icon: 'fa-solid fa-file-invoice-dollar',    color: '#0284c7', light: 'rgba(2, 132, 199, 0.12)' },
    { key: 'Invoice Pending',     label: 'Invoice Pending',     icon: 'fa-solid fa-hourglass-half',         color: '#eab308', light: 'rgba(234, 179, 8, 0.12)' },
    { key: 'Rejected',            label: 'Rejected',            icon: 'fa-solid fa-circle-xmark',           color: '#ef4444', light: 'rgba(239, 68, 68, 0.12)' },
    { key: 'Case Open',           label: 'Case Open',           icon: 'fa-solid fa-folder-open',            color: '#3b82f6', light: 'rgba(59, 130, 246, 0.12)' },
    { key: '0 Case Re-open',      label: '0 Case Re-open',      icon: 'fa-solid fa-folder',                 color: '#64748b', light: 'rgba(100, 116, 139, 0.12)' },
    { key: 'Case Re-open 1',      label: 'Case Re-open 1',      icon: 'fa-solid fa-arrow-rotate-right',     color: '#6366f1', light: 'rgba(99, 102, 241, 0.12)' },
    { key: 'Case Re-open 2',      label: 'Case Re-open 2',      icon: 'fa-solid fa-arrows-rotate',          color: '#a855f7', light: 'rgba(168, 85, 247, 0.12)' },
    { key: 'Case Re-open 3',      label: 'Case Re-open 3',      icon: 'fa-solid fa-rotate',                 color: '#d946ef', light: 'rgba(217, 70, 239, 0.12)' },
    { key: 'Case Re-open 4',      label: 'Case Re-open 4',      icon: 'fa-solid fa-rotate-left',            color: '#ec4899', light: 'rgba(236, 72, 153, 0.12)' },
    { key: 'Case Re-open 5',      label: 'Case Re-open 5',      icon: 'fa-solid fa-rotate-right',           color: '#f43f5e', light: 'rgba(244, 63, 94, 0.12)' },
    { key: 'Re-Apply',            label: 'Re-Apply',            icon: 'fa-solid fa-repeat',                 color: '#d97706', light: 'rgba(217, 119, 6, 0.12)' },
  ];

  /**
   * Compute comprehensive status distributions from rows
   */
  function computeStatusCounts(rows, detectedColumns) {
    const counts = {
      'Total Records': rows.length
    };

    // Initialize all core status keys with 0
    CORE_STATUS_CONFIG.forEach(item => {
      if (item.key !== 'Total Records') {
        counts[item.key] = 0;
      }
    });

    const otherStatuses = {};

    rows.forEach(r => {
      // Gather all distinct canonical status signals for this row (Account Status, Case Log, Case Re-open)
      const rowStatuses = new Set(
        [
          r._canonicalStatus,
          r._canonicalAccountStatus,
          r._canonicalCaseLog,
          r._canonicalCaseStatus
        ].filter(Boolean)
      );

      rowStatuses.forEach(s => {
        if (counts[s] !== undefined) {
          counts[s]++;
        } else if (s !== 'Unknown' && s !== 'None' && s !== 'Resolved') {
          otherStatuses[s] = (otherStatuses[s] || 0) + 1;
        }
      });

      // If a row has Under Review in Case Status, ensure it also counts towards the general Review metric
      if (rowStatuses.has('Under Review') && !rowStatuses.has('Review')) {
        counts['Review']++;
      }
    });

    return { counts, otherStatuses, total: rows.length };
  }

  /**
   * Render dashboard metric cards grid
   */
  function renderMetrics(containerElement, rows, detectedColumns) {
    if (!containerElement) return;

    if (!rows || rows.length === 0) {
      containerElement.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon"><i class="fa-solid fa-box-open"></i></div>
          <div class="empty-state-title">No Data to Display</div>
          <div class="empty-state-desc">Paste your Excel ungating data or click "Load Sample Data" to view dashboard analytics.</div>
        </div>
      `;
      return;
    }

    const { counts, otherStatuses, total } = computeStatusCounts(rows, detectedColumns);

    let cardsHtml = '';

    // Render Core Status Cards — only show Total Records always; all others only if count > 0
    CORE_STATUS_CONFIG.forEach(cfg => {
      const value = counts[cfg.key] || 0;
      const isTotal = cfg.key === 'Total Records';

      // Skip zero-count cards (except Total Records which always shows)
      if (!isTotal && value === 0) return;

      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
      cardsHtml += `
        <div class="stat-card" style="--card-accent: ${cfg.color}; --card-light: ${cfg.light};">
          <div class="stat-card-top">
            <span class="stat-label" title="${escapeHtml(cfg.label)}">${escapeHtml(cfg.label)}</span>
            <div class="stat-icon">
              <i class="${cfg.icon}"></i>
            </div>
          </div>
          <div class="stat-card-middle">
            <div class="stat-value">${formatNumber(value)}</div>
            ${!isTotal ? `<span class="stat-badge">${percentage}%</span>` : `<span class="stat-badge">100%</span>`}
          </div>
          <div class="stat-card-bottom">
            <div class="stat-progress-bar">
              <div class="stat-progress-fill" style="width: ${isTotal ? 100 : percentage}%;"></div>
            </div>
          </div>
        </div>
      `;
    });

    // Render Dynamic / Other Detected Statuses Cards
    Object.entries(otherStatuses).forEach(([otherStatus, val]) => {
      if (!otherStatus || otherStatus === 'Unknown') return;
      const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0';
      const hue = Math.abs(hashString(otherStatus)) % 360;
      const color = `hsl(${hue}, 70%, 50%)`;
      const light = `hsla(${hue}, 70%, 50%, 0.12)`;

      cardsHtml += `
        <div class="stat-card" style="--card-accent: ${color}; --card-light: ${light};">
          <div class="stat-card-top">
            <span class="stat-label" title="${escapeHtml(otherStatus)}">${escapeHtml(otherStatus)} (Detected)</span>
            <div class="stat-icon">
              <i class="fa-solid fa-tag"></i>
            </div>
          </div>
          <div class="stat-card-middle">
            <div class="stat-value">${formatNumber(val)}</div>
            <span class="stat-badge">${pct}%</span>
          </div>
          <div class="stat-card-bottom">
            <div class="stat-progress-bar">
              <div class="stat-progress-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
        </div>
      `;
    });

    containerElement.innerHTML = cardsHtml;
  }

  /**
   * Render dynamic status ribbon / chip bar for quick clicking and visual overview
   */
  function renderStatusRibbon(containerElement, rows, detectedColumns) {
    if (!containerElement) return;

    if (!rows || rows.length === 0) {
      containerElement.style.display = 'none';
      return;
    }

    containerElement.style.display = 'block';
    const { counts, otherStatuses, total } = computeStatusCounts(rows, detectedColumns);

    const activeList = [];

    // Collect all statuses that have count > 0
    CORE_STATUS_CONFIG.forEach(cfg => {
      if (cfg.key === 'Total Records') return;
      const count = counts[cfg.key] || 0;
      if (count > 0) {
        activeList.push({ name: cfg.key, count, color: cfg.color });
      }
    });

    Object.entries(otherStatuses).forEach(([name, count]) => {
      if (count > 0 && name !== 'Unknown') {
        const hue = Math.abs(hashString(name)) % 360;
        activeList.push({ name, count, color: `hsl(${hue}, 70%, 50%)` });
      }
    });

    let html = `
      <div class="ribbon-title">
        <span><i class="fa-solid fa-chart-pie me-1"></i> Detected Status Breakdown (${activeList.length} unique statuses)</span>
        <span style="font-size: 0.75rem; color: var(--text-dim);">Click chip to filter</span>
      </div>
      <div class="status-chips-container">
    `;

    activeList.forEach(item => {
      const pct = total > 0 ? ((item.count / total) * 100).toFixed(0) : 0;
      html += `
        <div class="status-chip" data-status-filter="${escapeHtml(item.name)}">
          <span class="status-chip-dot" style="background-color: ${item.color};"></span>
          <span>${escapeHtml(item.name)}</span>
          <span class="status-chip-count">${formatNumber(item.count)} (${pct}%)</span>
        </div>
      `;
    });

    html += `</div>`;
    containerElement.innerHTML = html;

    // Attach click listener to status chips to filter immediately
    containerElement.querySelectorAll('.status-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const statusName = chip.getAttribute('data-status-filter');
        if (typeof FilterManager !== 'undefined') {
          FilterManager.setFilter('status', statusName);
          const filterSelect = document.getElementById('filterStatus');
          if (filterSelect) filterSelect.value = statusName;
        }
      });
    });
  }

  function formatNumber(num) {
    return new Intl.NumberFormat().format(num || 0);
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash;
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
    renderMetrics,
    renderStatusRibbon,
    computeStatusCounts,
    CORE_STATUS_CONFIG
  };
})();

if (typeof window !== 'undefined') {
  window.DashboardManager = DashboardManager;
}
