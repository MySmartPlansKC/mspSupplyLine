import { Component, ErrorInfo, ReactNode } from 'react';
import DiagnosticModal, { DiagnosticPayload } from './DiagnosticModal';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
  timestamp: string | null;
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    componentStack: null,
    timestamp: null,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      timestamp: new Date().toISOString(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('[SupplyLine ErrorBoundary]', error, errorInfo);
    }
    this.setState({
      componentStack: errorInfo.componentStack ?? null,
    });
  }

  private buildPayload(): DiagnosticPayload {
    const { error, componentStack, timestamp } = this.state;
    const fallbackTimestamp = new Date().toISOString();
    return {
      errorName: error?.name ?? 'UnknownError',
      errorMessage: error?.message ?? 'An unexpected error occurred.',
      stack: error?.stack ?? null,
      componentStack,
      timestamp: timestamp ?? fallbackTimestamp,
      url: window.location.href,
      userAgent: navigator.userAgent,
      language: navigator.language,
      online: navigator.onLine,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    };
  }

  private handleDismiss = () => {
    this.setState({
      hasError: false,
      error: null,
      componentStack: null,
      timestamp: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <DiagnosticModal
        payload={this.buildPayload()}
        onDismiss={this.handleDismiss}
        onReload={this.handleReload}
      />
    );
  }
}
