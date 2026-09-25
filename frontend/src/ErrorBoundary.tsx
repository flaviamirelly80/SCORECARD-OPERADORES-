import { Component, ErrorInfo, ReactNode } from 'react';

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erro ao renderizar o portal:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-screen">
          <h1>Não foi possível carregar o portal</h1>
          <p>Atualize a página. Se o problema continuar, procure o suporte responsável pelo sistema.</p>
        </main>
      );
    }

    return this.props.children;
  }
}
