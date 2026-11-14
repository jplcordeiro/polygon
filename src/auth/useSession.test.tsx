import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useSession } from "./useSession";

vi.mock("../lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

describe("useSession", () => {
  it("resolves to no session and stops loading", async () => {
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
  });

  it("entra no modo de nova senha quando volta pelo link do e-mail", async () => {
    const { supabase } = await import("../lib/supabase");
    const { act } = await import("@testing-library/react");
    const { result } = renderHook(() => useSession());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const ouvinte = vi.mocked(supabase.auth.onAuthStateChange).mock.calls.at(-1)![0];

    act(() => ouvinte("PASSWORD_RECOVERY", null));
    expect(result.current.recuperando).toBe(true);
  });
});
