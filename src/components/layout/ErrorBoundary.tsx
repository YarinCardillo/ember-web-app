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

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <AudioErrorFallback
          error={this.state.error}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

interface AudioErrorFallbackProps {
  error: Error | null;
  onReload: () => void;
}

function AudioErrorFallback({
  error,
  onReload,
}: AudioErrorFallbackProps): JSX.Element {
  const isAudioError =
    error?.message?.toLowerCase().includes("audio") ||
    error?.message?.toLowerCase().includes("worklet") ||
    error?.name === "NotAllowedError" ||
    error?.name === "NotSupportedError";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-4 text-4xl">{isAudioError ? "🔇" : "⚠️"}</div>

        <h1 className="mb-2 text-xl font-semibold text-foreground">
          {isAudioError ? "Audio Error" : "Something went wrong"}
        </h1>

        <p className="mb-6 text-sm text-muted-foreground">
          {isAudioError
            ? "There was a problem initializing the audio engine. This might be due to browser restrictions or unsupported audio features."
            : "An unexpected error occurred. Reloading the page usually fixes it."}
        </p>

        {error && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
              Technical details
            </summary>
            <pre className="mt-2 max-h-32 overflow-auto rounded-md border border-border bg-secondary p-3 font-mono text-xs text-muted-foreground">
              {error.name}: {error.message}
            </pre>
          </details>
        )}

        <button
          onClick={onReload}
          className="rounded-md bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          Reload page
        </button>

        <p className="mt-6 text-xs text-muted-foreground/70">
          If this keeps happening, try a different browser or check your audio
          device settings.
        </p>
      </div>
    </div>
  );
}

export default ErrorBoundary;
