import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import {
  AdminIdleTimer,
  ADMIN_IDLE_TIMEOUT_MS,
  ADMIN_IDLE_WARNING_MS,
  ADMIN_LOGOUT_REASON_KEY,
  ADMIN_DISCLAIMER_KEY,
  ADMIN_INACTIVITY_DISCLAIMER,
} from "@/components/AdminIdleTimer";
import { MemoryRouter } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signOut: () => mockSignOut(),
      getSession: () => mockGetSession(),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/activityLog", () => ({
  logActivity: vi.fn().mockResolvedValue(undefined),
}));

describe("AdminIdleTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
    mockSignOut.mockClear();
    sessionStorage.clear();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("renders children content without showing warning when active", () => {
    render(
      <MemoryRouter>
        <AdminIdleTimer>
          <div data-testid="protected-content">Admin Portal Content</div>
        </AdminIdleTimer>
      </MemoryRouter>
    );

    expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    expect(screen.queryByText("Session Timeout Warning")).not.toBeInTheDocument();
  });

  it("shows warning dialog when user is idle past the warning threshold", () => {
    render(
      <MemoryRouter>
        <AdminIdleTimer timeoutMs={180000} warningMs={60000}>
          <div>Admin Dashboard</div>
        </AdminIdleTimer>
      </MemoryRouter>
    );

    // Fast-forward 121 seconds (past 2 minutes, inside 60s warning window)
    act(() => {
      vi.advanceTimersByTime(121000);
    });

    expect(screen.getByText("Session Timeout Warning")).toBeInTheDocument();
    expect(screen.getByText(/You have been inactive for over 2 minutes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stay Signed In/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign Out Now/i })).toBeInTheDocument();
  });

  it("resets warning when user clicks 'Stay Signed In'", () => {
    render(
      <MemoryRouter>
        <AdminIdleTimer timeoutMs={180000} warningMs={60000}>
          <div>Admin Dashboard</div>
        </AdminIdleTimer>
      </MemoryRouter>
    );

    act(() => {
      vi.advanceTimersByTime(125000);
    });

    expect(screen.getByText("Session Timeout Warning")).toBeInTheDocument();

    const stayBtn = screen.getByRole("button", { name: /Stay Signed In/i });
    fireEvent.click(stayBtn);

    expect(screen.queryByText("Session Timeout Warning")).not.toBeInTheDocument();
  });

  it("performs forced logout and sets disclaimer when 3 minutes of inactivity elapses", async () => {
    render(
      <MemoryRouter>
        <AdminIdleTimer timeoutMs={180000} warningMs={60000}>
          <div>Admin Dashboard</div>
        </AdminIdleTimer>
      </MemoryRouter>
    );

    // Fast-forward full 3 minutes (180,000 ms) + 1 second
    await act(async () => {
      vi.advanceTimersByTime(181000);
      await Promise.resolve();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(sessionStorage.getItem(ADMIN_LOGOUT_REASON_KEY)).toBe("idle_timeout");
    expect(sessionStorage.getItem(ADMIN_DISCLAIMER_KEY)).toBe(ADMIN_INACTIVITY_DISCLAIMER);
    expect(mockNavigate).toHaveBeenCalledWith("/admin?reason=idle_timeout", { replace: true });
  });

  it("allows immediate sign out from warning modal", async () => {
    render(
      <MemoryRouter>
        <AdminIdleTimer timeoutMs={180000} warningMs={60000}>
          <div>Admin Dashboard</div>
        </AdminIdleTimer>
      </MemoryRouter>
    );

    await act(async () => {
      vi.advanceTimersByTime(125000);
    });

    const signOutBtn = screen.getByRole("button", { name: /Sign Out Now/i });
    await act(async () => {
      fireEvent.click(signOutBtn);
      await Promise.resolve();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/admin?reason=idle_timeout", { replace: true });
  });

  it("shows security disclaimer on AdminAuth when redirected due to idle timeout", async () => {
    vi.useRealTimers();
    // Import dynamically so it uses the mocks
    const { default: AdminAuth } = await import("@/pages/AdminAuth");

    render(
      <MemoryRouter initialEntries={["/admin?reason=idle_timeout"]}>
        <AdminAuth />
      </MemoryRouter>
    );

    // After initial checking resolves
    expect(await screen.findByText("Security Compliance Disclaimer")).toBeInTheDocument();
    expect(
      screen.getByText(/Your administrative session was automatically terminated due to 3 minutes of inactivity/i)
    ).toBeInTheDocument();
  });
});
