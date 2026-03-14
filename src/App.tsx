import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Page } from './pages/Page';
import HomePage from './pages/HomePage';
import Dictionary from './pages/Dictionary';
import { XpProvider } from './contexts/XpContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ErrorBoundary from './components/ErrorBoundary';

function getPageElement(pathname: string) {
  switch (pathname) {
    case '/':
      return <Navigate to="/fiil-laboratuvari" replace />;
    case '/anasayfa':
      return <HomePage />;
    case '/fiil-laboratuvari':
      return <Page />;
    case '/ezber-makinesi':
      return <Page />;
    case '/sozluk':
      return <Dictionary />;
    default:
      return <Navigate to="/fiil-laboratuvari" replace />;
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
