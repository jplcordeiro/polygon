import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";
import { AppShell } from "./AppShell";
import { AdminContext } from "../auth/papel";

vi.mock("../lib/supabase", () => ({ supabase: { auth: { signOut: vi.fn() } } }));

function rotulos(admin: boolean) {
  render(
    <AdminContext.Provider value={admin}>
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    </AdminContext.Provider>,
  );
  return screen
    .getAllByRole("navigation", { name: "Áreas", hidden: true })
    .flatMap((nav) => [...nav.querySelectorAll("a")].map((a) => a.textContent));
}

describe("AppShell", () => {
  it("usuário comum só vê Mapa e Calendário", () => {
    expect(new Set(rotulos(false))).toEqual(new Set(["Mapa", "Calendário"]));
  });

  it("admin vê todas as áreas", () => {
    expect(new Set(rotulos(true))).toEqual(
      new Set(["Territórios", "Mapa", "Calendário", "Publicadores", "Relatório"]),
    );
  });
});
