import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Page } from './pages/Page';
import Dictionary from './pages/Dictionary';
import MemorizationMachine from './pages/MemorizationMachine';
import { useEffect } from 'react';
import { XpProvider } from './contexts/XpContext';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import GuestBanner from './components/GuestBanner';
import ErrorBoundary from './components/ErrorBoundary';
import OnboardingWizard from './components/OnboardingWizard';
import BottomNav from './components/BottomNav';
import { updateDocumentTitle } from './utils/dailyGoal';

/**
 * Odak: conjugaison + sözlük. Diğer modlar (roleplay, syntax lab, YouTube lab,
 * okuma/haberler, historia, cloze sprint, learning path, home/pricing/profil vs.)
 * geçici olarak devre dışı — sayfa dosyaları src/pages altında duruyor, istenirse
 * buraya route olarak geri eklenebilir.
 */
function getPageElement(pathname: string) {
  switch (pathname) {
    case '/':
    case '/fiil-laboratuvari':
      return <Page />;
    case '/ezber-makinesi':
      return <MemorizationMachine />;
    case '/sozluk':
      return <Dictionary />;
    case '/login':
      return <Navigate to="/" replace />;
    default:
      return <Navigate to="/" replace />;
  }
}

function PageTransition({ pathname }: { pathname: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ minHeight: '100dvh' }}
    >
      <ErrorBoundary inline>
        {getPageElement(pathname)}
      </ErrorBoundary>
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname} pathname={location.pathname} />
    </AnimatePresence>
  );
}

function AppContent() {
  const { isCompleted } = useOnboarding();
  useEffect(() => {
    const id = window.setTimeout(updateDocumentTitle, 0);
    return () => window.clearTimeout(id);
  }, []);
  return (
    <>
      <GuestBanner />
      <div className="pb-mobile-nav md:pb-0 min-h-0 w-full max-w-[100vw] min-w-0">
        <Routes>
          <Route path="*" element={<AnimatedRoutes />} />
        </Routes>
      </div>
      {!isCompleted && <OnboardingWizard />}
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <OnboardingProvider>
              <XpProvider>
                <AppContent />
              </XpProvider>
            </OnboardingProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
