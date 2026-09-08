import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export type ReportType =
  | 'full'
  | 'shortage'
  | 'excess'
  | 'increased_variance'
  | 'new_issues'
  | 'historical_comparison'
  | 'brand_summary';

export function exportDataToExcel(data: any[], reportType: string, filenamePrefix = 'Stock_Report') {
  if (!data || data.length === 0) return false;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, reportType.replace(/_/g, ' '));
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filenamePrefix}_${reportType}_${dateStr}.xlsx`);
  return true;
}

export function exportReportToPdf(
  rows: any[],
  reportTitle: string,
  stats: {
    totalSkus: number;
    countedSkus: number;
    systemValue: number;
    physicalValue: number;
    shortageValue: number;
    excessValue: number;
  },
  agencyName = 'THULIR AGENCY'
) {
  if (!rows || rows.length === 0) return false;

  const doc = new jsPDF({ orientation: 'landscape' });
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // Dark slate
  doc.rect(0, 0, 297, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(agencyName.toUpperCase(), 14, 13);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`FMCG Stock Reconciliation System | ${reportTitle}`, 14, 21);

  doc.setFontSize(9);
  doc.text(`Generated: ${dateStr}`, 280, 21, { align: 'right' });

  // Summary Metrics Banner
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 32, 269, 16, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total SKUs: ${stats.totalSkus}`, 20, 42);
  doc.text(`Counted SKUs: ${stats.countedSkus}`, 65, 42);
  doc.text(`System Value: RS ${stats.systemValue.toLocaleString('en-IN')}`, 115, 42);
  doc.text(`Physical Value: RS ${stats.physicalValue.toLocaleString('en-IN')}`, 175, 42);
  doc.text(`Shortage: RS ${stats.shortageValue.toLocaleString('en-IN')}`, 235, 42);

  // Build table columns and rows
  const head = [
    [
      'Material',
      'Description',
      'Brand',
      'MRP (RS)',
      'System Pcs',
      'Physical Pcs',
      'Variance',
      'Variance Value (RS)',
      'Status',
    ],
  ];

  const body = rows.map((r) => [
    r['Material'] || '',
    (r['Description'] || '').substring(0, 30),
    r['Brand'] || '',
    r['MRP (₹)'] || r['MRP (RS)'] || 0,
    r['System Qty (PCS)'] || 0,
    r['Physical Qty (PCS)'] !== undefined ? r['Physical Qty (PCS)'] : '',
    r['Variance (PCS)'] !== undefined ? r['Variance (PCS)'] : '',
    r['Variance Value (₹)'] || r['Variance Value (RS)'] || '',
    r['Status'] || '',
  ]);

  (doc as any).autoTable({
    head,
    body,
    startY: 52,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 55 },
      2: { cellWidth: 35 },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'right' },
      8: { halign: 'center' },
    },
  });

  const fileDate = new Date().toISOString().split('T')[0];
  doc.save(`${agencyName.replace(/\s+/g, '_')}_Stock_Report_${fileDate}.pdf`);
  return true;
}
