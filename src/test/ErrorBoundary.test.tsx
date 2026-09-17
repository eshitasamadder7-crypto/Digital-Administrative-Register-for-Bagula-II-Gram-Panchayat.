import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../components/ErrorBoundary";
import "@testing-library/jest-dom";

// A component that intentionally throws an error
const ThrowError = () => {
  throw new Error("Test error thrown from child");
  return <div>Should not render</div>;
};

// A component that renders normally
const SafeComponent = () => <div>Safe Content</div>;

describe("ErrorBoundary", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress React's default error logging in tests
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <SafeComponent />
      </ErrorBoundary>
    );
    expect(screen.getByText("Safe Content")).toBeInTheDocument();
  });

  it("catches errors and displays fallback UI", () => {
    render(
      <ErrorBoundary name="TestBoundary">
        <ThrowError />
      </ErrorBoundary>
    );

    // Should display the fallback UI
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // In test environment, the error message itself should be shown because it's not production
    expect(screen.getByText("Test error thrown from child")).toBeInTheDocument();

    // Verify it called console.error with the error
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("can render a custom fallback if provided", () => {
    render(
      <ErrorBoundary fallback={<div>Custom Fallback</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom Fallback")).toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
  });

  it("resets boundary state when 'Try again' is clicked", () => {
    let shouldThrow = true;
    const TogglableError = () => {
      if (shouldThrow) {
        throw new Error("Test error");
      }
      return <div>Recovered</div>;
    };

    const { rerender } = render(
      <ErrorBoundary>
        <TogglableError />
      </ErrorBoundary>
    );

    // Shows error UI
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    // Change condition so it won't throw next time
    shouldThrow = false;

    // Click "Try again"
    const retryButton = screen.getByRole("button", { name: /try again/i });
    fireEvent.click(retryButton);

    // Needs a re-render to apply new props/children in reality,
    // but the state reset triggers a re-render. Since `shouldThrow` is now false,
    // it will render the safe content.
    expect(screen.getByText("Recovered")).toBeInTheDocument();
  });
});
