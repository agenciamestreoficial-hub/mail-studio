import { Component, type ReactNode } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div className="startup" role="alert"><h1>Não foi possível iniciar o editor.</h1><p>Recarregue a página. O rascunho salvo neste navegador será preservado.</p><button onClick={() => window.location.reload()}>Tentar novamente</button></div>;
    return this.props.children;
  }
}
