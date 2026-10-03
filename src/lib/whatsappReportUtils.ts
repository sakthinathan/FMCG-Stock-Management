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
 * Detects if the current user agent is a mobile device.
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Returns the exact WhatsApp URL:
 * - Mobile: https://api.whatsapp.com/send?text=... (opens WhatsApp App directly)
 * - Desktop: https://web.whatsapp.com/send?text=... (opens WhatsApp Web directly)
 */
export function getWhatsAppShareUrl(messageText: string, recipientPhone?: string): string {
  const encodedText = encodeURIComponent(messageText);
  const cleanPhone = recipientPhone ? recipientPhone.replace(/[^0-9]/g, '') : '';
  const phoneParam = cleanPhone
    ? (cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone)
    : '';

  if (phoneParam) {
    const isMobile = isMobileDevice();
    if (isMobile) {
      return `https://api.whatsapp.com/send?phone=${phoneParam}&text=${encodedText}`;
    }
    return `https://web.whatsapp.com/send?phone=${phoneParam}&text=${encodedText}`;
  }

  // When no specific phone is given, web.whatsapp.com/send fails with "invalid phone number".
  // api.whatsapp.com/send?text=... is the official WhatsApp Universal link that opens contact selector.
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}

/**
 * Copies text safely to the clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard write failed, attempting fallback', err);
    }
  }

  // Fallback using textarea
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback clipboard copy failed', err);
    return false;
  }
}

/**
 * Opens a URL reliably, circumventing strict browser popup blockers via dynamic anchor click.
 */
export function navigateToUrl(url: string): boolean {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (e) {
    console.warn('Anchor click failed, using window.open fallback:', e);
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    return !!win;
  }
}

/**
 * Shares the audit report to WhatsApp:
 * 1. Automatically copies the formatted summary text to clipboard so mobile users can
 *    instantly paste it in WhatsApp chat along with the attached PDF.
 * 2. On Mobile: Invokes native Web Share API with the PDF file.
 * 3. On Desktop: Downloads the PDF report and immediately redirects to WhatsApp Web.
 */
export async function shareReportToWhatsApp(
  messageText: string,
  pdfFile?: File | null,
  options?: {
    recipientPhone?: string;
    onDownloadTriggered?: () => void;
  }
): Promise<{ success: boolean; method: 'native_share' | 'web_link'; error?: string; waUrl?: string }> {
  // Always copy summary text to clipboard first so mobile and desktop users can paste it anytime
  await copyToClipboard(messageText);

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
        return { success: false, method: 'native_share', error: 'Share cancelled' };
      }
      console.warn('Native share failed, falling back to WhatsApp Web link:', err);
    }
  }

  // 2. Fallback for Desktop / WhatsApp Web link
  try {
    if (pdfFile && options?.onDownloadTriggered) {
      options.onDownloadTriggered();
    }

    const waUrl = getWhatsAppShareUrl(messageText, options?.recipientPhone);
    navigateToUrl(waUrl);
    return { success: true, method: 'web_link', waUrl };
  } catch (err: any) {
    console.error('Failed to open WhatsApp:', err);
    return { success: false, method: 'web_link', error: err.message || 'Failed to open WhatsApp' };
  }
}
