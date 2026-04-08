import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SystemShell from './components/SystemShell/SystemShell';
import RefineryModule from './components/RefineryModule/RefineryModule';
import ResourceModule from './components/ResourceModule/ResourceModule';
import OrgFile from './components/OrgFile/OrgFile';
import AdminModule from './components/AdminModule/AdminModule';
import BootSequence from './components/BootSequence/BootSequence';
import Toast from './components/common/Toast';
import { cleanLegacyStorage } from './data/dataStore';

export default function App() {
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

  return (
    <>
      <SystemShell 
        activeModule={location.pathname.replace('/', '') || 'refinery'} 
        activeSystem={activeSystem}
        onSystemChange={setActiveSystem}
      >
        <Routes>
          <Route path="/refinery" element={<RefineryModule system={activeSystem} />} />
          <Route path="/resources" element={<ResourceModule system={activeSystem} />} />
          <Route path="/org" element={<OrgFile />} />
          <Route path="/admin" element={<AdminModule />} />
          <Route path="/" element={<Navigate to="/refinery" replace />} />
          <Route path="*" element={<Navigate to="/refinery" replace />} />
        </Routes>
      </SystemShell>
      <Toast message={toastMessage} onClose={() => setToastMessage('')} duration={3500} />
    </>
  );
}
