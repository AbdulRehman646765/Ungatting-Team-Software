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

  return {
    exportToExcel,
    exportReportMatrixToExcel,
    exportToCSV,
    exportToPDF
  };
})();

if (typeof window !== 'undefined') {
  window.DataExporter = DataExporter;
}
