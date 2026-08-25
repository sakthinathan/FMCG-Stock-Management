// Shared inline style constants for consistent design across all pages
export const S = {
  // Page wrapper
  page: { display: 'flex', flexDirection: 'column' as const, gap: 20 },

  // Cards
  card: {
    background: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 12, padding: '20px 24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  } as React.CSSProperties,
  cardSm: {
    background: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 10, padding: '16px 20px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  } as React.CSSProperties,

  // Header card (page title row)
  header: {
    background: '#ffffff', border: '1px solid #e2e8f0',
    borderRadius: 12, padding: '18px 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap' as const, gap: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  } as React.CSSProperties,

  // Row / flex helpers
  row: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const } as React.CSSProperties,
  rowBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' as const } as React.CSSProperties,
  col: { display: 'flex', flexDirection: 'column' as const, gap: 6 } as React.CSSProperties,

  // Text hierarchy
  pageTitle: { fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: '#64748b', margin: 0 } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em' } as React.CSSProperties,
  value: { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 } as React.CSSProperties,

  // Badge chips
  chip: (color: 'indigo' | 'emerald' | 'red' | 'amber' | 'slate') => ({
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
    background: color === 'indigo'  ? '#eef2ff' : color === 'emerald' ? '#f0fdf4' :
                color === 'red'     ? '#fef2f2' : color === 'amber'   ? '#fffbeb' : '#f8fafc',
    color:      color === 'indigo'  ? '#4338ca' : color === 'emerald' ? '#16a34a' :
                color === 'red'     ? '#dc2626' : color === 'amber'   ? '#d97706' : '#475569',
    border: `1px solid ${
                color === 'indigo'  ? '#c7d2fe' : color === 'emerald' ? '#bbf7d0' :
                color === 'red'     ? '#fecaca' : color === 'amber'   ? '#fde68a' : '#e2e8f0'}`,
  } as React.CSSProperties),

  // Buttons
  btn: (variant: 'primary' | 'outline' | 'ghost' | 'danger' = 'primary') => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', border: 'none', transition: 'background 0.15s',
    background: variant === 'primary' ? '#4f46e5' : variant === 'danger' ? '#ef4444' :
                variant === 'outline' ? '#fff'    : 'transparent',
    color:      variant === 'primary' ? '#fff'    : variant === 'danger' ? '#fff' :
                variant === 'outline' ? '#374151' : '#4f46e5',
    ...(variant === 'outline' ? { border: '1px solid #e2e8f0' } : {}),
  } as React.CSSProperties),

  // Input
  input: {
    width: '100%', height: 38, padding: '0 12px',
    border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, color: '#0f172a', background: '#fff',
    outline: 'none', boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  select: {
    height: 38, padding: '0 10px',
    border: '1px solid #e2e8f0', borderRadius: 8,
    fontSize: 13, color: '#374151', background: '#fff',
    outline: 'none', cursor: 'pointer',
  } as React.CSSProperties,

  // Table
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 } as React.CSSProperties,
  th: { textAlign: 'left' as const, padding: '10px 16px', fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' } as React.CSSProperties,
  td: { padding: '13px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' as const } as React.CSSProperties,

  // Icon container
  iconBox: (color: 'indigo' | 'emerald' | 'red' | 'amber' | 'slate' | 'blue') => ({
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: color === 'indigo'  ? '#eef2ff' : color === 'emerald' ? '#f0fdf4' :
                color === 'red'     ? '#fef2f2' : color === 'amber'   ? '#fffbeb' :
                color === 'blue'    ? '#eff6ff' : '#f8fafc',
    color:      color === 'indigo'  ? '#4f46e5' : color === 'emerald' ? '#16a34a' :
                color === 'red'     ? '#dc2626' : color === 'amber'   ? '#d97706' :
                color === 'blue'    ? '#2563eb' : '#64748b',
  } as React.CSSProperties),

  // Empty state
  emptyState: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    justifyContent: 'center', padding: '64px 24px', textAlign: 'center' as const,
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    gap: 16,
  } as React.CSSProperties,

  // Progress bar track
  progressTrack: { height: 6, background: '#f1f5f9', borderRadius: 9999, overflow: 'hidden' as const } as React.CSSProperties,
  progressFill: (pct: number, color = '#4f46e5') => ({
    height: '100%', width: `${pct}%`, background: color,
    borderRadius: 9999, transition: 'width 0.5s ease',
  } as React.CSSProperties),

  // Divider
  divider: { height: 1, background: '#f1f5f9', margin: '4px 0' } as React.CSSProperties,

  // KPI stat card
  statCard: (color: 'indigo' | 'emerald' | 'red' | 'amber' | 'slate') => ({
    background: color === 'emerald' ? '#f0fdf4' : color === 'red' ? '#fef2f2' :
                color === 'amber'   ? '#fffbeb' : '#fff',
    border: `1px solid ${
      color === 'emerald' ? '#bbf7d0' : color === 'red' ? '#fecaca' :
      color === 'amber'   ? '#fde68a' : '#e2e8f0'}`,
    borderRadius: 12, padding: '18px 20px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  } as React.CSSProperties),
};
