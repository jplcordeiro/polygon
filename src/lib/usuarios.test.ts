import { describe, it, expect, vi, beforeEach } from "vitest";
import { definirAdmin, vincularPublicador } from "./usuarios";

const chamadas: string[] = [];
vi.mock("./supabase", () => {
  const consulta = (tabela: string) => {
    const q = {
      insert: (v: unknown) => (chamadas.push(`${tabela}.insert ${JSON.stringify(v)}`), q),
      update: (v: unknown) => (chamadas.push(`${tabela}.update ${JSON.stringify(v)}`), q),
      delete: () => (chamadas.push(`${tabela}.delete`), q),
      eq: (c: string, v: string) => (chamadas.push(`  ${c}=${v}`), q),
      then: (ok: (r: { error: null }) => void) => ok({ error: null }),
    };
    return q;
  };
  return { supabase: { from: consulta } };
});

describe("usuarios", () => {
  beforeEach(() => (chamadas.length = 0));

  it("promove e rebaixa pela tabela admin", async () => {
    await definirAdmin("u1", true);
    await definirAdmin("u1", false);
    expect(chamadas).toEqual([
      'admin.insert {"user_id":"u1"}',
      "admin.delete",
      "  user_id=u1",
    ]);
  });

  it("solta o vínculo antigo antes de ligar a conta ao novo publicador", async () => {
    await vincularPublicador("u1", "p2");
    expect(chamadas).toEqual([
      'publicador.update {"user_id":null}',
      "  user_id=u1",
      'publicador.update {"user_id":"u1"}',
      "  id=p2",
    ]);
  });

  it("desvincular só solta", async () => {
    await vincularPublicador("u1", null);
    expect(chamadas).toHaveLength(2);
  });
});
