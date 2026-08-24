import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  PackageSearch, UploadCloud, LayoutDashboard, Settings,
  AlertTriangle, FileText, LogOut, ListChecks, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   to: '/'        },
  { icon: PackageSearch,   label: 'Count Stock',  to: '/brands'  },
  { icon: AlertTriangle,   label: 'Issues',       to: '/issues'  },
  { icon: FileText,        label: 'Reports',      to: '/reports' },
  { icon: UploadCloud,     label: 'Upload',       to: '/upload'  },
  { icon: ListChecks,      label: 'Sessions',     to: '/sessions'},
  { icon: Search,          label: 'Search',       to: '/search'  },
  { icon: Settings,        label: 'Settings',     to: '/settings'},
];

const mobileNavItems = navItems.slice(0, 5);

export function AppLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f8fafc]">

      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-[#e2e8f0] bg-white">

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-[#e2e8f0] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <PackageSearch className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-slate-900 leading-none">StockSync</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Reconciliation</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 px-3 mb-2">Navigation</p>
          {navItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive(to)
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Icon className={cn('w-4 h-4 shrink-0', isActive(to) ? 'text-indigo-600' : 'text-slate-400')} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-[#e2e8f0] p-4 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">{user?.email || 'Admin'}</p>
              <p className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Active
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile header */}
        <header className="lg:hidden h-14 border-b border-[#e2e8f0] bg-white flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <PackageSearch className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm text-slate-900">StockSync</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/settings')} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="p-2 text-slate-500 hover:bg-red-50 hover:text-red-500 rounded-lg">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 pb-24 lg:pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#e2e8f0] flex items-center justify-around px-1 py-1.5 z-40">
          {mobileNavItems.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
                isActive(to) ? 'text-indigo-600' : 'text-slate-400'
              )}
            >
              <Icon className={cn('w-5 h-5', isActive(to) ? 'text-indigo-600' : 'text-slate-400')} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
