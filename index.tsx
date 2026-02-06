import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Full-screen loader until styles and page are ready. App stays hidden briefly after loader
// so Tailwind spacing/fonts can finish applying, then fades in to avoid flick.
function AppLoader() {
  const [phase, setPhase] = useState<'loading' | 'fading' | 'done'>('loading');
  const [appRevealed, setAppRevealed] = useState(false);

  useEffect(() => {
    const minShowMs = 850;
    const styleBufferMs = 1100; // time for Tailwind CDN + fonts to fully apply
    const maxWaitMs = 4500;
    const start = Date.now();
    let cancelled = false;

    const showApp = () => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const wait = Math.max(0, minShowMs - elapsed);
      setTimeout(() => {
        if (cancelled) return;
        setPhase('fading');
      }, wait);
    };

    const onLoad = () => {
      if (cancelled) return;
      const fontReady = document.fonts?.ready ?? Promise.resolve();
      fontReady.then(() => {
        if (cancelled) return;
        setTimeout(showApp, styleBufferMs);
      }).catch(() => setTimeout(showApp, styleBufferMs));
    };

    if (document.readyState === 'complete') {
      onLoad();
      return () => { cancelled = true; };
    }
    window.addEventListener('load', onLoad);
    const fallback = setTimeout(() => {
      if (!cancelled) setPhase('fading');
    }, maxWaitMs);
    return () => {
      cancelled = true;
      window.removeEventListener('load', onLoad);
      clearTimeout(fallback);
    };
  }, []);

  // After fade-out duration, stop rendering loader
  useEffect(() => {
    if (phase !== 'fading') return;
    const t = setTimeout(() => setPhase('done'), 380);
    return () => clearTimeout(t);
  }, [phase]);

  // Keep app invisible for a short moment after loader is gone so styles can settle, then fade in
  useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(() => setAppRevealed(true), 480);
    return () => clearTimeout(t);
  }, [phase]);

  const showLoader = phase === 'loading' || phase === 'fading';

  return (
    <>
      {(phase === 'fading' || phase === 'done') && (
        <div
          style={{
            opacity: appRevealed ? 1 : 0,
            transition: 'opacity 0.4s ease-out',
            width: '100%',
            height: '100%',
            minHeight: '100vh',
          }}
        >
          <App />
        </div>
      )}
      {showLoader && (
        <div
          role="presentation"
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgb(248, 250, 252)',
            fontFamily: "'Inter', sans-serif",
            color: 'rgb(15, 23, 42)',
            opacity: phase === 'fading' ? 0 : 1,
            pointerEvents: phase === 'fading' ? 'none' : 'auto',
            transition: 'opacity 0.35s ease-out',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: '4px solid rgb(226, 232, 240)',
              borderTopColor: 'rgb(99, 102, 241)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ marginTop: 16, fontSize: 14, fontWeight: 600, color: 'rgb(100, 116, 139)' }}>
            Loading ImpactFlow...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </>
  );
}

// Register service worker for offline support
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker-app.js')
      .then((registration) => {
        console.log('[SW] Service Worker registered successfully:', registration.scope);
        
        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch((error) => {
        console.warn('[SW] Service Worker registration failed:', error);
      });
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppLoader />
  </React.StrictMode>
);
