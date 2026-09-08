import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  PackageSearch, UploadCloud, LayoutDashboard, Settings,
  AlertTriangle, FileText, LogOut, ListChecks, Search, Menu, X, ChevronRight,
  User, ChevronDown, Building
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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
              src={agency?.logo_url || `${import.meta.env.BASE_URL}britannia_logo.webp`} 
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
                      borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: active ? 700 : 500,
                      color: active ? '#e52321' : '#475569',
                      background: active ? '#fef2f2' : 'transparent',
                      marginBottom: 1,
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#fdfbf7'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Icon size={15} color={active ? '#e52321' : '#94a3b8'} style={{ flexShrink: 0 }} />
                    {label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '12px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8, background: '#fdfbf7', marginBottom: 6, border: '1px solid #fef2f2' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #e52321, #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
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
                  src={agency?.logo_url || `${import.meta.env.BASE_URL}britannia_logo.webp`} 
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
                        style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: active ? 700 : 500, color: active ? '#e52321' : '#475569', background: active ? '#fef2f2' : 'transparent', marginBottom: 1 }}>
                        <Icon size={16} color={active ? '#e52321' : '#94a3b8'} />
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
        <header style={{ height: 56, background: '#0f172a', borderBottom: '2px solid #e52321', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0, gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(true)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 4 }} className="mobile-menu-btn">
              <Menu size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="topbar-logo">
              <img 
                src={agency?.logo_url || `${import.meta.env.BASE_URL}britannia_logo.webp`} 
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
                fontSize: 10, background: '#1e293b', color: '#f59e0b', border: '1px solid #334155',
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
              <span style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', fontFamily: 'monospace' }}>
                {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
              </span>
              <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600 }}>
                {time.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div style={{ position: 'relative' }} ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, background: 'transparent',
                  border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8,
                  transition: 'background 0.15s ease', outline: 'none'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ textAlign: 'right' }} className="user-text">
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#f1f5f9', margin: 0 }}>{user?.email?.split('@')[0] || 'Admin'}</p>
                  <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{profile?.role || 'Administrator'}</p>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #e52321, #991b1b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                  {user?.email?.[0]?.toUpperCase() || 'A'}
                </div>
                <ChevronDown size={14} color="#94a3b8" style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
              </button>

              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', top: 48, right: 0, width: 260, background: '#fff',
                  borderRadius: 12, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
                  border: '1px solid #e2e8f0', zIndex: 60, padding: '6px'
                }}>
                  <div style={{ padding: '10px 12px 10px', borderBottom: '1px solid #f1f5f9' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'admin@thulir.com'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, background: '#fef2f2', color: '#e52321', padding: '2px 6px', borderRadius: 4 }}>{profile?.role || 'Administrator'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fdfbf7', padding: '6px 8px', borderRadius: 6, border: '1px solid #fef2f2' }}>
                      <Building size={13} color="#e52321" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agency?.name || 'THULIR AGENCY'}</span>
                    </div>
                  </div>

                  <div style={{ padding: '4px 0' }}>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', border: 'none', background: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334155', fontWeight: 500, fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fdfbf7')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <Building size={15} color="#e52321" style={{ flexShrink: 0 }} />
                      <div style={{ textAlign: 'left', minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: '#0f172a' }}>Agency Profile</p>
                        <p style={{ margin: 0, fontSize: 10, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agency?.name || 'THULIR AGENCY'}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', border: 'none', background: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#334155', fontWeight: 500, fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fdfbf7')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <Settings size={15} color="#64748b" style={{ flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#334155' }}>System Settings</span>
                    </button>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 4 }}>
                    <button
                      onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', border: 'none', background: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#ef4444', fontWeight: 600, fontFamily: 'inherit' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <LogOut size={15} color="#ef4444" style={{ flexShrink: 0 }} /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: 'auto', background: '#fdfbf7', display: 'flex', flexDirection: 'column' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '28px 28px 40px', flex: 1, boxSizing: 'border-box' }} className="main-content">
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

          {/* Britannia Gold Wave Footer Banner */}
          <footer style={{ background: '#0f172a', borderTop: '4px solid #ffc800', color: '#94a3b8', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ background: '#e52321', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 9999, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Britannia Quality
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.03em' }}>
                EXCITING GOODNESS IN EVERY COUNT
              </span>
            </div>
            <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 500 }}>
              © 2026 {agency?.name || 'Thulir Agency'} · Enterprise Stock Audit Platform
            </p>
          </footer>
        </main>

        {/* Mobile bottom nav */}
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '1px solid #e8ecf0', display: 'flex', justifyContent: 'space-around', padding: '6px 0 calc(10px + env(safe-area-inset-bottom, 0px))', zIndex: 40 }} className="mobile-bottom-nav">
          {mobileNavItems.map(({ icon: Icon, label, to }) => {
            const active = isActive(location.pathname, to);
            return (
              <NavLink key={to} to={to}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 10px', textDecoration: 'none', color: active ? '#e52321' : '#94a3b8', fontSize: 10, fontWeight: 500 }}>
                <Icon size={20} color={active ? '#e52321' : '#94a3b8'} />
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
