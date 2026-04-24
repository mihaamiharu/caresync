import { Component, type ReactNode } from "react";
import { Button } from "./ui/button";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class RootErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Unhandled error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-screen flex-col items-center justify-center gap-4 p-8"
          data-testid="root-error-boundary"
        >
          <div className="text-4xl">⚠️</div>
          <h1 className="text-2xl font-bold text-foreground">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <Button onClick={this.handleRetry} data-testid="retry-button">
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}