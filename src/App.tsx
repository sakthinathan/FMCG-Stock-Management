import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './components/ThemeProvider';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { UploadStock } from './pages/UploadStock';
import { BrandSelection } from './pages/BrandSelection';
import { StockCount } from './pages/StockCount';
import { Issues } from './pages/Issues';
import { Reports } from './pages/Reports';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { Sessions } from './pages/Sessions';
import { Search } from './pages/Search';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            
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
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
