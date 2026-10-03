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
    systemCbb?: number;
    systemLoosePcs?: number;
    physicalCbb?: number;
    physicalLoosePcs?: number;
    netVarCbb?: number;
    netVarLoosePcs?: number;
    systemQtyPcs?: number;
    physicalQtyPcs?: number;
    netVariancePcs?: number;
    shortageItems?: number;
    excessItems?: number;
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

  // ── Summary Metrics Banner (CBB & PCS Operational Quantities) ───────────────
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 32, 269, 16, 3, 3, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Total SKUs: ${stats.totalSkus}`, 18, 42);
  doc.text(`Counted SKUs: ${stats.countedSkus}`, 52, 42);

  const sysText = stats.systemCbb !== undefined
    ? `${stats.systemCbb} CBB + ${stats.systemLoosePcs}P`
    : `${(stats.systemQtyPcs || 0).toLocaleString('en-IN')} PCS`;
  doc.text(`System: ${sysText}`, 90, 42);

  const phyText = stats.physicalCbb !== undefined
    ? `${stats.physicalCbb} CBB + ${stats.physicalLoosePcs}P`
    : `${(stats.physicalQtyPcs || 0).toLocaleString('en-IN')} PCS`;
  doc.text(`Physical: ${phyText}`, 150, 42);

  const netVar = stats.netVariancePcs || 0;
  const netVarText = stats.netVarCbb !== undefined
    ? `${netVar < 0 ? '-' : netVar > 0 ? '+' : ''}${stats.netVarCbb} CBB ${netVar < 0 ? '-' : netVar > 0 ? '+' : ''}${stats.netVarLoosePcs}P (${netVar > 0 ? '+' : ''}${netVar.toLocaleString('en-IN')} P)`
    : `${netVar > 0 ? '+' : ''}${netVar.toLocaleString('en-IN')} PCS`;
  doc.text(`Net Difference: ${netVarText}`, 210, 42);

  const isBrandSummary = rows.length > 0 && rows[0]['Total SKUs'] !== undefined;

  if (isBrandSummary) {
    const head = [[
      'Brand', 'Total SKUs', 'Counted SKUs', 'Progress %',
      'System Stock (CBB & PCS)', 'Physical Stock (CBB & PCS)', 'Net Difference (CBB & PCS)', 'Shortages', 'Excess'
    ]];
    const body = rows.map(r => [
      r['Brand'] || '',
      r['Total SKUs'] || 0,
      r['Counted SKUs'] || 0,
      r['Progress %'] || '0%',
      r['System Stock (CBB & PCS)'] || `${r['System Qty (PCS)']} PCS`,
      r['Physical Stock (CBB & PCS)'] || `${r['Physical Qty (PCS)']} PCS`,
      r['Net Difference (CBB & PCS)'] || (r['Net Variance (PCS)'] !== undefined ? (r['Net Variance (PCS)'] > 0 ? `+${r['Net Variance (PCS)']} PCS` : `${r['Net Variance (PCS)']} PCS`) : '0 PCS'),
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
        0: { cellWidth: 42, fontStyle: 'bold' },
        1: { halign: 'right', cellWidth: 22 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 22 },
        4: { halign: 'right', cellWidth: 42 },
        5: { halign: 'right', cellWidth: 42 },
        6: { halign: 'right', cellWidth: 42, fontStyle: 'bold' },
        7: { halign: 'right', cellWidth: 18 },
        8: { halign: 'right', cellWidth: 18 },
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

      // Data row with CBB & PCS representation
      const sysVal = r['System Stock (CBB & PCS)'] || `${r['System Qty (PCS)'] || 0} PCS`;
      const phyVal = r['Physical Stock (CBB & PCS)'] !== undefined
        ? r['Physical Stock (CBB & PCS)']
        : (r['Physical Qty (PCS)'] !== undefined ? `${r['Physical Qty (PCS)']} PCS` : '');
      const diffVal = r['Difference (CBB & PCS)'] !== undefined && r['Difference (CBB & PCS)'] !== ''
        ? r['Difference (CBB & PCS)']
        : (r['Variance (PCS)'] !== undefined && r['Variance (PCS)'] !== ''
            ? `${r['Variance (PCS)']} PCS`
            : (r['Current Variance (PCS)'] !== undefined && r['Current Variance (PCS)'] !== '' ? `${r['Current Variance (PCS)']} PCS` : ''));

      body.push([
        r['Material'] || '',
        (r['Description'] || '').substring(0, 36),
        r['Case Size (1 CBB)'] || '1 PCS',
        sysVal,
        phyVal,
        diffVal,
        r['Status'] || r['Trend'] || '',
      ]);
    }

    // ── 4. Column headers (7 cols with CBB & PCS columns) ─────
    const head = [[
      'Material', 'Description', '1 CBB Size',
      'System (CBB & PCS)', 'Physical (CBB & PCS)', 'Difference (CBB & PCS)',
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
        0: { cellWidth: 28 },                                    // Material
        1: { cellWidth: 68 },                                    // Description
        2: { halign: 'center', cellWidth: 22 },                  // 1 CBB Size
        3: { halign: 'right', cellWidth: 42 },                   // System (CBB & PCS)
        4: { halign: 'right', cellWidth: 42 },                   // Physical (CBB & PCS)
        5: { halign: 'right', cellWidth: 42, fontStyle: 'bold' },// Difference (CBB & PCS)
        6: { halign: 'center', cellWidth: 26 },                  // Status
      },
    });
  }

  const fileDate = new Date().toISOString().split('T')[0];
  const cleanTitle = reportTitle.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`${agencyName.replace(/\s+/g, '_')}_${cleanTitle}_${fileDate}.pdf`);
  return true;
}
