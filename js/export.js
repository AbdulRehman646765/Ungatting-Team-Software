/**
 * export.js
 * Multi-format Data Exporter for Amazon Ungating Analytics.
 * Handles Excel (.xlsx), CSV (UTF-8 BOM), and PDF generation.
 */

var DataExporter = (function () {
  'use strict';

  /**
   * Export array of objects to Excel (.xlsx)
   */
  function exportToExcel(data, headers, filename = 'Amazon_Ungating_Report.xlsx') {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    if (typeof XLSX === 'undefined') {
      console.warn('SheetJS XLSX library not found. Falling back to CSV.');
      exportToCSV(data, headers, filename.replace('.xlsx', '.csv'));
      return;
    }

    // Prepare clean data rows omitting internal fields (_id, _canonicalStatus, etc.)
    const cleanData = data.map(row => {
      const cleanRow = {};
      headers.forEach(h => {
        cleanRow[h] = row[h] !== undefined ? row[h] : '';
      });
      return cleanRow;
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(cleanData, { header: headers });

    // Auto-fit column widths
    const colWidths = headers.map(h => {
      let maxLen = h.length;
      cleanData.slice(0, 100).forEach(r => {
        const valStr = (r[h] || '').toString();
        if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 40);
      });
      return { wch: Math.max(maxLen + 3, 12) };
    });
    worksheet['!cols'] = colWidths;

    // Create workbook and write
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ungating Data');
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export matrix or grouped report to Excel
   */
  function exportReportMatrixToExcel(matrixData, columns, filename = 'Amazon_Ungating_Breakdown.xlsx') {
    if (typeof XLSX === 'undefined') {
      alert('SheetJS library is loading, please try again.');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(matrixData, { header: columns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary Report');
    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export to CSV with UTF-8 BOM
   */
  function exportToCSV(data, headers, filename = 'Amazon_Ungating_Report.csv') {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for proper Excel rendering

    // Header line
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',') + '\r\n';

    // Row lines
    data.forEach(row => {
      const line = headers.map(h => {
        const cell = row[h] !== undefined && row[h] !== null ? row[h].toString() : '';
        return `"${cell.replace(/"/g, '""')}"`;
      }).join(',');
      csvContent += line + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Export data table or summary to professional PDF using jsPDF + autoTable
   */
  function exportToPDF(data, headers, title = 'Amazon Ungating Analytics Report') {
    if (!data || data.length === 0) {
      alert('No data available to export.');
      return;
    }

    if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
      // Fallback: print view
      window.print();
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'pt', 'a4');

    // Title & Header info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(79, 70, 229);
    doc.text(title, 40, 40);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    doc.text(`Generated on: ${dateStr} | Total Rows: ${data.length}`, 40, 56);

    // Filter headers to most essential 8 columns for PDF width if wide
    const displayHeaders = headers.length > 8 ? headers.slice(0, 8) : headers;

    const tableRows = data.map(r => displayHeaders.map(h => (r[h] !== undefined ? r[h].toString() : '')));

    // Use autoTable if available
    if (doc.autoTable) {
      doc.autoTable({
        head: [displayHeaders],
        body: tableRows,
        startY: 70,
        margin: { left: 40, right: 40 },
        theme: 'striped',
        styles: {
          fontSize: 8,
          cellPadding: 4,
          font: 'helvetica',
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        }
      });
      doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
    } else {
      window.print();
    }
  }

  /**
   * Generate clean, professional ClickUp report text
   */
  function generateClickUpReport(rows, detectedColumns, stats) {
    if (!rows || rows.length === 0) return '';

    const total = rows.length;
    const counts = (stats && stats.counts) ? stats.counts : {};

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Distinct companies
    const compCol = detectedColumns ? detectedColumns.companyCol : null;
    const compCounts = {};
    if (compCol) {
      rows.forEach(r => {
        const c = r[compCol];
        if (c) compCounts[c] = (compCounts[c] || 0) + 1;
      });
    }
    const compList = Object.entries(compCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([c, n]) => `${c} (${n})`)
      .join(' | ');

    let report = `🚀 **Amazon Ungating Daily Progress Report**\n`;
    report += `📅 **Date:** ${today} | **Total Batch Size:** ${total} ASINs\n\n`;

    report += `📊 **Summary Breakdown:**\n`;
    const ungateCount = counts['Ungate'] || 0;
    const appCount = counts['Approved'] || 0;
    const autoCount = counts['Auto Ungate'] || 0;
    const revCount = counts['Review'] || 0;
    const rejCount = counts['Rejected'] || 0;

    if (ungateCount > 0) report += `• ✅ **Ungated (Success):** ${ungateCount} (${((ungateCount / total) * 100).toFixed(1)}%)\n`;
    if (appCount > 0) report += `• 🟢 **Approved:** ${appCount}\n`;
    if (autoCount > 0) report += `• ⚡ **Auto Ungate:** ${autoCount}\n`;
    if (revCount > 0) report += `• ⏳ **Under Review:** ${revCount}\n`;
    if (rejCount > 0) report += `• ❌ **Rejected:** ${rejCount} (${((rejCount / total) * 100).toFixed(1)}%)\n`;
    if (counts['Copy Listed']) report += `• 📋 **Copy Listed:** ${counts['Copy Listed']}\n`;
    if (counts['Invoice Submitted']) report += `• 🧾 **Invoice Submitted:** ${counts['Invoice Submitted']}\n`;

    // Case and Ticket Statuses
    const ticketItems = [];
    if (counts['Case Open']) ticketItems.push(`• 📂 **Case Open:** ${counts['Case Open']}`);
    if (counts['Case Re-open 1']) ticketItems.push(`• 🔄 **Case Re-open 1:** ${counts['Case Re-open 1']}`);
    if (counts['Case Re-open 2']) ticketItems.push(`• 🔄 **Case Re-open 2:** ${counts['Case Re-open 2']}`);
    if (counts['Case Re-open 3']) ticketItems.push(`• 🔄 **Case Re-open 3:** ${counts['Case Re-open 3']}`);
    if (counts['Case Re-open 4']) ticketItems.push(`• 🔄 **Case Re-open 4:** ${counts['Case Re-open 4']}`);
    if (counts['Case Re-open 5']) ticketItems.push(`• 🔄 **Case Re-open 5:** ${counts['Case Re-open 5']}`);
    if (counts['Re-Apply']) ticketItems.push(`• ⚠️ **Re-Apply Needed:** ${counts['Re-Apply']}`);
    if (counts['Under Review'] && counts['Under Review'] !== revCount) {
      ticketItems.push(`• 🔍 **Under Review (Log):** ${counts['Under Review']}`);
    }

    if (ticketItems.length > 0) {
      report += `\n🎫 **Case & Ticket Activity:**\n` + ticketItems.join('\n') + '\n';
    }

    if (compList) {
      report += `\n🏢 **Accounts Handled:**\n${compList}\n`;
    }

    report += `\n🎯 **Action Items & Next Steps:**\n`;
    if (counts['Case Open'] || counts['Case Re-open 1']) {
      report += `1. Follow-up on active Seller Support cases for resolution.\n`;
    }
    if (rejCount > 0) {
      report += `2. Investigate rejection reasons and gather revised supplier documentation.\n`;
    }
    if (counts['Re-Apply']) {
      report += `3. Prepare re-applications for ${counts['Re-Apply']} flagged ASINs.\n`;
    }
    if (ungateCount > 0) {
      report += `4. Verify catalog listing accessibility for newly ungated ASINs.\n`;
    }

    return report;
  }

  return {
    exportToExcel,
    exportReportMatrixToExcel,
    exportToCSV,
    exportToPDF,
    generateClickUpReport
  };
})();

if (typeof window !== 'undefined') {
  window.DataExporter = DataExporter;
}
