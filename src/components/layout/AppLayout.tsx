import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  PackageSearch, UploadCloud, LayoutDashboard, Settings,
  AlertTriangle, FileText, LogOut, ListChecks, Search, Menu, X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',  to: '/'        },
  { icon: PackageSearch,  label: 'Count Stock', to: '/brands'  },
  { icon: AlertTriangle,  label: 'Issues',      to: '/issues'  },
  { icon: FileText,       label: 'Reports',     to: '/reports' },
  { icon: UploadCloud,    label: 'Upload',      to: '/upload'  },
  { icon: ListChecks,     label: 'Sessions',    to: '/sessions'},
  { icon: Search,         label: 'Search',      to: '/search'  },
  { icon: Settings,       label: 'Settings',    to: '/settings'},
];

const mobileNavItems = navItems.slice(0, 5);

function isActive(pathname: string, to: string) {
  return to === '/' ? pathname === '/' : pathname.startsWith(to);
}

export function AppLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#f8fafc' }}>

      {/* ── Desktop Sidebar ── */}
      <aside style={{
        width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid #e2e8f0', background: '#ffffff',
        position: 'relative', zIndex: 10,
      }}
        className="hidden-mobile"
      >
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px',
          height: 64, borderBottom: '1px solid #e2e8f0', flexShrink: 0,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: '#4f46e5',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <PackageSearch size={16} color="#fff" />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', lineHeight: 1 }}>StockSync</p>
            <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Reconciliation</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
          <p style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 8px', marginBottom: 8 }}>
            Navigation
          </p>
          {navItems.map(({ icon: Icon, label, to }) => {
            const active = isActive(location.pathname, to);
            return (
              <NavLink
                key={to} to={to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500,
                  color: active ? '#4f46e5' : '#475569',
                  background: active ? '#eef2ff' : 'transparent',
                  marginBottom: 2, transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#f1f5f9'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <Icon size={15} color={active ? '#4f46e5' : '#94a3b8'} style={{ flexShrink: 0 }} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div style={{ borderTop: '1px solid #e2e8f0', padding: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', background: '#eef2ff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, color: '#4f46e5', flexShrink: 0,
            }}>
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email || 'Admin'}
              </p>
              <p style={{ fontSize: 10, color: '#10b981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                Active
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', border: 'none', background: 'transparent',
              borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#64748b',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#fef2f2'; (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#64748b'; }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {mobileMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
          <aside
            style={{
              position: 'relative', width: 260, background: '#fff',
              display: 'flex', flexDirection: 'column', zIndex: 51,
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 56, borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <PackageSearch size={14} color="#fff" />
                </div>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>StockSync</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color="#64748b" />
              </button>
            </div>
            <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
              {navItems.map(({ icon: Icon, label, to }) => {
                const active = isActive(location.pathname, to);
                return (
                  <NavLink
                    key={to} to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                      borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500,
                      color: active ? '#4f46e5' : '#475569', background: active ? '#eef2ff' : 'transparent',
                      marginBottom: 2,
                    }}
                  >
                    <Icon size={16} color={active ? '#4f46e5' : '#94a3b8'} />
                    {label}
                  </NavLink>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

        {/* Mobile Top Bar */}
        <header style={{
          display: 'none', // controlled via CSS class below
          height: 56, borderBottom: '1px solid #e2e8f0', background: '#fff',
          alignItems: 'center', justifyContent: 'space-between', padding: '0 16px',
          flexShrink: 0,
        }}
          className="mobile-header"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setMobileMenuOpen(true)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, marginRight: 4 }}
            >
              <Menu size={20} color="#475569" />
            </button>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PackageSearch size={13} color="#fff" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>StockSync</span>
          </div>
          <button onClick={handleLogout} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 6 }}>
            <LogOut size={18} color="#94a3b8" />
          </button>
        </header>

        {/* Page Scroll Area */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 80px' }} className="main-padding">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav style={{
          display: 'none', // controlled via CSS below
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: '#fff', borderTop: '1px solid #e2e8f0',
          justifyContent: 'space-around', padding: '6px 0 8px',
          zIndex: 40,
        }}
          className="mobile-bottom-nav"
        >
          {mobileNavItems.map(({ icon: Icon, label, to }) => {
            const active = isActive(location.pathname, to);
            return (
              <NavLink
                key={to} to={to}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  padding: '4px 12px', textDecoration: 'none',
                  color: active ? '#4f46e5' : '#94a3b8', fontSize: 10, fontWeight: 500,
                }}
              >
                <Icon size={20} color={active ? '#4f46e5' : '#94a3b8'} />
                {label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .hidden-mobile { display: flex !important; flex-direction: column !important; }
          .mobile-header { display: none !important; }
          .mobile-bottom-nav { display: none !important; }
          .main-padding { padding: 24px 32px 24px !important; }
        }
        @media (max-width: 1023px) {
          .hidden-mobile { display: none !important; }
          .mobile-header { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
