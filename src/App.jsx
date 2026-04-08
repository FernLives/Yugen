import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import SystemShell from './components/SystemShell/SystemShell';
import RefineryModule from './components/RefineryModule/RefineryModule';
import ResourceModule from './components/ResourceModule/ResourceModule';
import OrgFile from './components/OrgFile/OrgFile';
import AdminModule from './components/AdminModule/AdminModule';
import Toast from './components/common/Toast';
import { syncLocalStorageToDb } from './data/dataStore';

export default function App() {
  const [activeSystem, setActiveSystem] = useState('Stanton');
  const [toastMessage, setToastMessage] = useState('');
  const location = useLocation();

  useEffect(() => {
    const initData = async () => {
      await syncLocalStorageToDb();
      setToastMessage('DATABASE UPLINK ESTABLISHED');
    };
    initData();
  }, []);

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
