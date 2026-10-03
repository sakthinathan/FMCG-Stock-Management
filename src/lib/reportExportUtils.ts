import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    systemQtyPcs?: number;
    physicalQtyPcs?: number;
    netVariancePcs?: number;
    shortageItems?: number;
    excessItems?: number;
    systemValue?: number;
    physicalValue?: number;
    shortageValue?: number;
    excessValue?: number;
  },
  agencyName = 'FMCG DISTRIBUTOR'
) {
  if (!rows || rows.length === 0) return false;

  const doc = new jsPDF({ orientation: 'landscape' });
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // ── Header Banner ──────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
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

  // ── Summary Metrics Banner (Quantities Only) ────────────────────────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 32, 269, 16, 3, 3, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total SKUs: ${stats.totalSkus}`, 20, 42);
  doc.text(`Counted SKUs: ${stats.countedSkus}`, 68, 42);
  doc.text(`System Qty: ${(stats.systemQtyPcs || 0).toLocaleString('en-IN')} PCS`, 120, 42);
  doc.text(`Physical Qty: ${(stats.physicalQtyPcs || 0).toLocaleString('en-IN')} PCS`, 185, 42);
  const netVar = stats.netVariancePcs || 0;
  doc.text(`Net Variance: ${netVar > 0 ? '+' : ''}${netVar.toLocaleString('en-IN')} PCS`, 245, 42);

  const isBrandSummary = rows.length > 0 && rows[0]['Total SKUs'] !== undefined;

  if (isBrandSummary) {
    const head = [[
      'Brand', 'Total SKUs', 'Counted SKUs', 'Progress %',
      'System Qty (PCS)', 'Physical Qty (PCS)', 'Net Variance (PCS)', 'Shortages', 'Excess'
    ]];
    const body = rows.map(r => [
      r['Brand'] || '',
      r['Total SKUs'] || 0,
      r['Counted SKUs'] || 0,
      r['Progress %'] || '0%',
      r['System Qty (PCS)'] || 0,
      r['Physical Qty (PCS)'] || 0,
      r['Net Variance (PCS)'] !== undefined ? (r['Net Variance (PCS)'] > 0 ? `+${r['Net Variance (PCS)']}` : r['Net Variance (PCS)']) : 0,
      r['Shortage Count'] || 0,
      r['Excess Count'] || 0,
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 52,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3, font: 'helvetica' },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      showHead: 'everyPage',
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { halign: 'right', cellWidth: 26 },
        2: { halign: 'right', cellWidth: 26 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'right', cellWidth: 32 },
        5: { halign: 'right', cellWidth: 32 },
        6: { halign: 'right', cellWidth: 32, fontStyle: 'bold' },
        7: { halign: 'right', cellWidth: 22 },
        8: { halign: 'right', cellWidth: 22 },
      },
    });
  } else {
    // ── 1. Sort: Brand A-Z → Material A-Z within each brand ───────────────────
    const sorted = [...rows].sort((a, b) => {
      const brandCmp = (a['Brand'] || '').localeCompare(b['Brand'] || '');
      if (brandCmp !== 0) return brandCmp;
      return (a['Material'] || '').localeCompare(b['Material'] || '');
    });

    // ── 2. Pre-compute per-brand SKU count for group header labels ─────────────
    const brandCounts = new Map<string, number>();
    for (const r of sorted) {
      const b = r['Brand'] || 'Unknown';
      brandCounts.set(b, (brandCounts.get(b) || 0) + 1);
    }

    // ── 3. Build body: inject a dark group-header row before each brand ────────
    const body: any[] = [];
    let currentBrand = '';

    for (const r of sorted) {
      const brand = r['Brand'] || 'Unknown';

      // Insert brand group header row when brand changes
      if (brand !== currentBrand) {
        currentBrand = brand;
        const skuCount = brandCounts.get(brand) || 0;
        body.push([
          {
            content: `  ${brand.toUpperCase()}   —   ${skuCount} SKU${skuCount !== 1 ? 's' : ''}`,
            colSpan: 7,
            styles: {
              fillColor: [30, 41, 59],
              textColor: [248, 250, 252],
              fontStyle: 'bold',
              fontSize: 8.5,
              cellPadding: { top: 5, right: 8, bottom: 5, left: 10 },
            },
          },
        ]);
      }

      // Data row — Brand column omitted (group headers make it redundant); Variance Value omitted
      body.push([
        r['Material'] || '',
        (r['Description'] || '').substring(0, 38),
        r['MRP (₹)'] || r['MRP (RS)'] || 0,
        r['System Qty (PCS)'] || 0,
        r['Physical Qty (PCS)'] !== undefined ? r['Physical Qty (PCS)'] : '',
        r['Variance (PCS)'] !== undefined && r['Variance (PCS)'] !== '' 
          ? r['Variance (PCS)'] 
          : (r['Current Variance (PCS)'] !== undefined && r['Current Variance (PCS)'] !== '' ? r['Current Variance (PCS)'] : ''),
        r['Status'] || r['Trend'] || '',
      ]);
    }

    // ── 4. Column headers (7 cols — Brand removed; Variance Value removed) ─────
    const head = [[
      'Material', 'Description', 'MRP (RS)',
      'System Pcs', 'Physical Pcs', 'Variance (PCS)',
      'Status',
    ]];

    autoTable(doc, {
      head,
      body,
      startY: 52,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica', overflow: 'ellipsize' },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      showHead: 'everyPage',
      columnStyles: {
        0: { cellWidth: 32 },                                    // Material
        1: { cellWidth: 80 },                                    // Description
        2: { halign: 'right', cellWidth: 24 },                   // MRP
        3: { halign: 'right', cellWidth: 30 },                   // System Pcs
        4: { halign: 'right', cellWidth: 30 },                   // Physical Pcs
        5: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },// Variance
        6: { halign: 'center', cellWidth: 32 },                  // Status
      },
    });
  }

  const fileDate = new Date().toISOString().split('T')[0];
  const cleanTitle = reportTitle.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${agencyName.replace(/\s+/g, '_')}_${cleanTitle}_${fileDate}.pdf`);
  return true;
}
