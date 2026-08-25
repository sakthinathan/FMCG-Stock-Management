import React, { useState, useEffect } from 'react';
import {
  FileDown, FileSpreadsheet, Download, Loader2, FileText,
  TrendingUp, AlertCircle, History, Building2, CheckCircle2,
  Layers, ArrowUpRight, ArrowDownRight, UploadCloud
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
  const { activeUploadId, filename, uploadedAt } = useStockStore();
  const [downloadingType, setDownloadingType] = useState<ReportType | 'pdf' | null>(null);
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [uniqueBrands, setUniqueBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [brandSummaries, setBrandSummaries] = useState<BrandSummaryItem[]>([]);
  const [overallStats, setOverallStats] = useState({ totalSkus: 0, countedSkus: 0, systemValue: 0, physicalValue: 0, shortageValue: 0, excessValue: 0, shortageItems: 0, excessItems: 0 });

  useEffect(() => {
    async function loadData() {
      if (!activeUploadId) { setLoading(false); return; }
      try {
        setLoading(true);
        const { data: snapshots } = await supabase.from('system_stock_snapshots').select('*').eq('upload_id', activeUploadId);
        const { data: counts } = await supabase.from('physical_stock_counts').select('*');
        const countMap = new Map(); counts?.forEach(c => countMap.set(c.snapshot_id, c));
        const brandsSet = new Set<string>();
        const brandMap = new Map<string, BrandSummaryItem>();
        let totalSysVal = 0, totalPhyVal = 0, totalShortageVal = 0, totalExcessVal = 0, totalShortageCount = 0, totalExcessCount = 0, totalCounted = 0;

        snapshots?.forEach(snap => {
          const b = snap.brand || 'Unbranded';
          brandsSet.add(b);
          if (!brandMap.has(b)) brandMap.set(b, { brand: b, totalSkus: 0, countedSkus: 0, systemQtyPcs: 0, physicalQtyPcs: 0, systemValue: 0, physicalValue: 0, netVariancePcs: 0, netVarianceValue: 0, shortageCount: 0, excessCount: 0, resolvedCount: 0 });
          const e = brandMap.get(b)!;
          e.totalSkus++;
          const mrp = Number(snap.mrp) || 0, sysPcs = Number(snap.system_qty_pcs) || 0;
          e.systemQtyPcs += sysPcs; e.systemValue += sysPcs * mrp; totalSysVal += sysPcs * mrp;
          const count = countMap.get(snap.id);
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
        setOverallStats({ totalSkus: snapshots?.length || 0, countedSkus: totalCounted, systemValue: totalSysVal, physicalValue: totalPhyVal, shortageValue: totalShortageVal, excessValue: totalExcessVal, shortageItems: totalShortageCount, excessItems: totalExcessCount });
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    loadData();
  }, [activeUploadId]);

  const fetchReportData = async (type: ReportType) => {
    if (!activeUploadId) return null;
    const { data: snapshots } = await supabase.from('system_stock_snapshots').select('*').eq('upload_id', activeUploadId);
    const { data: counts } = await supabase.from('physical_stock_counts').select('*');
    const countMap = new Map(); counts?.forEach(c => countMap.set(c.snapshot_id, c));

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

  const handleDownloadPDF = async () => {
    setDownloadingType('pdf');
    try {
      const shortage = await fetchReportData('shortage'), excess = await fetchReportData('excess');
      const all = [...(shortage || []), ...(excess || [])];
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 32, 'F');
      doc.setFontSize(18); doc.setTextColor(255, 255, 255); doc.text('StockSync Reconciliation Report', 14, 18);
      doc.setFontSize(9); doc.setTextColor(148, 163, 184); doc.text(`Snapshot: ${filename} | Filter: ${selectedBrand}`, 14, 26);
      (doc as any).autoTable({ head: [['Metric', 'Value', 'Metric', 'Value']], body: [['Total SKUs', `${overallStats.countedSkus}/${overallStats.totalSkus}`, 'Completion', overallStats.totalSkus > 0 ? `${((overallStats.countedSkus / overallStats.totalSkus) * 100).toFixed(1)}%` : '0%'], ['System Value', `₹${overallStats.systemValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Physical Value', `₹${overallStats.physicalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`]], startY: 40, theme: 'grid', styles: { fontSize: 8 }, headStyles: { fillColor: [51, 65, 85] } });
      const brandY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.text('Brand-Wise Summary', 14, brandY);
      (doc as any).autoTable({ head: [['Brand', 'SKUs', 'Counted', 'Sys Val', 'Net Diff', 'Shortages', 'Excess']], body: brandSummaries.filter(b => selectedBrand === 'All Brands' || b.brand === selectedBrand).map(b => [b.brand, b.totalSkus, `${b.countedSkus} (${b.totalSkus > 0 ? ((b.countedSkus / b.totalSkus) * 100).toFixed(0) : 0}%)`, `₹${Math.round(b.systemValue).toLocaleString('en-IN')}`, `₹${Math.round(b.netVarianceValue).toLocaleString('en-IN')}`, b.shortageCount, b.excessCount]), startY: brandY + 4, theme: 'striped', styles: { fontSize: 7 }, headStyles: { fillColor: [30, 41, 59] } });
      doc.save(`StockSync_Summary_${selectedBrand.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (e) { alert('Failed to generate PDF.'); }
    finally { setDownloadingType(null); }
  };

  if (!activeUploadId) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '55vh', textAlign: 'center', gap: 20 }}>
      <div style={{ width: 64, height: 64, borderRadius: 16, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FileSpreadsheet size={30} color="#4f46e5" />
      </div>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>No Active Snapshot</h2>
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

      {/* Header */}
      <div style={{ ...W, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: '0 0 3px', letterSpacing: '-0.3px' }}>Reports & Reconciliation</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            <strong style={{ color: '#334155' }}>{filename}</strong>
            {uploadedAt && <> · {new Date(uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={14} color="#94a3b8" />
          <select value={selectedBrand} onChange={e => setSelectedBrand(e.target.value)}
            style={{ height: 36, padding: '0 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151', background: '#fff', outline: 'none', cursor: 'pointer' }}>
            <option value="All Brands">All Brands ({uniqueBrands.length})</option>
            {uniqueBrands.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
      </div>

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

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
