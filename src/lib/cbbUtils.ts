/**
 * Utility functions for CBB (Case / Carton) and PCS (Piece) operational inventory calculations.
 * 1 CBB = conversion PCS.
 */

export interface CbbPcsBreakdown {
  cbb: number;
  loosePcs: number;
  totalPcs: number;
  sign: string;
  formatted: string;
  formattedWithTotal: string;
}

/**
 * Decomposes any piece quantity into CBB (Cases) and loose PCS according to the SKU conversion factor.
 */
export function calculateCbbPcs(
  qtyPcs: number | null | undefined,
  conversion: number | null | undefined,
  isVariance = false
): CbbPcsBreakdown {
  const total = Number(qtyPcs) || 0;
  const conv = Number(conversion) > 0 ? Number(conversion) : 1;
  const absTotal = Math.abs(total);
  const cbb = Math.floor(absTotal / conv);
  const loosePcs = absTotal % conv;

  if (total === 0) {
    return {
      cbb: 0,
      loosePcs: 0,
      totalPcs: 0,
      sign: '',
      formatted: '0 CBB + 0 PCS',
      formattedWithTotal: '0 CBB + 0 PCS (0 PCS)',
    };
  }

  if (total > 0) {
    const sign = isVariance ? '+' : '';
    const formatted = `${sign}${cbb} CBB + ${loosePcs} PCS`;
    return {
      cbb,
      loosePcs,
      totalPcs: total,
      sign,
      formatted,
      formattedWithTotal: `${formatted} (${sign}${total.toLocaleString('en-IN')} PCS)`,
    };
  }

  // Negative quantity (e.g. variance < 0, shortage)
  const formatted = `-${cbb} CBB - ${loosePcs} PCS`;
  return {
    cbb,
    loosePcs,
    totalPcs: total,
    sign: '-',
    formatted,
    formattedWithTotal: `${formatted} (${total.toLocaleString('en-IN')} PCS)`,
  };
}

/**
 * Concise CBB & PCS formatting for compact table cells, badges, or PDF export.
 */
export function formatCbbPcs(
  qtyPcs: number | string | null | undefined,
  conversion: number | null | undefined,
  isVariance = false
): string {
  if (qtyPcs === null || qtyPcs === undefined || qtyPcs === '') return '';
  return calculateCbbPcs(Number(qtyPcs), conversion, isVariance).formatted;
}
