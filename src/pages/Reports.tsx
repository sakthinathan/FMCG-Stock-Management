import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet, Download, FileText, History,
  Building2, Layers, Calendar, Search, X,
  AlertTriangle, AlertCircle, TrendingUp, TrendingDown,
  CheckCircle2, Globe, ListChecks, MessageCircle, SlidersHorizontal, Share2
} from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AlertModal } from '@/components/common/AlertModal';
import { exportDataToExcel, exportReportToPdf, type ReportType } from '@/lib/reportExportUtils';
import { useAuth } from '@/contexts/AuthContext';
import { calculateCbbPcs, formatCbbPcs } from '@/lib/cbbUtils';
import { BrandSelectorReportModal } from '@/components/common/BrandSelectorReportModal';

interface BrandSummaryItem {
  brand: string;
  totalSkus: number;
  countedSkus: number;
  systemCbb: number;
  systemLoosePcs: number;
  systemQtyPcs: number;
  physicalCbb: number;
  physicalLoosePcs: number;
  physicalQtyPcs: number;
  netVarCbb: number;
  netVarLoosePcs: number;
  netVariancePcs: number;
  shortageCount: number;
  excessCount: number;
  resolvedCount: number;
}

const CARD_BOX: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 14,
  border: '1px solid #e2e8f0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
};

