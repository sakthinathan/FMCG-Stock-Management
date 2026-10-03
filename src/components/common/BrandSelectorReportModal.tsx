import React, { useState, useMemo } from 'react';
import {
  X, Search, CheckSquare, Square, FileText, FileSpreadsheet,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Share2, Sparkles, MessageCircle,
  Copy, Check, Send, ExternalLink
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import {
  formatWhatsAppAuditSummary,
  shareReportToWhatsApp,
  copyToClipboard,
  getWhatsAppShareUrl,
  navigateToUrl,
  isMobileDevice,
} from '@/lib/whatsappReportUtils';
import { generateReportPdfFile, exportReportToPdf, exportDataToExcel } from '@/lib/reportExportUtils';
import { calculateCbbPcs, formatCbbPcs } from '@/lib/cbbUtils';

export interface BrandSelectorReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  brandSummaries: any[];
  agencyName: string;
  awCode?: string | null;
  reportTitle: string;
  getReportDataForBrands: (brandNames: string[]) => { rows: any[]; stats: any };
}

export function BrandSelectorReportModal({
  isOpen,
  onClose,
  brandSummaries,
  agencyName,
  awCode,
  reportTitle,
  getReportDataForBrands,
}: BrandSelectorReportModalProps) {
  if (!isOpen) return null;

  // Preset Selection: 'completed' | 'counted' | 'all' | 'custom'
  const [activePreset, setActivePreset] = useState<'completed' | 'counted' | 'all' | 'custom'>('completed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(() => {
    // Default preset: completed brands if available, otherwise counted or all
    const completed = brandSummaries.filter(b => b.countedSkus === b.totalSkus && b.totalSkus > 0).map(b => b.brand);
    if (completed.length > 0) return new Set(completed);
    const counted = brandSummaries.filter(b => b.countedSkus > 0).map(b => b.brand);
    if (counted.length > 0) return new Set(counted);
    return new Set(brandSummaries.map(b => b.brand));
  });
  const [showPreviewMessage, setShowPreviewMessage] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [lastWaUrl, setLastWaUrl] = useState<string | null>(null);
  const [recipientPhone, setRecipientPhone] = useState<string>(() => {
    return localStorage.getItem('fmcg_audit_recipient_phone') || '';
  });

  // Completed & Counted presets
  const completedBrands = useMemo(() => {
    return brandSummaries.filter(b => b.countedSkus === b.totalSkus && b.totalSkus > 0).map(b => b.brand);
  }, [brandSummaries]);

  const countedBrands = useMemo(() => {
    return brandSummaries.filter(b => b.countedSkus > 0).map(b => b.brand);
  }, [brandSummaries]);

  const allBrandNames = useMemo(() => {
    return brandSummaries.map(b => b.brand);
  }, [brandSummaries]);

  // Handle Preset Switching
  const handleSelectPreset = (preset: 'completed' | 'counted' | 'all' | 'custom') => {
    setActivePreset(preset);
    if (preset === 'completed') {
      setSelectedBrands(new Set(completedBrands));
    } else if (preset === 'counted') {
      setSelectedBrands(new Set(countedBrands));
    } else if (preset === 'all') {
      setSelectedBrands(new Set(allBrandNames));
    }
  };

  // Toggle individual brand checkbox
  const toggleBrand = (brandName: string) => {
    setActivePreset('custom');
    setSelectedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brandName)) next.delete(brandName);
      else next.add(brandName);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    setActivePreset('custom');
    setSelectedBrands(prev => {
      const next = new Set(prev);
      filteredBrands.forEach(b => next.add(b.brand));
      return next;
    });
  };

  const handleClearAll = () => {
    setActivePreset('custom');
    setSelectedBrands(new Set());
  };

  // Filtered brands for search display
  const filteredBrands = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return brandSummaries;
    return brandSummaries.filter(b => b.brand.toLowerCase().includes(q));
  }, [brandSummaries, searchQuery]);

  // Compute stats for selected brands
  const selectedBrandList = useMemo(() => Array.from(selectedBrands), [selectedBrands]);
  const { rows, stats } = useMemo(() => {
    return getReportDataForBrands(selectedBrandList);
  }, [getReportDataForBrands, selectedBrandList]);

  // Compute key shortages for preview
  const topShortages = useMemo(() => {
    return rows
      .filter(r => {
        const status = r['Status'] || '';
        return status === 'Shortage';
      })
      .slice(0, 5)
      .map(r => ({
        material: r['Material'] || '',
        desc: r['Description'] || '',
        brand: r['Brand'] || '',
        diffText: r['Difference (CBB & PCS)'] || `${r['Variance (PCS)']} PCS`,
      }));
  }, [rows]);

  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const netVarianceCbbPcs = useMemo(() => {
    return formatCbbPcs(stats?.netVarCbb || 0, stats?.netVarLoosePcs || 0);
  }, [stats]);

  // Formatted WhatsApp message
  const whatsappMessageText = useMemo(() => {
    return formatWhatsAppAuditSummary({
      agencyName,
      awCode,
      dateStr,
      selectedBrandNames: selectedBrandList,
      totalSkus: stats.totalSkus,
      countedSkus: stats.countedSkus,
      matchedSkus: Math.max(0, stats.countedSkus - (stats.shortageItems || 0) - (stats.excessItems || 0)),
      shortageSkus: stats.shortageItems || 0,
      excessSkus: stats.excessItems || 0,
      netVarCbbLooseText: netVarianceCbbPcs,
      topShortages,
      isCompletedOnly: activePreset === 'completed',
    });
  }, [agencyName, awCode, dateStr, selectedBrandList, stats, netVarianceCbbPcs, topShortages, activePreset]);

  // ── Action Handlers ──

  // 1. Share on WhatsApp (PDF File + Formatted Message)
  const handleShareWhatsApp = async () => {
    if (selectedBrandList.length === 0) return;
    setIsSharing(true);
    setStatusNotice('Generating PDF report for selected brands...');

    try {
      const pdfResult = generateReportPdfFile(
        rows,
        `${reportTitle}_Selected_Brands`,
        stats,
        agencyName
      );

      const pdfFile = pdfResult ? pdfResult.file : null;

      const shareResult = await shareReportToWhatsApp(whatsappMessageText, pdfFile, {
        recipientPhone,
        onDownloadTriggered: () => {
          if (pdfResult) {
            pdfResult.doc.save(pdfResult.filename);
          }
        },
      });

      if (shareResult.waUrl) {
        setLastWaUrl(shareResult.waUrl);
      }

      if (shareResult.method === 'web_link') {
        setStatusNotice('PDF report downloaded! WhatsApp Web opened in a new tab. (Summary text copied to clipboard)');
      } else {
        setStatusNotice('📋 Summary copied to clipboard! In WhatsApp, simply tap Paste to send the summary text along with the attached PDF.');
      }

      setTimeout(() => {
        setIsSharing(false);
      }, 1500);

      setTimeout(() => {
        setStatusNotice(null);
      }, 7000);
    } catch (e: any) {
      console.error('Error sharing report to WhatsApp:', e);
      setIsSharing(false);
      setStatusNotice('Error generating report: ' + (e.message || 'Failed'));
    }
  };

  // 2. 1-Click Copy Summary Text to Clipboard
  const handleCopySummary = async () => {
    const success = await copyToClipboard(whatsappMessageText);
    if (success) {
      setCopiedSummary(true);
      setStatusNotice('📋 Audit summary text copied to clipboard! You can paste it into any WhatsApp chat or email.');
      setTimeout(() => setCopiedSummary(false), 2500);
      setTimeout(() => setStatusNotice(null), 5000);
    }
  };

  // 3. Send WhatsApp Summary Text Only (Instant 1-Click Redirect)
  const handleSendWhatsAppTextOnly = async () => {
    await copyToClipboard(whatsappMessageText);
    const waUrl = getWhatsAppShareUrl(whatsappMessageText, recipientPhone);
    setLastWaUrl(waUrl);
    navigateToUrl(waUrl);
    setStatusNotice('Opening WhatsApp with summary message text pre-drafted...');
    setTimeout(() => setStatusNotice(null), 4000);
  };

  // 4. Download PDF for Selected Brands
  const handleDownloadPdf = () => {
    if (selectedBrandList.length === 0) return;
    exportReportToPdf(
      rows,
      `${reportTitle}_Selected_Brands`,
      stats,
      agencyName
    );
  };

  // 5. Export Excel for Selected Brands
  const handleExportExcel = () => {
    if (selectedBrandList.length === 0) return;
    exportDataToExcel(rows, 'custom', 'Stock_Selected_Brands');
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff', borderRadius: 20, width: '100%', maxWidth: 680,
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
          border: '1px solid #e2e8f0', animation: 'modalSlideUp 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#22c55e18', border: '1px solid #22c55e30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={22} color="#16a34a" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.2px' }}>
                Customize & Share Audit Report
              </h2>
              <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>
                Select brands to include in your final report and WhatsApp share
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Quick Preset Selector Buttons */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
              Select Brand Preset:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                type="button"
                onClick={() => handleSelectPreset('completed')}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: '1px solid',
                  background: activePreset === 'completed' ? '#15803d' : '#f0fdf4',
                  color: activePreset === 'completed' ? '#fff' : '#15803d',
                  borderColor: activePreset === 'completed' ? '#15803d' : '#bbf7d0',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease'
                }}
              >
                <CheckCircle2 size={14} /> Completed Today ({completedBrands.length})
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('counted')}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: '1px solid',
                  background: activePreset === 'counted' ? '#4f46e5' : '#eef2ff',
                  color: activePreset === 'counted' ? '#fff' : '#4f46e5',
                  borderColor: activePreset === 'counted' ? '#4f46e5' : '#c7d2fe',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease'
                }}
              >
                <Sparkles size={14} /> All Counted ({countedBrands.length})
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('all')}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', border: '1px solid',
                  background: activePreset === 'all' ? '#0f172a' : '#f8fafc',
                  color: activePreset === 'all' ? '#fff' : '#475569',
                  borderColor: activePreset === 'all' ? '#0f172a' : '#cbd5e1',
                  display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s ease'
                }}
              >
                All Brands ({allBrandNames.length})
              </button>
            </div>
          </div>

          {/* Search & Bulk Select */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search brands to filter..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', height: 36, paddingLeft: 34, paddingRight: 12,
                  borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 12,
                  outline: 'none', background: '#fff', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 11, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
              >
                Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 11, fontWeight: 600, color: '#64748b', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>
          </div>

          {/* Brands Checkbox List */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, maxHeight: 220, overflowY: 'auto', background: '#fff' }}>
            {filteredBrands.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                No brands match "{searchQuery}"
              </div>
            ) : (
              filteredBrands.map(b => {
                const isSelected = selectedBrands.has(b.brand);
                const isCompleted = b.countedSkus === b.totalSkus && b.totalSkus > 0;
                const isInProgress = b.countedSkus > 0 && b.countedSkus < b.totalSkus;

                return (
                  <div
                    key={b.brand}
                    onClick={() => toggleBrand(b.brand)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer', background: isSelected ? '#f8fafc' : '#ffffff',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isSelected ? (
                        <CheckSquare size={17} color="#4f46e5" />
                      ) : (
                        <Square size={17} color="#cbd5e1" />
                      )}
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#0f172a' : '#475569' }}>
                          {b.brand}
                        </span>
                        <p style={{ fontSize: 11, color: '#64748b', margin: '1px 0 0' }}>
                          {b.countedSkus} of {b.totalSkus} SKUs counted
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isCompleted ? (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#dcfce7', color: '#15803d' }}>
                          Completed
                        </span>
                      ) : isInProgress ? (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#e0e7ff', color: '#4338ca' }}>
                          In Progress
                        </span>
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9', color: '#64748b' }}>
                          Not Started
                        </span>
                      )}

                      {b.shortageCount > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: '#fef2f2', color: '#dc2626' }}>
                          {b.shortageCount} Short
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Dynamic Selection Summary Banner */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                Included in Report: <span style={{ color: '#4f46e5' }}>{selectedBrandList.length} Brands</span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
                {stats.countedSkus} / {stats.totalSkus} SKUs
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 11 }}>
              <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: 6, fontWeight: 600, border: '1px solid #bbf7d0' }}>
                Matched: {Math.max(0, stats.countedSkus - (stats.shortageItems || 0) - (stats.excessItems || 0))} SKUs
              </span>
              <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 8px', borderRadius: 6, fontWeight: 600, border: '1px solid #fecaca' }}>
                Shortage: {stats.shortageItems || 0} SKUs
              </span>
              <span style={{ background: '#fffbeb', color: '#d97706', padding: '3px 8px', borderRadius: 6, fontWeight: 600, border: '1px solid #fde68a' }}>
                Excess: {stats.excessItems || 0} SKUs
              </span>
              <span style={{ background: '#eef2ff', color: '#4338ca', padding: '3px 8px', borderRadius: 6, fontWeight: 600, border: '1px solid #c7d2fe' }}>
                Net Var: {netVarianceCbbPcs}
              </span>
            </div>
          </div>

          {/* Optional Recipient Phone Number */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <MessageCircle size={13} color="#16a34a" /> Direct Recipient WhatsApp No. (Optional):
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', background: '#e2e8f0', padding: '6px 8px', borderRadius: 6 }}>+91</span>
              <input
                type="tel"
                placeholder="10-digit mobile no. (e.g. 9876543210 or leave empty)"
                value={recipientPhone}
                onChange={e => {
                  const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                  setRecipientPhone(val);
                  localStorage.setItem('fmcg_audit_recipient_phone', val);
                }}
                style={{
                  flex: 1, height: 34, padding: '0 10px', borderRadius: 6, border: '1px solid #cbd5e1',
                  fontSize: 12, fontWeight: 600, color: '#0f172a', outline: 'none', background: '#fff'
                }}
              />
              {recipientPhone && (
                <button
                  type="button"
                  onClick={() => {
                    setRecipientPhone('');
                    localStorage.removeItem('fmcg_audit_recipient_phone');
                  }}
                  style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                >
                  Clear
                </button>
              )}
            </div>
            <p style={{ fontSize: 10, color: '#94a3b8', margin: '4px 0 0' }}>
              {recipientPhone.length === 10
                ? '✓ Will open direct chat with this number on WhatsApp Web & Mobile'
                : 'Leave blank to select any person or group from your WhatsApp contact list'}
            </p>
          </div>

          {/* Accordion: WhatsApp Message Text Preview */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setShowPreviewMessage(!showPreviewMessage)}
              style={{
                width: '100%', padding: '10px 14px', background: '#f8fafc',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#334155'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageCircle size={15} color="#16a34a" /> Preview WhatsApp Message Text
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                  {showPreviewMessage ? 'Hide' : 'View & Copy'}
                </span>
                {showPreviewMessage ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </button>

            {showPreviewMessage && (
              <div style={{ padding: '12px 14px', background: '#ffffff', borderTop: '1px solid #e2e8f0' }}>
                <pre style={{
                  margin: 0, fontSize: 11, color: '#1e293b', whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace', background: '#f1f5f9', padding: '10px 12px',
                  borderRadius: 8, lineHeight: 1.5, maxHeight: 150, overflowY: 'auto'
                }}>
                  {whatsappMessageText}
                </pre>

                {/* Quick actions for summary text */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    style={{
                      padding: '6px 12px', borderRadius: 7, border: '1px solid #cbd5e1',
                      background: copiedSummary ? '#f0fdf4' : '#ffffff',
                      color: copiedSummary ? '#15803d' : '#334155',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s ease'
                    }}
                  >
                    {copiedSummary ? <Check size={13} color="#16a34a" /> : <Copy size={13} />}
                    {copiedSummary ? 'Copied to Clipboard!' : 'Copy Summary Text'}
                  </button>

                  <button
                    type="button"
                    onClick={handleSendWhatsAppTextOnly}
                    style={{
                      padding: '6px 12px', borderRadius: 7, border: '1px solid #bbf7d0',
                      background: '#f0fdf4', color: '#15803d',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5
                    }}
                  >
                    <Send size={13} />
                    Send Summary Message Only
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Status notice with direct link backup */}
          {statusNotice && (
            <div style={{
              padding: '10px 14px', borderRadius: 10, background: '#eff6ff',
              border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 600, color: '#1d4ed8',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center'
            }}>
              <div>{statusNotice}</div>
              {lastWaUrl && (
                <button
                  type="button"
                  onClick={() => navigateToUrl(lastWaUrl)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid #93c5fd',
                    background: '#ffffff', color: '#1d4ed8', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
                  }}
                >
                  <ExternalLink size={12} /> Open WhatsApp Web Now
                </button>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div
          className="brand-modal-footer"
          style={{
            padding: '14px 20px', borderTop: '1px solid #f1f5f9', background: '#f8fafc',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }} className="brand-modal-secondary-actions">
            {/* Download PDF button */}
            <button
              type="button"
              disabled={selectedBrandList.length === 0}
              onClick={handleDownloadPdf}
              style={{
                padding: '9px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                cursor: selectedBrandList.length === 0 ? 'not-allowed' : 'pointer',
                border: '1px solid #cbd5e1', background: '#fff', color: '#334155',
                display: 'flex', alignItems: 'center', gap: 6, opacity: selectedBrandList.length === 0 ? 0.5 : 1
              }}
              title="Download PDF report for selected brands"
            >
              <FileText size={15} color="#4f46e5" /> Download PDF
            </button>

            {/* Export Excel button */}
            <button
              type="button"
              disabled={selectedBrandList.length === 0}
              onClick={handleExportExcel}
              style={{
                padding: '9px 14px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                cursor: selectedBrandList.length === 0 ? 'not-allowed' : 'pointer',
                border: '1px solid #cbd5e1', background: '#fff', color: '#334155',
                display: 'flex', alignItems: 'center', gap: 6, opacity: selectedBrandList.length === 0 ? 0.5 : 1
              }}
              title="Export Excel spreadsheet for selected brands"
            >
              <FileSpreadsheet size={15} color="#16a34a" /> Excel
            </button>

            {/* 1-Click Copy Summary Button */}
            <button
              type="button"
              onClick={handleCopySummary}
              style={{
                padding: '9px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', border: '1px solid #cbd5e1', background: copiedSummary ? '#f0fdf4' : '#fff',
                color: copiedSummary ? '#15803d' : '#475569', display: 'flex', alignItems: 'center', gap: 5
              }}
              title="Copy audit summary message to clipboard"
            >
              {copiedSummary ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
              {copiedSummary ? 'Copied' : 'Copy Text'}
            </button>
          </div>

          {/* Primary Action: Share on WhatsApp with PDF attached */}
          <button
            type="button"
            disabled={selectedBrandList.length === 0 || isSharing}
            onClick={handleShareWhatsApp}
            className="brand-modal-primary-action"
            style={{
              padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 800,
              cursor: selectedBrandList.length === 0 || isSharing ? 'not-allowed' : 'pointer',
              border: 'none', background: selectedBrandList.length === 0 ? '#94a3b8' : '#22c55e',
              color: '#ffffff', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: selectedBrandList.length === 0 ? 'none' : '0 4px 14px rgba(34, 197, 94, 0.4)',
              transition: 'all 0.15s ease'
            }}
          >
            <Share2 size={16} />
            {isSharing ? 'Preparing...' : 'Share to WhatsApp (PDF + Summary)'}
          </button>
        </div>

        <style>{`
          @media (max-width: 600px) {
            .brand-modal-footer {
              flex-direction: column-reverse !important;
              align-items: stretch !important;
            }
            .brand-modal-primary-action {
              width: 100% !important;
              justify-content: center !important;
            }
            .brand-modal-secondary-actions {
              width: 100% !important;
              justify-content: space-between !important;
            }
            .brand-modal-secondary-actions button {
              flex: 1 !important;
              justify-content: center !important;
              padding: 8px 6px !important;
              font-size: 11px !important;
            }
          }
        `}</style>

      </div>
    </div>
  );
}
