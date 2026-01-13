/**
 * ErrorBoundary - Catches React errors and displays a fallback UI
 *
 * Prevents the entire app from crashing when AudioWorklet failures,
 * audio context errors, or other runtime errors occur.
 */

import { Component, ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("[ErrorBoundary] Caught error:", error);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <AudioErrorFallback
        error={this.state.error}
        onRetry={this.handleRetry}
        onReload={this.handleReload}
      />;
    }

    return this.props.children;
  }
}

interface AudioErrorFallbackProps {
  error: Error | null;
  onRetry: () => void;
  onReload: () => void;
}

function AudioErrorFallback({
  error,
  onRetry,
  onReload
}: AudioErrorFallbackProps): JSX.Element {
  const isAudioError = error?.message?.toLowerCase().includes("audio") ||
    error?.message?.toLowerCase().includes("worklet") ||
    error?.name === "NotAllowedError" ||
    error?.name === "NotSupportedError";

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-8">
      <div className="max-w-md w-full bg-bg-secondary border border-border-primary rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">
          {isAudioError ? "🔇" : "⚠️"}
        </div>

        <h1 className="text-xl font-bold text-text-primary mb-2">
          {isAudioError ? "Audio Error" : "Something went wrong"}
        </h1>

        <p className="text-text-secondary mb-6">
          {isAudioError
            ? "There was a problem initializing the audio engine. This might be due to browser restrictions or unsupported audio features."
            : "An unexpected error occurred. Please try again or reload the page."
          }
        </p>

        {error && (
          <details className="mb-6 text-left">
            <summary className="text-sm text-text-tertiary cursor-pointer hover:text-text-secondary">
              Technical details
            </summary>
            <pre className="mt-2 p-3 bg-bg-primary rounded text-xs text-text-tertiary overflow-auto max-h-32">
              {error.name}: {error.message}
            </pre>
          </details>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-accent-primary hover:bg-accent-bright text-bg-primary font-medium rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={onReload}
            className="px-4 py-2 bg-bg-tertiary hover:bg-border-primary text-text-primary font-medium rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>

        <p className="mt-6 text-xs text-text-tertiary">
          If this problem persists, try using a different browser or check your audio device settings.
        </p>
      </div>
    </div>
  );
}

export default ErrorBoundary;
