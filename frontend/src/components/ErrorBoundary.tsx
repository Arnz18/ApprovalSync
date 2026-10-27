import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  showHomeButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      'ApprovalSync ErrorBoundary caught an unhandled rendering error:',
      error,
      errorInfo,
    );
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
    this.handleReset();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'Unexpected Interface Error';
      const message =
        this.props.fallbackMessage ||
        'An unexpected display issue occurred in this section. Your session and saved data are intact.';

      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            maxWidth: '640px',
            margin: '3rem auto',
            padding: '2rem',
            backgroundColor: 'var(--color-surface, #ffffff)',
            borderRadius: 'var(--radius-lg, 8px)',
            border: '1px solid var(--color-border, #e2e8f0)',
            boxShadow: 'var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 1.25rem',
              borderRadius: '50%',
              backgroundColor: 'var(--color-warning-bg, #fffbeb)',
              color: 'var(--color-warning, #d97706)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-hidden="true"
          >
            <AlertTriangle size={26} />
          </div>

          <h2
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--color-foreground, #0f172a)',
              marginBottom: '0.5rem',
            }}
          >
            {title}
          </h2>

          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-muted-foreground, #64748b)',
              lineHeight: 1.5,
              marginBottom: '1.5rem',
            }}
          >
            {message}
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
              marginBottom: '1.5rem',
            }}
          >
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={this.handleReset}
              leftIcon={<RefreshCw size={14} aria-hidden="true" />}
            >
              Try Reloading View
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={this.handleGoBack}
              leftIcon={<ArrowLeft size={14} aria-hidden="true" />}
            >
              Go Back
            </Button>

            {this.props.showHomeButton !== false && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={this.handleGoHome}
                leftIcon={<Home size={14} aria-hidden="true" />}
              >
                Dashboard
              </Button>
            )}
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details
              style={{
                textAlign: 'left',
                marginTop: '1.5rem',
                padding: '0.75rem',
                backgroundColor: 'var(--color-muted, #f8fafc)',
                border: '1px solid var(--color-border-subtle, #e2e8f0)',
                borderRadius: 'var(--radius-md, 6px)',
                fontSize: '0.75rem',
                color: 'var(--color-error, #dc2626)',
                overflowX: 'auto',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--color-muted-foreground)',
                }}
              >
                Technical Diagnostic Details (Development Mode)
              </summary>
              <pre
                style={{
                  marginTop: '0.5rem',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-family-mono, monospace)',
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
