import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Page } from './pages/Page';
import HomePage from './pages/HomePage';
import Dictionary from './pages/Dictionary';
import LearningPath from './pages/LearningPath';
import MemorizationMachine from './pages/MemorizationMachine';
import Roleplay from './pages/Roleplay';
import SyntaxLab from './pages/SyntaxLab';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Pricing from './pages/Pricing';
import YouTubeLab from './pages/YouTubeLab';
import ReadingPractice from './pages/ReadingPractice';
import NewsReader from './pages/NewsReader';
import HistoriaMode from './pages/HistoriaMode';
import ClozeSprint from './pages/ClozeSprint';
import TodaysSession from './pages/TodaysSession';
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

function getPageElement(pathname: string) {
  switch (pathname) {
    case '/':
      return <Page />;
    case '/home':
      return <TodaysSession />;
    case '/serbest':
    case '/anasayfa':
      return <HomePage />;
    case '/login':
      return <Navigate to="/" replace />;
    case '/fiil-laboratuvari':
      return <Page />;
    case '/ezber-makinesi':
      return <MemorizationMachine />;
    case '/sozluk':
      return <Dictionary />;
    case '/ogrenme':
      return <LearningPath />;
    case '/simulator':
      return <Roleplay />;
    case '/syntax-lab':
    case '/cumle-analizi':
      return <SyntaxLab />;
    case '/youtube-lab':
      return <YouTubeLab />;
    case '/okuma':
      return <ReadingPractice />;
    case '/haberler':
      return <NewsReader />;
    case '/historia':
      return <HistoriaMode />;
    case '/cloze-sprint':
      return <ClozeSprint />;
    case '/profil':
      return <Profile />;
    case '/leaderboard':
      return <Leaderboard />;
    case '/fiyatlandirma':
    case '/pricing':
    case '/paketler':
      return <Pricing />;
    default:
      if (pathname.startsWith('/ogrenme/')) return <LearningPath />;
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
