import React, { useState, useEffect } from 'react';
import {
  FileDown, FileSpreadsheet, Download, Loader2, FileText,
  TrendingUp, AlertCircle, History, Building2, CheckCircle2,
  Layers, ArrowUpRight, ArrowDownRight, UploadCloud, Calendar
} from 'lucide-react';
import { useStockStore } from '@/store/useStockStore';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

type ReportType = 'full' | 'shortage' | 'excess' | 'increased_variance' | 'new_issues' | 'historical_comparison' | 'brand_summary';

interface BrandSummaryItem {
  brand: string; totalSkus: number; countedSkus: number;
  systemQtyPcs: number; physicalQtyPcs: number; systemValue: number; physicalValue: number;
  netVariancePcs: number; netVarianceValue: number; shortageCount: number; excessCount: number; resolvedCount: number;
}

const W: React.CSSProperties = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

const btn = (primary = true, disabled = false): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px',
  borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
  border: 'none', fontFamily: 'inherit',
  background: primary ? (disabled ? '#a5b4fc' : '#4f46e5') : (disabled ? '#f8fafc' : '#fff'),
  color: primary ? '#fff' : '#374151',
  ...(primary ? {} : { border: '1px solid #e2e8f0' }),
  opacity: disabled ? 0.7 : 1,
});

