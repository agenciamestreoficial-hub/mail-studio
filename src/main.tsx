import { createRoot } from 'react-dom/client';
import { lazy, Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import './demo.css';

const EmailEditor = lazy(() => import('./editor/EmailEditor').then(module => ({ default: module.EmailEditor })));

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary><Suspense fallback={<div className="startup"><h1>Mail Studio</h1><p>Preparando seu espaço de criação…</p></div>}><EmailEditor storageKey="mail-studio:demo:v1" /></Suspense></ErrorBoundary>,
);
