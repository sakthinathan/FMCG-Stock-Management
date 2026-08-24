import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileDown, 
  FileSpreadsheet, 
  Download, 
  Loader2, 
  FileText, 
  TrendingUp, 
  AlertTriangle, 
  AlertCircle, 
  History, 
  Building2, 
  CheckCircle2, 
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type ReportType = 
  | 'full' 
  | 'shortage' 
  | 'excess' 
  | 'increased_variance' 
  | 'new_issues' 
  | 'historical_comparison'
  | 'brand_summary';

interface BrandSummaryItem {
  brand: string;
  totalSkus: number;
  countedSkus: number;
  systemQtyPcs: number;
  physicalQtyPcs: number;
  systemValue: number;
  physicalValue: number;
  netVariancePcs: number;
  netVarianceValue: number;
  shortageCount: number;
  excessCount: number;
  resolvedCount: number;
}

export function Reports() {
  const { activeUploadId, filename, uploadedAt } = useStockStore();
  const [downloadingType, setDownloadingType] = useState<ReportType | 'pdf' | null>(null);
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Live brand summary states
  const [brandSummaries, setBrandSummaries] = useState<BrandSummaryItem[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalSkus: 0,
    countedSkus: 0,
    systemValue: 0,
    physicalValue: 0,
    shortageValue: 0,
    excessValue: 0,
    shortageItems: 0,
    excessItems: 0,
  });

  useEffect(() => {
    async function loadData() {
      if (!activeUploadId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data: snapshots, error: snapError } = await supabase
          .from('system_stock_snapshots')
          .select('*')
          .eq('upload_id', activeUploadId);

        if (snapError) throw snapError;

        const { data: counts, error: countError } = await supabase
          .from('physical_stock_counts')
          .select('*');

        if (countError) throw countError;

        const countMap = new Map();
        counts?.forEach(c => {
          countMap.set(c.snapshot_id, c);
        });

        const brandsSet = new Set<string>();
        const brandMap = new Map<string, {
          totalSkus: number;
          countedSkus: number;
          systemQtyPcs: number;
          physicalQtyPcs: number;
          systemValue: number;
          physicalValue: number;
          netVariancePcs: number;
          netVarianceValue: number;
          shortageCount: number;
          excessCount: number;
          resolvedCount: number;
        }>();

        let totalSysVal = 0;
        let totalPhyVal = 0;
        let totalShortageVal = 0;
        let totalExcessVal = 0;
        let totalShortageCount = 0;
        let totalExcessCount = 0;
        let totalCounted = 0;

        snapshots?.forEach(snap => {
          const b = snap.brand || 'Unbranded';
          brandsSet.add(b);

          if (!brandMap.has(b)) {
            brandMap.set(b, {
              totalSkus: 0,
              countedSkus: 0,
              systemQtyPcs: 0,
              physicalQtyPcs: 0,
              systemValue: 0,
              physicalValue: 0,
              netVariancePcs: 0,
              netVarianceValue: 0,
              shortageCount: 0,
              excessCount: 0,
              resolvedCount: 0,
            });
          }

          const entry = brandMap.get(b)!;
          entry.totalSkus += 1;

          const mrp = Number(snap.mrp) || 0;
          const sysPcs = Number(snap.system_qty_pcs) || 0;
          entry.systemQtyPcs += sysPcs;
          const sysVal = sysPcs * mrp;
          entry.systemValue += sysVal;
          totalSysVal += sysVal;

          const count = countMap.get(snap.id);
          if (count) {
            entry.countedSkus += 1;
            totalCounted += 1;

            const phyPcs = Number(count.physical_total_pcs) || 0;
            const variance = Number(count.variance) || 0;
            const prevVariance = Number(snap.prev_variance) || 0;

            entry.physicalQtyPcs += phyPcs;
            const phyVal = phyPcs * mrp;
            entry.physicalValue += phyVal;
            totalPhyVal += phyVal;

            entry.netVariancePcs += variance;
            const varVal = variance * mrp;
            entry.netVarianceValue += varVal;

            if (variance < 0) {
              entry.shortageCount += 1;
              totalShortageCount += 1;
              totalShortageVal += Math.abs(varVal);
            } else if (variance > 0) {
              entry.excessCount += 1;
              totalExcessCount += 1;
              totalExcessVal += varVal;
            } else if (variance === 0 && prevVariance !== 0) {
              entry.resolvedCount += 1;
            }
          }
        });

        setUniqueBrands(Array.from(brandsSet).sort());

        const summaries: BrandSummaryItem[] = Array.from(brandMap.entries()).map(([brand, data]) => ({
          brand,
          ...data
        })).sort((a, b) => b.systemValue - a.systemValue);

        setBrandSummaries(summaries);
        setOverallStats({
          totalSkus: snapshots?.length || 0,
          countedSkus: totalCounted,
          systemValue: totalSysVal,
          physicalValue: totalPhyVal,
          shortageValue: totalShortageVal,
          excessValue: totalExcessVal,
          shortageItems: totalShortageCount,
          excessItems: totalExcessCount,
        });

      } catch (err) {
        console.error("Error loading reports data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [activeUploadId]);

  const fetchReportData = async (type: ReportType) => {
    if (!activeUploadId) return null;

    const { data: snapshots, error: snapError } = await supabase
      .from('system_stock_snapshots')
      .select('*')
      .eq('upload_id', activeUploadId);

    if (snapError) throw snapError;

    const { data: counts, error: countError } = await supabase
      .from('physical_stock_counts')
      .select('*');

    if (countError) throw countError;

    const countMap = new Map();
    counts?.forEach(c => {
      countMap.set(c.snapshot_id, c);
    });

    if (type === 'brand_summary') {
      const summaryRows = brandSummaries
        .filter(b => selectedBrand === 'All Brands' || b.brand === selectedBrand)
        .map(b => ({
          'Brand': b.brand,
          'Total SKUs': b.totalSkus,
          'Counted SKUs': b.countedSkus,
          'Progress %': b.totalSkus > 0 ? `${((b.countedSkus / b.totalSkus) * 100).toFixed(1)}%` : '0%',
          'System Qty (PCS)': b.systemQtyPcs,
          'Physical Qty (PCS)': b.physicalQtyPcs,
          'System Value (₹)': b.systemValue.toFixed(2),
          'Physical Value (₹)': b.physicalValue.toFixed(2),
          'Net Variance (PCS)': b.netVariancePcs,
          'Net Variance Value (₹)': b.netVarianceValue.toFixed(2),
          'Shortage Count': b.shortageCount,
          'Excess Count': b.excessCount,
          'Resolved Count': b.resolvedCount
        }));
      return summaryRows;
    }

    const reportRows: any[] = [];
    
    snapshots?.forEach(snap => {
      if (selectedBrand !== 'All Brands' && snap.brand !== selectedBrand) {
        return;
      }

      const count = countMap.get(snap.id);
      const isCounted = !!count;
      const mrp = Number(snap.mrp) || 0;
      const sysPcs = Number(snap.system_qty_pcs) || 0;
      const phyPcs = isCounted ? Number(count.physical_total_pcs) || 0 : null;
      const variance = isCounted ? Number(count.variance) || 0 : null;
      const prevVariance = Number(snap.prev_variance) || 0;
      const varianceChange = variance !== null ? variance - prevVariance : null;
      const status = isCounted ? count.status : 'Not Counted';
      const notes = isCounted ? (count.notes || '') : '';
      const reasonCode = isCounted ? (count.reason_code || '') : '';

      // Trend Category
      let trendCategory = 'No Change';
      if (isCounted && variance !== null) {
        if (prevVariance === 0 && variance !== 0) trendCategory = 'New Issue';
        else if (variance === 0 && prevVariance !== 0) trendCategory = 'Resolved';
        else if (Math.abs(variance) > Math.abs(prevVariance)) trendCategory = 'Increased Variance';
        else if (Math.abs(variance) < Math.abs(prevVariance)) trendCategory = 'Decreased Variance';
        else if (variance !== 0 && variance === prevVariance) trendCategory = 'Unchanged Issue';
      }

      const baseRow = {
        'Material': snap.material,
        'Description': snap.material_desc,
        'Brand': snap.brand,
        'MRP (₹)': mrp,
        'System Qty (PCS)': sysPcs,
        'Physical Qty (PCS)': isCounted ? phyPcs : 'Not Counted',
        'Physical CBB': isCounted ? (count.physical_cbb ?? '') : '',
        'Physical PCS': isCounted ? (count.physical_pcs ?? '') : '',
        'Variance (PCS)': isCounted ? variance : '',
        'Variance Value (₹)': isCounted ? ((variance || 0) * mrp).toFixed(2) : '',
        'Status': status,
        'Reason Code': reasonCode,
        'Notes': notes,
        'Previous Variance (PCS)': prevVariance,
        'Variance Change (PCS)': isCounted ? varianceChange : '',
        'Trend': trendCategory
      };

      // Filter based on specific report type
      switch (type) {
        case 'full':
          reportRows.push(baseRow);
          break;

        case 'shortage':
          if (isCounted && status === 'Shortage') {
            reportRows.push(baseRow);
          }
          break;

        case 'excess':
          if (isCounted && status === 'Excess') {
            reportRows.push(baseRow);
          }
          break;

        case 'increased_variance':
          if (isCounted && Math.abs(variance || 0) > Math.abs(prevVariance) && (variance || 0) !== 0) {
            reportRows.push(baseRow);
          }
          break;

        case 'new_issues':
          if (isCounted && prevVariance === 0 && (variance || 0) !== 0) {
            reportRows.push(baseRow);
          }
          break;

        case 'historical_comparison':
          if (isCounted) {
            reportRows.push({
              'Material': snap.material,
              'Description': snap.material_desc,
              'Brand': snap.brand,
              'MRP (₹)': mrp,
              'System Qty (PCS)': sysPcs,
              'Physical Qty (PCS)': phyPcs,
              'Previous Variance (PCS)': prevVariance,
              'Current Variance (PCS)': variance,
              'Variance Change (PCS)': varianceChange,
              'Trend': trendCategory,
              'Previous Impact (₹)': (prevVariance * mrp).toFixed(2),
              'Current Impact (₹)': ((variance || 0) * mrp).toFixed(2),
              'Reason Code': reasonCode,
              'Notes': notes,
            });
          }
          break;
      }
    });

    return reportRows;
  };

  const handleDownloadExcel = async (type: ReportType) => {
    setDownloadingType(type);

    try {
      const data = await fetchReportData(type);
      if (!data || data.length === 0) {
        alert("No records match the criteria for this report.");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();

      const sheetNames: Record<ReportType, string> = {
        full: 'Full Reconciliation',
        shortage: 'Shortages',
        excess: 'Excesses',
        increased_variance: 'Increased Variance',
        new_issues: 'New Issues',
        historical_comparison: 'Historical Comparison',
        brand_summary: 'Brand Summary'
      };

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetNames[type] || 'Report');

      const filePrefixes: Record<ReportType, string> = {
        full: 'Full_Reconciliation_Report',
        shortage: 'Shortage_Report',
        excess: 'Excess_Report',
        increased_variance: 'Increased_Variance_Report',
        new_issues: 'New_Issues_Report',
        historical_comparison: 'Historical_Comparison_Report',
        brand_summary: 'Brand_Wise_Summary_Report'
      };

      const dateStr = new Date().toISOString().split('T')[0];
      const brandSuffix = selectedBrand !== 'All Brands' ? `_${selectedBrand.replace(/\s+/g, '_')}` : '';
      XLSX.writeFile(workbook, `${filePrefixes[type]}${brandSuffix}_${dateStr}.xlsx`);

    } catch (error) {
      console.error("Excel download failed:", error);
      alert("Failed to generate Excel report.");
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingType('pdf');
    try {
      const discrepancyData = await fetchReportData('shortage');
      const excessData = await fetchReportData('excess');
      const allDiscrepancies = [...(discrepancyData || []), ...(excessData || [])];
      
      const doc = new jsPDF();
      
      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 32, 'F');

      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("StockSync Audit & Reconciliation Report", 14, 18);
      
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`Snapshot: ${filename} | Date: ${new Date(uploadedAt || '').toLocaleDateString()} | Filter: ${selectedBrand}`, 14, 26);

      // Section 1: Executive KPI Metrics
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text("1. Executive Summary", 14, 42);

      const kpiColumns = ["Metric", "Value", "Metric", "Value"];
      const kpiRows = [
        [
          "Total SKUs Audited", `${overallStats.countedSkus} / ${overallStats.totalSkus}`,
          "Audit Completion", overallStats.totalSkus > 0 ? `${((overallStats.countedSkus / overallStats.totalSkus) * 100).toFixed(1)}%` : '0%'
        ],
        [
          "Total System Stock Value", `Rs. ${overallStats.systemValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
          "Total Physical Stock Value", `Rs. ${overallStats.physicalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
        ],
        [
          "Total Shortage Discrepancies", `${overallStats.shortageItems} SKUs (Rs. ${overallStats.shortageValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })})`,
          "Total Excess Discrepancies", `${overallStats.excessItems} SKUs (Rs. ${overallStats.excessValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })})`
        ]
      ];

      (doc as any).autoTable({
        head: [kpiColumns],
        body: kpiRows,
        startY: 46,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      // Section 2: Brand-Wise Breakdown Table
      const brandTableY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text("2. Brand-Wise Performance Summary", 14, brandTableY);

      const brandColumns = ["Brand", "SKUs", "Counted", "Sys Val", "Phy Val", "Net Diff", "Shortages", "Excess"];
      const brandRows = brandSummaries
        .filter(b => selectedBrand === 'All Brands' || b.brand === selectedBrand)
        .map(b => [
          b.brand,
          b.totalSkus,
          `${b.countedSkus} (${b.totalSkus > 0 ? ((b.countedSkus/b.totalSkus)*100).toFixed(0) : 0}%)`,
          `Rs. ${Math.round(b.systemValue).toLocaleString('en-IN')}`,
          `Rs. ${Math.round(b.physicalValue).toLocaleString('en-IN')}`,
          `Rs. ${Math.round(b.netVarianceValue).toLocaleString('en-IN')}`,
          b.shortageCount,
          b.excessCount
        ]);

      (doc as any).autoTable({
        head: [brandColumns],
        body: brandRows,
        startY: brandTableY + 4,
        theme: 'striped',
        styles: { fontSize: 7, cellPadding: 2.5 },
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      // Section 3: Top Discrepancies Requiring Immediate Attention
      const topDiscrepancyY = (doc as any).lastAutoTable.finalY + 10;
      
      if (topDiscrepancyY < 240) {
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.text("3. Top 15 Discrepancies Requiring Review", 14, topDiscrepancyY);

        allDiscrepancies.sort((a, b) => Math.abs(Number(b['Variance (PCS)']) || 0) - Math.abs(Number(a['Variance (PCS)']) || 0));
        const top15 = allDiscrepancies.slice(0, 15);

        const discColumns = ["Material", "Description", "Brand", "Sys", "Phy", "Var", "Impact (Rs.)", "Reason"];
        const discRows = top15.map(row => [
          row['Material'],
          (row['Description'] || '').substring(0, 20),
          row['Brand'],
          row['System Qty (PCS)'],
          row['Physical Qty (PCS)'],
          row['Variance (PCS)'],
          `Rs. ${Math.round(Math.abs(Number(row['Variance Value (₹)']) || 0)).toLocaleString('en-IN')}`,
          row['Reason Code'] || '-'
        ]);

        (doc as any).autoTable({
          head: [discColumns],
          body: discRows,
          startY: topDiscrepancyY + 4,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 2 },
          headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [254, 242, 242] }
        });
      }

      doc.save(`StockSync_Management_Summary_${selectedBrand.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);

    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF summary.");
    } finally {
      setDownloadingType(null);
    }
  };

  if (!activeUploadId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="p-4 bg-slate-100 dark:bg-secondary rounded-full">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-xl font-bold">No Active Stock Snapshot</h3>
          <p className="text-muted-foreground mt-2 max-w-sm">Please upload a system stock Excel file first to view and download reconciliation reports.</p>
        </div>
      </div>
    );
  }

  const reportsList = [
    {
      id: 'full' as ReportType,
      title: 'Full Reconciliation Report',
      subtitle: 'Complete snapshot of all materials, counts, variances, reason codes, and notes.',
      icon: FileSpreadsheet,
      badgeText: 'All SKUs',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200',
      iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      buttonText: 'Download Full (Excel)',
      buttonVariant: 'default' as const,
    },
    {
      id: 'shortage' as ReportType,
      title: 'Shortage Report',
      subtitle: 'Items where physical count is lower than system stock. Vital for stock loss review.',
      icon: ArrowDownRight,
      badgeText: `${overallStats.shortageItems} Shortages`,
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200',
      iconBg: 'bg-red-500/10 text-red-600 dark:text-red-400',
      buttonText: 'Download Shortages (Excel)',
      buttonVariant: 'outline' as const,
    },
    {
      id: 'excess' as ReportType,
      title: 'Excess Report',
      subtitle: 'Items with more physical quantity than recorded. Useful for surplus resolution.',
      icon: ArrowUpRight,
      badgeText: `${overallStats.excessItems} Excesses`,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      buttonText: 'Download Excesses (Excel)',
      buttonVariant: 'outline' as const,
    },
    {
      id: 'increased_variance' as ReportType,
      title: 'Increased Variance Report',
      subtitle: 'Critical audit alert: materials where the variance gap widened compared to previous audit.',
      icon: TrendingUp,
      badgeText: 'Deteriorating Trends',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200',
      iconBg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      buttonText: 'Download Increased Variances',
      buttonVariant: 'outline' as const,
    },
    {
      id: 'new_issues' as ReportType,
      title: 'New Issues Report',
      subtitle: 'Materials that were balanced in previous audits but developed discrepancies in this cycle.',
      icon: AlertCircle,
      badgeText: 'New Discrepancies',
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200',
      iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      buttonText: 'Download New Issues',
      buttonVariant: 'outline' as const,
    },
    {
      id: 'historical_comparison' as ReportType,
      title: 'Historical Comparison Report',
      subtitle: 'Full side-by-side comparison: previous variance, current variance, delta, and trends.',
      icon: History,
      badgeText: 'Audit History',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      buttonText: 'Download Historical Pivot',
      buttonVariant: 'outline' as const,
    },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/40 dark:bg-card  p-6 rounded-2xl border border-slate-200/60 dark:border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-foreground">Reports & Reconciliation</h2>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">Phase 13</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Active Snapshot: <span className="font-semibold text-slate-800 dark:text-foreground">{filename}</span> ({new Date(uploadedAt || '').toLocaleDateString()})
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium shrink-0">
            <Building2 className="h-4 w-4" />
            <span>Brand:</span>
          </div>
          <select 
            className="flex h-10 w-full sm:w-56 items-center justify-between rounded-xl border border-slate-200/80 bg-white dark:bg-secondary px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
          >
            <option value="All Brands">All Brands ({uniqueBrands.length})</option>
            {uniqueBrands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card border border-border shadow-sm rounded-xl shadow-sm border-slate-200/60 dark:border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit Completion</span>
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg"><Layers className="h-4 w-4" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 dark:text-foreground">
                {overallStats.totalSkus > 0 ? `${((overallStats.countedSkus / overallStats.totalSkus) * 100).toFixed(0)}%` : '0%'}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                {overallStats.countedSkus} of {overallStats.totalSkus} SKUs Counted
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-xl shadow-sm border-slate-200/60 dark:border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Value</span>
              <div className="p-2 bg-slate-500/10 text-slate-600 rounded-lg"><FileSpreadsheet className="h-4 w-4" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-slate-900 dark:text-foreground">
                ₹{overallStats.systemValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                Physical: ₹{overallStats.physicalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-xl shadow-sm border-slate-200/60 dark:border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">Shortage Impact</span>
              <div className="p-2 bg-red-500/10 text-red-600 rounded-lg"><ArrowDownRight className="h-4 w-4" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-red-600 dark:text-red-400">
                -₹{overallStats.shortageValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                {overallStats.shortageItems} SKUs with Shortage
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border shadow-sm rounded-xl shadow-sm border-slate-200/60 dark:border-border">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">Excess Impact</span>
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg"><ArrowUpRight className="h-4 w-4" /></div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
                +₹{overallStats.excessValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-medium">
                {overallStats.excessItems} SKUs with Surplus
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 1: Individual Excel Report Cards Grid */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-foreground">Detailed Excel Reports</h3>
            <p className="text-xs text-muted-foreground">Download tailored spreadsheets with variance insights, notes, and audit history.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reportsList.map((report) => {
            const Icon = report.icon;
            const isDownloading = downloadingType === report.id;

            return (
              <Card key={report.id} className="bg-card border border-border shadow-sm rounded-xl flex flex-col justify-between hover:shadow-md transition-all duration-300 border-slate-200/60 dark:border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2.5 rounded-xl ${report.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold ${report.badgeColor}`}>
                      {report.badgeText}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold mt-3 text-slate-900 dark:text-foreground">
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground dark:text-muted-foreground leading-relaxed">
                    {report.subtitle}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <Button 
                    variant={report.buttonVariant} 
                    className="w-full rounded-xl font-semibold h-10 shadow-sm"
                    onClick={() => handleDownloadExcel(report.id)}
                    disabled={isDownloading || !!downloadingType}
                  >
                    {isDownloading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    {report.buttonText}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Section 2: PDF Executive Summary Card */}
      <Card className="bg-card border border-border shadow-sm rounded-xl border-slate-200/60 dark:border-border bg-gradient-to-r from-slate-900 to-slate-800 text-foreground shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/10 rounded-lg text-foreground">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-black tracking-tight">Executive Management PDF Summary</h3>
              </div>
              <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                Generate a ready-to-present PDF summary including executive KPI scorecards, brand-by-brand audit performance table, and top 15 critical variance items requiring management sign-off.
              </p>
            </div>

            <Button 
              size="lg"
              className="bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl shadow-lg shrink-0 h-12 px-6"
              onClick={handleDownloadPDF}
              disabled={downloadingType === 'pdf'}
            >
              {downloadingType === 'pdf' ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-slate-900" />
              ) : (
                <Download className="mr-2 h-5 w-5 text-slate-900" />
              )}
              Download Executive PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Brand-Wise Summary Table */}
      <Card className="bg-card border border-border shadow-sm rounded-xl border-slate-200/60 dark:border-border overflow-hidden">
        <CardHeader className="bg-slate-50/50 dark:bg-secondary/50 border-b border-slate-200/60 dark:border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold">Brand-Wise Summary</CardTitle>
              </div>
              <CardDescription className="text-xs mt-1">
                Comparative reconciliation performance grouped by brand.
              </CardDescription>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl font-bold gap-2 text-xs"
              onClick={() => handleDownloadExcel('brand_summary')}
              disabled={downloadingType === 'brand_summary'}
            >
              {downloadingType === 'brand_summary' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
              )}
              Export Brand Summary (Excel)
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/50 dark:bg-secondary/50 text-slate-600 dark:text-muted-foreground uppercase text-[11px] font-bold tracking-wider border-b border-slate-200/60 dark:border-border">
                <tr>
                  <th className="py-3.5 px-4">Brand</th>
                  <th className="py-3.5 px-3 text-center">Progress</th>
                  <th className="py-3.5 px-3 text-right">System Value</th>
                  <th className="py-3.5 px-3 text-right">Physical Value</th>
                  <th className="py-3.5 px-3 text-right">Net Variance</th>
                  <th className="py-3.5 px-3 text-center">Shortages</th>
                  <th className="py-3.5 px-3 text-center">Excess</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {brandSummaries
                  .filter(b => selectedBrand === 'All Brands' || b.brand === selectedBrand)
                  .map((b) => {
                    const progressPct = b.totalSkus > 0 ? (b.countedSkus / b.totalSkus) * 100 : 0;
                    return (
                      <tr key={b.brand} className="hover:bg-slate-50/50 dark:hover:bg-secondary/50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-foreground">
                          {b.brand}
                          <div className="text-[11px] font-normal text-muted-foreground">
                            {b.totalSkus} Total SKUs
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-xs font-bold text-slate-700 dark:text-muted-foreground">
                              {b.countedSkus} / {b.totalSkus}
                            </span>
                            <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-slate-600 dark:text-muted-foreground">
                          ₹{Math.round(b.systemValue).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-3 text-right font-medium text-slate-600 dark:text-muted-foreground">
                          ₹{Math.round(b.physicalValue).toLocaleString('en-IN')}
                        </td>
                        <td className={`py-3.5 px-3 text-right font-bold ${
                          b.netVarianceValue < 0 ? 'text-red-600 dark:text-red-400' :
                          b.netVarianceValue > 0 ? 'text-amber-600 dark:text-amber-400' :
                          'text-green-600 dark:text-green-400'
                        }`}>
                          {b.netVarianceValue > 0 ? '+' : ''}₹{Math.round(b.netVarianceValue).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {b.shortageCount > 0 ? (
                            <Badge variant="outline" className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 font-bold text-[11px]">
                              {b.shortageCount}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {b.excessCount > 0 ? (
                            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 font-bold text-[11px]">
                              {b.excessCount}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
