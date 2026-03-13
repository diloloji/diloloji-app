import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Page } from './pages/Page';
import HomePage from './pages/HomePage';
import NotFound from './pages/NotFound';
import { XpProvider } from './contexts/XpContext';

function getPageElement(pathname: string) {
  switch (pathname) {
    case '/':
      return <HomePage />;
    case '/fiil-laboratuvari':
      return <Page />;
    case '/ezber-makinesi':
      return <Page />;
    default:
      return <NotFound />;
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
      {getPageElement(pathname)}
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
    <BrowserRouter>
      <XpProvider>
        <Routes>
          <Route path="*" element={<AnimatedRoutes />} />
        </Routes>
      </XpProvider>
    </BrowserRouter>
  );
}

export default App;
