import { renderHook, act } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { useAutoSave } from "./useAutoSave";

describe("useAutoSave Strict Guarantees", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  test("A. Debounced save succeeds", async () => {
    const saveMock = vi.fn().mockResolvedValue(undefined);
    let value = { foo: 1 };

    const { rerender, result } = renderHook(() => useAutoSave(value, saveMock, { delay: 500 }));

    expect(saveMock).not.toHaveBeenCalled();

    value = { foo: 2 };
    rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith({ foo: 2 });
    expect(result.current.state).toBe("saved");
  });

  test("B/F. Save A is slow and Save B is newer (Race Condition)", async () => {
    let savesStarted = 0;
    const saveMock = vi.fn().mockImplementation(async (val: { foo: number }) => {
      savesStarted++;
      // A takes 1000ms, B takes 100ms
      const delay = val.foo === 1 ? 1000 : 100;
      await new Promise(r => setTimeout(r, delay));
    });

    let value = { foo: 0 };
    const { rerender } = renderHook(() => useAutoSave(value, saveMock, { delay: 500 }));

    // Trigger Save A
    value = { foo: 1 };
    rerender();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    }); // Save A is in flight

    expect(saveMock).toHaveBeenCalledTimes(1);

    // Trigger Save B while A is in flight
    value = { foo: 2 };
    rerender();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    }); // Debounce finishes, B is queued. A is still running.

    expect(saveMock).toHaveBeenCalledTimes(1); // B is queued

    // Finish A (A takes 1000ms, 500ms have passed since A started)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    // Now B starts and finishes
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(saveMock).toHaveBeenCalledTimes(2);
    // B was saved LAST
    expect(saveMock.mock.calls[0][0]).toEqual({ foo: 1 });
    expect(saveMock.mock.calls[1][0]).toEqual({ foo: 2 });
  });

  test("C. Multiple rapid edits", async () => {
    const saveMock = vi.fn().mockResolvedValue(undefined);
    let value = { foo: 0 };

    const { rerender } = renderHook(() => useAutoSave(value, saveMock, { delay: 500 }));

    value = { foo: 1 }; rerender();
    vi.advanceTimersByTime(100);
    value = { foo: 2 }; rerender();
    vi.advanceTimersByTime(100);
    value = { foo: 3 }; rerender();
    vi.advanceTimersByTime(100);
    value = { foo: 4 }; rerender();

    // Total 300ms passed since first edit, 0ms since last edit.
    expect(saveMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith({ foo: 4 });
  });

  test("D. Unmount while a debounce is still pending / G. Duplicate write prevention", async () => {
    const saveMock = vi.fn().mockResolvedValue(undefined);
    let value = { foo: 0 };

    const { rerender, unmount } = renderHook(() => useAutoSave(value, saveMock, { delay: 500 }));

    value = { foo: 1 }; rerender();

    // Unmount before debounce
    unmount();

    // Should trigger save immediately
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith({ foo: 1 });

    // Ensure it doesn't double-fire later
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
  });

  test("E. Save failure", async () => {
    const saveMock = vi.fn().mockRejectedValue(new Error("Network Error"));
    let value = { foo: 0 };

    const { rerender, result } = renderHook(() => useAutoSave(value, saveMock, { delay: 500 }));

    value = { foo: 1 }; rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(result.current.state).toBe("error");

    // Newer pending data isn't lost, let's trigger another edit
    saveMock.mockResolvedValue(undefined); // Recover
    value = { foo: 2 }; rerender();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(saveMock).toHaveBeenCalledTimes(2);
    expect(saveMock).toHaveBeenCalledWith({ foo: 2 });
    expect(result.current.state).toBe("saved");
  });
});
