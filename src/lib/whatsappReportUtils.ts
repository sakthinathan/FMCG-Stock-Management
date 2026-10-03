/**
 * WhatsApp Report Utilities for FMCG Stock Management System
 * Supports both Native Web Share API (attaching PDF file directly on mobile)
 * and WhatsApp Web deep-link fallback (with pre-drafted text summary).
 */

export interface WhatsAppSummaryParams {
  agencyName: string;
  awCode?: string | null;
  dateStr: string;
  selectedBrandNames: string[];
  totalSkus: number;
  countedSkus: number;
  matchedSkus: number;
  shortageSkus: number;
  excessSkus: number;
  netVarCbbLooseText?: string;
  topShortages?: { material: string; desc: string; brand: string; diffText: string }[];
  isCompletedOnly?: boolean;
}

/**
 * Builds a clean, professional, emoji-formatted WhatsApp message text.
 */
export function formatWhatsAppAuditSummary(params: WhatsAppSummaryParams): string {
  const {
    agencyName,
    awCode,
    dateStr,
    selectedBrandNames,
    totalSkus,
    countedSkus,
    matchedSkus,
    shortageSkus,
    excessSkus,
    netVarCbbLooseText,
    topShortages = [],
    isCompletedOnly = false,
  } = params;

  const awPart = awCode ? ` (AW: ${awCode})` : '';
  const brandCount = selectedBrandNames.length;
  const brandListSample = selectedBrandNames.slice(0, 5).join(', ');
  const moreBrands = brandCount > 5 ? ` +${brandCount - 5} more` : '';

  let message = `📦 *BRITANNIA STOCK AUDIT REPORT*\n`;
  message += `🏢 *Agency:* ${agencyName}${awPart}\n`;
  message += `📅 *Date:* ${dateStr}\n`;
  message += `🏷️ *Scope:* ${isCompletedOnly ? 'Completed Brands Today' : `${brandCount} Selected Brands`}\n\n`;

  message += `📊 *AUDIT SUMMARY:*\n`;
  message += `• *Brands Included:* ${brandCount} (${brandListSample}${moreBrands})\n`;
  message += `• *SKUs Counted:* ${countedSkus} / ${totalSkus} SKUs\n`;
  message += `• *Equal / Matched:* ${matchedSkus} SKUs 🟢\n`;
  message += `• *Shortages:* ${shortageSkus} SKUs 🔴\n`;
  message += `• *Excess:* ${excessSkus} SKUs 🟡\n`;

  if (netVarCbbLooseText) {
    message += `• *Net Variance:* ${netVarCbbLooseText}\n`;
  }

  if (topShortages.length > 0) {
    message += `\n⚠️ *TOP SHORTAGE ITEMS:*\n`;
    topShortages.slice(0, 5).forEach((item, idx) => {
      const desc = item.desc ? ` - ${item.desc.substring(0, 24)}` : '';
      message += `${idx + 1}. *${item.brand}* (${item.material}${desc}): ${item.diffText}\n`;
    });
  }

  message += `\n📄 *Brand-wise stock audit PDF report is attached below.*`;
  return message;
}

/**
 * Shares the audit report to WhatsApp.
 * - On Mobile (Android / iOS): Invokes native navigator.share with the PDF File and text message attached together.
 * - On Desktop: Downloads the PDF and opens WhatsApp Web link with pre-drafted text.
 */
export async function shareReportToWhatsApp(
  messageText: string,
  pdfFile?: File | null,
  options?: {
    recipientPhone?: string;
    onDownloadTriggered?: () => void;
  }
): Promise<{ success: boolean; method: 'native_share' | 'web_link'; error?: string }> {
  // 1. Try Native Web Share API if supported and has PDF file (Mobile Chrome, Safari, Edge)
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    pdfFile &&
    navigator.canShare &&
    navigator.canShare({ files: [pdfFile] })
  ) {
    try {
      await navigator.share({
        title: 'Britannia Stock Audit Report',
        text: messageText,
        files: [pdfFile],
      });
      return { success: true, method: 'native_share' };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User cancelled share sheet, not a failure
        return { success: false, method: 'native_share', error: 'Share cancelled' };
      }
      console.warn('Native share failed, falling back to WhatsApp Web link:', err);
    }
  }

  // 2. Fallback for Desktop / WhatsApp Web link
  try {
    // If PDF file is available and onDownloadTriggered is provided, trigger download
    if (pdfFile && options?.onDownloadTriggered) {
      options.onDownloadTriggered();
    }

    const encodedText = encodeURIComponent(messageText);
    const cleanPhone = options?.recipientPhone ? options.recipientPhone.replace(/[^0-9]/g, '') : '';
    const phoneParam = cleanPhone ? `${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}` : '';

    const waUrl = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank');
    return { success: true, method: 'web_link' };
  } catch (err: any) {
    console.error('Failed to open WhatsApp:', err);
    return { success: false, method: 'web_link', error: err.message || 'Failed to open WhatsApp' };
  }
}
