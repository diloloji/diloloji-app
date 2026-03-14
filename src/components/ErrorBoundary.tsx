import { Component, type ErrorInfo, type ReactNode } from 'react';
import ErrorPage from './ErrorPage';

type Props = {
  children: ReactNode;
  /** true ise sadece bu bölümde Matematiksel Hata kartı gösterilir; sayfa çökmez. */
  inline?: boolean;
};

type State = { hasError: boolean; error: Error | null; errorId: string };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `err-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorId: '' });
    window.history.replaceState({}, '', '/');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const code = this.state.errorId || (this.state.error && (this.state.error as Error & { code?: string }).code) || '';
      return (
        <ErrorPage
          title="Matematiksel Hata"
          message="Görünüşe göre bu fiil denklemi bir hataya yol açtı. Dilin matematiğinde bazen bilinmeyenler çıkar."
          errorCode={code}
          onReset={this.handleReset}
          showCopyButton
          inline={this.props.inline}
        />
      );
    }
    return this.props.children;
  }
}
