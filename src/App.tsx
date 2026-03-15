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
import { XpProvider } from './contexts/XpContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';

function getPageElement(pathname: string) {
  switch (pathname) {
    case '/':
      return <HomePage />;
    case '/anasayfa':
      return <Navigate to="/" replace />;
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
    case '/profil':
      return <Profile />;
    case '/leaderboard':
      return <Leaderboard />;
    case '/fiyatlandirma':
    case '/pricing':
    case '/paketler':
      return <Pricing />;
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
      style={{ minHeight: '100vh' }}
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

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <XpProvider>
            <Routes>
              <Route path="*" element={<AnimatedRoutes />} />
            </Routes>
          </XpProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