export function Reports() {
  const navigate = useNavigate();
  const { activeUploadId, clearActiveUpload } = useStockStore();
  
  // Selection and Filter States
  const [uploads, setUploads] = useState<any[]>([]);
  const [selectedUploadId, setSelectedUploadId] = useState<string>('');
  const [compareUploadId, setCompareUploadId] = useState<string>('');
  const [compareMode, setCompareMode] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('All');
  
  const [downloadingType, setDownloadingType] = useState<ReportType | 'pdf' | 'comparison' | null>(null);
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandSummaries, setBrandSummaries] = useState<BrandSummaryItem[]>([]);
  const [overallStats, setOverallStats] = useState({ totalSkus: 0, countedSkus: 0, systemValue: 0, physicalValue: 0, shortageValue: 0, excessValue: 0, shortageItems: 0, excessItems: 0 });
  const [comparisonRows, setComparisonRows] = useState<any[]>([]);

  // 1. Fetch upload history
  useEffect(() => {
    async function fetchUploads() {
      try {
        const { data } = await supabase
          .from('stock_uploads')
          .select('*')
          .order('uploaded_at', { ascending: false });
        if (data) {
          setUploads(data);
          // Default to active upload, fallback to the most recent one
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
  }, [activeUploadId]);

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

        // Fetch snapshots and counts for Primary upload
        const { data: snapshotsA } = await supabase.from('system_stock_snapshots').select('*').eq('upload_id', selectedUploadId);
        const { data: countsA } = await supabase.from('physical_stock_counts').select('*');
        
        // Build active count map considering the session filter
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
          if (!brandMap.has(b)) brandMap.set(b, { brand: b, totalSkus: 0, countedSkus: 0, systemQtyPcs: 0, physicalQtyPcs: 0, systemValue: 0, physicalValue: 0, netVariancePcs: 0, netVarianceValue: 0, shortageCount: 0, excessCount: 0, resolvedCount: 0 });
          const e = brandMap.get(b)!;
          e.totalSkus++;
          const mrp = Number(snap.mrp) || 0, sysPcs = Number(snap.system_qty_pcs) || 0;
          e.systemQtyPcs += sysPcs; e.systemValue += sysPcs * mrp; totalSysVal += sysPcs * mrp;
          
          const count = countMapA.get(snap.id);
          if (count) {
            e.countedSkus++; totalCounted++;
            const phyPcs = Number(count.physical_total_pcs) || 0, variance = Number(count.variance) || 0, prevVariance = Number(snap.prev_variance) || 0;
            e.physicalQtyPcs += phyPcs; e.physicalValue += phyPcs * mrp; totalPhyVal += phyPcs * mrp;
            e.netVariancePcs += variance; e.netVarianceValue += variance * mrp;
            if (variance < 0) { e.shortageCount++; totalShortageCount++; totalShortageVal += Math.abs(variance * mrp); }
            else if (variance > 0) { e.excessCount++; totalExcessCount++; totalExcessVal += variance * mrp; }
            else if (variance === 0 && prevVariance !== 0) e.resolvedCount++;
          }
        });
        setUniqueBrands(Array.from(brandsSet).sort());
        setBrandSummaries(Array.from(brandMap.values()).sort((a, b) => b.systemValue - a.systemValue));
        setOverallStats({ totalSkus: snapshotsA?.length || 0, countedSkus: totalCounted, systemValue: totalSysVal, physicalValue: totalPhyVal, shortageValue: totalShortageVal, excessValue: totalExcessVal, shortageItems: totalShortageCount, excessItems: totalExcessCount });

        // If comparison mode is active, fetch secondary upload data and compute parallel deltas
        if (compareMode && compareUploadId) {
          const { data: snapshotsB } = await supabase.from('system_stock_snapshots').select('*').eq('upload_id', compareUploadId);
          const { data: countsB } = await supabase.from('physical_stock_counts').select('*');
          
          // Count map for primary upload (including full items matching snapshots A)
          const fullCountMapA = new Map();
          countsA?.forEach(c => fullCountMapA.set(c.snapshot_id, c));

          const countMapB = new Map();
          countsB?.forEach(c => countMapB.set(c.snapshot_id, c));

          const compRows: any[] = [];
          snapshotsA?.forEach(snapA => {
            if (selectedBrand !== 'All Brands' && snapA.brand !== selectedBrand) return;

            const snapB = snapshotsB?.find(x => x.material === snapA.material);
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
              mrp: mrp,
              sysA, phyA, varA,
              sysB, phyB, varB,
              deltaCount: phyB - phyA,
              deltaValue: (phyB - phyA) * mrp
            });
          });
          setComparisonRows(compRows);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
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
      return brandSummaries.filter(b => selectedBrand === 'All Brands' || b.brand === selectedBrand).map(b => ({
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
      const row = { 'Material': snap.material, 'Description': snap.material_desc, 'Brand': snap.brand, 'MRP (₹)': mrp, 'System Qty (PCS)': sysPcs, 'Physical Qty (PCS)': count ? phyPcs : 'Not Counted', 'Variance (PCS)': count ? variance : '', 'Variance Value (₹)': count ? ((variance || 0) * mrp).toFixed(2) : '', 'Status': status, 'Reason Code': count?.reason_code || '', 'Notes': count?.notes || '', 'Previous Variance (PCS)': prevVariance, 'Trend': trend };
      if (type === 'full') rows.push(row);
      else if (type === 'shortage' && count && status === 'Shortage') rows.push(row);
      else if (type === 'excess' && count && status === 'Excess') rows.push(row);
      else if (type === 'increased_variance' && count && Math.abs(variance || 0) > Math.abs(prevVariance) && (variance || 0) !== 0) rows.push(row);
      else if (type === 'new_issues' && count && prevVariance === 0 && (variance || 0) !== 0) rows.push(row);
      else if (type === 'historical_comparison' && count) rows.push({ 'Material': snap.material, 'Description': snap.material_desc, 'Brand': snap.brand, 'MRP (₹)': mrp, 'System Qty (PCS)': sysPcs, 'Physical Qty (PCS)': phyPcs, 'Previous Variance (PCS)': prevVariance, 'Current Variance (PCS)': variance, 'Trend': trend });
    });
    return rows;
  };

  const handleDownloadExcel = async (type: ReportType) => {
    setDownloadingType(type);
    try {
      const data = await fetchReportData(type);
      if (!data || data.length === 0) { alert('No records match this report.'); return; }
      const ws = XLSX.utils.json_to_sheet(data), wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type.replace(/_/g, ' '));
      const dateStr = new Date().toISOString().split('T')[0];
      const brandSuffix = selectedBrand !== 'All Brands' ? `_${selectedBrand.replace(/\s+/g, '_')}` : '';
      XLSX.writeFile(wb, `${type}${brandSuffix}_${dateStr}.xlsx`);
    } catch (e) { alert('Failed to generate report.'); }
    finally { setDownloadingType(null); }
  };

  const handleDownloadComparisonExcel = () => {
    if (!selectedUploadId || !compareUploadId) return;
    setDownloadingType('comparison');
    try {
      const data = comparisonRows.map(r => ({
        'Material': r.material, 'Description': r.description, 'Brand': r.brand, 'MRP (₹)': r.mrp,
        'Audit A System (PCS)': r.sysA, 'Audit A Counted (PCS)': r.phyA, 'Audit A Variance (PCS)': r.varA,
        'Audit B System (PCS)': r.sysB, 'Audit B Counted (PCS)': r.phyB, 'Audit B Variance (PCS)': r.varB,
        'Variance Delta (PCS)': r.deltaCount, 'Value Delta (₹)': r.deltaValue.toFixed(2)
      }));
      if (data.length === 0) { alert('No comparison records available.'); return; }
      const ws = XLSX.utils.json_to_sheet(data), wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Parallel Comparison');
      XLSX.writeFile(wb, `Parallel_Comparison_${selectedBrand.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) {
      alert('Failed to generate comparison report.');
    } finally {
      setDownloadingType(null);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingType('pdf');
    try {
      const shortage = await fetchReportData('shortage'), excess = await fetchReportData('excess');
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 32, 'F');
      doc.setFontSize(18); doc.setTextColor(255, 255, 255); doc.text('StockSync Reconciliation Report', 14, 18);
      
      const fileObj = uploads.find(u => u.id === selectedUploadId);
      doc.setFontSize(9); doc.setTextColor(148, 163, 184); doc.text(`Snapshot: ${fileObj?.file_name || 'N/A'} | Filter: ${selectedBrand}`, 14, 26);
      
      (doc as any).autoTable({ head: [['Metric', 'Value', 'Metric', 'Value']], body: [['Total SKUs', `${overallStats.countedSkus}/${overallStats.totalSkus}`, 'Completion', overallStats.totalSkus > 0 ? `${((overallStats.countedSkus / overallStats.totalSkus) * 100).toFixed(1)}%` : '0%'], ['System Value', `₹${overallStats.systemValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Physical Value', `₹${overallStats.physicalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`]], startY: 40, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [51, 65, 85] } });
      const brandY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.text('Brand-Wise Summary', 14, brandY);
      (doc as any).autoTable({ head: [['Brand', 'SKUs', 'Counted', 'Sys Val', 'Net Diff', 'Shortages', 'Excess']], body: brandSummaries.filter(b => selectedBrand === 'All Brands' || b.brand === selectedBrand).map(b => [b.brand, b.totalSkus, `${b.countedSkus} (${b.totalSkus > 0 ? ((b.countedSkus / b.totalSkus) * 100).toFixed(0) : 0}%)`, `₹${Math.round(b.systemValue).toLocaleString('en-IN')}`, `₹${Math.round(b.netVarianceValue).toLocaleString('en-IN')}`, b.shortageCount, b.excessCount]), startY: brandY + 4, theme: 'striped', styles: { fontSize: 7 }, headStyles: { fillColor: [30, 41, 59] } });
      doc.save(`StockSync_Summary_${selectedBrand.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { alert('Failed to generate PDF.'); }
    finally { setDownloadingType(null); }
  };

  if (uploads.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', textAlign: 'center', gap: 20 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FileSpreadsheet size={30} color="#4f46e5" />
      </div>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No Stock Snapshot Found</h2>
        <p style={{ fontSize: 13, color: '#64748b', margin: 0, maxWidth: 320 }}>Upload a stock Excel file first to generate reconciliation reports</p>
      </div>
      <button onClick={() => navigate('/upload')} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 20px', borderRadius: 9, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
        <UploadCloud size={16} /> Upload Stock File
      </button>
    </div>
  );

  const reportCards = [
    { id: 'full' as ReportType,                title: 'Full Reconciliation Report',   desc: 'All materials, counts, variances, and notes',            icon: FileSpreadsheet, badge: 'All SKUs',             badgeColor: '#4f46e5',  borderColor: '#4f46e5' },
    { id: 'shortage' as ReportType,            title: 'Shortage Report',               desc: 'Items where physical < system stock',                    icon: ArrowDownRight,  badge: `${overallStats.shortageItems} Shortages`, badgeColor: '#dc2626', borderColor: '#dc2626' },
    { id: 'excess' as ReportType,              title: 'Excess Report',                 desc: 'Items where physical > system stock',                    icon: ArrowUpRight,    badge: `${overallStats.excessItems} Excesses`,  badgeColor: '#d97706', borderColor: '#d97706' },
    { id: 'increased_variance' as ReportType,  title: 'Increased Variance',            desc: 'Variances wider than previous audit',                    icon: TrendingUp,      badge: 'Deteriorating',       badgeColor: '#7c3aed', borderColor: '#7c3aed' },
    { id: 'new_issues' as ReportType,          title: 'New Issues',                    desc: 'Materials newly developed in this cycle',               icon: AlertCircle,     badge: 'New',                 badgeColor: '#dc2626', borderColor: '#ef4444' },
    { id: 'historical_comparison' as ReportType, title: 'Historical Comparison',       desc: 'Previous vs current variance side-by-side',            icon: History,         badge: 'Trend Analysis',      badgeColor: '#059669', borderColor: '#10b981' },
  ];

  const pct = overallStats.totalSkus > 0 ? ((overallStats.countedSkus / overallStats.totalSkus) * 100).toFixed(0) : '0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, fontFamily: "'Inter', sans-serif" }}>

      {/* Dynamic Filter / Navigation Header */}
      <div style={{ ...W, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', letterSpacing: '-0.3px' }}>Reports & Reconciliation</h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Configure filters and generate audit reports</p>
          </div>
          
          {/* Parallel Date Comparison Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#4f46e5', userSelect: 'none' }}>
            <input type="checkbox" checked={compareMode} onChange={e => setCompareMode(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#4f46e5', cursor: 'pointer' }} />
            Compare Dates Parallelly
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          
          {/* Selector 1: Audit Date A */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Date A (Primary)</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Calendar size={14} color="#64748b" style={{ position: 'absolute', left: 12 }} />
              <select value={selectedUploadId} onChange={e => setSelectedUploadId(e.target.value)}
                style={{ width: '100%', height: 38, padding: '0 10px 0 34px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {uploads.map(up => (
                  <option key={up.id} value={up.id}>{up.file_name.replace(/\.xlsx$/, '')} ({new Date(up.uploaded_at).toLocaleDateString('en-IN')})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector 2: Audit Date B (Compare Mode Only) */}
          {compareMode ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Audit Date B (Comparison)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Calendar size={14} color="#64748b" style={{ position: 'absolute', left: 12 }} />
                <select value={compareUploadId} onChange={e => setCompareUploadId(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 10px 0 34px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                  <option value="">Select Date B...</option>
                  {uploads.filter(up => up.id !== selectedUploadId).map(up => (
                    <option key={up.id} value={up.id}>{up.file_name.replace(/\.xlsx$/, '')} ({new Date(up.uploaded_at).toLocaleDateString('en-IN')})</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Selector 2: Auditing Session (Standard Mode Only) */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auditing Session Filter</label>
              <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)}
                style={{ height: 38, padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value="All">All Sessions (Full Upload)</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.session_name} ({s.status})</option>
                ))}
              </select>
            </div>
          )}

          {/* Selector 3: Brand Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Brand Filter</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Building2 size={14} color="#64748b" style={{ position: 'absolute', left: 12 }} />
              <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}
                style={{ width: '100%', height: 38, padding: '0 10px 0 34px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value="All Brands">All Brands ({uniqueBrands.length})</option>
                {uniqueBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 280 }}><Loader2 size={32} color="#4f46e5" style={{ animation: 'spin 1s linear infinite' }} /></div>
      ) : (
        <>
          {/* Mode 1: Standard Single-Audit Mode */}
          {!compareMode && (
            <>
              {/* KPI cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Audit Completion', value: `${pct}%`, sub: `${overallStats.countedSkus} of ${overallStats.totalSkus} SKUs`, borderColor: '#4f46e5', icon: Layers },
                  { label: 'System Value', value: `₹${Math.round(overallStats.systemValue).toLocaleString('en-IN')}`, sub: `Physical: ₹${Math.round(overallStats.physicalValue).toLocaleString('en-IN')}`, borderColor: '#10b981', icon: FileSpreadsheet },
                  { label: 'Shortage Impact', value: `-₹${Math.round(overallStats.shortageValue).toLocaleString('en-IN')}`, sub: `${overallStats.shortageItems} SKUs short`, borderColor: '#dc2626', icon: ArrowDownRight },
                  { label: 'Excess Impact', value: `+₹${Math.round(overallStats.excessValue).toLocaleString('en-IN')}`, sub: `${overallStats.excessItems} SKUs surplus`, borderColor: '#d97706', icon: ArrowUpRight },
                ].map(({ label, value, sub, borderColor, icon: Icon }) => (
                  <div key={label} style={{ ...W, padding: '18px 20px', borderLeft: `4px solid ${borderColor}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{label}</p>
                      <p style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', lineHeight: 1.2 }}>{value}</p>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{sub}</p>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 9, background: `${borderColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} color={borderColor} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Excel Report Cards */}
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>Detailed Excel Reports</h2>
                <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 16px' }}>Download tailored spreadsheets with variance insights and audit history</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                  {reportCards.map(r => {
                    const Icon = r.icon;
                    const busy = downloadingType === r.id;
                    return (
                      <div key={r.id} style={{ ...W, padding: '20px', borderTop: `3px solid ${r.borderColor}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ width: 38, height: 38, borderRadius: 9, background: `${r.borderColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={18} color={r.borderColor} />
                          </div>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 9999, background: `${r.badgeColor}15`, color: r.badgeColor, border: `1px solid ${r.badgeColor}30` }}>{r.badge}</span>
                        </div>
                        <div>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', margin: '0 0 4px' }}>{r.title}</h3>
                          <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{r.desc}</p>
                        </div>
                        <button onClick={() => handleDownloadExcel(r.id)} disabled={!!downloadingType}
                          style={{ ...btn(false, !!downloadingType), width: '100%', justifyContent: 'center', borderTop: `1px solid #f1f5f9`, padding: '9px', borderRadius: 8 }}>
                          {busy ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
                          {busy ? 'Generating...' : 'Download Excel'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PDF Executive Card */}
              <div style={{ background: '#0f172a', borderRadius: 14, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={22} color="#fff" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Executive Management PDF Summary</h3>
                    <p style={{ fontSize: 13, color: '#94a3b8', margin: 0, maxWidth: 500, lineHeight: 1.5 }}>
                      Ready-to-present PDF with KPI scorecards, brand performance table, and top 15 critical variance items
                    </p>
                  </div>
                </div>
                <button onClick={handleDownloadPDF} disabled={downloadingType === 'pdf'}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, border: 'none', background: '#fff', color: '#0f172a', fontSize: 14, fontWeight: 700, cursor: downloadingType === 'pdf' ? 'not-allowed' : 'pointer', flexShrink: 0, fontFamily: 'inherit' }}>
                  {downloadingType === 'pdf' ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={16} />}
                  Download PDF
                </button>
              </div>

              {/* Brand Summary Table */}
              <div style={{ ...W, overflow: 'hidden' }}>
                <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Building2 size={16} color="#4f46e5" />
                    <div>
                      <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Brand-Wise Summary</h2>
                      <p style={{ fontSize: 12, color: '#94a3b8', margin: '1px 0 0' }}>Reconciliation performance by brand</p>
                    </div>
                  </div>
                  <button onClick={() => handleDownloadExcel('brand_summary')} disabled={!!downloadingType}
                    style={{ ...btn(false, !!downloadingType), fontSize: 12, padding: '7px 14px' }}>
                    <FileSpreadsheet size={13} color="#16a34a" /> Export Excel
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                        {['Brand', 'Progress', 'System Value', 'Physical Value', 'Net Variance', 'Shortages', 'Excess'].map((h, i) => (
                          <th key={h} style={{ padding: '11px 16px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: i >= 2 ? 'right' : i === 1 ? 'center' : 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {brandSummaries.filter(b => selectedBrand === 'All Brands' || b.brand === selectedBrand).map(b => {
                        const pctB = b.totalSkus > 0 ? (b.countedSkus / b.totalSkus) * 100 : 0;
                        const netColor = b.netVarianceValue < 0 ? '#dc2626' : b.netVarianceValue > 0 ? '#d97706' : '#16a34a';
                        return (
                          <tr key={b.brand} style={{ borderBottom: '1px solid #f8fafc' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafbfc'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}
                          >
                            <td style={{ padding: '13px 16px' }}>
                              <p style={{ fontWeight: 700, color: '#0f172a', margin: 0 }}>{b.brand}</p>
                              <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 0' }}>{b.totalSkus} SKUs</p>
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'center' }}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>{b.countedSkus}/{b.totalSkus}</p>
                              <div style={{ width: 64, height: 4, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden', margin: '0 auto' }}>
                                <div style={{ height: '100%', width: `${pctB}%`, background: '#4f46e5', borderRadius: 9999 }} />
                              </div>
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', color: '#475569', fontWeight: 500 }}>₹{Math.round(b.systemValue).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', color: '#475569', fontWeight: 500 }}>₹{Math.round(b.physicalValue).toLocaleString('en-IN')}</td>
                            <td style={{ padding: '13px 16px', textAlign: 'right', fontWeight: 700, color: netColor }}>
                              {b.netVarianceValue > 0 ? '+' : ''}₹{Math.round(b.netVarianceValue).toLocaleString('en-IN')}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                              {b.shortageCount > 0 ? <span style={{ fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 9999, border: '1px solid #fecaca' }}>{b.shortageCount}</span> : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                            </td>
                            <td style={{ padding: '13px 16px', textAlign: 'right' }}>
                              {b.excessCount > 0 ? <span style={{ fontSize: 11, fontWeight: 700, background: '#fffbeb', color: '#d97706', padding: '2px 8px', borderRadius: 9999, border: '1px solid #fde68a' }}>{b.excessCount}</span> : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Mode 2: Parallel Date Comparison Mode */}
          {compareMode && (
            <div style={{ ...W, overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Layers size={16} color="#4f46e5" />
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>Parallel Audit Comparison</h2>
                    <p style={{ fontSize: 12, color: '#94a3b8', margin: '1px 0 0' }}>Side-by-side reconciliation comparison</p>
                  </div>
                </div>
                <button onClick={handleDownloadComparisonExcel} disabled={!compareUploadId || !!downloadingType}
                  style={{ ...btn(true, !compareUploadId || !!downloadingType), fontSize: 12, padding: '7px 14px' }}>
                  {downloadingType === 'comparison' ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <FileSpreadsheet size={13} />}
                  Export Comparison Excel
                </button>
              </div>
              
              {!compareUploadId ? (
                <div style={{ padding: '64px 32px', textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                  Select "Audit Date B" in the filters above to load the comparison data.
                </div>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: 600, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 10 }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 10, textTransform: 'uppercase', fontWeight: 800 }}>SKU / Material</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontSize: 10, textTransform: 'uppercase', fontWeight: 800 }}>Brand</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', color: '#475569', fontSize: 10, textTransform: 'uppercase', fontWeight: 800 }}>MRP</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#4f46e5', fontSize: 10, textTransform: 'uppercase', fontWeight: 800, background: '#f0f4ff', borderLeft: '1px solid #e2e8f0' }} colSpan={3}>Audit Date A</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', color: '#059669', fontSize: 10, textTransform: 'uppercase', fontWeight: 800, background: '#ecfdf5', borderLeft: '1px solid #e2e8f0' }} colSpan={3}>Audit Date B</th>
                        <th style={{ padding: '12px 16px', textAlign: 'right', color: '#b45309', fontSize: 10, textTransform: 'uppercase', fontWeight: 800, borderLeft: '1px solid #e2e8f0' }} colSpan={2}>Delta Change</th>
                      </tr>
                      <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', position: 'sticky', top: 35, zIndex: 10 }}>
                        <th></th><th></th><th></th>
                        {/* Audit A */}
                        <th style={{ padding: '6px 8px', fontSize: 9, color: '#4f46e5', textAlign: 'right', background: '#f5f7ff', borderLeft: '1px solid #e2e8f0' }}>System</th>
                        <th style={{ padding: '6px 8px', fontSize: 9, color: '#4f46e5', textAlign: 'right', background: '#f5f7ff' }}>Counted</th>
                        <th style={{ padding: '6px 8px', fontSize: 9, color: '#4f46e5', textAlign: 'right', background: '#f5f7ff', fontWeight: 700 }}>Variance</th>
                        {/* Audit B */}
                        <th style={{ padding: '6px 8px', fontSize: 9, color: '#059669', textAlign: 'right', background: '#f2fdf9', borderLeft: '1px solid #e2e8f0' }}>System</th>
                        <th style={{ padding: '6px 8px', fontSize: 9, color: '#059669', textAlign: 'right', background: '#f2fdf9' }}>Counted</th>
                        <th style={{ padding: '6px 8px', fontSize: 9, color: '#059669', textAlign: 'right', background: '#f2fdf9', fontWeight: 700 }}>Variance</th>
                        {/* Delta */}
                        <th style={{ padding: '6px 8px', fontSize: 9, color: '#b45309', textAlign: 'right', borderLeft: '1px solid #e2e8f0' }}>Count Diff</th>
                        <th style={{ padding: '6px 8px', fontSize: 9, color: '#b45309', textAlign: 'right' }}>Value Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((r, idx) => (
                        <tr key={r.material} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                          <td style={{ padding: '12px 16px', textAlign: 'left' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{r.material}</div>
                            <div style={{ fontSize: 11, color: '#64748b', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'left', color: '#475569', fontWeight: 500 }}>{r.brand}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>₹{r.mrp.toFixed(2)}</td>
                          
                          {/* Audit A */}
                          <td style={{ padding: '10px 8px', textAlign: 'right', background: '#f5f7ff', borderLeft: '1px solid #e2e8f0' }}>{r.sysA}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', background: '#f5f7ff' }}>{r.phyA}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', background: '#f5f7ff', color: r.varA < 0 ? '#dc2626' : r.varA > 0 ? '#d97706' : '#16a34a', fontWeight: 700 }}>
                            {r.varA > 0 ? '+' : ''}{r.varA}
                          </td>

                          {/* Audit B */}
                          <td style={{ padding: '10px 8px', textAlign: 'right', background: '#f2fdf9', borderLeft: '1px solid #e2e8f0' }}>{r.sysB}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', background: '#f2fdf9' }}>{r.phyB}</td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', background: '#f2fdf9', color: r.varB < 0 ? '#dc2626' : r.varB > 0 ? '#d97706' : '#16a34a', fontWeight: 700 }}>
                            {r.varB > 0 ? '+' : ''}{r.varB}
                          </td>

                          {/* Delta */}
                          <td style={{ padding: '10px 8px', textAlign: 'right', borderLeft: '1px solid #e2e8f0', color: r.deltaCount < 0 ? '#dc2626' : r.deltaCount > 0 ? '#16a34a' : '#64748b', fontWeight: 700 }}>
                            {r.deltaCount > 0 ? '+' : ''}{r.deltaCount} PCS
                          </td>
                          <td style={{ padding: '10px 8px', textAlign: 'right', color: r.deltaValue < 0 ? '#dc2626' : r.deltaValue > 0 ? '#16a34a' : '#64748b', fontWeight: 700 }}>
                            {r.deltaValue > 0 ? '+' : ''}₹{Math.round(r.deltaValue).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
