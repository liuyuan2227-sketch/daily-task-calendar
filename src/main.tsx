import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

function renderError(message: string) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:24px;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a;">
      <section style="max-width:560px;border:1px solid #e2e8f0;border-radius:24px;background:white;padding:24px;box-shadow:0 20px 60px rgba(15,23,42,.08);">
        <p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#ef4444;">页面加载失败</p>
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.2;">请把这段错误发给页面维护者</h1>
        <pre style="white-space:pre-wrap;word-break:break-word;background:#f1f5f9;border-radius:12px;padding:12px;font-size:12px;line-height:1.5;">${message}</pre>
      </section>
    </main>
  `;
}

window.addEventListener('error', (event) => {
  renderError(event.error?.stack ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  renderError(reason instanceof Error ? reason.stack ?? reason.message : String(reason));
});

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (error) {
  renderError(error instanceof Error ? error.stack ?? error.message : String(error));
}
