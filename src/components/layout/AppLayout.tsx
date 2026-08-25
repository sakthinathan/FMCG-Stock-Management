import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  PackageSearch, UploadCloud, LayoutDashboard, Settings,
  AlertTriangle, FileText, LogOut, ListChecks, Search, Menu, X, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { useStockStore } from '@/store/useStockStore';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
    ],
  },
  {
    label: 'Stock Count',
    items: [
      { icon: PackageSearch,  label: 'Count by Brand', to: '/brands'   },
      { icon: ListChecks,     label: 'Sessions',       to: '/sessions' },
      { icon: Search,         label: 'Search Stock',   to: '/search'   },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { icon: AlertTriangle,  label: 'Issues',         to: '/issues'   },
      { icon: FileText,       label: 'Reports',        to: '/reports'  },
    ],
  },
  {
    label: 'Management',
    items: [
      { icon: UploadCloud,    label: 'Upload Stock',   to: '/upload'   },
      { icon: Settings,       label: 'Settings',       to: '/settings' },
    ],
  },
];

const mobileNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
  { icon: PackageSearch,   label: 'Count',     to: '/brands' },
  { icon: AlertTriangle,   label: 'Issues',    to: '/issues' },
  { icon: FileText,        label: 'Reports',   to: '/reports' },
  { icon: UploadCloud,     label: 'Upload',    to: '/upload' },
];

function isActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

const pageTitles: Record<string, string> = {
  '/':         'Dashboard',
  '/brands':   'Brand-Wise Counting',
  '/sessions': 'Audit Sessions',
  '/search':   'Search Stock',
  '/issues':   'Issues & Discrepancies',
  '/reports':  'Reports',
  '/upload':   'Upload Stock',
  '/settings': 'Settings',
};

export function AppLayout() {
  const { signOut, user, agency, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { filename } = useStockStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => { await signOut(); navigate('/login'); };

  const pageTitle = Object.entries(pageTitles).find(([path]) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )?.[1] || 'StockSync';

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ── Desktop Sidebar ── */}
      <aside style={{ width: 248, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#fff', borderRight: '1px solid #e8ecf0' }}
        className="desktop-sidebar">

        {/* Sidebar logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img 
              src={agency?.logo_url || `${import.meta.env.BASE_URL}britannia_logo.png`} 
              alt="Agency Logo"
              style={{ height: 28, objectFit: 'contain' }}
            />
            <div>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: 0, letterSpacing: '-0.2px' }}>{agency?.name || 'THULIR AGENCY'}</p>
              <p style={{ fontSize: 10, color: '#94a3b8', margin: '1px 0 0' }}>Stock Management</p>
            </div>
          </div>
        </div>

        {/* Nav groups */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
          {navGroups.map(group => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em', padding: '8px 8px 4px', margin: 0 }}>
                {group.label}
              </p>
              {group.items.map(({ icon: Icon, label, to }) => {
                const active = isActive(location.pathname, to);
                return (
                  <NavLink
                    key={to} to={to}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                      borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: active ? 600 : 500,
                      color: active ? '#4f46e5' : '#475569',
                      background: active ? '#eef2ff' : 'transparent',
                      marginBottom: 1,
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Icon size={15} color={active ? '#4f46e5' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    {label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: '#f8fafc', marginBottom: 6 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'Admin'}</p>
              <p style={{ fontSize: 10, color: '#10b981', margin: '1px 0 0', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />Active
              </p>
            </div>
          </div>
          <button onClick={handleLogout}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: 'none', background: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#64748b', fontFamily: 'inherit' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; (e.currentTarget as HTMLElement).style.color = '#dc2626'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile slide-in sidebar ── */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setMobileMenuOpen(false)}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
          <aside style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 260, background: '#fff', display: 'flex', flexDirection: 'column', zIndex: 51, overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img 
                  src={agency?.logo_url || `${import.meta.env.BASE_URL}britannia_logo.png`} 
                  alt="Agency Logo"
                  style={{ height: 24, objectFit: 'contain' }}
                />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{agency?.name || 'THULIR AGENCY'}</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}><X size={20} /></button>
            </div>
            <nav style={{ flex: 1, padding: '12px' }}>
              {navGroups.map(group => (
                <div key={group.label} style={{ marginBottom: 4 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.09em', padding: '8px 8px 4px', margin: 0 }}>{group.label}</p>
                  {group.items.map(({ icon: Icon, label, to }) => {
                    const active = isActive(location.pathname, to);
                    return (
                      <NavLink key={to} to={to} onClick={() => setMobileMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: active ? 600 : 500, color: active ? '#4f46e5' : '#475569', background: active ? '#eef2ff' : 'transparent', marginBottom: 1 }}>
                        <Icon size={16} color={active ? '#4f46e5' : '#94a3b8'} />
                        {label}
                      </NavLink>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Main Area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Dark Top Bar */}
        <header style={{ height: 56, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }} className="mobile-menu-btn">
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="topbar-logo">
              <img 
                src={agency?.logo_url || `${import.meta.env.BASE_URL}britannia_logo.png`} 
                alt="Agency Logo"
                style={{ height: 24, objectFit: 'contain' }}
              />
              <span style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '-0.2px' }}>{agency?.name || 'THULIR AGENCY'}</span>
            </div>
            <ChevronRight size={14} color="#334155" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#cbd5e1' }}>{pageTitle}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {filename && (
              <span style={{
                fontSize: 10, background: '#1e293b', color: '#38bdf8', border: '1px solid #334155',
                padding: '4px 8px', borderRadius: 6, maxWidth: 160, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }} className="filename-badge">
                {filename}
              </span>
            )}
            
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
              background: '#1e293b', border: '1px solid #334155', borderRadius: 8,
              padding: '4px 10px', flexShrink: 0
            }} className="live-clock">
              <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
              <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>
                {time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ textAlign: 'right' }} className="user-text">
                <p style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{user?.email?.split('@')[0] || 'Admin'}</p>
                <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{profile?.role || 'Administrator'}</p>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#f1f5f9' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 28px 80px' }} className="main-content">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8ecf0', display: 'flex', justifyContent: 'space-around', padding: '6px 0 10px', zIndex: 40 }} className="mobile-bottom-nav">
          {mobileNavItems.map(({ icon: Icon, label, to }) => {
            const active = isActive(location.pathname, to);
            return (
              <NavLink key={to} to={to}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 10px', textDecoration: 'none', color: active ? '#4f46e5' : '#94a3b8', fontSize: 10, fontWeight: 500 }}>
                <Icon size={20} color={active ? '#4f46e5' : '#94a3b8'} />
                {label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .desktop-sidebar { display: flex !important; }
          .mobile-menu-btn { display: none !important; }
          .mobile-bottom-nav { display: none !important; }
          .topbar-logo { display: none !important; }
          .main-content { padding: 28px 32px 28px !important; }
        }
        @media (max-width: 1023px) {
          .desktop-sidebar { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .filename-badge { display: none !important; }
          .user-text { display: none !important; }
          .main-content { padding: 20px 16px 80px !important; }
        }
      `}</style>
    </div>
  );
}
