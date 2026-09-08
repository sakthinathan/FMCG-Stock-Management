import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './components/ThemeProvider';
import { AppLayout } from './components/layout/AppLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const UploadStock = lazy(() => import('./pages/UploadStock').then(m => ({ default: m.UploadStock })));
const BrandSelection = lazy(() => import('./pages/BrandSelection').then(m => ({ default: m.BrandSelection })));
const StockCount = lazy(() => import('./pages/StockCount').then(m => ({ default: m.StockCount })));
const Issues = lazy(() => import('./pages/Issues').then(m => ({ default: m.Issues })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Sessions = lazy(() => import('./pages/Sessions').then(m => ({ default: m.Sessions })));
const Search = lazy(() => import('./pages/Search').then(m => ({ default: m.Search })));
const Signup = lazy(() => import('./pages/Signup').then(m => ({ default: m.Signup })));

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner height="100vh" label="Verifying session..." />;
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <AuthProvider>
        <Router basename={import.meta.env.BASE_URL}>
          <Suspense fallback={<LoadingSpinner height="100vh" label="Loading portal..." />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route element={<AuthGuard><AppLayout /></AuthGuard>}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/upload" element={<UploadStock />} />
                <Route path="/brands" element={<BrandSelection />} />
                <Route path="/sessions" element={<Sessions />} />
                <Route path="/search" element={<Search />} />
                <Route path="/count/:sessionId" element={<StockCount />} />
                <Route path="/issues" element={<Issues />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
