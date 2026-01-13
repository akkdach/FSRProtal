import { ThemeProvider, CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { theme } from './theme/theme';
import { AppLayout } from './layouts/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { ASCDashboard } from './pages/ASCDashboard';
import { POManagement } from './pages/POManagement';
import { PartsInventory } from './pages/PartsInventory';
import { ServiceJobs } from './pages/ServiceJobs';
import { ComplaintsAnalysis } from './pages/ComplaintsAnalysis';
import { ASCPerformance } from './pages/ASCPerformance';

function AppContent() {
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  return (
    <AppLayout onNavigate={handleNavigate}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/asc" element={<ASCDashboard />} />
        <Route path="/asc/po" element={<POManagement />} />
        <Route path="/asc/parts" element={<PartsInventory />} />
        <Route path="/asc/jobs" element={<ServiceJobs />} />
        <Route path="/asc/complaints" element={<ComplaintsAnalysis />} />
        <Route path="/asc/performance" element={<ASCPerformance />} />
      </Routes>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
