import React from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  PackageSearch, 
  UploadCloud, 
  LayoutDashboard, 
  Settings, 
  AlertTriangle, 
  FileText, 
  LogOut, 
  ListChecks, 
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

export function AppLayout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
    { icon: PackageSearch, label: 'Count Stock', to: '/brands' },
    { icon: AlertTriangle, label: 'Issues', to: '/issues' },
    { icon: FileText, label: 'Reports', to: '/reports' },
    { icon: UploadCloud, label: 'Upload', to: '/upload' },
    { icon: ListChecks, label: 'Sessions', to: '/sessions' },
    { icon: Search, label: 'Search', to: '/search' },
    { icon: Settings, label: 'Settings', to: '/settings' },
  ];

  // Primary mobile navigation items
  const mobileNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', to: '/' },
    { icon: PackageSearch, label: 'Count', to: '/brands' },
    { icon: AlertTriangle, label: 'Issues', to: '/issues' },
    { icon: FileText, label: 'Reports', to: '/reports' },
    { icon: UploadCloud, label: 'Upload', to: '/upload' },
  ];

  return (
    <div className="flex h-[100dvh] bg-background text-foreground overflow-hidden font-sans">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-border bg-card z-20">
        <div>
          {/* Brand Header */}
          <div className="h-20 flex items-center px-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <PackageSearch className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg tracking-tight">
                    StockSync
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-primary/10 text-primary">
                    Pro
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">Reconciliation Terminal</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 mt-2">
            <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Audit Navigation
            </div>
            {navItems.map((item) => {
              const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-lg transition-colors group relative font-medium text-sm",
                    isActive
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  )}
                >
                  <Icon className={cn("h-4 w-4 mr-3", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout Bottom Bar */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-secondary/50 border border-border/50">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.email?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user?.email || 'Warehouse Admin'}</p>
              <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Active Auditor
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full flex items-center justify-start h-9 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            <span className="font-medium text-sm">Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header Bar */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 sticky top-0 z-30 lg:hidden shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <PackageSearch className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              StockSync
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground"
              onClick={() => navigate('/settings')}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation Dock */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-2 py-2 shadow-lg safe-area-pb">
          <div className="flex items-center justify-around">
            {mobileNavItems.map((item) => {
              const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center justify-center py-1 px-3 rounded-lg transition-colors text-[10px] font-medium",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5 mb-1", isActive ? "text-primary" : "text-muted-foreground")} />
                  <span className="tracking-tight">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
