import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SystemShell from './components/SystemShell/SystemShell';
import RefineryModule from './components/RefineryModule/RefineryModule';
import ResourceModule from './components/ResourceModule/ResourceModule';
import BulletinModule from './components/BulletinModule/BulletinModule';
import BootSequence from './components/BootSequence/BootSequence';
import InfoPage from './components/InfoPage/InfoPage';
import NetworkGuard from './components/common/NetworkGuard';
import Toast from './components/common/Toast';
import ErrorBoundary from './components/common/ErrorBoundary';
import UplinkBanner from './components/common/UplinkBanner';
import { cleanLegacyStorage, SESSION_EXPIRED_EVENT } from './data/dataStore';

const AdminModule = lazy(() => import('./components/AdminModule/AdminModule'));
const ProfilePage = lazy(() => import('./components/ProfilePage/ProfilePage'));

const BOOT_KEY = 'yugen_booted';
const SYSTEM_KEY = 'yugen_system';
const TITLES = { info: 'Overview', bulletin: 'Bulletin', refinery: 'Refinery', resources: 'Resources', admin: 'Console' };

function AdminGuard() {
  const { user, isAdmin } = useAuth();
  if (!user || !isAdmin) return <Navigate to="/refinery" replace />;
  return <AdminModule />;
}

function AppContent() {
  const [activeSystem, setActiveSystem] = useState(() => localStorage.getItem(SYSTEM_KEY) || 'Stanton');
  const [toast, setToast] = useState('');
  const [booted, setBooted] = useState(() => sessionStorage.getItem(BOOT_KEY) === '1');
  const location = useLocation();

  useEffect(() => { cleanLegacyStorage(); }, []);
  useEffect(() => { localStorage.setItem(SYSTEM_KEY, activeSystem); }, [activeSystem]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [location.pathname]);

  const handleBoot = useCallback(() => {
    sessionStorage.setItem(BOOT_KEY, '1');
    setBooted(true);
    setToast('Database uplink established');
  }, []);

  const handleSystemChange = useCallback((sys) => {
    setActiveSystem(sys);
    setToast(`Switched to ${sys}`);
  }, []);

  const pathModule = location.pathname.split('/')[1] || 'info';
  const routeKey = pathModule === 'profile' ? location.pathname : pathModule;

  useEffect(() => {
    const page = pathModule === 'profile'
      ? `@${decodeURIComponent(location.pathname.split('/')[2] || '')}`
      : TITLES[pathModule] || 'Overview';
    document.title = `${page} · Yūgen`;
  }, [pathModule, location.pathname]);

  // Surface "session expired" (raised by the data layer) as a toast
  useEffect(() => {
    const onExpired = () => setToast('Your session expired — please sign in again.');
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  return (
    <>
      <AnimatePresence>
        {!booted && <BootSequence key="boot" onComplete={handleBoot} />}
      </AnimatePresence>

      {booted && (
        <SystemShell activeModule={pathModule} activeSystem={activeSystem} onSystemChange={handleSystemChange}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={routeKey}
              initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
              transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
            >
              <ErrorBoundary resetKey={routeKey}>
              <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
              <Routes location={location}>
                <Route path="/refinery" element={<NetworkGuard moduleId="refinery"><RefineryModule system={activeSystem} /></NetworkGuard>} />
                <Route path="/resources" element={<NetworkGuard moduleId="resources"><ResourceModule system={activeSystem} /></NetworkGuard>} />
                <Route path="/bulletin" element={<NetworkGuard moduleId="bulletin"><BulletinModule /></NetworkGuard>} />
                <Route path="/info" element={<NetworkGuard moduleId="info"><InfoPage system={activeSystem} /></NetworkGuard>} />
                <Route path="/admin" element={<AdminGuard />} />
                <Route path="/profile/:username" element={<ProfilePage />} />
                <Route path="/" element={<Navigate to="/info" replace />} />
                <Route path="*" element={<Navigate to="/info" replace />} />
              </Routes>
              </Suspense>
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </SystemShell>
      )}

      <UplinkBanner />
      <Toast message={toast} onClose={() => setToast('')} duration={2800} />
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
