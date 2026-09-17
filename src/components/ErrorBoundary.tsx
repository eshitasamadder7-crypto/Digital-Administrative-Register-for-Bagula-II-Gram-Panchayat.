import { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logActivity } from "@/lib/activityLog";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  name?: string; // Optional name to log context
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Best effort background logging if possible
    logActivity({
      action_type: "error.uncaught",
      target_table: null,
      target_id: null,
      metadata: {
        error: error.message,
        component_stack: errorInfo.componentStack,
        boundary_name: this.props.name || "ErrorBoundary",
      },
    }).catch(() => {
      // Suppress failure to log error to avoid infinite loops
    });
  }

  private resetBoundary = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-destructive">Something went wrong</h3>
            <p className="max-w-[400px] text-sm text-muted-foreground">
              An unexpected error occurred in this section of the application. The issue has been recorded.
            </p>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <div className="mt-4 max-w-full overflow-auto rounded-lg bg-black/5 p-4 text-left text-xs font-mono text-muted-foreground">
              {this.state.error.message}
            </div>
          )}
          <Button onClick={this.resetBoundary} variant="outline" className="mt-4">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
