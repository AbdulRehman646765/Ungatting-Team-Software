/**
 * charts.js
 * Chart.js Visualization Engine for Amazon Ungating Analytics.
 * Generates interactive, responsive charts with theme switching and dynamic updates.
 */

var ChartManager = (function () {
  'use strict';

  // Store active Chart.js instances
  let charts = {
    statusChart: null,
    companyChart: null,
    categoryChart: null,
    supplierChart: null,
    trendChart: null
  };

  // Color Palettes
  const STATUS_COLORS = {
    'Approved': '#10b981',
    'Ungate': '#059669',
    'Auto Ungate': '#8b5cf6',
    'Review': '#f59e0b',
    'Invoice Pending': '#eab308',
    'Rejected': '#ef4444',
    'Gated': '#dc2626',
    'Copy Listed': '#06b6d4',
    'Invoice Submitted': '#0284c7',
    'Case Open': '#3b82f6',
    'Case Re-open 1': '#6366f1',
    'Case Re-open 2': '#a855f7',
    'Re-Apply': '#d97706',
    'Other': '#64748b'
  };

  const VIBRANT_PALETTE = [
    '#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', 
    '#8b5cf6', '#3b82f6', '#14b8a6', '#f97316', '#6366f1'
  ];

  function getThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      textColor: isDark ? '#f8fafc' : '#1e293b',
      textMuted: isDark ? '#94a3b8' : '#64748b',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
      cardBg: isDark ? '#1e293b' : '#ffffff'
    };
  }

  /**
   * Destroy existing charts safely
   */
  function destroyAll() {
    Object.keys(charts).forEach(key => {
      if (charts[key]) {
        charts[key].destroy();
        charts[key] = null;
      }
    });
  }

  /**
   * Render or update all charts with the filtered rows
   */
  function updateCharts(rows, detectedColumns) {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js is not loaded.');
      return;
    }

    if (!rows || rows.length === 0) {
      destroyAll();
      return;
    }

    const theme = getThemeColors();

    renderStatusChart(rows, theme);
    renderCompanyChart(rows, detectedColumns, theme);
    renderCategoryChart(rows, detectedColumns, theme);
    renderSupplierChart(rows, detectedColumns, theme);
    renderTrendChart(rows, detectedColumns, theme);
  }

  /**
   * 1. Status Distribution (Doughnut / Pie Chart)
   */
  function renderStatusChart(rows, theme) {
    const canvas = document.getElementById('chartStatus');
    if (!canvas) return;

    if (charts.statusChart) charts.statusChart.destroy();

    const counts = {};
    rows.forEach(r => {
      const s = r._canonicalStatus || 'Other';
      counts[s] = (counts[s] || 0) + 1;
    });

    const labels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    const data = labels.map(l => counts[l]);
    const bgColors = labels.map(l => STATUS_COLORS[l] || generateColorForString(l));

    charts.statusChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: bgColors,
          borderWidth: 2,
          borderColor: theme.cardBg,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: theme.textColor,
              font: { family: 'Inter', size: 11, weight: '500' },
              boxWidth: 12,
              padding: 10
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const val = ctx.parsed;
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${ctx.label}: ${val} (${pct}%)`;
              }
            }
          }
        },
        cutout: '62%'
      }
    });
  }

  /**
   * 2. Company Comparison (Stacked Bar Chart: Approved vs Other Statuses)
   */
  function renderCompanyChart(rows, detectedColumns, theme) {
    const canvas = document.getElementById('chartCompany');
    if (!canvas) return;

    if (charts.companyChart) charts.companyChart.destroy();

    const compCol = detectedColumns.companyCol;
    if (!compCol) {
      showEmptyChartMessage(canvas, 'No Company column detected in dataset');
      return;
    }

    // Aggregate by Company
    const compMap = {};
    rows.forEach(r => {
      const comp = (r[compCol] || 'Unknown Company').trim();
      const status = r._canonicalStatus || 'Other';
      if (!compMap[comp]) {
        compMap[comp] = { Approved: 0, Review: 0, Rejected: 0, Other: 0, total: 0 };
      }
      compMap[comp].total++;
      if (status === 'Approved' || status === 'Ungate' || status === 'Auto Ungate') {
        compMap[comp].Approved++;
      } else if (status === 'Review' || status.includes('Pending')) {
        compMap[comp].Review++;
      } else if (status === 'Rejected' || status === 'Gated') {
        compMap[comp].Rejected++;
      } else {
        compMap[comp].Other++;
      }
    });

    // Top 8 companies by total volume
    const sortedComps = Object.keys(compMap)
      .sort((a, b) => compMap[b].total - compMap[a].total)
      .slice(0, 8);

    charts.companyChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sortedComps,
        datasets: [
          {
            label: 'Approved / Ungated',
            data: sortedComps.map(c => compMap[c].Approved),
            backgroundColor: '#10b981',
            borderRadius: 4
          },
          {
            label: 'In Review / Pending',
            data: sortedComps.map(c => compMap[c].Review),
            backgroundColor: '#f59e0b',
            borderRadius: 4
          },
          {
            label: 'Rejected / Gated',
            data: sortedComps.map(c => compMap[c].Rejected),
            backgroundColor: '#ef4444',
            borderRadius: 4
          },
          {
            label: 'Other / In Process',
            data: sortedComps.map(c => compMap[c].Other),
            backgroundColor: '#6366f1',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            ticks: { color: theme.textMuted, font: { family: 'Inter', size: 11 } },
            grid: { display: false }
          },
          y: {
            stacked: true,
            ticks: { color: theme.textMuted, font: { family: 'Inter', size: 11 } },
            grid: { color: theme.gridColor }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: theme.textColor, font: { family: 'Inter', size: 11 }, boxWidth: 12 }
          }
        }
      }
    });
  }

  /**
   * 3. Category Breakdown (Horizontal Bar Chart)
   */
  function renderCategoryChart(rows, detectedColumns, theme) {
    const canvas = document.getElementById('chartCategory');
    if (!canvas) return;

    if (charts.categoryChart) charts.categoryChart.destroy();

    const catCol = detectedColumns.categoryCol;
    if (!catCol) {
      showEmptyChartMessage(canvas, 'No Category column detected in dataset');
      return;
    }

    const catCounts = {};
    rows.forEach(r => {
      const cat = (r[catCol] || 'Uncategorized').trim();
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const sortedCats = Object.keys(catCounts)
      .sort((a, b) => catCounts[b] - catCounts[a])
      .slice(0, 10);

    charts.categoryChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: sortedCats,
        datasets: [{
          label: 'Records',
          data: sortedCats.map(c => catCounts[c]),
          backgroundColor: '#06b6d4',
          borderRadius: 5
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: theme.textMuted, font: { family: 'Inter', size: 11 } },
            grid: { color: theme.gridColor }
          },
          y: {
            ticks: { color: theme.textColor, font: { family: 'Inter', size: 11, weight: '500' } },
            grid: { display: false }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  /**
   * 4. Supplier Performance (Grouped Bar Chart showing Success vs Rejections)
   */
  function renderSupplierChart(rows, detectedColumns, theme) {
    const canvas = document.getElementById('chartSupplier');
    if (!canvas) return;

    if (charts.supplierChart) charts.supplierChart.destroy();

    const supCol = detectedColumns.supplierCol;
    if (!supCol) {
      showEmptyChartMessage(canvas, 'No Supplier column detected in dataset');
      return;
    }

    const supMap = {};
    rows.forEach(r => {
      const sup = (r[supCol] || 'Unknown Supplier').trim();
      const status = r._canonicalStatus || 'Other';
      if (!supMap[sup]) {
        supMap[sup] = { approved: 0, rejected: 0, review: 0, total: 0 };
      }
      supMap[sup].total++;
      if (status === 'Approved' || status === 'Ungate' || status === 'Auto Ungate') {
        supMap[sup].approved++;
      } else if (status === 'Rejected' || status === 'Gated') {
        supMap[sup].rejected++;
      } else {
        supMap[sup].review++;
      }
    });

    const topSuppliers = Object.keys(supMap)
      .sort((a, b) => supMap[b].total - supMap[a].total)
      .slice(0, 7);

    charts.supplierChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: topSuppliers,
        datasets: [
          {
            label: 'Approved / Ungated',
            data: topSuppliers.map(s => supMap[s].approved),
            backgroundColor: '#10b981',
            borderRadius: 4
          },
          {
            label: 'Review / Pending',
            data: topSuppliers.map(s => supMap[s].review),
            backgroundColor: '#f59e0b',
            borderRadius: 4
          },
          {
            label: 'Rejected',
            data: topSuppliers.map(s => supMap[s].rejected),
            backgroundColor: '#ef4444',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: theme.textMuted, font: { family: 'Inter', size: 10 } },
            grid: { display: false }
          },
          y: {
            ticks: { color: theme.textMuted, font: { family: 'Inter', size: 11 } },
            grid: { color: theme.gridColor }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: theme.textColor, font: { family: 'Inter', size: 11 }, boxWidth: 12 }
          }
        }
      }
    });
  }

  /**
   * 5. Daily/Monthly Trends (Smooth Line / Area Chart)
   */
  function renderTrendChart(rows, detectedColumns, theme) {
    const canvas = document.getElementById('chartTrend');
    if (!canvas) return;

    if (charts.trendChart) charts.trendChart.destroy();

    const dateCol = detectedColumns.dateCol;
    if (!dateCol) {
      showEmptyChartMessage(canvas, 'No Date column detected in dataset');
      return;
    }

    // Group by Date (or YYYY-MM if span > 40 days)
    const dateCounts = {};
    let validDateCount = 0;

    rows.forEach(r => {
      const rawDate = r[dateCol];
      if (!rawDate) return;
      const parsed = new Date(rawDate);
      if (isNaN(parsed)) return;

      validDateCount++;
      // Format as YYYY-MM-DD
      const dateKey = parsed.toISOString().split('T')[0];
      if (!dateCounts[dateKey]) {
        dateCounts[dateKey] = { total: 0, approved: 0 };
      }
      dateCounts[dateKey].total++;
      const s = r._canonicalStatus || '';
      if (s === 'Approved' || s === 'Ungate' || s === 'Auto Ungate') {
        dateCounts[dateKey].approved++;
      }
    });

    if (validDateCount === 0) {
      showEmptyChartMessage(canvas, 'Could not parse dates for trend chart');
      return;
    }

    // Sort chronologically
    let sortedDates = Object.keys(dateCounts).sort();

    // If more than 35 dates, aggregate by month YYYY-MM
    let isMonthly = false;
    if (sortedDates.length > 35) {
      isMonthly = true;
      const monthCounts = {};
      sortedDates.forEach(d => {
        const mKey = d.substring(0, 7);
        if (!monthCounts[mKey]) monthCounts[mKey] = { total: 0, approved: 0 };
        monthCounts[mKey].total += dateCounts[d].total;
        monthCounts[mKey].approved += dateCounts[d].approved;
      });
      sortedDates = Object.keys(monthCounts).sort();
      sortedDates.forEach(m => {
        dateCounts[m] = monthCounts[m];
      });
    }

    const totalData = sortedDates.map(d => dateCounts[d].total);
    const approvedData = sortedDates.map(d => dateCounts[d].approved);

    charts.trendChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: sortedDates,
        datasets: [
          {
            label: 'Total Submissions',
            data: totalData,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6
          },
          {
            label: 'Approved / Ungated',
            data: approvedData,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: theme.textMuted, font: { family: 'Inter', size: 11 } },
            grid: { display: false }
          },
          y: {
            ticks: { color: theme.textMuted, font: { family: 'Inter', size: 11 } },
            grid: { color: theme.gridColor }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: theme.textColor, font: { family: 'Inter', size: 11 }, boxWidth: 12 }
          }
        }
      }
    });
  }

  function showEmptyChartMessage(canvas, msg) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '13px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
  }

  function generateColorForString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 55%)`;
  }

  return {
    updateCharts,
    destroyAll,
    getThemeColors
  };
})();

if (typeof window !== 'undefined') {
  window.ChartManager = ChartManager;
}
