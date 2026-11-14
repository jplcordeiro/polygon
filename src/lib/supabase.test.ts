import { describe, it, expect, vi } from "vitest";
import { supabase, todasAsLinhas, LINHAS_POR_PAGINA } from "./supabase";

describe("supabase client", () => {
  it("is configured with url and key from env", () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe("function");
  });
});

describe("todasAsLinhas", () => {
  const cheia = (de: number) =>
    Array.from({ length: LINHAS_POR_PAGINA }, (_, i) => ({ id: de + i }));

  it("para na primeira página quando ela vem curta", async () => {
    const pagina = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });

    expect(await todasAsLinhas(pagina)).toEqual([{ id: 1 }]);
    expect(pagina).toHaveBeenCalledTimes(1);
    expect(pagina).toHaveBeenCalledWith(0, LINHAS_POR_PAGINA - 1);
  });

  it("busca a próxima página quando a anterior veio cheia", async () => {
    const pagina = vi
      .fn()
      .mockResolvedValueOnce({ data: cheia(0), error: null })
      .mockResolvedValueOnce({ data: [{ id: 1000 }], error: null });

    expect(await todasAsLinhas(pagina)).toHaveLength(LINHAS_POR_PAGINA + 1);
    expect(pagina).toHaveBeenNthCalledWith(2, LINHAS_POR_PAGINA, LINHAS_POR_PAGINA * 2 - 1);
  });

  it("concatena as páginas na ordem em que vieram", async () => {
    const pagina = vi
      .fn()
      .mockResolvedValueOnce({ data: cheia(0), error: null })
      .mockResolvedValueOnce({ data: cheia(LINHAS_POR_PAGINA), error: null })
      .mockResolvedValueOnce({ data: [{ id: 2000 }], error: null });

    const linhas = await todasAsLinhas(pagina);

    expect(linhas).toHaveLength(LINHAS_POR_PAGINA * 2 + 1);
    expect(linhas[0]).toEqual({ id: 0 });
    expect(linhas[LINHAS_POR_PAGINA]).toEqual({ id: LINHAS_POR_PAGINA });
    expect(linhas.at(-1)).toEqual({ id: 2000 });
  });

  it("encerra quando a página cheia é a última", async () => {
    const pagina = vi
      .fn()
      .mockResolvedValueOnce({ data: cheia(0), error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    expect(await todasAsLinhas(pagina)).toHaveLength(LINHAS_POR_PAGINA);
    expect(pagina).toHaveBeenCalledTimes(2);
  });

  it("propaga o erro de qualquer página", async () => {
    const pagina = vi
      .fn()
      .mockResolvedValueOnce({ data: cheia(0), error: null })
      .mockResolvedValueOnce({ data: null, error: new Error("falhou") });

    await expect(todasAsLinhas(pagina)).rejects.toThrow("falhou");
  });

  it("trata data nula como página vazia", async () => {
    const pagina = vi.fn().mockResolvedValue({ data: null, error: null });

    expect(await todasAsLinhas(pagina)).toEqual([]);
  });
});
