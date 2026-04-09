import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import SystemShell from './components/SystemShell/SystemShell';
import RefineryModule from './components/RefineryModule/RefineryModule';
import ResourceModule from './components/ResourceModule/ResourceModule';

import AdminModule from './components/AdminModule/AdminModule';
import ProfilePage from './components/ProfilePage/ProfilePage';
import BootSequence from './components/BootSequence/BootSequence';
import Toast from './components/common/Toast';
import { cleanLegacyStorage } from './data/dataStore';

function AdminGuard() {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/refinery" replace />;
  return <AdminModule />;
}

function AppContent() {
  const [activeSystem, setActiveSystem] = useState('Stanton');
  const [toastMessage, setToastMessage] = useState('');
  const [booted, setBooted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    cleanLegacyStorage();
  }, []);

  if (!booted) {
    return <BootSequence onComplete={() => { setBooted(true); setToastMessage('DATABASE UPLINK ESTABLISHED'); }} />;
  }

  // Map path to module id
  const pathModule = location.pathname.split('/')[1] || 'refinery';

  return (
    <>
      <SystemShell
        activeModule={pathModule}
        activeSystem={activeSystem}
        onSystemChange={setActiveSystem}
      >
        <Routes>
          <Route path="/refinery" element={<RefineryModule system={activeSystem} />} />
          <Route path="/resources" element={<ResourceModule system={activeSystem} />} />

          <Route path="/admin" element={<AdminGuard />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/" element={<Navigate to="/refinery" replace />} />
          <Route path="*" element={<Navigate to="/refinery" replace />} />
        </Routes>
      </SystemShell>
      <Toast message={toastMessage} onClose={() => setToastMessage('')} duration={3500} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
