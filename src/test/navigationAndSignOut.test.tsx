import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SignOutConfirmDialog } from "@/components/SignOutConfirmDialog";
import { GoBackButton } from "@/components/GoBackButton";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("SignOutConfirmDialog", () => {
  it("renders properly when open", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <SignOutConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        title="Confirm Sign Out"
        description="Are you sure you want to sign out?"
      />
    );

    expect(screen.getByText("Confirm Sign Out")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to sign out?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Out" })).toBeInTheDocument();
  });

  it("triggers onConfirm when Sign Out action is clicked", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <SignOutConfirmDialog
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
      />
    );

    const confirmBtn = screen.getByRole("button", { name: "Sign Out" });
    fireEvent.click(confirmBtn);

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("GoBackButton", () => {
  it("renders with default label and handles click", () => {
    render(
      <MemoryRouter>
        <GoBackButton fallbackUrl="/" />
      </MemoryRouter>
    );

    const btn = screen.getByRole("button", { name: "Go Back" });
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(mockNavigate).toHaveBeenCalled();
  });

  it("renders custom label", () => {
    render(
      <MemoryRouter>
        <GoBackButton fallbackUrl="/public/dashboard" label="Back to Dashboard" />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Back to Dashboard" })).toBeInTheDocument();
  });
});
