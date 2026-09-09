import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, Download, FileText, History,
  Building2, Layers, Calendar
} from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { PageHeader } from '@/components/common/PageHeader';
import { StatusBadge } from '@/components/common/StatusBadge';
import { AlertModal } from '@/components/common/AlertModal';
import { exportDataToExcel, exportReportToPdf, type ReportType } from '@/lib/reportExportUtils';

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

const W: React.CSSProperties = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

import { useAuth } from '@/contexts/AuthContext';

export function Reports() {
  const { activeUploadId } = useStockStore();
  const { agency, profile } = useAuth();
  
  // Selection and Filter States
  const [uploads, setUploads] = useState<any[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>('');
  const [compareUploadId, setCompareUploadId] = useState<string>('');
  const [compareMode, setCompareMode] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('All');
  
  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; message: string; title?: string; type?: 'info' | 'error' | 'success' | 'warning' }>({
    isOpen: false,
    message: '',
  });

  const showAlert = (message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info', title?: string) => {
    setAlertConfig({ isOpen: true, message, type, title });
  };
  
  const [downloadingType, setDownloadingType] = useState<ReportType | 'pdf' | 'comparison' | null>(null);
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandSummaries, setBrandSummaries] = useState<BrandSummaryItem[]>([]);
  const [overallStats, setOverallStats] = useState({
    totalSkus: 0,
    countedSkus: 0,
    systemValue: 0,
    physicalValue: 0,
    shortageValue: 0,
    excessValue: 0,
    shortageItems: 0,
    excessItems: 0
  });
  const [comparisonRows, setComparisonRows] = useState<any[]>([]);

  const currentAgencyId = agency?.id || profile?.agency_id;

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
          .eq('upload_id', selectedUploadId);

        const { data: countsA } = await supabase
          .from('physical_stock_counts')
          .select('*');

        const countMapA = new Map();
        if (selectedSessionId !== 'All') {
          countsA?.filter(c => c.session_id === selectedSessionId).forEach(c => countMapA.set(c.snapshot_id, c));
        } else {
          countsA?.forEach(c => countMapA.set(c.snapshot_id, c));
        }

        const brandsSet = new Set<string>();
        const brandMap = new Map<string, BrandSummaryItem>();
        let totalSysVal = 0, totalPhyVal = 0, totalShortageVal = 0, totalExcessVal = 0, totalShortageCount = 0, totalExcessCount = 0, totalCounted = 0;

        snapshotsA?.forEach(snap => {
          const b = snap.brand || 'Unbranded';
          brandsSet.add(b);
          if (!brandMap.has(b)) {
            brandMap.set(b, {
              brand: b,
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
              resolvedCount: 0
            });
          }
          const e = brandMap.get(b)!;
          e.totalSkus++;
          const mrp = Number(snap.mrp) || 0, sysPcs = Number(snap.system_qty_pcs) || 0;
          e.systemQtyPcs += sysPcs;
          e.systemValue += sysPcs * mrp;
          totalSysVal += sysPcs * mrp;
          
          const count = countMapA.get(snap.id);
          if (count) {
            e.countedSkus++;
            totalCounted++;
            const phyPcs = Number(count.physical_total_pcs) || 0, variance = Number(count.variance) || 0, prevVariance = Number(snap.prev_variance) || 0;
            e.physicalQtyPcs += phyPcs;
            e.physicalValue += phyPcs * mrp;
            totalPhyVal += phyPcs * mrp;
            e.netVariancePcs += variance;
            e.netVarianceValue += variance * mrp;
            if (variance < 0) { e.shortageCount++; totalShortageCount++; totalShortageVal += Math.abs(variance * mrp); }
            else if (variance > 0) { e.excessCount++; totalExcessCount++; totalExcessVal += variance * mrp; }
            else if (variance === 0 && prevVariance !== 0) e.resolvedCount++;
          }
        });
        setUniqueBrands(Array.from(brandsSet).sort());
        setBrandSummaries(Array.from(brandMap.values()).sort((a, b) => b.systemValue - a.systemValue));
        setOverallStats({
          totalSkus: snapshotsA?.length || 0,
          countedSkus: totalCounted,
          systemValue: totalSysVal,
          physicalValue: totalPhyVal,
          shortageValue: totalShortageVal,
          excessValue: totalExcessVal,
          shortageItems: totalShortageCount,
          excessItems: totalExcessCount
        });

        // Comparison mode calculation
        if (compareMode && compareUploadId) {
          const { data: snapshotsB } = await supabase.from('system_stock_snapshots').select('*').eq('upload_id', compareUploadId);
          const { data: countsB } = await supabase.from('physical_stock_counts').select('*');
          
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
              sysA, phyA, varA,
              sysB, phyB, varB,
              deltaCount: phyB - phyA,
              deltaValue: (phyB - phyA) * mrp
            });
          });
          setComparisonRows(compRows);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedUploadId, compareUploadId, compareMode, selectedSessionId, selectedBrand]);

  const fetchReportData = async (type: ReportType) => {
    if (!selectedUploadId) return null;
    const { data: snapshots } = await supabase.from('system_stock_snapshots').select('*').eq('upload_id', selectedUploadId);
    const { data: counts } = await supabase.from('physical_stock_counts').select('*');
    
    const countMap = new Map();
    if (selectedSessionId !== 'All') {
      counts?.filter(c => c.session_id === selectedSessionId).forEach(c => countMap.set(c.snapshot_id, c));
    } else {
      counts?.forEach(c => countMap.set(c.snapshot_id, c));
    }

    if (type === 'brand_summary') {
      return brandSummaries
        .filter((b: BrandSummaryItem) => selectedBrand === 'All Brands' || b.brand === selectedBrand)
        .map((b: BrandSummaryItem) => ({
        'Brand': b.brand, 'Total SKUs': b.totalSkus, 'Counted SKUs': b.countedSkus,
        'Progress %': b.totalSkus > 0 ? `${((b.countedSkus / b.totalSkus) * 100).toFixed(1)}%` : '0%',
        'System Qty (PCS)': b.systemQtyPcs, 'Physical Qty (PCS)': b.physicalQtyPcs,
        'System Value (₹)': b.systemValue.toFixed(2), 'Physical Value (₹)': b.physicalValue.toFixed(2),
        'Net Variance (PCS)': b.netVariancePcs, 'Net Variance Value (₹)': b.netVarianceValue.toFixed(2),
        'Shortage Count': b.shortageCount, 'Excess Count': b.excessCount, 'Resolved Count': b.resolvedCount,
      }));
    }
    
    const rows: any[] = [];
    snapshots?.forEach(snap => {
      if (selectedBrand !== 'All Brands' && snap.brand !== selectedBrand) return;
      const count = countMap.get(snap.id);
      const mrp = Number(snap.mrp) || 0, sysPcs = Number(snap.system_qty_pcs) || 0;
      const phyPcs = count ? Number(count.physical_total_pcs) || 0 : null;
      const variance = count ? Number(count.variance) || 0 : null;
      const prevVariance = Number(snap.prev_variance) || 0;
      const status = count ? count.status : 'Not Counted';
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
        'System Qty (PCS)': sysPcs,
        'Physical Qty (PCS)': count ? phyPcs : 'Not Counted',
        'Variance (PCS)': count ? variance : '',
        'Variance Value (₹)': count ? ((variance || 0) * mrp).toFixed(2) : '',
        'Status': status,
        'Reason Code': count?.reason_code || '',
        'Notes': count?.notes || '',
        'Previous Variance (PCS)': prevVariance,
        'Trend': trend
      };
      if (type === 'full') rows.push(row);
      else if (type === 'shortage' && count && status === 'Shortage') rows.push(row);
      else if (type === 'excess' && count && status === 'Excess') rows.push(row);
      else if (type === 'increased_variance' && count && Math.abs(variance || 0) > Math.abs(prevVariance) && (variance || 0) !== 0) rows.push(row);
      else if (type === 'new_issues' && count && prevVariance === 0 && (variance || 0) !== 0) rows.push(row);
      else if (type === 'historical_comparison' && count) rows.push({
        'Material': snap.material, 'Description': snap.material_desc, 'Brand': snap.brand, 'MRP (₹)': mrp,
        'System Qty (PCS)': sysPcs, 'Physical Qty (PCS)': phyPcs, 'Previous Variance (PCS)': prevVariance,
        'Current Variance (PCS)': variance, 'Trend': trend
      });
    });
    return rows;
  };

  const handleDownloadExcel = async (type: ReportType) => {
    setDownloadingType(type);
    try {
      const data = await fetchReportData(type);
      if (!data || data.length === 0) {
        showAlert('No records match this report filter.', 'info', 'No Data Available');
        return;
      }
      exportDataToExcel(data, type);
    } catch (e) {
      console.error(e);
      showAlert('Failed to generate Excel report. Please try again.', 'error', 'Export Failed');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingType('pdf');
    try {
      const data = await fetchReportData('full');
      if (!data || data.length === 0) {
        showAlert('No stock data available to print.', 'info', 'No Data Available');
        return;
      }
      exportReportToPdf(data, 'Comprehensive Stock Audit Report', overallStats);
    } catch (e) {
      console.error(e);
      showAlert('Failed to generate PDF report. Please try again.', 'error', 'Export Failed');
    } finally {
      setDownloadingType(null);
    }
  };

  if (loading && !selectedUploadId) {
    return <LoadingSpinner label="Loading reports workspace..." />;
  }

  const selectedUploadObj = uploads.find(u => u.id === selectedUploadId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <PageHeader
        title="Audit Reports & Analytics"
        description="Generate discrepancy reports, brand summaries, and historical stock trends"
        icon={FileText}
        actions={
          <button
            onClick={handleDownloadPdf}
            disabled={downloadingType === 'pdf'}
            style={{
              padding: '10px 20px',
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
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 12px rgba(229,35,33,0.25)',
            }}
          >
            <Download size={15} /> Print Full PDF Report
          </button>
        }
      />

      {/* Control Panel: Upload selector & Brand/Session Filters */}
      <div style={{ ...W, padding: '16px 20px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Select Upload */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={15} color="#64748b" />
            <select
              value={selectedUploadId}
              onChange={e => setSelectedUploadId(e.target.value)}
              style={{ height: 38, padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', fontWeight: 600, background: '#fff', outline: 'none' }}
            >
              {uploads.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.file_name} ({new Date(u.uploaded_at).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Select Brand Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={15} color="#64748b" />
            <select
              value={selectedBrand}
              onChange={e => setSelectedBrand(e.target.value)}
              style={{ height: 38, padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', background: '#fff', outline: 'none' }}
            >
              <option value="All Brands">All Brands</option>
              {uniqueBrands.map((b: string) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>

          {/* Select Session Filter */}
          {sessions.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={15} color="#64748b" />
              <select
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
                style={{ height: 38, padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#0f172a', background: '#fff', outline: 'none' }}
              >
                <option value="All">All Sessions</option>
                {sessions.map((s: any) => <option key={s.id} value={s.id}>{s.session_name || s.brand}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Compare Toggle */}
        <button
          onClick={() => setCompareMode(!compareMode)}
          style={{
            padding: '7px 14px',
            borderRadius: 8,
            border: `1px solid ${compareMode ? '#c7d2fe' : '#e2e8f0'}`,
            background: compareMode ? '#eef2ff' : '#fff',
            color: compareMode ? '#4338ca' : '#475569',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {compareMode ? 'Disable Comparison' : 'Compare Snapshot'}
        </button>
      </div>

      {/* Snapshot Comparison Selector if Compare Mode */}
      {compareMode && (
        <div style={{ ...W, padding: '16px 20px', background: '#eef2ff', border: '1px solid #c7d2fe', display: 'flex', alignItems: 'center', gap: 14 }}>
          <History size={18} color="#4f46e5" />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#3730a3' }}>Compare primary upload with:</span>
          <select
            value={compareUploadId}
            onChange={e => setCompareUploadId(e.target.value)}
            style={{ height: 36, padding: '0 10px', border: '1px solid #c7d2fe', borderRadius: 8, fontSize: 13, color: '#0f172a', background: '#fff', outline: 'none' }}
          >
            <option value="">Select Secondary Snapshot...</option>
            {uploads.filter((u: any) => u.id !== selectedUploadId).map((u: any) => (
              <option key={u.id} value={u.id}>{u.file_name} ({new Date(u.uploaded_at).toLocaleDateString()})</option>
            ))}
          </select>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total SKUs', value: overallStats.totalSkus, sub: `${overallStats.countedSkus} Counted`, color: '#4f46e5' },
          { label: 'System Value', value: `₹${overallStats.systemValue.toLocaleString('en-IN')}`, sub: 'Master Book Value', color: '#64748b' },
          { label: 'Physical Value', value: `₹${overallStats.physicalValue.toLocaleString('en-IN')}`, sub: 'Audited Value', color: '#10b981' },
          { label: 'Shortage Value', value: `₹${overallStats.shortageValue.toLocaleString('en-IN')}`, sub: `${overallStats.shortageItems} Items Short`, color: '#ef4444' },
          { label: 'Excess Value', value: `₹${overallStats.excessValue.toLocaleString('en-IN')}`, sub: `${overallStats.excessItems} Items Excess`, color: '#f59e0b' },
        ].map(k => (
          <div key={k.label} style={{ ...W, padding: '16px 18px', borderLeft: `4px solid ${k.color}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px' }}>{k.label}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 2px' }}>{k.value}</p>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0 }}>{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Export Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {[
          { type: 'full', title: 'Full Stock Audit Report', desc: 'Complete itemized snapshot including physical counts and calculated variances for all SKUs.', color: '#4f46e5' },
          { type: 'shortage', title: 'Shortage Discrepancies', desc: 'Filtered list of all materials with physical counts lower than system stock.', color: '#dc2626' },
          { type: 'excess', title: 'Excess Surplus Stock', desc: 'List of all materials where physical counts exceed recorded system quantity.', color: '#d97706' },
          { type: 'brand_summary', title: 'Brand Category Summary', desc: 'High-level aggregation of stock count progress, total valuation, and net variance by Brand.', color: '#10b981' },
          { type: 'new_issues', title: 'New Discrepancies', desc: 'Materials that were equal in the previous count but developed a variance in this audit.', color: '#7c3aed' },
          { type: 'increased_variance', title: 'Escalated Variances', desc: 'Items where discrepancy gap has widened compared to historical records.', color: '#ef4444' },
        ].map(r => (
          <div key={r.type} style={{ ...W, padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{r.title}</span>
                <FileSpreadsheet size={18} color={r.color} />
              </div>
              <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{r.desc}</p>
            </div>
            <button
              onClick={() => handleDownloadExcel(r.type as ReportType)}
              disabled={downloadingType === r.type}
              style={{
                width: '100%',
                padding: '9px 0',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: downloadingType === r.type ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Download size={14} color={r.color} /> Export Excel (.xlsx)
            </button>
          </div>
        ))}
      </div>

      {/* Brand Summary Table Preview */}
      <div style={{ ...W, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 2px' }}>Brand Financial Breakdown</h3>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>System valuation vs physical count valuation by brand category</p>
          </div>
          <StatusBadge status="Completed" customLabel={`${brandSummaries.length} Brands`} />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {['Brand', 'SKUs (Counted/Total)', 'System Value', 'Physical Value', 'Net Variance Value', 'Issues'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {brandSummaries.map((b: BrandSummaryItem) => (
                <tr key={b.brand} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{b.brand}</td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{b.countedSkus} / {b.totalSkus} ({b.totalSkus > 0 ? Math.round((b.countedSkus / b.totalSkus) * 100) : 0}%)</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#334155' }}>₹{b.systemValue.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#10b981' }}>₹{b.physicalValue.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 700, color: b.netVarianceValue < 0 ? '#dc2626' : b.netVarianceValue > 0 ? '#d97706' : '#16a34a' }}>
                    {b.netVarianceValue > 0 ? '+' : ''}₹{b.netVarianceValue.toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: b.shortageCount > 0 ? '#dc2626' : '#64748b' }}>
                      {b.shortageCount} short / {b.excessCount} excess
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
