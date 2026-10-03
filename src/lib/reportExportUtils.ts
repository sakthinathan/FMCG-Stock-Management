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

export interface ReportPdfStats {
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
}

export function createReportPdfDocument(
  rows: any[],
  reportTitle: string,
  stats: ReportPdfStats,
  agencyName = 'FMCG DISTRIBUTOR'
): { doc: jsPDF; filename: string } | null {
  if (!rows || rows.length === 0) return null;

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
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
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
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        const colIdx = data.column.index;
        // Shortage count in red
        if (colIdx === 7 && Number(data.cell.raw) > 0) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fillColor = [254, 226, 226];
          data.cell.styles.fontStyle = 'bold';
        }
        // Excess count in green
        if (colIdx === 8 && Number(data.cell.raw) > 0) {
          data.cell.styles.textColor = [21, 128, 61];
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.fontStyle = 'bold';
        }
        // Net Difference
        if (colIdx === 6) {
          const val = String(data.cell.raw || '');
          if (val.startsWith('-')) {
            data.cell.styles.textColor = [185, 28, 28];
          } else if (val.startsWith('+')) {
            data.cell.styles.textColor = [21, 128, 61];
          }
        }
      }
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
            colSpan: 8,
            styles: {
              fillColor: [15, 23, 42],
              textColor: [248, 250, 252],
              fontStyle: 'bold',
              fontSize: 8.5,
              cellPadding: { top: 4, right: 8, bottom: 4, left: 10 },
            },
          },
        ]);
      }

      // Data row with MRP and CBB & PCS representation
      const mrpNum = Number(r['MRP (₹)'] !== undefined ? r['MRP (₹)'] : (r['MRP'] !== undefined ? r['MRP'] : 0));
      const mrpVal = mrpNum > 0 ? `₹${mrpNum.toFixed(2)}` : '—';

      const sysVal = r['System Stock (CBB & PCS)'] || `${r['System Qty (PCS)'] || 0} PCS`;
      const phyVal = r['Physical Stock (CBB & PCS)'] !== undefined
        ? r['Physical Stock (CBB & PCS)']
        : (r['Physical Qty (PCS)'] !== undefined ? `${r['Physical Qty (PCS)']} PCS` : '');
      const diffVal = r['Difference (CBB & PCS)'] !== undefined && r['Difference (CBB & PCS)'] !== ''
        ? r['Difference (CBB & PCS)']
        : (r['Variance (PCS)'] !== undefined && r['Variance (PCS)'] !== ''
            ? `${r['Variance (PCS)']} PCS`
            : (r['Current Variance (PCS)'] !== undefined && r['Current Variance (PCS)'] !== '' ? `${r['Current Variance (PCS)']} PCS` : ''));

      const statusVal = r['Status'] || r['Trend'] || 'Not Counted';

      body.push([
        r['Material'] || '',
        (r['Description'] || '').substring(0, 36),
        mrpVal,
        r['Case Size (1 CBB)'] || '1 PCS',
        sysVal,
        phyVal,
        diffVal,
        statusVal,
      ]);
    }

    // ── 4. Column headers (8 cols with MRP and CBB & PCS columns) ─────
    const head = [[
      'Material', 'Description', 'MRP', '1 CBB Size',
      'System Stock', 'Physical Stock', 'Difference (CBB & PCS)',
      'Audit Status',
    ]];

    autoTable(doc, {
      head,
      body,
      startY: 52,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica', overflow: 'ellipsize', lineColor: [226, 232, 240], lineWidth: 0.2 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      showHead: 'everyPage',
      columnStyles: {
        0: { cellWidth: 26, fontStyle: 'bold' },                  // Material
        1: { cellWidth: 58 },                                    // Description
        2: { halign: 'right', cellWidth: 18, fontStyle: 'bold' },// MRP
        3: { halign: 'center', cellWidth: 20 },                  // 1 CBB Size
        4: { halign: 'right', cellWidth: 41 },                   // System Stock
        5: { halign: 'right', cellWidth: 41 },                   // Physical Stock
        6: { halign: 'right', cellWidth: 42, fontStyle: 'bold' },// Difference (CBB & PCS)
        7: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },// Audit Status
      },
      didParseCell: (data) => {
        if (data.section !== 'body') return;
        // Skip brand group header rows
        if (data.row.raw && Array.isArray(data.row.raw) && data.row.raw[0] && typeof data.row.raw[0] === 'object') {
          return;
        }

        const colIdx = data.column.index;
        const status = String(data.row.cells[7]?.text?.[0] || '').trim();
        const diffText = String(data.row.cells[6]?.text?.[0] || '').trim();

        // 1. Audit Status Column (Last column): Green for equal and excess, Red for shortage
        if (colIdx === 7) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 7.5;
          if (status === 'Shortage' || status.toLowerCase().includes('short')) {
            // Shortage in red
            data.cell.styles.textColor = [185, 28, 28]; // deep red #b91c1c
            data.cell.styles.fillColor = [254, 226, 226]; // soft red bg #fee2e2
          } else if (status === 'Excess' || status.toLowerCase().includes('excess')) {
            // Excess in green (as requested: "mark in green for equal and excess")
            data.cell.styles.textColor = [21, 128, 61]; // deep green #15803d
            data.cell.styles.fillColor = [220, 252, 231]; // soft green bg #dcfce7
          } else if (
            status === 'Equal' ||
            status === 'Matched' ||
            status === 'OK' ||
            status === 'Resolved' ||
            diffText.includes('0 CBB 0 PCS') ||
            diffText === '0 PCS' ||
            diffText === '+0 PCS'
          ) {
            // Equal / Matched in green
            data.cell.styles.textColor = [21, 128, 61]; // deep green #15803d
            data.cell.styles.fillColor = [240, 253, 244]; // soft green bg #f0fdf4
          } else if (status === 'Not Counted') {
            data.cell.styles.textColor = [100, 116, 139];
            data.cell.styles.fillColor = [241, 245, 249];
          }
        }

        // 2. Difference Column (Col 6): Red for negative/shortage, Green for positive/excess and zero
        if (colIdx === 6) {
          data.cell.styles.fontStyle = 'bold';
          if (diffText.startsWith('-') || status === 'Shortage') {
            data.cell.styles.textColor = [185, 28, 28]; // deep red
          } else if (diffText.startsWith('+') || status === 'Excess') {
            data.cell.styles.textColor = [21, 128, 61]; // deep green
          } else if (diffText.includes('0 CBB 0 PCS') || diffText === '0 PCS') {
            data.cell.styles.textColor = [22, 101, 52]; // green
          }
        }

        // 3. Material Code Column (Col 0)
        if (colIdx === 0) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [15, 23, 42];
        }

        // 4. MRP Column (Col 2)
        if (colIdx === 2) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = [51, 65, 85];
        }
      },
    });
  }

  const fileDate = new Date().toISOString().split('T')[0];
  const cleanTitle = reportTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${agencyName.replace(/\s+/g, '_')}_${cleanTitle}_${fileDate}.pdf`;

  return { doc, filename };
}

export function exportReportToPdf(
  rows: any[],
  reportTitle: string,
  stats: ReportPdfStats,
  agencyName = 'FMCG DISTRIBUTOR'
): boolean {
  const result = createReportPdfDocument(rows, reportTitle, stats, agencyName);
  if (!result) return false;
  result.doc.save(result.filename);
  return true;
}

export function generateReportPdfFile(
  rows: any[],
  reportTitle: string,
  stats: ReportPdfStats,
  agencyName = 'FMCG DISTRIBUTOR'
): { file: File; blob: Blob; filename: string; doc: jsPDF } | null {
  const result = createReportPdfDocument(rows, reportTitle, stats, agencyName);
  if (!result) return null;
  const blob = result.doc.output('blob');
  const file = new File([blob], result.filename, { type: 'application/pdf' });
  return { file, blob, filename: result.filename, doc: result.doc };
}