export function Reports() {
  const { activeUploadId } = useStockStore();
  const { agency, profile } = useAuth();

  // Control Filters
  const [uploads, setUploads] = useState<any[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>('');
  const [compareUploadId, setCompareUploadId] = useState<string>('');
  const [compareMode, setCompareMode] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [brandScope, setBrandScope] = useState<'all' | 'completed' | 'counted'>('all');
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);

  // Raw Database Data
  const [loading, setLoading] = useState(true);
  const [rawSnapshots, setRawSnapshots] = useState<any[]>([]);
  const [rawCounts, setRawCounts] = useState<any[]>([]);
  const [comparisonRows, setComparisonRows] = useState<any[]>([]);

  // Active Report Hub State
  const [activeReportType, setActiveReportType] = useState<ReportType>('full');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingType, setDownloadingType] = useState<'excel' | 'pdf' | null>(null);
  const [showBrandSelectorModal, setShowBrandSelectorModal] = useState(false);

  // Modal notification state
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    message: string;
    title?: string;
    type?: 'info' | 'error' | 'success' | 'warning';
  }>({
    isOpen: false,
    message: '',
  });

  const showAlert = (message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info', title?: string) => {
    setAlertConfig({ isOpen: true, message, type, title });
  };

  const currentAgencyId = agency?.id || profile?.agency_id;
  const agencyName = agency?.name || 'FMCG DISTRIBUTOR';

  // 1. Fetch upload history
  useEffect(() => {
    async function fetchUploads() {
      try {
        if (!currentAgencyId) return;
        const { data } = await supabase
          .from('stock_uploads')
          .select('*')
          .eq('agency_id', currentAgencyId)
          .order('uploaded_at', { ascending: false });
        if (data) {
          setUploads(data);
          if (activeUploadId && data.some(x => x.id === activeUploadId)) {
            setSelectedUploadId(activeUploadId);
          } else if (data.length > 0) {
            setSelectedUploadId(data[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchUploads();
  }, [activeUploadId, currentAgencyId]);

  // 2. Fetch sessions for the selected upload
  useEffect(() => {
    async function fetchSessions() {
      if (!selectedUploadId) return;
      try {
        const { data } = await supabase
          .from('stock_count_sessions')
          .select('*')
          .eq('upload_id', selectedUploadId);
        if (data) {
          setSessions(data);
          setSelectedSessionId('All');
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchSessions();
  }, [selectedUploadId]);

  // 3. Load snapshot stats and counts
  useEffect(() => {
    async function loadData() {
      if (!selectedUploadId) { setLoading(false); return; }
      try {
        setLoading(true);

        const { data: snapshotsA } = await supabase
          .from('system_stock_snapshots')
          .select('*')
          .eq('upload_id', selectedUploadId)
          .order('brand', { ascending: true })
          .order('material', { ascending: true });

        const { data: countsA } = await supabase
          .from('physical_stock_counts')
          .select('*');

        setRawSnapshots(snapshotsA || []);
        setRawCounts(countsA || []);

        // Unique Brands
        const brandsSet = new Set<string>();
        snapshotsA?.forEach(s => brandsSet.add(s.brand || 'Unbranded'));
        setUniqueBrands(Array.from(brandsSet).sort());

        // Comparison mode calculation
        if (compareMode && compareUploadId) {
          const { data: snapshotsB } = await supabase
            .from('system_stock_snapshots')
            .select('*')
            .eq('upload_id', compareUploadId);
          const { data: countsB } = await supabase
            .from('physical_stock_counts')
            .select('*');

          const fullCountMapA = new Map();
          countsA?.forEach(c => fullCountMapA.set(c.snapshot_id, c));

          const countMapB = new Map();
          countsB?.forEach(c => countMapB.set(c.snapshot_id, c));

          const compRows: any[] = [];
          snapshotsA?.forEach(snapA => {
            if (selectedBrand !== 'All Brands' && snapA.brand !== selectedBrand) return;

            const snapB = snapshotsB?.find(x => x.material === snapA.material && x.mrp === snapA.mrp);
            const countA = fullCountMapA.get(snapA.id);
            const countB = snapB ? countMapB.get(snapB.id) : null;

            const mrp = Number(snapA.mrp) || 0;
            const conv = Number(snapA.conversion) > 0 ? Number(snapA.conversion) : 1;
            const sysA = Number(snapA.system_qty_pcs) || 0;
            const phyA = countA ? Number(countA.physical_total_pcs) || 0 : 0;
            const varA = countA ? Number(countA.variance) || 0 : 0;

            const sysB = snapB ? Number(snapB.system_qty_pcs) || 0 : 0;
            const phyB = countB ? Number(countB.physical_total_pcs) || 0 : 0;
            const varB = countB ? Number(countB.variance) || 0 : 0;

            compRows.push({
              material: snapA.material,
              description: snapA.material_desc,
              brand: snapA.brand,
              mrp,
              conversion: conv,
              sysA, phyA, varA,
              sysB, phyB, varB,
              deltaCount: phyB - phyA,
            });
          });
          setComparisonRows(compRows);
        } else {
          setComparisonRows([]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedUploadId, compareUploadId, compareMode, selectedSessionId, selectedBrand]);

  // 4. Compute Counts & Aggregates (Including CBB & PCS exact decomposition)
  const { countMap, brandSummaries } = useMemo(() => {
    const cMap = new Map();
    if (selectedSessionId !== 'All') {
      rawCounts.filter(c => c.session_id === selectedSessionId).forEach(c => cMap.set(c.snapshot_id, c));
    } else {
      rawCounts.forEach(c => cMap.set(c.snapshot_id, c));
    }

    const bMap = new Map<string, BrandSummaryItem>();

    rawSnapshots.forEach(snap => {
      const b = snap.brand || 'Unbranded';
      const conv = Number(snap.conversion) > 0 ? Number(snap.conversion) : 1;

      if (!bMap.has(b)) {
        bMap.set(b, {
          brand: b,
          totalSkus: 0,
          countedSkus: 0,
          systemCbb: 0,
          systemLoosePcs: 0,
          systemQtyPcs: 0,
          physicalCbb: 0,
          physicalLoosePcs: 0,
          physicalQtyPcs: 0,
          netVarCbb: 0,
          netVarLoosePcs: 0,
          netVariancePcs: 0,
          shortageCount: 0,
          excessCount: 0,
          resolvedCount: 0,
        });
      }
      const entry = bMap.get(b)!;
      entry.totalSkus++;
      const sysPcs = Number(snap.system_qty_pcs) || 0;
      const skuSysCbb = Math.floor(sysPcs / conv);
      const skuSysLoose = sysPcs % conv;

      entry.systemQtyPcs += sysPcs;
      entry.systemCbb += skuSysCbb;
      entry.systemLoosePcs += skuSysLoose;

      const count = cMap.get(snap.id);
      if (count) {
        entry.countedSkus++;
        const phyPcs = Number(count.physical_total_pcs) || 0;
        const skuPhyCbb = Math.floor(phyPcs / conv);
        const skuPhyLoose = phyPcs % conv;

        const variance = Number(count.variance) || 0;
        const prevVariance = Number(snap.prev_variance) || 0;

        entry.physicalQtyPcs += phyPcs;
        entry.physicalCbb += skuPhyCbb;
        entry.physicalLoosePcs += skuPhyLoose;
        entry.netVariancePcs += variance;

        if (variance < 0) {
          entry.shortageCount++;
        } else if (variance > 0) {
          entry.excessCount++;
        } else if (variance === 0 && prevVariance !== 0) {
          entry.resolvedCount++;
        }
      }
    });

    const bList = Array.from(bMap.values()).map(b => ({
      ...b,
      netVarCbb: Math.abs(b.physicalCbb - b.systemCbb),
      netVarLoosePcs: Math.abs(b.physicalLoosePcs - b.systemLoosePcs),
    })).sort((a, b) => b.systemQtyPcs - a.systemQtyPcs);

    return {
      countMap: cMap,
      brandSummaries: bList,
    };
  }, [rawSnapshots, rawCounts, selectedSessionId]);

  // 4b. Identify Completed & Counted Brands
  const { completedBrandNames, countedBrandNames } = useMemo(() => {
    const completed = new Set<string>();
    const counted = new Set<string>();

    // 1. Through SKU counting progress
    brandSummaries.forEach(b => {
      if (b.countedSkus > 0) counted.add(b.brand);
      if (b.totalSkus > 0 && b.countedSkus >= b.totalSkus) {
        completed.add(b.brand);
      }
    });

    // 2. Through stock count session statuses
    sessions.forEach(s => {
      const bName = s.brand || s.session_name;
      if (bName) {
        if (s.status === 'Completed') {
          completed.add(bName);
          counted.add(bName);
        } else if (s.status === 'In Progress') {
          counted.add(bName);
        }
      }
    });

    return { completedBrandNames: completed, countedBrandNames: counted };
  }, [brandSummaries, sessions]);

  // 4c. Compute Scoped Stats according to brandScope and selectedBrand
  const { scopedStats, categoryCounts } = useMemo(() => {
    let totalSysQty = 0;
    let totalPhyQty = 0;
    let totalSysCbb = 0;
    let totalSysLoosePcs = 0;
    let totalPhyCbb = 0;
    let totalPhyLoosePcs = 0;

    let totalShortageQty = 0;
    let totalShortageCbb = 0;
    let totalShortageLoosePcs = 0;

    let totalExcessQty = 0;
    let totalExcessCbb = 0;
    let totalExcessLoosePcs = 0;

    let totalShortageCount = 0;
    let totalExcessCount = 0;
    let totalCounted = 0;
    let totalSkus = 0;
    let newIssuesCount = 0;
    let increasedVarianceCount = 0;

    rawSnapshots.forEach(snap => {
      const b = snap.brand || 'Unbranded';
      if (selectedBrand !== 'All Brands' && b !== selectedBrand) return;
      if (brandScope === 'completed' && !completedBrandNames.has(b)) return;
      if (brandScope === 'counted' && !countedBrandNames.has(b)) return;

      totalSkus++;
      const conv = Number(snap.conversion) > 0 ? Number(snap.conversion) : 1;
      const sysPcs = Number(snap.system_qty_pcs) || 0;
      const skuSysCbb = Math.floor(sysPcs / conv);
      const skuSysLoose = sysPcs % conv;

      totalSysQty += sysPcs;
      totalSysCbb += skuSysCbb;
      totalSysLoosePcs += skuSysLoose;

      const count = countMap.get(snap.id);
      if (count) {
        totalCounted++;
        const phyPcs = Number(count.physical_total_pcs) || 0;
        const skuPhyCbb = Math.floor(phyPcs / conv);
        const skuPhyLoose = phyPcs % conv;

        const variance = Number(count.variance) || 0;
        const prevVariance = Number(snap.prev_variance) || 0;

        totalPhyQty += phyPcs;
        totalPhyCbb += skuPhyCbb;
        totalPhyLoosePcs += skuPhyLoose;

        if (variance < 0) {
          const absVar = Math.abs(variance);
          totalShortageCount++;
          totalShortageQty += absVar;
          totalShortageCbb += Math.floor(absVar / conv);
          totalShortageLoosePcs += absVar % conv;
        } else if (variance > 0) {
          totalExcessCount++;
          totalExcessQty += variance;
          totalExcessCbb += Math.floor(variance / conv);
          totalExcessLoosePcs += variance % conv;
        }

        if (prevVariance === 0 && variance !== 0) newIssuesCount++;
        if (Math.abs(variance) > Math.abs(prevVariance) && variance !== 0) increasedVarianceCount++;
      }
    });

    const scopedBrandsCount = brandSummaries.filter(b => {
      if (selectedBrand !== 'All Brands' && b.brand !== selectedBrand) return false;
      if (brandScope === 'completed' && !completedBrandNames.has(b.brand)) return false;
      if (brandScope === 'counted' && !countedBrandNames.has(b.brand)) return false;
      return true;
    }).length;

    return {
      scopedStats: {
        totalSkus,
        countedSkus: totalCounted,
        systemCbb: totalSysCbb,
        systemLoosePcs: totalSysLoosePcs,
        systemQtyPcs: totalSysQty,
        physicalCbb: totalPhyCbb,
        physicalLoosePcs: totalPhyLoosePcs,
        physicalQtyPcs: totalPhyQty,
        shortageCbb: totalShortageCbb,
        shortageLoosePcs: totalShortageLoosePcs,
        shortageQtyPcs: totalShortageQty,
        excessCbb: totalExcessCbb,
        excessLoosePcs: totalExcessLoosePcs,
        excessQtyPcs: totalExcessQty,
        netVarCbb: Math.abs(totalPhyCbb - totalSysCbb),
        netVarLoosePcs: Math.abs(totalPhyLoosePcs - totalSysLoosePcs),
        netVariancePcs: totalPhyQty - totalSysQty,
        shortageItems: totalShortageCount,
        excessItems: totalExcessCount,
      },
      categoryCounts: {
        full: totalSkus,
        shortage: totalShortageCount,
        excess: totalExcessCount,
        brand_summary: scopedBrandsCount,
        new_issues: newIssuesCount,
        increased_variance: increasedVarianceCount,
        historical_comparison: comparisonRows.length,
      },
    };
  }, [rawSnapshots, countMap, brandSummaries, selectedBrand, brandScope, completedBrandNames, countedBrandNames, comparisonRows.length]);

  // 5. Generate active report records (All system, physical, and difference values formatted as CBB & PCS)
  const activeReportRows = useMemo(() => {
    if (activeReportType === 'brand_summary') {
      return brandSummaries
        .filter((b: BrandSummaryItem) => {
          if (selectedBrand !== 'All Brands' && b.brand !== selectedBrand) return false;
          if (brandScope === 'completed' && !completedBrandNames.has(b.brand)) return false;
          if (brandScope === 'counted' && !countedBrandNames.has(b.brand)) return false;
          return true;
        })
        .map((b: BrandSummaryItem) => ({
          'Brand': b.brand,
          'Total SKUs': b.totalSkus,
          'Counted SKUs': b.countedSkus,
          'Progress %': b.totalSkus > 0 ? `${((b.countedSkus / b.totalSkus) * 100).toFixed(1)}%` : '0%',
          'System Stock (CBB & PCS)': `${b.systemCbb} CBB + ${b.systemLoosePcs} PCS`,
          'System Qty (PCS)': b.systemQtyPcs,
          'Physical Stock (CBB & PCS)': `${b.physicalCbb} CBB + ${b.physicalLoosePcs} PCS`,
          'Physical Qty (PCS)': b.physicalQtyPcs,
          'Net Difference (CBB & PCS)': `${b.netVariancePcs < 0 ? '-' : b.netVariancePcs > 0 ? '+' : ''}${b.netVarCbb} CBB ${b.netVariancePcs < 0 ? '-' : b.netVariancePcs > 0 ? '+' : ''}${b.netVarLoosePcs} PCS`,
          'Net Variance (PCS)': b.netVariancePcs,
          'Shortage Count': b.shortageCount,
          'Excess Count': b.excessCount,
          'Resolved Count': b.resolvedCount,
        }));
    }

    if (activeReportType === 'historical_comparison') {
      return comparisonRows
        .filter(r => {
          if (selectedBrand !== 'All Brands' && r.brand !== selectedBrand) return false;
          if (brandScope === 'completed' && !completedBrandNames.has(r.brand)) return false;
          if (brandScope === 'counted' && !countedBrandNames.has(r.brand)) return false;
          return true;
        })
        .map(r => {
          const conv = r.conversion || 1;
          const diffBreakdown = calculateCbbPcs(r.deltaCount, conv, true);
          return {
            'Material': r.material,
            'Description': r.description,
            'Brand': r.brand,
            'MRP (₹)': r.mrp,
            'Case Size (1 CBB)': `${conv} PCS`,
            'Upload A Sys (PCS)': r.sysA,
            'Upload A Phy (PCS)': r.phyA,
            'Upload A Var (PCS)': r.varA,
            'Upload B Sys (PCS)': r.sysB,
            'Upload B Phy (PCS)': r.phyB,
            'Upload B Var (PCS)': r.varB,
            'Delta Difference (CBB & PCS)': diffBreakdown.formatted,
            'Delta Count (PCS)': r.deltaCount,
          };
        });
    }

    const rows: any[] = [];
    rawSnapshots.forEach(snap => {
      const b = snap.brand || 'Unbranded';
      if (selectedBrand !== 'All Brands' && b !== selectedBrand) return;
      if (brandScope === 'completed' && !completedBrandNames.has(b)) return;
      if (brandScope === 'counted' && !countedBrandNames.has(b)) return;

      const count = countMap.get(snap.id);
      const mrp = Number(snap.mrp) || 0;
      const conv = Number(snap.conversion) > 0 ? Number(snap.conversion) : 1;
      const sysPcs = Number(snap.system_qty_pcs) || 0;
      const phyPcs = count ? Number(count.physical_total_pcs) || 0 : null;
      const variance = count ? Number(count.variance) || 0 : null;
      const prevVariance = Number(snap.prev_variance) || 0;
      const status = count ? count.status : 'Not Counted';

      const sysBreakdown = calculateCbbPcs(sysPcs, conv, false);
      const phyBreakdown = count ? calculateCbbPcs(phyPcs, conv, false) : null;
      const varBreakdown = count ? calculateCbbPcs(variance, conv, true) : null;
      const prevVarBreakdown = calculateCbbPcs(prevVariance, conv, true);

      let trend = 'No Change';
      if (count && variance !== null) {
        if (prevVariance === 0 && variance !== 0) trend = 'New Issue';
        else if (variance === 0 && prevVariance !== 0) trend = 'Resolved';
        else if (Math.abs(variance) > Math.abs(prevVariance)) trend = 'Increased Variance';
        else if (Math.abs(variance) < Math.abs(prevVariance)) trend = 'Decreased Variance';
      }

      const row = {
        'Material': snap.material,
        'Description': snap.material_desc,
        'Brand': snap.brand,
        'MRP (₹)': mrp,
        'Case Size (1 CBB)': `${conv} PCS`,
        'System Stock (CBB & PCS)': sysBreakdown.formatted,
        'System Qty (PCS)': sysPcs,
        'Physical Stock (CBB & PCS)': phyBreakdown ? phyBreakdown.formatted : 'Not Counted',
        'Physical Qty (PCS)': count ? phyPcs : 'Not Counted',
        'Difference (CBB & PCS)': varBreakdown ? varBreakdown.formatted : '',
        'Variance (PCS)': count ? variance : '',
        'Status': status,
        'Reason Code': count?.reason_code || '',
        'Notes': count?.notes || '',
        'Previous Variance (CBB & PCS)': prevVarBreakdown.formatted,
        'Previous Variance (PCS)': prevVariance,
        'Trend': trend,
      };

      if (activeReportType === 'full') rows.push(row);
      else if (activeReportType === 'shortage' && count && status === 'Shortage') rows.push(row);
      else if (activeReportType === 'excess' && count && status === 'Excess') rows.push(row);
      else if (activeReportType === 'increased_variance' && count && Math.abs(variance || 0) > Math.abs(prevVariance) && (variance || 0) !== 0) rows.push(row);
      else if (activeReportType === 'new_issues' && count && prevVariance === 0 && (variance || 0) !== 0) rows.push(row);
    });

    return rows;
  }, [activeReportType, rawSnapshots, countMap, brandSummaries, comparisonRows, selectedBrand, brandScope, completedBrandNames, countedBrandNames]);

  // 6. Search filtering on active preview rows
  const filteredPreviewRows = useMemo(() => {
    if (!searchQuery.trim()) return activeReportRows;
    const query = searchQuery.toLowerCase().trim();

    return activeReportRows.filter((r: any) => {
      if (activeReportType === 'brand_summary') {
        return (r['Brand'] || '').toLowerCase().includes(query);
      }
      return (
        (r['Material'] || '').toLowerCase().includes(query) ||
        (r['Description'] || '').toLowerCase().includes(query) ||
        (r['Brand'] || '').toLowerCase().includes(query) ||
        (String(r['Status'] || '')).toLowerCase().includes(query) ||
        (String(r['Trend'] || '')).toLowerCase().includes(query) ||
        (String(r['Reason Code'] || '')).toLowerCase().includes(query)
      );
    });
  }, [activeReportRows, searchQuery, activeReportType]);

  // 7. Universal Export Actions
  const handleExportExcel = () => {
    setDownloadingType('excel');
    try {
      if (!activeReportRows || activeReportRows.length === 0) {
        showAlert('No records available in this report scope to export.', 'info', 'No Data');
        return;
      }
      const scopePrefix = brandScope === 'completed' ? 'Completed_' : brandScope === 'counted' ? 'Counted_' : '';
      exportDataToExcel(activeReportRows, activeReportType, `Stock_${scopePrefix}${activeReportType}`);
      showAlert(`Successfully generated Excel export for ${REPORT_CONFIG[activeReportType]?.title || activeReportType}.`, 'success', 'Export Ready');
    } catch (e) {
      console.error(e);
      showAlert('Failed to generate Excel report. Please try again.', 'error', 'Export Failed');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleExportPdf = (scopeOverride?: 'completed') => {
    setDownloadingType('pdf');
    try {
      let rowsToExport = activeReportRows;
      let statsToExport = scopedStats;
      const isCompleted = scopeOverride === 'completed' || brandScope === 'completed';

      if (scopeOverride === 'completed' && brandScope !== 'completed') {
        rowsToExport = activeReportRows.filter((r: any) => completedBrandNames.has(r['Brand'] || ''));
      }

      if (!rowsToExport || rowsToExport.length === 0) {
        showAlert('No records available in this scope to print.', 'info', 'No Data');
        return;
      }

      const scopeSuffix = isCompleted
        ? ' (Completed Brands Only)'
        : brandScope === 'counted'
        ? ' (Counted Brands Only)'
        : '';

      const title = `${REPORT_CONFIG[activeReportType]?.pdfTitle || 'Stock Audit Report'}${scopeSuffix}`;
      exportReportToPdf(rowsToExport, title, statsToExport, agencyName);
      showAlert(`PDF document generated for ${REPORT_CONFIG[activeReportType]?.title || activeReportType}.`, 'success', 'PDF Ready');
    } catch (e) {
      console.error(e);
      showAlert('Failed to generate PDF document. Please try again.', 'error', 'PDF Failed');
    } finally {
      setDownloadingType(null);
    }
  };

  // Dedicated direct 1-click exporter for completed brands
  const handleExportCompletedPdf = () => {
    if (completedBrandNames.size === 0) {
      showAlert('No brands have fully completed stock checks yet for this upload. Brands appear here once all SKUs are counted or session is marked Completed.', 'warning', 'No Completed Brands');
      return;
    }
    handleExportPdf('completed');
  };

  // Computes precise rows and CBB & PCS statistics for an arbitrary selection of brands
  const getReportDataForBrands = useCallback((brandNames: string[]) => {
    const brandSet = new Set(brandNames);

    let totalSysQty = 0;
    let totalPhyQty = 0;
    let totalSysCbb = 0;
    let totalSysLoosePcs = 0;
    let totalPhyCbb = 0;
    let totalPhyLoosePcs = 0;

    let totalShortageQty = 0;
    let totalShortageCbb = 0;
    let totalShortageLoosePcs = 0;

    let totalExcessQty = 0;
    let totalExcessCbb = 0;
    let totalExcessLoosePcs = 0;

    let totalShortageCount = 0;
    let totalExcessCount = 0;
    let totalCounted = 0;
    let totalSkus = 0;

    const rows: any[] = [];

    rawSnapshots.forEach(snap => {
      const b = snap.brand || 'Unbranded';
      if (!brandSet.has(b)) return;

      totalSkus++;
      const conv = Number(snap.conversion) > 0 ? Number(snap.conversion) : 1;
      const mrp = Number(snap.mrp) || 0;
      const sysPcs = Number(snap.system_qty_pcs) || 0;
      const skuSysCbb = Math.floor(sysPcs / conv);
      const skuSysLoose = sysPcs % conv;

      totalSysQty += sysPcs;
      totalSysCbb += skuSysCbb;
      totalSysLoosePcs += skuSysLoose;

      const count = countMap.get(snap.id);
      const phyPcs = count ? Number(count.physical_total_pcs) || 0 : null;
      const variance = count ? Number(count.variance) || 0 : null;
      const prevVariance = Number(snap.prev_variance) || 0;
      const status = count ? count.status : 'Not Counted';

      const sysBreakdown = calculateCbbPcs(sysPcs, conv, false);
      const phyBreakdown = count ? calculateCbbPcs(phyPcs, conv, false) : null;
      const varBreakdown = count ? calculateCbbPcs(variance, conv, true) : null;
      const prevVarBreakdown = calculateCbbPcs(prevVariance, conv, true);

      let trend = 'No Change';
      if (count && variance !== null) {
        totalCounted++;
        const skuPhyCbb = Math.floor((phyPcs || 0) / conv);
        const skuPhyLoose = (phyPcs || 0) % conv;
        totalPhyQty += (phyPcs || 0);
        totalPhyCbb += skuPhyCbb;
        totalPhyLoosePcs += skuPhyLoose;

        if (variance < 0) {
          const absVar = Math.abs(variance);
          totalShortageCount++;
          totalShortageQty += absVar;
          totalShortageCbb += Math.floor(absVar / conv);
          totalShortageLoosePcs += absVar % conv;
        } else if (variance > 0) {
          totalExcessCount++;
          totalExcessQty += variance;
          totalExcessCbb += Math.floor(variance / conv);
          totalExcessLoosePcs += variance % conv;
        }

        if (prevVariance === 0 && variance !== 0) trend = 'New Issue';
        else if (variance === 0 && prevVariance !== 0) trend = 'Resolved';
        else if (Math.abs(variance) > Math.abs(prevVariance)) trend = 'Increased Variance';
        else if (Math.abs(variance) < Math.abs(prevVariance)) trend = 'Decreased Variance';
      }

      const row = {
        'Material': snap.material,
        'Description': snap.material_desc,
        'Brand': snap.brand,
        'MRP (₹)': mrp,
        'Case Size (1 CBB)': `${conv} PCS`,
        'System Stock (CBB & PCS)': sysBreakdown.formatted,
        'System Qty (PCS)': sysPcs,
        'Physical Stock (CBB & PCS)': phyBreakdown ? phyBreakdown.formatted : 'Not Counted',
        'Physical Qty (PCS)': count ? phyPcs : 'Not Counted',
        'Difference (CBB & PCS)': varBreakdown ? varBreakdown.formatted : '',
        'Variance (PCS)': count ? variance : '',
        'Status': status,
        'Reason Code': count?.reason_code || '',
        'Notes': count?.notes || '',
        'Previous Variance (CBB & PCS)': prevVarBreakdown.formatted,
        'Previous Variance (PCS)': prevVariance,
        'Trend': trend,
      };

      if (activeReportType === 'full') rows.push(row);
      else if (activeReportType === 'shortage' && count && status === 'Shortage') rows.push(row);
      else if (activeReportType === 'excess' && count && status === 'Excess') rows.push(row);
      else if (activeReportType === 'increased_variance' && count && Math.abs(variance || 0) > Math.abs(prevVariance) && (variance || 0) !== 0) rows.push(row);
      else if (activeReportType === 'new_issues' && count && prevVariance === 0 && (variance || 0) !== 0) rows.push(row);
      else rows.push(row);
    });

    const stats = {
      totalSkus,
      countedSkus: totalCounted,
      systemCbb: totalSysCbb,
      systemLoosePcs: totalSysLoosePcs,
      systemQtyPcs: totalSysQty,
      physicalCbb: totalPhyCbb,
      physicalLoosePcs: totalPhyLoosePcs,
      physicalQtyPcs: totalPhyQty,
      shortageCbb: totalShortageCbb,
      shortageLoosePcs: totalShortageLoosePcs,
      shortageQtyPcs: totalShortageQty,
      excessCbb: totalExcessCbb,
      excessLoosePcs: totalExcessLoosePcs,
      excessQtyPcs: totalExcessQty,
      netVarCbb: Math.abs(totalPhyCbb - totalSysCbb),
      netVarLoosePcs: Math.abs(totalPhyLoosePcs - totalSysLoosePcs),
      netVariancePcs: totalPhyQty - totalSysQty,
      shortageItems: totalShortageCount,
      excessItems: totalExcessCount,
    };

    return { rows, stats };
  }, [rawSnapshots, countMap, activeReportType]);

  // Report configuration metadata
  const REPORT_CONFIG: Record<
    ReportType,
    {
      title: string;
      subtitle: string;
      desc: string;
      pdfTitle: string;
      icon: React.ElementType;
      color: string;
      accentBg: string;
      count: number;
      unit: string;
    }
  > = {
    full: {
      title: 'Full Audit',
      subtitle: 'Complete SKU inventory snapshot',
      desc: 'Itemized inventory list of all materials with physical counts, recorded system quantities, and calculated variances in CBB and PCS.',
      pdfTitle: 'Comprehensive Stock Audit Report',
      icon: FileText,
      color: '#4f46e5',
      accentBg: '#eef2ff',
      count: categoryCounts.full,
      unit: 'SKUs',
    },
    shortage: {
      title: 'Shortages',
      subtitle: 'Physical < System stock',
      desc: 'All materials where physical count is lower than master book stock, displayed as Cases (CBB) and loose pieces (PCS).',
      pdfTitle: 'Stock Shortage Discrepancy Report',
      icon: AlertTriangle,
      color: '#dc2626',
      accentBg: '#fef2f2',
      count: categoryCounts.shortage,
      unit: 'Short',
    },
    excess: {
      title: 'Excess Surplus',
      subtitle: 'Physical > System stock',
      desc: 'Materials with verified physical inventory exceeding system records, displayed as Cases (CBB) and loose pieces (PCS).',
      pdfTitle: 'Stock Excess Surplus Report',
      icon: TrendingUp,
      color: '#d97706',
      accentBg: '#fffbeb',
      count: categoryCounts.excess,
      unit: 'Excess',
    },
    brand_summary: {
      title: 'Brand Breakdown',
      subtitle: 'Category progress & totals',
      desc: 'Executive summary grouped by brand category showing total SKUs, audit completion progress, and net CBB/PCS variances.',
      pdfTitle: 'Brand Category Stock Summary Report',
      icon: Building2,
      color: '#059669',
      accentBg: '#ecfdf5',
      count: categoryCounts.brand_summary,
      unit: 'Brands',
    },
    new_issues: {
      title: 'New Issues',
      subtitle: 'Fresh variances this audit',
      desc: 'Materials that were balanced in previous cycles but developed a discrepancy in this audit.',
      pdfTitle: 'New Stock Discrepancies Report',
      icon: AlertCircle,
      color: '#7c3aed',
      accentBg: '#f5f3ff',
      count: categoryCounts.new_issues,
      unit: 'New',
    },
    increased_variance: {
      title: 'Escalated',
      subtitle: 'Widened variance gap',
      desc: 'Items where discrepancy has expanded compared to historical audit logs.',
      pdfTitle: 'Escalated Stock Variances Report',
      icon: TrendingDown,
      color: '#e11d48',
      accentBg: '#fff1f2',
      count: categoryCounts.increased_variance,
      unit: 'Widened',
    },
    historical_comparison: {
      title: 'Snapshot Compare',
      subtitle: 'Delta vs secondary upload',
      desc: 'Direct SKU-by-SKU side comparison between primary upload and historical snapshot.',
      pdfTitle: 'Stock Snapshot Comparison Audit',
      icon: History,
      color: '#4338ca',
      accentBg: '#e0e7ff',
      count: categoryCounts.historical_comparison,
      unit: 'Items',
    },
  };

  const currentConfig = REPORT_CONFIG[activeReportType] || REPORT_CONFIG.full;

  if (loading && !selectedUploadId) {
    return <LoadingSpinner label="Loading reports workspace..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header with Direct Completed Brands PDF Export */}
      <PageHeader
        title="Stock Audit Reports & Export Hub"
        description="Unified analytics hub: preview discrepancies in real-time, inspect CBB and PCS quantities, and export verified Excel or PDF reports"
        icon={FileSpreadsheet}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Direct WhatsApp Report with Brand Selector & PDF attachment */}
            <button
              onClick={() => setShowBrandSelectorModal(true)}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: 'none',
                background: '#22c55e',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                boxShadow: '0 3px 10px rgba(34, 197, 94, 0.35)',
                transition: 'all 0.15s ease',
              }}
              title="Select brands, generate PDF, and share directly to WhatsApp with PDF attached"
            >
              <MessageCircle size={16} />
              WhatsApp Report (PDF)
            </button>

            {/* Customize Brands Selector & Multi-Export */}
            <button
              onClick={() => setShowBrandSelectorModal(true)}
              style={{
                padding: '10px 15px',
                borderRadius: 10,
                border: '1.5px solid #cbd5e1',
                background: '#ffffff',
                color: '#334155',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.15s ease',
              }}
              title="Select specific brands to download as PDF, Excel, or share via WhatsApp"
            >
              <SlidersHorizontal size={15} color="#64748b" />
              Customize Brands ({completedBrandNames.size}/{uniqueBrands.length})
            </button>

            {/* Quick 1-Click PDF export for completed brands */}
            <button
              onClick={handleExportCompletedPdf}
              disabled={downloadingType === 'pdf'}
              style={{
                padding: '10px 16px',
                borderRadius: 10,
                border: '1.5px solid #bbf7d0',
                background: '#f0fdf4',
                color: '#166534',
                fontSize: 13,
                fontWeight: 700,
                cursor: downloadingType === 'pdf' ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(22, 101, 52, 0.08)',
                transition: 'all 0.15s ease',
              }}
              title="Download PDF containing only brands where stock check is complete"
            >
              <CheckCircle2 size={15} color="#16a34a" />
              Completed Brands PDF ({completedBrandNames.size})
            </button>

            {/* Print Active View PDF */}
            <button
              onClick={() => handleExportPdf()}
              disabled={downloadingType === 'pdf'}
              style={{
                padding: '10px 18px',
                borderRadius: 10,
                border: 'none',
                background: '#e52321',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: downloadingType === 'pdf' ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(229,35,33,0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              <Download size={15} /> Print Active View PDF
            </button>
          </div>
        }
      />

      {/* 2. Control Filter Panel with Brand Scope Switcher */}
      <div style={{ ...CARD_BOX, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Select Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={15} color="#64748b" />
            <select
              value={selectedUploadId}
              onChange={e => setSelectedUploadId(e.target.value)}
              style={{
                height: 38,
                padding: '0 10px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 13,
                color: '#0f172a',
                fontWeight: 600,
                background: '#fff',
                outline: 'none',
              }}
            >
              {uploads.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.file_name} ({new Date(u.uploaded_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Audit Scope Switcher (All vs Completed Only vs Counted Only) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: '#f1f5f9', padding: 3, borderRadius: 9, border: '1px solid #e2e8f0' }}>
            <button
              onClick={() => { setBrandScope('all'); setSelectedBrand('All Brands'); }}
              style={{
                padding: '6px 11px',
                borderRadius: 7,
                border: 'none',
                background: brandScope === 'all' ? '#ffffff' : 'transparent',
                color: brandScope === 'all' ? '#0f172a' : '#64748b',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: brandScope === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'inherit',
              }}
            >
              <Globe size={13} color={brandScope === 'all' ? '#4f46e5' : '#64748b'} />
              <span>All Brands</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: brandScope === 'all' ? '#eef2ff' : '#e2e8f0', color: brandScope === 'all' ? '#4338ca' : '#64748b', padding: '1px 6px', borderRadius: 9999 }}>
                {uniqueBrands.length}
              </span>
            </button>

            <button
              onClick={() => { setBrandScope('completed'); setSelectedBrand('All Brands'); }}
              style={{
                padding: '6px 11px',
                borderRadius: 7,
                border: 'none',
                background: brandScope === 'completed' ? '#ffffff' : 'transparent',
                color: brandScope === 'completed' ? '#166534' : '#64748b',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: brandScope === 'completed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'inherit',
              }}
              title="Show only brands where daily stock check is 100% complete"
            >
              <CheckCircle2 size={13} color="#16a34a" />
              <span>Completed Only</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: brandScope === 'completed' ? '#dcfce7' : '#e2e8f0', color: brandScope === 'completed' ? '#166534' : '#64748b', padding: '1px 6px', borderRadius: 9999 }}>
                {completedBrandNames.size}
              </span>
            </button>

            <button
              onClick={() => { setBrandScope('counted'); setSelectedBrand('All Brands'); }}
              style={{
                padding: '6px 11px',
                borderRadius: 7,
                border: 'none',
                background: brandScope === 'counted' ? '#ffffff' : 'transparent',
                color: brandScope === 'counted' ? '#4338ca' : '#64748b',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: brandScope === 'counted' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'inherit',
              }}
              title="Show brands that have any physical count recorded today"
            >
              <ListChecks size={13} color="#6366f1" />
              <span>Counted</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: brandScope === 'counted' ? '#eef2ff' : '#e2e8f0', color: brandScope === 'counted' ? '#4338ca' : '#64748b', padding: '1px 6px', borderRadius: 9999 }}>
                {countedBrandNames.size}
              </span>
            </button>
          </div>

          {/* Select Specific Brand Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={15} color="#64748b" />
            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              style={{
                height: 38,
                padding: '0 10px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 13,
                color: '#0f172a',
                background: '#fff',
                outline: 'none',
                maxWidth: 180,
              }}
            >
              <option value="All Brands">
                {brandScope === 'completed'
                  ? `All Completed (${completedBrandNames.size})`
                  : brandScope === 'counted'
                  ? `All Counted (${countedBrandNames.size})`
                  : `All Brands (${uniqueBrands.length})`}
              </option>
              {uniqueBrands
                .filter(b => {
                  if (brandScope === 'completed') return completedBrandNames.has(b);
                  if (brandScope === 'counted') return countedBrandNames.has(b);
                  return true;
                })
                .map((b: string) => {
                  const isComp = completedBrandNames.has(b);
                  const isCnt = countedBrandNames.has(b);
                  const tag = isComp ? ' ✓ Done' : isCnt ? ' ⏸ Active' : '';
                  return <option key={b} value={b}>{b}{tag}</option>;
                })}
            </select>
          </div>

          {/* Select Session Filter */}
          {sessions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={15} color="#64748b" />
              <select
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
                style={{
                  height: 38,
                  padding: '0 10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#0f172a',
                  background: '#fff',
                  outline: 'none',
                }}
              >
                <option value="All">All Count Sessions ({sessions.length})</option>
                {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.session_name || s.brand}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Compare Toggle */}
        <button
          onClick={() => {
            const nextMode = !compareMode;
            setCompareMode(nextMode);
            if (nextMode) setActiveReportType('historical_comparison');
            else if (activeReportType === 'historical_comparison') setActiveReportType('full');
          }}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: `1.5px solid ${compareMode ? '#c7d2fe' : '#e2e8f0'}`,
            background: compareMode ? '#eef2ff' : '#fff',
            color: compareMode ? '#4338ca' : '#475569',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <History size={14} />
          {compareMode ? 'Comparison Active' : 'Compare Snapshot'}
        </button>
      </div>

      {/* Snapshot Comparison Selector if Compare Mode */}
      {compareMode && (
        <div style={{ ...CARD_BOX, padding: '14px 20px', background: '#eef2ff', borderColor: '#c7d2fe', display: 'flex', alignItems: 'center', gap: 14 }}>
          <History size={18} color="#4f46e5" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3730a3' }}>Compare primary upload against:</span>
          <select
            value={compareUploadId}
            onChange={e => setCompareUploadId(e.target.value)}
            style={{
              height: 36,
              padding: '0 12px',
              border: '1px solid #c7d2fe',
              borderRadius: 8,
              fontSize: 13,
              color: '#0f172a',
              background: '#fff',
              outline: 'none',
              fontWeight: 600,
            }}
          >
            <option value="">Select Secondary Snapshot for Delta...</option>
            {uploads.filter((u: any) => u.id !== selectedUploadId).map((u: any) => (
              <option key={u.id} value={u.id}>{u.file_name} ({new Date(u.uploaded_at).toLocaleDateString()})</option>
            ))}
          </select>
        </div>
      )}

      {/* 3. Executive KPI Cards (CBB & PCS Operational Quantities) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
        {[
          {
            label: 'Total SKUs in Scope',
            value: scopedStats.totalSkus,
            sub: `${scopedStats.countedSkus} Counted (${brandScope === 'completed' ? 'Completed Brands' : brandScope === 'counted' ? 'Counted Brands' : 'All Brands'})`,
            color: '#4f46e5',
          },
          {
            label: 'System Book Stock',
            value: `${scopedStats.systemCbb.toLocaleString('en-IN')} CBB + ${scopedStats.systemLoosePcs.toLocaleString('en-IN')} PCS`,
            sub: `${scopedStats.systemQtyPcs.toLocaleString('en-IN')} PCS Total Book Stock`,
            color: '#64748b',
          },
          {
            label: 'Physical Audited Stock',
            value: `${scopedStats.physicalCbb.toLocaleString('en-IN')} CBB + ${scopedStats.physicalLoosePcs.toLocaleString('en-IN')} PCS`,
            sub: `${scopedStats.physicalQtyPcs.toLocaleString('en-IN')} PCS Total Audited`,
            color: '#10b981',
          },
          {
            label: 'Shortage Discrepancy',
            value: `${scopedStats.shortageCbb.toLocaleString('en-IN')} CBB + ${scopedStats.shortageLoosePcs.toLocaleString('en-IN')} PCS`,
            sub: `${scopedStats.shortageQtyPcs.toLocaleString('en-IN')} PCS Short (${scopedStats.shortageItems} SKUs)`,
            color: '#ef4444',
          },
          {
            label: 'Excess Surplus Stock',
            value: `${scopedStats.excessCbb.toLocaleString('en-IN')} CBB + ${scopedStats.excessLoosePcs.toLocaleString('en-IN')} PCS`,
            sub: `${scopedStats.excessQtyPcs.toLocaleString('en-IN')} PCS Excess (${scopedStats.excessItems} SKUs)`,
            color: '#f59e0b',
          },
        ].map(k => (
          <div key={k.label} style={{ ...CARD_BOX, padding: '16px 18px', borderLeft: `4px solid ${k.color}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{k.label}</p>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>{k.value}</p>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* 4. Unified Report Hub */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Segmented Tab Navigation Bar */}
        <div
          style={{
            ...CARD_BOX,
            padding: 8,
            display: 'grid',
            gridTemplateColumns: `repeat(${compareMode ? 7 : 6}, minmax(0, 1fr))`,
            gap: 8,
            overflowX: 'auto',
          }}
        >
          {(Object.keys(REPORT_CONFIG) as ReportType[])
            .filter(key => key !== 'historical_comparison' || compareMode)
            .map(type => {
              const cfg = REPORT_CONFIG[type];
              const Icon = cfg.icon;
              const isActive = activeReportType === type;

              return (
                <button
                  key={type}
                  onClick={() => {
                    setActiveReportType(type);
                    setSearchQuery('');
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1.5px solid ${isActive ? cfg.color : '#e2e8f0'}`,
                    background: isActive ? cfg.accentBg : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    boxShadow: isActive ? `0 4px 12px ${cfg.color}18` : 'none',
                    minWidth: 140,
                  }}
                >
                  <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: isActive ? '#fff' : cfg.accentBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: cfg.color,
                        boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      }}
                    >
                      <Icon size={17} />
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: isActive ? cfg.color : '#f1f5f9',
                        color: isActive ? '#ffffff' : '#64748b',
                      }}
                    >
                      {cfg.count} {cfg.unit}
                    </span>
                  </div>

                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: isActive ? '#0f172a' : '#334155',
                        margin: '0 0 2px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {cfg.title}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: '#64748b',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {cfg.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>

        {/* Live Interactive Preview & Export Toolbar */}
        <div style={{ ...CARD_BOX, overflow: 'hidden' }}>
          {/* Toolbar Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              background: '#ffffff',
            }}
          >
            {/* Active Report Title & Description */}
            <div style={{ maxWidth: 460 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: currentConfig.color,
                    display: 'inline-block',
                  }}
                />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  {currentConfig.title} Preview
                </h3>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: currentConfig.accentBg,
                    color: currentConfig.color,
                  }}
                >
                  {filteredPreviewRows.length} of {activeReportRows.length} rows
                </span>

                {/* Scope Indicator Badge */}
                {brandScope === 'completed' && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={11} /> Completed Brands Only ({completedBrandNames.size})
                  </span>
                )}
                {brandScope === 'counted' && (
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <ListChecks size={11} /> Counted Brands ({countedBrandNames.size})
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                {currentConfig.desc}
              </p>
            </div>

            {/* Actions: In-Table Search & Dual Export Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {/* Search Box */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  width: 240,
                }}
              >
                <Search size={14} color="#94a3b8" />
                <input
                  type="text"
                  placeholder={
                    activeReportType === 'brand_summary'
                      ? 'Filter by brand name...'
                      : 'Filter by code, name, status...'
                  }
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: 12,
                    color: '#0f172a',
                    outline: 'none',
                    width: '100%',
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={13} color="#94a3b8" />
                  </button>
                )}
              </div>

              {/* WhatsApp Share Button */}
              <button
                onClick={() => setShowBrandSelectorModal(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#22c55e',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(34,197,94,0.3)',
                  transition: 'all 0.15s ease',
                }}
                title="Select brands and share PDF report via WhatsApp"
              >
                <MessageCircle size={15} /> WhatsApp (PDF)
              </button>

              {/* Export Excel Button (Exports active scope) */}
              <button
                onClick={handleExportExcel}
                disabled={downloadingType === 'excel' || activeReportRows.length === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #bbf7d0',
                  background: '#f0fdf4',
                  color: '#166534',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: downloadingType === 'excel' || activeReportRows.length === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
                title={brandScope === 'completed' ? 'Export Excel for Completed Brands only' : 'Export Excel for current view'}
              >
                <FileSpreadsheet size={15} color="#16a34a" />
                {downloadingType === 'excel' ? 'Exporting...' : 'Export Excel (.xlsx)'}
              </button>

              {/* Download PDF Button */}
              <button
                onClick={() => handleExportPdf()}
                disabled={downloadingType === 'pdf' || activeReportRows.length === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #e52321',
                  background: '#e52321',
                  color: '#ffffff',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: downloadingType === 'pdf' || activeReportRows.length === 0 ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 2px 6px rgba(229,35,33,0.2)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Download size={15} color="#ffffff" />
                {downloadingType === 'pdf' ? 'Generating PDF...' : 'Download PDF (.pdf)'}
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div style={{ maxHeight: 540, overflowY: 'auto' }}>
            {activeReportType === 'brand_summary' ? (
              /* Brand Breakdown Table */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Brand</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>SKU Progress</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>System Stock (CBB & PCS)</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Physical Stock (CBB & PCS)</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Net Difference (CBB & PCS)</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Discrepancies</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                        <Building2 size={36} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                        <p style={{ fontWeight: 600, margin: '0 0 4px', color: '#334155' }}>
                          {brandScope === 'completed'
                            ? 'No brands have fully completed stock checks yet'
                            : brandScope === 'counted'
                            ? 'No brands have recorded counts yet'
                            : 'No brands found'}
                        </p>
                        <p style={{ fontSize: 12, margin: 0 }}>
                          {brandScope === 'completed'
                            ? 'Brands will appear here automatically once 100% of their SKUs are counted or session is marked Completed.'
                            : 'Try switching to All Brands or clearing your search filter.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPreviewRows.map((b: any) => {
                      const pct = b['Total SKUs'] > 0 ? Math.round((b['Counted SKUs'] / b['Total SKUs']) * 100) : 0;
                      const netVar = Number(b['Net Variance (PCS)']) || 0;
                      const isComplete = completedBrandNames.has(b['Brand']);

                      return (
                        <tr key={b['Brand']} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{b['Brand']}</span>
                              {isComplete && (
                                <span style={{ fontSize: 10, background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                                  ✓ Done
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 80, height: 6, background: '#e2e8f0', borderRadius: 9999, overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: '100%',
                                    background: pct === 100 ? '#10b981' : '#4f46e5',
                                    borderRadius: 9999,
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
                                {b['Counted SKUs']} / {b['Total SKUs']} ({pct}%)
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#334155' }}>{b['System Stock (CBB & PCS)']}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{Number(b['System Qty (PCS)']).toLocaleString('en-IN')} PCS</div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#10b981' }}>{b['Physical Stock (CBB & PCS)']}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{Number(b['Physical Qty (PCS)']).toLocaleString('en-IN')} PCS</div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: netVar < 0 ? '#fef2f2' : netVar > 0 ? '#fffbeb' : '#f0fdf4',
                                color: netVar < 0 ? '#dc2626' : netVar > 0 ? '#d97706' : '#16a34a',
                              }}
                            >
                              {b['Net Difference (CBB & PCS)']}
                            </span>
                            <div style={{ fontSize: 11, fontWeight: 600, color: netVar < 0 ? '#dc2626' : netVar > 0 ? '#d97706' : '#16a34a', marginTop: 2 }}>
                              {netVar > 0 ? '+' : ''}{netVar.toLocaleString('en-IN')} PCS
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: b['Shortage Count'] > 0 ? '#dc2626' : '#64748b' }}>
                              {b['Shortage Count']} short / {b['Excess Count']} excess
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : activeReportType === 'historical_comparison' ? (
              /* Historical Snapshot Comparison Table */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Material & Desc</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Brand</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>MRP</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>1 CBB</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Primary Audit</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Secondary Audit</th>
                    <th style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Count Delta (CBB & PCS)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                        <History size={36} color="#cbd5e1" style={{ margin: '0 auto 8px', display: 'block' }} />
                        <p style={{ fontWeight: 600, margin: '0 0 4px', color: '#334155' }}>
                          {!compareUploadId ? 'Select a secondary snapshot above to compare' : 'No matching materials found in this scope'}
                        </p>
                        <p style={{ fontSize: 12, margin: 0 }}>Comparison tracks count delta changes between two physical inventory dates.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPreviewRows.map((r: any) => {
                      const delta = Number(r['Delta Count (PCS)']) || 0;
                      return (
                        <tr key={r['Material']} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', display: 'block' }}>{r['Material']}</span>
                            <span style={{ fontSize: 12, color: '#64748b' }}>{r['Description']}</span>
                          </td>
                          <td style={{ padding: '10px 16px', color: '#475569', fontWeight: 600 }}>{r['Brand']}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>₹{r['MRP (₹)']}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: 600 }}>{r['Case Size (1 CBB)']}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{r['Upload A Phy (PCS)']} PCS</div>
                            <div style={{ fontSize: 11, color: r['Upload A Var (PCS)'] < 0 ? '#dc2626' : '#64748b' }}>Var: {r['Upload A Var (PCS)']}</div>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{r['Upload B Phy (PCS)']} PCS</div>
                            <div style={{ fontSize: 11, color: r['Upload B Var (PCS)'] < 0 ? '#dc2626' : '#64748b' }}>Var: {r['Upload B Var (PCS)']}</div>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: delta > 0 ? '#f0fdf4' : delta < 0 ? '#fef2f2' : '#f8fafc',
                                color: delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#64748b',
                              }}
                            >
                              {r['Delta Difference (CBB & PCS)']}
                            </span>
                            <div style={{ fontSize: 11, fontWeight: 600, color: delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#64748b', marginTop: 2 }}>
                              {delta > 0 ? '+' : ''}{delta} PCS
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              /* Itemized Discrepancy & Full Audit Table */
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', width: 40 }}>#</th>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Material Code</th>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Description</th>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Brand</th>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>MRP</th>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>1 CBB Size</th>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>System Stock</th>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Physical Stock</th>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Difference (CBB & PCS)</th>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</th>
                    <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left' }}>Audit Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreviewRows.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
                        <CheckCircle2 size={38} color="#10b981" style={{ margin: '0 auto 8px', display: 'block' }} />
                        <p style={{ fontWeight: 700, fontSize: 15, margin: '0 0 4px', color: '#0f172a' }}>
                          {searchQuery
                            ? 'No materials match your search query'
                            : brandScope === 'completed'
                            ? 'No records in Completed Brands scope'
                            : activeReportType === 'shortage'
                            ? 'No shortage discrepancies found!'
                            : activeReportType === 'excess'
                            ? 'No excess surplus items recorded.'
                            : activeReportType === 'new_issues'
                            ? 'No new discrepancy issues in this cycle.'
                            : activeReportType === 'increased_variance'
                            ? 'No escalated variances identified.'
                            : 'No records available in this report.'}
                        </p>
                        <p style={{ fontSize: 12, margin: 0, color: '#64748b' }}>
                          {brandScope === 'completed'
                            ? 'Complete stock counts for at least one brand or switch to "All Brands" or "Counted".'
                            : searchQuery
                            ? 'Try clearing the search filter or switching to All Brands.'
                            : 'All counted items currently meet or exceed system baseline specifications.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPreviewRows.map((r: any, idx: number) => {
                      const variance = r['Variance (PCS)'];
                      const hasCount = variance !== '' && variance !== null && variance !== undefined;
                      const numVar = Number(variance);

                      return (
                        <tr
                          key={`${r['Material']}_${idx}`}
                          style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: idx % 2 === 1 ? '#fafafa' : '#ffffff',
                          }}
                        >
                          <td style={{ padding: '10px 14px', fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                            {r['Material']}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#334155', maxWidth: 240 }}>
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {r['Description']}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f1f5f9', color: '#475569' }}>
                              {r['Brand']}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#64748b' }}>
                            ₹{r['MRP (₹)']}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, color: '#64748b', fontWeight: 600 }}>
                            {r['Case Size (1 CBB)']}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, color: '#334155' }}>{r['System Stock (CBB & PCS)']}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{Number(r['System Qty (PCS)']).toLocaleString('en-IN')} PCS</div>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            {hasCount ? (
                              <>
                                <div style={{ fontWeight: 700, color: '#0f172a' }}>{r['Physical Stock (CBB & PCS)']}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8' }}>{Number(r['Physical Qty (PCS)']).toLocaleString('en-IN')} PCS</div>
                              </>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 11 }}>Uncounted</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            {hasCount ? (
                              <>
                                <span
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 700,
                                    padding: '2px 7px',
                                    borderRadius: 5,
                                    background: numVar < 0 ? '#fef2f2' : numVar > 0 ? '#fffbeb' : '#f0fdf4',
                                    color: numVar < 0 ? '#dc2626' : numVar > 0 ? '#d97706' : '#16a34a',
                                  }}
                                >
                                  {r['Difference (CBB & PCS)']}
                                </span>
                                <div style={{ fontSize: 11, fontWeight: 600, color: numVar < 0 ? '#dc2626' : numVar > 0 ? '#d97706' : '#16a34a', marginTop: 2 }}>
                                  {numVar > 0 ? '+' : ''}{numVar} PCS
                                </div>
                              </>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                            <StatusBadge status={r['Status']} size="sm" />
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>
                            <span style={{ fontWeight: r['Trend'] === 'New Issue' || r['Trend'] === 'Increased Variance' ? 700 : 500, color: r['Trend'] === 'New Issue' ? '#7c3aed' : r['Trend'] === 'Increased Variance' ? '#dc2626' : '#64748b' }}>
                              {r['Trend']}
                            </span>
                            {r['Notes'] && <span style={{ display: 'block', fontSize: 11, color: '#94a3b8' }}>{r['Notes']}</span>}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Brand Selector Report Modal for WhatsApp & Custom Exports */}
      <BrandSelectorReportModal
        isOpen={showBrandSelectorModal}
        onClose={() => setShowBrandSelectorModal(false)}
        brandSummaries={brandSummaries}
        agencyName={agencyName}
        awCode={agency?.aw_code}
        reportTitle={REPORT_CONFIG[activeReportType]?.title || 'Britannia_Stock_Audit'}
        getReportDataForBrands={getReportDataForBrands}
      />

      {/* Notification Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
